import { redirect } from "next/navigation";

import { LearningAccessState } from "@/components/LearningAccessState";
import { StudentClassroomsManager } from "@/components/StudentClassroomsManager";
import { loadStudentClassrooms } from "@/lib/classrooms/server";
import { getStudentLearningContext } from "@/lib/practice/server";

export const metadata = {
  title: "Lớp học của em",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentClassroomsPage() {
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

  const result = await loadStudentClassrooms(access.supabase);
  if (!result.ok) {
    return (
      <section className="content-page page-shell">
        <p className="eyebrow">Lớp học của em</p>
        <h1>Chưa thể tải lớp học</h1>
        <p>{result.message}</p>
      </section>
    );
  }

  const version = result.state.memberships
    .map(
      (membership) =>
        `${membership.membershipId}:${membership.status}`,
    )
    .join("|");

  return (
    <div className="student-classrooms-page student-workspace-page--v2 page-shell">
      <header className="catalog-hero catalog-hero--lessons">
        <p className="eyebrow">Kết nối lớp học</p>
        <h1>Lớp học của em</h1>
        <p>
          Nhập mã do giáo viên chia sẻ, xem đúng thông tin lớp rồi gửi yêu cầu
          tham gia.
        </p>
      </header>
      <StudentClassroomsManager
        key={version || "no-memberships"}
        initialMemberships={result.state.memberships}
      />
    </div>
  );
}
