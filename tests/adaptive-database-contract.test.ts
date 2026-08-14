import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  adaptiveDatabaseErrorCodes,
  getAdaptiveRetryPolicy,
  parseAdaptiveDatabaseError,
  parseAdaptiveRpcState,
  parseStartAdaptivePracticeRequest,
  parseSubmitAdaptivePracticeRequest,
} from "../lib/practice/adaptive-database-contract.ts";

const attemptId = "11111111-1111-4111-8111-111111111111";
const idempotencyKey = "22222222-2222-4222-8222-222222222222";

function currentQuestion() {
  return {
    question_id: "g2-num1000-1nighc4-01",
    prompt: "Số gồm 2 trăm, 1 chục và 2 đơn vị là số nào?",
    answer_type: "MULTIPLE_CHOICE",
    options: {
      A: "214",
      B: "112",
      C: "232",
      D: "212",
    },
    visual: null,
    accessibility_description: null,
    skill_family_id: "NUMBER_RECOGNITION_TO_1000",
    difficulty: "EASY",
    display_order: 1,
  };
}

function rpcState(feedback: unknown = null) {
  return {
    attempt_id: attemptId,
    unit_slug: "grade-2-numbers-to-1000",
    content_version: "g2n1000-1.0.0-rc.1",
    status: "IN_PROGRESS",
    revision: 2,
    answered_count: 1,
    current_question: currentQuestion(),
    remediation_skill_ids: [],
    completed_at: null,
    feedback,
    ...(feedback === null
      ? {}
      : {
          xp: {
            answer_xp_awarded: 10,
            attempt_xp_earned: 10,
            total_xp_after: 10,
            policy_version: "PLAVE_SCORING_POLICY_V1",
            eligible: true,
            zero_xp_reason: null,
          },
        }),
  };
}

test("Sprint 6G-A 1. Start request accepts only the exact trusted shape", () => {
  assert.deepEqual(
    parseStartAdaptivePracticeRequest({
      unitSlug: "grade-2-numbers-to-1000",
      idempotencyKey,
    }),
    {
      unitSlug: "grade-2-numbers-to-1000",
      idempotencyKey,
    },
  );
  assert.equal(
    parseStartAdaptivePracticeRequest({
      unitSlug: "grade-2-numbers-to-1000",
      idempotencyKey,
      studentId: attemptId,
    }),
    null,
  );
});

test("Sprint 6G-A 2. Submit request rejects forged planner and scoring fields", () => {
  const valid = {
    attemptId,
    questionId: "g2-num1000-1nighc4-01",
    answer: " D ",
    expectedRevision: 2,
    idempotencyKey,
  };
  assert.deepEqual(parseSubmitAdaptivePracticeRequest(valid), valid);
  for (const forged of [
    { isCorrect: true },
    { correctAnswer: "D" },
    { nextQuestionId: "g2-num1000-1nighc4-24" },
    { mastery: true },
    { status: "MASTERED_EARLY" },
    { studentId: attemptId },
  ]) {
    assert.equal(
      parseSubmitAdaptivePracticeRequest({ ...valid, ...forged }),
      null,
    );
  }
});

test("Sprint 6G-A 3. Submit request validates revision, identifiers and answer", () => {
  const valid = {
    attemptId,
    questionId: "g2-num1000-1nighc4-01",
    answer: "1000",
    expectedRevision: 2,
    idempotencyKey,
  };
  assert.ok(parseSubmitAdaptivePracticeRequest(valid));
  assert.equal(
    parseSubmitAdaptivePracticeRequest({
      ...valid,
      expectedRevision: -1,
    }),
    null,
  );
  assert.equal(
    parseSubmitAdaptivePracticeRequest({ ...valid, answer: "" }),
    null,
  );
  assert.equal(
    parseSubmitAdaptivePracticeRequest({
      ...valid,
      answer: "1".repeat(21),
    }),
    null,
  );
  assert.equal(
    parseSubmitAdaptivePracticeRequest({
      ...valid,
      idempotencyKey: "not-a-uuid",
    }),
    null,
  );
});

test("Sprint 6G-A 4. Database error parser is allowlisted and fail-closed", () => {
  for (const code of adaptiveDatabaseErrorCodes) {
    assert.equal(
      parseAdaptiveDatabaseError({ message: `ADAPTIVE:${code}` }),
      code,
    );
  }
  for (const raw of [
    { message: "duplicate key violates unique constraint" },
    { message: "ADAPTIVE:UNKNOWN_INTERNAL_CODE" },
    { details: "private SQL detail" },
    null,
  ]) {
    assert.equal(
      parseAdaptiveDatabaseError(raw),
      "INTEGRITY_FAILURE",
    );
  }
});

test("Sprint 6G-A 5. Retry policy never silently retries a POST", () => {
  assert.deepEqual(
    getAdaptiveRetryPolicy("REVISION_CONFLICT", true),
    {
      action: "REFETCH_THEN_MANUAL_RETRY",
      automatic: false,
    },
  );
  assert.deepEqual(
    getAdaptiveRetryPolicy("TRANSIENT_DATABASE_ERROR", true),
    {
      action: "SAME_IDEMPOTENCY_KEY_RETRY",
      automatic: false,
    },
  );
  assert.deepEqual(
    getAdaptiveRetryPolicy("TRANSIENT_DATABASE_ERROR", false),
    { action: "DO_NOT_RETRY", automatic: false },
  );
  assert.deepEqual(
    getAdaptiveRetryPolicy("FORBIDDEN", true),
    { action: "DO_NOT_RETRY", automatic: false },
  );
});

test("Sprint 6G-A 6. Resume state cannot contain answer or solution data", () => {
  const parsed = parseAdaptiveRpcState(rpcState(), false);
  assert.ok(parsed);
  assert.equal(parsed.feedback, null);
  for (const leaked of [
    { correct_answer: "D" },
    { solution_steps: ["Bước 1", "Bước 2"] },
    { audit_source: "private" },
    { future_question_order: ["q2", "q3"] },
    { mastery_threshold: 0.75 },
    { student_id: attemptId },
  ]) {
    assert.equal(
      parseAdaptiveRpcState({ ...rpcState(), ...leaked }, false),
      null,
    );
  }
});

test("Sprint 6G-A 7. Post-submit response exposes only allowlisted feedback", () => {
  const feedback = {
    question_id: "g2-num1000-1nighc4-01",
    is_correct: true,
    correct_answer: "D",
    solution_steps: [
      "Đọc từng hàng trong bảng.",
      "Ghép các chữ số để được 212.",
    ],
    explanation: "Hai trăm, một chục và hai đơn vị là 212.",
    hint: "Đọc từ hàng trăm đến hàng đơn vị.",
  };
  const parsed = parseAdaptiveRpcState(rpcState(feedback), true);
  assert.ok(parsed?.feedback);
  assert.equal(parsed.feedback.correctAnswer, "D");
  assert.equal(
    parseAdaptiveRpcState(
      rpcState({ ...feedback, audit_source: "private" }),
      true,
    ),
    null,
  );
  assert.equal(parseAdaptiveRpcState(rpcState(feedback), false), null);
});

test("Sprint 6G-A 8. Migration state diagnostic is read-only", () => {
  const source = readFileSync(
    new URL(
      "../supabase/diagnostics/0036_migration_state_readonly.sql",
      import.meta.url,
    ),
    "utf8",
  ).replaceAll(/--.*$/gm, "");
  assert.doesNotMatch(
    source,
    /\b(?:insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|call)\b/i,
  );
  assert.match(source, /\bselect\b/i);
});
