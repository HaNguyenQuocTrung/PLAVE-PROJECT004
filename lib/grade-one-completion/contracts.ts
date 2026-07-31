import type {
  PersonalizedLearningPath,
} from "../personalized-path/contracts.ts";

export const GRADE_ONE_RELEASE_UNIT_COUNT = 13;

export type GradeOneCompletionUnitStatus =
  | "LOCKED"
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "COMPLETED";

export type GradeOneCompletionUnit = {
  slug: string;
  title: string;
  status: GradeOneCompletionUnitStatus;
  isCompleted: boolean;
  hasInProgressAttempt: boolean;
  latestScorePercent: number | null;
  prerequisiteTitle: string | null;
};

export type GradeOneCompletionSummary = {
  totalUnitCount: number;
  completedUnitCount: number;
  completionPercent: number;
  isComplete: boolean;
  units: GradeOneCompletionUnit[];
};

export type ParentGradeOneCompletionUnit = {
  title: string;
  status: GradeOneCompletionUnitStatus;
  isCompleted: boolean;
  hasInProgressAttempt: boolean;
};

export type ParentGradeOneCompletionSummary = {
  totalUnitCount: number;
  completedUnitCount: number;
  completionPercent: number;
  isComplete: boolean;
  units: ParentGradeOneCompletionUnit[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isCompletionStatus(
  value: unknown,
): value is GradeOneCompletionUnitStatus {
  return (
    value === "LOCKED" ||
    value === "AVAILABLE" ||
    value === "IN_PROGRESS" ||
    value === "COMPLETED"
  );
}

export function buildGradeOneCompletionSummary(
  path: PersonalizedLearningPath,
): GradeOneCompletionSummary | null {
  if (
    path.units.length !== GRADE_ONE_RELEASE_UNIT_COUNT ||
    path.summary.totalUnitCount !== GRADE_ONE_RELEASE_UNIT_COUNT ||
    new Set(path.units.map((item) => item.unit.slug)).size !==
      GRADE_ONE_RELEASE_UNIT_COUNT
  ) {
    return null;
  }

  const units = path.units.map((item) => {
    const isCompleted = item.latestCompletedAttempt !== null;
    const hasInProgressAttempt = item.activeAttempt !== null;
    const status: GradeOneCompletionUnitStatus = hasInProgressAttempt
      ? "IN_PROGRESS"
      : isCompleted
        ? "COMPLETED"
        : item.state === "LOCKED"
          ? "LOCKED"
          : "AVAILABLE";

    return {
      slug: item.unit.slug,
      title: item.unit.title,
      status,
      isCompleted,
      hasInProgressAttempt,
      latestScorePercent: item.latestScorePercent,
      prerequisiteTitle: item.prerequisiteTitle,
    };
  });
  const completedUnitCount = units.filter(
    (unit) => unit.isCompleted,
  ).length;

  return {
    totalUnitCount: GRADE_ONE_RELEASE_UNIT_COUNT,
    completedUnitCount,
    completionPercent: Math.round(
      (completedUnitCount / GRADE_ONE_RELEASE_UNIT_COUNT) * 100,
    ),
    isComplete: completedUnitCount === GRADE_ONE_RELEASE_UNIT_COUNT,
    units,
  };
}

export function parseParentGradeOneCompletionSummary(
  value: unknown,
): ParentGradeOneCompletionSummary | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "completed_unit_count",
      "completion_percent",
      "is_complete",
      "total_unit_count",
      "units",
    ]) ||
    value.total_unit_count !== GRADE_ONE_RELEASE_UNIT_COUNT ||
    typeof value.completed_unit_count !== "number" ||
    !Number.isInteger(value.completed_unit_count) ||
    value.completed_unit_count < 0 ||
    value.completed_unit_count > GRADE_ONE_RELEASE_UNIT_COUNT ||
    typeof value.completion_percent !== "number" ||
    !Number.isInteger(value.completion_percent) ||
    value.completion_percent < 0 ||
    value.completion_percent > 100 ||
    typeof value.is_complete !== "boolean" ||
    value.is_complete !==
      (value.completed_unit_count === GRADE_ONE_RELEASE_UNIT_COUNT) ||
    !Array.isArray(value.units) ||
    value.units.length !== GRADE_ONE_RELEASE_UNIT_COUNT
  ) {
    return null;
  }

  const units: ParentGradeOneCompletionUnit[] = [];
  for (const rawUnit of value.units) {
    if (
      !isRecord(rawUnit) ||
      !hasOnlyKeys(rawUnit, [
        "has_in_progress_attempt",
        "is_completed",
        "status",
        "title",
      ]) ||
      !isNonEmptyString(rawUnit.title) ||
      !isCompletionStatus(rawUnit.status) ||
      typeof rawUnit.is_completed !== "boolean" ||
      typeof rawUnit.has_in_progress_attempt !== "boolean" ||
      (rawUnit.status === "COMPLETED" &&
        (!rawUnit.is_completed || rawUnit.has_in_progress_attempt)) ||
      (rawUnit.status === "IN_PROGRESS" &&
        !rawUnit.has_in_progress_attempt) ||
      ((rawUnit.status === "AVAILABLE" || rawUnit.status === "LOCKED") &&
        (rawUnit.is_completed || rawUnit.has_in_progress_attempt))
    ) {
      return null;
    }
    units.push({
      title: rawUnit.title,
      status: rawUnit.status,
      isCompleted: rawUnit.is_completed,
      hasInProgressAttempt: rawUnit.has_in_progress_attempt,
    });
  }

  if (
    units.filter((unit) => unit.isCompleted).length !==
      value.completed_unit_count ||
    value.completion_percent !==
      Math.round(
        (value.completed_unit_count / GRADE_ONE_RELEASE_UNIT_COUNT) *
          100,
      )
  ) {
    return null;
  }

  return {
    totalUnitCount: value.total_unit_count,
    completedUnitCount: value.completed_unit_count,
    completionPercent: value.completion_percent,
    isComplete: value.is_complete,
    units,
  };
}

export function getGradeOneCompletionStatusLabel(
  status: GradeOneCompletionUnitStatus,
) {
  const labels: Record<GradeOneCompletionUnitStatus, string> = {
    LOCKED: "Chưa mở",
    AVAILABLE: "Có thể bắt đầu",
    IN_PROGRESS: "Đang học",
    COMPLETED: "Đã hoàn thành",
  };
  return labels[status];
}
