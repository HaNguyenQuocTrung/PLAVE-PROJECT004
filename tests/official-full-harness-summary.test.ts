import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyHarnessChild,
  parseTerminalTapSummary,
} from "../scripts/run-official-full-harness.ts";

const terminal = (override: Partial<Record<"tests" | "pass" | "fail" | "cancelled" | "skipped" | "todo", number>> = {}) => {
  const value = { tests: 1, pass: 1, fail: 0, cancelled: 0, skipped: 0, todo: 0, ...override };
  return `TAP version 13\n1..${value.tests}\n# tests ${value.tests}\n# pass ${value.pass}\n# fail ${value.fail}\n# cancelled ${value.cancelled}\n# skipped ${value.skipped}\n# todo ${value.todo}\n`;
};

test("all-pass terminal TAP is reconciled exactly", () => {
  const output = terminal({ tests: 3, pass: 3 });
  assert.deepEqual(parseTerminalTapSummary(output), {
    tests: 3,
    pass: 3,
    fail: 0,
    cancelled: 0,
    skipped: 0,
    todo: 0,
  });
  assert.deepEqual(
    classifyHarnessChild({ output, exitCode: 0, signal: null }),
    {
      validTerminalSummary: true,
      totals: { tests: 3, pass: 3, fail: 0, cancelled: 0, skipped: 0, todo: 0 },
      actualFailures: 0,
      environmentExclusions: 0,
      failureTitles: [],
      reason: "RECONCILED",
    },
  );
});

test("one actual failure remains an actual failure", () => {
  const output = `not ok 1 - exact defect\n${terminal({ pass: 0, fail: 1 })}`;
  const result = classifyHarnessChild({ output, exitCode: 1, signal: null });
  assert.equal(result.actualFailures, 1);
  assert.equal(result.environmentExclusions, 0);
});

test("only an exact named environment failure is classified as an exclusion", () => {
  const output = `not ok 1 - denied disposable loopback bind\n${terminal({ pass: 0, fail: 1 })}`;
  const result = classifyHarnessChild({
    output,
    exitCode: 1,
    signal: null,
    exactEnvironmentFailureTitles: ["denied disposable loopback bind"],
  });
  assert.equal(result.actualFailures, 0);
  assert.equal(result.environmentExclusions, 1);
  assert.equal(result.totals.fail, 1);
});

test("an exact missing disposable artifact is classified without accepting assertion drift", () => {
  const output = `not ok 1 - artifact-backed evidence\nerror: ENOENT: no such file, open 'artifacts/proof.json'\n${terminal({ pass: 0, fail: 1 })}`;
  const result = classifyHarnessChild({
    output,
    exitCode: 1,
    signal: null,
    exactEnvironmentFailureEvidence: /ENOENT:[^\n]*artifacts\//gmu,
  });
  assert.equal(result.actualFailures, 0);
  assert.equal(result.environmentExclusions, 1);
  const assertionDrift = classifyHarnessChild({
    output: `not ok 1 - artifact-backed evidence\nerror: expected 1 but received 2\n${terminal({ pass: 0, fail: 1 })}`,
    exitCode: 1,
    signal: null,
    exactEnvironmentFailureEvidence: /ENOENT:[^\n]*artifacts\//gmu,
  });
  assert.equal(assertionDrift.actualFailures, 1);
  assert.equal(assertionDrift.environmentExclusions, 0);
});

test("missing terminal summary fails closed", () => {
  const result = classifyHarnessChild({
    output: "TAP version 13\nok 1 - partial\n",
    exitCode: 0,
    signal: null,
  });
  assert.equal(result.validTerminalSummary, false);
  assert.equal(result.reason, "MISSING_TERMINAL_SUMMARY");
  assert.equal(result.actualFailures, 1);
});

test("explicitly truncated output fails closed", () => {
  const result = classifyHarnessChild({
    output: terminal(),
    exitCode: 0,
    signal: null,
    outputTruncated: true,
  });
  assert.equal(result.reason, "TRUNCATED_OUTPUT");
  assert.equal(result.actualFailures, 1);
});

test("child nonzero exit without a TAP failure is not hidden", () => {
  const result = classifyHarnessChild({
    output: terminal(),
    exitCode: 2,
    signal: null,
  });
  assert.equal(result.reason, "CHILD_EXIT_WITHOUT_FAILURE");
  assert.equal(result.actualFailures, 1);
});

test("inconsistent summary counts fail reconciliation", () => {
  const output = terminal({ tests: 4, pass: 3 });
  const result = classifyHarnessChild({ output, exitCode: 0, signal: null });
  assert.equal(result.reason, "COUNT_MISMATCH");
  assert.equal(result.actualFailures, 1);
});
