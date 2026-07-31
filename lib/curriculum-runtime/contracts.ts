import type { PreviewOption, PreviewVisualSpec } from "../curriculum/types.ts";

export const curriculumMasteryLabels = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "NEEDS_PRACTICE",
  "DEVELOPING",
  "PROFICIENT",
  "MASTERED",
] as const;

export type CurriculumMasteryLabel =
  (typeof curriculumMasteryLabels)[number];

export const curriculumMasteryLabelText: Record<
  CurriculumMasteryLabel,
  string
> = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang học",
  NEEDS_PRACTICE: "Cần luyện thêm",
  DEVELOPING: "Đang phát triển",
  PROFICIENT: "Đã vững",
  MASTERED: "Thành thạo",
};

export type CurriculumAttemptQuestion = Readonly<{
  questionId: string;
  position: number;
  prompt: string;
  answerType: "MULTIPLE_CHOICE" | "NUMBER_INPUT" | "TEXT_INPUT";
  options: readonly PreviewOption[] | null;
  visual: PreviewVisualSpec;
  cognitiveLevel: "UNDERSTAND" | "APPLY" | "REASON";
}>;

export type CurriculumAttemptFeedback = Readonly<{
  questionId: string;
  isCorrect: boolean;
  correctAnswer: string;
  solutionSteps: readonly string[];
  feedback: string;
}>;

export type CurriculumAttemptState = Readonly<{
  attemptId: string;
  releaseId: string;
  contentVersion: string;
  unitId: string;
  unitTitle: string;
  grade: number;
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  revision: number;
  answeredCount: number;
  correctCount: number;
  totalQuestions: number;
  startedAt: string;
  completedAt: string | null;
  currentQuestion: CurriculumAttemptQuestion | null;
  feedback: CurriculumAttemptFeedback | null;
}>;

export type CurriculumProgressUnit = Readonly<{
  unitId: string;
  title: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  evidenceCount: number;
  correctCount: number;
  bestScorePercent: number | null;
  masteryLabel: CurriculumMasteryLabel;
  lastActivityAt: string | null;
  source: "LEGACY_GRADE1" | "UNIVERSAL_CURRICULUM";
}>;

export type CurriculumProgressEvidence = Readonly<{
  title: string;
  evidenceCount: number;
  correctCount: number;
  masteryLabel: Exclude<
    CurriculumMasteryLabel,
    "NOT_STARTED" | "IN_PROGRESS"
  >;
  lastActivityAt: string;
  evidenceBasis:
    | "LEGACY_UNIT_ALIGNED"
    | "LEGACY_QUESTION_SKILL"
    | "AUTHORITATIVE_QUESTION_MAPPING";
}>;

export type StudentCurriculumProgress = Readonly<{
  grade: number;
  compatibilityMode:
    | "LEGACY_GRADE1_AGGREGATED"
    | "UNIVERSAL_CURRICULUM";
  masteryPolicyVersion: string;
  masteryExplanation: string;
  units: readonly CurriculumProgressUnit[];
  outcomes: readonly CurriculumProgressEvidence[];
  skills: readonly CurriculumProgressEvidence[];
}>;

export type CurriculumHistoryItem = Readonly<{
  attemptId: string;
  unitId: string;
  unitTitle: string;
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  answeredCount: number;
  correctCount: number;
  totalQuestions: number;
  startedAt: string;
  completedAt: string | null;
  source: "LEGACY_GRADE1" | "UNIVERSAL_CURRICULUM";
}>;

export type StudentCurriculumHistory = Readonly<{
  grade: number;
  attempts: readonly CurriculumHistoryItem[];
}>;

export type StudentGeneratedCurriculumEvidence = Readonly<{
  grade: number;
  units: readonly CurriculumProgressUnit[];
  outcomes: readonly CurriculumProgressEvidence[];
  skills: readonly CurriculumProgressEvidence[];
  attempts: readonly CurriculumHistoryItem[];
}>;

export const curriculumRuntimeErrorCodes = [
  "AUTH_REQUIRED",
  "ACCESS_DENIED",
  "RUNTIME_DISABLED",
  "RELEASE_UNAVAILABLE",
  "UNIT_UNAVAILABLE",
  "PRACTICE_UNAVAILABLE",
  "REVISION_CONFLICT",
  "DUPLICATE_SUBMISSION",
  "IDEMPOTENCY_CONFLICT",
  "INVALID_REQUEST",
  "REQUEST_TIMEOUT",
  "REQUEST_FAILED",
] as const;

export type CurriculumRuntimeErrorCode =
  (typeof curriculumRuntimeErrorCodes)[number];

export type CurriculumRuntimeApiError = Readonly<{
  ok: false;
  error: Readonly<{
    code: CurriculumRuntimeErrorCode;
    message: string;
    correlationId?: string;
    retryable: boolean;
  }>;
}>;

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
    value.length <= 120 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

function isInteger(value: unknown, minimum = 0, maximum = 100) {
  return (
    Number.isInteger(value) &&
    (value as number) >= minimum &&
    (value as number) <= maximum
  );
}

function isText(value: unknown, maximum = 2000): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maximum
  );
}

function hasExactKeys(value: RecordValue, keys: readonly string[]) {
  return (
    Object.keys(value).sort().join(",") === [...keys].sort().join(",")
  );
}

function parseOptions(value: unknown): readonly PreviewOption[] | null {
  if (value === null) return null;
  if (
    !Array.isArray(value) ||
    value.length !== 4 ||
    !value.every(
      (option) =>
        isRecord(option) &&
        ["A", "B", "C", "D"].includes(String(option.key)) &&
        isText(option.label, 500),
    )
  ) {
    return null;
  }
  return value as PreviewOption[];
}

function parseQuestion(value: unknown): CurriculumAttemptQuestion | null {
  if (!isRecord(value)) return null;
  const options = parseOptions(value.options);
  if (
    !isSlug(value.question_id) ||
    !isInteger(value.position, 1, 100) ||
    !isText(value.prompt) ||
    !["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"].includes(
      String(value.answer_type),
    ) ||
    (value.answer_type === "MULTIPLE_CHOICE" && options === null) ||
    (value.answer_type !== "MULTIPLE_CHOICE" && value.options !== null) ||
    !isRecord(value.visual) ||
    !["UNDERSTAND", "APPLY", "REASON"].includes(
      String(value.cognitive_level),
    )
  ) {
    return null;
  }
  return {
    questionId: value.question_id,
    position: value.position as number,
    prompt: value.prompt,
    answerType: value.answer_type as CurriculumAttemptQuestion["answerType"],
    options,
    visual: value.visual as PreviewVisualSpec,
    cognitiveLevel:
      value.cognitive_level as CurriculumAttemptQuestion["cognitiveLevel"],
  };
}

function parseFeedback(value: unknown): CurriculumAttemptFeedback | null {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    !isSlug(value.question_id) ||
    typeof value.is_correct !== "boolean" ||
    !isText(value.correct_answer, 200) ||
    !Array.isArray(value.solution_steps) ||
    !value.solution_steps.every((step) => isText(step, 1000)) ||
    !isText(value.feedback)
  ) {
    return null;
  }
  return {
    questionId: value.question_id,
    isCorrect: value.is_correct,
    correctAnswer: value.correct_answer,
    solutionSteps: value.solution_steps,
    feedback: value.feedback,
  };
}

export function parseCurriculumAttemptState(
  value: unknown,
): CurriculumAttemptState | null {
  if (!isRecord(value)) return null;
  const question =
    value.current_question === null
      ? null
      : parseQuestion(value.current_question);
  const feedback = parseFeedback(value.feedback);
  if (
    !isUuid(value.attempt_id) ||
    !isSlug(value.release_id) ||
    !isText(value.content_version, 80) ||
    !isSlug(value.unit_id) ||
    !isText(value.unit_title, 180) ||
    !isInteger(value.grade, 1, 9) ||
    !["IN_PROGRESS", "COMPLETED", "ABANDONED"].includes(
      String(value.status),
    ) ||
    !isInteger(value.revision, 0, Number.MAX_SAFE_INTEGER) ||
    !isInteger(value.answered_count) ||
    !isInteger(value.correct_count) ||
    !isInteger(value.total_questions, 1, 100) ||
    !isText(value.started_at, 80) ||
    (value.completed_at !== null && !isText(value.completed_at, 80)) ||
    (value.current_question !== null && question === null) ||
    (value.feedback !== null && feedback === null)
  ) {
    return null;
  }
  return {
    attemptId: value.attempt_id,
    releaseId: value.release_id,
    contentVersion: value.content_version,
    unitId: value.unit_id,
    unitTitle: value.unit_title,
    grade: value.grade as number,
    status: value.status as CurriculumAttemptState["status"],
    revision: value.revision as number,
    answeredCount: value.answered_count as number,
    correctCount: value.correct_count as number,
    totalQuestions: value.total_questions as number,
    startedAt: value.started_at,
    completedAt: value.completed_at as string | null,
    currentQuestion: question,
    feedback,
  };
}

export function parseCurriculumAttemptApiState(
  value: unknown,
): CurriculumAttemptState | null {
  if (!isRecord(value)) return null;
  const currentQuestion = isRecord(value.currentQuestion)
    ? {
        question_id: value.currentQuestion.questionId,
        position: value.currentQuestion.position,
        prompt: value.currentQuestion.prompt,
        answer_type: value.currentQuestion.answerType,
        options: value.currentQuestion.options,
        visual: value.currentQuestion.visual,
        cognitive_level: value.currentQuestion.cognitiveLevel,
      }
    : value.currentQuestion;
  const feedback = isRecord(value.feedback)
    ? {
        question_id: value.feedback.questionId,
        is_correct: value.feedback.isCorrect,
        correct_answer: value.feedback.correctAnswer,
        solution_steps: value.feedback.solutionSteps,
        feedback: value.feedback.feedback,
      }
    : value.feedback;
  return parseCurriculumAttemptState({
    attempt_id: value.attemptId,
    release_id: value.releaseId,
    content_version: value.contentVersion,
    unit_id: value.unitId,
    unit_title: value.unitTitle,
    grade: value.grade,
    status: value.status,
    revision: value.revision,
    answered_count: value.answeredCount,
    correct_count: value.correctCount,
    total_questions: value.totalQuestions,
    started_at: value.startedAt,
    completed_at: value.completedAt,
    current_question: currentQuestion,
    feedback,
  });
}

export function parseStartCurriculumRequest(value: unknown) {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["unitSlug", "idempotencyKey"]) ||
    !isSlug(value.unitSlug) ||
    !isUuid(value.idempotencyKey)
  ) {
    return null;
  }
  return { unitSlug: value.unitSlug, idempotencyKey: value.idempotencyKey };
}

export function parseSubmitCurriculumRequest(value: unknown) {
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
    !isText(value.answer, 200) ||
    !isInteger(value.expectedRevision, 0, Number.MAX_SAFE_INTEGER) ||
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

function parseMasteryLabel(value: unknown): CurriculumMasteryLabel | null {
  return curriculumMasteryLabels.includes(value as CurriculumMasteryLabel)
    ? (value as CurriculumMasteryLabel)
    : null;
}

function parseProgressUnit(value: unknown): CurriculumProgressUnit | null {
  if (!isRecord(value)) return null;
  const masteryLabel = parseMasteryLabel(value.mastery_label);
  if (
    !isSlug(value.unit_id) ||
    !isText(value.title, 300) ||
    !["NOT_STARTED", "IN_PROGRESS", "COMPLETED"].includes(
      String(value.status),
    ) ||
    !isInteger(value.evidence_count, 0, Number.MAX_SAFE_INTEGER) ||
    !isInteger(value.correct_count, 0, Number.MAX_SAFE_INTEGER) ||
    (value.best_score_percent !== null &&
      (typeof value.best_score_percent !== "number" ||
        value.best_score_percent < 0 ||
        value.best_score_percent > 100)) ||
    masteryLabel === null ||
    (value.last_activity_at !== null &&
      !isText(value.last_activity_at, 80)) ||
    !["LEGACY_GRADE1", "UNIVERSAL_CURRICULUM"].includes(
      String(value.source),
    )
  ) {
    return null;
  }
  return {
    unitId: value.unit_id,
    title: value.title,
    status: value.status as CurriculumProgressUnit["status"],
    evidenceCount: value.evidence_count as number,
    correctCount: value.correct_count as number,
    bestScorePercent: value.best_score_percent as number | null,
    masteryLabel,
    lastActivityAt: value.last_activity_at as string | null,
    source: value.source as CurriculumProgressUnit["source"],
  };
}

function parseProgressEvidence(
  value: unknown,
): CurriculumProgressEvidence | null {
  if (!isRecord(value)) return null;
  const masteryLabel = parseMasteryLabel(value.mastery_label);
  if (
    !isText(value.title, 1000) ||
    !isInteger(value.evidence_count, 0, Number.MAX_SAFE_INTEGER) ||
    !isInteger(value.correct_count, 0, Number.MAX_SAFE_INTEGER) ||
    masteryLabel === null ||
    masteryLabel === "NOT_STARTED" ||
    masteryLabel === "IN_PROGRESS" ||
    !isText(value.last_activity_at, 80) ||
    ![
      "LEGACY_UNIT_ALIGNED",
      "LEGACY_QUESTION_SKILL",
      "AUTHORITATIVE_QUESTION_MAPPING",
    ].includes(String(value.evidence_basis))
  ) {
    return null;
  }
  return {
    title: value.title,
    evidenceCount: value.evidence_count as number,
    correctCount: value.correct_count as number,
    masteryLabel,
    lastActivityAt: value.last_activity_at,
    evidenceBasis:
      value.evidence_basis as CurriculumProgressEvidence["evidenceBasis"],
  };
}

export function parseStudentCurriculumProgress(
  value: unknown,
): StudentCurriculumProgress | null {
  if (
    !isRecord(value) ||
    !isInteger(value.grade, 1, 9) ||
    ![
      "LEGACY_GRADE1_AGGREGATED",
      "UNIVERSAL_CURRICULUM",
    ].includes(String(value.compatibility_mode)) ||
    !isText(value.mastery_policy_version, 80) ||
    !isText(value.mastery_explanation, 1000) ||
    !Array.isArray(value.units) ||
    !Array.isArray(value.outcomes) ||
    !Array.isArray(value.skills)
  ) {
    return null;
  }
  const units = value.units.map(parseProgressUnit);
  const outcomes = value.outcomes.map(parseProgressEvidence);
  const skills = value.skills.map(parseProgressEvidence);
  if (
    units.some((item) => item === null) ||
    outcomes.some((item) => item === null) ||
    skills.some((item) => item === null)
  ) {
    return null;
  }
  return {
    grade: value.grade as number,
    compatibilityMode:
      value.compatibility_mode as StudentCurriculumProgress["compatibilityMode"],
    masteryPolicyVersion: value.mastery_policy_version,
    masteryExplanation: value.mastery_explanation,
    units: units as CurriculumProgressUnit[],
    outcomes: outcomes as CurriculumProgressEvidence[],
    skills: skills as CurriculumProgressEvidence[],
  };
}

export function parseStudentCurriculumHistory(
  value: unknown,
): StudentCurriculumHistory | null {
  if (
    !isRecord(value) ||
    !isInteger(value.grade, 1, 9) ||
    !Array.isArray(value.attempts)
  ) {
    return null;
  }
  const attempts: CurriculumHistoryItem[] = [];
  for (const item of value.attempts) {
    if (
      !isRecord(item) ||
      !isUuid(item.attempt_id) ||
      !isSlug(item.unit_id) ||
      !isText(item.unit_title, 300) ||
      !["IN_PROGRESS", "COMPLETED", "ABANDONED"].includes(
        String(item.status),
      ) ||
      !isInteger(item.answered_count) ||
      !isInteger(item.correct_count) ||
      !isInteger(item.total_questions, 1, 100) ||
      !isText(item.started_at, 80) ||
      (item.completed_at !== null &&
        !isText(item.completed_at, 80)) ||
      !["LEGACY_GRADE1", "UNIVERSAL_CURRICULUM"].includes(
        String(item.source),
      )
    ) {
      return null;
    }
    attempts.push({
      attemptId: item.attempt_id,
      unitId: item.unit_id,
      unitTitle: item.unit_title,
      status: item.status as CurriculumHistoryItem["status"],
      answeredCount: item.answered_count as number,
      correctCount: item.correct_count as number,
      totalQuestions: item.total_questions as number,
      startedAt: item.started_at,
      completedAt: item.completed_at as string | null,
      source: item.source as CurriculumHistoryItem["source"],
    });
  }
  return { grade: value.grade as number, attempts };
}

export function parseStudentGeneratedCurriculumEvidence(
  value: unknown,
): StudentGeneratedCurriculumEvidence | null {
  if (!isRecord(value) || !isInteger(value.grade, 1, 9)) return null;
  const progress = parseStudentCurriculumProgress({
    grade: value.grade,
    compatibility_mode:
      value.grade === 1
        ? "LEGACY_GRADE1_AGGREGATED"
        : "UNIVERSAL_CURRICULUM",
    mastery_policy_version: "product-hypothesis-v1",
    mastery_explanation: "Generated curriculum evidence supplement.",
    units: value.units,
    outcomes: value.outcomes,
    skills: value.skills,
  });
  const history = parseStudentCurriculumHistory({
    grade: value.grade,
    attempts: value.attempts,
  });
  if (!progress || !history) return null;
  if (
    value.grade !== 1 &&
    (progress.units.length > 0 ||
      progress.outcomes.length > 0 ||
      progress.skills.length > 0 ||
      history.attempts.length > 0)
  ) {
    return null;
  }
  return {
    grade: value.grade as number,
    units: progress.units,
    outcomes: progress.outcomes,
    skills: progress.skills,
    attempts: history.attempts,
  };
}

export function mergeStudentGeneratedCurriculumProgress(
  progress: StudentCurriculumProgress,
  generated: StudentGeneratedCurriculumEvidence,
): StudentCurriculumProgress | null {
  if (generated.grade !== progress.grade) return null;
  if (progress.grade !== 1) return progress;
  return {
    ...progress,
    units: [...progress.units, ...generated.units],
    outcomes: [...progress.outcomes, ...generated.outcomes],
    skills: [...progress.skills, ...generated.skills],
  };
}

export function mergeStudentGeneratedCurriculumHistory(
  history: StudentCurriculumHistory,
  generated: StudentGeneratedCurriculumEvidence,
): StudentCurriculumHistory | null {
  if (generated.grade !== history.grade) return null;
  if (history.grade !== 1) return history;
  return {
    ...history,
    attempts: [...history.attempts, ...generated.attempts]
      .sort(
        (left, right) =>
          Date.parse(right.startedAt) - Date.parse(left.startedAt),
      )
      .slice(0, 50),
  };
}
