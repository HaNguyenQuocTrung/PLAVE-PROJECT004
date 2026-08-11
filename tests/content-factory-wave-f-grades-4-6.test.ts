import assert from "node:assert/strict";
import test from "node:test";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { gradeFourWaveFMetadata, gradeFourWaveFPack } from "../lib/content-factory/grade4-wave-f.ts";
import { gradeFiveWaveFMetadata, gradeFiveWaveFPack } from "../lib/content-factory/grade5-wave-f.ts";
import { gradeSixWaveFMetadata, gradeSixWaveFPack } from "../lib/content-factory/grade6-wave-f.ts";
import { auditIndependentCandidatePack } from "../lib/content-factory/wave-a-independent-audit.ts";
import { validateGradePack } from "../lib/content-factory/validation.ts";

test("Grades 4–6 Wave F select exact source-backed number and algebra rows", () => {
  assert.deepEqual(gradeFourWaveFMetadata.sourceOutcomeIds, ["MOET2018-G4-NUM-P036-023"]);
  assert.deepEqual(gradeFiveWaveFMetadata.sourceOutcomeIds, ["MOET2018-G5-NUM-P042-014"]);
  assert.deepEqual(gradeSixWaveFMetadata.sourceOutcomeIds, ["MOET2018-G6-NAA-P050-047"]);
  assert.deepEqual([gradeFourWaveFMetadata.sourcePages, gradeFiveWaveFMetadata.sourcePages, gradeSixWaveFMetadata.sourcePages], [[36], [42], [50]]);
});

test("Grades 4–6 Wave F candidates pass evidence and independent exact derivation", () => {
  for (const pack of [gradeFourWaveFPack, gradeFiveWaveFPack, gradeSixWaveFPack]) {
    assert.equal(pack.questions.length, 24);
    assert.equal(pack.questions.every((question) => question.answer.derivation !== undefined), true);
    assert.equal(pack.production?.candidateEligible, 24);
    assert.deepEqual(validateGradePack(pack).filter((entry) => entry.severity !== "INFO"), []);
    assert.deepEqual(auditIndependentCandidatePack(pack).errors, []);
  }
});

test("Grades 4–6 Wave F bundles are deterministic and deny-all", () => {
  for (const pack of [gradeFourWaveFPack, gradeFiveWaveFPack, gradeSixWaveFPack]) {
    assert.equal(buildDeterministicBundle([pack]).bundleHash, buildDeterministicBundle([pack]).bundleHash);
    assert.deepEqual(pack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false });
  }
});
