import test from "node:test";
import assert from "node:assert/strict";
import { auditWaveJ } from "../lib/content-factory/wave-j-audit.ts";
import { waveJSeeds } from "../lib/content-factory/wave-j-questions.ts";

test("Grade 7 receives two distinct structures per shallow ratio skill", () => {
  const seeds = waveJSeeds.filter((seed) => seed.grade === 7); const grouped = Map.groupBy(seeds, (seed) => seed.skillId);
  assert.equal(grouped.size, 6); assert.equal(seeds.length, 12);
  for (const rows of grouped.values()) assert.equal(new Set(rows.map((row) => row.structureTag)).size, 2);
  const row = auditWaveJ().rows.find((entry) => entry.grade === 7)!;
  assert.equal(row.gapSkillsBefore, 6); assert.equal(row.gapSkillsAfter, 0);
});

test("Grades 8–9 remain depth-sufficient and receive no filler", () => {
  const rows = auditWaveJ().rows.filter((row) => row.grade >= 8);
  assert.deepEqual(rows.map((row) => row.addedQuestions), [0, 0]);
  assert.ok(rows.every((row) => row.gapSkillsBefore === 0 && row.gapSkillsAfter === 0));
});
