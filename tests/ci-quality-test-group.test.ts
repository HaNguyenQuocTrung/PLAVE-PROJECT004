import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  extractTapFailureDetails,
  renderFailureAnnotation,
} from "../scripts/run-ci-quality-test-group.ts";

const runnerSource = readFileSync(
  new URL("../scripts/run-ci-quality-test-group.ts", import.meta.url),
  "utf8",
);

test("CI TAP diagnostics retain exact failing test file, line, and name", () => {
  const output = [
    "not ok 3 - exact Ubuntu contract",
    "  ---",
    "  location: '/home/runner/work/PLAVE-PROJECT004/PLAVE-PROJECT004/tests/example.test.ts:41:7'",
    "  error: expected 0 but received 1",
    "  ...",
    "1..3",
    "# tests 3",
    "# pass 2",
    "# fail 1",
    "# cancelled 0",
    "# skipped 0",
    "# todo 0",
  ].join("\n");
  assert.deepEqual(extractTapFailureDetails(output), [{
    title: "exact Ubuntu contract",
    file: "tests/example.test.ts",
    line: 41,
    column: 7,
  }]);
});

test("CI failure annotations are sanitized and repository-relative", () => {
  assert.equal(
    renderFailureAnnotation("release-rls", {
      title: "policy mismatch, expected: deny-all",
      file: "tests/remote-rls.test.mjs",
      line: 12,
      column: 3,
    }),
    "::error file=tests/remote-rls.test.mjs,line=12,col=3::[release-rls] policy mismatch, expected: deny-all",
  );
});

test("CI TAP diagnostics preserve failures without a location", () => {
  assert.deepEqual(
    extractTapFailureDetails("not ok 1 - child exited before location\n# fail 1\n"),
    [{ title: "child exited before location" }],
  );
});

test("CI runner emits a terminal summary before failing closed on unknown input", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      "scripts/run-ci-quality-test-group.ts",
      "unknown-group",
    ],
    { cwd: new URL("..", import.meta.url), encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stdout, /PLAVE_CI_TEST_GROUP_SUMMARY=/u);
  assert.match(result.stdout, /"reason":"UNKNOWN_GROUP"/u);
});

test("CI runner treats truncated output as a failure and prints summary before exit propagation", () => {
  assert.match(runnerSource, /outputTruncated = spawnErrorCode === "ENOBUFS"/u);
  const summaryIndex = runnerSource.indexOf("PLAVE_CI_TEST_GROUP_SUMMARY=");
  const exitIndex = runnerSource.indexOf("process.exitCode = 1", summaryIndex);
  assert.ok(summaryIndex >= 0);
  assert.ok(exitIndex > summaryIndex);
  assert.match(runnerSource, /!classification[.]validTerminalSummary/u);
});
