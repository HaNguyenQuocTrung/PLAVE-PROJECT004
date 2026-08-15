import {
  diagnosticDomainLabels,
  diagnosticDomains,
  type DiagnosticAttemptSummary,
  type DiagnosticDomain,
  type DiagnosticDomainResult,
} from "../diagnostic/contracts.ts";
import {
  ADDITION_TO_100_UNIT_SLUG,
  ADDITION_TO_20_UNIT_SLUG,
  ADDITION_UNIT_SLUG,
  BASIC_GEOMETRY_UNIT_SLUG,
  BASE_UNIT_SLUG,
  CUBE_AND_CUBOID_UNIT_SLUG,
  LENGTH_MEASUREMENT_UNIT_SLUG,
  NUMBERS_TO_100_UNIT_SLUG,
  NUMBERS_TO_20_UNIT_SLUG,
  SUBTRACTION_TO_100_UNIT_SLUG,
  SUBTRACTION_TO_20_UNIT_SLUG,
  SUBTRACTION_UNIT_SLUG,
  TIME_CLOCK_CALENDAR_UNIT_SLUG,
  getLessonPath,
  isUnitPracticeUnlocked,
} from "../practice/catalog.ts";
import { getPracticeReviewPath } from "../practice/review.ts";
import type {
  LearningUnit,
  PracticeAttempt,
} from "../practice/contracts.ts";

export const PERSONALIZED_REVIEW_THRESHOLD = 70;

export type PersonalizedUnitState =
  | "IN_PROGRESS"
  | "AVAILABLE"
  | "NEEDS_REVIEW"
  | "COMPLETED"
  | "LOCKED";

export type PersonalizedRecommendationReason =
  | "CONTINUE_ATTEMPT"
  | "DIAGNOSTIC_WEAK_DOMAIN"
  | "LOW_RECENT_SCORE"
  | "NEXT_UNLOCKED_UNIT"
  | "ALL_UNITS_COMPLETE";

export type PersonalizedRecommendation = {
  target: "UNIT" | "DIAGNOSTIC";
  unitSlug: string | null;
  title: string;
  reasonCode: PersonalizedRecommendationReason;
  reason: string;
  actionHref: string;
  actionLabel:
    | "Tiếp tục"
    | "Học lý thuyết"
    | "Xem kết quả"
    | "Tiếp tục đánh giá"
    | "Làm đánh giá lại";
};

export type PersonalizedUnitPathItem = {
  unit: LearningUnit;
  state: PersonalizedUnitState;
  isRecommended: boolean;
  activeAttempt: PracticeAttempt | null;
  latestCompletedAttempt: PracticeAttempt | null;
  latestScorePercent: number | null;
  prerequisiteTitle: string | null;
};

export type PersonalizedLearningPath = {
  grade: number;
  units: PersonalizedUnitPathItem[];
  recommendation: PersonalizedRecommendation | null;
  summary: {
    totalUnitCount: number;
    completedUnitCount: number;
    inProgressUnitCount: number;
    needsReviewUnitCount: number;
  };
  latestDiagnostic: DiagnosticAttemptSummary | null;
  diagnosticDomains: DiagnosticDomainResult[] | null;
};

export type PersonalizedPathInput = {
  grade?: number;
  units: LearningUnit[];
  attempts: PracticeAttempt[];
  latestDiagnostic: DiagnosticAttemptSummary | null;
  diagnosticDomains: DiagnosticDomainResult[] | null;
  diagnosticEnabled?: boolean;
};

const unitDiagnosticDomains: Partial<Record<string, DiagnosticDomain>> = {
  [BASE_UNIT_SLUG]: "NUMBER_SENSE",
  [ADDITION_UNIT_SLUG]: "ARITHMETIC",
  [SUBTRACTION_UNIT_SLUG]: "ARITHMETIC",
  [NUMBERS_TO_20_UNIT_SLUG]: "NUMBER_SENSE",
  [ADDITION_TO_20_UNIT_SLUG]: "ARITHMETIC",
  [SUBTRACTION_TO_20_UNIT_SLUG]: "ARITHMETIC",
  [NUMBERS_TO_100_UNIT_SLUG]: "NUMBER_SENSE",
  [ADDITION_TO_100_UNIT_SLUG]: "ARITHMETIC",
  [SUBTRACTION_TO_100_UNIT_SLUG]: "ARITHMETIC",
  [BASIC_GEOMETRY_UNIT_SLUG]: "GEOMETRY",
  [LENGTH_MEASUREMENT_UNIT_SLUG]: "MEASUREMENT_TIME",
  [TIME_CLOCK_CALENDAR_UNIT_SLUG]: "MEASUREMENT_TIME",
  [CUBE_AND_CUBOID_UNIT_SLUG]: "GEOMETRY",
};

function compareNewestAttempt(
  first: PracticeAttempt,
  second: PracticeAttempt,
) {
  const firstTime = new Date(
    first.completedAt ?? first.startedAt,
  ).getTime();
  const secondTime = new Date(
    second.completedAt ?? second.startedAt,
  ).getTime();
  return secondTime - firstTime || second.id.localeCompare(first.id);
}

function getLatestAttempt(
  attempts: PracticeAttempt[],
  status: PracticeAttempt["status"],
) {
  return (
    attempts
      .filter((attempt) => attempt.status === status)
      .sort(compareNewestAttempt)[0] ?? null
  );
}

function getScorePercent(attempt: PracticeAttempt | null) {
  return attempt
    ? Math.round(
        (attempt.correctCount / attempt.totalQuestions) * 100,
      )
    : null;
}

function getWeakDiagnosticDomains(
  latestDiagnostic: DiagnosticAttemptSummary | null,
  domainResults: DiagnosticDomainResult[] | null,
) {
  if (
    latestDiagnostic?.status !== "COMPLETED" ||
    !domainResults ||
    domainResults.length !== diagnosticDomains.length
  ) {
    return new Set<DiagnosticDomain>();
  }

  return new Set(
    domainResults
      .filter(
        (result) =>
          result.level === "REVIEW" ||
          result.accuracyPercent < PERSONALIZED_REVIEW_THRESHOLD,
      )
      .map((result) => result.domain),
  );
}

function buildUnitItems(
  units: LearningUnit[],
  attempts: PracticeAttempt[],
) {
  return units.map((unit) => {
    const unitAttempts = attempts.filter(
      (attempt) => attempt.unitSlug === unit.slug,
    );
    const activeAttempt = getLatestAttempt(unitAttempts, "IN_PROGRESS");
    const latestCompletedAttempt = getLatestAttempt(
      unitAttempts,
      "COMPLETED",
    );
    const latestScorePercent = getScorePercent(latestCompletedAttempt);
    const unlocked = isUnitPracticeUnlocked(unit, attempts);
    const prerequisiteTitle = unit.prerequisiteUnitSlug
      ? units.find(
          (candidate) =>
            candidate.slug === unit.prerequisiteUnitSlug,
        )?.title ?? null
      : null;

    let state: PersonalizedUnitState;
    if (!unlocked) {
      state = "LOCKED";
    } else if (activeAttempt) {
      state = "IN_PROGRESS";
    } else if (
      latestScorePercent !== null &&
      latestScorePercent < PERSONALIZED_REVIEW_THRESHOLD
    ) {
      state = "NEEDS_REVIEW";
    } else if (latestCompletedAttempt) {
      state = "COMPLETED";
    } else {
      state = "AVAILABLE";
    }

    return {
      unit,
      state,
      isRecommended: false,
      activeAttempt,
      latestCompletedAttempt,
      latestScorePercent,
      prerequisiteTitle,
    } satisfies PersonalizedUnitPathItem;
  });
}

function buildUnitRecommendation(
  item: PersonalizedUnitPathItem,
  reasonCode: Exclude<
    PersonalizedRecommendationReason,
    "ALL_UNITS_COMPLETE"
  >,
  reason: string,
): PersonalizedRecommendation {
  const isContinue =
    reasonCode === "CONTINUE_ATTEMPT" && item.activeAttempt !== null;
  const isReview = reasonCode === "LOW_RECENT_SCORE";

  return {
    target: "UNIT",
    unitSlug: item.unit.slug,
    title: item.unit.title,
    reasonCode,
    reason,
    actionHref: isContinue && item.activeAttempt
      ? `/practice/${item.activeAttempt.id}`
      : isReview && item.latestCompletedAttempt
        ? getPracticeReviewPath(item.latestCompletedAttempt.id)
        : getLessonPath(item.unit.slug),
    actionLabel: isContinue
      ? "Tiếp tục"
      : isReview
        ? "Xem kết quả"
        : "Học lý thuyết",
  };
}

function chooseRecommendation(
  items: PersonalizedUnitPathItem[],
  latestDiagnostic: DiagnosticAttemptSummary | null,
  domainResults: DiagnosticDomainResult[] | null,
  diagnosticEnabled: boolean,
): PersonalizedRecommendation | null {
  if (items.length === 0) return null;

  const activeItem =
    items
      .filter((item) => item.activeAttempt !== null)
      .sort((first, second) =>
        compareNewestAttempt(
          first.activeAttempt as PracticeAttempt,
          second.activeAttempt as PracticeAttempt,
        ),
      )[0] ?? null;
  if (activeItem) {
    return buildUnitRecommendation(
      activeItem,
      "CONTINUE_ATTEMPT",
      "Em đang làm dở bài này.",
    );
  }

  const weakDomains = getWeakDiagnosticDomains(
    latestDiagnostic,
    domainResults,
  );
  const weakDomainItem =
    items.find((item) => {
      const domain = unitDiagnosticDomains[item.unit.slug];
      return (
        item.state !== "LOCKED" &&
        item.latestCompletedAttempt === null &&
        domain !== undefined &&
        weakDomains.has(domain)
      );
    }) ?? null;
  if (weakDomainItem) {
    const domain = unitDiagnosticDomains[weakDomainItem.unit.slug];
    if (domain) {
      return buildUnitRecommendation(
        weakDomainItem,
        "DIAGNOSTIC_WEAK_DOMAIN",
        `Bài đánh giá gần nhất cho thấy em cần củng cố ${diagnosticDomainLabels[
          domain
        ].toLocaleLowerCase("vi-VN")}.`,
      );
    }
  }

  const lowScoreItem =
    items
      .filter(
        (item) =>
          item.state !== "LOCKED" &&
          item.latestScorePercent !== null &&
          item.latestScorePercent < PERSONALIZED_REVIEW_THRESHOLD,
      )
      .sort(
        (first, second) =>
          Number(first.latestScorePercent) -
            Number(second.latestScorePercent) ||
          items.indexOf(first) - items.indexOf(second),
      )[0] ?? null;
  if (lowScoreItem) {
    return buildUnitRecommendation(
      lowScoreItem,
      "LOW_RECENT_SCORE",
      "Điểm gần nhất của em dưới 70%, nên ôn lại trước khi học tiếp.",
    );
  }

  const nextItem =
    items.find(
      (item) =>
        item.state === "AVAILABLE" &&
        item.latestCompletedAttempt === null,
    ) ?? null;
  if (nextItem) {
    return buildUnitRecommendation(
      nextItem,
      "NEXT_UNLOCKED_UNIT",
      "Đây là bài tiếp theo trong lộ trình.",
    );
  }

  if (!diagnosticEnabled) return null;

  const diagnosticInProgress =
    latestDiagnostic?.status === "IN_PROGRESS"
      ? latestDiagnostic
      : null;
  return {
    target: "DIAGNOSTIC",
    unitSlug: null,
    title: "Đánh giá lại năng lực Lớp 1",
    reasonCode: "ALL_UNITS_COMPLETE",
    reason:
      "Em đã hoàn thành chương trình hiện tại. Hãy đánh giá lại năng lực để chọn nội dung cần củng cố.",
    actionHref: diagnosticInProgress
      ? `/diagnostic/${diagnosticInProgress.id}`
      : "/diagnostic",
    actionLabel: diagnosticInProgress
      ? "Tiếp tục đánh giá"
      : "Làm đánh giá lại",
  };
}

export function buildPersonalizedLearningPath({
  grade = 1,
  units,
  attempts,
  latestDiagnostic,
  diagnosticDomains: domainResults,
  diagnosticEnabled = grade === 1,
}: PersonalizedPathInput): PersonalizedLearningPath {
  const initialItems = buildUnitItems(units, attempts);
  const recommendation = chooseRecommendation(
    initialItems,
    latestDiagnostic,
    domainResults,
    diagnosticEnabled,
  );
  const items = initialItems.map((item) => ({
    ...item,
    isRecommended:
      recommendation?.target === "UNIT" &&
      recommendation.unitSlug === item.unit.slug,
  }));

  return {
    grade,
    units: items,
    recommendation,
    summary: {
      totalUnitCount: units.length,
      completedUnitCount: items.filter(
        (item) => item.latestCompletedAttempt !== null,
      ).length,
      inProgressUnitCount: items.filter(
        (item) => item.activeAttempt !== null,
      ).length,
      needsReviewUnitCount: items.filter(
        (item) =>
          item.latestScorePercent !== null &&
          item.latestScorePercent < PERSONALIZED_REVIEW_THRESHOLD,
      ).length,
    },
    latestDiagnostic,
    diagnosticDomains: domainResults,
  };
}

export function getPersonalizedUnitStateLabel(
  state: PersonalizedUnitState,
) {
  const labels: Record<PersonalizedUnitState, string> = {
    IN_PROGRESS: "Đang học",
    AVAILABLE: "Có thể bắt đầu",
    NEEDS_REVIEW: "Cần ôn lại",
    COMPLETED: "Đã hoàn thành",
    LOCKED: "Chưa mở do prerequisite",
  };
  return labels[state];
}
