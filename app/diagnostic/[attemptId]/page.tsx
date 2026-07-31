import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/Button";
import { DiagnosticRunner } from "@/components/DiagnosticRunner";
import { loadDiagnosticState } from "@/lib/diagnostic/server";
import { isUuid } from "@/lib/practice/contracts";

export const metadata = {
  title: "Làm bài đánh giá",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DiagnosticRunnerPageProps = {
  params: Promise<{ attemptId: string }>;
};

export default async function DiagnosticRunnerPage({
  params,
}: DiagnosticRunnerPageProps) {
  const { attemptId } = await params;
  if (!isUuid(attemptId)) {
    return (
      <section className="content-page page-shell">
        <h1>Không tìm thấy bài đánh giá.</h1>
        <Button href="/diagnostic">Về trang đánh giá</Button>
      </section>
    );
  }

  const result = await loadDiagnosticState(attemptId);
  if (!result.ok) {
    if (result.reason === "UNAUTHENTICATED") redirect("/login");
    if (result.reason === "ONBOARDING_REQUIRED") redirect("/onboarding");
    if (result.reason === "FORBIDDEN") return <AccessDenied />;
    return (
      <section className="content-page page-shell">
        <p className="eyebrow">Bài đánh giá được bảo vệ</p>
        <h1>
          {result.reason === "NOT_FOUND"
            ? "Không tìm thấy bài đánh giá."
            : "Chưa thể tải bài đánh giá."}
        </h1>
        <p>
          Không có câu trả lời hoặc dữ liệu riêng tư nào được hiển thị.
        </p>
        <Button href="/diagnostic">Về trang đánh giá</Button>
      </section>
    );
  }

  if (result.state.status === "COMPLETED") {
    redirect(`/diagnostic/${attemptId}/review`);
  }

  return (
    <main className="diagnostic-page page-shell">
      <DiagnosticRunner
        attemptId={attemptId}
        questions={result.state.questions}
        initialAnsweredQuestionIds={
          result.state.answeredQuestionIds
        }
      />
    </main>
  );
}
