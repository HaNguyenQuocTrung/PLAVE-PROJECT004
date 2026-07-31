"use server";

import { getRequestOrigin } from "@/lib/auth/request-origin";
import { createClient } from "@/lib/supabase/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const genericMessage =
  "Nếu email có tài khoản PLAVE, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.";

export async function requestPasswordReset(input: { email: string }) {
  const email = input.email.trim().toLowerCase();

  if (!emailPattern.test(email)) {
    return { ok: true, message: genericMessage };
  }

  try {
    const supabase = await createClient();
    const origin = await getRequestOrigin();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/confirm?next=/update-password`,
    });
  } catch {
    // The response intentionally stays identical to prevent account discovery.
  }

  return { ok: true, message: genericMessage };
}
