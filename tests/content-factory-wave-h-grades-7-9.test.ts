import assert from "node:assert/strict";
import test from "node:test";
import { verifyGradeSevenWaveHIndependentOracle, verifyGradeSevenWaveHMalformedFixtures } from "../lib/content-factory/grade7-wave-h.ts";
import { verifyGradeEightWaveHIndependentOracle, verifyGradeEightWaveHMalformedFixtures } from "../lib/content-factory/grade8-wave-h.ts";
import { verifyGradeNineWaveHIndependentOracle, verifyGradeNineWaveHMalformedFixtures } from "../lib/content-factory/grade9-wave-h.ts";
import { getWaveHGradePacks } from "../lib/content-factory/wave-h-packs.ts";

test("Wave H Grades 7–9 pass rational, linear, and quadratic applied oracles", () => {
  assert.deepEqual(getWaveHGradePacks([7, 8, 9]).map((pack) => pack.questions.length), [24, 24, 24]);
  assert.deepEqual([...verifyGradeSevenWaveHIndependentOracle(), ...verifyGradeSevenWaveHMalformedFixtures(),
    ...verifyGradeEightWaveHIndependentOracle(), ...verifyGradeEightWaveHMalformedFixtures(),
    ...verifyGradeNineWaveHIndependentOracle(), ...verifyGradeNineWaveHMalformedFixtures()], []);
});
