import assert from "node:assert/strict";
import test from "node:test";
import { verifyWaveIGrades7To9Shard, waveIGrades7To9Audits } from "../lib/content-factory/wave-i-grades-7-9.ts";

test("Wave I Grades 7–9 retain edge truth and cover the full taxonomy", () => {
  assert.equal(verifyWaveIGrades7To9Shard().status, "PASSED"); assert.deepEqual(waveIGrades7To9Audits.map((entry) => entry.grade), [7, 8, 9]);
  assert.equal(waveIGrades7To9Audits.flatMap((entry) => entry.prerequisiteEvidence).filter((edge) => edge.classification === "SOURCE_EVIDENCED").length, 0);
});
