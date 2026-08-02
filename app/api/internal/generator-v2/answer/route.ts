import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import type { CanonicalResponse } from "@/lib/generation-v2";
import { isLocalV2RequestAllowed, submitLocalV2Answer } from "@/lib/generation-v2/local-runtime";

export async function POST(request: Request) {
  if (!isLocalV2RequestAllowed(request)) return new NextResponse(null, { status: 404 });
  const token = (await cookies()).get("plave-generator-v2-local")?.value ?? "";
  const body = await request.json().catch(() => null) as null | {
    questionId?: string;
    response?: CanonicalResponse;
    expectedRevision?: number;
    submissionKey?: string;
  };
  if (!body?.questionId || body.response === undefined || !Number.isInteger(body.expectedRevision) || !/^[a-z0-9-]{8,100}$/u.test(body.submissionKey ?? "")) {
    return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
  }
  const result = submitLocalV2Answer({ token, questionId: body.questionId, response: body.response, expectedRevision: body.expectedRevision!, submissionKey: body.submissionKey! });
  return NextResponse.json(result, { status: result.ok ? 200 : result.code === "REVISION_CONFLICT" ? 409 : 400 });
}
