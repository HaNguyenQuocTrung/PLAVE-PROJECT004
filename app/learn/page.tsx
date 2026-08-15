import { redirect } from "next/navigation";

import { Button } from "@/components/Button";
import { CompetencyLearningPathPanel } from "@/components/CompetencyLearningPathPanel";
import { AdaptiveOnDemandStartButton } from "@/components/AdaptiveOnDemandStartButton";
import { LearningAccessState } from "@/components/LearningAccessState";
import { ReleasedCurriculumCatalog } from "@/components/ReleasedCurriculumCatalog";
import {
  selectAdaptiveCurriculumRecommendation,
} from "@/lib/curriculum/adaptive-selection";
import type { CurriculumGrade } from "@/lib/curriculum/types";
import { buildStudentCompetencyDashboard } from "@/lib/competency/student-adapter";
import { getOnDemandRuntimeConfiguration } from "@/lib/curriculum/on-demand-feature-flag";
import { getCurrentGeneratedPracticePilotEligibility } from "@/lib/curriculum/generated-practice-pilot";
import { loadStudentCurriculumProgress } from "@/lib/curriculum-runtime/server";
import {
  getLessonPath,
  getUnitPresentation,
  isUnitPracticeUnlocked,
} from "@/lib/practice/catalog";
import {
  parseAttemptRows,
  parseLearningUnit,
  type LearningUnit,
} from "@/lib/practice/contracts";
import { buildPersonalizedLearningPath } from "@/lib/personalized-path/contracts";
import {
  buildPracticeHistory,
  getLessonPracticeState,
} from "@/lib/practice/history";
import {
  getGradeContentEmptyDescription,
  getGradeContentEmptyTitle,
} from "@/lib/practice/grade-content";
import {
  resolveAdaptiveRuntimeGate,
  resolvePracticeRuntimeAccess,
} from "@/lib/practice/runtime-flags";
import { getStudentLearningContext } from "@/lib/practice/server";
import { getVietnameseOutcomeLabel } from "@/lib/learning/presentation";

export const metadata = {
  title: "Lý thuyết",
};

export default async function LearnPage() {
  const access = await getStudentLearningContext();

  if (!access.ok) {
    if (access.reason === "UNAUTHENTICATED") redirect("/login");
    if (access.reason === "ONBOARDING_REQUIRED") redirect("/onboarding");
    return (
      <LearningAccessState
        kind={access.reason === "ACCESS_DENIED" ? "FORBIDDEN" : "UNAVAILABLE"}
      />
    );
  }

  const onDemandRuntimeEnabled =
    getOnDemandRuntimeConfiguration().enabled &&
    getCurrentGeneratedPracticePilotEligibility({
      userId: access.user.id,
      role: "STUDENT",
      schoolGrade: access.grade,
    }).eligible;

  const progressResult = await loadStudentCurriculumProgress(access);
  if (access.grade >= 2) {
    if (!progressResult.ok || progressResult.progress.grade !== access.grade) {
      return <LearningAccessState kind="UNAVAILABLE" />;
    }
    const releasedCatalog = "catalog" in progressResult.availability
      ? progressResult.availability.catalog
      : null;
    if (!releasedCatalog) {
      return <LearningAccessState kind="UNAVAILABLE" />;
    }
    const availableUnitIds = new Set(
      progressResult.progress.units.map((unit) => unit.unitId),
    );
    const availableUnits = releasedCatalog.units
      .map((unit) => ({ ...unit, slug: unit.unitId }))
      .filter((unit) => availableUnitIds.has(unit.slug));
    const selectedRecommendation =
      selectAdaptiveCurriculumRecommendation({
        grade: access.grade as CurriculumGrade,
        progress: progressResult.progress,
      });
    const adaptiveRecommendation =
      selectedRecommendation &&
      availableUnitIds.has(selectedRecommendation.unitId)
        ? selectedRecommendation
        : null;
    const competencyDashboard = buildStudentCompetencyDashboard({
      progress: progressResult.progress,
      now: new Date(),
      adaptivePilotEnabled: false,
    });
    return (
      <>
        {competencyDashboard ? (
          <div className="page-shell">
            <CompetencyLearningPathPanel model={competencyDashboard} />
          </div>
        ) : null}
        <ReleasedCurriculumCatalog
          grade={access.grade}
          units={availableUnits}
          progress={progressResult.progress}
          recommendation={adaptiveRecommendation}
        />
      </>
    );
  }

  const [
    { data: unitRows, error: unitError },
    { data: attemptRows, error: attemptError },
    gradeOneAdaptiveProgress,
  ] = await Promise.all([
    access.supabase
      .from("learning_units")
      .select(
        "slug, grade, title, description, learning_objectives, lesson_content, total_questions, prerequisite_unit_slug",
      )
      .eq("grade", access.grade)
      .eq("published", true)
      .order("display_order", { ascending: true }),
    access.supabase
      .from("practice_attempts")
      .select(
        "id, unit_slug, status, question_order, total_questions, answered_count, correct_count, started_at, completed_at",
      )
      .eq("student_id", access.user.id)
      .order("started_at", { ascending: true })
      .order("id", { ascending: true }),
    loadStudentCurriculumProgress(access),
  ]);

  const attempts = parseAttemptRows(attemptRows);
  if (
    unitError ||
    attemptError ||
    !attempts ||
    (access.grade === 1 &&
      (!gradeOneAdaptiveProgress ||
        !gradeOneAdaptiveProgress.ok))
  ) {
    return <LearningAccessState kind="UNAVAILABLE" />;
  }
  const units: LearningUnit[] = [];
  for (const row of unitRows ?? []) {
    const unit = parseLearningUnit(row);
    if (!unit) return <LearningAccessState kind="UNAVAILABLE" />;
    const runtime = resolvePracticeRuntimeAccess(unit.slug);
    if (
      runtime.kind === "HIDDEN_RELEASE_CANDIDATE" ||
      (runtime.kind === "ADAPTIVE_RUNTIME" &&
        resolveAdaptiveRuntimeGate(unit.slug).kind !== "RPC_ALLOWED")
    ) {
      continue;
    }
    units.push(unit);
  }
  const gradeOnePath = buildPersonalizedLearningPath({
    grade: 1,
    units,
    attempts,
    latestDiagnostic: null,
    diagnosticDomains: null,
    diagnosticEnabled: false,
  });
  const runtimeEligibleUnitIds = new Set(
    gradeOnePath.units
      .filter((item) => item.state !== "LOCKED")
      .map((item) => item.unit.slug),
  );
  const selectedGradeOneRecommendation =
    gradeOneAdaptiveProgress?.ok
      ? selectAdaptiveCurriculumRecommendation({
          grade: 1,
          progress: gradeOneAdaptiveProgress.progress,
        })
      : null;
  const gradeOneRecommendation =
    selectedGradeOneRecommendation &&
    runtimeEligibleUnitIds.has(selectedGradeOneRecommendation.unitId)
      ? selectedGradeOneRecommendation
      : null;
  const gradeOneCompetencyDashboard =
    gradeOneAdaptiveProgress?.ok
      ? buildStudentCompetencyDashboard({
          progress: gradeOneAdaptiveProgress.progress,
          now: new Date(),
          adaptivePilotEnabled: false,
          runtimeEligibleUnitIds,
        })
      : null;

  return (
    <div className="catalog-page theory-catalog-page--v2 page-shell">
      {gradeOneCompetencyDashboard ? (
        <CompetencyLearningPathPanel
          model={gradeOneCompetencyDashboard}
          legacyPath={gradeOnePath}
        />
      ) : null}
      <header className="catalog-hero">
        <p className="eyebrow">Thư viện kiến thức</p>
        <h1>Lý thuyết Toán lớp {access.grade}</h1>
        <p>
          Ôn lại kiến thức, quy tắc và ví dụ từng bước trước khi em bắt đầu
          luyện tập.
        </p>
      </header>

      {gradeOneRecommendation ? (
        <section
          className="personalized-recommendation"
          aria-labelledby="grade-one-adaptive-title"
        >
          <div className="personalized-recommendation__content">
            <p className="eyebrow">Gợi ý từ bằng chứng học tập</p>
            <h2 id="grade-one-adaptive-title">Luyện thêm theo tiến độ của em</h2>
            <p>
              {getVietnameseOutcomeLabel({
                outcomeId: gradeOneRecommendation.outcomeId,
                label: gradeOneRecommendation.outcomeTitle,
              })}
            </p>
            <p>{gradeOneRecommendation.explanation}</p>
            <p className="parent-section-note">
              Đây là giả thuyết sản phẩm trong phạm vi Toán lớp 1, không phải
              chẩn đoán năng lực.
            </p>
          </div>
          {onDemandRuntimeEnabled ? (
            <AdaptiveOnDemandStartButton />
          ) : null}
        </section>
      ) : null}

      {units.length === 0 ? (
        <section className="empty-state empty-state--large">
          <h2>{getGradeContentEmptyTitle(access.grade)}</h2>
          <p>{getGradeContentEmptyDescription()}</p>
        </section>
      ) : (
        <section className="unit-catalog" aria-labelledby="unit-catalog-title">
          <div className="section-heading section-heading--compact">
            <p className="eyebrow">Kiến thức đã sẵn sàng</p>
            <h2 id="unit-catalog-title">Chọn phần em muốn ôn lại</h2>
          </div>

          <div className="unit-catalog__grid">
            {units.map((unit) => {
              const unitHistory = buildPracticeHistory(
                attempts.filter((attempt) => attempt.unitSlug === unit.slug),
              );
              const lessonState = getLessonPracticeState(unitHistory);
              const unlocked = isUnitPracticeUnlocked(unit, attempts);
              const presentation = getUnitPresentation(unit.slug);
              const statusLabel = !unlocked
                ? "Luyện tập đang khóa"
                : lessonState.kind === "CONTINUE"
                  ? `Đang học · ${lessonState.activeAttempt.answeredCount}/${lessonState.activeAttempt.totalQuestions}`
                  : lessonState.kind === "RETAKE"
                    ? "Đã hoàn thành"
                    : "Chưa bắt đầu";

              return (
                <article
                  className={`unit-card ${presentation.cardClassName}`}
                  key={unit.slug}
                >
                  <div className="unit-card__heading">
                    <span
                      className={`unit-status ${
                        lessonState.kind === "CONTINUE"
                          ? "unit-status--continue"
                          : lessonState.kind === "RETAKE"
                            ? "unit-status--complete"
                            : ""
                      }`}
                    >
                      {statusLabel}
                    </span>
                    <span>
                      {unit.lessonContent.sections.length} phần kiến thức
                    </span>
                  </div>
                  <h3>{unit.title}</h3>
                  <p>{unit.description}</p>
                  <div className="unit-card__objective">
                    <strong>Em sẽ hiểu</strong>
                    <span>{unit.learningObjectives[0]}</span>
                  </div>
                  <p className="unit-card__progress">
                    Có {unit.lessonContent.workedExamples.length} ví dụ với lời
                    giải từng bước.
                  </p>
                  <Button
                    href={getLessonPath(unit.slug)}
                  >
                    Xem lý thuyết
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
