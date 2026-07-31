import { NextResponse } from "next/server";

import { parseAssignmentIdInput } from "@/lib/assignments/contracts";
import { readAssignmentRequest } from "@/lib/assignments/request";
import { startAssignmentSubmission } from "@/lib/assignments/server";

const headers = { "Cache-Control": "no-store" };
const invalidRequest = {
  ok: false,
  error: {
    code: "INVALID_REQUEST",
    message: "Yêu cầu mở bài tập chưa hợp lệ.",
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
  const assignmentId = parseAssignmentIdInput(
    requestData.body,
    "assignmentId",
  );
  if (!assignmentId) {
    return NextResponse.json(invalidRequest, { status: 400, headers });
  }

  const result = await startAssignmentSubmission(assignmentId);
  return NextResponse.json(
    result.ok
      ? { ok: true, data: result.submission }
      : {
          ok: false,
          error: { code: result.code, message: result.message },
        },
    { status: result.status, headers },
  );
}
