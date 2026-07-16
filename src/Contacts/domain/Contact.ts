import { z } from "zod";

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

/** Optional yes/no answer: missing or null stay null, distinct from false. */
const optionalBoolean = z
  .boolean()
  .optional()
  .nullable()
  .transform((value) => value ?? null);

/** Optional multi-select: missing, null or empty all collapse to null. */
const optionalStringArray = z
  .array(z.string())
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
  name: z.string({ error: "Name is required" }).trim().min(1, {
    error: "Name is required",
  }),
  email: z
    .string({ error: "Email is required" })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Invalid email address" })),
  country: optionalText,
  preferredLanguage: optionalText,
  yearOfBirth: optionalNumber,
  gamingFrequency: optionalText,
  gamingSessionLengthHours: optionalNumber,
  usedPlatforms: optionalStringArray,
  preferredPlatform: optionalText,
  hasParticipatedInPlaytests: optionalBoolean,
  hasGivenPlaytestFeedback: optionalBoolean,
  preferredGenres: optionalStringArray,
  avoidedGenres: optionalStringArray,
  lastGamePlayed: optionalText,
  hasWishlistedHelix: optionalBoolean,
  wantsEmailUpdates: emailConsent,
  wantsEmailFeedbackRequests: emailConsent,
});

export type ContactRegistration = z.infer<typeof contactRegistrationSchema>;

/**
 * What the registration flow needs to know about an already stored contact:
 * whether their email address has been verified yet.
 */
export type StoredContact = {
  emailVerified: boolean;
};
