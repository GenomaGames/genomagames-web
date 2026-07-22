import { z } from "zod";

/**
 * Canonical values for the questionnaire's closed answers. The form shows
 * localized labels, but what travels and gets stored are these stable tokens,
 * so answers stay comparable regardless of the language the form was filled in.
 */
export const countries = ["spain", "other"] as const;
export const preferredLanguages = ["spanish", "english", "other"] as const;
export const gamingFrequencies = [
  "every_day",
  "several_times_a_week",
  "several_times_a_month",
  "several_times_a_year",
  "never",
] as const;
export const platforms = [
  "mobile",
  "pc",
  "mac",
  "xbox",
  "playstation_4_5",
  "switch",
  "steam_deck",
  "other",
] as const;
export const genres = [
  "action",
  "adventure",
  "casual_arcade",
  "building",
  "card_games",
  "strategy",
  "exploration",
  "fps",
  "horror",
  "local_coop",
  "fighting",
  "metroidvania",
  "graphic_novel",
  "online_coop",
  "platformers",
  "puzzles",
  "pvp",
  "rpg",
  "simulators",
  "souls",
  "survival",
] as const;

/** Locales the registration flow can answer in (mirrors the site's locales). */
export const registrationLocales = ["en", "es"] as const;

export type Country = (typeof countries)[number];
export type PreferredLanguage = (typeof preferredLanguages)[number];
export type GamingFrequency = (typeof gamingFrequencies)[number];
export type Platform = (typeof platforms)[number];
export type Genre = (typeof genres)[number];
export type RegistrationLocale = (typeof registrationLocales)[number];

/** Optional free text: missing, null or blank all collapse to null. */
const optionalText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

/** Optional number: missing or null collapse to null. */
const optionalNumber = z
  .number()
  .optional()
  .nullable()
  .transform((value) => value ?? null);

/**
 * Bounds for a plausible year of birth: no one older than 120, and no one
 * younger than the Spanish data-protection consent age (14). Shared with the
 * form so client and server enforce the same range.
 */
export const yearOfBirthRange = {
  min: new Date().getFullYear() - 120,
  max: new Date().getFullYear() - 14,
} as const;

/** Optional year of birth: missing or null collapse to null, bounds enforced. */
const optionalYearOfBirth = z
  .number()
  .int()
  .min(yearOfBirthRange.min)
  .max(yearOfBirthRange.max)
  .optional()
  .nullable()
  .transform((value) => value ?? null);

/** Optional yes/no answer: missing or null stay null, distinct from false. */
const optionalBoolean = z
  .boolean()
  .optional()
  .nullable()
  .transform((value) => value ?? null);

/** Optional single choice from a canonical set: missing or null collapse to null. */
const optionalChoice = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .enum(values)
    .optional()
    .nullable()
    .transform((value) => value ?? null);

/** Optional multi-select from a canonical set: missing, null or empty all collapse to null. */
const optionalChoiceArray = <T extends readonly [string, ...string[]]>(
  values: T,
) =>
  z
    .array(z.enum(values))
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null));

/** Email consent: absent means not granted, so it defaults to false. */
const emailConsent = z
  .boolean()
  .optional()
  .nullable()
  .transform((value) => value ?? false);

/**
 * The contract a website form submission must satisfy to register a contact,
 * with the gaming profile and email consents. This schema is the single source
 * of truth: the ContactRegistration type is inferred from it.
 *
 * Optional questionnaire answers collapse to null when left blank, so a blank
 * answer stays distinct from an explicit "no" and the survey stats stay honest.
 */
export const contactRegistrationSchema = z.object({
  displayName: z.string({ error: "Display name is required" }).trim().min(1, {
    error: "Display name is required",
  }),
  email: z
    .string({ error: "Email is required" })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Invalid email address" })),
  country: optionalChoice(countries),
  countryOther: optionalText,
  preferredLanguage: optionalChoice(preferredLanguages),
  preferredLanguageOther: optionalText,
  yearOfBirth: optionalYearOfBirth,
  gamingFrequency: optionalChoice(gamingFrequencies),
  gamingSessionLengthHours: optionalNumber,
  usedPlatforms: optionalChoiceArray(platforms),
  usedPlatformsOther: optionalText,
  preferredPlatform: optionalChoice(platforms),
  preferredPlatformOther: optionalText,
  hasParticipatedInPlaytests: optionalBoolean,
  hasGivenPlaytestFeedback: optionalBoolean,
  preferredGenres: optionalChoiceArray(genres),
  avoidedGenres: optionalChoiceArray(genres),
  lastGamePlayed: optionalText,
  hasWishlistedHelix: optionalBoolean,
  wantsEmailUpdates: emailConsent,
  wantsEmailFeedbackRequests: emailConsent,
  acceptsPrivacyPolicy: z.literal(true, {
    error: "The privacy policy must be accepted",
  }),
  locale: z.enum(registrationLocales).optional().default("en"),
});

export type ContactRegistration = z.infer<typeof contactRegistrationSchema>;

/**
 * What the registration flow needs to know about an already stored contact:
 * whether their email address has been verified yet.
 */
export type StoredContact = {
  emailVerified: boolean;
};
