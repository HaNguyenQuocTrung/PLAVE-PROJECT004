import "server-only";

import { loadConnectionState } from "@/lib/connections/server";
import {
  loadParentGoalSuggestionContext,
} from "@/lib/goal-suggestions/server";
import { parseParentChildLearningDashboard } from "@/lib/parent-dashboard/contracts";
import {
  parseParentWeeklySummary,
  type ParentWeeklySummary,
} from "@/lib/parent-dashboard/weekly";
import { createClient } from "@/lib/supabase/server";
import type { ParentGoalSuggestionContext } from "@/lib/goal-suggestions/contracts";
import { loadParentDiagnosticSummary } from "@/lib/diagnostic/server";
import type { ParentDiagnosticSummary } from "@/lib/diagnostic/contracts";
import { loadParentGradeOneCompletionSummary } from "@/lib/grade-one-completion/server";
import type { ParentGradeOneCompletionSummary } from "@/lib/grade-one-completion/contracts";
import {
  mergeParentGeneratedCurriculumProgress,
  parseParentGeneratedCurriculumProgress,
  parseParentUniversalProgress,
  type ParentUniversalProgress,
} from "@/lib/parent-dashboard/universal-contracts";
import {
  parseStudentScoringSummary,
  type StudentScoringSummary,
} from "@/lib/curriculum-runtime/contracts";
import {
  parseMotivationSummary,
  type MotivationSummary,
} from "@/lib/motivation/contracts";
import { reconcileStudentLearningEnrichment } from "@/lib/curriculum-runtime/enrichment-consistency";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type ParentDashboardLoadResult =
  | {
      ok: true;
      dashboard: NonNullable<
        ReturnType<typeof parseParentChildLearningDashboard>
      >;
      weeklySummary: ParentWeeklySummary | null;
      goalSuggestionContext: ParentGoalSuggestionContext | null;
      diagnosticSummary: ParentDiagnosticSummary | null;
      gradeOneCompletionSummary: ParentGradeOneCompletionSummary | null;
      universalProgress: ParentUniversalProgress;
      scoring: StudentScoringSummary | null;
      motivation: MotivationSummary | null;
    }
  | {
      ok: false;
      reason:
        | "UNAUTHENTICATED"
        | "ONBOARDING_REQUIRED"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "UNAVAILABLE";
    };

export async function loadParentWeeklySummary(
  supabase: ServerSupabaseClient,
  connectionId: string,
): Promise<ParentWeeklySummary | null> {
  const { data, error } = await supabase.rpc(
    "get_parent_child_weekly_summary",
    { p_connection_id: connectionId },
  );

  if (error) return null;
  return parseParentWeeklySummary(data);
}

export async function loadParentChildLearningDashboard(
  connectionId: string,
): Promise<ParentDashboardLoadResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, reason: "UNAUTHENTICATED" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { ok: false, reason: "UNAVAILABLE" };
  }
  if (!profile.onboarding_completed) {
    return { ok: false, reason: "ONBOARDING_REQUIRED" };
  }
  if (profile.role !== "PARENT") {
    return { ok: false, reason: "FORBIDDEN" };
  }

  const connectionResult = await loadConnectionState(supabase);
  if (
    !connectionResult.ok ||
    connectionResult.state.viewerRole !== "PARENT"
  ) {
    return { ok: false, reason: "UNAVAILABLE" };
  }

  const approvedConnection = connectionResult.state.connections.some(
    (connection) =>
      connection.connectionId === connectionId &&
      connection.status === "APPROVED",
  );
  if (!approvedConnection) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  const [
    { data, error },
    weeklySummary,
    goalSuggestionContext,
    diagnosticSummary,
    gradeOneCompletionSummary,
    universalProgressResult,
    generatedProgressResult,
    scoringResult,
    motivationResult,
  ] = await Promise.all([
    supabase.rpc("get_parent_child_learning_dashboard", {
      p_connection_id: connectionId,
    }),
    loadParentWeeklySummary(supabase, connectionId),
    loadParentGoalSuggestionContext(supabase, connectionId),
    loadParentDiagnosticSummary(supabase, connectionId),
    loadParentGradeOneCompletionSummary(supabase, connectionId),
    supabase.rpc("get_parent_child_universal_progress", {
      p_connection_id: connectionId,
    }),
    supabase.rpc("get_parent_child_generated_curriculum_progress", {
      p_connection_id: connectionId,
    }),
    supabase.rpc("get_parent_child_score_xp_mastery", {
      p_connection_id: connectionId,
    }),
    supabase.rpc("get_parent_child_motivation_v1", {
      p_connection_id: connectionId,
    }),
  ]);

  if (
    error ||
    universalProgressResult.error ||
    generatedProgressResult.error
  ) {
    return { ok: false, reason: "UNAVAILABLE" };
  }

  const dashboard = parseParentChildLearningDashboard(data);
  if (!dashboard) {
    return { ok: false, reason: "UNAVAILABLE" };
  }
  const baseUniversalProgress = parseParentUniversalProgress(
    universalProgressResult.data,
  );
  const generatedProgress = parseParentGeneratedCurriculumProgress(
    generatedProgressResult.data,
  );
  const universalProgress =
    baseUniversalProgress && generatedProgress
      ? mergeParentGeneratedCurriculumProgress(
          baseUniversalProgress,
          generatedProgress,
        )
      : null;
  if (!universalProgress) {
    return { ok: false, reason: "UNAVAILABLE" };
  }
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

  return {
    ok: true,
    dashboard,
    weeklySummary,
    goalSuggestionContext,
    diagnosticSummary,
    gradeOneCompletionSummary,
    universalProgress,
    scoring,
    motivation,
  };
}
