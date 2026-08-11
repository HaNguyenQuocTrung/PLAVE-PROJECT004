import assert from "node:assert/strict";
import test from "node:test";
import { gradeFourWaveGMetadata, gradeFourWaveGPack, verifyGradeFourWaveGMalformedDataGuards } from "../lib/content-factory/grade4-wave-g.ts";
import { gradeFiveWaveGMetadata, gradeFiveWaveGPack, verifyGradeFiveWaveGMalformedDataGuards } from "../lib/content-factory/grade5-wave-g.ts";
import { gradeSixWaveGMetadata, gradeSixWaveGPack, verifyGradeSixWaveGMalformedDataGuards } from "../lib/content-factory/grade6-wave-g.ts";
import { auditIndependentCandidatePack } from "../lib/content-factory/wave-a-independent-audit.ts";
import { validateGradePack } from "../lib/content-factory/validation.ts";

test("Grades 4–6 Wave G select exact statistics/probability rows", () => {
  assert.deepEqual(gradeFourWaveGMetadata.sourceOutcomeIds, ["MOET2018-G4-STA-P039-007"]);
  assert.deepEqual(gradeFiveWaveGMetadata.sourceOutcomeIds, ["MOET2018-G5-STA-P045-007"]);
  assert.deepEqual(gradeSixWaveGMetadata.sourceOutcomeIds, ["MOET2018-G6-STA-P054-011"]);
  assert.deepEqual([gradeFourWaveGMetadata.sourcePages, gradeFiveWaveGMetadata.sourcePages, gradeSixWaveGMetadata.sourcePages], [[39], [45], [54]]);
});

test("Grades 4–6 Wave G pass exact derivations and malformed-data guards", () => {
  assert.deepEqual(verifyGradeFourWaveGMalformedDataGuards(), []);
  assert.deepEqual(verifyGradeFiveWaveGMalformedDataGuards(), []);
  assert.deepEqual(verifyGradeSixWaveGMalformedDataGuards(), []);
  for (const pack of [gradeFourWaveGPack, gradeFiveWaveGPack, gradeSixWaveGPack]) {
    assert.equal(pack.questions.length, 24); assert.equal(pack.production?.candidateEligible, 24);
    assert.deepEqual(validateGradePack(pack).filter((entry) => entry.severity !== "INFO"), []);
    assert.deepEqual(auditIndependentCandidatePack(pack).errors, []);
  }
});

test("Grades 4–6 Wave G candidates are deny-all", () => {
  for (const pack of [gradeFourWaveGPack, gradeFiveWaveGPack, gradeSixWaveGPack])
    assert.deepEqual(pack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false });
});
