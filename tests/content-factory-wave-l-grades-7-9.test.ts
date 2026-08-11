import test from "node:test";
import assert from "node:assert/strict";
import {
  verifyWaveLGrades7To9Shard,
  waveLGrades7To9Counts,
  waveLGrades7To9Inventories,
  waveLGrades7To9Simulations,
  waveLGrades7To9Verifications,
} from "../lib/content-factory/wave-l-grades-7-9.ts";

test("Wave L Grades 7-9 shard inventories the immutable combined A-K pools", () => {
  assert.deepEqual(waveLGrades7To9Counts.map((row) => ({
    grade: row.grade,
    questions: row.questions,
    skills: row.skills,
  })), [
    { grade: 7, questions: 246, skills: 25 },
    { grade: 8, questions: 228, skills: 22 },
    { grade: 9, questions: 300, skills: 33 },
  ]);
  assert.ok(waveLGrades7To9Counts.every((row) =>
    row.candidateId?.endsWith("combined-wave-a-b-c-d-e-f-g-h-i-j-k")
      && row.candidateVersion?.endsWith("wave-k")
      && /^[a-f0-9]{64}$/u.test(row.candidateHash ?? "")
      && row.publishedQuestions === 0
      && row.pilotEligibleQuestions === 0));
  assert.equal(waveLGrades7To9Inventories.length, 3);
});

test("Wave L Grades 7-9 bounded simulations and verification fail closed without side effects", () => {
  const shard = verifyWaveLGrades7To9Shard();
  assert.equal(shard.status, "PASSED");
  assert.deepEqual(shard.errors, []);
  assert.equal(shard.gradeCount, 3);
  assert.equal(shard.questionCount, 774);
  assert.equal(shard.skillCount, 80);
  assert.equal(shard.prerequisiteEdgeCount, 79);
  assert.equal(shard.inventoryCount, 3);
  assert.equal(shard.simulationCount, 3);
  assert.equal(shard.productionQuestionsAdded, 0);
  assert.equal(shard.sourceWavesMutated, false);
  assert.match(shard.shardHash, /^[a-f0-9]{64}$/u);
  assert.equal(waveLGrades7To9Simulations.length, 3);
  assert.equal(waveLGrades7To9Verifications.length, 3);
  assert.ok(waveLGrades7To9Verifications.every((verification) =>
    verification.status === "PASSED" && verification.errors.length === 0));
});
