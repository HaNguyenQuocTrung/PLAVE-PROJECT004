import type { PreviewOption, PreviewVisualSpec } from "../curriculum/types.ts";
import type {
  ProductDifficulty,
  ProductInteractionContract,
  ProductVisual,
} from "../generation-v2/types.ts";
import {
  parseMotivationAchievements,
  parseMotivationSummary,
  type MotivationAchievement,
  type MotivationSummary,
} from "../motivation/contracts.ts";
import {
  parseAnswerXpProjection,
  parseXpCompletionProjection,
  type AnswerXpProjection,
  type XpCompletionProjection,
} from "../scoring/completion.ts";

export type CurriculumRuntimeMode = "STATIC" | "GENERATED_V2";

export const scoringMasteryStatuses = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "DEVELOPING",
  "PROFICIENT",
  "MASTERED",
  "NEEDS_REVIEW",
] as const;

export type ScoringMasteryStatus =
  (typeof scoringMasteryStatuses)[number];

export type ScoringMasteryChange = Readonly<{
  outcomeTitle: string;
  evidenceCount: number;
  correctCount: number;
  masteryPercent: number;
  status: Exclude<ScoringMasteryStatus, "NOT_STARTED">;
  lastEvidenceAt: string;
}>;

export type AttemptScoringState = Readonly<{
  policyVersion: "PLAVE_SCORING_POLICY_V1" | null;
  legacy: boolean;
  finalized: boolean;
  earnedWeight: number | null;
  possibleWeight: number | null;
  scorePercent: number | null;
  attemptXpEarned: number;
  xpDelta: number;
  lessonCompleted: boolean;
  masteryChanges: readonly ScoringMasteryChange[];
}>;

export type StudentXpEvent = Readonly<{
  amount: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  unitTitle: string;
  awardedAt: string;
}>;

export type StudentMasteryOutcome = Readonly<{
  title: string;
  evidenceCount: number;
  correctCount: number;
  masteryPercent: number;
  status: Exclude<ScoringMasteryStatus, "NOT_STARTED">;
  lastEvidenceAt: string;
}>;

export type StudentAttemptScoringSummary = Readonly<{
  attemptId: string;
  policyVersion: "PLAVE_SCORING_POLICY_V1" | null;
  legacy: boolean;
  scorePercent: number | null;
  earnedWeight: number | null;
  possibleWeight: number | null;
  xpEarned: number;
  lessonCompleted: boolean;
}>;

export type StudentScoringSummary = Readonly<{
  policyVersion: "PLAVE_SCORING_POLICY_V1";
  totalXp: number;
  recentXp: readonly StudentXpEvent[];
  masterySummary: Readonly<{
    started: number;
    mastered: number;
    needsReview: number;
  }>;
  outcomes: readonly StudentMasteryOutcome[];
  attempts: readonly StudentAttemptScoringSummary[];
}>;

export type StudentGeneratorV2Question = Readonly<{
  schemaVersion: 2;
  questionId: string;
  grade: number;
  difficulty: ProductDifficulty;
  publicPrompt: string;
  publicData: Readonly<Record<string, unknown>>;
  interaction: ProductInteractionContract;
  visual: ProductVisual;
  accessibility: Readonly<{
    prompt: string;
    visualAlternative: string;
    responseInstruction: string;
  }>;
}>;

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
  PROFICIENT: "Đạt yêu cầu",
  MASTERED: "Đạt mức thành thạo theo tiêu chí hiện tại",
};

export type CurriculumAttemptQuestion = Readonly<{
  questionId: string;
  position: number;
  prompt: string;
  answerType: "MULTIPLE_CHOICE" | "NUMBER_INPUT" | "TEXT_INPUT";
  options: readonly PreviewOption[] | null;
  visual: PreviewVisualSpec;
  cognitiveLevel: "UNDERSTAND" | "APPLY" | "REASON";
  generatorV2: StudentGeneratorV2Question | null;
}>;

export type CurriculumAttemptFeedback = Readonly<{
  questionId: string;
  isCorrect: boolean;
  correctAnswer: string;
  solutionSteps: readonly string[];
  feedback: string;
}>;

export type CurriculumAttemptState = Readonly<{
  runtimeMode: CurriculumRuntimeMode;
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
  scoring?: AttemptScoringState | null;
  xp?: AnswerXpProjection | null;
  xpCompletion?: XpCompletionProjection | null;
  motivation?: MotivationSummary | null;
  achievementUnlocks?: readonly MotivationAchievement[];
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
  scoring?: StudentScoringSummary | null;
  motivation?: MotivationSummary | null;
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
  scorePercent: number | null;
  earnedWeight: number | null;
  possibleWeight: number | null;
  xpEarned: number;
  scoringPolicyVersion: "PLAVE_SCORING_POLICY_V1" | null;
  legacyScoring: boolean;
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
  "GENERATOR_V2_RUNTIME_DISABLED",
  "GENERATOR_V2_LOOPBACK_REQUIRED",
  "GENERATOR_V2_RELEASE_DISABLED",
  "GENERATOR_V2_SCHEMA_INCOMPATIBLE",
  "GENERATOR_V2_SIGNING_KEY_UNAVAILABLE",
  "GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED",
  "GENERATOR_V2_CORRECTNESS_REVIEW_REQUIRED",
  "GENERATOR_V2_GENERATION_FAILED",
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
    value.length < 2 ||
    value.length > 4 ||
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
  const generatorV2 = parseStudentGeneratorV2Question(value.generator_v2);
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
    ) ||
    (value.generator_v2 !== null &&
      value.generator_v2 !== undefined &&
      generatorV2 === null)
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
    generatorV2,
  };
}

function parseStudentGeneratorV2Question(
  value: unknown,
): StudentGeneratorV2Question | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) return null;
  const interaction = isRecord(value.interaction) ? value.interaction : null;
  const visual = isRecord(value.visual) ? value.visual : null;
  const accessibility = isRecord(value.accessibility)
    ? value.accessibility
    : null;
  const interactionTypes = [
    "SINGLE_CHOICE",
    "MULTI_SELECT",
    "INTEGER_INPUT",
    "DECIMAL_INPUT",
    "FRACTION_INPUT",
    "ORDERING",
    "MATCHING",
    "TABLE_OR_CHART_RESPONSE",
    "CONSTRUCTION_OR_VISUAL_SELECTION",
    "SHORT_STRUCTURED_RESPONSE",
  ];
  if (
    value.schemaVersion !== 2 ||
    !isSlug(value.questionId) ||
    !isInteger(value.grade, 1, 9) ||
    !["EASY", "MEDIUM", "HARD"].includes(String(value.difficulty)) ||
    !isText(value.publicPrompt) ||
    !isRecord(value.publicData) ||
    !interaction ||
    !interactionTypes.includes(String(interaction.type)) ||
    !visual ||
    !isText(visual.type, 80) ||
    !isText(visual.description, 1000) ||
    !isRecord(visual.data) ||
    !accessibility ||
    !isText(accessibility.prompt) ||
    !isText(accessibility.visualAlternative, 1000) ||
    !isText(accessibility.responseInstruction, 1000)
  ) {
    return null;
  }
  return value as StudentGeneratorV2Question;
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

function nullableBoundedInteger(
  value: unknown,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
) {
  return value === null
    ? null
    : isInteger(value, minimum, maximum)
      ? (value as number)
      : undefined;
}

function parseScoringMasteryChange(
  value: unknown,
): ScoringMasteryChange | null {
  if (!isRecord(value)) return null;
  const status = String(value.status) as ScoringMasteryChange["status"];
  if (
    !isText(value.outcome_title, 1000) ||
    !isInteger(value.evidence_count, 1, 10) ||
    !isInteger(value.correct_count, 0, 10) ||
    !isInteger(value.mastery_percent, 0, 100) ||
    !scoringMasteryStatuses.includes(status) ||
    !isText(value.last_evidence_at, 80)
  ) {
    return null;
  }
  return {
    outcomeTitle: value.outcome_title,
    evidenceCount: value.evidence_count as number,
    correctCount: value.correct_count as number,
    masteryPercent: value.mastery_percent as number,
    status,
    lastEvidenceAt: value.last_evidence_at,
  };
}

function parseAttemptScoring(value: unknown): AttemptScoringState | null {
  if (!isRecord(value) || !Array.isArray(value.mastery_changes)) return null;
  const earnedWeight = nullableBoundedInteger(value.earned_weight);
  const possibleWeight = nullableBoundedInteger(value.possible_weight, 1);
  const scorePercent = nullableBoundedInteger(value.score_percent, 0, 100);
  const masteryChanges = value.mastery_changes.map(parseScoringMasteryChange);
  if (
    ![null, "PLAVE_SCORING_POLICY_V1"].includes(
      value.policy_version as null | string,
    ) ||
    typeof value.legacy !== "boolean" ||
    typeof value.finalized !== "boolean" ||
    earnedWeight === undefined ||
    possibleWeight === undefined ||
    scorePercent === undefined ||
    !isInteger(value.attempt_xp_earned, 0, Number.MAX_SAFE_INTEGER) ||
    !isInteger(value.xp_delta, 0, 20) ||
    typeof value.lesson_completed !== "boolean" ||
    masteryChanges.some((item) => item === null)
  ) {
    return null;
  }
  if (
    value.finalized &&
    (earnedWeight === null || possibleWeight === null || scorePercent === null)
  ) {
    return null;
  }
  return {
    policyVersion: value.policy_version as AttemptScoringState["policyVersion"],
    legacy: value.legacy,
    finalized: value.finalized,
    earnedWeight,
    possibleWeight,
    scorePercent,
    attemptXpEarned: value.attempt_xp_earned as number,
    xpDelta: value.xp_delta as number,
    lessonCompleted: value.lesson_completed,
    masteryChanges: masteryChanges as ScoringMasteryChange[],
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
  const scoring =
    value.scoring === null || value.scoring === undefined
      ? null
      : parseAttemptScoring(value.scoring);
  const xpCompletion =
    value.xp_completion === null || value.xp_completion === undefined
      ? null
      : parseXpCompletionProjection(value.xp_completion);
  const xp = value.xp === null || value.xp === undefined
    ? null
    : parseAnswerXpProjection(value.xp);
  const motivation =
    value.motivation === null || value.motivation === undefined
      ? null
      : parseMotivationSummary(value.motivation);
  const achievementUnlocks = parseMotivationAchievements(
    value.achievement_unlocks ?? [],
  );
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
    (value.feedback !== null && feedback === null) ||
    (value.scoring !== null &&
      value.scoring !== undefined &&
      scoring === null) ||
    (value.xp_completion !== null &&
      value.xp_completion !== undefined &&
      xpCompletion === null) ||
    (value.xp !== null && value.xp !== undefined && xp === null) ||
    (value.motivation !== null &&
      value.motivation !== undefined &&
      motivation === null) ||
    achievementUnlocks === null
  ) {
    return null;
  }
  return {
    runtimeMode:
      value.runtime_mode === "GENERATED_V2" ? "GENERATED_V2" : "STATIC",
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
    scoring,
    xp,
    xpCompletion,
    motivation,
    achievementUnlocks,
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
        generator_v2: value.currentQuestion.generatorV2,
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
  const state = parseCurriculumAttemptState({
    runtime_mode: value.runtimeMode,
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
    motivation: value.motivation,
    achievement_unlocks: value.achievementUnlocks,
    scoring: isRecord(value.scoring)
      ? {
          policy_version: value.scoring.policyVersion,
          legacy: value.scoring.legacy,
          finalized: value.scoring.finalized,
          earned_weight: value.scoring.earnedWeight,
          possible_weight: value.scoring.possibleWeight,
          score_percent: value.scoring.scorePercent,
          attempt_xp_earned: value.scoring.attemptXpEarned,
          xp_delta: value.scoring.xpDelta,
          lesson_completed: value.scoring.lessonCompleted,
          mastery_changes: Array.isArray(value.scoring.masteryChanges)
            ? value.scoring.masteryChanges.map((item) =>
                isRecord(item)
                  ? {
                      outcome_title: item.outcomeTitle,
                      evidence_count: item.evidenceCount,
                      correct_count: item.correctCount,
                      mastery_percent: item.masteryPercent,
                      status: item.status,
                      last_evidence_at: item.lastEvidenceAt,
                    }
                  : item,
              )
            : value.scoring.masteryChanges,
        }
      : value.scoring,
    xp_completion: value.xpCompletion,
    xp: isRecord(value.xp)
      ? {
          answer_xp_awarded: value.xp.answerXpAwarded,
          attempt_xp_earned: value.xp.attemptXpEarned,
          total_xp_after: value.xp.totalXpAfter,
          policy_version: value.xp.policyVersion,
          eligible: value.xp.eligible,
          zero_xp_reason: value.xp.zeroXpReason,
        }
      : value.xp,
  });
  return state?.status === "COMPLETED" && !state.xpCompletion ? null : state;
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

export function parseStudentScoringSummary(
  value: unknown,
): StudentScoringSummary | null {
  if (
    !isRecord(value) ||
    value.policy_version !== "PLAVE_SCORING_POLICY_V1" ||
    !isInteger(value.total_xp, 0, Number.MAX_SAFE_INTEGER) ||
    !Array.isArray(value.recent_xp) ||
    !isRecord(value.mastery_summary) ||
    !isInteger(value.mastery_summary.started, 0, Number.MAX_SAFE_INTEGER) ||
    !isInteger(value.mastery_summary.mastered, 0, Number.MAX_SAFE_INTEGER) ||
    !isInteger(value.mastery_summary.needs_review, 0, Number.MAX_SAFE_INTEGER) ||
    !Array.isArray(value.outcomes) ||
    !Array.isArray(value.attempts)
  ) {
    return null;
  }
  const recentXp: StudentXpEvent[] = [];
  for (const item of value.recent_xp) {
    if (
      !isRecord(item) ||
      !isInteger(item.amount, 10, 20) ||
      !["EASY", "MEDIUM", "HARD"].includes(String(item.difficulty)) ||
      !isText(item.unit_title, 300) ||
      !isText(item.awarded_at, 80)
    ) {
      return null;
    }
    recentXp.push({
      amount: item.amount as number,
      difficulty: item.difficulty as StudentXpEvent["difficulty"],
      unitTitle: item.unit_title,
      awardedAt: item.awarded_at,
    });
  }
  const outcomes: StudentMasteryOutcome[] = [];
  for (const item of value.outcomes) {
    if (!isRecord(item)) return null;
    const parsed = parseScoringMasteryChange({
      outcome_title: item.title,
      evidence_count: item.evidence_count,
      correct_count: item.correct_count,
      mastery_percent: item.mastery_percent,
      status: item.status,
      last_evidence_at: item.last_evidence_at,
    });
    if (!parsed) return null;
    outcomes.push({
      title: parsed.outcomeTitle,
      evidenceCount: parsed.evidenceCount,
      correctCount: parsed.correctCount,
      masteryPercent: parsed.masteryPercent,
      status: parsed.status,
      lastEvidenceAt: parsed.lastEvidenceAt,
    });
  }
  const attempts: StudentAttemptScoringSummary[] = [];
  for (const item of value.attempts) {
    if (!isRecord(item)) return null;
    const scorePercent = nullableBoundedInteger(item.score_percent, 0, 100);
    const earnedWeight = nullableBoundedInteger(item.earned_weight);
    const possibleWeight = nullableBoundedInteger(item.possible_weight, 1);
    if (
      !isUuid(item.attempt_id) ||
      ![null, "PLAVE_SCORING_POLICY_V1"].includes(
        item.policy_version as null | string,
      ) ||
      typeof item.legacy !== "boolean" ||
      scorePercent === undefined ||
      earnedWeight === undefined ||
      possibleWeight === undefined ||
      !isInteger(item.xp_earned, 0, Number.MAX_SAFE_INTEGER) ||
      typeof item.lesson_completed !== "boolean"
    ) {
      return null;
    }
    attempts.push({
      attemptId: item.attempt_id,
      policyVersion:
        item.policy_version as StudentAttemptScoringSummary["policyVersion"],
      legacy: item.legacy,
      scorePercent,
      earnedWeight,
      possibleWeight,
      xpEarned: item.xp_earned as number,
      lessonCompleted: item.lesson_completed,
    });
  }
  return {
    policyVersion: "PLAVE_SCORING_POLICY_V1",
    totalXp: value.total_xp as number,
    recentXp,
    masterySummary: {
      started: value.mastery_summary.started as number,
      mastered: value.mastery_summary.mastered as number,
      needsReview: value.mastery_summary.needs_review as number,
    },
    outcomes,
    attempts,
  };
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
    scoring: null,
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
      scorePercent:
        item.status === "COMPLETED"
          ? Math.round(
              ((item.correct_count as number) * 100) /
                (item.total_questions as number),
            )
          : null,
      earnedWeight: null,
      possibleWeight: null,
      xpEarned: 0,
      scoringPolicyVersion: null,
      legacyScoring: true,
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
