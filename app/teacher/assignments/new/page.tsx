import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/AccessDenied";
import { TeacherAssignmentPublisher } from "@/components/TeacherAssignmentPublisher";
import { TeacherCurriculumAssignmentBuilder } from "@/components/TeacherCurriculumAssignmentBuilder";
import { loadTeacherQuestionLibrary } from "@/lib/assignments/server";
import { loadTeacherClassrooms } from "@/lib/classrooms/server";
import { getTeacherAccount } from "@/lib/teacher/server";

export const metadata = { title: "Giao bài tập mới" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewTeacherAssignmentPage() {
  const account = await getTeacherAccount();
  if (!account.ok) {
    if (account.reason === "UNAUTHENTICATED") redirect("/login");
    if (account.reason === "ACTIVATION_REQUIRED") {
      redirect("/teacher/onboarding");
    }
    if (account.reason === "ACCESS_DENIED") return <AccessDenied />;
    return (
      <section className="content-page page-shell">
        <h1>Chưa thể mở trình giao bài</h1>
        <p>Vui lòng thử tải lại sau.</p>
      </section>
    );
  }

  const [classrooms, questions] = await Promise.all([
    loadTeacherClassrooms(account.supabase),
    loadTeacherQuestionLibrary(account.supabase),
  ]);
  if (!classrooms.ok || !questions.ok) {
    return (
      <section className="content-page page-shell">
        <h1>Chưa thể mở trình giao bài</h1>
        <p>
          {!classrooms.ok ? classrooms.message : questions.message}
        </p>
      </section>
    );
  }

  return (
    <div className="teacher-assignment-new-page teacher-workspace-page--v2 page-shell">
      <TeacherCurriculumAssignmentBuilder
        classrooms={classrooms.state.classrooms}
      />
      <section
        className="teacher-authored-assignment-section"
        aria-labelledby="teacher-authored-assignment-title"
      >
        <p className="eyebrow">Câu hỏi giáo viên tự soạn</p>
        <h2 id="teacher-authored-assignment-title">
          Hoặc giao từ kho authored hiện có
        </h2>
      </section>
      <TeacherAssignmentPublisher
        classrooms={classrooms.state.classrooms}
        questions={questions.library.questions}
      />
    </div>
  );
}
