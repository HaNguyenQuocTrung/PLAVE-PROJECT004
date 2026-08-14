import type {
  AttemptScoringState,
  StudentScoringSummary,
} from "../curriculum-runtime/contracts.ts";

export const xpCompletionReasons = [
  "ELIGIBLE_CORRECT_ANSWERS_AWARDED",
  "NO_CORRECT_ELIGIBLE_ANSWER",
  "LEGACY_GRADE1_RUNTIME_NOT_ELIGIBLE",
  "LEGACY_CURRICULUM_ATTEMPT_NOT_ELIGIBLE",
] as const;

export type XpCompletionReason = (typeof xpCompletionReasons)[number];

export type XpCompletionProjection = Readonly<{
  policyVersion: "PLAVE_SCORING_POLICY_V1" | null;
  eligible: boolean;
  attemptXpEarned: number;
  totalXpAfter: number;
  reason: XpCompletionReason;
}>;

export function buildCurriculumXpCompletionProjection(
  scoring: AttemptScoringState,
  summary: StudentScoringSummary,
): XpCompletionProjection {
  if (scoring.legacy || scoring.policyVersion === null) {
    return {
      policyVersion: null,
      eligible: false,
      attemptXpEarned: 0,
      totalXpAfter: summary.totalXp,
      reason: "LEGACY_CURRICULUM_ATTEMPT_NOT_ELIGIBLE",
    };
  }
  return {
    policyVersion: "PLAVE_SCORING_POLICY_V1",
    eligible: true,
    attemptXpEarned: scoring.attemptXpEarned,
    totalXpAfter: summary.totalXp,
    reason:
      scoring.attemptXpEarned > 0
        ? "ELIGIBLE_CORRECT_ANSWERS_AWARDED"
        : "NO_CORRECT_ELIGIBLE_ANSWER",
  };
}

export function buildLegacyGradeOneXpCompletionProjection(
  summary: StudentScoringSummary,
): XpCompletionProjection {
  return {
    policyVersion: null,
    eligible: false,
    attemptXpEarned: 0,
    totalXpAfter: summary.totalXp,
    reason: "LEGACY_GRADE1_RUNTIME_NOT_ELIGIBLE",
  };
}

export function xpCompletionReasonText(reason: XpCompletionReason) {
  if (reason === "ELIGIBLE_CORRECT_ANSWERS_AWARDED") {
    return "XP được cộng cho các câu đúng đủ điều kiện trong lượt học này.";
  }
  if (reason === "NO_CORRECT_ELIGIBLE_ANSWER") {
    return "Lượt này không có câu đúng đủ điều kiện nên không nhận XP.";
  }
  if (reason === "LEGACY_GRADE1_RUNTIME_NOT_ELIGIBLE") {
    return "Lượt luyện tập cố định Lớp 1 này dùng chính sách cũ và không thuộc phạm vi nhận XP V1.";
  }
  return "Lượt học cũ này được tạo trước chính sách XP V1 nên không nhận XP.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseXpCompletionProjection(
  value: unknown,
): XpCompletionProjection | null {
  if (
    !isRecord(value) ||
    ![null, "PLAVE_SCORING_POLICY_V1"].includes(
      value.policyVersion as null | string,
    ) ||
    typeof value.eligible !== "boolean" ||
    !Number.isSafeInteger(value.attemptXpEarned) ||
    Number(value.attemptXpEarned) < 0 ||
    !Number.isSafeInteger(value.totalXpAfter) ||
    Number(value.totalXpAfter) < 0 ||
    !xpCompletionReasons.includes(value.reason as XpCompletionReason)
  ) {
    return null;
  }
  if (
    (value.eligible && value.policyVersion !== "PLAVE_SCORING_POLICY_V1") ||
    (!value.eligible &&
      (value.policyVersion !== null ||
        Number(value.attemptXpEarned) !== 0 ||
        ![
          "LEGACY_GRADE1_RUNTIME_NOT_ELIGIBLE",
          "LEGACY_CURRICULUM_ATTEMPT_NOT_ELIGIBLE",
        ].includes(value.reason as XpCompletionReason))) ||
    (value.eligible &&
      ((Number(value.attemptXpEarned) > 0 &&
        value.reason !== "ELIGIBLE_CORRECT_ANSWERS_AWARDED") ||
        (Number(value.attemptXpEarned) === 0 &&
          value.reason !== "NO_CORRECT_ELIGIBLE_ANSWER")))
  ) {
    return null;
  }
  return value as XpCompletionProjection;
}
