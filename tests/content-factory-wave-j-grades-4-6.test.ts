import test from "node:test";
import assert from "node:assert/strict";
import { auditWaveJ } from "../lib/content-factory/wave-j-audit.ts";
import { verifyWaveJQuestionOracle, waveJSeeds } from "../lib/content-factory/wave-j-questions.ts";
import { combinedWaveABCDEFGHIGradePacks } from "../lib/content-factory/wave-i-packs.ts";

test("Wave J closes only proven Grades 4–6 structural gaps", () => {
  const rows = auditWaveJ().rows.filter((row) => row.grade >= 4 && row.grade <= 6);
  assert.deepEqual(rows.map((row) => row.addedQuestions), [1, 6, 11]);
  assert.deepEqual(rows.map((row) => row.gapSkillsBefore), [1, 3, 4]);
  assert.ok(rows.every((row) => row.gapSkillsAfter === 0));
  assert.equal(waveJSeeds.filter((seed) => seed.grade >= 4 && seed.grade <= 6).length, 18);
});

test("Grades 4–6 exact oracle covers every missing source component", () => {
  assert.deepEqual(verifyWaveJQuestionOracle(combinedWaveABCDEFGHIGradePacks), []);
  const tags = new Set(waveJSeeds.filter((seed) => seed.grade >= 4 && seed.grade <= 6).map((seed) => seed.structureTag));
  for (const tag of ["ORDER_FRACTIONS", "APPLIED_DECIMAL_DIVISION", "INTEGER_EXACT_DIVISION", "THREE_NUMBER_GCD",
    "THREE_NUMBER_LCM", "FRACTION_ADDITION_VIA_LCM", "FRACTION_SUBTRACTION_VIA_LCM"]) assert.ok(tags.has(tag as never));
});
