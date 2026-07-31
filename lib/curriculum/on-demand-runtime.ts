import "server-only";

import { createHmac } from "node:crypto";

import {
  selectAdaptiveCurriculumRecommendation,
} from "./adaptive-selection.ts";
import {
  getOnDemandRuntimeConfiguration,
} from "./on-demand-feature-flag.ts";
import {
  deriveSemanticPilotAttemptSeed,
  generateSemanticPilotAttemptSnapshot,
  getSemanticPilotOutcomeVariant,
  semanticPilotDifficultyFromEvidence,
} from "./semantic-pilot-generation.ts";
import {
  evaluateGeneratedPracticePilotEligibility,
} from "./generated-practice-pilot.ts";
import { recordGeneratedPilotDiagnostic } from "./generated-practice-pilot-diagnostics.ts";
import type { CurriculumGrade } from "./types.ts";
import {
  parseCurriculumAttemptState,
} from "../curriculum-runtime/contracts.ts";
import {
  loadStudentCurriculumProgress,
} from "../curriculum-runtime/server.ts";
import {
  getStudentLearningContext,
} from "../practice/server.ts";

export function signOnDemandSnapshot(input: Readonly<{
  studentId: string;
  idempotencyKey: string;
  snapshotHash: string;
  signingKey: string;
}>) {
  return createHmac("sha256", Buffer.from(input.signingKey, "hex"))
    .update(
      `${input.studentId}:${input.idempotencyKey}:${input.snapshotHash}`,
    )
    .digest("hex");
}

export async function startOrResumeAdaptiveOnDemand(input: Readonly<{
  idempotencyKey: string;
  recordTiming?: (
    stage:
      | "supabase_client"
      | "auth_user"
      | "profile"
      | "student_profile"
      | "progress"
      | "generation"
      | "rpc"
      | "response_mapping",
    durationMs: number,
  ) => void;
}>) {
  const configuration = getOnDemandRuntimeConfiguration();
  if (!configuration.enabled || !configuration.signingKey) {
    return { ok: false as const, reason: "RUNTIME_DISABLED" as const };
  }
  const access = await getStudentLearningContext({
    recordTiming: input.recordTiming,
  });
  if (!access.ok) return access;
  const eligibility = evaluateGeneratedPracticePilotEligibility({
    configuration: configuration.pilot,
    userId: access.user.id,
    role: "STUDENT",
    schoolGrade: access.grade,
  });
  if (!eligibility.eligible) {
    recordGeneratedPilotDiagnostic({
      route: "/api/on-demand-curriculum/start",
      mode: configuration.mode,
      loopbackOnly: configuration.pilot.loopbackOnly,
      allowlistValid: eligibility.allowlistValid,
      allowlistCount: eligibility.allowlistCount,
      eligible: false,
      role: "STUDENT",
      schoolGrade: access.grade,
      failureClass: "REQUEST_INELIGIBLE",
    });
    return { ok: false as const, reason: "RUNTIME_DISABLED" as const };
  }
  const progressStartedAt = performance.now();
  const progress = await loadStudentCurriculumProgress(access);
  input.recordTiming?.(
    "progress",
    performance.now() - progressStartedAt,
  );
  if (!progress.ok) {
    return { ok: false as const, reason: "DATA_UNAVAILABLE" as const };
  }
  const recommendation = selectAdaptiveCurriculumRecommendation({
    grade: access.grade as CurriculumGrade,
    progress: progress.progress,
    generatorScope: "SEMANTIC_ALL",
  });
  if (!recommendation) {
    return { ok: false as const, reason: "NO_SAFE_STRATEGY" as const };
  }
  const variantId =
    getSemanticPilotOutcomeVariant(recommendation.outcomeId) ??
    "UNRESOLVED";
  let snapshot;
  const generationStartedAt = performance.now();
  try {
    const outcomeEvidence = progress.progress.outcomes.find(
      (item) => item.title === recommendation.outcomeTitle,
    );
    snapshot = generateSemanticPilotAttemptSnapshot({
      grade: access.grade as CurriculumGrade,
      unitId: recommendation.unitId,
      outcomeId: recommendation.outcomeId,
      attemptSeed: deriveSemanticPilotAttemptSeed({
        studentId: access.user.id,
        idempotencyKey: input.idempotencyKey,
        signingKey: configuration.signingKey,
      }),
      baseDifficulty: semanticPilotDifficultyFromEvidence({
        evidenceCount: outcomeEvidence?.evidenceCount ?? 0,
        correctCount: outcomeEvidence?.correctCount ?? 0,
      }),
      selectionReason: recommendation.reasonCode,
    });
  } catch (error) {
    const failureClass =
      error instanceof Error
        ? error.message
            .replace(/[^A-Z0-9_-]/giu, "_")
            .toUpperCase()
            .slice(0, 160)
        : "GENERATION_FAILED";
    recordGeneratedPilotDiagnostic({
      route: "/api/on-demand-curriculum/start",
      mode: configuration.mode,
      loopbackOnly: configuration.pilot.loopbackOnly,
      allowlistValid: eligibility.allowlistValid,
      allowlistCount: eligibility.allowlistCount,
      eligible: true,
      role: "STUDENT",
      schoolGrade: access.grade,
      failureClass,
      outcomeId: recommendation.outcomeId,
      variantId,
    });
    input.recordTiming?.(
      "generation",
      performance.now() - generationStartedAt,
    );
    return { ok: false as const, reason: "NO_SAFE_STRATEGY" as const };
  }
  input.recordTiming?.(
    "generation",
    performance.now() - generationStartedAt,
  );
  recordGeneratedPilotDiagnostic({
    route: "/api/on-demand-curriculum/start",
    mode: configuration.mode,
    loopbackOnly: configuration.pilot.loopbackOnly,
    allowlistValid: eligibility.allowlistValid,
    allowlistCount: eligibility.allowlistCount,
    eligible: true,
    role: "STUDENT",
    schoolGrade: access.grade,
    failureClass: "GENERATION_VALIDATED",
    outcomeId: recommendation.outcomeId,
    variantId,
  });
  if (configuration.mode !== "PILOT_LIVE") {
    return {
      ok: false as const,
      reason: "RUNTIME_DISABLED" as const,
    };
  }
  const signature = signOnDemandSnapshot({
    studentId: access.user.id,
    idempotencyKey: input.idempotencyKey,
    snapshotHash: snapshot.snapshotHash,
    signingKey: configuration.signingKey,
  });
  const rpcStartedAt = performance.now();
  const { data, error } = await access.supabase.rpc(
    "start_or_resume_semantic_generated_curriculum",
    {
      p_snapshot: snapshot,
      p_signature: signature,
      p_idempotency_key: input.idempotencyKey,
    },
  );
  input.recordTiming?.("rpc", performance.now() - rpcStartedAt);
  const mappingStartedAt = performance.now();
  const state = error ? null : parseCurriculumAttemptState(data);
  input.recordTiming?.(
    "response_mapping",
    performance.now() - mappingStartedAt,
  );
  if (!state || state.grade !== access.grade || state.feedback !== null) {
    recordGeneratedPilotDiagnostic({
      route: "/api/on-demand-curriculum/start",
      mode: configuration.mode,
      loopbackOnly: configuration.pilot.loopbackOnly,
      allowlistValid: eligibility.allowlistValid,
      allowlistCount: eligibility.allowlistCount,
      eligible: true,
      role: "STUDENT",
      schoolGrade: access.grade,
      failureClass: error ? "PERSISTENCE_REJECTED" : "RESPONSE_MAPPING_FAILED",
      outcomeId: recommendation.outcomeId,
      variantId,
    });
    return {
      ok: false as const,
      reason: error ? "DATABASE_REJECTED" as const : "DATA_UNAVAILABLE" as const,
      databaseError: error ?? null,
    };
  }
  recordGeneratedPilotDiagnostic({
    route: "/api/on-demand-curriculum/start",
    mode: configuration.mode,
    loopbackOnly: configuration.pilot.loopbackOnly,
    allowlistValid: eligibility.allowlistValid,
    allowlistCount: eligibility.allowlistCount,
    eligible: true,
    role: "STUDENT",
    schoolGrade: access.grade,
    failureClass: "NONE",
    outcomeId: recommendation.outcomeId,
    variantId,
  });
  return {
    ok: true as const,
    state,
    recommendation,
    snapshotHash: snapshot.snapshotHash,
  };
}

export async function loadOnDemandAttemptState(
  attemptId: string,
  recordTiming?: (
    stage:
      | "supabase_client"
      | "auth_user"
      | "profile"
      | "student_profile"
      | "rpc"
      | "response_mapping",
    durationMs: number,
  ) => void,
) {
  const configuration = getOnDemandRuntimeConfiguration();
  if (!configuration.enabled) {
    return { ok: false as const, reason: "RUNTIME_DISABLED" as const };
  }
  const access = await getStudentLearningContext({ recordTiming });
  if (!access.ok) return access;
  const eligibility = evaluateGeneratedPracticePilotEligibility({
    configuration: configuration.pilot,
    userId: access.user.id,
    role: "STUDENT",
    schoolGrade: access.grade,
  });
  if (!eligibility.eligible) {
    return { ok: false as const, reason: "RUNTIME_DISABLED" as const };
  }
  const rpcStartedAt = performance.now();
  const { data, error } = await access.supabase.rpc(
    "get_generated_curriculum_attempt_state",
    { p_attempt_id: attemptId },
  );
  recordTiming?.("rpc", performance.now() - rpcStartedAt);
  const mappingStartedAt = performance.now();
  const state = error ? null : parseCurriculumAttemptState(data);
  recordTiming?.(
    "response_mapping",
    performance.now() - mappingStartedAt,
  );
  if (!state || state.grade !== access.grade) {
    return {
      ok: false as const,
      reason: error ? "DATABASE_REJECTED" as const : "DATA_UNAVAILABLE" as const,
      databaseError: error ?? null,
    };
  }
  return { ok: true as const, state };
}
