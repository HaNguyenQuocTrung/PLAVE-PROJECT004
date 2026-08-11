import { Button } from "@/components/Button";
import type { AdaptiveCurriculumRecommendation } from "@/lib/curriculum/adaptive-selection";
import type { StudentCurriculumProgress } from "@/lib/curriculum-runtime/contracts";
import { curriculumMasteryLabelText } from "@/lib/curriculum-runtime/contracts";
import type { ReleasedCatalogUnit } from "@/lib/release-integration/catalog";
import { getLessonPath } from "@/lib/practice/catalog";

type Props = Readonly<{
  grade: number;
  units: readonly ReleasedCatalogUnit[];
  progress: StudentCurriculumProgress;
  recommendation: AdaptiveCurriculumRecommendation | null;
}>;

const domainLabels: Readonly<Record<string, string>> = {
  NUMBERS_AND_OPERATIONS: "Số và phép tính",
  ALGEBRA_AND_PREALGEBRA: "Đại số",
  GEOMETRY: "Hình học",
  MEASUREMENT: "Đo lường",
  STATISTICS_AND_PROBABILITY: "Dữ liệu và xác suất",
  APPLIED_PROBLEM_SOLVING: "Vận dụng",
};

export function ReleasedCurriculumCatalog({ grade, units, progress, recommendation }: Props) {
  const progressByUnit = new Map(progress.units.map((unit) => [unit.unitId, unit]));
  const completed = progress.units.filter((unit) => unit.status === "COMPLETED").length;
  return (
    <div className="catalog-page page-shell universal-catalog-page">
      <header className="catalog-hero">
        <p className="eyebrow">Chương trình học của em</p>
        <h1>Toán lớp {grade}</h1>
        <p>Đọc kiến thức, luyện tập và tiếp tục từ đúng tiến độ đã lưu của em.</p>
        <div className="catalog-hero__actions">
          <Button href="/learning-progress">Xem tiến trình</Button>
          <Button href="/learning-history" variant="secondary">Lịch sử học</Button>
        </div>
      </header>
      {recommendation ? (
        <section className="personalized-recommendation" aria-labelledby="released-recommendation-title">
          <div className="personalized-recommendation__content">
            <p className="eyebrow">Gợi ý từ tiến độ của em</p>
            <h2 id="released-recommendation-title">Nội dung nên tiếp tục</h2>
            <p>{recommendation.outcomeTitle}</p>
            <p>{recommendation.explanation}</p>
          </div>
        </section>
      ) : null}
      <section className="student-summary" aria-labelledby="released-catalog-progress">
        <div>
          <p className="eyebrow">Tiến độ của em</p>
          <h2 id="released-catalog-progress">Hoàn thành {completed}/{units.length} chủ đề</h2>
          <p>{progress.masteryExplanation}</p>
        </div>
      </section>
      <section className="unit-catalog" aria-labelledby="released-unit-catalog-title">
        <div className="section-heading section-heading--compact">
          <p className="eyebrow">Nội dung đã sẵn sàng cho lớp {grade}</p>
          <h2 id="released-unit-catalog-title">Chọn chủ đề để học</h2>
        </div>
        <div className="unit-catalog__grid">
          {units.map((unit) => {
            const unitProgress = progressByUnit.get(unit.unitId);
            return (
              <article className="unit-card" key={unit.unitId}>
                <div className="unit-card__heading">
                  <span className={`unit-status ${unitProgress?.status === "COMPLETED" ? "unit-status--complete" : unitProgress?.status === "IN_PROGRESS" ? "unit-status--continue" : ""}`}>
                    {unitProgress?.status === "COMPLETED"
                      ? "Đã hoàn thành"
                      : unitProgress
                        ? curriculumMasteryLabelText[unitProgress.masteryLabel]
                        : "Chưa bắt đầu"}
                  </span>
                  <span>{domainLabels[unit.domain] ?? "Toán học"}</span>
                </div>
                <h3>{unit.title}</h3>
                <p>{unit.description}</p>
                <div className="unit-card__objective">
                  <strong>Em sẽ hiểu</strong>
                  <span>{unit.learningGoals[0]}</span>
                </div>
                <p className="unit-card__progress">Tối đa {Math.min(12, unit.totalQuestions)} câu mỗi lượt · Tự động lưu</p>
                <Button href={getLessonPath(unit.unitId)}>
                  {unitProgress?.status === "IN_PROGRESS" ? "Tiếp tục học" : "Mở bài học"}
                </Button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
