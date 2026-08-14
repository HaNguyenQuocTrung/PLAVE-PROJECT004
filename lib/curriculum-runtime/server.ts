import "server-only";

import { getUniversalCurriculumRuntimeFlag } from "./feature-flag.ts";
import {
  mergeStudentGeneratedCurriculumHistory,
  mergeStudentGeneratedCurriculumProgress,
  parseStudentCurriculumHistory,
  parseStudentCurriculumProgress,
  parseStudentGeneratedCurriculumEvidence,
  parseStudentScoringSummary,
} from "./contracts.ts";
import { parseMotivationSummary } from "../motivation/contracts.ts";
import { getStudentLearningContext } from "../practice/server.ts";
import { parseReleasedCatalog, parseReleasedUnitDetail } from "../release-integration/catalog.ts";
import { getGradesTwoToNineReleaseMode } from "../release-integration/server-config.ts";
import { reconcileStudentLearningEnrichment } from "./enrichment-consistency.ts";

export async function loadStudentCurriculumProgress(
  existingAccess?: Awaited<ReturnType<typeof getStudentLearningContext>>,
) {
  const access = existingAccess ?? (await getStudentLearningContext());
  if (!access.ok) return access;
  const availability = await resolveUniversalCurriculumAvailability(access);
  if (!availability.ok) return availability;
  const progressRpc = access.grade >= 2
    ? "get_my_released_curriculum_progress"
    : "get_student_curriculum_progress";
  const [
    { data, error },
    generatedResult,
    scoringResult,
    motivationResult,
  ] = await Promise.all([
    access.supabase.rpc(progressRpc),
    access.grade === 1
      ? access.supabase.rpc("get_my_generated_curriculum_evidence")
      : Promise.resolve({ data: null, error: null }),
    access.supabase.rpc("get_my_score_xp_mastery"),
    access.supabase.rpc("get_my_motivation_v1"),
  ]);
  const baseProgress = error ? null : parseStudentCurriculumProgress(data);
  const generated =
    access.grade === 1 && !generatedResult.error
      ? parseStudentGeneratedCurriculumEvidence(generatedResult.data)
      : null;
  const progress =
    access.grade === 1
      ? baseProgress && generated
        ? mergeStudentGeneratedCurriculumProgress(baseProgress, generated)
        : null
      : baseProgress;
  const parsedScoring = scoringResult.error
    ? null
    : parseStudentScoringSummary(scoringResult.data);
  const parsedMotivation = motivationResult.error
    ? null
    : parseMotivationSummary(motivationResult.data);
  const { scoring, motivation } = reconcileStudentLearningEnrichment({
    scoring: parsedScoring,
    motivation: parsedMotivation,
  });
  if (!progress || progress.grade !== access.grade) {
    return { ok: false as const, reason: "DATA_UNAVAILABLE" as const };
  }
  return {
    ok: true as const,
    progress: { ...progress, scoring, motivation },
    access,
    availability,
  };
}

export async function resolveUniversalCurriculumAvailability(
  existingAccess: Awaited<ReturnType<typeof getStudentLearningContext>>,
) {
  if (!existingAccess.ok) return existingAccess;
  if (!getUniversalCurriculumRuntimeFlag().enabled) {
    return { ok: false as const, reason: "DISABLED" as const };
  }
  if (existingAccess.grade >= 2) {
    const applicationMode = getGradesTwoToNineReleaseMode();
    if (applicationMode.mode === "HIDDEN") {
      return { ok: false as const, reason: "DISABLED" as const };
    }
    const { data, error } = await existingAccess.supabase.rpc(
      "get_my_grades_2_9_release_catalog",
    );
    const catalog = error ? null : parseReleasedCatalog(data);
    if (!catalog
      || catalog.grade !== existingAccess.grade
      || catalog.releaseMode !== applicationMode.mode) {
      return { ok: false as const, reason: "DB_RELEASE_UNAVAILABLE" as const };
    }
    return { ok: true as const, catalog };
  }
  const { data, error } = await existingAccess.supabase.rpc(
    "get_student_curriculum_progress",
  );
  const progress = error ? null : parseStudentCurriculumProgress(data);
  if (!progress || progress.grade !== existingAccess.grade) {
    return {
      ok: false as const,
      reason: "DB_RELEASE_UNAVAILABLE" as const,
    };
  }
  return { ok: true as const, data, error: null, progress };
}

export async function loadReleasedCurriculumUnit(
  unitSlug: string,
  existingAccess?: Awaited<ReturnType<typeof getStudentLearningContext>>,
) {
  const access = existingAccess ?? await getStudentLearningContext();
  if (!access.ok) return access;
  const availability = await resolveUniversalCurriculumAvailability(access);
  if (!availability.ok || access.grade < 2 || !("catalog" in availability)) {
    return { ok: false as const, reason: "DB_RELEASE_UNAVAILABLE" as const };
  }
  const { data, error } = await access.supabase.rpc(
    "get_my_grades_2_9_release_unit",
    { p_unit_slug: unitSlug },
  );
  const unit = error ? null : parseReleasedUnitDetail(data);
  if (!unit || unit.grade !== access.grade || unit.unitId !== unitSlug) {
    return { ok: false as const, reason: "DATA_UNAVAILABLE" as const };
  }
  return { ok: true as const, unit, catalog: availability.catalog, access };
}

export async function loadStudentCurriculumHistory(
  existingAccess?: Awaited<ReturnType<typeof getStudentLearningContext>>,
) {
  const flag = getUniversalCurriculumRuntimeFlag();
  if (!flag.enabled) return { ok: false as const, reason: "DISABLED" as const };
  const access = existingAccess ?? (await getStudentLearningContext());
  if (!access.ok) return access;
  const [{ data, error }, generatedResult, scoringResult] = await Promise.all([
    access.supabase.rpc(
    "get_student_curriculum_history",
    ),
    access.grade === 1
      ? access.supabase.rpc("get_my_generated_curriculum_evidence")
      : Promise.resolve({ data: null, error: null }),
    access.supabase.rpc("get_my_score_xp_mastery"),
  ]);
  const baseHistory = error ? null : parseStudentCurriculumHistory(data);
  const generated =
    access.grade === 1 && !generatedResult.error
      ? parseStudentGeneratedCurriculumEvidence(generatedResult.data)
      : null;
  const history =
    access.grade === 1
      ? baseHistory && generated
        ? mergeStudentGeneratedCurriculumHistory(baseHistory, generated)
        : null
      : baseHistory;
  const scoring = scoringResult.error
    ? null
    : parseStudentScoringSummary(scoringResult.data);
  if (!history || history.grade !== access.grade) {
    return { ok: false as const, reason: "DATA_UNAVAILABLE" as const };
  }
  const attemptScoring = new Map(
    (scoring?.attempts ?? []).map((attempt) => [attempt.attemptId, attempt]),
  );
  return {
    ok: true as const,
    history: {
      ...history,
      attempts: history.attempts.map((attempt) => {
        const score = attemptScoring.get(attempt.attemptId);
        return score
          ? {
              ...attempt,
              scorePercent: score.scorePercent,
              earnedWeight: score.earnedWeight,
              possibleWeight: score.possibleWeight,
              xpEarned: score.xpEarned,
              scoringPolicyVersion: score.policyVersion,
              legacyScoring: score.legacy,
            }
          : attempt;
      }),
    },
    scoring,
    access,
  };
}
