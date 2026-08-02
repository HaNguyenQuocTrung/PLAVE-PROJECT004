import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/Button";
import { StartDiagnosticButton } from "@/components/StartDiagnosticButton";
import { DIAGNOSTIC_QUESTION_COUNT } from "@/lib/diagnostic/contracts";
import { loadLatestDiagnosticAttempt } from "@/lib/diagnostic/server";
import { getLessonPath } from "@/lib/practice/catalog";
import { getStudentLearningContext } from "@/lib/practice/server";

export const metadata = {
  title: "Đánh giá năng lực Lớp 1",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DiagnosticPage() {
  const access = await getStudentLearningContext();
  if (!access.ok) {
    if (access.reason === "UNAUTHENTICATED") redirect("/login");
    if (access.reason === "ONBOARDING_REQUIRED") redirect("/onboarding");
    return <AccessDenied />;
  }
  if (access.grade !== 1) {
    return <AccessDenied />;
  }

  const latestAttempt = await loadLatestDiagnosticAttempt(
    access.supabase,
    access.user.id,
  );
  const completed = latestAttempt?.status === "COMPLETED"
    ? latestAttempt
    : null;
  const inProgress = latestAttempt?.status === "IN_PROGRESS"
    ? latestAttempt
    : null;
  const percentage = completed
    ? Math.round(
        (completed.correctCount / DIAGNOSTIC_QUESTION_COUNT) * 100,
      )
    : null;

  return (
    <div className="diagnostic-page student-workspace-page--v2 page-shell">
      <header className="catalog-hero diagnostic-hero">
        <p className="eyebrow">Đánh giá năng lực Lớp 1</p>
        <h1>Khám phá bài học phù hợp với em</h1>
        <p>
          Bài đánh giá gồm {DIAGNOSTIC_QUESTION_COUNT} câu từ nội dung Lớp 1
          đã xuất bản. Đây không phải kỳ thi và không ngăn em học các bài
          bình thường.
        </p>
      </header>

      <section
        className="diagnostic-intro-grid"
        aria-labelledby="diagnostic-about-title"
      >
        <article>
          <h2 id="diagnostic-about-title">Bốn miền kiến thức</h2>
          <ul>
            <li>Số và cấu tạo số.</li>
            <li>Phép cộng và phép trừ.</li>
            <li>Hình học và hình khối.</li>
            <li>Đo lường, đồng hồ và lịch.</li>
          </ul>
        </article>
        <article>
          <h2>Em cần biết trước khi bắt đầu</h2>
          <ul>
            <li>Mỗi câu trả lời được lưu một lần.</li>
            <li>Đúng, sai và lời giải chỉ hiện sau câu cuối.</li>
            <li>Em có thể tải lại trang và tiếp tục phần đang làm.</li>
          </ul>
        </article>
      </section>

      {inProgress ? (
        <section
          className="diagnostic-status-card"
          aria-labelledby="diagnostic-current-title"
        >
          <div>
            <p className="eyebrow">Bài đang làm</p>
            <h2 id="diagnostic-current-title">Tiếp tục bài đánh giá</h2>
            <p>
              Em đã hoàn thành {inProgress.answeredCount}/
              {DIAGNOSTIC_QUESTION_COUNT} câu.
            </p>
          </div>
          <Button href={`/diagnostic/${inProgress.id}`}>
            Tiếp tục đánh giá
          </Button>
        </section>
      ) : completed ? (
        <section
          className="diagnostic-status-card diagnostic-status-card--completed"
          aria-labelledby="diagnostic-latest-title"
        >
          <div>
            <p className="eyebrow">Kết quả gần nhất</p>
            <h2 id="diagnostic-latest-title">
              {completed.correctCount}/{DIAGNOSTIC_QUESTION_COUNT} câu đúng ·{" "}
              {percentage}%
            </h2>
            <p>{completed.recommendationExplanation}</p>
            {completed.recommendationUnitSlug ? (
              <Button
                href={getLessonPath(completed.recommendationUnitSlug)}
                variant="secondary"
              >
                Mở bài được đề xuất
              </Button>
            ) : null}
          </div>
          <div className="diagnostic-status-card__actions">
            <Button
              href={`/diagnostic/${completed.id}/review`}
              variant="secondary"
            >
              Xem kết quả đánh giá
            </Button>
            <StartDiagnosticButton label="Đánh giá lại" />
          </div>
        </section>
      ) : (
        <section
          className="diagnostic-status-card"
          aria-labelledby="diagnostic-start-title"
        >
          <div>
            <p className="eyebrow">Sẵn sàng khi em muốn</p>
            <h2 id="diagnostic-start-title">Bắt đầu bài đánh giá đầu vào</h2>
            <p>
              Kết quả giúp PLAVE gợi ý bài tiếp theo và nói rõ lý do lựa chọn.
            </p>
          </div>
          <StartDiagnosticButton label="Đánh giá năng lực" />
        </section>
      )}
    </div>
  );
}
