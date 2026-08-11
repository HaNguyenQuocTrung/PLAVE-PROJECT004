import { gradeOneCombinedWaveABPack, gradeOneWaveBPack, gradeOneWaveBProgression } from "./grade1-wave-b.ts";
import { gradeTwoWaveBPack, gradeTwoWaveBProgression } from "./grade2-wave-b.ts";
import { gradeThreeWaveBPack, gradeThreeWaveBProgression } from "./grade3-wave-b.ts";
import { gradeFourWaveBPack, gradeFourWaveBProgression } from "./grade4-wave-b.ts";
import { gradeFiveWaveBMetadata, gradeFiveWaveBPack } from "./grade5-wave-b.ts";
import { gradeSixWaveBMetadata, gradeSixWaveBPack } from "./grade6-wave-b.ts";
import { gradeSevenWaveBMetadata, gradeSevenWaveBPack } from "./grade7-wave-b.ts";
import { gradeEightWaveBMetadata, gradeEightWaveBPack } from "./grade8-wave-b.ts";
import { gradeNineWaveBMetadata, gradeNineWaveBPack } from "./grade9-wave-b.ts";
import { officialSkillId } from "./official-source-map.ts";
import { productionGradePacks } from "./packs.ts";
import type { FactoryGrade, GradePack } from "./types.ts";
import {
  assertWaveBProgressionContract,
  combineWavePacks,
  type WaveBProgressionContract,
} from "./wave-b.ts";

export const waveBGradePacks: readonly GradePack[] = [
  gradeOneWaveBPack,
  gradeTwoWaveBPack,
  gradeThreeWaveBPack,
  gradeFourWaveBPack,
  gradeFiveWaveBPack,
  gradeSixWaveBPack,
  gradeSevenWaveBPack,
  gradeEightWaveBPack,
  gradeNineWaveBPack,
];

const combinedBindings = new Map<FactoryGrade, Readonly<{
  packId: string;
  version: string;
  candidateId: string;
  policyVersion: string;
  selectedSliceId: string;
}>>(
  ([2, 3, 4, 5, 6, 7, 8, 9] as const).map((grade) => [grade, {
    packId: `grade-${grade}-combined-wave-a-b`,
    version: `g${grade}-combined-1.0.0-wave-b`,
    candidateId: `g${grade}-combined-wave-a-b`,
    policyVersion: `g${grade}-combined-policy-1.0.0-wave-b`,
    selectedSliceId: `grade-${grade}-wave-a-plus-wave-b`,
  }]),
);

export const combinedWaveABGradePacks: readonly GradePack[] = [
  gradeOneCombinedWaveABPack,
  ...productionGradePacks.slice(1).map((waveA) => {
    const waveB = waveBGradePacks.find((pack) => pack.grade === waveA.grade);
    const binding = combinedBindings.get(waveA.grade);
    if (!waveB || !binding) throw new Error(`WAVE_B_COMBINATION_MISSING:G${waveA.grade}`);
    return combineWavePacks(waveA, waveB, binding);
  }),
];

function uniqueQuestionSkills(pack: GradePack) {
  return [...new Set(pack.questions.map((question) => question.skillId))];
}

export const waveBProgressionContracts: readonly WaveBProgressionContract[] = [
  gradeOneWaveBProgression,
  gradeTwoWaveBProgression,
  gradeThreeWaveBProgression,
  gradeFourWaveBProgression,
  ...waveBGradePacks.slice(4).map((waveB) => {
    const waveA = productionGradePacks.find((pack) => pack.grade === waveB.grade)!;
    const waveASkills = uniqueQuestionSkills(waveA);
    const waveBSkills = uniqueQuestionSkills(waveB);
    if (!waveASkills[0] || !waveBSkills[0]) throw new Error(`WAVE_B_PROGRESSION_EMPTY:G${waveB.grade}`);
    const metadata = waveB.grade === 5 ? gradeFiveWaveBMetadata
      : waveB.grade === 6 ? gradeSixWaveBMetadata
      : waveB.grade === 7 ? gradeSevenWaveBMetadata
      : waveB.grade === 8 ? gradeEightWaveBMetadata
      : gradeNineWaveBMetadata;
    const nextTargetSkillId = officialSkillId(metadata.nextTargetOutcomeIds[0]);
    return {
      grade: waveB.grade,
      waveASkillId: waveASkills.at(-1)!,
      waveBSkillIds: waveBSkills,
      remediationTargetSkillId: waveASkills.at(-1)!,
      advanceTargetSkillId: waveBSkills[1] ?? nextTargetSkillId,
      retentionTargetSkillId: waveBSkills[0],
      nextTargetSkillId,
      schoolGradeMutation: false,
      entitlementGrant: false,
    } satisfies WaveBProgressionContract;
  }),
];

for (const contract of waveBProgressionContracts) {
  const combined = combinedWaveABGradePacks.find((pack) => pack.grade === contract.grade);
  if (!combined) throw new Error(`WAVE_B_COMBINED_PACK_MISSING:G${contract.grade}`);
  assertWaveBProgressionContract(combined, contract);
}

export function getWaveBGradePacks(grades: readonly FactoryGrade[]) {
  return waveBGradePacks.filter((pack) => grades.includes(pack.grade));
}

export function getCombinedWaveABGradePacks(grades: readonly FactoryGrade[]) {
  return combinedWaveABGradePacks.filter((pack) => grades.includes(pack.grade));
}
