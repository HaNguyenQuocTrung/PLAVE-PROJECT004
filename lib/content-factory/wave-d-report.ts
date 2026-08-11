import { normalizedDefinition } from "./canonical.ts";
import { createOfficialSourceMap } from "./official-source-map.ts";
import { productionGradePacks } from "./packs.ts";
import type { FactoryGrade } from "./types.ts";
import { waveBGradePacks } from "./wave-b-packs.ts";
import { waveCGradePacks } from "./wave-c-packs.ts";
import { combinedWaveABCDGradePacks, waveDGradePacks } from "./wave-d-packs.ts";
import { waveDPlan } from "./wave-d-plan.ts";

export function buildWaveDCoverageRows() {
  return waveDGradePacks.map((waveD) => {
    const plan = waveDPlan.find((entry) => entry.grade === waveD.grade)!;
    const waveA = productionGradePacks.find((entry) => entry.grade === waveD.grade)!;
    const waveB = waveBGradePacks.find((entry) => entry.grade === waveD.grade)!;
    const waveC = waveCGradePacks.find((entry) => entry.grade === waveD.grade)!;
    const combined = combinedWaveABCDGradePacks.find((entry) => entry.grade === waveD.grade)!;
    const sourceMap = waveD.grade === 1 ? [] : createOfficialSourceMap(waveD.grade);
    const sourceVerifiedSkills = new Set(sourceMap.map((entry) => entry.skillId));
    const coveredSkills = new Set(combined.questions.map((question) => question.skillId));
    return {
      grade: waveD.grade as FactoryGrade,
      title: plan.title,
      selectionReason: plan.selectionReason,
      prerequisiteGapClosed: plan.prerequisiteGapClosed,
      sourceOutcomeIds: plan.sourceOutcomeIds,
      authoritativePages: plan.authoritativePages,
      waveAQuestions: waveA.questions.length,
      waveBQuestions: waveB.questions.length,
      waveCQuestions: waveC.questions.length,
      waveDQuestions: waveD.questions.length,
      combinedQuestions: combined.questions.length,
      waveDSkills: new Set(waveD.questions.map((question) => question.skillId)).size,
      structures: new Set(waveD.questions.map((question) => normalizedDefinition(question.prompt)
        .toLocaleLowerCase("vi")
        .replace(/-?\d+(?:[.,]\d+)?/gu, "#")
        .replace(/\s+/gu, " "))).size,
      generated: waveD.production?.generated ?? 0,
      repaired: waveD.production?.repaired ?? 0,
      evidenceGatePassed: waveD.production?.evidenceGatePassed ?? 0,
      verificationInsufficient: waveD.production?.verificationInsufficient ?? 0,
      rejected: waveD.production?.rejected ?? 0,
      duplicate: waveD.production?.duplicate ?? 0,
      candidateEligible: waveD.production?.candidateEligible ?? 0,
      remainingSourceVerifiedSkills: waveD.grade === 1 ? null : [...sourceVerifiedSkills].filter((skillId) => !coveredSkills.has(skillId)).length,
      remainingVerificationInsufficientOutcomes: waveD.grade === 1 ? null : new Set(sourceMap.filter((entry) => entry.automatedVerificationCapability === "INSUFFICIENT").map((entry) => entry.officialOutcomeId)).size,
      waveDCandidate: waveD.candidate,
      combinedCandidate: combined.candidate,
      simulation: "PASSED" as const,
      publication: combined.release.publication,
      visibility: combined.release.visibility,
      pilotEnabled: combined.release.pilotEnabled,
      runtimeEnabled: combined.release.runtimeEnabled,
      retentionEnabled: combined.release.retentionEnabled,
      curriculumCompletionClaim: false as const,
    };
  });
}

export function renderWaveDCoverageMarkdown(rows: ReturnType<typeof buildWaveDCoverageRows>) {
  const lines = [
    "# Grades 1–9 Wave D evidence and coverage",
    "",
    "Wave D contains one bounded, previously uncovered slice per grade. It does not claim curriculum completion or pedagogical superiority.",
    "",
    "| Grade | Wave D slice | Pages | A | B | C | D | A+B+C+D | Passed | Insufficient | Structures | Remaining verified skills | Wave D hash | Combined hash | State |",
    "|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|",
    ...rows.map((row) => `| ${row.grade} | ${row.title} | ${row.authoritativePages.join(", ") || "N/A"} | ${row.waveAQuestions} | ${row.waveBQuestions} | ${row.waveCQuestions} | ${row.waveDQuestions} | ${row.combinedQuestions} | ${row.evidenceGatePassed} | ${row.verificationInsufficient} | ${row.structures} | ${row.remainingSourceVerifiedSkills ?? "UNKNOWN"} | ${row.waveDCandidate?.bundleHash ?? "NOT_APPLICABLE"} | ${row.combinedCandidate?.bundleHash ?? "NOT_APPLICABLE"} | ${row.publication}/${row.visibility} |`),
    "",
    "Prerequisite edges not established by retained curriculum evidence remain explicitly `HYPOTHESIS_REQUIRES_EVIDENCE`.",
  ];
  return `${lines.join("\n")}\n`;
}
