import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const GET = (): NextResponse =>
  NextResponse.json({ servedAt: new Date().toISOString() });
