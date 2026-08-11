import assert from "node:assert/strict";
import test from "node:test";
import { verifyWaveIGrades1To3Shard, waveIGrades1To3Audits, waveIGrades1To3GradeOneBoundary } from "../lib/content-factory/wave-i-grades-1-3.ts";

test("Wave I Grades 1–3 audit candidate skills without changing Grade 1", () => {
  assert.equal(verifyWaveIGrades1To3Shard().status, "PASSED"); assert.deepEqual(waveIGrades1To3Audits.map((entry) => entry.grade), [1, 2, 3]);
  assert.deepEqual(waveIGrades1To3Audits.map((entry) => entry.bridgeQuestionIds.length), [0, 0, 0]);
  assert.deepEqual([waveIGrades1To3GradeOneBoundary.units, waveIGrades1To3GradeOneBoundary.questions,
    waveIGrades1To3GradeOneBoundary.solutions, waveIGrades1To3GradeOneBoundary.diagnosticRows], [13, 312, 312, 24]);
  assert.equal(waveIGrades1To3GradeOneBoundary.sqlMutation || waveIGrades1To3GradeOneBoundary.fixedRuntimeMutation, false);
});
