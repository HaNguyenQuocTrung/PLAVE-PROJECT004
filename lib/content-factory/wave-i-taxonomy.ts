import type { AnswerContract } from "./types.ts";

export const waveIErrorCodes = [
  "CONCEPT_MISUNDERSTANDING", "OPERATION_SELECTION", "CALCULATION_ERROR", "PLACE_VALUE_ERROR", "SIGN_ERROR",
  "FRACTION_EQUIVALENCE_ERROR", "UNIT_CONVERSION_ERROR", "ALGEBRAIC_TRANSFORMATION_ERROR", "GEOMETRY_CONSTRAINT_ERROR",
  "DATA_INTERPRETATION_ERROR", "PROBABILITY_SAMPLE_SPACE_ERROR", "MULTI_STEP_SEQUENCING_ERROR",
  "INSUFFICIENT_EVIDENCE_UNKNOWN",
] as const;
export type WaveIErrorCode = (typeof waveIErrorCodes)[number];

export const waveIObservedFailures = [
  "CONCEPT_PATTERN", "WRONG_OPERATION", "ARITHMETIC_STEP", "PLACE_VALUE_STEP", "SIGN_STEP", "FRACTION_NORMALIZATION",
  "UNIT_CONVERSION_STEP", "ALGEBRAIC_REWRITE_STEP", "GEOMETRY_CONSTRAINT_STEP", "DATA_READING_STEP",
  "SAMPLE_SPACE_STEP", "SEQUENCE_STEP",
] as const;
export type WaveIObservedFailure = (typeof waveIObservedFailures)[number];

export type WaveIDiagnosticEvidence = Readonly<{
  postSubmit: boolean;
  questionId: string;
  skillId: string;
  submittedAnswerPresent: boolean;
  submittedAnswerFingerprint: string | null;
  expectedContract: AnswerContract | null;
  observedFailure: WaveIObservedFailure | null;
  failedStepIndex: number | null;
  prerequisiteSkillId: string | null;
  repeatedEquivalentEvidenceCount: number;
  publicDerivationEvidenceComplete: boolean;
  solutionExposedBeforeSubmit: false;
}>;

export type WaveIErrorClassification = Readonly<{
  code: WaveIErrorCode;
  confidence: "DETERMINISTIC" | "INSUFFICIENT";
  remediationTargetSkillId: string | null;
  retryCurrentSkill: boolean;
  psychologicalDiagnosisClaim: false;
  solutionLeakage: false;
}>;

const observedToCode: Readonly<Record<WaveIObservedFailure, Exclude<WaveIErrorCode, "INSUFFICIENT_EVIDENCE_UNKNOWN">>> = {
  CONCEPT_PATTERN: "CONCEPT_MISUNDERSTANDING", WRONG_OPERATION: "OPERATION_SELECTION", ARITHMETIC_STEP: "CALCULATION_ERROR",
  PLACE_VALUE_STEP: "PLACE_VALUE_ERROR", SIGN_STEP: "SIGN_ERROR", FRACTION_NORMALIZATION: "FRACTION_EQUIVALENCE_ERROR",
  UNIT_CONVERSION_STEP: "UNIT_CONVERSION_ERROR", ALGEBRAIC_REWRITE_STEP: "ALGEBRAIC_TRANSFORMATION_ERROR",
  GEOMETRY_CONSTRAINT_STEP: "GEOMETRY_CONSTRAINT_ERROR", DATA_READING_STEP: "DATA_INTERPRETATION_ERROR",
  SAMPLE_SPACE_STEP: "PROBABILITY_SAMPLE_SPACE_ERROR", SEQUENCE_STEP: "MULTI_STEP_SEQUENCING_ERROR",
};

export function classifyWaveIError(evidence: WaveIDiagnosticEvidence): WaveIErrorClassification {
  const insufficient = !evidence.postSubmit || !evidence.submittedAnswerPresent || !evidence.submittedAnswerFingerprint || !evidence.expectedContract || !evidence.observedFailure
    || !evidence.publicDerivationEvidenceComplete || evidence.failedStepIndex === null || evidence.failedStepIndex < 0;
  if (insufficient) return { code: "INSUFFICIENT_EVIDENCE_UNKNOWN", confidence: "INSUFFICIENT", remediationTargetSkillId: null,
    retryCurrentSkill: false, psychologicalDiagnosisClaim: false, solutionLeakage: false };
  const code = observedToCode[evidence.observedFailure];
  const singleCalculation = code === "CALCULATION_ERROR" && evidence.repeatedEquivalentEvidenceCount < 2;
  const repeatedEvidenceRequired = code === "CONCEPT_MISUNDERSTANDING" || code === "OPERATION_SELECTION" || code === "MULTI_STEP_SEQUENCING_ERROR";
  if (repeatedEvidenceRequired && evidence.repeatedEquivalentEvidenceCount < 2) return { code: "CALCULATION_ERROR", confidence: "DETERMINISTIC",
    remediationTargetSkillId: null, retryCurrentSkill: true, psychologicalDiagnosisClaim: false, solutionLeakage: false };
  return { code, confidence: "DETERMINISTIC",
    remediationTargetSkillId: singleCalculation ? null : evidence.prerequisiteSkillId,
    retryCurrentSkill: singleCalculation || !evidence.prerequisiteSkillId, psychologicalDiagnosisClaim: false, solutionLeakage: false };
}

export function assertWaveITaxonomyComplete() {
  const mapped = new Set(Object.values(observedToCode));
  const expected = waveIErrorCodes.filter((code) => code !== "INSUFFICIENT_EVIDENCE_UNKNOWN");
  if (expected.some((code) => !mapped.has(code))) throw new Error("WAVE_I_ERROR_TAXONOMY_INCOMPLETE");
  return true;
}
