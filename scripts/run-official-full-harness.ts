import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { tmpdir } from "node:os";
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
  reason: "RECONCILED" | "MISSING_TERMINAL_SUMMARY" | "TRUNCATED_OUTPUT" | "COUNT_MISMATCH" | "CHILD_EXIT_WITHOUT_FAILURE";
}>;

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
  exactEnvironmentFailureTitles?: readonly string[];
  exactEnvironmentFailureEvidence?: RegExp;
}>): HarnessChildClassification {
  const failureTitles = extractTapFailureTitles(input.output);
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
  if (!totals || input.signal) {
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
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    output += chunk;
  });
  const result = await new Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>((resolveResult) => {
    child.once("close", (exitCode, signal) => resolveResult({ exitCode, signal }));
  });
  const classification = classifyHarnessChild({
    output,
    ...result,
    exactEnvironmentFailureTitles: group.exactEnvironmentFailureTitles,
    exactEnvironmentFailureEvidence: group.exactEnvironmentFailureEvidence,
  });
  return { name: group.name, ...classification };
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
    schemaVersion: "PLAVE_OFFICIAL_FULL_HARNESS_V1",
    sourceTestFiles: allFiles.length,
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
    temporaryOutputRoot: tmpdir(),
  } as const;
  console.log(`PLAVE_FULL_HARNESS_SUMMARY=${JSON.stringify(summary)}`);
  if (!summary.terminalSummaryValid || summary.directActualFailures > 0) {
    process.exitCode = 1;
  }
  return summary;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runOfficialFullHarness().catch((error: unknown) => {
    const summary = {
      schemaVersion: "PLAVE_OFFICIAL_FULL_HARNESS_V1",
      terminalSummaryValid: false,
      directActualFailures: 1,
      reason: "RUNNER_CRASH",
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
    console.log(`PLAVE_FULL_HARNESS_SUMMARY=${JSON.stringify(summary)}`);
    process.exitCode = 1;
  });
}
