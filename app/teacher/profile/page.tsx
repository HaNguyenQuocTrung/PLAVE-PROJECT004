import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/Button";
import { getTeacherAccount } from "@/lib/teacher/server";

export const metadata = {
  title: "Hồ sơ giáo viên",
};

function formatActivationDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export default async function TeacherProfilePage() {
  const account = await getTeacherAccount();

  if (!account.ok) {
    if (account.reason === "UNAUTHENTICATED") redirect("/login");
    if (account.reason === "ACTIVATION_REQUIRED") {
      redirect("/teacher/onboarding");
    }
    if (account.reason === "ACCESS_DENIED") return <AccessDenied />;
    return (
      <section className="content-page page-shell">
        <h1>Chưa thể tải hồ sơ giáo viên</h1>
        <p>Vui lòng thử tải lại sau.</p>
      </section>
    );
  }

  return (
    <div className="profile-page teacher-profile-page account-page--v2 teacher-workspace-page--v2 page-shell">
      <header className="catalog-hero teacher-hero">
        <p className="eyebrow">Hồ sơ giáo viên</p>
        <h1>{account.profile.fullName}</h1>
        <p>
          PLAVE chỉ lưu thông tin tối thiểu cần thiết để xác minh tài khoản
          giáo viên.
        </p>
      </header>

      <section className="profile-card" aria-labelledby="teacher-info-title">
        <div className="profile-card__heading">
          <div>
            <p className="eyebrow">Thông tin hiện tại</p>
            <h2 id="teacher-info-title">Tài khoản của bạn</h2>
          </div>
          <span className="teacher-status-badge">Đã xác minh</span>
        </div>
        <dl>
          <div>
            <dt>Họ và tên</dt>
            <dd>{account.profile.fullName}</dd>
          </div>
          <div>
            <dt>Vai trò</dt>
            <dd>Giáo viên</dd>
          </div>
          <div>
            <dt>Trạng thái</dt>
            <dd>Đã xác minh</dd>
          </div>
          <div>
            <dt>Ngày kích hoạt</dt>
            <dd>{formatActivationDate(account.profile.activatedAt)}</dd>
          </div>
        </dl>
      </section>

      <div className="profile-page__actions">
        <Button href="/teacher">Về Tổng quan</Button>
        <Button href="/privacy" variant="secondary">
          Xem quyền riêng tư
        </Button>
      </div>
    </div>
  );
}
