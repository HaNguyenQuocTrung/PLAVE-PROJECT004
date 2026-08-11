import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  buildMigration0041ControlledApplySql,
  buildMigration0041RemoteQuerySql,
  buildMigration0041RemotePreflightSql,
  classifyMigration0041MissingRoutine,
  classifyMigration0041RemoteQueryStderr,
  classifyMigration0041RemotePhase,
  consumeMigration0041Approval,
  createAuditedMigration0041Runner,
  executeMigration0041ControlledApply,
  executeMigration0041RemotePreflight,
  loadMigration0041LocalContract,
  parseMigration0041RemotePreflight,
  parseMigration0041TransactionResponse,
  project004Migration0041Contract,
  type Migration0041RemoteCounts,
} from "../scripts/project004-remote-migration-0041.ts";
import {
  renderMigration0041Operation,
} from "../scripts/apply-project004-remote-migration-0041.ts";
import {
  renderMigration0041Preflight,
} from "../scripts/run-project004-remote-migration-0041-preflight.ts";
import {
  createProject004RemoteRuntimeConfig,
  serializeProject004RemoteRuntimeConfig,
} from "../scripts/project004-remote-runtime-connection.ts";
import {
  isReadOnlySqlCommand,
} from "../scripts/project004-remote-dev-audited-runner.ts";
import {
  type RemoteDevCommandRunner,
} from "../scripts/project004-remote-dev-operations.ts";
import {
  project004UniversalActivationPsqlArgs,
} from "../scripts/project004-universal-activation-execution.ts";

const repositoryRoot = resolve(import.meta.dirname, "..");
const sampleRef = "abcdefghijklmnopqrst";
const samplePassword = "local-test-password-only";

function createWorkspace() {
  const temporaryRoot = mkdtempSync(
    join(tmpdir(), "project004-migration-0041-"),
  );
  const root = join(temporaryRoot, "PLAVE-PROJECT004");
  mkdirSync(join(root, "supabase/migrations"), {
    recursive: true,
  });
  mkdirSync(join(root, "docs/operations"), {
    recursive: true,
  });
  writeFileSync(
    join(root, "package.json"),
    '{"name":"plave-project004"}\n',
  );
  writeFileSync(
    join(root, "supabase/config.toml"),
    'project_id = "PLAVE-PROJECT004"\nport = 54322\n',
  );
  writeFileSync(
    join(root, "next.config.ts"),
    'const cache = ".next-owner-local-project004";\n',
  );
  mkdirSync(join(root, "scripts"), {
    recursive: true,
  });
  writeFileSync(
    join(root, "scripts/start-owner-local-demo.ts"),
    'import { assertProject004Workspace } from "./project004-workspace-identity.ts";\nvoid assertProject004Workspace;\n',
  );
  const migrationFiles = awaitableMigrationFiles();
  for (const filename of migrationFiles) {
    copyFileSync(
      join(repositoryRoot, "supabase/migrations", filename),
      join(root, "supabase/migrations", filename),
    );
  }
  copyFileSync(
    join(
      repositoryRoot,
      "docs/operations/PROJECT004_REMOTE_DEV_MIGRATION_PLAN.json",
    ),
    join(
      root,
      "docs/operations/PROJECT004_REMOTE_DEV_MIGRATION_PLAN.json",
    ),
  );
  const runtime = createProject004RemoteRuntimeConfig({
    projectRef: sampleRef,
    publicUrl: `https://${sampleRef}.supabase.co`,
    publishableKey: `sb_publishable_${"x".repeat(24)}`,
  });
  writeFileSync(
    join(root, ".env.remote-dev.local"),
    serializeProject004RemoteRuntimeConfig(runtime),
    { mode: 0o600 },
  );
  return { temporaryRoot, root };
}

function awaitableMigrationFiles() {
  return readdirSync(join(repositoryRoot, "supabase/migrations"))
    .filter((filename) => /^[0-9]{4}_.+[.]sql$/u.test(filename))
    .sort();
}

test("canonical repository inventory is exact and contiguous through 0045 while preserving the historical 0041 contract", () => {
  const plan = JSON.parse(
    readFileSync(
      join(
        repositoryRoot,
        "docs/operations/PROJECT004_REMOTE_DEV_MIGRATION_PLAN.json",
      ),
      "utf8",
    ),
  ) as { migrations: Array<{ file: string; version: string }> };
  const expected = [
    ...plan.migrations.map(({ file }) => file),
    "0041_generated_practice_semantic_provenance.sql",
    "0042_fix_generated_question_provenance_trigger_security.sql",
    "0043_score_xp_mastery_foundation.sql",
    "0044_motivation_level_streak_goals_achievements.sql",
    "0045_grades_2_9_local_public_release.sql",
  ];
  assert.equal(plan.migrations.length, 40);
  assert.deepEqual(awaitableMigrationFiles(), expected);
  assert.deepEqual(
    expected.map((filename) => filename.slice(0, 4)),
    Array.from({ length: 45 }, (_, index) => String(index + 1).padStart(4, "0")),
  );
  const migration0045 = readFileSync(
    join(repositoryRoot, "supabase/migrations", expected.at(-1)!),
  );
  assert.equal(
    createHash("sha256").update(migration0045).digest("hex"),
    "8ef040428b424bf84fe50c4077a891e042956e77436aca9f6f55ca1bf19a663f",
  );
});

function environment() {
  return {
    ...process.env,
    PLAVE_PROJECT004_REMOTE_TARGET_NAME:
      project004Migration0041Contract.targetName,
    PLAVE_PROJECT004_REMOTE_PROJECT_REF: sampleRef,
    PLAVE_PROJECT004_REMOTE_DB_PASSWORD: samplePassword,
    PLAVE_PROJECT004_REMOTE_ENVIRONMENT_CLASS:
      project004Migration0041Contract.environmentClass,
  };
}

function beforeCounts(
  override: Partial<Migration0041RemoteCounts> = {},
): Migration0041RemoteCounts {
  return {
    migrationCount: 40,
    prefixMigrationCount: 40,
    migrationFirst: "0001",
    migrationLast: "0040",
    migration0041Count: 0,
    foreignMigrationCount: 0,
    migration0041ChecksumMatches: 0,
    migration0041SourceHashMatches: 0,
    missingMigrationCount: 0,
    duplicateMigrationCount: 0,
    tableCount: 1,
    provenanceFieldCount: 0,
    supportFieldCount: 0,
    provenanceConstraintCount: 0,
    provenanceTriggerCount: 0,
    provenanceFunctionCount: 0,
    oldStartAuthenticatedExecute: 1,
    semanticStartAuthenticatedExecute: 0,
    functionGrantLeakCount: 0,
    partialProvenanceRowCount: 0,
    generatedQuestionRows: 12,
    legacyQuestionRows: 12,
    pendingQuestionRows: 0,
    semanticQuestionRows: 0,
    attemptRows: 5,
    privateSolutionRows: 12,
    generatedAnswerRows: 1,
    materializedAnswerRows: 5,
    learningHistoryRows: 41,
    exactActiveReleaseCount: 1,
    otherReleaseCount: 0,
    releaseUnits: 171,
    releaseQuestions: 2052,
    releaseSolutions: 2052,
    releaseOutcomes: 546,
    legacyUnits: 14,
    legacyQuestions: 336,
    legacySolutions: 336,
    legacyDiagnosticRows: 24,
    adaptiveReleaseCount: 1,
    adaptiveExactDisabledCount: 1,
    adaptiveEnabledCount: 0,
    rlsGapCount: 0,
    privateGrantLeakCount: 0,
    primaryKeyContractCount: 1,
    ...override,
  };
}

function appliedCounts(
  override: Partial<Migration0041RemoteCounts> = {},
) {
  return beforeCounts({
    migrationCount: 41,
    migrationLast: "0041",
    migration0041Count: 1,
    migration0041ChecksumMatches: 0,
    migration0041SourceHashMatches: 1,
    provenanceFieldCount: 8,
    supportFieldCount: 2,
    provenanceConstraintCount: 3,
    provenanceTriggerCount: 3,
    provenanceFunctionCount: 4,
    oldStartAuthenticatedExecute: 0,
    semanticStartAuthenticatedExecute: 1,
    ...override,
  });
}

function payload(counts: Migration0041RemoteCounts) {
  return [
    `${project004Migration0041Contract.version}:PREFLIGHT`,
    counts.migrationCount,
    counts.prefixMigrationCount,
    counts.migrationFirst,
    counts.migrationLast,
    counts.migration0041Count,
    counts.foreignMigrationCount,
    counts.migration0041ChecksumMatches,
    counts.tableCount,
    counts.provenanceFieldCount,
    counts.supportFieldCount,
    counts.provenanceConstraintCount,
    counts.provenanceTriggerCount,
    counts.provenanceFunctionCount,
    counts.oldStartAuthenticatedExecute,
    counts.semanticStartAuthenticatedExecute,
    counts.functionGrantLeakCount,
    counts.partialProvenanceRowCount,
    counts.generatedQuestionRows,
    counts.legacyQuestionRows,
    counts.pendingQuestionRows,
    counts.semanticQuestionRows,
    counts.attemptRows,
    counts.privateSolutionRows,
    counts.generatedAnswerRows,
    counts.materializedAnswerRows,
    counts.learningHistoryRows,
    counts.exactActiveReleaseCount,
    counts.otherReleaseCount,
    counts.releaseUnits,
    counts.releaseQuestions,
    counts.releaseSolutions,
    counts.releaseOutcomes,
    counts.legacyUnits,
    counts.legacyQuestions,
    counts.legacySolutions,
    counts.legacyDiagnosticRows,
    counts.adaptiveReleaseCount,
    counts.adaptiveExactDisabledCount,
    counts.adaptiveEnabledCount,
    counts.rlsGapCount,
    counts.privateGrantLeakCount,
    counts.primaryKeyContractCount,
  ].join("|");
}

function stagedPayload(
  stage: string,
  counts: Migration0041RemoteCounts,
) {
  const values: Record<string, Array<string | number>> = {
    CONNECTION_PROBE: [1],
    SERVER_CAPABILITY: [1, 1],
    MIGRATION_HISTORY_DISCOVERY: [
      1, 1, 1, 1, 0, 1, 1, 0, 0, 0,
    ],
    MIGRATION_HISTORY_READ: [
      counts.migrationCount,
      counts.prefixMigrationCount,
      counts.migrationFirst,
      counts.migrationLast,
      counts.migration0041Count,
      counts.foreignMigrationCount,
      counts.missingMigrationCount,
      counts.duplicateMigrationCount,
      counts.migration0041SourceHashMatches,
      counts.migration0041ChecksumMatches,
    ],
    SCHEMA_DISCOVERY: [1, 1, 1],
    TABLE_CONTRACT: [
      counts.primaryKeyContractCount,
      counts.attemptRows,
      counts.privateSolutionRows,
      counts.generatedAnswerRows,
      counts.materializedAnswerRows,
      counts.learningHistoryRows,
    ],
    COLUMN_PROVENANCE: [
      counts.provenanceFieldCount,
      counts.supportFieldCount,
      counts.partialProvenanceRowCount,
      counts.generatedQuestionRows,
      counts.legacyQuestionRows,
      counts.pendingQuestionRows,
      counts.semanticQuestionRows,
    ],
    CONSTRAINT_DISCOVERY: [
      counts.provenanceConstraintCount,
    ],
    TRIGGER_DISCOVERY: [counts.provenanceTriggerCount],
    FUNCTION_DISCOVERY: [
      counts.provenanceFunctionCount,
      counts.oldStartAuthenticatedExecute,
      counts.semanticStartAuthenticatedExecute,
      counts.functionGrantLeakCount,
    ],
    RELEASE_DIAGNOSTIC: [
      counts.exactActiveReleaseCount,
      counts.otherReleaseCount,
      counts.releaseUnits,
      counts.releaseQuestions,
      counts.releaseSolutions,
      counts.releaseOutcomes,
      counts.legacyUnits,
      counts.legacyQuestions,
      counts.legacySolutions,
      counts.legacyDiagnosticRows,
      counts.adaptiveReleaseCount,
      counts.adaptiveExactDisabledCount,
      counts.adaptiveEnabledCount,
    ],
    RLS_DIAGNOSTIC: [
      counts.rlsGapCount,
      counts.privateGrantLeakCount,
    ],
  };
  return [
    `${project004Migration0041Contract.version}:QUERY:${stage}`,
    ...(values[stage] ?? []),
  ].join("|");
}

function mockRunner(options?: {
  states?: Migration0041RemoteCounts[];
  apply?: "PASS" | "FAIL";
  connect?: "PASS" | "PASSWORD_FAIL" | "DNS_THEN_POOLER";
  queryFailure?: {
    stage: string;
    result: {
      ok: boolean;
      stdout: string;
      stderr: string;
      timedOut?: boolean;
    };
  };
}) {
  const states = [...(options?.states ?? [beforeCounts()])];
  let currentState = states[0] ?? beforeCounts();
  let mutationCalls = 0;
  const queryInvocations: Array<{
    args: string[];
    environment: NodeJS.ProcessEnv;
    input: string;
  }> = [];
  const runner: RemoteDevCommandRunner = (
    command,
    args,
    _environment,
    input,
  ) => {
    if (command === "supabase") {
      return {
        ok: true,
        stdout: JSON.stringify([
          {
            ref: sampleRef,
            name: "plave-project004-dev-clean",
            status: "ACTIVE_HEALTHY",
            region: "ap-southeast-1",
          },
        ]),
        stderr: "",
      };
    }
    if (
      args.some((arg) =>
        arg.includes("PROJECT004_REMOTE_CONNECTIVITY_V1")
      )
    ) {
      if (
        options?.connect === "DNS_THEN_POOLER" &&
        _environment.PGUSER === "postgres"
      ) {
        return {
          ok: false,
          stdout: "",
          stderr: "could not translate host name",
        };
      }
      return options?.connect === "PASSWORD_FAIL"
        ? {
            ok: false,
            stdout: "",
            stderr: "password authentication failed",
          }
        : {
            ok: true,
            stdout: "PROJECT004_REMOTE_CONNECTIVITY_V1|1\n",
            stderr: "",
          };
    }
    if (
      input?.includes(
        `${project004Migration0041Contract.version}:QUERY:`,
      )
    ) {
      queryInvocations.push({
        args: [...args],
        environment: { ..._environment },
        input,
      });
      const stage = input.match(
        new RegExp(
          `${project004Migration0041Contract.version}:QUERY:([A-Z_]+)`,
          "u",
        ),
      )?.[1] ?? "";
      if (stage === "CONNECTION_PROBE") {
        currentState = states[0] ?? beforeCounts();
      }
      if (options?.queryFailure?.stage === stage) {
        return options.queryFailure.result;
      }
      if (stage === "MIGRATION_HISTORY_READ") {
        currentState = states.shift() ?? beforeCounts();
      }
      return {
        ok: true,
        stdout: `${stagedPayload(stage, currentState)}\n`,
        stderr: "",
      };
    }
    if (input?.includes("PROJECT004_PREFIX_0038_SEMANTIC_V1")) {
      return { ok: true, stdout: "semantic-fixture\n", stderr: "" };
    }
    if (
      input?.includes(
        `${project004Migration0041Contract.version}:STAGE|PRECONDITION`,
      )
    ) {
      mutationCalls += 1;
      if (options?.apply === "FAIL") {
        return {
          ok: false,
          stdout:
            `${project004Migration0041Contract.version}:STAGE|MIGRATION_DDL\n`,
          stderr: "ERROR: 23514: check constraint failed",
        };
      }
      return {
        ok: true,
        stdout:
          `${project004Migration0041Contract.version}:COMMIT|0041|` +
          `${project004Migration0041Contract.migrationSha256}\n`,
        stderr: "",
      };
    }
    return { ok: false, stdout: "", stderr: "unexpected" };
  };
  return {
    runner,
    mutationCalls: () => mutationCalls,
    queryInvocations: () => queryInvocations,
  };
}

test("local package pins exact 0001-0040 baseline and 0041 checksum", () => {
  const local = loadMigration0041LocalContract(repositoryRoot);
  assert.equal(local.plan.migrationCount, 40);
  assert.match(local.migrationSource, /^begin;/u);
  assert.doesNotMatch(local.migrationBody, /^begin;/u);
  assert.doesNotMatch(local.migrationBody, /commit;\s*$/u);
  assert.equal(
    project004Migration0041Contract.authorizationStatus,
    "OWNER_APPROVED_FOR_ONE_TIME_APPLY",
  );
  assert.equal(
    project004Migration0041Contract.expectedExistingAttemptRows,
    5,
  );
  assert.equal(
    project004Migration0041Contract.expectedExistingLearningHistoryRows,
    41,
  );
});

test("local 0041 checksum drift fails before any remote command", () => {
  const { temporaryRoot, root } = createWorkspace();
  try {
    writeFileSync(
      join(
        root,
        "supabase/migrations",
        project004Migration0041Contract.migrationFilename,
      ),
      "\n-- drift\n",
      { flag: "a" },
    );
    assert.throws(
      () => loadMigration0041LocalContract(root),
      /MIGRATION_0041_CHECKSUM/u,
    );
    let calls = 0;
    const report = executeMigration0041RemotePreflight({
      environment: environment(),
      candidateRoot: root,
      runner: (...args) => {
        calls += 1;
        return mockRunner().runner(...args);
      },
    });
    assert.equal(report.ok, false);
    assert.equal(calls, 0);
    assert.match(
      report.rootFailureCode,
      /MIGRATION_0041_CHECKSUM/u,
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("historical 0001-0040 prefix checksum drift fails before remote access", () => {
  const { temporaryRoot, root } = createWorkspace();
  try {
    writeFileSync(
      join(
        root,
        "supabase/migrations",
        "0040_deterministic_on_demand_curriculum.sql",
      ),
      "\n-- prefix drift\n",
      { flag: "a" },
    );
    let calls = 0;
    const report = executeMigration0041RemotePreflight({
      environment: environment(),
      candidateRoot: root,
      runner: (...args) => {
        calls += 1;
        return mockRunner().runner(...args);
      },
    });
    assert.equal(report.ok, false);
    assert.equal(calls, 0);
    assert.notEqual(report.rootFailureCode, "NONE");
  } finally {
    rmSync(temporaryRoot, {
      recursive: true,
      force: true,
    });
  }
});

test("preflight SQL is read-only, aggregate-only, and classifies exactly one pending migration", () => {
  const sql = buildMigration0041RemotePreflightSql();
  assert.match(sql, /^(\s*)begin read only;/u);
  assert.match(sql, /supabase_migrations[.]schema_migrations/u);
  assert.match(sql, /curriculum_generated_questions/u);
  assert.equal(
    isReadOnlySqlCommand(["--command", sql]),
    true,
  );
  assert.equal(
    classifyMigration0041RemotePhase(beforeCounts()),
    "BEFORE_0041",
  );
  assert.equal(
    classifyMigration0041RemotePhase(appliedCounts()),
    "ALREADY_APPLIED",
  );
});

test("all staged remote queries are stdin-only read-only transactions without mutation statements", () => {
  const stages = [
    "CONNECTION_PROBE",
    "SERVER_CAPABILITY",
    "MIGRATION_HISTORY_DISCOVERY",
    "MIGRATION_HISTORY_READ",
    "SCHEMA_DISCOVERY",
    "TABLE_CONTRACT",
    "COLUMN_PROVENANCE",
    "CONSTRAINT_DISCOVERY",
    "TRIGGER_DISCOVERY",
    "FUNCTION_DISCOVERY",
    "RELEASE_DIAGNOSTIC",
    "RLS_DIAGNOSTIC",
  ] as const;
  for (const stage of stages) {
    const sql = buildMigration0041RemoteQuerySql({
      stage,
      migrationHistory:
        stage === "MIGRATION_HISTORY_READ"
          ? {
              tableExists: 1,
              versionColumnExists: 1,
              versionTextCompatible: 1,
              statementsTextArray: 0,
              statementsText: 0,
              nameColumnExists: 0,
              nameTextCompatible: 0,
              checksumColumnExists: 0,
              checksumTextCompatible: 0,
              checksumByteaCompatible: 0,
            }
          : undefined,
    });
    assert.match(sql, /^\s*begin read only;/u);
    assert.match(sql, /\nrollback;\s*$/u);
    assert.doesNotMatch(
      sql,
      /^\s*(?:insert|update|delete|alter|create|drop|grant|revoke|truncate|call)\b/imu,
    );
  }
});

test("migration history is discovered before optional checksum columns are referenced", () => {
  const discovery = buildMigration0041RemoteQuerySql({
    stage: "MIGRATION_HISTORY_DISCOVERY",
  });
  assert.match(discovery, /information_schema[.]columns/u);
  assert.doesNotMatch(
    discovery,
    /extensions[.]digest|statements\[1\]/u,
  );

  const withoutChecksumMetadata =
    buildMigration0041RemoteQuerySql({
      stage: "MIGRATION_HISTORY_READ",
      migrationHistory: {
        tableExists: 1,
        versionColumnExists: 1,
        versionTextCompatible: 1,
        statementsTextArray: 0,
        statementsText: 0,
        nameColumnExists: 0,
        nameTextCompatible: 0,
        checksumColumnExists: 0,
        checksumTextCompatible: 0,
        checksumByteaCompatible: 0,
      },
    });
  assert.doesNotMatch(
    withoutChecksumMetadata,
    /extensions[.]digest|statements\[1\]|\bname::text\b/u,
  );
  assert.match(
    withoutChecksumMetadata,
    /from supabase_migrations[.]schema_migrations/u,
  );
});

test("migration history query adapts to text-array, text, and absent statements without digesting an array", () => {
  const base = {
    tableExists: 1,
    versionColumnExists: 1,
    versionTextCompatible: 1,
    nameColumnExists: 1,
    nameTextCompatible: 1,
    checksumColumnExists: 0,
    checksumTextCompatible: 0,
    checksumByteaCompatible: 0,
  } as const;
  const arraySql = buildMigration0041RemoteQuerySql({
    stage: "MIGRATION_HISTORY_READ",
    migrationHistory: {
      ...base,
      statementsTextArray: 1,
      statementsText: 0,
    },
  });
  assert.match(arraySql, /statements\[1\]::text/u);
  assert.match(arraySql, /'sha256'::text/u);
  assert.match(arraySql, /pg_catalog[.]encode/u);
  assert.doesNotMatch(arraySql, /extensions[.]encode/u);
  assert.doesNotMatch(arraySql, /digest\s*\(\s*statements\s*,/u);

  const textSql = buildMigration0041RemoteQuerySql({
    stage: "MIGRATION_HISTORY_READ",
    migrationHistory: {
      ...base,
      statementsTextArray: 0,
      statementsText: 1,
    },
  });
  assert.match(textSql, /statements::text/u);
  assert.doesNotMatch(textSql, /statements\[1\]/u);

  const absentSql = buildMigration0041RemoteQuerySql({
    stage: "MIGRATION_HISTORY_READ",
    migrationHistory: {
      ...base,
      nameColumnExists: 0,
      nameTextCompatible: 0,
      statementsTextArray: 0,
      statementsText: 0,
    },
  });
  assert.doesNotMatch(absentSql, /extensions[.]digest/u);
  assert.doesNotMatch(absentSql, /\bname\b/u);
});

test("migration history checksum capability is type-specific and never invented from statements", () => {
  const base = {
    tableExists: 1,
    versionColumnExists: 1,
    versionTextCompatible: 1,
    statementsTextArray: 0,
    statementsText: 0,
    nameColumnExists: 0,
    nameTextCompatible: 0,
  } as const;
  const textChecksum = buildMigration0041RemoteQuerySql({
    stage: "MIGRATION_HISTORY_READ",
    migrationHistory: {
      ...base,
      checksumColumnExists: 1,
      checksumTextCompatible: 1,
      checksumByteaCompatible: 0,
    },
  });
  assert.match(textChecksum, /checksum::text/u);
  assert.doesNotMatch(textChecksum, /digest\s*\(\s*checksum/iu);

  const byteaChecksum = buildMigration0041RemoteQuerySql({
    stage: "MIGRATION_HISTORY_READ",
    migrationHistory: {
      ...base,
      checksumColumnExists: 1,
      checksumTextCompatible: 0,
      checksumByteaCompatible: 1,
    },
  });
  assert.match(byteaChecksum, /checksum::bytea/u);
  assert.match(byteaChecksum, /pg_catalog[.]encode/u);
});

test("preflight response parser accepts one exact aggregate payload and rejects ambiguity", () => {
  const expected = beforeCounts();
  assert.deepEqual(
    parseMigration0041RemotePreflight(payload(expected)),
    expected,
  );
  assert.throws(
    () =>
      parseMigration0041RemotePreflight(
        `${payload(expected)}\n${payload(expected)}`,
      ),
    /MIGRATION_0041_PREFLIGHT_PAYLOAD_INVALID/u,
  );
});

test("missing migration-history catalog fails at discovery and later stages do not run", () => {
  const { temporaryRoot, root } = createWorkspace();
  try {
    const missingPayload =
      `${project004Migration0041Contract.version}:QUERY:` +
      "MIGRATION_HISTORY_DISCOVERY|0|0|0|0|0|0|0|0|0|0\n";
    const mock = mockRunner({
      queryFailure: {
        stage: "MIGRATION_HISTORY_DISCOVERY",
        result: {
          ok: true,
          stdout: missingPayload,
          stderr: "",
        },
      },
    });
    const report = executeMigration0041RemotePreflight({
      environment: environment(),
      candidateRoot: root,
      runner: mock.runner,
    });
    assert.equal(report.ok, false);
    assert.equal(
      report.rootFailureCode,
      "MIGRATION_0041_HISTORY_TABLE_UNAVAILABLE",
    );
    assert.equal(
      report.remoteQuery.failureStage,
      "MIGRATION_HISTORY_DISCOVERY",
    );
    assert.equal(
      report.remoteQuery.preconditionId,
      "MIGRATION_HISTORY_TABLE",
    );
    assert.equal(
      mock.queryInvocations().some((entry) =>
        entry.input.includes(":QUERY:SCHEMA_DISCOVERY"),
      ),
      false,
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("missing 0041 with migration history lacking optional checksum metadata remains readable", () => {
  const { temporaryRoot, root } = createWorkspace();
  try {
    const discoveryPayload =
      `${project004Migration0041Contract.version}:QUERY:` +
      "MIGRATION_HISTORY_DISCOVERY|1|1|1|0|0|0|0|0|0|0\n";
    const mock = mockRunner({
      queryFailure: {
        stage: "MIGRATION_HISTORY_DISCOVERY",
        result: {
          ok: true,
          stdout: discoveryPayload,
          stderr: "",
        },
      },
    });
    const report = executeMigration0041RemotePreflight({
      environment: environment(),
      candidateRoot: root,
      runner: mock.runner,
      semanticFingerprintVerifier: () => true,
    });
    assert.equal(report.ok, true);
    assert.equal(report.remotePhase, "BEFORE_0041");
    assert.equal(report.remoteQuery.readOnlyVerified, "PASS");
    assert.equal(
      report.remoteMigrationChecksumCapability,
      "UNAVAILABLE",
    );
    assert.equal(
      report.prefixSchemaFingerprint,
      "PASS",
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("null and duplicate staged payloads fail at the exact parser stage", () => {
  for (const stdout of [
    "",
    `${stagedPayload("CONSTRAINT_DISCOVERY", beforeCounts())}\n` +
      stagedPayload("CONSTRAINT_DISCOVERY", beforeCounts()),
  ]) {
    const { temporaryRoot, root } = createWorkspace();
    try {
      const mock = mockRunner({
        queryFailure: {
          stage: "CONSTRAINT_DISCOVERY",
          result: { ok: true, stdout, stderr: "" },
        },
      });
      const report = executeMigration0041RemotePreflight({
        environment: environment(),
        candidateRoot: root,
        runner: mock.runner,
      });
      assert.equal(report.ok, false);
      assert.equal(
        report.rootFailureCode,
        "MIGRATION_0041_QUERY_OUTPUT_UNRECOGNIZED",
      );
      assert.equal(
        report.remoteQuery.failureStage,
        "CONSTRAINT_DISCOVERY",
      );
      assert.equal(
        report.remoteQuery.failedStatementClass,
        "RESPONSE_PARSER",
      );
    } finally {
      rmSync(temporaryRoot, {
        recursive: true,
        force: true,
      });
    }
  }
});

test("multiline NOTICE and footer output preserve one exact staged payload", () => {
  const { temporaryRoot, root } = createWorkspace();
  try {
    const mock = mockRunner({
      queryFailure: {
        stage: "CONSTRAINT_DISCOVERY",
        result: {
          ok: true,
          stdout:
            "NOTICE: aggregate only\n" +
            stagedPayload(
              "CONSTRAINT_DISCOVERY",
              beforeCounts(),
            ) +
            "\n(1 row)\n",
          stderr: "NOTICE: read-only\n",
        },
      },
    });
    const report = executeMigration0041RemotePreflight({
      environment: environment(),
      candidateRoot: root,
      runner: mock.runner,
      semanticFingerprintVerifier: () => true,
    });
    assert.equal(report.ok, true);
    assert.equal(report.remoteQuery.sqlstate, "NONE");
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("preflight rejects foreign pending migration and partial apply", () => {
  assert.equal(
    classifyMigration0041RemotePhase(
      beforeCounts({
        migrationCount: 41,
        migrationLast: "0099",
        foreignMigrationCount: 1,
      }),
    ),
    "PARTIAL_OR_DRIFTED",
  );
  assert.equal(
    classifyMigration0041RemotePhase(
      beforeCounts({
        provenanceFieldCount: 1,
        supportFieldCount: 1,
      }),
    ),
    "PARTIAL_OR_DRIFTED",
  );
  assert.equal(
    classifyMigration0041RemotePhase(
      beforeCounts({ missingMigrationCount: 1 }),
    ),
    "PARTIAL_OR_DRIFTED",
  );
  assert.equal(
    classifyMigration0041RemotePhase(
      beforeCounts({ duplicateMigrationCount: 1 }),
    ),
    "PARTIAL_OR_DRIFTED",
  );
});

test("non-text migration version metadata fails closed before history read", () => {
  const { temporaryRoot, root } = createWorkspace();
  try {
    const discoveryPayload =
      `${project004Migration0041Contract.version}:QUERY:` +
      "MIGRATION_HISTORY_DISCOVERY|1|1|0|1|0|1|1|0|0|0\n";
    const mock = mockRunner({
      queryFailure: {
        stage: "MIGRATION_HISTORY_DISCOVERY",
        result: {
          ok: true,
          stdout: discoveryPayload,
          stderr: "",
        },
      },
    });
    const report = executeMigration0041RemotePreflight({
      environment: environment(),
      candidateRoot: root,
      runner: mock.runner,
    });
    assert.equal(report.ok, false);
    assert.equal(
      report.rootFailureCode,
      "MIGRATION_0041_HISTORY_VERSION_TYPE_UNSUPPORTED",
    );
    assert.equal(
      report.remoteQuery.preconditionId,
      "MIGRATION_HISTORY_VERSION_TYPE",
    );
    assert.equal(
      mock.queryInvocations().some((entry) =>
        entry.input.includes(":QUERY:MIGRATION_HISTORY_READ"),
      ),
      false,
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("remote source and checksum drift is never accepted as already applied", () => {
  const drift = appliedCounts({
    migration0041ChecksumMatches: 0,
    migration0041SourceHashMatches: 0,
  });
  assert.equal(
    classifyMigration0041RemotePhase(drift),
    "PARTIAL_OR_DRIFTED",
  );
});

test("remote source and checksum drift returns one root failure and performs no mutation", () => {
  const { temporaryRoot, root } = createWorkspace();
  try {
    const mock = mockRunner({
      states: [
        appliedCounts({
          migration0041ChecksumMatches: 0,
          migration0041SourceHashMatches: 0,
        }),
      ],
    });
    const report = executeMigration0041RemotePreflight({
      environment: environment(),
      candidateRoot: root,
      runner: mock.runner,
    });
    assert.equal(report.ok, false);
    assert.equal(
      report.rootFailureCode,
      "REMOTE_MIGRATION_0041_SOURCE_OR_CHECKSUM_DRIFT",
    );
    assert.equal(
      report.remoteMigration0041Checksum,
      "UNAVAILABLE",
    );
    assert.equal(report.remoteMigration0041SourceHash, "FAIL");
    assert.equal(report.currentRunMutationPerformed, "NO");
    assert.equal(mock.mutationCalls(), 0);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("preflight uses canonical target/auth/connectivity and returns eligible without mutation", () => {
  const { temporaryRoot, root } = createWorkspace();
  try {
    const mock = mockRunner({ connect: "DNS_THEN_POOLER" });
    const report = executeMigration0041RemotePreflight({
      environment: environment(),
      candidateRoot: root,
      runner: mock.runner,
      semanticFingerprintVerifier: () => true,
    });
    assert.equal(report.ok, true);
    assert.equal(report.endpointMode, "POOLER_SESSION");
    assert.equal(report.remotePhase, "BEFORE_0041");
    assert.equal(report.migration0041Eligible, "YES");
    assert.equal(report.generatedRuntimeRemoteOff, "PASS");
    assert.equal(report.currentRunMutationPerformed, "NO");
    assert.equal(mock.mutationCalls(), 0);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("target mismatch and password failure stop before schema inspection", () => {
  const { temporaryRoot, root } = createWorkspace();
  try {
    let calls = 0;
    const mismatch = executeMigration0041RemotePreflight({
      environment: {
        ...environment(),
        PLAVE_PROJECT004_REMOTE_TARGET_NAME:
          "plave-project004-dev",
      },
      candidateRoot: root,
      runner: (...args) => {
        calls += 1;
        return mockRunner().runner(...args);
      },
    });
    assert.equal(mismatch.ok, false);
    assert.equal(calls, 0);

    const password = executeMigration0041RemotePreflight({
      environment: environment(),
      candidateRoot: root,
      runner: mockRunner({
        connect: "PASSWORD_FAIL",
      }).runner,
    });
    assert.equal(password.ok, false);
    assert.equal(
      password.rootFailureCode,
      "DATABASE_PASSWORD_INVALID",
    );
    assert.equal(password.counts, null);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("SQLSTATE, permission, timeout and connection failures are sanitized and stage-specific", () => {
  const cases = [
    {
      result: {
        ok: false,
        stdout: "",
        stderr: "ERROR: 42P01: relation unavailable",
      },
      stderrClass: "UNDEFINED_TABLE",
      rootCode: "MIGRATION_0041_QUERY_UNDEFINED_TABLE",
      sqlstate: "42P01",
    },
    {
      result: {
        ok: false,
        stdout: "",
        stderr: "ERROR: 42501: permission denied",
      },
      stderrClass: "PERMISSION_DENIED",
      rootCode: "MIGRATION_0041_QUERY_PERMISSION_DENIED",
      sqlstate: "42501",
    },
    {
      result: {
        ok: false,
        stdout: "",
        stderr: "",
        timedOut: true,
      },
      stderrClass: "STATEMENT_TIMEOUT",
      rootCode: "MIGRATION_0041_QUERY_TIMEOUT",
      sqlstate: "UNKNOWN",
    },
    {
      result: {
        ok: false,
        stdout: "",
        stderr: "server closed the connection unexpectedly",
      },
      stderrClass: "CONNECTION_FAILURE",
      rootCode: "MIGRATION_0041_QUERY_CONNECTION_FAILED",
      sqlstate: "UNKNOWN",
    },
  ] as const;
  for (const item of cases) {
    const { temporaryRoot, root } = createWorkspace();
    try {
      const mock = mockRunner({
        queryFailure: {
          stage: "COLUMN_PROVENANCE",
          result: item.result,
        },
      });
      const report = executeMigration0041RemotePreflight({
        environment: environment(),
        candidateRoot: root,
        runner: mock.runner,
      });
      assert.equal(report.ok, false);
      assert.equal(report.rootFailureCode, item.rootCode);
      assert.equal(
        report.remoteQuery.failureStage,
        "COLUMN_PROVENANCE",
      );
      assert.equal(
        report.remoteQuery.failedStatementClass,
        "COLUMN_CATALOG_QUERY",
      );
      assert.equal(
        report.remoteQuery.stderrClass,
        item.stderrClass,
      );
      assert.equal(report.remoteQuery.sqlstate, item.sqlstate);
      const rendered = renderMigration0041Preflight(report);
      assert.doesNotMatch(
        rendered,
        /relation unavailable|permission denied|server closed/iu,
      );
    } finally {
      rmSync(temporaryRoot, {
        recursive: true,
        force: true,
      });
    }
  }
});

test("stderr classifier recognizes undefined columns without returning raw stderr", () => {
  assert.equal(
    classifyMigration0041RemoteQueryStderr({
      ok: false,
      stdout: "",
      stderr: "ERROR: 42703: column secret_name does not exist",
    }),
    "UNDEFINED_COLUMN",
  );
});

test("SQLSTATE 42883 exposes only a stable missing-routine class", () => {
  const wrongEncode = {
    ok: false,
    stdout: "",
    stderr:
      "ERROR: 42883: function extensions.encode(bytea, unknown) does not exist",
  };
  assert.equal(
    classifyMigration0041MissingRoutine(wrongEncode),
    "ENCODE_WRONG_SCHEMA",
  );
  assert.equal(
    classifyMigration0041MissingRoutine({
      ...wrongEncode,
      stderr:
        "ERROR: 42883: function digest(text[], unknown) does not exist",
    }),
    "DIGEST_ARRAY_INPUT",
  );

  const { temporaryRoot, root } = createWorkspace();
  try {
    const mock = mockRunner({
      queryFailure: {
        stage: "MIGRATION_HISTORY_READ",
        result: wrongEncode,
      },
    });
    const report = executeMigration0041RemotePreflight({
      environment: environment(),
      candidateRoot: root,
      runner: mock.runner,
    });
    assert.equal(report.ok, false);
    assert.equal(
      report.rootFailureCode,
      "MIGRATION_0041_QUERY_ROUTINE_UNSUPPORTED",
    );
    assert.equal(report.remoteQuery.sqlstate, "42883");
    assert.equal(
      report.remoteQuery.missingRoutineClass,
      "ENCODE_WRONG_SCHEMA",
    );
    assert.doesNotMatch(
      renderMigration0041Preflight(report),
      /extensions[.]encode|bytea|unknown/iu,
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("remote state queries use universal activation stdin transport and pooler-safe environment", () => {
  const { temporaryRoot, root } = createWorkspace();
  try {
    const mock = mockRunner({ connect: "DNS_THEN_POOLER" });
    const report = executeMigration0041RemotePreflight({
      environment: environment(),
      candidateRoot: root,
      runner: mock.runner,
      semanticFingerprintVerifier: () => true,
    });
    assert.equal(report.ok, true);
    assert.equal(report.endpointMode, "POOLER_SESSION");
    assert.equal(mock.queryInvocations().length, 12);
    for (const invocation of mock.queryInvocations()) {
      assert.deepEqual(
        invocation.args,
        [...project004UniversalActivationPsqlArgs],
      );
      assert.equal(
        (invocation.args as readonly string[]).includes(
          "--command",
        ),
        false,
      );
      assert.match(invocation.input, /^\s*begin read only;/u);
      assert.equal(
        invocation.environment.PGSSLMODE,
        "require",
      );
      assert.equal(
        invocation.environment.PGPASSWORD,
        samplePassword,
      );
      assert.equal(
        invocation.environment.PGUSER,
        `postgres.${sampleRef}`,
      );
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("controlled SQL is one transaction with advisory lock, exact history source, and no db push", () => {
  const local = loadMigration0041LocalContract(repositoryRoot);
  const sql = buildMigration0041ControlledApplySql(local);
  const executableSql = sql.replace(
    /\$plave_migration_0041_source\$[\s\S]*?\$plave_migration_0041_source\$/u,
    "'PINNED_MIGRATION_SOURCE'",
  );
  assert.equal(
    (executableSql.match(/\nbegin;\n/gu) ?? []).length,
    1,
  );
  assert.equal(
    (executableSql.match(/\ncommit;\n/gu) ?? []).length,
    1,
  );
  assert.match(sql, /pg_advisory_xact_lock/u);
  assert.match(sql, /migration_0041_history_boundary/u);
  assert.match(
    sql,
    /PRECONDITION:HISTORY_BASELINE/u,
  );
  assert.match(
    sql,
    /insert into supabase_migrations[.]schema_migrations/u,
  );
  assert.match(
    sql,
    new RegExp(project004Migration0041Contract.migrationSha256, "u"),
  );
  assert.doesNotMatch(sql, /supabase db push|include-seed|db reset/iu);
  assert.doesNotMatch(
    sql,
    /\b(?:insert|update|delete)\s+(?:into\s+|from\s+)?public[.](?:curriculum_releases|adaptive_practice_releases|curriculum_attempts)\b/iu,
  );
  assert.doesNotMatch(
    sql,
    /\b(?:insert|update|delete)\s+(?:into\s+|from\s+)?private[.]curriculum_generated_solutions\b/iu,
  );
});

test("transaction parser separates precondition, SQLSTATE, rollback stage, and response errors", () => {
  const failed = parseMigration0041TransactionResponse({
    ok: false,
    stdout:
      `${project004Migration0041Contract.version}:STAGE|PRECONDITION\n`,
    stderr:
      "ERROR: P0001: PROJECT004_0041:PRECONDITION:MIGRATION_PREFIX",
  });
  assert.equal(failed.sqlstate, "P0001");
  assert.equal(failed.failureStage, "PRECONDITION");
  assert.equal(
    failed.failedStatementClass,
    "PRECONDITION_DO_BLOCK",
  );
  assert.equal(failed.preconditionId, "MIGRATION_PREFIX");

  const malformed = parseMigration0041TransactionResponse({
    ok: true,
    stdout: "",
    stderr: "",
  });
  assert.equal(
    malformed.parserFailureCode,
    "MIGRATION_0041_COMMIT_SENTINEL_MISSING",
  );
});

test("audited runner blocks every unexpected or second mutation path", () => {
  let delegated = 0;
  const local = loadMigration0041LocalContract(repositoryRoot);
  const sql = buildMigration0041ControlledApplySql(local);
  const audited = createAuditedMigration0041Runner({
    delegate: () => {
      delegated += 1;
      return {
        ok: true,
        stdout:
          `${project004Migration0041Contract.version}:COMMIT|0041|` +
          project004Migration0041Contract.migrationSha256,
        stderr: "",
      };
    },
    applySqlSha256: createHash("sha256")
      .update(sql)
      .digest("hex"),
  });
  const args = [
    "--no-psqlrc",
    "--quiet",
    "--tuples-only",
    "--no-align",
    "--set",
    "ON_ERROR_STOP=1",
    "--set",
    "VERBOSITY=verbose",
  ];
  assert.equal(
    audited.runner("psql", args, process.env, sql).ok,
    true,
  );
  assert.equal(
    audited.runner("psql", args, process.env, sql).ok,
    false,
  );
  assert.equal(
    audited.runner(
      "supabase",
      ["db", "push"],
      process.env,
      "",
    ).ok,
    false,
  );
  assert.equal(delegated, 1);
  assert.equal(audited.counts.applyTransaction, 1);
  assert.equal(audited.counts.unexpected, 2);
});

test("failed transaction consumes approval once and confirms rollback read-only", () => {
  const { temporaryRoot, root } = createWorkspace();
  try {
    const mock = mockRunner({
      states: [beforeCounts(), beforeCounts()],
      apply: "FAIL",
    });
    let consumed = 0;
    const report = executeMigration0041ControlledApply({
      environment: environment(),
      candidateRoot: root,
      runner: mock.runner,
      approval: project004Migration0041Contract.approval,
      authorizationStatus: "OWNER_APPROVED_FOR_ONE_TIME_APPLY",
      consumeApproval: () => {
        consumed += 1;
        return consumed === 1;
      },
      semanticFingerprintVerifier: () => true,
    });
    assert.equal(report.ok, false);
    assert.equal(report.applyAttempts, 1);
    assert.equal(report.approvalConsumed, true);
    assert.equal(report.transactionRollback, "PASS");
    assert.equal(report.currentRunMutationPerformed, "NO");
    assert.equal(mock.mutationCalls(), 1);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("approved attempt and learning-history baseline drift stops before approval consumption or mutation", () => {
  for (const changed of [
    { attemptRows: 6 },
    { learningHistoryRows: 42 },
  ]) {
    const { temporaryRoot, root } = createWorkspace();
    try {
      const mock = mockRunner({
        states: [beforeCounts(changed)],
      });
      let consumed = 0;
      const report = executeMigration0041ControlledApply({
        environment: environment(),
        candidateRoot: root,
        runner: mock.runner,
        approval: project004Migration0041Contract.approval,
        consumeApproval: () => {
          consumed += 1;
          return true;
        },
        semanticFingerprintVerifier: () => true,
      });
      assert.equal(report.ok, false);
      assert.equal(
        report.rootFailureCode,
        "MIGRATION_0041_APPROVED_HISTORY_BASELINE_CHANGED",
      );
      assert.equal(report.applyAttempts, 0);
      assert.equal(report.approvalConsumed, false);
      assert.equal(consumed, 0);
      assert.equal(mock.mutationCalls(), 0);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  }
});

test("successful apply runs one mutation and verifies post-state without seeding history", () => {
  const { temporaryRoot, root } = createWorkspace();
  try {
    const mock = mockRunner({
      states: [beforeCounts(), appliedCounts()],
      apply: "PASS",
    });
    const report = executeMigration0041ControlledApply({
      environment: environment(),
      candidateRoot: root,
      runner: mock.runner,
      approval: project004Migration0041Contract.approval,
      consumeApproval: () => true,
      semanticFingerprintVerifier: () => true,
    });
    assert.equal(report.ok, true);
    assert.equal(report.status, "APPLIED");
    assert.equal(report.applyAttempts, 1);
    assert.equal(report.postApplyDiagnostic, "PASS");
    assert.equal(report.historyCountsUnchanged, "PASS");
    assert.equal(report.currentRunMutationPerformed, "YES");
    assert.equal(mock.mutationCalls(), 1);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("post-apply history drift fails the operation after the single transaction", () => {
  const { temporaryRoot, root } = createWorkspace();
  try {
    const mock = mockRunner({
      states: [
        beforeCounts(),
        appliedCounts({ learningHistoryRows: 20 }),
      ],
      apply: "PASS",
    });
    const report = executeMigration0041ControlledApply({
      environment: environment(),
      candidateRoot: root,
      runner: mock.runner,
      approval: project004Migration0041Contract.approval,
      authorizationStatus:
        "OWNER_APPROVED_FOR_ONE_TIME_APPLY",
      consumeApproval: () => true,
      semanticFingerprintVerifier: () => true,
    });
    assert.equal(report.ok, false);
    assert.equal(
      report.rootFailureCode,
      "MIGRATION_0041_POST_APPLY_DIAGNOSTIC_FAILED",
    );
    assert.equal(report.applyAttempts, 1);
    assert.equal(mock.mutationCalls(), 1);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("already-applied state is a no-op and consumes no approval", () => {
  const { temporaryRoot, root } = createWorkspace();
  try {
    const mock = mockRunner({ states: [appliedCounts()] });
    let consumed = 0;
    const report = executeMigration0041ControlledApply({
      environment: environment(),
      candidateRoot: root,
      runner: mock.runner,
      approval: "",
      consumeApproval: () => {
        consumed += 1;
        return true;
      },
    });
    assert.equal(report.ok, true);
    assert.equal(report.status, "ALREADY_APPLIED");
    assert.equal(report.applyAttempts, 0);
    assert.equal(report.currentRunMutationPerformed, "NO");
    assert.equal(consumed, 0);
    assert.equal(mock.mutationCalls(), 0);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("approval receipt is mode 0600 and cannot be consumed twice", () => {
  const { temporaryRoot, root } = createWorkspace();
  try {
    assert.equal(consumeMigration0041Approval(root), true);
    assert.equal(consumeMigration0041Approval(root), false);
    const receipt = readFileSync(
      join(
        root,
        project004Migration0041Contract.approvalReceipt,
      ),
      "utf8",
    );
    assert.doesNotMatch(
      receipt,
      /password|projectRef|token|url/iu,
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("sanitized renderers keep one marker per line and expose no credential-bearing values", () => {
  const report = {
    ok: true,
    project004Canonical: "PASS" as const,
    remoteIdentityGuard: "PASS" as const,
    endpointMode: "POOLER_SESSION" as const,
    localPrefixChecksums: "PASS" as const,
    localMigration0041Checksum: "PASS" as const,
    prefixSchemaFingerprint: "PASS" as const,
    remoteMigration0041Checksum: "NOT_APPLICABLE" as const,
    remoteMigration0041SourceHash: "NOT_APPLICABLE" as const,
    generatedRuntimeRemoteOff: "PASS" as const,
    remotePhase: "BEFORE_0041" as const,
    migration0041Eligible: "YES" as const,
    releaseContract: "PASS" as const,
    grade1Boundary: "PASS" as const,
    adaptivePilotDisabled: "PASS" as const,
    rlsPrivateBoundary: "PASS" as const,
    counts: beforeCounts(),
    config: null,
    resolvedEndpoint: null,
    rootFailureCode: "NONE",
    currentRunMutationPerformed: "NO" as const,
    remoteQuery: {
      sqlstate: "NONE",
      failureStage: "NONE" as const,
      failedStatementClass: "NONE" as const,
      preconditionId: "NONE",
      stderrClass: "NONE" as const,
      connectionVerified: "PASS" as const,
      readOnlyVerified: "PASS" as const,
      missingRoutineClass: "NONE" as const,
    },
    remoteMigrationChecksumCapability: "UNAVAILABLE" as const,
  };
  const output = renderMigration0041Preflight(report);
  assert.match(
    output,
    /^REMOTE_CONNECTION_VERIFIED=PASS$/mu,
  );
  assert.match(
    output,
    /^REMOTE_READ_ONLY_VERIFIED=PASS$/mu,
  );
  assert.match(output, /^REMOTE_QUERY_SQLSTATE=NONE$/mu);
  assert.match(output, /^MIGRATION_0041_ELIGIBLE=YES$/mu);
  assert.match(
    output,
    /^CURRENT_RUN_MUTATION_PERFORMED=NO$/mu,
  );
  assert.doesNotMatch(output, new RegExp(sampleRef, "u"));
  assert.doesNotMatch(output, new RegExp(samplePassword, "u"));
  assert.doesNotMatch(output, /=YES[A-Z_]+=/u);

  const operation = renderMigration0041Operation({
    ok: false,
    status: "FAILED",
    preflight: report,
    postflight: null,
    applyAttempts: 0,
    approvalConsumed: false,
    postApplyDiagnostic: "NOT_RUN",
    historyCountsUnchanged: "NOT_RUN",
    transactionRollback: "NOT_RUN",
    sqlstate: "NOT_RUN",
    failureStage: "NONE",
    failedStatementClass: "NONE",
    preconditionId: "NONE",
    currentRunMutationPerformed: "NO",
    rootFailureCode: "MIGRATION_0041_OWNER_APPROVAL_REQUIRED",
  });
  assert.match(
    operation,
    /^ROOT_FAILURE_CODE=MIGRATION_0041_OWNER_APPROVAL_REQUIRED$/mu,
  );
});

test("Node 22 staged preflight smoke executes without prompt or remote access", () => {
  const result = spawnSync(
    "npm",
    [
      "run",
      "--silent",
      "smoke:remote-migration-0041-preflight",
    ],
    {
      cwd: repositoryRoot,
      env: process.env,
      encoding: "utf8",
      timeout: 30_000,
    },
  );
  assert.equal(result.status, 0);
  assert.match(
    result.stdout,
    /MIGRATION_0041_STAGED_QUERY_CONTRACT=PASS/u,
  );
  assert.match(
    result.stdout,
    /MIGRATION_0041_STDIN_TRANSPORT=PASS/u,
  );
  assert.match(
    result.stdout,
    /REMOTE_ACCESS_PERFORMED=NO/u,
  );
});

test("approved apply package smoke starts on Node 22 without prompt or remote access", () => {
  const result = spawnSync(
    "node",
    [
      "--no-warnings",
      "--experimental-strip-types",
      "scripts/apply-project004-remote-migration-0041.ts",
      "--smoke",
    ],
    {
      cwd: repositoryRoot,
      env: process.env,
      encoding: "utf8",
      timeout: 30_000,
    },
  );
  assert.equal(result.status, 0);
  assert.match(
    result.stdout,
    /OWNER_APPROVAL=UNLOCKED_FOR_ONE_ATTEMPT/u,
  );
  assert.match(
    result.stdout,
    /CURRENT_RUN_MUTATION_PERFORMED=NO/u,
  );
});
