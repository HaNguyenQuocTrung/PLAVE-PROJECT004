import { NextResponse } from "next/server";

import { GENERATOR_V2_OUTCOME_REGISTRY, type ProductDifficulty } from "@/lib/generation-v2";
import { isLocalV2RequestAllowed, startLocalV2Attempt } from "@/lib/generation-v2/local-runtime";

export async function POST(request: Request) {
  if (!isLocalV2RequestAllowed(request)) return new NextResponse(null, { status: 404 });
  const body = await request.json().catch(() => null) as { outcomeId?: string; difficulty?: ProductDifficulty } | null;
  const validOutcome = GENERATOR_V2_OUTCOME_REGISTRY.some((item) => item.outcomeId === body?.outcomeId);
  const validDifficulty = ["EASY", "MEDIUM", "HARD"].includes(body?.difficulty ?? "");
  if (!validOutcome || !validDifficulty) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
  const state = startLocalV2Attempt(body!.outcomeId!, body!.difficulty!);
  const response = NextResponse.json({ ok: true, data: state });
  response.cookies.set("plave-generator-v2-local", state.attemptToken, { httpOnly: true, sameSite: "strict", secure: false, path: "/", maxAge: 3600 });
  return response;
}
