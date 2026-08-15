import {
  parsePracticeVisualSpec,
  type PracticeVisualSpec,
} from "./visual.ts";
import {
  parseAnswerXpProjection,
  parseXpCompletionProjection,
  type AnswerXpProjection,
  type XpCompletionProjection,
} from "../scoring/completion.ts";

export const GRADE_ONE_UNIT_SLUG = "grade-1-numbers-to-10";
export const GRADE_ONE_ADDITION_UNIT_SLUG =
  "grade-1-addition-within-10";
export const GRADE_ONE_SUBTRACTION_UNIT_SLUG =
  "grade-1-subtraction-within-10";
export const GRADE_ONE_NUMBERS_TO_20_UNIT_SLUG =
  "grade-1-numbers-to-20";
export const GRADE_ONE_ADDITION_WITHIN_20_NO_CARRY_UNIT_SLUG =
  "grade-1-addition-within-20-no-carry";
export const GRADE_ONE_SUBTRACTION_WITHIN_20_NO_BORROW_UNIT_SLUG =
  "grade-1-subtraction-within-20-no-borrow";
export const GRADE_ONE_NUMBERS_TO_100_UNIT_SLUG =
  "grade-1-numbers-to-100";
export const GRADE_ONE_ADDITION_WITHIN_100_NO_CARRY_UNIT_SLUG =
  "grade-1-addition-within-100-no-carry";
export const GRADE_ONE_SUBTRACTION_WITHIN_100_NO_BORROW_UNIT_SLUG =
  "grade-1-subtraction-within-100-no-borrow";
export const GRADE_ONE_BASIC_GEOMETRY_AND_POSITION_UNIT_SLUG =
  "grade-1-basic-geometry-and-position";
export const GRADE_ONE_LENGTH_MEASUREMENT_UNIT_SLUG =
  "grade-1-length-measurement";
export const GRADE_ONE_TIME_CLOCK_CALENDAR_UNIT_SLUG =
  "grade-1-time-clock-calendar";
export const GRADE_ONE_CUBE_AND_CUBOID_UNIT_SLUG =
  "grade-1-cube-and-cuboid";
// Grade 1 content keeps its verified 24-question release contract. Shared
// runtime parsing must not assume every future unit has this size.
export const PRACTICE_QUESTION_COUNT = 24;
export const PRACTICE_MIN_QUESTIONS_PER_UNIT = 1;
export const PRACTICE_MAX_QUESTIONS_PER_UNIT = 100;
export const PRACTICE_NUMBER_INPUT_MAX_DIGITS = 6;

export const skillCodes = [
  "COUNT_RECOGNIZE",
  "READ_WRITE_MATCH",
  "SEQUENCE_COMPARE_ORDER",
  "COMPOSE_DECOMPOSE",
  "ADDITION_MEANING",
  "ADDITION_CALCULATION",
  "NUMBER_BONDS",
  "ONE_STEP_WORD_PROBLEM",
  "SUBTRACTION_MEANING",
  "SUBTRACTION_CALCULATION",
  "ADDITION_SUBTRACTION_RELATION",
  "ONE_STEP_SUBTRACTION_WORD_PROBLEM",
  "COUNT_READ_WRITE_TO_20",
  "SEQUENCE_TO_20",
  "COMPARE_ORDER_TO_20",
  "TENS_ONES_TO_20",
  "ADD_TEN_AND_ONES",
  "ADD_TEEN_AND_ONES_NO_CARRY",
  "ADD_USING_TENS_ONES",
  "ONE_STEP_ADDITION_TO_20",
  "SUBTRACTION_WITHIN_20_NO_BORROW",
  "MISSING_NUMBER_SUBTRACTION",
  "SUBTRACTION_WORD_PROBLEM",
  "COUNT_RECOGNIZE_TO_100",
  "READ_WRITE_TO_100",
  "TENS_ONES_COMPOSE",
  "COMPARE_ORDER_TO_100",
  "ADD_TENS_WITHIN_100",
  "ADD_TWO_DIGIT_NO_CARRY",
  "MISSING_NUMBER_ADDITION_100",
  "ADDITION_WORD_PROBLEM_100",
  "SUBTRACT_TENS_WITHIN_100",
  "SUBTRACT_TWO_DIGIT_NO_BORROW",
  "MISSING_NUMBER_SUBTRACTION_100",
  "SUBTRACTION_WORD_PROBLEM_100",
  "RECOGNIZE_BASIC_SHAPES",
  "COMPARE_AND_SORT_SHAPES",
  "POSITION_RELATIONS",
  "COUNT_SHAPES_IN_PICTURE",
  "COMPARE_LENGTHS",
  "ORDER_BY_LENGTH",
  "MEASURE_WITH_EQUAL_UNITS",
  "READ_SIMPLE_MEASUREMENT",
  "READ_WHOLE_HOURS",
  "ORDER_DAILY_EVENTS",
  "DAYS_OF_WEEK",
  "READ_SIMPLE_CALENDAR",
  "CUBE_RECOGNITION",
  "CUBOID_RECOGNITION",
  "REAL_OBJECT_CLASSIFICATION",
  "SIMPLE_BLOCK_COMPOSITION",
] as const;

export type KnownSkillCode = (typeof skillCodes)[number];
export type SkillCode = string;
export type QuestionType = "MULTIPLE_CHOICE" | "NUMBER_INPUT";
export type AttemptStatus = "IN_PROGRESS" | "COMPLETED";

export type QuestionOptions = {
  A: string;
  B: string;
  C: string;
  D: string;
};

export type LessonSection = {
  code: string;
  title: string;
  paragraphs: string[];
};

export type WorkedExample = {
  title: string;
  steps: string[];
  answer: string;
};

export type LessonContent = {
  sections: LessonSection[];
  workedExamples: WorkedExample[];
};

export type LearningUnit = {
  slug: string;
  grade: number;
  title: string;
  description: string;
  learningObjectives: string[];
  lessonContent: LessonContent;
  totalQuestions: number;
  prerequisiteUnitSlug: string | null;
};

export type PracticeQuestion = {
  code: string;
  unitSlug: string;
  questionType: QuestionType;
  prompt: string;
  options: QuestionOptions | null;
  visualSpec: PracticeVisualSpec | null;
  skillCode: SkillCode;
  difficulty: "EASY" | "MEDIUM";
  displayOrder: number;
};

export type PracticeAttempt = {
  id: string;
  unitSlug: string;
  status: AttemptStatus;
  questionOrder: string[];
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  startedAt: string;
  completedAt: string | null;
};

export type StartPracticeResult = Omit<PracticeAttempt, "completedAt">;

export type SubmitPracticeResult = {
  isCorrect: boolean;
  correctAnswer: string;
  solutionSteps: string[];
  explanation: string;
  hint: string;
  answeredCount: number;
  correctCount: number;
  completed: boolean;
  xp?: AnswerXpProjection;
  xpCompletion?: XpCompletionProjection | null;
};

export type PracticeReviewAnswer = {
  questionId: string;
  questionType: QuestionType;
  prompt: string;
  options: QuestionOptions | null;
  visualSpec: PracticeVisualSpec | null;
  skillCode: SkillCode;
  studentAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
  solutionSteps: string[];
  explanation: string;
  hint: string;
  answeredAt: string;
};

export type PracticeReview = {
  attemptId: string;
  unitSlug: string;
  status: AttemptStatus;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  startedAt: string;
  completedAt: string | null;
  answers: PracticeReviewAnswer[];
};

export type SafePracticeErrorCode =
  | "AUTH_REQUIRED"
  | "ACCESS_DENIED"
  | "INVALID_REQUEST"
  | "INVALID_ANSWER"
  | "PREREQUISITE_REQUIRED"
  | "UNIT_UNAVAILABLE"
  | "PRACTICE_UNAVAILABLE"
  | "QUESTION_UNAVAILABLE"
  | "REQUEST_FAILED";

export type PracticeApiError = {
  ok: false;
  error: {
    code: SafePracticeErrorCode;
    message: string;
  };
};

export type PracticeApiSuccess<T> = {
  ok: true;
  data: T;
};

export type StartPracticeState = {
  attempt: StartPracticeResult | null;
};

export type PracticeAnswerState = {
  answer: PracticeReviewAnswer | null;
  answeredCount: number;
  correctCount: number;
  completed: boolean;
  xpCompletion?: XpCompletionProjection | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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

function parseStringArray(
  value: unknown,
  minimumLength = 1,
): string[] | null {
  if (
    !Array.isArray(value) ||
    value.length < minimumLength ||
    !value.every(isNonEmptyString)
  ) {
    return null;
  }

  return [...value];
}

function isQuestionType(value: unknown): value is QuestionType {
  return value === "MULTIPLE_CHOICE" || value === "NUMBER_INPUT";
}

function isAttemptStatus(value: unknown): value is AttemptStatus {
  return value === "IN_PROGRESS" || value === "COMPLETED";
}

export function isSkillCode(value: unknown): value is SkillCode {
  return (
    typeof value === "string" &&
    /^[A-Z][A-Z0-9_]{1,63}$/.test(value)
  );
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export function isUnitSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 80 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

export function parseStartPracticeInput(
  value: unknown,
): { unitSlug: string } | null {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 1 ||
    !isUnitSlug(value.unitSlug)
  ) {
    return null;
  }
  return { unitSlug: value.unitSlug };
}

export function parseQuestionOptions(
  value: unknown,
): QuestionOptions | null {
  if (!isRecord(value)) return null;

  const keys = Object.keys(value).sort();
  if (
    keys.length !== 4 ||
    keys.join(",") !== "A,B,C,D" ||
    !isNonEmptyString(value.A) ||
    !isNonEmptyString(value.B) ||
    !isNonEmptyString(value.C) ||
    !isNonEmptyString(value.D)
  ) {
    return null;
  }

  return {
    A: value.A,
    B: value.B,
    C: value.C,
    D: value.D,
  };
}

export function parseLearningUnit(value: unknown): LearningUnit | null {
  if (!isRecord(value)) return null;

  const objectives = parseStringArray(value.learning_objectives);
  const content = value.lesson_content;
  if (!objectives || !isRecord(content)) return null;

  const rawSections = content.sections;
  const rawExamples = content.worked_examples;
  if (
    !Array.isArray(rawSections) ||
    rawSections.length !== 6 ||
    !Array.isArray(rawExamples) ||
    rawExamples.length < 2
  ) {
    return null;
  }

  const sections: LessonSection[] = [];
  for (const section of rawSections) {
    if (!isRecord(section)) return null;
    const paragraphs = parseStringArray(section.paragraphs);
    if (
      !isNonEmptyString(section.code) ||
      !isNonEmptyString(section.title) ||
      !paragraphs
    ) {
      return null;
    }
    sections.push({
      code: section.code,
      title: section.title,
      paragraphs,
    });
  }

  if (new Set(sections.map((section) => section.code)).size !== 6) {
    return null;
  }

  const workedExamples: WorkedExample[] = [];
  for (const example of rawExamples) {
    if (!isRecord(example)) return null;
    const steps = parseStringArray(example.steps, 2);
    if (
      !isNonEmptyString(example.title) ||
      !steps ||
      !isNonEmptyString(example.answer)
    ) {
      return null;
    }
    workedExamples.push({
      title: example.title,
      steps,
      answer: example.answer,
    });
  }

  if (
    !isNonEmptyString(value.slug) ||
    !isIntegerInRange(value.grade, 1, 9) ||
    !isNonEmptyString(value.title) ||
    !isNonEmptyString(value.description) ||
    !isIntegerInRange(
      value.total_questions,
      PRACTICE_MIN_QUESTIONS_PER_UNIT,
      PRACTICE_MAX_QUESTIONS_PER_UNIT,
    ) ||
    !(
      value.prerequisite_unit_slug === undefined ||
      value.prerequisite_unit_slug === null ||
      isUnitSlug(value.prerequisite_unit_slug)
    ) ||
    value.prerequisite_unit_slug === value.slug
  ) {
    return null;
  }

  return {
    slug: value.slug,
    grade: value.grade,
    title: value.title,
    description: value.description,
    learningObjectives: objectives,
    lessonContent: { sections, workedExamples },
    totalQuestions: value.total_questions,
    prerequisiteUnitSlug:
      typeof value.prerequisite_unit_slug === "string"
        ? value.prerequisite_unit_slug
        : null,
  };
}

export function parsePracticeQuestion(
  value: unknown,
): PracticeQuestion | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.code) ||
    !isNonEmptyString(value.unit_slug) ||
    !isQuestionType(value.question_type) ||
    !isNonEmptyString(value.prompt) ||
    !isSkillCode(value.skill_code) ||
    (value.difficulty !== "EASY" && value.difficulty !== "MEDIUM") ||
    !isIntegerInRange(
      value.display_order,
      1,
      PRACTICE_MAX_QUESTIONS_PER_UNIT,
    )
  ) {
    return null;
  }

  const options =
    value.question_type === "MULTIPLE_CHOICE"
      ? parseQuestionOptions(value.options)
      : null;
  const visualSpec =
    value.visual_spec === undefined || value.visual_spec === null
      ? null
      : parsePracticeVisualSpec(value.visual_spec);

  if (
    (value.question_type === "MULTIPLE_CHOICE" && !options) ||
    (value.question_type === "NUMBER_INPUT" && value.options !== null) ||
    (value.visual_spec !== undefined &&
      value.visual_spec !== null &&
      !visualSpec)
  ) {
    return null;
  }

  return {
    code: value.code,
    unitSlug: value.unit_slug,
    questionType: value.question_type,
    prompt: value.prompt,
    options,
    visualSpec,
    skillCode: value.skill_code,
    difficulty: value.difficulty,
    displayOrder: value.display_order,
  };
}

export function parseAttemptRow(value: unknown): PracticeAttempt | null {
  if (!isRecord(value)) return null;

  const questionOrder = parseStringArray(value.question_order);
  const totalQuestions = value.total_questions;
  if (
    !isUuid(value.id) ||
    !isNonEmptyString(value.unit_slug) ||
    !isAttemptStatus(value.status) ||
    !questionOrder ||
    !isIntegerInRange(
      totalQuestions,
      PRACTICE_MIN_QUESTIONS_PER_UNIT,
      PRACTICE_MAX_QUESTIONS_PER_UNIT,
    ) ||
    questionOrder.length !== totalQuestions ||
    new Set(questionOrder).size !== totalQuestions ||
    !isIntegerInRange(value.answered_count, 0, totalQuestions) ||
    !isIntegerInRange(value.correct_count, 0, value.answered_count) ||
    !isNonEmptyString(value.started_at) ||
    !(
      value.completed_at === null || isNonEmptyString(value.completed_at)
    ) ||
    (value.status === "IN_PROGRESS" &&
      (value.answered_count >= totalQuestions ||
        value.completed_at !== null)) ||
    (value.status === "COMPLETED" &&
      (value.answered_count !== totalQuestions ||
        value.completed_at === null))
  ) {
    return null;
  }

  return {
    id: value.id,
    unitSlug: value.unit_slug,
    status: value.status,
    questionOrder,
    totalQuestions,
    answeredCount: value.answered_count,
    correctCount: value.correct_count,
    startedAt: value.started_at,
    completedAt: value.completed_at,
  };
}

export function parseAttemptRows(value: unknown): PracticeAttempt[] | null {
  if (!Array.isArray(value)) return null;

  const attempts: PracticeAttempt[] = [];
  for (const row of value) {
    const attempt = parseAttemptRow(row);
    if (!attempt) return null;
    attempts.push(attempt);
  }
  return attempts;
}

export function parseStartPracticeRpcResult(
  value: unknown,
): StartPracticeResult | null {
  if (!isRecord(value)) return null;

  const attempt = parseAttemptRow({
    id: value.attempt_id,
    unit_slug: value.unit_slug,
    status: value.status,
    question_order: value.question_order,
    total_questions: value.total_questions,
    answered_count: value.answered_count,
    correct_count: value.correct_count,
    started_at: value.started_at,
    completed_at: null,
  });

  if (!attempt || attempt.status !== "IN_PROGRESS") return null;

  return {
    id: attempt.id,
    unitSlug: attempt.unitSlug,
    status: attempt.status,
    questionOrder: attempt.questionOrder,
    totalQuestions: attempt.totalQuestions,
    answeredCount: attempt.answeredCount,
    correctCount: attempt.correctCount,
    startedAt: attempt.startedAt,
  };
}

export function parseSubmitPracticeRpcResult(
  value: unknown,
): SubmitPracticeResult | null {
  if (!isRecord(value)) return null;
  const steps = parseStringArray(value.solution_steps, 2);
  const xp = parseAnswerXpProjection(value.xp);

  if (
    typeof value.is_correct !== "boolean" ||
    !isNonEmptyString(value.correct_answer) ||
    !steps ||
    !isNonEmptyString(value.explanation) ||
    !isNonEmptyString(value.hint) ||
    !isIntegerInRange(
      value.answered_count,
      0,
      PRACTICE_MAX_QUESTIONS_PER_UNIT,
    ) ||
    !isIntegerInRange(value.correct_count, 0, value.answered_count) ||
    typeof value.completed !== "boolean"
    || !xp
  ) {
    return null;
  }

  return {
    isCorrect: value.is_correct,
    correctAnswer: value.correct_answer,
    solutionSteps: steps,
    explanation: value.explanation,
    hint: value.hint,
    answeredCount: value.answered_count,
    correctCount: value.correct_count,
    completed: value.completed,
    xp,
  };
}

function parseReviewAnswerRpcResult(
  value: unknown,
): PracticeReviewAnswer | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.question_id) ||
    !isQuestionType(value.question_type) ||
    !isNonEmptyString(value.prompt) ||
    !isSkillCode(value.skill_code) ||
    !isNonEmptyString(value.student_answer) ||
    typeof value.is_correct !== "boolean" ||
    !isNonEmptyString(value.correct_answer) ||
    !isNonEmptyString(value.explanation) ||
    !isNonEmptyString(value.hint) ||
    !isNonEmptyString(value.answered_at)
  ) {
    return null;
  }

  const options =
    value.question_type === "MULTIPLE_CHOICE"
      ? parseQuestionOptions(value.options)
      : null;
  const visualSpec =
    value.visual_spec === undefined || value.visual_spec === null
      ? null
      : parsePracticeVisualSpec(value.visual_spec);
  const steps = parseStringArray(value.solution_steps, 2);
  if (
    !steps ||
    (value.question_type === "MULTIPLE_CHOICE" && !options) ||
    (value.question_type === "NUMBER_INPUT" && value.options !== null) ||
    (value.visual_spec !== undefined &&
      value.visual_spec !== null &&
      !visualSpec)
  ) {
    return null;
  }

  return {
    questionId: value.question_id,
    questionType: value.question_type,
    prompt: value.prompt,
    options,
    visualSpec,
    skillCode: value.skill_code,
    studentAnswer: value.student_answer,
    isCorrect: value.is_correct,
    correctAnswer: value.correct_answer,
    solutionSteps: steps,
    explanation: value.explanation,
    hint: value.hint,
    answeredAt: value.answered_at,
  };
}

export function parsePracticeReviewRpcResult(
  value: unknown,
): PracticeReview | null {
  if (!isRecord(value) || !Array.isArray(value.answers)) return null;
  const totalQuestions = value.total_questions;

  const answers: PracticeReviewAnswer[] = [];
  for (const answer of value.answers) {
    const parsed = parseReviewAnswerRpcResult(answer);
    if (!parsed) return null;
    answers.push(parsed);
  }

  if (
    !isUuid(value.attempt_id) ||
    !isNonEmptyString(value.unit_slug) ||
    !isAttemptStatus(value.status) ||
    !isIntegerInRange(
      totalQuestions,
      PRACTICE_MIN_QUESTIONS_PER_UNIT,
      PRACTICE_MAX_QUESTIONS_PER_UNIT,
    ) ||
    !isIntegerInRange(value.answered_count, 0, totalQuestions) ||
    !isIntegerInRange(value.correct_count, 0, value.answered_count) ||
    answers.length !== value.answered_count ||
    new Set(answers.map((answer) => answer.questionId)).size !== answers.length ||
    !isNonEmptyString(value.started_at) ||
    !(
      value.completed_at === null || isNonEmptyString(value.completed_at)
    ) ||
    (value.status === "IN_PROGRESS" &&
      (value.answered_count >= totalQuestions ||
        value.completed_at !== null)) ||
    (value.status === "COMPLETED" &&
      (value.answered_count !== totalQuestions ||
        value.completed_at === null))
  ) {
    return null;
  }

  return {
    attemptId: value.attempt_id,
    unitSlug: value.unit_slug,
    status: value.status,
    totalQuestions,
    answeredCount: value.answered_count,
    correctCount: value.correct_count,
    startedAt: value.started_at,
    completedAt: value.completed_at,
    answers,
  };
}

function parseCanonicalStartPracticeResult(
  value: unknown,
): StartPracticeResult | null {
  if (!isRecord(value)) return null;

  return parseStartPracticeRpcResult({
    attempt_id: value.id,
    unit_slug: value.unitSlug,
    status: value.status,
    question_order: value.questionOrder,
    total_questions: value.totalQuestions,
    answered_count: value.answeredCount,
    correct_count: value.correctCount,
    started_at: value.startedAt,
  });
}

function parseCanonicalSubmitPracticeResult(
  value: unknown,
): SubmitPracticeResult | null {
  if (!isRecord(value)) return null;
  const result = parseSubmitPracticeRpcResult({
    is_correct: value.isCorrect,
    correct_answer: value.correctAnswer,
    solution_steps: value.solutionSteps,
    explanation: value.explanation,
    hint: value.hint,
    answered_count: value.answeredCount,
    correct_count: value.correctCount,
    completed: value.completed,
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
  const xpCompletion =
    value.xpCompletion === null || value.xpCompletion === undefined
      ? null
      : parseXpCompletionProjection(value.xpCompletion);
  if (
    !result ||
    (value.xpCompletion !== null &&
      value.xpCompletion !== undefined &&
      xpCompletion === null) ||
    (result.completed && xpCompletion === null)
  ) {
    return null;
  }
  return { ...result, xpCompletion };
}

function parseCanonicalReviewAnswer(
  value: unknown,
): PracticeReviewAnswer | null {
  if (!isRecord(value)) return null;

  return parseReviewAnswerRpcResult({
    question_id: value.questionId,
    question_type: value.questionType,
    prompt: value.prompt,
    options: value.options,
    visual_spec: value.visualSpec,
    skill_code: value.skillCode,
    student_answer: value.studentAnswer,
    is_correct: value.isCorrect,
    correct_answer: value.correctAnswer,
    solution_steps: value.solutionSteps,
    explanation: value.explanation,
    hint: value.hint,
    answered_at: value.answeredAt,
  });
}

export function parseStartPracticeApiResponse(
  value: unknown,
): PracticeApiSuccess<StartPracticeResult> | null {
  if (!isRecord(value) || value.ok !== true || !("data" in value)) {
    return null;
  }

  const data = parseCanonicalStartPracticeResult(value.data);
  return data ? { ok: true, data } : null;
}

export function parseSubmitPracticeApiResponse(
  value: unknown,
): PracticeApiSuccess<SubmitPracticeResult> | null {
  if (!isRecord(value) || value.ok !== true || !("data" in value)) {
    return null;
  }

  const data = parseCanonicalSubmitPracticeResult(value.data);
  return data ? { ok: true, data } : null;
}

export function parseStartPracticeStateApiResponse(
  value: unknown,
): PracticeApiSuccess<StartPracticeState> | null {
  if (
    !isRecord(value) ||
    value.ok !== true ||
    !isRecord(value.data) ||
    !("attempt" in value.data)
  ) {
    return null;
  }

  if (value.data.attempt === null) {
    return { ok: true, data: { attempt: null } };
  }

  const attempt = parseCanonicalStartPracticeResult(value.data.attempt);
  return attempt ? { ok: true, data: { attempt } } : null;
}

export function parsePracticeAnswerStateApiResponse(
  value: unknown,
): PracticeApiSuccess<PracticeAnswerState> | null {
  if (
    !isRecord(value) ||
    value.ok !== true ||
    !isRecord(value.data) ||
    !("answer" in value.data) ||
    !isIntegerInRange(
      value.data.answeredCount,
      0,
      PRACTICE_MAX_QUESTIONS_PER_UNIT,
    ) ||
    !isIntegerInRange(
      value.data.correctCount,
      0,
      value.data.answeredCount,
    ) ||
    typeof value.data.completed !== "boolean"
  ) {
    return null;
  }

  const xpCompletion =
    value.data.xpCompletion === null || value.data.xpCompletion === undefined
      ? null
      : parseXpCompletionProjection(value.data.xpCompletion);
  if (
    (value.data.xpCompletion !== null &&
      value.data.xpCompletion !== undefined &&
      xpCompletion === null) ||
    (value.data.completed && xpCompletion === null)
  ) {
    return null;
  }

  if (value.data.answer === null) {
    return {
      ok: true,
      data: {
        answer: null,
        answeredCount: value.data.answeredCount,
        correctCount: value.data.correctCount,
        completed: value.data.completed,
        xpCompletion,
      },
    };
  }

  const answer = parseCanonicalReviewAnswer(value.data.answer);
  if (!answer) return null;

  return {
    ok: true,
    data: {
      answer,
      answeredCount: value.data.answeredCount,
      correctCount: value.data.correctCount,
      completed: value.data.completed,
      xpCompletion,
    },
  };
}

function isSafePracticeErrorCode(
  value: unknown,
): value is SafePracticeErrorCode {
  return (
    value === "AUTH_REQUIRED" ||
    value === "ACCESS_DENIED" ||
    value === "INVALID_REQUEST" ||
    value === "INVALID_ANSWER" ||
    value === "PREREQUISITE_REQUIRED" ||
    value === "UNIT_UNAVAILABLE" ||
    value === "PRACTICE_UNAVAILABLE" ||
    value === "QUESTION_UNAVAILABLE" ||
    value === "REQUEST_FAILED"
  );
}

export function parsePracticeApiError(
  value: unknown,
): PracticeApiError | null {
  if (!isRecord(value) || value.ok !== false || !isRecord(value.error)) {
    return null;
  }

  if (
    !isSafePracticeErrorCode(value.error.code) ||
    !isNonEmptyString(value.error.message)
  ) {
    return null;
  }

  return {
    ok: false,
    error: {
      code: value.error.code,
      message: value.error.message,
    },
  };
}
