import assert from "node:assert/strict";
import test from "node:test";
import { generateCandidateBatch, generateGrade2Question, independentValidateQuestion } from "../lib/generation-v1/grade2.ts";

const spec = { grade: 2 as const, skillId: "G2_READ_LENGTH" as const, outcomeId: "MOET2018-G2-GEO-P027-012", generatorId: "grade2-measure", generatorVersion: "grade2-generation-v1" as const, seed: "fixture-seed", locale: "vi-VN" as const, difficulty: "MEDIUM" as const, questionType: "MULTIPLE_CHOICE" as const, requestedCount: 10 };

test("same specification and seed are deterministic with stable hashes", () => {
  assert.deepEqual(generateGrade2Question(spec, 0), generateGrade2Question(spec, 0));
  assert.notEqual(generateGrade2Question(spec, 0).canonicalHash, generateGrade2Question({ ...spec, seed: "other-seed" }, 0).canonicalHash);
});
test("all representative difficulties validate independently", () => {
  for (const difficulty of ["EASY", "MEDIUM", "HARD"] as const) {
    const question = generateGrade2Question({ ...spec, difficulty }, 0);
    assert.equal(independentValidateQuestion(question).ok, true);
    assert.equal(question.visual?.unitLabel, "cm");
    assert.equal(question.options.length, 4);
  }
});
test("malformed, wrong-grade and wrong-outcome specifications fail closed", () => {
  assert.throws(() => generateGrade2Question({ ...spec, grade: 3 }, 0), /GENERATION_SPEC_INVALID/);
  assert.throws(() => generateGrade2Question({ ...spec, outcomeId: "foreign" }, 0), /GENERATION_OUTCOME_MISMATCH/);
  assert.throws(() => generateGrade2Question({ ...spec, seed: "BAD SEED" }, 0), /GENERATION_SPEC_INVALID/);
});
test("batch duplicate detection and artifact boundary are explicit", () => {
  const result = generateCandidateBatch([spec, { ...spec, seed: "fixture-seed-2" }]);
  assert.ok(result.questions.length > 0);
  assert.ok(result.questions.every((question) => question.privateSolution.steps.length > 0));
  assert.ok(result.rejected.every((item) => item.code.length > 0));
});
