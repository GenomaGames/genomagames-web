import { UseCase } from "@/src/Shared/application/UseCase";

import { ContactRegistration } from "../domain/Contact";
import {
  ContactsRepository,
  contactsRepository,
} from "../domain/ContactsRepository";

/**
 * Registers a contact from a website form submission, persisting it with the
 * email unverified.
 */
export class RegisterContactUseCase
  implements UseCase<ContactRegistration, void>
{
  constructor(private contactsRepository: ContactsRepository) {}

  public async run(registration: ContactRegistration): Promise<void> {
    await this.contactsRepository.save(registration);
  }
}

export const registerContactUseCase = new RegisterContactUseCase(
  contactsRepository,
);
