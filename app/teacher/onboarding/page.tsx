import { redirect } from "next/navigation";

import { TeacherOnboardingForm } from "@/app/teacher/onboarding/TeacherOnboardingForm";
import { AccessDenied } from "@/components/AccessDenied";
import { LogoutForm } from "@/components/LogoutForm";
import { getTeacherAccount } from "@/lib/teacher/server";

export const metadata = {
  title: "Xác minh giáo viên",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeacherOnboardingPage() {
  const account = await getTeacherAccount();

  if (!account.ok) {
    if (account.reason === "UNAUTHENTICATED") redirect("/login");
    if (account.reason === "ACCESS_DENIED") return <AccessDenied />;
    if (account.reason === "DATA_UNAVAILABLE") {
      return (
        <section className="content-page page-shell">
          <p className="eyebrow">Xác minh giáo viên</p>
          <h1>Chưa thể tải hồ sơ</h1>
          <p>Vui lòng thử tải lại sau.</p>
        </section>
      );
    }

    return (
      <section className="auth-page teacher-onboarding-page page-shell">
        <div className="auth-intro">
          <p className="eyebrow">Tài khoản giáo viên</p>
          <h1>Xác minh mã mời</h1>
          <p>
            Nhập lại mã mời đã được PLAVE cấp. Mã không được lưu trong URL,
            metadata tài khoản hoặc bộ nhớ trình duyệt.
          </p>
        </div>
        <TeacherOnboardingForm
          initialFullName={account.initialFullName}
        />
        <div className="teacher-onboarding-page__logout">
          <p>Chưa sẵn sàng xác minh?</p>
          <LogoutForm buttonVariant="secondary" />
        </div>
      </section>
    );
  }

  redirect("/teacher");
}
