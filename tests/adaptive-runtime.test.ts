import { strict as assert } from "node:assert";
import test from "node:test";

import {
  GRADE_TWO_NUMBERS_TO_1000_BUNDLE_SHA256,
  abandonAdaptiveAttempt,
  assertFrozenCandidateBinding,
  createFrozenAdaptiveQuestionBank,
  createStartedAdaptiveAttempt,
  prepareAdaptiveRetentionPlan,
  projectAdaptiveClientSession,
  startOrResumeAdaptiveAttempt,
  submitAdaptiveAnswer,
  submitAdaptiveAnswerAtomically,
  type AdaptiveAttemptState,
  type AdaptiveAttemptRepository,
} from "../lib/content-engine/adaptive-runtime.ts";
import {
  adaptiveRuntimeFeatureFlags,
  resolvePracticeRuntimeAccess,
} from "../lib/practice/runtime-flags.ts";

const bank = createFrozenAdaptiveQuestionBank();
const startTime = "2026-07-29T16:00:00.000Z";

function startAttempt(attemptId = "adaptive-attempt-1") {
  return startOrResumeAdaptiveAttempt(bank, {
    attemptId,
    ownerId: "student-fixture-1",
    plannerSeed: "runtime-fixture-seed",
    now: startTime,
    existing: null,
  }).state;
}

function answerForCurrent(
  state: AdaptiveAttemptState,
  mode: "CORRECT" | "INCORRECT",
) {
  assert.ok(state.currentQuestionId);
  const solution = bank.serverSolutions.find(
    (item) => item.questionId === state.currentQuestionId,
  );
  const question = bank.publicQuestions.find(
    (item) => item.questionId === state.currentQuestionId,
  );
  assert.ok(solution);
  assert.ok(question);
  if (mode === "CORRECT") return solution.correctAnswer;
  if (question.answerType === "MULTIPLE_CHOICE") {
    return (["A", "B", "C", "D"] as const).find(
      (option) => option !== solution.correctAnswer,
    ) ?? "A";
  }
  return solution.correctAnswer === "0" ? "1" : "0";
}

function submitCurrent(
  state: AdaptiveAttemptState,
  mode: "CORRECT" | "INCORRECT",
) {
  return submitAdaptiveAnswer(bank, state, {
    submissionId: `submission-${state.evidence.length + 1}`,
    questionId: state.currentQuestionId ?? "",
    answer: answerForCurrent(state, mode),
    expectedRevision: state.revision,
    submittedAt: new Date(
      Date.parse(startTime) + (state.evidence.length + 1) * 1000,
    ).toISOString(),
  });
}

function createFixtureRepository(
  initialState: AdaptiveAttemptState,
): AdaptiveAttemptRepository & {
  read(): AdaptiveAttemptState;
} {
  let storedState = initialState;
  return {
    async getOwnedAttempt(attemptId, ownerId) {
      return storedState.attemptId === attemptId &&
        storedState.ownerId === ownerId
        ? storedState
        : null;
    },
    async compareAndSwap(
      attemptId,
      ownerId,
      expectedRevision,
      nextState,
    ) {
      if (
        storedState.attemptId !== attemptId ||
        storedState.ownerId !== ownerId ||
        storedState.revision !== expectedRevision
      ) {
        return false;
      }
      storedState = nextState;
      return true;
    },
    read() {
      return storedState;
    },
  };
}

test("Sprint 6F 1. Frozen candidate identity and hash remain exact", () => {
  assert.equal(
    bank.binding.bundleSha256,
    "1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530",
  );
  assert.equal(
    bank.binding.bundleSha256,
    GRADE_TWO_NUMBERS_TO_1000_BUNDLE_SHA256,
  );
  assert.equal(bank.publicQuestions.length, 24);
  assert.equal(bank.serverSolutions.length, 24);
  assert.equal(
    new Set(bank.publicQuestions.map((question) => question.questionId))
      .size,
    24,
  );
});

test("Sprint 6F 2. All runtime and pilot feature flags default false", () => {
  assert.deepEqual(adaptiveRuntimeFeatureFlags, {
    GRADE2_NUMBERS_TO_1000_ENABLED: false,
    ADAPTIVE_PRACTICE_RUNTIME_ENABLED: false,
    CONTROLLED_PILOT_ENABLED: false,
    RETENTION_RUNTIME_ENABLED: false,
  });
  assert.deepEqual(
    resolvePracticeRuntimeAccess("grade-2-numbers-to-1000"),
    { kind: "HIDDEN_RELEASE_CANDIDATE", reason: "NOT_PUBLISHED" },
  );
  assert.deepEqual(resolvePracticeRuntimeAccess("grade-1-numbers-to-10"), {
    kind: "FIXED_RUNTIME",
  });
});

test("Sprint 6F 3. Flags cannot override a DRAFT/HIDDEN publication guard", () => {
  const allEnabled = {
    GRADE2_NUMBERS_TO_1000_ENABLED: true,
    ADAPTIVE_PRACTICE_RUNTIME_ENABLED: true,
    CONTROLLED_PILOT_ENABLED: true,
    RETENTION_RUNTIME_ENABLED: true,
  };
  assert.deepEqual(
    resolvePracticeRuntimeAccess(
      "grade-2-numbers-to-1000",
      allEnabled,
    ),
    { kind: "HIDDEN_RELEASE_CANDIDATE", reason: "NOT_PUBLISHED" },
  );
});

test("Sprint 6F 4. STARTED advances to IN_PROGRESS and start is idempotent", () => {
  const raw = createStartedAdaptiveAttempt({
    attemptId: "adaptive-started",
    ownerId: "student-fixture-1",
    plannerSeed: "runtime-fixture-seed",
    startedAt: startTime,
  });
  assert.equal(raw.status, "STARTED");
  assert.equal(raw.currentQuestionId, null);

  const first = startOrResumeAdaptiveAttempt(bank, {
    attemptId: raw.attemptId,
    ownerId: raw.ownerId,
    plannerSeed: raw.plannerSeed,
    now: startTime,
    existing: null,
  });
  assert.equal(first.kind, "STARTED");
  assert.equal(first.state.status, "IN_PROGRESS");
  assert.ok(first.state.currentQuestionId);

  const resumed = startOrResumeAdaptiveAttempt(bank, {
    attemptId: first.state.attemptId,
    ownerId: first.state.ownerId,
    plannerSeed: first.state.plannerSeed,
    now: "2026-07-29T16:01:00.000Z",
    existing: first.state,
  });
  assert.equal(resumed.kind, "RESUMED");
  assert.deepEqual(resumed.state, first.state);
  assert.equal(
    resumed.clientSession.currentQuestion?.questionId,
    first.state.currentQuestionId,
  );
});

test("Sprint 6F 5. Runtime never completes before 12 answers", () => {
  let state = startAttempt("adaptive-minimum");
  for (let index = 0; index < 11; index += 1) {
    state = submitCurrent(state, "CORRECT").state;
    assert.equal(state.status, "IN_PROGRESS");
    assert.equal(state.evidence.length, index + 1);
  }
});

test("Sprint 6F 6. Per-skill mastery can complete early at 12", () => {
  let state = startAttempt("adaptive-early");
  while (state.status === "IN_PROGRESS") {
    state = submitCurrent(state, "CORRECT").state;
  }
  assert.equal(state.status, "MASTERED_EARLY");
  assert.equal(state.evidence.length, 12);
  assert.equal(
    state.completionReason,
    "ADAPTIVE_MASTERY_EVIDENCE_MET",
  );
});

test("Sprint 6F 7. Weak evidence runs to max and ends with remediation", () => {
  let state = startAttempt("adaptive-remediation");
  while (state.status === "IN_PROGRESS") {
    state = submitCurrent(state, "INCORRECT").state;
  }
  assert.equal(state.status, "REMEDIATION_REQUIRED");
  assert.equal(state.evidence.length, 24);
  assert.equal(
    state.completionReason,
    "MAXIMUM_REACHED_WITHOUT_MASTERY",
  );
  assert.equal(state.remediationSkillIds.length, 4);
  const client = projectAdaptiveClientSession(bank, state);
  assert.equal(client.remediation.length, 4);
  assert.ok(
    client.remediation.every(
      (item) =>
        !/không đủ khả năng/i.test(item.message) &&
        item.theoryAnchor.length > 0,
    ),
  );
});

test("Sprint 6F 8. Submit is idempotent and evidence is not counted twice", () => {
  const state = startAttempt("adaptive-idempotent");
  const command = {
    submissionId: "same-submission",
    questionId: state.currentQuestionId ?? "",
    answer: answerForCurrent(state, "CORRECT"),
    expectedRevision: state.revision,
    submittedAt: "2026-07-29T16:00:01.000Z",
  };
  const saved = submitAdaptiveAnswer(bank, state, command);
  const replay = submitAdaptiveAnswer(bank, saved.state, command);
  assert.equal(saved.kind, "SAVED");
  assert.equal(replay.kind, "IDEMPOTENT_REPLAY");
  assert.equal(replay.state.evidence.length, 1);
  assert.deepEqual(replay.state, saved.state);
});

test("Sprint 6G-A. Reused idempotency key with another payload fails closed", () => {
  const state = startAttempt("adaptive-idempotency-forgery");
  const command = {
    submissionId: "same-key-different-payload",
    questionId: state.currentQuestionId ?? "",
    answer: answerForCurrent(state, "CORRECT"),
    expectedRevision: state.revision,
    submittedAt: "2026-07-29T16:00:01.000Z",
  };
  const saved = submitAdaptiveAnswer(bank, state, command);
  assert.throws(
    () =>
      submitAdaptiveAnswer(bank, saved.state, {
        ...command,
        answer: answerForCurrent(state, "INCORRECT"),
      }),
    /Submission ID đã được dùng cho payload khác/,
  );
  assert.equal(saved.state.evidence.length, 1);
});

test("Sprint 6F 9. Concurrent stale revision fails closed", () => {
  const state = startAttempt("adaptive-concurrent");
  const saved = submitCurrent(state, "CORRECT");
  assert.throws(
    () =>
      submitAdaptiveAnswer(bank, saved.state, {
        submissionId: "concurrent-second",
        questionId: saved.state.currentQuestionId ?? "",
        answer: answerForCurrent(saved.state, "CORRECT"),
        expectedRevision: state.revision,
        submittedAt: "2026-07-29T16:00:02.000Z",
      }),
    /Concurrent attempt revision conflict/,
  );
});

test("Sprint 6F 10. Repository CAS records one concurrent answer only", async () => {
  const state = startAttempt("adaptive-cas");
  const repository = createFixtureRepository(state);
  const baseCommand = {
    questionId: state.currentQuestionId ?? "",
    answer: answerForCurrent(state, "CORRECT"),
    expectedRevision: state.revision,
    submittedAt: "2026-07-29T16:00:01.000Z",
  };
  const outcomes = await Promise.allSettled([
    submitAdaptiveAnswerAtomically(
      bank,
      repository,
      state.ownerId,
      state.attemptId,
      { ...baseCommand, submissionId: "concurrent-a" },
    ),
    submitAdaptiveAnswerAtomically(
      bank,
      repository,
      state.ownerId,
      state.attemptId,
      { ...baseCommand, submissionId: "concurrent-b" },
    ),
  ]);
  assert.equal(
    outcomes.filter((outcome) => outcome.status === "fulfilled").length,
    1,
  );
  assert.equal(
    outcomes.filter((outcome) => outcome.status === "rejected").length,
    1,
  );
  assert.equal(repository.read().evidence.length, 1);
});

test("Sprint 6F 11. Completed attempts reject new answers", () => {
  let state = startAttempt("adaptive-completed");
  while (state.status === "IN_PROGRESS") {
    state = submitCurrent(state, "CORRECT").state;
  }
  const firstQuestion = bank.publicQuestions[0];
  assert.ok(firstQuestion);
  assert.throws(
    () =>
      submitAdaptiveAnswer(bank, state, {
        submissionId: "after-completion",
        questionId: firstQuestion.questionId,
        answer: "0",
        expectedRevision: state.revision,
        submittedAt: "2026-07-29T16:10:00.000Z",
      }),
    /Completed attempt/,
  );
});

test("Sprint 6F 12. Client session has no future order or solution data", () => {
  const client = projectAdaptiveClientSession(
    bank,
    startAttempt("adaptive-client-boundary"),
  );
  const serialized = JSON.stringify(client);
  for (const forbidden of [
    "correctAnswer",
    "solutionSteps",
    "serverSolutions",
    "privateAudit",
    "questionOrder",
    "futureQuestions",
    "masteryThreshold",
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.ok(client.currentQuestion);
});

test("Sprint 6F 13. Content binding drift requires a new candidate", () => {
  assert.throws(
    () =>
      assertFrozenCandidateBinding({
        ...bank.binding,
        contentVersion: "g2n1000-1.0.0-rc.2",
      }),
    /candidate\/version mới/,
  );
});

test("Sprint 6F 14. Retention is separate and only planned after mastery", () => {
  let state = startAttempt("adaptive-retention");
  while (state.status === "IN_PROGRESS") {
    state = submitCurrent(state, "CORRECT").state;
  }
  const plan = prepareAdaptiveRetentionPlan(bank, state);
  assert.equal(plan.status, "PLANNED_NOT_PERSISTED");
  assert.equal(plan.questionIds.length, 4);
  assert.equal(new Set(plan.questionIds).size, 4);
  assert.equal(plan.evidence.length, 0);
  assert.equal(plan.resultIsSeparateFromInitialAttempt, true);
  assert.equal(plan.dueAt, "2026-08-05T16:00:12.000Z");
});

test("Sprint 6F 15. Abandon is terminal without fabricating mastery", () => {
  const abandoned = abandonAdaptiveAttempt(
    startAttempt("adaptive-abandoned"),
    "2026-07-29T17:00:00.000Z",
  );
  assert.equal(abandoned.status, "ABANDONED");
  assert.equal(abandoned.completionReason, "OWNER_ABANDONED");
  assert.equal(abandoned.remediationSkillIds.length, 0);
});
