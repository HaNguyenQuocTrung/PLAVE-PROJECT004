"use server";

import { getRequestOrigin } from "@/lib/auth/request-origin";
import { classifyAuthThrottle } from "@/lib/auth/error-classification";
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/confirm?next=/update-password`,
    });
    if (error) {
      // Classify at the server boundary, but preserve one public response for
      // every address so reset requests cannot disclose account existence.
      classifyAuthThrottle("PASSWORD_RESET_EMAIL", error);
    }
  } catch (error) {
    classifyAuthThrottle("PASSWORD_RESET_EMAIL", error);
    // The response intentionally stays identical to prevent account discovery.
  }

  return { ok: true, message: genericMessage };
}
