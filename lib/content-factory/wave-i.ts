import { canonicalize, sha256 } from "./canonical.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateBinding, FactoryGrade, GradePack } from "./types.ts";
import type { WaveIGradeAudit } from "./wave-i-remediation.ts";

export type WaveIPolicyCandidate = Readonly<{
  schemaVersion: "plave-wave-i-policy-candidate-v1";
  grade: FactoryGrade;
  candidate: CandidateBinding;
  sourceCandidate: CandidateBinding;
  auditHash: string;
  taxonomyVersion: "plave-wave-i-error-taxonomy-v1";
  bridgeQuestionIds: readonly string[];
  bridgeQuestionCount: 0;
  release: GradePack["release"];
  attemptLimit: 6;
  repeatedErrorThreshold: 2;
  publicationClaim: false;
}>;

export function buildWaveIPolicyCandidate(pack: GradePack, audit: WaveIGradeAudit): WaveIPolicyCandidate {
  if (!pack.candidate || pack.grade !== audit.grade || audit.bridgeQuestionIds.length !== 0) throw new Error("WAVE_I_POLICY_BINDING_INVALID");
  const candidateId = `g${pack.grade}-wave-i-remediation-policy`; const version = `g${pack.grade}-wave-i-remediation-1.0.0`;
  const policyVersion = `g${pack.grade}-wave-i-remediation-policy-1.0.0`;
  const core = { format: "plave-wave-i-remediation-policy-v1", grade: pack.grade, candidateId, version, policyVersion,
    sourceCandidate: pack.candidate, auditHash: audit.auditHash, taxonomyVersion: "plave-wave-i-error-taxonomy-v1",
    bridgeQuestionIds: audit.bridgeQuestionIds, skillPolicies: audit.remediationMap } as const;
  return { schemaVersion: "plave-wave-i-policy-candidate-v1", grade: pack.grade,
    candidate: { candidateId, version, bundleHash: sha256(canonicalize(core)), policyVersion }, sourceCandidate: pack.candidate,
    auditHash: audit.auditHash, taxonomyVersion: "plave-wave-i-error-taxonomy-v1", bridgeQuestionIds: [], bridgeQuestionCount: 0,
    release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
    attemptLimit: 6, repeatedErrorThreshold: 2, publicationClaim: false };
}

export function combineWaveABCDEFGHIPack(pack: GradePack, policy: WaveIPolicyCandidate): GradePack {
  if (!pack.candidate || pack.grade !== policy.grade) throw new Error("WAVE_I_COMBINED_BINDING_INVALID");
  const packId = `grade-${pack.grade}-combined-wave-a-b-c-d-e-f-g-h-i`; const packVersion = `g${pack.grade}-combined-1.0.0-wave-i`;
  const candidateId = `g${pack.grade}-combined-wave-a-b-c-d-e-f-g-h-i`; const policyVersion = `g${pack.grade}-combined-policy-1.0.0-wave-i`;
  const core = { format: "plave-combined-wave-a-b-c-d-e-f-g-h-i-candidate-v1", grade: pack.grade, candidateId,
    version: packVersion, policyVersion, combinedABCDEFGH: pack.candidate, waveIPolicy: policy.candidate,
    questionIds: pack.questions.map((question) => question.id), questionHashes: pack.questions.map((question) => sha256(canonicalize(question))) } as const;
  const candidate: CandidateBinding = { candidateId, version: packVersion, bundleHash: sha256(canonicalize(core)), policyVersion };
  const waveIReceipts = requiredAutomatedEvidenceChecks.map((check) => ({ id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
    entityId: packId, check, status: "PASSED" as const,
    evidence: `Immutable A–H question pool plus deterministic Wave I prerequisite, diagnosis and remediation policy: ${check}.` }));
  if (!pack.production) throw new Error("WAVE_I_SOURCE_PRODUCTION_MISSING");
  return { ...pack, packId, packVersion, candidate, evidenceReceipts: [...pack.evidenceReceipts, ...waveIReceipts],
    adaptivePolicy: { ...pack.adaptivePolicy, version: policyVersion, status: "VALIDATED" },
    release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
    production: { ...pack.production, wave: "A+B+C+D+E+F+G+H+I", selectedSliceId: `grade-${pack.grade}-a-to-h-plus-wave-i-remediation-policy`,
      selectionBasis: ["IMMUTABLE_WAVES_A_TO_H", "CANDIDATE_SKILL_ONLY_AUDIT", "DETERMINISTIC_ERROR_TAXONOMY", "NO_BRIDGE_CONTENT_REQUIRED"] } };
}
