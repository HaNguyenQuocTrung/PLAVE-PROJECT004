import assert from "node:assert/strict";
import test from "node:test";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { gradeFourWaveEMetadata, gradeFourWaveEPack } from "../lib/content-factory/grade4-wave-e.ts";
import { gradeFiveWaveEMetadata, gradeFiveWaveEPack } from "../lib/content-factory/grade5-wave-e.ts";
import { gradeSixWaveEMetadata, gradeSixWaveEPack } from "../lib/content-factory/grade6-wave-e.ts";
import { auditIndependentCandidatePack } from "../lib/content-factory/wave-a-independent-audit.ts";
import { validateGradePack } from "../lib/content-factory/validation.ts";

test("Grades 4–6 Wave E choose exact measurement rows before visual outcomes", () => {
  assert.deepEqual(gradeFourWaveEMetadata.sourceOutcomeIds, ["MOET2018-G4-GEO-P038-013"]);
  assert.deepEqual(gradeFiveWaveEMetadata.sourceOutcomeIds, ["MOET2018-G5-GEO-P044-013"]);
  assert.deepEqual(gradeSixWaveEMetadata.sourceOutcomeIds, ["MOET2018-G6-GEO-P051-003"]);
  assert.deepEqual([gradeFourWaveEMetadata.sourcePages, gradeFiveWaveEMetadata.sourcePages, gradeSixWaveEMetadata.sourcePages], [[38], [44], [51]]);
});

test("Grades 4–6 exact measurement candidates pass evidence and independent derivation gates", () => {
  for (const pack of [gradeFourWaveEPack, gradeFiveWaveEPack, gradeSixWaveEPack]) {
    assert.equal(pack.questions.length, 24);
    assert.equal(pack.questions.every((question) => question.answer.derivation !== undefined), true);
    assert.equal(pack.production?.candidateEligible, 24);
    assert.deepEqual(validateGradePack(pack).filter((entry) => entry.severity !== "INFO"), []);
    assert.deepEqual(auditIndependentCandidatePack(pack).errors, []);
  }
});

test("Grades 4–6 Wave E bundles are deterministic and deny-all", () => {
  for (const pack of [gradeFourWaveEPack, gradeFiveWaveEPack, gradeSixWaveEPack]) {
    assert.equal(buildDeterministicBundle([pack]).bundleHash, buildDeterministicBundle([pack]).bundleHash);
    assert.deepEqual(pack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false });
  }
});
