import { z } from "zod";

/**
 * The contract a verification-confirmation callback must satisfy: the address
 * whose owner has just confirmed it. Any other field the caller sends is
 * ignored. The email is normalized the same way the registration stores it, so
 * a differently cased address still matches the stored contact. This schema is
 * the single source of truth: the EmailVerificationConfirmation type is inferred
 * from it.
 */
export const emailVerificationConfirmationSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
});

export type EmailVerificationConfirmation = z.infer<
  typeof emailVerificationConfirmationSchema
>;
