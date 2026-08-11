import test from "node:test";
import assert from "node:assert/strict";
import { waveKExpectedRemaining, waveKInventory, waveKKnownExperiential } from "../lib/content-factory/wave-k-inventory.ts";
import { waveKCaseSeeds, verifyWaveKQuestionPools } from "../lib/content-factory/wave-k-questions.ts";

test("Wave K rebuilds and classifies every retained A-J gap", () => {
  assert.deepEqual(waveKInventory.errors, []);
  assert.equal(waveKInventory.rows.length, 386);
  for (const grade of [2, 3, 4, 5, 6, 7, 8, 9] as const) {
    const rows = waveKInventory.rows.filter((row) => row.grade === grade);
    assert.equal(rows.filter((row) => !row.domain.startsWith("HOẠT ĐỘNG")).length, waveKExpectedRemaining[grade]);
    assert.equal(rows.filter((row) => row.domain.startsWith("HOẠT ĐỘNG")).length, waveKKnownExperiential[grade]);
    assert.ok(rows.every((row) => row.pages.start > 0 && row.pages.end >= row.pages.start
      && row.unitIds.length > 0 && row.sourceMapRowCount > 0));
  }
  assert.equal(waveKInventory.rows.filter((row) => row.classification === "ALREADY_COVERED_SEMANTICALLY").length, 1);
  assert.ok(waveKInventory.rows.every((row) => row.reason.trim().length > 0));
});

test("every producible skill has a six-case independently verified pool", () => {
  assert.deepEqual(verifyWaveKQuestionPools(), []);
  const producible = waveKInventory.rows.filter((row) => row.classification === "PRODUCIBLE_DETERMINISTIC");
  assert.equal(waveKCaseSeeds.length, producible.length * 6);
  for (const row of producible) {
    const cases = waveKCaseSeeds.filter((seed) => seed.outcomeId === row.outcomeId);
    assert.equal(cases.length, 6);
    assert.ok(new Set(cases.map((seed) => seed.structureTag)).size >= 2);
    assert.ok(new Set(cases.map((seed) => `${seed.prompt}|${seed.options?.join("|") ?? ""}`)).size >= 3);
  }
});
