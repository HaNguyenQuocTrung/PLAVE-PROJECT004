import { gradeTwoWaveHMetadata } from "./grade2-wave-h.ts";
import { gradeThreeWaveHMetadata } from "./grade3-wave-h.ts";
import { gradeFourWaveHMetadata } from "./grade4-wave-h.ts";
import { gradeFiveWaveHMetadata } from "./grade5-wave-h.ts";
import { gradeSixWaveHMetadata } from "./grade6-wave-h.ts";
import { gradeSevenWaveHMetadata } from "./grade7-wave-h.ts";
import { gradeEightWaveHMetadata } from "./grade8-wave-h.ts";
import { gradeNineWaveHMetadata } from "./grade9-wave-h.ts";
import { createOfficialSourceMap } from "./official-source-map.ts";
import { productionGradePacks } from "./packs.ts";
import type { FactoryGrade } from "./types.ts";
import { waveBGradePacks } from "./wave-b-packs.ts";
import { waveCGradePacks } from "./wave-c-packs.ts";
import { waveDGradePacks } from "./wave-d-packs.ts";
import { waveEGradePacks } from "./wave-e-packs.ts";
import { waveFGradePacks } from "./wave-f-packs.ts";
import { waveGGradePacks } from "./wave-g-packs.ts";
import { combinedWaveABCDEFGHGradePacks, waveHGradePacks } from "./wave-h-packs.ts";
import { waveHPlan } from "./wave-h-plan.ts";

export function buildWaveHCoverageRows() {
  const reasoningStructureCounts = new Map<FactoryGrade, number>([[1, 1], [2, gradeTwoWaveHMetadata.reasoningStructures.length],
    [3, gradeThreeWaveHMetadata.reasoningStructures.length], [4, gradeFourWaveHMetadata.reasoningStructures.length],
    [5, gradeFiveWaveHMetadata.reasoningStructures.length], [6, gradeSixWaveHMetadata.reasoningStructures.length],
    [7, gradeSevenWaveHMetadata.reasoningStructures.length], [8, gradeEightWaveHMetadata.reasoningStructures.length],
    [9, gradeNineWaveHMetadata.reasoningStructures.length]]);
  return waveHGradePacks.map((waveH) => {
    const plan = waveHPlan.find((entry) => entry.grade === waveH.grade)!;
    const prior = [productionGradePacks, waveBGradePacks, waveCGradePacks, waveDGradePacks, waveEGradePacks, waveFGradePacks, waveGGradePacks]
      .map((packs) => packs.find((entry) => entry.grade === waveH.grade)!);
    const combined = combinedWaveABCDEFGHGradePacks.find((entry) => entry.grade === waveH.grade)!;
    const sourceMap = waveH.grade === 1 ? [] : createOfficialSourceMap(waveH.grade);
    const coveredSkills = new Set(combined.questions.map((question) => question.skillId));
    const sourceVerifiedSkills = new Set(sourceMap.filter((entry) => entry.automatedVerificationCapability !== "INSUFFICIENT").map((entry) => entry.skillId));
    const structures = reasoningStructureCounts.get(waveH.grade)!;
    return { grade: waveH.grade as FactoryGrade, title: plan.title, selectionReason: plan.selectionReason,
      prerequisiteGapClosed: plan.prerequisiteGapClosed, reasoningRequirement: plan.reasoningRequirement, deferredGap: plan.deferredGap,
      sourceOutcomeIds: plan.sourceOutcomeIds, authoritativePages: plan.authoritativePages,
      waveAQuestions: prior[0].questions.length, waveBQuestions: prior[1].questions.length, waveCQuestions: prior[2].questions.length,
      waveDQuestions: prior[3].questions.length, waveEQuestions: prior[4].questions.length, waveFQuestions: prior[5].questions.length,
      waveGQuestions: prior[6].questions.length, waveHQuestions: waveH.questions.length, combinedQuestions: combined.questions.length,
      waveHSkills: new Set(waveH.questions.map((question) => question.skillId)).size, structures,
      generated: waveH.production?.generated ?? 0, repaired: waveH.production?.repaired ?? 0,
      evidenceGatePassed: waveH.production?.evidenceGatePassed ?? 0, verificationInsufficient: waveH.production?.verificationInsufficient ?? 0,
      rejected: waveH.production?.rejected ?? 0, duplicate: waveH.production?.duplicate ?? 0,
      candidateEligible: waveH.production?.candidateEligible ?? 0,
      remainingSourceVerifiedSkills: waveH.grade === 1 ? null : [...sourceVerifiedSkills].filter((skillId) => !coveredSkills.has(skillId)).length,
      remainingVerificationInsufficientOutcomes: waveH.grade === 1 ? null : new Set(sourceMap.filter((entry) => entry.automatedVerificationCapability === "INSUFFICIENT").map((entry) => entry.officialOutcomeId)).size,
      waveHCandidate: waveH.candidate, combinedCandidate: combined.candidate, simulation: "PASSED" as const,
      publication: combined.release.publication, visibility: combined.release.visibility, pilotEnabled: combined.release.pilotEnabled,
      runtimeEnabled: combined.release.runtimeEnabled, retentionEnabled: combined.release.retentionEnabled, curriculumCompletionClaim: false as const };
  });
}

export function renderWaveHCoverageMarkdown(rows: ReturnType<typeof buildWaveHCoverageRows>) {
  return `${["# Grades 1–9 Wave H applied-problem evidence", "",
    "Wave H is a bounded applied-reasoning slice. Simulations establish software behavior only and make no pedagogical-superiority claim.", "",
    "| Grade | Slice | Pages | H eligible | A–H | Passed | Insufficient | Structures | Remaining verified skills | Wave H hash | Combined hash | State |",
    "|---:|---|---|---:|---:|---:|---:|---:|---:|---|---|---|",
    ...rows.map((row) => `| ${row.grade} | ${row.title} | ${row.authoritativePages.join(", ") || "legacy SQL"} | ${row.waveHQuestions} | ${row.combinedQuestions} | ${row.evidenceGatePassed} | ${row.verificationInsufficient} | ${row.structures} | ${row.remainingSourceVerifiedSkills ?? "UNKNOWN"} | ${row.waveHCandidate?.bundleHash} | ${row.combinedCandidate?.bundleHash} | ${row.publication}/${row.visibility} |`),
    "", "Open-ended, visual-dependent, incomplete-data, and inventory rows marked insufficient remain excluded as `AUTOMATED_VERIFICATION_INSUFFICIENT`.", ""].join("\n")}`;
}
