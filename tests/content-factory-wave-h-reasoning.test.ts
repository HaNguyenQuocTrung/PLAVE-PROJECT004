import assert from "node:assert/strict";
import test from "node:test";
import { appliedReasoningSignature, auditAppliedEquivalentQuestions, simulateAppliedReasoningFailures, validateAppliedReasoningFixture } from "../lib/content-factory/applied-reasoning.ts";
import { gradeTwoWaveFPack } from "../lib/content-factory/grade2-wave-f.ts";

test("applied reasoning accepts one fully public, unit-consistent multi-step solution", () => {
  const report = validateAppliedReasoningFixture({ publicDataComplete: true, necessaryDataCount: 3, publicDataCount: 3,
    intermediateSteps: [{ expected: "12", actual: "12", prerequisiteSkillId: "foundation-a" }, { expected: "20", actual: "20", prerequisiteSkillId: "foundation-b" }],
    declaredAnswer: "20", independentlyDerivedAnswer: "20", declaredUnit: "m", expectedUnit: "m", domainValid: true,
    contextValid: true, exactlyOneAcceptedAnswer: true, explanationHiddenBeforeSubmit: true, requiresRounding: false,
    roundingRulePublic: false, completeStatisticalSample: true, completeGeometryConstraints: true, safeSyntheticContext: true });
  assert.deepEqual(report, { status: "PASSED", errors: [] });
});

test("applied failure fixtures reject an intermediate error, invalid derivation, unit mismatch and insufficient data", () => {
  const failures = simulateAppliedReasoningFailures("foundation-remediation");
  assert.match(failures.intermediate.errors.join("|"), /APPLIED_INTERMEDIATE_STEP_2_INVALID:foundation-remediation/u);
  assert.match(failures.invalidDerivation.errors.join("|"), /APPLIED_INTERMEDIATE_STEP_1_INVALID:foundation-remediation/u);
  assert.deepEqual(failures.unitMismatch.errors, ["APPLIED_UNIT_MISMATCH"]);
  assert.deepEqual(failures.insufficientData.errors, ["APPLIED_PUBLIC_DATA_INSUFFICIENT"]);
  assert.equal(Object.values(failures).every((report) => report.status === "AUTOMATED_VERIFICATION_INSUFFICIENT"), true);
});

test("reasoning signature detects equivalent applied problems despite narrative relabeling", () => {
  const original = gradeTwoWaveFPack.questions.find((question) => question.answer.derivation)!;
  const relabeled = { ...original, id: `${original.id}-relabeled-fixture`, prompt: "Một ngữ cảnh tổng hợp khác có cùng dữ kiện và chuỗi phép tính." };
  assert.equal(appliedReasoningSignature(original), appliedReasoningSignature(relabeled));
  assert.deepEqual(auditAppliedEquivalentQuestions([{ ...gradeTwoWaveFPack, questions: [original, relabeled] }]),
    [`${relabeled.id}:APPLIED_EQUIVALENT_OF:${original.id}`]);
});
