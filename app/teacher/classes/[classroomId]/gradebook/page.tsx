import { notFound, redirect } from "next/navigation";

import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/Button";
import { isAssignmentUuid } from "@/lib/assignments/contracts";
import type { GradebookSubmissionStatus } from "@/lib/gradebook/contracts";
import { loadTeacherClassGradebook } from "@/lib/gradebook/server";
import { getTeacherAccount } from "@/lib/teacher/server";

export const metadata = { title: "Bảng điểm lớp học" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ classroomId: string }>;
  searchParams: Promise<{ assignment?: string | string[] }>;
};

const statusLabels: Record<GradebookSubmissionStatus, string> = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang làm",
  SUBMITTED: "Đã nộp",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function TeacherClassGradebookPage({
  params,
  searchParams,
}: Props) {
  const { classroomId } = await params;
  const query = await searchParams;
  if (!isAssignmentUuid(classroomId)) notFound();

  const requestedAssignment =
    typeof query.assignment === "string" ? query.assignment : null;
  if (
    query.assignment !== undefined &&
    (!requestedAssignment || !isAssignmentUuid(requestedAssignment))
  ) {
    notFound();
  }

  const account = await getTeacherAccount();
  if (!account.ok) {
    if (account.reason === "UNAUTHENTICATED") redirect("/login");
    if (account.reason === "ACTIVATION_REQUIRED") {
      redirect("/teacher/onboarding");
    }
    if (account.reason === "ACCESS_DENIED") return <AccessDenied />;
    return (
      <section className="content-page page-shell">
        <h1>Chưa thể tải bảng điểm</h1>
        <p>Vui lòng thử tải lại sau.</p>
        <Button href={`/teacher/classes/${classroomId}/gradebook`}>
          Thử tải lại
        </Button>
      </section>
    );
  }

  const result = await loadTeacherClassGradebook(
    account.supabase,
    classroomId,
    requestedAssignment,
  );
  if (!result.ok) {
    if (result.reason === "NOT_FOUND") notFound();
    return (
      <section className="content-page page-shell">
        <h1>Chưa thể tải bảng điểm</h1>
        <p>{result.message}</p>
        <div className="page-actions">
          <Button href={`/teacher/classes/${classroomId}/gradebook`}>
            Thử tải lại
          </Button>
          <Button
            href={`/teacher/classrooms/${classroomId}`}
            variant="secondary"
          >
            Về lớp học
          </Button>
        </div>
      </section>
    );
  }

  const { gradebook } = result;
  return (
    <div className="teacher-gradebook-page teacher-workspace-page--v2 page-shell">
      <header className="catalog-hero teacher-hero">
        <div>
          <p className="eyebrow">Lớp {gradebook.classroom.grade}</p>
          <h1>Bảng điểm {gradebook.classroom.classroomName}</h1>
          <p>
            Theo dõi trạng thái và kết quả chính thức của học sinh đang tham
            gia lớp.
          </p>
        </div>
        <Button
          href={`/teacher/classrooms/${classroomId}`}
          variant="secondary"
        >
          Về lớp học
        </Button>
      </header>

      <section
        className="gradebook-summary"
        aria-label="Tóm tắt lớp học"
      >
        <article>
          <span>Học sinh đang tham gia</span>
          <strong>{gradebook.classroom.studentCount}</strong>
        </article>
        <article>
          <span>Bài tập đã phát hành</span>
          <strong>{gradebook.assignments.length}</strong>
        </article>
        <article>
          <span>Bài đang xem</span>
          <strong>
            {gradebook.selectedAssignment
              ? gradebook.selectedAssignment.title
              : "Chưa có"}
          </strong>
        </article>
      </section>

      {gradebook.assignments.length ? (
        <>
          <section
            className="gradebook-filter-card"
            aria-labelledby="gradebook-filter-title"
          >
            <div>
              <p className="eyebrow">Bộ lọc</p>
              <h2 id="gradebook-filter-title">Chọn bài tập</h2>
            </div>
            <form method="get">
              <label htmlFor="assignment-filter">Bài tập đã phát hành</label>
              <select
                id="assignment-filter"
                name="assignment"
                defaultValue={
                  gradebook.selectedAssignment?.assignmentId ?? ""
                }
              >
                {gradebook.assignments.map((assignment) => (
                  <option
                    key={assignment.assignmentId}
                    value={assignment.assignmentId}
                  >
                    {assignment.title} · {assignment.submittedCount} đã nộp
                  </option>
                ))}
              </select>
              <Button type="submit">Xem bảng điểm</Button>
            </form>
          </section>

          {gradebook.selectedAssignment ? (
            <section
              className="gradebook-table-card"
              aria-labelledby="gradebook-students-title"
            >
              <div className="classroom-section-heading">
                <div>
                  <p className="eyebrow">Kết quả chính thức</p>
                  <h2 id="gradebook-students-title">
                    {gradebook.selectedAssignment.title}
                  </h2>
                </div>
                <Button
                  href={`/teacher/assignments/${gradebook.selectedAssignment.assignmentId}/analysis`}
                  variant="secondary"
                >
                  Xem phân tích
                </Button>
              </div>

              {gradebook.students.length ? (
                <div className="gradebook-table">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Học sinh</th>
                        <th scope="col">Trạng thái</th>
                        <th scope="col">Tiến độ</th>
                        <th scope="col">Điểm</th>
                        <th scope="col">Tỷ lệ</th>
                        <th scope="col">Nộp lúc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradebook.students.map((student, index) => (
                        <tr
                          key={`${student.studentDisplayName}-${index}`}
                        >
                          <th scope="row">
                            {student.studentDisplayName}
                          </th>
                          <td>
                            <span
                              className={`gradebook-status gradebook-status--${student.submissionStatus.toLowerCase()}`}
                            >
                              {statusLabels[student.submissionStatus]}
                            </span>
                          </td>
                          <td>
                            {student.submissionStatus === "NOT_STARTED"
                              ? "Chưa làm"
                              : `${student.answeredCount}/${student.totalCount} câu`}
                          </td>
                          <td>
                            {student.submissionStatus === "SUBMITTED"
                              ? `${student.correctCount}/${student.totalCount}`
                              : "Chưa có điểm"}
                          </td>
                          <td>
                            {student.submissionStatus === "SUBMITTED"
                              ? `${student.scorePercent}%`
                              : "—"}
                          </td>
                          <td>{formatDate(student.submittedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <h3>Lớp chưa có học sinh đang tham gia</h3>
                  <p>
                    Bảng điểm chỉ gồm học sinh có trạng thái tham gia đã được
                    duyệt.
                  </p>
                </div>
              )}
            </section>
          ) : null}
        </>
      ) : (
        <div className="empty-state empty-state--large">
          <h2>Lớp chưa có bài tập</h2>
          <p>Giao bài đầu tiên để bắt đầu theo dõi bảng điểm.</p>
          <Button href="/teacher/assignments/new">Giao bài tập</Button>
        </div>
      )}
    </div>
  );
}
