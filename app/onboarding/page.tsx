import { redirect } from "next/navigation";

import { OnboardingForm } from "@/app/onboarding/OnboardingForm";
import { AccessDenied } from "@/components/AccessDenied";
import { AuthBrandPanel } from "@/components/AuthBrandPanel";
import { isValidRegistrationGrade } from "@/lib/onboarding/validation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Hoàn tất hồ sơ",
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "role, full_name, onboarding_completed, registration_grade",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    !profile ||
    (profile.role !== "STUDENT" &&
      profile.role !== "PARENT" &&
      profile.role !== "TEACHER")
  ) {
    return <AccessDenied />;
  }

  if (profile.role === "TEACHER") {
    redirect(
      profile.onboarding_completed ? "/teacher" : "/teacher/onboarding",
    );
  }

  if (profile.onboarding_completed) {
    redirect("/dashboard");
  }

  const registeredGrade = isValidRegistrationGrade(
    profile.registration_grade,
  )
    ? profile.registration_grade
    : null;

  return (
    <section className="auth-page auth-page--v2 page-shell">
      <AuthBrandPanel
        eyebrow="Hồ sơ riêng tư"
        title="Sẵn sàng cho lộ trình của riêng bạn."
        description="PLAVE chỉ dùng thông tin cần thiết để mở đúng nội dung và vai trò."
      />
      <OnboardingForm
        role={profile.role}
        initialFullName={profile.full_name ?? ""}
        registeredGrade={registeredGrade}
      />
    </section>
  );
}
