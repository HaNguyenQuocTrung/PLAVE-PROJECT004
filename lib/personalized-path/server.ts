import "server-only";

import {
  parseDiagnosticReviewRpcResult,
} from "@/lib/diagnostic/contracts";
import { loadLatestDiagnosticAttempt } from "@/lib/diagnostic/server";
import {
  buildPersonalizedLearningPath,
  type PersonalizedLearningPath,
} from "@/lib/personalized-path/contracts";
import {
  parseAttemptRows,
  parseLearningUnit,
  type LearningUnit,
  type PracticeAttempt,
} from "@/lib/practice/contracts";
import { loadServerAdaptivePilotUnit } from "@/lib/practice/adaptive-pilot-server";
import {
  resolveAdaptiveRuntimeGate,
  resolvePracticeRuntimeAccess,
} from "@/lib/practice/runtime-flags";
import {
  getStudentLearningContext,
  type StudentLearningAccessFailure,
} from "@/lib/practice/server";
import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type PersonalizedPathData = {
  grade: number;
  path: PersonalizedLearningPath;
  units: LearningUnit[];
  attempts: PracticeAttempt[];
  historyUnitTitles: Record<string, string>;
  controlledPilotUnit: LearningUnit | null;
};

export type PersonalizedPathLoadResult =
  | { ok: true; data: PersonalizedPathData }
  | {
      ok: false;
      reason: StudentLearningAccessFailure;
    };

export async function loadStudentPersonalizedPathWithClient(
  supabase: ServerSupabaseClient,
  studentId: string,
  grade: number,
): Promise<PersonalizedPathLoadResult> {
  const [
    { data: unitRows, error: unitError },
    { data: attemptRows, error: attemptError },
    { data: historyUnitRows, error: historyUnitError },
    latestDiagnosticResult,
  ] = await Promise.all([
    supabase
      .from("learning_units")
      .select(
        "slug, grade, title, description, learning_objectives, lesson_content, total_questions, prerequisite_unit_slug",
      )
      .eq("grade", grade)
      .eq("published", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("practice_attempts")
      .select(
        "id, unit_slug, status, question_order, total_questions, answered_count, correct_count, started_at, completed_at",
      )
      .eq("student_id", studentId)
      .order("started_at", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("learning_units")
      .select("slug, title"),
    grade === 1
      ? loadLatestDiagnosticAttempt(supabase, studentId)
      : Promise.resolve(null),
  ]);

  if (unitError || attemptError || historyUnitError) {
    return { ok: false, reason: "DATA_UNAVAILABLE" };
  }

  const units: LearningUnit[] = [];
  for (const row of unitRows ?? []) {
    const unit = parseLearningUnit(row);
    if (!unit) return { ok: false, reason: "DATA_UNAVAILABLE" };
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
  const attempts = parseAttemptRows(attemptRows);
  if (!attempts) {
    return { ok: false, reason: "DATA_UNAVAILABLE" };
  }
  const historyUnitTitles: Record<string, string> = {};
  for (const row of historyUnitRows ?? []) {
    if (
      typeof row.slug !== "string" ||
      typeof row.title !== "string" ||
      row.title.trim().length === 0
    ) {
      return { ok: false, reason: "DATA_UNAVAILABLE" };
    }
    historyUnitTitles[row.slug] = row.title;
  }

  const latestDiagnostic = latestDiagnosticResult;
  let diagnosticDomains = null;
  if (grade === 1 && latestDiagnostic?.status === "COMPLETED") {
    const { data, error } = await supabase.rpc(
      "get_grade1_diagnostic_review",
      { p_attempt_id: latestDiagnostic.id },
    );
    if (!error) {
      const review = parseDiagnosticReviewRpcResult(data);
      diagnosticDomains = review?.domains ?? null;
    }
  }
  const controlledPilotUnit = await loadServerAdaptivePilotUnit(
    supabase,
    studentId,
    grade,
  );

  return {
    ok: true,
    data: {
      grade,
      path: buildPersonalizedLearningPath({
        grade,
        units,
        attempts,
        latestDiagnostic,
        diagnosticDomains,
        diagnosticEnabled: grade === 1,
      }),
      units,
      attempts,
      historyUnitTitles,
      controlledPilotUnit,
    },
  };
}

export async function loadStudentPersonalizedPath(): Promise<PersonalizedPathLoadResult> {
  const access = await getStudentLearningContext();
  if (!access.ok) return access;
  return loadStudentPersonalizedPathWithClient(
    access.supabase,
    access.user.id,
    access.grade,
  );
}
