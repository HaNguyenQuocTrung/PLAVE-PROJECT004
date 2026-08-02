import { NextResponse } from "next/server";

import { isSameOriginRequest } from "@/lib/practice/errors";
import {
  OwnerReviewResultError,
  recordOwnerReviewDecision,
  type OwnerReviewFinalSubmission,
} from "@/lib/generation-v2/owner-review-result-server";

function allowed(request: Request) {
  const url = new URL(request.url);
  return process.env.NODE_ENV === "development" &&
    process.env.PLAVE_GENERATOR_V2_OWNER_REVIEW === "true" &&
    url.hostname === "127.0.0.1";
}

export async function POST(request: Request) {
  if (!allowed(request)) return new NextResponse(null, { status: 404 });
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "INVALID_REQUEST" },
      { status: 403 },
    );
  }
  const body = await request.json().catch(() => null) as
    | OwnerReviewFinalSubmission
    | null;
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "INVALID_REQUEST" },
      { status: 400 },
    );
  }
  try {
    const result = recordOwnerReviewDecision(body);
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    const code = error instanceof OwnerReviewResultError
      ? error.code
      : "OWNER_REVIEW_SAVE_FAILED";
    return NextResponse.json(
      { ok: false, error: code },
      { status: 400 },
    );
  }
}
