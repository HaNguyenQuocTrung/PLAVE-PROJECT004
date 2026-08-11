import assert from "node:assert/strict";
import test from "node:test";
import { verifyWaveIGrades4To6Shard, waveIGrades4To6Audits } from "../lib/content-factory/wave-i-grades-4-6.ts";

test("Wave I Grades 4–6 resolve graph action gaps without bridge content", () => {
  assert.equal(verifyWaveIGrades4To6Shard().status, "PASSED"); assert.deepEqual(waveIGrades4To6Audits.map((entry) => entry.grade), [4, 5, 6]);
  assert.equal(waveIGrades4To6Audits.every((entry) => !entry.missingRemediationAfter.length && !entry.missingAdvanceAfter.length && !entry.bridgeQuestionIds.length), true);
});
