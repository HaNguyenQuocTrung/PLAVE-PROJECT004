import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  assertProject004ContentSqlContract,
  inspectProject004ContentSqlContract,
  project004ContentProgressMarkers,
} from "../scripts/project004-content-sql-contract.ts";
import {
  exactProject004ContentBaselineObservation,
  firstProject004ContentPreconditionFailure,
  project004CanonicalLegacyBaseline,
  project004ContentPreconditionIds,
  project004LegacyPublishedUnitSlugs,
} from "../scripts/project004-content-precondition-contract.ts";
import {
  classifyProject004ContentFailure,
  parseProject004ContentAggregateCounts,
  project004ContentCountsPassed,
  project004ContentRollbackPassed,
} from "../scripts/project004-content-transaction-diagnostic.ts";
import { buildProject004RemoteDevCurriculumSql } from "../scripts/project004-remote-dev-curriculum.ts";
import {
  executeProject004PostTransactionVerifier,
  inspectProject004PostApplyResponse,
  parseProject004PostApplyCounts,
  project004PostApplyDiagnosticSql,
  project004PostApplyPayloadFieldCount,
  project004PostApplyPayloadSentinel,
  Project004PostApplyResponseError,
  verifyRemotePostApplyCounts,
} from "../scripts/project004-remote-dev-operations.ts";
import {
  firstProject004PostTransactionValidationFailure,
  project004PostTransactionValidationIds,
  type Project004PostTransactionCounts,
} from "../scripts/project004-post-transaction-validation.ts";
import {
  renderDisposableProofFailure,
} from "../scripts/run-project004-clean-disposable-proof.ts";

const root = resolve(import.meta.dirname, "..");

function exactPostTransactionCounts(): Project004PostTransactionCounts {
  return {
    migrationRows: 40,
    canonicalMigrationRows: 40,
    migrationFirst: "0001",
    migrationLast: "0040",
    releases: 1,
    canonicalReleaseRows: 1,
    draftInactiveReleases: 1,
    activeReleases: 0,
    units: 171,
    publicQuestions: 2052,
    privateSolutions: 2052,
    officialOutcomes: 546,
    foreignReleaseContentRows: 0,
    legacyLearningUnits: 14,
    publishedLearningUnits: 13,
    legacyQuestions: 336,
    publishedQuestions: 312,
    legacySolutions: 336,
    diagnosticBlueprintRows: 24,
    legacyNonCanonicalRows: 0,
    physicalUnitRows: 185,
    physicalQuestionRows: 2388,
    physicalSolutionRows: 2388,
    authUsers: 0,
    storageObjects: 0,
    syntheticUserRows: 0,
    adaptiveReleaseRows: 1,
    adaptiveExactDisabledRows: 1,
    adaptiveEnabledRows: 0,
    adaptivePilotRows: 0,
    runtimeSecretRows: 0,
    onDemandRuntimeRows: 0,
    rlsGaps: 0,
    privateGrantLeaks: 0,
    requiredTables: 23,
    requiredFunctions: 18,
    authTriggers: 1,
    pgcryptoExtensions: 1,
  };
}

function exactPostTransactionPayload() {
  return (
    `${project004PostApplyPayloadSentinel}|` +
    "40|40|0001|0040|1|1|1|0|171|2052|2052|546|0|" +
    "14|13|336|312|336|24|0|185|2388|2388|0|0|0|" +
    "1|1|0|0|0|0|0|0|23|18|1|1"
  );
}

function failedResult(stdout: string, stderr: string) {
  return {
    stdout,
    stderr,
    spawnErrorCode: "NONE",
    status: 3,
    signal: null,
    timedOut: false,
    terminationReason: "NONE" as const,
  };
}

test("canonical curriculum SQL has exact counts, transaction wrapper, and release arity", () => {
  const content = buildProject004RemoteDevCurriculumSql();
  const contract = inspectProject004ContentSqlContract(
    content.sql,
  );
  assert.deepEqual(content.counts, {
    releases: 1,
    units: 171,
    publicQuestions: 2052,
    privateSolutions: 2052,
    officialOutcomes: 546,
  });
  assert.equal(contract.pass, true);
  assert.equal(contract.releaseColumnCount, 12);
  assert.equal(contract.releaseValueCount, 12);
  assert.equal(contract.beginCount, 1);
  assert.equal(contract.commitCount, 1);
  assert.equal(contract.transport, "STDIN_MEMORY");
  assert.equal(contract.sqlFilePreparation, "NOT_USED");
  assert.doesNotThrow(() =>
    assertProject004ContentSqlContract(content.sql),
  );
});

test("canonical SQL emits only safe aggregate progress markers", () => {
  const content = buildProject004RemoteDevCurriculumSql();
  for (const marker of Object.values(
    project004ContentProgressMarkers,
  )) {
    assert.match(
      content.sql,
      new RegExp(
        `^\\\\echo ${marker.replaceAll("=", "[=]")}$`,
        "mu",
      ),
    );
  }
  assert.doesNotMatch(
    Object.values(project004ContentProgressMarkers).join("\n"),
    /url|port|key|password|token|uuid|email|identity/iu,
  );
});

test("classifier separates psql invocation from SQL execution", () => {
  assert.deepEqual(
    classifyProject004ContentFailure({
      ...failedResult("", ""),
      spawnErrorCode: "ENOENT",
    }),
    {
      stage: "PSQL_INVOCATION",
      sqlstate: "NONE",
      errorCategory: "PSQL_SPAWN_FAILED",
      failedStatementClass: "PSQL_PROCESS",
      sqlExecutionStarted: "NO",
      preconditionId: "NOT_APPLICABLE",
      preconditionObserved: "NOT_APPLICABLE",
      preconditionExpected: "NOT_APPLICABLE",
    },
  );
  assert.deepEqual(
    classifyProject004ContentFailure(
      failedResult(
        "",
        "psql: error: connection refused",
      ),
    ),
    {
      stage: "PSQL_INVOCATION",
      sqlstate: "UNKNOWN",
      errorCategory: "DATABASE_CONNECTION_FAILED",
      failedStatementClass: "PSQL_PROCESS",
      sqlExecutionStarted: "NO",
      preconditionId: "NOT_APPLICABLE",
      preconditionObserved: "NOT_APPLICABLE",
      preconditionExpected: "NOT_APPLICABLE",
    },
  );
});

test("classifier identifies precondition SQLSTATE without exposing raw error", () => {
  const evidence = classifyProject004ContentFailure(
    failedResult(
      `${project004ContentProgressMarkers.sqlExecutionStarted}\n`,
      "ERROR: P0001: REMOTE_CONTENT:PRECONDITION:PC004_LEGACY_CURRICULUM_BASELINE:OBSERVED:14/13/1/336/312/24/336/24/0:EXPECTED:14/13/1/336/312/24/336/24/0",
    ),
  );
  assert.deepEqual(evidence, {
    stage: "CONTENT_PRECONDITION",
    sqlstate: "P0001",
    errorCategory: "CONTENT_PRECONDITION_REJECTED",
    failedStatementClass: "PRECONDITION_DO_BLOCK",
    sqlExecutionStarted: "YES",
    preconditionId:
      "PC004_LEGACY_CURRICULUM_BASELINE",
    preconditionObserved:
      "14/13/1/336/312/24/336/24/0",
    preconditionExpected:
      "14/13/1/336/312/24/336/24/0",
  });
  assert.doesNotMatch(
    JSON.stringify(evidence),
    /REMOTE_CONTENT/u,
  );
});

test("classifier identifies the exact insert statement class and constraint category", () => {
  const stdout = [
    project004ContentProgressMarkers.sqlExecutionStarted,
    project004ContentProgressMarkers.preconditionPassed,
    project004ContentProgressMarkers.releaseInsertStarted,
    project004ContentProgressMarkers.unitInsertStarted,
    project004ContentProgressMarkers.questionInsertStarted,
  ].join("\n");
  assert.deepEqual(
    classifyProject004ContentFailure(
      failedResult(
        stdout,
        "ERROR: 23514: sanitized constraint failure",
      ),
    ),
    {
      stage: "SQL_EXECUTION",
      sqlstate: "23514",
      errorCategory: "CHECK_VIOLATION",
      failedStatementClass: "QUESTION_INSERT",
      sqlExecutionStarted: "YES",
      preconditionId: "NOT_APPLICABLE",
      preconditionObserved: "NOT_APPLICABLE",
      preconditionExpected: "NOT_APPLICABLE",
    },
  );
});

test("classifier separates validation and commit failures", () => {
  const validationOutput = [
    project004ContentProgressMarkers.sqlExecutionStarted,
    project004ContentProgressMarkers.preconditionPassed,
    project004ContentProgressMarkers.releaseInsertStarted,
    project004ContentProgressMarkers.unitInsertStarted,
    project004ContentProgressMarkers.questionInsertStarted,
    project004ContentProgressMarkers.solutionInsertStarted,
    project004ContentProgressMarkers.mappingInsertStarted,
    project004ContentProgressMarkers.validationStarted,
  ].join("\n");
  assert.deepEqual(
    classifyProject004ContentFailure(
      failedResult(
        validationOutput,
        "ERROR: P0001: REMOTE_CONTENT:COUNT_MISMATCH",
      ),
    ),
    {
      stage: "POST_TRANSACTION_VERIFICATION",
      sqlstate: "P0001",
      errorCategory: "CONTENT_VALIDATION_REJECTED",
      failedStatementClass: "VALIDATION_DO_BLOCK",
      sqlExecutionStarted: "YES",
      preconditionId: "NOT_APPLICABLE",
      preconditionObserved: "NOT_APPLICABLE",
      preconditionExpected: "NOT_APPLICABLE",
    },
  );
  assert.deepEqual(
    classifyProject004ContentFailure(
      failedResult(
        `${validationOutput}\n` +
          `${project004ContentProgressMarkers.validationPassed}\n` +
          `${project004ContentProgressMarkers.commitStarted}\n`,
        "ERROR: 40001: sanitized commit failure",
      ),
    ),
    {
      stage: "TRANSACTION_COMMIT",
      sqlstate: "40001",
      errorCategory: "SQL_EXECUTION_ERROR",
      failedStatementClass: "COMMIT",
      sqlExecutionStarted: "YES",
      preconditionId: "NOT_APPLICABLE",
      preconditionObserved: "NOT_APPLICABLE",
      preconditionExpected: "NOT_APPLICABLE",
    },
  );
});

test("exact canonical legacy baseline is accepted and every drift class fails closed", () => {
  const exact = exactProject004ContentBaselineObservation();
  assert.equal(
    firstProject004ContentPreconditionFailure(exact),
    null,
  );
  const mutations: readonly [
    string,
    (candidate: ReturnType<
      typeof exactProject004ContentBaselineObservation
    >) => void,
  ][] = [
    [
      "PC001_REQUIRED_SCHEMA",
      (candidate) => {
        candidate.requiredSchema.observed -= 1;
      },
    ],
    [
      "PC002_MIGRATION_HISTORY",
      (candidate) => {
        candidate.migrationHistory.canonical -= 1;
      },
    ],
    [
      "PC003_RELEASE_TABLES_EMPTY",
      (candidate) => {
        candidate.releaseTables.releases = 1;
      },
    ],
    [
      "PC004_LEGACY_CURRICULUM_BASELINE",
      (candidate) => {
        candidate.legacyCurriculum.publishedQuestions -= 1;
      },
    ],
    [
      "PC005_SYNTHETIC_HISTORY_EMPTY",
      (candidate) => {
        candidate.syntheticHistoryRows = 1;
      },
    ],
    [
      "PC006_ADAPTIVE_RUNTIME_BASELINE",
      (candidate) => {
        candidate.adaptiveRuntime.exactDisabledDraftReleases = 0;
      },
    ],
    [
      "PC007_ADAPTIVE_PILOT_EMPTY",
      (candidate) => {
        candidate.adaptivePilotRows = 1;
      },
    ],
    [
      "PC008_ON_DEMAND_RUNTIME_EMPTY",
      (candidate) => {
        candidate.onDemandRuntimeRows = 1;
      },
    ],
  ];
  for (const [expected, mutate] of mutations) {
    const candidate =
      exactProject004ContentBaselineObservation();
    mutate(candidate);
    assert.equal(
      firstProject004ContentPreconditionFailure(candidate),
      expected,
    );
  }
});

test("canonical migration-created legacy publication is accepted only at exact aggregate", () => {
  assert.equal(project004LegacyPublishedUnitSlugs.length, 13);
  assert.deepEqual(project004CanonicalLegacyBaseline, {
    learningUnits: 14,
    publishedLearningUnits: 13,
    draftLearningUnits: 1,
    questions: 336,
    publishedQuestions: 312,
    draftQuestions: 24,
    solutions: 336,
    diagnosticBlueprintRows: 24,
    nonCanonicalRows: 0,
  });
  const content = buildProject004RemoteDevCurriculumSql();
  for (const id of project004ContentPreconditionIds) {
    assert.match(content.sql, new RegExp(id, "u"));
  }
  assert.doesNotMatch(
    content.sql,
    /exists\s*[(]\s*select 1 from public[.]learning_units where published/iu,
  );
  assert.doesNotMatch(
    content.sql,
    /exists\s*[(]\s*select 1 from public[.]questions where published/iu,
  );
  assert.match(
    content.sql,
    /PC004_LEGACY_CURRICULUM_BASELINE:OBSERVED:[^']+:EXPECTED:14\/13\/1\/336\/312\/24\/336\/24\/0/u,
  );
});

test("exact legacy baseline aggregate is anchored to canonical migration source", () => {
  const migrationCorpus = [
    "0004_grade1_numbers_to_10.sql",
    "0018_grade1_addition_within_10.sql",
    "0019_grade1_subtraction_within_10.sql",
    "0020_grade1_numbers_to_20.sql",
    "0021_grade1_addition_within_20_no_carry.sql",
    "0023_grade1_subtraction_within_20_no_borrow.sql",
    "0024_grade1_numbers_to_100.sql",
    "0025_grade1_addition_within_100_no_carry.sql",
    "0026_grade1_subtraction_within_100_no_borrow.sql",
    "0027_grade1_basic_geometry_and_position.sql",
    "0028_grade1_length_measurement.sql",
    "0029_grade1_time_clock_calendar.sql",
    "0030_grade1_cube_and_cuboid.sql",
  ]
    .map((file) =>
      readFileSync(
        resolve(root, "supabase/migrations", file),
        "utf8",
      ),
    )
    .join("\n");
  for (const slug of project004LegacyPublishedUnitSlugs) {
    assert.match(
      migrationCorpus,
      new RegExp(`'${slug}'`, "u"),
    );
  }
  const diagnosticMigration = readFileSync(
    resolve(
      root,
      "supabase/migrations/0031_grade1_diagnostic.sql",
    ),
    "utf8",
  );
  assert.match(
    diagnosticMigration,
    /v_blueprint_count\s*<>\s*24/u,
  );
  assert.match(
    diagnosticMigration,
    /v_grade1_unit_count\s*<>\s*13/u,
  );
  const grade2Migration = readFileSync(
    resolve(
      root,
      "supabase/migrations/0035_grade2_numbers_to_1000_release_candidate_draft.sql",
    ),
    "utf8",
  );
  assert.match(
    grade2Migration,
    /slug = 'grade-2-numbers-to-1000'[\s\S]+?total_questions = 24[\s\S]+?published is false/u,
  );
  assert.match(
    grade2Migration,
    /v_count <> 24[\s\S]+?Question count\/status is invalid/u,
  );
  const adaptiveMigration = readFileSync(
    resolve(
      root,
      "supabase/migrations/0036_adaptive_practice_runtime_draft.sql",
    ),
    "utf8",
  );
  assert.match(
    adaptiveMigration,
    /false,\s*false,\s*false,\s*'DRAFT',\s*'HIDDEN'/u,
  );
});

test("aggregate count parser proves rollback or exact canonical content", () => {
  const rolledBack =
    parseProject004ContentAggregateCounts("0|0|0|0|0\n");
  assert.equal(
    project004ContentRollbackPassed(rolledBack),
    true,
  );
  assert.equal(
    project004ContentCountsPassed(rolledBack),
    false,
  );
  const committed = parseProject004ContentAggregateCounts(
    "1|171|2052|2052|546\n",
  );
  assert.equal(
    project004ContentRollbackPassed(committed),
    false,
  );
  assert.equal(
    project004ContentCountsPassed(committed),
    true,
  );
  assert.throws(
    () =>
      parseProject004ContentAggregateCounts(
        "1|171|2052|2052|identity\n",
      ),
    /CONTENT_AGGREGATE_COUNTS_INVALID/u,
  );
});

test("post-commit verifier accepts exact scoped, legacy, and physical aggregates", () => {
  const exact = exactPostTransactionCounts();
  assert.equal(
    firstProject004PostTransactionValidationFailure(exact),
    null,
  );
  assert.doesNotThrow(() =>
    verifyRemotePostApplyCounts(exact),
  );
  assert.equal(exact.publishedLearningUnits, 13);
  assert.equal(exact.publishedQuestions, 312);
  assert.equal(exact.units, 171);
  assert.equal(exact.physicalUnitRows, 185);
});

test("every post-commit drift class has one stable validation ID", () => {
  const mutations: readonly [
    string,
    (counts: Project004PostTransactionCounts) => void,
  ][] = [
    [
      "V001_MIGRATION_HISTORY",
      (counts) => {
        counts.canonicalMigrationRows = 39;
      },
    ],
    [
      "V002_RELEASE_SCOPED_COUNTS",
      (counts) => {
        counts.publicQuestions = 2051;
      },
    ],
    [
      "V003_RELEASE_STATE",
      (counts) => {
        counts.activeReleases = 1;
      },
    ],
    [
      "V004_LEGACY_BASELINE",
      (counts) => {
        counts.publishedQuestions = 311;
      },
    ],
    [
      "V005_PHYSICAL_TABLE_TOTALS",
      (counts) => {
        counts.foreignReleaseContentRows = 1;
      },
    ],
    [
      "V006_ADAPTIVE_RUNTIME_PILOT",
      (counts) => {
        counts.adaptiveEnabledRows = 1;
      },
    ],
    [
      "V007_IDENTITY_HISTORY_RUNTIME_EMPTY",
      (counts) => {
        counts.syntheticUserRows = 1;
      },
    ],
    [
      "V008_RLS_PRIVATE_BOUNDARY",
      (counts) => {
        counts.privateGrantLeaks = 1;
      },
    ],
    [
      "V009_SCHEMA_FUNCTION_AUTH_BOUNDARY",
      (counts) => {
        counts.authTriggers = 0;
      },
    ],
  ];
  assert.equal(
    mutations.length,
    project004PostTransactionValidationIds.length,
  );
  for (const [expectedId, mutate] of mutations) {
    const counts = exactPostTransactionCounts();
    mutate(counts);
    assert.equal(
      firstProject004PostTransactionValidationFailure(
        counts,
      )?.id,
      expectedId,
    );
  }
});

test("post-commit machine row preserves all three count scopes", () => {
  const output = `${exactPostTransactionPayload()}\n`;
  assert.deepEqual(
    parseProject004PostApplyCounts(output),
    exactPostTransactionCounts(),
  );
  assert.match(
    project004PostApplyDiagnosticSql,
    /join canonical_release as release/u,
  );
  assert.match(
    project004PostApplyDiagnosticSql,
    /legacy_counts[.]published_units/u,
  );
  assert.match(
    project004PostApplyDiagnosticSql,
    /legacy_counts[.]units[\s\S]+?public[.]curriculum_release_units/u,
  );
  assert.match(
    project004PostApplyDiagnosticSql,
    new RegExp(project004PostApplyPayloadSentinel, "u"),
  );
});

test("canonical executor parses sanitized full-proof stdout and enforces machine psql mode", async () => {
  const productionOutput =
    "NOTICE: read-only post-commit verifier\n" +
    "BEGIN\n" +
    "SET\n" +
    "             concat_ws\n" +
    "-----------------------------------\n" +
    ` ${exactPostTransactionPayload()}\n` +
    "(1 row)\n" +
    "COMMIT\n" +
    "DISPOSABLE_PROGRESS=POST_APPLY_DIAGNOSTIC:PASS\n";
  const requests: Array<{
    sql: string;
    machineOutput: true;
  }> = [];
  const result =
    await executeProject004PostTransactionVerifier(
      (request) => {
        requests.push(request);
        return {
          ok: true,
          childExited: true,
          stdout: productionOutput,
          stderr: "NOTICE: verifier complete\n",
        };
      },
    );
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.sql, project004PostApplyDiagnosticSql);
  assert.equal(requests[0]?.machineOutput, true);
  assert.deepEqual(result.counts, exactPostTransactionCounts());
  assert.deepEqual(result.parserEvidence, {
    queryExit: "PASS",
    payloadSentinelCount: 1,
    payloadFieldCount: project004PostApplyPayloadFieldCount,
    payloadVersion: "V1",
    parserFailureCode: "NONE",
  });
});

test("post-apply parser rejects missing, duplicate, wrong-version, and malformed payloads with safe evidence", async () => {
  const cases = [
    {
      stdout: "NOTICE: verifier started\n(0 rows)\n",
      code: "PAYLOAD_SENTINEL_MISSING",
      count: 0,
      fields: 0,
      version: "UNKNOWN",
    },
    {
      stdout:
        `${exactPostTransactionPayload()}\n` +
        `${exactPostTransactionPayload()}\n`,
      code: "PAYLOAD_SENTINEL_DUPLICATE",
      count: 2,
      fields: project004PostApplyPayloadFieldCount,
      version: "V1",
    },
    {
      stdout: exactPostTransactionPayload().replace(
        project004PostApplyPayloadSentinel,
        "PROJECT004_POST_TRANSACTION_V2",
      ),
      code: "PAYLOAD_VERSION_MISMATCH",
      count: 1,
      fields: project004PostApplyPayloadFieldCount,
      version: "V2",
    },
    {
      stdout: `${project004PostApplyPayloadSentinel}|40|40`,
      code: "PAYLOAD_FIELD_COUNT_INVALID",
      count: 1,
      fields: 2,
      version: "V1",
    },
  ] as const;
  for (const fixture of cases) {
    const evidence = inspectProject004PostApplyResponse(
      fixture.stdout,
    );
    assert.equal(evidence.parserFailureCode, fixture.code);
    assert.equal(evidence.payloadSentinelCount, fixture.count);
    assert.equal(evidence.payloadFieldCount, fixture.fields);
    assert.equal(evidence.payloadVersion, fixture.version);
    await assert.rejects(
      executeProject004PostTransactionVerifier(() => ({
        ok: true,
        childExited: true,
        stdout: fixture.stdout,
      })),
      (error: unknown) => {
        assert.ok(
          error instanceof Project004PostApplyResponseError,
        );
        assert.equal(
          error.evidence.parserFailureCode,
          fixture.code,
        );
        return true;
      },
    );
  }
});

test("query failure remains distinct from parser failures", async () => {
  await assert.rejects(
    executeProject004PostTransactionVerifier(() => ({
      ok: false,
      childExited: true,
      stdout: "",
      stderr: "sanitized query failure",
    })),
    (error: unknown) => {
      assert.ok(
        error instanceof Project004PostApplyResponseError,
      );
      assert.deepEqual(error.evidence, {
        queryExit: "FAIL",
        payloadSentinelCount: 0,
        payloadFieldCount: 0,
        payloadVersion: "UNKNOWN",
        parserFailureCode: "QUERY_EXIT_FAILED",
      });
      return true;
    },
  );
});

test("proof failure renderer preserves only sanitized content evidence", () => {
  const failure = new Error(
    "DISPOSABLE_CONTENT_TRANSACTION_FAILED",
  ) as Error & Record<string, unknown>;
  Object.assign(failure, {
    code: "DISPOSABLE_CONTENT_TRANSACTION_FAILED",
    cleanup: "PASS",
    contentFailureStage: "SQL_EXECUTION",
    contentSqlstate: "23514",
    contentErrorCategory: "CHECK_VIOLATION",
    contentFailedStatementClass: "QUESTION_INSERT",
    contentSqlExecutionStarted: "YES",
    contentTransactionRollback: "PASS",
    contentPreconditionId:
      "PC004_LEGACY_CURRICULUM_BASELINE",
    contentPreconditionObserved:
      "14/13/1/336/312/24/336/24/0",
    contentPreconditionExpected:
      "14/13/1/336/312/24/336/24/0",
  });
  const output = renderDisposableProofFailure(failure);
  assert.match(output, /CONTENT_FAILURE_STAGE=SQL_EXECUTION/u);
  assert.match(output, /CONTENT_SQLSTATE=23514/u);
  assert.match(
    output,
    /CONTENT_FAILED_STATEMENT_CLASS=QUESTION_INSERT/u,
  );
  assert.match(output, /CONTENT_TRANSACTION_ROLLBACK=PASS/u);
  assert.match(
    output,
    /PRECONDITION_ID=PC004_LEGACY_CURRICULUM_BASELINE/u,
  );
  assert.match(
    output,
    /EXPECTED_CONTENT_COUNTS=171\/2052\/2052\/546/u,
  );
  assert.doesNotMatch(
    output,
    /url|key|password|token|uuid|email|identity/iu,
  );
});

test("proof failure renderer always includes post-commit validation evidence and aggregates", () => {
  const failure = new Error(
    "POST_APPLY_DIAGNOSTIC_MISMATCH",
  ) as Error & Record<string, unknown>;
  Object.assign(failure, {
    code: "POST_APPLY_DIAGNOSTIC_MISMATCH",
    cleanup: "PASS",
    contentFailureStage:
      "POST_TRANSACTION_VERIFICATION",
    contentSqlstate: "NONE",
    contentErrorCategory:
      "POST_TRANSACTION_STATE_MISMATCH",
    contentFailedStatementClass:
      "POST_COMMIT_READ_ONLY_VERIFIER",
    contentSqlExecutionStarted: "YES",
    contentTransactionRollback: "NOT_REQUIRED",
    contentValidationId: "V004_LEGACY_BASELINE",
    contentValidationObserved:
      "14/13/1/336/312/24/336/24/0",
    contentValidationExpected:
      "14/13/1/336/312/24/336/24/0",
    releaseScopedCounts: "171/2052/2052/546",
    legacyBaselineCounts: "14/336/336/24",
    physicalTableCounts: "185/2388/2388",
  });
  const output = renderDisposableProofFailure(failure);
  assert.match(output, /VALIDATION_ID=V004_LEGACY_BASELINE/u);
  assert.match(
    output,
    /RELEASE_SCOPED_COUNTS=171\/2052\/2052\/546/u,
  );
  assert.match(
    output,
    /LEGACY_BASELINE_COUNTS=14\/336\/336\/24/u,
  );
  assert.match(
    output,
    /PHYSICAL_TABLE_COUNTS=185\/2388\/2388/u,
  );
});

test("proof failure renderer exposes sanitized post-apply parser subconditions", () => {
  const failure = new Error(
    "POST_APPLY_DIAGNOSTIC_RESPONSE_INVALID",
  ) as Error & Record<string, unknown>;
  Object.assign(failure, {
    code: "POST_APPLY_DIAGNOSTIC_RESPONSE_INVALID",
    cleanup: "PASS",
    contentFailureStage:
      "POST_TRANSACTION_VERIFICATION",
    contentSqlstate: "NONE",
    contentErrorCategory:
      "POST_TRANSACTION_RESPONSE_INVALID",
    contentFailedStatementClass:
      "POST_COMMIT_READ_ONLY_VERIFIER",
    contentSqlExecutionStarted: "YES",
    contentTransactionRollback: "NOT_REQUIRED",
    postApplyQueryExit: "PASS",
    postApplyPayloadSentinelCount: 0,
    postApplyPayloadFieldCount: 0,
    postApplyPayloadVersion: "UNKNOWN",
    postApplyParserFailureCode:
      "PAYLOAD_SENTINEL_MISSING",
  });
  const output = renderDisposableProofFailure(failure);
  assert.match(output, /QUERY_EXIT=PASS/u);
  assert.match(output, /PAYLOAD_SENTINEL_COUNT=0/u);
  assert.match(output, /PAYLOAD_FIELD_COUNT=0/u);
  assert.match(output, /PAYLOAD_VERSION=UNKNOWN/u);
  assert.match(
    output,
    /PARSER_FAILURE_CODE=PAYLOAD_SENTINEL_MISSING/u,
  );
});

test("psql transport keeps canonical SQL in stdin and out of argv/temp files", () => {
  const proofSource = readFileSync(
    resolve(
      root,
      "scripts/run-project004-clean-disposable-proof.ts",
    ),
    "utf8",
  );
  const diagnosticSource = readFileSync(
    resolve(
      root,
      "scripts/run-project004-disposable-content-diagnostic.ts",
    ),
    "utf8",
  );
  assert.match(
    proofSource,
    /input:\s*sql/u,
  );
  assert.doesNotMatch(
    proofSource,
    /"--file"|"--command",\s*sql/u,
  );
  assert.doesNotMatch(
    diagnosticSource,
    /writeFileSync|mkdtempSync|canonical-curriculum-draft[.]sql/u,
  );
  for (const source of [proofSource, diagnosticSource]) {
    assert.match(
      source,
      /executeProject004PostTransactionVerifier/u,
    );
    assert.doesNotMatch(
      source,
      /parseProject004PostApplyCounts/u,
    );
  }
});

test("Node 22 executable smoke starts without Docker, Supabase, or remote access", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      "scripts/run-project004-disposable-content-diagnostic.ts",
      "--smoke",
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        SUPABASE_ACCESS_TOKEN: "",
      },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout,
    "CONTENT_SQL_CONTRACT=PASS\n" +
      "CONTENT_SQL_FILE_PREPARATION=NOT_USED\n" +
      "CONTENT_SQL_TRANSPORT=STDIN_MEMORY\n" +
      "DOCKER_EXECUTION_PERFORMED=NO\n" +
      "SUPABASE_EXECUTION_PERFORMED=NO\n" +
      "REMOTE_ACCESS_PERFORMED=NO\n" +
      "REMOTE_MUTATION_PERFORMED=NO\n",
  );
});

test("Node 22 executable smoke exercises the canonical post-apply executor and parser", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      "scripts/run-project004-disposable-content-diagnostic.ts",
      "--post-apply-parser-smoke",
    ],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout,
    "POST_APPLY_CANONICAL_EXECUTOR=PASS\n" +
      "POST_APPLY_MACHINE_OUTPUT=PASS\n" +
      "POST_APPLY_SENTINEL_VERSION=V1\n" +
      "DOCKER_EXECUTION_PERFORMED=NO\n" +
      "SUPABASE_EXECUTION_PERFORMED=NO\n" +
      "REMOTE_ACCESS_PERFORMED=NO\n" +
      "REMOTE_MUTATION_PERFORMED=NO\n",
  );
});
