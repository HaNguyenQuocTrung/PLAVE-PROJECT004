import "server-only";

import { getUniversalCurriculumRuntimeFlag } from "./feature-flag.ts";
import {
  mergeStudentGeneratedCurriculumHistory,
  mergeStudentGeneratedCurriculumProgress,
  parseStudentCurriculumHistory,
  parseStudentCurriculumProgress,
  parseStudentGeneratedCurriculumEvidence,
} from "./contracts.ts";
import { getStudentLearningContext } from "../practice/server.ts";

export async function loadStudentCurriculumProgress(
  existingAccess?: Awaited<ReturnType<typeof getStudentLearningContext>>,
) {
  const access = existingAccess ?? (await getStudentLearningContext());
  if (!access.ok) return access;
  const availability = await resolveUniversalCurriculumAvailability(access);
  if (!availability.ok) return availability;
  const generatedResult = access.grade === 1
    ? await access.supabase.rpc("get_my_generated_curriculum_evidence")
    : { data: null, error: null };
  const { data, error } = availability;
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
  if (!progress || progress.grade !== access.grade) {
    return { ok: false as const, reason: "DATA_UNAVAILABLE" as const };
  }
  return { ok: true as const, progress, access };
}

export async function resolveUniversalCurriculumAvailability(
  existingAccess: Awaited<ReturnType<typeof getStudentLearningContext>>,
) {
  if (!existingAccess.ok) return existingAccess;
  if (!getUniversalCurriculumRuntimeFlag().enabled) {
    return { ok: false as const, reason: "DISABLED" as const };
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

export async function loadStudentCurriculumHistory(
  existingAccess?: Awaited<ReturnType<typeof getStudentLearningContext>>,
) {
  const flag = getUniversalCurriculumRuntimeFlag();
  if (!flag.enabled) return { ok: false as const, reason: "DISABLED" as const };
  const access = existingAccess ?? (await getStudentLearningContext());
  if (!access.ok) return access;
  const [{ data, error }, generatedResult] = await Promise.all([
    access.supabase.rpc(
    "get_student_curriculum_history",
    ),
    access.grade === 1
      ? access.supabase.rpc("get_my_generated_curriculum_evidence")
      : Promise.resolve({ data: null, error: null }),
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
  if (!history || history.grade !== access.grade) {
    return { ok: false as const, reason: "DATA_UNAVAILABLE" as const };
  }
  return { ok: true as const, history, access };
}
