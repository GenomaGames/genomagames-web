import { checkBotId } from "botid/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { registerContactUseCase } from "@/src/Contacts/application/RegisterContactUseCase";
import { contactRegistrationSchema } from "@/src/Contacts/domain/Contact";

export async function POST(request: Request): Promise<NextResponse> {
  const verification = await checkBotId();

  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = contactRegistrationSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid registration data",
        fields: z.flattenError(result.error).fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    await registerContactUseCase.run(result.data);
  } catch (error) {
    console.error("Failed to register contact:", error);

    return NextResponse.json({ error: "Could not register" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" }, { status: 201 });
}
