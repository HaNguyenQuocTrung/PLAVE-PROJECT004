import "server-only";

import {
  isStudentConnectionNotFound,
  parseConnectionMutationResult,
  parseConnectionRequestResult,
  parseConnectionState,
  parseStudentConnectionPreview,
  type ConnectionState,
} from "@/lib/connections/contracts";
import type { ConnectionAction } from "@/lib/connections/validation";
import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;
type ConnectionRole = "STUDENT" | "PARENT";

export const studentNotFoundMessage =
  "Không tìm thấy học sinh phù hợp. Vui lòng kiểm tra lại mã.";

const genericUpdateMessage =
  "Chưa thể cập nhật kết nối. Vui lòng thử lại.";

async function getConnectionActor(expectedRole?: ConnectionRole) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false as const,
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    (profile.role !== "STUDENT" && profile.role !== "PARENT") ||
    !profile.onboarding_completed ||
    (expectedRole && profile.role !== expectedRole)
  ) {
    return {
      ok: false as const,
      status: 403,
      code: "ACCESS_DENIED",
      message: "Tài khoản không có quyền thực hiện thao tác này.",
    };
  }

  return {
    ok: true as const,
    supabase,
    role: profile.role as ConnectionRole,
  };
}

export async function loadConnectionState(
  supabase: ServerSupabaseClient,
): Promise<
  | { ok: true; state: ConnectionState }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc(
    "get_my_parent_student_connections",
  );
  if (error) {
    return {
      ok: false,
      message: "Chưa thể tải danh sách kết nối. Vui lòng thử lại.",
    };
  }

  const state = parseConnectionState(data);
  if (!state) {
    return {
      ok: false,
      message: "Dữ liệu kết nối chưa sẵn sàng.",
    };
  }

  return { ok: true, state };
}

export async function previewStudentConnection(studentCode: string) {
  const access = await getConnectionActor("PARENT");
  if (!access.ok) return access;

  const { data, error } = await access.supabase.rpc(
    "preview_student_connection",
    { p_student_code: studentCode },
  );

  if (error || isStudentConnectionNotFound(data)) {
    return {
      ok: false as const,
      status: 200,
      code: "STUDENT_NOT_FOUND",
      message: studentNotFoundMessage,
    };
  }

  const preview = parseStudentConnectionPreview(data);
  if (!preview) {
    return {
      ok: false as const,
      status: 500,
      code: "PREVIEW_UNAVAILABLE",
      message: "Chưa thể tìm học sinh lúc này. Vui lòng thử lại sau.",
    };
  }

  return { ok: true as const, status: 200, preview };
}

export async function sendParentConnectionRequest(studentCode: string) {
  const access = await getConnectionActor("PARENT");
  if (!access.ok) return access;

  const { data, error } = await access.supabase.rpc(
    "send_parent_connection_request",
    { p_student_code: studentCode },
  );

  if (error || !parseConnectionRequestResult(data)) {
    return {
      ok: false as const,
      status: 200,
      code: "STUDENT_NOT_FOUND",
      message: studentNotFoundMessage,
    };
  }

  return { ok: true as const, status: 200 };
}

export async function updateParentStudentConnection(
  connectionId: string,
  action: ConnectionAction,
) {
  const expectedRole =
    action === "APPROVE" || action === "REJECT"
      ? "STUDENT"
      : action === "CANCEL"
        ? "PARENT"
        : undefined;
  const access = await getConnectionActor(expectedRole);
  if (!access.ok) return access;

  const rpc =
    action === "APPROVE" || action === "REJECT"
      ? access.supabase.rpc("respond_parent_connection_request", {
          p_connection_id: connectionId,
          p_decision: action === "APPROVE" ? "APPROVED" : "REJECTED",
        })
      : action === "CANCEL"
        ? access.supabase.rpc("cancel_parent_connection_request", {
            p_connection_id: connectionId,
          })
        : access.supabase.rpc("revoke_parent_student_connection", {
            p_connection_id: connectionId,
          });

  const { data, error } = await rpc;
  const allowedStatuses =
    action === "APPROVE"
      ? ["APPROVED"]
      : action === "REJECT"
        ? ["REJECTED"]
        : action === "CANCEL"
          ? ["CANCELLED"]
          : ["REVOKED"];

  if (error || !parseConnectionMutationResult(data, allowedStatuses)) {
    return {
      ok: false as const,
      status: 409,
      code: "CONNECTION_STATE_CONFLICT",
      message: genericUpdateMessage,
    };
  }

  return { ok: true as const, status: 200 };
}
