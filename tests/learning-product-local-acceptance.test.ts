import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const runnerUrl = new URL(
  "../scripts/run-learning-product-local-acceptance.ts",
  import.meta.url,
);
const runnerPath = fileURLToPath(runnerUrl);
const runner = readFileSync(runnerUrl, "utf8");
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { scripts: Record<string, string> };

test("Node 22 strip-only executable smoke starts before local mutation", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      runnerPath,
      "--smoke",
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: "",
      },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout,
    "LEARNING_PRODUCT_ACCEPTANCE_SMOKE=PASS\n",
  );
  assert.doesNotMatch(
    result.stderr,
    /ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX/,
  );
});

test("executable precondition smoke fails clearly without cleanup mutation", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      runnerPath,
      "--smoke-precondition",
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: "",
      },
    },
  );
  assert.equal(result.status, 1);
  assert.equal(
    result.stdout,
    "ACCEPTANCE_CHECK SYNTHETIC_CLEANUP_NOT_REQUIRED=PASS\n",
  );
  assert.deepEqual(
    result.stderr
      .split(/\r?\n/)
      .filter((line) => line.startsWith("ACCEPTANCE_CHECK ")),
    ["ACCEPTANCE_CHECK PRECONDITION_APP_NOT_RUNNING=FAIL"],
  );
  assert.doesNotMatch(result.stderr, /UNCLASSIFIED_FAILURE/);
});

test("every package strip-only script entry point parses on Node 22", () => {
  const scriptPaths = [
    ...new Set(
      Object.values(packageJson.scripts)
        .filter((command) =>
          command.includes("--experimental-strip-types"),
        )
        .flatMap(
          (command) =>
            command.match(
              /\bscripts\/[A-Za-z0-9._/-]+[.]ts\b/g,
            ) ?? [],
        ),
    ),
  ].sort();
  assert.ok(scriptPaths.length > 0);
  for (const relativePath of scriptPaths) {
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--check",
        fileURLToPath(
          new URL(`../${relativePath}`, import.meta.url),
        ),
      ],
      { encoding: "utf8" },
    );
    assert.equal(
      result.status,
      0,
      `${relativePath}\n${result.stderr}`,
    );
    assert.doesNotMatch(
      result.stderr,
      /ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX/,
    );
  }
});

test("single local acceptance runner covers Grades 1–9 generation", () => {
  assert.match(
    runner,
    /const grades = \[1, 2, 3, 4, 5, 6, 7, 8, 9\] as const/,
  );
  for (const evidence of [
    "DETERMINISTIC_REPLAY",
    "SEMANTIC_VARIANT",
    "INDEPENDENT_RECOMPUTATION",
    "GENERATED_DATABASE_WRONG_GRADE",
    "GENERATED_DATABASE_CORRECT_GRADE",
    "GENERATED_SUBMIT_IDEMPOTENT",
    "LOGOUT_LOGIN_PERSISTENCE",
    "PROGRESS_HISTORY",
    "ADAPTIVE_USES_REAL_EVIDENCE",
  ]) {
    assert.match(runner, new RegExp(evidence));
  }
});

test("runner covers Parent authorization states and multi-child visibility", () => {
  for (const evidence of [
    "PARENT_MULTI_CHILD_SWITCH",
    "PARENT_PENDING_DENIED",
    "PARENT_REJECTED_DENIED",
    "PARENT_REVOKED_DENIED",
    "PARENT_HTTP_COOKIE_JOURNEY",
    "PARENT_GRADE_",
  ]) {
    assert.match(runner, new RegExp(evidence));
  }
});

test("runner covers Teacher invitation through gradebook for every grade", () => {
  for (const evidence of [
    "TEACHER_INVITATION_ACTIVATED",
    "CLASSROOM_CREATE",
    "TEACHER_CLASSROOM_APPROVE",
    "DETERMINISTIC",
    "MANUAL",
    "ASSIGNMENT_SUBMIT",
    "GRADEBOOK",
    "TEACHER_HTTP_COOKIE_JOURNEY",
  ]) {
    assert.match(runner, new RegExp(evidence));
  }
});

test("runner emits only named checks and aggregate non-sensitive latency", () => {
  assert.doesNotMatch(runner, /console\.(?:log|error|warn)/);
  assert.doesNotMatch(
    runner,
    /process\.(?:stdout|stderr)\.write\((?:payload|text|email|userId|invitationCode)/,
  );
  assert.match(runner, /ACCEPTANCE_CHECK/);
  assert.match(runner, /ACCEPTANCE_LATENCY/);
  assert.match(runner, /SYNTHETIC_CLEANUP/);
  assert.match(runner, /assertOwnerLocalDemoPreflight/);
  assert.match(runner, /PRECONDITION_APP_NOT_RUNNING/);
  assert.match(runner, /SYNTHETIC_CLEANUP_NOT_REQUIRED/);
});
