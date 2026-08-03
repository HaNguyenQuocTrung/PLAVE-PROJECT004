import type { MasteryStatus } from "../scoring/policy-v1.ts";

export const PLAVE_MOTIVATION_POLICY_V1 = "PLAVE_MOTIVATION_POLICY_V1" as const;
export const MOTIVATION_TIMEZONE = "Asia/Ho_Chi_Minh" as const;
export const MAX_LEVEL = 50 as const;

export function levelThreshold(level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) {
    throw new Error("MOTIVATION:INVALID_LEVEL");
  }
  return 25 * (level - 1) * (level + 2);
}

export function projectLevel(totalXp: number) {
  if (!Number.isSafeInteger(totalXp) || totalXp < 0) {
    throw new Error("MOTIVATION:INVALID_XP");
  }
  let level = 1;
  for (let candidate = 2; candidate <= MAX_LEVEL; candidate += 1) {
    if (totalXp < levelThreshold(candidate)) break;
    level = candidate;
  }
  const currentThreshold = levelThreshold(level);
  const nextThreshold = level === MAX_LEVEL ? currentThreshold : levelThreshold(level + 1);
  return {
    level,
    totalXp,
    currentThreshold,
    nextThreshold,
    xpRemaining: Math.max(0, nextThreshold - totalXp),
    maxLevel: level === MAX_LEVEL,
  } as const;
}

export type MotivationPeriod = Readonly<{ start: string; endExclusive: string }>;

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: MOTIVATION_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function localLearningDate(instant: string | Date): string {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (!Number.isFinite(date.getTime())) throw new Error("MOTIVATION:INVALID_TIME");
  return dayFormatter.format(date);
}

function dateAtUtc(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function calculateStreak(dates: readonly string[], today: string): {
  currentStreakDays: number;
  longestStreakDays: number;
  lastQualifyingDate: string | null;
  qualifiedToday: boolean;
} {
  const unique = [...new Set(dates)].filter((date) => /^\d{4}-\d{2}-\d{2}$/u.test(date)).sort();
  const set = new Set(unique);
  let longest = 0;
  let run = 0;
  for (let index = 0; index < unique.length; index += 1) {
    run = index > 0 && dateAtUtc(unique[index]) - dateAtUtc(unique[index - 1]) === 86_400_000 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  const previous = new Date(dateAtUtc(today));
  let cursor = set.has(today) ? today : localDateFromOffset(previous, -1);
  if (!set.has(cursor)) return { currentStreakDays: 0, longestStreakDays: longest, lastQualifyingDate: unique.at(-1) ?? null, qualifiedToday: false };
  let current = 0;
  while (set.has(cursor)) {
    current += 1;
    cursor = localDateFromOffset(new Date(dateAtUtc(cursor)), -1);
  }
  return { currentStreakDays: current, longestStreakDays: longest, lastQualifyingDate: unique.at(-1) ?? null, qualifiedToday: set.has(today) };
}

function localDateFromOffset(date: Date, offsetDays: number) {
  return new Date(date.getTime() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

export const MOTIVATION_GOALS = {
  DAILY_XP: { id: "DAILY_XP", target: 20, label: "XP hôm nay" },
  DAILY_ATTEMPTS: { id: "DAILY_ATTEMPTS", target: 1, label: "bài luyện hôm nay" },
  WEEKLY_XP: { id: "WEEKLY_XP", target: 100, label: "XP tuần này" },
  WEEKLY_ATTEMPTS: { id: "WEEKLY_ATTEMPTS", target: 3, label: "bài luyện tuần này" },
} as const;

export function goalPercentage(current: number, target: number) {
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) throw new Error("MOTIVATION:INVALID_GOAL");
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
}

export function goalsFromProgress(input: Readonly<{ dailyXp: number; dailyAttempts: number; weeklyXp: number; weeklyAttempts: number }>) {
  const daily = {
    xp: { current: input.dailyXp, target: 20, percentage: goalPercentage(input.dailyXp, 20), completed: input.dailyXp >= 20 },
    attempts: { current: input.dailyAttempts, target: 1, percentage: goalPercentage(input.dailyAttempts, 1), completed: input.dailyAttempts >= 1 },
  } as const;
  const weekly = {
    xp: { current: input.weeklyXp, target: 100, percentage: goalPercentage(input.weeklyXp, 100), completed: input.weeklyXp >= 100 },
    attempts: { current: input.weeklyAttempts, target: 3, percentage: goalPercentage(input.weeklyAttempts, 3), completed: input.weeklyAttempts >= 3 },
  } as const;
  return { daily, weekly, dailyCompleted: daily.xp.completed && daily.attempts.completed, weeklyCompleted: weekly.xp.completed && weekly.attempts.completed } as const;
}

export type AchievementId =
  | "FIRST_STEP" | "FIRST_CORRECT" | "XP_100" | "XP_500" | "STREAK_3" | "STREAK_7"
  | "FIRST_MASTERY" | "MASTERY_5" | "PERFECT_ATTEMPT" | "GOAL_GETTER" | "WEEKLY_CHAMPION" | "COMEBACK_LEARNER";

export const ACHIEVEMENTS: readonly Readonly<{ id: AchievementId; title: string; description: string; icon: string }>[] = [
  { id: "FIRST_STEP", title: "Bước đầu tiên", description: "Hoàn thành bài luyện đầu tiên.", icon: "spark" },
  { id: "FIRST_CORRECT", title: "Câu đúng đầu tiên", description: "Có câu trả lời đúng đầu tiên.", icon: "check" },
  { id: "XP_100", title: "100 XP", description: "Tích lũy 100 XP.", icon: "star" },
  { id: "XP_500", title: "500 XP", description: "Tích lũy 500 XP.", icon: "trophy" },
  { id: "STREAK_3", title: "Ba ngày bền bỉ", description: "Học liên tục ba ngày.", icon: "calendar" },
  { id: "STREAK_7", title: "Một tuần bền bỉ", description: "Học liên tục bảy ngày.", icon: "calendar" },
  { id: "FIRST_MASTERY", title: "Mục tiêu đầu tiên", description: "Làm chủ một mục tiêu học tập.", icon: "target" },
  { id: "MASTERY_5", title: "Năm mục tiêu", description: "Làm chủ năm mục tiêu học tập.", icon: "target" },
  { id: "PERFECT_ATTEMPT", title: "Trọn vẹn", description: "Hoàn thành một bài luyện với 100 điểm.", icon: "medal" },
  { id: "GOAL_GETTER", title: "Chạm mục tiêu", description: "Hoàn thành mục tiêu ngày đầu tiên.", icon: "flag" },
  { id: "WEEKLY_CHAMPION", title: "Tuần học đều", description: "Hoàn thành mục tiêu tuần đầu tiên.", icon: "flag" },
  { id: "COMEBACK_LEARNER", title: "Trở lại mạnh mẽ", description: "Tiến bộ sau khi cần ôn lại.", icon: "refresh" },
] as const;

export function achievementEligibility(input: Readonly<{
  completedAttemptCount: number;
  correctAnswerCount: number;
  totalXp: number;
  longestStreakDays: number;
  masteredCount: number;
  perfectAttempt: boolean;
  dailyGoalCompleted: boolean;
  weeklyGoalCompleted: boolean;
  comeback: boolean;
}>): AchievementId[] {
  const ids: AchievementId[] = [];
  if (input.completedAttemptCount >= 1) ids.push("FIRST_STEP");
  if (input.correctAnswerCount >= 1) ids.push("FIRST_CORRECT");
  if (input.totalXp >= 100) ids.push("XP_100");
  if (input.totalXp >= 500) ids.push("XP_500");
  if (input.longestStreakDays >= 3) ids.push("STREAK_3");
  if (input.longestStreakDays >= 7) ids.push("STREAK_7");
  if (input.masteredCount >= 1) ids.push("FIRST_MASTERY");
  if (input.masteredCount >= 5) ids.push("MASTERY_5");
  if (input.perfectAttempt) ids.push("PERFECT_ATTEMPT");
  if (input.dailyGoalCompleted) ids.push("GOAL_GETTER");
  if (input.weeklyGoalCompleted) ids.push("WEEKLY_CHAMPION");
  if (input.comeback) ids.push("COMEBACK_LEARNER");
  return ids;
}

export function isMasteryStatus(status: MasteryStatus) {
  return status === "MASTERED";
}
