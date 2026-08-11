import { normalizedDefinition } from "./canonical.ts";
import { createOfficialSourceMap } from "./official-source-map.ts";
import { productionGradePacks } from "./packs.ts";
import type { FactoryGrade } from "./types.ts";
import { waveBGradePacks } from "./wave-b-packs.ts";
import { waveCGradePacks } from "./wave-c-packs.ts";
import { waveDGradePacks } from "./wave-d-packs.ts";
import { waveEGradePacks } from "./wave-e-packs.ts";
import { waveFGradePacks } from "./wave-f-packs.ts";
import { combinedWaveABCDEFGGradePacks, waveGGradePacks } from "./wave-g-packs.ts";
import { waveGPlan } from "./wave-g-plan.ts";

export function buildWaveGCoverageRows() {
  return waveGGradePacks.map((waveG) => {
    const plan = waveGPlan.find((entry) => entry.grade === waveG.grade)!;
    const waves = [productionGradePacks, waveBGradePacks, waveCGradePacks, waveDGradePacks, waveEGradePacks, waveFGradePacks]
      .map((packs) => packs.find((entry) => entry.grade === waveG.grade)!);
    const combined = combinedWaveABCDEFGGradePacks.find((entry) => entry.grade === waveG.grade)!;
    const sourceMap = waveG.grade === 1 ? [] : createOfficialSourceMap(waveG.grade);
    const sourceVerifiedSkills = new Set(sourceMap.map((entry) => entry.skillId));
    const coveredSkills = new Set(combined.questions.map((question) => question.skillId));
    return {
      grade: waveG.grade as FactoryGrade, title: plan.title, selectionReason: plan.selectionReason,
      prerequisiteGapClosed: plan.prerequisiteGapClosed, deferredGap: plan.deferredGap,
      sourceOutcomeIds: plan.sourceOutcomeIds, authoritativePages: plan.authoritativePages,
      waveAQuestions: waves[0].questions.length, waveBQuestions: waves[1].questions.length, waveCQuestions: waves[2].questions.length,
      waveDQuestions: waves[3].questions.length, waveEQuestions: waves[4].questions.length, waveFQuestions: waves[5].questions.length,
      waveGQuestions: waveG.questions.length, combinedQuestions: combined.questions.length,
      waveGSkills: new Set(waveG.questions.map((question) => question.skillId)).size,
      structures: new Set(waveG.questions.map((question) => normalizedDefinition(question.prompt).toLocaleLowerCase("vi")
        .replace(/-?\d+(?:[.,]\d+)?/gu, "#").replace(/\s+/gu, " "))).size,
      generated: waveG.production?.generated ?? 0, repaired: waveG.production?.repaired ?? 0,
      evidenceGatePassed: waveG.production?.evidenceGatePassed ?? 0,
      verificationInsufficient: waveG.production?.verificationInsufficient ?? 0,
      rejected: waveG.production?.rejected ?? 0, duplicate: waveG.production?.duplicate ?? 0,
      candidateEligible: waveG.production?.candidateEligible ?? 0,
      remainingSourceVerifiedSkills: waveG.grade === 1 ? null : [...sourceVerifiedSkills].filter((skillId) => !coveredSkills.has(skillId)).length,
      remainingVerificationInsufficientOutcomes: waveG.grade === 1 ? null : new Set(sourceMap.filter((entry) => entry.automatedVerificationCapability === "INSUFFICIENT").map((entry) => entry.officialOutcomeId)).size,
      waveGCandidate: waveG.candidate, combinedCandidate: combined.candidate, simulation: "PASSED" as const,
      publication: combined.release.publication, visibility: combined.release.visibility,
      pilotEnabled: combined.release.pilotEnabled, runtimeEnabled: combined.release.runtimeEnabled, retentionEnabled: combined.release.retentionEnabled,
      curriculumCompletionClaim: false as const,
    };
  });
}

export function renderWaveGCoverageMarkdown(rows: ReturnType<typeof buildWaveGCoverageRows>) {
  const lines = ["# Grades 1–9 Wave G statistics and probability evidence", "",
    "Wave G contains bounded, previously uncovered source slices. It does not claim curriculum completion or pedagogical superiority.", "",
    "| Grade | Wave G slice | Pages | A | B | C | D | E | F | G eligible | A–G | Passed | Insufficient | Structures | Remaining verified skills | Wave G hash | Combined hash | State |",
    "|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|",
    ...rows.map((row) => `| ${row.grade} | ${row.title} | ${row.authoritativePages.join(", ") || "N/A"} | ${row.waveAQuestions} | ${row.waveBQuestions} | ${row.waveCQuestions} | ${row.waveDQuestions} | ${row.waveEQuestions} | ${row.waveFQuestions} | ${row.waveGQuestions} | ${row.combinedQuestions} | ${row.evidenceGatePassed} | ${row.verificationInsufficient} | ${row.structures} | ${row.remainingSourceVerifiedSkills ?? "UNKNOWN"} | ${row.waveGCandidate?.bundleHash ?? "NOT_APPLICABLE"} | ${row.combinedCandidate?.bundleHash ?? "NOT_APPLICABLE"} | ${row.publication}/${row.visibility} |`),
    "", "Visual-only datasets and malformed or incomplete probability spaces remain excluded. Unverified prerequisite order remains `HYPOTHESIS_REQUIRES_EVIDENCE`." ];
  return `${lines.join("\n")}\n`;
}
