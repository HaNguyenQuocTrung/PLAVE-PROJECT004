import { sha256 } from "./canonical.ts";

export type LegacyShadowQuestion = Readonly<{ questionId: string; skillId: string }>;
export type GradeOneShadowReport = Readonly<{
  mode: "SHADOW_ONLY_NO_RUNTIME_INTEGRATION";
  fixedSelection: readonly string[];
  proposedAdaptiveSelection: readonly string[];
  sameQuestionSet: boolean;
  historyMutation: false;
  pedagogicalClaim: "NONE";
}>;

export function simulateGradeOneShadowComparison(questions: readonly LegacyShadowQuestion[], seed: string, limit: number): GradeOneShadowReport {
  if (limit < 1 || limit > questions.length || new Set(questions.map((item) => item.questionId)).size !== questions.length) throw new Error("INVALID_GRADE1_SHADOW_INPUT");
  const fixedSelection = questions.slice(0, limit).map((item) => item.questionId);
  const proposedAdaptiveSelection = [...questions]
    .sort((a, b) => `${a.skillId}:${sha256(`${seed}:${a.questionId}`)}`.localeCompare(`${b.skillId}:${sha256(`${seed}:${b.questionId}`)}`))
    .slice(0, limit).map((item) => item.questionId);
  return { mode: "SHADOW_ONLY_NO_RUNTIME_INTEGRATION", fixedSelection, proposedAdaptiveSelection, sameQuestionSet: [...fixedSelection].sort().join("|") === [...proposedAdaptiveSelection].sort().join("|"), historyMutation: false, pedagogicalClaim: "NONE" };
}
