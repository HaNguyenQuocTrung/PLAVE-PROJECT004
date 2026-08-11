import test from "node:test";
import assert from "node:assert/strict";
import {
  verifyWaveLGrades1To3Shard,
  waveLGrades1To3Counts,
  waveLGrades1To3GradeOneBoundary,
  waveLGrades1To3Inventories,
  waveLGrades1To3Simulations,
  waveLGrades1To3Verifications,
} from "../lib/content-factory/wave-l-grades-1-3.ts";

test("Wave L Grades 1-3 inventories immutable combined A-K pools", () => {
  assert.deepEqual(waveLGrades1To3Counts.map((row) => ({
    grade: row.grade,
    questions: row.questions,
    skills: row.skills,
    prerequisiteEdges: row.prerequisiteEdges,
  })), [
    { grade: 1, questions: 312, skills: 51, prerequisiteEdges: 23 },
    { grade: 2, questions: 264, skills: 37, prerequisiteEdges: 39 },
    { grade: 3, questions: 306, skills: 41, prerequisiteEdges: 46 },
  ]);
  assert.ok(waveLGrades1To3Counts.every((row) =>
    row.candidateId?.endsWith("combined-wave-a-b-c-d-e-f-g-h-i-j-k")
      && row.candidateVersion?.endsWith("wave-k")
      && /^[a-f0-9]{64}$/u.test(row.candidateHash ?? "")
      && row.publishedQuestions === 0
      && row.pilotEligibleQuestions === 0));
  assert.equal(waveLGrades1To3Inventories.length, 3);
});

test("Wave L preserves the incomplete Grade 1 evidence boundary without content mutation", () => {
  assert.deepEqual([
    waveLGrades1To3GradeOneBoundary.units,
    waveLGrades1To3GradeOneBoundary.questions,
    waveLGrades1To3GradeOneBoundary.solutions,
    waveLGrades1To3GradeOneBoundary.diagnosticRows,
  ], [13, 312, 312, 24]);
  assert.equal(waveLGrades1To3GradeOneBoundary.deterministicEvidence, 84);
  assert.equal(waveLGrades1To3GradeOneBoundary.quarantined, 24);
  assert.equal(waveLGrades1To3GradeOneBoundary.unknown, 228);
  assert.equal(waveLGrades1To3GradeOneBoundary.evidenceComplete, false);
  assert.equal(waveLGrades1To3GradeOneBoundary.productionQuestionsAdded, 0);
  assert.equal(waveLGrades1To3GradeOneBoundary.fixedRuntimeModified, false);
  assert.equal(waveLGrades1To3GradeOneBoundary.legacyContentModified, false);
  assert.match(waveLGrades1To3GradeOneBoundary.sourceDigest, /^[a-f0-9]{64}$/u);
  assert.match(waveLGrades1To3GradeOneBoundary.shadowCandidateHash ?? "", /^[a-f0-9]{64}$/u);
});

test("Wave L Grades 1-3 bounded simulations pass and fail closed without side effects", () => {
  const shard = verifyWaveLGrades1To3Shard();
  assert.equal(shard.status, "PASSED");
  assert.deepEqual(shard.errors, []);
  assert.equal(shard.gradeCount, 3);
  assert.equal(shard.questionCount, 882);
  assert.equal(shard.skillCount, 129);
  assert.equal(shard.prerequisiteEdgeCount, 108);
  assert.equal(shard.inventoryCount, 3);
  assert.equal(shard.simulationCount, 3);
  assert.equal(shard.productionQuestionsAdded, 0);
  assert.equal(shard.sourceWavesMutated, false);
  assert.equal(shard.gradeOneUnknownPreserved, 228);
  assert.equal(shard.gradeOneQuarantinePreserved, 24);
  assert.match(shard.shardHash, /^[a-f0-9]{64}$/u);
  assert.equal(waveLGrades1To3Simulations.length, 3);
  assert.equal(waveLGrades1To3Verifications.length, 3);
  assert.ok(waveLGrades1To3Verifications.every((verification) =>
    verification.status === "PASSED" && verification.errors.length === 0));
});

