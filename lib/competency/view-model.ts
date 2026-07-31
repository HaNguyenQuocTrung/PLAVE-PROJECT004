import type {
  LearningPathRecommendation,
  SkillCompetency,
} from "./engine.ts";

export type CompetencyViewModel = Readonly<{
  title: "Năng lực của em";
  policyVersion: string;
  productHypothesis: true;
  skills: readonly SkillCompetency[];
}>;

export type LearningPathViewModel = Readonly<{
  title: "Bài nên học tiếp";
  policyVersion: string;
  productHypothesis: true;
  recommendation: LearningPathRecommendation | null;
}>;

export function toCompetencyViewModel(
  skills: readonly SkillCompetency[],
): CompetencyViewModel {
  return {
    title: "Năng lực của em",
    policyVersion: skills[0]?.policyVersion ?? "competency-v1-product-hypothesis",
    productHypothesis: true,
    skills,
  };
}

export function toLearningPathViewModel(
  recommendation: LearningPathRecommendation | null,
): LearningPathViewModel {
  return {
    title: "Bài nên học tiếp",
    policyVersion:
      recommendation?.policyVersion ?? "learning-path-v1-product-hypothesis",
    productHypothesis: true,
    recommendation,
  };
}
