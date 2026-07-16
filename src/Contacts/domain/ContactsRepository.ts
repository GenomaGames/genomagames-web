import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { ContactRegistration, StoredContact } from "./Contact";

/**
 * Reads and writes contacts in Supabase.
 *
 * Authenticates with the secret key, which maps to the service_role — the only
 * role allowed to write — so this must never run in the browser.
 */
export class ContactsRepository {
  private client: SupabaseClient | null = null;

  /**
   * Looks up a contact by email. Returns null when no contact with that email
   * exists. Throws if the database cannot be queried.
   */
  public async findByEmail(email: string): Promise<StoredContact | null> {
    const { data, error } = await this.getClient()
      .from("contacts")
      .select("email_verified")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to look up contact: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.toStoredContact(data);
  }

  /**
   * Persists a new contact with the email still unverified. Despite the upsert,
   * nothing is ever updated: an existing contact with the same email makes the
   * write an atomic no-op (ON CONFLICT DO NOTHING), so the first submission
   * wins even against a concurrent registration. Throws if the database
   * rejects the write.
   */
  public async save(contact: ContactRegistration): Promise<void> {
    const { error } = await this.getClient()
      .from("contacts")
      .upsert(this.toRow(contact), {
        onConflict: "email",
        ignoreDuplicates: true,
      });

    if (error) {
      throw new Error(`Failed to save contact: ${error.message}`);
    }
  }

  /**
   * Returns the Supabase client, created on first use rather than at module
   * load, so a missing secret only fails when a request is handled and never
   * breaks the build.
   */
  private getClient(): SupabaseClient {
    if (this.client) {
      return this.client;
    }

    const url = process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (!url || !secretKey) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SECRET_KEY must be set to reach the database",
      );
    }

    this.client = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    return this.client;
  }

  /**
   * Maps the domain model to the table columns. Optional answers left blank stay
   * null, and email_verified is not set so the column keeps its default of false.
   */
  private toRow(contact: ContactRegistration): Record<string, unknown> {
    return {
      name: contact.name,
      email: contact.email,
      country: contact.country,
      preferred_language: contact.preferredLanguage,
      year_of_birth: contact.yearOfBirth,
      gaming_frequency: contact.gamingFrequency,
      gaming_session_length_hours: contact.gamingSessionLengthHours,
      used_platforms: contact.usedPlatforms,
      preferred_platform: contact.preferredPlatform,
      has_participated_in_playtests: contact.hasParticipatedInPlaytests,
      has_given_playtest_feedback: contact.hasGivenPlaytestFeedback,
      preferred_genres: contact.preferredGenres,
      avoided_genres: contact.avoidedGenres,
      last_game_played: contact.lastGamePlayed,
      has_wishlisted_helix: contact.hasWishlistedHelix,
      wants_email_updates: contact.wantsEmailUpdates,
      wants_email_feedback_requests: contact.wantsEmailFeedbackRequests,
    };
  }

  /** Maps the table columns to the domain view of a stored contact. */
  private toStoredContact(row: { email_verified: boolean }): StoredContact {
    return { emailVerified: row.email_verified };
  }
}

export const contactsRepository = new ContactsRepository();
