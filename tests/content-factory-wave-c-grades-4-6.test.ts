import { strict as assert } from "node:assert";
import test from "node:test";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { gradeFourWaveCPack } from "../lib/content-factory/grade4-wave-c.ts";
import { gradeFiveWaveCPack } from "../lib/content-factory/grade5-wave-c.ts";
import { gradeSixWaveCPack } from "../lib/content-factory/grade6-wave-c.ts";
import { auditIndependentCandidatePack } from "../lib/content-factory/wave-a-independent-audit.ts";
import { validateCrossPackDuplicates, validateGradePack } from "../lib/content-factory/validation.ts";

const packs = [gradeFourWaveCPack, gradeFiveWaveCPack, gradeSixWaveCPack] as const;

test("Grades 4-6 Wave C exact-rational and decimal derivations pass an independent bigint oracle", () => {
  for (const pack of packs) {
    assert.equal(pack.questions.every((question) => Boolean(question.answer.derivation || question.answer.comparison)), true);
    assert.deepEqual(auditIndependentCandidatePack(pack).errors, []);
    assert.deepEqual(validateGradePack(pack).filter((entry) => entry.severity !== "INFO"), []);
    assert.equal(new Set(pack.questions.map((question) => question.duplicateFingerprint)).size, 24);
  }
  assert.deepEqual(validateCrossPackDuplicates(packs), []);
});

test("Grades 4-6 Wave C bundle generation is order-independent", () => {
  assert.deepEqual(buildDeterministicBundle(packs), buildDeterministicBundle([...packs].reverse()));
  assert.deepEqual(packs.map((pack) => pack.candidate?.bundleHash), [
    "937fa975cb505cfb21d907d9bb3c2a312450fa33d3bfa8d3c2e21938c7a8e994",
    "15224a618032728712e8c8a751e7eb84dade179745759e68417a982612d2d4ac",
    "fa1512a322c1b6e7a96d007a2c29c8757d2ceee18426de920a852bb03ed5b2be",
  ]);
});
