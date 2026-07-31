import { NextResponse } from "next/server";

import { parseCreateTeacherQuestionInput } from "@/lib/assignments/contracts";
import { readAssignmentRequest } from "@/lib/assignments/request";
import { createTeacherQuestion } from "@/lib/assignments/server";

const headers = { "Cache-Control": "no-store" };
const invalidRequest = {
  ok: false,
  error: {
    code: "INVALID_REQUEST",
    message: "Thông tin câu hỏi chưa hợp lệ.",
  },
};

export async function POST(request: Request) {
  const requestData = await readAssignmentRequest(request, 16384);
  if (!requestData.ok) {
    return NextResponse.json(invalidRequest, {
      status: requestData.status,
      headers,
    });
  }
  const input = parseCreateTeacherQuestionInput(requestData.body);
  if (!input) {
    return NextResponse.json(invalidRequest, { status: 400, headers });
  }

  const result = await createTeacherQuestion(input);
  return NextResponse.json(
    result.ok
      ? { ok: true, data: result.question }
      : {
          ok: false,
          error: { code: result.code, message: result.message },
        },
    { status: result.status, headers },
  );
}
