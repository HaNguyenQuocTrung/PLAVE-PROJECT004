import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/Button";
import {
  loadTeacherAssignments,
  loadTeacherQuestionLibrary,
} from "@/lib/assignments/server";
import { loadTeacherClassrooms } from "@/lib/classrooms/server";
import { getTeacherAccount } from "@/lib/teacher/server";

export const metadata = {
  title: "Tổng quan giáo viên",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeacherDashboardPage() {
  const account = await getTeacherAccount();

  if (!account.ok) {
    if (account.reason === "UNAUTHENTICATED") redirect("/login");
    if (account.reason === "ACTIVATION_REQUIRED") {
      redirect("/teacher/onboarding");
    }
    if (account.reason === "ACCESS_DENIED") return <AccessDenied />;
    return (
      <section className="content-page page-shell">
        <p className="eyebrow">Tổng quan giáo viên</p>
        <h1>Chưa thể tải hồ sơ</h1>
        <p>Vui lòng thử tải lại sau.</p>
      </section>
    );
  }

  const [classroomResult, questionResult, assignmentResult] =
    await Promise.all([
      loadTeacherClassrooms(account.supabase),
      loadTeacherQuestionLibrary(account.supabase),
      loadTeacherAssignments(account.supabase),
    ]);
  const classroomCount = classroomResult.ok
    ? classroomResult.state.classrooms.length
    : null;
  const activeQuestionCount = questionResult.ok
    ? questionResult.library.questions.filter(
        (question) => question.status === "ACTIVE",
      ).length
    : null;
  const assignmentCount = assignmentResult.ok
    ? assignmentResult.list.assignments.length
    : null;

  return (
    <div className="teacher-dashboard page-shell">
      <header className="catalog-hero teacher-hero">
        <p className="eyebrow">Không gian giáo viên</p>
        <h1>Xin chào, {account.profile.fullName}</h1>
        <p>
          Tài khoản giáo viên của bạn đã được xác minh bằng mã mời PLAVE.
        </p>
      </header>

      <section
        className="teacher-status-card"
        aria-labelledby="teacher-status-title"
      >
        <div>
          <span className="teacher-status-badge">Đã xác minh</span>
          <h2 id="teacher-status-title">
            {classroomCount === null
              ? "Quản lý lớp học"
              : classroomCount === 0
                ? "Bạn chưa có lớp học"
                : `${classroomCount} lớp đang hoạt động`}
          </h2>
          <p>
            Tạo lớp, chia sẻ mã riêng và duyệt từng yêu cầu tham gia của học
            sinh. PLAVE không tự thêm học sinh vào lớp.
          </p>
        </div>
        <Button href="/teacher/classrooms">
          {classroomCount !== null && classroomCount > 0
            ? "Quản lý lớp học"
            : "Tạo lớp học"}
        </Button>
      </section>

      <section className="teacher-assignment-overview">
        <article>
          <p className="eyebrow">Kho câu hỏi</p>
          <h2>
            {activeQuestionCount === null
              ? "Chưa thể tải"
              : `${activeQuestionCount} câu đang sử dụng`}
          </h2>
          <p>Tạo câu hỏi có đáp án và lời giải để dùng khi giao bài.</p>
          <Button href="/teacher/questions" variant="secondary">
            Mở kho câu hỏi
          </Button>
        </article>
        <article>
          <p className="eyebrow">Bài tập</p>
          <h2>
            {assignmentCount === null
              ? "Chưa thể tải"
              : `${assignmentCount} bài đã giao`}
          </h2>
          <p>Theo dõi học sinh chưa làm, đang làm và đã nộp.</p>
          <Button href="/teacher/assignments" variant="secondary">
            Quản lý bài tập
          </Button>
        </article>
      </section>
    </div>
  );
}
