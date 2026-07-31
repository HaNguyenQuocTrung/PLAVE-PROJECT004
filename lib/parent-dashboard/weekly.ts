import {
  PARENT_SUPPORTED_SKILL_CODES,
  getParentSkillLabel,
  parseParentSkillCode,
  type ParentSkillCode,
} from "./contracts.ts";

export type ParentWeeklySkill = {
  skillCode: ParentSkillCode;
  answeredCount: number;
  correctCount: number;
  accuracyPercent: number | null;
};

export type ParentWeeklySummary = {
  period: {
    timezone: "Asia/Ho_Chi_Minh";
    startDate: string;
    endDate: string;
  };
  metrics: {
    completedAttemptCount: number;
    totalAnswered: number;
    totalCorrect: number;
    accuracyPercent: number | null;
    activeDayCount: number;
    completedGoalCount: number;
    lastActivityAt: string | null;
  };
  skills: ParentWeeklySkill[];
};

export type ParentWeeklySkillInsights = {
  bestSkill: ParentWeeklySkill | null;
  reviewSkill: ParentWeeklySkill | null;
  message: string;
};

const MINIMUM_SKILL_ANSWERS = 3;
const GOOD_SKILL_THRESHOLD = 80;

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

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function parseWeeklySkills(value: unknown): ParentWeeklySkill[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > 100
  ) {
    return null;
  }

  const skills: ParentWeeklySkill[] = [];
  const seenCodes = new Set<ParentSkillCode>();
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
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

export function parseParentWeeklySummary(
  value: unknown,
): ParentWeeklySummary | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["period", "metrics", "skills"]) ||
    !isRecord(value.period) ||
    !hasOnlyKeys(value.period, [
      "timezone",
      "start_date",
      "end_date",
    ]) ||
    value.period.timezone !== "Asia/Ho_Chi_Minh" ||
    !isCalendarDate(value.period.start_date) ||
    !isCalendarDate(value.period.end_date) ||
    !isRecord(value.metrics) ||
    !hasOnlyKeys(value.metrics, [
      "completed_attempt_count",
      "total_answered",
      "total_correct",
      "accuracy_percent",
      "active_day_count",
      "completed_goal_count",
      "last_activity_at",
    ]) ||
    !isNonNegativeInteger(value.metrics.completed_attempt_count) ||
    !isNonNegativeInteger(value.metrics.total_answered) ||
    !isNonNegativeInteger(value.metrics.total_correct) ||
    Number(value.metrics.total_correct) >
      Number(value.metrics.total_answered) ||
    (value.metrics.accuracy_percent !== null &&
      !isPercentage(value.metrics.accuracy_percent)) ||
    (Number(value.metrics.total_answered) === 0
      ? value.metrics.accuracy_percent !== null
      : value.metrics.accuracy_percent === null) ||
    !isNonNegativeInteger(value.metrics.active_day_count) ||
    Number(value.metrics.active_day_count) > 7 ||
    !isNonNegativeInteger(value.metrics.completed_goal_count) ||
    (value.metrics.last_activity_at !== null &&
      !isTimestamp(value.metrics.last_activity_at))
  ) {
    return null;
  }

  const startDate = new Date(`${value.period.start_date}T00:00:00Z`);
  const endDate = new Date(`${value.period.end_date}T00:00:00Z`);
  if (
    endDate.getTime() - startDate.getTime() !==
    6 * 24 * 60 * 60 * 1000
  ) {
    return null;
  }

  const skills = parseWeeklySkills(value.skills);
  if (!skills) {
    return null;
  }

  return {
    period: {
      timezone: "Asia/Ho_Chi_Minh",
      startDate: value.period.start_date,
      endDate: value.period.end_date,
    },
    metrics: {
      completedAttemptCount: value.metrics.completed_attempt_count,
      totalAnswered: value.metrics.total_answered,
      totalCorrect: value.metrics.total_correct,
      accuracyPercent: value.metrics.accuracy_percent,
      activeDayCount: value.metrics.active_day_count,
      completedGoalCount: value.metrics.completed_goal_count,
      lastActivityAt: value.metrics.last_activity_at,
    },
    skills,
  };
}

function skillOrder(skill: ParentWeeklySkill) {
  const knownIndex = PARENT_SUPPORTED_SKILL_CODES.indexOf(
    skill.skillCode as (typeof PARENT_SUPPORTED_SKILL_CODES)[number],
  );
  return knownIndex === -1
    ? PARENT_SUPPORTED_SKILL_CODES.length
    : knownIndex;
}

export function getParentWeeklySkillInsights(
  summary: ParentWeeklySummary,
): ParentWeeklySkillInsights {
  const eligibleSkills = summary.skills.filter(
    (skill) => skill.answeredCount >= MINIMUM_SKILL_ANSWERS,
  );

  if (eligibleSkills.length === 0) {
    return {
      bestSkill: null,
      reviewSkill: null,
      message: "Chưa đủ dữ liệu để đánh giá kỹ năng.",
    };
  }

  const bestSkill = [...eligibleSkills].sort((left, right) => {
    const accuracyDifference =
      Number(right.accuracyPercent) - Number(left.accuracyPercent);
    return accuracyDifference || skillOrder(left) - skillOrder(right);
  })[0];

  const reviewSkill =
    [...eligibleSkills]
      .filter(
        (skill) =>
          skill.skillCode !== bestSkill.skillCode &&
          Number(skill.accuracyPercent) < GOOD_SKILL_THRESHOLD,
      )
      .sort((left, right) => {
        const accuracyDifference =
          Number(left.accuracyPercent) - Number(right.accuracyPercent);
        return accuracyDifference || skillOrder(left) - skillOrder(right);
      })[0] ?? null;

  if (reviewSkill) {
    return {
      bestSkill,
      reviewSkill,
      message: `Em làm tốt phần ${getParentSkillLabel(bestSkill.skillCode)}, đồng thời nên ôn thêm phần ${getParentSkillLabel(reviewSkill.skillCode)}.`,
    };
  }

  if (
    eligibleSkills.every(
      (skill) => Number(skill.accuracyPercent) >= GOOD_SKILL_THRESHOLD,
    )
  ) {
    return {
      bestSkill,
      reviewSkill: null,
      message:
        "Em đang duy trì kết quả tốt ở các kỹ năng đã luyện tập.",
    };
  }

  return {
    bestSkill,
    reviewSkill: null,
    message: `Kết quả hiện có nổi bật ở phần ${getParentSkillLabel(bestSkill.skillCode)}. Cần thêm dữ liệu để so sánh các kỹ năng một cách phù hợp.`,
  };
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(value);
}

export function buildParentWeeklySummaryText(
  summary: ParentWeeklySummary,
) {
  if (summary.metrics.completedAttemptCount === 0) {
    return "Chưa có lượt luyện tập hoàn thành trong 7 ngày gần nhất.";
  }

  const insight = getParentWeeklySkillInsights(summary);
  const accuracy = summary.metrics.accuracyPercent;
  const metricText =
    accuracy === null
      ? `Trong 7 ngày gần nhất, em đã hoàn thành ${summary.metrics.completedAttemptCount} lượt luyện tập.`
      : `Trong 7 ngày gần nhất, em đã hoàn thành ${summary.metrics.completedAttemptCount} lượt luyện tập, trả lời ${summary.metrics.totalAnswered} câu với tỷ lệ đúng ${formatPercent(accuracy)}%.`;

  return `${metricText} ${insight.message}`;
}

function formatCalendarDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(`${value}T00:00:00+07:00`));
}

export function formatParentWeeklyPeriod(summary: ParentWeeklySummary) {
  return `${formatCalendarDate(summary.period.startDate)} – ${formatCalendarDate(summary.period.endDate)}`;
}
