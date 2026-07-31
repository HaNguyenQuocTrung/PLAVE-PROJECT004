export const curriculumAssignmentDomains = [
  "NUMBERS_AND_OPERATIONS",
  "ALGEBRA_AND_PREALGEBRA",
  "GEOMETRY",
  "MEASUREMENT",
  "STATISTICS_AND_PROBABILITY",
  "APPLIED_PROBLEM_SOLVING",
] as const;

export type CurriculumAssignmentDomain =
  (typeof curriculumAssignmentDomains)[number];
export type CurriculumAssignmentSelectionMode =
  | "DETERMINISTIC"
  | "MANUAL";

export type TeacherCurriculumUnit = {
  unitId: string;
  title: string;
  domain: CurriculumAssignmentDomain;
  officialOutcomeIds: string[];
  skillIds: string[];
  totalQuestions: number;
};

export type TeacherCurriculumQuestion = {
  questionId: string;
  unitId: string;
  unitTitle: string;
  domain: CurriculumAssignmentDomain;
  answerType: "MULTIPLE_CHOICE" | "NUMBER_INPUT" | "TEXT_INPUT";
  prompt: string;
  options: { key: "A" | "B" | "C" | "D"; label: string }[] | null;
  visual: Record<string, unknown>;
  cognitiveLevel: "UNDERSTAND" | "APPLY" | "REASON";
  officialOutcomeIds: string[];
  officialOutcomeTitles: string[];
  skillId: string;
  skillTitle: string;
};

export type TeacherCurriculumCatalog = {
  releaseId: string;
  grade: number;
  units: TeacherCurriculumUnit[];
  questions: TeacherCurriculumQuestion[];
  totalQuestions: number;
  limit: number;
  offset: number;
};

export type CreateCurriculumAssignmentDraftInput = {
  classroomId: string;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  selectionMode: CurriculumAssignmentSelectionMode;
  unitId: string | null;
  outcomeId: string | null;
  skillId: string | null;
  questionIds: string[] | null;
  questionCount: number;
  deterministicSeed: string;
  requestId: string;
};

export type TeacherCurriculumDraft = {
  draftId: string;
  status: "DRAFT" | "PUBLISHED";
  classroomId: string;
  grade: number;
  title: string;
  itemCount: number;
  selectionMode: CurriculumAssignmentSelectionMode;
  snapshotHash: string;
  publishedAssignmentId: string | null;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

function isSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 3 &&
    value.length <= 160 &&
    slugPattern.test(value)
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        typeof item === "string" &&
        item.trim() === item &&
        item.length > 0 &&
        item.length <= 1000,
    )
  );
}

function parseOptions(
  value: unknown,
): TeacherCurriculumQuestion["options"] | undefined {
  if (value === null) return null;
  if (!Array.isArray(value) || value.length !== 4) return undefined;
  const parsed = value.map((option) => {
    if (
      !isRecord(option) ||
      !["A", "B", "C", "D"].includes(String(option.key)) ||
      typeof option.label !== "string" ||
      option.label.length < 1 ||
      option.label.length > 500
    ) {
      return null;
    }
    return {
      key: option.key as "A" | "B" | "C" | "D",
      label: option.label,
    };
  });
  return parsed.every(
    (option): option is NonNullable<
      TeacherCurriculumQuestion["options"]
    >[number] => option !== null,
  )
    ? parsed
    : undefined;
}

export function parseTeacherCurriculumCatalog(
  value: unknown,
): TeacherCurriculumCatalog | null {
  if (
    !isRecord(value) ||
    typeof value.release_id !== "string" ||
    typeof value.grade !== "number" ||
    !Number.isInteger(value.grade) ||
    value.grade < 1 ||
    value.grade > 9 ||
    !Array.isArray(value.units) ||
    !Array.isArray(value.questions) ||
    typeof value.total_questions !== "number" ||
    typeof value.limit !== "number" ||
    typeof value.offset !== "number"
  ) {
    return null;
  }
  const units = value.units.map((unit) => {
    if (
      !isRecord(unit) ||
      !isSlug(unit.unit_id) ||
      typeof unit.title !== "string" ||
      !curriculumAssignmentDomains.includes(
        unit.domain as CurriculumAssignmentDomain,
      ) ||
      !isStringArray(unit.official_outcome_ids) ||
      !isStringArray(unit.skill_ids) ||
      typeof unit.total_questions !== "number"
    ) {
      return null;
    }
    return {
      unitId: unit.unit_id,
      title: unit.title,
      domain: unit.domain as CurriculumAssignmentDomain,
      officialOutcomeIds: unit.official_outcome_ids,
      skillIds: unit.skill_ids,
      totalQuestions: unit.total_questions,
    };
  });
  const questions = value.questions.map((question) => {
    if (
      !isRecord(question) ||
      !isSlug(question.question_id) ||
      !isSlug(question.unit_id) ||
      typeof question.unit_title !== "string" ||
      !curriculumAssignmentDomains.includes(
        question.domain as CurriculumAssignmentDomain,
      ) ||
      !["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"].includes(
        String(question.answer_type),
      ) ||
      typeof question.prompt !== "string" ||
      !["UNDERSTAND", "APPLY", "REASON"].includes(
        String(question.cognitive_level),
      ) ||
      !isStringArray(question.official_outcome_ids) ||
      !isStringArray(question.official_outcome_titles) ||
      question.official_outcome_ids.length !==
        question.official_outcome_titles.length ||
      typeof question.skill_id !== "string" ||
      typeof question.skill_title !== "string" ||
      !isRecord(question.visual)
    ) {
      return null;
    }
    const options = parseOptions(question.options);
    if (options === undefined) return null;
    return {
      questionId: question.question_id,
      unitId: question.unit_id,
      unitTitle: question.unit_title,
      domain: question.domain as CurriculumAssignmentDomain,
      answerType:
        question.answer_type as TeacherCurriculumQuestion["answerType"],
      prompt: question.prompt,
      options,
      visual: question.visual,
      cognitiveLevel:
        question.cognitive_level as TeacherCurriculumQuestion["cognitiveLevel"],
      officialOutcomeIds: question.official_outcome_ids,
      officialOutcomeTitles: question.official_outcome_titles,
      skillId: question.skill_id,
      skillTitle: question.skill_title,
    };
  });
  if (
    units.some((unit) => unit === null) ||
    questions.some((question) => question === null)
  ) {
    return null;
  }
  return {
    releaseId: value.release_id,
    grade: value.grade,
    units: units as TeacherCurriculumUnit[],
    questions: questions as TeacherCurriculumQuestion[],
    totalQuestions: value.total_questions,
    limit: value.limit,
    offset: value.offset,
  };
}

export function parseCreateCurriculumAssignmentDraftInput(
  value: unknown,
): CreateCurriculumAssignmentDraftInput | null {
  if (
    !isRecord(value) ||
    !isUuid(value.classroomId) ||
    typeof value.title !== "string" ||
    value.title.trim() !== value.title ||
    value.title.length < 3 ||
    value.title.length > 120 ||
    !(
      value.instructions === null ||
      (typeof value.instructions === "string" &&
        value.instructions.trim() === value.instructions &&
        value.instructions.length >= 1 &&
        value.instructions.length <= 1000)
    ) ||
    !(
      value.dueAt === null ||
      (typeof value.dueAt === "string" &&
        !Number.isNaN(Date.parse(value.dueAt)))
    ) ||
    !["DETERMINISTIC", "MANUAL"].includes(String(value.selectionMode)) ||
    !(value.unitId === null || isSlug(value.unitId)) ||
    !(value.outcomeId === null || typeof value.outcomeId === "string") ||
    !(value.skillId === null || typeof value.skillId === "string") ||
    !(
      value.questionIds === null ||
      (Array.isArray(value.questionIds) &&
        value.questionIds.every(isSlug) &&
        new Set(value.questionIds).size === value.questionIds.length)
    ) ||
    typeof value.questionCount !== "number" ||
    !Number.isInteger(value.questionCount) ||
    value.questionCount < 1 ||
    value.questionCount > 50 ||
    typeof value.deterministicSeed !== "string" ||
    value.deterministicSeed.length < 4 ||
    value.deterministicSeed.length > 100 ||
    !isUuid(value.requestId)
  ) {
    return null;
  }
  if (
    value.selectionMode === "MANUAL" &&
    (!value.questionIds ||
      value.questionIds.length !== value.questionCount)
  ) {
    return null;
  }
  if (
    value.selectionMode === "DETERMINISTIC" &&
    (value.questionIds !== null ||
      (value.unitId === null &&
        value.outcomeId === null &&
        value.skillId === null))
  ) {
    return null;
  }
  return value as CreateCurriculumAssignmentDraftInput;
}

export function parseTeacherCurriculumDraft(
  value: unknown,
): TeacherCurriculumDraft | null {
  if (
    !isRecord(value) ||
    !isUuid(value.draft_id) ||
    !["DRAFT", "PUBLISHED"].includes(String(value.status)) ||
    !isUuid(value.classroom_id) ||
    typeof value.grade !== "number" ||
    !Number.isInteger(value.grade) ||
    value.grade < 1 ||
    value.grade > 9 ||
    typeof value.title !== "string" ||
    typeof value.item_count !== "number" ||
    !Number.isInteger(value.item_count) ||
    value.item_count < 1 ||
    value.item_count > 50 ||
    !["DETERMINISTIC", "MANUAL"].includes(String(value.selection_mode)) ||
    typeof value.snapshot_hash !== "string" ||
    !/^[0-9a-f]{64}$/.test(value.snapshot_hash) ||
    !(value.published_assignment_id === null ||
      isUuid(value.published_assignment_id))
  ) {
    return null;
  }
  return {
    draftId: value.draft_id,
    status: value.status as TeacherCurriculumDraft["status"],
    classroomId: value.classroom_id,
    grade: value.grade,
    title: value.title,
    itemCount: value.item_count,
    selectionMode:
      value.selection_mode as CurriculumAssignmentSelectionMode,
    snapshotHash: value.snapshot_hash,
    publishedAssignmentId: value.published_assignment_id,
  };
}
