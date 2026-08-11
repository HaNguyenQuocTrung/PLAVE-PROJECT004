import { strict as assert } from "node:assert";
import test from "node:test";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { GRADE_ONE_SOURCE_DIGEST, gradeOneShadowCandidatePack } from "../lib/content-factory/grade1-shadow.ts";
import { gradeOneWaveCMetadata, gradeOneWaveCOracleRows, gradeOneWaveCPack } from "../lib/content-factory/grade1-wave-c.ts";
import { gradeTwoWaveCOracleRows, gradeTwoWaveCPack } from "../lib/content-factory/grade2-wave-c.ts";
import { gradeThreeWaveCOracleRows, gradeThreeWaveCPack } from "../lib/content-factory/grade3-wave-c.ts";
import { validateGradePack } from "../lib/content-factory/validation.ts";

test("Grade 1 Wave C is an evidence overlay with complete semantic parity and no legacy rewrite", () => {
  assert.equal(GRADE_ONE_SOURCE_DIGEST, "ba18662c6faa772030d70acda9fe081bbcf9b9da3dd4e20a41879973af40b51e");
  assert.equal(gradeOneWaveCMetadata.immutableSourceDigest, GRADE_ONE_SOURCE_DIGEST);
  assert.equal(gradeOneWaveCMetadata.semanticParity, true);
  assert.deepEqual(gradeOneWaveCMetadata.immutableShadowCandidate, gradeOneShadowCandidatePack.candidate);
  assert.equal(gradeOneWaveCPack.production?.generated, 0);
  assert.equal(gradeOneWaveCPack.production?.candidateEligible, 24);
  assert.equal(gradeOneWaveCPack.quarantinedQuestions?.length, 0);
  assert.equal(gradeOneWaveCOracleRows.length, 24);
  assert.equal(gradeOneWaveCOracleRows.every((row) => row.status === "PASSED" && row.answerMatches && row.explanationMatches && row.reason === null), true);
  const originalById = new Map(gradeOneShadowCandidatePack.questions.map((question) => [question.id, question]));
  for (const row of gradeOneWaveCOracleRows) assert.ok(originalById.has(row.questionId));
});

test("Grades 2 and 3 Wave C public-boundary oracles verify every answer and explanation", () => {
  assert.equal(gradeTwoWaveCOracleRows.length, 24);
  assert.equal(gradeThreeWaveCOracleRows.length, 24);
  assert.equal([...gradeTwoWaveCOracleRows, ...gradeThreeWaveCOracleRows].every((row) => row.answerMatches && row.explanationMatches), true);
  for (const pack of [gradeTwoWaveCPack, gradeThreeWaveCPack]) {
    assert.equal(pack.questions.length, 24);
    assert.equal(new Set(pack.questions.map((question) => question.duplicateFingerprint)).size, 24);
    assert.deepEqual(validateGradePack(pack).filter((entry) => entry.severity !== "INFO"), []);
    assert.equal(canonicalize(pack.release), canonicalize({ publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false }));
  }
});
