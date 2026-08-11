import assert from "node:assert/strict";
import test from "node:test";
import { classifyWaveIError, type WaveIDiagnosticEvidence } from "../lib/content-factory/wave-i-taxonomy.ts";

function evidence(observedFailure: WaveIDiagnosticEvidence["observedFailure"], repeated: number): WaveIDiagnosticEvidence {
  return { postSubmit: true, questionId: "fixture-question", skillId: "fixture-skill", submittedAnswerPresent: true,
    submittedAnswerFingerprint: "same-wrong-answer", expectedContract: { type: "INTEGER_INPUT", exactValue: "12" }, observedFailure,
    failedStepIndex: observedFailure ? 0 : null, prerequisiteSkillId: "fixture-prerequisite", repeatedEquivalentEvidenceCount: repeated,
    publicDerivationEvidenceComplete: true, solutionExposedBeforeSubmit: false };
}

test("the same wrong answer can produce different remediation evidence classifications", () => {
  const calculation = classifyWaveIError(evidence("ARITHMETIC_STEP", 1));
  const unit = classifyWaveIError(evidence("UNIT_CONVERSION_STEP", 2));
  assert.equal(calculation.code, "CALCULATION_ERROR"); assert.equal(calculation.retryCurrentSkill, true);
  assert.equal(unit.code, "UNIT_CONVERSION_ERROR"); assert.equal(unit.remediationTargetSkillId, "fixture-prerequisite");
});

test("single structured errors retry while repeated evidence can remediate", () => {
  const single = classifyWaveIError(evidence("WRONG_OPERATION", 1)); const repeated = classifyWaveIError(evidence("WRONG_OPERATION", 2));
  assert.equal(single.retryCurrentSkill, true); assert.equal(single.remediationTargetSkillId, null);
  assert.equal(repeated.code, "OPERATION_SELECTION"); assert.equal(repeated.remediationTargetSkillId, "fixture-prerequisite");
});

test("missing post-submit derivation evidence fails closed without solution leakage", () => {
  const unknown = classifyWaveIError({ ...evidence(null, 0), postSubmit: false, submittedAnswerPresent: false, submittedAnswerFingerprint: null,
    expectedContract: null, publicDerivationEvidenceComplete: false });
  assert.deepEqual(unknown, { code: "INSUFFICIENT_EVIDENCE_UNKNOWN", confidence: "INSUFFICIENT", remediationTargetSkillId: null,
    retryCurrentSkill: false, psychologicalDiagnosisClaim: false, solutionLeakage: false });
  assert.equal("expectedContract" in unknown, false);
});
