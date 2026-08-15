import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { classifyHarnessChild } from "./run-official-full-harness.ts";

const GROUPS = {
  "migration-inventory": ["tests/project004-remote-migration-0041.test.ts"],
  "disposable-migration": ["tests/project004-disposable-migration-inventory.test.ts"],
  "release-rls": ["tests/remote-rls-drift-remediation.test.mjs"],
  "release-integration": ["tests/grades-2-9-release-integration.test.ts"],
  "final-local-acceptance": ["tests/final-local-acceptance.test.ts"],
  "browser-receipt": ["tests/real-local-browser-acceptance.test.ts"],
} as const;

export type CiQualityTestGroup = keyof typeof GROUPS;

export type TapFailureDetail = Readonly<{
  title: string;
  file?: string;
  line?: number;
  column?: number;
}>;

const safeChildEnvironment = (): NodeJS.ProcessEnv => {
  const environment: NodeJS.ProcessEnv = {
    CI: "1",
    NODE_ENV: "test",
    npm_config_offline: "true",
    npm_config_audit: "false",
    npm_config_fund: "false",
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    TZ: "UTC",
  };
  for (const key of ["PATH", "TMPDIR", "TMP", "TEMP"]) {
    if (process.env[key]) environment[key] = process.env[key];
  }
  return environment;
};

function repositoryPath(location: string) {
  const normalized = location.replace(/^file:\/\//u, "").replaceAll("\\", "/");
  for (const marker of ["/tests/", "/scripts/", "/lib/"]) {
    const index = normalized.lastIndexOf(marker);
    if (index >= 0) return normalized.slice(index + 1);
  }
  return undefined;
}

export function extractTapFailureDetails(output: string): readonly TapFailureDetail[] {
  const failures = [...output.matchAll(/^\s*not ok \d+ - (.+)$/gmu)];
  return failures.map((failure, index) => {
    const start = (failure.index ?? 0) + failure[0].length;
    const end = failures[index + 1]?.index ?? output.length;
    const block = output.slice(start, end);
    const location = block.match(/^\s*location: ['"](.+):(\d+):(\d+)['"]\s*$/mu);
    return {
      title: failure[1].trim(),
      ...(location
        ? {
            file: repositoryPath(location[1]),
            line: Number(location[2]),
            column: Number(location[3]),
          }
        : {}),
    };
  });
}

function workflowEscape(value: string) {
  return value.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}

function workflowPropertyEscape(value: string) {
  return workflowEscape(value).replaceAll(":", "%3A").replaceAll(",", "%2C");
}

export function renderFailureAnnotation(group: CiQualityTestGroup, failure: TapFailureDetail) {
  const properties = failure.file
    ? ` file=${workflowPropertyEscape(failure.file)},line=${String(failure.line ?? 1)},col=${String(failure.column ?? 1)}`
    : "";
  return `::error${properties}::${workflowEscape(`[${group}] ${failure.title}`)}`;
}

export function runCiQualityTestGroup(
  group: CiQualityTestGroup,
  root = resolve(import.meta.dirname, ".."),
) {
  const files = GROUPS[group];
  if (!files) throw new Error("PLAVE_CI_TEST_GROUP:UNKNOWN_GROUP");
  const result = spawnSync(
    process.execPath,
    [
      "--test",
      "--test-concurrency=1",
      "--no-warnings",
      "--experimental-strip-types",
      ...files,
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: safeChildEnvironment(),
      maxBuffer: 16 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const spawnErrorCode = result.error && "code" in result.error &&
      typeof result.error.code === "string"
    ? result.error.code
    : result.error
      ? "UNKNOWN"
      : null;
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  const output = `${stdout}\n${stderr}`;
  const outputTruncated = spawnErrorCode === "ENOBUFS";
  const classification = classifyHarnessChild({
    output,
    exitCode: result.status,
    signal: result.signal,
    outputTruncated,
  });
  const failures = extractTapFailureDetails(output);
  for (const failure of failures) console.log(renderFailureAnnotation(group, failure));
  const summary = {
    schemaVersion: "PLAVE_CI_TEST_GROUP_V1",
    group,
    files,
    exitCode: result.status,
    signal: result.signal,
    spawnError: spawnErrorCode,
    outputTruncated,
    terminalSummaryValid: classification.validTerminalSummary,
    totals: classification.totals,
    actualFailures: classification.actualFailures,
    failureTitles: classification.failureTitles,
    reason: classification.reason,
  } as const;
  console.log(`PLAVE_CI_TEST_GROUP_SUMMARY=${JSON.stringify(summary)}`);
  if (!classification.validTerminalSummary || classification.actualFailures > 0) {
    process.exitCode = 1;
  }
  return summary;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const group = process.argv[2] as CiQualityTestGroup | undefined;
  if (!group || !(group in GROUPS)) {
    console.log(`PLAVE_CI_TEST_GROUP_SUMMARY=${JSON.stringify({
      schemaVersion: "PLAVE_CI_TEST_GROUP_V1",
      group: group ?? null,
      terminalSummaryValid: false,
      actualFailures: 1,
      reason: "UNKNOWN_GROUP",
    })}`);
    process.exitCode = 1;
  } else {
    runCiQualityTestGroup(group);
  }
}
