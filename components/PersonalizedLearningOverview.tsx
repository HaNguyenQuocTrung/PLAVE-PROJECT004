import {
  DIAGNOSTIC_QUESTION_COUNT,
  diagnosticDomainLabels,
} from "@/lib/diagnostic/contracts";
import { Button } from "@/components/Button";
import type {
  PersonalizedLearningPath,
} from "@/lib/personalized-path/contracts";

type PersonalizedLearningOverviewProps = {
  path: PersonalizedLearningPath;
  compact?: boolean;
};

function getDiagnosticScore(path: PersonalizedLearningPath) {
  const diagnostic = path.latestDiagnostic;
  if (!diagnostic) return "Chưa có đánh giá";
  if (diagnostic.status === "IN_PROGRESS") {
    return `${diagnostic.answeredCount}/${DIAGNOSTIC_QUESTION_COUNT} câu`;
  }
  return `${diagnostic.correctCount}/${DIAGNOSTIC_QUESTION_COUNT} câu đúng`;
}

export function PersonalizedLearningOverview({
  path,
  compact = false,
}: PersonalizedLearningOverviewProps) {
  return (
    <section
      className={`personalized-overview ${
        compact ? "personalized-overview--compact" : ""
      }`}
      aria-labelledby={
        compact
          ? "dashboard-personalized-overview-title"
          : "lessons-personalized-overview-title"
      }
    >
      <div className="section-heading section-heading--compact">
        <p className="eyebrow">Tổng quan năng lực</p>
        <h2
          id={
            compact
              ? "dashboard-personalized-overview-title"
              : "lessons-personalized-overview-title"
          }
        >
          Tiến độ Lớp {path.grade} của em
        </h2>
      </div>

      <div
        className="personalized-overview__metrics"
        aria-label="Số liệu lộ trình học"
      >
        <article>
          <span>Unit đã hoàn thành</span>
          <strong>
            {path.summary.completedUnitCount}/
            {path.summary.totalUnitCount}
          </strong>
        </article>
        <article>
          <span>Unit đang học</span>
          <strong>{path.summary.inProgressUnitCount}</strong>
        </article>
        <article>
          <span>Unit cần ôn</span>
          <strong>{path.summary.needsReviewUnitCount}</strong>
        </article>
        {path.grade === 1 ? (
          <article>
            <span>Đánh giá gần nhất</span>
            <strong>{getDiagnosticScore(path)}</strong>
          </article>
        ) : null}
      </div>

      {path.grade === 1 && path.diagnosticDomains ? (
        <div
          className="personalized-overview__domains"
          aria-label="Bốn nhóm năng lực từ bài đánh giá gần nhất"
        >
          {path.diagnosticDomains.map((domain) => (
            <article key={domain.domain}>
              <h3>{diagnosticDomainLabels[domain.domain]}</h3>
              <strong>
                {domain.correctCount}/{domain.answeredCount}
              </strong>
              <span>
                {domain.level === "DOING_WELL"
                  ? "Đang làm tốt"
                  : "Cần ôn thêm"}
              </span>
            </article>
          ))}
        </div>
      ) : path.grade === 1 ? (
        <p className="personalized-overview__empty">
          {path.latestDiagnostic?.status === "IN_PROGRESS"
            ? "Bốn nhóm năng lực sẽ xuất hiện sau khi em hoàn thành bài đánh giá."
            : "Chưa có bài đánh giá hoàn thành để tổng hợp bốn nhóm năng lực."}
        </p>
      ) : null}
      {path.grade === 1 ? (
        <div className="personalized-overview__actions">
          <Button href="/grade-1/summary" variant="secondary">
            Xem tổng kết Lớp 1
          </Button>
        </div>
      ) : null}
    </section>
  );
}
