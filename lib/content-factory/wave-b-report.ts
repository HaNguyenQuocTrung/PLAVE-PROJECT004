import { createOfficialSourceMap } from "./official-source-map.ts";
import { normalizedDefinition } from "./canonical.ts";
import { productionGradePacks } from "./packs.ts";
import type { FactoryGrade } from "./types.ts";
import { combinedWaveABGradePacks, waveBGradePacks } from "./wave-b-packs.ts";
import { waveBPlan } from "./wave-b-plan.ts";

export function buildWaveBCoverageRows() {
  return waveBGradePacks.map((waveB) => {
    const plan = waveBPlan.find((entry) => entry.grade === waveB.grade)!;
    const waveA = productionGradePacks.find((entry) => entry.grade === waveB.grade)!;
    const combined = combinedWaveABGradePacks.find((entry) => entry.grade === waveB.grade)!;
    const sourceMap = waveB.grade === 1 ? [] : createOfficialSourceMap(waveB.grade);
    const sourceVerifiedSkills = new Set(sourceMap.map((entry) => entry.skillId));
    const coveredSkills = new Set(combined.questions.map((question) => question.skillId));
    return {
      grade: waveB.grade as FactoryGrade,
      title: plan.title,
      sourceOutcomeIds: plan.sourceOutcomeIds,
      authoritativePages: plan.authoritativePages,
      waveAQuestions: waveA.questions.length,
      waveBQuestions: waveB.questions.length,
      combinedQuestions: combined.questions.length,
      waveBSkills: new Set(waveB.questions.map((question) => question.skillId)).size,
      structures: new Set(waveB.questions.map((question) => normalizedDefinition(question.prompt)
        .toLocaleLowerCase("vi")
        .replace(/-?\d+(?:[.,]\d+)?/gu, "#")
        .replace(/\s+/gu, " "))).size,
      generated: waveB.production?.generated ?? 0,
      repaired: waveB.production?.repaired ?? 0,
      evidenceGatePassed: waveB.production?.evidenceGatePassed ?? 0,
      verificationInsufficient: waveB.production?.verificationInsufficient ?? 0,
      rejected: waveB.production?.rejected ?? 0,
      duplicate: waveB.production?.duplicate ?? 0,
      candidateEligible: waveB.production?.candidateEligible ?? 0,
      remainingSourceVerifiedSkills: waveB.grade === 1 ? null : [...sourceVerifiedSkills].filter((skillId) => !coveredSkills.has(skillId)).length,
      remainingVerificationInsufficientOutcomes: waveB.grade === 1 ? null : new Set(sourceMap.filter((entry) => entry.automatedVerificationCapability === "INSUFFICIENT").map((entry) => entry.officialOutcomeId)).size,
      waveBCandidate: waveB.candidate,
      combinedCandidate: combined.candidate,
      simulation: "PASSED" as const,
      publication: combined.release.publication,
      visibility: combined.release.visibility,
      pilotEnabled: combined.release.pilotEnabled,
      runtimeEnabled: combined.release.runtimeEnabled,
      retentionEnabled: combined.release.retentionEnabled,
      recommendedWaveC: plan.recommendedWaveC,
      curriculumCompletionClaim: false as const,
    };
  });
}

export function renderWaveBCoverageMarkdown(rows: ReturnType<typeof buildWaveBCoverageRows>) {
  const lines = [
    "# Grades 1–9 Wave B evidence and coverage",
    "",
    "Wave B contains one bounded slice per grade. It does not claim curriculum completion.",
    "",
    "| Grade | Wave B slice | A | B | A+B | Passed | Insufficient | Structures | Remaining verified skills | Wave B hash | Combined hash | State |",
    "|---:|---|---:|---:|---:|---:|---:|---:|---:|---|---|---|",
    ...rows.map((row) => `| ${row.grade} | ${row.title} | ${row.waveAQuestions} | ${row.waveBQuestions} | ${row.combinedQuestions} | ${row.evidenceGatePassed} | ${row.verificationInsufficient} | ${row.structures} | ${row.remainingSourceVerifiedSkills ?? "UNKNOWN"} | ${row.waveBCandidate?.bundleHash ?? "NOT_APPLICABLE"} | ${row.combinedCandidate?.bundleHash ?? "NOT_APPLICABLE"} | ${row.publication}/${row.visibility} |`),
    "",
    "## Recommended Wave C slices (not implemented)",
    "",
    ...rows.map((row) => `- Grade ${row.grade}: ${row.recommendedWaveC}`),
  ];
  return `${lines.join("\n")}\n`;
}
