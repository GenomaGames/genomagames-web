import { UseCase } from "@/src/Shared/application/UseCase";

import {
  ContactsRepository,
  contactsRepository,
} from "../domain/ContactsRepository";
import { EmailVerificationConfirmation } from "../domain/EmailVerificationConfirmation";

/**
 * Confirms that a contact has verified their email address, the step that
 * follows a double opt-in confirmation. Marking a contact that is already
 * verified, or an email that matches no contact, is a harmless no-op, so a
 * confirmation that arrives twice or for an address that is no longer stored
 * leaves the data untouched rather than failing.
 */
export class ConfirmEmailVerificationUseCase
  implements UseCase<EmailVerificationConfirmation, void>
{
  constructor(private contactsRepository: ContactsRepository) {}

  public async run(confirmation: EmailVerificationConfirmation): Promise<void> {
    await this.contactsRepository.markEmailVerifiedByEmail(confirmation.email);
  }
}

export const confirmEmailVerificationUseCase =
  new ConfirmEmailVerificationUseCase(contactsRepository);
