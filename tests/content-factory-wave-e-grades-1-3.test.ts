import assert from "node:assert/strict";
import test from "node:test";
import { GRADE_ONE_SOURCE_DIGEST, gradeOneShadowCandidatePack } from "../lib/content-factory/grade1-shadow.ts";
import { gradeOneWaveEOracleRows, gradeOneWaveEPack } from "../lib/content-factory/grade1-wave-e.ts";
import { gradeTwoWaveEOracleRows, gradeTwoWaveEMetadata, gradeTwoWaveEPack } from "../lib/content-factory/grade2-wave-e.ts";
import { gradeThreeWaveEOracleRows, gradeThreeWaveEMetadata, gradeThreeWaveEPack } from "../lib/content-factory/grade3-wave-e.ts";
import { validateGradePack } from "../lib/content-factory/validation.ts";

test("Grade 1 Wave E overlays only independently provable weekday rows", () => {
  assert.equal(gradeOneWaveEPack.questions.length, 6);
  assert.equal(gradeOneWaveEPack.quarantinedQuestions?.length, 18);
  assert.equal(gradeOneWaveEOracleRows.filter((row) => row.status === "PASSED").length, 6);
  assert.equal(gradeOneWaveEOracleRows.filter((row) => row.status === "AUTOMATED_VERIFICATION_INSUFFICIENT").length, 18);
  assert.equal(GRADE_ONE_SOURCE_DIGEST, "ba18662c6faa772030d70acda9fe081bbcf9b9da3dd4e20a41879973af40b51e");
  assert.equal(gradeOneShadowCandidatePack.candidate?.bundleHash, "9d6cbdb8410ba2e1ab5907ea69f2e424abe9de278f0b8e4a616db8dbf97ac872");
});

test("Grades 2–3 bind exact uncovered measurement rows and pass their independent oracles", () => {
  assert.deepEqual(gradeTwoWaveEMetadata.sourceOutcomeIds, ["MOET2018-G2-GEO-P027-012", "MOET2018-G2-GEO-P027-017", "MOET2018-G2-GEO-P027-019"]);
  assert.deepEqual(gradeThreeWaveEMetadata.sourceOutcomeIds, ["MOET2018-G3-GEO-P032-015", "MOET2018-G3-GEO-P032-021", "MOET2018-G3-GEO-P032-022"]);
  assert.equal(gradeTwoWaveEOracleRows.every((row) => row.answerMatches && row.explanationMatches), true);
  assert.equal(gradeThreeWaveEOracleRows.every((row) => row.answerMatches && row.explanationMatches), true);
  for (const pack of [gradeTwoWaveEPack, gradeThreeWaveEPack]) {
    assert.equal(pack.questions.length, 24);
    assert.deepEqual(validateGradePack(pack).filter((entry) => entry.severity !== "INFO"), []);
  }
});

test("Grades 1–3 candidates remain hidden, unpublished and deterministic", () => {
  for (const pack of [gradeOneWaveEPack, gradeTwoWaveEPack, gradeThreeWaveEPack]) {
    assert.deepEqual(pack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false });
    assert.equal(pack.questions.every((question) => !question.published && !question.pilotEligible), true);
    assert.equal(new Set(pack.questions.map((question) => question.duplicateFingerprint)).size, pack.questions.length);
  }
});
