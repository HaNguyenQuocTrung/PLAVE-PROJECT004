import "server-only";

import {
  parseTeacherActivationRpcResult,
  parseTeacherProfileRpcResult,
  type TeacherActivationRequest,
} from "@/lib/teacher/contracts";
import { createClient } from "@/lib/supabase/server";

export type TeacherAccessFailure =
  | "UNAUTHENTICATED"
  | "ACTIVATION_REQUIRED"
  | "ACCESS_DENIED"
  | "DATA_UNAVAILABLE";

export async function getTeacherAccount() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false as const,
      reason: "UNAUTHENTICATED" as const,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name, onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      ok: false as const,
      reason: "DATA_UNAVAILABLE" as const,
    };
  }

  if (profile.role !== "TEACHER") {
    return {
      ok: false as const,
      reason: "ACCESS_DENIED" as const,
    };
  }

  if (!profile.onboarding_completed) {
    return {
      ok: false as const,
      reason: "ACTIVATION_REQUIRED" as const,
      supabase,
      user,
      initialFullName:
        typeof profile.full_name === "string" ? profile.full_name : "",
    };
  }

  const { data: teacherProfile, error: teacherError } =
    await supabase.rpc("get_my_teacher_profile");
  const parsedTeacherProfile =
    parseTeacherProfileRpcResult(teacherProfile);

  if (
    teacherError ||
    !parsedTeacherProfile
  ) {
    return {
      ok: false as const,
      reason: "DATA_UNAVAILABLE" as const,
    };
  }

  return {
    ok: true as const,
    supabase,
    user,
    profile: parsedTeacherProfile,
  };
}

export async function activateTeacherAccount(
  input: TeacherActivationRequest,
) {
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

  if (profileError || !profile || profile.role !== "TEACHER") {
    return {
      ok: false as const,
      status: 403,
      code: "ACCESS_DENIED",
      message: "Tài khoản không có quyền xác minh giáo viên.",
    };
  }

  if (profile.onboarding_completed) {
    const account = await getTeacherAccount();
    if (account.ok) {
      return {
        ok: true as const,
        status: 200,
        fullName: account.profile.fullName,
      };
    }
  }

  const { data, error } = await supabase.rpc(
    "activate_teacher_invitation",
    {
      p_code: input.invitationCode,
      p_full_name: input.fullName,
    },
  );

  if (error) {
    return {
      ok: false as const,
      status: 409,
      code: "ACTIVATION_FAILED",
      message:
        "Chưa thể xác minh mã mời. Vui lòng kiểm tra lại hoặc liên hệ PLAVE.",
    };
  }

  const result = parseTeacherActivationRpcResult(data);
  if (!result?.activated) {
    return {
      ok: false as const,
      status: 409,
      code: "INVITATION_UNAVAILABLE",
      message:
        "Mã mời không hợp lệ hoặc không còn sử dụng được. Vui lòng kiểm tra lại hoặc liên hệ PLAVE.",
    };
  }

  return {
    ok: true as const,
    status: 200,
    fullName: result.fullName,
  };
}
