import { notFound, redirect } from "next/navigation";

import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/Button";
import { TeacherAssignmentLifecycleManager } from "@/components/TeacherAssignmentLifecycleManager";
import {
  isAssignmentUuid,
  type AssignmentSubmissionStatus,
} from "@/lib/assignments/contracts";
import { formatVietnamDateTime } from "@/lib/assignments/deadline";
import { loadTeacherAssignmentRoster } from "@/lib/assignments/server";
import { getTeacherAccount } from "@/lib/teacher/server";

export const metadata = { title: "Tình hình bài tập" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ assignmentId: string }>;
};

const statusLabels: Record<AssignmentSubmissionStatus, string> = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang làm",
  SUBMITTED: "Đã nộp",
};

export default async function TeacherAssignmentDetailPage({
  params,
}: Props) {
  const { assignmentId } = await params;
  if (!isAssignmentUuid(assignmentId)) notFound();

  const account = await getTeacherAccount();
  if (!account.ok) {
    if (account.reason === "UNAUTHENTICATED") redirect("/login");
    if (account.reason === "ACTIVATION_REQUIRED") {
      redirect("/teacher/onboarding");
    }
    if (account.reason === "ACCESS_DENIED") return <AccessDenied />;
    return (
      <section className="content-page page-shell">
        <h1>Chưa thể tải tình hình bài tập</h1>
        <p>Vui lòng thử tải lại sau.</p>
      </section>
    );
  }

  const result = await loadTeacherAssignmentRoster(
    account.supabase,
    assignmentId,
  );
  if (!result.ok) {
    if (result.reason === "NOT_FOUND") notFound();
    return (
      <section className="content-page page-shell">
        <h1>Chưa thể tải tình hình bài tập</h1>
        <p>{result.message}</p>
      </section>
    );
  }

  const { assignment, students } = result.roster;
  const notStartedCount = students.filter(
    (student) => student.submissionStatus === "NOT_STARTED",
  ).length;
  const inProgressCount = students.filter(
    (student) => student.submissionStatus === "IN_PROGRESS",
  ).length;
  const submittedCount = students.filter(
    (student) => student.submissionStatus === "SUBMITTED",
  ).length;
  return (
    <div className="teacher-assignment-detail page-shell">
      <header className="catalog-hero teacher-hero">
        <div>
          <p className="eyebrow">{assignment.classroomName}</p>
          <h1>{assignment.title}</h1>
          <p>
            {assignment.totalCount} câu
            {assignment.instructions ? ` · ${assignment.instructions}` : ""}
          </p>
        </div>
        <Button
          href={`/teacher/assignments/${assignmentId}/analysis`}
          variant="secondary"
        >
          Xem phân tích
        </Button>
      </header>

      <TeacherAssignmentLifecycleManager
        initialAssignment={{
          assignmentId: assignment.assignmentId,
          status: assignment.status,
          effectiveState: assignment.effectiveState,
          dueAt: assignment.dueAt,
          closedAt: assignment.closedAt,
          serverNow: assignment.serverNow,
        }}
        notStartedCount={notStartedCount}
        inProgressCount={inProgressCount}
        submittedCount={submittedCount}
      />

      <section aria-labelledby="assignment-roster-title">
        <div className="classroom-section-heading">
          <div>
            <p className="eyebrow">Báo cáo cơ bản</p>
            <h2 id="assignment-roster-title">Tình hình học sinh</h2>
          </div>
          <span>{students.length}</span>
        </div>
        {students.length ? (
          <div className="assignment-roster-table">
            <table>
              <thead>
                <tr>
                  <th scope="col">Học sinh</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Tiến độ</th>
                  <th scope="col">Kết quả</th>
                  <th scope="col">Thời điểm nộp</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr
                    key={`${student.studentDisplayName}-${student.grade}-${index}`}
                  >
                    <th scope="row">{student.studentDisplayName}</th>
                    <td>{statusLabels[student.submissionStatus]}</td>
                    <td>
                      {student.answeredCount}/{student.totalCount}
                    </td>
                    <td>
                      {student.submissionStatus === "SUBMITTED"
                        ? `${student.correctCount}/${student.totalCount} · ${student.scorePercent}%`
                        : "Chưa có điểm"}
                    </td>
                    <td>
                      {student.submittedAt
                        ? formatVietnamDateTime(student.submittedAt)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <h3>Lớp chưa có học sinh được duyệt</h3>
            <p>Roster sẽ cập nhật khi học sinh tham gia lớp.</p>
          </div>
        )}
      </section>
    </div>
  );
}
