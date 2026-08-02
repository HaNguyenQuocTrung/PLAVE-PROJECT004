import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getLocalV2Attempt, isLocalV2RequestAllowed, localV2HistorySummary } from "@/lib/generation-v2/local-runtime";

export async function GET(request: Request) {
  if (!isLocalV2RequestAllowed(request)) return new NextResponse(null, { status: 404 });
  const token = (await cookies()).get("plave-generator-v2-local")?.value ?? "";
  const state = getLocalV2Attempt(token);
  return NextResponse.json({ ok: true, data: state, history: localV2HistorySummary() });
}
