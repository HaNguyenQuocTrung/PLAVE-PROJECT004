import { normalizedDefinition } from "./canonical.ts";
import { createOfficialSourceMap } from "./official-source-map.ts";
import { productionGradePacks } from "./packs.ts";
import type { FactoryGrade } from "./types.ts";
import { waveBGradePacks } from "./wave-b-packs.ts";
import { waveCGradePacks } from "./wave-c-packs.ts";
import { waveDGradePacks } from "./wave-d-packs.ts";
import { combinedWaveABCDEGradePacks, waveEGradePacks } from "./wave-e-packs.ts";
import { waveEPlan } from "./wave-e-plan.ts";

export function buildWaveECoverageRows() {
  return waveEGradePacks.map((waveE) => {
    const plan = waveEPlan.find((entry) => entry.grade === waveE.grade)!;
    const waveA = productionGradePacks.find((entry) => entry.grade === waveE.grade)!;
    const waveB = waveBGradePacks.find((entry) => entry.grade === waveE.grade)!;
    const waveC = waveCGradePacks.find((entry) => entry.grade === waveE.grade)!;
    const waveD = waveDGradePacks.find((entry) => entry.grade === waveE.grade)!;
    const combined = combinedWaveABCDEGradePacks.find((entry) => entry.grade === waveE.grade)!;
    const sourceMap = waveE.grade === 1 ? [] : createOfficialSourceMap(waveE.grade);
    const sourceVerifiedSkills = new Set(sourceMap.map((entry) => entry.skillId));
    const coveredSkills = new Set(combined.questions.map((question) => question.skillId));
    return {
      grade: waveE.grade as FactoryGrade, title: plan.title, selectionReason: plan.selectionReason,
      prerequisiteGapClosed: plan.prerequisiteGapClosed, deferredGap: plan.deferredGap,
      sourceOutcomeIds: plan.sourceOutcomeIds, authoritativePages: plan.authoritativePages,
      waveAQuestions: waveA.questions.length, waveBQuestions: waveB.questions.length, waveCQuestions: waveC.questions.length,
      waveDQuestions: waveD.questions.length, waveEQuestions: waveE.questions.length, combinedQuestions: combined.questions.length,
      waveESkills: new Set(waveE.questions.map((question) => question.skillId)).size,
      structures: new Set(waveE.questions.map((question) => normalizedDefinition(question.prompt).toLocaleLowerCase("vi")
        .replace(/-?\d+(?:[.,]\d+)?/gu, "#").replace(/\s+/gu, " "))).size,
      generated: waveE.production?.generated ?? 0, repaired: waveE.production?.repaired ?? 0,
      evidenceGatePassed: waveE.production?.evidenceGatePassed ?? 0,
      verificationInsufficient: waveE.production?.verificationInsufficient ?? 0,
      rejected: waveE.production?.rejected ?? 0, duplicate: waveE.production?.duplicate ?? 0,
      candidateEligible: waveE.production?.candidateEligible ?? 0,
      remainingSourceVerifiedSkills: waveE.grade === 1 ? null : [...sourceVerifiedSkills].filter((skillId) => !coveredSkills.has(skillId)).length,
      remainingVerificationInsufficientOutcomes: waveE.grade === 1 ? null : new Set(sourceMap.filter((entry) => entry.automatedVerificationCapability === "INSUFFICIENT").map((entry) => entry.officialOutcomeId)).size,
      waveECandidate: waveE.candidate, combinedCandidate: combined.candidate, simulation: "PASSED" as const,
      publication: combined.release.publication, visibility: combined.release.visibility,
      pilotEnabled: combined.release.pilotEnabled, runtimeEnabled: combined.release.runtimeEnabled, retentionEnabled: combined.release.retentionEnabled,
      curriculumCompletionClaim: false as const,
    };
  });
}

export function renderWaveECoverageMarkdown(rows: ReturnType<typeof buildWaveECoverageRows>) {
  const lines = ["# Grades 1–9 Wave E measurement and geometry evidence", "",
    "Wave E contains bounded, previously uncovered source slices. It does not claim curriculum completion or pedagogical superiority.", "",
    "| Grade | Wave E slice | Pages | A | B | C | D | E eligible | A–E | Passed | Insufficient | Structures | Remaining verified skills | Wave E hash | Combined hash | State |",
    "|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|",
    ...rows.map((row) => `| ${row.grade} | ${row.title} | ${row.authoritativePages.join(", ") || "N/A"} | ${row.waveAQuestions} | ${row.waveBQuestions} | ${row.waveCQuestions} | ${row.waveDQuestions} | ${row.waveEQuestions} | ${row.combinedQuestions} | ${row.evidenceGatePassed} | ${row.verificationInsufficient} | ${row.structures} | ${row.remainingSourceVerifiedSkills ?? "UNKNOWN"} | ${row.waveECandidate?.bundleHash ?? "NOT_APPLICABLE"} | ${row.combinedCandidate?.bundleHash ?? "NOT_APPLICABLE"} | ${row.publication}/${row.visibility} |`),
    "", "Unsupported visual/tolerance outcomes remain excluded. Unverified prerequisite order remains `HYPOTHESIS_REQUIRES_EVIDENCE`."];
  return `${lines.join("\n")}\n`;
}
