import { NextResponse } from "next/server";

import { loadTeacherQuestionLibrary } from "@/lib/assignments/server";
import { getTeacherAccount } from "@/lib/teacher/server";

const headers = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  const account = await getTeacherAccount();
  if (!account.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code:
            account.reason === "UNAUTHENTICATED"
              ? "AUTH_REQUIRED"
              : "ACCESS_DENIED",
          message:
            account.reason === "UNAUTHENTICATED"
              ? "Vui lòng đăng nhập để tiếp tục."
              : "Tài khoản không có quyền xem kho câu hỏi.",
        },
      },
      {
        status: account.reason === "UNAUTHENTICATED" ? 401 : 403,
        headers,
      },
    );
  }

  const result = await loadTeacherQuestionLibrary(account.supabase);
  return NextResponse.json(
    result.ok
      ? { ok: true, data: result.library }
      : {
          ok: false,
          error: {
            code: "REQUEST_FAILED",
            message: result.message,
          },
        },
    { status: result.ok ? 200 : 503, headers },
  );
}
