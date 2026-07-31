import { NextResponse } from "next/server";

import { parseAssignmentIdInput } from "@/lib/assignments/contracts";
import { readAssignmentRequest } from "@/lib/assignments/request";
import { loadAssignmentRunnerState } from "@/lib/assignments/server";
import { getStudentLearningContext } from "@/lib/practice/server";

const headers = { "Cache-Control": "no-store" };
const invalidRequest = {
  ok: false,
  error: {
    code: "INVALID_REQUEST",
    message: "Yêu cầu tải bài tập chưa hợp lệ.",
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

  const access = await getStudentLearningContext();
  if (!access.ok) {
    const unauthenticated = access.reason === "UNAUTHENTICATED";
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: unauthenticated ? "AUTH_REQUIRED" : "ACCESS_DENIED",
          message: unauthenticated
            ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
            : "Tài khoản không có quyền mở bài tập này.",
        },
      },
      { status: unauthenticated ? 401 : 403, headers },
    );
  }

  const result = await loadAssignmentRunnerState(
    access.supabase,
    assignmentId,
  );
  const failureStatus =
    !result.ok && result.reason === "NOT_FOUND" ? 404 : 503;
  return NextResponse.json(
    result.ok
      ? { ok: true, data: result.state }
      : {
          ok: false,
          error: {
            code:
              result.reason === "NOT_FOUND"
                ? "SUBMISSION_UNAVAILABLE"
                : "REQUEST_FAILED",
            message: result.message,
          },
        },
    { status: result.ok ? 200 : failureStatus, headers },
  );
}
