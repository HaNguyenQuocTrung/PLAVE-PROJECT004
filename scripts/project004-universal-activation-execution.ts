export const project004UniversalActivationPsqlArgs = [
  "--no-psqlrc",
  "--quiet",
  "--tuples-only",
  "--no-align",
  "--set",
  "ON_ERROR_STOP=1",
  "--set",
  "VERBOSITY=verbose",
] as const;

export function buildProject004UniversalActivationPsqlInvocation(
  sql: string,
) {
  return {
    args: [...project004UniversalActivationPsqlArgs],
    input: sql,
  };
}

export type UniversalActivationResponseInput = {
  ok: boolean;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
};

export type UniversalActivationFailureStage =
  | "NONE"
  | "PSQL_INVOCATION"
  | "PRECONDITION"
  | "RELEASE_UPDATE"
  | "POST_UPDATE_VALIDATION"
  | "TRANSACTION_COMMIT"
  | "RESPONSE_PARSER";

export type UniversalActivationFailedStatementClass =
  | "NONE"
  | "PSQL_PROCESS"
  | "PRECONDITION_DO_BLOCK"
  | "RELEASE_UPDATE_DO_BLOCK"
  | "VALIDATION_DO_BLOCK"
  | "TRANSACTION_CONTROL"
  | "RESPONSE_SENTINEL";

export type UniversalActivationPreconditionId =
  | "NONE"
  | "ACTIVATION_EXACT_DRAFT_INACTIVE_CONTRACT";

export type UniversalActivationTransactionDiagnostic = {
  ok: boolean;
  sqlstate: string;
  failureStage: UniversalActivationFailureStage;
  failedStatementClass: UniversalActivationFailedStatementClass;
  preconditionId: UniversalActivationPreconditionId;
  transactionRollback: "PASS" | "NOT_APPLICABLE" | "UNVERIFIED";
  sentinelCount: number;
  parserFailureCode: string;
};

function combinedOutput(result: UniversalActivationResponseInput) {
  return `${result.stdout}\n${result.stderr}`
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/gu, "");
}

function observedSqlstate(output: string) {
  const verbose = output.match(
    /(?:ERROR|FATAL):\s+([0-9A-Z]{5}):/iu,
  )?.[1];
  const explicit = output.match(
    /\bSQLSTATE(?:\s*[:=]|\s+)([0-9A-Z]{5})\b/iu,
  )?.[1];
  return (verbose ?? explicit ?? "UNKNOWN").toUpperCase();
}

function failedDiagnostic(
  result: UniversalActivationResponseInput,
  sentinelCount: number,
): UniversalActivationTransactionDiagnostic {
  const output = combinedOutput(result);
  const sqlstate = observedSqlstate(output);
  if (
    output.includes("PROJECT004_ACTIVATION:CONTRACT_DRIFT")
  ) {
    return {
      ok: false,
      sqlstate,
      failureStage: "PRECONDITION",
      failedStatementClass: "PRECONDITION_DO_BLOCK",
      preconditionId:
        "ACTIVATION_EXACT_DRAFT_INACTIVE_CONTRACT",
      transactionRollback: "UNVERIFIED",
      sentinelCount,
      parserFailureCode: "NONE",
    };
  }
  if (
    output.includes("PROJECT004_ACTIVATION:UPDATE_REJECTED")
  ) {
    return {
      ok: false,
      sqlstate,
      failureStage: "RELEASE_UPDATE",
      failedStatementClass: "RELEASE_UPDATE_DO_BLOCK",
      preconditionId: "NONE",
      transactionRollback: "UNVERIFIED",
      sentinelCount,
      parserFailureCode: "NONE",
    };
  }
  if (
    output.includes(
      "PROJECT004_ACTIVATION:POST_STATE_MISMATCH",
    ) ||
    output.includes(
      "PROJECT004_ACTIVATION:ADAPTIVE_PILOT_DRIFT",
    )
  ) {
    return {
      ok: false,
      sqlstate,
      failureStage: "POST_UPDATE_VALIDATION",
      failedStatementClass: "VALIDATION_DO_BLOCK",
      preconditionId: "NONE",
      transactionRollback: "UNVERIFIED",
      sentinelCount,
      parserFailureCode: "NONE",
    };
  }
  if (result.timedOut) {
    return {
      ok: false,
      sqlstate,
      failureStage: "PSQL_INVOCATION",
      failedStatementClass: "PSQL_PROCESS",
      preconditionId: "NONE",
      transactionRollback: "UNVERIFIED",
      sentinelCount,
      parserFailureCode: "ACTIVATION_PSQL_TIMEOUT",
    };
  }
  if (!result.ok) {
    return {
      ok: false,
      sqlstate,
      failureStage:
        /\b(?:COMMIT|ROLLBACK)\b/iu.test(output)
          ? "TRANSACTION_COMMIT"
          : "PSQL_INVOCATION",
      failedStatementClass:
        /\b(?:COMMIT|ROLLBACK)\b/iu.test(output)
          ? "TRANSACTION_CONTROL"
          : "PSQL_PROCESS",
      preconditionId: "NONE",
      transactionRollback: "UNVERIFIED",
      sentinelCount,
      parserFailureCode:
        sqlstate === "UNKNOWN"
          ? "ACTIVATION_PSQL_FAILURE_UNCLASSIFIED"
          : "NONE",
    };
  }
  return {
    ok: false,
    sqlstate: "NONE",
    failureStage: "RESPONSE_PARSER",
    failedStatementClass: "RESPONSE_SENTINEL",
    preconditionId: "NONE",
    transactionRollback: "UNVERIFIED",
    sentinelCount,
    parserFailureCode:
      sentinelCount === 0
        ? "ACTIVATION_COMMIT_SENTINEL_MISSING"
        : "ACTIVATION_COMMIT_SENTINEL_DUPLICATE",
  };
}

export function parseProject004UniversalActivationResponse(
  result: UniversalActivationResponseInput,
  sentinel: string,
): UniversalActivationTransactionDiagnostic {
  const sentinelCount = combinedOutput(result)
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line === sentinel).length;
  if (result.ok && sentinelCount === 1) {
    return {
      ok: true,
      sqlstate: "NONE",
      failureStage: "NONE",
      failedStatementClass: "NONE",
      preconditionId: "NONE",
      transactionRollback: "NOT_APPLICABLE",
      sentinelCount,
      parserFailureCode: "NONE",
    };
  }
  return failedDiagnostic(result, sentinelCount);
}
