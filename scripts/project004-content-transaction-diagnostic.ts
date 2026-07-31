import type { ManagedChildResult } from "./project004-managed-child-process.ts";
import {
  project004ContentProgressMarkers,
  project004ExpectedContentCounts,
} from "./project004-content-sql-contract.ts";
import type { Project004ContentPreconditionId } from "./project004-content-precondition-contract.ts";

export type Project004ContentFailureStage =
  | "CONTENT_SOURCE_BUILD"
  | "CONTENT_SQL_FILE_PREPARATION"
  | "CONTENT_PRECONDITION"
  | "PSQL_INVOCATION"
  | "SQL_EXECUTION"
  | "TRANSACTION_COMMIT"
  | "POST_TRANSACTION_VERIFICATION";

export type Project004ContentStatementClass =
  | "SOURCE_BUILD"
  | "SQL_FILE_PREPARATION"
  | "PRECONDITION_DO_BLOCK"
  | "RELEASE_INSERT"
  | "UNIT_INSERT"
  | "QUESTION_INSERT"
  | "SOLUTION_INSERT"
  | "MAPPING_INSERT"
  | "VALIDATION_DO_BLOCK"
  | "POST_COMMIT_READ_ONLY_VERIFIER"
  | "COMMIT"
  | "PSQL_PROCESS"
  | "UNKNOWN";

export type Project004ContentFailureEvidence = {
  stage: Project004ContentFailureStage;
  sqlstate: string;
  errorCategory: string;
  failedStatementClass: Project004ContentStatementClass;
  sqlExecutionStarted: "YES" | "NO" | "UNVERIFIED";
  preconditionId:
    | Project004ContentPreconditionId
    | "UNKNOWN"
    | "NOT_APPLICABLE";
  preconditionObserved: string;
  preconditionExpected: string;
};

function observed(
  output: string,
  marker: string,
) {
  return output.includes(marker);
}

function parseSqlstate(output: string) {
  return (
    /(?:SQLSTATE\s+|sqlstate[=:]\s*|ERROR:\s+)([0-9A-Z]{5})(?::|\b)/iu.exec(
      output,
    )?.[1]?.toUpperCase() ?? "UNKNOWN"
  );
}

function parsePreconditionEvidence(
  output: string,
): {
  id: Project004ContentPreconditionId | "UNKNOWN";
  observed: string;
  expected: string;
} {
  const match =
    /REMOTE_CONTENT:PRECONDITION:(PC00[1-8]_[A-Z_]+):OBSERVED:([0-9A-Z/.-]+):EXPECTED:([0-9A-Z/.-]+)/u.exec(
      output,
    );
  return {
    id: match?.[1]
      ? (match[1] as Project004ContentPreconditionId)
      : "UNKNOWN",
    observed: match?.[2] ?? "UNKNOWN",
    expected: match?.[3] ?? "UNKNOWN",
  };
}

function sqlstateCategory(
  sqlstate: string,
  output: string,
) {
  const categories: Readonly<Record<string, string>> = {
    "23502": "NOT_NULL_VIOLATION",
    "23503": "FOREIGN_KEY_VIOLATION",
    "23505": "UNIQUE_VIOLATION",
    "23514": "CHECK_VIOLATION",
    "42501": "PERMISSION_DENIED",
    "42601": "SYNTAX_ERROR",
    "42703": "UNDEFINED_COLUMN",
    "42P01": "UNDEFINED_TABLE",
    "57014": "STATEMENT_TIMEOUT",
    P0001: "APPLICATION_RAISE_EXCEPTION",
  };
  if (categories[sqlstate]) return categories[sqlstate];
  if (/connection refused|could not connect/iu.test(output)) {
    return "DATABASE_CONNECTION_FAILED";
  }
  if (/password authentication failed/iu.test(output)) {
    return "DATABASE_AUTHENTICATION_FAILED";
  }
  if (/statement timeout|canceling statement/iu.test(output)) {
    return "STATEMENT_TIMEOUT";
  }
  return "SQL_EXECUTION_ERROR";
}

function lastStartedStatement(
  output: string,
): Project004ContentStatementClass {
  const candidates: readonly [
    string,
    Project004ContentStatementClass,
  ][] = [
    [
      project004ContentProgressMarkers.commitStarted,
      "COMMIT",
    ],
    [
      project004ContentProgressMarkers.validationStarted,
      "VALIDATION_DO_BLOCK",
    ],
    [
      project004ContentProgressMarkers.mappingInsertStarted,
      "MAPPING_INSERT",
    ],
    [
      project004ContentProgressMarkers.solutionInsertStarted,
      "SOLUTION_INSERT",
    ],
    [
      project004ContentProgressMarkers.questionInsertStarted,
      "QUESTION_INSERT",
    ],
    [
      project004ContentProgressMarkers.unitInsertStarted,
      "UNIT_INSERT",
    ],
    [
      project004ContentProgressMarkers.releaseInsertStarted,
      "RELEASE_INSERT",
    ],
  ];
  return (
    candidates.find(([marker]) => observed(output, marker))?.[1] ??
    "PRECONDITION_DO_BLOCK"
  );
}

export function classifyProject004ContentFailure(
  result: Pick<
    ManagedChildResult,
    | "stdout"
    | "stderr"
    | "spawnErrorCode"
    | "status"
    | "signal"
    | "timedOut"
    | "terminationReason"
  >,
): Project004ContentFailureEvidence {
  const output = `${result.stdout}\n${result.stderr}`;
  if (result.spawnErrorCode !== "NONE") {
    return {
      stage: "PSQL_INVOCATION",
      sqlstate: "NONE",
      errorCategory: "PSQL_SPAWN_FAILED",
      failedStatementClass: "PSQL_PROCESS",
      sqlExecutionStarted: "NO",
      preconditionId: "NOT_APPLICABLE",
      preconditionObserved: "NOT_APPLICABLE",
      preconditionExpected: "NOT_APPLICABLE",
    };
  }
  const executionStarted = observed(
    output,
    project004ContentProgressMarkers.sqlExecutionStarted,
  );
  if (!executionStarted) {
    const connectionFailure =
      /connection refused|could not connect|password authentication failed/iu.test(
        output,
      );
    return {
      stage: connectionFailure
        ? "PSQL_INVOCATION"
        : "SQL_EXECUTION",
      sqlstate: parseSqlstate(output),
      errorCategory: connectionFailure
        ? sqlstateCategory(parseSqlstate(output), output)
        : result.timedOut
          ? "PSQL_INPUT_OR_START_TIMEOUT"
          : "SQL_START_NOT_OBSERVED",
      failedStatementClass: connectionFailure
        ? "PSQL_PROCESS"
        : "UNKNOWN",
      sqlExecutionStarted: connectionFailure
        ? "NO"
        : "UNVERIFIED",
      preconditionId: "NOT_APPLICABLE",
      preconditionObserved: "NOT_APPLICABLE",
      preconditionExpected: "NOT_APPLICABLE",
    };
  }

  const sqlstate = parseSqlstate(output);
  const preconditionPassed = observed(
    output,
    project004ContentProgressMarkers.preconditionPassed,
  );
  const commitStarted = observed(
    output,
    project004ContentProgressMarkers.commitStarted,
  );
  const validationStarted = observed(
    output,
    project004ContentProgressMarkers.validationStarted,
  );
  let stage: Project004ContentFailureStage =
    "SQL_EXECUTION";
  if (!preconditionPassed) {
    stage = "CONTENT_PRECONDITION";
  } else if (commitStarted) {
    stage = "TRANSACTION_COMMIT";
  } else if (validationStarted) {
    stage = "POST_TRANSACTION_VERIFICATION";
  }
  const preconditionEvidence = parsePreconditionEvidence(
    output,
  );
  return {
    stage,
    sqlstate,
    errorCategory:
      !preconditionPassed && sqlstate === "P0001"
        ? "CONTENT_PRECONDITION_REJECTED"
        : validationStarted && sqlstate === "P0001"
          ? "CONTENT_VALIDATION_REJECTED"
          : sqlstateCategory(sqlstate, output),
    failedStatementClass: lastStartedStatement(output),
    sqlExecutionStarted: "YES",
    preconditionId:
      stage === "CONTENT_PRECONDITION"
        ? preconditionEvidence.id
        : "NOT_APPLICABLE",
    preconditionObserved:
      stage === "CONTENT_PRECONDITION"
        ? preconditionEvidence.observed
        : "NOT_APPLICABLE",
    preconditionExpected:
      stage === "CONTENT_PRECONDITION"
        ? preconditionEvidence.expected
        : "NOT_APPLICABLE",
  };
}

export type Project004ContentAggregateCounts = {
  releases: number;
  units: number;
  publicQuestions: number;
  privateSolutions: number;
  officialOutcomes: number;
};

export const project004ContentAggregateCountsSql = String.raw`
begin read only;
set local statement_timeout = '15s';
select concat_ws(
  '|',
  (select count(*) from public.curriculum_releases),
  (select count(*) from public.curriculum_release_units),
  (select count(*) from public.curriculum_release_questions),
  (select count(*) from private.curriculum_release_solutions),
  (
    select count(distinct expanded.outcome_id)
    from public.curriculum_release_questions as question
    cross join unnest(question.official_outcome_ids)
      as expanded(outcome_id)
  )
);
commit;
`;

export function parseProject004ContentAggregateCounts(
  output: string,
): Project004ContentAggregateCounts {
  const rows = output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => /^\d+[|]\d+[|]\d+[|]\d+[|]\d+$/u.test(line));
  if (rows.length !== 1) {
    throw new Error("CONTENT_AGGREGATE_COUNTS_INVALID");
  }
  const values = rows[0]?.split("|").map(Number) ?? [];
  if (
    values.length !== 5 ||
    values.some(
      (value) => !Number.isSafeInteger(value) || value < 0,
    )
  ) {
    throw new Error("CONTENT_AGGREGATE_COUNTS_INVALID");
  }
  return {
    releases: values[0] ?? -1,
    units: values[1] ?? -1,
    publicQuestions: values[2] ?? -1,
    privateSolutions: values[3] ?? -1,
    officialOutcomes: values[4] ?? -1,
  };
}

export function project004ContentRollbackPassed(
  counts: Project004ContentAggregateCounts,
) {
  return Object.values(counts).every((value) => value === 0);
}

export function project004ContentCountsPassed(
  counts: Project004ContentAggregateCounts,
) {
  return (
    counts.releases === 1 &&
    counts.units === project004ExpectedContentCounts.units &&
    counts.publicQuestions ===
      project004ExpectedContentCounts.publicQuestions &&
    counts.privateSolutions ===
      project004ExpectedContentCounts.privateSolutions &&
    counts.officialOutcomes ===
      project004ExpectedContentCounts.officialOutcomes
  );
}
