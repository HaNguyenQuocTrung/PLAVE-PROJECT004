import {
  isUuid,
  parsePracticeQuestion,
  type PracticeQuestion,
  type PracticeReviewAnswer,
  type SkillCode,
} from "../practice/contracts.ts";

export const DIAGNOSTIC_QUESTION_COUNT = 24;
export const DIAGNOSTIC_DOMAIN_QUESTION_COUNT = 6;

export const diagnosticDomains = [
  "NUMBER_SENSE",
  "ARITHMETIC",
  "GEOMETRY",
  "MEASUREMENT_TIME",
] as const;

export type DiagnosticDomain = (typeof diagnosticDomains)[number];
export type DiagnosticLevel = "DOING_WELL" | "REVIEW";
export type DiagnosticStatus = "IN_PROGRESS" | "COMPLETED";

export const diagnosticDomainLabels: Record<DiagnosticDomain, string> = {
  NUMBER_SENSE: "Số và cấu tạo số",
  ARITHMETIC: "Phép cộng và phép trừ",
  GEOMETRY: "Hình học và hình khối",
  MEASUREMENT_TIME: "Đo lường, đồng hồ và lịch",
};

export type DiagnosticQuestion = PracticeQuestion & {
  domain: DiagnosticDomain;
  unitTitle: string;
};

export type DiagnosticStartResult = {
  attemptId: string;
  status: "IN_PROGRESS";
  questionOrder: string[];
  totalQuestions: number;
  answeredCount: number;
  startedAt: string;
};

export type DiagnosticState = {
  attemptId: string;
  status: DiagnosticStatus;
  questionOrder: string[];
  totalQuestions: number;
  answeredCount: number;
  answeredQuestionIds: string[];
  startedAt: string;
  completedAt: string | null;
  questions: DiagnosticQuestion[];
};

export type DiagnosticSubmitResult = {
  answeredCount: number;
  totalQuestions: number;
  completed: boolean;
};

export type DiagnosticDomainResult = {
  domain: DiagnosticDomain;
  answeredCount: number;
  correctCount: number;
  accuracyPercent: number;
  level: DiagnosticLevel;
};

export type DiagnosticUnitResult = {
  unitSlug: string;
  unitTitle: string;
  answeredCount: number;
  correctCount: number;
  accuracyPercent: number;
};

export type DiagnosticSkillResult = {
  skillCode: SkillCode;
  answeredCount: number;
  correctCount: number;
  accuracyPercent: number;
};

export type DiagnosticRecommendationReason =
  | "REVIEW_NUMBER_SENSE"
  | "REVIEW_ARITHMETIC"
  | "REVIEW_GEOMETRY"
  | "REVIEW_MEASUREMENT_TIME"
  | "NEXT_UNCOMPLETED_UNIT"
  | "GRADE1_CURRENT_SCOPE_MASTERED";

export type DiagnosticRecommendation = {
  unitSlug: string | null;
  unitTitle: string | null;
  reasonCode: DiagnosticRecommendationReason;
  explanation: string;
};

export type DiagnosticReviewAnswer = PracticeReviewAnswer & {
  domain: DiagnosticDomain;
  unitSlug: string;
  unitTitle: string;
};

export type DiagnosticReview = {
  attemptId: string;
  status: "COMPLETED";
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  accuracyPercent: number;
  startedAt: string;
  completedAt: string;
  domains: DiagnosticDomainResult[];
  units: DiagnosticUnitResult[];
  skills: DiagnosticSkillResult[];
  recommendation: DiagnosticRecommendation;
  answers: DiagnosticReviewAnswer[];
};

export type DiagnosticAttemptSummary = {
  id: string;
  status: DiagnosticStatus;
  answeredCount: number;
  correctCount: number;
  recommendationUnitSlug: string | null;
  recommendationReasonCode: DiagnosticRecommendationReason | null;
  recommendationExplanation: string | null;
  startedAt: string;
  completedAt: string | null;
};

export type ParentDiagnosticSummary =
  | { hasResult: false }
  | {
      hasResult: true;
      totalQuestions: number;
      correctCount: number;
      accuracyPercent: number;
      completedAt: string;
      domains: DiagnosticDomainResult[];
      recommendation: {
        unitTitle: string | null;
        reasonCode: DiagnosticRecommendationReason;
        explanation: string;
      };
    };

export type DiagnosticSafeErrorCode =
  | "AUTH_REQUIRED"
  | "ACCESS_DENIED"
  | "INVALID_REQUEST"
  | "INVALID_ANSWER"
  | "ANSWER_LOCKED"
  | "DIAGNOSTIC_INCOMPLETE"
  | "DIAGNOSTIC_UNAVAILABLE"
  | "QUESTION_UNAVAILABLE"
  | "REQUEST_FAILED";

export type DiagnosticApiError = {
  ok: false;
  error: {
    code: DiagnosticSafeErrorCode;
    message: string;
  };
};

export type DiagnosticApiSuccess<T> = {
  ok: true;
  data: T;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
) {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function isIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function isPercentage(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

function isDiagnosticDomain(value: unknown): value is DiagnosticDomain {
  return diagnosticDomains.some((domain) => domain === value);
}

function isDiagnosticStatus(value: unknown): value is DiagnosticStatus {
  return value === "IN_PROGRESS" || value === "COMPLETED";
}

function isDiagnosticLevel(value: unknown): value is DiagnosticLevel {
  return value === "DOING_WELL" || value === "REVIEW";
}

function isRecommendationReason(
  value: unknown,
): value is DiagnosticRecommendationReason {
  return (
    value === "REVIEW_NUMBER_SENSE" ||
    value === "REVIEW_ARITHMETIC" ||
    value === "REVIEW_GEOMETRY" ||
    value === "REVIEW_MEASUREMENT_TIME" ||
    value === "NEXT_UNCOMPLETED_UNIT" ||
    value === "GRADE1_CURRENT_SCOPE_MASTERED"
  );
}

function parseQuestionOrder(value: unknown): string[] | null {
  if (
    !Array.isArray(value) ||
    value.length !== DIAGNOSTIC_QUESTION_COUNT ||
    !value.every(isNonEmptyString) ||
    new Set(value).size !== DIAGNOSTIC_QUESTION_COUNT
  ) {
    return null;
  }
  return [...value];
}

export function parseDiagnosticAttemptSummary(
  value: unknown,
): DiagnosticAttemptSummary | null {
  if (
    !isRecord(value) ||
    !isUuid(value.id) ||
    !isDiagnosticStatus(value.status) ||
    !isIntegerInRange(
      value.answered_count,
      0,
      DIAGNOSTIC_QUESTION_COUNT,
    ) ||
    !isIntegerInRange(value.correct_count, 0, value.answered_count) ||
    !(
      value.recommendation_unit_slug === null ||
      isNonEmptyString(value.recommendation_unit_slug)
    ) ||
    !(
      value.recommendation_reason_code === null ||
      isRecommendationReason(value.recommendation_reason_code)
    ) ||
    !(
      value.recommendation_explanation === null ||
      isNonEmptyString(value.recommendation_explanation)
    ) ||
    !isTimestamp(value.started_at) ||
    !(value.completed_at === null || isTimestamp(value.completed_at))
  ) {
    return null;
  }

  if (
    (value.status === "IN_PROGRESS" &&
      (value.answered_count >= DIAGNOSTIC_QUESTION_COUNT ||
        value.completed_at !== null ||
        value.recommendation_unit_slug !== null ||
        value.recommendation_reason_code !== null ||
        value.recommendation_explanation !== null)) ||
    (value.status === "COMPLETED" &&
      (value.answered_count !== DIAGNOSTIC_QUESTION_COUNT ||
        value.completed_at === null ||
        value.recommendation_reason_code === null ||
        value.recommendation_explanation === null))
  ) {
    return null;
  }

  return {
    id: value.id,
    status: value.status,
    answeredCount: value.answered_count,
    correctCount: value.correct_count,
    recommendationUnitSlug: value.recommendation_unit_slug,
    recommendationReasonCode: value.recommendation_reason_code,
    recommendationExplanation: value.recommendation_explanation,
    startedAt: value.started_at,
    completedAt: value.completed_at,
  };
}

export function parseDiagnosticStartRpcResult(
  value: unknown,
): DiagnosticStartResult | null {
  if (!isRecord(value)) return null;
  const questionOrder = parseQuestionOrder(value.question_order);
  if (
    !isUuid(value.attempt_id) ||
    value.status !== "IN_PROGRESS" ||
    !questionOrder ||
    value.total_questions !== DIAGNOSTIC_QUESTION_COUNT ||
    !isIntegerInRange(
      value.answered_count,
      0,
      DIAGNOSTIC_QUESTION_COUNT - 1,
    ) ||
    !isTimestamp(value.started_at)
  ) {
    return null;
  }

  return {
    attemptId: value.attempt_id,
    status: "IN_PROGRESS",
    questionOrder,
    totalQuestions: DIAGNOSTIC_QUESTION_COUNT,
    answeredCount: value.answered_count,
    startedAt: value.started_at,
  };
}

function parseDiagnosticQuestion(value: unknown): DiagnosticQuestion | null {
  if (
    !isRecord(value) ||
    !isDiagnosticDomain(value.domain) ||
    !isNonEmptyString(value.unit_title)
  ) {
    return null;
  }
  const question = parsePracticeQuestion(value);
  if (!question) return null;
  return {
    ...question,
    domain: value.domain,
    unitTitle: value.unit_title,
  };
}

export function parseDiagnosticStateRpcResult(
  value: unknown,
): DiagnosticState | null {
  if (!isRecord(value)) return null;
  const questionOrder = parseQuestionOrder(value.question_order);
  if (
    !isUuid(value.attempt_id) ||
    !isDiagnosticStatus(value.status) ||
    !questionOrder ||
    value.total_questions !== DIAGNOSTIC_QUESTION_COUNT ||
    !isIntegerInRange(
      value.answered_count,
      0,
      DIAGNOSTIC_QUESTION_COUNT,
    ) ||
    !Array.isArray(value.answered_question_ids) ||
    value.answered_question_ids.length !== value.answered_count ||
    !value.answered_question_ids.every(isNonEmptyString) ||
    new Set(value.answered_question_ids).size !== value.answered_count ||
    !isTimestamp(value.started_at) ||
    !(value.completed_at === null || isTimestamp(value.completed_at)) ||
    !Array.isArray(value.questions)
  ) {
    return null;
  }

  const questions: DiagnosticQuestion[] = [];
  for (const rawQuestion of value.questions) {
    const question = parseDiagnosticQuestion(rawQuestion);
    if (!question) return null;
    questions.push(question);
  }
  if (
    questions.length !== DIAGNOSTIC_QUESTION_COUNT ||
    new Set(questions.map((question) => question.code)).size !==
      DIAGNOSTIC_QUESTION_COUNT ||
    questions.some(
      (question, index) => question.code !== questionOrder[index],
    ) ||
    value.answered_question_ids.some(
      (questionId) => !questionOrder.includes(questionId),
    ) ||
    (value.status === "IN_PROGRESS" &&
      (value.answered_count >= DIAGNOSTIC_QUESTION_COUNT ||
        value.completed_at !== null)) ||
    (value.status === "COMPLETED" &&
      (value.answered_count !== DIAGNOSTIC_QUESTION_COUNT ||
        value.completed_at === null))
  ) {
    return null;
  }

  return {
    attemptId: value.attempt_id,
    status: value.status,
    questionOrder,
    totalQuestions: DIAGNOSTIC_QUESTION_COUNT,
    answeredCount: value.answered_count,
    answeredQuestionIds: [...value.answered_question_ids],
    startedAt: value.started_at,
    completedAt: value.completed_at,
    questions,
  };
}

export function parseDiagnosticSubmitRpcResult(
  value: unknown,
): DiagnosticSubmitResult | null {
  if (
    !isRecord(value) ||
    !isIntegerInRange(
      value.answered_count,
      0,
      DIAGNOSTIC_QUESTION_COUNT,
    ) ||
    value.total_questions !== DIAGNOSTIC_QUESTION_COUNT ||
    typeof value.completed !== "boolean" ||
    value.completed !==
      (value.answered_count === DIAGNOSTIC_QUESTION_COUNT)
  ) {
    return null;
  }
  return {
    answeredCount: value.answered_count,
    totalQuestions: value.total_questions,
    completed: value.completed,
  };
}

function parseDomainResults(value: unknown): DiagnosticDomainResult[] | null {
  if (!Array.isArray(value) || value.length !== diagnosticDomains.length) {
    return null;
  }
  const results: DiagnosticDomainResult[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      !isDiagnosticDomain(item.domain) ||
      item.answered_count !== DIAGNOSTIC_DOMAIN_QUESTION_COUNT ||
      !isIntegerInRange(
        item.correct_count,
        0,
        DIAGNOSTIC_DOMAIN_QUESTION_COUNT,
      ) ||
      !isPercentage(item.accuracy_percent) ||
      !isDiagnosticLevel(item.level)
    ) {
      return null;
    }
    results.push({
      domain: item.domain,
      answeredCount: item.answered_count,
      correctCount: item.correct_count,
      accuracyPercent: item.accuracy_percent,
      level: item.level,
    });
  }
  if (
    new Set(results.map((result) => result.domain)).size !==
      diagnosticDomains.length
  ) {
    return null;
  }
  return results;
}

function parseRecommendation(value: unknown): DiagnosticRecommendation | null {
  if (
    !isRecord(value) ||
    !(value.unit_slug === null || isNonEmptyString(value.unit_slug)) ||
    !(value.unit_title === null || isNonEmptyString(value.unit_title)) ||
    !isRecommendationReason(value.reason_code) ||
    !isNonEmptyString(value.explanation) ||
    (value.reason_code === "GRADE1_CURRENT_SCOPE_MASTERED"
      ? value.unit_slug !== null || value.unit_title !== null
      : value.unit_slug === null || value.unit_title === null)
  ) {
    return null;
  }
  return {
    unitSlug: value.unit_slug,
    unitTitle: value.unit_title,
    reasonCode: value.reason_code,
    explanation: value.explanation,
  };
}

function parseDiagnosticReviewAnswer(
  value: unknown,
): DiagnosticReviewAnswer | null {
  if (
    !isRecord(value) ||
    !isDiagnosticDomain(value.domain) ||
    !isNonEmptyString(value.unit_slug) ||
    !isNonEmptyString(value.unit_title)
  ) {
    return null;
  }

  const question = parsePracticeQuestion({
    code: value.question_id,
    unit_slug: value.unit_slug,
    question_type: value.question_type,
    prompt: value.prompt,
    options: value.options,
    visual_spec: value.visual_spec,
    skill_code: value.skill_code,
    difficulty: "EASY",
    display_order: 1,
  });
  if (
    !question ||
    !isNonEmptyString(value.student_answer) ||
    typeof value.is_correct !== "boolean" ||
    !isNonEmptyString(value.correct_answer) ||
    !Array.isArray(value.solution_steps) ||
    value.solution_steps.length < 2 ||
    !value.solution_steps.every(isNonEmptyString) ||
    !isNonEmptyString(value.explanation) ||
    !isNonEmptyString(value.hint) ||
    !isTimestamp(value.answered_at)
  ) {
    return null;
  }

  return {
    questionId: question.code,
    questionType: question.questionType,
    prompt: question.prompt,
    options: question.options,
    visualSpec: question.visualSpec,
    skillCode: question.skillCode,
    studentAnswer: value.student_answer,
    isCorrect: value.is_correct,
    correctAnswer: value.correct_answer,
    solutionSteps: [...value.solution_steps],
    explanation: value.explanation,
    hint: value.hint,
    answeredAt: value.answered_at,
    domain: value.domain,
    unitSlug: value.unit_slug,
    unitTitle: value.unit_title,
  };
}

export function parseDiagnosticReviewRpcResult(
  value: unknown,
): DiagnosticReview | null {
  if (
    !isRecord(value) ||
    !isUuid(value.attempt_id) ||
    value.status !== "COMPLETED" ||
    value.total_questions !== DIAGNOSTIC_QUESTION_COUNT ||
    value.answered_count !== DIAGNOSTIC_QUESTION_COUNT ||
    !isIntegerInRange(
      value.correct_count,
      0,
      DIAGNOSTIC_QUESTION_COUNT,
    ) ||
    !isPercentage(value.accuracy_percent) ||
    !isTimestamp(value.started_at) ||
    !isTimestamp(value.completed_at) ||
    !Array.isArray(value.units) ||
    !Array.isArray(value.skills) ||
    !Array.isArray(value.answers)
  ) {
    return null;
  }

  const domains = parseDomainResults(value.domains);
  const recommendation = parseRecommendation(value.recommendation);
  if (!domains || !recommendation) return null;

  const units: DiagnosticUnitResult[] = [];
  for (const item of value.units) {
    if (
      !isRecord(item) ||
      !isNonEmptyString(item.unit_slug) ||
      !isNonEmptyString(item.unit_title) ||
      !isIntegerInRange(
        item.answered_count,
        1,
        DIAGNOSTIC_QUESTION_COUNT,
      ) ||
      !isIntegerInRange(
        item.correct_count,
        0,
        item.answered_count,
      ) ||
      !isPercentage(item.accuracy_percent)
    ) {
      return null;
    }
    units.push({
      unitSlug: item.unit_slug,
      unitTitle: item.unit_title,
      answeredCount: item.answered_count,
      correctCount: item.correct_count,
      accuracyPercent: item.accuracy_percent,
    });
  }

  const skills: DiagnosticSkillResult[] = [];
  for (const item of value.skills) {
    if (
      !isRecord(item) ||
      !isNonEmptyString(item.skill_code) ||
      !isIntegerInRange(
        item.answered_count,
        1,
        DIAGNOSTIC_QUESTION_COUNT,
      ) ||
      !isIntegerInRange(
        item.correct_count,
        0,
        item.answered_count,
      ) ||
      !isPercentage(item.accuracy_percent)
    ) {
      return null;
    }
    const question = value.answers.find(
      (answer) =>
        isRecord(answer) && answer.skill_code === item.skill_code,
    );
    const parsedQuestion = question
      ? parseDiagnosticReviewAnswer(question)
      : null;
    if (!parsedQuestion) return null;
    skills.push({
      skillCode: parsedQuestion.skillCode,
      answeredCount: item.answered_count,
      correctCount: item.correct_count,
      accuracyPercent: item.accuracy_percent,
    });
  }

  const answers: DiagnosticReviewAnswer[] = [];
  for (const item of value.answers) {
    const answer = parseDiagnosticReviewAnswer(item);
    if (!answer) return null;
    answers.push(answer);
  }
  if (
    answers.length !== DIAGNOSTIC_QUESTION_COUNT ||
    new Set(answers.map((answer) => answer.questionId)).size !==
      DIAGNOSTIC_QUESTION_COUNT
  ) {
    return null;
  }

  return {
    attemptId: value.attempt_id,
    status: "COMPLETED",
    totalQuestions: DIAGNOSTIC_QUESTION_COUNT,
    answeredCount: DIAGNOSTIC_QUESTION_COUNT,
    correctCount: value.correct_count,
    accuracyPercent: value.accuracy_percent,
    startedAt: value.started_at,
    completedAt: value.completed_at,
    domains,
    units,
    skills,
    recommendation,
    answers,
  };
}

export function parseParentDiagnosticSummary(
  value: unknown,
): ParentDiagnosticSummary | null {
  if (!isRecord(value) || typeof value.has_result !== "boolean") return null;
  if (!value.has_result) {
    return Object.keys(value).length === 1 ? { hasResult: false } : null;
  }
  if (
    !hasOnlyKeys(value, [
      "has_result",
      "total_questions",
      "correct_count",
      "accuracy_percent",
      "completed_at",
      "domains",
      "recommendation",
    ]) ||
    value.total_questions !== DIAGNOSTIC_QUESTION_COUNT ||
    !isIntegerInRange(
      value.correct_count,
      0,
      DIAGNOSTIC_QUESTION_COUNT,
    ) ||
    !isPercentage(value.accuracy_percent) ||
    !isTimestamp(value.completed_at) ||
    !isRecord(value.recommendation) ||
    !hasOnlyKeys(value.recommendation, [
      "unit_title",
      "reason_code",
      "explanation",
    ]) ||
    !(
      value.recommendation.unit_title === null ||
      isNonEmptyString(value.recommendation.unit_title)
    ) ||
    !isRecommendationReason(value.recommendation.reason_code) ||
    !isNonEmptyString(value.recommendation.explanation)
  ) {
    return null;
  }
  const domains = parseDomainResults(value.domains);
  if (!domains) return null;
  return {
    hasResult: true,
    totalQuestions: DIAGNOSTIC_QUESTION_COUNT,
    correctCount: value.correct_count,
    accuracyPercent: value.accuracy_percent,
    completedAt: value.completed_at,
    domains,
    recommendation: {
      unitTitle: value.recommendation.unit_title,
      reasonCode: value.recommendation.reason_code,
      explanation: value.recommendation.explanation,
    },
  };
}

export function parseDiagnosticApiError(
  value: unknown,
): DiagnosticApiError | null {
  if (
    !isRecord(value) ||
    value.ok !== false ||
    !isRecord(value.error) ||
    !isNonEmptyString(value.error.code) ||
    !isNonEmptyString(value.error.message)
  ) {
    return null;
  }
  const validCodes: DiagnosticSafeErrorCode[] = [
    "AUTH_REQUIRED",
    "ACCESS_DENIED",
    "INVALID_REQUEST",
    "INVALID_ANSWER",
    "ANSWER_LOCKED",
    "DIAGNOSTIC_INCOMPLETE",
    "DIAGNOSTIC_UNAVAILABLE",
    "QUESTION_UNAVAILABLE",
    "REQUEST_FAILED",
  ];
  if (!validCodes.includes(value.error.code as DiagnosticSafeErrorCode)) {
    return null;
  }
  return {
    ok: false,
    error: {
      code: value.error.code as DiagnosticSafeErrorCode,
      message: value.error.message,
    },
  };
}
