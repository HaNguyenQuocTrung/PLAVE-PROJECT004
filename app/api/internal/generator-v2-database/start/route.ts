import { NextResponse } from "next/server";

import { isSameOriginRequest } from "@/lib/practice/errors";
import {
  assertNoPrivateGeneratorV2Fields,
  isGeneratorV2DatabaseProofRequest,
  startOrResumeGeneratorV2DatabaseProof,
} from "@/lib/generation-v2/database-proof-runtime";
import type { ProductDifficulty } from "@/lib/generation-v2/types";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export async function POST(request: Request) {
  if (!isGeneratorV2DatabaseProofRequest(request)) {
    return new NextResponse(null, { status: 404 });
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: { code: "INVALID_REQUEST" } }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as {
    outcomeId?: string;
    difficulty?: ProductDifficulty;
    idempotencyKey?: string;
  } | null;
  if (
    !body ||
    typeof body.outcomeId !== "string" ||
    !["EASY", "MEDIUM", "HARD"].includes(body.difficulty ?? "") ||
    !uuid.test(body.idempotencyKey ?? "")
  ) {
    return NextResponse.json({ ok: false, error: { code: "INVALID_REQUEST" } }, { status: 400 });
  }
  const result = await startOrResumeGeneratorV2DatabaseProof({
    outcomeId: body.outcomeId,
    difficulty: body.difficulty!,
    idempotencyKey: body.idempotencyKey!,
  });
  if (!result.ok) {
    const status = result.reason === "UNAUTHENTICATED" ? 401 : result.reason === "ACCESS_DENIED" ? 403 : 409;
    return NextResponse.json({ ok: false, error: { code: result.reason } }, { status });
  }
  const response = {
    ok: true,
    data: result.state,
    resumedWithoutGeneration: result.resumedWithoutGeneration,
  };
  if (!assertNoPrivateGeneratorV2Fields(response)) {
    return NextResponse.json({ ok: false, error: { code: "PRIVATE_BOUNDARY_FAILED" } }, { status: 500 });
  }
  return NextResponse.json(response);
}

