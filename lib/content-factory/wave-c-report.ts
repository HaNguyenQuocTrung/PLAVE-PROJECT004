import { normalizedDefinition } from "./canonical.ts";
import { createOfficialSourceMap } from "./official-source-map.ts";
import { productionGradePacks } from "./packs.ts";
import type { FactoryGrade } from "./types.ts";
import { waveBGradePacks } from "./wave-b-packs.ts";
import { combinedWaveABCGradePacks, waveCGradePacks } from "./wave-c-packs.ts";
import { waveCPlan } from "./wave-c-plan.ts";

export function buildWaveCCoverageRows() {
  return waveCGradePacks.map((waveC) => {
    const plan = waveCPlan.find((entry) => entry.grade === waveC.grade)!;
    const waveA = productionGradePacks.find((entry) => entry.grade === waveC.grade)!;
    const waveB = waveBGradePacks.find((entry) => entry.grade === waveC.grade)!;
    const combined = combinedWaveABCGradePacks.find((entry) => entry.grade === waveC.grade)!;
    const sourceMap = waveC.grade === 1 ? [] : createOfficialSourceMap(waveC.grade);
    const sourceVerifiedSkills = new Set(sourceMap.map((entry) => entry.skillId));
    const coveredSkills = new Set(combined.questions.map((question) => question.skillId));
    return {
      grade: waveC.grade as FactoryGrade,
      title: plan.title,
      sourceOutcomeIds: plan.sourceOutcomeIds,
      authoritativePages: plan.authoritativePages,
      waveAQuestions: waveA.questions.length,
      waveBQuestions: waveB.questions.length,
      waveCQuestions: waveC.questions.length,
      combinedQuestions: combined.questions.length,
      waveCSkills: new Set(waveC.questions.map((question) => question.skillId)).size,
      structures: new Set(waveC.questions.map((question) => normalizedDefinition(question.prompt)
        .toLocaleLowerCase("vi")
        .replace(/-?\d+(?:[.,]\d+)?/gu, "#")
        .replace(/\s+/gu, " "))).size,
      generated: waveC.production?.generated ?? 0,
      repaired: waveC.production?.repaired ?? 0,
      evidenceGatePassed: waveC.production?.evidenceGatePassed ?? 0,
      verificationInsufficient: waveC.production?.verificationInsufficient ?? 0,
      rejected: waveC.production?.rejected ?? 0,
      duplicate: waveC.production?.duplicate ?? 0,
      candidateEligible: waveC.production?.candidateEligible ?? 0,
      remainingSourceVerifiedSkills: waveC.grade === 1 ? null : [...sourceVerifiedSkills].filter((skillId) => !coveredSkills.has(skillId)).length,
      remainingVerificationInsufficientOutcomes: waveC.grade === 1 ? null : new Set(sourceMap.filter((entry) => entry.automatedVerificationCapability === "INSUFFICIENT").map((entry) => entry.officialOutcomeId)).size,
      waveCCandidate: waveC.candidate,
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

export function renderWaveCCoverageMarkdown(rows: ReturnType<typeof buildWaveCCoverageRows>) {
  const lines = [
    "# Grades 1–9 Wave C evidence and coverage",
    "",
    "Wave C contains one bounded slice per grade. It does not claim curriculum completion or pedagogical superiority.",
    "",
    "| Grade | Wave C slice | A | B | C | A+B+C | Passed | Insufficient | Structures | Remaining verified skills | Wave C hash | Combined hash | State |",
    "|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|",
    ...rows.map((row) => `| ${row.grade} | ${row.title} | ${row.waveAQuestions} | ${row.waveBQuestions} | ${row.waveCQuestions} | ${row.combinedQuestions} | ${row.evidenceGatePassed} | ${row.verificationInsufficient} | ${row.structures} | ${row.remainingSourceVerifiedSkills ?? "UNKNOWN"} | ${row.waveCCandidate?.bundleHash ?? "NOT_APPLICABLE"} | ${row.combinedCandidate?.bundleHash ?? "NOT_APPLICABLE"} | ${row.publication}/${row.visibility} |`),
    "",
    "Prerequisite edges that are not present in retained curriculum evidence remain `HYPOTHESIS_REQUIRES_EVIDENCE`.",
  ];
  return `${lines.join("\n")}\n`;
}
