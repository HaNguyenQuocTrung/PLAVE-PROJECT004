import assert from "node:assert/strict";
import test from "node:test";
import { combinedWaveABCDEFGHIJKGradePacks } from "../lib/content-factory/wave-k-packs.ts";
import { buildWaveMDefinitionOfDone } from "../lib/content-factory/wave-m-dod.ts";
import { proveWaveMAllGradeJourneys, proveWaveMGradeJourney } from "../lib/content-factory/wave-m-journey.ts";
import { auditWaveMRouteAccessibility } from "../lib/content-factory/wave-m-route-audit.ts";

test("all nine grades complete start, learn, progress, history and continue journeys", () => {
  const proof = proveWaveMAllGradeJourneys(combinedWaveABCDEFGHIJKGradePacks);
  assert.equal(proof.status, "PASSED"); assert.equal(proof.totals.grades, 9);
  assert.equal(proof.totals.invariantViolations, 0); assert.ok(proof.totals.states > 1_800); assert.ok(proof.totals.transitions > 1_500);
});

test("every grade proves learning, persistence, continuity and isolation cases", () => {
  for (const pack of combinedWaveABCDEFGHIJKGradePacks) {
    const proof = proveWaveMGradeJourney(pack);
    for (const [name, value] of Object.entries(proof.checks)) assert.equal(value, true, `G${pack.grade}:${name}`);
    assert.equal(proof.progress.schoolGrade, pack.grade); assert.equal(proof.invariantViolations.length, 0);
  }
});

test("Grade 1 remains fixed runtime with local shadow comparison only", () => {
  const proof = proveWaveMGradeJourney(combinedWaveABCDEFGHIJKGradePacks[0]!);
  assert.equal(proof.mode, "GRADE_ONE_FIXED_RUNTIME_SHADOW_COMPARISON");
  assert.equal(proof.checks.gradeOneFixedRuntime, true); assert.equal(proof.checks.gradeOneShadowNoHook, true);
});

test("Grades 2-9 use exact synthetic hidden candidate bindings", () => {
  for (const pack of combinedWaveABCDEFGHIJKGradePacks.slice(1)) {
    const proof = proveWaveMGradeJourney(pack);
    assert.equal(proof.mode, "SYNTHETIC_EXACT_HIDDEN_CANDIDATE");
    assert.equal(proof.checks.publicCatalogIsolation, true); assert.equal(proof.checks.defaultFlagsFalse, true);
  }
});

test("route and component states meet accessibility journey contract", () => {
  const audit = auditWaveMRouteAccessibility();
  assert.equal(audit.status, "PASSED"); assert.deepEqual(audit.errors, []);
  assert.ok(Object.values(audit.checks).every(Boolean)); assert.equal(audit.portUsed, false); assert.equal(audit.redesignPerformed, false);
});

test("definition-of-done matrix has no FAIL and only Grade 1 adaptive PARTIAL", () => {
  const journeys = proveWaveMAllGradeJourneys(combinedWaveABCDEFGHIJKGradePacks); const routeAudit = auditWaveMRouteAccessibility();
  const matrix = buildWaveMDefinitionOfDone({ journeys, routeAudit });
  assert.equal(matrix.status, "PASSED"); assert.deepEqual(matrix.totals, { pass: 44, partial: 1, fail: 0 });
  const partials = matrix.grades.flatMap((grade) => grade.rows.map((row) => ({ grade: grade.grade, ...row }))).filter((row) => row.result === "PARTIAL");
  assert.deepEqual(partials.map((row) => [row.grade, row.criterion]), [[1, "CAN_LEARN"]]);
});
