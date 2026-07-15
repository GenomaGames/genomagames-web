import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { ContactRegistration } from "./Contact";

/**
 * Reads and writes contacts in Supabase.
 *
 * Authenticates with the secret key, which maps to the service_role — the only
 * role allowed to write — so this must never run in the browser.
 */
export class ContactsRepository {
  private client: SupabaseClient | null = null;

  /**
   * Persists a new contact with the email still unverified. Throws if the
   * database rejects the write.
   */
  public async save(contact: ContactRegistration): Promise<void> {
    const { error } = await this.getClient()
      .from("contacts")
      .insert(this.toRow(contact));

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
}

export const contactsRepository = new ContactsRepository();
