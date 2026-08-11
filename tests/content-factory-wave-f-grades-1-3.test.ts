import assert from "node:assert/strict";
import test from "node:test";
import { GRADE_ONE_SOURCE_DIGEST, gradeOneShadowCandidatePack } from "../lib/content-factory/grade1-shadow.ts";
import { gradeOneWaveFOracleRows, gradeOneWaveFPack } from "../lib/content-factory/grade1-wave-f.ts";
import { gradeTwoWaveFMetadata, gradeTwoWaveFOracleRows, gradeTwoWaveFPack } from "../lib/content-factory/grade2-wave-f.ts";
import { gradeThreeWaveFMetadata, gradeThreeWaveFOracleRows, gradeThreeWaveFPack } from "../lib/content-factory/grade3-wave-f.ts";
import { validateGradePack } from "../lib/content-factory/validation.ts";

test("Grade 1 Wave F proves semantic parity for the immutable addition-to-20 slice", () => {
  assert.equal(gradeOneWaveFPack.questions.length, 24);
  assert.equal(gradeOneWaveFPack.quarantinedQuestions?.length, 0);
  assert.equal(gradeOneWaveFOracleRows.every((row) => row.status === "PASSED" && row.answerMatches && row.explanationMatches), true);
  assert.equal(GRADE_ONE_SOURCE_DIGEST, "ba18662c6faa772030d70acda9fe081bbcf9b9da3dd4e20a41879973af40b51e");
  assert.equal(gradeOneShadowCandidatePack.candidate?.bundleHash, "9d6cbdb8410ba2e1ab5907ea69f2e424abe9de278f0b8e4a616db8dbf97ac872");
});

test("Grades 2–3 bind exact uncovered number rows and pass independent oracles", () => {
  assert.deepEqual(gradeTwoWaveFMetadata.sourceOutcomeIds, ["MOET2018-G2-NUM-P025-007", "MOET2018-G2-NUM-P025-008", "MOET2018-G2-NUM-P025-014", "MOET2018-G2-NUM-P025-019"]);
  assert.deepEqual(gradeThreeWaveFMetadata.sourceOutcomeIds, ["MOET2018-G3-NUM-P030-016", "MOET2018-G3-NUM-P030-019", "MOET2018-G3-NUM-P030-020", "MOET2018-G3-NUM-P030-022"]);
  assert.equal(gradeTwoWaveFOracleRows.every((row) => row.answerMatches && row.explanationMatches), true);
  assert.equal(gradeThreeWaveFOracleRows.every((row) => row.answerMatches && row.explanationMatches), true);
  for (const pack of [gradeTwoWaveFPack, gradeThreeWaveFPack]) {
    assert.equal(pack.questions.length, 24);
    assert.deepEqual(validateGradePack(pack).filter((entry) => entry.severity !== "INFO"), []);
  }
});

test("Grades 1–3 Wave F candidates remain hidden, unpublished and duplicate-clean", () => {
  for (const pack of [gradeOneWaveFPack, gradeTwoWaveFPack, gradeThreeWaveFPack]) {
    assert.deepEqual(pack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false });
    assert.equal(pack.questions.every((question) => !question.published && !question.pilotEligible), true);
    assert.equal(new Set(pack.questions.map((question) => question.duplicateFingerprint)).size, pack.questions.length);
  }
});
