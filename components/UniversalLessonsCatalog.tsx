import { Button } from "@/components/Button";
import { CompetencyLearningPathPanel } from "@/components/CompetencyLearningPathPanel";
import type { StudentCompetencyDashboard } from "@/lib/competency/student-adapter";
import type { StudentCurriculumProgress } from "@/lib/curriculum-runtime/contracts";
import { curriculumDomainLabels, studentUnitTitle } from "@/lib/curriculum/student-facing";
import { curriculumUnits } from "@/lib/curriculum/registry";
import { getLessonPath } from "@/lib/practice/catalog";
import { GeneratedPracticePilotCard } from "@/components/GeneratedPracticePilotCard";

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
  return (
    <div className="catalog-page page-shell">
      <header className="catalog-hero catalog-hero--lessons">
        <p className="eyebrow">Lộ trình học của em</p>
        <h1>Bài học dành cho lớp {grade}</h1>
        <p>Chọn bài học đúng với lớp của em. Tiến độ được lưu để em tiếp tục sau.</p>
      </header>
      <CompetencyLearningPathPanel model={competency} />
      {generatedPilotEligible ? <GeneratedPracticePilotCard /> : null}
      <section className="unit-catalog" aria-labelledby="universal-lessons-title">
        <div className="section-heading section-heading--compact">
          <p className="eyebrow">{units.length} bài trong chương trình lớp {grade}</p>
          <h2 id="universal-lessons-title">Toàn bộ bài học</h2>
        </div>
        <div className="unit-catalog__grid">
          {units.map((unit) => {
            const item = progressByUnit.get(unit.slug);
            const isRecommended = competency.recommendation?.candidateId === unit.slug;
            return (
              <article className={`unit-card ${isRecommended ? "unit-card--recommended" : ""}`} key={unit.slug}>
                <div className="unit-card__heading">
                  <span className="unit-status">
                    {item?.status === "IN_PROGRESS" ? "Đang học" : item?.status === "COMPLETED" ? "Đã hoàn thành" : "Chưa bắt đầu"}
                  </span>
                  <span>{curriculumDomainLabels[unit.domain]}</span>
                </div>
                {isRecommended ? <span className="unit-recommendation-badge">Đề xuất</span> : null}
                <h3>{studentUnitTitle(unit)}</h3>
                <p>{unit.theory[0]?.explanation[0]}</p>
                <div className="unit-card__objective">
                  <strong>Mục tiêu chính</strong>
                  <span>{unit.theory[0]?.title ?? "Luyện tập theo chương trình lớp"}</span>
                </div>
                <Button href={getLessonPath(unit.slug)}>
                  {item?.status === "IN_PROGRESS" ? "Tiếp tục học" : "Bắt đầu bài học"}
                </Button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
