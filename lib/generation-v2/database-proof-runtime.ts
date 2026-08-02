import "server-only";

import { createHmac } from "node:crypto";

import { buildUniversalCurriculumRelease, sha256 } from "../curriculum-runtime/release.ts";
import {
  parseCurriculumAttemptState,
  parseStudentCurriculumHistory,
  parseStudentGeneratedCurriculumEvidence,
  type CurriculumAttemptState,
} from "../curriculum-runtime/contracts.ts";
import { getStudentLearningContext } from "../practice/server.ts";
import { generateQuestion, publicQuestionOnly } from "./generator.ts";
import { to0041Question } from "./persistence.ts";
import { GENERATOR_V2_OUTCOME_REGISTRY, getProductVariantByOutcome } from "./registry.ts";
import type { ProductDifficulty } from "./types.ts";

type ProofRuntimeStore = {
  invocations: Map<string, number>;
  lastDatabaseFailure: string | null;
  lastDatabaseStateShape: Record<string, unknown> | null;
  lastDatabaseErrorShape: Record<string, unknown> | null;
};

const globalProofRuntime = globalThis as typeof globalThis & {
  __plaveGeneratorV2DatabaseProof?: ProofRuntimeStore;
};
const proofStore = globalProofRuntime.__plaveGeneratorV2DatabaseProof ?? {
  invocations: new Map<string, number>(),
  lastDatabaseFailure: null,
  lastDatabaseStateShape: null,
  lastDatabaseErrorShape: null,
};
globalProofRuntime.__plaveGeneratorV2DatabaseProof = proofStore;

const releaseBundle = buildUniversalCurriculumRelease();

export type GeneratorV2DatabaseProofAccess = Awaited<
  ReturnType<typeof getStudentLearningContext>
>;

export function isGeneratorV2DatabaseProofRequest(request: Request) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.PLAVE_GENERATOR_V2_DATABASE_PROOF !== "true"
  ) {
    return false;
  }
  const url = new URL(request.url);
  return url.hostname === "127.0.0.1" || url.hostname === "localhost";
}

export function getGeneratorV2DatabaseProofDiagnostics() {
  return {
    totalInvocations: [...proofStore.invocations.values()].reduce(
      (sum, count) => sum + count,
      0,
    ),
    variants: Object.fromEntries(proofStore.invocations),
    lastDatabaseFailure: proofStore.lastDatabaseFailure,
    lastDatabaseStateShape: proofStore.lastDatabaseStateShape,
    lastDatabaseErrorShape: proofStore.lastDatabaseErrorShape,
  };
}

function signingKey() {
  const value = process.env.PLAVE_ON_DEMAND_GENERATION_SIGNING_KEY ?? "";
  if (!/^[0-9a-f]{64}$/u.test(value)) {
    throw new Error("GENERATION_V2_DB_PROOF:SIGNING_KEY_UNAVAILABLE");
  }
  return value;
}

export function deriveGeneratorV2DatabaseProofAttemptSeed(input: {
  studentId: string;
  idempotencyKey: string;
  outcomeId: string;
}) {
  return `v2-${createHmac("sha256", Buffer.from(signingKey(), "hex"))
    .update(`${input.studentId}:${input.idempotencyKey}:${input.outcomeId}`)
    .digest("hex")
    .slice(0, 48)}`;
}

function signature(input: {
  studentId: string;
  idempotencyKey: string;
  snapshotHash: string;
}) {
  return createHmac("sha256", Buffer.from(signingKey(), "hex"))
    .update(`${input.studentId}:${input.idempotencyKey}:${input.snapshotHash}`)
    .digest("hex");
}

async function loadHistory(access: Extract<GeneratorV2DatabaseProofAccess, { ok: true }>) {
  if (access.grade !== 1) {
    const { data, error } = await access.supabase.rpc(
      "get_student_curriculum_history",
    );
    const history = error ? null : parseStudentCurriculumHistory(data);
    return history && history.grade === access.grade ? history : null;
  }
  const { data, error } = await access.supabase.rpc(
    "get_my_generated_curriculum_evidence",
  );
  const evidence = error ? null : parseStudentGeneratedCurriculumEvidence(data);
  return evidence && evidence.grade === access.grade
    ? { grade: evidence.grade, attempts: evidence.attempts }
    : null;
}

async function loadState(
  access: Extract<GeneratorV2DatabaseProofAccess, { ok: true }>,
  attemptId: string,
) {
  const { data, error } = await access.supabase.rpc(
    "get_generated_curriculum_attempt_state",
    { p_attempt_id: attemptId },
  );
  const state = error ? null : parseCurriculumAttemptState(data);
  return state && state.grade === access.grade ? state : null;
}

export async function startOrResumeGeneratorV2DatabaseProof(input: {
  outcomeId: string;
  difficulty: ProductDifficulty;
  idempotencyKey: string;
}) {
  const access = await getStudentLearningContext();
  if (!access.ok) return access;
  const entry = getProductVariantByOutcome(input.outcomeId);
  if (!entry || entry.grade !== access.grade) {
    return { ok: false as const, reason: "ACCESS_DENIED" as const };
  }

  const releaseQuestion = releaseBundle.questions.find((question) =>
    question.officialOutcomeIds.includes(entry.outcomeId),
  );
  const unit = releaseQuestion
    ? releaseBundle.units.find((item) => item.unitId === releaseQuestion.unitId)
    : null;
  if (!unit || !releaseQuestion) {
    return { ok: false as const, reason: "DATA_UNAVAILABLE" as const };
  }

  const history = await loadHistory(access);
  const existing = history?.attempts.find(
    (attempt) =>
      attempt.unitId === unit.unitId && attempt.status === "IN_PROGRESS",
  );
  if (existing) {
    const state = await loadState(access, existing.attemptId);
    if (state) {
      return {
        ok: true as const,
        state,
        resumedWithoutGeneration: true,
      };
    }
  }

  const seed = deriveGeneratorV2DatabaseProofAttemptSeed({
    studentId: access.user.id,
    idempotencyKey: input.idempotencyKey,
    outcomeId: entry.outcomeId,
  });
  const generated = Array.from({ length: 12 }, (_, index) => {
    const question = generateQuestion({
      outcomeId: entry.outcomeId,
      grade: entry.grade,
      difficulty: input.difficulty,
      seed: `${seed}-${String(index + 1).padStart(2, "0")}`,
      locale: "vi-VN",
    });
    return {
      generated: question,
      persisted: to0041Question(question, {
        position: index + 1,
        releaseId: releaseBundle.release.releaseId,
        unitId: unit.unitId,
        skillId: releaseQuestion.skillId,
        skillTitle: releaseQuestion.skillTitle,
        contentReleaseHash: releaseBundle.hashes.bundleSha256,
      }),
    };
  });
  proofStore.invocations.set(
    entry.variantId,
    (proofStore.invocations.get(entry.variantId) ?? 0) + generated.length,
  );
  const immutableSnapshot = {
    schemaVersion: 1 as const,
    releaseId: releaseBundle.release.releaseId,
    contentReleaseHash: releaseBundle.hashes.bundleSha256,
    generatorVersion: releaseBundle.release.generatorVersion,
    grade: entry.grade,
    unitId: unit.unitId,
    attemptSeed: seed,
    selectionReason: "STUDENT_UNIT_CHOICE" as const,
    questions: generated.map((item) => item.persisted.question),
    solutions: generated.map((item) => item.persisted.solution),
  };
  const snapshot = {
    ...immutableSnapshot,
    snapshotHash: sha256(immutableSnapshot),
  };
  const { data, error } = await access.supabase.rpc(
    "start_or_resume_semantic_generated_curriculum",
    {
      p_snapshot: snapshot,
      p_signature: signature({
        studentId: access.user.id,
        idempotencyKey: input.idempotencyKey,
        snapshotHash: snapshot.snapshotHash,
      }),
      p_idempotency_key: input.idempotencyKey,
    },
  );
  const state = error ? null : parseCurriculumAttemptState(data);
  if (!state || state.grade !== access.grade || state.feedback !== null) {
    proofStore.lastDatabaseFailure = String(error?.message ?? "UNKNOWN")
      .match(/CURRICULUM:[A-Z_]+/u)?.[0] ?? "DATABASE_RESPONSE_INVALID";
    proofStore.lastDatabaseStateShape = databaseStateShape(data);
    proofStore.lastDatabaseErrorShape = error
      ? {
          code: String(error.code ?? "").slice(0, 40),
          message: String(error.message ?? "").slice(0, 180),
          details: String(error.details ?? "").slice(0, 180),
        }
      : null;
    return {
      ok: false as const,
      reason: "DATABASE_REJECTED" as const,
      databaseCode: error?.code ?? null,
    };
  }
  return {
    ok: true as const,
    state,
    resumedWithoutGeneration: false,
    publicSnapshotHash: generated[0]?.generated.provenance.publicSnapshotHash,
  };
}

function databaseStateShape(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { rootType: value === null ? "null" : typeof value };
  }
  const state = value as Record<string, unknown>;
  const current = state.current_question && typeof state.current_question === "object" && !Array.isArray(state.current_question)
    ? state.current_question as Record<string, unknown>
    : null;
  return {
    releaseIdLength: typeof state.release_id === "string" ? state.release_id.length : null,
    contentVersionLength: typeof state.content_version === "string" ? state.content_version.length : null,
    unitIdLength: typeof state.unit_id === "string" ? state.unit_id.length : null,
    unitTitleLength: typeof state.unit_title === "string" ? state.unit_title.length : null,
    grade: state.grade,
    status: state.status,
    revisionType: typeof state.revision,
    countTypes: [typeof state.answered_count, typeof state.correct_count, typeof state.total_questions],
    currentKeys: current ? Object.keys(current).sort() : null,
    questionIdLength: typeof current?.question_id === "string" ? current.question_id.length : null,
    promptLength: typeof current?.prompt === "string" ? current.prompt.length : null,
    answerType: current?.answer_type,
    optionCount: Array.isArray(current?.options) ? current.options.length : current?.options === null ? 0 : null,
    visualType: current?.visual === null ? "null" : typeof current?.visual,
    cognitiveLevel: current?.cognitive_level,
    rootKeys: Object.keys(state).sort(),
  };
}

export async function loadGeneratorV2DatabaseProofState(attemptId: string) {
  const access = await getStudentLearningContext();
  if (!access.ok) return access;
  const state = await loadState(access, attemptId);
  return state
    ? { ok: true as const, state }
    : { ok: false as const, reason: "ACCESS_DENIED" as const };
}

export async function submitGeneratorV2DatabaseProof(input: {
  attemptId: string;
  questionId: string;
  answer: string;
  expectedRevision: number;
  idempotencyKey: string;
}) {
  const access = await getStudentLearningContext();
  if (!access.ok) return access;
  const before = await loadState(access, input.attemptId);
  if (!before) {
    return { ok: false as const, reason: "ACCESS_DENIED" as const };
  }
  const { data, error } = await access.supabase.rpc(
    "submit_generated_curriculum_answer",
    {
      p_attempt_id: input.attemptId,
      p_question_id: input.questionId,
      p_answer: input.answer,
      p_expected_revision: input.expectedRevision,
      p_idempotency_key: input.idempotencyKey,
    },
  );
  const state = error ? null : parseCurriculumAttemptState(data);
  if (!state || state.grade !== access.grade) {
    const message = String(error?.message ?? "");
    proofStore.lastDatabaseFailure = message.match(/CURRICULUM:[A-Z_]+/u)?.[0] ?? "DATABASE_RESPONSE_INVALID";
    proofStore.lastDatabaseErrorShape = error
      ? { code: String(error.code ?? "").slice(0, 40), message: message.slice(0, 180), details: String(error.details ?? "").slice(0, 180) }
      : null;
    const reason = /IDEMPOTENCY_CONFLICT/u.test(message)
      ? "IDEMPOTENCY_CONFLICT"
      : /REVISION_CONFLICT/u.test(message)
        ? "REVISION_CONFLICT"
        : /PRACTICE_UNAVAILABLE/u.test(message)
          ? "PRACTICE_UNAVAILABLE"
          : "DATABASE_REJECTED";
    return { ok: false as const, reason, databaseCode: error?.code ?? null };
  }
  return {
    ok: true as const,
    state,
  };
}

export async function loadGeneratorV2DatabaseProofHistory() {
  const access = await getStudentLearningContext();
  if (!access.ok) return access;
  const history = await loadHistory(access);
  return history
    ? { ok: true as const, history }
    : { ok: false as const, reason: "DATA_UNAVAILABLE" as const };
}

export function getGeneratorV2DatabaseProofEntries() {
  return GENERATOR_V2_OUTCOME_REGISTRY;
}

export function publicSnapshotFromDatabaseQuestion(
  state: CurriculumAttemptState,
) {
  const question = state.currentQuestion;
  if (!question) return null;
  const visual = question.visual as unknown as Record<string, unknown>;
  const productContract = visual.productContract as
    | Record<string, unknown>
    | undefined;
  if (!productContract) return null;
  return {
    questionId: question.questionId,
    prompt: question.prompt,
    interaction: productContract.interaction,
    accessibility: productContract.accessibility,
    publicData: productContract.publicData,
    visual: {
      type: visual.type,
      description: visual.description,
      data: visual.data,
    },
  };
}

export function assertNoPrivateGeneratorV2Fields(value: unknown) {
  const serialized = JSON.stringify(value);
  return ![
    "correctResponse",
    "acceptedResponses",
    "solverReceipt",
    "normalizedModelHash",
    "privateSolution",
    "rawSeed",
    "solverReceiptHash",
    "seedFingerprint",
    "astHash",
    "visualHash",
  ].some((field) => serialized.includes(field));
}

export function buildGeneratorV2PublicQuestionForReview(input: {
  outcomeId: string;
  grade: number;
  difficulty: ProductDifficulty;
  seed: string;
}) {
  return publicQuestionOnly(
    generateQuestion({ ...input, locale: "vi-VN" }),
  );
}
