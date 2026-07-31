import { NextResponse } from "next/server";

import { parsePublishAssignmentInput } from "@/lib/assignments/contracts";
import { readAssignmentRequest } from "@/lib/assignments/request";
import { publishTeacherAssignment } from "@/lib/assignments/server";

const headers = { "Cache-Control": "no-store" };
const invalidRequest = {
  ok: false,
  error: {
    code: "INVALID_REQUEST",
    message: "Thông tin giao bài chưa hợp lệ.",
  },
};

export async function POST(request: Request) {
  const requestData = await readAssignmentRequest(request, 8192);
  if (!requestData.ok) {
    return NextResponse.json(invalidRequest, {
      status: requestData.status,
      headers,
    });
  }
  const input = parsePublishAssignmentInput(requestData.body);
  if (!input) {
    return NextResponse.json(invalidRequest, { status: 400, headers });
  }

  const result = await publishTeacherAssignment(input);
  return NextResponse.json(
    result.ok
      ? { ok: true, data: result.assignment }
      : {
          ok: false,
          error: { code: result.code, message: result.message },
        },
    { status: result.status, headers },
  );
}
