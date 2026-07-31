import { redirect } from "next/navigation";

import { LearningAccessState } from "@/components/LearningAccessState";
import { StudentAssignmentsPanel } from "@/components/StudentAssignmentsPanel";
import { loadStudentAssignments } from "@/lib/assignments/server";
import { getStudentLearningContext } from "@/lib/practice/server";

export const metadata = { title: "Bài giáo viên giao" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentAssignmentsPage() {
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

  const result = await loadStudentAssignments(access.supabase);
  if (!result.ok) {
    return (
      <section className="content-page page-shell">
        <h1>Chưa thể tải bài giáo viên giao</h1>
        <p>{result.message}</p>
      </section>
    );
  }

  return (
    <div className="student-assignments-page page-shell">
      <header className="catalog-hero catalog-hero--lessons">
        <p className="eyebrow">Bài tập trong lớp</p>
        <h1>Bài giáo viên giao</h1>
        <p>
          Lưu từng câu trước khi nộp. Em có thể sửa đáp án khi bài vẫn đang làm.
        </p>
      </header>
      <StudentAssignmentsPanel assignments={result.list.assignments} />
    </div>
  );
}
