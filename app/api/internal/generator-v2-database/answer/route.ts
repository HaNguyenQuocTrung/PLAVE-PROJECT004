import { NextResponse } from "next/server";

import { isSameOriginRequest } from "@/lib/practice/errors";
import {
  assertNoPrivateGeneratorV2Fields,
  isGeneratorV2DatabaseProofRequest,
  submitGeneratorV2DatabaseProof,
} from "@/lib/generation-v2/database-proof-runtime";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const questionId = /^v2-[a-z0-9-]+-[0-9a-f]{16}$/u;

export async function POST(request: Request) {
  if (!isGeneratorV2DatabaseProofRequest(request)) {
    return new NextResponse(null, { status: 404 });
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: { code: "INVALID_REQUEST" } }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as {
    attemptId?: string;
    questionId?: string;
    answer?: string;
    expectedRevision?: number;
    idempotencyKey?: string;
  } | null;
  if (
    !body ||
    !uuid.test(body.attemptId ?? "") ||
    !questionId.test(body.questionId ?? "") ||
    typeof body.answer !== "string" ||
    body.answer.length === 0 ||
    body.answer.length > 200 ||
    !Number.isInteger(body.expectedRevision) ||
    (body.expectedRevision ?? -1) < 0 ||
    !uuid.test(body.idempotencyKey ?? "")
  ) {
    return NextResponse.json({ ok: false, error: { code: "INVALID_REQUEST" } }, { status: 400 });
  }
  const result = await submitGeneratorV2DatabaseProof({
    attemptId: body.attemptId!,
    questionId: body.questionId!,
    answer: body.answer,
    expectedRevision: body.expectedRevision!,
    idempotencyKey: body.idempotencyKey!,
  });
  if (!result.ok) {
    const status = result.reason === "UNAUTHENTICATED" ? 401 : result.reason === "ACCESS_DENIED" ? 403 : 409;
    return NextResponse.json({ ok: false, error: { code: result.reason } }, { status });
  }
  const response = { ok: true, data: result.state };
  if (!assertNoPrivateGeneratorV2Fields(response)) {
    return NextResponse.json({ ok: false, error: { code: "PRIVATE_BOUNDARY_FAILED" } }, { status: 500 });
  }
  return NextResponse.json(response);
}
