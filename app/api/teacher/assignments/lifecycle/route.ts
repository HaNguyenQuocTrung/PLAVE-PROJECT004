import { NextResponse } from "next/server";

import { parseAssignmentLifecycleRequest } from "@/lib/assignments/contracts";
import { readAssignmentRequest } from "@/lib/assignments/request";
import { updateTeacherAssignmentLifecycle } from "@/lib/assignments/server";

const headers = { "Cache-Control": "no-store" };
const invalidRequest = {
  ok: false,
  error: {
    code: "INVALID_REQUEST",
    message: "Yêu cầu cập nhật bài tập chưa hợp lệ.",
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

  const input = parseAssignmentLifecycleRequest(requestData.body);
  if (!input) {
    return NextResponse.json(invalidRequest, {
      status: 400,
      headers,
    });
  }

  const result = await updateTeacherAssignmentLifecycle(input);
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
