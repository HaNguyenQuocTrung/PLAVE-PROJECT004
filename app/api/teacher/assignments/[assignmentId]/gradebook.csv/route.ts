import { isAssignmentUuid } from "@/lib/assignments/contracts";
import { buildAssignmentGradebookCsv } from "@/lib/assignments/csv";
import { loadTeacherAssignmentRoster } from "@/lib/assignments/server";
import { getTeacherAccount } from "@/lib/teacher/server";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

type Context = {
  params: Promise<{ assignmentId: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { assignmentId } = await context.params;
  if (!isAssignmentUuid(assignmentId)) {
    return new Response("Không tìm thấy bảng điểm.", {
      status: 404,
      headers: privateHeaders,
    });
  }

  const account = await getTeacherAccount();
  if (!account.ok) {
    return new Response(
      account.reason === "UNAUTHENTICATED"
        ? "Vui lòng đăng nhập để tiếp tục."
        : "Tài khoản không có quyền xuất bảng điểm.",
      {
        status:
          account.reason === "UNAUTHENTICATED" ? 401 : 403,
        headers: privateHeaders,
      },
    );
  }

  const result = await loadTeacherAssignmentRoster(
    account.supabase,
    assignmentId,
  );
  if (!result.ok) {
    return new Response(
      result.reason === "NOT_FOUND"
        ? "Không tìm thấy bảng điểm."
        : "Chưa thể xuất bảng điểm. Vui lòng thử lại.",
      {
        status: result.reason === "NOT_FOUND" ? 404 : 503,
        headers: privateHeaders,
      },
    );
  }

  return new Response(buildAssignmentGradebookCsv(result.roster), {
    status: 200,
    headers: {
      ...privateHeaders,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="plave-assignment-gradebook.csv"',
    },
  });
}
