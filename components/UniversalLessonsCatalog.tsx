import { Button } from "@/components/Button";
import { CompetencyLearningPathPanel } from "@/components/CompetencyLearningPathPanel";
import type { StudentCompetencyDashboard } from "@/lib/competency/student-adapter";
import type { StudentCurriculumProgress } from "@/lib/curriculum-runtime/contracts";
import { curriculumDomainLabels, studentUnitTitle } from "@/lib/curriculum/student-facing";
import { curriculumUnits } from "@/lib/curriculum/registry";
import type { CurriculumDomain, CurriculumUnit } from "@/lib/curriculum/types";
import { getLessonPath } from "@/lib/practice/catalog";
import { GeneratedPracticePilotCard } from "@/components/GeneratedPracticePilotCard";
import { UniversalCurriculumStartButton } from "@/components/UniversalCurriculumStartButton";

export function UniversalLessonsCatalog({
  grade,
  progress,
  competency,
  generatedPilotEligible,
}: Readonly<{
  grade: number;
  progress: StudentCurriculumProgress;
  competency: StudentCompetencyDashboard;
  generatedPilotEligible: boolean;
}>) {
  const units = curriculumUnits.filter((unit) => unit.grade === grade);
  const progressByUnit = new Map(progress.units.map((unit) => [unit.unitId, unit]));
  const unitsByDomain = new Map<CurriculumDomain, CurriculumUnit[]>();
  for (const unit of units) {
    const domainUnits = unitsByDomain.get(unit.domain) ?? [];
    domainUnits.push(unit);
    unitsByDomain.set(unit.domain, domainUnits);
  }
  const domainGroups = Array.from(unitsByDomain);
  const completedCount = progress.units.filter(
    (unit) => unit.status === "COMPLETED",
  ).length;
  return (
    <div className="catalog-page catalog-page--v2 page-shell">
      <header className="catalog-hero catalog-hero--lessons">
        <p className="eyebrow">Lộ trình Toán lớp {grade}</p>
        <h1>Mỗi bài học là một bước tiến.</h1>
        <p>
          Chọn theo nhóm kiến thức. Bài đang học và bài được gợi ý luôn hiện
          trước để em dễ tiếp tục.
        </p>
        <div
          className="catalog-hero__progress"
          aria-label="Tiến độ chương trình"
          data-completed-count={completedCount}
          data-total-count={units.length}
        >
          <strong><span>{completedCount}</span>/{units.length} bài đã hoàn thành</strong>
          <span>{progress.masteryExplanation}</span>
        </div>
      </header>
      <CompetencyLearningPathPanel model={competency} />
      {generatedPilotEligible ? <GeneratedPracticePilotCard /> : null}
      <section className="unit-catalog" aria-labelledby="universal-lessons-title">
        <div className="section-heading section-heading--compact">
          <p className="eyebrow">{units.length} bài trong chương trình lớp {grade}</p>
          <h2 id="universal-lessons-title">Toàn bộ bài học</h2>
        </div>
        <div className="unit-domain-groups">
          {domainGroups.map(([domain, domainUnits], domainIndex) => {
            const domainCompleted = domainUnits.filter(
              (unit) => progressByUnit.get(unit.slug)?.status === "COMPLETED",
            ).length;
            const hasRecommended = domainUnits.some(
              (unit) => competency.recommendation?.candidateId === unit.slug,
            );
            return (
              <details
                className="unit-domain-group"
                key={domain}
                open={hasRecommended || domainIndex === 0}
              >
                <summary>
                  <span>
                    <strong>{curriculumDomainLabels[domain]}</strong>
                    <small>{domainUnits.length} bài</small>
                  </span>
                  <span>{domainCompleted}/{domainUnits.length} hoàn thành</span>
                </summary>
                <div className="unit-catalog__grid">
                  {domainUnits.map((unit) => {
            const item = progressByUnit.get(unit.slug);
            const isRecommended = competency.recommendation?.candidateId === unit.slug;
            return (
              <article className={`unit-card ${isRecommended ? "unit-card--recommended" : ""}`} key={unit.slug}>
                <div className="unit-card__heading unit-card__status-region">
                  <span className="unit-status">
                    {item?.status === "IN_PROGRESS" ? "Đang học" : item?.status === "COMPLETED" ? "Đã hoàn thành" : "Chưa bắt đầu"}
                  </span>
                  {isRecommended ? (
                    <span className="unit-recommendation-badge">Nên học tiếp</span>
                  ) : null}
                </div>
                <div className="unit-card__content-region">
                  <h3>{studentUnitTitle(unit)}</h3>
                  <p className="unit-card__description">{unit.theory[0]?.explanation[0]}</p>
                  <div className="unit-card__objective">
                    <strong>Mục tiêu chính</strong>
                    <span>{unit.theory[0]?.title ?? "Luyện tập theo chương trình lớp"}</span>
                  </div>
                </div>
                <div className="unit-card__metadata-region">
                  <span>{curriculumDomainLabels[unit.domain]}</span>
                </div>
                <div className="unit-card__actions">
                  {item?.status === "IN_PROGRESS" ? (
                    <UniversalCurriculumStartButton
                      unitSlug={unit.slug}
                      label="Tiếp tục học"
                    />
                  ) : (
                    <Button href={getLessonPath(unit.slug)}>
                      {item?.status === "COMPLETED"
                        ? "Xem lại bài học"
                        : "Bắt đầu bài học"}
                    </Button>
                  )}
                </div>
              </article>
            );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
