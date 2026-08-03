import { ACHIEVEMENTS, MOTIVATION_TIMEZONE, PLAVE_MOTIVATION_POLICY_V1 } from "./policy-v1.ts";

export type MotivationAchievement = Readonly<{
  id: string;
  title: string;
  description: string;
  icon: string;
  awardedAt: string;
}>;

export type MotivationSummary = Readonly<{
  policyVersion: typeof PLAVE_MOTIVATION_POLICY_V1;
  timezone: typeof MOTIVATION_TIMEZONE;
  level: Readonly<{ level: number; totalXp: number; currentThreshold: number; nextThreshold: number; xpRemaining: number; maxLevel: boolean }>;
  streak: Readonly<{ currentStreakDays: number; longestStreakDays: number; lastQualifyingDate: string | null; qualifiedToday: boolean; timezone: typeof MOTIVATION_TIMEZONE }>;
  goals: Readonly<{ daily: Readonly<Record<string, unknown>>; weekly: Readonly<Record<string, unknown>>; dailyCompleted: boolean; weeklyCompleted: boolean }>;
  achievements: readonly MotivationAchievement[];
}>;

export function parseMotivationAchievements(value: unknown): MotivationAchievement[] | null {
  if (!Array.isArray(value)) return null;
  const allowed = new Set(ACHIEVEMENTS.map((achievement) => achievement.id));
  const parsed: MotivationAchievement[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const candidate = entry as Record<string, unknown>;
    const awardedAt = candidate.awarded_at ?? candidate.awardedAt;
    if (
      typeof candidate.id !== "string" ||
      !allowed.has(candidate.id as never) ||
      typeof candidate.title !== "string" ||
      typeof candidate.description !== "string" ||
      typeof candidate.icon !== "string" ||
      typeof awardedAt !== "string"
    ) return null;
    parsed.push({
      id: candidate.id,
      title: candidate.title,
      description: candidate.description,
      icon: candidate.icon,
      awardedAt,
    });
  }
  return parsed;
}

export function parseMotivationSummary(value: unknown): MotivationSummary | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (item.policy_version !== PLAVE_MOTIVATION_POLICY_V1 && item.policyVersion !== PLAVE_MOTIVATION_POLICY_V1) return null;
  const level = item.level as Record<string, unknown> | undefined;
  const streak = item.streak as Record<string, unknown> | undefined;
  if (!level || !streak || typeof level.level !== "number" || typeof level.total_xp !== "number" && typeof level.totalXp !== "number") return null;
  const achievements = parseMotivationAchievements(item.achievements ?? []);
  if (achievements === null) return null;
  return {
    policyVersion: PLAVE_MOTIVATION_POLICY_V1,
    timezone: MOTIVATION_TIMEZONE,
    level: { level: level.level as number, totalXp: Number(level.total_xp ?? level.totalXp), currentThreshold: Number(level.current_threshold ?? level.currentThreshold ?? 0), nextThreshold: Number(level.next_threshold ?? level.nextThreshold ?? 0), xpRemaining: Number(level.xp_remaining ?? level.xpRemaining ?? 0), maxLevel: Boolean(level.max_level ?? level.maxLevel) },
    streak: { currentStreakDays: Number(streak.current_streak_days ?? streak.currentStreakDays ?? 0), longestStreakDays: Number(streak.longest_streak_days ?? streak.longestStreakDays ?? 0), lastQualifyingDate: typeof (streak.last_qualifying_date ?? streak.lastQualifyingDate) === "string" ? String(streak.last_qualifying_date ?? streak.lastQualifyingDate) : null, qualifiedToday: Boolean(streak.qualified_today ?? streak.qualifiedToday), timezone: MOTIVATION_TIMEZONE },
    goals: { daily: (item.goals as Record<string, unknown> | undefined)?.daily as Record<string, unknown> ?? {}, weekly: (item.goals as Record<string, unknown> | undefined)?.weekly as Record<string, unknown> ?? {}, dailyCompleted: Boolean((item.goals as Record<string, unknown> | undefined)?.daily_completed ?? (item.goals as Record<string, unknown> | undefined)?.dailyCompleted), weeklyCompleted: Boolean((item.goals as Record<string, unknown> | undefined)?.weekly_completed ?? (item.goals as Record<string, unknown> | undefined)?.weeklyCompleted) },
    achievements,
  };
}
