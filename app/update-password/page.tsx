import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { UpdatePasswordForm } from "@/app/update-password/UpdatePasswordForm";
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
    <section className="auth-page auth-page--compact page-shell">
      <div className="auth-intro">
        <p className="eyebrow">Bảo mật tài khoản</p>
        <h1>Đặt mật khẩu mới</h1>
        <p>
          Phiên khôi phục chỉ có hiệu lực trong thời gian ngắn. Mật khẩu không
          được gửi qua biểu mẫu nào khác.
        </p>
      </div>
      <UpdatePasswordForm />
    </section>
  );
}
