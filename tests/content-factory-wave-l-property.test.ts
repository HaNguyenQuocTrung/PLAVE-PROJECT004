import test from "node:test";
import assert from "node:assert/strict";
import { combinedWaveABCDEFGHIJKGradePacks } from "../lib/content-factory/wave-k-packs.ts";
import { applyWaveLProofSubmission, proveWaveLGradeProperties, type WaveLProofAttempt } from "../lib/content-factory/wave-l-property.ts";

test("Wave L deterministic bounded state traversal has no invariant violation", () => {
  const proofs = combinedWaveABCDEFGHIJKGradePacks.map(proveWaveLGradeProperties);
  assert.equal(proofs.length, 9); assert.ok(proofs.every((proof) => proof.invariantViolations.length === 0));
  assert.ok(proofs.reduce((sum, proof) => sum + proof.visitedStates, 0) >= 2_500);
});

test("Wave L CAS, duplicate and terminal transitions never duplicate effects", () => {
  const base: WaveLProofAttempt = { attemptId: "synthetic-attempt", ownerId: "synthetic-student", revision: 0,
    status: "ACTIVE", submissions: [], evidence: [], totalXp: 0, everMastered: false };
  const command = { submissionId: "synthetic-submission", expectedRevision: 0, questionId: "synthetic-fixture-question",
    isCorrect: true, difficulty: "MEDIUM" as const, answeredAt: "2026-08-11T00:00:00.000Z" };
  const saved = applyWaveLProofSubmission(base, command); assert.equal(saved.kind, "SAVED"); assert.equal(saved.state.revision, 1);
  const replay = applyWaveLProofSubmission(saved.state, command); assert.equal(replay.kind, "IDEMPOTENT_REPLAY"); assert.equal(replay.effectsApplied, false);
  const conflict = applyWaveLProofSubmission(base, { ...command, submissionId: "synthetic-conflict", expectedRevision: 2 });
  assert.equal(conflict.kind, "CAS_CONFLICT"); assert.deepEqual(conflict.state, base);
  const terminal = applyWaveLProofSubmission({ ...saved.state, status: "TERMINAL" }, { ...command,
    submissionId: "synthetic-terminal", expectedRevision: 1 }); assert.equal(terminal.kind, "TERMINAL_REJECTED");
});
