import { redirect } from "next/navigation";

import { Button } from "@/components/Button";
import { ControlledPilotCard } from "@/components/ControlledPilotCard";
import { UniversalLessonsCatalog } from "@/components/UniversalLessonsCatalog";
import { LearningAccessState } from "@/components/LearningAccessState";
import { PersonalizedLearningOverview } from "@/components/PersonalizedLearningOverview";
import { PersonalizedRecommendationCard } from "@/components/PersonalizedRecommendationCard";
import { StartPracticeButton } from "@/components/StartPracticeButton";
import {
  getLessonPath,
  getUnitPresentation,
} from "@/lib/practice/catalog";
import {
  getGradeContentEmptyDescription,
  getGradeContentEmptyTitle,
} from "@/lib/practice/grade-content";
import {
  getPersonalizedUnitStateLabel,
} from "@/lib/personalized-path/contracts";
import { loadStudentPersonalizedPathWithClient } from "@/lib/personalized-path/server";
import { buildStudentCompetencyDashboard } from "@/lib/competency/student-adapter";
import { loadStudentCurriculumProgress } from "@/lib/curriculum-runtime/server";
import { recordUniversalAvailabilityDiagnostic } from "@/lib/curriculum-runtime/diagnostics";
import { getUniversalCurriculumRuntimeFlag } from "@/lib/curriculum-runtime/feature-flag";
import { getPracticeReviewPath } from "@/lib/practice/review";
import { getStudentLearningContext } from "@/lib/practice/server";
import { getCurrentGeneratedPracticePilotEligibility } from "@/lib/curriculum/generated-practice-pilot";
import { GeneratedPracticePilotCard } from "@/components/GeneratedPracticePilotCard";

export const metadata = {
  title: "Bài học",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LessonsPage() {
  const access = await getStudentLearningContext();
  if (!access.ok) {
    if (access.reason === "UNAUTHENTICATED") redirect("/login");
    if (access.reason === "ONBOARDING_REQUIRED") redirect("/onboarding");
    return <LearningAccessState kind="FORBIDDEN" />;
  }
  const generatedPilotEligible =
    getCurrentGeneratedPracticePilotEligibility({
      userId: access.user.id,
      role: "STUDENT",
      schoolGrade: access.grade,
    }).eligible;
  const universal = await loadStudentCurriculumProgress(access);
  if (access.grade >= 2 && universal.ok) {
    const competency = buildStudentCompetencyDashboard({
      progress: universal.progress,
      now: new Date(),
      adaptivePilotEnabled: false,
    });
    if (competency) {
      recordUniversalAvailabilityDiagnostic({
        route: "/lessons",
        role: "STUDENT",
        schoolGrade: access.grade,
        runtimeEnabled: getUniversalCurriculumRuntimeFlag().enabled,
        releaseAvailable: true,
        catalogCount: universal.progress.units.length,
        failureCode: "NONE",
        progress: universal.progress,
      });
      return (
        <UniversalLessonsCatalog
          grade={access.grade}
          progress={universal.progress}
          competency={competency}
          generatedPilotEligible={generatedPilotEligible}
        />
      );
    }
  }
  recordUniversalAvailabilityDiagnostic({
    route: "/lessons",
    role: "STUDENT",
    schoolGrade: access.grade,
    runtimeEnabled: getUniversalCurriculumRuntimeFlag().enabled,
    releaseAvailable: false,
    catalogCount: 0,
    failureCode: universal.ok ? "COMPETENCY_UNAVAILABLE" : universal.reason,
    progress: null,
  });
  const result = await loadStudentPersonalizedPathWithClient(
    access.supabase,
    access.user.id,
    access.grade,
  );

  if (!result.ok) {
    if (result.reason === "UNAUTHENTICATED") redirect("/login");
    if (result.reason === "ONBOARDING_REQUIRED") redirect("/onboarding");
    return (
      <LearningAccessState
        kind={result.reason === "ACCESS_DENIED" ? "FORBIDDEN" : "UNAVAILABLE"}
      />
    );
  }

  const { controlledPilotUnit, grade, path } = result.data;

  return (
    <div className="catalog-page page-shell">
      <header className="catalog-hero catalog-hero--lessons">
        <p className="eyebrow">Lộ trình học của em</p>
        <h1>Bài học dành cho lớp {grade}</h1>
        <p>
          Theo dõi đủ lộ trình, hiểu vì sao một bài được đề xuất và tiếp tục
          đúng lượt đã lưu của em.
        </p>
      </header>

      {controlledPilotUnit ? (
        <ControlledPilotCard unit={controlledPilotUnit} />
      ) : null}

      {generatedPilotEligible ? <GeneratedPracticePilotCard /> : null}

      {path.units.length === 0 ? (
        <section className="empty-state empty-state--large">
          <h2>{getGradeContentEmptyTitle(grade)}</h2>
          <p>{getGradeContentEmptyDescription()}</p>
        </section>
      ) : (
        <>
          <PersonalizedLearningOverview path={path} />
          <PersonalizedRecommendationCard path={path} />

          <section
            className="unit-catalog"
            aria-labelledby="lesson-catalog-title"
          >
            <div className="section-heading section-heading--compact">
              <p className="eyebrow">
                {path.units.length} unit đã sẵn sàng
              </p>
              <h2 id="lesson-catalog-title">Toàn bộ lộ trình của em</h2>
            </div>

            <div className="unit-catalog__grid">
              {path.units.map((item) => {
              const { unit } = item;
              const presentation = getUnitPresentation(unit.slug);
              const prerequisiteUnit = unit.prerequisiteUnitSlug
                ? path.units.find(
                    (candidate) =>
                      candidate.unit.slug === unit.prerequisiteUnitSlug,
                  )?.unit ?? null
                : null;
              const recentAttempt =
                item.activeAttempt ?? item.latestCompletedAttempt;
              const href = item.activeAttempt
                  ? `/practice/${item.activeAttempt.id}`
                  : getLessonPath(unit.slug);

              return (
                <article
                  className={`unit-card ${presentation.cardClassName} ${
                    item.isRecommended ? "unit-card--recommended" : ""
                  }`}
                  key={unit.slug}
                >
                  <div className="unit-card__heading">
                    <span
                      className={`unit-status unit-status--${item.state
                        .toLowerCase()
                        .replace("_", "-")}`}
                    >
                      {getPersonalizedUnitStateLabel(item.state)}
                    </span>
                    {item.isRecommended ? (
                      <span
                        className="unit-recommendation-badge"
                        aria-label="Đây là bài được khuyến nghị tiếp theo"
                      >
                        Khuyến nghị tiếp theo
                      </span>
                    ) : null}
                    <span>{unit.totalQuestions} câu luyện tập</span>
                  </div>
                  <h3>{unit.title}</h3>
                  <p>{unit.description}</p>
                  <div className="unit-card__objective">
                    <strong>Mục tiêu chính</strong>
                    <span>{unit.learningObjectives[0]}</span>
                  </div>
                  <p className="unit-card__progress">
                    {recentAttempt
                      ? `Tiến độ gần nhất: ${recentAttempt.answeredCount}/${recentAttempt.totalQuestions} câu · Đúng ${recentAttempt.correctCount} câu`
                      : "Em chưa bắt đầu bài học này."}
                  </p>
                  <div className="unit-card__actions">
                    {item.state === "LOCKED" ? (
                      <>
                        <p className="unit-card__locked-note">
                          Em hãy hoàn thành bài{" "}
                          {prerequisiteUnit?.title ?? "nền tảng"} trước khi bắt
                          đầu luyện tập bài này.
                        </p>
                        <Button href={href}>Đọc lý thuyết</Button>
                        <Button
                          href={
                            prerequisiteUnit
                              ? getLessonPath(prerequisiteUnit.slug)
                              : "/lessons"
                          }
                          variant="secondary"
                        >
                          Về bài nền tảng
                        </Button>
                      </>
                    ) : item.state === "IN_PROGRESS" &&
                      item.activeAttempt ? (
                      <Button href={href}>Tiếp tục làm bài</Button>
                    ) : item.latestCompletedAttempt ? (
                      <>
                        <Button
                          href={getPracticeReviewPath(
                            item.latestCompletedAttempt.id,
                          )}
                          variant="secondary"
                        >
                          Xem kết quả
                        </Button>
                        <StartPracticeButton
                          label={
                            item.state === "NEEDS_REVIEW"
                              ? "Ôn lại bài này"
                              : "Làm lượt mới"
                          }
                          unitSlug={unit.slug}
                        />
                      </>
                    ) : (
                      <Button href={href}>Bắt đầu bài học</Button>
                    )}
                  </div>
                </article>
              );
            })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
