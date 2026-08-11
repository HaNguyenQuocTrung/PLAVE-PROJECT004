import assert from "node:assert/strict";
import test from "node:test";
import { buildWaveNFinalAudit } from "../lib/content-factory/wave-n.ts";

const audit = buildWaveNFinalAudit();

test("WN-ACCEPTANCE-MATRIX: all nine grades pass or use the one accepted Grade 1 partial", () => {
  assert.equal(audit.acceptanceMatrix.grades.length, 9); assert.deepEqual(audit.acceptanceMatrix.totals, { pass: 8, partialAccepted: 1, fail: 0 });
  assert.equal(audit.acceptanceMatrix.grades[0]?.result, "PARTIAL_ACCEPTED");
  assert.ok(audit.acceptanceMatrix.grades.slice(1).every((row) => row.result === "PASS"));
});

test("WN-E2E-ALL-GRADES: final deterministic proof covers every required learning event", () => {
  assert.equal(audit.finalE2E.grades, 9); assert.equal(audit.finalE2E.mode, "PURE_DETERMINISTIC_FIXTURES");
  for (const [name, value] of Object.entries(audit.finalE2E)) {
    if (["mode", "grades", "visitedStates", "visitedTransitions", "invariantViolations"].includes(name)) continue;
    assert.equal(value, true, name);
  }
  assert.equal(audit.finalE2E.invariantViolations, 0); assert.ok(audit.finalE2E.visitedStates > 1_800);
});

test("WN-LEARNING: start, feedback, mastery, remediation and fixed-safe fallback have no dead end", () => {
  assert.ok(audit.acceptanceMatrix.grades.every((row) => row.sections.learning));
  assert.equal(audit.finalE2E.startResume, true); assert.equal(audit.finalE2E.submitFeedback, true);
  assert.equal(audit.finalE2E.remediationReturn, true); assert.equal(audit.finalE2E.fixedSafeFallback, true);
  assert.equal(audit.finalE2E.noDeadEnd, true);
});

test("WN-PROGRESS: score, motivation and progress remain deterministic and duplicate safe", () => {
  assert.ok(audit.acceptanceMatrix.grades.every((row) => row.sections.progress));
  assert.equal(audit.finalE2E.progressMotivationHistory, true); assert.equal(audit.finalE2E.duplicateSubmit, true);
  assert.equal(audit.finalE2E.casConflict, true);
});

test("WN-PATH: every grade has retention, mixed practice, termination and future path", () => {
  assert.ok(audit.acceptanceMatrix.grades.every((row) => row.sections.path));
  assert.equal(audit.finalE2E.retention, true); assert.equal(audit.finalE2E.mixedPractice, true);
  assert.equal(audit.finalE2E.maximumTermination, true); assert.equal(audit.finalE2E.gradeCompleteFuturePath, true);
});

test("WN-HISTORY-AUTHORIZATION: history survives deactivation with correct stakeholder scope", () => {
  assert.ok(audit.acceptanceMatrix.grades.every((row) => row.sections.history));
  assert.equal(audit.finalE2E.deactivationPreservesHistory, true); assert.equal(audit.finalE2E.parentApprovedUnapproved, true);
  assert.equal(audit.finalE2E.teacherAuthorizedUnauthorized, true); assert.equal(audit.finalE2E.anonymousCrossUserDenied, true);
});

test("WN-CONTINUOUS-NEXT-ACTION: reachable states have a valid action or explicit completion", () => {
  assert.ok(audit.acceptanceMatrix.grades.every((row) => row.sections.continuousLearning));
  assert.equal(audit.finalE2E.noDeadEnd, true); assert.equal(audit.totals.gradeFail, 0);
});

test("WN-PRODUCT-TRUTH: readiness classes remain separate", () => {
  assert.equal(audit.totals.adaptiveReady, 274); assert.equal(audit.totals.fixedSafe, 13);
  assert.equal(audit.totals.shadowOnly, 51); assert.equal(audit.totals.unavailable, 0);
  assert.equal(audit.candidateInventory.totals.defaultEntitlementCount, 0);
});
