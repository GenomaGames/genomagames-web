import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { confirmEmailVerificationUseCase } from "@/src/Contacts/application/ConfirmEmailVerificationUseCase";
import { emailVerificationConfirmationSchema } from "@/src/Contacts/domain/EmailVerificationConfirmation";

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.BREVO_WEBHOOK_SECRET;

  if (!secret) {
    console.error(
      "BREVO_WEBHOOK_SECRET is not set; cannot authenticate the webhook",
    );

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  const providedSecret = extractBearerToken(request);

  if (!providedSecret || !secretsMatch(providedSecret, secret)) {
    return NextResponse.json({ error: "Access denied" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = emailVerificationConfirmationSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  try {
    await confirmEmailVerificationUseCase.run(result.data);
  } catch (error) {
    console.error("Failed to confirm email verification:", error);

    return NextResponse.json({ error: "Could not confirm" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" }, { status: 200 });
}

/**
 * Reads the shared secret Brevo carries as a bearer token in the Authorization
 * header. Returns null when the header is absent or is not a bearer token.
 */
function extractBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length);
}

/** Compares two secrets in constant time, without leaking their contents. */
function secretsMatch(provided: string, expected: string): boolean {
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);

  if (providedBytes.length !== expectedBytes.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBytes, expectedBytes);
}
