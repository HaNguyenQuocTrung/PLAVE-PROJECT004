import test from "node:test";
import assert from "node:assert/strict";
import {
  verifyWaveLGrades4To6Shard,
  waveLGrades4To6Counts,
  waveLGrades4To6Inventories,
  waveLGrades4To6Simulations,
  waveLGrades4To6Verifications,
} from "../lib/content-factory/wave-l-grades-4-6.ts";

test("Wave L Grades 4-6 shard inventories the immutable combined A-K pools", () => {
  assert.deepEqual(waveLGrades4To6Counts.map((row) => ({
    grade: row.grade,
    questions: row.questions,
    skills: row.skills,
    prerequisiteEdges: row.prerequisiteEdges,
  })), [
    { grade: 4, questions: 319, skills: 34, prerequisiteEdges: 39 },
    { grade: 5, questions: 312, skills: 34, prerequisiteEdges: 40 },
    { grade: 6, questions: 485, skills: 61, prerequisiteEdges: 65 },
  ]);
  assert.ok(waveLGrades4To6Counts.every((row) =>
    row.candidateId?.endsWith("combined-wave-a-b-c-d-e-f-g-h-i-j-k")
      && row.candidateVersion?.endsWith("wave-k")
      && /^[a-f0-9]{64}$/u.test(row.candidateHash ?? "")
      && row.publishedQuestions === 0
      && row.pilotEligibleQuestions === 0));
  assert.equal(waveLGrades4To6Inventories.length, 3);
});

test("Wave L Grades 4-6 bounded simulations and verification fail closed without side effects", () => {
  const shard = verifyWaveLGrades4To6Shard();
  assert.equal(shard.status, "PASSED");
  assert.deepEqual(shard.errors, []);
  assert.equal(shard.gradeCount, 3);
  assert.equal(shard.questionCount, 1_116);
  assert.equal(shard.skillCount, 129);
  assert.equal(shard.prerequisiteEdgeCount, 144);
  assert.equal(shard.inventoryCount, 3);
  assert.equal(shard.simulationCount, 3);
  assert.equal(shard.productionQuestionsAdded, 0);
  assert.equal(shard.sourceWavesMutated, false);
  assert.match(shard.shardHash, /^[a-f0-9]{64}$/u);
  assert.equal(waveLGrades4To6Simulations.length, 3);
  assert.equal(waveLGrades4To6Verifications.length, 3);
  assert.ok(waveLGrades4To6Verifications.every((verification) =>
    verification.status === "PASSED" && verification.errors.length === 0));
});

test("Wave L Grades 4-6 preserves honest pool-limited classifications", () => {
  assert.deepEqual(waveLGrades4To6Inventories.map((inventory) => ({
    grade: inventory.grade,
    readiness: inventory.gradeReadiness,
    adaptiveReady: inventory.countsByReadiness.ADAPTIVE_READY,
    poolLimited: inventory.countsByReadiness.POOL_LIMITED_FAIL_CLOSED,
  })), [
    { grade: 4, readiness: "ADAPTIVE_READY", adaptiveReady: 34, poolLimited: 0 },
    { grade: 5, readiness: "POOL_LIMITED_FAIL_CLOSED", adaptiveReady: 33, poolLimited: 1 },
    { grade: 6, readiness: "POOL_LIMITED_FAIL_CLOSED", adaptiveReady: 58, poolLimited: 3 },
  ]);
  assert.deepEqual(waveLGrades4To6Inventories.flatMap((inventory) =>
    inventory.skillRows.filter((row) => row.readiness === "POOL_LIMITED_FAIL_CLOSED")
      .map((row) => [row.skillId, row.questionPool, row.reasoningStructures, row.failClosedReason])), [
    ["moet2018-g5-num-p041-010", 6, 1, "RETRY_STRUCTURE_UNAVAILABLE"],
    ["moet2018-g6-naa-p048-018", 6, 1, "RETRY_STRUCTURE_UNAVAILABLE"],
    ["moet2018-g6-naa-p048-024", 6, 1, "RETRY_STRUCTURE_UNAVAILABLE"],
    ["moet2018-g6-naa-p048-027", 6, 1, "RETRY_STRUCTURE_UNAVAILABLE"],
  ]);
  assert.deepEqual(waveLGrades4To6Simulations.map((simulation) => ({
    grade: simulation.grade,
    states: simulation.visitedStates,
    transitions: simulation.visitedTransitions,
    violations: simulation.invariantViolations.length,
  })), [
    { grade: 4, states: 111, transitions: 111, violations: 0 },
    { grade: 5, states: 111, transitions: 111, violations: 0 },
    { grade: 6, states: 192, transitions: 192, violations: 0 },
  ]);
  assert.ok(waveLGrades4To6Simulations.every((simulation) =>
    simulation.checks.retryDifferentStructure
      && simulation.checks.emptyPoolFailClosed
      && simulation.checks.alwaysValidNextAction
      && !simulation.checks.schoolGradeMutation
      && !simulation.checks.entitlementGrant));
});
