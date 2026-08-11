import { gradeOneWaveGPack, gradeOneWaveGProgression } from "./grade1-wave-g.ts";
import { gradeTwoWaveGPack } from "./grade2-wave-g.ts";
import { gradeThreeWaveGPack } from "./grade3-wave-g.ts";
import { gradeFourWaveGPack } from "./grade4-wave-g.ts";
import { gradeFiveWaveGPack } from "./grade5-wave-g.ts";
import { gradeSixWaveGPack } from "./grade6-wave-g.ts";
import { gradeSevenWaveGPack } from "./grade7-wave-g.ts";
import { gradeEightWaveGPack } from "./grade8-wave-g.ts";
import { gradeNineWaveGPack } from "./grade9-wave-g.ts";
import type { FactoryGrade, GradePack } from "./types.ts";
import { combinedWaveABCDEFGradePacks, waveFProgressionContracts } from "./wave-f-packs.ts";
import { assertWaveGProgressionContract, combineWaveABCDEFGPacks, type WaveGProgressionContract } from "./wave-g.ts";

export const waveGGradePacks: readonly GradePack[] = [gradeOneWaveGPack, gradeTwoWaveGPack, gradeThreeWaveGPack,
  gradeFourWaveGPack, gradeFiveWaveGPack, gradeSixWaveGPack, gradeSevenWaveGPack, gradeEightWaveGPack, gradeNineWaveGPack];

const combinedBindings = new Map<FactoryGrade, Readonly<{ packId: string; version: string; candidateId: string; policyVersion: string; selectedSliceId: string }>>(
  ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((grade) => [grade, {
    packId: `grade-${grade}-combined-wave-a-b-c-d-e-f-g`, version: `g${grade}-combined-1.0.0-wave-g`,
    candidateId: `g${grade}-combined-wave-a-b-c-d-e-f-g`, policyVersion: `g${grade}-combined-policy-1.0.0-wave-g`,
    selectedSliceId: `grade-${grade}-wave-a-plus-wave-b-plus-wave-c-plus-wave-d-plus-wave-e-plus-wave-f-plus-wave-g`,
  }]),
);

export const combinedWaveABCDEFGGradePacks: readonly GradePack[] = combinedWaveABCDEFGradePacks.map((combinedABCDEF) => {
  const waveG = waveGGradePacks.find((pack) => pack.grade === combinedABCDEF.grade);
  const binding = combinedBindings.get(combinedABCDEF.grade);
  if (!waveG || !binding) throw new Error(`WAVE_G_COMBINATION_MISSING:G${combinedABCDEF.grade}`);
  return combineWaveABCDEFGPacks(combinedABCDEF, waveG, binding);
});

export const waveGProgressionContracts: readonly WaveGProgressionContract[] = waveGGradePacks.map((waveG) => {
  if (waveG.grade === 1) return gradeOneWaveGProgression;
  const previous = waveFProgressionContracts.find((contract) => contract.grade === waveG.grade);
  const waveGSkillIds = [...new Set(waveG.questions.map((question) => question.skillId))];
  const priorSkillId = previous?.waveFSkillIds.at(-1); const first = waveGSkillIds[0]; const last = waveGSkillIds.at(-1);
  if (!priorSkillId || !first || !last) throw new Error(`WAVE_G_PROGRESSION_INPUT_MISSING:G${waveG.grade}`);
  return { grade: waveG.grade, priorSkillId, waveGSkillIds,
    actions: { continueTargetSkillId: first, remediateTargetSkillId: priorSkillId, advanceTargetSkillId: last,
      retentionTargetSkillId: first, mixedPracticeTargetSkillIds: [priorSkillId, first] },
    nextTargetSkillId: last, prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
    schoolGradeMutation: false, entitlementGrant: false } satisfies WaveGProgressionContract;
});

for (const contract of waveGProgressionContracts) {
  const combined = combinedWaveABCDEFGGradePacks.find((pack) => pack.grade === contract.grade);
  if (!combined) throw new Error(`WAVE_G_COMBINED_PACK_MISSING:G${contract.grade}`);
  assertWaveGProgressionContract(combined, contract);
}

export function getWaveGGradePacks(grades: readonly FactoryGrade[]) { return waveGGradePacks.filter((pack) => grades.includes(pack.grade)); }
export function getCombinedWaveABCDEFGGradePacks(grades: readonly FactoryGrade[]) { return combinedWaveABCDEFGGradePacks.filter((pack) => grades.includes(pack.grade)); }
