import type { StudentScoringSummary } from "./contracts.ts";
import type { MotivationSummary } from "../motivation/contracts.ts";

export type StudentLearningEnrichment = Readonly<{
  scoring: StudentScoringSummary | null;
  motivation: MotivationSummary | null;
  consistency: "CONSISTENT" | "SCORING_UNAVAILABLE" | "XP_MISMATCH";
}>;

/**
 * XP has one public aggregate source: the scoring projection backed by the
 * immutable XP ledger. Motivation is optional enrichment and must never
 * override or contradict that total on Student/Parent surfaces.
 */
export function reconcileStudentLearningEnrichment(input: Readonly<{
  scoring: StudentScoringSummary | null;
  motivation: MotivationSummary | null;
}>): StudentLearningEnrichment {
  if (!input.scoring) {
    return {
      scoring: null,
      motivation: null,
      consistency: "SCORING_UNAVAILABLE",
    };
  }
  if (
    input.motivation &&
    input.motivation.level.totalXp !== input.scoring.totalXp
  ) {
    return {
      scoring: input.scoring,
      motivation: null,
      consistency: "XP_MISMATCH",
    };
  }
  return {
    scoring: input.scoring,
    motivation: input.motivation,
    consistency: "CONSISTENT",
  };
}
