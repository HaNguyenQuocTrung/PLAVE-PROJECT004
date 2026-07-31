import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  DisposableProofInterruptedError,
  DisposableProofLifecycle,
  disposableProofRunStateRelativePath,
  disposableProofStageTimeoutMs,
} from "../scripts/project004-disposable-proof-lifecycle.ts";
import { renderDisposableProofFailure } from "../scripts/run-project004-clean-disposable-proof.ts";

const root = resolve(import.meta.dirname, "..");

test("every disposable proof stage has a positive bounded deadline", () => {
  assert.deepEqual(
    Object.keys(disposableProofStageTimeoutMs).sort(),
    [
      "ACTIVATION_JOURNEY",
      "ACTIVATION_PREFLIGHT",
      "ACTIVATION_TRANSACTION",
      "CLEANUP",
      "CONTENT_TRANSACTION",
      "DEACTIVATION_TRANSACTION",
      "MIGRATION_EXECUTION",
      "POST_APPLY_DIAGNOSTIC",
      "POST_MIGRATION_WAIT",
      "RUNTIME_HISTORY_QUERY",
      "SEMANTIC_FINGERPRINT",
      "SERVICE_BOOTSTRAP",
      "WORKSPACE_PREPARATION",
    ],
  );
  for (const timeout of Object.values(
    disposableProofStageTimeoutMs,
  )) {
    assert.equal(Number.isSafeInteger(timeout), true);
    assert.ok(timeout > 0);
    assert.ok(timeout <= 420_000);
  }
});

test("lifecycle emits safe progress and persists only sanitized stage state", () => {
  const workdir = mkdtempSync(
    join(tmpdir(), "plave-project004-lifecycle-test-"),
  );
  const output: string[] = [];
  let now = 1000;
  const lifecycle = new DisposableProofLifecycle({
    emit: (line) => output.push(line),
    now: () => now,
  });
  try {
    lifecycle.attachWorkdir(workdir);
    lifecycle.begin("SEMANTIC_FINGERPRINT");
    now = 1123;
    lifecycle.finish("PASS");
    assert.deepEqual(output, [
      "DISPOSABLE_PROGRESS=SEMANTIC_FINGERPRINT:START",
      "DISPOSABLE_PROGRESS=SEMANTIC_FINGERPRINT:PASS:123ms",
    ]);
    const state = JSON.parse(
      readFileSync(
        resolve(
          workdir,
          disposableProofRunStateRelativePath,
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;
    assert.deepEqual(state, {
      version: "PROJECT004_DISPOSABLE_PROOF_RUN_STATE_V1",
      stage: "SEMANTIC_FINGERPRINT",
      status: "PASS",
      sequence: 1,
      durationMs: 123,
      signal: "NONE",
    });
    assert.doesNotMatch(
      JSON.stringify(state),
      /url|port|key|password|token|project.?id|container|pid/iu,
    );
  } finally {
    rmSync(workdir, { recursive: true, force: true });
  }
});

test("phase heartbeat uses lifecycle elapsed and is cleared by the matching finish", () => {
  const output: string[] = [];
  let now = 1_000;
  const lifecycle = new DisposableProofLifecycle({
    emit: (line) => output.push(line),
    now: () => now,
  });
  lifecycle.begin("POST_MIGRATION_WAIT");
  now = 14_000;
  lifecycle.heartbeat(
    "POST_MIGRATION_WAIT",
    lifecycle.currentStageElapsedMs(),
  );
  now = 14_257;
  lifecycle.finish("PASS");
  assert.deepEqual(output, [
    "DISPOSABLE_PROGRESS=POST_MIGRATION_WAIT:START",
    "DISPOSABLE_HEARTBEAT=POST_MIGRATION_WAIT:13000ms",
    "DISPOSABLE_PROGRESS=POST_MIGRATION_WAIT:PASS:13257ms",
  ]);
});

test("SIGINT state is persisted and converted into a controlled interruption", () => {
  const workdir = mkdtempSync(
    join(tmpdir(), "plave-project004-signal-test-"),
  );
  const output: string[] = [];
  const lifecycle = new DisposableProofLifecycle({
    emit: (line) => output.push(line),
  });
  try {
    lifecycle.attachWorkdir(workdir);
    lifecycle.begin("CONTENT_TRANSACTION");
    lifecycle.interrupt("SIGINT");
    assert.throws(
      () => lifecycle.throwIfInterrupted(),
      (error) =>
        error instanceof DisposableProofInterruptedError &&
        error.signal === "SIGINT",
    );
    assert.match(
      output.join("\n"),
      /DISPOSABLE_SIGNAL=SIGINT:RECEIVED/u,
    );
    const state = JSON.parse(
      readFileSync(
        resolve(
          workdir,
          disposableProofRunStateRelativePath,
        ),
        "utf8",
      ),
    ) as { status: string; signal: string };
    assert.equal(state.status, "INTERRUPTED");
    assert.equal(state.signal, "SIGINT");
  } finally {
    rmSync(workdir, { recursive: true, force: true });
  }
});

test("proof installs signal handlers, cleans in finally and never uses broad stop", () => {
  const source = readFileSync(
    resolve(
      root,
      "scripts/run-project004-clean-disposable-proof.ts",
    ),
    "utf8",
  );
  const allProofSources =
    source +
    readFileSync(
      resolve(
        root,
        "scripts/run-project004-universal-activation-disposable-proof.ts",
      ),
      "utf8",
    );
  assert.ok(
    source.includes(
      "installDisposableProofSignalHandlers",
    ),
  );
  assert.ok(source.includes("finally {"));
  assert.ok(
    source.includes('lifecycle.begin("CLEANUP")'),
  );
  const stopIndex = source.indexOf('"stop"');
  const workdirIndex = source.indexOf(
    '"--workdir"',
    stopIndex,
  );
  const projectIdIndex = source.indexOf(
    '"--project-id"',
    workdirIndex,
  );
  const noBackupIndex = source.indexOf(
    '"--no-backup"',
    projectIdIndex,
  );
  assert.ok(stopIndex >= 0);
  assert.ok(workdirIndex > stopIndex);
  assert.ok(projectIdIndex > workdirIndex);
  assert.ok(noBackupIndex > projectIdIndex);
  assert.equal(source.includes('"--all"'), false);
  assert.equal(
    source.includes('lifecycle.note("MIGRATION_EXECUTION"'),
    false,
  );
  assert.match(source, /SERVICE_BOOTSTRAP/u);
  assert.match(source, /MIGRATION_EXECUTION/u);
  assert.match(source, /POST_MIGRATION_WAIT/u);
  for (const stage of Object.keys(
    disposableProofStageTimeoutMs,
  )) {
    assert.match(allProofSources, new RegExp(stage, "u"));
  }
});

test("timeout failures remain classified and never claim a migration failed", () => {
  const output = renderDisposableProofFailure({
    code: "DISPOSABLE_STAGE_TIMEOUT_CONTENT_TRANSACTION",
    cleanup: "PASS",
  });
  assert.match(
    output,
    /ROOT_FAILURE_CODE=DISPOSABLE_STAGE_TIMEOUT_CONTENT_TRANSACTION/u,
  );
  assert.match(
    output,
    /MIGRATION_EXECUTION_STARTED=YES/u,
  );
  assert.match(output, /MIGRATION_LAST_PASS=0040/u);
  assert.doesNotMatch(
    output,
    /MIGRATION_FIRST_FAIL=0001/u,
  );
});

test("user interruption has a dedicated root code instead of an unrecognized start failure", () => {
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    const output = renderDisposableProofFailure({
      code: `DISPOSABLE_PROOF_INTERRUPTED_${signal}`,
      cleanup: "PASS",
    });
    assert.match(
      output,
      new RegExp(
        `ROOT_FAILURE_CODE=DISPOSABLE_PROOF_INTERRUPTED_${signal}`,
        "u",
      ),
    );
    assert.doesNotMatch(output, /UNRECOGNIZED/u);
  }
});

test("interrupted cleanup diagnostic is exact-scope only", () => {
  const source = readFileSync(
    resolve(
      root,
      "scripts/cleanup-interrupted-project004-disposable-proof.ts",
    ),
    "utf8",
  );
  assert.ok(source.includes("newest.modifiedAt"));
  assert.ok(source.includes("60_000"));
  assert.ok(
    source.includes(
      "assertDisposableCleanupScope(workdir, projectId)",
    ),
  );
  const stopIndex = source.indexOf('"stop"');
  const workdirIndex = source.indexOf(
    '"--workdir"',
    stopIndex,
  );
  const projectIdIndex = source.indexOf(
    '"--project-id"',
    workdirIndex,
  );
  assert.ok(stopIndex >= 0);
  assert.ok(workdirIndex > stopIndex);
  assert.ok(projectIdIndex > workdirIndex);
  assert.equal(source.includes('"--all"'), false);
  assert.match(
    source,
    /OTHER_CANDIDATES_TOUCHED/u,
  );
});
