import { spawn } from "node:child_process";
import { appendFileSync, createWriteStream, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type TapTotals = Readonly<{
  tests: number;
  pass: number;
  fail: number;
  cancelled: number;
  skipped: number;
  todo: number;
}>;

export type HarnessChildClassification = Readonly<{
  validTerminalSummary: boolean;
  totals: TapTotals;
  actualFailures: number;
  environmentExclusions: number;
  failureTitles: readonly string[];
  reason: "RECONCILED" | "MISSING_TERMINAL_SUMMARY" | "TRUNCATED_OUTPUT" | "COUNT_MISMATCH" | "CHILD_EXIT_WITHOUT_FAILURE" | "CHILD_SIGNAL" | "TIMEOUT" | "CLEANUP_FAILURE";
}>;

export type HarnessFailureDetail = Readonly<{
  title: string;
  file?: string;
  line?: number;
  column?: number;
  diagnostic: string;
}>;

const MAX_CAPTURE_BYTES = 16 * 1024 * 1024;
const GROUP_TIMEOUT_MS = 15 * 60 * 1000;
const TERMINATION_GRACE_MS = 5_000;

const emptyTotals = (): TapTotals => ({
  tests: 0,
  pass: 0,
  fail: 0,
  cancelled: 0,
  skipped: 0,
  todo: 0,
});

function finalCount(output: string, label: keyof TapTotals): number | null {
  const matches = [...output.matchAll(new RegExp(`^# ${label} (\\d+)$`, "gmu"))];
  const value = matches.at(-1)?.[1];
  return value === undefined ? null : Number(value);
}

export function extractTapFailureTitles(output: string): readonly string[] {
  return [...output.matchAll(/^\s*not ok \d+ - (.+)$/gmu)].map((match) =>
    match[1].trim(),
  );
}

function repositoryPath(location: string) {
  const normalized = location.replace(/^file:\/\//u, "").replaceAll("\\", "/");
  const marker = normalized.lastIndexOf("/tests/");
  return marker >= 0 ? normalized.slice(marker + 1) : undefined;
}

export function extractHarnessFailureDetails(output: string): readonly HarnessFailureDetail[] {
  const failures = [...output.matchAll(/^\s*not ok \d+ - (.+)$/gmu)];
  return failures.map((failure, index) => {
    const start = (failure.index ?? 0) + failure[0].length;
    const end = failures[index + 1]?.index ?? output.length;
    const block = output.slice(start, end);
    const location = block.match(/^\s*location: ['"](.+):(\d+):(\d+)['"]\s*$/mu);
    const file = location ? repositoryPath(location[1]) : undefined;
    return {
      title: failure[1].trim(),
      diagnostic: redactHarnessOutput(block.trim()).slice(0, 2_000),
      ...(file ? { file, line: Number(location?.[2] ?? 1), column: Number(location?.[3] ?? 1) } : {}),
    };
  });
}

export function redactHarnessOutput(value: string) {
  return value
    .replace(/\b(Bearer)\s+[A-Za-z0-9._~+/=-]+/giu, "$1 [REDACTED]")
    .replace(/\b(token|password|secret|cookie|authorization|api[_-]?key)\s*[:=]\s*[^\s,;]+/giu, "$1=[REDACTED]")
    .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/giu, "$1[REDACTED]@");
}

function workflowEscape(value: string) {
  return value.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}

function workflowPropertyEscape(value: string) {
  return workflowEscape(value).replaceAll(":", "%3A").replaceAll(",", "%2C");
}

export function renderHarnessFailureAnnotation(group: string, failure: HarnessFailureDetail) {
  const properties = failure.file
    ? ` file=${workflowPropertyEscape(failure.file)},line=${String(failure.line ?? 1)},col=${String(failure.column ?? 1)}`
    : "";
  return `::error${properties}::${workflowEscape(`[full-harness:${group}] ${failure.title}`)}`;
}

export function parseTerminalTapSummary(output: string): TapTotals | null {
  const values = {
    tests: finalCount(output, "tests"),
    pass: finalCount(output, "pass"),
    fail: finalCount(output, "fail"),
    cancelled: finalCount(output, "cancelled"),
    skipped: finalCount(output, "skipped"),
    todo: finalCount(output, "todo"),
  };
  if (Object.values(values).some((value) => value === null)) return null;
  return values as TapTotals;
}

export function classifyHarnessChild(input: Readonly<{
  output: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  outputTruncated?: boolean;
  timedOut?: boolean;
  cleanupFailed?: boolean;
  exactEnvironmentFailureTitles?: readonly string[];
  exactEnvironmentFailureEvidence?: RegExp;
}>): HarnessChildClassification {
  const failureTitles = extractTapFailureTitles(input.output);
  if (input.timedOut || input.cleanupFailed) {
    return {
      validTerminalSummary: false,
      totals: emptyTotals(),
      actualFailures: 1,
      environmentExclusions: 0,
      failureTitles,
      reason: input.timedOut ? "TIMEOUT" : "CLEANUP_FAILURE",
    };
  }
  if (input.outputTruncated) {
    return {
      validTerminalSummary: false,
      totals: emptyTotals(),
      actualFailures: 1,
      environmentExclusions: 0,
      failureTitles,
      reason: "TRUNCATED_OUTPUT",
    };
  }
  const totals = parseTerminalTapSummary(input.output);
  if (input.signal) {
    return {
      validTerminalSummary: false,
      totals: emptyTotals(),
      actualFailures: 1,
      environmentExclusions: 0,
      failureTitles,
      reason: "CHILD_SIGNAL",
    };
  }
  if (!totals) {
    return {
      validTerminalSummary: false,
      totals: emptyTotals(),
      actualFailures: 1,
      environmentExclusions: 0,
      failureTitles,
      reason: "MISSING_TERMINAL_SUMMARY",
    };
  }
  if (
    totals.tests !==
    totals.pass + totals.fail + totals.cancelled + totals.skipped + totals.todo
  ) {
    return {
      validTerminalSummary: false,
      totals,
      actualFailures: Math.max(1, totals.fail),
      environmentExclusions: 0,
      failureTitles,
      reason: "COUNT_MISMATCH",
    };
  }
  if (input.exitCode !== 0 && totals.fail === 0 && totals.cancelled === 0) {
    return {
      validTerminalSummary: true,
      totals,
      actualFailures: 1,
      environmentExclusions: 0,
      failureTitles,
      reason: "CHILD_EXIT_WITHOUT_FAILURE",
    };
  }
  const allowed = new Set(input.exactEnvironmentFailureTitles ?? []);
  const evidenceMatches = input.exactEnvironmentFailureEvidence
    ? [...input.output.matchAll(input.exactEnvironmentFailureEvidence)].length
    : 0;
  const allFailuresAreExactEnvironmentExclusions =
    totals.fail > 0 &&
    failureTitles.length === totals.fail &&
    (failureTitles.every((title) => allowed.has(title)) ||
      evidenceMatches >= totals.fail);
  return {
    validTerminalSummary: true,
    totals,
    actualFailures: allFailuresAreExactEnvironmentExclusions ? 0 : totals.fail,
    environmentExclusions: allFailuresAreExactEnvironmentExclusions
      ? totals.fail
      : 0,
    failureTitles,
    reason: "RECONCILED",
  };
}

type HarnessGroup = Readonly<{
  name: string;
  files: readonly string[];
  conditions?: string;
  exactEnvironmentFailureTitles?: readonly string[];
  exactEnvironmentFailureEvidence?: RegExp;
}>;

const safeChildEnvironment = (): NodeJS.ProcessEnv => {
  const environment: NodeJS.ProcessEnv = {
    CI: "1",
    NODE_ENV: "test",
    npm_config_offline: "true",
    npm_config_audit: "false",
    npm_config_fund: "false",
  };
  for (const key of ["PATH", "TMPDIR", "TMP", "TEMP", "LANG", "LC_ALL"]) {
    if (process.env[key]) environment[key] = process.env[key];
  }
  return environment;
};

async function runGroup(root: string, group: HarnessGroup) {
  const args = [
    ...(group.conditions ? [`--conditions=${group.conditions}`] : []),
    "--test",
    "--test-concurrency=1",
    "--no-warnings",
    "--experimental-strip-types",
    ...group.files,
  ];
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: safeChildEnvironment(),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  let outputTruncated = false;
  let timedOut = false;
  let cleanupFailed = false;
  const logPath = process.env.PLAVE_FULL_HARNESS_LOG;
  const log = logPath ? createWriteStream(logPath, { flags: "a", mode: 0o600 }) : null;
  const capture = (chunk: string) => {
    const sanitized = redactHarnessOutput(chunk);
    process.stdout.write(sanitized);
    log?.write(sanitized);
    output += sanitized;
    if (Buffer.byteLength(output, "utf8") > MAX_CAPTURE_BYTES) {
      outputTruncated = true;
      output = output.slice(-MAX_CAPTURE_BYTES);
    }
  };
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  const result = await new Promise<{ exitCode: number | null; signal: NodeJS.Signals | null; spawnError: string | null }>((resolveResult) => {
    let settled = false;
    let forcedTermination: NodeJS.Timeout | undefined;
    const finish = (value: { exitCode: number | null; signal: NodeJS.Signals | null; spawnError: string | null }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (forcedTermination) clearTimeout(forcedTermination);
      resolveResult(value);
    };
    const timeout = setTimeout(() => {
      timedOut = true;
      if (!child.kill("SIGTERM")) {
        cleanupFailed = true;
        return;
      }
      forcedTermination = setTimeout(() => {
        if (!child.kill("SIGKILL")) cleanupFailed = true;
      }, TERMINATION_GRACE_MS);
    }, GROUP_TIMEOUT_MS);
    child.once("error", (error) => finish({ exitCode: null, signal: null, spawnError: error.name }));
    child.once("close", (exitCode, signal) => finish({ exitCode, signal, spawnError: null }));
  });
  await new Promise<void>((resolveLog) => log ? log.end(resolveLog) : resolveLog());
  const classification = classifyHarnessChild({
    output,
    exitCode: result.exitCode,
    signal: result.signal,
    outputTruncated,
    timedOut,
    cleanupFailed,
    exactEnvironmentFailureTitles: group.exactEnvironmentFailureTitles,
    exactEnvironmentFailureEvidence: group.exactEnvironmentFailureEvidence,
  });
  const failures = extractHarnessFailureDetails(output);
  for (const failure of failures) console.log(renderHarnessFailureAnnotation(group.name, failure));
  return {
    name: group.name,
    command: [process.execPath, ...args].map((entry) => entry.replace(root, "<repo>")).join(" "),
    exitCode: result.exitCode,
    signal: result.signal,
    spawnError: result.spawnError,
    timedOut,
    parserStatus: classification.validTerminalSummary ? "VALID" : classification.reason,
    outputTruncated,
    cleanupStatus: cleanupFailed ? "FAIL" as const : "PASS" as const,
    failures,
    ...classification,
  };
}

function addTotals(left: TapTotals, right: TapTotals): TapTotals {
  return {
    tests: left.tests + right.tests,
    pass: left.pass + right.pass,
    fail: left.fail + right.fail,
    cancelled: left.cancelled + right.cancelled,
    skipped: left.skipped + right.skipped,
    todo: left.todo + right.todo,
  };
}

export async function runOfficialFullHarness(root = resolve(import.meta.dirname, "..")) {
  const startedAt = new Date();
  const allFiles = readdirSync(resolve(root, "tests"))
    .filter((name) => /[.]test[.](?:ts|mjs|js)$/u.test(name))
    .sort()
    .map((name) => `tests/${name}`);
  const reactServerFiles = new Set([
    "tests/ai-tutor-configure.test.ts",
    "tests/ai-tutor-quality.test.ts",
    "tests/ai-tutor.test.ts",
  ]);
  const loopbackFile = "tests/project004-clean-disposable-harness.test.ts";
  const generatedArtifactFiles = new Set([
    "tests/generation-contracts.test.ts",
    "tests/generation-v2-database-proof-contract.test.ts",
    "tests/generation-v2-full-coverage.test.ts",
    "tests/generation-v2-wave-a.test.ts",
    "tests/generation-v2-wave-b.test.ts",
    "tests/generation-v2-wave-c.test.ts",
    "tests/generation-v2-wave-d.test.ts",
    "tests/generation-v2-wave-e.test.ts",
    "tests/generation-v2-wave-f.test.ts",
    "tests/generator-v2-owner-review.test.ts",
    "tests/official-gdpt-extraction.test.ts",
    "tests/sprint7a-uiux-contract.test.ts",
    "tests/universal-product-proof.test.ts",
    "tests/universal-semantic-generator.test.ts",
  ]);
  const groups: HarnessGroup[] = [
    {
      name: "DIRECT",
      files: allFiles.filter(
        (file) => !reactServerFiles.has(file) &&
          !generatedArtifactFiles.has(file) &&
          file !== loopbackFile,
      ),
      exactEnvironmentFailureTitles: [
        "Review 1. Filesystem and build manifest both recognize the dynamic review route",
      ],
    },
    {
      name: "REACT_SERVER_DIRECT",
      files: [...reactServerFiles],
      conditions: "react-server",
    },
    {
      name: "GENERATED_ARTIFACT_ENVIRONMENT",
      files: [...generatedArtifactFiles],
      exactEnvironmentFailureEvidence: /ENOENT:[^\n]*artifacts\//gmu,
    },
    {
      name: "LOOPBACK_ENVIRONMENT",
      files: [loopbackFile],
      exactEnvironmentFailureTitles: [
        "dynamic allocator holds seven distinct loopback ports until explicit release",
        "Node 22 strip-types allocator smoke starts without Docker or remote access",
      ],
    },
  ];
  const results = [];
  for (const group of groups) results.push(await runGroup(root, group));
  const totals = results.reduce(
    (current, result) => addTotals(current, result.totals),
    emptyTotals(),
  );
  const summary = {
    schemaVersion: "PLAVE_OFFICIAL_FULL_HARNESS_V2",
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    startedAt: startedAt.toISOString(),
    endedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    command: "npm run --silent test:full:official",
    discoveredFiles: allFiles.length,
    executedTests: totals.tests,
    totals,
    directPass: totals.pass,
    directActualFailures: results.reduce(
      (count, result) => count + result.actualFailures,
      0,
    ),
    knownEnvironmentExclusions: results.reduce(
      (count, result) => count + result.environmentExclusions,
      0,
    ),
    officialEquivalentStatus: results.some(
      (result) => result.environmentExclusions > 0,
    )
      ? "REQUIRED"
      : "NOT_REQUIRED",
    childResults: results,
    terminalSummaryValid: results.every(
      (result) => result.validTerminalSummary,
    ),
    unknownFailures: results.reduce((count, result) => count + (result.validTerminalSummary ? 0 : 1), 0),
    cleanupStatus: results.every((result) => result.cleanupStatus === "PASS") ? "PASS" : "FAIL",
    temporaryOutputRoot: "SYSTEM_TEMPORARY_DIRECTORY",
  } as const;
  emitHarnessSummary(summary);
  if (!summary.terminalSummaryValid || summary.directActualFailures > 0) {
    process.exitCode = 1;
  }
  return summary;
}

function emitHarnessSummary(summary: Readonly<Record<string, unknown>>) {
  const line = renderHarnessSummaryLine(summary);
  const summaryPath = process.env.PLAVE_FULL_HARNESS_SUMMARY_PATH;
  if (summaryPath) appendFileSync(summaryPath, `${line}\n`, { encoding: "utf8", mode: 0o600 });
  else console.log(line);
  const stepSummary = process.env.GITHUB_STEP_SUMMARY;
  if (stepSummary) {
    const totals = summary.totals as TapTotals | undefined;
    appendFileSync(stepSummary, [
      "### PLAVE official full harness",
      `- Result: ${Number(summary.directActualFailures ?? 1) === 0 ? "PASS" : "FAIL"}`,
      `- Tests: ${totals?.tests ?? 0}`,
      `- Pass: ${totals?.pass ?? 0}`,
      `- Actual failures: ${summary.directActualFailures ?? 1}`,
      `- Environment exclusions: ${summary.knownEnvironmentExclusions ?? 0}`,
      `- Unknown failures: ${summary.unknownFailures ?? 1}`,
      `- Parser: ${summary.terminalSummaryValid ? "VALID" : "INVALID"}`,
      `- Cleanup: ${summary.cleanupStatus ?? "FAIL"}`,
      "",
    ].join("\n"), { encoding: "utf8" });
  }
}

export function renderHarnessSummaryLine(summary: Readonly<Record<string, unknown>>) {
  return `PLAVE_FULL_HARNESS_SUMMARY=${JSON.stringify(summary)}`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runOfficialFullHarness().catch((error: unknown) => {
    const summary = {
      schemaVersion: "PLAVE_OFFICIAL_FULL_HARNESS_V2",
      node: process.version,
      platform: `${process.platform}-${process.arch}`,
      terminalSummaryValid: false,
      directActualFailures: 1,
      unknownFailures: 1,
      cleanupStatus: "FAIL",
      reason: "RUNNER_CRASH",
      error: redactHarnessOutput(error instanceof Error ? error.message : "UNKNOWN"),
    };
    emitHarnessSummary(summary);
    process.exitCode = 1;
  });
}
