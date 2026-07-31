import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { LearningAccessState } from "@/components/LearningAccessState";
import { LessonDetail } from "@/components/LessonDetail";
import { UniversalCurriculumLesson } from "@/components/UniversalCurriculumLesson";
import { getCurriculumUnit } from "@/lib/curriculum/registry";
import { studentUnitTitle } from "@/lib/curriculum/student-facing";
import { parseStudentCurriculumProgress } from "@/lib/curriculum-runtime/contracts";
import { getUniversalCurriculumRuntimeFlag } from "@/lib/curriculum-runtime/feature-flag";
import {
  getUnitSlugFromLessonRoute,
  isUnitPracticeUnlocked,
} from "@/lib/practice/catalog";
import {
  parseAttemptRows,
  parseLearningUnit,
} from "@/lib/practice/contracts";
import {
  resolvePracticeRuntimeAccess,
} from "@/lib/practice/runtime-flags";
import { resolveServerAdaptivePilotAccess } from "@/lib/practice/adaptive-pilot-server";
import { buildPracticeHistory } from "@/lib/practice/history";
import { getStudentLearningContext } from "@/lib/practice/server";
import { createClient } from "@/lib/supabase/server";

type LessonPageProps = {
  params: Promise<{ gradeSlug: string; lessonSlug: string }>;
};

export async function generateMetadata({
  params,
}: LessonPageProps): Promise<Metadata> {
  const { gradeSlug, lessonSlug } = await params;
  const unitSlug = getUnitSlugFromLessonRoute(gradeSlug, lessonSlug);
  if (!unitSlug) return { title: "Lý thuyết" };
  const curriculumUnit = getCurriculumUnit(unitSlug);
  if (
    curriculumUnit &&
    curriculumUnit.grade >= 2 &&
    getUniversalCurriculumRuntimeFlag().enabled
  ) {
    return { title: studentUnitTitle(curriculumUnit) };
  }
  if (
    resolvePracticeRuntimeAccess(unitSlug).kind !== "FIXED_RUNTIME"
  ) {
    return { title: "Lý thuyết" };
  }

  const supabase = await createClient();
  const { data: unit } = await supabase
    .from("learning_units")
    .select("title")
    .eq("slug", unitSlug)
    .eq("published", true)
    .maybeSingle();

  return {
    title:
      typeof unit?.title === "string" && unit.title.trim()
        ? unit.title
        : "Lý thuyết",
  };
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { gradeSlug, lessonSlug } = await params;
  const unitSlug = getUnitSlugFromLessonRoute(gradeSlug, lessonSlug);
  if (!unitSlug) notFound();

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

  const requestedGrade = Number(gradeSlug.replace("grade-", ""));
  if (access.grade !== requestedGrade) {
    return <LearningAccessState kind="GRADE" />;
  }

  const curriculumUnit = getCurriculumUnit(unitSlug);
  if (
    access.grade >= 2 &&
    getUniversalCurriculumRuntimeFlag().enabled &&
    curriculumUnit?.grade === access.grade
  ) {
    const { data, error } = await access.supabase.rpc(
      "get_student_curriculum_progress",
    );
    const progress = error ? null : parseStudentCurriculumProgress(data);
    if (!progress || progress.grade !== access.grade) {
      return <LearningAccessState kind="UNAVAILABLE" />;
    }
    return (
      <UniversalCurriculumLesson
        unit={curriculumUnit}
        progress={
          progress.units.find((item) => item.unitId === unitSlug) ?? null
        }
      />
    );
  }

  const runtimeAccess = resolvePracticeRuntimeAccess(unitSlug);
  const pilotAccess =
    runtimeAccess.kind === "HIDDEN_RELEASE_CANDIDATE"
      ? await resolveServerAdaptivePilotAccess(
          access.user.id,
          access.grade,
          async (functionName, args) => {
            const result = await access.supabase.rpc(functionName, args);
            return { data: result.data, error: result.error };
          },
        )
      : null;
  if (
    runtimeAccess.kind !== "FIXED_RUNTIME" &&
    pilotAccess?.kind !== "ALLOWED"
  ) {
    return <LearningAccessState kind="NOT_FOUND" />;
  }
  const isAdaptivePilot = pilotAccess?.kind === "ALLOWED";

  const [
    { data: unitRow, error: unitError },
    { data: attemptRows, error: attemptError },
  ] = await Promise.all([
    access.supabase
      .from("learning_units")
      .select(
        "slug, grade, title, description, learning_objectives, lesson_content, total_questions, prerequisite_unit_slug",
      )
      .eq("slug", unitSlug)
      .eq("published", !isAdaptivePilot)
      .maybeSingle(),
    access.supabase
      .from("practice_attempts")
      .select(
        "id, unit_slug, status, question_order, total_questions, answered_count, correct_count, started_at, completed_at",
      )
      .eq("student_id", access.user.id)
      .order("started_at", { ascending: true })
      .order("id", { ascending: true }),
  ]);

  const unit = parseLearningUnit(unitRow);
  const attempts = parseAttemptRows(attemptRows);
  if (unitError || attemptError || !unit || !attempts) {
    return <LearningAccessState kind="UNAVAILABLE" />;
  }

  let prerequisiteUnit = null;
  if (unit.prerequisiteUnitSlug) {
    const { data: prerequisiteRow, error: prerequisiteError } =
      await access.supabase
        .from("learning_units")
        .select(
          "slug, grade, title, description, learning_objectives, lesson_content, total_questions, prerequisite_unit_slug",
        )
        .eq("slug", unit.prerequisiteUnitSlug)
        .eq("published", true)
        .maybeSingle();
    prerequisiteUnit = parseLearningUnit(prerequisiteRow);
    if (prerequisiteError || !prerequisiteUnit) {
      return <LearningAccessState kind="UNAVAILABLE" />;
    }
  }

  return (
    <LessonDetail
      unit={unit}
      practiceHistory={buildPracticeHistory(
        attempts.filter((attempt) => attempt.unitSlug === unit.slug),
      )}
      practiceUnlocked={isUnitPracticeUnlocked(unit, attempts)}
      prerequisiteUnit={prerequisiteUnit}
      practiceRuntime={
        isAdaptivePilot
          ? "ADAPTIVE"
          : "FIXED"
      }
    />
  );
}
