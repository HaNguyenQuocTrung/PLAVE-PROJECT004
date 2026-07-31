import { redirect } from "next/navigation";

import { Button } from "@/components/Button";
import { LearningAccessState } from "@/components/LearningAccessState";
import { LogoutForm } from "@/components/LogoutForm";
import { getStudentLearningContext } from "@/lib/practice/server";
import { maskAccountEmail } from "@/lib/profile/validation";

export const metadata = {
  title: "Cài đặt tài khoản",
};

export default async function SettingsPage() {
  const access = await getStudentLearningContext();

  if (!access.ok) {
    if (access.reason === "UNAUTHENTICATED") redirect("/login");
    if (access.reason === "ONBOARDING_REQUIRED") redirect("/onboarding");
    return (
      <LearningAccessState
        kind={access.reason === "ACCESS_DENIED" ? "FORBIDDEN" : "UNAVAILABLE"}
      />
    );
  }

  return (
    <div className="settings-page page-shell">
      <header className="catalog-hero settings-hero">
        <p className="eyebrow">Tài khoản PLAVE</p>
        <h1>Cài đặt tài khoản</h1>
        <p>
          Quản lý mật khẩu, quyền riêng tư và phiên đăng nhập của em tại một
          nơi an toàn.
        </p>
      </header>

      <div className="settings-grid">
        <section
          className="settings-card"
          aria-labelledby="settings-account-title"
        >
          <h2 id="settings-account-title">Thông tin đăng nhập</h2>
          <dl>
            <div>
              <dt>Email tài khoản</dt>
              <dd>{maskAccountEmail(access.user.email)}</dd>
            </div>
            <div>
              <dt>Lớp học hiện tại</dt>
              <dd>Lớp {access.grade}</dd>
            </div>
          </dl>
          <p>
            Lớp học chưa thể thay đổi trực tiếp để tránh làm sai lộ trình và
            kết quả học hiện có.
          </p>
          <Button href="/forgot-password">Đổi mật khẩu</Button>
        </section>

        <section
          className="settings-card settings-card--privacy"
          aria-labelledby="settings-privacy-title"
        >
          <h2 id="settings-privacy-title">Quyền riêng tư</h2>
          <p>
            Xem cách PLAVE bảo vệ hồ sơ, ngày sinh tùy chọn và dữ liệu học tập
            của em.
          </p>
          <Button href="/privacy" variant="secondary">
            Xem quyền riêng tư
          </Button>
        </section>

        <section
          className="settings-card settings-card--session"
          aria-labelledby="settings-session-title"
        >
          <h2 id="settings-session-title">Phiên đăng nhập</h2>
          <p>
            Chỉ đăng xuất khi em đã học xong hoặc không còn sử dụng thiết bị
            này.
          </p>
          <LogoutForm />
        </section>
      </div>
    </div>
  );
}
