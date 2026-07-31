import { notFound, redirect } from "next/navigation";

import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/Button";
import { ClassroomRosterManager } from "@/components/ClassroomRosterManager";
import { CopyClassroomCode } from "@/components/CopyClassroomCode";
import { isUuid } from "@/lib/classrooms/contracts";
import { loadTeacherClassroom } from "@/lib/classrooms/server";
import { getTeacherAccount } from "@/lib/teacher/server";

export const metadata = {
  title: "Quản lý lớp học",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TeacherClassroomDetailPageProps = {
  params: Promise<{ classroomId: string }>;
};

export default async function TeacherClassroomDetailPage({
  params,
}: TeacherClassroomDetailPageProps) {
  const { classroomId } = await params;
  if (!isUuid(classroomId)) notFound();

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

  const result = await loadTeacherClassroom(
    account.supabase,
    classroomId,
  );
  if (!result.ok) {
    if (result.reason === "NOT_FOUND") notFound();
    return (
      <section className="content-page page-shell">
        <h1>Chưa thể tải lớp học</h1>
        <p>{result.message}</p>
      </section>
    );
  }

  const version = result.detail.memberships
    .map(
      (membership) =>
        `${membership.membershipId}:${membership.status}`,
    )
    .join("|");

  return (
    <div className="teacher-classroom-detail page-shell">
      <header className="catalog-hero teacher-hero">
        <div>
          <p className="eyebrow">Lớp {result.detail.classroom.grade}</p>
          <h1>{result.detail.classroom.name}</h1>
          <p>
            Duyệt yêu cầu tham gia và quản lý thành viên của lớp.
          </p>
        </div>
        <Button
          href={`/teacher/classes/${classroomId}/gradebook`}
          variant="secondary"
        >
          Xem bảng điểm
        </Button>
      </header>

      <section
        className="classroom-code-card"
        aria-labelledby="classroom-code-title"
      >
        <div>
          <p className="eyebrow">Mã lớp</p>
          <h2 id="classroom-code-title">
            {result.detail.classroom.classCode}
          </h2>
          <p>
            Chỉ chia sẻ mã với đúng học sinh. Mỗi học sinh cần gửi yêu cầu và
            chờ bạn đồng ý.
          </p>
        </div>
        <CopyClassroomCode code={result.detail.classroom.classCode} />
      </section>

      <ClassroomRosterManager
        key={version || "no-memberships"}
        initialMemberships={result.detail.memberships}
      />
    </div>
  );
}
