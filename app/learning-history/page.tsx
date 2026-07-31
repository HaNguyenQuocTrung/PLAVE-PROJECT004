import { redirect } from "next/navigation";

import { Button } from "@/components/Button";
import { LearningAccessState } from "@/components/LearningAccessState";
import { loadStudentCurriculumHistory } from "@/lib/curriculum-runtime/server";

export const metadata = { title: "Lịch sử học tập" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LearningHistoryPage() {
  const result = await loadStudentCurriculumHistory();
  if (!result.ok) {
    if (result.reason === "UNAUTHENTICATED") redirect("/login");
    if (result.reason === "ONBOARDING_REQUIRED") redirect("/onboarding");
    return (
      <LearningAccessState
        kind={
          result.reason === "ACCESS_DENIED"
            ? "FORBIDDEN"
            : result.reason === "DISABLED"
              ? "NOT_FOUND"
              : "UNAVAILABLE"
        }
      />
    );
  }
  const { history } = result;
  return (
    <div className="content-page page-shell learning-history-page">
      <header className="catalog-hero">
        <p className="eyebrow">Lịch sử học tập</p>
        <h1>Các lượt học Toán lớp {history.grade}</h1>
        <p>
          Mỗi lượt học được giữ riêng để em xem lại kết quả mà không ghi đè
          lịch sử cũ.
        </p>
        <div className="catalog-hero__actions">
          <Button href="/lessons">Chọn bài học</Button>
          <Button href="/learning-progress" variant="secondary">
            Xem tiến trình
          </Button>
        </div>
      </header>

      {history.attempts.length === 0 ? (
        <section className="empty-state empty-state--large">
          <h2>Em chưa có lượt học nào</h2>
          <p>Hãy chọn một chủ đề và bắt đầu luyện tập.</p>
          <Button href="/lessons">Mở chương trình học</Button>
        </section>
      ) : (
        <section className="history-list" aria-labelledby="history-title">
          <h2 id="history-title">Lượt học gần đây</h2>
          <div className="progress-evidence-grid">
            {history.attempts.map((attempt) => {
              const destination =
                attempt.source === "LEGACY_GRADE1"
                  ? attempt.status === "COMPLETED"
                    ? `/review/${attempt.attemptId}`
                    : `/practice/${attempt.attemptId}`
                  : `/curriculum-practice/${attempt.attemptId}`;
              return (
                <article className="progress-evidence-card" key={attempt.attemptId}>
                  <span className="unit-status">
                    {attempt.status === "COMPLETED"
                      ? "Đã hoàn thành"
                      : attempt.status === "IN_PROGRESS"
                        ? "Đang học"
                        : "Đã kết thúc"}
                  </span>
                  <h3>{attempt.unitTitle}</h3>
                  <p>
                    Đúng {attempt.correctCount}/{attempt.answeredCount} câu đã
                    làm · Tổng {attempt.totalQuestions} câu
                  </p>
                  <time dateTime={attempt.startedAt}>
                    Bắt đầu:{" "}
                    {new Intl.DateTimeFormat("vi-VN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(attempt.startedAt))}
                  </time>
                  <Button href={destination} variant="secondary">
                    {attempt.status === "IN_PROGRESS"
                      ? "Tiếp tục"
                      : "Xem kết quả"}
                  </Button>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
