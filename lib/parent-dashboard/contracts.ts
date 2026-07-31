import {
  skillCodes as practiceSkillCodes,
  isSkillCode as isPracticeSkillCode,
} from "../practice/contracts.ts";

export const PARENT_SKILL_CODES = [
  "COUNT_RECOGNIZE",
  "READ_WRITE_MATCH",
  "SEQUENCE_COMPARE_ORDER",
  "COMPOSE_DECOMPOSE",
] as const;

export const PARENT_SUPPORTED_SKILL_CODES = practiceSkillCodes;

export type ParentSkillCode = string;

export const PARENT_SKILL_LABELS: Record<string, string> = {
  COUNT_RECOGNIZE: "Đếm và nhận biết số",
  READ_WRITE_MATCH: "Đọc, viết và ghép số",
  SEQUENCE_COMPARE_ORDER: "Thứ tự và so sánh",
  COMPOSE_DECOMPOSE: "Tách và gộp số",
  ADDITION_MEANING: "Ý nghĩa của phép cộng",
  ADDITION_CALCULATION: "Tính tổng trong phạm vi 10",
  NUMBER_BONDS: "Các cách tạo thành một số",
  ONE_STEP_WORD_PROBLEM: "Bài toán cộng có lời văn",
  SUBTRACTION_MEANING: "Ý nghĩa của phép trừ",
  SUBTRACTION_CALCULATION: "Tính hiệu trong phạm vi 10",
  ADDITION_SUBTRACTION_RELATION: "Liên hệ cộng và trừ",
  ONE_STEP_SUBTRACTION_WORD_PROBLEM: "Bài toán trừ có lời văn",
  COUNT_READ_WRITE_TO_20: "Đếm, đọc và viết số đến 20",
  SEQUENCE_TO_20: "Dãy số đến 20",
  COMPARE_ORDER_TO_20: "So sánh và sắp xếp",
  TENS_ONES_TO_20: "Chục và đơn vị",
  ADD_TEN_AND_ONES: "Cộng 10 và các đơn vị",
  ADD_TEEN_AND_ONES_NO_CARRY:
    "Cộng số có hai chữ số với số có một chữ số",
  ADD_USING_TENS_ONES: "Cộng theo chục và đơn vị",
  ONE_STEP_ADDITION_TO_20: "Bài toán cộng đến 20",
  SUBTRACTION_WITHIN_20_NO_BORROW:
    "Trừ trong phạm vi 20 không mượn",
  MISSING_NUMBER_SUBTRACTION: "Tìm số còn thiếu trong phép trừ",
  SUBTRACTION_WORD_PROBLEM: "Bài toán trừ đến 20",
  COUNT_RECOGNIZE_TO_100: "Đếm và nhận biết số đến 100",
  READ_WRITE_TO_100: "Đọc và viết số đến 100",
  TENS_ONES_COMPOSE: "Chục, đơn vị và cấu tạo số",
  COMPARE_ORDER_TO_100: "So sánh, sắp xếp và số liền kề",
  ADD_TENS_WITHIN_100: "Cộng các số tròn chục",
  ADD_TWO_DIGIT_NO_CARRY: "Cộng số có hai chữ số không nhớ",
  MISSING_NUMBER_ADDITION_100: "Tìm số còn thiếu trong phép cộng",
  ADDITION_WORD_PROBLEM_100: "Bài toán cộng trong phạm vi 100",
  SUBTRACT_TENS_WITHIN_100: "Trừ các số tròn chục",
  SUBTRACT_TWO_DIGIT_NO_BORROW:
    "Trừ số có hai chữ số không mượn",
  MISSING_NUMBER_SUBTRACTION_100:
    "Tìm số còn thiếu trong phép trừ",
  SUBTRACTION_WORD_PROBLEM_100:
    "Bài toán trừ trong phạm vi 100",
  RECOGNIZE_BASIC_SHAPES: "Nhận biết các hình cơ bản",
  COMPARE_AND_SORT_SHAPES: "So sánh và phân loại hình",
  POSITION_RELATIONS: "Nhận biết vị trí",
  COUNT_SHAPES_IN_PICTURE: "Đếm hình trong minh họa",
  COMPARE_LENGTHS: "So sánh độ dài",
  ORDER_BY_LENGTH: "Sắp xếp theo độ dài",
  MEASURE_WITH_EQUAL_UNITS: "Đo bằng đơn vị bằng nhau",
  READ_SIMPLE_MEASUREMENT: "Đọc phép đo đơn giản",
  READ_WHOLE_HOURS: "Đọc giờ đúng",
  ORDER_DAILY_EVENTS: "Sắp xếp hoạt động trong ngày",
  DAYS_OF_WEEK: "Các ngày trong tuần",
  READ_SIMPLE_CALENDAR: "Đọc lịch đơn giản",
  CUBE_RECOGNITION: "Nhận biết khối lập phương",
  CUBOID_RECOGNITION: "Nhận biết khối hộp chữ nhật",
  REAL_OBJECT_CLASSIFICATION: "Phân loại đồ vật theo hình khối",
  SIMPLE_BLOCK_COMPOSITION: "Ghép và đếm các khối đơn giản",
  NUMBER_RECOGNITION_TO_1000: "Nhận biết số trong phạm vi 1000",
  READ_WRITE_TO_1000: "Đọc và viết số trong phạm vi 1000",
  PLACE_VALUE_TO_1000: "Hàng trăm, chục và đơn vị",
  SEQUENCE_TO_1000: "So sánh và sắp xếp số đến 1000",
};

export function getParentSkillLabel(skillCode: ParentSkillCode) {
  return PARENT_SKILL_LABELS[skillCode] ?? "Kỹ năng đang được cập nhật";
}

export type ParentLearningSkill = {
  skillCode: ParentSkillCode;
  answeredCount: number;
  correctCount: number;
  accuracyPercent: number | null;
};

export type ParentCurrentPractice = {
  unitTitle: string;
  answeredCount: number;
  totalQuestions: number;
  correctCount: number;
  updatedAt: string;
};

export type ParentRecentAttempt = {
  unitTitle: string;
  attemptNumber: number;
  status: "IN_PROGRESS" | "COMPLETED";
  answeredCount: number;
  totalQuestions: number;
  correctCount: number;
  accuracyPercent: number | null;
  activityAt: string;
  completedAt: string | null;
};

export type ParentLearningGoal = {
  title: string;
  targetCount: number;
  targetDate: string | null;
  status: "ACTIVE" | "COMPLETED";
  completedAt: string | null;
};

export type ParentChildLearningDashboard = {
  student: {
    displayName: string;
    grade: number;
  };
  summary: {
    completedAttemptCount: number;
    totalAnswered: number;
    totalCorrect: number;
    averageAccuracyPercent: number | null;
    lastActivityAt: string | null;
  };
  currentPractice: ParentCurrentPractice | null;
  skills: ParentLearningSkill[];
  recentAttempts: ParentRecentAttempt[];
  goals: ParentLearningGoal[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
) {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isPercentage(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function isOptionalTimestamp(value: unknown): value is string | null {
  return value === null || isTimestamp(value);
}

function isOptionalDate(value: unknown): value is string | null {
  return (
    value === null ||
    (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
  );
}

export function parseParentSkillCode(
  value: unknown,
): ParentSkillCode | null {
  return isPracticeSkillCode(value) ? value : null;
}

function parseCurrentPractice(value: unknown): ParentCurrentPractice | null {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "unit_title",
      "answered_count",
      "total_questions",
      "correct_count",
      "updated_at",
    ]) ||
    typeof value.unit_title !== "string" ||
    value.unit_title.trim().length < 3 ||
    !isNonNegativeInteger(value.answered_count) ||
    !isPositiveInteger(value.total_questions) ||
    Number(value.answered_count) > Number(value.total_questions) ||
    !isNonNegativeInteger(value.correct_count) ||
    Number(value.correct_count) > Number(value.answered_count) ||
    !isTimestamp(value.updated_at)
  ) {
    return null;
  }

  return {
    unitTitle: value.unit_title,
    answeredCount: value.answered_count,
    totalQuestions: value.total_questions,
    correctCount: value.correct_count,
    updatedAt: value.updated_at,
  };
}

function parseSkills(value: unknown): ParentLearningSkill[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > 100
  ) {
    return null;
  }

  const skills: ParentLearningSkill[] = [];
  const seenCodes = new Set<ParentSkillCode>();
  for (const item of value) {
    const skillCode = parseParentSkillCode(
      isRecord(item) ? item.skill_code : null,
    );
    if (
      !isRecord(item) ||
      !hasOnlyKeys(item, [
        "skill_code",
        "answered_count",
        "correct_count",
        "accuracy_percent",
      ]) ||
      !skillCode ||
      seenCodes.has(skillCode) ||
      !isNonNegativeInteger(item.answered_count) ||
      !isNonNegativeInteger(item.correct_count) ||
      Number(item.correct_count) > Number(item.answered_count) ||
      (item.accuracy_percent !== null &&
        !isPercentage(item.accuracy_percent)) ||
      (Number(item.answered_count) === 0
        ? item.accuracy_percent !== null
        : item.accuracy_percent === null)
    ) {
      return null;
    }

    seenCodes.add(skillCode);
    skills.push({
      skillCode,
      answeredCount: item.answered_count,
      correctCount: item.correct_count,
      accuracyPercent: item.accuracy_percent,
    });
  }

  return skills;
}

function parseRecentAttempts(value: unknown): ParentRecentAttempt[] | null {
  if (!Array.isArray(value) || value.length > 5) return null;

  const attempts: ParentRecentAttempt[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      !hasOnlyKeys(item, [
        "unit_title",
        "attempt_number",
        "status",
        "answered_count",
        "total_questions",
        "correct_count",
        "accuracy_percent",
        "activity_at",
        "completed_at",
      ]) ||
      typeof item.unit_title !== "string" ||
      item.unit_title.trim().length < 3 ||
      !isPositiveInteger(item.attempt_number) ||
      (item.status !== "IN_PROGRESS" && item.status !== "COMPLETED") ||
      !isNonNegativeInteger(item.answered_count) ||
      !isPositiveInteger(item.total_questions) ||
      Number(item.answered_count) > Number(item.total_questions) ||
      !isNonNegativeInteger(item.correct_count) ||
      Number(item.correct_count) > Number(item.answered_count) ||
      (item.accuracy_percent !== null &&
        !isPercentage(item.accuracy_percent)) ||
      (Number(item.answered_count) === 0
        ? item.accuracy_percent !== null
        : item.accuracy_percent === null) ||
      !isTimestamp(item.activity_at) ||
      !isOptionalTimestamp(item.completed_at) ||
      (item.status === "COMPLETED"
        ? item.completed_at === null ||
          Number(item.answered_count) !== Number(item.total_questions)
        : item.completed_at !== null)
    ) {
      return null;
    }

    attempts.push({
      unitTitle: item.unit_title,
      attemptNumber: item.attempt_number,
      status: item.status,
      answeredCount: item.answered_count,
      totalQuestions: item.total_questions,
      correctCount: item.correct_count,
      accuracyPercent: item.accuracy_percent,
      activityAt: item.activity_at,
      completedAt: item.completed_at,
    });
  }

  return attempts;
}

function parseGoals(value: unknown): ParentLearningGoal[] | null {
  if (!Array.isArray(value)) return null;

  const goals: ParentLearningGoal[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      !hasOnlyKeys(item, [
        "title",
        "target_count",
        "target_date",
        "status",
        "completed_at",
      ]) ||
      typeof item.title !== "string" ||
      item.title.trim().length < 3 ||
      !isPositiveInteger(item.target_count) ||
      Number(item.target_count) > 500 ||
      !isOptionalDate(item.target_date) ||
      (item.status !== "ACTIVE" && item.status !== "COMPLETED") ||
      !isOptionalTimestamp(item.completed_at) ||
      (item.status === "ACTIVE"
        ? item.completed_at !== null
        : item.completed_at === null)
    ) {
      return null;
    }

    goals.push({
      title: item.title,
      targetCount: item.target_count,
      targetDate: item.target_date,
      status: item.status,
      completedAt: item.completed_at,
    });
  }

  return goals;
}

export function parseParentChildLearningDashboard(
  value: unknown,
): ParentChildLearningDashboard | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "student",
      "summary",
      "current_practice",
      "skills",
      "recent_attempts",
      "goals",
    ]) ||
    !isRecord(value.student) ||
    !hasOnlyKeys(value.student, ["display_name", "grade"]) ||
    typeof value.student.display_name !== "string" ||
    value.student.display_name.trim().length < 2 ||
    !Number.isInteger(value.student.grade) ||
    Number(value.student.grade) < 1 ||
    Number(value.student.grade) > 9 ||
    !isRecord(value.summary) ||
    !hasOnlyKeys(value.summary, [
      "completed_attempt_count",
      "total_answered",
      "total_correct",
      "average_accuracy_percent",
      "last_activity_at",
    ]) ||
    !isNonNegativeInteger(value.summary.completed_attempt_count) ||
    !isNonNegativeInteger(value.summary.total_answered) ||
    !isNonNegativeInteger(value.summary.total_correct) ||
    Number(value.summary.total_correct) >
      Number(value.summary.total_answered) ||
    (value.summary.average_accuracy_percent !== null &&
      !isPercentage(value.summary.average_accuracy_percent)) ||
    (Number(value.summary.total_answered) === 0
      ? value.summary.average_accuracy_percent !== null
      : value.summary.average_accuracy_percent === null) ||
    !isOptionalTimestamp(value.summary.last_activity_at)
  ) {
    return null;
  }

  const currentPractice = parseCurrentPractice(value.current_practice);
  if (value.current_practice !== null && !currentPractice) return null;

  const skills = parseSkills(value.skills);
  const recentAttempts = parseRecentAttempts(value.recent_attempts);
  const goals = parseGoals(value.goals);
  if (!skills || !recentAttempts || !goals) return null;

  return {
    student: {
      displayName: value.student.display_name,
      grade: Number(value.student.grade),
    },
    summary: {
      completedAttemptCount: value.summary.completed_attempt_count,
      totalAnswered: value.summary.total_answered,
      totalCorrect: value.summary.total_correct,
      averageAccuracyPercent: value.summary.average_accuracy_percent,
      lastActivityAt: value.summary.last_activity_at,
    },
    currentPractice,
    skills,
    recentAttempts,
    goals,
  };
}
