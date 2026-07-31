import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { sanitizeNextPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

const allowedOtpTypes = new Set<EmailOtpType>([
  "email",
  "email_change",
  "invite",
  "magiclink",
  "recovery",
  "signup",
]);

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return Boolean(value && allowedOtpTypes.has(value as EmailOtpType));
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const nextPath = sanitizeNextPath(
    requestUrl.searchParams.get("next"),
    "/onboarding",
  );
  const supabase = await createClient();

  let verificationError = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verificationError = Boolean(error);
  } else if (tokenHash && isEmailOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    verificationError = Boolean(error);
  } else {
    verificationError = true;
  }

  if (verificationError) {
    return NextResponse.redirect(
      new URL("/login?error=confirm", requestUrl.origin),
    );
  }

  const isRecovery = type === "recovery" || nextPath === "/update-password";
  const destination = isRecovery ? "/update-password" : nextPath;

  if (isRecovery) {
    const cookieStore = await cookies();
    cookieStore.set("plave_recovery", "1", {
      httpOnly: true,
      maxAge: 60 * 15,
      path: "/",
      sameSite: "lax",
      secure: requestUrl.protocol === "https:",
    });
  }

  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}
