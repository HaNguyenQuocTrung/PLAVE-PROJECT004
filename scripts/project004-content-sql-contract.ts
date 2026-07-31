export const project004ExpectedContentCounts = {
  units: 171,
  publicQuestions: 2052,
  privateSolutions: 2052,
  officialOutcomes: 546,
} as const;

export const project004ContentProgressMarkers = {
  sqlExecutionStarted:
    "PROJECT004_CONTENT_PROGRESS=SQL_EXECUTION_STARTED",
  preconditionPassed:
    "PROJECT004_CONTENT_PROGRESS=PRECONDITION_PASS",
  releaseInsertStarted:
    "PROJECT004_CONTENT_PROGRESS=RELEASE_INSERT_STARTED",
  unitInsertStarted:
    "PROJECT004_CONTENT_PROGRESS=UNIT_INSERT_STARTED",
  questionInsertStarted:
    "PROJECT004_CONTENT_PROGRESS=QUESTION_INSERT_STARTED",
  solutionInsertStarted:
    "PROJECT004_CONTENT_PROGRESS=SOLUTION_INSERT_STARTED",
  mappingInsertStarted:
    "PROJECT004_CONTENT_PROGRESS=MAPPING_INSERT_STARTED",
  validationStarted:
    "PROJECT004_CONTENT_PROGRESS=VALIDATION_STARTED",
  validationPassed:
    "PROJECT004_CONTENT_PROGRESS=VALIDATION_PASS",
  commitStarted:
    "PROJECT004_CONTENT_PROGRESS=COMMIT_STARTED",
  commitPassed:
    "PROJECT004_CONTENT_PROGRESS=COMMIT_PASS",
} as const;

type ParenthesizedSegment = {
  content: string;
  end: number;
};

function readParenthesized(
  sql: string,
  openIndex: number,
): ParenthesizedSegment | null {
  if (sql[openIndex] !== "(") return null;
  let depth = 0;
  let quoted = false;
  for (let index = openIndex; index < sql.length; index += 1) {
    const character = sql[index];
    if (quoted) {
      if (character === "'" && sql[index + 1] === "'") {
        index += 1;
      } else if (character === "'") {
        quoted = false;
      }
      continue;
    }
    if (character === "'") {
      quoted = true;
    } else if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
      if (depth === 0) {
        return {
          content: sql.slice(openIndex + 1, index),
          end: index + 1,
        };
      }
    }
  }
  return null;
}

function splitTopLevelCommaList(value: string) {
  const entries: string[] = [];
  let start = 0;
  let depth = 0;
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quoted) {
      if (character === "'" && value[index + 1] === "'") {
        index += 1;
      } else if (character === "'") {
        quoted = false;
      }
      continue;
    }
    if (character === "'") {
      quoted = true;
    } else if (character === "(" || character === "[") {
      depth += 1;
    } else if (character === ")" || character === "]") {
      depth -= 1;
    } else if (character === "," && depth === 0) {
      entries.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  entries.push(value.slice(start).trim());
  return entries.filter(Boolean);
}

function inspectReleaseInsert(sql: string) {
  const prefix = "insert into public.curriculum_releases";
  const insertIndex = sql.indexOf(prefix);
  if (insertIndex < 0) {
    return {
      found: false,
      columnCount: 0,
      valueCount: 0,
    };
  }
  const columnOpen = sql.indexOf("(", insertIndex + prefix.length);
  const columns =
    columnOpen < 0
      ? null
      : readParenthesized(sql, columnOpen);
  if (!columns) {
    return {
      found: true,
      columnCount: 0,
      valueCount: 0,
    };
  }
  const valuesKeyword = sql.slice(columns.end).search(/\bvalues\b/iu);
  if (valuesKeyword < 0) {
    return {
      found: true,
      columnCount: splitTopLevelCommaList(columns.content).length,
      valueCount: 0,
    };
  }
  const valueOpen = sql.indexOf(
    "(",
    columns.end + valuesKeyword,
  );
  const values =
    valueOpen < 0 ? null : readParenthesized(sql, valueOpen);
  return {
    found: true,
    columnCount: splitTopLevelCommaList(columns.content).length,
    valueCount: values
      ? splitTopLevelCommaList(values.content).length
      : 0,
  };
}

export type Project004ContentSqlContract = {
  pass: boolean;
  releaseInsertFound: boolean;
  releaseColumnCount: number;
  releaseValueCount: number;
  beginCount: number;
  commitCount: number;
  onErrorStop: boolean;
  markerCount: number;
  transport: "STDIN_MEMORY";
  sqlFilePreparation: "NOT_USED";
  failedChecks: string[];
};

export function inspectProject004ContentSqlContract(
  sql: string,
): Project004ContentSqlContract {
  const releaseInsert = inspectReleaseInsert(sql);
  const beginCount = sql.match(/^begin;$/gmu)?.length ?? 0;
  const commitCount = sql.match(/^commit;$/gmu)?.length ?? 0;
  const markers = Object.values(
    project004ContentProgressMarkers,
  );
  const markerCount = markers.filter((marker) =>
    sql.includes(`\\echo ${marker}`),
  ).length;
  const checks = {
    RELEASE_INSERT_FOUND: releaseInsert.found,
    RELEASE_INSERT_ARITY:
      releaseInsert.columnCount === 12 &&
      releaseInsert.valueCount === 12,
    SINGLE_TRANSACTION:
      beginCount === 1 && commitCount === 1,
    ON_ERROR_STOP:
      /^\\set ON_ERROR_STOP on$/mu.test(sql),
    SAFE_PROGRESS_MARKERS:
      markerCount === markers.length,
  };
  const failedChecks = Object.entries(checks)
    .filter(([, pass]) => !pass)
    .map(([name]) => name);
  return {
    pass: failedChecks.length === 0,
    releaseInsertFound: releaseInsert.found,
    releaseColumnCount: releaseInsert.columnCount,
    releaseValueCount: releaseInsert.valueCount,
    beginCount,
    commitCount,
    onErrorStop: checks.ON_ERROR_STOP,
    markerCount,
    transport: "STDIN_MEMORY",
    sqlFilePreparation: "NOT_USED",
    failedChecks,
  };
}

export function assertProject004ContentSqlContract(
  sql: string,
) {
  const contract = inspectProject004ContentSqlContract(sql);
  if (!contract.pass) {
    throw new Error(
      `PROJECT004_CONTENT_SQL_CONTRACT_INVALID:${contract.failedChecks.join(",")}`,
    );
  }
  return contract;
}
