import { gradeOneWaveHPack, gradeOneWaveHProgression } from "./grade1-wave-h.ts";
import { gradeTwoWaveHPack } from "./grade2-wave-h.ts";
import { gradeThreeWaveHPack } from "./grade3-wave-h.ts";
import { gradeFourWaveHPack } from "./grade4-wave-h.ts";
import { gradeFiveWaveHPack } from "./grade5-wave-h.ts";
import { gradeSixWaveHPack } from "./grade6-wave-h.ts";
import { gradeSevenWaveHPack } from "./grade7-wave-h.ts";
import { gradeEightWaveHPack } from "./grade8-wave-h.ts";
import { gradeNineWaveHPack } from "./grade9-wave-h.ts";
import type { FactoryGrade, GradePack } from "./types.ts";
import { combinedWaveABCDEFGGradePacks, waveGProgressionContracts } from "./wave-g-packs.ts";
import { assertWaveHProgressionContract, combineWaveABCDEFGHPacks, type WaveHProgressionContract } from "./wave-h.ts";

export const waveHGradePacks: readonly GradePack[] = [gradeOneWaveHPack, gradeTwoWaveHPack, gradeThreeWaveHPack,
  gradeFourWaveHPack, gradeFiveWaveHPack, gradeSixWaveHPack, gradeSevenWaveHPack, gradeEightWaveHPack, gradeNineWaveHPack];

const combinedBindings = new Map<FactoryGrade, Readonly<{ packId: string; version: string; candidateId: string; policyVersion: string; selectedSliceId: string }>>(
  ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((grade) => [grade, {
    packId: `grade-${grade}-combined-wave-a-b-c-d-e-f-g-h`, version: `g${grade}-combined-1.0.0-wave-h`,
    candidateId: `g${grade}-combined-wave-a-b-c-d-e-f-g-h`, policyVersion: `g${grade}-combined-policy-1.0.0-wave-h`,
    selectedSliceId: `grade-${grade}-wave-a-plus-wave-b-plus-wave-c-plus-wave-d-plus-wave-e-plus-wave-f-plus-wave-g-plus-wave-h`,
  }]),
);

export const combinedWaveABCDEFGHGradePacks: readonly GradePack[] = combinedWaveABCDEFGGradePacks.map((combinedABCDEFG) => {
  const waveH = waveHGradePacks.find((pack) => pack.grade === combinedABCDEFG.grade); const binding = combinedBindings.get(combinedABCDEFG.grade);
  if (!waveH || !binding) throw new Error(`WAVE_H_COMBINATION_MISSING:G${combinedABCDEFG.grade}`);
  return combineWaveABCDEFGHPacks(combinedABCDEFG, waveH, binding);
});

export const waveHProgressionContracts: readonly WaveHProgressionContract[] = waveHGradePacks.map((waveH) => {
  if (waveH.grade === 1) return { ...gradeOneWaveHProgression,
    intermediateRemediationSkillIds: [gradeOneWaveHProgression.priorSkillId] } satisfies WaveHProgressionContract;
  const waveHSkillIds = [...new Set(waveH.questions.map((question) => question.skillId))];
  const previous = waveGProgressionContracts.find((contract) => contract.grade === waveH.grade);
  const incoming = waveH.prerequisites.find((edge) => waveHSkillIds.includes(edge.toSkillId) && !waveHSkillIds.includes(edge.fromSkillId));
  const combinedPrior = combinedWaveABCDEFGGradePacks.find((pack) => pack.grade === waveH.grade)!;
  const previousQuestionSkill = [...(previous?.waveGSkillIds ?? [])].reverse().find((skillId) => combinedPrior.questions.some((question) => question.skillId === skillId));
  const priorSkillId = incoming && combinedPrior.questions.some((question) => question.skillId === incoming.fromSkillId)
    ? incoming.fromSkillId : previousQuestionSkill; const first = waveHSkillIds[0]; const last = waveHSkillIds.at(-1);
  if (!priorSkillId || !first || !last) throw new Error(`WAVE_H_PROGRESSION_INPUT_MISSING:G${waveH.grade}`);
  return { grade: waveH.grade, priorSkillId, waveHSkillIds, intermediateRemediationSkillIds: [priorSkillId],
    actions: { continueTargetSkillId: first, remediateTargetSkillId: priorSkillId, advanceTargetSkillId: last,
      retentionTargetSkillId: first, mixedPracticeTargetSkillIds: [priorSkillId, first] }, nextTargetSkillId: last,
    prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", schoolGradeMutation: false, entitlementGrant: false } satisfies WaveHProgressionContract;
});

for (const contract of waveHProgressionContracts) {
  const combined = combinedWaveABCDEFGHGradePacks.find((pack) => pack.grade === contract.grade);
  if (!combined) throw new Error(`WAVE_H_COMBINED_PACK_MISSING:G${contract.grade}`);
  assertWaveHProgressionContract(combined, contract);
}

export function getWaveHGradePacks(grades: readonly FactoryGrade[]) { return waveHGradePacks.filter((pack) => grades.includes(pack.grade)); }
export function getCombinedWaveABCDEFGHGradePacks(grades: readonly FactoryGrade[]) { return combinedWaveABCDEFGHGradePacks.filter((pack) => grades.includes(pack.grade)); }
