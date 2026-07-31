import assert from "node:assert/strict";
import test from "node:test";

import {
  curriculumMasteryLabelText,
  parseCurriculumAttemptApiState,
  parseCurriculumAttemptState,
  parseStartCurriculumRequest,
  parseSubmitCurriculumRequest,
} from "../lib/curriculum-runtime/contracts.ts";
import { parseUniversalCurriculumRuntimeFlag } from "../lib/curriculum-runtime/flag-policy.ts";

const attemptId = "11111111-1111-4111-8111-111111111111";
const requestId = "22222222-2222-4222-8222-222222222222";

function state(feedback: unknown = null) {
  return {
    attempt_id: attemptId,
    release_id: "plave-math-grades-1-9-v1",
    content_version: "2026.07.30-draft.1",
    unit_id: "grade-7-data-and-probability",
    unit_title: "Dữ liệu và xác suất",
    grade: 7,
    status: "IN_PROGRESS",
    revision: 2,
    answered_count: 1,
    correct_count: 1,
    total_questions: 12,
    started_at: "2026-07-30T00:00:00.000Z",
    completed_at: null,
    current_question: {
      question_id: "grade-7-data-and-probability-q02",
      position: 2,
      prompt: "Chọn kết quả đúng.",
      answer_type: "MULTIPLE_CHOICE",
      options: [
        { key: "A", label: "1" },
        { key: "B", label: "2" },
        { key: "C", label: "3" },
        { key: "D", label: "4" },
      ],
      visual: { type: "DATA_DISPLAY", description: "Biểu đồ dữ liệu.", labels: ["A"], values: [1] },
      cognitive_level: "APPLY",
    },
    feedback,
  };
}

test("server-only flag fails closed for unset, false, and malformed values", () => {
  assert.deepEqual(parseUniversalCurriculumRuntimeFlag(undefined), {
    enabled: false,
    reason: "UNSET",
  });
  assert.deepEqual(parseUniversalCurriculumRuntimeFlag("false"), {
    enabled: false,
    reason: "FALSE",
  });
  assert.deepEqual(parseUniversalCurriculumRuntimeFlag("TRUE"), {
    enabled: false,
    reason: "MALFORMED",
  });
  assert.deepEqual(parseUniversalCurriculumRuntimeFlag("true"), {
    enabled: true,
  });
});

test("browser request contracts accept only unit/start or answer/CAS/idempotency", () => {
  assert.deepEqual(
    parseStartCurriculumRequest({
      unitSlug: "grade-7-data-and-probability",
      idempotencyKey: requestId,
    }),
    {
      unitSlug: "grade-7-data-and-probability",
      idempotencyKey: requestId,
    },
  );
  assert.deepEqual(
    parseSubmitCurriculumRequest({
      attemptId,
      questionId: "grade-7-data-and-probability-q01",
      answer: "A",
      expectedRevision: 1,
      idempotencyKey: requestId,
    }),
    {
      attemptId,
      questionId: "grade-7-data-and-probability-q01",
      answer: "A",
      expectedRevision: 1,
      idempotencyKey: requestId,
    },
  );
  assert.equal(
    parseSubmitCurriculumRequest({
      attemptId,
      questionId: "grade-7-data-and-probability-q01",
      answer: "A",
      expectedRevision: 1,
      idempotencyKey: requestId,
      isCorrect: true,
    }),
    null,
  );
});

test("state returns current question without solution and feedback only after submit", () => {
  const before = parseCurriculumAttemptState(state());
  assert.ok(before);
  assert.equal(before.feedback, null);
  assert.equal("correctAnswer" in (before.currentQuestion ?? {}), false);
  assert.equal("solutionSteps" in (before.currentQuestion ?? {}), false);

  const after = parseCurriculumAttemptState(
    state({
      question_id: "grade-7-data-and-probability-q01",
      is_correct: false,
      correct_answer: "B",
      solution_steps: ["Đọc dữ liệu.", "Tính kết quả."],
      feedback: "Em hãy kiểm tra lại dữ liệu.",
    }),
  );
  assert.ok(after?.feedback);
  assert.equal(after.feedback.isCorrect, false);
  assert.equal(after.feedback.correctAnswer, "B");
});

test("browser parses the camelCase API state instead of reusing the raw RPC parser", () => {
  const serverState = parseCurriculumAttemptState(state());
  assert.ok(serverState);
  assert.equal(parseCurriculumAttemptState(serverState), null);
  assert.deepEqual(parseCurriculumAttemptApiState(serverState), serverState);
});

test("student labels are explanatory and never expose an unsupported numeric level", () => {
  assert.deepEqual(curriculumMasteryLabelText, {
    NOT_STARTED: "Chưa bắt đầu",
    IN_PROGRESS: "Đang học",
    NEEDS_PRACTICE: "Cần luyện thêm",
    DEVELOPING: "Đang phát triển",
    PROFICIENT: "Đã vững",
    MASTERED: "Thành thạo",
  });
});
