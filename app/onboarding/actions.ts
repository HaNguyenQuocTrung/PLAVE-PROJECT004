import { createClient } from "@/lib/supabase/server";
import {
  isValidRegistrationGrade,
  missingRegistrationGradeMessage,
  type OnboardingSubmission,
} from "@/lib/onboarding/validation";

function parseValidDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return value;
}

export async function completeOnboardingRequest(input: OnboardingSubmission) {
  const fullName = input.fullName.replace(/\s+/g, " ").trim();
  if (fullName.length < 2 || fullName.length > 100) {
    return {
      ok: false,
      message: "Họ và tên cần có từ 2 đến 100 ký tự.",
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        ok: false,
        message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, onboarding_completed, registration_grade")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      (profile.role !== "STUDENT" && profile.role !== "PARENT")
    ) {
      return {
        ok: false,
        message: "Hồ sơ không hợp lệ hoặc không có quyền onboarding.",
      };
    }

    if (profile.onboarding_completed) {
      return { ok: true, message: "" };
    }

    let birthDate: string | null = null;
    if (input.birthDate) {
      birthDate = parseValidDate(input.birthDate);
      const today = new Date().toISOString().slice(0, 10);
      if (!birthDate || birthDate > today) {
        return {
          ok: false,
          message: "Ngày sinh không hợp lệ hoặc nằm trong tương lai.",
        };
      }
    }

    const registeredGrade =
      profile.role === "STUDENT" &&
      isValidRegistrationGrade(profile.registration_grade)
        ? profile.registration_grade
        : null;

    if (profile.role === "STUDENT" && registeredGrade === null) {
      return { ok: false, message: missingRegistrationGradeMessage };
    }

    if (profile.role === "PARENT" && birthDate !== null) {
      return { ok: false, message: "Thông tin onboarding không hợp lệ." };
    }

    const { error } = await supabase.rpc("complete_onboarding", {
      p_full_name: fullName,
      p_grade: registeredGrade,
      p_birth_date: profile.role === "STUDENT" ? birthDate : null,
    });

    if (error) {
      if (error.message === "Registration grade unavailable") {
        return { ok: false, message: missingRegistrationGradeMessage };
      }
      return {
        ok: false,
        message: "Chưa thể hoàn tất hồ sơ. Vui lòng kiểm tra và thử lại.",
      };
    }

    return { ok: true, message: "" };
  } catch {
    return {
      ok: false,
      message: "Chưa thể kết nối dịch vụ hồ sơ. Vui lòng thử lại sau.",
    };
  }
}
