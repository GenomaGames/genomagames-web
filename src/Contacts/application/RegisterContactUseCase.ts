import { UseCase } from "@/src/Shared/application/UseCase";

import { ContactRegistration } from "../domain/Contact";
import {
  ContactsRepository,
  contactsRepository,
} from "../domain/ContactsRepository";
import {
  EmailVerificationSender,
  emailVerificationSender,
} from "../domain/EmailVerificationSender";

/**
 * Registers a contact from a website form submission and sends the email
 * verification message, persisting the contact with the email unverified.
 *
 * A brand-new email is saved and sent the verification. An email that is already
 * registered but still unverified is not saved again — the first submission wins
 * — but the verification is resent. An already-verified email is left untouched.
 * The outcome is the same in every case, so a caller cannot tell an existing
 * email from a new one.
 */
export class RegisterContactUseCase
  implements UseCase<ContactRegistration, void>
{
  constructor(
    private contactsRepository: ContactsRepository,
    private emailVerificationSender: EmailVerificationSender,
  ) {}

  public async run(registration: ContactRegistration): Promise<void> {
    const registeredContact = await this.contactsRepository.findByEmail(
      registration.email,
    );
    const isRegistered = registeredContact !== null;
    const isVerified = registeredContact?.emailVerified ?? false;

    if (!isRegistered) {
      await this.contactsRepository.save(registration);
    }

    if (!isVerified) {
      await this.emailVerificationSender.send(
        registration.email,
        registration.displayName,
      );
    }
  }
}

export const registerContactUseCase = new RegisterContactUseCase(
  contactsRepository,
  emailVerificationSender,
);
