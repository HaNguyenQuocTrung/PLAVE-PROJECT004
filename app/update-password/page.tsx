import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { UpdatePasswordForm } from "@/app/update-password/UpdatePasswordForm";
import { AuthBrandPanel } from "@/components/AuthBrandPanel";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Đặt mật khẩu mới",
};

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=recovery");
  }

  const cookieStore = await cookies();
  if (cookieStore.get("plave_recovery")?.value !== "1") {
    redirect("/dashboard");
  }

  return (
    <section className="auth-page auth-page--v2 auth-page--compact page-shell">
      <AuthBrandPanel
        eyebrow="Bảo mật tài khoản"
        title="Một khởi đầu an toàn."
        description="Đặt mật khẩu mới để tiếp tục hành trình học Toán của bạn."
      />
      <UpdatePasswordForm />
    </section>
  );
}
