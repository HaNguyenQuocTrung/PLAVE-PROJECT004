import Link from "next/link";
import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/Button";
import { loadTeacherAssignments } from "@/lib/assignments/server";
import {
  getAssignmentDeadlineText,
  getAssignmentDisplayState,
  getAssignmentStateLabel,
} from "@/lib/assignments/deadline";
import { getTeacherAccount } from "@/lib/teacher/server";

export const metadata = { title: "Bài tập giáo viên" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeacherAssignmentsPage() {
  const account = await getTeacherAccount();
  if (!account.ok) {
    if (account.reason === "UNAUTHENTICATED") redirect("/login");
    if (account.reason === "ACTIVATION_REQUIRED") {
      redirect("/teacher/onboarding");
    }
    if (account.reason === "ACCESS_DENIED") return <AccessDenied />;
    return (
      <section className="content-page page-shell">
        <h1>Chưa thể tải bài tập</h1>
        <p>Vui lòng thử tải lại sau.</p>
      </section>
    );
  }

  const result = await loadTeacherAssignments(account.supabase);
  if (!result.ok) {
    return (
      <section className="content-page page-shell">
        <h1>Chưa thể tải bài tập</h1>
        <p>{result.message}</p>
      </section>
    );
  }

  return (
    <div className="teacher-assignments-page teacher-workspace-page--v2 page-shell">
      <header className="catalog-hero teacher-hero">
        <div>
          <p className="eyebrow">Theo dõi giao bài</p>
          <h1>Bài tập</h1>
          <p>
            Xem trạng thái làm bài và điểm tổng của học sinh trong lớp.
          </p>
        </div>
        <Button href="/teacher/assignments/new">Giao bài mới</Button>
      </header>

      {result.list.assignments.length ? (
        <ul className="teacher-assignment-grid">
          {result.list.assignments.map((assignment) => (
            <li key={assignment.assignmentId}>
              <span
                className={`assignment-state assignment-state--${getAssignmentDisplayState(
                  assignment.effectiveState,
                  assignment.dueAt,
                  assignment.serverNow,
                ).toLowerCase()}`}
              >
                {getAssignmentStateLabel(
                  getAssignmentDisplayState(
                    assignment.effectiveState,
                    assignment.dueAt,
                    assignment.serverNow,
                  ),
                )}
              </span>
              <h2>{assignment.title}</h2>
              <p>
                {assignment.classroomName} · Lớp {assignment.grade}
              </p>
              <dl>
                <div>
                  <dt>Số câu</dt>
                  <dd>{assignment.totalCount}</dd>
                </div>
                <div>
                  <dt>Trạng thái lớp</dt>
                  <dd>
                    {assignment.notStartedCount} chưa làm ·{" "}
                    {assignment.inProgressCount} đang làm ·{" "}
                    {assignment.submittedCount} đã nộp
                  </dd>
                </div>
                <div>
                  <dt>Hạn nộp</dt>
                  <dd>
                    {
                      getAssignmentDeadlineText(
                        assignment.effectiveState,
                        assignment.dueAt,
                        assignment.serverNow,
                      ).exact
                    }
                  </dd>
                </div>
              </dl>
              <Link
                className="button button--primary"
                href={`/teacher/assignments/${assignment.assignmentId}`}
              >
                Xem tình hình lớp
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state empty-state--large">
          <h2>Bạn chưa giao bài tập nào</h2>
          <p>Tạo câu hỏi trong kho rồi phát hành một bài tập cho lớp.</p>
          <Button href="/teacher/assignments/new">Giao bài đầu tiên</Button>
        </div>
      )}
    </div>
  );
}
