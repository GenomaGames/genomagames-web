/**
 * One-off migration: copies the alpha sign-up records from the Notion Players
 * database into the contacts table, translating the Spanish questionnaire
 * labels into the canonical tokens the website stores.
 *
 * Migrated contacts already verified their email through the previous flow
 * (they received their Steam key by email), so they are inserted with
 * email_verified = true and their original Notion creation date.
 *
 * Records without an email address cannot exist in the contacts table and are
 * reported as skipped instead of migrated.
 *
 * Usage:
 *   npx tsx scripts/migrate-notion-contacts.ts --dry-run   # prints the plan
 *   npx tsx scripts/migrate-notion-contacts.ts --apply     # inserts the rows
 *
 * Required environment variables:
 *   NOTION_TOKEN, NOTION_PLAYERS_DB_ID, SUPABASE_URL, SUPABASE_SECRET_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { program } from "commander";
import { z } from "zod";

import {
  contactRegistrationSchema,
  yearOfBirthRange,
} from "../src/Contacts/domain/Contact";

program
  .name("migrate-notion-contacts")
  .description("Migrates the alpha sign-up records from Notion into the contacts table")
  .option("--dry-run", "print the migration plan without writing")
  .option("--apply", "insert the rows")
  .parse();

const { dryRun = false, apply = false } = program.opts();

if (dryRun === apply) {
  program.error("Pass exactly one of --dry-run or --apply");
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

const notionToken = requiredEnv("NOTION_TOKEN");
const notionDatabaseId = requiredEnv("NOTION_PLAYERS_DB_ID");
const supabaseUrl = requiredEnv("SUPABASE_URL");
const supabaseSecretKey = requiredEnv("SUPABASE_SECRET_KEY");

const countryTokens = {
  "España": "spain",
  "Otro pais": "other",
};

const languageTokens = {
  "Español": "spanish",
  "Inglés": "english",
  "Otro": "other",
};

const frequencyTokens = {
  "Todos los días": "every_day",
  "Varias veces por semana": "several_times_a_week",
  "Varias veces al mes": "several_times_a_month",
  "Varias veces al año": "several_times_a_year",
  "No juego": "never",
};

// Notion offered a single "PC / Mac" option; the canonical set splits pc and
// mac. Everyone in this batch plays on Windows, so it maps to pc.
const platformTokens = {
  "Móvil": "mobile",
  "PC / Mac": "pc",
  "Xbox": "xbox",
  "PlayStation 5": "playstation_4_5",
  "Switch / Switch 2": "switch",
  "Steam Deck": "steam_deck",
  "Otra": "other",
  "Otras": "other",
};

const genreTokens = {
  "Acción": "action",
  "Aventura": "adventure",
  "Casual / Arcade": "casual_arcade",
  "Construcción": "building",
  "De Cartas": "card_games",
  "Estrategia": "strategy",
  "Exploración": "exploration",
  "FPS (Disparos en primera persona)": "fps",
  "Horror": "horror",
  "Local Co-Op": "local_coop",
  "Lucha": "fighting",
  "Metroidvania": "metroidvania",
  "Novela Gráfica": "graphic_novel",
  "Online Co-Op": "online_coop",
  "Plataformas": "platformers",
  "Puzzles": "puzzles",
  "PvP (Jugardor contra jugador)": "pvp",
  "RPG": "rpg",
  "Simuladores": "simulators",
  "Souls": "souls",
  "Supervivencia": "survival",
};

type TokenMap = Record<string, string>;

/** A page of the Players database as the Notion API returns it. */
type NotionPage = {
  id: string;
  properties: Record<string, any>;
};

type NotionPropertyValue = string | string[] | number | null;

/** Translates a Notion label through a token map, failing loudly on unknowns. */
function toToken(
  map: TokenMap,
  label: NotionPropertyValue,
  field: string,
): string | null {
  if (label == null) return null;
  if (typeof label !== "string") {
    throw new Error(`Expected a single ${field} label, got: ${JSON.stringify(label)}`);
  }
  const token = map[label];
  if (token === undefined) {
    throw new Error(`Unknown ${field} label from Notion: "${label}"`);
  }
  return token;
}

function toTokenArray(
  map: TokenMap,
  labels: NotionPropertyValue,
  field: string,
): string[] | null {
  if (!labels) return null;
  if (!Array.isArray(labels)) {
    throw new Error(`Expected a list of ${field} labels, got: ${JSON.stringify(labels)}`);
  }
  if (labels.length === 0) return null;
  return labels.map((label) => toToken(map, label, field) as string);
}

/** "Sí"/"No" answers (with or without emoji) become booleans, blank stays null. */
function toBoolean(label: NotionPropertyValue): boolean | null {
  if (label == null) return null;
  if (typeof label !== "string") {
    throw new Error(`Expected a yes/no label, got: ${JSON.stringify(label)}`);
  }
  if (label.startsWith("Sí")) return true;
  if (label.startsWith("No")) return false;
  throw new Error(`Unknown yes/no label from Notion: "${label}"`);
}

function plainText(richText: { plain_text: string }[] | undefined): string | null {
  if (!richText || richText.length === 0) return null;
  const text = richText.map((part) => part.plain_text).join("").trim();
  return text ? text : null;
}

/** Reads a property value out of a Notion page by property type. */
function propertyValue(page: NotionPage, name: string): NotionPropertyValue {
  const property = page.properties[name];
  if (!property) throw new Error(`Notion page is missing property "${name}"`);
  switch (property.type) {
    case "title":
      return plainText(property.title);
    case "rich_text":
      return plainText(property.rich_text);
    case "email":
      return property.email?.trim() || null;
    case "number":
      return property.number;
    case "select":
      return property.select?.name ?? null;
    case "multi_select":
      return property.multi_select.map((option: { name: string }) => option.name);
    case "created_time":
      return property.created_time;
    default:
      throw new Error(`Unhandled Notion property type "${property.type}"`);
  }
}

/** Fetches every page of the Players database from the Notion API. */
async function fetchNotionPlayers(): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined = undefined;
  do {
    const response: Response = await fetch(
      `https://api.notion.com/v1/databases/${notionDatabaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${notionToken}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cursor ? { start_cursor: cursor } : {}),
      },
    );
    if (!response.ok) {
      throw new Error(`Notion query failed: ${response.status} ${await response.text()}`);
    }
    const body = await response.json();
    pages.push(...body.results);
    cursor = body.has_more ? body.next_cursor : undefined;
  } while (cursor);
  return pages;
}

type MigratedRegistration = z.infer<typeof contactRegistrationSchema>;

/**
 * Maps one Notion page through the registration contract, so every token the
 * migration produces is validated by the same schema the website enforces.
 * Returns null when the record has no email and cannot become a contact.
 */
function toRegistration(page: NotionPage): MigratedRegistration | null {
  const email = (propertyValue(page, "Email") as string | null)?.trim();
  if (!email) return null;

  // A couple of records hold values like 12 or 21 that cannot be recovered
  // into a real year, so an implausible answer migrates as unanswered.
  let yearOfBirth = propertyValue(page, "Year of birth") as number | null;
  if (
    yearOfBirth !== null &&
    (yearOfBirth < yearOfBirthRange.min || yearOfBirth > yearOfBirthRange.max)
  ) {
    console.warn(`Dropping implausible year of birth ${yearOfBirth} for ${email}`);
    yearOfBirth = null;
  }

  // Migrated contacts accepted the alpha privacy policy through the Notion
  // form, and all of them signed up in Spanish.
  return contactRegistrationSchema.parse({
    displayName: propertyValue(page, "Name"),
    email,
    acceptsPrivacyPolicy: true,
    locale: "es",
    country: toToken(countryTokens, propertyValue(page, "Country"), "country"),
    preferredLanguage: toToken(
      languageTokens,
      propertyValue(page, "Preferred Language"),
      "preferred language",
    ),
    yearOfBirth,
    gamingFrequency: toToken(
      frequencyTokens,
      propertyValue(page, "Game Frequency"),
      "game frequency",
    ),
    gamingSessionLengthHours: propertyValue(page, "Game Session Length (h)"),
    usedPlatforms: toTokenArray(
      platformTokens,
      propertyValue(page, "Used Platforms"),
      "used platform",
    ),
    preferredPlatform: toToken(
      platformTokens,
      propertyValue(page, "Preferred Platform"),
      "preferred platform",
    ),
    hasParticipatedInPlaytests: toBoolean(
      propertyValue(page, "Has Participated in Alphas/Betas"),
    ),
    hasGivenPlaytestFeedback: toBoolean(
      propertyValue(page, "Has Given Feedback on Alpha/Betas"),
    ),
    preferredGenres: toTokenArray(
      genreTokens,
      propertyValue(page, "Preferred Genres"),
      "preferred genre",
    ),
    avoidedGenres: toTokenArray(
      genreTokens,
      propertyValue(page, "Avoided Genres"),
      "avoided genre",
    ),
    lastGamePlayed: propertyValue(page, "Last Game Played"),
    hasWishlistedHelix: toBoolean(propertyValue(page, "Has Wishlisted")),
    wantsEmailUpdates: toBoolean(propertyValue(page, "Email Updates")),
    wantsEmailFeedbackRequests: toBoolean(propertyValue(page, "Email Feedback Request")),
  });
}

/** A row of the contacts table as the migration writes it. */
type ContactRow = Record<string, unknown> & { email: string; display_name: string };

/**
 * Maps the validated registration to table columns — the same mapping the
 * ContactsRepository applies — plus the two columns only the migration sets:
 * the email arrives already verified and the sign-up date comes from Notion.
 */
function toContactRow(registration: MigratedRegistration, createdAt: string): ContactRow {
  return {
    display_name: registration.displayName,
    email: registration.email,
    country: registration.country,
    preferred_language: registration.preferredLanguage,
    year_of_birth: registration.yearOfBirth,
    gaming_frequency: registration.gamingFrequency,
    gaming_session_length_hours: registration.gamingSessionLengthHours,
    used_platforms: registration.usedPlatforms,
    preferred_platform: registration.preferredPlatform,
    has_participated_in_playtests: registration.hasParticipatedInPlaytests,
    has_given_playtest_feedback: registration.hasGivenPlaytestFeedback,
    preferred_genres: registration.preferredGenres,
    avoided_genres: registration.avoidedGenres,
    last_game_played: registration.lastGamePlayed,
    has_wishlisted_helix: registration.hasWishlistedHelix,
    wants_email_updates: registration.wantsEmailUpdates,
    wants_email_feedback_requests: registration.wantsEmailFeedbackRequests,
    email_verified: true,
    created_at: createdAt,
  };
}

async function main() {
  console.log(`Fetching players from Notion...`);
  const pages = await fetchNotionPlayers();
  console.log(`Found ${pages.length} records`);

  const rows: ContactRow[] = [];
  const skipped: string[] = [];
  for (const page of pages) {
    const registration = toRegistration(page);
    if (registration) {
      rows.push(toContactRow(registration, propertyValue(page, "Created At") as string));
    } else {
      skipped.push(String(propertyValue(page, "Name") ?? page.id));
    }
  }

  console.log(`\nMigratable: ${rows.length}`);
  console.log(`Skipped (no email): ${skipped.length}${skipped.length ? ` — ${skipped.join(", ")}` : ""}`);

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing, error: existingError } = await supabase
    .from("contacts")
    .select("email");
  if (existingError) {
    throw new Error(`Failed to read existing contacts: ${existingError.message}`);
  }
  const existingEmails = new Set(existing.map((row) => row.email));
  const conflicting = rows.filter((row) => existingEmails.has(row.email));
  if (conflicting.length > 0) {
    console.log(
      `\nAlready in the database (left untouched): ${conflicting
        .map((row) => row.email)
        .join(", ")}`,
    );
  }

  if (!apply) {
    console.log("\nDry run — no rows written. Plan:");
    for (const row of rows) {
      const action = existingEmails.has(row.email) ? "SKIP (exists)" : "INSERT";
      console.log(`  ${action}  ${row.email}  (${row.display_name})`);
    }
    console.log("\nRe-run with --apply to insert.");
    return;
  }

  // ON CONFLICT DO NOTHING keeps any contact who already registered through
  // the website untouched, mirroring how the registration endpoint writes.
  const { error } = await supabase
    .from("contacts")
    .upsert(rows, { onConflict: "email", ignoreDuplicates: true });
  if (error) {
    throw new Error(`Failed to insert contacts: ${error.message}`);
  }

  const { count, error: countError } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true });
  if (countError) {
    throw new Error(`Failed to count contacts: ${countError.message}`);
  }
  console.log(`\nDone. contacts table now holds ${count} rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
