import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/AccessDenied";
import { TeacherQuestionLibraryManager } from "@/components/TeacherQuestionLibraryManager";
import { loadTeacherQuestionLibrary } from "@/lib/assignments/server";
import { getTeacherAccount } from "@/lib/teacher/server";

export const metadata = { title: "Kho câu hỏi giáo viên" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeacherQuestionsPage() {
  const account = await getTeacherAccount();
  if (!account.ok) {
    if (account.reason === "UNAUTHENTICATED") redirect("/login");
    if (account.reason === "ACTIVATION_REQUIRED") {
      redirect("/teacher/onboarding");
    }
    if (account.reason === "ACCESS_DENIED") return <AccessDenied />;
    return (
      <section className="content-page page-shell">
        <h1>Chưa thể mở kho câu hỏi</h1>
        <p>Vui lòng thử tải lại sau.</p>
      </section>
    );
  }

  const result = await loadTeacherQuestionLibrary(account.supabase);
  if (!result.ok) {
    return (
      <section className="content-page page-shell">
        <h1>Chưa thể mở kho câu hỏi</h1>
        <p>{result.message}</p>
      </section>
    );
  }

  return (
    <div className="teacher-questions-page teacher-workspace-page--v2 page-shell">
      <header className="catalog-hero teacher-hero">
        <p className="eyebrow">Nội dung của riêng bạn</p>
        <h1>Kho câu hỏi</h1>
        <p>
          Tạo câu trắc nghiệm hoặc nhập số, kèm đáp án và lời giải từng bước.
        </p>
      </header>
      <TeacherQuestionLibraryManager
        initialQuestions={result.library.questions}
      />
    </div>
  );
}
