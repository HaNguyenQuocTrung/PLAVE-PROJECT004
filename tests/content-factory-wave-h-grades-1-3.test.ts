import assert from "node:assert/strict";
import test from "node:test";
import { gradeOneWaveHOracleRows } from "../lib/content-factory/grade1-wave-h.ts";
import { gradeTwoWaveHOracleRows } from "../lib/content-factory/grade2-wave-h.ts";
import { gradeThreeWaveHOracleRows } from "../lib/content-factory/grade3-wave-h.ts";
import { getWaveHGradePacks } from "../lib/content-factory/wave-h-packs.ts";
import { validateGradePack } from "../lib/content-factory/validation.ts";

test("Wave H Grades 1–3 pass public-data independent oracles", () => {
  const packs = getWaveHGradePacks([1, 2, 3]); assert.deepEqual(packs.map((pack) => pack.questions.length), [6, 24, 24]);
  assert.equal(gradeOneWaveHOracleRows.every((row) => row.status === "PASSED"), true);
  assert.equal([...gradeTwoWaveHOracleRows, ...gradeThreeWaveHOracleRows].every((row) => row.answerMatches && row.explanationMatches), true);
  assert.equal(packs.flatMap(validateGradePack).filter((entry) => entry.severity !== "INFO").length, 0);
});
