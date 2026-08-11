import { strict as assert } from "node:assert";
import test from "node:test";
import { gradeSevenWaveCPack } from "../lib/content-factory/grade7-wave-c.ts";
import { gradeEightWaveCPack, verifyGradeEightWaveCIndependentOracle } from "../lib/content-factory/grade8-wave-c.ts";
import { gradeNineWaveCPack } from "../lib/content-factory/grade9-wave-c.ts";
import { auditIndependentCandidatePack } from "../lib/content-factory/wave-a-independent-audit.ts";
import { validateCrossPackDuplicates, validateGradePack } from "../lib/content-factory/validation.ts";

const packs = [gradeSevenWaveCPack, gradeEightWaveCPack, gradeNineWaveCPack] as const;

test("Grades 7 and 9 exact derivations and Grade 8 polynomial expansion oracle verify all candidates", () => {
  assert.equal(gradeSevenWaveCPack.questions.every((question) => Boolean(question.answer.derivation)), true);
  assert.equal(gradeNineWaveCPack.questions.every((question) => Boolean(question.answer.derivation)), true);
  assert.deepEqual(verifyGradeEightWaveCIndependentOracle(), []);
  for (const pack of packs) {
    assert.deepEqual(auditIndependentCandidatePack(pack).errors, []);
    assert.deepEqual(validateGradePack(pack).filter((entry) => entry.severity !== "INFO"), []);
    assert.equal(new Set(pack.questions.map((question) => question.duplicateFingerprint)).size, 24);
  }
  assert.deepEqual(validateCrossPackDuplicates(packs), []);
});

test("Grades 7-9 candidate tuples are stable and hidden", () => {
  assert.deepEqual(packs.map((pack) => pack.candidate?.bundleHash), [
    "35495dbb744a52c366d12c16297443c49206779f49c4485d6bbb27d4ab689229",
    "b62ae17a96cf39caad07b80f6a676205c74b97af1b63a595fa3a6be8b49f646b",
    "7b0dd0707af7d9684e4c5644d90c81018245c80b7138e6bbb19e1cfe0e28c28b",
  ]);
  assert.equal(packs.every((pack) => pack.release.publication === "DRAFT" && pack.release.visibility === "HIDDEN" && !pack.release.pilotEnabled && !pack.release.runtimeEnabled && !pack.release.retentionEnabled), true);
});
