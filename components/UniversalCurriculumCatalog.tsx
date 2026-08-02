import { Button } from "@/components/Button";
import { AdaptiveOnDemandStartButton } from "@/components/AdaptiveOnDemandStartButton";
import type {
  AdaptiveCurriculumRecommendation,
} from "@/lib/curriculum/adaptive-selection";
import type { LearningPathRecommendation } from "@/lib/competency/engine";
import { curriculumDomainLabels } from "@/lib/curriculum/student-facing";
import {
  studentLearningGoals,
  studentUnitTitle,
} from "@/lib/curriculum/student-facing";
import type { CurriculumUnit } from "@/lib/curriculum/types";
import {
  curriculumMasteryLabelText,
  type StudentCurriculumProgress,
} from "@/lib/curriculum-runtime/contracts";
import { getLessonPath } from "@/lib/practice/catalog";

type UniversalCurriculumCatalogProps = {
  grade: number;
  units: readonly CurriculumUnit[];
  progress: StudentCurriculumProgress;
  recommendation: AdaptiveCurriculumRecommendation | null;
  onDemandRuntimeEnabled: boolean;
  competencyRecommendation: LearningPathRecommendation | null;
};

export function UniversalCurriculumCatalog({
  grade,
  units,
  progress,
  recommendation,
  onDemandRuntimeEnabled,
  competencyRecommendation,
}: UniversalCurriculumCatalogProps) {
  const progressByUnit = new Map(
    progress.units.map((unit) => [unit.unitId, unit]),
  );
  const completed = progress.units.filter(
    (unit) => unit.status === "COMPLETED",
  ).length;

  return (
    <div className="catalog-page page-shell universal-catalog-page">
      <header className="catalog-hero">
        <p className="eyebrow">Chương trình học của em</p>
        <h1>Toán lớp {grade}</h1>
        <p>
          Đọc lý thuyết, xem ví dụ rồi luyện tập. Mỗi câu trả lời và tiến độ
          đều được lưu để em tiếp tục sau.
        </p>
        <div className="catalog-hero__actions">
          <Button href="/learning-progress">Xem tiến trình</Button>
          <Button href="/learning-history" variant="secondary">
            Lịch sử học
          </Button>
        </div>
      </header>

      <section className="student-summary" aria-labelledby="catalog-progress">
        <div>
          <p className="eyebrow">Tiến độ của em</p>
          <h2 id="catalog-progress">
            Hoàn thành {completed}/{units.length} chủ đề
          </h2>
          <p>{progress.masteryExplanation}</p>
        </div>
      </section>

      {recommendation ? (
        <section
          className="personalized-recommendation"
          aria-labelledby="adaptive-curriculum-title"
        >
          <div className="personalized-recommendation__content">
            <p className="eyebrow">Gợi ý từ bằng chứng học tập</p>
            <h2 id="adaptive-curriculum-title">
              Nội dung nên luyện tiếp
            </h2>
            <p>{recommendation.outcomeTitle}</p>
            <p>{recommendation.explanation}</p>
            <p className="recommendation-note">
              Gợi ý này dựa trên tiến độ hiện có và có thể thay đổi khi em học
              thêm.
            </p>
          </div>
          <div>
            <Button
              href={getLessonPath(recommendation.unitId)}
              variant="secondary"
            >
              Ôn lý thuyết được gợi ý
            </Button>
            {onDemandRuntimeEnabled ? (
              <AdaptiveOnDemandStartButton />
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="unit-catalog" aria-labelledby="unit-catalog-title">
        <div className="section-heading section-heading--compact">
          <p className="eyebrow">Nội dung phù hợp với lớp {grade}</p>
          <h2 id="unit-catalog-title">Chọn chủ đề để học</h2>
        </div>
        <div className="unit-catalog__grid">
          {units.map((unit) => {
            const unitProgress = progressByUnit.get(unit.slug);
            const label = unitProgress
              ? curriculumMasteryLabelText[unitProgress.masteryLabel]
              : "Chưa bắt đầu";
            return (
              <article
                className={`unit-card ${
                  recommendation?.unitId === unit.slug
                    ? "unit-card--recommended"
                    : ""
                }`}
                key={unit.slug}
              >
                <div className="unit-card__heading">
                  <span
                    className={`unit-status ${
                      unitProgress?.status === "COMPLETED"
                        ? "unit-status--complete"
                        : unitProgress?.status === "IN_PROGRESS"
                          ? "unit-status--continue"
                          : ""
                    }`}
                  >
                    {label}
                  </span>
                  <span>{curriculumDomainLabels[unit.domain]}</span>
                </div>
                {competencyRecommendation?.candidateId === unit.slug ||
                recommendation?.unitId === unit.slug ? (
                  <span className="unit-recommendation-badge">
                    Được gợi ý từ tiến độ thật
                  </span>
                ) : null}
                <h3>{studentUnitTitle(unit)}</h3>
                <p>{unit.theory[0]?.explanation[0]}</p>
                <div className="unit-card__objective">
                  <strong>Em sẽ hiểu</strong>
                  <span>{studentLearningGoals(unit)[0]}</span>
                </div>
                <p className="unit-card__progress">
                  {unit.theory.length} phần lý thuyết · {unit.examples.length}{" "}
                  ví dụ · 12 câu luyện tập
                </p>
                <Button href={getLessonPath(unit.slug)}>
                  {unitProgress?.status === "IN_PROGRESS"
                    ? "Tiếp tục học"
                    : "Mở bài học"}
                </Button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
