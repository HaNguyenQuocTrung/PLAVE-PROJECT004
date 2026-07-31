import type {
  PracticeReview,
  SafePracticeErrorCode,
  SkillCode,
} from "./contracts.ts";
import { getSkillLabel, getUnitSkillCodes } from "./catalog.ts";

export type ReviewSkillResult = {
  skillCode: SkillCode;
  label: string;
  correct: number;
  total: number;
  isStrong: boolean;
};

export type PracticeReviewViewModel = {
  percent: number;
  skillResults: ReviewSkillResult[];
  strengths: ReviewSkillResult[];
  reviewSkills: ReviewSkillResult[];
};

export type ReviewLoadDisposition = "RENDER" | "NOT_FOUND" | "SAFE_ERROR";

export function classifyReviewLoad(
  review: PracticeReview | null,
  rpcErrorCode: SafePracticeErrorCode | null,
): ReviewLoadDisposition {
  if (rpcErrorCode === "PRACTICE_UNAVAILABLE") return "NOT_FOUND";
  if (rpcErrorCode) return "SAFE_ERROR";
  if (!review) return "SAFE_ERROR";
  return "RENDER";
}

export function getPracticeReviewPath(attemptId: string) {
  return `/review/${encodeURIComponent(attemptId)}`;
}

export async function resolveReviewAttemptId(
  params: Promise<{ attemptId: string }>,
) {
  const { attemptId } = await params;
  return attemptId;
}

export function buildPracticeReviewViewModel(
  review: PracticeReview,
): PracticeReviewViewModel {
  const percent = Math.round(
    (review.correctCount / review.totalQuestions) * 100,
  );
  const catalogSkillCodes = getUnitSkillCodes(review.unitSlug);
  const reviewSkillCodes =
    catalogSkillCodes.length > 0
      ? catalogSkillCodes
      : [...new Set(review.answers.map((answer) => answer.skillCode))].sort();
  const skillResults = reviewSkillCodes.map((skillCode) => {
    const answers = review.answers.filter(
      (answer) => answer.skillCode === skillCode,
    );
    const correct = answers.filter((answer) => answer.isCorrect).length;
    return {
      skillCode,
      label: getSkillLabel(skillCode),
      correct,
      total: answers.length,
      isStrong: answers.length > 0 && correct / answers.length >= 0.75,
    };
  });

  return {
    percent,
    skillResults,
    strengths: skillResults.filter((result) => result.isStrong),
    reviewSkills: skillResults.filter(
      (result) => result.total > 0 && !result.isStrong,
    ),
  };
}
