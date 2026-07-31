import "server-only";

import {
  parseDiagnosticAttemptSummary,
  parseDiagnosticReviewRpcResult,
  parseDiagnosticStateRpcResult,
  parseParentDiagnosticSummary,
  type DiagnosticAttemptSummary,
  type DiagnosticReview,
  type DiagnosticState,
  type ParentDiagnosticSummary,
} from "@/lib/diagnostic/contracts";
import { getStudentLearningContext } from "@/lib/practice/server";
import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function loadLatestDiagnosticAttempt(
  supabase: ServerSupabaseClient,
  studentId: string,
): Promise<DiagnosticAttemptSummary | null> {
  const { data, error } = await supabase
    .from("diagnostic_attempts")
    .select(
      "id, status, answered_count, correct_count, recommendation_unit_slug, recommendation_reason_code, recommendation_explanation, started_at, completed_at",
    )
    .eq("student_id", studentId)
    .order("started_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return parseDiagnosticAttemptSummary(data);
}

export async function loadDiagnosticState(
  attemptId: string,
): Promise<
  | { ok: true; state: DiagnosticState }
  | {
      ok: false;
      reason:
        | "UNAUTHENTICATED"
        | "ONBOARDING_REQUIRED"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "UNAVAILABLE";
    }
> {
  const access = await getStudentLearningContext();
  if (!access.ok) {
    return {
      ok: false,
      reason:
        access.reason === "UNAUTHENTICATED"
          ? "UNAUTHENTICATED"
          : access.reason === "ONBOARDING_REQUIRED"
            ? "ONBOARDING_REQUIRED"
            : access.reason === "ACCESS_DENIED"
              ? "FORBIDDEN"
              : "UNAVAILABLE",
    };
  }
  if (access.grade !== 1) {
    return { ok: false, reason: "FORBIDDEN" };
  }

  const { data, error } = await access.supabase.rpc(
    "get_grade1_diagnostic_state",
    { p_attempt_id: attemptId },
  );
  if (error) {
    return {
      ok: false,
      reason: error.message.includes("Diagnostic unavailable")
        ? "NOT_FOUND"
        : "UNAVAILABLE",
    };
  }
  const state = parseDiagnosticStateRpcResult(data);
  return state
    ? { ok: true, state }
    : { ok: false, reason: "UNAVAILABLE" };
}

export async function loadDiagnosticReview(
  attemptId: string,
): Promise<
  | { ok: true; review: DiagnosticReview }
  | {
      ok: false;
      reason:
        | "UNAUTHENTICATED"
        | "ONBOARDING_REQUIRED"
        | "FORBIDDEN"
        | "INCOMPLETE"
        | "NOT_FOUND"
        | "UNAVAILABLE";
    }
> {
  const access = await getStudentLearningContext();
  if (!access.ok) {
    return {
      ok: false,
      reason:
        access.reason === "UNAUTHENTICATED"
          ? "UNAUTHENTICATED"
          : access.reason === "ONBOARDING_REQUIRED"
            ? "ONBOARDING_REQUIRED"
            : access.reason === "ACCESS_DENIED"
              ? "FORBIDDEN"
              : "UNAVAILABLE",
    };
  }
  if (access.grade !== 1) {
    return { ok: false, reason: "FORBIDDEN" };
  }

  const { data, error } = await access.supabase.rpc(
    "get_grade1_diagnostic_review",
    { p_attempt_id: attemptId },
  );
  if (error) {
    const reason = error.message.includes("Diagnostic incomplete")
      ? "INCOMPLETE"
      : error.message.includes("Diagnostic unavailable")
        ? "NOT_FOUND"
        : "UNAVAILABLE";
    return { ok: false, reason };
  }
  const review = parseDiagnosticReviewRpcResult(data);
  return review
    ? { ok: true, review }
    : { ok: false, reason: "UNAVAILABLE" };
}

export async function loadParentDiagnosticSummary(
  supabase: ServerSupabaseClient,
  connectionId: string,
): Promise<ParentDiagnosticSummary | null> {
  const { data, error } = await supabase.rpc(
    "get_parent_child_grade1_diagnostic",
    { p_connection_id: connectionId },
  );
  if (error) return null;
  return parseParentDiagnosticSummary(data);
}
