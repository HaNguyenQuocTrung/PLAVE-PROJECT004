import { NextResponse } from "next/server";

import { parseAssignmentIdInput } from "@/lib/assignments/contracts";
import { readAssignmentRequest } from "@/lib/assignments/request";
import { restoreTeacherQuestion } from "@/lib/assignments/server";

const headers = { "Cache-Control": "no-store" };
const invalidRequest = {
  ok: false,
  error: {
    code: "INVALID_REQUEST",
    message: "Yêu cầu khôi phục câu hỏi chưa hợp lệ.",
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
  const questionId = parseAssignmentIdInput(
    requestData.body,
    "questionId",
  );
  if (!questionId) {
    return NextResponse.json(invalidRequest, { status: 400, headers });
  }

  const result = await restoreTeacherQuestion(questionId);
  return NextResponse.json(
    result.ok
      ? { ok: true, data: { status: "ACTIVE" } }
      : {
          ok: false,
          error: { code: result.code, message: result.message },
        },
    { status: result.status, headers },
  );
}
