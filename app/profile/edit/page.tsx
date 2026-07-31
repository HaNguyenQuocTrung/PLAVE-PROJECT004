import { redirect } from "next/navigation";

import { ProfileEditForm } from "@/app/profile/edit/ProfileEditForm";
import { LearningAccessState } from "@/components/LearningAccessState";
import { getStudentProfileView } from "@/lib/profile/server";

export const metadata = {
  title: "Chỉnh sửa hồ sơ",
};

export default async function ProfileEditPage() {
  const result = await getStudentProfileView();

  if (!result.ok) {
    if (result.reason === "UNAUTHENTICATED") redirect("/login");
    if (result.reason === "ONBOARDING_REQUIRED") redirect("/onboarding");
    return (
      <LearningAccessState
        kind={result.reason === "ACCESS_DENIED" ? "FORBIDDEN" : "UNAVAILABLE"}
      />
    );
  }

  return (
    <div className="profile-page page-shell">
      <header className="catalog-hero profile-hero">
        <p className="eyebrow">Hồ sơ học sinh</p>
        <h1>Chỉnh sửa thông tin</h1>
        <p>
          Em có thể cập nhật tên hiển thị và ngày sinh tùy chọn. Lớp, vai trò
          và mã học sinh luôn được bảo vệ.
        </p>
      </header>
      <ProfileEditForm
        initialFullName={result.profile.fullName}
        initialBirthDate={result.profile.birthDate ?? ""}
        grade={result.profile.grade}
        studentCode={result.profile.studentCode}
      />
    </div>
  );
}
