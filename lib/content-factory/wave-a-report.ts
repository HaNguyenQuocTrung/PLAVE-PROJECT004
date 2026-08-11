import type { GradePack } from "./types.ts";
import { createOfficialSourceMap } from "./official-source-map.ts";

export type WaveAEvidenceRow = Readonly<{
  grade: number;
  role: "IMMUTABLE_REFERENCE_SHADOW" | "FROZEN_WAVE_A" | "NEW_WAVE_A";
  sourceVerifiedDomains: number | null;
  sourceVerifiedUnits: number;
  sourceVerifiedSkills: number;
  sourceMapRows: number;
  sourceEvidenceGaps: number;
  automatedVerificationCapabilityGaps: number;
  selectedSliceId: string | null;
  generated: number | null;
  repaired: number | null;
  evidenceGatePassed: number | null;
  verificationInsufficient: number | null;
  rejected: number | null;
  duplicate: number | null;
  candidateEligible: number | null;
  remainingSourceVerifiedSkills: number | null;
  candidate: GradePack["candidate"];
  simulation: "PASSED" | "REFERENCE_ONLY";
  publication: GradePack["release"]["publication"];
  visibility: GradePack["release"]["visibility"];
  pilotEnabled: boolean;
  runtimeEnabled: boolean;
  retentionEnabled: boolean;
  curriculumCompletionClaim: false;
}>;

export function buildWaveAEvidenceRows(packs: readonly GradePack[]): readonly WaveAEvidenceRow[] {
  return [...packs].sort((left, right) => left.grade - right.grade).map((pack) => {
    if (pack.grade === 1) return {
      grade: 1,
      role: "IMMUTABLE_REFERENCE_SHADOW",
      sourceVerifiedDomains: pack.domains.length,
      sourceVerifiedUnits: pack.legacyAsset?.expected.units ?? pack.units.length,
      sourceVerifiedSkills: pack.skills.length,
      sourceMapRows: pack.legacyAsset?.expected.questions ?? 0,
      sourceEvidenceGaps: 0,
      automatedVerificationCapabilityGaps: pack.questions.length,
      selectedSliceId: pack.packId,
      generated: 0,
      repaired: null,
      evidenceGatePassed: 0,
      verificationInsufficient: pack.questions.length,
      rejected: 0,
      duplicate: 0,
      candidateEligible: 0,
      remainingSourceVerifiedSkills: null,
      candidate: pack.candidate,
      simulation: "PASSED",
      publication: pack.release.publication,
      visibility: pack.release.visibility,
      pilotEnabled: pack.release.pilotEnabled,
      runtimeEnabled: pack.release.runtimeEnabled,
      retentionEnabled: pack.release.retentionEnabled,
      curriculumCompletionClaim: false,
    };
    const sourceMap = createOfficialSourceMap(pack.grade);
    const sourceVerifiedSkills = new Set(sourceMap.map((record) => record.skillId));
    const selectedSkills = new Set(
      pack.grade === 2
        ? sourceMap.filter((record) => record.unitId === "grade-2-numbers-to-1000-preview").map((record) => record.skillId)
        : pack.questions.map((question) => question.skillId),
    );
    return {
      grade: pack.grade,
      role: pack.grade === 2 ? "FROZEN_WAVE_A" : "NEW_WAVE_A",
      sourceVerifiedDomains: new Set(sourceMap.map((record) => record.mathematicalDomain)).size,
      sourceVerifiedUnits: new Set(sourceMap.map((record) => record.unitId)).size,
      sourceVerifiedSkills: sourceVerifiedSkills.size,
      sourceMapRows: sourceMap.length,
      sourceEvidenceGaps: 0,
      automatedVerificationCapabilityGaps: new Set(
        sourceMap.filter((record) => record.automatedVerificationCapability === "INSUFFICIENT").map((record) => record.skillId),
      ).size,
      selectedSliceId: pack.production?.selectedSliceId ?? "grade-2-numbers-to-1000",
      generated: pack.production?.generated ?? pack.questions.length,
      repaired: pack.production?.repaired ?? 0,
      evidenceGatePassed: pack.production?.evidenceGatePassed ?? pack.questions.length,
      verificationInsufficient: pack.production?.verificationInsufficient ?? 0,
      rejected: pack.production?.rejected ?? 0,
      duplicate: pack.production?.duplicate ?? 0,
      candidateEligible: pack.production?.candidateEligible ?? pack.questions.length,
      remainingSourceVerifiedSkills: [...sourceVerifiedSkills].filter((skillId) => !selectedSkills.has(skillId)).length,
      candidate: pack.candidate,
      simulation: "PASSED",
      publication: pack.release.publication,
      visibility: pack.release.visibility,
      pilotEnabled: pack.release.pilotEnabled,
      runtimeEnabled: pack.release.runtimeEnabled,
      retentionEnabled: pack.release.retentionEnabled,
      curriculumCompletionClaim: false,
    };
  });
}

export function renderWaveAEvidenceMarkdown(rows: readonly WaveAEvidenceRow[]) {
  const header = "| Grade | Role | Source rows | Domains | Units | Skills | Wave A slice | Generated | Gate passed | Insufficient | Rejected | Duplicates | Remaining skills | Candidate hash | State |\n|---:|---|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---|---|";
  const body = rows.map((row) => `| ${row.grade} | ${row.role} | ${row.sourceMapRows} | ${row.sourceVerifiedDomains ?? "UNKNOWN"} | ${row.sourceVerifiedUnits} | ${row.sourceVerifiedSkills} | ${row.selectedSliceId ?? "NOT_APPLICABLE"} | ${row.generated ?? "NOT_APPLICABLE"} | ${row.evidenceGatePassed ?? "NOT_APPLICABLE"} | ${row.verificationInsufficient ?? "NOT_APPLICABLE"} | ${row.rejected ?? "NOT_APPLICABLE"} | ${row.duplicate ?? "NOT_APPLICABLE"} | ${row.remainingSourceVerifiedSkills ?? "NOT_APPLICABLE"} | ${row.candidate?.bundleHash ?? "NOT_APPLICABLE"} | ${row.publication}/${row.visibility} |`).join("\n");
  return `${header}\n${body}\n\nWave A is bounded production evidence, not a claim that any Grade 2–9 curriculum is complete. Prerequisite hypotheses remain non-authoritative until source evidence supports them.\n`;
}
