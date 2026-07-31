import {
  parsePracticeVisualSpec,
  type PracticeVisualSpec,
} from "./visual.ts";

export const adaptiveDatabaseErrorCodes = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "UNIT_NOT_AVAILABLE",
  "CONTENT_VERSION_MISMATCH",
  "ATTEMPT_NOT_FOUND",
  "ATTEMPT_NOT_ACTIVE",
  "QUESTION_MISMATCH",
  "REVISION_CONFLICT",
  "DUPLICATE_SUBMISSION",
  "INVALID_ANSWER",
  "INTEGRITY_FAILURE",
] as const;

export type AdaptiveDatabaseErrorCode =
  (typeof adaptiveDatabaseErrorCodes)[number];

export type AdaptiveTransportErrorCode =
  | AdaptiveDatabaseErrorCode
  | "TRANSIENT_DATABASE_ERROR";

export type AdaptiveRetryPolicy =
  | Readonly<{ action: "REFETCH_THEN_MANUAL_RETRY"; automatic: false }>
  | Readonly<{ action: "SAME_IDEMPOTENCY_KEY_RETRY"; automatic: false }>
  | Readonly<{ action: "DO_NOT_RETRY"; automatic: false }>;

export type StartAdaptivePracticeRequest = Readonly<{
  unitSlug: string;
  idempotencyKey: string;
}>;

export type GetAdaptivePracticeStateRequest = Readonly<{
  attemptId: string;
}>;

export type SubmitAdaptivePracticeRequest = Readonly<{
  attemptId: string;
  questionId: string;
  answer: string;
  expectedRevision: number;
  idempotencyKey: string;
}>;

export type AdaptiveRpcQuestion = Readonly<{
  questionId: string;
  prompt: string;
  answerType: "MULTIPLE_CHOICE" | "NUMBER_INPUT";
  options: Readonly<{
    A: string;
    B: string;
    C: string;
    D: string;
  }> | null;
  visual: PracticeVisualSpec | null;
  accessibilityDescription: string | null;
  skillFamilyId: string;
  difficulty: "EASY" | "MEDIUM";
  displayOrder: number;
}>;

export type AdaptiveRpcFeedback = Readonly<{
  questionId: string;
  isCorrect: boolean;
  correctAnswer: string;
  solutionSteps: readonly string[];
  explanation: string;
  hint: string;
}>;

export type AdaptiveRpcState = Readonly<{
  attemptId: string;
  unitSlug: string;
  contentVersion: string;
  status:
    | "IN_PROGRESS"
    | "MASTERED_EARLY"
    | "REMEDIATION_REQUIRED"
    | "MAX_REACHED"
    | "ABANDONED";
  revision: number;
  answeredCount: number;
  currentQuestion: AdaptiveRpcQuestion | null;
  remediationSkillIds: readonly string[];
  completedAt: string | null;
  feedback: AdaptiveRpcFeedback | null;
}>;

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: RecordValue, keys: readonly string[]) {
  return (
    Object.keys(value).sort().join(",") === [...keys].sort().join(",")
  );
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function isSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 3 &&
    value.length <= 100 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

function isSafeText(value: unknown, maximum: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maximum
  );
}

export function parseStartAdaptivePracticeRequest(
  value: unknown,
): StartAdaptivePracticeRequest | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["unitSlug", "idempotencyKey"]) ||
    !isSlug(value.unitSlug) ||
    !isUuid(value.idempotencyKey)
  ) {
    return null;
  }
  return {
    unitSlug: value.unitSlug,
    idempotencyKey: value.idempotencyKey,
  };
}

export function parseGetAdaptivePracticeStateRequest(
  value: unknown,
): GetAdaptivePracticeStateRequest | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["attemptId"]) ||
    !isUuid(value.attemptId)
  ) {
    return null;
  }
  return { attemptId: value.attemptId };
}

export function parseSubmitAdaptivePracticeRequest(
  value: unknown,
): SubmitAdaptivePracticeRequest | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "attemptId",
      "questionId",
      "answer",
      "expectedRevision",
      "idempotencyKey",
    ]) ||
    !isUuid(value.attemptId) ||
    !isSlug(value.questionId) ||
    !isSafeText(value.answer, 20) ||
    !Number.isInteger(value.expectedRevision) ||
    (value.expectedRevision as number) < 0 ||
    !isUuid(value.idempotencyKey)
  ) {
    return null;
  }
  return {
    attemptId: value.attemptId,
    questionId: value.questionId,
    answer: value.answer,
    expectedRevision: value.expectedRevision as number,
    idempotencyKey: value.idempotencyKey,
  };
}

export function parseAdaptiveDatabaseError(
  value: unknown,
): AdaptiveDatabaseErrorCode {
  const message =
    isRecord(value) && typeof value.message === "string"
      ? value.message
      : "";
  const match = /^ADAPTIVE:([A-Z_]+)$/.exec(message);
  if (
    match?.[1] &&
    adaptiveDatabaseErrorCodes.includes(
      match[1] as AdaptiveDatabaseErrorCode,
    )
  ) {
    return match[1] as AdaptiveDatabaseErrorCode;
  }
  return "INTEGRITY_FAILURE";
}

export function getAdaptiveRetryPolicy(
  code: AdaptiveTransportErrorCode,
  hasIdempotencyKey: boolean,
): AdaptiveRetryPolicy {
  if (code === "REVISION_CONFLICT") {
    return {
      action: "REFETCH_THEN_MANUAL_RETRY",
      automatic: false,
    };
  }
  if (code === "TRANSIENT_DATABASE_ERROR" && hasIdempotencyKey) {
    return {
      action: "SAME_IDEMPOTENCY_KEY_RETRY",
      automatic: false,
    };
  }
  return { action: "DO_NOT_RETRY", automatic: false };
}

function parseOptions(value: unknown) {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["A", "B", "C", "D"]) ||
    !isSafeText(value.A, 240) ||
    !isSafeText(value.B, 240) ||
    !isSafeText(value.C, 240) ||
    !isSafeText(value.D, 240)
  ) {
    return null;
  }
  return { A: value.A, B: value.B, C: value.C, D: value.D };
}

function parseQuestion(value: unknown): AdaptiveRpcQuestion | null {
  if (!isRecord(value)) return null;
  const answerType = value.answer_type;
  const options = parseOptions(value.options);
  const visual =
    value.visual === null ? null : parsePracticeVisualSpec(value.visual);
  if (
    !hasExactKeys(value, [
      "question_id",
      "prompt",
      "answer_type",
      "options",
      "visual",
      "accessibility_description",
      "skill_family_id",
      "difficulty",
      "display_order",
    ]) ||
    !isSlug(value.question_id) ||
    !isSafeText(value.prompt, 500) ||
    (answerType !== "MULTIPLE_CHOICE" &&
      answerType !== "NUMBER_INPUT") ||
    (answerType === "MULTIPLE_CHOICE" && !options) ||
    (answerType === "NUMBER_INPUT" && value.options !== null) ||
    (value.visual !== null && !visual) ||
    (value.accessibility_description !== null &&
      !isSafeText(value.accessibility_description, 500)) ||
    !isSafeText(value.skill_family_id, 80) ||
    (value.difficulty !== "EASY" && value.difficulty !== "MEDIUM") ||
    !Number.isInteger(value.display_order) ||
    (value.display_order as number) < 1
  ) {
    return null;
  }
  return {
    questionId: value.question_id,
    prompt: value.prompt,
    answerType,
    options,
    visual,
    accessibilityDescription: value.accessibility_description as
      | string
      | null,
    skillFamilyId: value.skill_family_id,
    difficulty: value.difficulty,
    displayOrder: value.display_order as number,
  };
}

function parseFeedback(value: unknown): AdaptiveRpcFeedback | null {
  if (!isRecord(value)) return null;
  if (
    !hasExactKeys(value, [
      "question_id",
      "is_correct",
      "correct_answer",
      "solution_steps",
      "explanation",
      "hint",
    ]) ||
    !isSlug(value.question_id) ||
    typeof value.is_correct !== "boolean" ||
    !isSafeText(value.correct_answer, 100) ||
    !Array.isArray(value.solution_steps) ||
    value.solution_steps.length < 2 ||
    value.solution_steps.some((step) => !isSafeText(step, 500)) ||
    !isSafeText(value.explanation, 1000) ||
    !isSafeText(value.hint, 500)
  ) {
    return null;
  }
  return {
    questionId: value.question_id,
    isCorrect: value.is_correct,
    correctAnswer: value.correct_answer,
    solutionSteps: value.solution_steps as string[],
    explanation: value.explanation,
    hint: value.hint,
  };
}

export function parseAdaptiveRpcState(
  value: unknown,
  allowPostSubmitFeedback: boolean,
): AdaptiveRpcState | null {
  if (!isRecord(value)) return null;
  const allowedKeys = [
    "attempt_id",
    "unit_slug",
    "content_version",
    "status",
    "revision",
    "answered_count",
    "current_question",
    "remediation_skill_ids",
    "completed_at",
    "feedback",
  ];
  if (!hasExactKeys(value, allowedKeys)) return null;
  const statuses = [
    "IN_PROGRESS",
    "MASTERED_EARLY",
    "REMEDIATION_REQUIRED",
    "MAX_REACHED",
    "ABANDONED",
  ] as const;
  const currentQuestion =
    value.current_question === null
      ? null
      : parseQuestion(value.current_question);
  const feedback =
    allowPostSubmitFeedback && value.feedback !== null
      ? parseFeedback(value.feedback)
      : null;
  if (
    !isUuid(value.attempt_id) ||
    !isSlug(value.unit_slug) ||
    !isSafeText(value.content_version, 80) ||
    !statuses.includes(value.status as (typeof statuses)[number]) ||
    !Number.isInteger(value.revision) ||
    (value.revision as number) < 0 ||
    !Number.isInteger(value.answered_count) ||
    (value.answered_count as number) < 0 ||
    (value.current_question !== null && !currentQuestion) ||
    !Array.isArray(value.remediation_skill_ids) ||
    value.remediation_skill_ids.some(
      (skill) => !isSafeText(skill, 80),
    ) ||
    (value.completed_at !== null &&
      (typeof value.completed_at !== "string" ||
        !Number.isFinite(Date.parse(value.completed_at)))) ||
    (!allowPostSubmitFeedback && value.feedback !== null) ||
    (allowPostSubmitFeedback &&
      value.feedback !== null &&
      !feedback)
  ) {
    return null;
  }
  return {
    attemptId: value.attempt_id,
    unitSlug: value.unit_slug,
    contentVersion: value.content_version,
    status: value.status as AdaptiveRpcState["status"],
    revision: value.revision as number,
    answeredCount: value.answered_count as number,
    currentQuestion,
    remediationSkillIds: value.remediation_skill_ids as string[],
    completedAt: value.completed_at as string | null,
    feedback,
  };
}
