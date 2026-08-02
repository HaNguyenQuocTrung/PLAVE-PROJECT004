import { redirect } from "next/navigation";

import { TeacherOnboardingForm } from "@/app/teacher/onboarding/TeacherOnboardingForm";
import { AccessDenied } from "@/components/AccessDenied";
import { AuthBrandPanel } from "@/components/AuthBrandPanel";
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
      <section className="auth-page auth-page--v2 teacher-onboarding-page page-shell">
        <AuthBrandPanel
          eyebrow="Không gian giáo viên"
          title="Dạy học rõ ràng hơn."
          description="Xác minh tài khoản để quản lý lớp và bài tập trong đúng phạm vi của bạn."
        />
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
