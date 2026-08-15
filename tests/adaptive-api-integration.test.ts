import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getAdaptivePracticeState,
  parseAdaptiveApiResponse,
  startOrResumeAdaptivePractice,
  submitAdaptivePracticeAnswer,
  type AdaptiveRpcCall,
} from "../lib/practice/adaptive-api.ts";
import {
  adaptiveRuntimeFeatureFlags,
  gradeTwoNumbersTo1000PublicationState,
  resolveAdaptiveRuntimeGate,
  type AdaptiveRuntimeFeatureFlags,
  type CandidatePublicationState,
} from "../lib/practice/runtime-flags.ts";
import { getParentSkillLabel } from "../lib/parent-dashboard/contracts.ts";
import { getSkillLabel } from "../lib/practice/catalog.ts";

const attemptId = "11111111-1111-4111-8111-111111111111";
const idempotencyKey = "22222222-2222-4222-8222-222222222222";
const questionId = "g2-num1000-1nighc4-01";

function databaseState(feedback: unknown = null) {
  return {
    attempt_id: attemptId,
    unit_slug: "grade-2-numbers-to-1000",
    content_version: "g2n1000-1.0.0-rc.1",
    status: "IN_PROGRESS",
    revision: 2,
    answered_count: 1,
    current_question: {
      question_id: questionId,
      prompt: "Số gồm 2 trăm, 1 chục và 2 đơn vị là số nào?",
      answer_type: "MULTIPLE_CHOICE",
      options: { A: "214", B: "112", C: "232", D: "212" },
      visual: null,
      accessibility_description: null,
      skill_family_id: "NUMBER_RECOGNITION_TO_1000",
      difficulty: "EASY",
      display_order: 1,
    },
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

const enabledFlags: AdaptiveRuntimeFeatureFlags = {
  ADAPTIVE_PRACTICE_RUNTIME_ENABLED: true,
  CONTROLLED_PILOT_ENABLED: true,
  RETENTION_RUNTIME_ENABLED: false,
};

const visibleCandidate: CandidatePublicationState = {
  ...gradeTwoNumbersTo1000PublicationState,
  publicationStatus: "PUBLISHED",
  studentVisibility: "VISIBLE",
};

test("Sprint 6I 1. All adaptive application flags remain false", () => {
  assert.deepEqual(adaptiveRuntimeFeatureFlags, {
    ADAPTIVE_PRACTICE_RUNTIME_ENABLED: false,
    CONTROLLED_PILOT_ENABLED: false,
    RETENTION_RUNTIME_ENABLED: false,
  });
  assert.deepEqual(
    resolveAdaptiveRuntimeGate("grade-2-numbers-to-1000"),
    { kind: "DENIED", reason: "APPLICATION_FEATURE_DISABLED" },
  );
});

test("Sprint 6I 2. Publication, app, pilot and eligibility gates are independent", () => {
  assert.deepEqual(
    resolveAdaptiveRuntimeGate(
      "grade-2-numbers-to-1000",
      { status: "ELIGIBLE" },
      adaptiveRuntimeFeatureFlags,
      visibleCandidate,
    ),
    { kind: "DENIED", reason: "APPLICATION_FEATURE_DISABLED" },
  );
  assert.deepEqual(
    resolveAdaptiveRuntimeGate(
      "grade-2-numbers-to-1000",
      { status: "ELIGIBLE" },
      { ...enabledFlags, CONTROLLED_PILOT_ENABLED: false },
      visibleCandidate,
    ),
    { kind: "DENIED", reason: "CONTROLLED_PILOT_DISABLED" },
  );
  assert.deepEqual(
    resolveAdaptiveRuntimeGate(
      "grade-2-numbers-to-1000",
      { status: "NOT_CONFIGURED" },
      enabledFlags,
      visibleCandidate,
    ),
    {
      kind: "DENIED",
      reason: "PILOT_ELIGIBILITY_NOT_CONFIGURED",
    },
  );
  assert.deepEqual(
    resolveAdaptiveRuntimeGate(
      "grade-2-numbers-to-1000",
      { status: "NOT_ELIGIBLE" },
      enabledFlags,
      visibleCandidate,
    ),
    { kind: "DENIED", reason: "PILOT_NOT_ELIGIBLE" },
  );
  assert.deepEqual(
    resolveAdaptiveRuntimeGate(
      "grade-2-numbers-to-1000",
      { status: "ELIGIBLE" },
      enabledFlags,
      visibleCandidate,
    ),
    {
      kind: "RPC_ALLOWED",
      visibilityMode: "PUBLISHED_VISIBLE",
      databaseReleaseActivation: "ENFORCED_BY_RPC",
      databaseRuntimeActivation: "ENFORCED_BY_RPC",
      databasePilotMembership: "ENFORCED_BY_RPC",
    },
  );
});

test("Sprint 6I 3. Start adapter sends only slug and idempotency key", async () => {
  const calls: Array<{
    name: string;
    args: Readonly<Record<string, unknown>>;
  }> = [];
  const rpc: AdaptiveRpcCall = async (name, args) => {
    calls.push({ name, args });
    return { data: databaseState(), error: null };
  };
  const result = await startOrResumeAdaptivePractice(rpc, {
    unitSlug: "grade-2-numbers-to-1000",
    idempotencyKey,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [
    {
      name: "start_or_resume_adaptive_practice",
      args: {
        p_unit_slug: "grade-2-numbers-to-1000",
        p_idempotency_key: idempotencyKey,
      },
    },
  ]);
  assert.equal("p_user_id" in calls[0].args, false);
});

test("Sprint 6I 4. State adapter exposes no future order or solution", async () => {
  const rpc: AdaptiveRpcCall = async (name, args) => {
    assert.equal(name, "get_adaptive_practice_state");
    assert.deepEqual(args, { p_attempt_id: attemptId });
    return { data: databaseState(), error: null };
  };
  const result = await getAdaptivePracticeState(rpc, attemptId);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.feedback, null);
  assert.equal("futureQuestionOrder" in result.data, false);
  assert.equal("masteryThreshold" in result.data, false);
  assert.equal("studentId" in result.data, false);
});

test("Sprint 6I 5. Submit adapter sends revision and idempotency without forged decisions", async () => {
  const calls: Array<Readonly<Record<string, unknown>>> = [];
  const feedback = {
    question_id: questionId,
    is_correct: true,
    correct_answer: "D",
    solution_steps: ["Đọc từng hàng.", "Ghép lại được 212."],
    explanation: "Hai trăm, một chục và hai đơn vị là 212.",
    hint: "Đọc từ hàng trăm.",
  };
  const rpc: AdaptiveRpcCall = async (name, args) => {
    assert.equal(name, "submit_adaptive_practice_answer");
    calls.push(args);
    return { data: databaseState(feedback), error: null };
  };
  const result = await submitAdaptivePracticeAnswer(rpc, {
    attemptId,
    questionId,
    answer: "D",
    expectedRevision: 1,
    idempotencyKey,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls[0], {
    p_attempt_id: attemptId,
    p_question_id: questionId,
    p_answer: "D",
    p_expected_revision: 1,
    p_idempotency_key: idempotencyKey,
  });
  for (const forbidden of [
    "p_user_id",
    "p_is_correct",
    "p_next_question_id",
    "p_mastery",
    "p_terminal_reason",
  ]) {
    assert.equal(forbidden in calls[0], false);
  }
});

test("Sprint 6I 6. Database errors are sanitized and never auto-retried", async () => {
  const rpc: AdaptiveRpcCall = async () => ({
    data: null,
    error: {
      message: "ADAPTIVE:REVISION_CONFLICT",
      details: "private schema and SQL detail",
    },
  });
  const result = await submitAdaptivePracticeAnswer(rpc, {
    attemptId,
    questionId,
    answer: "D",
    expectedRevision: 1,
    idempotencyKey,
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, "REVISION_CONFLICT");
  assert.deepEqual(result.error.retry, {
    action: "REFETCH_THEN_MANUAL_RETRY",
    automatic: false,
  });
  assert.doesNotMatch(JSON.stringify(result), /schema|SQL detail/i);
});

test("Sprint 6I 7. Client response parser rejects extra solution or audit fields", () => {
  const success = {
    ok: true,
    data: {
      attemptId,
      unitSlug: "grade-2-numbers-to-1000",
      contentVersion: "g2n1000-1.0.0-rc.1",
      status: "IN_PROGRESS",
      revision: 2,
      answeredCount: 1,
      currentQuestion: {
        questionId,
        prompt: "Số nào có 2 trăm, 1 chục và 2 đơn vị?",
        answerType: "MULTIPLE_CHOICE",
        options: { A: "214", B: "112", C: "232", D: "212" },
        visual: null,
        accessibilityDescription: null,
        skillFamilyId: "NUMBER_RECOGNITION_TO_1000",
        difficulty: "EASY",
        displayOrder: 1,
      },
      remediationSkillIds: [],
      completedAt: null,
      feedback: null,
    },
  };
  assert.ok(parseAdaptiveApiResponse(success, false));
  assert.equal(
    parseAdaptiveApiResponse(
      {
        ...success,
        data: { ...success.data, auditSource: "private" },
      },
      false,
    ),
    null,
  );
  assert.equal(
    parseAdaptiveApiResponse(
      {
        ...success,
        data: { ...success.data, futureQuestionOrder: ["q2"] },
      },
      false,
    ),
    null,
  );
  const sanitizedError = parseAdaptiveApiResponse(
    {
      ok: false,
      error: {
        code: "REQUEST_FAILED",
        message: "private SQL error and user data",
        retry: {
          action: "SAME_IDEMPOTENCY_KEY_RETRY",
          automatic: false,
        },
      },
    },
    false,
  );
  assert.equal(sanitizedError?.ok, false);
  assert.doesNotMatch(
    JSON.stringify(sanitizedError),
    /private SQL error|user data/i,
  );
});

test("Sprint 6I 8. Adaptive routes use SSR user context and never query solutions", () => {
  const files = [
    "app/api/adaptive-practice/start/route.ts",
    "app/api/adaptive-practice/state/route.ts",
    "app/api/adaptive-practice/answer/route.ts",
    "app/adaptive-practice/[attemptId]/page.tsx",
  ];
  const sources = files.map((path) => readFileSync(path, "utf8"));

  for (const source of sources) {
    assert.match(source, /getStudentLearningContext/);
    assert.match(source, /resolveServerAdaptivePilotAccess/);
    assert.doesNotMatch(source, /service[_-]?role/i);
    assert.doesNotMatch(source, /\.from\(["']question_solutions["']\)/);
    assert.doesNotMatch(source, /correctAnswer|isCorrect|terminalReason/);
  }
});

test("Sprint 6I 9. Client performs no automatic POST retry", () => {
  const runner = readFileSync(
    "app/adaptive-practice/[attemptId]/AdaptivePracticeRunner.tsx",
    "utf8",
  );
  const startButton = readFileSync(
    "components/AdaptiveStartPracticeButton.tsx",
    "utf8",
  );

  assert.equal(
    (runner.match(/fetch\("\/api\/adaptive-practice\/answer"/g) ?? [])
      .length,
    1,
  );
  assert.equal(
    (startButton.match(/fetch\("\/api\/adaptive-practice\/start"/g) ??
      []).length,
    1,
  );
  assert.doesNotMatch(runner, /setInterval|setTimeout/);
  assert.doesNotMatch(startButton, /setInterval|setTimeout/);
  assert.match(runner, /REVISION_CONFLICT/);
  assert.match(runner, /Thử gửi lại/);
});

test("Sprint 6I 10. Student and Parent use safe Vietnamese Grade 2 skill labels", () => {
  const expected: Record<string, string> = {
    NUMBER_RECOGNITION_TO_1000: "Nhận biết số trong phạm vi 1000",
    READ_WRITE_TO_1000: "Đọc và viết số trong phạm vi 1000",
    PLACE_VALUE_TO_1000: "Hàng trăm, chục và đơn vị",
    SEQUENCE_TO_1000: "So sánh và sắp xếp số đến 1000",
  };
  for (const [skillCode, label] of Object.entries(expected)) {
    assert.equal(getSkillLabel(skillCode), label);
    assert.equal(getParentSkillLabel(skillCode), label);
  }
  assert.equal(
    getParentSkillLabel("UNRELEASED_GRADE2_SKILL"),
    "Kỹ năng Toán học",
  );
});

test("Sprint 6I 11. Knowledge map and lesson CTA stay behind the server gate", () => {
  const personalizedServer = readFileSync(
    "lib/personalized-path/server.ts",
    "utf8",
  );
  const learnPage = readFileSync("app/learn/page.tsx", "utf8");
  const lessonPage = readFileSync(
    "app/learn/[gradeSlug]/[lessonSlug]/page.tsx",
    "utf8",
  );
  const lessonDetail = readFileSync(
    "components/LessonDetail.tsx",
    "utf8",
  );
  const fixedStartRoute = readFileSync(
    "app/api/practice/start/route.ts",
    "utf8",
  );

  assert.match(personalizedServer, /resolvePracticeRuntimeAccess/);
  assert.match(personalizedServer, /resolveAdaptiveRuntimeGate/);
  assert.match(personalizedServer, /HIDDEN_RELEASE_CANDIDATE/);
  assert.match(learnPage, /resolvePracticeRuntimeAccess/);
  assert.match(learnPage, /resolveAdaptiveRuntimeGate/);
  assert.match(learnPage, /HIDDEN_RELEASE_CANDIDATE/);
  assert.match(lessonPage, /HIDDEN_RELEASE_CANDIDATE/);
  assert.match(lessonPage, /resolveServerAdaptivePilotAccess/);
  assert.match(lessonPage, /practiceRuntime=/);
  assert.match(lessonDetail, /AdaptiveStartPracticeButton/);
  assert.match(lessonDetail, /practiceRuntime === "ADAPTIVE"/);
  assert.match(
    fixedStartRoute,
    /resolvePracticeRuntimeAccess\(input\.unitSlug\)\.kind !==\s+"FIXED_RUNTIME"/,
  );
});
