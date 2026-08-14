import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  parseCurriculumAttemptState,
  parseStudentScoringSummary,
  parseSubmitCurriculumRequest,
} from "../lib/curriculum-runtime/contracts.ts";

const uuid = "11111111-1111-4111-8111-111111111111";

test("public attempt scoring parses only sanitized V1 fields", () => {
  const state = parseCurriculumAttemptState({
    attempt_id: uuid,
    release_id: "release-v1",
    content_version: "2026.08",
    unit_id: "grade-7-algebra",
    unit_title: "Đại số",
    grade: 7,
    status: "COMPLETED",
    revision: 12,
    answered_count: 12,
    correct_count: 10,
    total_questions: 12,
    started_at: "2026-08-03T00:00:00.000Z",
    completed_at: "2026-08-03T00:10:00.000Z",
    current_question: null,
    feedback: null,
    scoring: {
      policy_version: "PLAVE_SCORING_POLICY_V1",
      legacy: false,
      finalized: true,
      earned_weight: 20,
      possible_weight: 24,
      score_percent: 83,
      attempt_xp_earned: 165,
      xp_delta: 0,
      lesson_completed: true,
      mastery_changes: [
        {
          outcome_title: "Giải phương trình",
          evidence_count: 8,
          correct_count: 7,
          mastery_percent: 88,
          status: "MASTERED",
          last_evidence_at: "2026-08-03T00:10:00.000Z",
        },
      ],
    },
  });
  assert.equal(state?.scoring?.scorePercent, 83);
  assert.equal(state?.scoring?.attemptXpEarned, 165);
  assert.equal(state?.scoring?.masteryChanges[0]?.status, "MASTERED");
  assert.doesNotMatch(JSON.stringify(state), /student_id|solver|private|seed/iu);
});
test("Student summary exposes aggregate product data without private evidence window", () => {
  const summary = parseStudentScoringSummary({
    policy_version: "PLAVE_SCORING_POLICY_V1",
    total_xp: 45,
    recent_xp: [
      {
        amount: 20,
        difficulty: "HARD",
        unit_title: "Phân số",
        awarded_at: "2026-08-03T00:10:00.000Z",
      },
    ],
    mastery_summary: { started: 2, mastered: 1, needs_review: 0 },
    outcomes: [
      {
        title: "So sánh phân số",
        evidence_count: 8,
        correct_count: 7,
        mastery_percent: 88,
        status: "MASTERED",
        last_evidence_at: "2026-08-03T00:10:00.000Z",
      },
    ],
    attempts: [
      {
        attempt_id: uuid,
        policy_version: "PLAVE_SCORING_POLICY_V1",
        legacy: false,
        score_percent: 88,
        earned_weight: 21,
        possible_weight: 24,
        xp_earned: 45,
        lesson_completed: true,
      },
    ],
  });
  assert.equal(summary?.totalXp, 45);
  assert.equal(summary?.masterySummary.mastered, 1);
  assert.doesNotMatch(
    JSON.stringify(summary),
    /active_evidence_window|normalized_answer|is_correct|event_id/iu,
  );
});

test("client cannot submit score, XP, difficulty, mastery or correctness", () => {
  const valid = {
    attemptId: uuid,
    questionId: "question-one",
    answer: "12",
    expectedRevision: 0,
    idempotencyKey: "22222222-2222-4222-8222-222222222222",
  };
  assert.ok(parseSubmitCurriculumRequest(valid));
  for (const field of [
    "scorePercent",
    "xp",
    "difficulty",
    "mastery",
    "isCorrect",
    "policyVersion",
  ]) {
    assert.equal(parseSubmitCurriculumRequest({ ...valid, [field]: 100 }), null);
  }
});

test("Student UI distinguishes attempt score, XP, mastery and lesson completion", () => {
  const runner = readFileSync(
    "app/curriculum-practice/[attemptId]/UniversalCurriculumRunner.tsx",
    "utf8",
  );
  const progress = readFileSync(
    "components/StudentCurriculumProgressView.tsx",
    "utf8",
  );
  assert.match(runner, /Điểm lượt học/u);
  assert.match(runner, /XP lượt này/u);
  assert.match(runner, /Tổng XP sau lượt này/u);
  assert.match(runner, /xpCompletionReasonText/u);
  assert.match(runner, /Hoàn thành bài học và thành thạo kỹ năng là hai điều khác nhau/u);
  assert.match(runner, /xpDelta/u);
  assert.match(progress, /Điểm, XP và mức thành thạo/u);
  assert.match(progress, /không phải là hình phạt/u);
});
