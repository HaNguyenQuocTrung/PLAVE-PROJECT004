import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  parseCurriculumAttemptState,
  type StudentScoringSummary,
} from "../lib/curriculum-runtime/contracts.ts";
import { projectCanonicalXpAfterCommit } from "../lib/curriculum-runtime/xp-projection.ts";
import {
  buildAttemptXpCompletionProjection,
  parseXpCompletionProjection,
  xpCompletionReasonText,
} from "../lib/scoring/completion.ts";
import {
  XP_AWARD,
  xpForFirstTerminalCorrect,
} from "../lib/scoring/policy-v1.ts";
import {
  parsePracticeAnswerStateApiResponse,
  parseSubmitPracticeApiResponse,
} from "../lib/practice/contracts.ts";

const attemptId = "11111111-1111-4111-8111-111111111111";

const summary: StudentScoringSummary = {
  policyVersion: "PLAVE_SCORING_POLICY_V1",
  totalXp: 145,
  recentXp: [],
  masterySummary: { started: 1, mastered: 0, needsReview: 0 },
  outcomes: [],
  attempts: [],
};

function scoringRpcPayload(totalXp = summary.totalXp) {
  return {
    policy_version: "PLAVE_SCORING_POLICY_V1",
    total_xp: totalXp,
    recent_xp: [],
    mastery_summary: { started: 1, mastered: 0, needs_review: 0 },
    outcomes: [],
    attempts: [],
  };
}

function completedCurriculumState(attemptXpEarned = 45) {
  const state = parseCurriculumAttemptState({
    attempt_id: attemptId,
    release_id: "release-v1",
    content_version: "2026.08",
    unit_id: "grade-5-fractions",
    unit_title: "Phân số",
    grade: 5,
    status: "COMPLETED",
    revision: 3,
    answered_count: 3,
    correct_count: attemptXpEarned > 0 ? 3 : 0,
    total_questions: 3,
    started_at: "2026-08-14T00:00:00.000Z",
    completed_at: "2026-08-14T00:05:00.000Z",
    current_question: null,
    feedback: null,
    scoring: {
      policy_version: "PLAVE_SCORING_POLICY_V1",
      legacy: false,
      finalized: true,
      earned_weight: attemptXpEarned > 0 ? 6 : 0,
      possible_weight: 6,
      score_percent: attemptXpEarned > 0 ? 100 : 0,
      attempt_xp_earned: attemptXpEarned,
      xp_delta: attemptXpEarned > 0 ? 20 : 0,
      lesson_completed: true,
      mastery_changes: [],
    },
  });
  assert.ok(state);
  return state;
}

test("difficulty XP is awarded only for the first persisted correct answer", () => {
  assert.deepEqual(XP_AWARD, { EASY: 10, MEDIUM: 15, HARD: 20 });
  const firstCorrectTotal =
    xpForFirstTerminalCorrect("EASY", true) +
    xpForFirstTerminalCorrect("MEDIUM", true) +
    xpForFirstTerminalCorrect("HARD", true);
  assert.equal(firstCorrectTotal, 45);
  assert.equal(xpForFirstTerminalCorrect("HARD", false), 0);
});

test("the production completion projection returns the canonical post-commit total", async () => {
  let aggregateReads = 0;
  const projected = await projectCanonicalXpAfterCommit(
    completedCurriculumState(),
    async () => {
      aggregateReads += 1;
      return { data: scoringRpcPayload(), error: null };
    },
  );
  assert.equal(aggregateReads, 1);
  assert.equal(projected?.xpCompletion?.attemptXpEarned, 45);
  assert.equal(projected?.xpCompletion?.totalXpAfter, 145);
  assert.equal(
    projected?.xpCompletion?.reason,
    "ELIGIBLE_CORRECT_ANSWERS_AWARDED",
  );
});

test("reload/reconciliation is a read-only projection and cannot duplicate XP", async () => {
  const completed = completedCurriculumState();
  const first = await projectCanonicalXpAfterCommit(completed, async () => ({
    data: scoringRpcPayload(),
    error: null,
  }));
  const reopened = await projectCanonicalXpAfterCommit(completed, async () => ({
    data: scoringRpcPayload(),
    error: null,
  }));
  assert.deepEqual(reopened?.xpCompletion, first?.xpCompletion);
  assert.equal(reopened?.xpCompletion?.totalXpAfter, 145);
});

test("a completed eligible attempt with no correct answer has an exact zero-XP reason", async () => {
  const projected = await projectCanonicalXpAfterCommit(
    completedCurriculumState(0),
    async () => ({ data: scoringRpcPayload(100), error: null }),
  );
  assert.equal(projected?.xpCompletion?.eligible, true);
  assert.equal(projected?.xpCompletion?.attemptXpEarned, 0);
  assert.equal(
    projected?.xpCompletion?.reason,
    "NO_CORRECT_ELIGIBLE_ANSWER",
  );
  assert.match(
    xpCompletionReasonText("NO_CORRECT_ELIGIBLE_ANSWER"),
    /không có câu đúng đủ điều kiện/u,
  );
});

test("historical attempts remain explicitly outside the unified XP policy", () => {
  for (const journey of ["FIRST_COMPLETION", "RESUME", "REVIEW"] as const) {
    const projection = buildAttemptXpCompletionProjection({
      policyVersion: null,
      legacy: true,
      attemptXpEarned: 0,
    }, summary.totalXp);
    assert.equal(projection.attemptXpEarned, 0, journey);
    assert.equal(projection.totalXpAfter, 145, journey);
    assert.equal(
      projection.reason,
      "HISTORICAL_ATTEMPT_NOT_ELIGIBLE",
      journey,
    );
  }
});

test("Grade 1 completion and reconciliation require the explicit zero-XP policy result", () => {
  const xpCompletion = buildAttemptXpCompletionProjection({
    policyVersion: null,
    legacy: true,
    attemptXpEarned: 0,
  }, summary.totalXp);
  const completedAnswer = {
    isCorrect: true,
    correctAnswer: "C",
    solutionSteps: ["Bước 1", "Bước 2"],
    explanation: "Giải thích sau khi chấm.",
    hint: "Gợi ý sau khi chấm.",
    answeredCount: 24,
    correctCount: 20,
    completed: true,
    xp: {
      answerXpAwarded: 0,
      attemptXpEarned: 0,
      totalXpAfter: 145,
      policyVersion: null,
      eligible: false,
      zeroXpReason: "HISTORICAL_ATTEMPT_NOT_ELIGIBLE",
    },
  };
  assert.equal(
    parseSubmitPracticeApiResponse({ ok: true, data: completedAnswer }),
    null,
  );
  assert.equal(
    parseSubmitPracticeApiResponse({
      ok: true,
      data: { ...completedAnswer, xpCompletion },
    })?.data.xpCompletion?.reason,
    "HISTORICAL_ATTEMPT_NOT_ELIGIBLE",
  );
  assert.equal(
    parsePracticeAnswerStateApiResponse({
      ok: true,
      data: {
        answer: null,
        answeredCount: 24,
        correctCount: 20,
        completed: true,
      },
    }),
    null,
  );
  assert.equal(
    parsePracticeAnswerStateApiResponse({
      ok: true,
      data: {
        answer: null,
        answeredCount: 24,
        correctCount: 20,
        completed: true,
        xpCompletion,
      },
    })?.data.xpCompletion?.totalXpAfter,
    145,
  );
});

test("completed XP projections fail closed when the aggregate contract is malformed", async () => {
  const projected = await projectCanonicalXpAfterCommit(
    completedCurriculumState(),
    async () => ({ data: { total_xp: 145 }, error: null }),
  );
  assert.equal(projected, null);
  assert.equal(
    parseXpCompletionProjection({
      policyVersion: null,
      eligible: false,
      attemptXpEarned: 45,
      totalXpAfter: 145,
      reason: "HISTORICAL_ATTEMPT_NOT_ELIGIBLE",
    }),
    null,
  );
});

test("all production completion and result paths use canonical post-commit XP", () => {
  const curriculumAnswer = readFileSync(
    "app/api/curriculum-runtime/answer/route.ts",
    "utf8",
  );
  const onDemandAnswer = readFileSync(
    "app/api/on-demand-curriculum/answer/route.ts",
    "utf8",
  );
  const gradeOneAnswer = readFileSync(
    "app/api/practice/answer/route.ts",
    "utf8",
  );
  const result = readFileSync(
    "app/curriculum-practice/[attemptId]/UniversalCurriculumRunner.tsx",
    "utf8",
  );
  const review = readFileSync("app/review/[attemptId]/page.tsx", "utf8");
  const xpSummary = readFileSync(
    "components/XpCompletionSummary.tsx",
    "utf8",
  );
  const dashboard = readFileSync("app/dashboard/page.tsx", "utf8");
  const progress = readFileSync(
    "components/StudentCurriculumProgressView.tsx",
    "utf8",
  );
  const history = readFileSync(
    "components/StudentCurriculumHistoryView.tsx",
    "utf8",
  );
  const historyPage = readFileSync("app/learning-history/page.tsx", "utf8");

  assert.match(curriculumAnswer, /projectCanonicalXpAfterCommit/u);
  assert.match(curriculumAnswer, /revalidateStudentLearningProjections/u);
  assert.match(onDemandAnswer, /loadCanonicalStudentScoringSummary/u);
  assert.match(onDemandAnswer, /revalidateStudentLearningProjections/u);
  assert.match(gradeOneAnswer, /buildAnswerXpCompletionProjection/u);
  assert.match(result, /XpCompletionSummary/u);
  assert.match(review, /XpCompletionSummary/u);
  assert.match(xpSummary, /totalXpAfter/u);
  assert.match(dashboard, /scoring\.totalXp/u);
  assert.match(progress, /scoring\.totalXp/u);
  assert.match(history, /scoringTotalXp/u);
  assert.match(historyPage, /result\.scoring\?\.totalXp/u);
});
