import { NextResponse } from "next/server";

import {
  assertNoPrivateGeneratorV2Fields,
  isGeneratorV2DatabaseProofRequest,
  loadGeneratorV2DatabaseProofState,
} from "@/lib/generation-v2/database-proof-runtime";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export async function GET(request: Request) {
  if (!isGeneratorV2DatabaseProofRequest(request)) {
    return new NextResponse(null, { status: 404 });
  }
  const attemptId = new URL(request.url).searchParams.get("attemptId") ?? "";
  if (!uuid.test(attemptId)) {
    return NextResponse.json({ ok: false, error: { code: "INVALID_REQUEST" } }, { status: 400 });
  }
  const result = await loadGeneratorV2DatabaseProofState(attemptId);
  if (!result.ok) {
    const status = result.reason === "UNAUTHENTICATED" ? 401 : 403;
    return NextResponse.json({ ok: false, error: { code: result.reason } }, { status });
  }
  const response = { ok: true, data: result.state };
  if (!assertNoPrivateGeneratorV2Fields(response)) {
    return NextResponse.json({ ok: false, error: { code: "PRIVATE_BOUNDARY_FAILED" } }, { status: 500 });
  }
  return NextResponse.json(response);
}

