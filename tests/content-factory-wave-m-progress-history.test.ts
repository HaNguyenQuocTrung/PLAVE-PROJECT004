import assert from "node:assert/strict";
import test from "node:test";
import { PLAVE_MOTIVATION_POLICY_V1 } from "../lib/motivation/policy-v1.ts";
import { PLAVE_SCORING_POLICY_V1 } from "../lib/scoring/policy-v1.ts";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { combinedWaveABCDEFGHIJKGradePacks } from "../lib/content-factory/wave-k-packs.ts";
import { appendWaveMHistoryExactlyOnce, authorizeWaveMAction, deriveWaveMProgress, emptyWaveMHistoryState,
  readWaveMHistoryPage, type WaveMHistoryRecord, type WaveMViewActor } from "../lib/content-factory/wave-m-progress.ts";

const pack = combinedWaveABCDEFGHIJKGradePacks.find((entry) => entry.grade === 4)!;
const ownerId = "synthetic-wave-m-progress-student";

function record(attemptId: string, minute: number, totalXpAfter: number): WaveMHistoryRecord {
  return { schemaVersion: "plave-wave-m-history-record-v1", ownerId, schoolGrade: 4, candidate: pack.candidate!,
    unitId: pack.units[0]!.id, skillId: pack.questions[0]!.skillId, attemptId,
    startedAt: `2026-08-20T00:${String(minute).padStart(2, "0")}:00.000Z`,
    completedAt: `2026-08-20T00:${String(minute + 1).padStart(2, "0")}:00.000Z`,
    questionsAttempted: [{ questionId: `${attemptId}-q`, correct: true }], scoring: { policyVersion: PLAVE_SCORING_POLICY_V1,
      scorePercent: 100, xpAwarded: 10, totalXpAfter }, motivation: { policyVersion: PLAVE_MOTIVATION_POLICY_V1,
      levelAfter: 1, streakAfter: 1, goalState: "IN_PROGRESS", achievementIds: ["FIRST_STEP", "FIRST_CORRECT"] },
    masteryTransition: { from: "NOT_STARTED", to: "IN_PROGRESS", provenance: "PLAVE_SCORING_POLICY_V1" },
    remediationTransition: { fromSkillId: null, toSkillId: null, reasonCode: "NO_REMEDIATION_REQUIRED" },
    completionReason: "MASTERY", nextAction: { kind: "ADVANCE_SKILL", reasonCode: "SAME_GRADE_CONTINUE", targetSkillId: pack.questions[0]!.skillId },
    resumeState: "TERMINAL", candidateActiveAtRead: true, policyInterpretationFrozen: true };
}

const student: WaveMViewActor = { userId: ownerId, role: "STUDENT", approvedStudentIds: [], authorizedStudentIds: [] };

test("history append is exactly-once with CAS and idempotency conflicts", () => {
  const first = record("attempt-a", 0, 10);
  const saved = appendWaveMHistoryExactlyOnce(emptyWaveMHistoryState, { idempotencyKey: "mutation-a", expectedRecordCount: 0, record: first });
  assert.equal(saved.kind, "APPENDED"); assert.equal(saved.state.records.length, 1);
  const replay = appendWaveMHistoryExactlyOnce(saved.state, { idempotencyKey: "mutation-a", expectedRecordCount: 1, record: first });
  assert.equal(replay.kind, "IDEMPOTENT_REPLAY"); assert.equal(replay.effectsApplied, false);
  const conflict = appendWaveMHistoryExactlyOnce(saved.state, { idempotencyKey: "mutation-a", expectedRecordCount: 1,
    record: { ...first, completionReason: "MAXIMUM_TERMINATION" } });
  assert.equal(conflict.kind, "IDEMPOTENCY_CONFLICT");
  const cas = appendWaveMHistoryExactlyOnce(saved.state, { idempotencyKey: "mutation-b", expectedRecordCount: 8, record: record("attempt-b", 4, 20) });
  assert.equal(cas.kind, "CAS_CONFLICT"); assert.equal(canonicalize(cas.state), canonicalize(saved.state));
});

test("history reads are stable, paginated and current-owner scoped", () => {
  const one = appendWaveMHistoryExactlyOnce(emptyWaveMHistoryState, { idempotencyKey: "m1", expectedRecordCount: 0, record: record("attempt-a", 0, 10) });
  const two = appendWaveMHistoryExactlyOnce(one.state, { idempotencyKey: "m2", expectedRecordCount: 1, record: record("attempt-b", 4, 20) });
  const firstPage = readWaveMHistoryPage(two.state, { actor: student, ownerId, cursor: null, limit: 1 });
  assert.equal(firstPage.ok, true); assert.equal(firstPage.records[0]?.attemptId, "attempt-b"); assert.equal(firstPage.nextCursor, "attempt-b");
  const secondPage = readWaveMHistoryPage(two.state, { actor: student, ownerId, cursor: firstPage.nextCursor, limit: 1 });
  assert.equal(secondPage.ok, true); assert.equal(secondPage.records[0]?.attemptId, "attempt-a"); assert.equal(secondPage.nextCursor, null);
  assert.equal(canonicalize(firstPage), canonicalize(readWaveMHistoryPage(two.state, { actor: student, ownerId, cursor: null, limit: 1 })));
});

test("progress is derived only from history and server inventory", () => {
  const saved = appendWaveMHistoryExactlyOnce(emptyWaveMHistoryState, { idempotencyKey: "m1", expectedRecordCount: 0, record: record("attempt-a", 0, 10) });
  const progress = deriveWaveMProgress({ ownerId, schoolGrade: 4, history: saved.state.records,
    serverInventory: { candidateSkillCount: 34, unitCount: 16 }, asOf: "2026-08-20T02:00:00.000Z" });
  assert.equal(progress.historyDerived, true); assert.equal(progress.clientSuppliedTotalsAccepted, false);
  assert.equal(progress.evidence.count, 1); assert.equal(progress.evidence.accuracyPercent, 100);
  assert.equal(progress.completionSummary.denominatorKind, "QUESTION_BEARING_CANDIDATE_SKILLS");
  assert.equal(progress.completionSummary.curriculumPercentClaim, null); assert.equal(progress.schoolGradeMutation, false);
  assert.equal(progress.scoring.totalXp, 10); assert.ok(progress.motivation.achievements.includes("FIRST_STEP"));
});

test("progress rejects cross-user or cross-grade history", () => {
  assert.throws(() => deriveWaveMProgress({ ownerId, schoolGrade: 4, history: [{ ...record("attempt-a", 0, 10), ownerId: "other" }],
    serverInventory: { candidateSkillCount: 34, unitCount: 16 }, asOf: "2026-08-20T02:00:00.000Z" }), /OWNER_OR_GRADE_MISMATCH/u);
  assert.throws(() => deriveWaveMProgress({ ownerId, schoolGrade: 4, history: [record("attempt-a", 0, 10), record("attempt-a", 2, 20)],
    serverInventory: { candidateSkillCount: 34, unitCount: 16 }, asOf: "2026-08-20T02:00:00.000Z" }), /DUPLICATE_ATTEMPT_HISTORY/u);
});

test("approved stakeholders can read summaries but cannot start or submit", () => {
  const parent: WaveMViewActor = { userId: "parent", role: "PARENT", approvedStudentIds: [ownerId], authorizedStudentIds: [] };
  const teacher: WaveMViewActor = { userId: "teacher", role: "TEACHER", approvedStudentIds: [], authorizedStudentIds: [ownerId] };
  const deniedParent: WaveMViewActor = { ...parent, approvedStudentIds: [] };
  const saved = appendWaveMHistoryExactlyOnce(emptyWaveMHistoryState, { idempotencyKey: "m1", expectedRecordCount: 0, record: record("attempt-a", 0, 10) });
  assert.equal(readWaveMHistoryPage(saved.state, { actor: parent, ownerId, cursor: null, limit: 10 }).ok, true);
  assert.equal(readWaveMHistoryPage(saved.state, { actor: teacher, ownerId, cursor: null, limit: 10 }).ok, true);
  assert.equal(readWaveMHistoryPage(saved.state, { actor: deniedParent, ownerId, cursor: null, limit: 10 }).ok, false);
  assert.equal(authorizeWaveMAction(parent, "START", ownerId).allowed, false);
  assert.equal(authorizeWaveMAction(teacher, "SUBMIT", ownerId).allowed, false);
});

test("history retains candidate interpretation without solution fields", () => {
  const item = record("attempt-a", 0, 10); const serialized = canonicalize(item);
  assert.equal(item.candidate.bundleHash, pack.candidate!.bundleHash); assert.equal(item.policyInterpretationFrozen, true);
  assert.doesNotMatch(serialized, /(?:exactValue|finalAnswer|explanation|solution)/u);
});
