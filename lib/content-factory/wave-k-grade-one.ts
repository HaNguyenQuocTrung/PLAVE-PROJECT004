import { canonicalize, sha256 } from "./canonical.ts";
import { GRADE_ONE_SOURCE_DIGEST, gradeOneShadowArtifacts, gradeOneShadowCandidatePack } from "./grade1-shadow.ts";
import { waveCGradePacks } from "./wave-c-packs.ts";
import { waveDGradePacks } from "./wave-d-packs.ts";
import { waveEGradePacks } from "./wave-e-packs.ts";
import { waveFGradePacks } from "./wave-f-packs.ts";
import { waveGGradePacks } from "./wave-g-packs.ts";
import { waveHGradePacks } from "./wave-h-packs.ts";
import { combinedWaveABCDEFGHIJGradePacks } from "./wave-j-packs.ts";

export function buildWaveKGradeOneEvidenceCoverage() {
  const combined = combinedWaveABCDEFGHIJGradePacks.find((pack) => pack.grade === 1)!;
  const overlays = [waveCGradePacks, waveDGradePacks, waveEGradePacks, waveFGradePacks, waveGGradePacks, waveHGradePacks]
    .map((packs) => packs.find((pack) => pack.grade === 1)!);
  const evidenceIds = [...new Set(overlays.flatMap((pack) => pack.questions.map((question) => question.id)))].sort();
  const quarantinedIds = [...new Set(overlays.flatMap((pack) => (pack.quarantinedQuestions ?? []).map((question) => question.id)))].sort();
  const evidenceSet = new Set(evidenceIds); const quarantineSet = new Set(quarantinedIds);
  const unknownIds = combined.questions.map((question) => question.id).filter((id) => !evidenceSet.has(id)).sort();
  const errors: string[] = [];
  if (combined.questions.length !== 312 || combined.explanations.length !== 312 || combined.units.length !== 13) errors.push("GRADE1_BOUNDARY_DRIFT");
  if (evidenceIds.some((id) => quarantineSet.has(id))) errors.push("GRADE1_EVIDENCE_QUARANTINE_OVERLAP");
  if (!gradeOneShadowArtifacts.receipt.semanticParity) errors.push("GRADE1_SEMANTIC_PARITY_FAILED");
  if (gradeOneShadowArtifacts.receipt.sourceDigest !== GRADE_ONE_SOURCE_DIGEST) errors.push("GRADE1_SOURCE_DIGEST_DRIFT");
  if (combined.questions.some((question) => !question.id.startsWith("g1-"))) errors.push("GRADE1_LEGACY_ID_DRIFT");
  const core = { format: "plave-wave-k-grade-1-final-evidence-coverage-v1", sourceDigest: GRADE_ONE_SOURCE_DIGEST,
    semanticDigest: gradeOneShadowArtifacts.receipt.adaptedSemanticDigest, shadowCandidate: gradeOneShadowCandidatePack.candidate,
    boundary: { units: 13, questions: 312, solutions: 312, diagnosticRows: 24 }, evidenceIds, quarantinedIds, unknownIds };
  return { schemaVersion: core.format, sourceDigest: GRADE_ONE_SOURCE_DIGEST,
    semanticDigest: gradeOneShadowArtifacts.receipt.adaptedSemanticDigest, semanticParity: true as const,
    shadowCandidate: gradeOneShadowCandidatePack.candidate, boundary: core.boundary,
    deterministicEvidence: evidenceIds.length, quarantined: quarantinedIds.length, unknown: unknownIds.length,
    evidenceIds, quarantinedIds, unknownIds, fixedRuntimeModified: false as const, newQuestions: 0 as const,
    evidenceComplete: unknownIds.length === 0, artifactHash: sha256(canonicalize(core)), errors } as const;
}

export const waveKGradeOneEvidenceCoverage = buildWaveKGradeOneEvidenceCoverage();
if (waveKGradeOneEvidenceCoverage.errors.length) throw new Error(`WAVE_K_GRADE1_AUDIT_FAILED:${waveKGradeOneEvidenceCoverage.errors.join(",")}`);
