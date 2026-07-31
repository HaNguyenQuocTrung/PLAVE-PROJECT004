import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/Button";
import { PracticeVisual } from "@/components/PracticeVisual";
import { StartDiagnosticButton } from "@/components/StartDiagnosticButton";
import {
  diagnosticDomainLabels,
  type DiagnosticReviewAnswer,
} from "@/lib/diagnostic/contracts";
import { loadDiagnosticReview } from "@/lib/diagnostic/server";
import {
  getLessonPath,
  skillLabels,
} from "@/lib/practice/catalog";
import { isUuid } from "@/lib/practice/contracts";

export const metadata = {
  title: "Kết quả đánh giá năng lực",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DiagnosticReviewPageProps = {
  params: Promise<{ attemptId: string }>;
};

const optionKeys = ["A", "B", "C", "D"] as const;

function formatAnswer(answer: DiagnosticReviewAnswer, value: string) {
  if (answer.questionType === "MULTIPLE_CHOICE" && answer.options) {
    const key = optionKeys.find((optionKey) => optionKey === value);
    if (key) return `${key} — ${answer.options[key]}`;
  }
  return value;
}

export default async function DiagnosticReviewPage({
  params,
}: DiagnosticReviewPageProps) {
  const { attemptId } = await params;
  if (!isUuid(attemptId)) {
    return (
      <section className="content-page page-shell">
        <h1>Không tìm thấy kết quả đánh giá.</h1>
        <Button href="/diagnostic">Về trang đánh giá</Button>
      </section>
    );
  }

  const result = await loadDiagnosticReview(attemptId);
  if (!result.ok) {
    if (result.reason === "UNAUTHENTICATED") redirect("/login");
    if (result.reason === "ONBOARDING_REQUIRED") redirect("/onboarding");
    if (result.reason === "FORBIDDEN") return <AccessDenied />;
    if (result.reason === "INCOMPLETE") {
      redirect(`/diagnostic/${attemptId}`);
    }
    return (
      <section className="content-page page-shell">
        <p className="eyebrow">Kết quả được bảo vệ</p>
        <h1>
          {result.reason === "NOT_FOUND"
            ? "Không tìm thấy kết quả đánh giá."
            : "Chưa thể tải kết quả đánh giá."}
        </h1>
        <Button href="/diagnostic">Về trang đánh giá</Button>
      </section>
    );
  }

  const { review } = result;
  const doingWell = review.domains.filter(
    (domain) => domain.level === "DOING_WELL",
  );
  const needsReview = review.domains.filter(
    (domain) => domain.level === "REVIEW",
  );

  return (
    <main className="diagnostic-review-page page-shell">
      <header className="catalog-hero diagnostic-review-hero">
        <p className="eyebrow">Kết quả đánh giá năng lực</p>
        <h1>
          {review.correctCount}/{review.totalQuestions} câu đúng
        </h1>
        <p>
          Tỷ lệ chính xác {review.accuracyPercent}%. Kết quả này giúp em chọn
          bài phù hợp để học tiếp, không dùng để so sánh với bạn khác.
        </p>
      </header>

      <section
        className="diagnostic-domain-grid"
        aria-labelledby="diagnostic-domains-title"
      >
        <h2 className="sr-only" id="diagnostic-domains-title">
          Kết quả theo bốn miền kiến thức
        </h2>
        {review.domains.map((domain) => (
          <article
            className={`diagnostic-domain-card diagnostic-domain-card--${
              domain.level === "DOING_WELL" ? "well" : "review"
            }`}
            key={domain.domain}
          >
            <h3>{diagnosticDomainLabels[domain.domain]}</h3>
            <strong>
              {domain.correctCount}/{domain.answeredCount} câu đúng
            </strong>
            <span>{domain.accuracyPercent}%</span>
            <p>
              {domain.level === "DOING_WELL"
                ? "Đang làm tốt"
                : "Cần ôn thêm"}
            </p>
          </article>
        ))}
      </section>

      <section
        className="diagnostic-insight-grid"
        aria-labelledby="diagnostic-insights-title"
      >
        <h2 className="sr-only" id="diagnostic-insights-title">
          Nhận xét theo miền kiến thức
        </h2>
        <article>
          <h3>Phần đang làm tốt</h3>
          {doingWell.length > 0 ? (
            <ul>
              {doingWell.map((domain) => (
                <li key={domain.domain}>
                  {diagnosticDomainLabels[domain.domain]}
                </li>
              ))}
            </ul>
          ) : (
            <p>
              Chưa có miền nào đạt ngưỡng 70%. Em có thể ôn từng phần theo
              nhịp phù hợp.
            </p>
          )}
        </article>
        <article>
          <h3>Phần cần ôn thêm</h3>
          {needsReview.length > 0 ? (
            <ul>
              {needsReview.map((domain) => (
                <li key={domain.domain}>
                  {diagnosticDomainLabels[domain.domain]}
                </li>
              ))}
            </ul>
          ) : (
            <p>Em đang duy trì kết quả tốt ở cả bốn miền đã đánh giá.</p>
          )}
        </article>
      </section>

      <section
        className="diagnostic-recommendation"
        aria-labelledby="diagnostic-recommendation-title"
      >
        <div>
          <p className="eyebrow">Bài học phù hợp tiếp theo</p>
          <h2 id="diagnostic-recommendation-title">
            {review.recommendation.unitTitle ??
              "Em đã hoàn thành tốt nội dung hiện tại của Lớp 1"}
          </h2>
          <p>{review.recommendation.explanation}</p>
        </div>
        <div className="diagnostic-recommendation__actions">
          {review.recommendation.unitSlug ? (
            <Button href={getLessonPath(review.recommendation.unitSlug)}>
              Mở bài được đề xuất
            </Button>
          ) : null}
          <StartDiagnosticButton label="Đánh giá lại" />
        </div>
      </section>

      <section
        className="diagnostic-unit-results"
        aria-labelledby="diagnostic-unit-results-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Chi tiết theo nội dung</p>
            <h2 id="diagnostic-unit-results-title">
              Kết quả theo bài và kỹ năng
            </h2>
          </div>
        </div>
        <div className="diagnostic-unit-results__grid">
          {review.units.map((unit) => (
            <article key={unit.unitSlug}>
              <h3>{unit.unitTitle}</h3>
              <p>
                {unit.correctCount}/{unit.answeredCount} câu đúng ·{" "}
                {unit.accuracyPercent}%
              </p>
            </article>
          ))}
        </div>
        <details className="diagnostic-skill-details">
          <summary>Xem kết quả theo kỹ năng</summary>
          <ul>
            {review.skills.map((skill) => (
              <li key={skill.skillCode}>
                <span>{skillLabels[skill.skillCode]}</span>
                <strong>
                  {skill.correctCount}/{skill.answeredCount} ·{" "}
                  {skill.accuracyPercent}%
                </strong>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section
        className="diagnostic-answer-review"
        aria-labelledby="diagnostic-answer-review-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Review sau khi hoàn thành</p>
            <h2 id="diagnostic-answer-review-title">
              Câu trả lời và lời giải
            </h2>
          </div>
        </div>
        <ol className="diagnostic-answer-list">
          {review.answers.map((answer, index) => (
            <li
              className={`diagnostic-answer-card diagnostic-answer-card--${
                answer.isCorrect ? "correct" : "incorrect"
              }`}
              key={answer.questionId}
            >
              <p className="question-count">
                Câu {index + 1}/{review.totalQuestions}
              </p>
              <p className="diagnostic-answer-card__domain">
                {diagnosticDomainLabels[answer.domain]} ·{" "}
                {answer.unitTitle}
              </p>
              {answer.visualSpec ? (
                <PracticeVisual spec={answer.visualSpec} />
              ) : null}
              <h3>{answer.prompt}</h3>
              <p>
                <strong>Câu trả lời của em:</strong>{" "}
                {formatAnswer(answer, answer.studentAnswer)}
              </p>
              <p>
                <strong>Đáp án đúng:</strong>{" "}
                {formatAnswer(answer, answer.correctAnswer)}
              </p>
              <p className="diagnostic-answer-card__status">
                {answer.isCorrect ? "Chính xác" : "Cần xem lại"}
              </p>
              <h4>Lời giải từng bước</h4>
              <ol>
                {answer.solutionSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p>
                <strong>Giải thích:</strong> {answer.explanation}
              </p>
              {!answer.isCorrect ? (
                <p>
                  <strong>Gợi ý:</strong> {answer.hint}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
