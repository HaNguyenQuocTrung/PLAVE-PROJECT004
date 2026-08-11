import { gradeOneWaveFPack, gradeOneWaveFProgression } from "./grade1-wave-f.ts";
import { gradeTwoWaveFPack } from "./grade2-wave-f.ts";
import { gradeThreeWaveFPack } from "./grade3-wave-f.ts";
import { gradeFourWaveFPack } from "./grade4-wave-f.ts";
import { gradeFiveWaveFPack } from "./grade5-wave-f.ts";
import { gradeSixWaveFPack } from "./grade6-wave-f.ts";
import { gradeSevenWaveFPack } from "./grade7-wave-f.ts";
import { gradeEightWaveFPack } from "./grade8-wave-f.ts";
import { gradeNineWaveFPack } from "./grade9-wave-f.ts";
import type { FactoryGrade, GradePack } from "./types.ts";
import { combinedWaveABCDEGradePacks, waveEProgressionContracts } from "./wave-e-packs.ts";
import { assertWaveFProgressionContract, combineWaveABCDEFPacks, type WaveFProgressionContract } from "./wave-f.ts";

export const waveFGradePacks: readonly GradePack[] = [gradeOneWaveFPack, gradeTwoWaveFPack, gradeThreeWaveFPack,
  gradeFourWaveFPack, gradeFiveWaveFPack, gradeSixWaveFPack, gradeSevenWaveFPack, gradeEightWaveFPack, gradeNineWaveFPack];

const combinedBindings = new Map<FactoryGrade, Readonly<{ packId: string; version: string; candidateId: string; policyVersion: string; selectedSliceId: string }>>(
  ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((grade) => [grade, {
    packId: `grade-${grade}-combined-wave-a-b-c-d-e-f`, version: `g${grade}-combined-1.0.0-wave-f`,
    candidateId: `g${grade}-combined-wave-a-b-c-d-e-f`, policyVersion: `g${grade}-combined-policy-1.0.0-wave-f`,
    selectedSliceId: `grade-${grade}-wave-a-plus-wave-b-plus-wave-c-plus-wave-d-plus-wave-e-plus-wave-f`,
  }]),
);

export const combinedWaveABCDEFGradePacks: readonly GradePack[] = combinedWaveABCDEGradePacks.map((combinedABCDE) => {
  const waveF = waveFGradePacks.find((pack) => pack.grade === combinedABCDE.grade);
  const binding = combinedBindings.get(combinedABCDE.grade);
  if (!waveF || !binding) throw new Error(`WAVE_F_COMBINATION_MISSING:G${combinedABCDE.grade}`);
  return combineWaveABCDEFPacks(combinedABCDE, waveF, binding);
});

export const waveFProgressionContracts: readonly WaveFProgressionContract[] = waveFGradePacks.map((waveF) => {
  if (waveF.grade === 1) return gradeOneWaveFProgression;
  const previous = waveEProgressionContracts.find((contract) => contract.grade === waveF.grade);
  const waveFSkillIds = [...new Set(waveF.questions.map((question) => question.skillId))];
  const priorSkillId = previous?.waveESkillIds.at(-1);
  const first = waveFSkillIds[0];
  const last = waveFSkillIds.at(-1);
  if (!priorSkillId || !first || !last) throw new Error(`WAVE_F_PROGRESSION_INPUT_MISSING:G${waveF.grade}`);
  return { grade: waveF.grade, priorSkillId, waveFSkillIds,
    actions: { continueTargetSkillId: first, remediateTargetSkillId: priorSkillId, advanceTargetSkillId: last,
      retentionTargetSkillId: first, mixedPracticeTargetSkillIds: [priorSkillId, first] },
    nextTargetSkillId: last, prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
    schoolGradeMutation: false, entitlementGrant: false } satisfies WaveFProgressionContract;
});

for (const contract of waveFProgressionContracts) {
  const combined = combinedWaveABCDEFGradePacks.find((pack) => pack.grade === contract.grade);
  if (!combined) throw new Error(`WAVE_F_COMBINED_PACK_MISSING:G${contract.grade}`);
  assertWaveFProgressionContract(combined, contract);
}

export function getWaveFGradePacks(grades: readonly FactoryGrade[]) { return waveFGradePacks.filter((pack) => grades.includes(pack.grade)); }
export function getCombinedWaveABCDEFGradePacks(grades: readonly FactoryGrade[]) { return combinedWaveABCDEFGradePacks.filter((pack) => grades.includes(pack.grade)); }
