import "server-only";

import {
  parseTeacherActivationRpcResult,
  parseTeacherProfileRpcResult,
  type TeacherActivationRequest,
} from "@/lib/teacher/contracts";
import { createClient } from "@/lib/supabase/server";
import { parseStudentScoringSummary } from "@/lib/curriculum-runtime/contracts";
import { parseMotivationSummary } from "@/lib/motivation/contracts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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
        "Chưa thể xác minh mã mời lúc này. Vui lòng thử lại sau. Nếu mã đã hết hạn, hãy đề nghị Owner cấp một mã mời mới.",
    };
  }

  const result = parseTeacherActivationRpcResult(data);
  if (!result?.activated) {
    return {
      ok: false as const,
      status: 409,
      code: "INVITATION_UNAVAILABLE",
      message:
        "Mã mời không hợp lệ, đã hết hạn hoặc không còn sử dụng được. Hãy kiểm tra lại mã hoặc đề nghị Owner cấp một mã mời mới.",
    };
  }

  return {
    ok: true as const,
    status: 200,
    fullName: result.fullName,
  };
}

export async function loadTeacherStudentLearningMotivation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  membershipId: string,
) {
  const { data, error } = await supabase.rpc(
    "get_teacher_membership_learning_motivation_v1",
    { p_membership_id: membershipId },
  );
  if (error || !isRecord(data) || !isRecord(data.student)) {
    return { ok: false as const, reason: "FORBIDDEN" as const };
  }
  const displayName = data.student.display_name;
  const grade = data.student.grade;
  const scoring = parseStudentScoringSummary(data.scoring);
  const motivation = parseMotivationSummary(data.motivation);
  if (
    typeof displayName !== "string" ||
    !Number.isInteger(grade) ||
    Number(grade) < 1 ||
    Number(grade) > 9 ||
    !scoring ||
    !motivation
  ) {
    return { ok: false as const, reason: "UNAVAILABLE" as const };
  }
  return {
    ok: true as const,
    student: { displayName, grade: Number(grade) },
    scoring,
    motivation,
  };
}
