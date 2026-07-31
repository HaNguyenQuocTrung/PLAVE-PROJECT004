import { NextResponse } from "next/server";

import { parseAssignmentSubmitV2Input } from "@/lib/assignments/contracts";
import { readAssignmentRequest } from "@/lib/assignments/request";
import { submitAssignment } from "@/lib/assignments/server";

const headers = { "Cache-Control": "no-store" };
const invalidRequest = {
  ok: false,
  error: {
    code: "INVALID_REQUEST",
    message: "Yêu cầu nộp bài chưa hợp lệ.",
  },
};

export async function POST(request: Request) {
  const requestData = await readAssignmentRequest(request, 1024);
  if (!requestData.ok) {
    return NextResponse.json(invalidRequest, {
      status: requestData.status,
      headers,
    });
  }
  const input = parseAssignmentSubmitV2Input(requestData.body);
  if (!input) {
    return NextResponse.json(invalidRequest, { status: 400, headers });
  }

  const result = await submitAssignment(
    input.submissionId,
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
