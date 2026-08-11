import { gradeOneWaveEPack, gradeOneWaveEProgression } from "./grade1-wave-e.ts";
import { gradeTwoWaveEPack } from "./grade2-wave-e.ts";
import { gradeThreeWaveEPack } from "./grade3-wave-e.ts";
import { gradeFourWaveEPack } from "./grade4-wave-e.ts";
import { gradeFiveWaveEPack } from "./grade5-wave-e.ts";
import { gradeSixWaveEPack } from "./grade6-wave-e.ts";
import { gradeSevenWaveEPack } from "./grade7-wave-e.ts";
import { gradeEightWaveEPack } from "./grade8-wave-e.ts";
import { gradeNineWaveEPack } from "./grade9-wave-e.ts";
import type { FactoryGrade, GradePack } from "./types.ts";
import { combinedWaveABCDGradePacks, waveDProgressionContracts } from "./wave-d-packs.ts";
import { assertWaveEProgressionContract, combineWaveABCDEPacks, type WaveEProgressionContract } from "./wave-e.ts";

export const waveEGradePacks: readonly GradePack[] = [gradeOneWaveEPack, gradeTwoWaveEPack, gradeThreeWaveEPack,
  gradeFourWaveEPack, gradeFiveWaveEPack, gradeSixWaveEPack, gradeSevenWaveEPack, gradeEightWaveEPack, gradeNineWaveEPack];

const combinedBindings = new Map<FactoryGrade, Readonly<{ packId: string; version: string; candidateId: string; policyVersion: string; selectedSliceId: string }>>(
  ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((grade) => [grade, {
    packId: `grade-${grade}-combined-wave-a-b-c-d-e`, version: `g${grade}-combined-1.0.0-wave-e`,
    candidateId: `g${grade}-combined-wave-a-b-c-d-e`, policyVersion: `g${grade}-combined-policy-1.0.0-wave-e`,
    selectedSliceId: `grade-${grade}-wave-a-plus-wave-b-plus-wave-c-plus-wave-d-plus-wave-e`,
  }]),
);

export const combinedWaveABCDEGradePacks: readonly GradePack[] = combinedWaveABCDGradePacks.map((combinedABCD) => {
  const waveE = waveEGradePacks.find((pack) => pack.grade === combinedABCD.grade);
  const binding = combinedBindings.get(combinedABCD.grade);
  if (!waveE || !binding) throw new Error(`WAVE_E_COMBINATION_MISSING:G${combinedABCD.grade}`);
  return combineWaveABCDEPacks(combinedABCD, waveE, binding);
});

export const waveEProgressionContracts: readonly WaveEProgressionContract[] = waveEGradePacks.map((waveE) => {
  if (waveE.grade === 1) return gradeOneWaveEProgression;
  const previous = waveDProgressionContracts.find((contract) => contract.grade === waveE.grade);
  const waveESkillIds = [...new Set(waveE.questions.map((question) => question.skillId))];
  const priorSkillId = previous?.waveDSkillIds.at(-1);
  const first = waveESkillIds[0];
  const last = waveESkillIds.at(-1);
  if (!priorSkillId || !first || !last) throw new Error(`WAVE_E_PROGRESSION_INPUT_MISSING:G${waveE.grade}`);
  return { grade: waveE.grade, priorSkillId, waveESkillIds,
    actions: { continueTargetSkillId: first, remediateTargetSkillId: priorSkillId, advanceTargetSkillId: last,
      retentionTargetSkillId: first, mixedPracticeTargetSkillIds: [priorSkillId, first] },
    nextTargetSkillId: last, prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
    schoolGradeMutation: false, entitlementGrant: false } satisfies WaveEProgressionContract;
});

for (const contract of waveEProgressionContracts) {
  const combined = combinedWaveABCDEGradePacks.find((pack) => pack.grade === contract.grade);
  if (!combined) throw new Error(`WAVE_E_COMBINED_PACK_MISSING:G${contract.grade}`);
  assertWaveEProgressionContract(combined, contract);
}

export function getWaveEGradePacks(grades: readonly FactoryGrade[]) { return waveEGradePacks.filter((pack) => grades.includes(pack.grade)); }
export function getCombinedWaveABCDEGradePacks(grades: readonly FactoryGrade[]) { return combinedWaveABCDEGradePacks.filter((pack) => grades.includes(pack.grade)); }
