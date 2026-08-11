import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

import {
  buildProject004UniversalActivationPreflightSql,
  buildProject004UniversalActivationSql,
  buildProject004UniversalDeactivationSql,
  parseProject004UniversalActivationPreflight,
  project004UniversalActivationContract,
  verifyProject004UniversalActivationCounts,
  type UniversalActivationOperationReport,
  type UniversalActivationPreflightReport,
} from "../scripts/project004-remote-universal-activation.ts";
import { renderProject004UniversalActivationOperation } from "../scripts/activate-project004-remote-universal.ts";
import { runProject004UniversalDeactivationCommand } from "../scripts/deactivate-project004-remote-universal.ts";
import { runProject004UniversalActivationPreflightCommand } from "../scripts/run-project004-remote-universal-preflight.ts";
import {
  buildProject004UniversalActivationPsqlInvocation,
  parseProject004UniversalActivationResponse,
  project004UniversalActivationPsqlArgs,
} from "../scripts/project004-universal-activation-execution.ts";
import {
  authorizeGradesTwoToNineRelease,
  parseGradesTwoToNineReleaseMode,
} from "../lib/release-integration/release-mode.ts";

const root = resolve(import.meta.dirname, "..");
const sampleRef = "abcdefghijklmnopqrst";
const samplePassword = "remote-password-never-render";

function source(relativePath: string) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

function createFrozenActivationWorkspace() {
  const temporaryRoot = mkdtempSync(
    join(tmpdir(), "project004-frozen-activation-"),
  );
  const candidateRoot = resolve(
    temporaryRoot,
    "PLAVE-PROJECT004",
  );
  try {
    const planPath =
      "docs/operations/PROJECT004_REMOTE_DEV_MIGRATION_PLAN.json";
    const receiptPath =
      "docs/operations/PROJECT004_CLEAN_REMOTE_DISPOSABLE_PROOF_RECEIPT.json";
    const plan = JSON.parse(source(planPath)) as {
      migrationCount: number;
      migrations: Array<{ version: string; file: string }>;
    };
    assert.equal(plan.migrationCount, 40);
    assert.equal(plan.migrations.at(-1)?.version, "0040");

    const copy = (relativePath: string) => {
      const destination = resolve(candidateRoot, relativePath);
      mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(resolve(root, relativePath), destination);
    };
    for (const relativePath of [
      "package.json",
      "next.config.ts",
      "supabase/config.toml",
      planPath,
      receiptPath,
    ]) {
      copy(relativePath);
    }
    for (const migration of plan.migrations) {
      copy(`supabase/migrations/${migration.file}`);
    }
  } catch (error) {
    rmSync(temporaryRoot, { recursive: true, force: true });
    throw error;
  }
  return {
    candidateRoot,
    cleanup: () =>
      rmSync(temporaryRoot, { recursive: true, force: true }),
  };
}

function preflightPayload(
  state: "DRAFT_INACTIVE" | "ACTIVE",
  overrides: Partial<{
    units: number;
    questions: number;
    history: number;
    adaptiveEnabled: number;
  }> = {},
) {
  const active = state === "ACTIVE";
  return [
    `${project004UniversalActivationContract.version}:PREFLIGHT`,
    "40",
    "40",
    "0001",
    "0040",
    "1",
    "0",
    String(overrides.units ?? 171),
    String(overrides.questions ?? 2052),
    "2052",
    "546",
    "0",
    "0",
    "0",
    "14",
    "336",
    "336",
    "24",
    "1",
    "1",
    String(overrides.adaptiveEnabled ?? 0),
    "0",
    "0",
    String(overrides.history ?? 0),
    active ? "ACTIVE" : "DRAFT",
    active ? "ACTIVE" : "INACTIVE",
    active ? "SET" : "NULL",
  ].join("|");
}

function passingReport(): UniversalActivationPreflightReport {
  const counts =
    parseProject004UniversalActivationPreflight(
      preflightPayload("DRAFT_INACTIVE"),
    );
  return {
    ok: true,
    project004Canonical: "PASS",
    localMigrationChecksums: "PASS",
    cleanDisposableProof: "PASS",
    remoteIdentityGuard: "PASS",
    endpointMode: "POOLER_SESSION",
    schemaFingerprint: "PASS",
    releaseContract: "PASS",
    grade1LegacyBoundary: "PASS",
    adaptivePilotDisabled: "PASS",
    rlsPrivateBoundary: "PASS",
    activationEligible: "YES",
    counts,
    resolvedEndpoint: {
      mode: "POOLER_SESSION",
      host: "aws-0-ap-southeast-1.pooler.supabase.com",
      port: "5432",
      user: `postgres.${sampleRef}`,
      sslMode: "require",
    },
    config: {
      projectName: "plave-project004-dev-clean",
      projectRef: sampleRef,
      databasePassword: samplePassword,
      environmentClass: "EMPTY_DEVELOPMENT",
    },
    rootFailureCode: "NONE",
    currentRunMutationPerformed: "NO",
  };
}

test("activation contract pins the clean target, proof fingerprint, release identity, hashes, and counts", () => {
  assert.equal(
    project004UniversalActivationContract.targetName,
    "plave-project004-dev-clean",
  );
  assert.equal(
    project004UniversalActivationContract
      .schemaSemanticFingerprintSha256,
    "d81cbaa38b586207eb843d9c73356901aff257505086b7a4029d02fdc5e0e34c",
  );
  assert.equal(
    project004UniversalActivationContract
      .cleanDisposableProofFingerprintSha256,
    "b84f19f47ff0e2fc6b2ca262d34e3d0eee2c8f595265b6d217541d66ce32dd50",
  );
  assert.deepEqual(
    [
      project004UniversalActivationContract.units,
      project004UniversalActivationContract.publicQuestions,
      project004UniversalActivationContract.privateSolutions,
      project004UniversalActivationContract.officialOutcomes,
    ],
    [171, 2052, 2052, 546],
  );
  for (const hash of [
    project004UniversalActivationContract
      .curriculumSourceFingerprint,
    project004UniversalActivationContract.publicPayloadSha256,
    project004UniversalActivationContract.privateSolutionSha256,
    project004UniversalActivationContract.bundleSha256,
  ]) {
    assert.match(hash, /^[0-9a-f]{64}$/u);
  }
  assert.equal(
    project004UniversalActivationContract
      .activationAuthorizationStatus,
    "OWNER_APPROVED_FOR_ONE_TIME_ACTIVATION",
  );
});

test("preflight parser accepts exact DRAFT and ACTIVE state and rejects count, adaptive, or history drift", () => {
  verifyProject004UniversalActivationCounts(
    parseProject004UniversalActivationPreflight(
      preflightPayload("DRAFT_INACTIVE"),
    ),
    "DRAFT_INACTIVE",
  );
  verifyProject004UniversalActivationCounts(
    parseProject004UniversalActivationPreflight(
      preflightPayload("ACTIVE", { history: 8 }),
    ),
    "ACTIVE",
    { allowExistingHistory: true },
  );
  for (const payload of [
    preflightPayload("DRAFT_INACTIVE", { units: 170 }),
    preflightPayload("DRAFT_INACTIVE", {
      questions: 2051,
    }),
    preflightPayload("DRAFT_INACTIVE", {
      adaptiveEnabled: 1,
    }),
    preflightPayload("DRAFT_INACTIVE", { history: 1 }),
  ]) {
    assert.throws(
      () =>
        verifyProject004UniversalActivationCounts(
          parseProject004UniversalActivationPreflight(payload),
          "DRAFT_INACTIVE",
        ),
      /UNIVERSAL_RELEASE_STATE_DRIFT/u,
    );
  }
});

test("read-only preflight and atomic activation pin all critical contracts without mutating legacy, users, or history", () => {
  const preflight =
    buildProject004UniversalActivationPreflightSql();
  const activation = buildProject004UniversalActivationSql();
  assert.match(preflight, /begin read only/u);
  assert.match(preflight, /supabase_migrations[.]schema_migrations/u);
  assert.match(
    preflight,
    new RegExp(
      project004UniversalActivationContract.bundleSha256,
      "u",
    ),
  );
  assert.match(activation, /^\\set ON_ERROR_STOP on/mu);
  assert.match(activation, /pg_advisory_xact_lock/u);
  assert.match(
    activation,
    /update public[.]curriculum_releases/u,
  );
  assert.match(activation, /status = 'ACTIVE'/u);
  assert.match(activation, /activation_state = 'ACTIVE'/u);
  assert.match(activation, /adaptive[.]exact_disabled/u);
  assert.doesNotMatch(
    activation,
    /^\s*(?:insert into|delete from|truncate)\b/imu,
  );
  assert.doesNotMatch(
    activation,
    /update public[.](?:learning_units|questions|question_solutions|profiles|student_profiles|curriculum_attempts|curriculum_answers)/iu,
  );
});

test("deactivation rechecks exact active contract, preserves evidence counts, and only changes release state", () => {
  const deactivation =
    buildProject004UniversalDeactivationSql();
  assert.match(deactivation, /v_fields\[1\]::integer <> 40/u);
  assert.match(
    deactivation,
    /activation_history_boundary/u,
  );
  assert.match(
    deactivation,
    /PROJECT004_DEACTIVATION:HISTORY_MUTATED/u,
  );
  assert.match(
    deactivation,
    /status = 'DRAFT'/u,
  );
  assert.match(
    deactivation,
    /activation_state = 'INACTIVE'/u,
  );
  assert.doesNotMatch(
    deactivation,
    /^\s*(?:delete from|truncate)\b/imu,
  );
});

test("migration contract preserves bound-attempt resume and submit while inactive releases block new starts", () => {
  const migration = source(
    "supabase/migrations/0038_universal_curriculum_runtime_draft.sql",
  );
  const resumeIndex = migration.indexOf(
    "and attempt.status = 'IN_PROGRESS'",
  );
  const releaseIndex = migration.indexOf(
    "where release.status = 'ACTIVE'",
    resumeIndex,
  );
  const stateFunctionIndex = migration.indexOf(
    "create or replace function public.get_curriculum_attempt_state",
  );
  const submitFunctionIndex = migration.indexOf(
    "create or replace function public.submit_curriculum_answer",
  );
  assert.ok(resumeIndex >= 0);
  assert.ok(releaseIndex > resumeIndex);
  assert.ok(stateFunctionIndex > releaseIndex);
  assert.ok(submitFunctionIndex > stateFunctionIndex);
  assert.equal(
    migration
      .slice(stateFunctionIndex, submitFunctionIndex)
      .includes("release.status = 'ACTIVE'"),
    false,
  );
});

test("historical remote runtime stays fixed while typed local release modes enforce catalog and start authorization", () => {
  const runtime = source(
    "scripts/project004-remote-runtime-connection.ts",
  );
  const learn = source("app/learn/page.tsx");
  const dashboard = source("app/dashboard/page.tsx");
  const curriculumServer = source(
    "lib/curriculum-runtime/server.ts",
  );
  const catalog = source(
    "components/UniversalCurriculumCatalog.tsx",
  );
  const releasedCatalog = source(
    "lib/release-integration/catalog.ts",
  );
  const serverConfig = source(
    "lib/release-integration/server-config.ts",
  );
  const activation = source(
    "supabase/operations/grades-2-9-local-release/ACTIVATE_PUBLIC.sql",
  );
  const deactivation = source(
    "supabase/operations/grades-2-9-local-release/DEACTIVATE.sql",
  );
  assert.match(
    runtime,
    /curriculumRuntimeEnabled: "true"/u,
  );
  assert.match(
    runtime,
    /PLAVE_ON_DEMAND_GENERATION_ENABLED = "false"/u,
  );
  assert.match(
    runtime,
    /PLAVE_CONTROLLED_PILOT_ENABLED = "false"/u,
  );
  assert.match(
    learn,
    /getOnDemandRuntimeConfiguration\(\)[.]enabled/u,
  );
  assert.match(
    dashboard,
    /getUniversalCurriculumRuntimeFlag\(\)[.]enabled/u,
  );
  assert.match(
    dashboard,
    /loadStudentCurriculumProgress\(existingLearningAccess\)/u,
  );
  assert.match(
    curriculumServer,
    /if \(!getUniversalCurriculumRuntimeFlag\(\)[.]enabled\)\s*\{\s*return \{ ok: false as const, reason: "DISABLED" as const \};/u,
  );
  assert.match(
    catalog,
    /onDemandRuntimeEnabled \? \(/u,
  );
  assert.deepEqual(parseGradesTwoToNineReleaseMode(undefined), {
    mode: "HIDDEN",
    valid: false,
    reason: "UNSET",
  });
  const allowed = {
    applicationMode: "PUBLIC" as const,
    databaseMode: "PUBLIC" as const,
    authenticated: true,
    role: "STUDENT" as const,
    schoolGrade: 6,
    releaseGrade: 6,
    exactTupleMatches: true,
    applicationRuntimeEnabled: true,
    databaseRuntimeEnabled: true,
    pilotEntitled: false,
  };
  assert.deepEqual(authorizeGradesTwoToNineRelease(allowed), {
    allowed: true,
    mode: "PUBLIC",
  });
  assert.deepEqual(
    authorizeGradesTwoToNineRelease({
      ...allowed,
      applicationMode: "PILOT",
      databaseMode: "PILOT",
    }),
    { allowed: false, reason: "PILOT_ENTITLEMENT_REQUIRED" },
  );
  for (const role of ["PARENT", "TEACHER", "UNKNOWN"] as const) {
    assert.deepEqual(authorizeGradesTwoToNineRelease({ ...allowed, role }), {
      allowed: false,
      reason: "STUDENT_REQUIRED",
    });
  }
  assert.deepEqual(
    authorizeGradesTwoToNineRelease({ ...allowed, authenticated: false }),
    { allowed: false, reason: "AUTH_REQUIRED" },
  );
  assert.deepEqual(
    authorizeGradesTwoToNineRelease({ ...allowed, schoolGrade: 5 }),
    { allowed: false, reason: "GRADE_MISMATCH" },
  );
  assert.deepEqual(
    authorizeGradesTwoToNineRelease({ ...allowed, exactTupleMatches: false }),
    { allowed: false, reason: "TUPLE_MISMATCH" },
  );
  assert.match(serverConfig, /import "server-only"/u);
  assert.match(serverConfig, /process[.]env[.]PLAVE_GRADES_2_9_RELEASE_MODE/u);
  assert.match(releasedCatalog, /\['PILOT', 'PUBLIC'\][.]includes/u);
  assert.match(
    learn,
    /releasedCatalog[.]units/u,
  );
  assert.match(learn, /progressResult[.]progress[.]grade !== access[.]grade/u);
  assert.match(activation, /release_mode='PUBLIC'/u);
  assert.match(activation, /for update/u);
  assert.doesNotMatch(activation, /insert into public[.]curriculum_release_pilot_entitlements/iu);
  assert.match(deactivation, /release_mode='HIDDEN'/u);
  assert.doesNotMatch(deactivation, /delete from|truncate/iu);
  assert.doesNotMatch(
    `${learn}\n${catalog}\n${dashboard}`,
    /update.*schoolGrade|schoolGrade.*=/iu,
  );
});

test("frozen-0040 preflight prompt keeps credentials out of safe output and performs no mutation", () => {
  let currentPromptCount = 0;
  const currentRootResult =
    runProject004UniversalActivationPreflightCommand({
      candidateRoot: root,
      prompt: () => {
        currentPromptCount += 1;
        return { ok: true, value: "must-not-be-requested" };
      },
    });
  assert.equal(currentRootResult.exitCode, 1);
  assert.equal(
    currentRootResult.report.rootFailureCode,
    "LOCAL_CHECKSUM_MISMATCH",
  );
  assert.equal(currentPromptCount, 0);

  const values = [sampleRef, samplePassword];
  const report = passingReport();
  const frozen = createFrozenActivationWorkspace();
  const result = (() => {
    try {
      return runProject004UniversalActivationPreflightCommand({
        candidateRoot: frozen.candidateRoot,
        prompt: () => ({
          ok: true,
          value: values.shift() ?? "",
        }),
        execute: () => report,
      });
    } finally {
      frozen.cleanup();
    }
  })();
  assert.equal(result.exitCode, 0);
  assert.match(
    result.output,
    /PROJECT004_UNIVERSAL_ACTIVATION_PREFLIGHT=PASS/u,
  );
  assert.match(
    result.output,
    /CURRENT_RUN_MUTATION_PERFORMED=NO/u,
  );
  assert.doesNotMatch(
    result.output,
    new RegExp(`${sampleRef}|${samplePassword}`, "u"),
  );
});

test("the retry activation approval is open while deactivation remains locked", () => {
  let promptCount = 0;
  const prompt = () => {
    promptCount += 1;
    return {
      ok: true as const,
      value: "must-not-be-read",
    };
  };
  const deactivation =
    runProject004UniversalDeactivationCommand({ prompt });
  assert.equal(deactivation.exitCode, 1);
  assert.equal(promptCount, 0);
  assert.equal(
    project004UniversalActivationContract
      .activationAuthorizationStatus,
    "OWNER_APPROVED_FOR_ONE_TIME_ACTIVATION",
  );
  assert.match(
    deactivation.output,
    /UNIVERSAL_DEACTIVATION_OWNER_APPROVAL_REQUIRED/u,
  );
});

test("activation command requires the isolated runtime profile and project-ref parity before remote execution", () => {
  const source = readFileSync(
    resolve(
      root,
      "scripts/activate-project004-remote-universal.ts",
    ),
    "utf8",
  );
  const profileIndex = source.indexOf(
    "loadProject004RemoteRuntimeConfigFile",
  );
  const promptIndex = source.indexOf(
    "promptProject004UniversalRemoteEnvironment",
    profileIndex,
  );
  const executeIndex = source.indexOf(
    "executeProject004UniversalActivationOnce",
    promptIndex,
  );
  assert.ok(profileIndex >= 0);
  assert.ok(promptIndex > profileIndex);
  assert.ok(executeIndex > promptIndex);
  assert.match(
    source,
    /REMOTE_RUNTIME_PROFILE_REQUIRED_BEFORE_ACTIVATION/u,
  );
  assert.match(
    source,
    /REMOTE_RUNTIME_PROFILE_TARGET_MISMATCH/u,
  );
});

test("Node 22 executable authorization smoke verifies the one-time retry unlock without prompt or remote access", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      "scripts/activate-project004-remote-universal.ts",
      "--smoke",
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env },
      timeout: 10_000,
    },
  );
  assert.equal(result.status, 0);
  assert.match(
    result.stdout,
    /ONE_TIME_ACTIVATION_AUTHORIZATION=PASS/u,
  );
  assert.match(
    result.stdout,
    /CURRENT_RUN_MUTATION_PERFORMED=NO/u,
  );
  assert.match(
    result.stdout,
    /DEACTIVATION_AUTHORIZATION=LOCKED/u,
  );
  assert.doesNotMatch(
    result.stdout,
    /project reference:|database password:/iu,
  );
});

test("remote and disposable activation use the same stdin invocation contract without SQL in argv", () => {
  const sql = buildProject004UniversalActivationSql();
  const invocation =
    buildProject004UniversalActivationPsqlInvocation(sql);
  assert.deepEqual(
    invocation.args,
    [...project004UniversalActivationPsqlArgs],
  );
  assert.equal(invocation.input, sql);
  assert.equal(
    invocation.args.join("\n").includes("--command"),
    false,
  );
  assert.equal(
    invocation.args.join("\n").includes("--file"),
    false,
  );
  assert.equal(
    invocation.args.some((argument) =>
      argument.includes("begin;"),
    ),
    false,
  );
  assert.match(invocation.input, /^\\set ON_ERROR_STOP on/mu);

  const remote = source(
    "scripts/project004-remote-universal-activation.ts",
  );
  const disposable = source(
    "scripts/run-project004-universal-activation-disposable-proof.ts",
  );
  for (const productionPath of [remote, disposable]) {
    assert.match(
      productionPath,
      /buildProject004UniversalActivationPsqlInvocation/u,
    );
    assert.match(
      productionPath,
      /parseProject004UniversalActivationResponse/u,
    );
  }
});

test("canonical response parser accepts one sentinel across stdout/stderr and classifies precondition SQLSTATE", () => {
  const sentinel =
    `${project004UniversalActivationContract.version}:COMMIT|ACTIVE`;
  const pass = parseProject004UniversalActivationResponse(
    {
      ok: true,
      stdout: "NOTICE: safe progress\n",
      stderr: `${sentinel}\n`,
    },
    sentinel,
  );
  assert.equal(pass.ok, true);
  assert.equal(pass.sentinelCount, 1);

  const failed = parseProject004UniversalActivationResponse(
    {
      ok: false,
      stdout: "",
      stderr:
        "ERROR:  P0001: PROJECT004_ACTIVATION:CONTRACT_DRIFT\n",
    },
    sentinel,
  );
  assert.equal(failed.ok, false);
  assert.equal(failed.sqlstate, "P0001");
  assert.equal(failed.failureStage, "PRECONDITION");
  assert.equal(
    failed.failedStatementClass,
    "PRECONDITION_DO_BLOCK",
  );
  assert.equal(
    failed.preconditionId,
    "ACTIVATION_EXACT_DRAFT_INACTIVE_CONTRACT",
  );
});

test("canonical response parser fails closed on missing or duplicate commit sentinel", () => {
  const sentinel =
    `${project004UniversalActivationContract.version}:COMMIT|ACTIVE`;
  const missing = parseProject004UniversalActivationResponse(
    { ok: true, stdout: "COMMIT\n", stderr: "" },
    sentinel,
  );
  assert.equal(
    missing.parserFailureCode,
    "ACTIVATION_COMMIT_SENTINEL_MISSING",
  );
  const duplicate =
    parseProject004UniversalActivationResponse(
      {
        ok: true,
        stdout: `${sentinel}\n${sentinel}\n`,
        stderr: "",
      },
      sentinel,
    );
  assert.equal(
    duplicate.parserFailureCode,
    "ACTIVATION_COMMIT_SENTINEL_DUPLICATE",
  );
});

test("activation output keeps preflight and attempt diagnostics on separate lines", () => {
  const report: UniversalActivationOperationReport = {
    ok: false,
    preflight: passingReport(),
    activationAttempts: 1,
    postActivationDiagnostic: "NOT_RUN",
    releaseState: "NOT_RUN",
    releaseBank: "NOT_RUN",
    adaptivePilot: "NOT_RUN",
    runtimeConfigurationRequired: "YES",
    activationSqlstate: "P0001",
    activationFailureStage: "PRECONDITION",
    activationFailedStatementClass:
      "PRECONDITION_DO_BLOCK",
    activationPreconditionId:
      "ACTIVATION_EXACT_DRAFT_INACTIVE_CONTRACT",
    transactionRollback: "PASS",
    currentRunMutationPerformed: "NO",
    rootFailureCode:
      "UNIVERSAL_ACTIVATION_TRANSACTION_FAILED",
  };
  const output =
    renderProject004UniversalActivationOperation(report);
  assert.match(
    output,
    /ACTIVATION_ELIGIBLE=YES\nACTIVATION_ATTEMPTS=1/u,
  );
  assert.doesNotMatch(
    output,
    /ACTIVATION_ELIGIBLE=YESACTIVATION_ATTEMPTS/u,
  );
});

test("disposable proof uses the production activation/deactivation builders and exact Grades 1–9 runtime path", () => {
  const proof = source(
    "scripts/run-project004-universal-activation-disposable-proof.ts",
  );
  assert.match(
    proof,
    /buildProject004UniversalActivationSql/u,
  );
  assert.match(
    proof,
    /buildProject004UniversalDeactivationSql/u,
  );
  assert.match(proof, /for v_grade in 2[.][.]9 loop/u);
  assert.match(proof, /start_or_resume_practice/u);
  assert.match(proof, /start_or_resume_curriculum_unit/u);
  assert.match(proof, /submit_curriculum_answer/u);
  assert.match(proof, /PRIVATE_SOLUTION_READ_NOT_DENIED/u);
  assert.match(proof, /INACTIVE_NEW_START_NOT_DENIED/u);
});
