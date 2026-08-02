import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/AccessDenied";
import { TeacherClassroomsManager } from "@/components/TeacherClassroomsManager";
import { loadTeacherClassrooms } from "@/lib/classrooms/server";
import { getTeacherAccount } from "@/lib/teacher/server";

export const metadata = {
  title: "Lớp học giáo viên",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeacherClassroomsPage() {
  const account = await getTeacherAccount();

  if (!account.ok) {
    if (account.reason === "UNAUTHENTICATED") redirect("/login");
    if (account.reason === "ACTIVATION_REQUIRED") {
      redirect("/teacher/onboarding");
    }
    if (account.reason === "ACCESS_DENIED") return <AccessDenied />;
    return (
      <section className="content-page page-shell">
        <h1>Chưa thể tải lớp học</h1>
        <p>Vui lòng thử tải lại sau.</p>
      </section>
    );
  }

  const result = await loadTeacherClassrooms(account.supabase);
  if (!result.ok) {
    return (
      <section className="content-page page-shell">
        <p className="eyebrow">Lớp học</p>
        <h1>Chưa thể tải danh sách lớp</h1>
        <p>{result.message}</p>
      </section>
    );
  }

  const version = result.state.classrooms
    .map(
      (classroom) =>
        `${classroom.classroomId}:${classroom.pendingCount}:${classroom.approvedCount}`,
    )
    .join("|");

  return (
    <div className="teacher-classrooms-page teacher-workspace-page--v2 page-shell">
      <header className="catalog-hero teacher-hero">
        <p className="eyebrow">Không gian giáo viên</p>
        <h1>Lớp học</h1>
        <p>
          Tạo lớp, chia sẻ mã riêng và duyệt từng yêu cầu tham gia của học
          sinh.
        </p>
      </header>
      <TeacherClassroomsManager
        key={version || "no-classrooms"}
        initialClassrooms={result.state.classrooms}
      />
    </div>
  );
}
