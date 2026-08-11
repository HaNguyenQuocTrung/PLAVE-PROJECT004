import { gradeOneWaveCMetadata, gradeOneWaveCPack, gradeOneWaveCProgression } from "./grade1-wave-c.ts";
import { gradeTwoWaveCMetadata, gradeTwoWaveCPack, gradeTwoWaveCProgression } from "./grade2-wave-c.ts";
import { gradeThreeWaveCMetadata, gradeThreeWaveCPack, gradeThreeWaveCProgression } from "./grade3-wave-c.ts";
import { gradeFourWaveCMetadata, gradeFourWaveCPack } from "./grade4-wave-c.ts";
import { gradeFiveWaveCMetadata, gradeFiveWaveCPack } from "./grade5-wave-c.ts";
import { gradeSixWaveCMetadata, gradeSixWaveCPack } from "./grade6-wave-c.ts";
import { gradeSevenWaveCMetadata, gradeSevenWaveCPack } from "./grade7-wave-c.ts";
import { gradeEightWaveCMetadata, gradeEightWaveCPack } from "./grade8-wave-c.ts";
import { gradeNineWaveCMetadata, gradeNineWaveCPack } from "./grade9-wave-c.ts";
import { officialSkillId } from "./official-source-map.ts";
import type { FactoryGrade, GradePack } from "./types.ts";
import { combinedWaveABGradePacks, waveBProgressionContracts } from "./wave-b-packs.ts";
import { assertWaveCProgressionContract, combineWaveABCPacks, type WaveCProgressionContract } from "./wave-c.ts";

export const waveCGradePacks: readonly GradePack[] = [
  gradeOneWaveCPack,
  gradeTwoWaveCPack,
  gradeThreeWaveCPack,
  gradeFourWaveCPack,
  gradeFiveWaveCPack,
  gradeSixWaveCPack,
  gradeSevenWaveCPack,
  gradeEightWaveCPack,
  gradeNineWaveCPack,
];

const metadata = [
  gradeOneWaveCMetadata,
  gradeTwoWaveCMetadata,
  gradeThreeWaveCMetadata,
  gradeFourWaveCMetadata,
  gradeFiveWaveCMetadata,
  gradeSixWaveCMetadata,
  gradeSevenWaveCMetadata,
  gradeEightWaveCMetadata,
  gradeNineWaveCMetadata,
] as const;

const combinedBindings = new Map<FactoryGrade, Readonly<{
  packId: string;
  version: string;
  candidateId: string;
  policyVersion: string;
  selectedSliceId: string;
}>>(([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((grade) => [grade, {
  packId: `grade-${grade}-combined-wave-a-b-c`,
  version: `g${grade}-combined-1.0.0-wave-c`,
  candidateId: `g${grade}-combined-wave-a-b-c`,
  policyVersion: `g${grade}-combined-policy-1.0.0-wave-c`,
  selectedSliceId: `grade-${grade}-wave-a-plus-wave-b-plus-wave-c`,
}]));

export const combinedWaveABCGradePacks: readonly GradePack[] = combinedWaveABGradePacks.map((combinedAB) => {
  const waveC = waveCGradePacks.find((pack) => pack.grade === combinedAB.grade);
  const binding = combinedBindings.get(combinedAB.grade);
  if (!waveC || !binding) throw new Error(`WAVE_C_COMBINATION_MISSING:G${combinedAB.grade}`);
  return combineWaveABCPacks(combinedAB, waveC, binding);
});

function legacyContract(
  progression: typeof gradeOneWaveCProgression | typeof gradeTwoWaveCProgression | typeof gradeThreeWaveCProgression,
): WaveCProgressionContract {
  return {
    grade: progression.grade,
    priorSkillId: progression.prerequisiteSkillId,
    waveCSkillIds: progression.waveCSkillIds,
    actions: {
      continueTargetSkillId: progression.waveCSkillIds[0]!,
      remediateTargetSkillId: progression.remediationTargetSkillId,
      advanceTargetSkillId: progression.advanceTargetSkillId,
      retentionTargetSkillId: progression.retentionTargetSkillId,
      mixedPracticeTargetSkillIds: [progression.prerequisiteSkillId, progression.waveCSkillIds[0]!],
    },
    nextTargetSkillId: progression.nextTargetSkillId,
    prerequisiteEvidence: progression.prerequisiteEvidence,
    schoolGradeMutation: false,
    entitlementGrant: false,
  };
}

export const waveCProgressionContracts: readonly WaveCProgressionContract[] = [
  legacyContract(gradeOneWaveCProgression),
  legacyContract(gradeTwoWaveCProgression),
  legacyContract(gradeThreeWaveCProgression),
  ...waveCGradePacks.slice(3).map((waveC) => {
    const previous = waveBProgressionContracts.find((contract) => contract.grade === waveC.grade);
    const row = metadata.find((entry) => entry.grade === waveC.grade);
    const waveCSkillIds = [...new Set(waveC.questions.map((question) => question.skillId))];
    const nextOutcomeId = row && "nextTargetOutcomeIds" in row ? row.nextTargetOutcomeIds[0] : undefined;
    if (!previous || !nextOutcomeId || !waveCSkillIds[0]) throw new Error(`WAVE_C_PROGRESSION_INPUT_MISSING:G${waveC.grade}`);
    return {
      grade: waveC.grade,
      priorSkillId: previous.waveBSkillIds.at(-1)!,
      waveCSkillIds,
      actions: {
        continueTargetSkillId: waveCSkillIds[0],
        remediateTargetSkillId: previous.remediationTargetSkillId,
        advanceTargetSkillId: waveCSkillIds[1] ?? waveCSkillIds[0],
        retentionTargetSkillId: waveCSkillIds[0],
        mixedPracticeTargetSkillIds: [previous.retentionTargetSkillId, waveCSkillIds[0]],
      },
      nextTargetSkillId: officialSkillId(nextOutcomeId),
      prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
      schoolGradeMutation: false,
      entitlementGrant: false,
    } satisfies WaveCProgressionContract;
  }),
];

for (const contract of waveCProgressionContracts) {
  const combined = combinedWaveABCGradePacks.find((pack) => pack.grade === contract.grade);
  if (!combined) throw new Error(`WAVE_C_COMBINED_PACK_MISSING:G${contract.grade}`);
  assertWaveCProgressionContract(combined, contract);
}

export function getWaveCGradePacks(grades: readonly FactoryGrade[]) {
  return waveCGradePacks.filter((pack) => grades.includes(pack.grade));
}

export function getCombinedWaveABCGradePacks(grades: readonly FactoryGrade[]) {
  return combinedWaveABCGradePacks.filter((pack) => grades.includes(pack.grade));
}
