import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import {
  gradeTwoNumbersTo1000AdaptivePolicy,
  planAdaptivePractice,
  type AdaptiveAnswerEvidence,
} from "../lib/content-engine/adaptive-practice.ts";
import {
  createFrozenAdaptiveQuestionBank,
} from "../lib/content-engine/adaptive-runtime.ts";

const workdir = process.env.SUPABASE_ISOLATED_WORKDIR ?? "";
const expectedProjectId = "plave-6gb-isolated-20260729-a";
const studentId = "10000000-0000-4000-8000-000000000001";
const unitSlug = "grade-2-numbers-to-1000";
const mismatchPath =
  "/tmp/plave-6gb-isolated-planner-mismatches.json";

function fail(message: string): never {
  throw new Error(message);
}

if (
  !workdir.startsWith("/tmp/plave-6gb-isolated.") ||
  !readFileSync(`${workdir}/supabase/config.toml`, "utf8").includes(
    `project_id = "${expectedProjectId}"`,
  )
) {
  fail("Isolated target không hợp lệ.");
}

const status = spawnSync(
  "supabase",
  ["status", "--workdir", workdir, "-o", "env"],
  { encoding: "utf8", maxBuffer: 1024 * 1024 },
);
if (status.status !== 0) fail("Không đọc được local status.");
const statusValues = new Map<string, string>();
for (const line of status.stdout.split("\n")) {
  const match = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (!match?.[1] || match[2] === undefined) continue;
  const raw = match[2];
  statusValues.set(
    match[1],
    raw.startsWith('"') && raw.endsWith('"')
      ? raw.slice(1, -1)
      : raw,
  );
}
const dbUrl = new URL(statusValues.get("DB_URL") ?? "");
if (
  dbUrl.hostname !== "127.0.0.1" ||
  dbUrl.port !== "57322" ||
  dbUrl.pathname !== "/postgres"
) {
  fail("Equivalence target không phải local disposable database.");
}

const psqlEnvironment = {
  ...process.env,
  PGHOST: dbUrl.hostname,
  PGPORT: dbUrl.port,
  PGDATABASE: dbUrl.pathname.slice(1),
  PGUSER: decodeURIComponent(dbUrl.username),
  PGPASSWORD: decodeURIComponent(dbUrl.password),
};

function sql(query: string) {
  const result = spawnSync(
    "psql",
    ["-X", "-v", "ON_ERROR_STOP=1", "-qAt"],
    {
      input: query,
      encoding: "utf8",
      env: psqlEnvironment,
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    fail("Equivalence SQL fixture thất bại.");
  }
  return result.stdout.trim();
}

function quote(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function uuid(caseIndex: number, itemIndex: number) {
  const suffix = (caseIndex * 100 + itemIndex)
    .toString()
    .padStart(12, "0");
  return `30000000-0000-4000-8000-${suffix}`;
}

const bank = createFrozenAdaptiveQuestionBank();
const questionsBySkill = new Map(
  gradeTwoNumbersTo1000AdaptivePolicy.requiredSkillCoverage.map(
    (skill) => [
      skill,
      bank.plannerQuestions.filter(
        (question) => question.skillFamilyId === skill,
      ),
    ],
  ),
);
const balancedOrder = Array.from({ length: 6 }, (_, round) =>
  gradeTwoNumbersTo1000AdaptivePolicy.requiredSkillCoverage.map(
    (skill) => {
      const question = questionsBySkill.get(skill)?.[round];
      if (!question) fail("Frozen bank không đủ skill coverage.");
      return question;
    },
  ),
).flat();

type CorpusCase = Readonly<{
  name: string;
  seed: string;
  evidence: readonly AdaptiveAnswerEvidence[];
}>;

function evidenceFrom(
  questions: readonly (typeof balancedOrder)[number][],
  correctness: (index: number, skill: string) => boolean,
) {
  return questions.map((question, index) => ({
    questionCode: question.code,
    skillFamilyId: question.skillFamilyId,
    isCorrect: correctness(index, question.skillFamilyId),
  }));
}

const corpus: CorpusCase[] = [];
const generatedSeeds = [
  "equiv-alpha",
  "equiv-beta",
  "equiv-gamma",
  "equiv-delta",
];
for (const [seedIndex, seed] of generatedSeeds.entries()) {
  for (let count = 0; count <= 24; count += 1) {
    corpus.push({
      name: `${seed}-count-${count}`,
      seed,
      evidence: evidenceFrom(
        balancedOrder.slice(0, count),
        (index, skill) => {
          if (seedIndex === 0) return true;
          if (seedIndex === 1) return index % 2 === 0;
          if (seedIndex === 2) {
            return (
              skill !==
              gradeTwoNumbersTo1000AdaptivePolicy
                .requiredSkillCoverage[0]
            );
          }
          return (index * 3 + count) % 5 !== 0;
        },
      ),
    });
  }
}

const firstSkill =
  gradeTwoNumbersTo1000AdaptivePolicy.requiredSkillCoverage[0] ??
  fail("Thiếu first skill.");
const firstSkillQuestions =
  questionsBySkill.get(firstSkill) ?? fail("Thiếu first-skill bank.");
corpus.push(
  {
    name: "missing-three-skills",
    seed: "coverage-only-one",
    evidence: evidenceFrom(firstSkillQuestions.slice(0, 6), () => true),
  },
  {
    name: "old-bug-eight-mastered-must-continue-to-twelve",
    seed: "old-eight-regression",
    evidence: evidenceFrom(balancedOrder.slice(0, 8), () => true),
  },
  {
    name: "mastery-threshold-exactly-75-percent",
    seed: "threshold-boundary",
    evidence: evidenceFrom(
      balancedOrder.slice(0, 16),
      (index) => index % 4 !== 0,
    ),
  },
  {
    name: "recent-correct-requirement-not-met",
    seed: "recent-failure",
    evidence: evidenceFrom(
      balancedOrder.slice(0, 16),
      (index) => index % 4 !== 3,
    ),
  },
  {
    name: "max-remediation-all-wrong",
    seed: "max-remediation",
    evidence: evidenceFrom(balancedOrder, () => false),
  },
);

type SqlMastery = Readonly<{
  skill_family_id: string;
  evidence_count: number;
  correct_count: number;
  accuracy: number | null;
  recent_correct_count: number;
  mastered: boolean;
}>;

type SqlResult = Readonly<{
  decision: Readonly<{
    action: "SELECT_QUESTION" | "TERMINAL";
    status: string;
    next_question_id?: string;
    completion_reason?: string;
    remediation_skill_ids: readonly string[];
  }>;
  mastery: readonly SqlMastery[];
  revision: number;
  evidence_count: number;
}>;

function querySqlPlanner(
  testCase: CorpusCase,
  caseIndex: number,
): SqlResult {
  const attemptId = uuid(caseIndex + 1, 0);
  const answerRows = testCase.evidence
    .map(
      (item, index) =>
        `(${quote(attemptId)},${quote(item.questionCode)},` +
        `${quote(uuid(caseIndex + 1, index + 1))},${index + 1},'A',` +
        `${item.isCorrect ? "true" : "false"})`,
    )
    .join(",\n");
  const correctCount = testCase.evidence.filter(
    (item) => item.isCorrect,
  ).length;
  const insertAnswers =
    answerRows.length === 0
      ? ""
      : `
        insert into public.adaptive_practice_answers (
          attempt_id,
          question_id,
          submission_id,
          evidence_sequence,
          normalized_answer,
          is_correct
        ) values ${answerRows};
      `;
  const output = sql(`
    begin;
    update public.questions
    set published = true
    where unit_slug = ${quote(unitSlug)};
    insert into public.adaptive_practice_attempts (
      id,
      student_id,
      unit_slug,
      start_idempotency_key,
      release_candidate_id,
      content_version,
      bundle_sha256,
      policy_version,
      planner_seed,
      status,
      revision,
      current_question_id,
      answered_count,
      correct_count,
      min_questions,
      max_questions,
      required_skill_ids,
      minimum_evidence_per_skill,
      mastery_threshold,
      recent_correct_requirement,
      remediation_skill_ids,
      completion_reason,
      completed_at
    ) values (
      ${quote(attemptId)},
      ${quote(studentId)},
      ${quote(unitSlug)},
      ${quote(uuid(caseIndex + 1, 99))},
      'g2-numbers-to-1000-rc1',
      'g2n1000-1.0.0-rc.1',
      '1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530',
      'g2n1000-adaptive-policy-1.0.0-pilot',
      ${quote(testCase.seed)},
      'ABANDONED',
      7,
      null,
      ${testCase.evidence.length},
      ${correctCount},
      12,
      24,
      array[
        'NUMBER_RECOGNITION_TO_1000',
        'READ_WRITE_TO_1000',
        'PLACE_VALUE_TO_1000',
        'SEQUENCE_TO_1000'
      ]::text[],
      2,
      0.75,
      2,
      array[]::text[],
      'OWNER_ABANDONED',
      now()
    );
    ${insertAnswers}
    select jsonb_build_object(
      'decision',
        private.plan_adaptive_practice_transition(${quote(attemptId)}),
      'mastery',
        (
          select jsonb_agg(
            jsonb_build_object(
              'skill_family_id', mastery.skill_family_id,
              'evidence_count', mastery.evidence_count,
              'correct_count', mastery.correct_count,
              'accuracy', mastery.accuracy,
              'recent_correct_count', mastery.recent_correct_count,
              'mastered', mastery.mastered
            )
            order by mastery.skill_ordinal
          )
          from private.get_adaptive_skill_mastery(
            ${quote(attemptId)}
          ) as mastery
        ),
      'revision',
        (
          select revision
          from public.adaptive_practice_attempts
          where id = ${quote(attemptId)}
        ),
      'evidence_count',
        (
          select count(*)
          from public.adaptive_practice_answers
          where attempt_id = ${quote(attemptId)}
        )
    );
    rollback;
  `);
  return JSON.parse(output) as SqlResult;
}

function semanticTypeScriptDecision(testCase: CorpusCase) {
  const decision = planAdaptivePractice(
    gradeTwoNumbersTo1000AdaptivePolicy,
    {
      evidence: testCase.evidence,
      availableQuestions: bank.plannerQuestions,
    },
    testCase.seed,
  );
  return decision;
}

const mismatches: unknown[] = [];
for (const [caseIndex, testCase] of corpus.entries()) {
  const typescriptDecision = semanticTypeScriptDecision(testCase);
  const sqlResult = querySqlPlanner(testCase, caseIndex);
  try {
    assert.equal(sqlResult.revision, 7);
    assert.equal(sqlResult.evidence_count, testCase.evidence.length);
    assert.equal(
      sqlResult.mastery.length,
      typescriptDecision.mastery.length,
    );
    for (const [
      masteryIndex,
      typescriptMastery,
    ] of typescriptDecision.mastery.entries()) {
      const sqlMastery = sqlResult.mastery[masteryIndex];
      assert.ok(sqlMastery);
      assert.equal(
        sqlMastery.skill_family_id,
        typescriptMastery.skillFamilyId,
      );
      assert.equal(
        Number(sqlMastery.evidence_count),
        typescriptMastery.evidenceCount,
      );
      assert.equal(
        Number(sqlMastery.correct_count),
        typescriptMastery.correctCount,
      );
      assert.equal(
        Number(sqlMastery.recent_correct_count),
        typescriptMastery.recentCorrectCount,
      );
      assert.equal(sqlMastery.mastered, typescriptMastery.mastered);
      if (typescriptMastery.accuracy === null) {
        assert.equal(sqlMastery.accuracy, null);
      } else {
        assert.ok(
          Math.abs(
            Number(sqlMastery.accuracy) -
              typescriptMastery.accuracy,
          ) < 1e-10,
        );
      }
    }

    if (typescriptDecision.kind === "SELECT_QUESTION") {
      assert.equal(sqlResult.decision.action, "SELECT_QUESTION");
      assert.equal(sqlResult.decision.status, "IN_PROGRESS");
      assert.equal(
        sqlResult.decision.next_question_id,
        typescriptDecision.question.code,
      );
      const selected = bank.plannerQuestions.find(
        (question) =>
          question.code === sqlResult.decision.next_question_id,
      );
      assert.equal(
        selected?.skillFamilyId,
        typescriptDecision.skillFamilyId,
      );
    } else if (typescriptDecision.kind === "COMPLETE") {
      assert.equal(sqlResult.decision.action, "TERMINAL");
      assert.equal(
        sqlResult.decision.status,
        typescriptDecision.reason ===
          "ADAPTIVE_MASTERY_EVIDENCE_MET"
          ? "MASTERED_EARLY"
          : "MAX_REACHED",
      );
      assert.equal(
        sqlResult.decision.completion_reason,
        typescriptDecision.reason,
      );
    } else {
      assert.equal(sqlResult.decision.action, "TERMINAL");
      assert.equal(
        sqlResult.decision.status,
        "REMEDIATION_REQUIRED",
      );
      assert.equal(
        sqlResult.decision.completion_reason,
        typescriptDecision.reason,
      );
      assert.deepEqual(
        sqlResult.decision.remediation_skill_ids,
        typescriptDecision.remediationSkillIds,
      );
    }
  } catch (error) {
    mismatches.push({
      caseIndex,
      name: testCase.name,
      seed: testCase.seed,
      evidenceCount: testCase.evidence.length,
      typescriptDecision,
      sqlResult,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

if (mismatches.length > 0) {
  writeFileSync(mismatchPath, JSON.stringify(mismatches, null, 2));
  fail(
    `Planner mismatch: ${mismatches.length}; fixture: ${mismatchPath}`,
  );
}

// A small checksum makes accidental corpus drift visible without storing
// answers or database credentials.
const corpusIdentity = createHmac("sha256", "plave-isolated-corpus-v1")
  .update(
    JSON.stringify(
      corpus.map((testCase) => ({
        name: testCase.name,
        seed: testCase.seed,
        evidence: testCase.evidence,
      })),
    ),
  )
  .digest("hex");

console.log(
  JSON.stringify(
    {
      status: "PASS",
      projectId: expectedProjectId,
      cases: corpus.length,
      evidenceRange: [0, 24],
      seeds: new Set(corpus.map((testCase) => testCase.seed)).size,
      skillFamilies:
        gradeTwoNumbersTo1000AdaptivePolicy.requiredSkillCoverage.length,
      explicitRegressions: [
        "8_EVIDENCE_CONTINUES_TO_12",
        "MASTERY_THRESHOLD_0_75",
        "RECENT_CORRECT_REQUIREMENT",
        "MAX_REMEDIATION",
      ],
      semanticMismatches: 0,
      corpusIdentity,
    },
    null,
    2,
  ),
);
