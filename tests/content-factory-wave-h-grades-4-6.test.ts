import assert from "node:assert/strict";
import test from "node:test";
import { verifyGradeFourWaveHIndependentOracle, verifyGradeFourWaveHMalformedFixtures } from "../lib/content-factory/grade4-wave-h.ts";
import { verifyGradeFiveWaveHIndependentOracle, verifyGradeFiveWaveHMalformedFixtures } from "../lib/content-factory/grade5-wave-h.ts";
import { verifyGradeSixWaveHIndependentOracle, verifyGradeSixWaveHMalformedFixtures } from "../lib/content-factory/grade6-wave-h.ts";
import { getWaveHGradePacks } from "../lib/content-factory/wave-h-packs.ts";

test("Wave H Grades 4–6 pass exact independent and malformed-fixture oracles", () => {
  assert.deepEqual(getWaveHGradePacks([4, 5, 6]).map((pack) => pack.questions.length), [24, 24, 24]);
  assert.deepEqual([...verifyGradeFourWaveHIndependentOracle(), ...verifyGradeFourWaveHMalformedFixtures(),
    ...verifyGradeFiveWaveHIndependentOracle(), ...verifyGradeFiveWaveHMalformedFixtures(),
    ...verifyGradeSixWaveHIndependentOracle(), ...verifyGradeSixWaveHMalformedFixtures()], []);
});
