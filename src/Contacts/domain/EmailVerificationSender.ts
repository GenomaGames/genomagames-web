const DOUBLE_OPT_IN_URL =
  "https://api.brevo.com/v3/contacts/doubleOptinConfirmation";

type SenderConfig = {
  apiKey: string;
  listId: number;
  templateId: number;
  redirectionUrl: string;
};

/**
 * Sends the email verification message that a contact must confirm before their
 * address counts as verified (double opt-in). Confirming adds them to the alpha
 * list. Marking the address verified once they confirm is handled elsewhere.
 *
 * Reads its configuration lazily on first use rather than at module load, so a
 * missing secret only fails when a request is handled and never breaks the
 * build. Holds a private API key, so this must never run in the browser.
 */
export class EmailVerificationSender {
  private config: SenderConfig | null = null;

  /**
   * Sends the verification email to the given address, seeding the contact's
   * display name so the message can greet them by it. Safe to call again for an
   * address that has not confirmed yet: it resends the same email. Throws if
   * the email provider rejects the request.
   */
  public async send(email: string, displayName: string): Promise<void> {
    const { apiKey, listId, templateId, redirectionUrl } = this.getConfig();

    const response = await fetch(DOUBLE_OPT_IN_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        email,
        attributes: { DISPLAY_NAME: displayName },
        includeListIds: [listId],
        templateId,
        redirectionUrl,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");

      throw new Error(
        `Failed to send verification email (${response.status}): ${detail}`,
      );
    }
  }

  /**
   * Reads and validates the configuration from the environment, caching it after
   * the first successful read.
   */
  private getConfig(): SenderConfig {
    if (this.config) {
      return this.config;
    }

    const apiKey = process.env.BREVO_API_KEY;
    const listId = Number(process.env.BREVO_ALPHA_LIST_ID);
    const templateId = Number(process.env.BREVO_VERIFICATION_TEMPLATE_ID);
    const redirectionUrl = process.env.NEXT_PUBLIC_BASE_URL;

    if (!apiKey) {
      throw new Error("BREVO_API_KEY must be set to send verification emails");
    }

    if (!Number.isInteger(listId)) {
      throw new Error("BREVO_ALPHA_LIST_ID must be set to a list id");
    }

    if (!Number.isInteger(templateId)) {
      throw new Error(
        "BREVO_VERIFICATION_TEMPLATE_ID must be set to a template id",
      );
    }

    if (!redirectionUrl) {
      throw new Error(
        "NEXT_PUBLIC_BASE_URL must be set to build the confirmation redirect",
      );
    }

    this.config = { apiKey, listId, templateId, redirectionUrl };

    return this.config;
  }
}

export const emailVerificationSender = new EmailVerificationSender();
