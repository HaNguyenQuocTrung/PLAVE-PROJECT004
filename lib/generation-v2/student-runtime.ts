import "server-only";

import { createHmac } from "node:crypto";

import {
  parseCurriculumAttemptState,
  parseStudentCurriculumHistory,
  parseStudentCurriculumProgress,
  type CurriculumAttemptState,
  type CurriculumRuntimeErrorCode,
  type StudentGeneratorV2Question,
} from "../curriculum-runtime/contracts.ts";
import {
  buildUniversalCurriculumRelease,
  sha256,
} from "../curriculum-runtime/release.ts";
import { getCurriculumUnit } from "../curriculum/registry.ts";
import type { PreviewVisualSpec } from "../curriculum/types.ts";
import { getStudentLearningContext } from "../practice/server.ts";
import { generateQuestion } from "./generator.ts";
import { to0041Question } from "./persistence.ts";
import { getProductVariantByOutcome } from "./registry.ts";
import {
  getGeneratorV2StudentEligibility,
  readGeneratorV2StudentRuntimePolicy,
  validateGeneratorV2StudentRuntimePolicy,
} from "./student-runtime-policy.ts";
import { formatGeneratorV2StudentCorrectAnswer } from "./student-answer-display.ts";
import { isGeneratorV2DatabaseAnswerCompatible } from "./answer-transport.ts";
import type { ProductDifficulty } from "./types.ts";

type StudentAccess = Extract<
  Awaited<ReturnType<typeof getStudentLearningContext>>,
  { ok: true }
>;

type RuntimeFailure = Readonly<{
  ok: false;
  code: CurriculumRuntimeErrorCode;
  upstreamCode?: string | null;
}>;

type RuntimeSuccess = Readonly<{
  ok: true;
  state: CurriculumAttemptState;
  resumedWithoutGeneration?: boolean;
}>;

export type StudentGeneratorRuntimeResult = RuntimeSuccess | RuntimeFailure;

const releaseBundle = buildUniversalCurriculumRelease();
const difficulties: readonly ProductDifficulty[] = [
  "EASY",
  "MEDIUM",
  "HARD",
];

function signingKey() {
  return process.env.PLAVE_ON_DEMAND_GENERATION_SIGNING_KEY ?? "";
}

function attemptSeed(input: {
  studentId: string;
  idempotencyKey: string;
  outcomeId: string;
}) {
  return `v2-${createHmac("sha256", Buffer.from(signingKey(), "hex"))
    .update(`${input.studentId}:${input.idempotencyKey}:${input.outcomeId}`)
    .digest("hex")
    .slice(0, 48)}`;
}

function selectEligibleOutcome(input: {
  studentId: string;
  idempotencyKey: string;
  unitId: string;
  candidates: readonly NonNullable<
    ReturnType<typeof getProductVariantByOutcome>
  >[];
}) {
  const candidates = [...input.candidates].sort((left, right) =>
    left.outcomeId.localeCompare(right.outcomeId),
  );
  if (candidates.length === 0) return null;
  const digest = createHmac("sha256", Buffer.from(signingKey(), "hex"))
    .update(
      `${input.studentId}:${input.idempotencyKey}:${input.unitId}:outcome-selection`,
    )
    .digest();
  return candidates[digest.readUInt32BE(0) % candidates.length]!;
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

function generatorQuestionFromState(
  state: CurriculumAttemptState,
): StudentGeneratorV2Question | null {
  const question = state.currentQuestion;
  if (!question) return null;
  const visual = question.visual as unknown as Record<string, unknown>;
  const contract =
    visual.productContract &&
    typeof visual.productContract === "object" &&
    !Array.isArray(visual.productContract)
      ? (visual.productContract as Record<string, unknown>)
      : null;
  if (
    !contract ||
    contract.questionSource !== "GENERATED_V2" ||
    contract.grade !== state.grade ||
    !["EASY", "MEDIUM", "HARD"].includes(String(contract.difficulty)) ||
    !contract.interaction ||
    typeof contract.interaction !== "object" ||
    !contract.accessibility ||
    typeof contract.accessibility !== "object" ||
    !contract.publicData ||
    typeof contract.publicData !== "object"
  ) {
    return null;
  }
  const publicVisual = { ...visual };
  delete publicVisual.productContract;
  return {
    schemaVersion: 2,
    questionId: question.questionId,
    grade: state.grade,
    difficulty: contract.difficulty as ProductDifficulty,
    publicPrompt: question.prompt,
    publicData: contract.publicData as Readonly<Record<string, unknown>>,
    interaction:
      contract.interaction as StudentGeneratorV2Question["interaction"],
    visual: publicVisual as StudentGeneratorV2Question["visual"],
    accessibility:
      contract.accessibility as StudentGeneratorV2Question["accessibility"],
  };
}

export function toStudentGeneratedRuntimeState(
  state: CurriculumAttemptState,
): CurriculumAttemptState | null {
  const generatorV2 = generatorQuestionFromState(state);
  if (state.currentQuestion && !generatorV2) return null;
  const publicState: CurriculumAttemptState = {
    ...state,
    runtimeMode: "GENERATED_V2",
    // `build_generated_curriculum_attempt_state` returns feedback for the
    // submitted question while `currentQuestion` already points at the next
    // question. Formatting here would therefore apply the next interaction's
    // options to the previous correct answer. The submit boundary below still
    // has the immutable pre-submit question and owns presentation formatting.
    feedback: state.feedback,
    currentQuestion: state.currentQuestion
      ? {
          ...state.currentQuestion,
          visual: generatorV2!.visual as unknown as PreviewVisualSpec,
          generatorV2,
        }
      : null,
  };
  const serialized = JSON.stringify(publicState);
  if (
    [
      "correctResponse",
      "acceptedResponses",
      "solverReceipt",
      "privateSolution",
      "rawSeed",
      "seedFingerprint",
      "normalizedModelHash",
      "publicSnapshotHash",
      "visualHash",
      "solverReceiptHash",
      "productContract",
      "outcomeId",
      "variantId",
      "productFamilyId",
    ].some((field) => serialized.includes(field))
  ) {
    return null;
  }
  return publicState;
}

export function toStudentStaticRuntimeState(
  state: CurriculumAttemptState,
): CurriculumAttemptState {
  return { ...state, runtimeMode: "STATIC" };
}

async function loadGeneratedState(access: StudentAccess, attemptId: string) {
  const { data, error } = await access.supabase.rpc(
    "get_generated_curriculum_attempt_state",
    { p_attempt_id: attemptId },
  );
  if (error) return null;
  const state = parseCurriculumAttemptState(data);
  return state && state.grade === access.grade
    ? toStudentGeneratedRuntimeState(state)
    : null;
}

async function existingGeneratedAttempt(
  access: StudentAccess,
  unitId: string,
) {
  const { data, error } = await access.supabase.rpc(
    "get_student_curriculum_history",
  );
  if (error) return null;
  const history = parseStudentCurriculumHistory(data);
  const attempt = history?.attempts.find(
    (item) => item.unitId === unitId && item.status === "IN_PROGRESS",
  );
  return attempt ? loadGeneratedState(access, attempt.attemptId) : null;
}

async function prerequisitesSatisfied(access: StudentAccess, unitId: string) {
  const curriculumUnit = getCurriculumUnit(unitId);
  if (!curriculumUnit) return false;
  const sameGradePrerequisites = curriculumUnit.prerequisiteSlugs.filter(
    (slug) => getCurriculumUnit(slug)?.grade === access.grade,
  );
  if (sameGradePrerequisites.length === 0) return true;
  const { data, error } = await access.supabase.rpc(
    "get_student_curriculum_progress",
  );
  const progress = error ? null : parseStudentCurriculumProgress(data);
  return Boolean(
    progress &&
      progress.grade === access.grade &&
      sameGradePrerequisites.every(
        (slug) =>
          progress.units.find((item) => item.unitId === slug)?.status ===
          "COMPLETED",
      ),
  );
}

export async function startStudentGeneratorV2Practice(input: {
  request: Request;
  access: StudentAccess;
  unitSlug: string;
  idempotencyKey: string;
}): Promise<StudentGeneratorRuntimeResult> {
  const policy = readGeneratorV2StudentRuntimePolicy();
  const policyFailure = validateGeneratorV2StudentRuntimePolicy({
    request: input.request,
    policy,
  });
  if (policyFailure) return { ok: false, code: policyFailure };

  const unit = releaseBundle.units.find(
    (item) => item.unitId === input.unitSlug,
  );
  if (!unit || unit.grade !== input.access.grade) {
    return { ok: false, code: "ACCESS_DENIED" };
  }
  if (!(await prerequisitesSatisfied(input.access, unit.unitId))) {
    return { ok: false, code: "ACCESS_DENIED" };
  }

  const implemented = unit.officialOutcomeIds
    .map((outcomeId) => getProductVariantByOutcome(outcomeId))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  if (implemented.length === 0) {
    return { ok: false, code: "GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED" };
  }
  const eligible = implemented.filter(
    (candidate) =>
      candidate.grade === input.access.grade &&
      getGeneratorV2StudentEligibility(candidate.outcomeId, policy) ===
        "STUDENT_RUNTIME_ELIGIBLE" &&
      releaseBundle.questions.some(
        (question) =>
          question.unitId === unit.unitId &&
          question.officialOutcomeIds.includes(candidate.outcomeId),
      ),
  );
  const entry = selectEligibleOutcome({
    studentId: input.access.user.id,
    idempotencyKey: input.idempotencyKey,
    unitId: unit.unitId,
    candidates: eligible,
  });
  if (!entry) {
    return {
      ok: false,
      code: "GENERATOR_V2_CORRECTNESS_REVIEW_REQUIRED",
    };
  }
  const releaseQuestion = releaseBundle.questions.find(
    (question) =>
      question.unitId === unit.unitId &&
      question.officialOutcomeIds.includes(entry.outcomeId),
  );
  if (!releaseQuestion) {
    return { ok: false, code: "GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED" };
  }

  const existing = await existingGeneratedAttempt(input.access, unit.unitId);
  if (existing) {
    return { ok: true, state: existing, resumedWithoutGeneration: true };
  }

  try {
    const seed = attemptSeed({
      studentId: input.access.user.id,
      idempotencyKey: input.idempotencyKey,
      outcomeId: entry.outcomeId,
    });
    const generated = Array.from({ length: 12 }, (_, index) => {
      const generatedQuestion = generateQuestion({
        outcomeId: entry.outcomeId,
        grade: entry.grade,
        difficulty: difficulties[Math.floor(index / 4)]!,
        seed: `${seed}-${String(index + 1).padStart(2, "0")}`,
        locale: "vi-VN",
      });
      return to0041Question(generatedQuestion, {
        position: index + 1,
        releaseId: releaseBundle.release.releaseId,
        unitId: unit.unitId,
        skillId: releaseQuestion.skillId,
        skillTitle: releaseQuestion.skillTitle,
        contentReleaseHash: releaseBundle.hashes.bundleSha256,
      });
    });
    const immutableSnapshot = {
      schemaVersion: 1 as const,
      releaseId: releaseBundle.release.releaseId,
      contentReleaseHash: releaseBundle.hashes.bundleSha256,
      generatorVersion: releaseBundle.release.generatorVersion,
      grade: entry.grade,
      unitId: unit.unitId,
      attemptSeed: seed,
      selectionReason: "STUDENT_UNIT_CHOICE" as const,
      questions: generated.map((item) => item.question),
      solutions: generated.map((item) => item.solution),
    };
    const snapshot = {
      ...immutableSnapshot,
      snapshotHash: sha256(immutableSnapshot),
    };
    const { data, error } = await input.access.supabase.rpc(
      "start_or_resume_semantic_generated_curriculum",
      {
        p_snapshot: snapshot,
        p_signature: signature({
          studentId: input.access.user.id,
          idempotencyKey: input.idempotencyKey,
          snapshotHash: snapshot.snapshotHash,
        }),
        p_idempotency_key: input.idempotencyKey,
      },
    );
    if (error) {
      return {
        ok: false,
        code: "GENERATOR_V2_GENERATION_FAILED",
        upstreamCode: error.code,
      };
    }
    const state = parseCurriculumAttemptState(data);
    const publicState = state && state.grade === input.access.grade
      ? toStudentGeneratedRuntimeState(state)
      : null;
    return publicState
      ? { ok: true, state: publicState, resumedWithoutGeneration: false }
      : { ok: false, code: "GENERATOR_V2_GENERATION_FAILED" };
  } catch {
    return { ok: false, code: "GENERATOR_V2_GENERATION_FAILED" };
  }
}

export async function loadStudentGeneratedPracticeState(input: {
  request: Request;
  access: StudentAccess;
  attemptId: string;
}): Promise<StudentGeneratorRuntimeResult> {
  const { data, error } = await input.access.supabase.rpc(
    "get_generated_curriculum_attempt_state",
    { p_attempt_id: input.attemptId },
  );
  if (error) return { ok: false, code: "PRACTICE_UNAVAILABLE" };
  const rawState = parseCurriculumAttemptState(data);
  if (!rawState || rawState.grade !== input.access.grade) {
    return { ok: false, code: "PRACTICE_UNAVAILABLE" };
  }
  const policy = readGeneratorV2StudentRuntimePolicy();
  const failure = validateGeneratorV2StudentRuntimePolicy({
    request: input.request,
    policy,
  });
  if (failure) return { ok: false, code: failure };
  const state = toStudentGeneratedRuntimeState(rawState);
  return state
    ? { ok: true, state }
    : { ok: false, code: "PRACTICE_UNAVAILABLE" };
}

export async function submitStudentGeneratorV2Answer(input: {
  request: Request;
  access: StudentAccess;
  attemptId: string;
  questionId: string;
  answer: string;
  expectedRevision: number;
  idempotencyKey: string;
}): Promise<StudentGeneratorRuntimeResult> {
  const before = await loadStudentGeneratedPracticeState(input);
  if (!before.ok) return before;
  const submittedQuestion =
    before.state.currentQuestion?.questionId === input.questionId
      ? before.state.currentQuestion
      : null;
  if (
    submittedQuestion?.generatorV2 &&
    !isGeneratorV2DatabaseAnswerCompatible(
      submittedQuestion.generatorV2.interaction,
      input.answer,
    )
  ) {
    return { ok: false, code: "INVALID_REQUEST" };
  }
  const { data, error } = await input.access.supabase.rpc(
    "submit_generated_curriculum_answer",
    {
      p_attempt_id: input.attemptId,
      p_question_id: input.questionId,
      p_answer: input.answer,
      p_expected_revision: input.expectedRevision,
      p_idempotency_key: input.idempotencyKey,
    },
  );
  if (error) {
    const message = String(error.message ?? "");
    const code: CurriculumRuntimeErrorCode = /IDEMPOTENCY_CONFLICT/u.test(
      message,
    )
      ? "IDEMPOTENCY_CONFLICT"
      : /REVISION_CONFLICT/u.test(message)
        ? "REVISION_CONFLICT"
        : /DUPLICATE_SUBMISSION/u.test(message)
          ? "DUPLICATE_SUBMISSION"
          : /INVALID_REQUEST|INVALID_ANSWER/u.test(message)
            ? "INVALID_REQUEST"
            : "REQUEST_FAILED";
    return { ok: false, code, upstreamCode: error.code };
  }
  const state = parseCurriculumAttemptState(data);
  const publicState = state && state.grade === input.access.grade
    ? toStudentGeneratedRuntimeState(state)
    : null;
  const responseState =
    publicState?.feedback && submittedQuestion?.generatorV2
      ? {
          ...publicState,
          feedback: {
            ...publicState.feedback,
            correctAnswer: formatGeneratorV2StudentCorrectAnswer(
              submittedQuestion.generatorV2,
              publicState.feedback.correctAnswer,
              submittedQuestion.options,
            ),
          },
        }
      : publicState;
  return responseState
    ? { ok: true, state: responseState }
    : { ok: false, code: "REQUEST_FAILED" };
}
