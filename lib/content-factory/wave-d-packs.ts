import { gradeOneWaveDPack, gradeOneWaveDProgression } from "./grade1-wave-d.ts";
import { gradeTwoWaveDPack } from "./grade2-wave-d.ts";
import { gradeThreeWaveDPack } from "./grade3-wave-d.ts";
import { gradeFourWaveDPack } from "./grade4-wave-d.ts";
import { gradeFiveWaveDPack } from "./grade5-wave-d.ts";
import { gradeSixWaveDPack } from "./grade6-wave-d.ts";
import { gradeSevenWaveDPack } from "./grade7-wave-d.ts";
import { gradeEightWaveDPack } from "./grade8-wave-d.ts";
import { gradeNineWaveDPack } from "./grade9-wave-d.ts";
import type { FactoryGrade, GradePack } from "./types.ts";
import { combinedWaveABCGradePacks, waveCProgressionContracts } from "./wave-c-packs.ts";
import { assertWaveDProgressionContract, combineWaveABCDPacks, type WaveDProgressionContract } from "./wave-d.ts";

export const waveDGradePacks: readonly GradePack[] = [
  gradeOneWaveDPack,
  gradeTwoWaveDPack,
  gradeThreeWaveDPack,
  gradeFourWaveDPack,
  gradeFiveWaveDPack,
  gradeSixWaveDPack,
  gradeSevenWaveDPack,
  gradeEightWaveDPack,
  gradeNineWaveDPack,
];

const combinedBindings = new Map<FactoryGrade, Readonly<{
  packId: string;
  version: string;
  candidateId: string;
  policyVersion: string;
  selectedSliceId: string;
}>>(([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((grade) => [grade, {
  packId: `grade-${grade}-combined-wave-a-b-c-d`,
  version: `g${grade}-combined-1.0.0-wave-d`,
  candidateId: `g${grade}-combined-wave-a-b-c-d`,
  policyVersion: `g${grade}-combined-policy-1.0.0-wave-d`,
  selectedSliceId: `grade-${grade}-wave-a-plus-wave-b-plus-wave-c-plus-wave-d`,
}]));

export const combinedWaveABCDGradePacks: readonly GradePack[] = combinedWaveABCGradePacks.map((combinedABC) => {
  const waveD = waveDGradePacks.find((pack) => pack.grade === combinedABC.grade);
  const binding = combinedBindings.get(combinedABC.grade);
  if (!waveD || !binding) throw new Error(`WAVE_D_COMBINATION_MISSING:G${combinedABC.grade}`);
  return combineWaveABCDPacks(combinedABC, waveD, binding);
});

export const waveDProgressionContracts: readonly WaveDProgressionContract[] = waveDGradePacks.map((waveD) => {
  if (waveD.grade === 1) return gradeOneWaveDProgression;
  const previous = waveCProgressionContracts.find((contract) => contract.grade === waveD.grade);
  const waveDSkillIds = [...new Set(waveD.questions.map((question) => question.skillId))];
  const priorSkillId = previous?.waveCSkillIds.at(-1);
  const first = waveDSkillIds[0];
  const last = waveDSkillIds.at(-1);
  if (!priorSkillId || !first || !last) throw new Error(`WAVE_D_PROGRESSION_INPUT_MISSING:G${waveD.grade}`);
  return {
    grade: waveD.grade,
    priorSkillId,
    waveDSkillIds,
    actions: {
      continueTargetSkillId: first,
      remediateTargetSkillId: priorSkillId,
      advanceTargetSkillId: last,
      retentionTargetSkillId: first,
      mixedPracticeTargetSkillIds: [priorSkillId, first],
    },
    nextTargetSkillId: last,
    prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
    schoolGradeMutation: false,
    entitlementGrant: false,
  } satisfies WaveDProgressionContract;
});

for (const contract of waveDProgressionContracts) {
  const combined = combinedWaveABCDGradePacks.find((pack) => pack.grade === contract.grade);
  if (!combined) throw new Error(`WAVE_D_COMBINED_PACK_MISSING:G${contract.grade}`);
  assertWaveDProgressionContract(combined, contract);
}

export function getWaveDGradePacks(grades: readonly FactoryGrade[]) {
  return waveDGradePacks.filter((pack) => grades.includes(pack.grade));
}

export function getCombinedWaveABCDGradePacks(grades: readonly FactoryGrade[]) {
  return combinedWaveABCDGradePacks.filter((pack) => grades.includes(pack.grade));
}
