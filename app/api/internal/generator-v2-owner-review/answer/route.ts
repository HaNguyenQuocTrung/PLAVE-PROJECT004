import { NextResponse } from "next/server";

import { isSameOriginRequest } from "@/lib/practice/errors";
import {
  validateStudentResponse,
  type CanonicalResponse,
} from "@/lib/generation-v2";
import { generateOwnerReviewQuestion, ownerReviewIncorrectResponse } from "@/lib/generation-v2/owner-review";

function allowed(request: Request) {
  const url = new URL(request.url);
  return process.env.NODE_ENV === "development" &&
    process.env.PLAVE_GENERATOR_V2_OWNER_REVIEW === "true" &&
    ["127.0.0.1", "localhost"].includes(url.hostname);
}

export async function POST(request: Request) {
  if (!allowed(request)) return new NextResponse(null, { status: 404 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 403 });
  const body = await request.json().catch(() => null) as null | {
    sampleId?: string;
    action?: "SUBMIT" | "PREVIEW_CORRECT" | "PREVIEW_INCORRECT";
    response?: CanonicalResponse;
  };
  const question = body?.sampleId ? generateOwnerReviewQuestion(body.sampleId) : null;
  if (!question || !["SUBMIT", "PREVIEW_CORRECT", "PREVIEW_INCORRECT"].includes(body?.action ?? "")) {
    return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
  }
  const response = body!.action === "PREVIEW_CORRECT"
    ? question.privateSolution.correctResponse
    : body!.action === "PREVIEW_INCORRECT"
      ? ownerReviewIncorrectResponse(question)
      : body!.response;
  if (response === undefined) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
  const feedback = validateStudentResponse(question, response);
  return NextResponse.json({
    ok: true,
    data: {
      isCorrect: feedback.isCorrect,
      headline: feedback.headline,
      explanation: feedback.explanation,
      steps: feedback.steps,
      nextStep: feedback.nextStep,
    },
  });
}
