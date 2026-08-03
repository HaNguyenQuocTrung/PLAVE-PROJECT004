"use server";

import { getRequestOrigin } from "@/lib/auth/request-origin";
import {
  buildRegistrationMetadata,
  classifySignUpResult,
  registrationServiceUnavailable,
  uncertainTransportResult,
  validationFailure,
} from "@/lib/auth/registration-result";
import { createClient } from "@/lib/supabase/server";
import {
  isTeacherInvitationCode,
  normalizeTeacherInvitationCode,
} from "@/lib/teacher/contracts";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RegisterInput = {
  role: "STUDENT" | "PARENT" | "TEACHER";
  grade: number | null;
  invitationCode: string | null;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
};

export async function registerAccount(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();

  if (
    input.role !== "STUDENT" &&
    input.role !== "PARENT" &&
    input.role !== "TEACHER"
  ) {
    return validationFailure("Vai trò đăng ký không hợp lệ.");
  }
  if (!emailPattern.test(email)) {
    return validationFailure("Email chưa đúng định dạng.");
  }
  if (input.password.length < 8) {
    return validationFailure("Mật khẩu phải có ít nhất 8 ký tự.");
  }
  if (input.password !== input.confirmPassword) {
    return validationFailure("Hai mật khẩu chưa trùng nhau.");
  }
  if (!input.acceptedTerms) {
    return validationFailure("Bạn cần đồng ý với điều khoản để tiếp tục.");
  }
  if (
    input.role === "STUDENT" &&
    (!Number.isInteger(input.grade) || !input.grade || input.grade < 1 || input.grade > 9)
  ) {
    return validationFailure("Vui lòng chọn lớp từ 1 đến 9.");
  }
  if (input.role !== "STUDENT" && input.grade !== null) {
    return validationFailure("Thông tin đăng ký không hợp lệ.");
  }
  if (
    input.role === "TEACHER" &&
    (!input.invitationCode ||
      !isTeacherInvitationCode(
        normalizeTeacherInvitationCode(input.invitationCode),
      ))
  ) {
    return validationFailure("Mã mời giáo viên chưa đúng định dạng.");
  }
  if (input.role !== "TEACHER" && input.invitationCode !== null) {
    return validationFailure("Thông tin đăng ký không hợp lệ.");
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let origin: string;
  try {
    [supabase, origin] = await Promise.all([
      createClient(),
      getRequestOrigin(),
    ]);
  } catch {
    return registrationServiceUnavailable();
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: buildRegistrationMetadata(input.role, input.grade),
        emailRedirectTo: `${origin}/auth/confirm?next=${
          input.role === "TEACHER"
            ? "/teacher/onboarding"
            : "/onboarding"
        }`,
      },
    });

    const result = classifySignUpResult(data, error);
    if (result.outcome === "CREATED_SESSION" && data.session) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Account creation is already confirmed. Cleanup failure must not
        // reclassify the completed signup as an email-delivery uncertainty.
        return result;
      }
    }
    return result;
  } catch {
    return uncertainTransportResult();
  }
}
