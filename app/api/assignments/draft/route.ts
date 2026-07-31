import { NextResponse } from "next/server";

import { parseDraftAnswerV2Input } from "@/lib/assignments/contracts";
import { readAssignmentRequest } from "@/lib/assignments/request";
import { saveAssignmentDraft } from "@/lib/assignments/server";

const headers = { "Cache-Control": "no-store" };
const invalidRequest = {
  ok: false,
  error: {
    code: "INVALID_REQUEST",
    message: "Câu trả lời chưa hợp lệ.",
  },
};

export async function POST(request: Request) {
  const requestData = await readAssignmentRequest(request, 2048);
  if (!requestData.ok) {
    return NextResponse.json(invalidRequest, {
      status: requestData.status,
      headers,
    });
  }
  const input = parseDraftAnswerV2Input(requestData.body);
  if (!input) {
    return NextResponse.json(invalidRequest, { status: 400, headers });
  }

  const result = await saveAssignmentDraft(
    input.submissionId,
    input.questionId,
    input.answer,
    input.expectedRevision,
    input.idempotencyKey,
  );
  return NextResponse.json(
    result.ok
      ? { ok: true, data: result.result }
      : {
          ok: false,
          error: { code: result.code, message: result.message },
        },
    { status: result.status, headers },
  );
}
