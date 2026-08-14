import { strict as assert } from "node:assert";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  getAuthNavigationDecision,
  getHeaderLogoHref,
  getHeaderNavigation,
  getProfileMenuActions,
  isHeaderItemActive,
} from "../lib/auth/navigation.ts";
import { createAssignmentRequestGate } from "../lib/assignments/client-flow.ts";
import {
  parseAssignmentApiError,
  parseAssignmentLifecycleApiResponse,
  parseAssignmentLifecycleRequest,
  parseAssignmentReviewRpc,
  parseAssignmentRunnerStateApiResponse,
  parseAssignmentRunnerStateRpc,
  parseAssignmentStartApiResponse,
  parseAssignmentSubmitApiResponse,
  parseCreateTeacherQuestionInput,
  parseDraftAnswerInput,
  parsePublishAssignmentInput,
  parseStudentAssignmentListRpc,
  parseTeacherAssignmentRosterRpc,
  parseTeacherQuestionLibraryApiResponse,
  parseTeacherQuestionRpcResult,
  parseRestoredQuestionApiResponse,
} from "../lib/assignments/contracts.ts";
import { buildAssignmentGradebookCsv } from "../lib/assignments/csv.ts";
import {
  getAssignmentDeadlineText,
  getAssignmentDisplayState,
  parseVietnamDateTimeLocal,
  toVietnamDateTimeLocal,
} from "../lib/assignments/deadline.ts";
import { isSameOriginRequest } from "../lib/auth/same-origin.ts";
import { createClassroomRequestGate } from "../lib/classrooms/client-flow.ts";
import {
  classroomCodePattern,
  parseClassroomActionRequest,
  parseClassroomPreview,
  parseClassroomPreviewApiResponse,
  parseCreateClassroomRequest,
  parseCreatedClassroomResult,
  parseStudentClassroomState,
  parseTeacherClassroomDetail,
  parseTeacherClassroomState,
} from "../lib/classrooms/contracts.ts";
import {
  getQuestionsNeedingReview,
  parseTeacherAssignmentAnalysis,
  parseTeacherClassGradebook,
} from "../lib/gradebook/contracts.ts";
import { createGoalWriteGate } from "../lib/goals/client-flow.ts";
import { createOnboardingSubmissionGate } from "../lib/onboarding/client-flow.ts";
import { createConnectionRequestGate } from "../lib/connections/client-flow.ts";
import {
  isStudentConnectionNotFound,
  normalizeStudentCode,
  parseConnectionState,
  parseStudentConnectionPreview,
} from "../lib/connections/contracts.ts";
import {
  parseConnectionActionRequest,
  parseStudentCodeRequest,
} from "../lib/connections/validation.ts";
import { createGoalSuggestionGate } from "../lib/goal-suggestions/client-flow.ts";
import {
  parseGoalSuggestionRequest,
  parseParentGoalSuggestionContext,
  parseStudentGoalSuggestionState,
} from "../lib/goal-suggestions/contracts.ts";
import {
  isValidRegistrationGrade,
  missingRegistrationGradeMessage,
  parseOnboardingSubmission,
} from "../lib/onboarding/validation.ts";
import {
  createDiagnosticSingleFlightGate,
  parseDiagnosticStartApiResponse,
  parseDiagnosticStateApiResponse,
  parseDiagnosticSubmitApiResponse,
} from "../lib/diagnostic/client-flow.ts";
import {
  DIAGNOSTIC_QUESTION_COUNT,
  diagnosticDomainLabels,
  parseDiagnosticAttemptSummary,
  parseDiagnosticReviewRpcResult,
  parseDiagnosticStartRpcResult,
  parseDiagnosticStateRpcResult,
  parseDiagnosticSubmitRpcResult,
  parseParentDiagnosticSummary,
  type DiagnosticAttemptSummary,
  type DiagnosticDomainResult,
} from "../lib/diagnostic/contracts.ts";
import {
  buildPersonalizedLearningPath,
  getPersonalizedUnitStateLabel,
} from "../lib/personalized-path/contracts.ts";
import {
  GRADE_ONE_RELEASE_UNIT_COUNT,
  buildGradeOneCompletionSummary,
  parseParentGradeOneCompletionSummary,
} from "../lib/grade-one-completion/contracts.ts";
import { buildParentPersonalizedPathSummary } from "../lib/personalized-path/parent.ts";
import {
  ADDITION_UNIT_SLUG,
  ADDITION_TO_20_UNIT_SLUG,
  ADDITION_TO_100_UNIT_SLUG,
  BASIC_GEOMETRY_UNIT_SLUG,
  BASE_UNIT_SLUG,
  CUBE_AND_CUBOID_UNIT_SLUG,
  LENGTH_MEASUREMENT_UNIT_SLUG,
  NUMBERS_TO_20_UNIT_SLUG,
  NUMBERS_TO_100_UNIT_SLUG,
  SUBTRACTION_UNIT_SLUG,
  SUBTRACTION_TO_20_UNIT_SLUG,
  SUBTRACTION_TO_100_UNIT_SLUG,
  TIME_CLOCK_CALENDAR_UNIT_SLUG,
  getLessonPath,
  getSkillLabel,
  getSuggestedUnit,
  getUnitPresentation,
  getUnitSkillCodes,
  isUnitPracticeUnlocked,
  skillLabels,
} from "../lib/practice/catalog.ts";
import { getGradeContentEmptyTitle } from "../lib/practice/grade-content.ts";
import {
  PRACTICE_NUMBER_INPUT_MAX_DIGITS,
  parseAttemptRows,
  parseLearningUnit,
  parsePracticeApiError,
  parsePracticeAnswerStateApiResponse,
  parsePracticeQuestion,
  parsePracticeReviewRpcResult,
  parseStartPracticeApiResponse,
  parseStartPracticeRpcResult,
  parseSubmitPracticeApiResponse,
  parseSubmitPracticeRpcResult,
  type LearningUnit,
  type PracticeAttempt,
} from "../lib/practice/contracts.ts";
import { parsePracticeVisualSpec } from "../lib/practice/visual.ts";
import {
  canSubmitPracticeAnswer,
  createSingleFlightGate,
  getAnswerReconciliationFailure,
  getStartPracticeDestination,
  getSubmitPracticeResult,
  mergeGradedAnswer,
  normalizePracticeNumberInput,
  readResponseJsonOnce,
  reconcileStartedPractice,
  reconcileSubmittedAnswer,
} from "../lib/practice/client-flow.ts";
import {
  buildPracticeHistory,
  getAttemptNumber,
  getLessonPracticeState,
  hasUniqueQuestionOrder,
  shouldResumeExistingAttempt,
} from "../lib/practice/history.ts";
import {
  buildPracticeReviewViewModel,
  classifyReviewLoad,
  getPracticeReviewPath,
  resolveReviewAttemptId,
} from "../lib/practice/review.ts";
import {
  PARENT_SKILL_CODES,
  getParentSkillLabel,
  parseParentChildLearningDashboard,
} from "../lib/parent-dashboard/contracts.ts";
import {
  buildParentWeeklySummaryText,
  formatParentWeeklyPeriod,
  getParentWeeklySkillInsights,
  parseParentWeeklySummary,
} from "../lib/parent-dashboard/weekly.ts";
import { createProfileSubmissionGate } from "../lib/profile/client-flow.ts";
import {
  maskAccountEmail,
  validateStudentProfileInput,
} from "../lib/profile/validation.ts";
import { createTeacherActivationGate } from "../lib/teacher/client-flow.ts";
import {
  isTeacherInvitationCode,
  parseTeacherActivationApiResponse,
  parseTeacherActivationRequest,
  parseTeacherActivationRpcResult,
  parseTeacherProfileRpcResult,
} from "../lib/teacher/contracts.ts";

const attemptId = "11111111-1111-4111-8111-111111111111";
const questionId = "g1-n10-q01";
const questionOrder = Array.from(
  { length: 24 },
  (_, index) => `g1-n10-q${String(index + 1).padStart(2, "0")}`,
);

const startRpcPayload = {
  attempt_id: attemptId,
  unit_slug: "grade-1-numbers-to-10",
  status: "IN_PROGRESS",
  question_order: questionOrder,
  total_questions: 24,
  answered_count: 0,
  correct_count: 0,
  started_at: "2026-07-28T00:00:00.000Z",
};

const canonicalStartResult = {
  id: attemptId,
  unitSlug: "grade-1-numbers-to-10",
  status: "IN_PROGRESS",
  questionOrder,
  totalQuestions: 24,
  answeredCount: 0,
  correctCount: 0,
  startedAt: "2026-07-28T00:00:00.000Z",
};

const correctAnswerRpcPayload = {
  is_correct: true,
  correct_answer: "C",
  solution_steps: ["Bước 1: Đếm từng hình.", "Bước 2: Chọn đáp án C."],
  explanation: "Có đúng ba hình.",
  hint: "Em hãy đếm chậm từng hình.",
  answered_count: 1,
  correct_count: 1,
  completed: false,
  xp: {
    answer_xp_awarded: 10,
    attempt_xp_earned: 10,
    total_xp_after: 10,
    policy_version: "PLAVE_SCORING_POLICY_V1",
    eligible: true,
    zero_xp_reason: null,
  },
};

const canonicalCorrectAnswer = {
  isCorrect: true,
  correctAnswer: "C",
  solutionSteps: ["Bước 1: Đếm từng hình.", "Bước 2: Chọn đáp án C."],
  explanation: "Có đúng ba hình.",
  hint: "Em hãy đếm chậm từng hình.",
  answeredCount: 1,
  correctCount: 1,
  completed: false,
  xp: {
    answerXpAwarded: 10,
    attemptXpEarned: 10,
    totalXpAfter: 10,
    policyVersion: "PLAVE_SCORING_POLICY_V1" as const,
    eligible: true,
    zeroXpReason: null,
  },
};

const canonicalIncorrectAnswer = {
  ...canonicalCorrectAnswer,
  isCorrect: false,
  correctCount: 0,
  xp: {
    answerXpAwarded: 0,
    attemptXpEarned: 0,
    totalXpAfter: 0,
    policyVersion: "PLAVE_SCORING_POLICY_V1" as const,
    eligible: true,
    zeroXpReason: "INCORRECT_ANSWER" as const,
  },
};

const canonicalReviewAnswer = {
  questionId,
  questionType: "MULTIPLE_CHOICE",
  prompt: "Có ba hình. Em chọn đáp án nào?",
  options: { A: "1", B: "2", C: "3", D: "4" },
  skillCode: "COUNT_RECOGNIZE",
  studentAnswer: "C",
  isCorrect: true,
  correctAnswer: "C",
  solutionSteps: canonicalCorrectAnswer.solutionSteps,
  explanation: canonicalCorrectAnswer.explanation,
  hint: canonicalCorrectAnswer.hint,
  answeredAt: "2026-07-28T00:01:00.000Z",
};

const reviewSkills = [
  "COUNT_RECOGNIZE",
  "READ_WRITE_MATCH",
  "SEQUENCE_COMPARE_ORDER",
  "COMPOSE_DECOMPOSE",
];
const completedReviewRpcPayload = {
  attempt_id: attemptId,
  unit_slug: "grade-1-numbers-to-10",
  status: "COMPLETED",
  total_questions: 24,
  answered_count: 24,
  correct_count: 18,
  started_at: "2026-07-28T00:00:00.000Z",
  completed_at: "2026-07-28T00:30:00.000Z",
  answers: Array.from({ length: 24 }, (_, index) => {
    const isCorrect = index < 18;
    return {
      question_id: `g1-n10-q${String(index + 1).padStart(2, "0")}`,
      question_type: "MULTIPLE_CHOICE",
      prompt: `Câu hỏi kiểm thử số ${index + 1}`,
      options: { A: "Đúng", B: "Sai", C: "Ba", D: "Bốn" },
      skill_code: reviewSkills[Math.floor(index / 6)],
      student_answer: isCorrect ? "A" : "B",
      is_correct: isCorrect,
      correct_answer: "A",
      solution_steps: [
        `Bước 1: Xét câu ${index + 1}.`,
        "Bước 2: Chọn đáp án A.",
      ],
      explanation: "Đáp án A phù hợp với yêu cầu.",
      hint: "Em hãy đọc kỹ câu hỏi.",
      answered_at: "2026-07-28T00:01:00.000Z",
    };
  }),
};

test("1. Start RPC accepts the direct JSONB object and rejects an array wrapper", () => {
  assert.deepEqual(
    parseStartPracticeRpcResult(startRpcPayload),
    canonicalStartResult,
  );
  assert.equal(parseStartPracticeRpcResult([startRpcPayload]), null);
});

test("2. Canonical start API response resolves the immediate practice destination", () => {
  const payload = { ok: true, data: canonicalStartResult };
  assert.equal(
    getStartPracticeDestination(payload),
    `/practice/${attemptId}`,
  );
});

test("3. A successful start mutation remains success after serialization", () => {
  const serialized = JSON.stringify({ ok: true, data: canonicalStartResult });
  const payload = JSON.parse(serialized);
  assert.ok(parseStartPracticeApiResponse(payload));
  assert.equal(parsePracticeApiError(payload), null);
});

test("4. Answer RPC accepts the direct JSONB object and canonicalizes snake_case", () => {
  assert.deepEqual(
    parseSubmitPracticeRpcResult(correctAnswerRpcPayload),
    canonicalCorrectAnswer,
  );
});

test("5. A correct answer is available for immediate UI state update", () => {
  const payload = { ok: true, data: canonicalCorrectAnswer };
  const result = getSubmitPracticeResult(payload);
  assert.ok(result);
  const merged = mergeGradedAnswer({}, questionId, "C", result);
  assert.equal(merged.results[questionId]?.isCorrect, true);
  assert.equal(merged.results[questionId]?.studentAnswer, "C");
});

test("6. An incorrect answer is available for immediate UI state update", () => {
  const payload = { ok: true, data: canonicalIncorrectAnswer };
  const result = parseSubmitPracticeApiResponse(payload)?.data;
  assert.ok(result);
  const merged = mergeGradedAnswer({}, questionId, "A", result);
  assert.equal(merged.results[questionId]?.isCorrect, false);
  assert.equal(merged.results[questionId]?.correctAnswer, "C");
  assert.equal(merged.results[questionId]?.hint, canonicalIncorrectAnswer.hint);
});

test("7. Progress and correct count advance directly from the answer response", () => {
  const merged = mergeGradedAnswer(
    {},
    questionId,
    "C",
    canonicalCorrectAnswer,
  );
  assert.equal(merged.answeredCount, 1);
  assert.equal(merged.correctCount, 1);
});

test("8. Solution steps remain a JSON array of strings", () => {
  const parsed = parseSubmitPracticeRpcResult(correctAnswerRpcPayload);
  assert.deepEqual(parsed?.solutionSteps, [
    "Bước 1: Đếm từng hình.",
    "Bước 2: Chọn đáp án C.",
  ]);
});

test("9. Valid nullable review fields do not fail the RPC parser", () => {
  const review = parsePracticeReviewRpcResult({
    attempt_id: attemptId,
    unit_slug: "grade-1-numbers-to-10",
    status: "IN_PROGRESS",
    total_questions: 24,
    answered_count: 1,
    correct_count: 1,
    started_at: "2026-07-28T00:00:00.000Z",
    completed_at: null,
    answers: [
      {
        question_id: "g1-n10-q05",
        question_type: "NUMBER_INPUT",
        prompt: "Có bao nhiêu hình?",
        options: null,
        skill_code: "COUNT_RECOGNIZE",
        student_answer: "6",
        is_correct: true,
        correct_answer: "6",
        solution_steps: ["Bước 1: Đếm.", "Bước 2: Nhập 6."],
        explanation: "Có tất cả sáu hình.",
        hint: "Em hãy đếm từng hình.",
        answered_at: "2026-07-28T00:01:00.000Z",
      },
    ],
  });
  assert.equal(review?.completedAt, null);
  assert.equal(review?.answers[0]?.options, null);
});

test("10. A response body is parsed exactly once", async () => {
  let jsonCalls = 0;
  const result = await readResponseJsonOnce({
    async json() {
      jsonCalls += 1;
      return { ok: true, data: canonicalStartResult };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(jsonCalls, 1);
});

test("11. A double click starts only one request", async () => {
  const gate = createSingleFlightGate();
  let requestCount = 0;
  let releaseRequest = () => {};
  const pendingRequest = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  const task = async () => {
    requestCount += 1;
    await pendingRequest;
  };

  const first = gate.run(task);
  const second = await gate.run(task);
  assert.deepEqual(second, { started: false });
  assert.equal(requestCount, 1);
  releaseRequest();
  await first;
});

test("12. Enter and click sharing one gate start only one request", async () => {
  const gate = createSingleFlightGate();
  let requestCount = 0;
  let releaseRequest = () => {};
  const pendingRequest = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  const submitFromEvent = async () =>
    gate.run(async () => {
      requestCount += 1;
      await pendingRequest;
    });

  const enter = submitFromEvent();
  const click = await submitFromEvent();
  assert.deepEqual(click, { started: false });
  assert.equal(requestCount, 1);
  releaseRequest();
  await enter;
});

test("13. A committed answer with interrupted POST is restored by read-only GET", async () => {
  let method = "";
  const reconciliation = await reconcileSubmittedAnswer(
    async (_input, init) => {
      method = init.method ?? "";
      return {
        async json() {
          return {
            ok: true,
            data: {
              answer: canonicalReviewAnswer,
              answeredCount: 1,
              correctCount: 1,
              completed: false,
            },
          };
        },
      };
    },
    attemptId,
    questionId,
  );

  assert.equal(method, "GET");
  assert.equal(reconciliation.kind, "RECOVERED");
  if (reconciliation.kind === "RECOVERED") {
    assert.equal(reconciliation.result.isCorrect, true);
    assert.equal(reconciliation.result.answeredCount, 1);
  }
});

test("14. An already graded question cannot be submitted again", () => {
  const existing = {
    ...canonicalCorrectAnswer,
    studentAnswer: "C",
  };
  assert.equal(canSubmitPracticeAnswer(existing, false, true), false);
  assert.equal(canSubmitPracticeAnswer(undefined, true, true), false);
});

test("15. Retry is offered only when reconciliation proves the answer was not saved", async () => {
  const reconciliation = await reconcileSubmittedAnswer(
    async () => ({
      async json() {
        return {
          ok: true,
          data: {
            answer: null,
            answeredCount: 0,
            correctCount: 0,
            completed: false,
          },
        };
      },
    }),
    attemptId,
    questionId,
  );
  assert.equal(reconciliation.kind, "NOT_SAVED");
  if (reconciliation.kind === "NOT_SAVED") {
    const failure = getAnswerReconciliationFailure(reconciliation);
    assert.equal(failure.retryAllowed, true);
    assert.match(failure.message, /chưa được lưu/i);
  }
});

test("16. Generic unknown-state error appears only when reconciliation also fails", async () => {
  const reconciliation = await reconcileSubmittedAnswer(
    async () => {
      throw new Error("simulated transport interruption");
    },
    attemptId,
    questionId,
  );
  assert.equal(reconciliation.kind, "FAILED");
  if (reconciliation.kind === "FAILED") {
    const failure = getAnswerReconciliationFailure(reconciliation);
    assert.equal(failure.retryAllowed, false);
    assert.match(failure.message, /chưa thể xác nhận/i);
  }
});

test("17. Interrupted start response is reconciled without a second POST", async () => {
  let method = "";
  const reconciliation = await reconcileStartedPractice(
    async (_input, init) => {
      method = init.method ?? "";
      return {
        async json() {
          return {
            ok: true,
            data: { attempt: canonicalStartResult },
          };
        },
      };
    },
    "grade-1-numbers-to-10",
  );
  assert.equal(method, "GET");
  assert.equal(reconciliation.kind, "RECOVERED");
});

test("18. Canonical answer-state contract rejects malformed wrappers", () => {
  assert.equal(
    parsePracticeAnswerStateApiResponse({
      data: {
        answer: canonicalReviewAnswer,
        answeredCount: 1,
        correctCount: 1,
        completed: false,
      },
    }),
    null,
  );
});

test("Review 1. Clean-checkout filesystem recognizes the dynamic review route before build", () => {
  const routeFile = join(
    process.cwd(),
    "app/review/[attemptId]/page.tsx",
  );
  assert.equal(existsSync(routeFile), true);
  assert.match(readFileSync(routeFile, "utf8"), /resolveReviewAttemptId/u);
});

test("Review 2. Next.js 16 promise params resolve the attempt segment", async () => {
  assert.equal(
    await resolveReviewAttemptId(Promise.resolve({ attemptId })),
    attemptId,
  );
});

test("Review 3. Completed review RPC snake_case parses as one JSONB object", () => {
  const review = parsePracticeReviewRpcResult(completedReviewRpcPayload);
  assert.ok(review);
  assert.equal(
    parsePracticeReviewRpcResult([completedReviewRpcPayload]),
    null,
  );
});

test("Review 4. Canonical review data produces a renderable view model", () => {
  const review = parsePracticeReviewRpcResult(completedReviewRpcPayload);
  assert.ok(review);
  const viewModel = buildPracticeReviewViewModel(review);
  assert.equal(viewModel.percent, 75);
});

test("Review 5. COMPLETED attempts are explicitly accepted", () => {
  const review = parsePracticeReviewRpcResult(completedReviewRpcPayload);
  assert.equal(review?.status, "COMPLETED");
  assert.equal(classifyReviewLoad(review, null), "RENDER");
});

test("Review 6. A completed attempt renders all 24 saved answers", () => {
  const review = parsePracticeReviewRpcResult(completedReviewRpcPayload);
  assert.equal(review?.answers.length, 24);
  assert.equal(review?.answeredCount, 24);
});

test("Review 7. Stored score renders the correct total and percentage", () => {
  const review = parsePracticeReviewRpcResult(completedReviewRpcPayload);
  assert.ok(review);
  const viewModel = buildPracticeReviewViewModel(review);
  assert.equal(review.correctCount, 18);
  assert.equal(viewModel.percent, 75);
});

test("Review 8. All four skill groups render with six answers each", () => {
  const review = parsePracticeReviewRpcResult(completedReviewRpcPayload);
  assert.ok(review);
  const viewModel = buildPracticeReviewViewModel(review);
  assert.equal(viewModel.skillResults.length, 4);
  assert.deepEqual(
    viewModel.skillResults.map((result) => result.total),
    [6, 6, 6, 6],
  );
});

test("Review 9. Detailed solution steps remain available for rendering", () => {
  const review = parsePracticeReviewRpcResult(completedReviewRpcPayload);
  assert.deepEqual(review?.answers[0]?.solutionSteps, [
    "Bước 1: Xét câu 1.",
    "Bước 2: Chọn đáp án A.",
  ]);
});

test("Review 10. Nullable fields accepted earlier do not become a 404", () => {
  const review = parsePracticeReviewRpcResult({
    ...completedReviewRpcPayload,
    status: "IN_PROGRESS",
    answered_count: 0,
    correct_count: 0,
    completed_at: null,
    answers: [],
  });
  assert.ok(review);
  assert.equal(review.completedAt, null);
  assert.equal(classifyReviewLoad(review, null), "RENDER");
});

test("Review 11. Parser failure maps to a safe error state instead of 404", () => {
  assert.equal(classifyReviewLoad(null, null), "SAFE_ERROR");
});

test("Review 12. A genuinely unavailable attempt maps to not found", () => {
  assert.equal(
    classifyReviewLoad(null, "PRACTICE_UNAVAILABLE"),
    "NOT_FOUND",
  );
});

test("Review 13. An attempt hidden by ownership checks does not expose data", () => {
  const disposition = classifyReviewLoad(null, "PRACTICE_UNAVAILABLE");
  assert.equal(disposition, "NOT_FOUND");
});

test("Review 14. Completion navigation generates the exact review path", () => {
  assert.equal(getPracticeReviewPath(attemptId), `/review/${attemptId}`);
});

test("Review 15. Runner and Dashboard share the reviewed path builder", () => {
  const runnerSource = readFileSync(
    join(
      process.cwd(),
      "app/practice/[attemptId]/PracticeRunner.tsx",
    ),
    "utf8",
  );
  const dashboardSource = [
    "app/dashboard/page.tsx",
    "components/PracticeHistory.tsx",
  ]
    .map((file) => readFileSync(join(process.cwd(), file), "utf8"))
    .join("\n");
  assert.match(runnerSource, /getPracticeReviewPath\(attemptId\)/);
  assert.match(
    dashboardSource,
    /getPracticeReviewPath\(attempt\.id\)/,
  );
});

const completedAttemptId = "22222222-2222-4222-8222-222222222222";
const activeAttemptId = "33333333-3333-4333-8333-333333333333";
const completedAttemptRow = {
  id: completedAttemptId,
  unit_slug: "grade-1-numbers-to-10",
  status: "COMPLETED",
  question_order: questionOrder,
  total_questions: 24,
  answered_count: 24,
  correct_count: 18,
  started_at: "2026-07-27T01:00:00.000Z",
  completed_at: "2026-07-27T01:30:00.000Z",
};
const activeAttemptRow = {
  id: activeAttemptId,
  unit_slug: "grade-1-numbers-to-10",
  status: "IN_PROGRESS",
  question_order: [...questionOrder].reverse(),
  total_questions: 24,
  answered_count: 1,
  correct_count: 1,
  started_at: "2026-07-28T01:00:00.000Z",
  completed_at: null,
};

test("Sprint 2C A1. Guest navbar contains public auth actions", () => {
  assert.deepEqual(
    getHeaderNavigation(false).map((item) => item.label),
    ["Trang chủ", "Học thử", "Giới thiệu", "Đăng nhập", "Đăng ký"],
  );
});

test("Sprint 2C A2. Authenticated navbar contains learning and logout context", () => {
  assert.deepEqual(
    getHeaderNavigation(true, "STUDENT").map((item) => item.label),
    ["Tổng quan", "Bài học", "AI Tutor", "Tiến bộ", "Lịch sử", "Mục tiêu"],
  );
  const headerSource = readFileSync(
    join(process.cwd(), "components/HeaderNavigation.tsx"),
    "utf8",
  );
  const logoutFormSource = readFileSync(
    join(process.cwd(), "components/LogoutForm.tsx"),
    "utf8",
  );
  assert.match(headerSource, /<LogoutForm/);
  assert.match(logoutFormSource, /Đăng xuất/);
});

test("Sprint 2C A3. Authenticated users never receive Login/Register links", () => {
  const hrefs = getHeaderNavigation(true, "STUDENT").map(
    (item) => item.href,
  );
  assert.equal(hrefs.includes("/"), false);
  assert.equal(hrefs.includes("/demo"), false);
  assert.equal(hrefs.includes("/login"), false);
  assert.equal(hrefs.includes("/register"), false);
  assert.equal(getHeaderLogoHref(true), "/dashboard");
  assert.equal(getHeaderLogoHref(false), "/");
});

test("Sprint 2C A4. Authenticated navigation through public pages remains allowed", () => {
  for (const pathname of ["/dashboard", "/", "/demo", "/dashboard"]) {
    assert.equal(
      getAuthNavigationDecision(pathname, true),
      "ALLOW",
    );
  }
});

test("Sprint 2C A5. Demo remains public and does not trigger logout code", () => {
  assert.equal(getAuthNavigationDecision("/demo", false), "ALLOW");
  assert.equal(getAuthNavigationDecision("/demo", true), "ALLOW");
  const demoSource = readFileSync(
    join(process.cwd(), "app/demo/page.tsx"),
    "utf8",
  );
  assert.doesNotMatch(demoSource, /signOut/);
});

test("Sprint 2C A6. Authenticated users can return to Dashboard", () => {
  assert.equal(
    getAuthNavigationDecision("/dashboard", true),
    "ALLOW",
  );
});

test("Sprint 2C A7. Login redirects an authenticated user to Dashboard", () => {
  assert.equal(
    getAuthNavigationDecision("/login", true),
    "DASHBOARD",
  );
});

test("Sprint 2C A8. Register redirects an authenticated user to Dashboard", () => {
  assert.equal(
    getAuthNavigationDecision("/register", true),
    "DASHBOARD",
  );
});

test("Sprint 2C A9. Navbar navigation uses Link and the canonical logout form", () => {
  const headerSource = readFileSync(
    join(process.cwd(), "components/HeaderNavigation.tsx"),
    "utf8",
  );
  assert.match(headerSource, /import Link from "next\/link"/);
  assert.match(headerSource, /import \{ LogoutForm \}/);
  assert.match(headerSource, /<LogoutForm/);
  assert.doesNotMatch(headerSource, /onClick=.*signOut/);
});

test("Sprint 2C A10. Guest access to protected learning routes redirects to login", () => {
  for (const pathname of [
    "/dashboard",
    "/learn",
    "/learn/grade-1/numbers-to-10",
    "/lessons",
    "/goals",
    "/profile",
    "/results",
    `/practice/${attemptId}`,
    `/review/${attemptId}`,
  ]) {
    assert.equal(
      getAuthNavigationDecision(pathname, false),
      "LOGIN",
    );
  }
});

test("Sprint 2C B1. Completed attempts remain unchanged in history", () => {
  const attempts = parseAttemptRows([completedAttemptRow]);
  assert.ok(attempts);
  const history = buildPracticeHistory(attempts);
  assert.equal(history.length, 1);
  assert.equal(history[0]?.status, "COMPLETED");
  assert.equal(history[0]?.correctCount, 18);
});

test("Sprint 2C B2. With no in-progress attempt, lesson offers a new attempt", () => {
  const attempts = parseAttemptRows([completedAttemptRow]);
  assert.ok(attempts);
  const state = getLessonPracticeState(buildPracticeHistory(attempts));
  assert.equal(state.kind, "RETAKE");
  assert.equal(state.primaryLabel, "Làm lượt mới");
  assert.equal(shouldResumeExistingAttempt(buildPracticeHistory(attempts)), false);
});

test("Sprint 2C B3. An in-progress attempt is resumed instead of replaced", () => {
  const attempts = parseAttemptRows([completedAttemptRow, activeAttemptRow]);
  assert.ok(attempts);
  const history = buildPracticeHistory(attempts);
  const state = getLessonPracticeState(history);
  assert.equal(state.kind, "CONTINUE");
  assert.equal(state.activeAttempt?.id, activeAttemptId);
  assert.equal(shouldResumeExistingAttempt(history), true);
});

test("Sprint 2C B4. Concurrent start clicks share the existing single-flight gate", async () => {
  const gate = createSingleFlightGate();
  let starts = 0;
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const start = () =>
    gate.run(async () => {
      starts += 1;
      await pending;
    });
  const first = start();
  const second = await start();
  assert.deepEqual(second, { started: false });
  assert.equal(starts, 1);
  release();
  await first;
});

test("Sprint 2C B5. First and second attempts retain different stable IDs", () => {
  const attempts = parseAttemptRows([completedAttemptRow, activeAttemptRow]);
  assert.ok(attempts);
  const history = buildPracticeHistory(attempts);
  assert.notEqual(history[0]?.id, history[1]?.id);
});

test("Sprint 2C B6. Attempt numbers are chronological and history displays newest first", () => {
  const attempts = parseAttemptRows([activeAttemptRow, completedAttemptRow]);
  assert.ok(attempts);
  const history = buildPracticeHistory(attempts);
  assert.equal(history[0]?.attemptNumber, 2);
  assert.equal(history[1]?.attemptNumber, 1);
  assert.equal(getAttemptNumber(history, completedAttemptId), 1);
});

test("Sprint 2C B7. Review for attempt one remains addressable after attempt two exists", () => {
  const attempts = parseAttemptRows([completedAttemptRow, activeAttemptRow]);
  assert.ok(attempts);
  const history = buildPracticeHistory(attempts);
  const first = history.find((item) => item.attemptNumber === 1);
  assert.ok(first);
  assert.equal(
    getPracticeReviewPath(first.id),
    `/review/${completedAttemptId}`,
  );
});

test("Sprint 2C B8. Every attempt fixture has 24 unique question IDs", () => {
  const attempts = parseAttemptRows([completedAttemptRow, activeAttemptRow]);
  assert.ok(attempts);
  assert.equal(attempts.every(hasUniqueQuestionOrder), true);
});

test("Sprint 2C B9. A retake fixture uses a reshuffled order", () => {
  assert.notDeepEqual(
    completedAttemptRow.question_order,
    activeAttemptRow.question_order,
  );
});

test("Sprint 2C B10. Dashboard model distinguishes completed and in-progress attempts", () => {
  const attempts = parseAttemptRows([completedAttemptRow, activeAttemptRow]);
  assert.ok(attempts);
  const history = buildPracticeHistory(attempts);
  assert.equal(history.filter((item) => item.status === "COMPLETED").length, 1);
  assert.equal(history.filter((item) => item.status === "IN_PROGRESS").length, 1);
});

test("Sprint 2C B11. Lesson exposes start, continue, and retake states", () => {
  assert.equal(getLessonPracticeState([]).kind, "START");
  const completed = parseAttemptRows([completedAttemptRow]);
  const active = parseAttemptRows([completedAttemptRow, activeAttemptRow]);
  assert.ok(completed);
  assert.ok(active);
  assert.equal(
    getLessonPracticeState(buildPracticeHistory(completed)).kind,
    "RETAKE",
  );
  assert.equal(
    getLessonPracticeState(buildPracticeHistory(active)).kind,
    "CONTINUE",
  );
});

test("Sprint 2C B12. Guest users cannot open attempt history on Dashboard", () => {
  assert.equal(
    getAuthNavigationDecision("/dashboard", false),
    "LOGIN",
  );
});

test("Sprint 2C B13. Database source keeps attempt ownership and one-active-attempt guards", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0004_grade1_numbers_to_10.sql",
    ),
    "utf8",
  );
  assert.match(
    migration,
    /practice_attempts_one_in_progress_idx[\s\S]*where status = 'IN_PROGRESS'/,
  );
  assert.match(
    migration,
    /pa\.student_id = v_current_user_id[\s\S]*pa\.status = 'IN_PROGRESS'/,
  );
  assert.match(
    migration,
    /practice_attempts_select_own[\s\S]*student_id = \(select auth\.uid\(\)\)/,
  );
});

test("Sprint 5A. Start endpoint accepts one validated unit slug", () => {
  const routeSource = readFileSync(
    join(process.cwd(), "app/api/practice/start/route.ts"),
    "utf8",
  );
  const buttonSource = readFileSync(
    join(process.cwd(), "components/StartPracticeButton.tsx"),
    "utf8",
  );
  assert.match(routeSource, /parseStartPracticeInput\(rawInput\)/);
  assert.match(routeSource, /p_unit_slug: input\.unitSlug/);
  assert.match(routeSource, /await request\.json\(\)/);
  assert.match(buttonSource, /JSON\.stringify\(\{ unitSlug \}\)/);
});

test("Sprint 2C B14a. Same-origin validation uses the browser-facing host", () => {
  const request = new Request("http://0.0.0.0:3000/api/practice/start", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      origin: "http://localhost:3000",
    },
  });
  assert.equal(isSameOriginRequest(request), true);
});

test("Sprint 2C B14b. Same-origin validation still rejects a foreign origin", () => {
  const request = new Request("http://0.0.0.0:3000/api/practice/start", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      origin: "https://example.invalid",
    },
  });
  assert.equal(isSameOriginRequest(request), false);
});

test("Sprint 2C B15. The database shuffle is server-side and returns all 24 IDs", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0004_grade1_numbers_to_10.sql",
    ),
    "utf8",
  );
  assert.match(migration, /array_agg\(q\.code order by random\(\)\)/);
  assert.match(
    migration,
    /coalesce\(cardinality\(v_question_order\), 0\) <> 24/,
  );
});

test("Sprint 2C B16. History renders safe owner-scoped links without solution queries", () => {
  const historySource = readFileSync(
    join(process.cwd(), "components/PracticeHistory.tsx"),
    "utf8",
  );
  assert.match(historySource, /Bài làm lần/);
  assert.match(historySource, /getPracticeReviewPath/);
  assert.doesNotMatch(historySource, /question_solutions/);
});

test("Sprint 2E 1. Header uses the supplied optimized brand asset through next/image", () => {
  assert.equal(
    existsSync(
      join(process.cwd(), "public/brand/plave-logo-source.png"),
    ),
    true,
  );
  assert.equal(
    existsSync(
      join(process.cwd(), "public/brand/plave-logo-header.png"),
    ),
    true,
  );
  const headerSource = readFileSync(
    join(process.cwd(), "components/PublicHeader.tsx"),
    "utf8",
  );
  assert.match(headerSource, /import Image from "next\/image"/);
  assert.match(headerSource, /plave-logo-header\.png/);
  assert.match(headerSource, /alt="PLAVE"/);
  assert.match(headerSource, /aria-label=/);
});

test("Sprint 2E 2. Active navigation covers all student areas and learning flows", () => {
  const items = getHeaderNavigation(true, "STUDENT");
  const overview = items.find((item) => item.href === "/dashboard");
  const lessons = items.find((item) => item.href === "/lessons");
  const progress = items.find((item) => item.href === "/learning-progress");
  const results = items.find((item) => item.href === "/results");
  const goals = items.find((item) => item.href === "/goals");
  assert.ok(overview);
  assert.ok(lessons);
  assert.ok(progress);
  assert.ok(results);
  assert.ok(goals);
  assert.equal(isHeaderItemActive("/dashboard", overview), true);
  assert.equal(
    isHeaderItemActive("/learn/grade-1/numbers-to-10", lessons),
    true,
  );
  assert.equal(isHeaderItemActive("/practice/example", lessons), true);
  assert.equal(isHeaderItemActive("/learning-progress", progress), true);
  assert.equal(isHeaderItemActive("/review/example", results), true);
  assert.equal(isHeaderItemActive("/goals", goals), true);
});

test("Sprint 2E 3. Mobile menu exposes expanded state, route close, and Escape handling", () => {
  const source = readFileSync(
    join(process.cwd(), "components/HeaderNavigation.tsx"),
    "utf8",
  );
  assert.match(source, /aria-expanded=\{menuOpen\}/);
  assert.match(source, /aria-controls="site-navigation-panel"/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /onClick=\{\(\) => setMenuOpen\(false\)\}/);
});

test("Sprint 2E 4. Theory, lessons, and results are real protected data routes", () => {
  const learnSource = readFileSync(
    join(process.cwd(), "app/learn/page.tsx"),
    "utf8",
  );
  const lessonsSource = readFileSync(
    join(process.cwd(), "app/lessons/page.tsx"),
    "utf8",
  );
  const resultsSource = readFileSync(
    join(process.cwd(), "app/results/page.tsx"),
    "utf8",
  );
  const personalizedServerSource = readFileSync(
    join(process.cwd(), "lib/personalized-path/server.ts"),
    "utf8",
  );
  assert.match(learnSource, /getStudentLearningContext\(\)/);
  assert.match(learnSource, /\.from\("learning_units"\)/);
  assert.match(resultsSource, /loadStudentCurriculumHistory\(\)/);
  assert.match(resultsSource, /StudentCurriculumHistoryView/);
  assert.doesNotMatch(`${learnSource}\n${resultsSource}`, /question_solutions/);
  assert.match(
    lessonsSource,
    /loadStudentPersonalizedPath(?:WithClient)?\(/,
  );
  assert.match(personalizedServerSource, /getStudentLearningContext\(\)/);
  assert.match(personalizedServerSource, /\.from\("learning_units"\)/);
  assert.match(learnSource, /\.from\("practice_attempts"\)/);
  assert.match(learnSource, /\.eq\("student_id", access\.user\.id\)/);
  assert.doesNotMatch(resultsSource, /practice_attempts|learning_units/);
  assert.match(personalizedServerSource, /\.from\("practice_attempts"\)/);
  assert.match(
    personalizedServerSource,
    /\.eq\("student_id", studentId\)/,
  );
  assert.doesNotMatch(
    `${lessonsSource}\n${personalizedServerSource}`,
    /question_solutions/,
  );
});

test("Sprint 2E 5. Student-code copy stays client-side and never logs the code", () => {
  const source = readFileSync(
    join(process.cwd(), "components/CopyStudentCode.tsx"),
    "utf8",
  );
  assert.match(source, /navigator\.clipboard\.writeText\(code\)/);
  assert.match(source, /Đã sao chép mã/);
  assert.doesNotMatch(source, /console\./);
});

test("Sprint 2E 6. Semantic design tokens and differentiated surfaces are defined", () => {
  const css = readFileSync(
    join(process.cwd(), "app/globals.css"),
    "utf8",
  );
  for (const token of [
    "--brand-primary",
    "--brand-navy",
    "--brand-sky",
    "--surface-learning",
    "--surface-goal",
    "--surface-progress",
    "--surface-history",
    "--color-success",
    "--color-warning",
    "--color-error",
    "--text-primary",
    "--text-secondary",
  ]) {
    assert.match(css, new RegExp(token));
  }
});

test("Sprint 2E 7. User-facing source contains no internal delivery terminology", () => {
  const userFacingFiles = [
    "app/layout.tsx",
    "app/page.tsx",
    "app/about/page.tsx",
    "app/dashboard/page.tsx",
    "app/learn/page.tsx",
    "app/lessons/page.tsx",
    "app/goals/page.tsx",
    "app/profile/page.tsx",
    "app/privacy/page.tsx",
    "app/terms/page.tsx",
    "app/register/page.tsx",
    "app/onboarding/OnboardingForm.tsx",
    "components/LearningAccessState.tsx",
  ];
  const source = userFacingFiles
    .map((file) => readFileSync(join(process.cwd(), file), "utf8"))
    .join("\n");
  assert.doesNotMatch(source, /\b(Sprint|MVP|migration|schema|RPC)\b/i);
});

test("Sprint 2F 1. App Router brand icons use the expected PNG dimensions", () => {
  for (const [file, width, height] of [
    ["app/icon.png", 512, 512],
    ["app/apple-icon.png", 180, 180],
  ] as const) {
    const image = readFileSync(join(process.cwd(), file));
    assert.equal(image.subarray(1, 4).toString("ascii"), "PNG");
    assert.equal(image.readUInt32BE(16), width);
    assert.equal(image.readUInt32BE(20), height);
  }
  assert.equal(existsSync(join(process.cwd(), "app/favicon.ico")), false);
});

test("Sprint 2F 2. Required Vietnamese page titles use the root PLAVE template", () => {
  const rootLayout = readFileSync(
    join(process.cwd(), "app/layout.tsx"),
    "utf8",
  );
  assert.match(rootLayout, /default: "PLAVE – Học Toán theo nhịp riêng"/);
  assert.match(rootLayout, /template: "%s \| PLAVE"/);

  const titleSources = [
    ["app/dashboard/page.tsx", 'title: "Tổng quan"'],
    ["app/learn/page.tsx", 'title: "Lý thuyết"'],
    ["app/lessons/page.tsx", 'title: "Bài học"'],
    ["app/goals/page.tsx", 'title: "Mục tiêu"'],
    ["app/profile/page.tsx", 'title: "Hồ sơ học sinh"'],
    ["app/results/page.tsx", 'title: "Kết quả học tập"'],
    ["app/about/page.tsx", 'title: "Giới thiệu"'],
    ["app/demo/layout.tsx", 'title: "Học thử"'],
    ["app/login/layout.tsx", 'title: "Đăng nhập"'],
    ["app/register/layout.tsx", 'title: "Đăng ký"'],
    [
      "app/learn/grade-1/numbers-to-10/page.tsx",
      'title: "Các số trong phạm vi 10"',
    ],
    ["app/practice/[attemptId]/page.tsx", 'title: "Luyện tập"'],
    ["app/review/[attemptId]/page.tsx", 'title: "Kết quả bài làm"'],
  ] as const;

  for (const [file, titleSource] of titleSources) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.match(source, new RegExp(titleSource.replace(/[|]/g, "\\|")));
  }
});

test("Sprint 7A. Student navigation keeps lessons canonical and learn compatible", () => {
  const items = getHeaderNavigation(true, "STUDENT");
  assert.deepEqual(
    items.map(({ href, label }) => ({ href, label })),
    [
      { href: "/dashboard", label: "Tổng quan" },
      { href: "/lessons", label: "Bài học" },
      { href: "/tutor", label: "AI Tutor" },
      { href: "/learning-progress", label: "Tiến bộ" },
      { href: "/results", label: "Lịch sử" },
      { href: "/goals", label: "Mục tiêu" },
    ],
  );
  assert.equal(items.filter((item) => item.href === "/learn").length, 0);
  assert.equal(items.filter((item) => item.href === "/lessons").length, 1);
  const lessons = items.find((item) => item.href === "/lessons");
  assert.ok(lessons);
  assert.equal(
    isHeaderItemActive("/learn/grade-1/numbers-to-10", lessons),
    true,
  );
});

test("Sprint 2F 4. About CTA branches from the shared server auth state", () => {
  const aboutSource = readFileSync(
    join(process.cwd(), "app/about/page.tsx"),
    "utf8",
  );
  const authSource = readFileSync(
    join(process.cwd(), "lib/auth/public-state.ts"),
    "utf8",
  );
  const headerSource = readFileSync(
    join(process.cwd(), "components/PublicHeader.tsx"),
    "utf8",
  );

  assert.match(aboutSource, /await getPublicAuthState\(\)/);
  assert.match(aboutSource, /authState\.authenticated \?/);
  assert.match(aboutSource, /Tiếp tục học/);
  assert.match(aboutSource, /Xem bài học/);
  assert.match(aboutSource, /Học thử/);
  assert.match(aboutSource, /Tạo tài khoản/);
  assert.match(aboutSource, /Đăng nhập/);
  assert.match(authSource, /supabase\.auth\.getUser\(\)/);
  assert.match(headerSource, /await getPublicAuthState\(\)/);
});

test("Student navigation 1. Profile dropdown is accessible and closes safely", () => {
  const source = readFileSync(
    join(process.cwd(), "components/HeaderNavigation.tsx"),
    "utf8",
  );

  assert.match(source, /aria-haspopup="menu"/);
  assert.match(source, /aria-expanded=\{profileMenuOpen\}/);
  assert.match(source, /role="menu"/);
  assert.match(source, /role="menuitem"/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /pointerdown/);
  assert.match(source, /profileButtonRef\.current\?\.focus\(\)/);
  assert.match(source, /event\.key === "ArrowDown"/);
  assert.match(source, /event\.key === "ArrowUp"/);
  assert.match(source, /event\.key === "Home"/);
  assert.match(source, /event\.key === "End"/);
});

test("Student navigation 2. Profile actions expose real routes only", () => {
  const source = readFileSync(
    join(process.cwd(), "components/HeaderNavigation.tsx"),
    "utf8",
  );

  assert.deepEqual(
    getProfileMenuActions("STUDENT").map(({ href }) => href),
    ["/profile", "/profile/edit", "/settings", "/connections", "/privacy"],
  );
  assert.match(source, /getProfileMenuActions\(role\)/);
  assert.match(source, /<LogoutForm/);
  assert.match(source, /profile-menu__logout/);
  assert.doesNotMatch(source, /Thông báo|Sắp có|href="\/notifications"/);
});

test("Student navigation 3. Lessons, goals, and profile are protected functional routes", () => {
  for (const pathname of ["/lessons", "/goals", "/profile"]) {
    assert.equal(getAuthNavigationDecision(pathname, false), "LOGIN");
    assert.equal(getAuthNavigationDecision(pathname, true), "ALLOW");
  }

  const lessonsSource = readFileSync(
    join(process.cwd(), "app/lessons/page.tsx"),
    "utf8",
  );
  const goalsSource = readFileSync(
    join(process.cwd(), "app/goals/page.tsx"),
    "utf8",
  );
  const goalLoaderSource = readFileSync(
    join(process.cwd(), "lib/goals/server.ts"),
    "utf8",
  );
  const profileSource = readFileSync(
    join(process.cwd(), "app/profile/page.tsx"),
    "utf8",
  );
  const profileLoaderSource = readFileSync(
    join(process.cwd(), "lib/profile/server.ts"),
    "utf8",
  );

  assert.match(lessonsSource, /loadStudentPersonalizedPath/);
  assert.match(lessonsSource, /item\.activeAttempt/);
  assert.match(lessonsSource, /answeredCount/);
  assert.match(lessonsSource, /Tiếp tục làm bài/);
  assert.match(lessonsSource, /Xem kết quả/);
  assert.match(lessonsSource, /Làm lượt mới/);
  assert.match(lessonsSource, /Toàn bộ lộ trình của em/);
  assert.match(
    goalsSource,
    /<GoalsManager[\s\S]*goals=\{result\.goals\}/,
  );
  assert.match(goalLoaderSource, /\.eq\("student_id", studentId\)/);
  assert.match(profileSource, /getStudentProfileView\(\)/);
  assert.match(profileLoaderSource, /getStudentLearningContext\(\)/);
  assert.match(
    profileLoaderSource,
    /\.eq\("user_id", access\.user\.id\)/,
  );
  assert.doesNotMatch(profileSource, /student_code/);
});

test("Student navigation 4. Dashboard contains only a goal summary and full-list link", () => {
  const source = readFileSync(
    join(process.cwd(), "app/dashboard/page.tsx"),
    "utf8",
  );

  assert.doesNotMatch(source, /<GoalsManager/);
  assert.match(source, /dashboard-goals-summary/);
  assert.match(source, /href="\/goals"/);
  assert.match(source, /Xem tất cả mục tiêu/);
});

test("Student navigation 5. Goals are grouped without duplicating write logic", () => {
  const managerSource = readFileSync(
    join(process.cwd(), "app/dashboard/GoalsManager.tsx"),
    "utf8",
  );

  assert.match(managerSource, /Đang thực hiện/);
  assert.match(managerSource, /Đã hoàn thành/);
  assert.match(managerSource, /activeGoals\.map\(renderGoal\)/);
  assert.match(managerSource, /completedGoals\.map\(renderGoal\)/);
  assert.match(managerSource, /createLearningGoal/);
  assert.match(managerSource, /completeGoal/);
  assert.match(managerSource, /archiveGoal/);
  assert.match(managerSource, /restoreGoal/);
});

test("Student navigation 6. Footer follows the shared server session", () => {
  const source = readFileSync(
    join(process.cwd(), "components/PublicFooter.tsx"),
    "utf8",
  );

  assert.match(source, /await getPublicAuthState\(\)/);
  assert.match(source, /authState\.onboardingCompleted/);
  assert.match(source, /"\/onboarding"/);
  assert.match(source, /href="\/lessons"/);
  assert.match(source, /href="\/goals"/);
  assert.match(source, /href="\/privacy"/);
});

test("Student navigation 7. Layout never scales the whole interface", () => {
  const css = readFileSync(
    join(process.cwd(), "app/globals.css"),
    "utf8",
  );

  assert.doesNotMatch(css, /(^|[;{\\s])zoom\\s*:/m);
  assert.doesNotMatch(css, /transform\\s*:\\s*scale/i);
  assert.match(css, /-webkit-text-size-adjust: 100%/);
  assert.match(css, /\.real-learning-page\s*\{[^}]*max-width: 68rem/s);
});

test("Student navigation 8. Functional colors map to stable semantic areas", () => {
  const css = readFileSync(
    join(process.cwd(), "app/globals.css"),
    "utf8",
  );

  assert.match(css, /--surface-lessons: #f4efff/);
  assert.match(css, /--surface-goals: #fff1eb/);
  assert.match(css, /\.catalog-hero--lessons[^}]*var\(--surface-lessons\)/s);
  assert.match(css, /\.catalog-hero--goals[^}]*var\(--surface-goals\)/s);
  assert.match(css, /\.catalog-hero--results[^}]*var\(--surface-progress\)/s);
});

test("Onboarding 1. Student registration sends the selected grade as auth metadata", () => {
  const source = readFileSync(
    join(process.cwd(), "app/register/actions.ts"),
    "utf8",
  );

  assert.match(
    source,
    /buildRegistrationMetadata\(input\.role, input\.grade\)/,
  );
  assert.match(source, /input\.grade < 1 \|\| input\.grade > 9/);
});

test("Onboarding 2. The registration grade is read from the own profile on the server", () => {
  const pageSource = readFileSync(
    join(process.cwd(), "app/onboarding/page.tsx"),
    "utf8",
  );
  const actionSource = readFileSync(
    join(process.cwd(), "app/onboarding/actions.ts"),
    "utf8",
  );

  assert.match(pageSource, /registration_grade/);
  assert.match(actionSource, /registration_grade/);
  assert.match(actionSource, /p_grade: registeredGrade/);
  assert.doesNotMatch(pageSource, /user_metadata\.grade/);
});

test("Onboarding 3. Student onboarding displays a read-only grade and no grade select", () => {
  const source = readFileSync(
    join(process.cwd(), "app/onboarding/OnboardingForm.tsx"),
    "utf8",
  );

  assert.match(source, /Lớp đã chọn khi đăng ký/);
  assert.match(source, /registeredGrade/);
  assert.doesNotMatch(source, /<select/);
  assert.doesNotMatch(source, /onboarding-grade/);
});

test("Onboarding 4. A browser payload cannot provide or override grade", () => {
  assert.deepEqual(
    parseOnboardingSubmission({
      fullName: "Học sinh kiểm thử",
      birthDate: "",
    }),
    {
      fullName: "Học sinh kiểm thử",
      birthDate: "",
    },
  );
  assert.equal(
    parseOnboardingSubmission({
      fullName: "Học sinh kiểm thử",
      birthDate: "",
      grade: 9,
    }),
    null,
  );

  const formSource = readFileSync(
    join(process.cwd(), "app/onboarding/OnboardingForm.tsx"),
    "utf8",
  );
  assert.doesNotMatch(formSource, /JSON\.stringify\(\{[\s\S]*grade:/);
});

test("Onboarding 5. A missing persisted registration grade fails closed", () => {
  assert.equal(isValidRegistrationGrade(null), false);
  assert.match(missingRegistrationGradeMessage, /chưa tìm thấy lớp em đã chọn/i);

  const source = readFileSync(
    join(process.cwd(), "app/onboarding/OnboardingForm.tsx"),
    "utf8",
  );
  assert.match(source, /disabled=\{isPending \|\| registeredGradeMissing\}/);
});

test("Onboarding 6. Only integer grades from 1 through 9 are valid", () => {
  for (const grade of [1, 2, 5, 9]) {
    assert.equal(isValidRegistrationGrade(grade), true);
  }
  for (const grade of [null, 0, 10, 1.5, "1", Number.NaN]) {
    assert.equal(isValidRegistrationGrade(grade), false);
  }
});

test("Onboarding 7. A normal localhost same-origin POST is accepted", () => {
  const request = new Request("http://localhost:3000/api/onboarding", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      origin: "http://localhost:3000",
    },
  });

  assert.equal(isSameOriginRequest(request, "development"), true);
  assert.equal(isSameOriginRequest(request, "production"), true);
});

test("Onboarding 8. A development bind address is equivalent to localhost only in development", () => {
  const request = new Request("http://0.0.0.0:3000/api/onboarding", {
    method: "POST",
    headers: {
      host: "0.0.0.0:3000",
      origin: "http://localhost:3000",
    },
  });

  assert.equal(isSameOriginRequest(request, "development"), true);
  assert.equal(isSameOriginRequest(request, "production"), false);
});

test("Onboarding 9. A foreign origin remains rejected", () => {
  const request = new Request("http://0.0.0.0:3000/api/onboarding", {
    method: "POST",
    headers: {
      host: "0.0.0.0:3000",
      origin: "https://outside.invalid",
    },
  });

  assert.equal(isSameOriginRequest(request, "development"), false);
  assert.equal(isSameOriginRequest(request, "production"), false);
});

test("Onboarding 10. Concurrent submit events acquire only one request slot", () => {
  const gate = createOnboardingSubmissionGate();

  assert.equal(gate.tryStart(), true);
  assert.equal(gate.tryStart(), false);
  gate.reset();
  assert.equal(gate.tryStart(), true);
});

test("Onboarding 11. Every Student learning route redirects incomplete profiles to onboarding", () => {
  const routeFiles = [
    "app/learn/page.tsx",
    "app/learn/[gradeSlug]/[lessonSlug]/page.tsx",
    "app/lessons/page.tsx",
    "app/results/page.tsx",
    "app/goals/page.tsx",
    "app/profile/page.tsx",
    "app/practice/[attemptId]/page.tsx",
    "app/review/[attemptId]/page.tsx",
  ];

  for (const file of routeFiles) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.match(source, /ONBOARDING_REQUIRED/);
    assert.match(source, /redirect\("\/onboarding"\)/);
  }

  const dashboardSource = readFileSync(
    join(process.cwd(), "app/dashboard/page.tsx"),
    "utf8",
  );
  assert.match(
    dashboardSource,
    /if \(!profile\.onboarding_completed\) \{\s*redirect\("\/onboarding"\)/,
  );
});

test("Onboarding 12. Completed Student profiles still enter Dashboard", () => {
  const source = readFileSync(
    join(process.cwd(), "app/dashboard/page.tsx"),
    "utf8",
  );
  const gateIndex = source.indexOf("if (!profile.onboarding_completed)");
  const studentDashboardIndex = source.indexOf(
    'supabase\n      .from("student_profiles")',
  );

  assert.notEqual(gateIndex, -1);
  assert.ok(studentDashboardIndex > gateIndex);
});

test("Onboarding 13. Migration 0005 preserves completed grades and makes registration grade authoritative", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0005_persist_registration_grade.sql",
    ),
    "utf8",
  );

  assert.match(migration, /^begin;/);
  assert.match(migration, /commit;\s*$/);
  assert.match(migration, /and not p\.onboarding_completed/);
  assert.match(
    migration,
    /if v_profile_onboarding_completed then\s+return;/,
  );
  assert.match(
    migration,
    /p_grade is distinct from v_registration_grade/,
  );
  assert.match(migration, /grade = v_registration_grade/);
  assert.doesNotMatch(
    migration,
    /pg_get_constraintdef\(c\.oid\)[\s\S]*between 1 and 9/i,
  );
  assert.match(migration, /c\.convalidated/);
  assert.match(migration, /c\.conkey = array\[a\.attnum\]/);
  assert.doesNotMatch(migration, /grant update on.*profiles/is);
});

test("Onboarding 14. Incomplete accounts receive a minimal header and demo remains independent", () => {
  assert.deepEqual(getHeaderNavigation(true, "STUDENT", false), []);
  assert.equal(getHeaderLogoHref(true, false), "/onboarding");

  const headerSource = readFileSync(
    join(process.cwd(), "components/HeaderNavigation.tsx"),
    "utf8",
  );
  const demoSource = readFileSync(
    join(process.cwd(), "app/demo/page.tsx"),
    "utf8",
  );
  assert.match(headerSource, /authenticated && !onboardingCompleted/);
  assert.match(headerSource, /Đang hoàn tất hồ sơ/);
  assert.match(headerSource, /<LogoutForm/);
  assert.doesNotMatch(demoSource, /getStudentLearningContext/);
});

test("Goal lifecycle 1. ACTIVE goals offer completion but never archive", () => {
  const source = readFileSync(
    join(process.cwd(), "app/dashboard/GoalsManager.tsx"),
    "utf8",
  );
  const activeBranchStart = source.indexOf(
    'goal.status === "ACTIVE" ?',
  );
  const completedBranchStart = source.indexOf(
    'goal.status === "COMPLETED" ?',
    activeBranchStart,
  );
  const activeBranch = source.slice(
    activeBranchStart,
    completedBranchStart,
  );

  assert.notEqual(activeBranchStart, -1);
  assert.notEqual(completedBranchStart, -1);
  assert.match(activeBranch, /Đánh dấu hoàn thành/);
  assert.match(activeBranch, /Đang hoàn thành…/);
  assert.doesNotMatch(activeBranch, /Lưu trữ|Khôi phục/);
});

test("Goal lifecycle 2. A forged archive request cannot match an ACTIVE goal", () => {
  const actionSource = readFileSync(
    join(process.cwd(), "app/dashboard/actions.ts"),
    "utf8",
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0006_fix_learning_goal_lifecycle.sql",
    ),
    "utf8",
  );

  assert.match(
    actionSource,
    /operation === "ARCHIVE"[\s\S]*\.eq\("status", "COMPLETED"\)[\s\S]*\.not\("completed_at", "is", null\)[\s\S]*\.is\("archived_at", null\)/,
  );
  assert.match(
    migration,
    /old\.status = 'ACTIVE' and new\.status = 'COMPLETED'/,
  );
  assert.doesNotMatch(
    migration,
    /old\.status = 'ACTIVE' and new\.status = 'ARCHIVED'/,
  );
});

test("Goal lifecycle 3. Every mutation remains scoped to the authenticated owner", () => {
  const source = readFileSync(
    join(process.cwd(), "app/dashboard/actions.ts"),
    "utf8",
  );

  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /\.eq\("id", goalId\)\s*\.eq\("student_id", auth\.userId\)/);
  assert.doesNotMatch(source, /studentId:\s*input|userId:\s*input/);
});

test("Goal lifecycle 4. ACTIVE to COMPLETED sets completion exactly once", () => {
  const actionSource = readFileSync(
    join(process.cwd(), "app/dashboard/actions.ts"),
    "utf8",
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0006_fix_learning_goal_lifecycle.sql",
    ),
    "utf8",
  );

  assert.match(
    actionSource,
    /status: "COMPLETED",\s*completed_at: mutationTime,\s*archived_at: null/,
  );
  assert.match(
    migration,
    /old\.status = 'ACTIVE' and new\.status = 'COMPLETED'/,
  );
  assert.match(
    migration,
    /old\.completed_at is not null[\s\S]*new\.completed_at is distinct from old\.completed_at[\s\S]*raise exception 'Goal completion timestamp cannot change'/,
  );
});

test("Goal lifecycle 5. COMPLETED to ARCHIVED preserves completion and records archive time", () => {
  const actionSource = readFileSync(
    join(process.cwd(), "app/dashboard/actions.ts"),
    "utf8",
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0006_fix_learning_goal_lifecycle.sql",
    ),
    "utf8",
  );

  assert.match(
    actionSource,
    /status: "ARCHIVED",\s*archived_at: mutationTime/,
  );
  assert.match(
    migration,
    /old\.status = 'COMPLETED' and new\.status = 'ARCHIVED'/,
  );
  assert.match(migration, /archived_at >= completed_at/);
});

test("Goal lifecycle 6. ARCHIVED restores only to COMPLETED", () => {
  const actionSource = readFileSync(
    join(process.cwd(), "app/dashboard/actions.ts"),
    "utf8",
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0006_fix_learning_goal_lifecycle.sql",
    ),
    "utf8",
  );

  assert.match(
    actionSource,
    /export async function restoreGoal\(goalId: string\) \{\s*return mutateGoal\(goalId, "RESTORE"\);/,
  );
  assert.match(
    actionSource,
    /else \{\s*mutation = mutation\s*\.eq\("status", "ARCHIVED"\)/,
  );
  assert.match(
    migration,
    /old\.status = 'ARCHIVED' and new\.status = 'COMPLETED'/,
  );
  assert.doesNotMatch(
    migration,
    /old\.status = 'ARCHIVED' and new\.status = 'ACTIVE'/,
  );
});

test("Goal lifecycle 7. Restore never changes the original completion time", () => {
  const actionSource = readFileSync(
    join(process.cwd(), "app/dashboard/actions.ts"),
    "utf8",
  );
  const restorePayload = actionSource.slice(
    actionSource.indexOf(': {\n                status: "COMPLETED"'),
    actionSource.indexOf("      )\n      .eq", actionSource.indexOf(': {\n                status: "COMPLETED"')),
  );

  assert.match(restorePayload, /archived_at: null/);
  assert.doesNotMatch(restorePayload, /completed_at:/);
});

test("Goal lifecycle 8. Database rejects ACTIVE to ARCHIVED", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0006_fix_learning_goal_lifecycle.sql",
    ),
    "utf8",
  );

  assert.doesNotMatch(
    migration,
    /old\.status = 'ACTIVE' and new\.status = 'ARCHIVED'/,
  );
  assert.match(migration, /raise exception 'Invalid goal lifecycle transition'/);
});

test("Goal lifecycle 9. Database rejects COMPLETED to ACTIVE", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0006_fix_learning_goal_lifecycle.sql",
    ),
    "utf8",
  );

  assert.doesNotMatch(
    migration,
    /old\.status = 'COMPLETED' and new\.status = 'ACTIVE'/,
  );
});

test("Goal lifecycle 10. Double-click acquires only one goal mutation", () => {
  const gate = createGoalWriteGate();

  assert.equal(gate.tryStart(), true);
  assert.equal(gate.tryStart(), false);
  gate.reset();
  assert.equal(gate.tryStart(), true);
});

test("Goal lifecycle 11. Reloaded goal data retains lifecycle timestamps and grouping", () => {
  const loaderSource = readFileSync(
    join(process.cwd(), "lib/goals/server.ts"),
    "utf8",
  );
  const managerSource = readFileSync(
    join(process.cwd(), "app/dashboard/GoalsManager.tsx"),
    "utf8",
  );

  assert.match(loaderSource, /completed_at, archived_at/);
  assert.match(managerSource, /goal\.status === "ACTIVE"/);
  assert.match(managerSource, /goal\.status === "COMPLETED"/);
  assert.match(managerSource, /goal\.status === "ARCHIVED"/);
  assert.match(managerSource, /Hoàn thành ngày/);
});

test("Goal lifecycle 12. The two invalid legacy ARCHIVED goals are restored conservatively", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0006_fix_learning_goal_lifecycle.sql",
    ),
    "utf8",
  );

  assert.match(
    migration,
    /set\s+status = 'ACTIVE',\s+completed_at = null,\s+archived_at = null\s+where lg\.status = 'ARCHIVED'/,
  );
  assert.doesNotMatch(migration, /delete from public\.learning_goals/i);
});

test("Goal lifecycle 13. Practice, review, auth, onboarding, and demo remain untouched by goal writes", () => {
  const actionSource = readFileSync(
    join(process.cwd(), "app/dashboard/actions.ts"),
    "utf8",
  );
  const demoSource = readFileSync(
    join(process.cwd(), "app/demo/page.tsx"),
    "utf8",
  );

  assert.doesNotMatch(
    actionSource,
    /practice_attempts|practice_answers|question_solutions|signOut|complete_onboarding/,
  );
  assert.doesNotMatch(demoSource, /learning_goals/);
});

test("Student profile 1. Guest access is blocked for profile, edit, and settings", () => {
  for (const pathname of ["/profile", "/profile/edit", "/settings"]) {
    assert.equal(getAuthNavigationDecision(pathname, false), "LOGIN");
  }

  assert.equal(getAuthNavigationDecision("/profile", true), "ALLOW");
  assert.equal(getAuthNavigationDecision("/profile/edit", true), "ALLOW");
  assert.equal(getAuthNavigationDecision("/settings", true), "ALLOW");
});

test("Student profile 2. Update RPC is scoped exclusively to auth.uid()", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0007_update_student_profile.sql",
    ),
    "utf8",
  );

  assert.match(migration, /v_current_user_id uuid := auth\.uid\(\)/);
  assert.match(
    migration,
    /where p\.user_id = v_current_user_id/,
  );
  assert.match(
    migration,
    /where sp\.user_id = v_current_user_id/,
  );
  assert.match(migration, /v_current_role <> 'STUDENT'/);
  assert.match(migration, /or not v_onboarding_completed/);
  assert.doesNotMatch(
    migration,
    /create function public\.update_student_profile\([^)]*user_id/i,
  );
});

test("Student profile 3. Browser and action can update only name and birth date", () => {
  const actionSource = readFileSync(
    join(process.cwd(), "app/profile/edit/actions.ts"),
    "utf8",
  );
  const formSource = readFileSync(
    join(process.cwd(), "app/profile/edit/ProfileEditForm.tsx"),
    "utf8",
  );

  assert.match(actionSource, /p_full_name: validation\.value\.fullName/);
  assert.match(actionSource, /p_birth_date: validation\.value\.birthDate/);
  assert.doesNotMatch(
    actionSource,
    /p_role|p_grade|p_student_code|p_user_id|p_onboarding_completed/,
  );
  assert.doesNotMatch(
    formSource,
    /name=["'](?:role|grade|student_code|user_id|onboarding_completed)["']/,
  );
});

test("Student profile 4. New name is rendered and the shared navbar is revalidated", () => {
  const profileSource = readFileSync(
    join(process.cwd(), "app/profile/page.tsx"),
    "utf8",
  );
  const actionSource = readFileSync(
    join(process.cwd(), "app/profile/edit/actions.ts"),
    "utf8",
  );
  const publicStateSource = readFileSync(
    join(process.cwd(), "lib/auth/public-state.ts"),
    "utf8",
  );

  assert.match(profileSource, /result\.profile\.fullName/);
  assert.match(actionSource, /revalidatePath\("\/", "layout"\)/);
  assert.match(publicStateSource, /\.select\("role, full_name, onboarding_completed"\)/);
});

test("Student profile 5. Validation normalizes names and rejects a future birth date", () => {
  const valid = validateStudentProfileInput(
    {
      fullName: "  Nguyễn   An  ",
      birthDate: "2018-05-03",
    },
    "2026-07-29",
  );
  const future = validateStudentProfileInput(
    {
      fullName: "Nguyễn An",
      birthDate: "2027-01-01",
    },
    "2026-07-29",
  );

  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.value.fullName, "Nguyễn An");
    assert.equal(valid.value.birthDate, "2018-05-03");
  }
  assert.equal(future.ok, false);
  if (!future.ok) {
    assert.match(future.fieldErrors.birthDate ?? "", /tương lai/);
  }
});

test("Student profile 6. Optional birth date and repeated input remain valid", () => {
  const first = validateStudentProfileInput({
    fullName: "Nguyễn An",
    birthDate: "",
  });
  const second = validateStudentProfileInput({
    fullName: "Nguyễn An",
    birthDate: "",
  });

  assert.deepEqual(first, second);
  assert.equal(first.ok, true);
  if (first.ok) assert.equal(first.value.birthDate, null);
});

test("Student profile 7. Double submit acquires only one update slot", () => {
  const gate = createProfileSubmissionGate();

  assert.equal(gate.tryStart(), true);
  assert.equal(gate.tryStart(), false);
  gate.reset();
  assert.equal(gate.tryStart(), true);
});

test("Student profile 8. Profile dropdown exposes only functional routes", () => {
  assert.deepEqual(getProfileMenuActions("STUDENT"), [
    { href: "/profile", label: "Xem hồ sơ" },
    { href: "/profile/edit", label: "Chỉnh sửa hồ sơ" },
    { href: "/settings", label: "Cài đặt" },
    { href: "/connections", label: "Kết nối phụ huynh" },
    { href: "/privacy", label: "Quyền riêng tư" },
  ]);
});

test("Student profile 9. Settings masks email and uses existing real account actions", () => {
  const source = readFileSync(
    join(process.cwd(), "app/settings/page.tsx"),
    "utf8",
  );

  assert.equal(maskAccountEmail("trung@example.com"), "t***@example.com");
  assert.equal(
    maskAccountEmail(undefined),
    "Email tài khoản được bảo vệ",
  );
  assert.match(source, /maskAccountEmail\(access\.user\.email\)/);
  assert.match(source, /href="\/forgot-password"/);
  assert.match(source, /href="\/privacy"/);
  assert.match(source, /<LogoutForm \/>/);
  assert.doesNotMatch(source, /notification|toggle|Trợ lý AI/i);
});

test("Logout regression. Student, Parent, and Settings share one SSR logout flow", () => {
  const headerSource = readFileSync(
    join(process.cwd(), "components/HeaderNavigation.tsx"),
    "utf8",
  );
  const settingsSource = readFileSync(
    join(process.cwd(), "app/settings/page.tsx"),
    "utf8",
  );
  const logoutFormSource = readFileSync(
    join(process.cwd(), "components/LogoutForm.tsx"),
    "utf8",
  );
  const actionSource = readFileSync(
    join(process.cwd(), "app/auth/actions.ts"),
    "utf8",
  );

  // Both Student and Parent render the same authenticated profile menu branch.
  assert.match(headerSource, /authenticated \?/);
  assert.match(headerSource, /role === "STUDENT"/);
  assert.match(
    headerSource,
    /<LogoutForm[\s\S]*buttonClassName="profile-menu__logout"[\s\S]*menuItem/,
  );
  assert.match(settingsSource, /<LogoutForm \/>/);

  // Closing the dropdown must not unmount its form before submission.
  assert.doesNotMatch(
    headerSource,
    /profile-menu__logout"[\s\S]{0,200}onClick=\{closeAllMenus\}/,
  );
  assert.match(logoutFormSource, /<form action=\{formAction\}/);
  assert.match(logoutFormSource, /type="submit"/);

  // Native submit covers click, Enter and Space; pending disables repeated requests.
  assert.match(logoutFormSource, /useActionState\(/);
  assert.match(logoutFormSource, /disabled=\{pending\}/);
  assert.match(logoutFormSource, /Đang đăng xuất…/);
  assert.match(logoutFormSource, /role=\{menuItem \? "menuitem" : undefined\}/);
  assert.match(logoutFormSource, /role="alert"/);

  // Cookie mutation remains exclusively in the shared Supabase SSR server action.
  assert.match(actionSource, /"use server"/);
  assert.match(actionSource, /await createClient\(\)/);
  assert.match(actionSource, /supabase\.auth\.signOut\(\)/);
  assert.match(actionSource, /revalidatePath\("\/", "layout"\)/);
  assert.match(actionSource, /redirect\("\/login"\)/);
  assert.doesNotMatch(logoutFormSource, /document\.cookie|localStorage|cookieStore/);
});

test("Student profile 10. Migration keeps direct UPDATE closed and changes no learning data", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0007_update_student_profile.sql",
    ),
    "utf8",
  );
  const actionSource = readFileSync(
    join(process.cwd(), "app/profile/edit/actions.ts"),
    "utf8",
  );
  const demoSource = readFileSync(
    join(process.cwd(), "app/demo/page.tsx"),
    "utf8",
  );

  assert.match(migration, /^begin;[\s\S]*commit;\s*$/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(
    migration,
    /grant execute on function public\.update_student_profile\(text, date\)\s+to authenticated/,
  );
  assert.match(migration, /direct profile update privilege detected/);
  assert.doesNotMatch(
    migration,
    /practice_attempts|practice_answers|learning_goals|question_solutions/,
  );
  assert.doesNotMatch(
    actionSource,
    /practice_attempts|practice_answers|learning_goals|question_solutions/,
  );
  assert.doesNotMatch(demoSource, /update_student_profile/);
});

test("Parent connection 1. Invalid lookup returns no identifying fields", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0008_parent_student_connections.sql",
    ),
    "utf8",
  );
  const serverSource = readFileSync(
    join(process.cwd(), "lib/connections/server.ts"),
    "utf8",
  );

  assert.equal(isStudentConnectionNotFound({ found: false }), true);
  assert.equal(parseStudentConnectionPreview({ found: false }), null);
  assert.match(migration, /return jsonb_build_object\('found', false\)/);
  assert.match(
    serverSource,
    /Không tìm thấy học sinh phù hợp\. Vui lòng kiểm tra lại mã\./,
  );
});

test("Parent connection 2. Lookup resolves only onboarded Students and never self", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0008_parent_student_connections.sql",
    ),
    "utf8",
  );

  assert.match(migration, /p\.role = 'STUDENT'/);
  assert.match(migration, /and p\.onboarding_completed/);
  assert.match(
    migration,
    /v_student_user_id = p_parent_user_id/,
  );
  assert.match(
    migration,
    /parent_profile\.role = 'PARENT'/,
  );
  assert.match(
    migration,
    /student_profile\.role = 'STUDENT'/,
  );
});

test("Parent connection 3. Duplicate active requests are prevented and idempotent", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0008_parent_student_connections.sql",
    ),
    "utf8",
  );

  assert.match(
    migration,
    /create unique index parent_student_connections_one_active_pair_idx[\s\S]*where status in \('PENDING', 'APPROVED'\)/,
  );
  assert.match(
    migration,
    /connection\.status in \('PENDING', 'APPROVED'\)[\s\S]*if v_existing_status is not null/,
  );
  assert.match(migration, /connection-pair:/);
});

test("Parent connection 4. Parent cancellation is owner- and state-scoped", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0008_parent_student_connections.sql",
    ),
    "utf8",
  );

  assert.match(
    migration,
    /cancel_parent_connection_request[\s\S]*connection\.parent_user_id = v_parent_user_id[\s\S]*connection\.status = 'PENDING'/,
  );
  assert.match(
    migration,
    /v_current_status = 'CANCELLED'[\s\S]*return jsonb_build_object\('status', 'CANCELLED'\)/,
  );
});

test("Parent connection 5. Student response is target- and state-scoped", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0008_parent_student_connections.sql",
    ),
    "utf8",
  );

  assert.match(
    migration,
    /respond_parent_connection_request[\s\S]*private\.require_connection_actor\('STUDENT'\)/,
  );
  assert.match(
    migration,
    /connection\.student_user_id = v_student_user_id[\s\S]*connection\.status = 'PENDING'/,
  );
});

test("Parent connection 6. Other users cannot directly read or mutate connection rows", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0008_parent_student_connections.sql",
    ),
    "utf8",
  );

  assert.match(
    migration,
    /alter table public\.parent_student_connections enable row level security/,
  );
  assert.match(
    migration,
    /revoke all on table public\.parent_student_connections from authenticated/,
  );
  assert.match(
    migration,
    /connection\.parent_user_id = v_current_user_id/,
  );
  assert.match(
    migration,
    /connection\.student_user_id = v_current_user_id/,
  );
  assert.doesNotMatch(migration, /using\s*\(\s*true\s*\)/i);
});

test("Parent connection 7. PENDING transitions to APPROVED", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0008_parent_student_connections.sql",
    ),
    "utf8",
  );

  assert.match(
    migration,
    /old\.status = 'PENDING'[\s\S]*new\.status in \('APPROVED', 'REJECTED', 'CANCELLED'\)/,
  );
  assert.match(
    migration,
    /v_target_status not in \('APPROVED', 'REJECTED'\)/,
  );
});

test("Parent connection 8. PENDING transitions to REJECTED", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0008_parent_student_connections.sql",
    ),
    "utf8",
  );

  assert.match(
    migration,
    /status = 'REJECTED'[\s\S]*responded_at is not null/,
  );
  assert.match(migration, /p_decision text/);
});

test("Parent connection 9. PENDING transitions to CANCELLED", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0008_parent_student_connections.sql",
    ),
    "utf8",
  );

  assert.match(
    migration,
    /status = 'CANCELLED'[\s\S]*responded_at is null[\s\S]*ended_at is not null/,
  );
  assert.match(
    migration,
    /set\s+status = 'CANCELLED',\s+ended_at = now\(\)/,
  );
});

test("Parent connection 10. APPROVED transitions to REVOKED by either participant", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0008_parent_student_connections.sql",
    ),
    "utf8",
  );

  assert.match(
    migration,
    /old\.status = 'APPROVED' and new\.status = 'REVOKED'/,
  );
  assert.match(
    migration,
    /connection\.parent_user_id = v_current_user_id[\s\S]*or connection\.student_user_id = v_current_user_id[\s\S]*connection\.status = 'APPROVED'/,
  );
});

test("Parent connection 11. Invalid reverse and skipped transitions are rejected", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0008_parent_student_connections.sql",
    ),
    "utf8",
  );

  assert.match(
    migration,
    /raise exception 'Invalid connection lifecycle transition'/,
  );
  assert.doesNotMatch(
    migration,
    /old\.status = '(?:REJECTED|CANCELLED|REVOKED)' and new\.status/,
  );
  assert.doesNotMatch(
    migration,
    /old\.status = 'PENDING' and new\.status = 'REVOKED'/,
  );
});

test("Parent connection 12. Concurrent mutations use per-connection locks", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0008_parent_student_connections.sql",
    ),
    "utf8",
  );

  assert.match(migration, /connection-lookup:/);
  assert.match(migration, /connection-pair:/);
  assert.match(
    migration,
    /hashtextextended\('connection:' \|\| p_connection_id::text, 0\)/,
  );
});

test("Parent connection 13. Rate limiting records no code and allows only five failures per hour", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0008_parent_student_connections.sql",
    ),
    "utf8",
  );
  const rateTable = migration.slice(
    migration.indexOf(
      "create table public.parent_student_lookup_failures",
    ),
    migration.indexOf(
      "create index parent_student_lookup_failures_parent_time_idx",
    ),
  );

  assert.match(migration, /v_recent_failure_count >= 5/);
  assert.match(migration, /now\(\) - interval '1 hour'/);
  assert.doesNotMatch(rateTable, /student_code/);
  assert.match(
    migration,
    /insert into public\.parent_student_lookup_failures \(parent_user_id\)/,
  );
});

test("Parent connection 14. Parent receives no learning data before or after approval", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0008_parent_student_connections.sql",
    ),
    "utf8",
  );
  const connectionServer = readFileSync(
    join(process.cwd(), "lib/connections/server.ts"),
    "utf8",
  );

  for (const forbiddenSource of [
    "practice_attempts",
    "practice_answers",
    "learning_goals",
    "question_solutions",
    "progress",
  ]) {
    assert.doesNotMatch(migration, new RegExp(forbiddenSource, "i"));
    assert.doesNotMatch(
      connectionServer,
      new RegExp(forbiddenSource, "i"),
    );
  }
});

test("Parent connection 15. Student code stays in POST bodies only", () => {
  const componentSource = readFileSync(
    join(process.cwd(), "components/ConnectionsManager.tsx"),
    "utf8",
  );
  const previewRoute = readFileSync(
    join(process.cwd(), "app/api/connections/preview/route.ts"),
    "utf8",
  );
  const requestRoute = readFileSync(
    join(process.cwd(), "app/api/connections/request/route.ts"),
    "utf8",
  );

  assert.match(componentSource, /method: "POST"/);
  assert.match(componentSource, /body: JSON\.stringify\(\{ studentCode:/);
  assert.doesNotMatch(
    componentSource,
    /localStorage|sessionStorage|console\.|searchParams|\?studentCode/,
  );
  assert.match(previewRoute, /export async function POST/);
  assert.match(requestRoute, /export async function POST/);
  assert.doesNotMatch(previewRoute, /export async function GET/);
  assert.doesNotMatch(requestRoute, /export async function GET/);
});

test("Parent connection 16. Preview response contains only masked name and grade", () => {
  const preview = parseStudentConnectionPreview({
    found: true,
    masked_student_name: "Hạ T***",
    grade: 1,
  });
  const leaked = parseStudentConnectionPreview({
    found: true,
    masked_student_name: "Hạ T***",
    grade: 1,
    email: "hidden",
  });

  assert.deepEqual(preview, {
    maskedStudentName: "Hạ T***",
    grade: 1,
  });
  assert.equal(leaked, null);
});

test("Parent connection 17. List parser accepts active summaries without participant IDs", () => {
  const state = parseConnectionState({
    viewer_role: "PARENT",
    connections: [
      {
        connection_id: attemptId,
        status: "PENDING",
        display_name: "Hạ T***",
        grade: 1,
        requested_at: "2026-07-29T00:00:00.000Z",
        responded_at: null,
      },
    ],
  });

  assert.equal(state?.viewerRole, "PARENT");
  assert.equal(state?.connections.length, 1);
  assert.equal("studentUserId" in (state?.connections[0] ?? {}), false);
  assert.equal("parentUserId" in (state?.connections[0] ?? {}), false);
});

test("Parent connection 18. Request inputs normalize safely and reject arbitrary actions", () => {
  assert.equal(
    normalizeStudentCode("  plv-abcdef123456  "),
    "PLV-ABCDEF123456",
  );
  assert.equal(
    parseStudentCodeRequest({ studentCode: "PLV-ABCDEF123456" }),
    "PLV-ABCDEF123456",
  );
  assert.equal(
    parseConnectionActionRequest({
      connectionId: attemptId,
      action: "DELETE",
    }),
    null,
  );
  assert.deepEqual(
    parseConnectionActionRequest({
      connectionId: attemptId,
      action: "APPROVE",
    }),
    { connectionId: attemptId, action: "APPROVE" },
  );
});

test("Parent connection 19. UI enforces two-step consent and single-flight requests", () => {
  const source = readFileSync(
    join(process.cwd(), "components/ConnectionsManager.tsx"),
    "utf8",
  );
  const gate = createConnectionRequestGate();

  assert.match(
    source,
    /Đúng là con của tôi — Gửi yêu cầu kết nối/,
  );
  assert.match(source, /Đồng ý kết nối/);
  assert.match(source, /Từ chối/);
  assert.match(source, /Xác nhận ngắt kết nối/);
  assert.equal(gate.tryStart(), true);
  assert.equal(gate.tryStart(), false);
});

test("Parent connection 20. Student route protection coexists with the Tutor navigation entry", () => {
  const studentNavigation = getHeaderNavigation(true, "STUDENT", true);
  const dashboardSource = readFileSync(
    join(process.cwd(), "app/dashboard/page.tsx"),
    "utf8",
  );
  const demoSource = readFileSync(
    join(process.cwd(), "app/demo/page.tsx"),
    "utf8",
  );

  assert.equal(studentNavigation.length, 6);
  assert.equal(studentNavigation.some((item) => item.href === "/tutor"), true);
  assert.equal(
    getAuthNavigationDecision("/connections", false),
    "LOGIN",
  );
  assert.match(dashboardSource, /href="\/connections"/);
  assert.match(dashboardSource, /pendingConnectionCount/);
  assert.doesNotMatch(demoSource, /parent_student_connections/);
});

const emptyParentDashboardPayload = {
  student: {
    display_name: "Học sinh",
    grade: 1,
  },
  summary: {
    completed_attempt_count: 0,
    total_answered: 0,
    total_correct: 0,
    average_accuracy_percent: null,
    last_activity_at: null,
  },
  current_practice: null,
  skills: PARENT_SKILL_CODES.map((skillCode) => ({
    skill_code: skillCode,
    answered_count: 0,
    correct_count: 0,
    accuracy_percent: null,
  })),
  recent_attempts: [],
  goals: [],
};

test("Parent dashboard 1. Only an owned APPROVED connection unlocks aggregate data", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0009_parent_learning_dashboard.sql",
    ),
    "utf8",
  );

  assert.match(migration, /private\.require_connection_actor\('PARENT'\)/);
  assert.match(
    migration,
    /connection\.parent_user_id = v_parent_user_id/,
  );
  assert.match(migration, /connection\.status = 'APPROVED'/);
});

test("Parent dashboard 2. PENDING connections never satisfy the read boundary", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0009_parent_learning_dashboard.sql",
    ),
    "utf8",
  );
  const authorizationBlock = migration.slice(
    migration.indexOf("select\n    count(*),\n    max(connection.student_user_id"),
    migration.indexOf("select\n    count(*),\n    coalesce(max(profile.full_name)"),
  );

  assert.match(authorizationBlock, /status = 'APPROVED'/);
  assert.doesNotMatch(authorizationBlock, /PENDING/);
});

test("Parent dashboard 3. Terminal connection states remain excluded", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0009_parent_learning_dashboard.sql",
    ),
    "utf8",
  );
  const authorizationBlock = migration.slice(
    migration.indexOf("select\n    count(*),\n    max(connection.student_user_id"),
    migration.indexOf("select\n    count(*),\n    coalesce(max(profile.full_name)"),
  );

  for (const status of ["REJECTED", "CANCELLED", "REVOKED"]) {
    assert.doesNotMatch(authorizationBlock, new RegExp(status));
  }
});

test("Parent dashboard 4. Parent A cannot resolve Parent B connection", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0009_parent_learning_dashboard.sql",
    ),
    "utf8",
  );

  assert.match(migration, /connection\.id = p_connection_id/);
  assert.match(
    migration,
    /connection\.parent_user_id = v_parent_user_id/,
  );
});

test("Parent dashboard 5. Student accounts fail the Parent role gate", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0009_parent_learning_dashboard.sql",
    ),
    "utf8",
  );
  const serverSource = readFileSync(
    join(process.cwd(), "lib/parent-dashboard/server.ts"),
    "utf8",
  );

  assert.match(migration, /require_connection_actor\('PARENT'\)/);
  assert.match(serverSource, /profile\.role !== "PARENT"/);
});

test("Parent dashboard 6. Guest calls fail before the dashboard RPC", () => {
  const helperMigration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0008_parent_student_connections.sql",
    ),
    "utf8",
  );
  const serverSource = readFileSync(
    join(process.cwd(), "lib/parent-dashboard/server.ts"),
    "utf8",
  );

  assert.match(helperMigration, /v_current_user_id uuid := auth\.uid\(\)/);
  assert.match(helperMigration, /if v_current_user_id is null then/);
  assert.match(serverSource, /if \(userError \|\| !user\)/);
});

test("Parent dashboard 7. URL connection changes are checked against the own approved list", () => {
  const serverSource = readFileSync(
    join(process.cwd(), "lib/parent-dashboard/server.ts"),
    "utf8",
  );

  assert.match(serverSource, /loadConnectionState\(supabase\)/);
  assert.match(
    serverSource,
    /connection\.connectionId === connectionId[\s\S]*connection\.status === "APPROVED"/,
  );
  assert.match(serverSource, /reason: "NOT_FOUND"/);
});

test("Parent dashboard 8. Contract rejects identifiers and private profile data", () => {
  for (const forbiddenKey of [
    "student_id",
    "parent_id",
    "user_id",
    "email",
    "birth_date",
    "student_code",
  ]) {
    assert.equal(
      parseParentChildLearningDashboard({
        ...emptyParentDashboardPayload,
        [forbiddenKey]: "private",
      }),
      null,
    );
  }
});

test("Parent dashboard 9. Migration never reads or returns answers and solutions", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0009_parent_learning_dashboard.sql",
    ),
    "utf8",
  );

  assert.doesNotMatch(migration, /question_solutions/);
  assert.doesNotMatch(migration, /normalized_answer/);
  assert.doesNotMatch(migration, /correct_answer/);
  assert.doesNotMatch(migration, /solution_steps/);
  assert.doesNotMatch(migration, /'question_id'/);
});

test("Parent dashboard 10. A Student without attempts gets safe empty states", () => {
  const parsed = parseParentChildLearningDashboard(
    emptyParentDashboardPayload,
  );

  assert.ok(parsed);
  assert.equal(parsed.currentPractice, null);
  assert.deepEqual(parsed.recentAttempts, []);
  assert.equal(parsed.summary.averageAccuracyPercent, null);
  assert.equal(parsed.skills.every((skill) => skill.answeredCount === 0), true);
});

test("Parent dashboard 11. An in-progress attempt exposes aggregate progress only", () => {
  const parsed = parseParentChildLearningDashboard({
    ...emptyParentDashboardPayload,
    summary: {
      completed_attempt_count: 0,
      total_answered: 8,
      total_correct: 6,
      average_accuracy_percent: 75,
      last_activity_at: "2026-07-29T03:00:00.000Z",
    },
    current_practice: {
      unit_title: "Các số trong phạm vi 10",
      answered_count: 8,
      total_questions: 24,
      correct_count: 6,
      updated_at: "2026-07-29T03:00:00.000Z",
    },
    skills: PARENT_SKILL_CODES.map((skillCode, index) => ({
      skill_code: skillCode,
      answered_count: 2,
      correct_count: index < 2 ? 2 : 1,
      accuracy_percent: index < 2 ? 100 : 50,
    })),
    recent_attempts: [
      {
        unit_title: "Các số trong phạm vi 10",
        attempt_number: 2,
        status: "IN_PROGRESS",
        answered_count: 8,
        total_questions: 24,
        correct_count: 6,
        accuracy_percent: 75,
        activity_at: "2026-07-29T03:00:00.000Z",
        completed_at: null,
      },
    ],
  });

  assert.ok(parsed?.currentPractice);
  assert.equal(parsed.currentPractice.answeredCount, 8);
  assert.equal(parsed.currentPractice.totalQuestions, 24);
});

test("Parent dashboard 12. Multiple completed attempts preserve aggregate totals", () => {
  const parsed = parseParentChildLearningDashboard({
    ...emptyParentDashboardPayload,
    summary: {
      completed_attempt_count: 2,
      total_answered: 48,
      total_correct: 38,
      average_accuracy_percent: 79.2,
      last_activity_at: "2026-07-29T04:00:00.000Z",
    },
    skills: PARENT_SKILL_CODES.map((skillCode) => ({
      skill_code: skillCode,
      answered_count: 12,
      correct_count: skillCode === "COUNT_RECOGNIZE" ? 11 : 9,
      accuracy_percent:
        skillCode === "COUNT_RECOGNIZE" ? 91.7 : 75,
    })),
    recent_attempts: [1, 2].map((attemptNumber) => ({
      unit_title: "Các số trong phạm vi 10",
      attempt_number: attemptNumber,
      status: "COMPLETED",
      answered_count: 24,
      total_questions: 24,
      correct_count: attemptNumber === 1 ? 18 : 20,
      accuracy_percent: attemptNumber === 1 ? 75 : 83.3,
      activity_at: `2026-07-2${attemptNumber}T04:00:00.000Z`,
      completed_at: `2026-07-2${attemptNumber}T04:00:00.000Z`,
    })),
  });

  assert.ok(parsed);
  assert.equal(parsed.summary.completedAttemptCount, 2);
  assert.equal(parsed.summary.totalAnswered, 48);
  assert.equal(parsed.summary.totalCorrect, 38);
});

test("Parent dashboard 13. Known skill subsets are accepted and malformed skills fail closed", () => {
  const parsed = parseParentChildLearningDashboard(
    emptyParentDashboardPayload,
  );
  assert.ok(parsed);
  assert.deepEqual(
    parsed.skills.map((skill) => skill.skillCode),
    PARENT_SKILL_CODES,
  );

  assert.ok(
    parseParentChildLearningDashboard({
      ...emptyParentDashboardPayload,
      skills: emptyParentDashboardPayload.skills.slice(0, 3),
    }),
  );
  assert.equal(
    parseParentChildLearningDashboard({
      ...emptyParentDashboardPayload,
      skills: [
        ...emptyParentDashboardPayload.skills,
        emptyParentDashboardPayload.skills[0],
      ],
    }),
    null,
  );
});

test("Parent dashboard 14. Goals are read-only and ARCHIVED is rejected", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0009_parent_learning_dashboard.sql",
    ),
    "utf8",
  );
  assert.match(migration, /goal\.status in \('ACTIVE', 'COMPLETED'\)/);

  assert.equal(
    parseParentChildLearningDashboard({
      ...emptyParentDashboardPayload,
      goals: [
        {
          title: "Đọc số mỗi ngày",
          target_count: 10,
          target_date: null,
          status: "ARCHIVED",
          completed_at: "2026-07-29T04:00:00.000Z",
        },
      ],
    }),
    null,
  );
});

test("Parent dashboard 15. Revocation removes read access on the next call", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0009_parent_learning_dashboard.sql",
    ),
    "utf8",
  );

  assert.match(migration, /connection\.status = 'APPROVED'/);
  assert.doesNotMatch(migration, /security invoker/i);
  assert.doesNotMatch(migration, /cache|materialized/i);
});

test("Parent dashboard 16. Malformed or nullable response fields fail safely", () => {
  assert.ok(
    parseParentChildLearningDashboard(emptyParentDashboardPayload),
  );
  assert.equal(
    parseParentChildLearningDashboard({
      ...emptyParentDashboardPayload,
      summary: {
        ...emptyParentDashboardPayload.summary,
        total_answered: "0",
      },
    }),
    null,
  );
  assert.equal(parseParentChildLearningDashboard(null), null);
});

test("Parent dashboard 17. Existing Student learning routes remain separate", () => {
  const pageSource = readFileSync(
    join(
      process.cwd(),
      "app/parent/children/[connectionId]/page.tsx",
    ),
    "utf8",
  );

  assert.doesNotMatch(pageSource, /submit_practice_answer|completeGoal|archiveGoal/);
  for (const pathname of [
    "/dashboard",
    "/learn",
    "/lessons",
    "/results",
    "/goals",
  ]) {
    assert.equal(getAuthNavigationDecision(pathname, true), "ALLOW");
  }
});

test("Parent dashboard 18. Student and Parent logout keep the canonical flow", () => {
  const headerSource = readFileSync(
    join(process.cwd(), "components/HeaderNavigation.tsx"),
    "utf8",
  );
  const logoutSource = readFileSync(
    join(process.cwd(), "components/LogoutForm.tsx"),
    "utf8",
  );

  assert.match(headerSource, /<LogoutForm/);
  assert.match(logoutSource, /useActionState/);
  assert.match(logoutSource, /Đang đăng xuất…/);
});

test("Parent dashboard 19. Parent routes are protected and demo stays independent", () => {
  const parentNavigation = getHeaderNavigation(true, "PARENT", true);
  const demoSource = readFileSync(
    join(process.cwd(), "app/demo/page.tsx"),
    "utf8",
  );

  assert.deepEqual(
    parentNavigation.map((item) => item.label),
    ["Tổng quan", "Kết nối"],
  );
  assert.equal(
    getAuthNavigationDecision("/parent/children/example", false),
    "LOGIN",
  );
  assert.doesNotMatch(demoSource, /parent-dashboard|parent_student_connections/);
});

const weeklyMigrationPath = join(
  process.cwd(),
  "supabase/migrations/0010_parent_weekly_learning_summary.sql",
);

const weeklySummaryPayload = {
  period: {
    timezone: "Asia/Ho_Chi_Minh",
    start_date: "2026-07-23",
    end_date: "2026-07-29",
  },
  metrics: {
    completed_attempt_count: 2,
    total_answered: 48,
    total_correct: 38,
    accuracy_percent: 79.2,
    active_day_count: 2,
    completed_goal_count: 1,
    last_activity_at: "2026-07-29T04:00:00.000Z",
  },
  skills: PARENT_SKILL_CODES.map((skillCode, index) => ({
    skill_code: skillCode,
    answered_count: 12,
    correct_count: [11, 10, 8, 9][index],
    accuracy_percent: [91.7, 83.3, 66.7, 75][index],
  })),
};

const emptyWeeklySummaryPayload = {
  period: {
    timezone: "Asia/Ho_Chi_Minh",
    start_date: "2026-07-23",
    end_date: "2026-07-29",
  },
  metrics: {
    completed_attempt_count: 0,
    total_answered: 0,
    total_correct: 0,
    accuracy_percent: null,
    active_day_count: 0,
    completed_goal_count: 0,
    last_activity_at: null,
  },
  skills: PARENT_SKILL_CODES.map((skillCode) => ({
    skill_code: skillCode,
    answered_count: 0,
    correct_count: 0,
    accuracy_percent: null,
  })),
};

test("Parent weekly 1. APPROVED owned connection is the only report boundary", () => {
  const migration = readFileSync(weeklyMigrationPath, "utf8");
  assert.match(migration, /private\.require_connection_actor\('PARENT'\)/);
  assert.match(
    migration,
    /connection\.parent_user_id = v_parent_user_id/,
  );
  assert.match(migration, /connection\.status = 'APPROVED'/);
});

test("Parent weekly 2. Another Parent connection cannot resolve a Student", () => {
  const migration = readFileSync(weeklyMigrationPath, "utf8");
  assert.match(migration, /connection\.id = p_connection_id/);
  assert.match(
    migration,
    /connection\.parent_user_id = v_parent_user_id/,
  );
});

for (const status of [
  "PENDING",
  "REJECTED",
  "CANCELLED",
  "REVOKED",
] as const) {
  test(`Parent weekly connection status ${status} is rejected`, () => {
    const migration = readFileSync(weeklyMigrationPath, "utf8");
    const boundary = migration.slice(
      migration.indexOf("select\n    count(*),\n    max(connection.student_user_id"),
      migration.indexOf("-- Seven calendar days"),
    );
    assert.match(boundary, /status = 'APPROVED'/);
    assert.doesNotMatch(boundary, new RegExp(status));
  });
}

test("Parent weekly 7. Student role cannot call the Parent report", () => {
  const migration = readFileSync(weeklyMigrationPath, "utf8");
  assert.match(migration, /require_connection_actor\('PARENT'\)/);
  assert.doesNotMatch(migration, /require_connection_actor\('STUDENT'\)/);
});

test("Parent weekly 8. Guest has no public or anon execute permission", () => {
  const migration = readFileSync(weeklyMigrationPath, "utf8");
  assert.match(
    migration,
    /revoke all on function public\.get_parent_child_weekly_summary\(uuid\)[\s\S]*from public/,
  );
  assert.match(
    migration,
    /revoke all on function public\.get_parent_child_weekly_summary\(uuid\)[\s\S]*from anon/,
  );
  assert.match(migration, /to authenticated/);
});

test("Parent weekly 9. Empty state does not present zero percent as failure", () => {
  const parsed = parseParentWeeklySummary(emptyWeeklySummaryPayload);
  assert.ok(parsed);
  const text = buildParentWeeklySummaryText(parsed);
  assert.equal(
    text,
    "Chưa có lượt luyện tập hoàn thành trong 7 ngày gần nhất.",
  );
  assert.doesNotMatch(text, /0%/);
});

test("Parent weekly 10. Report period is seven Vietnam calendar days", () => {
  const migration = readFileSync(weeklyMigrationPath, "utf8");
  const parsed = parseParentWeeklySummary(weeklySummaryPayload);
  assert.ok(parsed);
  assert.match(migration, /Asia\/Ho_Chi_Minh/);
  assert.match(migration, /v_report_start_date := v_report_end_date - 6/);
  assert.equal(formatParentWeeklyPeriod(parsed), "23/07/2026 – 29/07/2026");
  assert.equal(
    parseParentWeeklySummary({
      ...weeklySummaryPayload,
      period: {
        ...weeklySummaryPayload.period,
        start_date: "2026-07-22",
      },
    }),
    null,
  );
});

test("Parent weekly 11. Completed attempts outside the window are excluded", () => {
  const migration = readFileSync(weeklyMigrationPath, "utf8");
  assert.match(
    migration,
    /attempt\.completed_at >= v_report_start[\s\S]*attempt\.completed_at <= v_report_end/,
  );
  assert.match(migration, /attempt\.status = 'COMPLETED'/);
  assert.doesNotMatch(migration, /attempt\.status = 'IN_PROGRESS'/);
});

test("Parent weekly 12. Active days count distinct Vietnam calendar dates", () => {
  const migration = readFileSync(weeklyMigrationPath, "utf8");
  assert.match(migration, /count\(distinct activity\.activity_date\)/);
  assert.match(
    migration,
    /answered_at at time zone 'Asia\/Ho_Chi_Minh'/,
  );
});

test("Parent weekly 13. Skills with fewer than three answers get no label", () => {
  const parsed = parseParentWeeklySummary({
    ...weeklySummaryPayload,
    metrics: {
      ...weeklySummaryPayload.metrics,
      completed_attempt_count: 1,
      total_answered: 8,
      total_correct: 5,
      accuracy_percent: 62.5,
    },
    skills: PARENT_SKILL_CODES.map((skillCode) => ({
      skill_code: skillCode,
      answered_count: 2,
      correct_count: skillCode === "COUNT_RECOGNIZE" ? 2 : 1,
      accuracy_percent:
        skillCode === "COUNT_RECOGNIZE" ? 100 : 50,
    })),
  });
  assert.ok(parsed);
  const insights = getParentWeeklySkillInsights(parsed);
  assert.equal(insights.bestSkill, null);
  assert.equal(insights.reviewSkill, null);
  assert.equal(
    insights.message,
    "Chưa đủ dữ liệu để đánh giá kỹ năng.",
  );
});

test("Parent weekly 14. Skill ties follow the fixed catalog order", () => {
  const parsed = parseParentWeeklySummary({
    ...weeklySummaryPayload,
    metrics: {
      ...weeklySummaryPayload.metrics,
      total_answered: 16,
      total_correct: 12,
      accuracy_percent: 75,
    },
    skills: PARENT_SKILL_CODES.map((skillCode) => ({
      skill_code: skillCode,
      answered_count: 4,
      correct_count: 3,
      accuracy_percent: 75,
    })),
  });
  assert.ok(parsed);
  const insights = getParentWeeklySkillInsights(parsed);
  assert.equal(insights.bestSkill?.skillCode, "COUNT_RECOGNIZE");
  assert.equal(insights.reviewSkill?.skillCode, "READ_WRITE_MATCH");
});

test("Parent weekly 15. Response contains no per-question data or PII", () => {
  const migration = readFileSync(weeklyMigrationPath, "utf8");
  for (const forbidden of [
    "question_solutions",
    "normalized_answer",
    "correct_answer",
    "solution_steps",
    "'question_id'",
    "'student_id'",
    "'parent_user_id'",
    "'email'",
    "'birth_date'",
    "'student_code'",
  ]) {
    assert.doesNotMatch(migration, new RegExp(forbidden));
  }
});

test("Parent weekly 16. RPC snake_case parses to the canonical contract", () => {
  const parsed = parseParentWeeklySummary(weeklySummaryPayload);
  assert.ok(parsed);
  assert.equal(parsed.period.timezone, "Asia/Ho_Chi_Minh");
  assert.equal(parsed.metrics.completedAttemptCount, 2);
  assert.equal(parsed.metrics.totalCorrect, 38);
  assert.deepEqual(
    parsed.skills.map((skill) => skill.skillCode),
    PARENT_SKILL_CODES,
  );
  assert.equal(
    parseParentWeeklySummary({
      ...weeklySummaryPayload,
      student_id: "private",
    }),
    null,
  );
});

test("Parent weekly 17. Existing Parent dashboard remains available if weekly data fails", () => {
  const serverSource = readFileSync(
    join(process.cwd(), "lib/parent-dashboard/server.ts"),
    "utf8",
  );
  const pageSource = readFileSync(
    join(
      process.cwd(),
      "app/parent/children/[connectionId]/page.tsx",
    ),
    "utf8",
  );
  assert.match(serverSource, /weeklySummary: ParentWeeklySummary \| null/);
  assert.match(
    serverSource,
    /ok: true,\s+dashboard,\s+weeklySummary,/,
  );
  assert.match(pageSource, /Chưa thể tải báo cáo 7 ngày/);
});

test("Parent weekly 18. Student learning and logout flows are unchanged", () => {
  const pageSource = readFileSync(
    join(
      process.cwd(),
      "app/parent/children/[connectionId]/page.tsx",
    ),
    "utf8",
  );
  const logoutSource = readFileSync(
    join(process.cwd(), "components/LogoutForm.tsx"),
    "utf8",
  );
  assert.doesNotMatch(
    pageSource,
    /submit_practice_answer|completeGoal|archiveGoal/,
  );
  assert.match(logoutSource, /Đang đăng xuất…/);
  for (const pathname of [
    "/learn",
    "/lessons",
    "/results",
    "/goals",
    "/profile",
  ]) {
    assert.equal(getAuthNavigationDecision(pathname, true), "ALLOW");
  }
});

test("Parent weekly 19. Connection management remains separate and demo stays public", () => {
  const connectionsSource = readFileSync(
    join(process.cwd(), "components/ConnectionsManager.tsx"),
    "utf8",
  );
  const demoSource = readFileSync(
    join(process.cwd(), "app/demo/page.tsx"),
    "utf8",
  );
  assert.match(connectionsSource, /performAction/);
  assert.match(connectionsSource, /REVOKE/);
  assert.doesNotMatch(
    demoSource,
    /get_parent_child_weekly_summary|weeklySummary/,
  );
  assert.equal(getAuthNavigationDecision("/demo", false), "ALLOW");
});

const goalSuggestionMigrationPath = join(
  process.cwd(),
  "supabase/migrations/0011_parent_goal_suggestions.sql",
);
const suggestionId = "22222222-2222-4222-8222-222222222222";
const connectionId = "33333333-3333-4333-8333-333333333333";
const goalId = "44444444-4444-4444-8444-444444444444";
const acceptedGoalId = "55555555-5555-4555-8555-555555555555";

const parentSuggestionPayload = {
  suggestion_id: suggestionId,
  kind: "NEW_GOAL",
  goal_id: null,
  goal_title: null,
  proposed_title: "Ôn lại cách tách số",
  proposed_target_date: "2026-08-05",
  message: "Em học theo nhịp phù hợp nhé.",
  status: "PENDING",
  created_at: "2026-07-29T08:00:00.000Z",
  responded_at: null,
  withdrawn_at: null,
  accepted_goal: null,
};

test("Goal suggestion 1. Parent without an owned APPROVED connection cannot send", () => {
  const migration = readFileSync(goalSuggestionMigrationPath, "utf8");
  const sendFunction = migration.slice(
    migration.indexOf("create function public.send_parent_goal_suggestion"),
    migration.indexOf("create function public.withdraw_parent_goal_suggestion"),
  );
  assert.match(sendFunction, /private\.require_connection_actor\('PARENT'\)/);
  assert.match(
    sendFunction,
    /connection\.parent_user_id = v_parent_user_id/,
  );
  assert.match(sendFunction, /connection\.status = 'APPROVED'/);
});

test("Goal suggestion 2. Non-approved connection states never authorize Parent actions", () => {
  const migration = readFileSync(goalSuggestionMigrationPath, "utf8");
  for (const functionName of [
    "get_parent_goal_suggestion_context",
    "send_parent_goal_suggestion",
    "withdraw_parent_goal_suggestion",
  ]) {
    const start = migration.indexOf(`create function public.${functionName}`);
    const next = migration.indexOf("create function public.", start + 20);
    const source = migration.slice(start, next < 0 ? undefined : next);
    assert.match(source, /connection\.status = 'APPROVED'/);
    for (const status of [
      "PENDING",
      "REJECTED",
      "REVOKED",
      "CANCELLED",
    ]) {
      assert.doesNotMatch(
        source,
        new RegExp(`connection\\.status = '${status}'`),
      );
    }
  }
});

test("Goal suggestion 3. Parent can target only an ACTIVE goal owned by the connected Student", () => {
  const migration = readFileSync(goalSuggestionMigrationPath, "utf8");
  assert.match(migration, /goal\.id = v_goal_id/);
  assert.match(migration, /goal\.student_id = v_student_user_id/);
  assert.match(migration, /goal\.status = 'ACTIVE'/);
});

test("Goal suggestion 4. Parent RPCs never update Student learning goals directly", () => {
  const migration = readFileSync(goalSuggestionMigrationPath, "utf8");
  const parentFunctions = migration.slice(
    migration.indexOf("create function public.get_parent_goal_suggestion_context"),
    migration.indexOf("create function public.get_my_parent_goal_suggestions"),
  );
  assert.doesNotMatch(parentFunctions, /update public\.learning_goals/);
  assert.doesNotMatch(parentFunctions, /insert into public\.learning_goals/);
  assert.doesNotMatch(parentFunctions, /delete from public\.learning_goals/);
});

test("Goal suggestion 5. Only the receiving Student can list and decide suggestions", () => {
  const migration = readFileSync(goalSuggestionMigrationPath, "utf8");
  const studentFunctions = migration.slice(
    migration.indexOf("create function public.get_my_parent_goal_suggestions"),
    migration.indexOf("alter table public.parent_goal_suggestions"),
  );
  assert.match(
    studentFunctions,
    /private\.require_connection_actor\('STUDENT'\)/g,
  );
  assert.match(
    studentFunctions,
    /suggestion\.student_user_id = v_student_user_id/,
  );
});

test("Goal suggestion 6. Another Parent cannot withdraw a suggestion", () => {
  const migration = readFileSync(goalSuggestionMigrationPath, "utf8");
  const withdrawFunction = migration.slice(
    migration.indexOf("create function public.withdraw_parent_goal_suggestion"),
    migration.indexOf("create function public.get_my_parent_goal_suggestions"),
  );
  assert.match(
    withdrawFunction,
    /suggestion\.parent_user_id = v_parent_user_id/,
  );
  assert.match(
    withdrawFunction,
    /connection\.parent_user_id = v_parent_user_id/,
  );
});

test("Goal suggestion 7. Accepting a new proposal creates one ACTIVE Student goal", () => {
  const migration = readFileSync(goalSuggestionMigrationPath, "utf8");
  const respondFunction = migration.slice(
    migration.indexOf("create function public.respond_parent_goal_suggestion"),
    migration.indexOf("alter table public.parent_goal_suggestions"),
  );
  assert.equal(
    (respondFunction.match(/insert into public\.learning_goals/g) ?? [])
      .length,
    1,
  );
  assert.match(respondFunction, /v_student_user_id/);
  assert.match(respondFunction, /v_proposed_title/);
  assert.match(respondFunction, /\n      1,\n/);
  assert.match(respondFunction, /'ACTIVE'/);
  assert.match(respondFunction, /accepted_goal_id/);
});

test("Goal suggestion 8. Repeated ACCEPT returns the same result before any second insert", () => {
  const migration = readFileSync(goalSuggestionMigrationPath, "utf8");
  const respondFunction = migration.slice(
    migration.indexOf("create function public.respond_parent_goal_suggestion"),
    migration.indexOf("alter table public.parent_goal_suggestions"),
  );
  assert.ok(
    respondFunction.indexOf("if v_status = v_target_status then") <
      respondFunction.indexOf("insert into public.learning_goals"),
  );
  assert.match(
    migration,
    /parent_goal_suggestions_one_pending_target_idx/,
  );
});

test("Goal suggestion 9. DECLINED records consent without creating a goal", () => {
  const migration = readFileSync(goalSuggestionMigrationPath, "utf8");
  const respondFunction = migration.slice(
    migration.indexOf("create function public.respond_parent_goal_suggestion"),
    migration.indexOf("alter table public.parent_goal_suggestions"),
  );
  const declineBlock = respondFunction.slice(
    respondFunction.indexOf("if v_target_status = 'DECLINED' then"),
    respondFunction.indexOf("if v_kind = 'NEW_GOAL' then"),
  );
  assert.match(declineBlock, /status = 'DECLINED'/);
  assert.doesNotMatch(declineBlock, /learning_goals/);
});

test("Goal suggestion 10. Accepting an existing-goal comment does not mutate the goal", () => {
  const migration = readFileSync(goalSuggestionMigrationPath, "utf8");
  const respondFunction = migration.slice(
    migration.indexOf("create function public.respond_parent_goal_suggestion"),
    migration.indexOf("alter table public.parent_goal_suggestions"),
  );
  assert.doesNotMatch(respondFunction, /update public\.learning_goals/);
  assert.doesNotMatch(respondFunction, /delete from public\.learning_goals/);
  assert.match(
    respondFunction,
    /v_kind = 'EXISTING_GOAL_COMMENT'[\s\S]*goal\.status = 'ACTIVE'/,
  );
});

test("Goal suggestion 11. Withdraw is conditional on PENDING and idempotent", () => {
  const migration = readFileSync(goalSuggestionMigrationPath, "utf8");
  const withdrawFunction = migration.slice(
    migration.indexOf("create function public.withdraw_parent_goal_suggestion"),
    migration.indexOf("create function public.get_my_parent_goal_suggestions"),
  );
  assert.match(withdrawFunction, /if v_status = 'WITHDRAWN' then/);
  assert.match(withdrawFunction, /v_status <> 'PENDING'/);
  assert.match(
    withdrawFunction,
    /suggestion\.status = 'PENDING'/,
  );
});

test("Goal suggestion 12. Accept and withdraw serialize on the same suggestion lock", () => {
  const migration = readFileSync(goalSuggestionMigrationPath, "utf8");
  assert.equal(
    (
      migration.match(
        /'goal-suggestion:' \|\| p_suggestion_id::text/g,
      ) ?? []
    ).length,
    2,
  );
  assert.match(migration, /pg_advisory_xact_lock/);
});

test("Goal suggestion 13. Revoked connection blocks new Parent and Student decisions", () => {
  const migration = readFileSync(goalSuggestionMigrationPath, "utf8");
  const respondFunction = migration.slice(
    migration.indexOf("create function public.respond_parent_goal_suggestion"),
    migration.indexOf("alter table public.parent_goal_suggestions"),
  );
  assert.match(respondFunction, /connection\.status = 'APPROVED'/);
  assert.doesNotMatch(respondFunction, /connection\.status = 'REVOKED'/);
  assert.match(migration, /'connection_active'/);
});

test("Goal suggestion 14. Existing goal lifecycle invariants remain untouched", () => {
  const lifecycleMigration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0006_fix_learning_goal_lifecycle.sql",
    ),
    "utf8",
  );
  assert.match(lifecycleMigration, /ACTIVE' and new\.status = 'COMPLETED/);
  assert.match(lifecycleMigration, /COMPLETED' and new\.status = 'ARCHIVED/);
  assert.match(lifecycleMigration, /ARCHIVED' and new\.status = 'COMPLETED/);
  assert.doesNotMatch(
    readFileSync(goalSuggestionMigrationPath, "utf8"),
    /drop trigger learning_goals|drop constraint learning_goals/,
  );
});

test("Goal suggestion 15. Lesson, practice and review flows stay separate", () => {
  const routeSource = readFileSync(
    join(process.cwd(), "app/api/goal-suggestions/route.ts"),
    "utf8",
  );
  assert.doesNotMatch(
    routeSource,
    /submit_practice_answer|get_practice_review|start_or_resume_practice/,
  );
  for (const pathname of [
    "/learn",
    "/lessons",
    "/practice/example",
    "/review/example",
  ]) {
    assert.equal(getAuthNavigationDecision(pathname, true), "ALLOW");
  }
});

test("Goal suggestion 16. Parent seven-day reporting remains intact", () => {
  const weeklyMigration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0010_parent_weekly_learning_summary.sql",
    ),
    "utf8",
  );
  const parentPage = readFileSync(
    join(
      process.cwd(),
      "app/parent/children/[connectionId]/page.tsx",
    ),
    "utf8",
  );
  assert.match(weeklyMigration, /get_parent_child_weekly_summary/);
  assert.match(parentPage, /Báo cáo 7 ngày gần nhất/);
  assert.match(parentPage, /ParentGoalSuggestions/);
});

test("Goal suggestion 17. Contracts expose no learning answers or private profile data", () => {
  const migration = readFileSync(goalSuggestionMigrationPath, "utf8");
  for (const forbidden of [
    "question_solutions",
    "normalized_answer",
    "correct_answer",
    "solution_steps",
    "email",
    "birth_date",
    "student_code",
    "token",
    "cookie",
  ]) {
    assert.doesNotMatch(migration, new RegExp(forbidden, "i"));
  }

  const context = parseParentGoalSuggestionContext({
    active_goals: [
      {
        goal_id: goalId,
        title: "Hoàn thành một bài luyện tập",
        target_date: null,
      },
    ],
    suggestions: [parentSuggestionPayload],
  });
  assert.ok(context);
  assert.equal(context.suggestions[0]?.status, "PENDING");
});

test("Goal suggestion 18. Browser receives no direct suggestion table grant", () => {
  const migration = readFileSync(goalSuggestionMigrationPath, "utf8");
  assert.match(
    migration,
    /revoke all on table public\.parent_goal_suggestions from authenticated/,
  );
  assert.doesNotMatch(
    migration,
    /grant (select|insert|update|delete)[\s\S]*parent_goal_suggestions/i,
  );
  assert.match(migration, /alter table public\.parent_goal_suggestions enable row level security/);
});

test("Goal suggestion 19. UI and request contracts support keyboard-safe single-flight decisions", () => {
  const parentSource = readFileSync(
    join(process.cwd(), "components/ParentGoalSuggestions.tsx"),
    "utf8",
  );
  const studentSource = readFileSync(
    join(process.cwd(), "app/dashboard/GoalsManager.tsx"),
    "utf8",
  );
  const gate = createGoalSuggestionGate();
  assert.equal(gate.tryStart(), true);
  assert.equal(gate.tryStart(), false);
  gate.reset();
  assert.equal(gate.tryStart(), true);
  assert.match(parentSource, /<dialog/);
  assert.match(parentSource, /showModal/);
  assert.match(parentSource, /aria-live="polite"/);
  assert.match(studentSource, /Đang đồng ý…/);
  assert.match(studentSource, /Không áp dụng/);
  assert.ok(
    parseGoalSuggestionRequest({
      action: "SEND_COMMENT",
      connectionId,
      goalId,
      message: "Em thử chia nhỏ mục tiêu nhé.",
    }),
  );
});

test("Goal suggestion 20. Student acceptance uses real RPC data and no UI fixtures", () => {
  const studentState = parseStudentGoalSuggestionState({
    suggestions: [
      {
        ...parentSuggestionPayload,
        status: "ACCEPTED",
        responded_at: "2026-07-29T08:05:00.000Z",
        accepted_goal: {
          id: acceptedGoalId,
          title: "Ôn lại cách tách số",
          target_count: 1,
          target_date: "2026-08-05",
          status: "ACTIVE",
          created_at: "2026-07-29T08:05:00.000Z",
          completed_at: null,
          archived_at: null,
        },
        parent_display_name: "Phụ huynh",
        connection_active: true,
      },
    ],
  });
  assert.ok(studentState);
  assert.equal(
    studentState.suggestions[0]?.acceptedGoal?.id,
    acceptedGoalId,
  );

  const studentSource = readFileSync(
    join(process.cwd(), "app/dashboard/GoalsManager.tsx"),
    "utf8",
  );
  assert.match(studentSource, /fetch\\?|\bfetch\(/);
  assert.match(studentSource, /router\.refresh\(\)/);
  assert.doesNotMatch(studentSource, /mock|fixture|fake/i);
});

const teacherMigrationPath = join(
  process.cwd(),
  "supabase/migrations/0012_teacher_invitation_foundation.sql",
);
const teacherTestCode = `PLV-TCH-${"A".repeat(32)}`;

test("Teacher 1. Invitation code has at least 128 bits and only its SHA-256 hash is stored", () => {
  const migration = readFileSync(teacherMigrationPath, "utf8");
  assert.match(
    migration,
    /extensions\.gen_random_bytes\(16\)/,
  );
  assert.match(
    migration,
    /extensions\.digest\(v_code, 'sha256'\)/,
  );
  assert.match(
    migration,
    /code_hash bytea not null unique/,
  );
  assert.doesNotMatch(migration, /code_plaintext|invitation_code text/);
  assert.equal(isTeacherInvitationCode(teacherTestCode), true);
});

test("Teacher 2. Issuance and revocation remain Postgres-owner-only private operations", () => {
  const migration = readFileSync(teacherMigrationPath, "utf8");
  for (const signature of [
    "private.issue_teacher_invitation(timestamptz)",
    "private.revoke_teacher_invitation(uuid)",
  ]) {
    assert.match(
      migration,
      new RegExp(
        `revoke all\\s+on function ${signature.replace(/[().]/g, "\\$&")}\\s+from authenticated`,
      ),
    );
  }
  assert.doesNotMatch(
    migration,
    /grant execute\s+on function private\.(issue|revoke)_teacher_invitation/,
  );
});

test("Teacher 3. Invitation lifecycle only leaves AVAILABLE for terminal states", () => {
  const migration = readFileSync(teacherMigrationPath, "utf8");
  assert.match(
    migration,
    /status in \('AVAILABLE', 'CLAIMED', 'REVOKED', 'EXPIRED'\)/,
  );
  assert.match(
    migration,
    /if old\.status <> 'AVAILABLE' then/,
  );
  assert.match(
    migration,
    /new\.status in \('CLAIMED', 'REVOKED', 'EXPIRED'\)/,
  );
  assert.match(
    migration,
    /Teacher invitation decision cannot change/,
  );
});

test("Teacher 4. Activation requires auth uid, Teacher role and confirmed email", () => {
  const migration = readFileSync(teacherMigrationPath, "utf8");
  const activation = migration.slice(
    migration.indexOf(
      "create function public.activate_teacher_invitation",
    ),
    migration.indexOf(
      "alter table public.teacher_invitations enable row level security",
    ),
  );
  assert.match(activation, /v_current_user_id uuid := auth\.uid\(\)/);
  assert.match(activation, /v_current_role <> 'TEACHER'/);
  assert.match(activation, /email_confirmed_at is not null/);
  assert.match(activation, /security definer/);
  assert.match(activation, /set search_path = ''/);
});

test("Teacher 5. Wrong, expired, revoked or claimed-by-another code fails without status disclosure", () => {
  const migration = readFileSync(teacherMigrationPath, "utf8");
  assert.match(
    migration,
    /return jsonb_build_object\('activated', false\)/,
  );
  assert.match(
    migration,
    /v_invitation_status <> 'AVAILABLE'/,
  );
  const failed = parseTeacherActivationRpcResult({
    activated: false,
  });
  assert.deepEqual(failed, { activated: false });
  assert.equal(
    parseTeacherActivationRpcResult({
      activated: false,
      status: "REVOKED",
    }),
    null,
  );
});

test("Teacher 6. One invitation cannot activate two Teachers", () => {
  const migration = readFileSync(teacherMigrationPath, "utf8");
  assert.match(
    migration,
    /teacher-invitation:'\s+\|\|\s+encode\(v_code_hash, 'hex'\)/,
  );
  assert.match(
    migration,
    /invitation\.status = 'AVAILABLE'\s+and invitation\.expires_at > now\(\)/,
  );
  assert.match(
    migration,
    /teacher_user_id = v_current_user_id/,
  );
  assert.match(
    migration,
    /get diagnostics v_affected_count = row_count/,
  );
});

test("Teacher 7. Repeated activation by the same Teacher is idempotent", () => {
  const migration = readFileSync(teacherMigrationPath, "utf8");
  assert.match(
    migration,
    /v_invitation_status = 'CLAIMED'\s+and v_invitation_teacher_user_id = v_current_user_id/,
  );
  assert.match(
    migration,
    /teacher\.invitation_id = v_invitation_id/,
  );
  assert.match(
    migration,
    /'activated',\s+true,\s+'full_name',\s+v_existing_teacher_name/,
  );
});

test("Teacher 8. Browser cannot directly inspect or mutate invitation storage", () => {
  const migration = readFileSync(teacherMigrationPath, "utf8");
  assert.match(
    migration,
    /revoke all on table public\.teacher_invitations from authenticated/,
  );
  assert.doesNotMatch(
    migration,
    /grant (select|insert|update|delete)[\s\S]{0,100}teacher_invitations/i,
  );
  assert.match(
    migration,
    /revoke all on table public\.teacher_profiles from authenticated/,
  );
  assert.doesNotMatch(
    migration,
    /grant select on table public\.teacher_profiles/,
  );
  assert.deepEqual(
    parseTeacherProfileRpcResult({
      full_name: "Nguyễn An",
      activation_status: "ACTIVE",
      activated_at: "2026-07-29T08:00:00.000Z",
    }),
    {
      fullName: "Nguyễn An",
      activatedAt: "2026-07-29T08:00:00.000Z",
    },
  );
});

test("Teacher 9. Registration carries Teacher role but never stores the invitation in auth metadata", () => {
  const actionSource = readFileSync(
    join(process.cwd(), "app/register/actions.ts"),
    "utf8",
  );
  const pageSource = readFileSync(
    join(process.cwd(), "app/register/page.tsx"),
    "utf8",
  );
  assert.match(actionSource, /role: "STUDENT" \| "PARENT" \| "TEACHER"/);
  assert.match(actionSource, /input\.role === "TEACHER"/);
  assert.doesNotMatch(
    actionSource,
    /data:\s*\{[\s\S]{0,240}invitationCode/,
  );
  assert.match(
    actionSource,
    /"\/teacher\/onboarding"/,
  );
  assert.match(pageSource, /Hãy giữ mã mời ở nơi riêng tư/);
});

test("Teacher 10. Activation request is strict and single-flight", () => {
  const parsed = parseTeacherActivationRequest({
    fullName: "  Nguyễn   An  ",
    invitationCode: teacherTestCode.toLowerCase(),
  });
  assert.deepEqual(parsed, {
    fullName: "Nguyễn An",
    invitationCode: teacherTestCode,
  });
  assert.equal(
    parseTeacherActivationRequest({
      fullName: "Nguyễn An",
      invitationCode: teacherTestCode,
      role: "TEACHER",
    }),
    null,
  );

  const gate = createTeacherActivationGate();
  assert.equal(gate.tryStart(), true);
  assert.equal(gate.tryStart(), false);
  gate.reset();
  assert.equal(gate.tryStart(), true);
});

test("Teacher 11. Teacher navigation and logo are isolated from Student and Parent areas", () => {
  const teacherNavigation = getHeaderNavigation(
    true,
    "TEACHER",
    true,
  );
  assert.deepEqual(
    teacherNavigation.map((item) => item.label),
    ["Tổng quan", "Lớp học", "Kho câu hỏi", "Bài tập", "Hồ sơ"],
  );
  assert.equal(teacherNavigation[1]?.disabled, undefined);
  assert.equal(
    teacherNavigation[1]?.activePrefixes.includes(
      "/teacher/classrooms",
    ),
    true,
  );
  assert.equal(
    getHeaderLogoHref(true, true, "TEACHER"),
    "/teacher",
  );
  assert.equal(
    getHeaderLogoHref(true, false, "TEACHER"),
    "/teacher/onboarding",
  );
  assert.equal(
    isHeaderItemActive(
      "/teacher/profile",
      teacherNavigation[0]!,
    ),
    false,
  );
  assert.equal(
    isHeaderItemActive(
      "/teacher/profile",
      teacherNavigation[4]!,
    ),
    true,
  );
});

test("Teacher 12. Guest, Student and Parent cannot enter activated Teacher pages", () => {
  assert.equal(
    getAuthNavigationDecision("/teacher", false),
    "LOGIN",
  );
  assert.equal(
    getAuthNavigationDecision("/teacher/profile", false),
    "LOGIN",
  );
  const serverSource = readFileSync(
    join(process.cwd(), "lib/teacher/server.ts"),
    "utf8",
  );
  assert.match(serverSource, /if \(profile\.role !== "TEACHER"\)/);
  assert.match(serverSource, /reason: "ACCESS_DENIED"/);
  assert.match(
    serverSource,
    /if \(!profile\.onboarding_completed\)/,
  );
});

test("Teacher 13. Unactivated Teacher is gated to activation and activated Teacher reaches dashboard", () => {
  const loginSource = readFileSync(
    join(process.cwd(), "app/login/actions.ts"),
    "utf8",
  );
  const dashboardSource = readFileSync(
    join(process.cwd(), "app/dashboard/page.tsx"),
    "utf8",
  );
  const teacherPageSource = readFileSync(
    join(process.cwd(), "app/teacher/page.tsx"),
    "utf8",
  );
  assert.match(
    loginSource,
    /profile\.onboarding_completed\s+\?\s+"\/teacher"\s+:\s+"\/teacher\/onboarding"/,
  );
  assert.match(
    dashboardSource,
    /profile\.role === "TEACHER"/,
  );
  assert.match(
    teacherPageSource,
    /redirect\("\/teacher\/onboarding"\)/,
  );
  assert.match(teacherPageSource, /Bạn chưa có lớp học/);
});

test("Teacher 14. Student and Parent registration/onboarding remain supported", () => {
  const actionSource = readFileSync(
    join(process.cwd(), "app/register/actions.ts"),
    "utf8",
  );
  const onboardingSource = readFileSync(
    join(process.cwd(), "app/onboarding/actions.ts"),
    "utf8",
  );
  assert.match(actionSource, /input\.role === "STUDENT"/);
  assert.match(actionSource, /input\.role !== "STUDENT"/);
  assert.match(onboardingSource, /profile\.role === "STUDENT"/);
  assert.match(onboardingSource, /profile\.role === "PARENT"/);
  assert.equal(
    getAuthNavigationDecision("/learn", true),
    "ALLOW",
  );
  assert.equal(
    getAuthNavigationDecision("/connections", true),
    "ALLOW",
  );
});

test("Teacher 15. Activation API returns only canonical name and no invitation details", () => {
  assert.deepEqual(
    parseTeacherActivationApiResponse({
      ok: true,
      data: { fullName: "Nguyễn An" },
    }),
    { fullName: "Nguyễn An" },
  );
  assert.equal(
    parseTeacherActivationApiResponse({
      ok: true,
      data: {
        fullName: "Nguyễn An",
        invitationId: "private",
      },
    }),
    null,
  );
  const routeSource = readFileSync(
    join(
      process.cwd(),
      "app/api/teacher/activate/route.ts",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    routeSource,
    /code_hash|expires_at|teacher_user_id|email/,
  );
});

test("Teacher 16. Teacher UI exposes real classroom and assignment foundations without fake data", () => {
  const pageSource = readFileSync(
    join(process.cwd(), "app/teacher/page.tsx"),
    "utf8",
  );
  assert.match(pageSource, /loadTeacherClassrooms/);
  assert.match(pageSource, /href="\/teacher\/classrooms"/);
  assert.doesNotMatch(
    pageSource,
    /học sinh mẫu|điểm mẫu|gradebook/i,
  );
});

const classroomMigrationPath = join(
  process.cwd(),
  "supabase/migrations/0013_classroom_foundation.sql",
);
const classroomId = "33333333-3333-4333-8333-333333333333";
const membershipId = "44444444-4444-4444-8444-444444444444";
const classroomRequestId = "55555555-5555-4555-8555-555555555555";
const classroomCode = "PLV-CLS-ABCDEFGHJK";

test("Classroom 1. Only an activated Teacher can create a classroom", () => {
  const migration = readFileSync(classroomMigrationPath, "utf8");
  const actor = migration.slice(
    migration.indexOf("create function private.require_classroom_actor"),
    migration.indexOf("create function private.generate_classroom_code"),
  );
  assert.match(actor, /v_current_role not in \('STUDENT', 'TEACHER'\)/);
  assert.match(actor, /teacher\.activation_status = 'ACTIVE'/);
  assert.match(actor, /not v_onboarding_completed/);
  assert.match(
    migration,
    /v_teacher_user_id := private\.require_classroom_actor\('TEACHER'\)/,
  );
});

test("Classroom 2. Student and Parent cannot call Teacher operations", () => {
  const serverSource = readFileSync(
    join(process.cwd(), "lib/classrooms/server.ts"),
    "utf8",
  );
  assert.match(
    serverSource,
    /createTeacherClassroom[\s\S]+getClassroomActor\("TEACHER"\)/,
  );
  assert.match(
    serverSource,
    /profile\.role !== expectedRole/,
  );
  assert.doesNotMatch(
    serverSource,
    /expectedRole:.*PARENT|ClassroomActorRole.*PARENT/,
  );
});

test("Classroom 3. Teacher reads and manages only owned classrooms", () => {
  const migration = readFileSync(classroomMigrationPath, "utf8");
  assert.match(
    migration,
    /classroom\.teacher_id = v_teacher_user_id/g,
  );
  assert.match(
    migration,
    /membership\.classroom_id = classroom\.id[\s\S]+classroom\.teacher_id = v_teacher_user_id/,
  );
  assert.doesNotMatch(
    migration,
    /using\s*\(\s*true\s*\)|with check\s*\(\s*true\s*\)/i,
  );
});

test("Classroom 4. Student preview contract accepts only safe class fields", () => {
  assert.deepEqual(
    parseClassroomPreview({
      found: true,
      classroom_name: "Toán 1A",
      grade: 1,
      teacher_display_name: "Nguyễn An",
      membership_status: null,
    }),
    {
      classroomName: "Toán 1A",
      grade: 1,
      teacherDisplayName: "Nguyễn An",
      membershipStatus: null,
    },
  );
  assert.equal(
    parseClassroomPreview({
      found: true,
      classroom_name: "Toán 1A",
      grade: 1,
      teacher_display_name: "Nguyễn An",
      membership_status: null,
      teacher_email: "private",
    }),
    null,
  );
  assert.equal(
    parseClassroomPreviewApiResponse({
      ok: true,
      data: {
        classroomName: "Toán 1A",
        grade: 1,
        teacherDisplayName: "Nguyễn An",
        membershipStatus: "PENDING",
      },
    })?.membershipStatus,
    "PENDING",
  );
});

test("Classroom 5. Student can join only a classroom matching current grade", () => {
  const migration = readFileSync(classroomMigrationPath, "utf8");
  assert.match(
    migration,
    /classroom\.grade = v_student_grade/g,
  );
  assert.match(
    migration,
    /classroom\.grade = student\.grade/,
  );
});

test("Classroom 6. Student cannot approve a membership", () => {
  const migration = readFileSync(classroomMigrationPath, "utf8");
  const respond = migration.slice(
    migration.indexOf(
      "create function public.respond_classroom_membership",
    ),
    migration.indexOf(
      "create function public.cancel_classroom_membership_request",
    ),
  );
  assert.match(
    respond,
    /private\.require_classroom_actor\('TEACHER'\)/,
  );
  assert.match(
    respond,
    /classroom\.teacher_id = v_teacher_user_id/,
  );
});

test("Classroom 7. Duplicate active requests are prevented and idempotent", () => {
  const migration = readFileSync(classroomMigrationPath, "utf8");
  assert.match(
    migration,
    /create unique index classroom_memberships_one_active_pair_idx[\s\S]+where status in \('PENDING', 'APPROVED'\)/,
  );
  assert.match(
    migration,
    /classroom-membership-pair:/,
  );
  assert.match(
    migration,
    /v_existing_status is not null[\s\S]+'status', v_existing_status/,
  );
});

test("Classroom 8. Concurrent decisions serialize and update only PENDING", () => {
  const migration = readFileSync(classroomMigrationPath, "utf8");
  const respond = migration.slice(
    migration.indexOf(
      "create function public.respond_classroom_membership",
    ),
    migration.indexOf(
      "create function public.cancel_classroom_membership_request",
    ),
  );
  assert.match(respond, /pg_advisory_xact_lock/);
  assert.match(respond, /membership\.status = 'PENDING'/);
  assert.match(respond, /get diagnostics v_affected_count = row_count/);
});

test("Classroom 9. Another Teacher cannot approve or remove a Student", () => {
  const migration = readFileSync(classroomMigrationPath, "utf8");
  for (const functionName of [
    "respond_classroom_membership",
    "remove_classroom_student",
  ]) {
    const start = migration.indexOf(
      `create function public.${functionName}`,
    );
    const body = migration.slice(start, start + 3300);
    assert.match(body, /classroom\.teacher_id = v_teacher_user_id/);
  }
});

test("Classroom 10. Student cancellation is own and PENDING scoped", () => {
  const migration = readFileSync(classroomMigrationPath, "utf8");
  const cancel = migration.slice(
    migration.indexOf(
      "create function public.cancel_classroom_membership_request",
    ),
    migration.indexOf("create function public.leave_classroom"),
  );
  assert.match(cancel, /membership\.student_id = v_student_user_id/);
  assert.match(cancel, /membership\.status = 'PENDING'/);
  assert.match(cancel, /status = 'CANCELLED'/);
});

test("Classroom 11. Student leaving is own and APPROVED scoped", () => {
  const migration = readFileSync(classroomMigrationPath, "utf8");
  const leave = migration.slice(
    migration.indexOf("create function public.leave_classroom"),
    migration.indexOf(
      "create function public.remove_classroom_student",
    ),
  );
  assert.match(leave, /membership\.student_id = v_student_user_id/);
  assert.match(leave, /membership\.status = 'APPROVED'/);
  assert.match(leave, /status = 'LEFT'/);
});

test("Classroom 12. Teacher removal is owned and APPROVED scoped", () => {
  const migration = readFileSync(classroomMigrationPath, "utf8");
  const remove = migration.slice(
    migration.indexOf(
      "create function public.remove_classroom_student",
    ),
    migration.indexOf(
      "alter table public.classrooms enable row level security",
    ),
  );
  assert.match(remove, /classroom\.teacher_id = v_teacher_user_id/);
  assert.match(remove, /membership\.status = 'APPROVED'/);
  assert.match(remove, /status = 'REMOVED'/);
});

test("Classroom 13. Database lifecycle allows only approved transitions", () => {
  const migration = readFileSync(classroomMigrationPath, "utf8");
  assert.match(
    migration,
    /old\.status = 'PENDING'[\s\S]+new\.status in \('APPROVED', 'REJECTED', 'CANCELLED'\)/,
  );
  assert.match(
    migration,
    /old\.status = 'APPROVED'[\s\S]+new\.status in \('LEFT', 'REMOVED'\)/,
  );
  assert.match(
    migration,
    /raise exception 'Invalid classroom membership transition'/,
  );
});

test("Classroom 14. RPC contracts expose no private profile or learning data", () => {
  const detail = parseTeacherClassroomDetail({
    classroom: {
      classroom_id: classroomId,
      name: "Toán 1A",
      grade: 1,
      class_code: classroomCode,
      status: "ACTIVE",
      created_at: "2026-07-29T08:00:00.000Z",
    },
    memberships: [
      {
        membership_id: membershipId,
        status: "APPROVED",
        student_display_name: "Hạ Trung",
        grade: 1,
        requested_at: "2026-07-29T08:00:00.000Z",
        responded_at: "2026-07-29T08:05:00.000Z",
      },
    ],
  });
  assert.equal(detail?.memberships.length, 1);
  assert.equal(
    parseTeacherClassroomDetail({
      classroom: detail?.classroom,
      memberships: [
        {
          membership_id: membershipId,
          status: "APPROVED",
          student_display_name: "Hạ Trung",
          grade: 1,
          requested_at: "2026-07-29T08:00:00.000Z",
          responded_at: "2026-07-29T08:05:00.000Z",
          student_code: "private",
        },
      ],
    }),
    null,
  );
  const migration = readFileSync(classroomMigrationPath, "utf8");
  assert.doesNotMatch(
    migration,
    /question_solutions|practice_answers|birth_date|student_code|email/,
  );
});

test("Classroom 15. Class codes use a clear 50-bit random alphabet", () => {
  const migration = readFileSync(classroomMigrationPath, "utf8");
  assert.match(
    migration,
    /extensions\.gen_random_bytes\(10\)/,
  );
  assert.match(
    migration,
    /ABCDEFGHJKLMNPQRSTUVWXYZ23456789/,
  );
  assert.match(migration, /class_code text not null unique/);
  assert.equal(classroomCodePattern.test(classroomCode), true);
  assert.equal(classroomCodePattern.test("PLV-CLS-0O1I234567"), false);
});

test("Classroom 16. Class code stays in POST bodies and out of storage or URLs", () => {
  const files = [
    "components/StudentClassroomsManager.tsx",
    "app/api/classrooms/preview/route.ts",
    "app/api/classrooms/request/route.ts",
  ].map((path) =>
    readFileSync(join(process.cwd(), path), "utf8"),
  );
  for (const source of files) {
    assert.doesNotMatch(
      source,
      /localStorage|sessionStorage|searchParams|console\./,
    );
  }
  const studentSource = files[0] ?? "";
  assert.match(studentSource, /method: "POST"/);
  assert.match(studentSource, /body: JSON\.stringify/);
});

test("Classroom 17. Student navigation includes Tutor while classrooms use a Dashboard card", () => {
  const studentNavigation = getHeaderNavigation(
    true,
    "STUDENT",
    true,
  );
  assert.equal(studentNavigation.length, 6);
  assert.equal(
    studentNavigation.some((item) => item.href === "/classrooms"),
    false,
  );
  assert.equal(
    getAuthNavigationDecision("/classrooms", false),
    "LOGIN",
  );
  const dashboardSource = readFileSync(
    join(process.cwd(), "app/dashboard/page.tsx"),
    "utf8",
  );
  assert.match(dashboardSource, /href="\/classrooms"/);
  assert.match(dashboardSource, /Lớp học của em/);
});

test("Classroom 18. Teacher navigation enables the real classroom route", () => {
  const teacherNavigation = getHeaderNavigation(
    true,
    "TEACHER",
    true,
  );
  const classroomItem = teacherNavigation.find(
    (item) => item.href === "/teacher/classrooms",
  );
  assert.ok(classroomItem);
  assert.equal(classroomItem.disabled, undefined);
  assert.equal(
    isHeaderItemActive("/teacher/classrooms", classroomItem),
    true,
  );
  assert.equal(
    isHeaderItemActive(
      `/teacher/classrooms/${classroomId}`,
      classroomItem,
    ),
    true,
  );
});

test("Classroom 19. Route Handlers are same-origin POST boundaries", () => {
  for (const route of ["create", "preview", "request", "action"]) {
    const source = readFileSync(
      join(
        process.cwd(),
        `app/api/classrooms/${route}/route.ts`,
      ),
      "utf8",
    );
    assert.match(source, /export async function POST/);
    assert.match(source, /isSameOriginRequest\(request\)/);
    assert.match(source, /Cache-Control": "no-store"/);
    assert.doesNotMatch(source, /service[_-]?role|console\./i);
  }
});

test("Classroom 20. UI is real, single-flight, and contains no fake assignment data", () => {
  const teacherSource = readFileSync(
    join(
      process.cwd(),
      "components/TeacherClassroomsManager.tsx",
    ),
    "utf8",
  );
  const studentSource = readFileSync(
    join(
      process.cwd(),
      "components/StudentClassroomsManager.tsx",
    ),
    "utf8",
  );
  const gate = createClassroomRequestGate();
  assert.equal(gate.tryStart(), true);
  assert.equal(gate.tryStart(), false);
  gate.reset();
  assert.equal(gate.tryStart(), true);
  assert.match(teacherSource, /crypto\.randomUUID\(\)/);
  assert.match(studentSource, /showModal\(\)/);
  assert.doesNotMatch(
    `${teacherSource}\n${studentSource}`,
    /assignment|gradebook|bài tập mẫu|học sinh mẫu/i,
  );
});

test("Classroom 21. Strict request and list contracts reject extra identity fields", () => {
  assert.deepEqual(
    parseCreateClassroomRequest({
      name: "  Toán   1A  ",
      grade: 1,
      requestId: classroomRequestId,
    }),
    {
      name: "Toán 1A",
      grade: 1,
      requestId: classroomRequestId,
    },
  );
  assert.deepEqual(
    parseClassroomActionRequest({
      membershipId,
      action: "STUDENT_CANCEL",
    }),
    {
      membershipId,
      action: "STUDENT_CANCEL",
    },
  );
  assert.equal(
    parseClassroomActionRequest({
      membershipId,
      action: "TEACHER_APPROVE",
      studentId: "private",
    }),
    null,
  );

  assert.deepEqual(
    parseStudentClassroomState({
      memberships: [
        {
          membership_id: membershipId,
          classroom_name: "Toán 1A",
          grade: 1,
          teacher_display_name: "Nguyễn An",
          status: "PENDING",
          requested_at: "2026-07-29T08:00:00.000Z",
          responded_at: null,
        },
      ],
    })?.memberships[0]?.status,
    "PENDING",
  );

  assert.equal(
    parseTeacherClassroomState({
      classrooms: [
        {
          classroom_id: classroomId,
          name: "Toán 1A",
          grade: 1,
          class_code: classroomCode,
          status: "ACTIVE",
          created_at: "2026-07-29T08:00:00.000Z",
          pending_count: 1,
          approved_count: 2,
        },
      ],
    })?.classrooms[0]?.approvedCount,
    2,
  );

  assert.equal(
    parseCreatedClassroomResult({
      classroom_id: classroomId,
      name: "Toán 1A",
      grade: 1,
      class_code: classroomCode,
      status: "ACTIVE",
      created_at: "2026-07-29T08:00:00.000Z",
    })?.classCode,
    classroomCode,
  );
});

const assignmentMigrationPath = join(
  process.cwd(),
  "supabase/migrations/0014_teacher_assignments.sql",
);
const teacherQuestionId =
  "66666666-6666-4666-8666-666666666666";
const secondTeacherQuestionId =
  "77777777-7777-4777-8777-777777777777";
const teacherAssignmentId =
  "88888888-8888-4888-8888-888888888888";
const assignmentSubmissionId =
  "99999999-9999-4999-8999-999999999999";
const assignmentRequestId =
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const assignmentTimestamp = "2026-07-29T09:00:00.000Z";

const teacherQuestionRpcFixture = {
  question_id: teacherQuestionId,
  grade: 1,
  question_type: "MULTIPLE_CHOICE",
  prompt: "Số nào lớn hơn 4?",
  options: { A: "3", B: "4", C: "5", D: "2" },
  correct_answer: "C",
  solution_steps: [
    "So sánh từng số với 4.",
    "Số 5 đứng sau 4 nên lớn hơn 4.",
  ],
  explanation: "Đáp án C là số 5.",
  status: "ACTIVE",
  created_at: assignmentTimestamp,
};

const runnerStateRpcFixture = {
  submission_id: assignmentSubmissionId,
  submission_status: "IN_PROGRESS",
  answered_count: 1,
  total_count: 2,
  assignment: {
    assignment_id: teacherAssignmentId,
    classroom_name: "Toán 1A",
    teacher_display_name: "Cô An",
    title: "Ôn tập số trong phạm vi 10",
    instructions: null,
    due_at: null,
    status: "PUBLISHED",
    effective_state: "OPEN",
    closed_at: null,
    server_now: assignmentTimestamp,
    total_count: 2,
    published_at: assignmentTimestamp,
  },
  questions: [
    {
      question_id: teacherQuestionId,
      display_order: 1,
      question_type: "MULTIPLE_CHOICE",
      prompt: "Số nào lớn hơn 4?",
      options: { A: "3", B: "4", C: "5", D: "2" },
      draft_answer: "C",
    },
    {
      question_id: secondTeacherQuestionId,
      display_order: 2,
      question_type: "NUMBER_INPUT",
      prompt: "Số liền sau số 6 là số nào?",
      options: null,
      draft_answer: null,
    },
  ],
};

test("Assignment 1. Migration is atomic and creates only the typed vertical-slice schema", () => {
  const migration = readFileSync(assignmentMigrationPath, "utf8");
  assert.match(migration, /^begin;\n/);
  assert.match(migration, /\ncommit;\s*$/);
  for (const table of [
    "teacher_questions",
    "teacher_question_solutions",
    "teacher_assignments",
    "teacher_assignment_items",
    "assignment_submissions",
    "assignment_answers",
  ]) {
    assert.match(migration, new RegExp(`create table public\\.${table}`));
    assert.match(
      migration,
      new RegExp(
        `alter table public\\.${table} enable row level security`,
      ),
    );
  }
  assert.doesNotMatch(migration, /\binsert into public\.(profiles|student_profiles|practice_attempts|practice_answers)\b/i);
  assert.doesNotMatch(migration, /\b(seed|fixture|fake student)\b/i);
});

test("Assignment 2. Question validation requires exact A-D or a bounded integer", () => {
  assert.equal(
    parseTeacherQuestionRpcResult(teacherQuestionRpcFixture)
      ?.correctAnswer,
    "C",
  );
  assert.deepEqual(
    parseCreateTeacherQuestionInput({
      grade: 1,
      questionType: "MULTIPLE_CHOICE",
      prompt: "  Số nào   lớn hơn 4? ",
      options: { A: "3", B: "4", C: "5", D: "2" },
      correctAnswer: "c",
      solutionSteps: [
        " So sánh từng số với 4. ",
        " Chọn số 5 vì số này lớn hơn 4. ",
      ],
      explanation: " Đáp án C là số 5. ",
      requestId: assignmentRequestId,
    }),
    {
      grade: 1,
      questionType: "MULTIPLE_CHOICE",
      prompt: "Số nào lớn hơn 4?",
      options: { A: "3", B: "4", C: "5", D: "2" },
      correctAnswer: "C",
      solutionSteps: [
        "So sánh từng số với 4.",
        "Chọn số 5 vì số này lớn hơn 4.",
      ],
      explanation: "Đáp án C là số 5.",
      requestId: assignmentRequestId,
    },
  );
  assert.equal(
    parseCreateTeacherQuestionInput({
      grade: 1,
      questionType: "MULTIPLE_CHOICE",
      prompt: "Số nào lớn hơn 4?",
      options: { A: "3", B: "4", C: "5" },
      correctAnswer: "C",
      solutionSteps: ["Bước một.", "Bước hai."],
      explanation: "Chọn số lớn hơn.",
      requestId: assignmentRequestId,
    }),
    null,
  );
  assert.equal(
    parseCreateTeacherQuestionInput({
      grade: 1,
      questionType: "NUMBER_INPUT",
      prompt: "Số liền sau số 6 là số nào?",
      options: null,
      correctAnswer: "1.5",
      solutionSteps: ["Nhìn số 6.", "Đếm thêm một."],
      explanation: "Số liền sau là số 7.",
      requestId: assignmentRequestId,
    }),
    null,
  );
});

test("Assignment 3. Database independently validates options, solutions and immutable question content", () => {
  const migration = readFileSync(assignmentMigrationPath, "utf8");
  assert.match(migration, /options \?& array\['A', 'B', 'C', 'D'\]/);
  assert.match(
    migration,
    /options - array\['A', 'B', 'C', 'D'\]::text\[\][\s\S]+?= '\{\}'::jsonb/,
  );
  assert.match(
    migration,
    /jsonb_typeof\(item\.value\) <> 'string'/,
  );
  assert.match(
    migration,
    /private\.is_nonempty_text_array\(solution_steps, 2, 8, 300\)/,
  );
  assert.match(migration, /raise exception 'Question content cannot change'/);
  assert.match(migration, /raise exception 'Question solution cannot change'/);
});

test("Assignment 4. Activated Teacher is the owner boundary for question and assignment RPCs", () => {
  const migration = readFileSync(assignmentMigrationPath, "utf8");
  for (const rpc of [
    "create_teacher_question",
    "get_my_teacher_questions",
    "archive_teacher_question",
    "publish_teacher_assignment",
    "get_my_teacher_assignments",
    "get_teacher_assignment_roster",
  ]) {
    const start = migration.indexOf(`create function public.${rpc}`);
    assert.notEqual(start, -1);
    const body = migration.slice(start, migration.indexOf("$$;", start) + 3);
    assert.match(body, /private\.require_classroom_actor\('TEACHER'\)/);
  }
  assert.match(
    migration,
    /question\.teacher_id = v_teacher_user_id/g,
  );
  assert.match(
    migration,
    /assignment\.teacher_id = v_teacher_user_id/g,
  );
});

test("Assignment 5. Publishing verifies classroom ownership, question ownership and matching grade", () => {
  const migration = readFileSync(assignmentMigrationPath, "utf8");
  const start = migration.indexOf(
    "create function public.publish_teacher_assignment",
  );
  const body = migration.slice(start, migration.indexOf("$$;", start) + 3);
  assert.match(body, /classroom\.teacher_id = v_teacher_user_id/);
  assert.match(body, /question\.teacher_id = v_teacher_user_id/);
  assert.match(body, /question\.grade = v_grade/);
  assert.match(body, /question\.status = 'ACTIVE'/);
  assert.match(
    body,
    /count\(distinct question_id\)[\s\S]+cardinality\(p_question_ids\)/,
  );
  assert.match(
    migration,
    /unique \(assignment_id, display_order\)/,
  );
});

test("Assignment 6. Publishing request is strict and excludes arbitrary owner identity", () => {
  assert.deepEqual(
    parsePublishAssignmentInput({
      classroomId,
      title: "  Ôn   tập số  ",
      instructions: null,
      dueAt: null,
      questionIds: [teacherQuestionId, secondTeacherQuestionId],
      requestId: assignmentRequestId,
    }),
    {
      classroomId,
      title: "Ôn tập số",
      instructions: null,
      dueAt: null,
      questionIds: [teacherQuestionId, secondTeacherQuestionId],
      requestId: assignmentRequestId,
    },
  );
  assert.equal(
    parsePublishAssignmentInput({
      classroomId,
      teacherId: "private",
      title: "Ôn tập số",
      instructions: null,
      dueAt: null,
      questionIds: [teacherQuestionId],
      requestId: assignmentRequestId,
    }),
    null,
  );
  assert.equal(
    parsePublishAssignmentInput({
      classroomId,
      title: "Ôn tập số",
      instructions: null,
      dueAt: null,
      questionIds: [teacherQuestionId, teacherQuestionId],
      requestId: assignmentRequestId,
    }),
    null,
  );
});

test("Assignment 7. Only approved classroom Students can list, start, save, submit and review", () => {
  const migration = readFileSync(assignmentMigrationPath, "utf8");
  for (const rpc of [
    "get_my_student_assignments",
    "start_or_resume_assignment_submission",
    "get_assignment_submission_state",
    "save_assignment_draft_answer",
    "submit_assignment_submission",
    "get_assignment_submission_review",
  ]) {
    const start = migration.indexOf(`create function public.${rpc}`);
    assert.notEqual(start, -1);
    const body = migration.slice(start, migration.indexOf("$$;", start) + 3);
    assert.match(body, /private\.require_classroom_actor\('STUDENT'\)/);
  }
  assert.match(
    migration,
    /membership\.student_id = v_student_user_id[\s\S]+membership\.status = 'APPROVED'/g,
  );
});

test("Assignment 8. Student list parser accepts only aggregate assignment state", () => {
  const parsed = parseStudentAssignmentListRpc({
    assignments: [
      {
        assignment_id: teacherAssignmentId,
        classroom_name: "Toán 1A",
        teacher_display_name: "Cô An",
        title: "Ôn tập số trong phạm vi 10",
        instructions: null,
        due_at: null,
        status: "PUBLISHED",
        effective_state: "OPEN",
        closed_at: null,
        server_now: assignmentTimestamp,
        total_count: 2,
        published_at: assignmentTimestamp,
        submission_status: "NOT_STARTED",
        answered_count: 0,
        correct_count: null,
        score_percent: null,
        submitted_at: null,
      },
    ],
  });
  assert.equal(parsed?.assignments[0]?.submissionStatus, "NOT_STARTED");
  assert.equal("correctAnswer" in (parsed?.assignments[0] ?? {}), false);
  assert.equal("solutionSteps" in (parsed?.assignments[0] ?? {}), false);
});

test("Assignment 9. Runner state contains drafts but never solutions before submit", () => {
  const parsed = parseAssignmentRunnerStateRpc(runnerStateRpcFixture);
  assert.equal(parsed?.answeredCount, 1);
  assert.equal(parsed?.questions[0]?.draftAnswer, "C");
  assert.equal(parsed?.questions[1]?.options, null);
  const migration = readFileSync(assignmentMigrationPath, "utf8");
  const start = migration.indexOf(
    "create function public.get_assignment_submission_state",
  );
  const body = migration.slice(start, migration.indexOf("$$;", start) + 3);
  assert.doesNotMatch(body, /teacher_question_solutions/);
  assert.doesNotMatch(body, /correct_answer|solution_steps|is_correct/);
});

test("Assignment 10. Canonical runner API parses once across snake-case database boundary", () => {
  const canonicalState = parseAssignmentRunnerStateApiResponse({
    ok: true,
    data: {
      submissionId: assignmentSubmissionId,
      submissionStatus: "IN_PROGRESS",
      answeredCount: 1,
      totalCount: 2,
      assignment: {
        assignmentId: teacherAssignmentId,
        classroomName: "Toán 1A",
        teacherDisplayName: "Cô An",
        title: "Ôn tập số trong phạm vi 10",
        instructions: null,
        dueAt: null,
        status: "PUBLISHED",
        effectiveState: "OPEN",
        closedAt: null,
        serverNow: assignmentTimestamp,
        totalCount: 2,
        publishedAt: assignmentTimestamp,
      },
      questions: [
        {
          questionId: teacherQuestionId,
          displayOrder: 1,
          questionType: "MULTIPLE_CHOICE",
          prompt: "Số nào lớn hơn 4?",
          options: { A: "3", B: "4", C: "5", D: "2" },
          draftAnswer: "C",
        },
        {
          questionId: secondTeacherQuestionId,
          displayOrder: 2,
          questionType: "NUMBER_INPUT",
          prompt: "Số liền sau số 6 là số nào?",
          options: null,
          draftAnswer: null,
        },
      ],
    },
  });
  assert.equal(canonicalState?.questions.length, 2);
  assert.equal(canonicalState?.assignment.instructions, null);
});

test("Assignment 11. Draft input cannot carry score, owner or correctness", () => {
  assert.deepEqual(
    parseDraftAnswerInput({
      submissionId: assignmentSubmissionId,
      questionId: teacherQuestionId,
      answer: "C",
    }),
    {
      submissionId: assignmentSubmissionId,
      questionId: teacherQuestionId,
      answer: "C",
    },
  );
  assert.equal(
    parseDraftAnswerInput({
      submissionId: assignmentSubmissionId,
      questionId: teacherQuestionId,
      answer: "C",
      isCorrect: true,
    }),
    null,
  );
});

test("Assignment 12. Draft and final submit share one lock and submitted answers are immutable", () => {
  const migration = readFileSync(assignmentMigrationPath, "utf8");
  assert.equal(
    migration.match(
      /hashtextextended\('assignment-submission:' \|\| p_submission_id::text, 0\)/g,
    )?.length,
    2,
  );
  assert.match(
    migration,
    /unique \(assignment_id, student_id\)/,
  );
  assert.match(
    migration,
    /if tg_op = 'UPDATE' and v_submission_status <> 'IN_PROGRESS'/,
  );
  assert.match(
    migration,
    /if v_status = 'SUBMITTED' then[\s\S]+return jsonb_build_object/,
  );
});

test("Assignment 13. Server grading reads protected solutions and ignores browser correctness", () => {
  const migration = readFileSync(assignmentMigrationPath, "utf8");
  const start = migration.indexOf(
    "create function public.submit_assignment_submission",
  );
  const body = migration.slice(start, migration.indexOf("$$;", start) + 3);
  assert.match(
    body,
    /answer\.normalized_answer = solution\.correct_answer/,
  );
  assert.match(body, /from public\.teacher_question_solutions as solution/);
  assert.doesNotMatch(body, /\bp_is_correct\b/);
  assert.match(
    migration,
    /revoke all on table public\.teacher_question_solutions from authenticated/,
  );
});

test("Assignment 14. Submitted review exposes solutions only through the owner-scoped RPC", () => {
  const review = parseAssignmentReviewRpc({
    assignment: {
      assignment_id: teacherAssignmentId,
      classroom_name: "Toán 1A",
      teacher_display_name: "Cô An",
      title: "Ôn tập số trong phạm vi 10",
      instructions: null,
      due_at: null,
      published_at: assignmentTimestamp,
    },
    correct_count: 1,
    total_count: 1,
    score_percent: 100,
    submitted_at: assignmentTimestamp,
    answers: [
      {
        display_order: 1,
        question_type: "MULTIPLE_CHOICE",
        prompt: "Số nào lớn hơn 4?",
        options: { A: "3", B: "4", C: "5", D: "2" },
        student_answer: "C",
        is_correct: true,
        correct_answer: "C",
        solution_steps: [
          "So sánh từng số với 4.",
          "Chọn số 5 vì số này lớn hơn 4.",
        ],
        explanation: "Đáp án C là số 5.",
      },
    ],
  });
  assert.equal(review?.answers[0]?.solutionSteps.length, 2);
  const migration = readFileSync(assignmentMigrationPath, "utf8");
  const start = migration.indexOf(
    "create function public.get_assignment_submission_review",
  );
  const body = migration.slice(start, migration.indexOf("$$;", start) + 3);
  assert.match(body, /submission\.student_id = v_student_user_id/);
  assert.match(body, /submission\.status = 'SUBMITTED'/);
});

test("Assignment 15. Teacher roster parses all three states without answers or private identifiers", () => {
  const roster = parseTeacherAssignmentRosterRpc({
    assignment: {
      assignment_id: teacherAssignmentId,
      classroom_name: "Toán 1A",
      grade: 1,
      title: "Ôn tập số trong phạm vi 10",
      instructions: null,
      due_at: null,
      status: "PUBLISHED",
      effective_state: "OPEN",
      closed_at: null,
      server_now: assignmentTimestamp,
      total_count: 2,
      published_at: assignmentTimestamp,
    },
    students: [
      {
        student_display_name: "Minh An",
        grade: 1,
        submission_status: "NOT_STARTED",
        answered_count: 0,
        correct_count: null,
        total_count: 2,
        score_percent: null,
        submitted_at: null,
      },
      {
        student_display_name: "Bảo Ngọc",
        grade: 1,
        submission_status: "IN_PROGRESS",
        answered_count: 1,
        correct_count: null,
        total_count: 2,
        score_percent: null,
        submitted_at: null,
      },
      {
        student_display_name: "Gia Hân",
        grade: 1,
        submission_status: "SUBMITTED",
        answered_count: 2,
        correct_count: 2,
        total_count: 2,
        score_percent: 100,
        submitted_at: assignmentTimestamp,
      },
    ],
  });
  assert.deepEqual(
    roster?.students.map((student) => student.submissionStatus),
    ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED"],
  );
  assert.equal("studentId" in (roster?.students[0] ?? {}), false);
  assert.equal("answer" in (roster?.students[2] ?? {}), false);
});

test("Assignment 16. API contracts distinguish success from safe static errors", () => {
  assert.deepEqual(
    parseAssignmentStartApiResponse({
      ok: true,
      data: {
        submissionId: assignmentSubmissionId,
        assignmentId: teacherAssignmentId,
        status: "IN_PROGRESS",
      },
    }),
    {
      submissionId: assignmentSubmissionId,
      assignmentId: teacherAssignmentId,
      status: "IN_PROGRESS",
    },
  );
  assert.equal(
    parseAssignmentSubmitApiResponse({
      ok: true,
      data: {
        status: "SUBMITTED",
        correctCount: 2,
        totalCount: 2,
        scorePercent: 100,
        submittedAt: assignmentTimestamp,
      },
    })?.status,
    "SUBMITTED",
  );
  assert.deepEqual(
    parseAssignmentApiError({
      ok: false,
      error: {
        code: "ANSWERS_INCOMPLETE",
        message: "Em cần trả lời đủ các câu trước khi nộp bài.",
      },
    }),
    {
      code: "ANSWERS_INCOMPLETE",
      message: "Em cần trả lời đủ các câu trước khi nộp bài.",
    },
  );
  assert.equal(
    parseAssignmentApiError({
      ok: false,
      error: { code: "RAW_DATABASE_ERROR", message: "private" },
    }),
    null,
  );
});

test("Assignment 17. One interaction produces one request and mutation is never run from an effect", () => {
  const gate = createAssignmentRequestGate();
  assert.equal(gate.tryStart(), true);
  assert.equal(gate.tryStart(), false);
  gate.reset();
  assert.equal(gate.tryStart(), true);
  const runner = readFileSync(
    join(process.cwd(), "components/AssignmentRunner.tsx"),
    "utf8",
  );
  const panel = readFileSync(
    join(process.cwd(), "components/StudentAssignmentsPanel.tsx"),
    "utf8",
  );
  assert.doesNotMatch(runner, /useEffect/);
  assert.doesNotMatch(panel, /useEffect/);
  assert.match(runner, /disabled=\{busy\}/);
  assert.match(panel, /!gateRef\.current\.tryStart\(\)/);
});

test("Assignment 18. Network uncertainty reconciles through a read-only state request", () => {
  const runner = readFileSync(
    join(process.cwd(), "components/AssignmentRunner.tsx"),
    "utf8",
  );
  const panel = readFileSync(
    join(process.cwd(), "components/StudentAssignmentsPanel.tsx"),
    "utf8",
  );
  const stateRoute = readFileSync(
    join(process.cwd(), "app/api/assignments/state/route.ts"),
    "utf8",
  );
  assert.match(runner, /fetch(?:WithClientTimeout)?\(\s*"\/api\/assignments\/state"/);
  assert.match(panel, /fetch(?:WithClientTimeout)?\(\s*"\/api\/assignments\/state"/);
  assert.match(stateRoute, /loadAssignmentRunnerState/);
  assert.match(stateRoute, /result\.reason === "NOT_FOUND" \? 404 : 503/);
  assert.doesNotMatch(runner, /window\.location\.reload/);
});

test("Assignment 18a. Successful start navigation is not cancelled by an immediate refresh", () => {
  const panel = readFileSync(
    join(process.cwd(), "components/StudentAssignmentsPanel.tsx"),
    "utf8",
  );
  const loadingPage = readFileSync(
    join(
      process.cwd(),
      "app/assignments/[assignmentId]/loading.tsx",
    ),
    "utf8",
  );
  assert.match(panel, /let navigationStarted = false/);
  assert.match(panel, /navigationStarted = true/);
  assert.match(
    panel,
    /if \(!navigationStarted\) \{[\s\S]+setPendingId\(""\)[\s\S]+gateRef\.current\.reset\(\)/,
  );
  assert.doesNotMatch(panel, /router\.refresh\(\)/);
  assert.match(panel, /aria-busy=\{Boolean\(pendingId\)\}/);
  assert.match(loadingPage, /Đang mở bài tập…/);
  assert.match(loadingPage, /aria-busy="true"/);
});

test("Assignment 19. Routes are same-origin, no-store and return canonical JSON", () => {
  for (const path of [
    "app/api/teacher/questions/create/route.ts",
    "app/api/teacher/questions/archive/route.ts",
    "app/api/teacher/assignments/publish/route.ts",
    "app/api/assignments/start/route.ts",
    "app/api/assignments/draft/route.ts",
    "app/api/assignments/submit/route.ts",
    "app/api/assignments/state/route.ts",
  ]) {
    const source = readFileSync(join(process.cwd(), path), "utf8");
    assert.match(source, /readAssignmentRequest/);
    assert.match(source, /"Cache-Control": "no-store"/);
    assert.match(source, /ok: true, data:/);
    assert.doesNotMatch(source, /service[_-]?role/i);
  }
});

test("Assignment 20. Browser code never queries the protected solution table", () => {
  const browserFiles = [
    "components/AssignmentRunner.tsx",
    "components/StudentAssignmentsPanel.tsx",
    "components/TeacherAssignmentPublisher.tsx",
    "components/TeacherQuestionLibraryManager.tsx",
    "app/assignments/page.tsx",
    "app/assignments/[assignmentId]/page.tsx",
    "app/assignments/[assignmentId]/review/page.tsx",
  ];
  for (const path of browserFiles) {
    const source = readFileSync(join(process.cwd(), path), "utf8");
    assert.doesNotMatch(source, /\.from\(["']teacher_question_solutions/);
    assert.doesNotMatch(source, /service[_-]?role/i);
  }
});

test("Assignment 21. Teacher and Student navigation expose only functional assignment entry points", () => {
  const teacherNavigation = getHeaderNavigation(true, "TEACHER", true);
  assert.deepEqual(
    teacherNavigation.map((item) => item.label),
    ["Tổng quan", "Lớp học", "Kho câu hỏi", "Bài tập", "Hồ sơ"],
  );
  assert.equal(
    isHeaderItemActive(
      `/teacher/assignments/${teacherAssignmentId}`,
      teacherNavigation[3]!,
    ),
    true,
  );
  const studentNavigation = getHeaderNavigation(true, "STUDENT", true);
  assert.equal(studentNavigation.length, 6);
  assert.equal(studentNavigation.some((item) => item.href === "/tutor"), true);
  assert.equal(
    studentNavigation.some((item) => item.href === "/assignments"),
    false,
  );
  const dashboard = readFileSync(
    join(process.cwd(), "app/dashboard/page.tsx"),
    "utf8",
  );
  assert.match(dashboard, /Bài giáo viên giao/);
  assert.match(dashboard, /StudentAssignmentsPanel/);
});

test("Assignment 22. Protected route coverage and UI accessibility remain explicit", () => {
  assert.equal(
    getAuthNavigationDecision("/assignments", false),
    "LOGIN",
  );
  assert.equal(
    getAuthNavigationDecision(
      `/assignments/${teacherAssignmentId}`,
      false,
    ),
    "LOGIN",
  );
  const runner = readFileSync(
    join(process.cwd(), "components/AssignmentRunner.tsx"),
    "utf8",
  );
  const publisher = readFileSync(
    join(process.cwd(), "components/TeacherAssignmentPublisher.tsx"),
    "utf8",
  );
  const styles = readFileSync(
    join(process.cwd(), "app/globals.css"),
    "utf8",
  );
  assert.match(runner, /role="progressbar"/);
  assert.match(runner, /aria-valuenow=/);
  assert.match(runner, /<legend>/);
  assert.match(publisher, /aria-label=\{`Đưa câu/);
  assert.match(styles, /@media \(max-width: 700px\)/);
  assert.match(styles, /\.assignment-roster-table table/);
});

test("Assignment 23. Function privileges are fail-closed and all public RPCs use a blank search path", () => {
  const migration = readFileSync(assignmentMigrationPath, "utf8");
  const rpcNames = [
    "create_teacher_question",
    "get_my_teacher_questions",
    "archive_teacher_question",
    "publish_teacher_assignment",
    "get_my_teacher_assignments",
    "get_teacher_assignment_roster",
    "get_my_student_assignments",
    "start_or_resume_assignment_submission",
    "get_assignment_submission_state",
    "save_assignment_draft_answer",
    "submit_assignment_submission",
    "get_assignment_submission_review",
  ];
  for (const name of rpcNames) {
    const start = migration.indexOf(`create function public.${name}`);
    const body = migration.slice(start, migration.indexOf("$$;", start) + 3);
    assert.match(body, /security definer/);
    assert.match(body, /set search_path = ''/);
    assert.match(
      migration,
      new RegExp(
        `revoke all[\\s\\S]{0,240}public\\.${name}\\([\\s\\S]{0,240}from public`,
      ),
    );
    assert.match(
      migration,
      new RegExp(
        `grant execute[\\s\\S]{0,240}public\\.${name}\\([\\s\\S]{0,240}to authenticated`,
      ),
    );
  }
  assert.match(
    migration,
    /has_table_privilege\([\s\S]+?'authenticated',[\s\S]+?'SELECT,INSERT,UPDATE,DELETE'[\s\S]+?\)/,
  );
});

const gradebookMigrationPath = join(
  process.cwd(),
  "supabase/migrations/0015_teacher_gradebook_analytics.sql",
);

const gradebookRpcFixture = {
  classroom: {
    classroom_name: "Toán 1A",
    grade: 1,
    student_count: 3,
  },
  assignments: [
    {
      assignment_id: teacherAssignmentId,
      title: "Ôn tập số trong phạm vi 10",
      status: "PUBLISHED",
      total_count: 2,
      published_at: assignmentTimestamp,
      due_at: null,
      submitted_count: 1,
    },
  ],
  selected_assignment: {
    assignment_id: teacherAssignmentId,
    title: "Ôn tập số trong phạm vi 10",
    status: "PUBLISHED",
    total_count: 2,
    published_at: assignmentTimestamp,
    due_at: null,
  },
  students: [
    {
      student_display_name: "An Minh",
      submission_status: "NOT_STARTED",
      answered_count: 0,
      total_count: 2,
      correct_count: null,
      score_percent: null,
      submitted_at: null,
    },
    {
      student_display_name: "Bảo Ngọc",
      submission_status: "IN_PROGRESS",
      answered_count: 1,
      total_count: 2,
      correct_count: null,
      score_percent: null,
      submitted_at: null,
    },
    {
      student_display_name: "Gia Hân",
      submission_status: "SUBMITTED",
      answered_count: 2,
      total_count: 2,
      correct_count: 2,
      score_percent: 100,
      submitted_at: assignmentTimestamp,
    },
  ],
};

const assignmentAnalysisRpcFixture = {
  assignment: {
    assignment_title: "Ôn tập số trong phạm vi 10",
    classroom_name: "Toán 1A",
    grade: 1,
    status: "PUBLISHED",
    total_count: 3,
    published_at: assignmentTimestamp,
    due_at: null,
  },
  student_count: 3,
  not_started_count: 0,
  in_progress_count: 0,
  submitted_count: 3,
  average_score_percent: 66.67,
  completion_rate: 100,
  minimum_submissions_for_insight: 3,
  review_accuracy_threshold: 50,
  questions: [
    {
      display_order: 1,
      question_type: "MULTIPLE_CHOICE",
      prompt: "Số nào lớn hơn 4?",
      answered_count: 3,
      correct_count: 1,
      incorrect_count: 2,
      accuracy_percent: 33.33,
      insight_status: "NEEDS_REVIEW",
    },
    {
      display_order: 2,
      question_type: "NUMBER_INPUT",
      prompt: "Số liền sau số 6 là số nào?",
      answered_count: 3,
      correct_count: 0,
      incorrect_count: 3,
      accuracy_percent: 0,
      insight_status: "NEEDS_REVIEW",
    },
    {
      display_order: 3,
      question_type: "MULTIPLE_CHOICE",
      prompt: "Số nào bằng 5?",
      answered_count: 3,
      correct_count: 3,
      incorrect_count: 0,
      accuracy_percent: 100,
      insight_status: "ON_TRACK",
    },
  ],
};

test("Gradebook 1. Migration is atomic and adds only two read-only RPCs", () => {
  const migration = readFileSync(gradebookMigrationPath, "utf8");
  assert.match(migration, /^begin;\n/);
  assert.match(migration, /\ncommit;\s*$/);
  assert.equal(
    migration.match(/create function public\.get_teacher_/g)?.length,
    2,
  );
  assert.doesNotMatch(migration, /\bcreate table\b/i);
  assert.doesNotMatch(migration, /\b(insert|update|delete|truncate)\b/i);
});

test("Gradebook 2. Activated Teacher ownership is the authorization root", () => {
  const migration = readFileSync(gradebookMigrationPath, "utf8");
  for (const rpc of [
    "get_teacher_class_gradebook",
    "get_teacher_assignment_analysis",
  ]) {
    const start = migration.indexOf(`create function public.${rpc}`);
    const body = migration.slice(start, migration.indexOf("$$;", start) + 3);
    assert.match(body, /private\.require_classroom_actor\('TEACHER'\)/);
    assert.match(body, /teacher_id = v_teacher_user_id/);
  }
});

test("Gradebook 3. Another Teacher, Student, Parent and guest cannot cross the boundary", () => {
  const migration = readFileSync(gradebookMigrationPath, "utf8");
  assert.match(
    migration,
    /classroom\.teacher_id = v_teacher_user_id/,
  );
  assert.match(
    migration,
    /assignment\.teacher_id = v_teacher_user_id/,
  );
  assert.match(
    migration,
    /revoke all[\s\S]+?from public[\s\S]+?revoke all[\s\S]+?from anon/,
  );
  assert.equal(
    getAuthNavigationDecision(
      `/teacher/classes/${classroomId}/gradebook`,
      false,
    ),
    "LOGIN",
  );
});

test("Gradebook 4. Assignment must belong to the owned classroom", () => {
  const migration = readFileSync(gradebookMigrationPath, "utf8");
  const start = migration.indexOf(
    "create function public.get_teacher_class_gradebook",
  );
  const body = migration.slice(start, migration.indexOf("$$;", start) + 3);
  assert.match(
    body,
    /assignment\.id = p_assignment_id[\s\S]+assignment\.classroom_id = p_classroom_id[\s\S]+assignment\.teacher_id = v_teacher_user_id/,
  );
  assert.match(body, /if v_selected_assignment_id is null then[\s\S]+return null/);
});

test("Gradebook 5. Gradebook parser preserves all three submission states", () => {
  const parsed = parseTeacherClassGradebook(gradebookRpcFixture);
  assert.deepEqual(
    parsed?.students.map((student) => student.submissionStatus),
    ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED"],
  );
});

test("Gradebook 6. Students who have not started have no official score", () => {
  const student = parseTeacherClassGradebook(
    gradebookRpcFixture,
  )?.students[0];
  assert.equal(student?.answeredCount, 0);
  assert.equal(student?.correctCount, null);
  assert.equal(student?.scorePercent, null);
  assert.equal(student?.submittedAt, null);
});

test("Gradebook 7. In-progress work has progress but no official score", () => {
  const student = parseTeacherClassGradebook(
    gradebookRpcFixture,
  )?.students[1];
  assert.equal(student?.answeredCount, 1);
  assert.equal(student?.correctCount, null);
  assert.equal(student?.scorePercent, null);
});

test("Gradebook 8. Submitted work parses correct, total and percentage", () => {
  const student = parseTeacherClassGradebook(
    gradebookRpcFixture,
  )?.students[2];
  assert.equal(student?.correctCount, 2);
  assert.equal(student?.totalCount, 2);
  assert.equal(student?.scorePercent, 100);
});

test("Gradebook 9. Average score includes submitted work only", () => {
  const migration = readFileSync(gradebookMigrationPath, "utf8");
  assert.match(
    migration,
    /avg\(submission\.score_percent\)[\s\S]+filter \(where submission\.status = 'SUBMITTED'\)/,
  );
  assert.equal(
    parseTeacherAssignmentAnalysis(assignmentAnalysisRpcFixture)
      ?.averageScorePercent,
    66.67,
  );
});

test("Gradebook 10. Empty cohorts and zero submissions never divide by zero", () => {
  const migration = readFileSync(gradebookMigrationPath, "utf8");
  assert.match(
    migration,
    /when v_student_count = 0 then null[\s\S]+v_submitted_count::numeric \* 100/,
  );
  const empty = parseTeacherAssignmentAnalysis({
    ...assignmentAnalysisRpcFixture,
    student_count: 0,
    not_started_count: 0,
    submitted_count: 0,
    average_score_percent: null,
    completion_rate: null,
    questions: assignmentAnalysisRpcFixture.questions.map((question) => ({
      ...question,
      answered_count: 0,
      correct_count: 0,
      incorrect_count: 0,
      accuracy_percent: null,
      insight_status: "INSUFFICIENT_DATA",
    })),
  });
  assert.equal(empty?.completionRate, null);
  assert.equal(empty?.averageScorePercent, null);
});

test("Gradebook 11. Question analytics excludes drafts and non-submitted work", () => {
  const migration = readFileSync(gradebookMigrationPath, "utf8");
  const start = migration.indexOf(
    "create function public.get_teacher_assignment_analysis",
  );
  const body = migration.slice(start, migration.indexOf("$$;", start) + 3);
  assert.match(
    body,
    /submission\.status = 'SUBMITTED'[\s\S]+answer\.is_correct is not null/,
  );
});

test("Gradebook 12. Questions needing review sort by most incorrect deterministically", () => {
  const parsed = parseTeacherAssignmentAnalysis(
    assignmentAnalysisRpcFixture,
  );
  assert.ok(parsed);
  assert.deepEqual(
    getQuestionsNeedingReview(parsed).map(
      (question) => question.displayOrder,
    ),
    [2, 1],
  );
});

test("Gradebook 13. Empty assignment list remains a valid gradebook state", () => {
  const parsed = parseTeacherClassGradebook({
    classroom: {
      classroom_name: "Toán 1A",
      grade: 1,
      student_count: 0,
    },
    assignments: [],
    selected_assignment: null,
    students: [],
  });
  assert.deepEqual(parsed?.assignments, []);
  assert.equal(parsed?.selectedAssignment, null);
});

test("Gradebook 14. No submissions produces a safe insufficient-data state", () => {
  const parsed = parseTeacherAssignmentAnalysis({
    ...assignmentAnalysisRpcFixture,
    student_count: 2,
    not_started_count: 2,
    submitted_count: 0,
    average_score_percent: null,
    completion_rate: 0,
    questions: assignmentAnalysisRpcFixture.questions.map((question) => ({
      ...question,
      answered_count: 0,
      correct_count: 0,
      incorrect_count: 0,
      accuracy_percent: null,
      insight_status: "INSUFFICIENT_DATA",
    })),
  });
  assert.equal(parsed?.averageScorePercent, null);
  assert.equal(
    parsed?.questions.every(
      (question) => question.insightStatus === "INSUFFICIENT_DATA",
    ),
    true,
  );
});

test("Gradebook 15. Analytics exposes no answer key, solution, answer text or PII", () => {
  const migration = readFileSync(gradebookMigrationPath, "utf8");
  for (const forbidden of [
    "normalized_answer",
    "correct_answer",
    "solution_steps",
    "student_code",
    "birth_date",
    "email",
  ]) {
    assert.doesNotMatch(
      migration,
      new RegExp(`['"]${forbidden}['"]`, "i"),
    );
  }
  const parsed = parseTeacherAssignmentAnalysis(
    assignmentAnalysisRpcFixture,
  );
  assert.equal(
    "correctAnswer" in (parsed?.questions[0] ?? {}),
    false,
  );
  assert.equal("studentId" in (parsed?.assignment ?? {}), false);
});

test("Gradebook 16. Parser fails closed for private or malformed response fields", () => {
  assert.equal(
    parseTeacherClassGradebook({
      ...gradebookRpcFixture,
      student_id: "private",
    }),
    null,
  );
  assert.equal(
    parseTeacherAssignmentAnalysis({
      ...assignmentAnalysisRpcFixture,
      questions: [
        {
          ...assignmentAnalysisRpcFixture.questions[0],
          correct_answer: "C",
        },
        ...assignmentAnalysisRpcFixture.questions.slice(1),
      ],
    }),
    null,
  );
});

test("Gradebook 17. Current approved memberships define the visible roster", () => {
  const migration = readFileSync(gradebookMigrationPath, "utf8");
  assert.match(
    migration,
    /membership\.classroom_id = assignment\.classroom_id[\s\S]+membership\.status = 'APPROVED'/,
  );
  assert.doesNotMatch(migration, /membership\.status in \(/i);
});

test("Gradebook 18. Real classroom and assignment pages link to read-only views", () => {
  const classroomPage = readFileSync(
    join(
      process.cwd(),
      "app/teacher/classrooms/[classroomId]/page.tsx",
    ),
    "utf8",
  );
  const assignmentPage = readFileSync(
    join(
      process.cwd(),
      "app/teacher/assignments/[assignmentId]/page.tsx",
    ),
    "utf8",
  );
  assert.match(
    classroomPage,
    /\/teacher\/classes\/\$\{classroomId\}\/gradebook/,
  );
  assert.match(
    assignmentPage,
    /\/teacher\/assignments\/\$\{assignmentId\}\/analysis/,
  );
  assert.equal(
    getHeaderNavigation(true, "TEACHER", true).length,
    5,
  );
});

test("Gradebook 19. Question insights are rule-based and do not invent skill groups", () => {
  const migration = readFileSync(gradebookMigrationPath, "utf8");
  const analysisPage = readFileSync(
    join(
      process.cwd(),
      "app/teacher/assignments/[assignmentId]/analysis/page.tsx",
    ),
    "utf8",
  );
  assert.match(
    migration,
    /when v_submitted_count < 3 then 'INSUFFICIENT_DATA'/,
  );
  assert.match(
    migration,
    /statistic\.correct_count::numeric[\s\S]+\* 100[\s\S]+\/ statistic\.answered_count < 50 then 'NEEDS_REVIEW'/,
  );
  assert.match(analysisPage, /không suy diễn nhóm\s+kiến thức/);
  assert.doesNotMatch(analysisPage, /\bAI\b/);
});

test("Gradebook 20. Gradebook and analysis have responsive accessible table fallbacks", () => {
  const gradebookPage = readFileSync(
    join(
      process.cwd(),
      "app/teacher/classes/[classroomId]/gradebook/page.tsx",
    ),
    "utf8",
  );
  const styles = readFileSync(
    join(process.cwd(), "app/globals.css"),
    "utf8",
  );
  assert.match(gradebookPage, /<label htmlFor="assignment-filter">/);
  assert.match(gradebookPage, /<th scope="row">/);
  assert.match(styles, /@media \(max-width: 700px\)/);
  assert.match(styles, /\.gradebook-table table/);
  assert.match(styles, /\.assignment-question-analysis-table table/);
  assert.match(styles, /content: "Trạng thái: "/);
  assert.match(styles, /content: "Nhận định: "/);
});

const assignmentLifecycleMigrationPath = join(
  process.cwd(),
  "supabase/migrations/0016_assignment_lifecycle.sql",
);

function readLifecycleFunction(name: string) {
  const migration = readFileSync(assignmentLifecycleMigrationPath, "utf8");
  const start = migration.indexOf(
    `create or replace function public.${name}`,
  );
  const fallbackStart = migration.indexOf(
    `create function public.${name}`,
  );
  const functionStart = start >= 0 ? start : fallbackStart;
  assert.notEqual(functionStart, -1);
  return migration.slice(
    functionStart,
    migration.indexOf("$$;", functionStart) + 3,
  );
}

test("Assignment lifecycle 1. Migration is atomic and preserves all existing learning records", () => {
  const migration = readFileSync(assignmentLifecycleMigrationPath, "utf8");
  assert.match(migration, /^begin;\n/);
  assert.match(migration, /\ncommit;\s*$/);
  assert.doesNotMatch(migration, /\bcreate table\b/i);
  assert.doesNotMatch(migration, /\balter table\b/i);
  assert.doesNotMatch(
    migration,
    /\bdelete from public\.(teacher_assignments|assignment_submissions|assignment_answers)\b/i,
  );
  assert.doesNotMatch(migration, /\b(seed|fixture|fake assignment)\b/i);
});

test("Assignment lifecycle 2. Effective state is derived from status, due time and database now", () => {
  const migration = readFileSync(assignmentLifecycleMigrationPath, "utf8");
  assert.match(
    migration,
    /when assignment\.status = 'CLOSED' then 'CLOSED'/,
  );
  assert.match(
    migration,
    /assignment\.due_at <= v_now then 'OVERDUE'/,
  );
  assert.equal(
    getAssignmentDisplayState(
      "OPEN",
      "2026-07-30T08:00:00.000Z",
      "2026-07-29T09:00:00.000Z",
    ),
    "DUE_SOON",
  );
  assert.equal(
    getAssignmentDisplayState(
      "OVERDUE",
      "2026-07-28T09:00:00.000Z",
      assignmentTimestamp,
    ),
    "OVERDUE",
  );
  assert.equal(
    getAssignmentDisplayState("CLOSED", null, assignmentTimestamp),
    "CLOSED",
  );
});

test("Assignment lifecycle 3. Vietnam date-time conversion is deterministic and reversible", () => {
  const local = "2026-07-30T16:30";
  const utc = parseVietnamDateTimeLocal(local);
  assert.equal(utc, "2026-07-30T09:30:00.000Z");
  assert.equal(toVietnamDateTimeLocal(utc), local);
  assert.equal(parseVietnamDateTimeLocal("2026-02-30T08:00"), null);
  assert.match(
    getAssignmentDeadlineText(
      "OPEN",
      "2026-07-31T09:00:00.000Z",
      assignmentTimestamp,
    ).exact,
    /^Hạn nộp:/,
  );
});

test("Assignment lifecycle 4. Teacher lifecycle requests are strict and carry no owner identity", () => {
  assert.deepEqual(
    parseAssignmentLifecycleRequest({
      assignmentId: teacherAssignmentId,
      action: "UPDATE_DEADLINE",
      dueAt: "2026-07-30T09:30:00.000Z",
    }),
    {
      assignmentId: teacherAssignmentId,
      action: "UPDATE_DEADLINE",
      dueAt: "2026-07-30T09:30:00.000Z",
    },
  );
  assert.deepEqual(
    parseAssignmentLifecycleRequest({
      assignmentId: teacherAssignmentId,
      action: "REOPEN",
      dueAt: null,
    }),
    {
      assignmentId: teacherAssignmentId,
      action: "REOPEN",
      dueAt: null,
    },
  );
  assert.equal(
    parseAssignmentLifecycleRequest({
      assignmentId: teacherAssignmentId,
      action: "CLOSE",
      teacherId: "private",
    }),
    null,
  );
});

test("Assignment lifecycle 5. Lifecycle response contract accepts only a canonical safe result", () => {
  const result = parseAssignmentLifecycleApiResponse({
    ok: true,
    data: {
      assignmentId: teacherAssignmentId,
      status: "PUBLISHED",
      effectiveState: "OPEN",
      dueAt: null,
      closedAt: null,
      serverNow: assignmentTimestamp,
    },
  });
  assert.equal(result?.effectiveState, "OPEN");
  assert.equal(
    parseAssignmentLifecycleApiResponse({
      ok: true,
      data: {
        assignmentId: teacherAssignmentId,
        status: "CLOSED",
        effectiveState: "CLOSED",
        dueAt: null,
        closedAt: null,
        serverNow: assignmentTimestamp,
      },
    }),
    null,
  );
  assert.equal(
    parseAssignmentLifecycleApiResponse({
      ok: true,
      data: {
        assignmentId: teacherAssignmentId,
        status: "PUBLISHED",
        effectiveState: "OPEN",
        dueAt: null,
        closedAt: null,
        serverNow: assignmentTimestamp,
        teacherId: "private",
      },
    }),
    null,
  );
});

test("Assignment lifecycle 6. Every Teacher mutation verifies activation and assignment ownership", () => {
  for (const rpc of [
    "update_teacher_assignment_deadline",
    "close_teacher_assignment",
    "reopen_teacher_assignment",
  ]) {
    const body = readLifecycleFunction(rpc);
    assert.match(body, /private\.require_classroom_actor\('TEACHER'\)/);
    assert.match(body, /assignment\.teacher_id = v_teacher_user_id/);
    assert.match(body, /classroom\.teacher_id = v_teacher_user_id/);
    assert.match(body, /classroom\.status = 'ACTIVE'/);
    assert.doesNotMatch(body, /\bp_teacher_id\b/);
  }
});

test("Assignment lifecycle 7. Student start, draft and submit all enforce the database deadline", () => {
  for (const rpc of [
    "start_or_resume_assignment_submission",
    "save_assignment_draft_answer",
    "submit_assignment_submission",
  ]) {
    const body = readLifecycleFunction(rpc);
    assert.match(body, /assignment\.status = 'PUBLISHED'/);
    assert.match(
      body,
      /assignment\.due_at is null[\s\S]+assignment\.due_at > now\(\)/,
    );
    assert.match(
      body,
      /hashtextextended\('teacher-assignment:' \|\|/,
    );
  }
});

test("Assignment lifecycle 8. Submitted work remains idempotent and reviewable after close", () => {
  const submit = readLifecycleFunction(
    "submit_assignment_submission",
  );
  assert.ok(
    submit.indexOf("if v_status = 'SUBMITTED' then") <
      submit.indexOf("assignment.status = 'PUBLISHED'"),
  );
  const reviewMigration = readFileSync(assignmentMigrationPath, "utf8");
  const reviewStart = reviewMigration.indexOf(
    "create function public.get_assignment_submission_review",
  );
  const reviewBody = reviewMigration.slice(
    reviewStart,
    reviewMigration.indexOf("$$;", reviewStart) + 3,
  );
  assert.match(reviewBody, /submission\.status = 'SUBMITTED'/);
  assert.doesNotMatch(reviewBody, /assignment\.status = 'PUBLISHED'/);
});

test("Assignment lifecycle 9. Close and reopen are serialized, constrained and deliberate", () => {
  const close = readLifecycleFunction("close_teacher_assignment");
  const reopen = readLifecycleFunction("reopen_teacher_assignment");
  assert.match(close, /assignment\.status = 'PUBLISHED'/);
  assert.match(close, /status = 'CLOSED'[\s\S]+closed_at = v_now/);
  assert.match(reopen, /p_due_at is not null and p_due_at <= v_now/);
  assert.match(
    reopen,
    /status = 'PUBLISHED'[\s\S]+due_at = p_due_at[\s\S]+closed_at = null/,
  );
  assert.match(
    reopen,
    /assignment\.status = 'CLOSED'[\s\S]+assignment\.due_at <= v_now/,
  );
  assert.match(close, /hashtextextended\('teacher-assignment:' \|\|/);
  assert.match(reopen, /hashtextextended\('teacher-assignment:' \|\|/);
});

test("Assignment lifecycle 10. Database trigger permits only close/reopen while keeping published content immutable", () => {
  const migration = readFileSync(assignmentLifecycleMigrationPath, "utf8");
  const triggerStart = migration.indexOf(
    "create or replace function private.enforce_teacher_assignment_integrity",
  );
  const triggerBody = migration.slice(
    triggerStart,
    migration.indexOf("$$;", triggerStart) + 3,
  );
  for (const immutable of [
    "new.teacher_id is distinct from old.teacher_id",
    "new.classroom_id is distinct from old.classroom_id",
    "new.title is distinct from old.title",
    "new.total_count is distinct from old.total_count",
    "new.published_at is distinct from old.published_at",
  ]) {
    assert.match(triggerBody, new RegExp(immutable.replaceAll(".", "\\.")));
  }
  assert.match(
    triggerBody,
    /old\.status = 'PUBLISHED'[\s\S]+new\.status = 'CLOSED'/,
  );
  assert.match(
    triggerBody,
    /old\.status = 'CLOSED'[\s\S]+new\.status = 'PUBLISHED'/,
  );
});

test("Assignment lifecycle 11. RPC grants stay authenticated-only with no direct browser mutation", () => {
  const migration = readFileSync(assignmentLifecycleMigrationPath, "utf8");
  for (const signature of [
    "update_teacher_assignment_deadline\\(uuid, timestamptz\\)",
    "close_teacher_assignment\\(uuid\\)",
    "reopen_teacher_assignment\\(uuid, timestamptz\\)",
  ]) {
    assert.match(
      migration,
      new RegExp(
        `revoke all[\\s\\S]{0,180}public\\.${signature}[\\s\\S]{0,120}from public`,
      ),
    );
    assert.match(
      migration,
      new RegExp(
        `revoke all[\\s\\S]{0,180}public\\.${signature}[\\s\\S]{0,120}from anon`,
      ),
    );
    assert.match(
      migration,
      new RegExp(
        `grant execute[\\s\\S]{0,180}public\\.${signature}[\\s\\S]{0,120}to authenticated`,
      ),
    );
  }
  assert.match(
    migration,
    /has_table_privilege\([\s\S]+?'public\.teacher_assignments'[\s\S]+?'INSERT,UPDATE,DELETE'/,
  );
});

test("Assignment lifecycle 12. Teacher UI has accessible confirmations and single-flight loading states", () => {
  const manager = readFileSync(
    join(
      process.cwd(),
      "components/TeacherAssignmentLifecycleManager.tsx",
    ),
    "utf8",
  );
  assert.match(manager, /<dialog/);
  assert.match(manager, /closeDialogRef\.current\?\.showModal\(\)/);
  assert.match(manager, /reopenDialogRef\.current\?\.showModal\(\)/);
  assert.match(manager, /createAssignmentRequestGate\(\)/);
  assert.match(manager, /Đang lưu hạn nộp…/);
  assert.match(manager, /Đang đóng bài…/);
  assert.match(manager, /Đang mở lại…/);
  assert.match(manager, /aria-describedby=/);
  assert.match(manager, /disabled=\{busy/);
});

test("Assignment lifecycle 13. Student UI explains normal closed and overdue states without generic errors", () => {
  const panel = readFileSync(
    join(process.cwd(), "components/StudentAssignmentsPanel.tsx"),
    "utf8",
  );
  const runner = readFileSync(
    join(process.cwd(), "components/AssignmentRunner.tsx"),
    "utf8",
  );
  assert.match(panel, /assignment\.effectiveState !== "OPEN"/);
  assert.match(panel, /Giáo viên đã đóng bài/);
  assert.match(panel, /Đã quá hạn/);
  assert.match(runner, /const canMutate =[\s\S]+effectiveState === "OPEN"/);
  assert.match(runner, /Em không thể lưu thêm câu trả lời/);
  assert.match(runner, /Em không thể nộp bài lúc này/);
  assert.doesNotMatch(panel, /Yêu cầu không hợp lệ/);
  assert.doesNotMatch(runner, /Yêu cầu không hợp lệ/);
});

test("Assignment lifecycle 14. CSV uses a Vietnamese seven-column BOM-safe format and leaves draft scores blank", () => {
  const roster = parseTeacherAssignmentRosterRpc({
    assignment: {
      assignment_id: teacherAssignmentId,
      classroom_name: "Toán 1A",
      grade: 1,
      title: "Ôn tập số trong phạm vi 10",
      instructions: null,
      due_at: null,
      status: "PUBLISHED",
      effective_state: "OPEN",
      closed_at: null,
      server_now: assignmentTimestamp,
      total_count: 2,
      published_at: assignmentTimestamp,
    },
    students: [
      {
        student_display_name: "Chưa Làm",
        grade: 1,
        submission_status: "NOT_STARTED",
        answered_count: 0,
        correct_count: null,
        total_count: 2,
        score_percent: null,
        submitted_at: null,
      },
      {
        student_display_name: "Đang Làm",
        grade: 1,
        submission_status: "IN_PROGRESS",
        answered_count: 1,
        correct_count: null,
        total_count: 2,
        score_percent: null,
        submitted_at: null,
      },
      {
        student_display_name: "Đã Nộp",
        grade: 1,
        submission_status: "SUBMITTED",
        answered_count: 2,
        correct_count: 1,
        total_count: 2,
        score_percent: 50,
        submitted_at: assignmentTimestamp,
      },
    ],
  });
  assert.ok(roster);
  const csv = buildAssignmentGradebookCsv(roster);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.match(
    csv,
    /^\uFEFF"STT","Họ và tên học sinh","Trạng thái","Số câu đúng","Tổng số câu","Tỷ lệ","Thời điểm nộp"\r\n/,
  );
  assert.match(csv, /"Chưa bắt đầu","","2","",""/);
  assert.match(csv, /"Đang làm","","2","",""/);
  assert.match(csv, /"Đã nộp","1","2","50%","[^"]+"/);
});

test("Assignment lifecycle 15. CSV neutralizes formulas and escapes commas, quotes and newlines", () => {
  const roster = parseTeacherAssignmentRosterRpc({
    assignment: {
      assignment_id: teacherAssignmentId,
      classroom_name: "Toán 1A",
      grade: 1,
      title: "Ôn tập số trong phạm vi 10",
      instructions: null,
      due_at: null,
      status: "PUBLISHED",
      effective_state: "OPEN",
      closed_at: null,
      server_now: assignmentTimestamp,
      total_count: 2,
      published_at: assignmentTimestamp,
    },
    students: [
      {
        student_display_name: "=SUM(A1:A2)",
        grade: 1,
        submission_status: "NOT_STARTED",
        answered_count: 0,
        correct_count: null,
        total_count: 2,
        score_percent: null,
        submitted_at: null,
      },
      {
        student_display_name: "An, \"Minh\"\nLớp",
        grade: 1,
        submission_status: "SUBMITTED",
        answered_count: 2,
        correct_count: 2,
        total_count: 2,
        score_percent: 100,
        submitted_at: assignmentTimestamp,
      },
    ],
  });
  assert.ok(roster);
  const csv = buildAssignmentGradebookCsv(roster);
  assert.match(csv, /"'=SUM\(A1:A2\)"/);
  assert.match(csv, /"An, ""Minh""\nLớp"/);
  for (const forbidden of [
    teacherAssignmentId,
    "student_code",
    "birth_date",
    "correct_answer",
    "solution_steps",
    "normalized_answer",
  ]) {
    assert.equal(csv.includes(forbidden), false);
  }
});

test("Assignment lifecycle 16. CSV route is owner-scoped, private, no-store and uses a fixed safe filename", () => {
  const route = readFileSync(
    join(
      process.cwd(),
      "app/api/teacher/assignments/[assignmentId]/gradebook.csv/route.ts",
    ),
    "utf8",
  );
  assert.match(route, /getTeacherAccount\(\)/);
  assert.match(route, /loadTeacherAssignmentRoster/);
  assert.match(route, /private, no-store, max-age=0/);
  assert.match(route, /text\/csv; charset=utf-8/);
  assert.match(route, /filename="plave-assignment-gradebook\.csv"/);
  assert.doesNotMatch(route, /question_solutions|correct_answer|student_code/);
});

test("Assignment lifecycle 17. Responsive lifecycle controls avoid whole-page overflow", () => {
  const styles = readFileSync(
    join(process.cwd(), "app/globals.css"),
    "utf8",
  );
  assert.match(styles, /\.assignment-lifecycle-card/);
  assert.match(styles, /\.assignment-lifecycle-metrics/);
  assert.match(styles, /\.assignment-lifecycle-actions/);
  assert.match(
    styles,
    /@media \(max-width: 700px\)[\s\S]+\.assignment-lifecycle-metrics[\s\S]+grid-template-columns: 1fr/,
  );
});

const teacherQuestionRestoreMigrationPath = join(
  process.cwd(),
  "supabase/migrations/0017_restore_teacher_questions.sql",
);

test("Question reuse 1. Restore migration is atomic and does not alter existing question content", () => {
  const migration = readFileSync(
    teacherQuestionRestoreMigrationPath,
    "utf8",
  );
  assert.match(migration, /^begin;\n/);
  assert.match(migration, /\ncommit;\s*$/);
  assert.doesNotMatch(migration, /\bcreate table\b/i);
  assert.doesNotMatch(migration, /\bdelete from\b/i);
  assert.doesNotMatch(migration, /\btruncate\b/i);
  assert.doesNotMatch(migration, /\bupdate public\.teacher_question_solutions\b/i);
});

test("Question reuse 2. Database transition allows only owned ARCHIVED to ACTIVE restoration", () => {
  const migration = readFileSync(
    teacherQuestionRestoreMigrationPath,
    "utf8",
  );
  assert.match(
    migration,
    /old\.status = 'ARCHIVED'[\s\S]+new\.status = 'ACTIVE'[\s\S]+new\.archived_at is null/,
  );
  assert.match(
    migration,
    /private\.require_classroom_actor\('TEACHER'\)/,
  );
  assert.match(
    migration,
    /question\.teacher_id = v_teacher_user_id[\s\S]+question\.status = 'ARCHIVED'/,
  );
  assert.match(
    migration,
    /hashtextextended\('teacher-question:' \|\| p_question_id::text, 1\)/,
  );
  assert.doesNotMatch(migration, /\bp_teacher_id\b|\bp_student_id\b/);
});

test("Question reuse 3. Restore is idempotent and grants stay authenticated-only", () => {
  const migration = readFileSync(
    teacherQuestionRestoreMigrationPath,
    "utf8",
  );
  assert.match(
    migration,
    /if v_status = 'ACTIVE' then[\s\S]+jsonb_build_object\('status', 'ACTIVE'\)/,
  );
  assert.match(
    migration,
    /revoke all[\s\S]+restore_teacher_question\(uuid\)[\s\S]+from public/,
  );
  assert.match(
    migration,
    /revoke all[\s\S]+restore_teacher_question\(uuid\)[\s\S]+from anon/,
  );
  assert.match(
    migration,
    /grant execute[\s\S]+restore_teacher_question\(uuid\)[\s\S]+to authenticated/,
  );
  assert.match(
    migration,
    /has_table_privilege\([\s\S]+teacher_questions[\s\S]+'INSERT,UPDATE,DELETE'/,
  );
});

test("Question reuse 4. Canonical question-library and restore responses remain strict", () => {
  const question = {
    questionId: "11111111-1111-4111-8111-111111111118",
    grade: 1,
    questionType: "NUMBER_INPUT",
    prompt: "Có bao nhiêu hình vuông?",
    options: null,
    correctAnswer: "4",
    solutionSteps: ["Đếm từng hình.", "Viết số 4."],
    explanation: "Có tất cả bốn hình vuông.",
    status: "ARCHIVED",
    createdAt: assignmentTimestamp,
  };
  assert.equal(
    parseTeacherQuestionLibraryApiResponse({
      ok: true,
      data: { questions: [question] },
    })?.questions[0]?.status,
    "ARCHIVED",
  );
  assert.deepEqual(
    parseRestoredQuestionApiResponse({
      ok: true,
      data: { status: "ACTIVE" },
    }),
    { status: "ACTIVE" },
  );
  assert.equal(
    parseRestoredQuestionApiResponse({
      ok: true,
      data: { status: "ACTIVE", questionId: question.questionId },
    }),
    null,
  );
});

test("Question reuse 5. Teacher library uses explicit disable and restore actions", () => {
  const manager = readFileSync(
    join(
      process.cwd(),
      "components/TeacherQuestionLibraryManager.tsx",
    ),
    "utf8",
  );
  assert.match(manager, /Ngừng sử dụng/);
  assert.match(manager, /Khôi phục để giao bài/);
  assert.match(manager, /archiveDialogRef\.current\?\.showModal\(\)/);
  assert.match(manager, /createAssignmentRequestGate\(\)/);
  assert.match(manager, /\/api\/teacher\/questions\/restore/);
  assert.doesNotMatch(manager, />\s*Lưu trữ\s*</);
});

test("Question reuse 6. Assignment editor explains grade and archived filters", () => {
  const publisher = readFileSync(
    join(process.cwd(), "components/TeacherAssignmentPublisher.tsx"),
    "utf8",
  );
  assert.match(
    publisher,
    /question\.status === "ACTIVE"[\s\S]+question\.grade === classroom\?\.grade/,
  );
  assert.match(
    publisher,
    /question\.status === "ARCHIVED"[\s\S]+question\.grade === classroom\?\.grade/,
  );
  assert.match(publisher, /đã ngừng sử dụng/);
  assert.match(publisher, /thuộc\s+khối lớp khác/);
});

test("Question reuse 7. Opening the library preserves the assignment draft tab", () => {
  const publisher = readFileSync(
    join(process.cwd(), "components/TeacherAssignmentPublisher.tsx"),
    "utf8",
  );
  assert.match(
    publisher,
    /href="\/teacher\/questions"[\s\S]+target="_blank"[\s\S]+rel="noreferrer"/,
  );
  assert.match(publisher, /Mở kho câu hỏi ở tab mới/);
  assert.match(publisher, /Cập nhật danh sách câu hỏi/);
  assert.doesNotMatch(publisher, /router\.push\("\/teacher\/questions"\)/);
});

test("Question reuse 8. In-place refresh is read-only, strict and keeps editor fields mounted", () => {
  const publisher = readFileSync(
    join(process.cwd(), "components/TeacherAssignmentPublisher.tsx"),
    "utf8",
  );
  const route = readFileSync(
    join(process.cwd(), "app/api/teacher/questions/route.ts"),
    "utf8",
  );
  assert.match(
    publisher,
    /fetch(?:WithClientTimeout)?\(\s*"\/api\/teacher\/questions",[\s\S]+method: "GET"[\s\S]+cache: "no-store"/,
  );
  assert.match(publisher, /parseTeacherQuestionLibraryApiResponse/);
  assert.match(
    publisher,
    /Đã cập nhật kho câu hỏi mà không làm mất nội dung bài tập/,
  );
  assert.match(route, /getTeacherAccount\(\)/);
  assert.match(route, /loadTeacherQuestionLibrary/);
  assert.match(route, /private, no-store, max-age=0/);
  assert.doesNotMatch(route, /\.from\(|teacher_question_solutions/);
});

test("Question reuse 9. Restore route is same-origin and returns no question content", () => {
  const route = readFileSync(
    join(
      process.cwd(),
      "app/api/teacher/questions/restore/route.ts",
    ),
    "utf8",
  );
  assert.match(route, /readAssignmentRequest\(request, 1024\)/);
  assert.match(route, /parseAssignmentIdInput/);
  assert.match(route, /restoreTeacherQuestion/);
  assert.match(route, /data: \{ status: "ACTIVE" \}/);
  assert.doesNotMatch(
    route,
    /correctAnswer|solutionSteps|teacherId|studentId/,
  );
});

test("Question reuse 10. Picker controls remain responsive and touch-friendly", () => {
  const styles = readFileSync(
    join(process.cwd(), "app/globals.css"),
    "utf8",
  );
  assert.match(styles, /\.assignment-question-picker-actions/);
  assert.match(
    styles,
    /@media \(max-width: 700px\)[\s\S]+\.assignment-question-picker-actions \.button[\s\S]+width: 100%/,
  );
});

const lessonSections = Array.from({ length: 6 }, (_, index) => ({
  code: `section-${index + 1}`,
  title: `Phần ${index + 1}`,
  paragraphs: [`Nội dung phần ${index + 1}.`],
}));
const workedExamples = [
  {
    title: "Ví dụ một",
    steps: ["Bước một.", "Bước hai."],
    answer: "Kết quả một.",
  },
  {
    title: "Ví dụ hai",
    steps: ["Bước một.", "Bước hai."],
    answer: "Kết quả hai.",
  },
];
const baseUnitFixture: LearningUnit = {
  slug: BASE_UNIT_SLUG,
  grade: 1,
  title: "Các số trong phạm vi 10",
  description: "Kiến thức nền tảng về các số trong phạm vi mười.",
  learningObjectives: ["Đếm và nhận biết số lượng."],
  lessonContent: { sections: lessonSections, workedExamples },
  totalQuestions: 24,
  prerequisiteUnitSlug: null,
};
const additionUnitFixture: LearningUnit = {
  slug: ADDITION_UNIT_SLUG,
  grade: 1,
  title: "Phép cộng trong phạm vi 10",
  description: "Hiểu phép cộng và tính tổng trong phạm vi mười.",
  learningObjectives: ["Tính được tổng không vượt quá mười."],
  lessonContent: { sections: lessonSections, workedExamples },
  totalQuestions: 24,
  prerequisiteUnitSlug: BASE_UNIT_SLUG,
};
const subtractionUnitFixture: LearningUnit = {
  slug: SUBTRACTION_UNIT_SLUG,
  grade: 1,
  title: "Phép trừ trong phạm vi 10",
  description: "Hiểu phép trừ và tính phần còn lại trong phạm vi mười.",
  learningObjectives: ["Tính được hiệu không âm trong phạm vi mười."],
  lessonContent: { sections: lessonSections, workedExamples },
  totalQuestions: 24,
  prerequisiteUnitSlug: ADDITION_UNIT_SLUG,
};
const numbersTo20UnitFixture: LearningUnit = {
  slug: NUMBERS_TO_20_UNIT_SLUG,
  grade: 1,
  title: "Các số trong phạm vi 20",
  description: "Đếm, đọc, viết và nhận biết chục, đơn vị đến hai mươi.",
  learningObjectives: ["Đếm, đọc và viết được các số đến hai mươi."],
  lessonContent: { sections: lessonSections, workedExamples },
  totalQuestions: 24,
  prerequisiteUnitSlug: SUBTRACTION_UNIT_SLUG,
};
const additionTo20UnitFixture: LearningUnit = {
  slug: ADDITION_TO_20_UNIT_SLUG,
  grade: 1,
  title: "Phép cộng trong phạm vi 20 không nhớ",
  description: "Giữ nguyên một chục và cộng các đơn vị.",
  learningObjectives: ["Cộng được số đến hai mươi mà không nhớ."],
  lessonContent: { sections: lessonSections, workedExamples },
  totalQuestions: 24,
  prerequisiteUnitSlug: NUMBERS_TO_20_UNIT_SLUG,
};
const subtractionTo20UnitFixture: LearningUnit = {
  slug: SUBTRACTION_TO_20_UNIT_SLUG,
  grade: 1,
  title: "Phép trừ trong phạm vi 20 không mượn",
  description: "Giữ nguyên một chục và bớt các đơn vị.",
  learningObjectives: ["Trừ được số đến hai mươi mà không mượn."],
  lessonContent: { sections: lessonSections, workedExamples },
  totalQuestions: 24,
  prerequisiteUnitSlug: ADDITION_TO_20_UNIT_SLUG,
};
const numbersTo100UnitFixture: LearningUnit = {
  slug: NUMBERS_TO_100_UNIT_SLUG,
  grade: 1,
  title: "Các số trong phạm vi 100",
  description: "Đếm, đọc, viết và nhận biết chục, đơn vị đến một trăm.",
  learningObjectives: ["Đếm, đọc và viết được các số đến một trăm."],
  lessonContent: { sections: lessonSections, workedExamples },
  totalQuestions: 24,
  prerequisiteUnitSlug: SUBTRACTION_TO_20_UNIT_SLUG,
};
const additionTo100UnitFixture: LearningUnit = {
  slug: ADDITION_TO_100_UNIT_SLUG,
  grade: 1,
  title: "Phép cộng trong phạm vi 100 không nhớ",
  description: "Cộng theo chục và đơn vị mà không nhớ.",
  learningObjectives: ["Cộng được các số đến một trăm mà không nhớ."],
  lessonContent: { sections: lessonSections, workedExamples },
  totalQuestions: 24,
  prerequisiteUnitSlug: NUMBERS_TO_100_UNIT_SLUG,
};
const subtractionTo100UnitFixture: LearningUnit = {
  slug: SUBTRACTION_TO_100_UNIT_SLUG,
  grade: 1,
  title: "Phép trừ trong phạm vi 100 không mượn",
  description: "Trừ theo chục và đơn vị mà không mượn.",
  learningObjectives: ["Trừ được các số đến một trăm mà không mượn."],
  lessonContent: { sections: lessonSections, workedExamples },
  totalQuestions: 24,
  prerequisiteUnitSlug: ADDITION_TO_100_UNIT_SLUG,
};
const basicGeometryUnitFixture: LearningUnit = {
  slug: BASIC_GEOMETRY_UNIT_SLUG,
  grade: 1,
  title: "Hình học và vị trí cơ bản",
  description: "Nhận biết, phân loại, định vị và đếm các hình cơ bản.",
  learningObjectives: ["Nhận biết và mô tả được hình cùng vị trí."],
  lessonContent: { sections: lessonSections, workedExamples },
  totalQuestions: 24,
  prerequisiteUnitSlug: SUBTRACTION_TO_100_UNIT_SLUG,
};
const lengthMeasurementUnitFixture: LearningUnit = {
  slug: LENGTH_MEASUREMENT_UNIT_SLUG,
  grade: 1,
  title: "Đo độ dài và so sánh độ dài",
  description: "So sánh và đo độ dài bằng đơn vị phù hợp.",
  learningObjectives: ["So sánh và đo được độ dài đơn giản."],
  lessonContent: { sections: lessonSections, workedExamples },
  totalQuestions: 24,
  prerequisiteUnitSlug: BASIC_GEOMETRY_UNIT_SLUG,
};
const timeClockCalendarUnitFixture: LearningUnit = {
  slug: TIME_CLOCK_CALENDAR_UNIT_SLUG,
  grade: 1,
  title: "Thời gian, đồng hồ và lịch",
  description: "Đọc giờ đúng, thứ tự hoạt động và lịch đơn giản.",
  learningObjectives: ["Đọc được giờ đúng và lịch đơn giản."],
  lessonContent: { sections: lessonSections, workedExamples },
  totalQuestions: 24,
  prerequisiteUnitSlug: LENGTH_MEASUREMENT_UNIT_SLUG,
};
const cubeAndCuboidUnitFixture: LearningUnit = {
  slug: CUBE_AND_CUBOID_UNIT_SLUG,
  grade: 1,
  title: "Khối lập phương và khối hộp chữ nhật",
  description: "Nhận biết, phân loại và đếm các khối đơn giản.",
  learningObjectives: ["Nhận biết được hai hình khối cơ bản."],
  lessonContent: { sections: lessonSections, workedExamples },
  totalQuestions: 24,
  prerequisiteUnitSlug: BASIC_GEOMETRY_UNIT_SLUG,
};

test("Sprint 5A 1. The next unused migration number is 0018", () => {
  assert.equal(
    existsSync(
      join(
        process.cwd(),
        "supabase/migrations/0017_restore_teacher_questions.sql",
      ),
    ),
    true,
  );
  assert.equal(
    existsSync(
      join(
        process.cwd(),
        "supabase/migrations/0018_grade1_addition_within_10.sql",
      ),
    ),
    true,
  );
});

test("Sprint 5A 2. Migration is atomic and preserves existing learning records", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0018_grade1_addition_within_10.sql",
    ),
    "utf8",
  );
  assert.match(migration, /^\s*begin;/i);
  assert.match(migration, /commit;\s*$/i);
  assert.match(migration, /do \$validation\$/);
  assert.doesNotMatch(
    migration,
    /\b(delete|truncate)\s+(from\s+)?public\.(practice_attempts|practice_answers|learning_units|questions|question_solutions)/i,
  );
  assert.doesNotMatch(
    migration,
    /\bupdate\s+public\.(practice_attempts|practice_answers)\b/i,
  );
});

test("Sprint 5A 3. Addition seed has one unit, 24 questions and 24 solutions", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0018_grade1_addition_within_10.sql",
    ),
    "utf8",
  );
  const questionPayload = migration.split("$questions$")[1] ?? "";
  const solutionPayload = migration.split("$solutions$")[1] ?? "";
  assert.equal(
    questionPayload.match(/"code":"g1-add-q\d{2}"/g)?.length,
    24,
  );
  assert.equal(
    solutionPayload.match(/"question_id":"g1-add-q\d{2}"/g)?.length,
    24,
  );
  assert.equal(
    questionPayload.match(/"question_type":"MULTIPLE_CHOICE"/g)?.length,
    16,
  );
  assert.equal(
    questionPayload.match(/"question_type":"NUMBER_INPUT"/g)?.length,
    8,
  );
});

test("Sprint 5A 4. Addition skills have six curated questions each", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0018_grade1_addition_within_10.sql",
    ),
    "utf8",
  );
  const questionPayload = migration.split("$questions$")[1] ?? "";
  for (const skillCode of getUnitSkillCodes(ADDITION_UNIT_SLUG)) {
    assert.equal(
      questionPayload.match(
        new RegExp(`"skill_code":"${skillCode}"`, "g"),
      )?.length,
      6,
    );
  }
  assert.deepEqual(getUnitSkillCodes(ADDITION_UNIT_SLUG), [
    "ADDITION_MEANING",
    "ADDITION_CALCULATION",
    "NUMBER_BONDS",
    "ONE_STEP_WORD_PROBLEM",
  ]);
});

test("Sprint 5A 5. Theory is routable while practice obeys its prerequisite", () => {
  assert.equal(
    getLessonPath(ADDITION_UNIT_SLUG),
    "/learn/grade-1/addition-within-10",
  );
  assert.equal(isUnitPracticeUnlocked(additionUnitFixture, []), false);
  assert.equal(isUnitPracticeUnlocked(baseUnitFixture, []), true);
});

test("Sprint 5A 6. Completing the foundation unlocks addition practice", () => {
  const attempts = parseAttemptRows([completedAttemptRow]);
  assert.ok(attempts);
  assert.equal(
    isUnitPracticeUnlocked(additionUnitFixture, attempts),
    true,
  );
  assert.equal(
    getSuggestedUnit(
      [baseUnitFixture, additionUnitFixture],
      attempts,
    )?.slug,
    ADDITION_UNIT_SLUG,
  );
});

test("Sprint 5A 7. Dashboard recommends the foundation until it is completed", () => {
  const activeAttempts = parseAttemptRows([activeAttemptRow]);
  assert.ok(activeAttempts);
  assert.equal(
    getSuggestedUnit(
      [baseUnitFixture, additionUnitFixture],
      activeAttempts,
    )?.slug,
    BASE_UNIT_SLUG,
  );
});

test("Sprint 5A 8. The database start boundary enforces identity, grade and prerequisite", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0018_grade1_addition_within_10.sql",
    ),
    "utf8",
  );
  assert.match(migration, /v_current_user_id uuid := auth\.uid\(\)/);
  assert.match(migration, /profile\.role = 'STUDENT'/);
  assert.match(migration, /profile\.onboarding_completed/);
  assert.match(migration, /v_unit_grade <> v_student_grade/);
  assert.match(
    migration,
    /prerequisite_attempt\.status = 'COMPLETED'/,
  );
  assert.match(migration, /raise exception 'Prerequisite required'/);
});

test("Sprint 5A 9. Parent, Teacher and guest cannot bypass Student practice", () => {
  const route = readFileSync(
    join(process.cwd(), "app/api/practice/start/route.ts"),
    "utf8",
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0018_grade1_addition_within_10.sql",
    ),
    "utf8",
  );
  assert.match(route, /getStudentLearningContext\(\)/);
  assert.match(route, /access\.reason === "UNAUTHENTICATED"/);
  assert.match(migration, /profile\.role = 'STUDENT'/);
  assert.match(
    migration,
    /revoke[\s\S]+start_or_resume_practice\(text\)[\s\S]+anon/i,
  );
});

test("Sprint 5A 10. Student catalogs use ordered multi-unit database content", () => {
  const learnSource = readFileSync(
    join(process.cwd(), "app/learn/page.tsx"),
    "utf8",
  );
  assert.match(learnSource, /\.from\("learning_units"\)/);
  assert.match(learnSource, /prerequisite_unit_slug/);
  const resultsSource = readFileSync(
    join(process.cwd(), "app/results/page.tsx"),
    "utf8",
  );
  assert.match(resultsSource, /loadStudentCurriculumHistory/);
  assert.doesNotMatch(resultsSource, /\.from\("learning_units"\)/);
  const personalizedServer = readFileSync(
    join(process.cwd(), "lib/personalized-path/server.ts"),
    "utf8",
  );
  assert.match(personalizedServer, /\.from\("learning_units"\)/);
  assert.match(personalizedServer, /prerequisite_unit_slug/);
  assert.match(
    personalizedServer,
    /\.order\("display_order", \{ ascending: true \}\)/,
  );
  for (const file of ["app/dashboard/page.tsx", "app/lessons/page.tsx"]) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.match(source, /Personalized/);
  }
  for (const file of ["app/learn/page.tsx"]) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.match(source, /\.order\("display_order", \{ ascending: true \}\)/);
  }
});

test("Sprint 5A 11. Lesson detail is shared instead of copied for addition", () => {
  const dynamicPage = readFileSync(
    join(
      process.cwd(),
      "app/learn/[gradeSlug]/[lessonSlug]/page.tsx",
    ),
    "utf8",
  );
  const legacyPage = readFileSync(
    join(
      process.cwd(),
      "app/learn/grade-1/numbers-to-10/page.tsx",
    ),
    "utf8",
  );
  assert.match(dynamicPage, /<LessonDetail/);
  assert.match(dynamicPage, /getUnitSlugFromLessonRoute/);
  assert.match(legacyPage, /LessonPage/);
  assert.equal(
    existsSync(
      join(
        process.cwd(),
        "app/learn/grade-1/addition-within-10/page.tsx",
      ),
    ),
    false,
  );
});

test("Sprint 5A 12. Practice and review load the real unit title and skill catalog", () => {
  const practicePage = readFileSync(
    join(process.cwd(), "app/practice/[attemptId]/page.tsx"),
    "utf8",
  );
  const reviewPage = readFileSync(
    join(process.cwd(), "app/review/[attemptId]/page.tsx"),
    "utf8",
  );
  const reviewModel = readFileSync(
    join(process.cwd(), "lib/practice/review.ts"),
    "utf8",
  );
  assert.match(practicePage, /unitTitle=\{unit\.title\}/);
  assert.match(reviewPage, /\{unit\.title\}/);
  assert.match(reviewModel, /getUnitSkillCodes\(review\.unitSlug\)/);
  assert.deepEqual(getUnitSkillCodes(BASE_UNIT_SLUG).length, 4);
  assert.deepEqual(getUnitSkillCodes(ADDITION_UNIT_SLUG).length, 4);
});

test("Sprint 5A 13. Attempt numbering stays independent for each unit", () => {
  const additionOrder = Array.from(
    { length: 24 },
    (_, index) => `g1-add-q${String(index + 1).padStart(2, "0")}`,
  );
  const attempts = parseAttemptRows([
    completedAttemptRow,
    {
      ...completedAttemptRow,
      id: "44444444-4444-4444-8444-444444444444",
      unit_slug: ADDITION_UNIT_SLUG,
      question_order: additionOrder,
      correct_count: 20,
      started_at: "2026-07-28T02:00:00.000Z",
      completed_at: "2026-07-28T02:30:00.000Z",
    },
  ]);
  assert.ok(attempts);
  const history = buildPracticeHistory(attempts);
  assert.equal(
    history.find((attempt) => attempt.unitSlug === BASE_UNIT_SLUG)
      ?.attemptNumber,
    1,
  );
  assert.equal(
    history.find((attempt) => attempt.unitSlug === ADDITION_UNIT_SLUG)
      ?.attemptNumber,
    1,
  );
});

test("Sprint 5A 14. Results group attempts by unit and retakes retain their unit slug", () => {
  const historySource = readFileSync(
    join(process.cwd(), "components/PracticeHistory.tsx"),
    "utf8",
  );
  const startButton = readFileSync(
    join(process.cwd(), "components/StartPracticeButton.tsx"),
    "utf8",
  );
  const reviewPage = readFileSync(
    join(process.cwd(), "app/review/[attemptId]/page.tsx"),
    "utf8",
  );
  assert.match(historySource, /group\.unitSlug/);
  assert.match(historySource, /unitTitles\[group\.unitSlug\]/);
  assert.match(startButton, /JSON\.stringify\(\{ unitSlug \}\)/);
  assert.match(reviewPage, /unitSlug=\{unit\.slug\}/);
});

test("Sprint 5A 15. Correct answers remain behind the database grading boundary", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0018_grade1_addition_within_10.sql",
    ),
    "utf8",
  );
  const practicePage = readFileSync(
    join(process.cwd(), "app/practice/[attemptId]/page.tsx"),
    "utf8",
  );
  assert.doesNotMatch(practicePage, /question_solutions/);
  assert.match(
    migration,
    /has_table_privilege\([\s\S]*'anon'[\s\S]*'public\.question_solutions'[\s\S]*'SELECT'/,
  );
  assert.match(
    migration,
    /has_table_privilege\([\s\S]*'authenticated'[\s\S]*'public\.question_solutions'[\s\S]*'SELECT'/,
  );
});

test("Sprint 5A 16. Parent weekly parsing remains safe when new-unit answers exceed legacy skill totals", () => {
  const parsed = parseParentWeeklySummary({
    ...weeklySummaryPayload,
    metrics: {
      ...weeklySummaryPayload.metrics,
      completed_attempt_count: 3,
      total_answered: 72,
      total_correct: 55,
      accuracy_percent: 76.4,
    },
  });
  assert.ok(parsed);
  assert.equal(parsed.metrics.totalAnswered, 72);
  assert.equal(parsed.skills.length, 4);
});

test("Sprint 5B 1. Migration 0019 is the next atomic migration", () => {
  const migrationPath = join(
    process.cwd(),
    "supabase/migrations/0019_grade1_subtraction_within_10.sql",
  );
  assert.equal(existsSync(migrationPath), true);
  const migration = readFileSync(migrationPath, "utf8");
  assert.match(migration, /^\s*begin;/i);
  assert.match(migration, /commit;\s*$/i);
  assert.match(migration, /do \$validation\$/);
  assert.equal(
    existsSync(
      join(
        process.cwd(),
        "supabase/migrations/0020_grade1_subtraction_within_10.sql",
      ),
    ),
    false,
  );
});

test("Sprint 5B 2. Migration preserves existing units, attempts and answers", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0019_grade1_subtraction_within_10.sql",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    migration,
    /\b(delete|truncate)\s+(from\s+)?public\.(practice_attempts|practice_answers|learning_units|questions|question_solutions)/i,
  );
  assert.doesNotMatch(
    migration,
    /\bupdate\s+public\.(practice_attempts|practice_answers|learning_units)\b/i,
  );
  assert.match(
    migration,
    /addition\.slug = 'grade-1-addition-within-10'[\s\S]*addition\.display_order = 2/,
  );
});

test("Sprint 5B 3. Subtraction seed has 24 questions, 24 solutions and a 16 plus 8 split", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0019_grade1_subtraction_within_10.sql",
    ),
    "utf8",
  );
  const questionPayload = migration.split("$questions$")[1] ?? "";
  const solutionPayload = migration.split("$solutions$")[1] ?? "";
  assert.equal(
    questionPayload.match(/"code":"g1-sub-q\d{2}"/g)?.length,
    24,
  );
  assert.equal(
    solutionPayload.match(/"question_id":"g1-sub-q\d{2}"/g)?.length,
    24,
  );
  assert.equal(
    questionPayload.match(/"question_type":"MULTIPLE_CHOICE"/g)?.length,
    16,
  );
  assert.equal(
    questionPayload.match(/"question_type":"NUMBER_INPUT"/g)?.length,
    8,
  );
});

test("Sprint 5B 4. Subtraction uses four distinct skills with six questions each", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0019_grade1_subtraction_within_10.sql",
    ),
    "utf8",
  );
  const questionPayload = migration.split("$questions$")[1] ?? "";
  assert.deepEqual(getUnitSkillCodes(SUBTRACTION_UNIT_SLUG), [
    "SUBTRACTION_MEANING",
    "SUBTRACTION_CALCULATION",
    "ADDITION_SUBTRACTION_RELATION",
    "ONE_STEP_SUBTRACTION_WORD_PROBLEM",
  ]);
  for (const skillCode of getUnitSkillCodes(SUBTRACTION_UNIT_SLUG)) {
    assert.equal(
      questionPayload.match(
        new RegExp(`"skill_code":"${skillCode}"`, "g"),
      )?.length,
      6,
    );
    assert.equal(typeof skillLabels[skillCode], "string");
  }
});

test("Sprint 5B 5. Catalog exposes three ordered units through one dynamic route", () => {
  assert.deepEqual(
    [baseUnitFixture, additionUnitFixture, subtractionUnitFixture].map(
      (unit) => unit.slug,
    ),
    [BASE_UNIT_SLUG, ADDITION_UNIT_SLUG, SUBTRACTION_UNIT_SLUG],
  );
  assert.equal(
    getLessonPath(SUBTRACTION_UNIT_SLUG),
    "/learn/grade-1/subtraction-within-10",
  );
  assert.equal(
    existsSync(
      join(
        process.cwd(),
        "app/learn/grade-1/subtraction-within-10/page.tsx",
      ),
    ),
    false,
  );
  const dynamicPage = readFileSync(
    join(
      process.cwd(),
      "app/learn/[gradeSlug]/[lessonSlug]/page.tsx",
    ),
    "utf8",
  );
  assert.match(dynamicPage, /getUnitSlugFromLessonRoute/);
  assert.match(dynamicPage, /<LessonDetail/);
});

test("Sprint 5B 6. Subtraction stays locked until addition is completed", () => {
  const baseOnly = parseAttemptRows([completedAttemptRow]);
  assert.ok(baseOnly);
  assert.equal(
    isUnitPracticeUnlocked(subtractionUnitFixture, baseOnly),
    false,
  );
});

test("Sprint 5B 7. A completed addition attempt unlocks subtraction", () => {
  const additionOrder = Array.from(
    { length: 24 },
    (_, index) => `g1-add-q${String(index + 1).padStart(2, "0")}`,
  );
  const attempts = parseAttemptRows([
    completedAttemptRow,
    {
      ...completedAttemptRow,
      id: "55555555-5555-4555-8555-555555555555",
      unit_slug: ADDITION_UNIT_SLUG,
      question_order: additionOrder,
      correct_count: 19,
      started_at: "2026-07-29T02:00:00.000Z",
      completed_at: "2026-07-29T02:30:00.000Z",
    },
  ]);
  assert.ok(attempts);
  assert.equal(
    isUnitPracticeUnlocked(subtractionUnitFixture, attempts),
    true,
  );
  assert.equal(
    getSuggestedUnit(
      [baseUnitFixture, additionUnitFixture, subtractionUnitFixture],
      attempts,
    )?.slug,
    SUBTRACTION_UNIT_SLUG,
  );
});

test("Sprint 5B 8. Direct start requests still cross the database prerequisite boundary", () => {
  const route = readFileSync(
    join(process.cwd(), "app/api/practice/start/route.ts"),
    "utf8",
  );
  const prerequisiteMigration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0018_grade1_addition_within_10.sql",
    ),
    "utf8",
  );
  const subtractionMigration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0019_grade1_subtraction_within_10.sql",
    ),
    "utf8",
  );
  assert.match(route, /p_unit_slug: input\.unitSlug/);
  assert.match(route, /getStudentLearningContext\(\)/);
  assert.match(
    prerequisiteMigration,
    /prerequisite_attempt\.status = 'COMPLETED'/,
  );
  assert.match(
    subtractionMigration,
    /unit\.prerequisite_unit_slug = 'grade-1-addition-within-10'/,
  );
});

test("Sprint 5B 9. Unit presentation is catalog-driven with a teal subtraction accent", () => {
  const presentation = getUnitPresentation(SUBTRACTION_UNIT_SLUG);
  assert.equal(presentation.cardClassName, "unit-card--subtraction");
  assert.equal(
    presentation.pageClassName,
    "real-learning-page--subtraction",
  );
  assert.equal(presentation.operationVisual?.operator, "−");
  for (const file of ["app/learn/page.tsx", "app/lessons/page.tsx"]) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.match(source, /getUnitPresentation\(unit\.slug\)/);
    assert.doesNotMatch(source, /SUBTRACTION_UNIT_SLUG/);
  }
});

test("Sprint 5B 10. Results and retakes remain grouped by their own unit", () => {
  const subtractionOrder = Array.from(
    { length: 24 },
    (_, index) => `g1-sub-q${String(index + 1).padStart(2, "0")}`,
  );
  const attempts = parseAttemptRows([
    completedAttemptRow,
    {
      ...completedAttemptRow,
      id: "66666666-6666-4666-8666-666666666666",
      unit_slug: SUBTRACTION_UNIT_SLUG,
      question_order: subtractionOrder,
      correct_count: 17,
      started_at: "2026-07-30T02:00:00.000Z",
      completed_at: "2026-07-30T02:30:00.000Z",
    },
  ]);
  assert.ok(attempts);
  const history = buildPracticeHistory(attempts);
  assert.equal(
    history.find((attempt) => attempt.unitSlug === SUBTRACTION_UNIT_SLUG)
      ?.attemptNumber,
    1,
  );
  const reviewPage = readFileSync(
    join(process.cwd(), "app/review/[attemptId]/page.tsx"),
    "utf8",
  );
  assert.match(reviewPage, /unitSlug=\{unit\.slug\}/);
});

test("Sprint 5B 11. Practice and review resolve subtraction title and skill labels dynamically", () => {
  const practicePage = readFileSync(
    join(process.cwd(), "app/practice/[attemptId]/page.tsx"),
    "utf8",
  );
  const reviewModel = readFileSync(
    join(process.cwd(), "lib/practice/review.ts"),
    "utf8",
  );
  assert.match(practicePage, /unitTitle=\{unit\.title\}/);
  assert.match(reviewModel, /getUnitSkillCodes\(review\.unitSlug\)/);
  assert.equal(
    skillLabels.SUBTRACTION_CALCULATION,
    "Tính hiệu trong phạm vi 10",
  );
});

test("Sprint 5B 12. Parent parsers accept the new unit title and subtraction skill", () => {
  const skill = {
    skill_code: "SUBTRACTION_MEANING",
    answered_count: 6,
    correct_count: 5,
    accuracy_percent: 83.3,
  };
  const dashboard = parseParentChildLearningDashboard({
    ...emptyParentDashboardPayload,
    skills: [...emptyParentDashboardPayload.skills, skill],
    recent_attempts: [
      {
        unit_title: "Phép trừ trong phạm vi 10",
        attempt_number: 1,
        status: "COMPLETED",
        answered_count: 24,
        total_questions: 24,
        correct_count: 20,
        accuracy_percent: 83.3,
        activity_at: "2026-07-30T04:00:00.000Z",
        completed_at: "2026-07-30T04:00:00.000Z",
      },
    ],
  });
  assert.ok(dashboard);
  assert.equal(
    dashboard.skills.at(-1)?.skillCode,
    "SUBTRACTION_MEANING",
  );

  const weekly = parseParentWeeklySummary({
    ...weeklySummaryPayload,
    skills: [...weeklySummaryPayload.skills, skill],
  });
  assert.ok(weekly);
  assert.equal(weekly.skills.at(-1)?.skillCode, "SUBTRACTION_MEANING");
});

test("Sprint 5B 13. Existing learning and Teacher assignment data remain outside the migration", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0019_grade1_subtraction_within_10.sql",
    ),
    "utf8",
  );
  for (const forbiddenTable of [
    "learning_goals",
    "parent_student_connections",
    "classrooms",
    "classroom_memberships",
    "teacher_assignments",
    "teacher_submissions",
  ]) {
    assert.doesNotMatch(migration, new RegExp(forbiddenTable));
  }
});

test("Sprint 5B 14. Correct answers remain private until grading", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0019_grade1_subtraction_within_10.sql",
    ),
    "utf8",
  );
  for (const file of [
    "app/dashboard/page.tsx",
    "app/learn/page.tsx",
    "app/lessons/page.tsx",
    "app/practice/[attemptId]/page.tsx",
  ]) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.doesNotMatch(source, /question_solutions/);
  }
  assert.match(
    migration,
    /has_table_privilege\([\s\S]*'authenticated'[\s\S]*'public\.question_solutions'[\s\S]*'SELECT'/,
  );
});

test("Sprint 5B 15. Subtraction cards and lesson details keep responsive shared layouts", () => {
  const styles = readFileSync(
    join(process.cwd(), "app/globals.css"),
    "utf8",
  );
  const lesson = readFileSync(
    join(process.cwd(), "components/LessonDetail.tsx"),
    "utf8",
  );
  assert.match(styles, /\.unit-card--subtraction/);
  assert.match(styles, /\.real-learning-page--subtraction/);
  assert.match(styles, /@media \(max-width: 1040px\)/);
  assert.match(styles, /@media \(max-width: 640px\)/);
  assert.match(lesson, /lesson-operation-visual/);
  assert.match(lesson, /aria-label=\{presentation\.operationVisual\.ariaLabel\}/);
});

function completedChainThroughSubtraction() {
  const additionOrder = Array.from(
    { length: 24 },
    (_, index) => `g1-add-q${String(index + 1).padStart(2, "0")}`,
  );
  const subtractionOrder = Array.from(
    { length: 24 },
    (_, index) => `g1-sub-q${String(index + 1).padStart(2, "0")}`,
  );
  const attempts = parseAttemptRows([
    completedAttemptRow,
    {
      ...completedAttemptRow,
      id: "77777777-7777-4777-8777-777777777777",
      unit_slug: ADDITION_UNIT_SLUG,
      question_order: additionOrder,
      correct_count: 19,
      started_at: "2026-07-29T02:00:00.000Z",
      completed_at: "2026-07-29T02:30:00.000Z",
    },
    {
      ...completedAttemptRow,
      id: "88888888-8888-4888-8888-888888888888",
      unit_slug: SUBTRACTION_UNIT_SLUG,
      question_order: subtractionOrder,
      correct_count: 18,
      started_at: "2026-07-30T02:00:00.000Z",
      completed_at: "2026-07-30T02:30:00.000Z",
    },
  ]);
  assert.ok(attempts);
  return attempts;
}

test("Sprint 5C 1. Migration 0020 is next, atomic and validated before commit", () => {
  const migrationPath = join(
    process.cwd(),
    "supabase/migrations/0020_grade1_numbers_to_20.sql",
  );
  assert.equal(existsSync(migrationPath), true);
  const migration = readFileSync(migrationPath, "utf8");
  assert.match(migration, /^\s*begin;/i);
  assert.match(migration, /do \$validation\$[\s\S]*commit;\s*$/i);
  assert.equal(
    existsSync(
      join(
        process.cwd(),
        "supabase/migrations/0021_grade1_numbers_to_20.sql",
      ),
    ),
    false,
  );
});

test("Sprint 5C 2. Migration does not mutate existing learning records", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0020_grade1_numbers_to_20.sql",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    migration,
    /\b(delete|truncate)\s+(from\s+)?public\.(practice_attempts|practice_answers|learning_units|questions|question_solutions)/i,
  );
  assert.doesNotMatch(
    migration,
    /\bupdate\s+public\.(practice_attempts|practice_answers|learning_units)\b/i,
  );
  assert.doesNotMatch(
    migration,
    /create or replace function public\.start_or_resume_practice/,
  );
});

test("Sprint 5C 3. Numbers-to-20 seed has 24 questions, 24 solutions and a 16 plus 8 split", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0020_grade1_numbers_to_20.sql",
    ),
    "utf8",
  );
  const questions = migration.split("$questions$")[1] ?? "";
  const solutions = migration.split("$solutions$")[1] ?? "";
  assert.equal(
    questions.match(/"code":"g1-n20-q\d{2}"/g)?.length,
    24,
  );
  assert.equal(
    solutions.match(/"question_id":"g1-n20-q\d{2}"/g)?.length,
    24,
  );
  assert.equal(
    questions.match(/"question_type":"MULTIPLE_CHOICE"/g)?.length,
    16,
  );
  assert.equal(
    questions.match(/"question_type":"NUMBER_INPUT"/g)?.length,
    8,
  );
});

test("Sprint 5C 4. Four numbers-to-20 skills each own exactly six questions", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0020_grade1_numbers_to_20.sql",
    ),
    "utf8",
  );
  const questions = migration.split("$questions$")[1] ?? "";
  assert.deepEqual(getUnitSkillCodes(NUMBERS_TO_20_UNIT_SLUG), [
    "COUNT_READ_WRITE_TO_20",
    "SEQUENCE_TO_20",
    "COMPARE_ORDER_TO_20",
    "TENS_ONES_TO_20",
  ]);
  for (const skillCode of getUnitSkillCodes(NUMBERS_TO_20_UNIT_SLUG)) {
    assert.equal(
      questions.match(
        new RegExp(`"skill_code":"${skillCode}"`, "g"),
      )?.length,
      6,
    );
    assert.equal(typeof skillLabels[skillCode], "string");
  }
});

test("Sprint 5C 5. Catalog orders four units and routes theory dynamically", () => {
  const units = [
    baseUnitFixture,
    additionUnitFixture,
    subtractionUnitFixture,
    numbersTo20UnitFixture,
  ];
  assert.deepEqual(
    units.map((unit) => unit.slug),
    [
      BASE_UNIT_SLUG,
      ADDITION_UNIT_SLUG,
      SUBTRACTION_UNIT_SLUG,
      NUMBERS_TO_20_UNIT_SLUG,
    ],
  );
  assert.equal(
    getLessonPath(NUMBERS_TO_20_UNIT_SLUG),
    "/learn/grade-1/numbers-to-20",
  );
  assert.equal(
    existsSync(
      join(
        process.cwd(),
        "app/learn/grade-1/numbers-to-20/page.tsx",
      ),
    ),
    false,
  );
});

test("Sprint 5C 6. Theory remains visible while locked practice explains its prerequisite", () => {
  const lessonPage = readFileSync(
    join(
      process.cwd(),
      "app/learn/[gradeSlug]/[lessonSlug]/page.tsx",
    ),
    "utf8",
  );
  const lessonDetail = readFileSync(
    join(process.cwd(), "components/LessonDetail.tsx"),
    "utf8",
  );
  assert.match(lessonPage, /<LessonDetail/);
  assert.match(lessonPage, /practiceUnlocked=\{isUnitPracticeUnlocked/);
  assert.match(
    lessonDetail,
    /Em hãy hoàn thành bài[\s\S]*trước khi[\s\S]*bắt đầu luyện tập bài này/,
  );
  assert.equal(
    isUnitPracticeUnlocked(
      numbersTo20UnitFixture,
      completedChainThroughSubtraction().filter(
        (attempt) => attempt.unitSlug !== SUBTRACTION_UNIT_SLUG,
      ),
    ),
    false,
  );
});

test("Sprint 5C 7. Completing subtraction unlocks numbers-to-20 practice", () => {
  const attempts = completedChainThroughSubtraction();
  assert.equal(
    isUnitPracticeUnlocked(numbersTo20UnitFixture, attempts),
    true,
  );
  assert.equal(
    getSuggestedUnit(
      [
        baseUnitFixture,
        additionUnitFixture,
        subtractionUnitFixture,
        numbersTo20UnitFixture,
      ],
      attempts,
    )?.slug,
    NUMBERS_TO_20_UNIT_SLUG,
  );
});

test("Sprint 5C 8. Direct start requests remain protected by the generic database prerequisite", () => {
  const route = readFileSync(
    join(process.cwd(), "app/api/practice/start/route.ts"),
    "utf8",
  );
  const prerequisiteSource = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0018_grade1_addition_within_10.sql",
    ),
    "utf8",
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0020_grade1_numbers_to_20.sql",
    ),
    "utf8",
  );
  assert.match(route, /p_unit_slug: input\.unitSlug/);
  assert.match(
    prerequisiteSource,
    /prerequisite_attempt\.status = 'COMPLETED'/,
  );
  assert.match(
    migration,
    /unit\.prerequisite_unit_slug[\s\S]*'grade-1-subtraction-within-10'/,
  );
  assert.match(migration, /Practice prerequisite authorization validation/);
});

test("Sprint 5C 9. Start and resume contracts accept the new unit without unit-specific branching", () => {
  const order = Array.from(
    { length: 24 },
    (_, index) => `g1-n20-q${String(index + 1).padStart(2, "0")}`,
  );
  const parsed = parseStartPracticeRpcResult({
    ...startRpcPayload,
    unit_slug: NUMBERS_TO_20_UNIT_SLUG,
    question_order: order,
  });
  assert.ok(parsed);
  assert.equal(parsed.unitSlug, NUMBERS_TO_20_UNIT_SLUG);
  assert.deepEqual(parsed.questionOrder, order);
});

test("Sprint 5C 10. Grading response stays canonical for immediate result rendering", () => {
  const parsed = parseSubmitPracticeRpcResult(correctAnswerRpcPayload);
  assert.ok(parsed);
  assert.equal(parsed.isCorrect, true);
  assert.equal(parsed.answeredCount, 1);
  assert.equal(parsed.solutionSteps.length, 2);
  const runner = readFileSync(
    join(
      process.cwd(),
      "app/practice/[attemptId]/PracticeRunner.tsx",
    ),
    "utf8",
  );
  assert.match(runner, /mergeGradedAnswer/);
  assert.doesNotMatch(runner, /window\.location\.reload/);
});

test("Sprint 5C 11. Review resolves the new title and all four skill labels", () => {
  const reviewModel = readFileSync(
    join(process.cwd(), "lib/practice/review.ts"),
    "utf8",
  );
  assert.match(reviewModel, /getUnitSkillCodes\(review\.unitSlug\)/);
  assert.equal(
    skillLabels.COUNT_READ_WRITE_TO_20,
    "Đếm, đọc và viết số đến 20",
  );
  assert.equal(skillLabels.SEQUENCE_TO_20, "Dãy số đến 20");
  assert.equal(
    skillLabels.COMPARE_ORDER_TO_20,
    "So sánh và sắp xếp",
  );
  assert.equal(skillLabels.TENS_ONES_TO_20, "Chục và đơn vị");
});

test("Sprint 5C 12. Results and retakes keep numbers-to-20 attempts independent", () => {
  const attempts = completedChainThroughSubtraction();
  const order = Array.from(
    { length: 24 },
    (_, index) => `g1-n20-q${String(index + 1).padStart(2, "0")}`,
  );
  const parsed = parseAttemptRows([
    ...attempts.map((attempt) => ({
      id: attempt.id,
      unit_slug: attempt.unitSlug,
      status: attempt.status,
      question_order: attempt.questionOrder,
      total_questions: attempt.totalQuestions,
      answered_count: attempt.answeredCount,
      correct_count: attempt.correctCount,
      started_at: attempt.startedAt,
      completed_at: attempt.completedAt,
    })),
    {
      ...completedAttemptRow,
      id: "99999999-9999-4999-8999-999999999999",
      unit_slug: NUMBERS_TO_20_UNIT_SLUG,
      question_order: order,
      correct_count: 20,
      started_at: "2026-07-31T02:00:00.000Z",
      completed_at: "2026-07-31T02:30:00.000Z",
    },
  ]);
  assert.ok(parsed);
  const history = buildPracticeHistory(parsed);
  assert.equal(
    history.find(
      (attempt) => attempt.unitSlug === NUMBERS_TO_20_UNIT_SLUG,
    )?.attemptNumber,
    1,
  );
  const review = readFileSync(
    join(process.cwd(), "app/review/[attemptId]/page.tsx"),
    "utf8",
  );
  assert.match(review, /unitSlug=\{unit\.slug\}/);
});

test("Sprint 5C 13. Parent dashboard and weekly report accept the new unit and skill", () => {
  const skill = {
    skill_code: "TENS_ONES_TO_20",
    answered_count: 6,
    correct_count: 5,
    accuracy_percent: 83.3,
  };
  const dashboard = parseParentChildLearningDashboard({
    ...emptyParentDashboardPayload,
    skills: [...emptyParentDashboardPayload.skills, skill],
    recent_attempts: [
      {
        unit_title: "Các số trong phạm vi 20",
        attempt_number: 1,
        status: "COMPLETED",
        answered_count: 24,
        total_questions: 24,
        correct_count: 20,
        accuracy_percent: 83.3,
        activity_at: "2026-07-31T04:00:00.000Z",
        completed_at: "2026-07-31T04:00:00.000Z",
      },
    ],
  });
  assert.ok(dashboard);
  assert.equal(dashboard.skills.at(-1)?.skillCode, "TENS_ONES_TO_20");
  const weekly = parseParentWeeklySummary({
    ...weeklySummaryPayload,
    skills: [...weeklySummaryPayload.skills, skill],
  });
  assert.ok(weekly);
  assert.equal(weekly.skills.at(-1)?.skillCode, "TENS_ONES_TO_20");
});

test("Sprint 5C 14. The new presentation is catalog-driven and responsive", () => {
  const presentation = getUnitPresentation(NUMBERS_TO_20_UNIT_SLUG);
  assert.equal(presentation.cardClassName, "unit-card--numbers-20");
  assert.equal(
    presentation.pageClassName,
    "real-learning-page--numbers-20",
  );
  assert.equal(presentation.operationVisual?.result, "= 17");
  const styles = readFileSync(
    join(process.cwd(), "app/globals.css"),
    "utf8",
  );
  assert.match(styles, /\.unit-card--numbers-20/);
  assert.match(styles, /\.real-learning-page--numbers-20/);
  assert.match(styles, /@media \(max-width: 640px\)/);
});

test("Sprint 5C 15. Existing role flows and demo stay outside the migration", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0020_grade1_numbers_to_20.sql",
    ),
    "utf8",
  );
  for (const forbiddenTable of [
    "profiles",
    "learning_goals",
    "parent_student_connections",
    "classrooms",
    "classroom_memberships",
    "teacher_assignments",
    "assignment_submissions",
  ]) {
    assert.doesNotMatch(migration, new RegExp(`public\\.${forbiddenTable}`));
  }
  const demo = readFileSync(
    join(process.cwd(), "app/demo/page.tsx"),
    "utf8",
  );
  assert.doesNotMatch(demo, /learning_units|practice_attempts|numbers-to-20/);
});

function completedChainThroughNumbersTo20() {
  const previous = completedChainThroughSubtraction();
  const numbersOrder = Array.from(
    { length: 24 },
    (_, index) => `g1-n20-q${String(index + 1).padStart(2, "0")}`,
  );
  return [
    ...previous,
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      unitSlug: NUMBERS_TO_20_UNIT_SLUG,
      status: "COMPLETED" as const,
      questionOrder: numbersOrder,
      totalQuestions: 24,
      answeredCount: 24,
      correctCount: 20,
      startedAt: "2026-08-01T02:00:00.000Z",
      completedAt: "2026-08-01T02:30:00.000Z",
    },
  ];
}

test("Sprint 5D 1. The new unit contract parses with its exact prerequisite", () => {
  const parsed = parseLearningUnit({
    slug: ADDITION_TO_20_UNIT_SLUG,
    grade: 1,
    title: "Phép cộng trong phạm vi 20 không nhớ",
    description: "Giữ nguyên một chục và cộng các đơn vị.",
    learning_objectives: ["Cộng được số đến 20 mà không nhớ."],
    lesson_content: {
      sections: lessonSections,
      worked_examples: workedExamples.map((example) => ({
        title: example.title,
        steps: example.steps,
        answer: example.answer,
      })),
    },
    total_questions: 24,
    prerequisite_unit_slug: NUMBERS_TO_20_UNIT_SLUG,
  });
  assert.ok(parsed);
  assert.equal(parsed.slug, ADDITION_TO_20_UNIT_SLUG);
  assert.equal(
    parsed.prerequisiteUnitSlug,
    NUMBERS_TO_20_UNIT_SLUG,
  );
});

test("Sprint 5D 2. Catalog has five units in prerequisite order", () => {
  const units = [
    baseUnitFixture,
    additionUnitFixture,
    subtractionUnitFixture,
    numbersTo20UnitFixture,
    additionTo20UnitFixture,
  ];
  assert.deepEqual(
    units.map((unit) => unit.slug),
    [
      BASE_UNIT_SLUG,
      ADDITION_UNIT_SLUG,
      SUBTRACTION_UNIT_SLUG,
      NUMBERS_TO_20_UNIT_SLUG,
      ADDITION_TO_20_UNIT_SLUG,
    ],
  );
  assert.equal(
    getLessonPath(ADDITION_TO_20_UNIT_SLUG),
    "/learn/grade-1/addition-within-20-no-carry",
  );
});

test("Sprint 5D 3. Practice stays locked before numbers-to-20 is completed", () => {
  assert.equal(
    isUnitPracticeUnlocked(
      additionTo20UnitFixture,
      completedChainThroughSubtraction(),
    ),
    false,
  );
  const lessonDetail = readFileSync(
    join(process.cwd(), "components/LessonDetail.tsx"),
    "utf8",
  );
  assert.match(
    lessonDetail,
    /Em hãy hoàn thành bài[\s\S]*trước khi[\s\S]*bắt đầu luyện tập bài này/,
  );
});

test("Sprint 5D 4. Direct start API cannot bypass the database prerequisite", () => {
  const route = readFileSync(
    join(process.cwd(), "app/api/practice/start/route.ts"),
    "utf8",
  );
  const prerequisiteRpc = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0018_grade1_addition_within_10.sql",
    ),
    "utf8",
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0021_grade1_addition_within_20_no_carry.sql",
    ),
    "utf8",
  );
  assert.match(route, /p_unit_slug: input\.unitSlug/);
  assert.match(
    prerequisiteRpc,
    /prerequisite_attempt\.status = 'COMPLETED'/,
  );
  assert.match(
    migration,
    /unit\.prerequisite_unit_slug = 'grade-1-numbers-to-20'/,
  );
});

test("Sprint 5D 5. Completing numbers-to-20 unlocks the new practice", () => {
  const attempts = completedChainThroughNumbersTo20();
  assert.equal(
    isUnitPracticeUnlocked(additionTo20UnitFixture, attempts),
    true,
  );
  assert.equal(
    getSuggestedUnit(
      [
        baseUnitFixture,
        additionUnitFixture,
        subtractionUnitFixture,
        numbersTo20UnitFixture,
        additionTo20UnitFixture,
      ],
      attempts,
    )?.slug,
    ADDITION_TO_20_UNIT_SLUG,
  );
});

test("Sprint 5D 6. Database keeps one in-progress attempt per Student and unit", () => {
  const schema = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0004_grade1_numbers_to_10.sql",
    ),
    "utf8",
  );
  const startRpc = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0018_grade1_addition_within_10.sql",
    ),
    "utf8",
  );
  assert.match(
    schema,
    /create unique index practice_attempts_one_in_progress_idx[\s\S]*student_id, unit_slug[\s\S]*where status = 'IN_PROGRESS'/,
  );
  assert.match(startRpc, /pg_advisory_xact_lock/);
});

test("Sprint 5D 7. Resume preserves the stored question order for the new unit", () => {
  const order = Array.from(
    { length: 24 },
    (_, index) => `g1-add20-q${String(index + 1).padStart(2, "0")}`,
  );
  const parsed = parseStartPracticeRpcResult({
    ...startRpcPayload,
    unit_slug: ADDITION_TO_20_UNIT_SLUG,
    question_order: order,
    answered_count: 7,
    correct_count: 5,
  });
  assert.ok(parsed);
  assert.deepEqual(parsed.questionOrder, order);
  assert.equal(parsed.answeredCount, 7);
});

test("Sprint 5D 8. A graded answer updates canonical UI state immediately", () => {
  const parsed = parseSubmitPracticeRpcResult(correctAnswerRpcPayload);
  assert.ok(parsed);
  assert.equal(parsed.isCorrect, true);
  assert.equal(parsed.answeredCount, 1);
  assert.equal(parsed.solutionSteps.length, 2);
  const runner = readFileSync(
    join(
      process.cwd(),
      "app/practice/[attemptId]/PracticeRunner.tsx",
    ),
    "utf8",
  );
  assert.match(runner, /mergeGradedAnswer/);
  assert.doesNotMatch(runner, /window\.location\.reload/);
});

test("Sprint 5D 9. Double activation shares one answer request gate", async () => {
  const gate = createSingleFlightGate();
  let requestCount = 0;
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const submit = () =>
    gate.run(async () => {
      requestCount += 1;
      await pending;
    });
  const first = submit();
  const second = await submit();
  assert.deepEqual(second, { started: false });
  assert.equal(requestCount, 1);
  release();
  await first;
});

test("Sprint 5D 10. Review remains owner-only and solution access stays delayed", () => {
  const reviewRpc = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0004_grade1_numbers_to_10.sql",
    ),
    "utf8",
  );
  assert.match(
    reviewRpc,
    /pa\.id = p_attempt_id[\s\S]*pa\.student_id = v_current_user_id/,
  );
  for (const file of [
    "app/dashboard/page.tsx",
    "app/learn/page.tsx",
    "app/lessons/page.tsx",
    "app/practice/[attemptId]/page.tsx",
  ]) {
    assert.doesNotMatch(
      readFileSync(join(process.cwd(), file), "utf8"),
      /question_solutions/,
    );
  }
});

test("Sprint 5D 11. Retakes create independent history without changing old attempts", () => {
  const order = Array.from(
    { length: 24 },
    (_, index) => `g1-add20-q${String(index + 1).padStart(2, "0")}`,
  );
  const attempts = parseAttemptRows([
    {
      ...completedAttemptRow,
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      unit_slug: ADDITION_TO_20_UNIT_SLUG,
      question_order: order,
      correct_count: 18,
      started_at: "2026-08-02T02:00:00.000Z",
      completed_at: "2026-08-02T02:30:00.000Z",
    },
    {
      ...completedAttemptRow,
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      unit_slug: ADDITION_TO_20_UNIT_SLUG,
      question_order: [...order].reverse(),
      correct_count: 21,
      started_at: "2026-08-03T02:00:00.000Z",
      completed_at: "2026-08-03T02:30:00.000Z",
    },
  ]);
  assert.ok(attempts);
  const history = buildPracticeHistory(attempts);
  assert.deepEqual(
    history.map((attempt) => attempt.attemptNumber),
    [2, 1],
  );
  assert.notEqual(history[0]?.id, history[1]?.id);
});

test("Sprint 5D 12. Results group the fifth unit independently", () => {
  const history = readFileSync(
    join(process.cwd(), "components/PracticeHistory.tsx"),
    "utf8",
  );
  const results = readFileSync(
    join(process.cwd(), "app/results/page.tsx"),
    "utf8",
  );
  assert.match(history, /group\.unitSlug/);
  assert.match(history, /unitTitles\[group\.unitSlug\]/);
  assert.match(results, /loadStudentCurriculumHistory/);
  assert.match(results, /StudentCurriculumHistoryView/);
});

test("Sprint 5D 13. Dashboard recommends the first unfinished unit", () => {
  const units = [
    baseUnitFixture,
    additionUnitFixture,
    subtractionUnitFixture,
    numbersTo20UnitFixture,
    additionTo20UnitFixture,
  ];
  assert.equal(
    getSuggestedUnit(units, completedChainThroughNumbersTo20())?.slug,
    ADDITION_TO_20_UNIT_SLUG,
  );
  const dashboard = readFileSync(
    join(process.cwd(), "app/dashboard/page.tsx"),
    "utf8",
  );
  const personalizedPath = readFileSync(
    join(process.cwd(), "lib/personalized-path/contracts.ts"),
    "utf8",
  );
  assert.match(dashboard, /loadStudentPersonalizedPathWithClient/);
  assert.match(personalizedPath, /NEXT_UNLOCKED_UNIT/);
  assert.match(personalizedPath, /item\.state === "AVAILABLE"/);
});

test("Sprint 5D 14. Parent parsers accept the fifth unit and its skills", () => {
  const skill = {
    skill_code: "ADD_USING_TENS_ONES",
    answered_count: 6,
    correct_count: 5,
    accuracy_percent: 83.3,
  };
  const dashboard = parseParentChildLearningDashboard({
    ...emptyParentDashboardPayload,
    skills: [...emptyParentDashboardPayload.skills, skill],
    recent_attempts: [
      {
        unit_title: "Phép cộng trong phạm vi 20 không nhớ",
        attempt_number: 1,
        status: "COMPLETED",
        answered_count: 24,
        total_questions: 24,
        correct_count: 20,
        accuracy_percent: 83.3,
        activity_at: "2026-08-03T04:00:00.000Z",
        completed_at: "2026-08-03T04:00:00.000Z",
      },
    ],
  });
  assert.ok(dashboard);
  assert.equal(
    dashboard.skills.at(-1)?.skillCode,
    "ADD_USING_TENS_ONES",
  );
  const weekly = parseParentWeeklySummary({
    ...weeklySummaryPayload,
    skills: [...weeklySummaryPayload.skills, skill],
  });
  assert.ok(weekly);
  assert.equal(weekly.skills.at(-1)?.skillCode, "ADD_USING_TENS_ONES");
});

test("Sprint 5D 15. Four previous unit contracts and paths remain valid", () => {
  for (const unit of [
    baseUnitFixture,
    additionUnitFixture,
    subtractionUnitFixture,
    numbersTo20UnitFixture,
  ]) {
    assert.equal(unit.totalQuestions, 24);
    assert.match(getLessonPath(unit.slug), /^\/learn\/grade-1\//);
    assert.equal(getUnitSkillCodes(unit.slug).length, 4);
  }
  assert.ok(parseStartPracticeRpcResult(startRpcPayload));
});

test("Sprint 5D 16. Other role and classroom data stay outside migration scope", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0021_grade1_addition_within_20_no_carry.sql",
    ),
    "utf8",
  );
  for (const table of [
    "profiles",
    "learning_goals",
    "parent_student_connections",
    "classrooms",
    "classroom_memberships",
    "teacher_assignments",
    "assignment_submissions",
  ]) {
    assert.doesNotMatch(migration, new RegExp(`public\\.${table}`));
  }
});

test("Sprint 5D 17. Demo stays independent from the fifth learning unit", () => {
  const demo = readFileSync(
    join(process.cwd(), "app/demo/page.tsx"),
    "utf8",
  );
  assert.doesNotMatch(
    demo,
    /learning_units|practice_attempts|addition-within-20-no-carry/,
  );
});

test("Sprint 5D 18. Protected Student routes retain the server auth gate", () => {
  const learnSource = readFileSync(
    join(process.cwd(), "app/learn/page.tsx"),
    "utf8",
  );
  const resultsSource = readFileSync(
    join(process.cwd(), "app/results/page.tsx"),
    "utf8",
  );
  const curriculumServer = readFileSync(
    join(process.cwd(), "lib/curriculum-runtime/server.ts"),
    "utf8",
  );
  assert.match(learnSource, /getStudentLearningContext/);
  assert.match(learnSource, /redirect\("\/login"\)/);
  assert.match(resultsSource, /loadStudentCurriculumHistory/);
  assert.match(resultsSource, /redirect\("\/login"\)/);
  assert.match(curriculumServer, /getStudentLearningContext/);
  const lessons = readFileSync(
    join(process.cwd(), "app/lessons/page.tsx"),
    "utf8",
  );
  const personalizedServer = readFileSync(
    join(process.cwd(), "lib/personalized-path/server.ts"),
    "utf8",
  );
  assert.match(lessons, /loadStudentPersonalizedPath/);
  assert.match(lessons, /redirect\("\/login"\)/);
  assert.match(personalizedServer, /getStudentLearningContext/);
  const dashboard = readFileSync(
    join(process.cwd(), "app/dashboard/page.tsx"),
    "utf8",
  );
  assert.match(dashboard, /auth\.getUser\(\)/);
  assert.match(dashboard, /redirect\("\/login"\)/);
});

test("Sprint 5D hotfix 1. Number input accepts valid answers above ten", () => {
  assert.equal(normalizePracticeNumberInput("0"), "0");
  assert.equal(normalizePracticeNumberInput("10"), "10");
  assert.equal(normalizePracticeNumberInput("15"), "15");
  assert.equal(normalizePracticeNumberInput("20"), "20");
});

test("Sprint 5D hotfix 2. Number input still rejects malformed values", () => {
  for (const value of ["", "-1", "1.5", "abc", "015", "1000000"]) {
    assert.equal(normalizePracticeNumberInput(value), null);
  }
});

test("Sprint 5D hotfix 3. Practice Runner no longer applies the legacy 0-to-10 range", () => {
  const runner = readFileSync(
    join(
      process.cwd(),
      "app/practice/[attemptId]/PracticeRunner.tsx",
    ),
    "utf8",
  );
  assert.match(runner, /normalizePracticeNumberInput/);
  assert.match(
    runner,
    /maxLength=\{PRACTICE_NUMBER_INPUT_MAX_DIGITS\}/,
  );
  assert.doesNotMatch(runner, /số nguyên từ 0 đến 10/);
  assert.doesNotMatch(runner, /\^\(\?:\[0-9\]\|10\)\$/);
});

test("Sprint 5D hotfix 4. Database grading accepts bounded integers without exposing solutions", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0022_expand_practice_number_input.sql",
    ),
    "utf8",
  );
  assert.match(migration, /^begin;/);
  assert.match(migration, /create or replace function public\.submit_practice_answer/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /\^\[0-9\]\{1,6\}\$/);
  assert.doesNotMatch(migration, /v_normalized_answer::integer not between 0 and 10/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /student_id = v_current_user_id/);
  assert.match(
    migration,
    /revoke all on function public\.submit_practice_answer\(uuid, text, text\)[\s\S]*from anon/,
  );
  assert.match(
    migration,
    /grant execute on function public\.submit_practice_answer\(uuid, text, text\)[\s\S]*to authenticated/,
  );
  assert.doesNotMatch(
    migration,
    /grant\s+select\s+on\s+(table\s+)?public\.question_solutions/i,
  );
  assert.match(migration, /commit;\s*$/);
});

test("Sprint 5D hotfix 5. Grading fix does not mutate existing learning records", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0022_expand_practice_number_input.sql",
    ),
    "utf8",
  );
  const functionStart = migration.indexOf(
    "create or replace function public.submit_practice_answer",
  );
  const functionEnd = migration.indexOf("$$;", functionStart) + 3;
  const migrationStatements =
    migration.slice(0, functionStart) + migration.slice(functionEnd);
  assert.doesNotMatch(
    migrationStatements,
    /(?:insert\s+into|update|delete\s+from|truncate)\s+public\.(?:practice_attempts|practice_answers|questions|question_solutions|learning_units)/i,
  );
});

function completedChainThroughAdditionTo20() {
  const previous = completedChainThroughNumbersTo20();
  const additionOrder = Array.from(
    { length: 24 },
    (_, index) => `g1-add20-q${String(index + 1).padStart(2, "0")}`,
  );
  return [
    ...previous,
    {
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      unitSlug: ADDITION_TO_20_UNIT_SLUG,
      status: "COMPLETED" as const,
      questionOrder: additionOrder,
      totalQuestions: 24,
      answeredCount: 24,
      correctCount: 19,
      startedAt: "2026-08-04T02:00:00.000Z",
      completedAt: "2026-08-04T02:30:00.000Z",
    },
  ];
}

test("Sprint 5E 1. Migration 0023 is the next atomic migration", () => {
  assert.equal(
    existsSync(
      join(
        process.cwd(),
        "supabase/migrations/0022_expand_practice_number_input.sql",
      ),
    ),
    true,
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0023_grade1_subtraction_within_20_no_borrow.sql",
    ),
    "utf8",
  );
  assert.match(migration, /^begin;/);
  assert.match(migration, /do \$validation\$/);
  assert.ok(
    migration.indexOf("do $validation$") < migration.lastIndexOf("commit;"),
  );
  assert.match(migration, /commit;\s*$/);
});

test("Sprint 5E 2. Seed has 24 questions, 24 solutions and a 16 plus 8 split", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0023_grade1_subtraction_within_20_no_borrow.sql",
    ),
    "utf8",
  );
  const questions = migration.split("$questions$")[1] ?? "";
  const solutions = migration.split("$solutions$")[1] ?? "";
  assert.equal(
    questions.match(/"code":"g1-sub20-q\d{2}"/g)?.length,
    24,
  );
  assert.equal(
    solutions.match(/"question_id":"g1-sub20-q\d{2}"/g)?.length,
    24,
  );
  assert.equal(
    questions.match(/"question_type":"MULTIPLE_CHOICE"/g)?.length,
    16,
  );
  assert.equal(
    questions.match(/"question_type":"NUMBER_INPUT"/g)?.length,
    8,
  );
});

test("Sprint 5E 3. Four approved skills each own six questions", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0023_grade1_subtraction_within_20_no_borrow.sql",
    ),
    "utf8",
  );
  const questions = migration.split("$questions$")[1] ?? "";
  assert.deepEqual(getUnitSkillCodes(SUBTRACTION_TO_20_UNIT_SLUG), [
    "SUBTRACTION_MEANING",
    "SUBTRACTION_WITHIN_20_NO_BORROW",
    "MISSING_NUMBER_SUBTRACTION",
    "SUBTRACTION_WORD_PROBLEM",
  ]);
  for (const skillCode of getUnitSkillCodes(
    SUBTRACTION_TO_20_UNIT_SLUG,
  )) {
    assert.equal(
      questions.match(
        new RegExp(`"skill_code":"${skillCode}"`, "g"),
      )?.length,
      6,
    );
    assert.equal(typeof skillLabels[skillCode], "string");
  }
});

test("Sprint 5E 4. Catalog exposes six units in prerequisite order", () => {
  const units = [
    baseUnitFixture,
    additionUnitFixture,
    subtractionUnitFixture,
    numbersTo20UnitFixture,
    additionTo20UnitFixture,
    subtractionTo20UnitFixture,
  ];
  assert.deepEqual(
    units.map((unit) => unit.slug),
    [
      BASE_UNIT_SLUG,
      ADDITION_UNIT_SLUG,
      SUBTRACTION_UNIT_SLUG,
      NUMBERS_TO_20_UNIT_SLUG,
      ADDITION_TO_20_UNIT_SLUG,
      SUBTRACTION_TO_20_UNIT_SLUG,
    ],
  );
  assert.equal(
    getLessonPath(SUBTRACTION_TO_20_UNIT_SLUG),
    "/learn/grade-1/subtraction-within-20-no-borrow",
  );
});

test("Sprint 5E 5. Theory is routable while practice remains locked", () => {
  assert.equal(
    isUnitPracticeUnlocked(
      subtractionTo20UnitFixture,
      completedChainThroughNumbersTo20(),
    ),
    false,
  );
  const lessonPage = readFileSync(
    join(
      process.cwd(),
      "app/learn/[gradeSlug]/[lessonSlug]/page.tsx",
    ),
    "utf8",
  );
  assert.match(lessonPage, /getUnitSlugFromLessonRoute/);
  assert.match(lessonPage, /practiceUnlocked=\{isUnitPracticeUnlocked/);
});

test("Sprint 5E 6. Completing addition to 20 unlocks subtraction", () => {
  const attempts = completedChainThroughAdditionTo20();
  assert.equal(
    isUnitPracticeUnlocked(subtractionTo20UnitFixture, attempts),
    true,
  );
  assert.equal(
    getSuggestedUnit(
      [
        baseUnitFixture,
        additionUnitFixture,
        subtractionUnitFixture,
        numbersTo20UnitFixture,
        additionTo20UnitFixture,
        subtractionTo20UnitFixture,
      ],
      attempts,
    )?.slug,
    SUBTRACTION_TO_20_UNIT_SLUG,
  );
});

test("Sprint 5E 7. Direct start requests cannot bypass the prerequisite", () => {
  const route = readFileSync(
    join(process.cwd(), "app/api/practice/start/route.ts"),
    "utf8",
  );
  const startRpc = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0018_grade1_addition_within_10.sql",
    ),
    "utf8",
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0023_grade1_subtraction_within_20_no_borrow.sql",
    ),
    "utf8",
  );
  assert.match(route, /p_unit_slug: input\.unitSlug/);
  assert.match(
    startRpc,
    /prerequisite_attempt\.status = 'COMPLETED'/,
  );
  assert.match(startRpc, /profile\.user_id = v_current_user_id/);
  assert.match(startRpc, /profile\.role = 'STUDENT'/);
  assert.match(startRpc, /profile\.onboarding_completed/);
  assert.match(startRpc, /attempt\.student_id = v_current_user_id/);
  assert.match(
    migration,
    /v_start_definition !~ 'profile\.user_id = v_current_user_id'/,
  );
  assert.doesNotMatch(
    migration,
    /v_start_definition !~ 'student\.user_id = v_current_user_id'/,
  );
  assert.match(
    migration,
    /prerequisite_unit_slug[\s\S]*'grade-1-addition-within-20-no-carry'/,
  );
});

test("Sprint 5E 8. Shared input accepts future integers while unit content keeps its own 0-through-20 boundary", () => {
  for (const value of ["0", "9", "10", "11", "15", "19", "20", "101", "1000"]) {
    assert.equal(normalizePracticeNumberInput(value), value);
  }
  for (const value of ["-1", "1.5", "abc", "1000000"]) {
    assert.equal(normalizePracticeNumberInput(value), null);
  }
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0023_grade1_subtraction_within_20_no_borrow.sql",
    ),
    "utf8",
  );
  assert.match(
    migration,
    /v_normalized_answer::integer not between 0 and 20/,
  );
});

test("Sprint 5E 9. Content validation rejects borrowing and out-of-range facts", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0023_grade1_subtraction_within_20_no_borrow.sql",
    ),
    "utf8",
  );
  assert.match(migration, /regexp_matches/);
  assert.match(migration, /subtraction to 20 no-borrow validation failed/);
  assert.match(
    migration,
    /mod\(\(expression\.parts\)\[1\]::integer, 10\)[\s\S]*mod\(\(expression\.parts\)\[2\]::integer, 10\)/,
  );
});

test("Sprint 5E 10. Start and resume preserve the new unit question order", () => {
  const order = Array.from(
    { length: 24 },
    (_, index) => `g1-sub20-q${String(index + 1).padStart(2, "0")}`,
  );
  const parsed = parseStartPracticeRpcResult({
    ...startRpcPayload,
    unit_slug: SUBTRACTION_TO_20_UNIT_SLUG,
    question_order: order,
    answered_count: 8,
    correct_count: 6,
  });
  assert.ok(parsed);
  assert.deepEqual(parsed.questionOrder, order);
  assert.equal(parsed.answeredCount, 8);
  const schema = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0004_grade1_numbers_to_10.sql",
    ),
    "utf8",
  );
  assert.match(schema, /practice_attempts_one_in_progress_idx/);
});

test("Sprint 5E 11. Practice review parses the new skill without exposing it early", () => {
  const review = parsePracticeReviewRpcResult({
    attempt_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    unit_slug: SUBTRACTION_TO_20_UNIT_SLUG,
    status: "IN_PROGRESS",
    total_questions: 24,
    answered_count: 1,
    correct_count: 1,
    started_at: "2026-08-05T02:00:00.000Z",
    completed_at: null,
    answers: [
      {
        question_id: "g1-sub20-q11",
        question_type: "NUMBER_INPUT",
        prompt: "Tính rồi nhập kết quả của phép trừ 14 − 4.",
        options: null,
        skill_code: "SUBTRACTION_WITHIN_20_NO_BORROW",
        student_answer: "10",
        is_correct: true,
        correct_answer: "10",
        solution_steps: ["Tách chục và đơn vị.", "Bớt bốn đơn vị."],
        explanation: "Mười bốn bớt bốn còn mười.",
        hint: "Giữ một chục.",
        answered_at: "2026-08-05T02:01:00.000Z",
      },
    ],
  });
  assert.ok(review);
  assert.equal(
    review.answers[0]?.skillCode,
    "SUBTRACTION_WITHIN_20_NO_BORROW",
  );
  assert.equal(
    getPracticeReviewPath(review.attemptId),
    `/review/${review.attemptId}`,
  );
});

test("Sprint 5E 12. Results and retakes remain independent for the sixth unit", () => {
  const order = Array.from(
    { length: 24 },
    (_, index) => `g1-sub20-q${String(index + 1).padStart(2, "0")}`,
  );
  const attempts = [
    ...completedChainThroughAdditionTo20(),
    {
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1",
      unitSlug: SUBTRACTION_TO_20_UNIT_SLUG,
      status: "COMPLETED" as const,
      questionOrder: order,
      totalQuestions: 24,
      answeredCount: 24,
      correctCount: 18,
      startedAt: "2026-08-05T02:00:00.000Z",
      completedAt: "2026-08-05T02:30:00.000Z",
    },
    {
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2",
      unitSlug: SUBTRACTION_TO_20_UNIT_SLUG,
      status: "COMPLETED" as const,
      questionOrder: [...order].reverse(),
      totalQuestions: 24,
      answeredCount: 24,
      correctCount: 21,
      startedAt: "2026-08-06T02:00:00.000Z",
      completedAt: "2026-08-06T02:30:00.000Z",
    },
  ];
  const history = buildPracticeHistory(attempts);
  assert.deepEqual(
    history
      .filter(
        (attempt) =>
          attempt.unitSlug === SUBTRACTION_TO_20_UNIT_SLUG,
      )
      .map((attempt) => attempt.attemptNumber),
    [2, 1],
  );
  const results = readFileSync(
    join(process.cwd(), "app/results/page.tsx"),
    "utf8",
  );
  assert.match(results, /loadStudentCurriculumHistory/);
  assert.match(results, /StudentCurriculumHistoryView/);
});

test("Sprint 5E 13. Parent dashboard and weekly report accept the new skill", () => {
  const skill = {
    skill_code: "MISSING_NUMBER_SUBTRACTION",
    answered_count: 6,
    correct_count: 5,
    accuracy_percent: 83.3,
  };
  const dashboard = parseParentChildLearningDashboard({
    ...emptyParentDashboardPayload,
    skills: [...emptyParentDashboardPayload.skills, skill],
  });
  assert.ok(dashboard);
  assert.equal(
    dashboard.skills.at(-1)?.skillCode,
    "MISSING_NUMBER_SUBTRACTION",
  );
  const weekly = parseParentWeeklySummary({
    ...weeklySummaryPayload,
    skills: [...weeklySummaryPayload.skills, skill],
  });
  assert.ok(weekly);
  assert.equal(
    weekly.skills.at(-1)?.skillCode,
    "MISSING_NUMBER_SUBTRACTION",
  );
});

test("Sprint 5E 14. Presentation is dynamic and uses a non-error semantic color", () => {
  const presentation = getUnitPresentation(SUBTRACTION_TO_20_UNIT_SLUG);
  assert.equal(presentation.cardClassName, "unit-card--subtraction-20");
  assert.equal(
    presentation.pageClassName,
    "real-learning-page--subtraction-20",
  );
  assert.equal(presentation.operationVisual?.operator, "−");
  const styles = readFileSync(
    join(process.cwd(), "app/globals.css"),
    "utf8",
  );
  assert.match(styles, /\.unit-card--subtraction-20/);
  assert.match(styles, /\.real-learning-page--subtraction-20/);
});

test("Sprint 5E 15. Solutions remain behind owner-checked grading RPCs", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0023_grade1_subtraction_within_20_no_borrow.sql",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    migration,
    /grant\s+select\s+on\s+(table\s+)?public\.question_solutions/i,
  );
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /attempt\.student_id = v_current_user_id/);
  for (const file of [
    "app/dashboard/page.tsx",
    "app/learn/page.tsx",
    "app/lessons/page.tsx",
    "app/practice/[attemptId]/page.tsx",
  ]) {
    assert.doesNotMatch(
      readFileSync(join(process.cwd(), file), "utf8"),
      /question_solutions/,
    );
  }
});

test("Sprint 5E 16. Existing role data and demo remain outside the migration", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0023_grade1_subtraction_within_20_no_borrow.sql",
    ),
    "utf8",
  );
  for (const table of [
    "learning_goals",
    "parent_student_connections",
    "classrooms",
    "classroom_memberships",
    "teacher_assignments",
    "assignment_submissions",
  ]) {
    assert.doesNotMatch(migration, new RegExp(`public\\.${table}`));
  }
  const demo = readFileSync(
    join(process.cwd(), "app/demo/page.tsx"),
    "utf8",
  );
  assert.doesNotMatch(
    demo,
    /learning_units|practice_attempts|subtraction-within-20-no-borrow/,
  );
});

function completedChainThroughSubtractionTo20() {
  const previous = completedChainThroughAdditionTo20();
  const subtractionOrder = Array.from(
    { length: 24 },
    (_, index) => `g1-sub20-q${String(index + 1).padStart(2, "0")}`,
  );
  return [
    ...previous,
    {
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      unitSlug: SUBTRACTION_TO_20_UNIT_SLUG,
      status: "COMPLETED" as const,
      questionOrder: subtractionOrder,
      totalQuestions: 24,
      answeredCount: 24,
      correctCount: 20,
      startedAt: "2026-08-07T02:00:00.000Z",
      completedAt: "2026-08-07T02:30:00.000Z",
    },
  ];
}

test("Sprint 5F 1. Migration 0024 is next, atomic and validated before commit", () => {
  assert.equal(
    existsSync(
      join(
        process.cwd(),
        "supabase/migrations/0023_grade1_subtraction_within_20_no_borrow.sql",
      ),
    ),
    true,
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0024_grade1_numbers_to_100.sql",
    ),
    "utf8",
  );
  assert.match(migration, /^begin;/);
  assert.match(migration, /do \$validation\$/);
  assert.ok(
    migration.indexOf("do $validation$") < migration.lastIndexOf("commit;"),
  );
  assert.match(migration, /commit;\s*$/);
});

test("Sprint 5F 2. Seed has 24 questions, 24 solutions and a 16 plus 8 split", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0024_grade1_numbers_to_100.sql",
    ),
    "utf8",
  );
  const questions = migration.split("$questions$")[1] ?? "";
  const solutions = migration.split("$solutions$")[1] ?? "";
  assert.equal(
    questions.match(/"code":"g1-num100-q\d{2}"/g)?.length,
    24,
  );
  assert.equal(
    solutions.match(/"question_id":"g1-num100-q\d{2}"/g)?.length,
    24,
  );
  assert.equal(
    questions.match(/"question_type":"MULTIPLE_CHOICE"/g)?.length,
    16,
  );
  assert.equal(
    questions.match(/"question_type":"NUMBER_INPUT"/g)?.length,
    8,
  );
  assert.match(migration, /pg_catalog\.jsonb_object_keys\(question\.options\)/);
  assert.doesNotMatch(migration, /jsonb_object_length/);
});

test("Sprint 5F 3. Four numbers-to-100 skills each own six questions", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0024_grade1_numbers_to_100.sql",
    ),
    "utf8",
  );
  const questions = migration.split("$questions$")[1] ?? "";
  assert.deepEqual(getUnitSkillCodes(NUMBERS_TO_100_UNIT_SLUG), [
    "COUNT_RECOGNIZE_TO_100",
    "READ_WRITE_TO_100",
    "TENS_ONES_COMPOSE",
    "COMPARE_ORDER_TO_100",
  ]);
  for (const skillCode of getUnitSkillCodes(NUMBERS_TO_100_UNIT_SLUG)) {
    assert.equal(
      questions.match(
        new RegExp(`"skill_code":"${skillCode}"`, "g"),
      )?.length,
      6,
    );
    assert.equal(typeof skillLabels[skillCode], "string");
  }
});

test("Sprint 5F 4. Catalog exposes seven units in prerequisite order", () => {
  const units = [
    baseUnitFixture,
    additionUnitFixture,
    subtractionUnitFixture,
    numbersTo20UnitFixture,
    additionTo20UnitFixture,
    subtractionTo20UnitFixture,
    numbersTo100UnitFixture,
  ];
  assert.deepEqual(
    units.map((unit) => unit.slug),
    [
      BASE_UNIT_SLUG,
      ADDITION_UNIT_SLUG,
      SUBTRACTION_UNIT_SLUG,
      NUMBERS_TO_20_UNIT_SLUG,
      ADDITION_TO_20_UNIT_SLUG,
      SUBTRACTION_TO_20_UNIT_SLUG,
      NUMBERS_TO_100_UNIT_SLUG,
    ],
  );
  assert.equal(
    getLessonPath(NUMBERS_TO_100_UNIT_SLUG),
    "/learn/grade-1/numbers-to-100",
  );
  assert.equal(
    parseLearningUnit({
      slug: NUMBERS_TO_100_UNIT_SLUG,
      grade: 1,
      title: "Các số trong phạm vi 100",
      description: "Đếm, đọc, viết và cấu tạo số đến 100.",
      learning_objectives: ["Đọc và viết số đến 100."],
      lesson_content: {
        sections: lessonSections,
        worked_examples: workedExamples.map((example) => ({
          title: example.title,
          steps: example.steps,
          answer: example.answer,
        })),
      },
      total_questions: 24,
      prerequisite_unit_slug: SUBTRACTION_TO_20_UNIT_SLUG,
    })?.slug,
    NUMBERS_TO_100_UNIT_SLUG,
  );
});

test("Sprint 5F 5. Theory is routable while practice remains locked", () => {
  assert.equal(
    isUnitPracticeUnlocked(
      numbersTo100UnitFixture,
      completedChainThroughAdditionTo20(),
    ),
    false,
  );
  const lessonPage = readFileSync(
    join(
      process.cwd(),
      "app/learn/[gradeSlug]/[lessonSlug]/page.tsx",
    ),
    "utf8",
  );
  assert.match(lessonPage, /getUnitSlugFromLessonRoute/);
  assert.match(lessonPage, /practiceUnlocked=\{isUnitPracticeUnlocked/);
});

test("Sprint 5F 6. Completing subtraction-to-20 unlocks the next unit", () => {
  const attempts = completedChainThroughSubtractionTo20();
  assert.equal(
    isUnitPracticeUnlocked(numbersTo100UnitFixture, attempts),
    true,
  );
  assert.equal(
    getSuggestedUnit(
      [
        baseUnitFixture,
        additionUnitFixture,
        subtractionUnitFixture,
        numbersTo20UnitFixture,
        additionTo20UnitFixture,
        subtractionTo20UnitFixture,
        numbersTo100UnitFixture,
      ],
      attempts,
    )?.slug,
    NUMBERS_TO_100_UNIT_SLUG,
  );
});

test("Sprint 5F 7. Database start boundary protects prerequisite, grade and role", () => {
  const startRpc = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0018_grade1_addition_within_10.sql",
    ),
    "utf8",
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0024_grade1_numbers_to_100.sql",
    ),
    "utf8",
  );
  assert.match(startRpc, /profile\.role = 'STUDENT'/);
  assert.match(startRpc, /v_unit_grade <> v_student_grade/);
  assert.match(
    startRpc,
    /prerequisite_attempt\.status = 'COMPLETED'/,
  );
  assert.match(
    migration,
    /'grade-1-numbers-to-100'[\s\S]*'grade-1-subtraction-within-20-no-borrow'/,
  );
  assert.match(
    migration,
    /v_start_definition !~ 'profile\.user_id = v_current_user_id'/,
  );
});

test("Sprint 5F 8. Shared NUMBER_INPUT accepts canonical integers beyond the unit-specific 100 boundary", () => {
  for (const value of ["0", "9", "20", "21", "63", "99", "100", "101", "1000"]) {
    assert.equal(normalizePracticeNumberInput(value), value);
  }
  for (const value of ["-1", "001", "1.5", "abc", "1000000"]) {
    assert.equal(normalizePracticeNumberInput(value), null);
  }
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0024_grade1_numbers_to_100.sql",
    ),
    "utf8",
  );
  assert.match(
    migration,
    /v_normalized_answer::integer not between 0 and 100/,
  );
});

test("Sprint 5F 9. Legacy unit validators retain their own curriculum bounds", () => {
  const foundation = readFileSync(
    join(process.cwd(), "scripts/validate-grade1-addition.mjs"),
    "utf8",
  );
  const numbersTo20 = readFileSync(
    join(process.cwd(), "scripts/validate-grade1-numbers-to-20.mjs"),
    "utf8",
  );
  const runner = readFileSync(
    join(
      process.cwd(),
      "app/practice/[attemptId]/PracticeRunner.tsx",
    ),
    "utf8",
  );
  assert.match(foundation, /phạm vi 0–10/);
  assert.match(numbersTo20, /phạm vi 0–20/);
  assert.match(
    runner,
    /maxLength=\{PRACTICE_NUMBER_INPUT_MAX_DIGITS\}/,
  );
  assert.doesNotMatch(runner, /between 0 and 20|từ 0 đến 20/);
});

test("Sprint 5F 10. Start and resume preserve the new unit question order", () => {
  const order = Array.from(
    { length: 24 },
    (_, index) => `g1-num100-q${String(index + 1).padStart(2, "0")}`,
  );
  const parsed = parseStartPracticeRpcResult({
    ...startRpcPayload,
    unit_slug: NUMBERS_TO_100_UNIT_SLUG,
    question_order: order,
    answered_count: 7,
    correct_count: 6,
  });
  assert.ok(parsed);
  assert.deepEqual(parsed.questionOrder, order);
  assert.equal(parsed.answeredCount, 7);
  const schema = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0004_grade1_numbers_to_10.sql",
    ),
    "utf8",
  );
  assert.match(schema, /practice_attempts_one_in_progress_idx/);
});

test("Sprint 5F 11. Review parses the new title path and four skills", () => {
  const review = parsePracticeReviewRpcResult({
    attempt_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    unit_slug: NUMBERS_TO_100_UNIT_SLUG,
    status: "IN_PROGRESS",
    total_questions: 24,
    answered_count: 1,
    correct_count: 1,
    started_at: "2026-08-08T02:00:00.000Z",
    completed_at: null,
    answers: [
      {
        question_id: "g1-num100-q12",
        question_type: "NUMBER_INPUT",
        prompt: "Viết bằng chữ số: một trăm.",
        options: null,
        skill_code: "READ_WRITE_TO_100",
        student_answer: "100",
        is_correct: true,
        correct_answer: "100",
        solution_steps: ["Nhận ra cách đọc.", "Viết số 100."],
        explanation: "Một trăm được viết là 100.",
        hint: "Đếm tiếp sau chín mươi chín.",
        answered_at: "2026-08-08T02:01:00.000Z",
      },
    ],
  });
  assert.ok(review);
  assert.equal(review.answers[0]?.skillCode, "READ_WRITE_TO_100");
  assert.equal(
    getPracticeReviewPath(review.attemptId),
    `/review/${review.attemptId}`,
  );
});

test("Sprint 5F 12. Results and retakes remain independent for the seventh unit", () => {
  const order = Array.from(
    { length: 24 },
    (_, index) => `g1-num100-q${String(index + 1).padStart(2, "0")}`,
  );
  const attempts = [
    ...completedChainThroughSubtractionTo20(),
    {
      id: "ffffffff-ffff-4fff-8fff-fffffffffff1",
      unitSlug: NUMBERS_TO_100_UNIT_SLUG,
      status: "COMPLETED" as const,
      questionOrder: order,
      totalQuestions: 24,
      answeredCount: 24,
      correctCount: 19,
      startedAt: "2026-08-08T02:00:00.000Z",
      completedAt: "2026-08-08T02:30:00.000Z",
    },
    {
      id: "ffffffff-ffff-4fff-8fff-fffffffffff2",
      unitSlug: NUMBERS_TO_100_UNIT_SLUG,
      status: "COMPLETED" as const,
      questionOrder: [...order].reverse(),
      totalQuestions: 24,
      answeredCount: 24,
      correctCount: 22,
      startedAt: "2026-08-09T02:00:00.000Z",
      completedAt: "2026-08-09T02:30:00.000Z",
    },
  ];
  const history = buildPracticeHistory(attempts);
  assert.deepEqual(
    history
      .filter((attempt) => attempt.unitSlug === NUMBERS_TO_100_UNIT_SLUG)
      .map((attempt) => attempt.attemptNumber),
    [2, 1],
  );
  const results = readFileSync(
    join(process.cwd(), "app/results/page.tsx"),
    "utf8",
  );
  assert.match(results, /loadStudentCurriculumHistory/);
  assert.match(results, /StudentCurriculumHistoryView/);
});

test("Sprint 5F 13. Parent dashboard and weekly report accept the new skill", () => {
  const skill = {
    skill_code: "TENS_ONES_COMPOSE",
    answered_count: 6,
    correct_count: 5,
    accuracy_percent: 83.3,
  };
  const dashboard = parseParentChildLearningDashboard({
    ...emptyParentDashboardPayload,
    skills: [...emptyParentDashboardPayload.skills, skill],
  });
  assert.ok(dashboard);
  assert.equal(dashboard.skills.at(-1)?.skillCode, "TENS_ONES_COMPOSE");
  const weekly = parseParentWeeklySummary({
    ...weeklySummaryPayload,
    skills: [...weeklySummaryPayload.skills, skill],
  });
  assert.ok(weekly);
  assert.equal(weekly.skills.at(-1)?.skillCode, "TENS_ONES_COMPOSE");
});

test("Sprint 5F 14. Answers stay private and other roles cannot cross the Student boundary", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0024_grade1_numbers_to_100.sql",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    migration,
    /grant\s+select\s+on\s+(table\s+)?public\.question_solutions/i,
  );
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /attempt\.student_id = v_current_user_id/);
  assert.match(migration, /profile\.role = 'STUDENT'/);
  for (const file of [
    "app/dashboard/page.tsx",
    "app/learn/page.tsx",
    "app/lessons/page.tsx",
    "app/practice/[attemptId]/page.tsx",
  ]) {
    assert.doesNotMatch(
      readFileSync(join(process.cwd(), file), "utf8"),
      /question_solutions/,
    );
  }
});

test("Sprint 5F 15. Existing learning and role records stay outside the migration", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0024_grade1_numbers_to_100.sql",
    ),
    "utf8",
  );
  for (const table of [
    "learning_goals",
    "parent_student_connections",
    "classrooms",
    "classroom_memberships",
    "teacher_assignments",
    "assignment_submissions",
  ]) {
    assert.doesNotMatch(migration, new RegExp(`public\\.${table}`));
  }
  assert.doesNotMatch(
    migration,
    /(?:delete\s+from|truncate)\s+public\.(?:learning_units|questions|question_solutions|practice_attempts|practice_answers)/i,
  );
});

test("Sprint 5F 16. Presentation is dynamic, responsive and demo remains independent", () => {
  const presentation = getUnitPresentation(NUMBERS_TO_100_UNIT_SLUG);
  assert.equal(presentation.cardClassName, "unit-card--numbers-100");
  assert.equal(
    presentation.pageClassName,
    "real-learning-page--numbers-100",
  );
  const styles = readFileSync(
    join(process.cwd(), "app/globals.css"),
    "utf8",
  );
  assert.match(styles, /\.unit-card--numbers-100/);
  assert.match(styles, /\.real-learning-page--numbers-100/);
  assert.match(styles, /@media \(max-width: 640px\)/);
  const demo = readFileSync(
    join(process.cwd(), "app/demo/page.tsx"),
    "utf8",
  );
  assert.doesNotMatch(
    demo,
    /learning_units|practice_attempts|numbers-to-100/,
  );
});

function completedChainThroughNumbersTo100() {
  const previous = completedChainThroughSubtractionTo20();
  const numbersOrder = Array.from(
    { length: 24 },
    (_, index) => `g1-num100-q${String(index + 1).padStart(2, "0")}`,
  );
  return [
    ...previous,
    {
      id: "12121212-1212-4121-8121-121212121212",
      unitSlug: NUMBERS_TO_100_UNIT_SLUG,
      status: "COMPLETED" as const,
      questionOrder: numbersOrder,
      totalQuestions: 24,
      answeredCount: 24,
      correctCount: 21,
      startedAt: "2026-08-10T02:00:00.000Z",
      completedAt: "2026-08-10T02:30:00.000Z",
    },
  ];
}

test("Sprint 5G 1. Migration 0025 is next, atomic and validates before commit", () => {
  assert.equal(
    existsSync(
      join(
        process.cwd(),
        "supabase/migrations/0024_grade1_numbers_to_100.sql",
      ),
    ),
    true,
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0025_grade1_addition_within_100_no_carry.sql",
    ),
    "utf8",
  );
  assert.match(migration, /^begin;/);
  assert.match(migration, /do \$validation\$/);
  assert.ok(
    migration.indexOf("do $validation$") < migration.lastIndexOf("commit;"),
  );
  assert.match(migration, /commit;\s*$/);
});

test("Sprint 5G 2. Seed contains six sections, two examples and a 16 plus 8 question split", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0025_grade1_addition_within_100_no_carry.sql",
    ),
    "utf8",
  );
  const lesson = JSON.parse(migration.split("$lesson$")[1] ?? "{}") as {
    sections?: unknown[];
    worked_examples?: unknown[];
  };
  const questions = migration.split("$questions$")[1] ?? "";
  const solutions = migration.split("$solutions$")[1] ?? "";
  assert.equal(lesson.sections?.length, 6);
  assert.equal(lesson.worked_examples?.length, 2);
  assert.equal(
    questions.match(/"code":"g1-add100-q\d{2}"/g)?.length,
    24,
  );
  assert.equal(
    solutions.match(/"question_id":"g1-add100-q\d{2}"/g)?.length,
    24,
  );
  assert.equal(
    questions.match(/"question_type":"MULTIPLE_CHOICE"/g)?.length,
    16,
  );
  assert.equal(
    questions.match(/"question_type":"NUMBER_INPUT"/g)?.length,
    8,
  );
});

test("Sprint 5G 3. Four addition-to-100 skills each own six questions and Vietnamese labels", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0025_grade1_addition_within_100_no_carry.sql",
    ),
    "utf8",
  );
  const questions = migration.split("$questions$")[1] ?? "";
  assert.deepEqual(getUnitSkillCodes(ADDITION_TO_100_UNIT_SLUG), [
    "ADD_TENS_WITHIN_100",
    "ADD_TWO_DIGIT_NO_CARRY",
    "MISSING_NUMBER_ADDITION_100",
    "ADDITION_WORD_PROBLEM_100",
  ]);
  for (const skillCode of getUnitSkillCodes(ADDITION_TO_100_UNIT_SLUG)) {
    assert.equal(
      questions.match(
        new RegExp(`"skill_code":"${skillCode}"`, "g"),
      )?.length,
      6,
    );
    assert.equal(typeof skillLabels[skillCode], "string");
  }
});

test("Sprint 5G 4. Catalog exposes eight units in the intended prerequisite order", () => {
  const units = [
    baseUnitFixture,
    additionUnitFixture,
    subtractionUnitFixture,
    numbersTo20UnitFixture,
    additionTo20UnitFixture,
    subtractionTo20UnitFixture,
    numbersTo100UnitFixture,
    additionTo100UnitFixture,
  ];
  assert.deepEqual(
    units.map((unit) => unit.slug),
    [
      BASE_UNIT_SLUG,
      ADDITION_UNIT_SLUG,
      SUBTRACTION_UNIT_SLUG,
      NUMBERS_TO_20_UNIT_SLUG,
      ADDITION_TO_20_UNIT_SLUG,
      SUBTRACTION_TO_20_UNIT_SLUG,
      NUMBERS_TO_100_UNIT_SLUG,
      ADDITION_TO_100_UNIT_SLUG,
    ],
  );
  assert.equal(
    getLessonPath(ADDITION_TO_100_UNIT_SLUG),
    "/learn/grade-1/addition-within-100-no-carry",
  );
  assert.equal(
    parseLearningUnit({
      slug: ADDITION_TO_100_UNIT_SLUG,
      grade: 1,
      title: "Phép cộng trong phạm vi 100 không nhớ",
      description: "Cộng theo chục và đơn vị mà không nhớ.",
      learning_objectives: ["Cộng được các số đến 100 mà không nhớ."],
      lesson_content: {
        sections: lessonSections,
        worked_examples: workedExamples.map((example) => ({
          title: example.title,
          steps: example.steps,
          answer: example.answer,
        })),
      },
      total_questions: 24,
      prerequisite_unit_slug: NUMBERS_TO_100_UNIT_SLUG,
    })?.slug,
    ADDITION_TO_100_UNIT_SLUG,
  );
});

test("Sprint 5G 5. Theory stays routable while incomplete prerequisite locks practice", () => {
  assert.equal(
    isUnitPracticeUnlocked(
      additionTo100UnitFixture,
      completedChainThroughSubtractionTo20(),
    ),
    false,
  );
  assert.equal(
    getLessonPath(ADDITION_TO_100_UNIT_SLUG),
    "/learn/grade-1/addition-within-100-no-carry",
  );
  const lessonPage = readFileSync(
    join(
      process.cwd(),
      "app/learn/[gradeSlug]/[lessonSlug]/page.tsx",
    ),
    "utf8",
  );
  assert.match(lessonPage, /practiceUnlocked=\{isUnitPracticeUnlocked/);
  assert.match(lessonPage, /prerequisiteUnit=\{prerequisiteUnit\}/);
});

test("Sprint 5G 6. Completing numbers-to-100 unlocks and recommends the new unit", () => {
  const attempts = completedChainThroughNumbersTo100();
  assert.equal(
    isUnitPracticeUnlocked(additionTo100UnitFixture, attempts),
    true,
  );
  assert.equal(
    getSuggestedUnit(
      [
        baseUnitFixture,
        additionUnitFixture,
        subtractionUnitFixture,
        numbersTo20UnitFixture,
        additionTo20UnitFixture,
        subtractionTo20UnitFixture,
        numbersTo100UnitFixture,
        additionTo100UnitFixture,
      ],
      attempts,
    )?.slug,
    ADDITION_TO_100_UNIT_SLUG,
  );
});

test("Sprint 5G 7. Database boundary prevents direct prerequisite and role bypass", () => {
  const startRpc = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0018_grade1_addition_within_10.sql",
    ),
    "utf8",
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0025_grade1_addition_within_100_no_carry.sql",
    ),
    "utf8",
  );
  assert.match(startRpc, /profile\.role = 'STUDENT'/);
  assert.match(startRpc, /profile\.onboarding_completed/);
  assert.match(startRpc, /v_unit_grade <> v_student_grade/);
  assert.match(
    startRpc,
    /prerequisite_attempt\.status = 'COMPLETED'/,
  );
  assert.match(
    migration,
    /'grade-1-addition-within-100-no-carry'[\s\S]*8,[\s\S]*'grade-1-numbers-to-100'/,
  );
  assert.match(
    migration,
    /v_start_definition !~ 'profile\.user_id = v_current_user_id'/,
  );
});

test("Sprint 5G 8. Shared number input accepts bounded non-negative integers without a Grade 1 ceiling", () => {
  assert.equal(PRACTICE_NUMBER_INPUT_MAX_DIGITS, 6);
  for (const value of ["0", "7", "20", "58", "100", "101", "1000"]) {
    assert.equal(normalizePracticeNumberInput(value), value);
  }
  assert.equal(normalizePracticeNumberInput(" 1000 "), "1000");
  for (const value of ["", "-1", "001", "5.5", "NaN", "1000000"]) {
    assert.equal(normalizePracticeNumberInput(value), null);
  }
  const flow = readFileSync(
    join(process.cwd(), "lib/practice/client-flow.ts"),
    "utf8",
  );
  const runner = readFileSync(
    join(
      process.cwd(),
      "app/practice/[attemptId]/PracticeRunner.tsx",
    ),
    "utf8",
  );
  assert.match(flow, /PRACTICE_NUMBER_INPUT_MAX_DIGITS/);
  assert.doesNotMatch(flow, /parsed <= (?:20|100)/);
  assert.match(
    runner,
    /maxLength=\{PRACTICE_NUMBER_INPUT_MAX_DIGITS\}/,
  );
});

test("Sprint 5G 9. Structured content validation checks real arithmetic and no carrying", () => {
  const validator = readFileSync(
    join(
      process.cwd(),
      "scripts/validate-grade1-addition-within-100-no-carry.mjs",
    ),
    "utf8",
  );
  assert.match(
    validator,
    /\(left % 10\) \+ \(right % 10\) < 10/,
  );
  assert.match(validator, /left \+ right <= 100/);
  assert.match(validator, /expectedResponse\(question\)/);
  assert.match(validator, /readFirstInteger/);
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0025_grade1_addition_within_100_no_carry.sql",
    ),
    "utf8",
  );
  assert.doesNotMatch(migration, /jsonb_object_length/);
});

test("Sprint 5G 10. Start and resume retain the new unit question order", () => {
  const order = Array.from(
    { length: 24 },
    (_, index) => `g1-add100-q${String(index + 1).padStart(2, "0")}`,
  );
  const parsed = parseStartPracticeRpcResult({
    ...startRpcPayload,
    unit_slug: ADDITION_TO_100_UNIT_SLUG,
    question_order: order,
    answered_count: 8,
    correct_count: 7,
  });
  assert.ok(parsed);
  assert.deepEqual(parsed.questionOrder, order);
  assert.equal(parsed.answeredCount, 8);
  const inProgressAttempt = {
    ...parsed,
    completedAt: null,
  };
  assert.equal(
    shouldResumeExistingAttempt(buildPracticeHistory([inProgressAttempt])),
    true,
  );
  assert.equal(hasUniqueQuestionOrder(inProgressAttempt), true);
});

test("Sprint 5G 11. A graded response appears immediately without client scoring", () => {
  const result = getSubmitPracticeResult({
    ok: true,
    data: {
      isCorrect: true,
      correctAnswer: "100",
      solutionSteps: ["Cộng số chục.", "Viết kết quả."],
      explanation: "Năm chục cộng năm chục bằng một trăm.",
      hint: "Đếm theo chục.",
      answeredCount: 6,
      correctCount: 5,
      completed: false,
      xp: canonicalCorrectAnswer.xp,
    },
  });
  assert.ok(result);
  assert.equal(result.correctAnswer, "100");
  assert.equal(result.answeredCount, 6);
  const runner = readFileSync(
    join(
      process.cwd(),
      "app/practice/[attemptId]/PracticeRunner.tsx",
    ),
    "utf8",
  );
  assert.match(runner, /getSubmitPracticeResult/);
  assert.match(runner, /mergeGradedAnswer/);
  assert.doesNotMatch(runner, /correctAnswer\s*===\s*answer/);
});

test("Sprint 5G 12. Review parses the new title context and skill labels", () => {
  const review = parsePracticeReviewRpcResult({
    attempt_id: "34343434-3434-4343-8343-343434343434",
    unit_slug: ADDITION_TO_100_UNIT_SLUG,
    status: "IN_PROGRESS",
    total_questions: 24,
    answered_count: 1,
    correct_count: 1,
    started_at: "2026-08-11T02:00:00.000Z",
    completed_at: null,
    answers: [
      {
        question_id: "g1-add100-q11",
        question_type: "NUMBER_INPUT",
        prompt: "Nhập kết quả của 52 + 27.",
        options: null,
        skill_code: "ADD_TWO_DIGIT_NO_CARRY",
        student_answer: "79",
        is_correct: true,
        correct_answer: "79",
        solution_steps: ["Cộng đơn vị.", "Cộng chục."],
        explanation: "52 + 27 = 79.",
        hint: "Cộng từng hàng.",
        answered_at: "2026-08-11T02:05:00.000Z",
      },
    ],
  });
  assert.ok(review);
  assert.equal(
    review.answers[0]?.skillCode,
    "ADD_TWO_DIGIT_NO_CARRY",
  );
  assert.equal(getUnitSkillCodes(review.unitSlug).length, 4);
  assert.equal(
    getPracticeReviewPath(review.attemptId),
    `/review/${review.attemptId}`,
  );
});

test("Sprint 5G 13. Retake history numbers attempts independently for the eighth unit", () => {
  const order = Array.from(
    { length: 24 },
    (_, index) => `g1-add100-q${String(index + 1).padStart(2, "0")}`,
  );
  const attempts = [
    ...completedChainThroughNumbersTo100(),
    {
      id: "45454545-4545-4454-8454-454545454541",
      unitSlug: ADDITION_TO_100_UNIT_SLUG,
      status: "COMPLETED" as const,
      questionOrder: order,
      totalQuestions: 24,
      answeredCount: 24,
      correctCount: 18,
      startedAt: "2026-08-11T02:00:00.000Z",
      completedAt: "2026-08-11T02:30:00.000Z",
    },
    {
      id: "45454545-4545-4454-8454-454545454542",
      unitSlug: ADDITION_TO_100_UNIT_SLUG,
      status: "COMPLETED" as const,
      questionOrder: [...order].reverse(),
      totalQuestions: 24,
      answeredCount: 24,
      correctCount: 22,
      startedAt: "2026-08-12T02:00:00.000Z",
      completedAt: "2026-08-12T02:30:00.000Z",
    },
  ];
  assert.deepEqual(
    buildPracticeHistory(attempts)
      .filter((attempt) => attempt.unitSlug === ADDITION_TO_100_UNIT_SLUG)
      .map((attempt) => attempt.attemptNumber),
    [2, 1],
  );
  assert.equal(
    buildPracticeHistory(attempts)
      .filter((attempt) => attempt.unitSlug === NUMBERS_TO_100_UNIT_SLUG)
      .length,
    1,
  );
});

test("Sprint 5G 14. Parent dashboard and weekly parser accept the new skills", () => {
  const skill = {
    skill_code: "ADD_TENS_WITHIN_100",
    answered_count: 6,
    correct_count: 5,
    accuracy_percent: 83.3,
  };
  const dashboard = parseParentChildLearningDashboard({
    ...emptyParentDashboardPayload,
    skills: [...emptyParentDashboardPayload.skills, skill],
  });
  assert.ok(dashboard);
  assert.equal(dashboard.skills.at(-1)?.skillCode, "ADD_TENS_WITHIN_100");
  const weekly = parseParentWeeklySummary({
    ...weeklySummaryPayload,
    skills: [...weeklySummaryPayload.skills, skill],
  });
  assert.ok(weekly);
  assert.equal(weekly.skills.at(-1)?.skillCode, "ADD_TENS_WITHIN_100");
});

test("Sprint 5G 15. Solution data remains behind RPC ownership checks", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0025_grade1_addition_within_100_no_carry.sql",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    migration,
    /grant\s+select\s+on\s+(table\s+)?public\.question_solutions/i,
  );
  assert.doesNotMatch(
    migration,
    /grant\s+(insert|update|delete)\s+on\s+(table\s+)?public\.(questions|question_solutions|practice_attempts|practice_answers)/i,
  );
  assert.match(migration, /attempt\.student_id = v_current_user_id/);
  assert.match(migration, /pa\.student_id = v_current_user_id/);
  for (const file of [
    "app/dashboard/page.tsx",
    "app/learn/page.tsx",
    "app/lessons/page.tsx",
    "app/practice/[attemptId]/page.tsx",
    "app/results/page.tsx",
  ]) {
    assert.doesNotMatch(
      readFileSync(join(process.cwd(), file), "utf8"),
      /question_solutions/,
    );
  }
});

test("Sprint 5G 16. New presentation is semantic while legacy and demo flows remain independent", () => {
  const presentation = getUnitPresentation(ADDITION_TO_100_UNIT_SLUG);
  assert.equal(presentation.cardClassName, "unit-card--addition-100");
  assert.equal(
    presentation.pageClassName,
    "real-learning-page--addition-100",
  );
  const styles = readFileSync(
    join(process.cwd(), "app/globals.css"),
    "utf8",
  );
  assert.match(styles, /\.unit-card--addition-100/);
  assert.match(styles, /\.real-learning-page--addition-100/);
  assert.match(styles, /@media \(max-width: 640px\)/);
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0025_grade1_addition_within_100_no_carry.sql",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    migration,
    /(?:delete\s+from|truncate)\s+public\.(?:learning_units|questions|question_solutions|practice_attempts|practice_answers)/i,
  );
  for (const table of [
    "learning_goals",
    "parent_student_connections",
    "classrooms",
    "classroom_memberships",
    "teacher_assignments",
    "assignment_submissions",
  ]) {
    assert.doesNotMatch(migration, new RegExp(`public\\.${table}`));
  }
  const demo = readFileSync(
    join(process.cwd(), "app/demo/page.tsx"),
    "utf8",
  );
  assert.doesNotMatch(
    demo,
    /learning_units|practice_attempts|addition-within-100-no-carry/,
  );
});

function completedChainThroughAdditionTo100() {
  const previous = completedChainThroughNumbersTo100();
  const additionOrder = Array.from(
    { length: 24 },
    (_, index) => `g1-add100-q${String(index + 1).padStart(2, "0")}`,
  );
  return [
    ...previous,
    {
      id: "56565656-5656-4565-8565-565656565656",
      unitSlug: ADDITION_TO_100_UNIT_SLUG,
      status: "COMPLETED" as const,
      questionOrder: additionOrder,
      totalQuestions: 24,
      answeredCount: 24,
      correctCount: 20,
      startedAt: "2026-08-13T02:00:00.000Z",
      completedAt: "2026-08-13T02:30:00.000Z",
    },
  ];
}

test("Sprint 5H 1. Migration 0026 is next, atomic and validates before commit", () => {
  assert.equal(
    existsSync(
      join(
        process.cwd(),
        "supabase/migrations/0025_grade1_addition_within_100_no_carry.sql",
      ),
    ),
    true,
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0026_grade1_subtraction_within_100_no_borrow.sql",
    ),
    "utf8",
  );
  assert.match(migration, /^begin;/);
  assert.match(migration, /do \$validation\$/);
  assert.ok(
    migration.indexOf("do $validation$") < migration.lastIndexOf("commit;"),
  );
  assert.match(migration, /commit;\s*$/);
});

test("Sprint 5H 2. Seed contains six sections, two examples and a 16 plus 8 question split", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0026_grade1_subtraction_within_100_no_borrow.sql",
    ),
    "utf8",
  );
  const lesson = JSON.parse(migration.split("$lesson$")[1] ?? "{}") as {
    sections?: unknown[];
    worked_examples?: unknown[];
  };
  const questions = migration.split("$questions$")[1] ?? "";
  const solutions = migration.split("$solutions$")[1] ?? "";
  assert.equal(lesson.sections?.length, 6);
  assert.equal(lesson.worked_examples?.length, 2);
  assert.equal(
    questions.match(/"code":"g1-sub100-q\d{2}"/g)?.length,
    24,
  );
  assert.equal(
    solutions.match(/"question_id":"g1-sub100-q\d{2}"/g)?.length,
    24,
  );
  assert.equal(
    questions.match(/"question_type":"MULTIPLE_CHOICE"/g)?.length,
    16,
  );
  assert.equal(
    questions.match(/"question_type":"NUMBER_INPUT"/g)?.length,
    8,
  );
});

test("Sprint 5H 3. Four subtraction-to-100 skills each own six questions and Vietnamese labels", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0026_grade1_subtraction_within_100_no_borrow.sql",
    ),
    "utf8",
  );
  const questions = migration.split("$questions$")[1] ?? "";
  assert.deepEqual(getUnitSkillCodes(SUBTRACTION_TO_100_UNIT_SLUG), [
    "SUBTRACT_TENS_WITHIN_100",
    "SUBTRACT_TWO_DIGIT_NO_BORROW",
    "MISSING_NUMBER_SUBTRACTION_100",
    "SUBTRACTION_WORD_PROBLEM_100",
  ]);
  for (const skillCode of getUnitSkillCodes(
    SUBTRACTION_TO_100_UNIT_SLUG,
  )) {
    assert.equal(
      questions.match(
        new RegExp(`"skill_code":"${skillCode}"`, "g"),
      )?.length,
      6,
    );
    assert.equal(typeof skillLabels[skillCode], "string");
  }
});

test("Sprint 5H 4. Catalog exposes nine units in the intended prerequisite order", () => {
  const units = [
    baseUnitFixture,
    additionUnitFixture,
    subtractionUnitFixture,
    numbersTo20UnitFixture,
    additionTo20UnitFixture,
    subtractionTo20UnitFixture,
    numbersTo100UnitFixture,
    additionTo100UnitFixture,
    subtractionTo100UnitFixture,
  ];
  assert.deepEqual(
    units.map((unit) => unit.slug),
    [
      BASE_UNIT_SLUG,
      ADDITION_UNIT_SLUG,
      SUBTRACTION_UNIT_SLUG,
      NUMBERS_TO_20_UNIT_SLUG,
      ADDITION_TO_20_UNIT_SLUG,
      SUBTRACTION_TO_20_UNIT_SLUG,
      NUMBERS_TO_100_UNIT_SLUG,
      ADDITION_TO_100_UNIT_SLUG,
      SUBTRACTION_TO_100_UNIT_SLUG,
    ],
  );
  assert.equal(
    getLessonPath(SUBTRACTION_TO_100_UNIT_SLUG),
    "/learn/grade-1/subtraction-within-100-no-borrow",
  );
  assert.equal(
    parseLearningUnit({
      slug: SUBTRACTION_TO_100_UNIT_SLUG,
      grade: 1,
      title: "Phép trừ trong phạm vi 100 không mượn",
      description: "Trừ theo chục và đơn vị mà không mượn.",
      learning_objectives: ["Trừ được các số đến 100 mà không mượn."],
      lesson_content: {
        sections: lessonSections,
        worked_examples: workedExamples.map((example) => ({
          title: example.title,
          steps: example.steps,
          answer: example.answer,
        })),
      },
      total_questions: 24,
      prerequisite_unit_slug: ADDITION_TO_100_UNIT_SLUG,
    })?.slug,
    SUBTRACTION_TO_100_UNIT_SLUG,
  );
});

test("Sprint 5H 5. Theory stays routable while incomplete prerequisite locks practice", () => {
  assert.equal(
    isUnitPracticeUnlocked(
      subtractionTo100UnitFixture,
      completedChainThroughNumbersTo100(),
    ),
    false,
  );
  assert.equal(
    getLessonPath(SUBTRACTION_TO_100_UNIT_SLUG),
    "/learn/grade-1/subtraction-within-100-no-borrow",
  );
  const lessonPage = readFileSync(
    join(
      process.cwd(),
      "app/learn/[gradeSlug]/[lessonSlug]/page.tsx",
    ),
    "utf8",
  );
  assert.match(lessonPage, /practiceUnlocked=\{isUnitPracticeUnlocked/);
  assert.match(lessonPage, /prerequisiteUnit=\{prerequisiteUnit\}/);
});

test("Sprint 5H 6. Completing addition-to-100 unlocks and recommends subtraction-to-100", () => {
  const attempts = completedChainThroughAdditionTo100();
  assert.equal(
    isUnitPracticeUnlocked(subtractionTo100UnitFixture, attempts),
    true,
  );
  assert.equal(
    getSuggestedUnit(
      [
        baseUnitFixture,
        additionUnitFixture,
        subtractionUnitFixture,
        numbersTo20UnitFixture,
        additionTo20UnitFixture,
        subtractionTo20UnitFixture,
        numbersTo100UnitFixture,
        additionTo100UnitFixture,
        subtractionTo100UnitFixture,
      ],
      attempts,
    )?.slug,
    SUBTRACTION_TO_100_UNIT_SLUG,
  );
});

test("Sprint 5H 7. Database boundary prevents direct prerequisite and role bypass", () => {
  const startRpc = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0018_grade1_addition_within_10.sql",
    ),
    "utf8",
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0026_grade1_subtraction_within_100_no_borrow.sql",
    ),
    "utf8",
  );
  assert.match(startRpc, /profile\.role = 'STUDENT'/);
  assert.match(startRpc, /profile\.onboarding_completed/);
  assert.match(startRpc, /v_unit_grade <> v_student_grade/);
  assert.match(
    startRpc,
    /prerequisite_attempt\.status = 'COMPLETED'/,
  );
  assert.match(
    migration,
    /'grade-1-subtraction-within-100-no-borrow'[\s\S]*9,[\s\S]*'grade-1-addition-within-100-no-carry'/,
  );
  assert.match(
    migration,
    /v_start_definition !~ 'profile\.user_id = v_current_user_id'/,
  );
});

test("Sprint 5H 8. Shared number input keeps old values valid without imposing a global 100 ceiling", () => {
  assert.equal(PRACTICE_NUMBER_INPUT_MAX_DIGITS, 6);
  for (const value of ["0", "7", "20", "52", "72", "100", "101", "1000"]) {
    assert.equal(normalizePracticeNumberInput(value), value);
  }
  for (const value of ["-1", "001", "5.5", "NaN", "1000000"]) {
    assert.equal(normalizePracticeNumberInput(value), null);
  }
  const runner = readFileSync(
    join(
      process.cwd(),
      "app/practice/[attemptId]/PracticeRunner.tsx",
    ),
    "utf8",
  );
  assert.match(
    runner,
    /maxLength=\{PRACTICE_NUMBER_INPUT_MAX_DIGITS\}/,
  );
  assert.doesNotMatch(runner, /(?:0–10|0–20|<=\s*20)/);
});

test("Sprint 5H 9. Structured validator proves exact arithmetic and no borrowing", () => {
  const validator = readFileSync(
    join(
      process.cwd(),
      "scripts/validate-grade1-subtraction-within-100-no-borrow.mjs",
    ),
    "utf8",
  );
  assert.match(
    validator,
    /minuend % 10 >= subtrahend % 10/,
  );
  assert.match(validator, /minuend >= subtrahend/);
  assert.match(validator, /expectedResponse\(question\)/);
  assert.match(validator, /readFirstInteger/);
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0026_grade1_subtraction_within_100_no_borrow.sql",
    ),
    "utf8",
  );
  assert.doesNotMatch(migration, /jsonb_object_length/);
});

test("Sprint 5H 10. Start and resume retain the new unit question order", () => {
  const order = Array.from(
    { length: 24 },
    (_, index) => `g1-sub100-q${String(index + 1).padStart(2, "0")}`,
  );
  const parsed = parseStartPracticeRpcResult({
    ...startRpcPayload,
    unit_slug: SUBTRACTION_TO_100_UNIT_SLUG,
    question_order: order,
    answered_count: 8,
    correct_count: 7,
  });
  assert.ok(parsed);
  assert.deepEqual(parsed.questionOrder, order);
  assert.equal(parsed.answeredCount, 8);
  const inProgressAttempt = {
    ...parsed,
    completedAt: null,
  };
  assert.equal(
    shouldResumeExistingAttempt(buildPracticeHistory([inProgressAttempt])),
    true,
  );
  assert.equal(hasUniqueQuestionOrder(inProgressAttempt), true);
});

test("Sprint 5H 11. A graded response appears immediately without client scoring", () => {
  const result = getSubmitPracticeResult({
    ok: true,
    data: {
      isCorrect: false,
      correctAnswer: "52",
      solutionSteps: ["Trừ các đơn vị.", "Trừ các chục."],
      explanation: "84 − 32 = 52.",
      hint: "Trừ từng hàng.",
      answeredCount: 11,
      correctCount: 8,
      completed: false,
      xp: canonicalIncorrectAnswer.xp,
    },
  });
  assert.ok(result);
  assert.equal(result.correctAnswer, "52");
  assert.equal(result.answeredCount, 11);
  const runner = readFileSync(
    join(
      process.cwd(),
      "app/practice/[attemptId]/PracticeRunner.tsx",
    ),
    "utf8",
  );
  assert.match(runner, /getSubmitPracticeResult/);
  assert.match(runner, /mergeGradedAnswer/);
  assert.doesNotMatch(runner, /correctAnswer\s*===\s*answer/);
});

test("Sprint 5H 12. Review parses the new unit and four skill labels", () => {
  const review = parsePracticeReviewRpcResult({
    attempt_id: "67676767-6767-4676-8676-676767676767",
    unit_slug: SUBTRACTION_TO_100_UNIT_SLUG,
    status: "IN_PROGRESS",
    total_questions: 24,
    answered_count: 1,
    correct_count: 1,
    started_at: "2026-08-14T02:00:00.000Z",
    completed_at: null,
    answers: [
      {
        question_id: "g1-sub100-q11",
        question_type: "NUMBER_INPUT",
        prompt: "Nhập kết quả của 84 − 32.",
        options: null,
        skill_code: "SUBTRACT_TWO_DIGIT_NO_BORROW",
        student_answer: "52",
        is_correct: true,
        correct_answer: "52",
        solution_steps: ["Trừ đơn vị.", "Trừ chục."],
        explanation: "84 − 32 = 52.",
        hint: "Trừ từng hàng.",
        answered_at: "2026-08-14T02:05:00.000Z",
      },
    ],
  });
  assert.ok(review);
  assert.equal(
    review.answers[0]?.skillCode,
    "SUBTRACT_TWO_DIGIT_NO_BORROW",
  );
  assert.equal(getUnitSkillCodes(review.unitSlug).length, 4);
  assert.equal(
    getPracticeReviewPath(review.attemptId),
    `/review/${review.attemptId}`,
  );
});

test("Sprint 5H 13. Retake history numbers attempts independently for the ninth unit", () => {
  const order = Array.from(
    { length: 24 },
    (_, index) => `g1-sub100-q${String(index + 1).padStart(2, "0")}`,
  );
  const attempts = [
    ...completedChainThroughAdditionTo100(),
    {
      id: "78787878-7878-4787-8787-787878787871",
      unitSlug: SUBTRACTION_TO_100_UNIT_SLUG,
      status: "COMPLETED" as const,
      questionOrder: order,
      totalQuestions: 24,
      answeredCount: 24,
      correctCount: 18,
      startedAt: "2026-08-14T02:00:00.000Z",
      completedAt: "2026-08-14T02:30:00.000Z",
    },
    {
      id: "78787878-7878-4787-8787-787878787872",
      unitSlug: SUBTRACTION_TO_100_UNIT_SLUG,
      status: "COMPLETED" as const,
      questionOrder: [...order].reverse(),
      totalQuestions: 24,
      answeredCount: 24,
      correctCount: 22,
      startedAt: "2026-08-15T02:00:00.000Z",
      completedAt: "2026-08-15T02:30:00.000Z",
    },
  ];
  assert.deepEqual(
    buildPracticeHistory(attempts)
      .filter(
        (attempt) =>
          attempt.unitSlug === SUBTRACTION_TO_100_UNIT_SLUG,
      )
      .map((attempt) => attempt.attemptNumber),
    [2, 1],
  );
  assert.equal(
    buildPracticeHistory(attempts)
      .filter(
        (attempt) => attempt.unitSlug === ADDITION_TO_100_UNIT_SLUG,
      )
      .length,
    1,
  );
});

test("Sprint 5H 14. Parent dashboard and weekly parser accept the new skills", () => {
  const skill = {
    skill_code: "SUBTRACT_TENS_WITHIN_100",
    answered_count: 6,
    correct_count: 5,
    accuracy_percent: 83.3,
  };
  const dashboard = parseParentChildLearningDashboard({
    ...emptyParentDashboardPayload,
    skills: [...emptyParentDashboardPayload.skills, skill],
  });
  assert.ok(dashboard);
  assert.equal(
    dashboard.skills.at(-1)?.skillCode,
    "SUBTRACT_TENS_WITHIN_100",
  );
  const weekly = parseParentWeeklySummary({
    ...weeklySummaryPayload,
    skills: [...weeklySummaryPayload.skills, skill],
  });
  assert.ok(weekly);
  assert.equal(
    weekly.skills.at(-1)?.skillCode,
    "SUBTRACT_TENS_WITHIN_100",
  );
});

test("Sprint 5H 15. Solutions remain behind practice RPC ownership checks", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0026_grade1_subtraction_within_100_no_borrow.sql",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    migration,
    /grant\s+select\s+on\s+(table\s+)?public\.question_solutions/i,
  );
  assert.doesNotMatch(
    migration,
    /grant\s+(insert|update|delete)\s+on\s+(table\s+)?public\.(questions|question_solutions|practice_attempts|practice_answers)/i,
  );
  assert.match(migration, /attempt\.student_id = v_current_user_id/);
  assert.match(migration, /pa\.student_id = v_current_user_id/);
  for (const file of [
    "app/dashboard/page.tsx",
    "app/learn/page.tsx",
    "app/lessons/page.tsx",
    "app/practice/[attemptId]/page.tsx",
    "app/results/page.tsx",
  ]) {
    assert.doesNotMatch(
      readFileSync(join(process.cwd(), file), "utf8"),
      /question_solutions/,
    );
  }
});

test("Sprint 5H 16. Presentation is semantic and unrelated flows remain untouched", () => {
  const presentation = getUnitPresentation(SUBTRACTION_TO_100_UNIT_SLUG);
  assert.equal(presentation.cardClassName, "unit-card--subtraction-100");
  assert.equal(
    presentation.pageClassName,
    "real-learning-page--subtraction-100",
  );
  const styles = readFileSync(
    join(process.cwd(), "app/globals.css"),
    "utf8",
  );
  assert.match(styles, /\.unit-card--subtraction-100/);
  assert.match(styles, /\.real-learning-page--subtraction-100/);
  assert.match(styles, /@media \(max-width: 640px\)/);
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0026_grade1_subtraction_within_100_no_borrow.sql",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    migration,
    /(?:delete\s+from|truncate)\s+public\.(?:learning_units|questions|question_solutions|practice_attempts|practice_answers)/i,
  );
  for (const table of [
    "learning_goals",
    "parent_student_connections",
    "classrooms",
    "classroom_memberships",
    "teacher_assignments",
    "assignment_submissions",
  ]) {
    assert.doesNotMatch(migration, new RegExp(`public\\.${table}`));
  }
  const demo = readFileSync(
    join(process.cwd(), "app/demo/page.tsx"),
    "utf8",
  );
  assert.doesNotMatch(
    demo,
    /learning_units|practice_attempts|subtraction-within-100-no-borrow/,
  );
});

function completedChainThroughSubtractionTo100() {
  const previous = completedChainThroughAdditionTo100();
  const subtractionOrder = Array.from(
    { length: 24 },
    (_, index) => `g1-sub100-q${String(index + 1).padStart(2, "0")}`,
  );
  return [
    ...previous,
    {
      id: "89898989-8989-4989-8989-898989898989",
      unitSlug: SUBTRACTION_TO_100_UNIT_SLUG,
      status: "COMPLETED" as const,
      questionOrder: subtractionOrder,
      totalQuestions: 24,
      answeredCount: 24,
      correctCount: 20,
      startedAt: "2026-08-16T02:00:00.000Z",
      completedAt: "2026-08-16T02:30:00.000Z",
    },
  ];
}

const validGeometryVisual = {
  kind: "SHAPE_SCENE",
  description:
    "Hình tròn A nằm bên trái hình vuông B trên cùng một hàng.",
  items: [
    {
      id: "a",
      shape: "CIRCLE",
      x: 15,
      y: 35,
      width: 20,
      height: 20,
      label: "A",
    },
    {
      id: "b",
      shape: "SQUARE",
      x: 65,
      y: 35,
      width: 20,
      height: 20,
      label: "B",
    },
  ],
};

test("Sprint 5I 1. Migration 0027 is the next atomic migration", () => {
  assert.equal(
    existsSync(
      join(
        process.cwd(),
        "supabase/migrations/0026_grade1_subtraction_within_100_no_borrow.sql",
      ),
    ),
    true,
  );
  const migrationPath = join(
    process.cwd(),
    "supabase/migrations/0027_grade1_basic_geometry_and_position.sql",
  );
  assert.equal(existsSync(migrationPath), true);
  const migration = readFileSync(migrationPath, "utf8");
  assert.match(migration, /^begin;/);
  assert.match(migration, /do \$validation\$/);
  assert.ok(
    migration.indexOf("do $validation$") < migration.lastIndexOf("commit;"),
  );
  assert.match(migration, /commit;\s*$/);
});

test("Sprint 5I 2. Seed has six sections, two examples and exact question distribution", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0027_grade1_basic_geometry_and_position.sql",
    ),
    "utf8",
  );
  const lesson = JSON.parse(migration.split("$lesson$")[1] ?? "{}") as {
    sections?: unknown[];
    worked_examples?: unknown[];
  };
  const questions = migration.split("$questions$")[1] ?? "";
  const solutions = migration.split("$solutions$")[1] ?? "";
  assert.equal(lesson.sections?.length, 6);
  assert.equal(lesson.worked_examples?.length, 2);
  assert.equal(questions.match(/"code":"g1-geo-q\d{2}"/g)?.length, 24);
  assert.equal(
    solutions.match(/"question_id":"g1-geo-q\d{2}"/g)?.length,
    24,
  );
  assert.equal(
    questions.match(/"question_type":"MULTIPLE_CHOICE"/g)?.length,
    16,
  );
  assert.equal(
    questions.match(/"question_type":"NUMBER_INPUT"/g)?.length,
    8,
  );
  assert.equal(
    questions.match(/"visual_spec":\{"kind":"SHAPE_SCENE"/g)?.length,
    24,
  );
});

test("Sprint 5I 3. Four geometry skills each have six questions and Vietnamese labels", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0027_grade1_basic_geometry_and_position.sql",
    ),
    "utf8",
  );
  const questions = migration.split("$questions$")[1] ?? "";
  assert.deepEqual(getUnitSkillCodes(BASIC_GEOMETRY_UNIT_SLUG), [
    "RECOGNIZE_BASIC_SHAPES",
    "COMPARE_AND_SORT_SHAPES",
    "POSITION_RELATIONS",
    "COUNT_SHAPES_IN_PICTURE",
  ]);
  for (const skillCode of getUnitSkillCodes(BASIC_GEOMETRY_UNIT_SLUG)) {
    assert.equal(
      questions.match(
        new RegExp(`"skill_code":"${skillCode}"`, "g"),
      )?.length,
      6,
    );
    assert.equal(typeof skillLabels[skillCode], "string");
  }
});

test("Sprint 5I 4. Catalog exposes geometry as the tenth unit without a hard-coded page", () => {
  const units = [
    baseUnitFixture,
    additionUnitFixture,
    subtractionUnitFixture,
    numbersTo20UnitFixture,
    additionTo20UnitFixture,
    subtractionTo20UnitFixture,
    numbersTo100UnitFixture,
    additionTo100UnitFixture,
    subtractionTo100UnitFixture,
    basicGeometryUnitFixture,
  ];
  assert.equal(units.at(-1)?.slug, BASIC_GEOMETRY_UNIT_SLUG);
  assert.equal(
    basicGeometryUnitFixture.prerequisiteUnitSlug,
    SUBTRACTION_TO_100_UNIT_SLUG,
  );
  assert.equal(
    getLessonPath(BASIC_GEOMETRY_UNIT_SLUG),
    "/learn/grade-1/basic-geometry-and-position",
  );
  assert.equal(
    parseLearningUnit({
      slug: BASIC_GEOMETRY_UNIT_SLUG,
      grade: 1,
      title: "Hình học và vị trí cơ bản",
      description: "Nhận biết hình và vị trí.",
      learning_objectives: ["Nhận biết hình cơ bản."],
      lesson_content: {
        sections: lessonSections,
        worked_examples: workedExamples.map((example) => ({
          title: example.title,
          steps: example.steps,
          answer: example.answer,
        })),
      },
      total_questions: 24,
      prerequisite_unit_slug: SUBTRACTION_TO_100_UNIT_SLUG,
    })?.slug,
    BASIC_GEOMETRY_UNIT_SLUG,
  );
  assert.equal(
    existsSync(
      join(
        process.cwd(),
        "app/learn/grade-1/basic-geometry-and-position/page.tsx",
      ),
    ),
    false,
  );
});

test("Sprint 5I 5. Prerequisite stays readable in theory and is enforced in UI and database", () => {
  assert.equal(
    isUnitPracticeUnlocked(
      basicGeometryUnitFixture,
      completedChainThroughAdditionTo100(),
    ),
    false,
  );
  const completedPrerequisite = completedChainThroughSubtractionTo100();
  assert.equal(
    isUnitPracticeUnlocked(
      basicGeometryUnitFixture,
      completedPrerequisite,
    ),
    true,
  );
  assert.equal(
    getSuggestedUnit(
      [
        baseUnitFixture,
        additionUnitFixture,
        subtractionUnitFixture,
        numbersTo20UnitFixture,
        additionTo20UnitFixture,
        subtractionTo20UnitFixture,
        numbersTo100UnitFixture,
        additionTo100UnitFixture,
        subtractionTo100UnitFixture,
        basicGeometryUnitFixture,
      ],
      completedPrerequisite,
    )?.slug,
    BASIC_GEOMETRY_UNIT_SLUG,
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0027_grade1_basic_geometry_and_position.sql",
    ),
    "utf8",
  );
  assert.match(
    migration,
    /10,[\s\S]*'grade-1-subtraction-within-100-no-borrow'/,
  );
  const startRpc = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0018_grade1_addition_within_10.sql",
    ),
    "utf8",
  );
  assert.match(startRpc, /profile\.role = 'STUDENT'/);
  assert.match(startRpc, /prerequisite_attempt\.status = 'COMPLETED'/);
});

test("Sprint 5I 6. Visual parser is allowlist-only and rejects executable or malformed input", () => {
  const parsed = parsePracticeVisualSpec(validGeometryVisual);
  assert.ok(parsed);
  assert.equal(parsed.kind, "SHAPE_SCENE");
  if (parsed.kind !== "SHAPE_SCENE") return;
  assert.equal(parsed.items.length, 2);
  assert.equal(
    parsePracticeVisualSpec({
      ...validGeometryVisual,
      html: "<svg onload=alert(1)>",
    }),
    null,
  );
  assert.equal(
    parsePracticeVisualSpec({
      ...validGeometryVisual,
      description: "Xem https://example.invalid để trả lời.",
    }),
    null,
  );
  assert.equal(
    parsePracticeVisualSpec({
      ...validGeometryVisual,
      items: [
        ...validGeometryVisual.items,
        {
          id: "outside",
          shape: "SQUARE",
          x: 90,
          y: 90,
          width: 20,
          height: 20,
          label: "C",
        },
      ],
    }),
    null,
  );
});

test("Sprint 5I 7. Practice contract retains valid visuals and fails closed on invalid specs", () => {
  const rawQuestion = {
    code: "g1-geo-q13",
    unit_slug: BASIC_GEOMETRY_UNIT_SLUG,
    question_type: "MULTIPLE_CHOICE",
    prompt: "Hình A ở vị trí nào so với hình B?",
    options: {
      A: "Bên trái",
      B: "Bên phải",
      C: "Phía trên",
      D: "Phía dưới",
    },
    visual_spec: validGeometryVisual,
    skill_code: "POSITION_RELATIONS",
    difficulty: "EASY",
    display_order: 13,
  };
  const question = parsePracticeQuestion(rawQuestion);
  assert.ok(question);
  assert.equal(question.visualSpec?.kind, "SHAPE_SCENE");
  if (question.visualSpec?.kind !== "SHAPE_SCENE") return;
  assert.equal(question.visualSpec.items[0]?.shape, "CIRCLE");
  assert.equal(
    parsePracticeQuestion({
      ...rawQuestion,
      visual_spec: {
        ...validGeometryVisual,
        script: "alert(1)",
      },
    }),
    null,
  );
});

test("Sprint 5I 8. Practice and review use one inline SVG renderer without raw markup", () => {
  const renderer = readFileSync(
    join(process.cwd(), "components/PracticeVisual.tsx"),
    "utf8",
  );
  const runner = readFileSync(
    join(
      process.cwd(),
      "app/practice/[attemptId]/PracticeRunner.tsx",
    ),
    "utf8",
  );
  const reviewPage = readFileSync(
    join(process.cwd(), "app/review/[attemptId]/page.tsx"),
    "utf8",
  );
  assert.match(renderer, /<svg/);
  assert.match(renderer, /role="img"/);
  assert.match(renderer, /aria-label=\{spec\.description\}/);
  assert.match(renderer, /<figcaption>/);
  assert.doesNotMatch(renderer, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(renderer, /href=|src=/);
  assert.match(runner, /<PracticeVisual spec=\{question\.visualSpec\}/);
  assert.match(reviewPage, /<PracticeVisual spec=\{answer\.visualSpec\}/);
});

test("Sprint 5I 9. Review RPC and parser preserve the visual only behind attempt ownership", () => {
  const review = parsePracticeReviewRpcResult({
    attempt_id: "90909090-9090-4090-8090-909090909090",
    unit_slug: BASIC_GEOMETRY_UNIT_SLUG,
    status: "IN_PROGRESS",
    total_questions: 24,
    answered_count: 1,
    correct_count: 1,
    started_at: "2026-08-17T02:00:00.000Z",
    completed_at: null,
    answers: [
      {
        question_id: "g1-geo-q13",
        question_type: "MULTIPLE_CHOICE",
        prompt: "Hình A ở vị trí nào so với hình B?",
        options: {
          A: "Bên trái",
          B: "Bên phải",
          C: "Phía trên",
          D: "Phía dưới",
        },
        visual_spec: validGeometryVisual,
        skill_code: "POSITION_RELATIONS",
        student_answer: "A",
        is_correct: true,
        correct_answer: "A",
        solution_steps: ["Quan sát hai hình.", "Hình A ở bên trái."],
        explanation: "A ở bên trái B.",
        hint: "Nhìn từ trái sang phải.",
        answered_at: "2026-08-17T02:05:00.000Z",
      },
    ],
  });
  assert.ok(review);
  assert.equal(review.answers[0]?.visualSpec?.kind, "SHAPE_SCENE");
  if (review.answers[0]?.visualSpec?.kind !== "SHAPE_SCENE") return;
  assert.equal(review.answers[0].visualSpec.items.length, 2);
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0027_grade1_basic_geometry_and_position.sql",
    ),
    "utf8",
  );
  assert.match(migration, /attempt\.student_id = v_current_user_id/);
  assert.match(migration, /'visual_spec', question\.visual_spec/);
  assert.doesNotMatch(
    migration,
    /grant\s+select\s+on\s+(table\s+)?public\.question_solutions/i,
  );
});

test("Sprint 5I 10. Start, resume and retake remain isolated to the geometry unit", () => {
  const order = Array.from(
    { length: 24 },
    (_, index) => `g1-geo-q${String(index + 1).padStart(2, "0")}`,
  );
  const started = parseStartPracticeRpcResult({
    ...startRpcPayload,
    unit_slug: BASIC_GEOMETRY_UNIT_SLUG,
    question_order: order,
    answered_count: 7,
    correct_count: 6,
  });
  assert.ok(started);
  assert.equal(
    shouldResumeExistingAttempt(
      buildPracticeHistory([{ ...started, completedAt: null }]),
    ),
    true,
  );
  const attempts = [
    ...completedChainThroughSubtractionTo100(),
    {
      ...started,
      id: "91919191-9191-4191-8191-919191919191",
      status: "COMPLETED" as const,
      answeredCount: 24,
      correctCount: 18,
      completedAt: "2026-08-17T02:30:00.000Z",
    },
    {
      ...started,
      id: "92929292-9292-4292-8292-929292929292",
      status: "COMPLETED" as const,
      questionOrder: [...order].reverse(),
      answeredCount: 24,
      correctCount: 22,
      completedAt: "2026-08-18T02:30:00.000Z",
    },
  ];
  assert.deepEqual(
    buildPracticeHistory(attempts)
      .filter((attempt) => attempt.unitSlug === BASIC_GEOMETRY_UNIT_SLUG)
      .map((attempt) => attempt.attemptNumber),
    [2, 1],
  );
});

test("Sprint 5I 11. Parent dashboard and weekly report accept every geometry skill", () => {
  for (const skillCode of getUnitSkillCodes(BASIC_GEOMETRY_UNIT_SLUG)) {
    const skill = {
      skill_code: skillCode,
      answered_count: 6,
      correct_count: 5,
      accuracy_percent: 83.3,
    };
    const dashboard = parseParentChildLearningDashboard({
      ...emptyParentDashboardPayload,
      skills: [...emptyParentDashboardPayload.skills, skill],
    });
    const weekly = parseParentWeeklySummary({
      ...weeklySummaryPayload,
      skills: [...weeklySummaryPayload.skills, skill],
    });
    assert.equal(dashboard?.skills.at(-1)?.skillCode, skillCode);
    assert.equal(weekly?.skills.at(-1)?.skillCode, skillCode);
  }
});

test("Sprint 5I 12. Geometry presentation and responsive styles are semantic and accessible", () => {
  const presentation = getUnitPresentation(BASIC_GEOMETRY_UNIT_SLUG);
  assert.equal(presentation.cardClassName, "unit-card--geometry");
  assert.equal(presentation.pageClassName, "real-learning-page--geometry");
  assert.ok(presentation.lessonVisual);
  const lesson = readFileSync(
    join(process.cwd(), "components/LessonDetail.tsx"),
    "utf8",
  );
  const styles = readFileSync(
    join(process.cwd(), "app/globals.css"),
    "utf8",
  );
  assert.match(lesson, /presentation\.lessonVisual/);
  assert.match(styles, /\.unit-card--geometry/);
  assert.match(styles, /\.real-learning-page--geometry/);
  assert.match(styles, /\.practice-visual svg[\s\S]*aspect-ratio/);
  assert.match(styles, /width: min\(100%, 32rem\)/);
});

test("Sprint 5I 13. Migration adds no destructive changes, broad grants or unrelated data", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0027_grade1_basic_geometry_and_position.sql",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    migration,
    /(?:delete\s+from|truncate)\s+public\.(?:learning_units|questions|question_solutions|practice_attempts|practice_answers)/i,
  );
  assert.doesNotMatch(
    migration,
    /grant\s+(?:select|insert|update|delete)\s+on\s+(?:table\s+)?public\.(?:question_solutions|practice_attempts|practice_answers)/i,
  );
  assert.doesNotMatch(migration, /service[_-]?role/i);
  assert.doesNotMatch(
    migration,
    /visual_spec::text[\s\S]{0,160}(?:answer|correct|solution|html|script)/i,
  );
  for (const table of [
    "learning_goals",
    "parent_student_connections",
    "classrooms",
    "classroom_memberships",
    "teacher_assignments",
    "assignment_submissions",
  ]) {
    assert.doesNotMatch(migration, new RegExp(`public\\.${table}`));
  }
  const demo = readFileSync(
    join(process.cwd(), "app/demo/page.tsx"),
    "utf8",
  );
  assert.doesNotMatch(
    demo,
    /learning_units|practice_attempts|basic-geometry-and-position/,
  );
});

function completedChainThroughGeometry() {
  const previous = completedChainThroughSubtractionTo100();
  const geometryOrder = Array.from(
    { length: 24 },
    (_, index) => `g1-geo-q${String(index + 1).padStart(2, "0")}`,
  );
  return [
    ...previous,
    {
      id: "93939393-9393-4393-8393-939393939393",
      unitSlug: BASIC_GEOMETRY_UNIT_SLUG,
      status: "COMPLETED" as const,
      questionOrder: geometryOrder,
      totalQuestions: 24,
      answeredCount: 24,
      correctCount: 21,
      startedAt: "2026-08-19T02:00:00.000Z",
      completedAt: "2026-08-19T02:30:00.000Z",
    },
  ];
}

const validLengthComparisonVisual = {
  kind: "LENGTH_COMPARISON",
  description:
    "Hai dải A và B có cùng điểm bắt đầu và điểm cuối được đánh dấu.",
  items: [
    {
      id: "a",
      label: "A",
      startX: 15,
      y: 30,
      length: 55,
      pattern: "SOLID",
    },
    {
      id: "b",
      label: "B",
      startX: 15,
      y: 68,
      length: 35,
      pattern: "DASHED",
    },
  ],
};

const validEqualUnitVisual = {
  kind: "EQUAL_UNIT_MEASUREMENT",
  description:
    "Dải giấy nằm trên các ô bằng nhau, liên tiếp và không có khoảng trống.",
  objectLabel: "Dải giấy",
  unitLabel: "ô",
  startX: 10,
  endX: 70,
  y: 38,
  unitWidth: 12,
};

const validRulerVisual = {
  kind: "SIMPLE_RULER",
  description:
    "Dải giấy bắt đầu tại vạch 0 và kết thúc tại một vạch trên thước.",
  objectLabel: "Dải giấy",
  unitLabel: "cm",
  startValue: 0,
  endValue: 6,
  maxValue: 10,
};

test("Sprint 5J 1. Migration 0028 is next, atomic and validated before commit", () => {
  assert.equal(
    existsSync(
      join(
        process.cwd(),
        "supabase/migrations/0027_grade1_basic_geometry_and_position.sql",
      ),
    ),
    true,
  );
  const migrationPath = join(
    process.cwd(),
    "supabase/migrations/0028_grade1_length_measurement.sql",
  );
  assert.equal(existsSync(migrationPath), true);
  const migration = readFileSync(migrationPath, "utf8");
  assert.match(migration, /^begin;/);
  assert.match(migration, /do \$validation\$/);
  assert.ok(
    migration.indexOf("do $validation$") < migration.lastIndexOf("commit;"),
  );
  assert.match(migration, /commit;\s*$/);
  assert.equal(
    existsSync(
      join(
        process.cwd(),
        "supabase/migrations/0029_grade1_length_measurement.sql",
      ),
    ),
    false,
  );
});

test("Sprint 5J 2. Seed contains six sections, two examples and exact 24-question distribution", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0028_grade1_length_measurement.sql",
    ),
    "utf8",
  );
  const lesson = JSON.parse(migration.split("$lesson$")[1] ?? "{}") as {
    sections?: unknown[];
    worked_examples?: unknown[];
  };
  const questions = migration.split("$questions$")[1] ?? "";
  const solutions = migration.split("$solutions$")[1] ?? "";
  assert.equal(lesson.sections?.length, 6);
  assert.equal(lesson.worked_examples?.length, 2);
  assert.equal(questions.match(/"code":"g1-len-q\d{2}"/g)?.length, 24);
  assert.equal(
    solutions.match(/"question_id":"g1-len-q\d{2}"/g)?.length,
    24,
  );
  assert.equal(
    questions.match(/"question_type":"MULTIPLE_CHOICE"/g)?.length,
    16,
  );
  assert.equal(
    questions.match(/"question_type":"NUMBER_INPUT"/g)?.length,
    8,
  );
  assert.equal(questions.match(/"visual_spec":\{"kind":/g)?.length, 24);
});

test("Sprint 5J 3. Four measurement skills each have six questions and Vietnamese labels", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0028_grade1_length_measurement.sql",
    ),
    "utf8",
  );
  const questions = migration.split("$questions$")[1] ?? "";
  assert.deepEqual(getUnitSkillCodes(LENGTH_MEASUREMENT_UNIT_SLUG), [
    "COMPARE_LENGTHS",
    "ORDER_BY_LENGTH",
    "MEASURE_WITH_EQUAL_UNITS",
    "READ_SIMPLE_MEASUREMENT",
  ]);
  for (const skillCode of getUnitSkillCodes(
    LENGTH_MEASUREMENT_UNIT_SLUG,
  )) {
    assert.equal(
      questions.match(
        new RegExp(`"skill_code":"${skillCode}"`, "g"),
      )?.length,
      6,
    );
    assert.equal(typeof skillLabels[skillCode], "string");
  }
});

test("Sprint 5J 4. Catalog exposes the eleventh unit through the dynamic lesson route", () => {
  const units = [
    baseUnitFixture,
    additionUnitFixture,
    subtractionUnitFixture,
    numbersTo20UnitFixture,
    additionTo20UnitFixture,
    subtractionTo20UnitFixture,
    numbersTo100UnitFixture,
    additionTo100UnitFixture,
    subtractionTo100UnitFixture,
    basicGeometryUnitFixture,
    lengthMeasurementUnitFixture,
  ];
  assert.equal(units.length, 11);
  assert.equal(units.at(-1)?.slug, LENGTH_MEASUREMENT_UNIT_SLUG);
  assert.equal(
    getLessonPath(LENGTH_MEASUREMENT_UNIT_SLUG),
    "/learn/grade-1/length-measurement",
  );
  assert.equal(
    existsSync(
      join(
        process.cwd(),
        "app/learn/grade-1/length-measurement/page.tsx",
      ),
    ),
    false,
  );
  assert.equal(
    parseLearningUnit({
      slug: LENGTH_MEASUREMENT_UNIT_SLUG,
      grade: 1,
      title: "Đo độ dài và so sánh độ dài",
      description: "So sánh và đo độ dài.",
      learning_objectives: ["Đo độ dài đơn giản."],
      lesson_content: {
        sections: lessonSections,
        worked_examples: workedExamples.map((example) => ({
          title: example.title,
          steps: example.steps,
          answer: example.answer,
        })),
      },
      total_questions: 24,
      prerequisite_unit_slug: BASIC_GEOMETRY_UNIT_SLUG,
    })?.slug,
    LENGTH_MEASUREMENT_UNIT_SLUG,
  );
});

test("Sprint 5J 5. Geometry completion unlocks measurement in UI while the database remains fail-closed", () => {
  assert.equal(
    isUnitPracticeUnlocked(
      lengthMeasurementUnitFixture,
      completedChainThroughSubtractionTo100(),
    ),
    false,
  );
  const completedPrerequisite = completedChainThroughGeometry();
  assert.equal(
    isUnitPracticeUnlocked(
      lengthMeasurementUnitFixture,
      completedPrerequisite,
    ),
    true,
  );
  assert.equal(
    getSuggestedUnit(
      [
        baseUnitFixture,
        additionUnitFixture,
        subtractionUnitFixture,
        numbersTo20UnitFixture,
        additionTo20UnitFixture,
        subtractionTo20UnitFixture,
        numbersTo100UnitFixture,
        additionTo100UnitFixture,
        subtractionTo100UnitFixture,
        basicGeometryUnitFixture,
        lengthMeasurementUnitFixture,
      ],
      completedPrerequisite,
    )?.slug,
    LENGTH_MEASUREMENT_UNIT_SLUG,
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0028_grade1_length_measurement.sql",
    ),
    "utf8",
  );
  assert.match(
    migration,
    /11,[\s\S]*'grade-1-basic-geometry-and-position'/,
  );
  assert.match(migration, /v_start_definition !~ 'auth\[.]uid'/);
  assert.match(migration, /v_start_definition !~ 'prerequisite_unit_slug'/);
  assert.match(migration, /v_start_definition !~ 'COMPLETED'/);
});

test("Sprint 5J 6. Visual parser accepts three measurement contracts and rejects malformed or executable specs", () => {
  assert.equal(
    parsePracticeVisualSpec(validLengthComparisonVisual)?.kind,
    "LENGTH_COMPARISON",
  );
  assert.equal(
    parsePracticeVisualSpec(validEqualUnitVisual)?.kind,
    "EQUAL_UNIT_MEASUREMENT",
  );
  assert.equal(
    parsePracticeVisualSpec(validRulerVisual)?.kind,
    "SIMPLE_RULER",
  );
  assert.equal(
    parsePracticeVisualSpec({
      ...validRulerVisual,
      correctAnswer: 6,
    }),
    null,
  );
  assert.equal(
    parsePracticeVisualSpec({
      ...validLengthComparisonVisual,
      items: [
        validLengthComparisonVisual.items[0],
        {
          ...validLengthComparisonVisual.items[1],
          startX: 20,
        },
      ],
    }),
    null,
  );
  assert.equal(
    parsePracticeVisualSpec({
      ...validEqualUnitVisual,
      endX: 71,
    }),
    null,
  );
  assert.equal(
    parsePracticeVisualSpec({
      ...validRulerVisual,
      description: "javascript:alert(1)",
    }),
    null,
  );
});

test("Sprint 5J 7. Practice and review contracts preserve measurement visuals without exposing solutions", () => {
  const rawQuestion = {
    code: "g1-len-q23",
    unit_slug: LENGTH_MEASUREMENT_UNIT_SLUG,
    question_type: "NUMBER_INPUT",
    prompt: "Dải bìa dài bao nhiêu xăng-ti-mét? Chỉ nhập số.",
    options: null,
    visual_spec: validRulerVisual,
    skill_code: "READ_SIMPLE_MEASUREMENT",
    difficulty: "EASY",
    display_order: 23,
  };
  const question = parsePracticeQuestion(rawQuestion);
  assert.ok(question);
  assert.equal(question.visualSpec?.kind, "SIMPLE_RULER");
  const practicePage = readFileSync(
    join(process.cwd(), "app/practice/[attemptId]/page.tsx"),
    "utf8",
  );
  assert.match(practicePage, /visual_spec/);
  assert.doesNotMatch(practicePage, /question_solutions/);

  const review = parsePracticeReviewRpcResult({
    attempt_id: "94949494-9494-4494-8494-949494949494",
    unit_slug: LENGTH_MEASUREMENT_UNIT_SLUG,
    status: "IN_PROGRESS",
    total_questions: 24,
    answered_count: 1,
    correct_count: 1,
    started_at: "2026-08-20T02:00:00.000Z",
    completed_at: null,
    answers: [
      {
        question_id: "g1-len-q23",
        question_type: "NUMBER_INPUT",
        prompt: rawQuestion.prompt,
        options: null,
        visual_spec: validRulerVisual,
        skill_code: "READ_SIMPLE_MEASUREMENT",
        student_answer: "6",
        is_correct: true,
        correct_answer: "6",
        solution_steps: ["Đặt đầu vật tại 0.", "Đọc vạch cuối."],
        explanation: "Vật dài 6 cm.",
        hint: "Đọc vạch cuối.",
        answered_at: "2026-08-20T02:05:00.000Z",
      },
    ],
  });
  assert.ok(review);
  assert.equal(review.answers[0]?.visualSpec?.kind, "SIMPLE_RULER");
});

test("Sprint 5J 8. One accessible inline renderer serves lesson, practice and review", () => {
  const renderer = readFileSync(
    join(process.cwd(), "components/PracticeVisual.tsx"),
    "utf8",
  );
  const lesson = readFileSync(
    join(process.cwd(), "components/LessonDetail.tsx"),
    "utf8",
  );
  const runner = readFileSync(
    join(
      process.cwd(),
      "app/practice/[attemptId]/PracticeRunner.tsx",
    ),
    "utf8",
  );
  const review = readFileSync(
    join(process.cwd(), "app/review/[attemptId]/page.tsx"),
    "utf8",
  );
  assert.match(renderer, /LengthComparisonVisual/);
  assert.match(renderer, /EqualUnitMeasurementVisual/);
  assert.match(renderer, /SimpleRulerVisual/);
  assert.match(renderer, /role="img"/);
  assert.match(renderer, /<title>/);
  assert.match(renderer, /sr-only/);
  assert.doesNotMatch(renderer, /dangerouslySetInnerHTML|href=|src=/);
  assert.match(lesson, /presentation\.lessonVisual/);
  assert.match(runner, /<PracticeVisual spec=\{question\.visualSpec\}/);
  assert.match(review, /<PracticeVisual spec=\{answer\.visualSpec\}/);
});

test("Sprint 5J 9. Immediate grading and reconciliation still avoid a forced refresh", () => {
  const runner = readFileSync(
    join(
      process.cwd(),
      "app/practice/[attemptId]/PracticeRunner.tsx",
    ),
    "utf8",
  );
  assert.match(runner, /mergeGradedAnswer/);
  assert.match(runner, /reconcileSubmittedAnswer/);
  assert.doesNotMatch(runner, /location\.reload|router\.refresh/);
  assert.match(runner, /disabled=\{Boolean\(result\) \|\| isSubmitting\}/);
});

test("Sprint 5J 10. Start, resume, results and retake remain isolated to measurement", () => {
  const order = Array.from(
    { length: 24 },
    (_, index) => `g1-len-q${String(index + 1).padStart(2, "0")}`,
  );
  const started = parseStartPracticeRpcResult({
    ...startRpcPayload,
    unit_slug: LENGTH_MEASUREMENT_UNIT_SLUG,
    question_order: order,
    answered_count: 8,
    correct_count: 7,
  });
  assert.ok(started);
  assert.equal(
    shouldResumeExistingAttempt(
      buildPracticeHistory([{ ...started, completedAt: null }]),
    ),
    true,
  );
  const attempts = [
    ...completedChainThroughGeometry(),
    {
      ...started,
      id: "95959595-9595-4595-8595-959595959595",
      status: "COMPLETED" as const,
      answeredCount: 24,
      correctCount: 19,
      completedAt: "2026-08-20T02:30:00.000Z",
    },
    {
      ...started,
      id: "96969696-9696-4696-8696-969696969696",
      status: "COMPLETED" as const,
      questionOrder: [...order].reverse(),
      answeredCount: 24,
      correctCount: 23,
      completedAt: "2026-08-21T02:30:00.000Z",
    },
  ];
  assert.deepEqual(
    buildPracticeHistory(attempts)
      .filter(
        (attempt) => attempt.unitSlug === LENGTH_MEASUREMENT_UNIT_SLUG,
      )
      .map((attempt) => attempt.attemptNumber),
    [2, 1],
  );
});

test("Sprint 5J 11. Parent dashboard and weekly report accept all new skills", () => {
  for (const skillCode of getUnitSkillCodes(
    LENGTH_MEASUREMENT_UNIT_SLUG,
  )) {
    const skill = {
      skill_code: skillCode,
      answered_count: 6,
      correct_count: 5,
      accuracy_percent: 83.3,
    };
    const dashboard = parseParentChildLearningDashboard({
      ...emptyParentDashboardPayload,
      skills: [...emptyParentDashboardPayload.skills, skill],
    });
    const weekly = parseParentWeeklySummary({
      ...weeklySummaryPayload,
      skills: [...weeklySummaryPayload.skills, skill],
    });
    assert.equal(dashboard?.skills.at(-1)?.skillCode, skillCode);
    assert.equal(weekly?.skills.at(-1)?.skillCode, skillCode);
  }
});

test("Sprint 5J 12. Measurement presentation is responsive and does not rely on color alone", () => {
  const presentation = getUnitPresentation(LENGTH_MEASUREMENT_UNIT_SLUG);
  assert.equal(presentation.cardClassName, "unit-card--measurement");
  assert.equal(
    presentation.pageClassName,
    "real-learning-page--measurement",
  );
  assert.equal(presentation.lessonVisual?.kind, "SIMPLE_RULER");
  const styles = readFileSync(
    join(process.cwd(), "app/globals.css"),
    "utf8",
  );
  assert.match(styles, /\.unit-card--measurement/);
  assert.match(styles, /\.real-learning-page--measurement/);
  assert.match(styles, /\.practice-visual__length--dashed/);
  assert.match(styles, /\.practice-visual__endpoint/);
  assert.match(styles, /width: min\(100%, 32rem\)/);
  assert.match(styles, /aspect-ratio: 5 \/ 3/);
});

test("Sprint 5J 13. Migration preserves old data and keeps practice privileges closed", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0028_grade1_length_measurement.sql",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    migration,
    /(?:delete\s+from|truncate)\s+public\.(?:learning_units|questions|question_solutions|practice_attempts|practice_answers)/i,
  );
  assert.doesNotMatch(
    migration,
    /\bupdate\s+public\.(?:learning_units|questions|question_solutions|practice_attempts|practice_answers)\b/i,
  );
  assert.doesNotMatch(
    migration,
    /grant\s+(?:select|insert|update|delete)\s+on\s+(?:table\s+)?public\.(?:question_solutions|practice_attempts|practice_answers)/i,
  );
  assert.doesNotMatch(migration, /service[_-]?role/i);
  assert.match(
    migration,
    /has_table_privilege\(\s*'authenticated',\s*'public\.question_solutions',\s*'SELECT'/,
  );
  const demo = readFileSync(
    join(process.cwd(), "app/demo/page.tsx"),
    "utf8",
  );
  assert.doesNotMatch(
    demo,
    /length-measurement|visual_spec|practice_attempts/,
  );
});

function completedChainThroughLengthMeasurement() {
  const previous = completedChainThroughGeometry();
  const questionOrder = Array.from(
    { length: 24 },
    (_, index) => `g1-len-q${String(index + 1).padStart(2, "0")}`,
  );
  return [
    ...previous,
    {
      id: "97979797-9797-4797-8797-979797979797",
      unitSlug: LENGTH_MEASUREMENT_UNIT_SLUG,
      status: "COMPLETED" as const,
      questionOrder,
      totalQuestions: 24,
      answeredCount: 24,
      correctCount: 21,
      startedAt: "2026-08-22T02:00:00.000Z",
      completedAt: "2026-08-22T02:30:00.000Z",
    },
  ];
}

const validAnalogClockVisual = {
  kind: "ANALOG_CLOCK",
  description:
    "Mặt đồng hồ có đủ mười hai số, kim giờ ngắn và kim phút dài.",
  hour: 7,
  minute: 0,
  hourAngle: 210,
  minuteAngle: 0,
};

const validDailyEventVisual = {
  kind: "DAILY_EVENT_SEQUENCE",
  description:
    "Ba hoạt động được đánh số và nối theo một thứ tự rõ ràng.",
  events: [
    { id: "wake", label: "Thức dậy", order: 1, icon: "WAKE" },
    { id: "breakfast", label: "Ăn sáng", order: 2, icon: "BREAKFAST" },
    { id: "school", label: "Đến lớp", order: 3, icon: "SCHOOL" },
  ],
};

const validWeekdayVisual = {
  kind: "WEEKDAY_STRIP",
  description:
    "Dải bảy ngày trong tuần theo đúng thứ tự, một ngày có khung kép.",
  days: [
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
    "Chủ nhật",
  ],
  focusIndex: 2,
  focusLabel: "Hôm nay",
};

const validCalendarVisual = {
  kind: "SIMPLE_CALENDAR",
  description:
    "Tờ lịch có bảy cột, các ngày tăng liên tiếp và một ô có khung kép.",
  monthLabel: "Tháng 6 minh họa",
  weekdayLabels: [
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
    "Chủ nhật",
  ],
  startWeekday: 0,
  dayCount: 30,
  markedDay: 17,
  markLabel: "Ngày được chọn",
};

test("Sprint 5K 1. Migration 0029 is atomic and follows verified 0028", () => {
  assert.equal(
    existsSync(
      join(
        process.cwd(),
        "supabase/migrations/0028_grade1_length_measurement.sql",
      ),
    ),
    true,
  );
  const migrationPath = join(
    process.cwd(),
    "supabase/migrations/0029_grade1_time_clock_calendar.sql",
  );
  assert.equal(existsSync(migrationPath), true);
  const migration = readFileSync(migrationPath, "utf8");
  assert.match(migration, /^begin;/);
  assert.match(migration, /do \$validation\$/);
  assert.ok(
    migration.indexOf("do $validation$") < migration.lastIndexOf("commit;"),
  );
  assert.match(migration, /commit;\s*$/);
  assert.equal(
    existsSync(
      join(
        process.cwd(),
        "supabase/migrations/0030_grade1_time_clock_calendar.sql",
      ),
    ),
    false,
  );
});

test("Sprint 5K 2. Seed has six sections, two examples and exact type distribution", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0029_grade1_time_clock_calendar.sql",
    ),
    "utf8",
  );
  const lesson = JSON.parse(migration.split("$lesson$")[1] ?? "{}") as {
    sections?: unknown[];
    worked_examples?: unknown[];
  };
  const questions = migration.split("$questions$")[1] ?? "";
  const solutions = migration.split("$solutions$")[1] ?? "";
  assert.equal(lesson.sections?.length, 6);
  assert.equal(lesson.worked_examples?.length, 2);
  assert.equal(questions.match(/"code":"g1-time-q\d{2}"/g)?.length, 24);
  assert.equal(
    solutions.match(/"question_id":"g1-time-q\d{2}"/g)?.length,
    24,
  );
  assert.equal(
    questions.match(/"question_type":"MULTIPLE_CHOICE"/g)?.length,
    16,
  );
  assert.equal(
    questions.match(/"question_type":"NUMBER_INPUT"/g)?.length,
    8,
  );
});

test("Sprint 5K 3. Four skills each have six questions and Vietnamese labels", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0029_grade1_time_clock_calendar.sql",
    ),
    "utf8",
  );
  const questions = migration.split("$questions$")[1] ?? "";
  assert.deepEqual(getUnitSkillCodes(TIME_CLOCK_CALENDAR_UNIT_SLUG), [
    "READ_WHOLE_HOURS",
    "ORDER_DAILY_EVENTS",
    "DAYS_OF_WEEK",
    "READ_SIMPLE_CALENDAR",
  ]);
  for (const skillCode of getUnitSkillCodes(
    TIME_CLOCK_CALENDAR_UNIT_SLUG,
  )) {
    assert.equal(
      questions.match(
        new RegExp(`"skill_code":"${skillCode}"`, "g"),
      )?.length,
      6,
    );
    assert.equal(typeof skillLabels[skillCode], "string");
  }
});

test("Sprint 5K 4. Catalog exposes the twelfth unit through the dynamic lesson route", () => {
  const units = [
    baseUnitFixture,
    additionUnitFixture,
    subtractionUnitFixture,
    numbersTo20UnitFixture,
    additionTo20UnitFixture,
    subtractionTo20UnitFixture,
    numbersTo100UnitFixture,
    additionTo100UnitFixture,
    subtractionTo100UnitFixture,
    basicGeometryUnitFixture,
    lengthMeasurementUnitFixture,
    timeClockCalendarUnitFixture,
  ];
  assert.equal(units.length, 12);
  assert.equal(units.at(-1)?.slug, TIME_CLOCK_CALENDAR_UNIT_SLUG);
  assert.equal(
    getLessonPath(TIME_CLOCK_CALENDAR_UNIT_SLUG),
    "/learn/grade-1/time-clock-calendar",
  );
  assert.equal(
    existsSync(
      join(
        process.cwd(),
        "app/learn/grade-1/time-clock-calendar/page.tsx",
      ),
    ),
    false,
  );
  assert.equal(
    parseLearningUnit({
      slug: TIME_CLOCK_CALENDAR_UNIT_SLUG,
      grade: 1,
      title: "Thời gian, đồng hồ và lịch",
      description: "Đọc giờ đúng và lịch đơn giản.",
      learning_objectives: ["Đọc được giờ đúng."],
      lesson_content: {
        sections: lessonSections,
        worked_examples: workedExamples.map((example) => ({
          title: example.title,
          steps: example.steps,
          answer: example.answer,
        })),
      },
      total_questions: 24,
      prerequisite_unit_slug: LENGTH_MEASUREMENT_UNIT_SLUG,
    })?.slug,
    TIME_CLOCK_CALENDAR_UNIT_SLUG,
  );
});

test("Sprint 5K 5. Length completion unlocks time practice and database authorization stays fail-closed", () => {
  assert.equal(
    isUnitPracticeUnlocked(
      timeClockCalendarUnitFixture,
      completedChainThroughGeometry(),
    ),
    false,
  );
  const completedPrerequisite = completedChainThroughLengthMeasurement();
  assert.equal(
    isUnitPracticeUnlocked(
      timeClockCalendarUnitFixture,
      completedPrerequisite,
    ),
    true,
  );
  assert.equal(
    getSuggestedUnit(
      [
        baseUnitFixture,
        additionUnitFixture,
        subtractionUnitFixture,
        numbersTo20UnitFixture,
        additionTo20UnitFixture,
        subtractionTo20UnitFixture,
        numbersTo100UnitFixture,
        additionTo100UnitFixture,
        subtractionTo100UnitFixture,
        basicGeometryUnitFixture,
        lengthMeasurementUnitFixture,
        timeClockCalendarUnitFixture,
      ],
      completedPrerequisite,
    )?.slug,
    TIME_CLOCK_CALENDAR_UNIT_SLUG,
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0029_grade1_time_clock_calendar.sql",
    ),
    "utf8",
  );
  assert.match(migration, /display_order = 12/);
  assert.match(migration, /v_start_definition !~ 'auth\[.]uid'/);
  assert.match(migration, /v_start_definition !~ 'prerequisite_unit_slug'/);
  assert.match(migration, /v_start_definition !~ 'COMPLETED'/);
});

test("Sprint 5K 6. Visual parser accepts four time contracts and rejects unsafe or inconsistent specs", () => {
  assert.equal(
    parsePracticeVisualSpec(validAnalogClockVisual)?.kind,
    "ANALOG_CLOCK",
  );
  assert.equal(
    parsePracticeVisualSpec(validDailyEventVisual)?.kind,
    "DAILY_EVENT_SEQUENCE",
  );
  assert.equal(
    parsePracticeVisualSpec(validWeekdayVisual)?.kind,
    "WEEKDAY_STRIP",
  );
  assert.equal(
    parsePracticeVisualSpec(validCalendarVisual)?.kind,
    "SIMPLE_CALENDAR",
  );
  assert.equal(
    parsePracticeVisualSpec({
      ...validAnalogClockVisual,
      hourAngle: 180,
    }),
    null,
  );
  assert.equal(
    parsePracticeVisualSpec({
      ...validAnalogClockVisual,
      minute: 30,
    }),
    null,
  );
  assert.equal(
    parsePracticeVisualSpec({
      ...validDailyEventVisual,
      events: validDailyEventVisual.events.map((event, index) => ({
        ...event,
        order: index + 2,
      })),
    }),
    null,
  );
  assert.equal(
    parsePracticeVisualSpec({
      ...validCalendarVisual,
      url: "https://example.test/calendar.svg",
    }),
    null,
  );
});

test("Sprint 5K 7. Practice and review preserve clock and calendar visuals without pre-submit solutions", () => {
  const rawQuestion = {
    code: "g1-time-q03",
    unit_slug: TIME_CLOCK_CALENDAR_UNIT_SLUG,
    question_type: "NUMBER_INPUT",
    prompt: "Đồng hồ đang chỉ mấy giờ? Chỉ nhập số.",
    options: null,
    visual_spec: validAnalogClockVisual,
    skill_code: "READ_WHOLE_HOURS",
    difficulty: "EASY",
    display_order: 3,
  };
  const question = parsePracticeQuestion(rawQuestion);
  assert.ok(question);
  assert.equal(question.visualSpec?.kind, "ANALOG_CLOCK");
  const practicePage = readFileSync(
    join(process.cwd(), "app/practice/[attemptId]/page.tsx"),
    "utf8",
  );
  assert.match(practicePage, /visual_spec/);
  assert.doesNotMatch(practicePage, /question_solutions/);

  const review = parsePracticeReviewRpcResult({
    attempt_id: "98989898-9898-4898-8898-989898989898",
    unit_slug: TIME_CLOCK_CALENDAR_UNIT_SLUG,
    status: "IN_PROGRESS",
    total_questions: 24,
    answered_count: 1,
    correct_count: 1,
    started_at: "2026-08-23T02:00:00.000Z",
    completed_at: null,
    answers: [
      {
        question_id: "g1-time-q03",
        question_type: "NUMBER_INPUT",
        prompt: rawQuestion.prompt,
        options: null,
        visual_spec: validAnalogClockVisual,
        skill_code: "READ_WHOLE_HOURS",
        student_answer: "7",
        is_correct: true,
        correct_answer: "7",
        solution_steps: ["Kim phút ở số 12.", "Kim giờ ở số 7."],
        explanation: "Đồng hồ chỉ 7 giờ.",
        hint: "Nhìn kim ngắn.",
        answered_at: "2026-08-23T02:05:00.000Z",
      },
    ],
  });
  assert.ok(review);
  assert.equal(review.answers[0]?.visualSpec?.kind, "ANALOG_CLOCK");
});

test("Sprint 5K 8. One accessible renderer restores all time visuals in practice and review", () => {
  const renderer = readFileSync(
    join(process.cwd(), "components/PracticeVisual.tsx"),
    "utf8",
  );
  const runner = readFileSync(
    join(
      process.cwd(),
      "app/practice/[attemptId]/PracticeRunner.tsx",
    ),
    "utf8",
  );
  const review = readFileSync(
    join(process.cwd(), "app/review/[attemptId]/page.tsx"),
    "utf8",
  );
  assert.match(renderer, /AnalogClockVisual/);
  assert.match(renderer, /DailyEventSequenceVisual/);
  assert.match(renderer, /WeekdayStripVisual/);
  assert.match(renderer, /SimpleCalendarVisual/);
  assert.match(renderer, /role="img"/);
  assert.match(renderer, /<title>/);
  assert.match(renderer, /sr-only/);
  assert.doesNotMatch(renderer, /dangerouslySetInnerHTML|href=|src=/);
  assert.match(runner, /<PracticeVisual spec=\{question\.visualSpec\}/);
  assert.match(review, /<PracticeVisual spec=\{answer\.visualSpec\}/);
});

test("Sprint 5K 9. Immediate grading, single-flight and reconciliation need no forced refresh", () => {
  const runner = readFileSync(
    join(
      process.cwd(),
      "app/practice/[attemptId]/PracticeRunner.tsx",
    ),
    "utf8",
  );
  assert.match(runner, /mergeGradedAnswer/);
  assert.match(runner, /reconcileSubmittedAnswer/);
  assert.match(runner, /createSingleFlightGate/);
  assert.doesNotMatch(runner, /location\.reload|router\.refresh/);
  assert.match(runner, /disabled=\{Boolean\(result\) \|\| isSubmitting\}/);
});

test("Sprint 5K 10. Start, resume, results and retake remain isolated to the new unit", () => {
  const order = Array.from(
    { length: 24 },
    (_, index) => `g1-time-q${String(index + 1).padStart(2, "0")}`,
  );
  const started = parseStartPracticeRpcResult({
    ...startRpcPayload,
    unit_slug: TIME_CLOCK_CALENDAR_UNIT_SLUG,
    question_order: order,
    answered_count: 7,
    correct_count: 6,
  });
  assert.ok(started);
  assert.equal(
    shouldResumeExistingAttempt(
      buildPracticeHistory([{ ...started, completedAt: null }]),
    ),
    true,
  );
  const attempts = [
    ...completedChainThroughLengthMeasurement(),
    {
      ...started,
      id: "99999999-9999-4999-8999-999999999999",
      status: "COMPLETED" as const,
      answeredCount: 24,
      correctCount: 20,
      completedAt: "2026-08-23T02:30:00.000Z",
    },
    {
      ...started,
      id: "a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0",
      status: "COMPLETED" as const,
      questionOrder: [...order].reverse(),
      answeredCount: 24,
      correctCount: 23,
      completedAt: "2026-08-24T02:30:00.000Z",
    },
  ];
  assert.deepEqual(
    buildPracticeHistory(attempts)
      .filter(
        (attempt) => attempt.unitSlug === TIME_CLOCK_CALENDAR_UNIT_SLUG,
      )
      .map((attempt) => attempt.attemptNumber),
    [2, 1],
  );
});

test("Sprint 5K 11. Parent dashboard and weekly report accept all time skills", () => {
  for (const skillCode of getUnitSkillCodes(
    TIME_CLOCK_CALENDAR_UNIT_SLUG,
  )) {
    const skill = {
      skill_code: skillCode,
      answered_count: 6,
      correct_count: 5,
      accuracy_percent: 83.3,
    };
    const dashboard = parseParentChildLearningDashboard({
      ...emptyParentDashboardPayload,
      skills: [...emptyParentDashboardPayload.skills, skill],
    });
    const weekly = parseParentWeeklySummary({
      ...weeklySummaryPayload,
      skills: [...weeklySummaryPayload.skills, skill],
    });
    assert.equal(dashboard?.skills.at(-1)?.skillCode, skillCode);
    assert.equal(weekly?.skills.at(-1)?.skillCode, skillCode);
  }
});

test("Sprint 5K 12. Time presentation and visual CSS are responsive without color-only states", () => {
  const presentation = getUnitPresentation(TIME_CLOCK_CALENDAR_UNIT_SLUG);
  assert.equal(presentation.cardClassName, "unit-card--time");
  assert.equal(presentation.pageClassName, "real-learning-page--time");
  assert.equal(presentation.lessonVisual?.kind, "ANALOG_CLOCK");
  const styles = readFileSync(
    join(process.cwd(), "app/globals.css"),
    "utf8",
  );
  assert.match(styles, /\.unit-card--time/);
  assert.match(styles, /\.real-learning-page--time/);
  assert.match(styles, /\.practice-visual__clock-hand--hour/);
  assert.match(styles, /\.practice-visual__clock-hand--minute/);
  assert.match(styles, /\.practice-visual__weekday--focused/);
  assert.match(styles, /\.practice-visual__calendar-cell--marked/);
  assert.match(styles, /width: min\(100%, 32rem\)/);
  assert.match(styles, /aspect-ratio: 5 \/ 3/);
});

test("Sprint 5K 13. Migration preserves old data and keeps solutions and practice mutations closed", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0029_grade1_time_clock_calendar.sql",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    migration,
    /(?:delete\s+from|truncate)\s+public\.(?:learning_units|questions|question_solutions|practice_attempts|practice_answers)/i,
  );
  assert.doesNotMatch(
    migration,
    /\bupdate\s+public\.(?:learning_units|questions|question_solutions|practice_attempts|practice_answers)\b/i,
  );
  assert.doesNotMatch(
    migration,
    /grant\s+(?:select|insert|update|delete)\s+on\s+(?:table\s+)?public\.(?:question_solutions|practice_attempts|practice_answers)/i,
  );
  assert.doesNotMatch(migration, /service[_-]?role/i);
  assert.match(
    migration,
    /has_table_privilege\(\s*'authenticated',\s*'public\.question_solutions',\s*'SELECT'/,
  );
  assert.match(migration, /private\.is_valid_time_visual_spec/);
  const demo = readFileSync(
    join(process.cwd(), "app/demo/page.tsx"),
    "utf8",
  );
  assert.doesNotMatch(
    demo,
    /time-clock-calendar|visual_spec|practice_attempts/,
  );
});

test("Sprint 5K 14. SQL visual validation does not reject the allowlisted description field as script", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0029_grade1_time_clock_calendar.sql",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    migration,
    /\(https\?:\|www\[\.\]\|javascript:\|data:\|<\|>\|script\|is_correct\|correct_answer\)/i,
  );
  assert.match(
    migration,
    /lower\(p_spec::text\)[\s\S]{0,160}\(https\?:\|www\[\.\]\|javascript:\|data:\|<\|>\)/i,
  );
  assert.match(
    migration,
    /select count\(\*\)[\s\S]*from pg_catalog\.jsonb_object_keys\(p_spec\)[\s\S]*<> 6/,
  );
});

const validSolidSceneVisual = {
  kind: "SOLID_SCENE",
  description:
    "Ba khối A, B và C được vẽ tách rời trong các ô có đường viền rõ.",
  items: [
    {
      id: "a",
      label: "A",
      row: 1,
      column: 1,
      frontWidth: 14,
      frontHeight: 14,
      depth: 5,
      appearance: "BLOCK",
    },
    {
      id: "b",
      label: "B",
      row: 1,
      column: 2,
      frontWidth: 16,
      frontHeight: 10,
      depth: 5,
      appearance: "PLAIN",
    },
    {
      id: "c",
      label: "C",
      row: 1,
      column: 3,
      frontWidth: 14,
      frontHeight: 14,
      depth: 5,
      appearance: "DICE",
    },
  ],
};

test("Sprint 5L 1. Migration 0030 remains the only additive Sprint 5L content migration", () => {
  const migrations = readdirSync(
    join(process.cwd(), "supabase/migrations"),
  ).filter((file) => /^\d{4}_.*[.]sql$/.test(file));
  assert.equal(
    migrations.includes("0030_grade1_cube_and_cuboid.sql"),
    true,
  );
  assert.equal(
    migrations.filter((file) => file.startsWith("0030_")).length,
    1,
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0030_grade1_cube_and_cuboid.sql",
    ),
    "utf8",
  );
  assert.match(migration, /^\s*begin;/i);
  assert.match(migration, /do \$validation\$/);
  assert.match(migration, /commit;\s*$/i);
});

test("Sprint 5L 2. Seed has six sections, two examples and exact content distribution", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0030_grade1_cube_and_cuboid.sql",
    ),
    "utf8",
  );
  const lesson = JSON.parse(migration.split("$lesson$")[1] ?? "{}") as {
    sections?: unknown[];
    worked_examples?: unknown[];
  };
  const questions = migration.split("$questions$")[1] ?? "";
  const solutions = migration.split("$solutions$")[1] ?? "";
  assert.equal(lesson.sections?.length, 6);
  assert.equal(lesson.worked_examples?.length, 2);
  assert.equal(
    questions.match(/"code":"g1-solid-q\d{2}"/g)?.length,
    24,
  );
  assert.equal(
    solutions.match(/"question_id":"g1-solid-q\d{2}"/g)?.length,
    24,
  );
  assert.equal(
    questions.match(/"question_type":"MULTIPLE_CHOICE"/g)?.length,
    16,
  );
  assert.equal(
    questions.match(/"question_type":"NUMBER_INPUT"/g)?.length,
    8,
  );
});

test("Sprint 5L 3. Four new skills each have six questions and Vietnamese labels", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0030_grade1_cube_and_cuboid.sql",
    ),
    "utf8",
  );
  const questions = migration.split("$questions$")[1] ?? "";
  assert.deepEqual(getUnitSkillCodes(CUBE_AND_CUBOID_UNIT_SLUG), [
    "CUBE_RECOGNITION",
    "CUBOID_RECOGNITION",
    "REAL_OBJECT_CLASSIFICATION",
    "SIMPLE_BLOCK_COMPOSITION",
  ]);
  for (const skillCode of getUnitSkillCodes(
    CUBE_AND_CUBOID_UNIT_SLUG,
  )) {
    assert.equal(
      questions.match(
        new RegExp(`"skill_code":"${skillCode}"`, "g"),
      )?.length,
      6,
    );
    assert.equal(typeof skillLabels[skillCode], "string");
  }
});

test("Sprint 5L 4. Catalog resolves the thirteenth unit through the shared lesson route", () => {
  const units = [
    baseUnitFixture,
    additionUnitFixture,
    subtractionUnitFixture,
    numbersTo20UnitFixture,
    additionTo20UnitFixture,
    subtractionTo20UnitFixture,
    numbersTo100UnitFixture,
    additionTo100UnitFixture,
    subtractionTo100UnitFixture,
    basicGeometryUnitFixture,
    lengthMeasurementUnitFixture,
    timeClockCalendarUnitFixture,
    cubeAndCuboidUnitFixture,
  ];
  assert.equal(units.length, 13);
  assert.equal(units.at(-1)?.slug, CUBE_AND_CUBOID_UNIT_SLUG);
  assert.equal(
    getLessonPath(CUBE_AND_CUBOID_UNIT_SLUG),
    "/learn/grade-1/cube-and-cuboid",
  );
  assert.equal(
    existsSync(
      join(
        process.cwd(),
        "app/learn/grade-1/cube-and-cuboid/page.tsx",
      ),
    ),
    false,
  );
});

test("Sprint 5L 5. Geometry completion unlocks practice without requiring time completion", () => {
  const beforeGeometry = completedChainThroughSubtractionTo100();
  assert.equal(
    isUnitPracticeUnlocked(cubeAndCuboidUnitFixture, beforeGeometry),
    false,
  );
  const throughGeometry = completedChainThroughGeometry();
  assert.equal(
    throughGeometry.some(
      (attempt) => attempt.unitSlug === TIME_CLOCK_CALENDAR_UNIT_SLUG,
    ),
    false,
  );
  assert.equal(
    isUnitPracticeUnlocked(cubeAndCuboidUnitFixture, throughGeometry),
    true,
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0030_grade1_cube_and_cuboid.sql",
    ),
    "utf8",
  );
  assert.match(
    migration,
    /unit\.prerequisite_unit_slug =\s*'grade-1-basic-geometry-and-position'/,
  );
  assert.doesNotMatch(
    migration,
    /unit\.prerequisite_unit_slug =\s*'grade-1-time-clock-calendar'/,
  );
  assert.match(migration, /v_start_definition !~ 'prerequisite_unit_slug'/);
});

test("Sprint 5L 6. SOLID_SCENE parser rejects unsafe, overlapping and ambiguous payloads", () => {
  assert.equal(
    parsePracticeVisualSpec(validSolidSceneVisual)?.kind,
    "SOLID_SCENE",
  );
  assert.equal(
    parsePracticeVisualSpec({
      ...validSolidSceneVisual,
      items: [
        validSolidSceneVisual.items[0],
        {
          ...validSolidSceneVisual.items[1],
          row: 1,
          column: 1,
        },
      ],
    }),
    null,
  );
  assert.equal(
    parsePracticeVisualSpec({
      ...validSolidSceneVisual,
      items: [
        {
          ...validSolidSceneVisual.items[2],
          frontWidth: 16,
          frontHeight: 10,
        },
      ],
    }),
    null,
  );
  assert.equal(
    parsePracticeVisualSpec({
      ...validSolidSceneVisual,
      url: "https://example.test/solid.svg",
    }),
    null,
  );
});

test("Sprint 5L 7. Practice and review preserve typed visuals without pre-submit solutions", () => {
  const rawQuestion = {
    code: "g1-solid-q21",
    unit_slug: CUBE_AND_CUBOID_UNIT_SLUG,
    question_type: "NUMBER_INPUT",
    prompt: "Nhóm trong minh họa có tất cả bao nhiêu khối? Chỉ nhập số.",
    options: null,
    visual_spec: validSolidSceneVisual,
    skill_code: "SIMPLE_BLOCK_COMPOSITION",
    difficulty: "EASY",
    display_order: 21,
  };
  const question = parsePracticeQuestion(rawQuestion);
  assert.ok(question);
  assert.equal(question.visualSpec?.kind, "SOLID_SCENE");
  const practicePage = readFileSync(
    join(process.cwd(), "app/practice/[attemptId]/page.tsx"),
    "utf8",
  );
  assert.doesNotMatch(practicePage, /question_solutions/);

  const review = parsePracticeReviewRpcResult({
    attempt_id: "b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1",
    unit_slug: CUBE_AND_CUBOID_UNIT_SLUG,
    status: "IN_PROGRESS",
    total_questions: 24,
    answered_count: 1,
    correct_count: 1,
    started_at: "2026-08-24T02:00:00.000Z",
    completed_at: null,
    answers: [
      {
        question_id: rawQuestion.code,
        question_type: rawQuestion.question_type,
        prompt: rawQuestion.prompt,
        options: null,
        visual_spec: validSolidSceneVisual,
        skill_code: rawQuestion.skill_code,
        student_answer: "3",
        is_correct: true,
        correct_answer: "3",
        solution_steps: ["Chỉ từng khối.", "Đếm được ba khối."],
        explanation: "Có ba khối.",
        hint: "Đếm từng nhãn.",
        answered_at: "2026-08-24T02:05:00.000Z",
      },
    ],
  });
  assert.ok(review);
  assert.equal(review.answers[0]?.visualSpec?.kind, "SOLID_SCENE");
});

test("Sprint 5L 8. One responsive accessible renderer serves lesson, practice and review", () => {
  const renderer = readFileSync(
    join(process.cwd(), "components/PracticeVisual.tsx"),
    "utf8",
  );
  const styles = readFileSync(
    join(process.cwd(), "app/globals.css"),
    "utf8",
  );
  assert.match(renderer, /SolidSceneVisual/);
  assert.match(renderer, /SolidItemVisual/);
  assert.match(renderer, /role="img"/);
  assert.match(renderer, /<title>/);
  assert.match(renderer, /sr-only/);
  assert.doesNotMatch(renderer, /dangerouslySetInnerHTML|href=|src=/);
  assert.match(styles, /\.practice-visual--solid_scene svg/);
  assert.match(styles, /\.practice-visual__solid-face--front/);
  assert.match(styles, /width: min\(100%, 32rem\)/);
  assert.match(styles, /aspect-ratio: 5 \/ 3/);
});

test("Sprint 5L 9. Start, resume, results and retake stay isolated to the new unit", () => {
  const order = Array.from(
    { length: 24 },
    (_, index) => `g1-solid-q${String(index + 1).padStart(2, "0")}`,
  );
  const started = parseStartPracticeRpcResult({
    ...startRpcPayload,
    unit_slug: CUBE_AND_CUBOID_UNIT_SLUG,
    question_order: order,
    answered_count: 6,
    correct_count: 5,
  });
  assert.ok(started);
  assert.equal(
    shouldResumeExistingAttempt(
      buildPracticeHistory([{ ...started, completedAt: null }]),
    ),
    true,
  );
  const attempts = [
    ...completedChainThroughGeometry(),
    {
      ...started,
      id: "b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2",
      status: "COMPLETED" as const,
      answeredCount: 24,
      correctCount: 20,
      completedAt: "2026-08-24T02:30:00.000Z",
    },
    {
      ...started,
      id: "b3b3b3b3-b3b3-43b3-83b3-b3b3b3b3b3b3",
      status: "COMPLETED" as const,
      questionOrder: [...order].reverse(),
      answeredCount: 24,
      correctCount: 23,
      completedAt: "2026-08-25T02:30:00.000Z",
    },
  ];
  assert.deepEqual(
    buildPracticeHistory(attempts)
      .filter((attempt) => attempt.unitSlug === CUBE_AND_CUBOID_UNIT_SLUG)
      .map((attempt) => attempt.attemptNumber),
    [2, 1],
  );
});

test("Sprint 5L 10. Parent dashboard and weekly report accept all four new skills read-only", () => {
  for (const skillCode of getUnitSkillCodes(CUBE_AND_CUBOID_UNIT_SLUG)) {
    const skill = {
      skill_code: skillCode,
      answered_count: 6,
      correct_count: 5,
      accuracy_percent: 83.3,
    };
    const dashboard = parseParentChildLearningDashboard({
      ...emptyParentDashboardPayload,
      skills: [...emptyParentDashboardPayload.skills, skill],
    });
    const weekly = parseParentWeeklySummary({
      ...weeklySummaryPayload,
      skills: [...weeklySummaryPayload.skills, skill],
    });
    assert.equal(dashboard?.skills.at(-1)?.skillCode, skillCode);
    assert.equal(weekly?.skills.at(-1)?.skillCode, skillCode);
  }
});

test("Sprint 5L 11. Migration preserves old data, generic RPC and closed solution boundary", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0030_grade1_cube_and_cuboid.sql",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    migration,
    /(?:delete\s+from|truncate)\s+public\.(?:learning_units|questions|question_solutions|practice_attempts|practice_answers)/i,
  );
  assert.doesNotMatch(
    migration,
    /\bupdate\s+public\.(?:learning_units|questions|question_solutions|practice_attempts|practice_answers)\b/i,
  );
  assert.doesNotMatch(
    migration,
    /create or replace function public\.start_or_resume_practice/i,
  );
  assert.doesNotMatch(
    migration,
    /grant\s+(?:select|insert|update|delete)\s+on\s+(?:table\s+)?public\.(?:question_solutions|practice_attempts|practice_answers)/i,
  );
  assert.doesNotMatch(migration, /service[_-]?role/i);
  assert.match(
    migration,
    /has_table_privilege\(\s*'authenticated',\s*'public\.question_solutions',\s*'SELECT'/,
  );
});

test("Sprint 5L 12. Docs preserve owner approval and record the superseding source-validation policy", () => {
  const decision = readFileSync(
    join(
      process.cwd(),
      "docs/curriculum/GRADE1_NEXT_UNIT_DECISION.md",
    ),
    "utf8",
  );
  const roadmap = readFileSync(
    join(
      process.cwd(),
      "docs/curriculum/CONTENT_EXPANSION_ROADMAP.md",
    ),
    "utf8",
  );
  assert.match(decision, /Approved with adjustment/);
  assert.match(decision, /grade-1-basic-geometry-and-position/);
  assert.match(
    decision,
    /SUPERSEDED_BY_OFFICIAL_SOURCE_VALIDATION_POLICY/,
  );
  assert.match(roadmap, /User-confirmed live smoke pass/);
  assert.match(roadmap, /future Grade 2 content/i);
  assert.doesNotMatch(`${decision}\n${roadmap}`, /\/Users\//);
});

test("Sprint 5L 13. Demo and teacher assignment areas do not gain system-solution access", () => {
  const demo = readFileSync(
    join(process.cwd(), "app/demo/page.tsx"),
    "utf8",
  );
  const assignmentSources = [
    "lib/assignments/contracts.ts",
    "app/teacher/assignments/page.tsx",
  ]
    .map((file) => readFileSync(join(process.cwd(), file), "utf8"))
    .join("\n");
  assert.doesNotMatch(
    demo,
    /cube-and-cuboid|visual_spec|practice_attempts/,
  );
  assert.doesNotMatch(assignmentSources, /question_solutions/);
});

const diagnosticAttemptId =
  "d1a60000-0000-4000-8000-000000000001";
const diagnosticDomains = [
  "NUMBER_SENSE",
  "ARITHMETIC",
  "GEOMETRY",
  "MEASUREMENT_TIME",
] as const;
const diagnosticQuestionOrder = diagnosticDomains.flatMap(
  (domain, domainIndex) =>
    Array.from(
      { length: 6 },
      (_, questionIndex) =>
        `diagnostic-${domainIndex + 1}-q${questionIndex + 1}`,
    ),
);
const diagnosticQuestionsRpc = diagnosticQuestionOrder.map(
  (code, index) => {
    const domainIndex = Math.floor(index / 6);
    const withinDomain = index % 6;
    const domain = diagnosticDomains[domainIndex];
    const questionType =
      withinDomain < 4 ? "MULTIPLE_CHOICE" : "NUMBER_INPUT";
    const skillCodes = [
      "COUNT_READ_WRITE_TO_20",
      "ADDITION_CALCULATION",
      "RECOGNIZE_BASIC_SHAPES",
      "COMPARE_LENGTHS",
    ] as const;
    return {
      code,
      unit_slug: [
        NUMBERS_TO_20_UNIT_SLUG,
        ADDITION_UNIT_SLUG,
        BASIC_GEOMETRY_UNIT_SLUG,
        LENGTH_MEASUREMENT_UNIT_SLUG,
      ][domainIndex],
      unit_title: [
        "Các số trong phạm vi 20",
        "Phép cộng trong phạm vi 10",
        "Hình học và vị trí cơ bản",
        "Đo độ dài và so sánh độ dài",
      ][domainIndex],
      question_type: questionType,
      prompt: `Câu chẩn đoán ${index + 1} có nội dung rõ ràng.`,
      options:
        questionType === "MULTIPLE_CHOICE"
          ? { A: "Một", B: "Hai", C: "Ba", D: "Bốn" }
          : null,
      visual_spec: null,
      skill_code: skillCodes[domainIndex],
      difficulty: "EASY",
      display_order: index + 1,
      domain,
    };
  },
);
const diagnosticStateRpcPayload = {
  attempt_id: diagnosticAttemptId,
  status: "IN_PROGRESS",
  question_order: diagnosticQuestionOrder,
  total_questions: 24,
  answered_count: 2,
  answered_question_ids: diagnosticQuestionOrder.slice(0, 2),
  started_at: "2026-07-29T01:00:00.000Z",
  completed_at: null,
  questions: diagnosticQuestionsRpc,
};
const diagnosticDomainResults = diagnosticDomains.map(
  (domain, index) => ({
    domain,
    answered_count: 6,
    correct_count: index === 0 ? 3 : 5,
    accuracy_percent: index === 0 ? 50 : 83.3,
    level: index === 0 ? "REVIEW" : "DOING_WELL",
  }),
);
const diagnosticReviewAnswers = diagnosticQuestionsRpc.map(
  (question, index) => ({
    question_id: question.code,
    question_type: question.question_type,
    prompt: question.prompt,
    options: question.options,
    visual_spec: question.visual_spec,
    domain: question.domain,
    unit_slug: question.unit_slug,
    unit_title: question.unit_title,
    skill_code: question.skill_code,
    student_answer:
      question.question_type === "MULTIPLE_CHOICE" ? "A" : "2",
    is_correct: index % 5 !== 0,
    correct_answer:
      question.question_type === "MULTIPLE_CHOICE" ? "A" : "2",
    solution_steps: [
      `Bước 1: Xét dữ kiện câu ${index + 1}.`,
      "Bước 2: Chọn câu trả lời phù hợp.",
    ],
    explanation: "Câu trả lời phù hợp với dữ kiện đã cho.",
    hint: "Em hãy đọc kỹ dữ kiện rồi kiểm tra lại.",
    answered_at: "2026-07-29T01:10:00.000Z",
  }),
);
const diagnosticReviewRpcPayload = {
  attempt_id: diagnosticAttemptId,
  status: "COMPLETED",
  total_questions: 24,
  answered_count: 24,
  correct_count: 19,
  accuracy_percent: 79.2,
  started_at: "2026-07-29T01:00:00.000Z",
  completed_at: "2026-07-29T01:30:00.000Z",
  domains: diagnosticDomainResults,
  units: diagnosticDomains.map((_, index) => ({
    unit_slug: diagnosticQuestionsRpc[index * 6]?.unit_slug,
    unit_title: diagnosticQuestionsRpc[index * 6]?.unit_title,
    answered_count: 6,
    correct_count: index === 0 ? 3 : 5,
    accuracy_percent: index === 0 ? 50 : 83.3,
  })),
  skills: diagnosticDomains.map((_, index) => ({
    skill_code: diagnosticQuestionsRpc[index * 6]?.skill_code,
    answered_count: 6,
    correct_count: index === 0 ? 3 : 5,
    accuracy_percent: index === 0 ? 50 : 83.3,
  })),
  recommendation: {
    unit_slug: BASE_UNIT_SLUG,
    unit_title: "Các số trong phạm vi 10",
    reason_code: "REVIEW_NUMBER_SENSE",
    explanation:
      "Kết quả cho thấy em nên ôn lại số và cấu tạo số từ bài nền tảng.",
  },
  answers: diagnosticReviewAnswers,
};

test("Sprint 5M 1. Diagnostic migration follows 0030 and has one additive runtime repair", () => {
  const migrations = readdirSync(
    join(process.cwd(), "supabase/migrations"),
  )
    .filter((file) => /^\d{4}_.+\.sql$/.test(file))
    .sort();
  const contentMigrationIndex = migrations.indexOf(
    "0030_grade1_cube_and_cuboid.sql",
  );
  assert.notEqual(contentMigrationIndex, -1);
  assert.equal(
    migrations[contentMigrationIndex],
    "0030_grade1_cube_and_cuboid.sql",
  );
  assert.equal(
    migrations[contentMigrationIndex + 1],
    "0031_grade1_diagnostic.sql",
  );
  assert.equal(
    migrations[contentMigrationIndex + 2],
    "0032_fix_grade1_diagnostic_runtime.sql",
  );
  assert.equal(
    migrations.filter((file) => file.startsWith("0031_")).length,
    1,
  );
  assert.equal(
    migrations.filter((file) => file.startsWith("0032_")).length,
    1,
  );
});

test("Sprint 5M 2. Fixed blueprint contains 24 unique questions and four domains of six", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0031_grade1_diagnostic.sql",
    ),
    "utf8",
  );
  const rows = [
    ...migration.matchAll(
      /\(1,\s*(\d+),\s*'(NUMBER_SENSE|ARITHMETIC|GEOMETRY|MEASUREMENT_TIME)',\s*'([^']+)'\)/g,
    ),
  ];
  assert.equal(rows.length, DIAGNOSTIC_QUESTION_COUNT);
  assert.equal(new Set(rows.map((row) => row[3])).size, 24);
  for (const domain of diagnosticDomains) {
    assert.equal(rows.filter((row) => row[2] === domain).length, 6);
  }
});

test("Sprint 5M 3. Curated blueprint contains 16 MCQ and 8 NUMBER_INPUT from published Grade 1 seeds", () => {
  const validator = readFileSync(
    join(process.cwd(), "scripts/validate-grade1-diagnostic.mjs"),
    "utf8",
  );
  assert.match(validator, /mcqCount !== 16 \|\| numberCount !== 8/);
  assert.match(validator, /questionRows\.get\(questionId\)/);
  assert.match(validator, /does not have exactly A-D/);
});

test("Sprint 5M 4. Start parser preserves one stable shuffled question order", () => {
  const payload = {
    attempt_id: diagnosticAttemptId,
    status: "IN_PROGRESS",
    question_order: diagnosticQuestionOrder,
    total_questions: 24,
    answered_count: 0,
    started_at: "2026-07-29T01:00:00.000Z",
  };
  const parsed = parseDiagnosticStartRpcResult(payload);
  assert.deepEqual(parsed?.questionOrder, diagnosticQuestionOrder);
  assert.ok(
    parseDiagnosticStartApiResponse({
      ok: true,
      data: parsed,
    }),
  );
});

test("Sprint 5M 5. In-progress state restores first unanswered without correctness data", () => {
  const parsed = parseDiagnosticStateRpcResult(
    diagnosticStateRpcPayload,
  );
  assert.ok(parsed);
  assert.equal(parsed.answeredCount, 2);
  assert.equal(
    parsed.questions.find(
      (question) => !parsed.answeredQuestionIds.includes(question.code),
    )?.code,
    diagnosticQuestionOrder[2],
  );
  assert.doesNotMatch(
    JSON.stringify(diagnosticStateRpcPayload),
    /correct_answer|solution_steps|is_correct/,
  );
});

test("Sprint 5M 6. Canonical state API supports read-only reconciliation", () => {
  const state = parseDiagnosticStateRpcResult(diagnosticStateRpcPayload);
  assert.ok(state);
  const response = parseDiagnosticStateApiResponse({
    ok: true,
    data: state,
  });
  assert.equal(response?.data.answeredQuestionIds.length, 2);
});

test("Sprint 5M 7. Answer response advances progress without revealing score", () => {
  const result = parseDiagnosticSubmitRpcResult({
    answered_count: 3,
    total_questions: 24,
    completed: false,
  });
  assert.deepEqual(result, {
    answeredCount: 3,
    totalQuestions: 24,
    completed: false,
  });
  const response = parseDiagnosticSubmitApiResponse({
    ok: true,
    data: result,
  });
  assert.ok(response);
  assert.doesNotMatch(
    JSON.stringify(response),
    /isCorrect|correctAnswer|solutionSteps/,
  );
});

test("Sprint 5M 8. Single-flight gate prevents concurrent diagnostic submits", async () => {
  const gate = createDiagnosticSingleFlightGate();
  let requestCount = 0;
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = gate.run(async () => {
    requestCount += 1;
    await pending;
  });
  const second = await gate.run(async () => {
    requestCount += 1;
  });
  assert.equal(second, null);
  assert.equal(requestCount, 1);
  release();
  await first;
});

test("Sprint 5M 9. Review parser rejects incomplete work and accepts all 24 completed answers", () => {
  assert.equal(
    parseDiagnosticReviewRpcResult({
      ...diagnosticReviewRpcPayload,
      status: "IN_PROGRESS",
    }),
    null,
  );
  const review = parseDiagnosticReviewRpcResult(
    diagnosticReviewRpcPayload,
  );
  assert.ok(review);
  assert.equal(review.answers.length, 24);
  assert.equal(review.domains.length, 4);
  assert.equal(review.recommendation.reasonCode, "REVIEW_NUMBER_SENSE");
});

test("Sprint 5M 10. Domain threshold distinguishes doing well from review", () => {
  const review = parseDiagnosticReviewRpcResult(
    diagnosticReviewRpcPayload,
  );
  assert.ok(review);
  assert.equal(review.domains[0]?.accuracyPercent, 50);
  assert.equal(review.domains[0]?.level, "REVIEW");
  assert.equal(review.domains[1]?.accuracyPercent, 83.3);
  assert.equal(review.domains[1]?.level, "DOING_WELL");
  assert.equal(
    diagnosticDomainLabels[review.domains[0].domain],
    "Số và cấu tạo số",
  );
});

test("Sprint 5M 11. Recommendation rules are deterministic and choose the earliest weak dependency", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0031_grade1_diagnostic.sql",
    ),
    "utf8",
  );
  assert.match(
    migration,
    /\('NUMBER_SENSE', 'grade-1-numbers-to-10', 1\)/,
  );
  assert.match(
    migration,
    /\('ARITHMETIC', 'grade-1-addition-within-10', 2\)/,
  );
  assert.match(migration, /\) < 0\.70/);
  assert.match(migration, /order by recommendation\.priority/);
  assert.match(migration, /order by unit\.display_order, unit\.slug/);
  assert.match(migration, /GRADE1_CURRENT_SCOPE_MASTERED/);
});

test("Sprint 5M 12. Parent parser accepts only aggregate diagnostic data", () => {
  const parentSummary = parseParentDiagnosticSummary({
    has_result: true,
    total_questions: 24,
    correct_count: 19,
    accuracy_percent: 79.2,
    completed_at: "2026-07-29T01:30:00.000Z",
    domains: diagnosticDomainResults,
    recommendation: {
      unit_title: "Các số trong phạm vi 10",
      reason_code: "REVIEW_NUMBER_SENSE",
      explanation:
        "Kết quả cho thấy em nên ôn lại số và cấu tạo số từ bài nền tảng.",
    },
  });
  assert.ok(parentSummary?.hasResult);
  assert.doesNotMatch(
    JSON.stringify(parentSummary),
    /studentAnswer|correctAnswer|solutionSteps|questionId/,
  );
  assert.deepEqual(
    parseParentDiagnosticSummary({ has_result: false }),
    { hasResult: false },
  );
  assert.equal(
    parseParentDiagnosticSummary({
      has_result: true,
      total_questions: 24,
      correct_count: 19,
      accuracy_percent: 79.2,
      completed_at: "2026-07-29T01:30:00.000Z",
      domains: diagnosticDomainResults,
      recommendation: {
        unit_title: "Các số trong phạm vi 10",
        reason_code: "REVIEW_NUMBER_SENSE",
        explanation:
          "Kết quả cho thấy em nên ôn lại số và cấu tạo số từ bài nền tảng.",
      },
      student_answer: "A",
    }),
    null,
  );
});

test("Sprint 5M 13. Attempt history permits completed retakes but only one in-progress diagnostic", () => {
  const completed = parseDiagnosticAttemptSummary({
    id: diagnosticAttemptId,
    status: "COMPLETED",
    answered_count: 24,
    correct_count: 19,
    recommendation_unit_slug: BASE_UNIT_SLUG,
    recommendation_reason_code: "REVIEW_NUMBER_SENSE",
    recommendation_explanation:
      "Kết quả cho thấy em nên ôn lại số và cấu tạo số từ bài nền tảng.",
    started_at: "2026-07-29T01:00:00.000Z",
    completed_at: "2026-07-29T01:30:00.000Z",
  });
  assert.ok(completed);
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0031_grade1_diagnostic.sql",
    ),
    "utf8",
  );
  assert.match(
    migration,
    /create unique index diagnostic_attempts_one_in_progress_idx[\s\S]*where status = 'IN_PROGRESS'/,
  );
  assert.doesNotMatch(
    migration,
    /delete\s+from\s+public\.(diagnostic_attempts|diagnostic_answers)/i,
  );
});

test("Sprint 5M 14. Diagnostic data is separate from ordinary practice progress", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0031_grade1_diagnostic.sql",
    ),
    "utf8",
  );
  assert.match(migration, /create table public\.diagnostic_attempts/);
  assert.match(migration, /create table public\.diagnostic_answers/);
  assert.doesNotMatch(
    migration,
    /\b(?:insert into|update|delete from)\s+public\.practice_(?:attempts|answers)\b/i,
  );
});

test("Sprint 5M 15. Authorization is owner-only, Grade 1 and fail-closed", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0031_grade1_diagnostic.sql",
    ),
    "utf8",
  );
  assert.match(migration, /student_id = auth\.uid\(\)/);
  assert.match(migration, /student\.grade = 1/g);
  assert.match(migration, /profile\.role = 'STUDENT'/g);
  assert.match(migration, /profile\.onboarding_completed/g);
  assert.match(migration, /security definer/g);
  assert.match(migration, /set search_path = ''/g);
  assert.match(
    migration,
    /procedure\.proconfig @> array\['search_path=""'\]::text\[\]/,
  );
  assert.doesNotMatch(
    migration,
    /grant\s+(?:insert|update|delete)\s+on\s+(?:table\s+)?public\.(?:diagnostic_attempts|diagnostic_answers)/i,
  );
});

test("Sprint 5M 16. Diagnostic answers and solutions stay hidden until completed review", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0031_grade1_diagnostic.sql",
    ),
    "utf8",
  );
  const stateFunction =
    migration.match(
      /create or replace function public\.get_grade1_diagnostic_state[\s\S]*?revoke all on function public\.get_grade1_diagnostic_state/,
    )?.[0] ?? "";
  assert.doesNotMatch(stateFunction, /question_solutions/);
  assert.doesNotMatch(stateFunction, /correct_answer|is_correct/);
  assert.match(
    migration,
    /revoke all on table public\.diagnostic_answers from authenticated/,
  );
  assert.match(
    migration,
    /has_table_privilege\([\s\S]*public\.question_solutions[\s\S]*SELECT/,
  );
});

test("Sprint 5M 17. Diagnostic routes stay protected after the Tutor nav addition", () => {
  assert.equal(
    getAuthNavigationDecision("/diagnostic", false),
    "LOGIN",
  );
  assert.equal(
    getAuthNavigationDecision(
      `/diagnostic/${diagnosticAttemptId}`,
      false,
    ),
    "LOGIN",
  );
  assert.equal(getHeaderNavigation(true, "STUDENT").length, 6);
  assert.equal(
    isHeaderItemActive(
      "/diagnostic",
      getHeaderNavigation(true, "STUDENT")[0],
    ),
    true,
  );
});

test("Sprint 5M 18. Dashboard and Parent detail integrate only safe diagnostic summaries", () => {
  const dashboard = readFileSync(
    join(process.cwd(), "app/dashboard/page.tsx"),
    "utf8",
  );
  const parent = readFileSync(
    join(
      process.cwd(),
      "app/parent/children/[connectionId]/page.tsx",
    ),
    "utf8",
  );
  assert.match(dashboard, /Đánh giá năng lực Lớp 1/);
  assert.match(dashboard, /recommendationExplanation/);
  assert.match(parent, /Kết quả đánh giá gần nhất/);
  assert.match(parent, /không xem được câu[\s\S]*đáp án[\s\S]*lời giải/);
  assert.doesNotMatch(parent, /diagnostic_answers|question_solutions/);
});

test("Sprint 5M 19. Visuals use the existing allowlisted PracticeVisual contract", () => {
  const runner = readFileSync(
    join(process.cwd(), "components/DiagnosticRunner.tsx"),
    "utf8",
  );
  const review = readFileSync(
    join(
      process.cwd(),
      "app/diagnostic/[attemptId]/review/page.tsx",
    ),
    "utf8",
  );
  assert.match(runner, /<PracticeVisual spec=\{question\.visualSpec\}/);
  assert.match(review, /<PracticeVisual spec=\{answer\.visualSpec\}/);
  assert.doesNotMatch(`${runner}\n${review}`, /dangerouslySetInnerHTML/);
});

test("Sprint 5M 20. No application code directly queries system solutions", () => {
  const applicationFiles = [
    "app/api/diagnostic/start/route.ts",
    "app/api/diagnostic/answer/route.ts",
    "app/api/diagnostic/state/route.ts",
    "app/diagnostic/page.tsx",
    "app/diagnostic/[attemptId]/page.tsx",
    "app/diagnostic/[attemptId]/review/page.tsx",
    "components/DiagnosticRunner.tsx",
    "lib/diagnostic/server.ts",
  ];
  const source = applicationFiles
    .map((file) => readFileSync(join(process.cwd(), file), "utf8"))
    .join("\n");
  assert.doesNotMatch(source, /question_solutions/);
  assert.doesNotMatch(source, /service[_-]?role/i);
});

test("Sprint 5M 21. Runtime repair removes invalid pg_catalog COALESCE without touching attempts", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0032_fix_grade1_diagnostic_runtime.sql",
    ),
    "utf8",
  );
  assert.match(migration, /^begin;$/m);
  assert.match(migration, /^commit;$/m);
  assert.match(migration, /pg_catalog\.pg_get_functiondef/g);
  assert.match(
    migration,
    /pg_catalog\.replace\([\s\S]*'pg_catalog\.coalesce'[\s\S]*'coalesce'/,
  );
  assert.match(
    migration,
    /get_grade1_diagnostic_state[\s\S]*get_grade1_diagnostic_review/,
  );
  assert.doesNotMatch(
    migration,
    /\b(?:insert into|update|delete from|truncate)\s+public\.(?:diagnostic_attempts|diagnostic_answers|practice_attempts|practice_answers)/i,
  );
});

const personalizedPathUnits = [
  baseUnitFixture,
  additionUnitFixture,
  subtractionUnitFixture,
  numbersTo20UnitFixture,
  additionTo20UnitFixture,
  subtractionTo20UnitFixture,
  numbersTo100UnitFixture,
  additionTo100UnitFixture,
  subtractionTo100UnitFixture,
  basicGeometryUnitFixture,
  lengthMeasurementUnitFixture,
  timeClockCalendarUnitFixture,
  cubeAndCuboidUnitFixture,
];

function personalizedAttempt(
  unitSlug: string,
  index: number,
  status: "IN_PROGRESS" | "COMPLETED",
  correctCount: number,
): PracticeAttempt {
  const day = String(Math.min(index + 1, 28)).padStart(2, "0");
  return {
    id: `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    unitSlug,
    status,
    questionOrder: Array.from(
      { length: 24 },
      (_, questionIndex) =>
        `${unitSlug}-path-${String(questionIndex + 1).padStart(2, "0")}`,
    ),
    totalQuestions: 24,
    answeredCount: status === "COMPLETED" ? 24 : 8,
    correctCount,
    startedAt: `2026-09-${day}T01:00:00.000Z`,
    completedAt:
      status === "COMPLETED"
        ? `2026-09-${day}T01:30:00.000Z`
        : null,
  };
}

const personalizedDiagnosticSummary: DiagnosticAttemptSummary = {
  id: "20000000-0000-4000-8000-000000000001",
  status: "COMPLETED",
  answeredCount: 24,
  correctCount: 18,
  recommendationUnitSlug: NUMBERS_TO_20_UNIT_SLUG,
  recommendationReasonCode: "REVIEW_NUMBER_SENSE",
  recommendationExplanation:
    "Kết quả cho thấy em cần củng cố số và cấu tạo số.",
  startedAt: "2026-09-20T01:00:00.000Z",
  completedAt: "2026-09-20T01:30:00.000Z",
};

const personalizedDiagnosticDomains: DiagnosticDomainResult[] = [
  {
    domain: "NUMBER_SENSE",
    answeredCount: 6,
    correctCount: 3,
    accuracyPercent: 50,
    level: "REVIEW",
  },
  {
    domain: "ARITHMETIC",
    answeredCount: 6,
    correctCount: 5,
    accuracyPercent: 83.3,
    level: "DOING_WELL",
  },
  {
    domain: "GEOMETRY",
    answeredCount: 6,
    correctCount: 5,
    accuracyPercent: 83.3,
    level: "DOING_WELL",
  },
  {
    domain: "MEASUREMENT_TIME",
    answeredCount: 6,
    correctCount: 5,
    accuracyPercent: 83.3,
    level: "DOING_WELL",
  },
];

test("Sprint 5N 1. An in-progress practice attempt has highest recommendation priority", () => {
  const attempts = [
    ...completedChainThroughSubtraction(),
    personalizedAttempt(NUMBERS_TO_20_UNIT_SLUG, 20, "IN_PROGRESS", 6),
  ];
  const path = buildPersonalizedLearningPath({
    units: personalizedPathUnits,
    attempts,
    latestDiagnostic: personalizedDiagnosticSummary,
    diagnosticDomains: personalizedDiagnosticDomains,
  });
  assert.ok(path.recommendation);
  assert.equal(path.recommendation.reasonCode, "CONTINUE_ATTEMPT");
  assert.equal(path.recommendation.unitSlug, NUMBERS_TO_20_UNIT_SLUG);
  assert.equal(path.recommendation.actionLabel, "Tiếp tục");
  assert.match(path.recommendation.actionHref, /^\/practice\//);
});

test("Sprint 5N 2. Latest diagnostic weakness selects the earliest unlocked unfinished unit in that domain", () => {
  const path = buildPersonalizedLearningPath({
    units: personalizedPathUnits,
    attempts: completedChainThroughSubtraction(),
    latestDiagnostic: personalizedDiagnosticSummary,
    diagnosticDomains: personalizedDiagnosticDomains,
  });
  assert.ok(path.recommendation);
  assert.equal(
    path.recommendation.reasonCode,
    "DIAGNOSTIC_WEAK_DOMAIN",
  );
  assert.equal(path.recommendation.unitSlug, NUMBERS_TO_20_UNIT_SLUG);
  assert.match(path.recommendation.reason, /cần củng cố/i);
});

test("Sprint 5N 3. A latest unit score below 70 percent becomes a deterministic review recommendation", () => {
  const lowBase = personalizedAttempt(BASE_UNIT_SLUG, 1, "COMPLETED", 15);
  const path = buildPersonalizedLearningPath({
    units: personalizedPathUnits,
    attempts: [lowBase],
    latestDiagnostic: null,
    diagnosticDomains: null,
  });
  assert.ok(path.recommendation);
  assert.equal(path.recommendation.reasonCode, "LOW_RECENT_SCORE");
  assert.equal(path.recommendation.unitSlug, BASE_UNIT_SLUG);
  assert.equal(path.recommendation.actionLabel, "Xem kết quả");
  assert.match(path.recommendation.actionHref, /^\/review\//u);
  assert.equal(path.summary.needsReviewUnitCount, 1);
});

test("Sprint 5N 4. A locked unit is never recommended even when its domain is weak", () => {
  const geometryWeak: DiagnosticDomainResult[] =
    personalizedDiagnosticDomains.map((domain) => ({
      ...domain,
      correctCount: domain.domain === "GEOMETRY" ? 2 : 5,
      accuracyPercent: domain.domain === "GEOMETRY" ? 33.3 : 83.3,
      level:
        domain.domain === "GEOMETRY" ? "REVIEW" : "DOING_WELL",
    }));
  const path = buildPersonalizedLearningPath({
    units: personalizedPathUnits,
    attempts: [],
    latestDiagnostic: {
      ...personalizedDiagnosticSummary,
      recommendationUnitSlug: BASIC_GEOMETRY_UNIT_SLUG,
      recommendationReasonCode: "REVIEW_GEOMETRY",
    },
    diagnosticDomains: geometryWeak,
  });
  assert.ok(path.recommendation);
  assert.equal(path.recommendation.unitSlug, BASE_UNIT_SLUG);
  assert.equal(path.recommendation.reasonCode, "NEXT_UNLOCKED_UNIT");
  assert.equal(
    path.units.find(
      (item) => item.unit.slug === BASIC_GEOMETRY_UNIT_SLUG,
    )?.state,
    "LOCKED",
  );
});

test("Sprint 5N 5. No diagnostic still falls back to the first unlocked unfinished unit", () => {
  const path = buildPersonalizedLearningPath({
    units: personalizedPathUnits,
    attempts: [personalizedAttempt(BASE_UNIT_SLUG, 1, "COMPLETED", 20)],
    latestDiagnostic: null,
    diagnosticDomains: null,
  });
  assert.ok(path.recommendation);
  assert.equal(path.recommendation.unitSlug, ADDITION_UNIT_SLUG);
  assert.equal(path.recommendation.reasonCode, "NEXT_UNLOCKED_UNIT");
  assert.equal(path.diagnosticDomains, null);
});

test("Sprint 5N 6. A new Student gets an accurate empty overview and the foundation unit", () => {
  const path = buildPersonalizedLearningPath({
    units: personalizedPathUnits,
    attempts: [],
    latestDiagnostic: null,
    diagnosticDomains: null,
  });
  assert.ok(path.recommendation);
  assert.deepEqual(path.summary, {
    totalUnitCount: 13,
    completedUnitCount: 0,
    inProgressUnitCount: 0,
    needsReviewUnitCount: 0,
  });
  assert.equal(path.recommendation.unitSlug, BASE_UNIT_SLUG);
});

test("Sprint 5N 7. Completing all 13 units recommends a deterministic diagnostic retake", () => {
  const attempts = personalizedPathUnits.map((unit, index) =>
    personalizedAttempt(unit.slug, index + 1, "COMPLETED", 20),
  );
  const path = buildPersonalizedLearningPath({
    units: personalizedPathUnits,
    attempts,
    latestDiagnostic: personalizedDiagnosticSummary,
    diagnosticDomains: personalizedDiagnosticDomains.map((domain) => ({
      ...domain,
      correctCount: 5,
      accuracyPercent: 83.3,
      level: "DOING_WELL",
    })),
  });
  assert.ok(path.recommendation);
  assert.equal(path.summary.completedUnitCount, 13);
  assert.equal(path.recommendation.target, "DIAGNOSTIC");
  assert.equal(path.recommendation.reasonCode, "ALL_UNITS_COMPLETE");
  assert.equal(path.recommendation.actionLabel, "Làm đánh giá lại");
});

test("Sprint 5N 8. Retakes preserve history and only the latest unit score drives review state", () => {
  const path = buildPersonalizedLearningPath({
    units: personalizedPathUnits,
    attempts: [
      personalizedAttempt(BASE_UNIT_SLUG, 1, "COMPLETED", 12),
      personalizedAttempt(BASE_UNIT_SLUG, 2, "COMPLETED", 22),
    ],
    latestDiagnostic: null,
    diagnosticDomains: null,
  });
  const base = path.units.find(
    (item) => item.unit.slug === BASE_UNIT_SLUG,
  );
  assert.equal(path.summary.completedUnitCount, 1);
  assert.equal(base?.latestScorePercent, 92);
  assert.equal(base?.state, "COMPLETED");
});

test("Sprint 5N 9. Dashboard and lessons consume the same personalized path server contract", () => {
  const dashboard = readFileSync(
    join(process.cwd(), "app/dashboard/page.tsx"),
    "utf8",
  );
  const lessons = readFileSync(
    join(process.cwd(), "app/lessons/page.tsx"),
    "utf8",
  );
  assert.match(dashboard, /loadStudentPersonalizedPathWithClient/);
  assert.match(lessons, /loadStudentPersonalizedPath/);
  assert.match(dashboard, /PersonalizedRecommendationCard/);
  assert.match(lessons, /PersonalizedRecommendationCard/);
  assert.doesNotMatch(
    `${dashboard}\n${lessons}`,
    /getSuggestedUnit\(/,
  );
});

test("Sprint 5N 10. Parent path is built only from approved aggregate contracts", () => {
  const dashboard = parseParentChildLearningDashboard({
    ...emptyParentDashboardPayload,
    summary: {
      ...emptyParentDashboardPayload.summary,
      completed_attempt_count: 2,
      total_answered: 48,
      total_correct: 38,
      average_accuracy_percent: 79.2,
      last_activity_at: "2026-09-20T01:30:00.000Z",
    },
    current_practice: {
      unit_title: "Các số trong phạm vi 20",
      answered_count: 8,
      total_questions: 24,
      correct_count: 6,
      updated_at: "2026-09-20T01:30:00.000Z",
    },
  });
  const diagnostic = parseParentDiagnosticSummary({
    has_result: true,
    total_questions: 24,
    correct_count: 18,
    accuracy_percent: 75,
    completed_at: "2026-09-20T01:30:00.000Z",
    domains: diagnosticDomainResults,
    recommendation: {
      unit_title: "Các số trong phạm vi 20",
      reason_code: "REVIEW_NUMBER_SENSE",
      explanation: "Kết quả cho thấy học sinh cần củng cố cấu tạo số.",
    },
  });
  assert.ok(dashboard);
  assert.ok(diagnostic);
  const summary = buildParentPersonalizedPathSummary(
    dashboard,
    diagnostic,
  );
  assert.equal(summary.focusStatus, "Đang học");
  assert.doesNotMatch(
    JSON.stringify(summary),
    /answer|question|solution|questionOrder|correctAnswer/i,
  );
});

test("Sprint 5N 11. Student path loading is owner-scoped and raw diagnostic answers never enter the browser contract", () => {
  const server = readFileSync(
    join(process.cwd(), "lib/personalized-path/server.ts"),
    "utf8",
  );
  const contract = readFileSync(
    join(process.cwd(), "lib/personalized-path/contracts.ts"),
    "utf8",
  );
  assert.match(server, /\.eq\("student_id", studentId\)/);
  assert.match(server, /getStudentLearningContext/);
  assert.match(server, /review\?\.domains \?\? null/);
  assert.doesNotMatch(
    contract,
    /DiagnosticReviewAnswer|studentAnswer|correctAnswer|solutionSteps/,
  );
});

test("Sprint 5N 12. Guest protection remains unchanged with the Student Tutor entry", () => {
  assert.equal(getAuthNavigationDecision("/lessons", false), "LOGIN");
  assert.equal(getAuthNavigationDecision("/dashboard", false), "LOGIN");
  assert.equal(getHeaderNavigation(true, "STUDENT").length, 6);
  assert.equal(getAuthNavigationDecision("/tutor", false), "LOGIN");
});

test("Sprint 5N 13. Navigation remains server-driven without session or path data in browser storage", () => {
  const source = [
    "app/dashboard/page.tsx",
    "app/lessons/page.tsx",
    "lib/personalized-path/server.ts",
    "lib/personalized-path/contracts.ts",
  ]
    .map((file) => readFileSync(join(process.cwd(), file), "utf8"))
    .join("\n");
  assert.doesNotMatch(source, /localStorage|sessionStorage|document\.cookie/);
  assert.doesNotMatch(source, /service[_-]?role/i);
});

test("Sprint 5N 14. Unit states are textual and personalized layouts collapse without page overflow", () => {
  assert.equal(getPersonalizedUnitStateLabel("IN_PROGRESS"), "Đang học");
  assert.equal(
    getPersonalizedUnitStateLabel("NEEDS_REVIEW"),
    "Cần ôn lại",
  );
  assert.equal(
    getPersonalizedUnitStateLabel("LOCKED"),
    "Chưa mở do prerequisite",
  );
  const styles = readFileSync(
    join(process.cwd(), "app/globals.css"),
    "utf8",
  );
  assert.match(styles, /\.personalized-overview__metrics/);
  assert.match(styles, /\.unit-recommendation-badge/);
  assert.match(
    styles,
    /@media \(max-width: 700px\)[\s\S]*\.personalized-recommendation[\s\S]*grid-template-columns: minmax\(0, 1fr\)/,
  );
});

test("Sprint 5N 15. No migration or dependency is added for read-only personalization", () => {
  assert.equal(
    existsSync(
      join(
        process.cwd(),
        "supabase/migrations/0033_personalized_learning_path.sql",
      ),
    ),
    false,
  );
  const packageJson = JSON.parse(
    readFileSync(join(process.cwd(), "package.json"), "utf8"),
  ) as { dependencies?: Record<string, string> };
  assert.deepEqual(Object.keys(packageJson.dependencies ?? {}).sort(), [
    "@google/genai",
    "@modelcontextprotocol/sdk",
    "@supabase/ssr",
    "@supabase/supabase-js",
    "next",
    "openai",
    "react",
    "react-dom",
    "server-only",
  ]);
});

test("Sprint 5O 1. A new Student has an exact 0/13 completion summary", () => {
  const path = buildPersonalizedLearningPath({
    units: personalizedPathUnits,
    attempts: [],
    latestDiagnostic: null,
    diagnosticDomains: null,
  });
  const summary = buildGradeOneCompletionSummary(path);
  assert.ok(summary);
  assert.equal(summary.totalUnitCount, GRADE_ONE_RELEASE_UNIT_COUNT);
  assert.equal(summary.completedUnitCount, 0);
  assert.equal(summary.completionPercent, 0);
  assert.equal(summary.isComplete, false);
  assert.equal(summary.units[0]?.status, "AVAILABLE");
});

test("Sprint 5O 2. An in-progress first unit is not counted as completed", () => {
  const path = buildPersonalizedLearningPath({
    units: personalizedPathUnits,
    attempts: [
      personalizedAttempt(BASE_UNIT_SLUG, 1, "IN_PROGRESS", 6),
    ],
    latestDiagnostic: null,
    diagnosticDomains: null,
  });
  const summary = buildGradeOneCompletionSummary(path);
  assert.ok(summary);
  assert.equal(summary.completedUnitCount, 0);
  assert.equal(summary.units[0]?.status, "IN_PROGRESS");
  assert.equal(summary.units[0]?.isCompleted, false);
});

test("Sprint 5O 3. Several completed units are counted once per unit", () => {
  const path = buildPersonalizedLearningPath({
    units: personalizedPathUnits,
    attempts: [
      personalizedAttempt(BASE_UNIT_SLUG, 1, "COMPLETED", 21),
      personalizedAttempt(ADDITION_UNIT_SLUG, 2, "COMPLETED", 20),
      personalizedAttempt(SUBTRACTION_UNIT_SLUG, 3, "COMPLETED", 19),
    ],
    latestDiagnostic: null,
    diagnosticDomains: null,
  });
  const summary = buildGradeOneCompletionSummary(path);
  assert.ok(summary);
  assert.equal(summary.completedUnitCount, 3);
  assert.equal(summary.completionPercent, 23);
});

test("Sprint 5O 4. A retake never removes prior unit completion", () => {
  const path = buildPersonalizedLearningPath({
    units: personalizedPathUnits,
    attempts: [
      personalizedAttempt(BASE_UNIT_SLUG, 1, "COMPLETED", 22),
      personalizedAttempt(BASE_UNIT_SLUG, 2, "IN_PROGRESS", 4),
    ],
    latestDiagnostic: null,
    diagnosticDomains: null,
  });
  const summary = buildGradeOneCompletionSummary(path);
  assert.ok(summary);
  assert.equal(summary.completedUnitCount, 1);
  assert.equal(summary.units[0]?.status, "IN_PROGRESS");
  assert.equal(summary.units[0]?.isCompleted, true);
  assert.equal(summary.units[0]?.hasInProgressAttempt, true);
});

test("Sprint 5O 5. Exactly 13 completed practice units open the completion gate", () => {
  const path = buildPersonalizedLearningPath({
    units: personalizedPathUnits,
    attempts: personalizedPathUnits.map((unit, index) =>
      personalizedAttempt(unit.slug, index + 1, "COMPLETED", 20),
    ),
    latestDiagnostic: null,
    diagnosticDomains: null,
  });
  const summary = buildGradeOneCompletionSummary(path);
  assert.ok(summary);
  assert.equal(summary.completedUnitCount, 13);
  assert.equal(summary.completionPercent, 100);
  assert.equal(summary.isComplete, true);
});

test("Sprint 5O 6. Diagnostic completion is never counted as unit completion", () => {
  const path = buildPersonalizedLearningPath({
    units: personalizedPathUnits,
    attempts: [],
    latestDiagnostic: personalizedDiagnosticSummary,
    diagnosticDomains: personalizedDiagnosticDomains,
  });
  const summary = buildGradeOneCompletionSummary(path);
  assert.ok(summary);
  assert.equal(summary.completedUnitCount, 0);
  assert.equal(summary.isComplete, false);
});

test("Sprint 5O 7. Recommendation skips a completed high-scoring unit when an unlocked unit remains", () => {
  const path = buildPersonalizedLearningPath({
    units: personalizedPathUnits,
    attempts: [
      personalizedAttempt(BASE_UNIT_SLUG, 1, "COMPLETED", 22),
    ],
    latestDiagnostic: null,
    diagnosticDomains: null,
  });
  assert.ok(path.recommendation);
  assert.equal(path.recommendation.unitSlug, ADDITION_UNIT_SLUG);
  assert.notEqual(path.recommendation.unitSlug, BASE_UNIT_SLUG);
});

test("Sprint 5O 8. Completing Grade 1 never invents or unlocks Grade 2", () => {
  const path = buildPersonalizedLearningPath({
    units: personalizedPathUnits,
    attempts: personalizedPathUnits.map((unit, index) =>
      personalizedAttempt(unit.slug, index + 1, "COMPLETED", 23),
    ),
    latestDiagnostic: personalizedDiagnosticSummary,
    diagnosticDomains: personalizedDiagnosticDomains.map((domain) => ({
      ...domain,
      correctCount: 6,
      accuracyPercent: 100,
      level: "DOING_WELL",
    })),
  });
  assert.ok(path.recommendation);
  const summary = buildGradeOneCompletionSummary(path);
  assert.equal(summary?.isComplete, true);
  assert.equal(path.recommendation.target, "DIAGNOSTIC");
  assert.doesNotMatch(
    JSON.stringify({ summary, recommendation: path.recommendation }),
    /grade-2|lớp 2/i,
  );
});

test("Sprint 5O 9. Student completion loading remains owner-scoped", () => {
  const source = readFileSync(
    join(process.cwd(), "lib/personalized-path/server.ts"),
    "utf8",
  );
  assert.match(source, /getStudentLearningContext/);
  assert.match(source, /\.eq\("student_id", studentId\)/);
  assert.doesNotMatch(source, /p_student_id|service[_-]?role/i);
});

test("Sprint 5O 10. Parent completion RPC requires an approved owned connection", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0033_grade1_completion_summary.sql",
    ),
    "utf8",
  );
  assert.match(migration, /connection\.parent_user_id = v_current_user_id/);
  assert.match(migration, /connection\.status = 'APPROVED'/);
  assert.match(migration, /profile\.role = 'PARENT'/);
  assert.match(migration, /profile\.onboarding_completed/);
  assert.match(migration, /student\.grade = 1/);
  assert.doesNotMatch(
    migration,
    /connection\.status in \('PENDING'|'REJECTED'|'CANCELLED'|'REVOKED'\)/,
  );
});

test("Sprint 5O 11. Parent receives only the allowlisted completion aggregate", () => {
  const units = personalizedPathUnits.map((unit, index) => ({
    title: unit.title,
    status: index < 3 ? "COMPLETED" : index === 3 ? "AVAILABLE" : "LOCKED",
    is_completed: index < 3,
    has_in_progress_attempt: false,
  }));
  const summary = parseParentGradeOneCompletionSummary({
    total_unit_count: 13,
    completed_unit_count: 3,
    completion_percent: 23,
    is_complete: false,
    units,
  });
  assert.ok(summary);
  assert.equal(summary.units.length, 13);
  assert.doesNotMatch(
    JSON.stringify(summary),
    /student_id|uuid|answer|question|solution|correct_answer/i,
  );
  assert.equal(
    parseParentGradeOneCompletionSummary({
      total_unit_count: 13,
      completed_unit_count: 3,
      completion_percent: 23,
      is_complete: false,
      units,
      student_id: "30000000-0000-4000-8000-000000000001",
    }),
    null,
  );
});

test("Sprint 5O 12. Grade 1 summary remains protected with the Tutor nav item", () => {
  assert.equal(
    getAuthNavigationDecision("/grade-1/summary", false),
    "LOGIN",
  );
  assert.equal(getHeaderNavigation(true, "STUDENT").length, 6);
  assert.equal(
    isHeaderItemActive(
      "/grade-1/summary",
      getHeaderNavigation(true, "STUDENT")[0],
    ),
    true,
  );
});

test("Sprint 5O 13. Completion migration is additive, atomic and read-only", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0033_grade1_completion_summary.sql",
    ),
    "utf8",
  );
  assert.match(migration, /^begin;$/m);
  assert.match(migration, /^commit;$/m);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /from public/);
  assert.match(migration, /from anon/);
  assert.match(migration, /to authenticated/);
  assert.doesNotMatch(
    migration,
    /\b(?:insert into|update|delete from|truncate|alter table|drop table)\b/i,
  );
  const rpcDefinition =
    migration.match(
      /create or replace function public\.get_parent_child_grade1_completion_summary[\s\S]*?\n\$\$;/,
    )?.[0] ?? "";
  assert.ok(rpcDefinition);
  assert.doesNotMatch(
    rpcDefinition,
    /question_solutions|practice_answers|diagnostic_answers/,
  );
  assert.doesNotMatch(migration, /pg_catalog\.coalesce/);
});

test("Sprint 5O 14. Grade 1 release validator and UI contracts cover all 13 units", () => {
  const validator = readFileSync(
    join(process.cwd(), "scripts/validate-grade1-release.mjs"),
    "utf8",
  );
  const summaryPage = readFileSync(
    join(process.cwd(), "app/grade-1/summary/page.tsx"),
    "utf8",
  );
  const summaryComponent = readFileSync(
    join(process.cwd(), "components/GradeOneCompletionSummary.tsx"),
    "utf8",
  );
  assert.match(validator, /expectedUnits\.length === 13/);
  assert.match(validator, /312 unique questions/);
  assert.match(validator, /312 unique solutions/);
  assert.match(validator, /CONTENT_GOVERNANCE_NOTICE/);
  assert.match(summaryPage, /GradeOneCompletionSummary/);
  assert.match(
    summaryComponent,
    /Đã hoàn thành chương trình Toán Lớp 1 hiện có trên PLAVE/,
  );
  assert.doesNotMatch(
    `${summaryPage}\n${summaryComponent}`,
    /question_solutions|raw answer|correct_answer/i,
  );
});

test("Sprint 5O 15. Existing Teacher, Classroom and public demo contracts remain untouched", () => {
  const packageJson = JSON.parse(
    readFileSync(join(process.cwd(), "package.json"), "utf8"),
  ) as { dependencies?: Record<string, string>; scripts?: Record<string, string> };
  assert.deepEqual(Object.keys(packageJson.dependencies ?? {}).sort(), [
    "@google/genai",
    "@modelcontextprotocol/sdk",
    "@supabase/ssr",
    "@supabase/supabase-js",
    "next",
    "openai",
    "react",
    "react-dom",
    "server-only",
  ]);
  assert.equal(
    packageJson.scripts?.["validate:grade1"],
    "npm run validate:content && node scripts/validate-grade1-release.mjs",
  );
  assert.equal(getAuthNavigationDecision("/demo", false), "ALLOW");
  assert.equal(getHeaderNavigation(true, "TEACHER").length, 5);
});

test("Sprint 5O 16. Completion UI is responsive and exposes textual progress semantics", () => {
  const styles = readFileSync(
    join(process.cwd(), "app/globals.css"),
    "utf8",
  );
  const component = readFileSync(
    join(process.cwd(), "components/GradeOneCompletionSummary.tsx"),
    "utf8",
  );
  assert.match(styles, /\.grade-one-completion-unit[\s\S]*min-width: 0/);
  assert.match(
    styles,
    /@media \(max-width: 640px\)[\s\S]*\.grade-one-completion-unit[\s\S]*grid-template-columns: minmax\(0, 1fr\)/,
  );
  assert.match(component, /role="progressbar"/);
  assert.match(component, /aria-valuenow=\{summary\.completedUnitCount\}/);
  assert.match(component, /Trạng thái:/);
  assert.doesNotMatch(component, /overflow-x|dangerouslySetInnerHTML/);
});

test("Sprint 6B 1. Shared unit and attempt contracts support a Grade 2 fixture with a non-24 total", () => {
  const parsedUnit = parseLearningUnit({
    slug: "grade-2-runtime-fixture",
    grade: 2,
    title: "Nội dung kiểm thử runtime",
    description: "Fixture cục bộ, không được seed vào dữ liệu live.",
    learning_objectives: ["Kiểm tra runtime dùng tổng câu thật."],
    lesson_content: {
      sections: lessonSections,
      worked_examples: workedExamples.map((example) => ({
        title: example.title,
        steps: example.steps,
        answer: example.answer,
      })),
    },
    total_questions: 12,
    prerequisite_unit_slug: null,
  });
  assert.ok(parsedUnit);
  assert.equal(parsedUnit.grade, 2);
  assert.equal(parsedUnit.totalQuestions, 12);

  const questionOrder = Array.from(
    { length: 12 },
    (_, index) => `g2-runtime-q${index + 1}`,
  );
  const attempts = parseAttemptRows([
    {
      id: "12345678-1234-4234-8234-123456789012",
      unit_slug: parsedUnit.slug,
      status: "COMPLETED",
      question_order: questionOrder,
      total_questions: 12,
      answered_count: 12,
      correct_count: 9,
      started_at: "2026-07-29T00:00:00.000Z",
      completed_at: "2026-07-29T00:20:00.000Z",
    },
  ]);
  assert.ok(attempts);
  assert.equal(attempts[0]?.totalQuestions, 12);
  assert.equal(buildPracticeHistory(attempts)[0]?.percent, 75);

  const review = parsePracticeReviewRpcResult({
    ...completedReviewRpcPayload,
    attempt_id: "12345678-1234-4234-8234-123456789012",
    unit_slug: parsedUnit.slug,
    total_questions: 12,
    answered_count: 12,
    correct_count: 9,
    answers: completedReviewRpcPayload.answers
      .slice(0, 12)
      .map((answer, index) => ({
        ...answer,
        question_id: questionOrder[index],
        is_correct: index < 9,
      })),
  });
  assert.ok(review);
  assert.equal(buildPracticeReviewViewModel(review).percent, 75);
});

test("Sprint 6B 2. NUMBER_INPUT accepts future positive integers and rejects unsafe input", () => {
  for (const [input, expected] of [
    ["0", "0"],
    ["10", "10"],
    ["100", "100"],
    ["101", "101"],
    ["1000", "1000"],
    [" 1000 ", "1000"],
  ] as const) {
    assert.equal(normalizePracticeNumberInput(input), expected);
  }
  for (const input of ["", "abc", "1.5", "-1", "1000000"]) {
    assert.equal(normalizePracticeNumberInput(input), null);
  }
});

test("Sprint 6B 3. Unknown safe skill codes receive a Vietnamese fallback instead of leaking internal codes", () => {
  const futureSkill = "UNRELEASED_GRADE2_SKILL";
  const question = parsePracticeQuestion({
    code: "g2-runtime-q1",
    unit_slug: "grade-2-runtime-fixture",
    question_type: "NUMBER_INPUT",
    prompt: "Viết số phù hợp.",
    options: null,
    visual_spec: null,
    skill_code: futureSkill,
    difficulty: "EASY",
    display_order: 1,
  });
  assert.ok(question);
  assert.equal(getSkillLabel(futureSkill), "Kỹ năng đang được cập nhật");
  assert.equal(
    getParentSkillLabel(futureSkill),
    "Kỹ năng đang được cập nhật",
  );

  const parentPayload = {
    ...emptyParentDashboardPayload,
    skills: [
      {
        skill_code: futureSkill,
        answered_count: 2,
        correct_count: 1,
        accuracy_percent: 50,
      },
    ],
  };
  const parsedParent = parseParentChildLearningDashboard(parentPayload);
  assert.ok(parsedParent);
  assert.equal(parsedParent.skills[0]?.skillCode, futureSkill);
});

test("Sprint 6B 4. A grade without published content has no Grade 1 recommendation", () => {
  const path = buildPersonalizedLearningPath({
    grade: 2,
    units: [],
    attempts: [],
    latestDiagnostic: null,
    diagnosticDomains: null,
    diagnosticEnabled: false,
  });
  assert.equal(path.grade, 2);
  assert.equal(path.units.length, 0);
  assert.equal(path.recommendation, null);
  assert.equal(
    getGradeContentEmptyTitle(2),
    "Nội dung Toán Lớp 2 đang được chuẩn bị.",
  );
});

test("Sprint 6B 5. Current-grade catalog and owned historical review use separate authorization concerns", () => {
  const pathServer = readFileSync(
    join(process.cwd(), "lib/personalized-path/server.ts"),
    "utf8",
  );
  const practicePage = readFileSync(
    join(process.cwd(), "app/practice/[attemptId]/page.tsx"),
    "utf8",
  );
  const reviewPage = readFileSync(
    join(process.cwd(), "app/review/[attemptId]/page.tsx"),
    "utf8",
  );
  assert.match(pathServer, /\.eq\("grade", grade\)/);
  assert.match(pathServer, /\.eq\("student_id", studentId\)/);
  assert.doesNotMatch(pathServer, /grade !== 1|UNSUPPORTED_GRADE/);
  assert.match(practicePage, /\.eq\("student_id", access\.user\.id\)/);
  assert.doesNotMatch(practicePage, /unit\.grade !== access\.grade/);
  assert.match(reviewPage, /get_practice_review/);
  assert.doesNotMatch(reviewPage, /unit\.grade !== access\.grade/);
});

test("Sprint 6B 6. Migration 0034 removes the global 24 invariant without seeding or changing Grade 1 rows", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0034_multi_grade_runtime_foundation.sql",
    ),
    "utf8",
  );
  assert.match(migration, /^begin;/);
  assert.match(migration, /commit;\s*$/);
  assert.match(migration, /total_questions between 1 and 100/);
  assert.match(
    migration,
    /cardinality\(question_order\) = total_questions/,
  );
  assert.match(
    migration,
    /v_completed := v_answered_count = v_total_questions/,
  );
  assert.doesNotMatch(
    migration,
    /insert into public\.(?:learning_units|questions|question_solutions)/,
  );
  assert.doesNotMatch(
    migration,
    /update public\.(?:learning_units|questions|question_solutions|student_profiles)/,
  );
  assert.match(migration, /v_grade_one_unit_count <> 13/);
});

test("Sprint 6B 7. Runtime routes do not call the Grade 1 diagnostic for grades without content", () => {
  const dashboard = readFileSync(
    join(process.cwd(), "app/dashboard/page.tsx"),
    "utf8",
  );
  const lessons = readFileSync(
    join(process.cwd(), "app/lessons/page.tsx"),
    "utf8",
  );
  const overview = readFileSync(
    join(process.cwd(), "components/PersonalizedLearningOverview.tsx"),
    "utf8",
  );
  assert.match(dashboard, /getGradeContentEmptyTitle\(studentProfile\.grade\)/);
  assert.match(lessons, /getGradeContentEmptyTitle\(grade\)/);
  assert.match(overview, /path\.grade === 1/);
  assert.doesNotMatch(dashboard, /grade-2-numbers-to-1000/);
});

test("Sprint 6B 8. No grade transition mutation, dependency, or Grade 2 seed is introduced", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/0034_multi_grade_runtime_foundation.sql",
    ),
    "utf8",
  );
  const packageJson = JSON.parse(
    readFileSync(join(process.cwd(), "package.json"), "utf8"),
  ) as { dependencies?: Record<string, string> };
  assert.doesNotMatch(migration, /update public\.student_profiles/);
  assert.doesNotMatch(migration, /grade-2-|numbers-to-1000/i);
  assert.deepEqual(Object.keys(packageJson.dependencies ?? {}).sort(), [
    "@google/genai",
    "@modelcontextprotocol/sdk",
    "@supabase/ssr",
    "@supabase/supabase-js",
    "next",
    "openai",
    "react",
    "react-dom",
    "server-only",
  ]);
});
