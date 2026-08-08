import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { runWithGuaranteedCleanup } from "../scripts/learning-persistence-local-harness.ts";
import {
  classifyLearningPersistenceSchema,
  learningPersistenceSchemaCompatibilityVersion,
} from "../scripts/learning-persistence-schema-compatibility.ts";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("schema compatibility distinguishes complete, enrichment-skew and missing-base states", () => {
  const complete = classifyLearningPersistenceSchema({
    baseAttemptWrite: true,
    baseHistoryRead: true,
    baseParentProgressRead: true,
    scoringRead: true,
    parentScoringRead: true,
    motivationRead: true,
    parentMotivationRead: true,
  });
  assert.equal(complete.version, learningPersistenceSchemaCompatibilityVersion);
  assert.equal(complete.classification, "COMPLETE");
  assert.equal(complete.studentHistory, "AVAILABLE");
  assert.equal(complete.parentProgress, "AVAILABLE");

  const skew = classifyLearningPersistenceSchema({
    baseAttemptWrite: true,
    baseHistoryRead: true,
    baseParentProgressRead: true,
    scoringRead: false,
    parentScoringRead: false,
    motivationRead: false,
    parentMotivationRead: false,
  });
  assert.equal(skew.classification, "BASE_PERSISTENCE_WITHOUT_ENRICHMENT");
  assert.equal(skew.studentHistory, "UNAVAILABLE_SCHEMA_SKEW");
  assert.equal(skew.parentProgress, "UNAVAILABLE_SCHEMA_SKEW");
  assert.equal(skew.safeCode, "SCHEMA_REQUIRES_0043_0044");
  assert.doesNotMatch(
    JSON.stringify(skew),
    /(?:postgres|sql|supabase|https?:|uuid|provider|password|token|secret|PGRST|42883)/iu,
  );

  const missingBase = classifyLearningPersistenceSchema({
    baseAttemptWrite: false,
    baseHistoryRead: false,
    baseParentProgressRead: false,
    scoringRead: false,
    parentScoringRead: false,
    motivationRead: false,
    parentMotivationRead: false,
  });
  assert.equal(missingBase.classification, "BASE_PERSISTENCE_UNAVAILABLE");
  assert.equal(missingBase.safeCode, "SCHEMA_REQUIRES_0038");
});

test("cleanup runs exactly once after success and assertion failure", async () => {
  let successfulCleanup = 0;
  const value = await runWithGuaranteedCleanup(
    async () => "PASS",
    async () => {
      successfulCleanup += 1;
    },
  );
  assert.equal(value, "PASS");
  assert.equal(successfulCleanup, 1);

  let failedCleanup = 0;
  await assert.rejects(
    runWithGuaranteedCleanup(
      async () => {
        throw new Error("INJECTED_ASSERTION_FAILURE");
      },
      async () => {
        failedCleanup += 1;
      },
    ),
    /INJECTED_ASSERTION_FAILURE/u,
  );
  assert.equal(failedCleanup, 1);
});

test("disposable runner is loopback-only, namespaced, signal-aware and excludes local secrets", () => {
  const harness = read("scripts/learning-persistence-local-harness.ts");
  const runner = read("scripts/run-learning-persistence-local.ts");
  assert.match(harness, /PLAVE-PROJECT004-ROUND2I-/u);
  assert.match(harness, /127[.]0[.]0[.]1/u);
  assert.match(harness, /loopbackHosts/u);
  assert.match(harness, /stop[",\s]+"--no-backup"/u);
  assert.match(harness, /process[.]once\("SIGINT"/u);
  assert.match(harness, /process[.]once\("SIGTERM"/u);
  assert.match(harness, /finally/u);
  assert.match(
    harness,
    /try\s*\{\s*reservations = await reserveDisposablePorts\(\);[\s\S]*appReservation = await reserveAppPort\(\);/u,
  );
  assert.match(
    harness,
    /supabaseStarted = true;\s*runSync\(supabaseExecutable, \["start"\]/u,
  );
  assert.match(harness, /--exclude=[.]env[*]/u);
  assert.match(harness, /listenerIdentity\(3000\)/u);
  assert.match(harness, /assertNoDockerResidue/u);
  assert.doesNotMatch(harness, /docker[",\s]+(?:system[",\s]+)?prune/u);
  assert.doesNotMatch(harness, /env-file-if-exists|[.]env[.]local/u);
  assert.match(runner, /@plave[.]test[.]invalid/u);
  assert.match(harness, /PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED/u);
  assert.doesNotMatch(runner, /service[_-]?role.*(?:rpc|fallback)/iu);
  assert.doesNotMatch(runner, /console[.]log\((?:email|password|invitation)/iu);
});

test("dynamic runner covers all requested persistence and authorization contracts", () => {
  const runner = read("scripts/run-learning-persistence-local.ts");
  for (const contract of [
    "start_or_resume_practice",
    "submit_practice_answer",
    "start_or_resume_curriculum_unit",
    "submit_curriculum_answer",
    "get_student_curriculum_history",
    "get_student_curriculum_progress",
    "/api/curriculum-runtime/start",
    "/api/curriculum-runtime/answer",
    "/api/curriculum-runtime/state",
    "/api/curriculum-runtime/history",
    "/api/curriculum-runtime/progress",
    "send_parent_connection_request",
    "respond_parent_connection_request",
    "get_parent_child_universal_progress",
    "activate_teacher_invitation",
    "start_or_resume_assignment_submission",
    "save_assignment_draft_answer_v2",
    "submit_assignment_submission_v2",
    "ASSIGNMENT:STATE_CONFLICT",
  ]) {
    assert.match(runner, new RegExp(contract.replaceAll("/", "\\/"), "u"));
  }
  assert.match(runner, /\[1, 2, 3, 4, 5, 6, 7, 8, 9\]/u);
  assert.match(runner, /boundary:\s*42/u);
  assert.match(runner, /boundary:\s*44/u);
  assert.match(runner, /DRAFT.*HIDDEN|HIDDEN.*DRAFT/su);
});

test("current application fails schema-skew History closed instead of returning an empty list", () => {
  const server = read("lib/curriculum-runtime/server.ts");
  const historyRoute = read("app/api/curriculum-runtime/history/route.ts");
  const parentServer = read("lib/parent-dashboard/server.ts");
  assert.match(
    server,
    /get_student_curriculum_history[\s\S]*get_my_score_xp_mastery[\s\S]*!scoring[\s\S]*DATA_UNAVAILABLE/u,
  );
  assert.match(historyRoute, /HISTORY_\$\{result[.]reason\}/u);
  assert.match(historyRoute, /REQUEST_FAILED/u);
  assert.doesNotMatch(historyRoute, /attempts:\s*\[\]/u);
  assert.match(parentServer, /get_parent_child_score_xp_mastery/u);
  assert.match(parentServer, /get_parent_child_motivation_v1/u);
  assert.doesNotMatch(parentServer, /service[_-]?role/iu);
});

test("Docker-required package scripts remain explicit and outside the default unit suite", () => {
  const packageJson = JSON.parse(read("package.json")) as {
    scripts: Record<string, string>;
  };
  assert.equal(
    packageJson.scripts["test:learning-persistence-local"],
    "node --no-warnings --experimental-strip-types scripts/run-learning-persistence-local.ts --scope=all",
  );
  assert.match(packageJson.scripts["test:grade3-history-local"], /--scope=grade3$/u);
  assert.match(packageJson.scripts["test:teacher-assignment-persistence-local"], /--scope=teacher$/u);
  assert.match(packageJson.scripts["test:learning-schema-skew-local"], /--scope=schema-skew$/u);
  assert.doesNotMatch(packageJson.scripts.test ?? "", /learning-persistence-local/u);
});
