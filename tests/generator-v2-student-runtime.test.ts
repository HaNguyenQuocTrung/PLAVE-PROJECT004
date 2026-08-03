import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  parseCurriculumAttemptApiState,
  parseStartCurriculumRequest,
} from "../lib/curriculum-runtime/contracts.ts";
import { buildUniversalCurriculumRelease } from "../lib/curriculum-runtime/release.ts";
import { generateQuestion } from "../lib/generation-v2/generator.ts";
import { getProductVariantByOutcome } from "../lib/generation-v2/registry.ts";
import {
  GENERATOR_V2_STUDENT_RUNTIME_CORRECTNESS_CAPABILITIES,
  GENERATOR_V2_STUDENT_RUNTIME_CORRECTNESS_OUTCOMES,
  GENERATOR_V2_STUDENT_RUNTIME_VERIFICATION_OUTCOMES,
  generatorV2StudentEligibilityInventory,
  readGeneratorV2StudentRuntimePolicy,
  validateGeneratorV2StudentRuntimePolicy,
} from "../lib/generation-v2/student-runtime-policy.ts";
import {
  formatGeneratorV2StudentCorrectAnswer,
} from "../lib/generation-v2/student-answer-display.ts";
import type {
  StudentGeneratorV2Question,
} from "../lib/curriculum-runtime/contracts.ts";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFile(new URL(path, root), "utf8");

function enabledEnvironment() {
  const capabilities = GENERATOR_V2_STUDENT_RUNTIME_VERIFICATION_OUTCOMES.map(
    (outcomeId) => getProductVariantByOutcome(outcomeId)?.variantId,
  );
  assert.ok(capabilities.every(Boolean));
  return {
    GENERATOR_V2_STUDENT_RUNTIME_ENABLED: "true",
    GENERATOR_V2_STUDENT_RUNTIME_RELEASE: "LOCAL_VERIFICATION",
    GENERATOR_V2_STUDENT_RUNTIME_SCHEMA: "0043",
    GENERATOR_V2_STUDENT_RUNTIME_ELIGIBLE_OUTCOMES:
      GENERATOR_V2_STUDENT_RUNTIME_VERIFICATION_OUTCOMES.join(","),
    GENERATOR_V2_STUDENT_RUNTIME_ELIGIBLE_CAPABILITIES:
      capabilities.join(","),
    PLAVE_ON_DEMAND_GENERATION_SIGNING_KEY: "a".repeat(64),
  } as const;
}

test("repository default is STATIC and Generator V2 Student runtime is deny-all", async () => {
  const policy = readGeneratorV2StudentRuntimePolicy({});
  assert.equal(policy.globalEnabled, false);
  assert.equal(policy.explicitlyEligibleOutcomeIds.size, 0);
  assert.equal(
    generatorV2StudentEligibilityInventory(policy).filter(
      (item) => item.status === "STUDENT_RUNTIME_ELIGIBLE",
    ).length,
    0,
  );
  const example = await read(".env.example");
  assert.match(example, /GENERATOR_V2_STUDENT_RUNTIME_ENABLED=false/u);
  assert.match(example, /GENERATOR_V2_STUDENT_RUNTIME_RELEASE=OFF/u);
});

test("local verification activates exactly six explicit outcome/capability pairs", () => {
  const policy = readGeneratorV2StudentRuntimePolicy(enabledEnvironment());
  const inventory = generatorV2StudentEligibilityInventory(policy);
  assert.equal(inventory.length, 546);
  assert.equal(new Set(inventory.map((item) => item.outcomeId)).size, 546);
  assert.deepEqual(
    inventory
      .filter((item) => item.status === "STUDENT_RUNTIME_ELIGIBLE")
      .map((item) => item.outcomeId)
      .sort(),
    [...GENERATOR_V2_STUDENT_RUNTIME_VERIFICATION_OUTCOMES].sort(),
  );
  assert.equal(
    inventory.filter(
      (item) => item.status === "CORRECTNESS_REVIEW_REQUIRED",
    ).length,
    540,
  );
});

test("Sprint 10C can explicitly activate all 546 independently validated outcomes while defaults stay OFF", () => {
  const policy = readGeneratorV2StudentRuntimePolicy({
    ...enabledEnvironment(),
    GENERATOR_V2_STUDENT_RUNTIME_ELIGIBLE_OUTCOMES:
      GENERATOR_V2_STUDENT_RUNTIME_CORRECTNESS_OUTCOMES.join(","),
    GENERATOR_V2_STUDENT_RUNTIME_ELIGIBLE_CAPABILITIES:
      GENERATOR_V2_STUDENT_RUNTIME_CORRECTNESS_CAPABILITIES.join(","),
  });
  const inventory = generatorV2StudentEligibilityInventory(policy);
  assert.equal(inventory.length, 546);
  assert.equal(
    inventory.filter((item) => item.status === "STUDENT_RUNTIME_ELIGIBLE")
      .length,
    546,
  );
  assert.equal(
    new Set(
      inventory
        .filter((item) => item.status === "STUDENT_RUNTIME_ELIGIBLE")
        .map((item) => item.capabilityId),
    ).size,
    198,
  );
});

test("global, loopback, release, schema and signing gates fail closed", () => {
  const base = enabledEnvironment();
  assert.equal(
    validateGeneratorV2StudentRuntimePolicy({
      request: new Request("http://127.0.0.1:3210/api/curriculum-runtime/start"),
      policy: readGeneratorV2StudentRuntimePolicy(base),
    }),
    null,
  );
  assert.equal(
    validateGeneratorV2StudentRuntimePolicy({
      request: new Request("https://example.test/api/curriculum-runtime/start"),
      policy: readGeneratorV2StudentRuntimePolicy(base),
    }),
    "GENERATOR_V2_LOOPBACK_REQUIRED",
  );
  for (const [key, value, expected] of [
    ["GENERATOR_V2_STUDENT_RUNTIME_ENABLED", "false", "GENERATOR_V2_RUNTIME_DISABLED"],
    ["GENERATOR_V2_STUDENT_RUNTIME_RELEASE", "OFF", "GENERATOR_V2_RELEASE_DISABLED"],
    ["GENERATOR_V2_STUDENT_RUNTIME_SCHEMA", "0041", "GENERATOR_V2_SCHEMA_INCOMPATIBLE"],
    ["PLAVE_ON_DEMAND_GENERATION_SIGNING_KEY", "", "GENERATOR_V2_SIGNING_KEY_UNAVAILABLE"],
  ] as const) {
    const policy = readGeneratorV2StudentRuntimePolicy({ ...base, [key]: value });
    assert.equal(
      validateGeneratorV2StudentRuntimePolicy({
        request: new Request("http://localhost:3210/api/curriculum-runtime/start"),
        policy,
      }),
      expected,
    );
  }
});

test("client cannot select mode, outcome, capability, seed or correctness", () => {
  const valid = {
    unitSlug: "grade-2-multiplication-division",
    idempotencyKey: "00000000-0000-4000-8000-000000000010",
  };
  assert.deepEqual(parseStartCurriculumRequest(valid), valid);
  for (const field of [
    "mode",
    "outcomeId",
    "capabilityId",
    "seed",
    "isCorrect",
  ]) {
    assert.equal(parseStartCurriculumRequest({ ...valid, [field]: "forged" }), null);
  }
});

test("bounded subset has explicit release mapping and validated generation", () => {
  const release = buildUniversalCurriculumRelease();
  const publicIds = new Set<string>();
  let generatedCount = 0;
  for (const [outcomeIndex, outcomeId] of
    GENERATOR_V2_STUDENT_RUNTIME_VERIFICATION_OUTCOMES.entries()) {
    const entry = getProductVariantByOutcome(outcomeId);
    assert.ok(entry);
    assert.ok(
      release.units.some(
        (unit) =>
          unit.grade === entry.grade &&
          unit.officialOutcomeIds.includes(outcomeId),
      ),
    );
    assert.ok(
      release.questions.some((question) =>
        question.officialOutcomeIds.includes(outcomeId),
      ),
    );
    for (const [difficultyIndex, difficulty] of [
      "EASY",
      "MEDIUM",
      "HARD",
    ].entries()) {
      for (let sample = 0; sample < 4; sample += 1) {
        const question = generateQuestion({
          outcomeId,
          grade: entry.grade,
          difficulty: difficulty as "EASY" | "MEDIUM" | "HARD",
          seed: `sprint10b-${outcomeIndex}-${difficultyIndex}-${sample}`,
          locale: "vi-VN",
        });
        assert.equal(question.validation.ok, true);
        assert.equal(question.solverReceipt.uniqueSolution, true);
        assert.equal(question.provenance.questionSource, "GENERATED_V2");
        for (const field of [
          "questionSource",
          "variantId",
          "variantVersion",
          "solverVersion",
          "solverReceiptHash",
          "difficultyPolicyVersion",
          "seedFingerprint",
          "normalizedModelHash",
          "visualHash",
        ]) {
          assert.ok(field in question.provenance);
        }
        const publicJson = JSON.stringify(question.publicSnapshot);
        assert.doesNotMatch(
          publicJson,
          /correctResponse|acceptedResponses|solverReceipt|privateSolution|seedFingerprint/u,
        );
        publicIds.add(question.publicSnapshot.questionId);
        generatedCount += 1;
      }
    }
  }
  assert.equal(generatedCount, 72);
  assert.equal(publicIds.size, 72);
});

test("GENERATED_V2 API state carries only the Student interaction surface", () => {
  const state = parseCurriculumAttemptApiState({
    runtimeMode: "GENERATED_V2",
    attemptId: "00000000-0000-4000-8000-000000000010",
    releaseId: "plave-math-grades-1-9-v1",
    contentVersion: "2026.07.30-draft.1",
    unitId: "grade-2-multiplication-division",
    unitTitle: "Nhân và chia",
    grade: 2,
    status: "IN_PROGRESS",
    revision: 0,
    answeredCount: 0,
    correctCount: 0,
    totalQuestions: 12,
    startedAt: "2026-08-02T00:00:00.000Z",
    completedAt: null,
    currentQuestion: {
      questionId: "g2-runtime-q01",
      position: 1,
      prompt: "Có bao nhiêu đồ vật?",
      answerType: "NUMBER_INPUT",
      options: null,
      visual: { type: "OBJECT_GROUPS", description: "Hai nhóm" },
      cognitiveLevel: "UNDERSTAND",
      generatorV2: {
        schemaVersion: 2,
        questionId: "g2-runtime-q01",
        grade: 2,
        difficulty: "EASY",
        publicPrompt: "Có bao nhiêu đồ vật?",
        publicData: {},
        interaction: { type: "INTEGER_INPUT", inputLabel: "Kết quả" },
        visual: { type: "OBJECT_GROUPS", description: "Hai nhóm", data: { groups: [2, 2] } },
        accessibility: { prompt: "Có bao nhiêu đồ vật?", visualAlternative: "Hai nhóm, mỗi nhóm hai", responseInstruction: "Nhập một số" },
      },
    },
    feedback: null,
  });
  assert.equal(state?.runtimeMode, "GENERATED_V2");
  assert.equal(state?.currentQuestion?.generatorV2?.interaction.type, "INTEGER_INPUT");
  assert.doesNotMatch(
    JSON.stringify(state),
    /outcomeId|variantId|seed|hash|solver|correctResponse/u,
  );
});

test("structured feedback uses Student-readable answers instead of transport JSON", () => {
  const surface = (interaction: StudentGeneratorV2Question["interaction"]) =>
    ({ interaction } as unknown as StudentGeneratorV2Question);
  assert.equal(
    formatGeneratorV2StudentCorrectAnswer(
      surface({
        type: "SINGLE_CHOICE",
        options: [{ id: "option-a", label: "40" }],
      }),
      "A",
      [{ key: "A", label: "40" }],
    ),
    "40",
  );
  assert.equal(
    formatGeneratorV2StudentCorrectAnswer(
      surface({ type: "FRACTION_INPUT" }),
      JSON.stringify({ numerator: 4, denominator: 5 }),
      null,
    ),
    "4/5",
  );
  assert.equal(
    formatGeneratorV2StudentCorrectAnswer(
      surface({
        type: "ORDERING",
        options: [
          { id: "2", label: "2" },
          { id: "7", label: "7" },
        ],
      }),
      JSON.stringify(["2", "7"]),
      null,
    ),
    "2 → 7",
  );
  assert.equal(
    formatGeneratorV2StudentCorrectAnswer(
      surface({ type: "MATCHING" }),
      JSON.stringify([
        { leftId: "x", rightId: "-4" },
        { leftId: "y", rightId: "-3" },
      ]),
      null,
    ),
    "x = -4; y = -3",
  );
});

test("public Student routes own integration; internal proof/review APIs are absent", async () => {
  const [start, state, answer, page, runtime] = await Promise.all([
    read("app/api/curriculum-runtime/start/route.ts"),
    read("app/api/curriculum-runtime/state/route.ts"),
    read("app/api/curriculum-runtime/answer/route.ts"),
    read("app/curriculum-practice/[attemptId]/page.tsx"),
    read("lib/generation-v2/student-runtime.ts"),
  ]);
  const combined = [start, state, answer, page, runtime].join("\n");
  assert.match(start, /startStudentGeneratorV2Practice/u);
  assert.match(state, /loadStudentGeneratedPracticeState/u);
  assert.match(answer, /submitStudentGeneratorV2Answer/u);
  assert.match(runtime, /start_or_resume_semantic_generated_curriculum/u);
  assert.match(runtime, /submit_generated_curriculum_answer/u);
  assert.doesNotMatch(combined, /api\/internal|owner-review|database-proof/u);
});
