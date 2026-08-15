import type {
  AttemptScoringState,
  StudentScoringSummary,
} from "../curriculum-runtime/contracts.ts";

export const xpCompletionReasons = [
  "ELIGIBLE_CORRECT_ANSWERS_AWARDED",
  "NO_CORRECT_ELIGIBLE_ANSWER",
  "HISTORICAL_ATTEMPT_NOT_ELIGIBLE",
] as const;

export type XpCompletionReason = (typeof xpCompletionReasons)[number];

export type XpCompletionProjection = Readonly<{
  policyVersion: "PLAVE_SCORING_POLICY_V1" | null;
  eligible: boolean;
  attemptXpEarned: number;
  totalXpAfter: number;
  reason: XpCompletionReason;
}>;

export type XpCompletionResultView =
  | Readonly<{
      kind: "READY";
      projection: XpCompletionProjection;
      attemptXpText: string;
      totalXpText: string;
      reasonText: string;
    }>
  | Readonly<{
      kind: "UNAVAILABLE";
      message: string;
    }>;

export const answerZeroXpReasons = [
  "INCORRECT_ANSWER",
  "ANSWER_ALREADY_PERSISTED",
  "HISTORICAL_ATTEMPT_NOT_ELIGIBLE",
] as const;

export type AnswerXpProjection = Readonly<{
  answerXpAwarded: number;
  attemptXpEarned: number;
  totalXpAfter: number;
  policyVersion: "PLAVE_SCORING_POLICY_V1" | null;
  eligible: boolean;
  zeroXpReason: (typeof answerZeroXpReasons)[number] | null;
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
      reason: "HISTORICAL_ATTEMPT_NOT_ELIGIBLE",
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

export function buildAttemptXpCompletionProjection(
  attempt: Pick<AttemptScoringState, "policyVersion" | "legacy" | "attemptXpEarned">,
  totalXpAfter: number,
): XpCompletionProjection {
  if (attempt.legacy || attempt.policyVersion === null) {
    return {
      policyVersion: null,
      eligible: false,
      attemptXpEarned: 0,
      totalXpAfter,
      reason: "HISTORICAL_ATTEMPT_NOT_ELIGIBLE",
    };
  }
  return {
    policyVersion: "PLAVE_SCORING_POLICY_V1",
    eligible: true,
    attemptXpEarned: attempt.attemptXpEarned,
    totalXpAfter,
    reason: attempt.attemptXpEarned > 0
      ? "ELIGIBLE_CORRECT_ANSWERS_AWARDED"
      : "NO_CORRECT_ELIGIBLE_ANSWER",
  };
}

export function buildAnswerXpCompletionProjection(
  xp: AnswerXpProjection,
): XpCompletionProjection {
  return buildAttemptXpCompletionProjection({
    policyVersion: xp.policyVersion,
    legacy: !xp.eligible,
    attemptXpEarned: xp.attemptXpEarned,
  }, xp.totalXpAfter);
}

export function xpCompletionReasonText(reason: XpCompletionReason) {
  if (reason === "ELIGIBLE_CORRECT_ANSWERS_AWARDED") {
    return "XP được cộng cho các câu đúng đủ điều kiện trong lượt học này.";
  }
  if (reason === "NO_CORRECT_ELIGIBLE_ANSWER") {
    return "Lượt này không có câu đúng đủ điều kiện nên không nhận XP.";
  }
  return "Lượt học này được tạo trước chính sách XP thống nhất nên không nhận XP.";
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
        value.reason !== "HISTORICAL_ATTEMPT_NOT_ELIGIBLE")) ||
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

export function buildXpCompletionResultView(
  value: unknown,
): XpCompletionResultView {
  const projection = parseXpCompletionProjection(value);
  if (!projection) {
    return {
      kind: "UNAVAILABLE",
      message:
        "Chưa thể tải kết quả XP đã lưu. Em hãy tải lại trang; PLAVE sẽ không hiển thị số XP chưa được xác minh.",
    };
  }
  return {
    kind: "READY",
    projection,
    attemptXpText: `${projection.attemptXpEarned} XP`,
    totalXpText: `${projection.totalXpAfter} XP`,
    reasonText: xpCompletionReasonText(projection.reason),
  };
}

export function parseAnswerXpProjection(
  value: unknown,
): AnswerXpProjection | null {
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(value.answer_xp_awarded) ||
    Number(value.answer_xp_awarded) < 0 ||
    !Number.isSafeInteger(value.attempt_xp_earned) ||
    Number(value.attempt_xp_earned) < 0 ||
    !Number.isSafeInteger(value.total_xp_after) ||
    Number(value.total_xp_after) < 0 ||
    ![null, "PLAVE_SCORING_POLICY_V1"].includes(
      value.policy_version as null | string,
    ) ||
    typeof value.eligible !== "boolean" ||
    ![null, ...answerZeroXpReasons].includes(
      value.zero_xp_reason as null | (typeof answerZeroXpReasons)[number],
    )
  ) {
    return null;
  }
  if (
    (value.eligible && value.policy_version !== "PLAVE_SCORING_POLICY_V1") ||
    (!value.eligible &&
      (value.policy_version !== null ||
        value.zero_xp_reason !== "HISTORICAL_ATTEMPT_NOT_ELIGIBLE")) ||
    (Number(value.answer_xp_awarded) > 0 && value.zero_xp_reason !== null) ||
    (Number(value.answer_xp_awarded) === 0 && value.zero_xp_reason === null)
  ) {
    return null;
  }
  return {
    answerXpAwarded: value.answer_xp_awarded as number,
    attemptXpEarned: value.attempt_xp_earned as number,
    totalXpAfter: value.total_xp_after as number,
    policyVersion: value.policy_version as AnswerXpProjection["policyVersion"],
    eligible: value.eligible,
    zeroXpReason: value.zero_xp_reason as AnswerXpProjection["zeroXpReason"],
  };
}
