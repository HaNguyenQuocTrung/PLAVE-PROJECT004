import { normalizedDefinition } from "./canonical.ts";
import { createOfficialSourceMap } from "./official-source-map.ts";
import { productionGradePacks } from "./packs.ts";
import type { FactoryGrade } from "./types.ts";
import { waveBGradePacks } from "./wave-b-packs.ts";
import { waveCGradePacks } from "./wave-c-packs.ts";
import { waveDGradePacks } from "./wave-d-packs.ts";
import { waveEGradePacks } from "./wave-e-packs.ts";
import { combinedWaveABCDEFGradePacks, waveFGradePacks } from "./wave-f-packs.ts";
import { waveFPlan } from "./wave-f-plan.ts";

export function buildWaveFCoverageRows() {
  return waveFGradePacks.map((waveF) => {
    const plan = waveFPlan.find((entry) => entry.grade === waveF.grade)!;
    const waveA = productionGradePacks.find((entry) => entry.grade === waveF.grade)!;
    const waveB = waveBGradePacks.find((entry) => entry.grade === waveF.grade)!;
    const waveC = waveCGradePacks.find((entry) => entry.grade === waveF.grade)!;
    const waveD = waveDGradePacks.find((entry) => entry.grade === waveF.grade)!;
    const waveE = waveEGradePacks.find((entry) => entry.grade === waveF.grade)!;
    const combined = combinedWaveABCDEFGradePacks.find((entry) => entry.grade === waveF.grade)!;
    const sourceMap = waveF.grade === 1 ? [] : createOfficialSourceMap(waveF.grade);
    const sourceVerifiedSkills = new Set(sourceMap.map((entry) => entry.skillId));
    const coveredSkills = new Set(combined.questions.map((question) => question.skillId));
    return {
      grade: waveF.grade as FactoryGrade, title: plan.title, selectionReason: plan.selectionReason,
      prerequisiteGapClosed: plan.prerequisiteGapClosed, deferredGap: plan.deferredGap,
      sourceOutcomeIds: plan.sourceOutcomeIds, authoritativePages: plan.authoritativePages,
      waveAQuestions: waveA.questions.length, waveBQuestions: waveB.questions.length, waveCQuestions: waveC.questions.length,
      waveDQuestions: waveD.questions.length, waveEQuestions: waveE.questions.length, waveFQuestions: waveF.questions.length,
      combinedQuestions: combined.questions.length, waveFSkills: new Set(waveF.questions.map((question) => question.skillId)).size,
      structures: new Set(waveF.questions.map((question) => normalizedDefinition(question.prompt).toLocaleLowerCase("vi")
        .replace(/-?\d+(?:[.,]\d+)?/gu, "#").replace(/\s+/gu, " "))).size,
      generated: waveF.production?.generated ?? 0, repaired: waveF.production?.repaired ?? 0,
      evidenceGatePassed: waveF.production?.evidenceGatePassed ?? 0,
      verificationInsufficient: waveF.production?.verificationInsufficient ?? 0,
      rejected: waveF.production?.rejected ?? 0, duplicate: waveF.production?.duplicate ?? 0,
      candidateEligible: waveF.production?.candidateEligible ?? 0,
      remainingSourceVerifiedSkills: waveF.grade === 1 ? null : [...sourceVerifiedSkills].filter((skillId) => !coveredSkills.has(skillId)).length,
      remainingVerificationInsufficientOutcomes: waveF.grade === 1 ? null : new Set(sourceMap.filter((entry) => entry.automatedVerificationCapability === "INSUFFICIENT").map((entry) => entry.officialOutcomeId)).size,
      waveFCandidate: waveF.candidate, combinedCandidate: combined.candidate, simulation: "PASSED" as const,
      publication: combined.release.publication, visibility: combined.release.visibility,
      pilotEnabled: combined.release.pilotEnabled, runtimeEnabled: combined.release.runtimeEnabled, retentionEnabled: combined.release.retentionEnabled,
      curriculumCompletionClaim: false as const,
    };
  });
}

export function renderWaveFCoverageMarkdown(rows: ReturnType<typeof buildWaveFCoverageRows>) {
  const lines = ["# Grades 1–9 Wave F number and algebra evidence", "",
    "Wave F contains bounded, previously uncovered source slices. It does not claim curriculum completion or pedagogical superiority.", "",
    "| Grade | Wave F slice | Pages | A | B | C | D | E | F eligible | A–F | Passed | Insufficient | Structures | Remaining verified skills | Wave F hash | Combined hash | State |",
    "|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|",
    ...rows.map((row) => `| ${row.grade} | ${row.title} | ${row.authoritativePages.join(", ") || "N/A"} | ${row.waveAQuestions} | ${row.waveBQuestions} | ${row.waveCQuestions} | ${row.waveDQuestions} | ${row.waveEQuestions} | ${row.waveFQuestions} | ${row.combinedQuestions} | ${row.evidenceGatePassed} | ${row.verificationInsufficient} | ${row.structures} | ${row.remainingSourceVerifiedSkills ?? "UNKNOWN"} | ${row.waveFCandidate?.bundleHash ?? "NOT_APPLICABLE"} | ${row.combinedCandidate?.bundleHash ?? "NOT_APPLICABLE"} | ${row.publication}/${row.visibility} |`),
    "", "Unsupported visual, approximation and open-modelling outcomes remain excluded. Unverified prerequisite order remains `HYPOTHESIS_REQUIRES_EVIDENCE`." ];
  return `${lines.join("\n")}\n`;
}
