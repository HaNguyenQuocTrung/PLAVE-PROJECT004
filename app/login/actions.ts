"use server";

import { createClient } from "@/lib/supabase/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function loginWithPassword(input: {
  email: string;
  password: string;
}) {
  const email = input.email.trim().toLowerCase();

  if (!emailPattern.test(email) || !input.password) {
    return { ok: false, message: "Email hoặc mật khẩu chưa hợp lệ." };
  }

  try {
    const supabase = await createClient();
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password: input.password,
      });

    if (signInError) {
      return {
        ok: false,
        message:
          "Chưa thể đăng nhập bằng thông tin này. Hãy kiểm tra email, mật khẩu và email xác nhận nếu bạn vừa đăng ký.",
      };
    }

    const user = signInData.user;
    if (!user) {
      await supabase.auth.signOut();
      return {
        ok: false,
        message: "Phiên đăng nhập chưa hợp lệ. Vui lòng thử lại.",
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
      (profile.role !== "STUDENT" &&
        profile.role !== "PARENT" &&
        profile.role !== "TEACHER")
    ) {
      await supabase.auth.signOut();
      return {
        ok: false,
        message:
          "Hồ sơ chưa sẵn sàng hoặc không có quyền truy cập. Vui lòng thử lại sau.",
      };
    }

    return {
      ok: true,
      message: "",
      destination:
        profile.role === "TEACHER"
          ? profile.onboarding_completed
            ? "/teacher"
            : "/teacher/onboarding"
          : profile.onboarding_completed
            ? "/dashboard"
            : "/onboarding",
    };
  } catch {
    return {
      ok: false,
      message:
        "Chưa thể kết nối dịch vụ xác thực. Bạn vẫn có thể dùng phần học thử.",
    };
  }
}
