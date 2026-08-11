import assert from "node:assert/strict";
import test from "node:test";
import { GRADE_ONE_SOURCE_DIGEST, gradeOneShadowCandidatePack } from "../lib/content-factory/grade1-shadow.ts";
import { gradeOneWaveGOracleRows, gradeOneWaveGPack } from "../lib/content-factory/grade1-wave-g.ts";
import { gradeTwoWaveGMetadata, gradeTwoWaveGOracleRows, gradeTwoWaveGPack } from "../lib/content-factory/grade2-wave-g.ts";
import { gradeThreeWaveGMetadata, gradeThreeWaveGOracleRows, gradeThreeWaveGPack } from "../lib/content-factory/grade3-wave-g.ts";
import { validateGradePack } from "../lib/content-factory/validation.ts";

test("Grade 1 Wave G fails closed on six visual-only immutable legacy rows", () => {
  assert.equal(gradeOneWaveGPack.questions.length, 0);
  assert.equal(gradeOneWaveGPack.quarantinedQuestions?.length, 6);
  assert.equal(gradeOneWaveGOracleRows.every((row) => row.status === "AUTOMATED_VERIFICATION_INSUFFICIENT" && !row.publicDatasetPresent), true);
  assert.equal(GRADE_ONE_SOURCE_DIGEST, "ba18662c6faa772030d70acda9fe081bbcf9b9da3dd4e20a41879973af40b51e");
  assert.equal(gradeOneShadowCandidatePack.candidate?.bundleHash, "9d6cbdb8410ba2e1ab5907ea69f2e424abe9de278f0b8e4a616db8dbf97ac872");
});

test("Grades 2–3 bind exact retained data rows and pass independent oracles", () => {
  assert.deepEqual(gradeTwoWaveGMetadata.sourceOutcomeIds, ["MOET2018-G2-STA-P028-001", "MOET2018-G2-STA-P028-003", "MOET2018-G2-STA-P028-004"]);
  assert.deepEqual(gradeThreeWaveGMetadata.sourceOutcomeIds, ["MOET2018-G3-STA-P033-001", "MOET2018-G3-STA-P033-002", "MOET2018-G3-STA-P033-004"]);
  assert.equal(gradeTwoWaveGOracleRows.every((row) => row.answerMatches && row.explanationMatches && row.publicDatasetPresent), true);
  assert.equal(gradeThreeWaveGOracleRows.every((row) => row.answerMatches && row.explanationMatches && row.publicDatasetPresent), true);
  for (const pack of [gradeTwoWaveGPack, gradeThreeWaveGPack]) assert.deepEqual(validateGradePack(pack).filter((entry) => entry.severity !== "INFO"), []);
});

test("Grades 1–3 Wave G candidates remain hidden and unpublished", () => {
  for (const pack of [gradeOneWaveGPack, gradeTwoWaveGPack, gradeThreeWaveGPack]) {
    assert.deepEqual(pack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false });
    assert.equal(pack.questions.every((question) => !question.published && !question.pilotEligible), true);
  }
});
