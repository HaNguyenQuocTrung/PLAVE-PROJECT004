"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export async function updatePassword(input: {
  password: string;
  confirmPassword: string;
}) {
  if (input.password.length < 8) {
    return { ok: false, message: "Mật khẩu phải có ít nhất 8 ký tự." };
  }
  if (input.password !== input.confirmPassword) {
    return { ok: false, message: "Hai mật khẩu chưa trùng nhau." };
  }

  const cookieStore = await cookies();
  if (cookieStore.get("plave_recovery")?.value !== "1") {
    return {
      ok: false,
      message: "Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
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
        message: "Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: input.password,
    });

    if (error) {
      return {
        ok: false,
        message:
          "Chưa thể cập nhật mật khẩu. Vui lòng mở lại liên kết mới nhất trong email.",
      };
    }

    await supabase.auth.signOut();
    cookieStore.delete("plave_recovery");
    return { ok: true, message: "" };
  } catch {
    return {
      ok: false,
      message: "Chưa thể cập nhật mật khẩu lúc này. Vui lòng thử lại sau.",
    };
  }
}
