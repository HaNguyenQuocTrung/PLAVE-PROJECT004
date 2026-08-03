export const PLAVE_SCORING_POLICY_V1 = "PLAVE_SCORING_POLICY_V1" as const;

export const scoringDifficulties = ["EASY", "MEDIUM", "HARD"] as const;
export type ScoringDifficulty = (typeof scoringDifficulties)[number];

export const masteryStatuses = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "DEVELOPING",
  "PROFICIENT",
  "MASTERED",
  "NEEDS_REVIEW",
] as const;
export type MasteryStatus = (typeof masteryStatuses)[number];

export const SCORE_WEIGHT: Readonly<Record<ScoringDifficulty, number>> = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
};

export const XP_AWARD: Readonly<Record<ScoringDifficulty, number>> = {
  EASY: 10,
  MEDIUM: 15,
  HARD: 20,
};

// Hundredths keep 1.00, 1.25 and 1.50 exact without floating-point equality.
export const MASTERY_WEIGHT_HUNDREDTHS: Readonly<
  Record<ScoringDifficulty, number>
> = {
  EASY: 100,
  MEDIUM: 125,
  HARD: 150,
};

export type AttemptScoreEvidence = Readonly<{
  difficulty: ScoringDifficulty;
  isCorrect: boolean;
}>;

export type AttemptScore = Readonly<{
  policyVersion: typeof PLAVE_SCORING_POLICY_V1;
  earnedWeight: number;
  possibleWeight: number;
  scorePercent: number;
}>;

export type MasteryEvidence = Readonly<{
  evidenceId: string;
  difficulty: ScoringDifficulty;
  isCorrect: boolean;
  answeredAt: string;
}>;

export type MasteryProjection = Readonly<{
  policyVersion: typeof PLAVE_SCORING_POLICY_V1;
  evidenceCount: number;
  correctCount: number;
  masteryPercent: number;
  status: MasteryStatus;
  lastEvidenceAt: string | null;
  mediumHardCorrectCount: number;
  activeEvidenceIds: readonly string[];
  everMastered: boolean;
}>;

export function roundHalfUpRatio(
  numerator: number,
  denominator: number,
): number {
  if (
    !Number.isSafeInteger(numerator) ||
    numerator < 0 ||
    !Number.isSafeInteger(denominator) ||
    denominator <= 0
  ) {
    throw new Error("SCORING:INVALID_RATIO");
  }
  return Math.floor((2 * numerator + denominator) / (2 * denominator));
}
export function calculateAttemptScore(
  evidence: readonly AttemptScoreEvidence[],
): AttemptScore {
  if (evidence.length === 0) {
    throw new Error("SCORING:EMPTY_ATTEMPT");
  }
  const possibleWeight = evidence.reduce(
    (total, item) => total + SCORE_WEIGHT[item.difficulty],
    0,
  );
  const earnedWeight = evidence.reduce(
    (total, item) =>
      total + (item.isCorrect ? SCORE_WEIGHT[item.difficulty] : 0),
    0,
  );
  return {
    policyVersion: PLAVE_SCORING_POLICY_V1,
    earnedWeight,
    possibleWeight,
    scorePercent: roundHalfUpRatio(earnedWeight * 100, possibleWeight),
  };
}

export function xpForFirstTerminalCorrect(
  difficulty: ScoringDifficulty,
  firstCorrectForPersistedQuestion: boolean,
): number {
  return firstCorrectForPersistedQuestion ? XP_AWARD[difficulty] : 0;
}

function masteryPercent(evidence: readonly MasteryEvidence[]) {
  if (evidence.length === 0) return 0;
  const denominator = evidence.reduce(
    (total, item) => total + MASTERY_WEIGHT_HUNDREDTHS[item.difficulty],
    0,
  );
  const numerator = evidence.reduce(
    (total, item) =>
      total +
      (item.isCorrect ? MASTERY_WEIGHT_HUNDREDTHS[item.difficulty] : 0),
    0,
  );
  return roundHalfUpRatio(numerator * 100, denominator);
}

export function calculateMasteryProjection(input: Readonly<{
  evidence: readonly MasteryEvidence[];
  previouslyMastered?: boolean;
}>): MasteryProjection {
  const distinct = new Map<string, MasteryEvidence>();
  for (const item of input.evidence) {
    if (!item.evidenceId || distinct.has(item.evidenceId)) {
      throw new Error("SCORING:DUPLICATE_MASTERY_EVIDENCE");
    }
    if (!Number.isFinite(Date.parse(item.answeredAt))) {
      throw new Error("SCORING:INVALID_EVIDENCE_TIME");
    }
    distinct.set(item.evidenceId, item);
  }
  const active = [...distinct.values()]
    .sort(
      (left, right) =>
        Date.parse(right.answeredAt) - Date.parse(left.answeredAt) ||
        right.evidenceId.localeCompare(left.evidenceId),
    )
    .slice(0, 10);
  const evidenceCount = active.length;
  const correctCount = active.filter((item) => item.isCorrect).length;
  const percent = masteryPercent(active);
  const mediumHardCorrectCount = active.filter(
    (item) => item.isCorrect && item.difficulty !== "EASY",
  ).length;
  const latestFive = active.slice(0, 5);
  const reviewRegression =
    Boolean(input.previouslyMastered) &&
    latestFive.length === 5 &&
    masteryPercent(latestFive) < 60;

  let status: MasteryStatus;
  if (evidenceCount === 0) status = "NOT_STARTED";
  else if (reviewRegression) status = "NEEDS_REVIEW";
  else if (
    evidenceCount >= 8 &&
    percent >= 80 &&
    mediumHardCorrectCount >= 2
  ) {
    status = "MASTERED";
  } else if (evidenceCount <= 4) status = "IN_PROGRESS";
  else if (percent < 60) status = "DEVELOPING";
  else status = "PROFICIENT";

  return {
    policyVersion: PLAVE_SCORING_POLICY_V1,
    evidenceCount,
    correctCount,
    masteryPercent: percent,
    status,
    lastEvidenceAt: active[0]?.answeredAt ?? null,
    mediumHardCorrectCount,
    activeEvidenceIds: active.map((item) => item.evidenceId),
    everMastered: Boolean(input.previouslyMastered) || status === "MASTERED",
  };
}
