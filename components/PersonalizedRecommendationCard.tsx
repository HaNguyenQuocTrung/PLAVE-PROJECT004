import { Button } from "@/components/Button";
import type {
  PersonalizedLearningPath,
} from "@/lib/personalized-path/contracts";

type PersonalizedRecommendationCardProps = {
  path: PersonalizedLearningPath;
  compact?: boolean;
};

export function PersonalizedRecommendationCard({
  path,
  compact = false,
}: PersonalizedRecommendationCardProps) {
  const { recommendation } = path;
  if (!recommendation) return null;

  const recommendedUnit =
    recommendation.target === "UNIT"
      ? path.units.find(
          (item) => item.unit.slug === recommendation.unitSlug,
        ) ?? null
      : null;

  return (
    <section
      className={`personalized-recommendation ${
        compact ? "personalized-recommendation--compact" : ""
      }`}
      aria-labelledby={
        compact
          ? "dashboard-personalized-recommendation-title"
          : "lessons-personalized-recommendation-title"
      }
    >
      <div className="personalized-recommendation__content">
        <p className="eyebrow">Khuyến nghị tiếp theo</p>
        <h2
          id={
            compact
              ? "dashboard-personalized-recommendation-title"
              : "lessons-personalized-recommendation-title"
          }
        >
          {recommendation.title}
        </h2>
        <p>{recommendation.reason}</p>
        {recommendedUnit ? (
          <dl className="personalized-recommendation__details">
            <div>
              <dt>Trạng thái</dt>
              <dd>
                {recommendedUnit.activeAttempt
                  ? `${recommendedUnit.activeAttempt.answeredCount}/${recommendedUnit.activeAttempt.totalQuestions} câu`
                  : recommendedUnit.latestCompletedAttempt
                    ? "Đã có kết quả"
                    : "Chưa bắt đầu"}
              </dd>
            </div>
            <div>
              <dt>Điểm gần nhất</dt>
              <dd>
                {recommendedUnit.latestScorePercent === null
                  ? "Chưa có"
                  : `${recommendedUnit.latestScorePercent}%`}
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
      <Button href={recommendation.actionHref}>
        {recommendation.actionLabel}
      </Button>
    </section>
  );
}
