import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  DisposableProofLifecycle,
  installDisposableProofSignalHandlers,
} from "../scripts/project004-disposable-proof-lifecycle.ts";
import { runManagedChild } from "../scripts/project004-managed-child-process.ts";
import { canStartDisposableProofCleanup } from "../scripts/run-project004-clean-disposable-proof.ts";

const root = resolve(import.meta.dirname, "..");
const safeEnvironment: NodeJS.ProcessEnv = {
  PATH: process.env.PATH,
  NODE_ENV: "test",
};
const hangingChild =
  "process.on('SIGTERM',()=>{});setInterval(()=>{},1000)";

function runHangingChild(options: {
  timeoutMs?: number;
  abortSignal?: AbortSignal;
  heartbeatMs?: number;
  onHeartbeat?: (value: {
    stage: string;
    elapsedMs: number;
  }) => void;
}) {
  return runManagedChild({
    executable: process.execPath,
    args: ["-e", hangingChild],
    cwd: root,
    environment: safeEnvironment,
    timeoutMs: options.timeoutMs ?? 100,
    terminationGraceMs: 60,
    killConfirmationMs: 500,
    heartbeatMs: options.heartbeatMs ?? 30_000,
    abortSignal: options.abortSignal,
    stage: "SERVICE_BOOTSTRAP",
    onHeartbeat: options.onHeartbeat,
  });
}

test("timeout terminates a hanging child with SIGTERM then SIGKILL and confirms close", async () => {
  const result = await runHangingChild({ timeoutMs: 300 });
  assert.equal(result.ok, false);
  assert.equal(result.timedOut, true);
  assert.equal(result.terminationReason, "TIMEOUT");
  assert.equal(result.termSent, true);
  assert.equal(result.killSent, true);
  assert.equal(result.childExited, true);
  assert.ok(result.executionElapsedMs >= 280);
  assert.ok(result.executionElapsedMs < 500);
  assert.ok(result.terminationElapsedMs >= 50);
  assert.equal(
    result.executionElapsedMs +
      result.terminationElapsedMs,
    result.elapsedMs,
  );
  assert.ok(result.elapsedMs < 2_000);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  test(`${signal} has a distinct interruption result and waits for child close`, async () => {
    const controller = new AbortController();
    const running = runHangingChild({
      timeoutMs: 5_000,
      abortSignal: controller.signal,
    });
    setTimeout(() => controller.abort(signal), 50);
    const result = await running;
    assert.equal(result.timedOut, false);
    assert.equal(result.terminationReason, signal);
    assert.equal(result.termSent, true);
    assert.equal(result.childExited, true);
  });
}

test("termination targets the complete process group", async () => {
  const directory = mkdtempSync(
    join(tmpdir(), "plave-project004-group-test-"),
  );
  const marker = join(directory, "grandchild-survived");
  const grandchild =
    "const fs=require('node:fs');" +
    "setTimeout(()=>fs.writeFileSync(process.argv[1],'unexpected'),800);" +
    "setInterval(()=>{},1000)";
  const parent =
    "const {spawn}=require('node:child_process');" +
    `spawn(process.execPath,['-e',${JSON.stringify(grandchild)},process.argv[1]],{stdio:'ignore'});` +
    "process.stdout.write('READY\\n');" +
    "process.on('SIGTERM',()=>{});" +
    "setInterval(()=>{},1000)";
  try {
    const result = await runManagedChild({
      executable: process.execPath,
      args: ["-e", parent, marker],
      cwd: root,
      environment: safeEnvironment,
      timeoutMs: 300,
      terminationGraceMs: 60,
      killConfirmationMs: 500,
      stage: "SERVICE_BOOTSTRAP",
    });
    assert.equal(result.childExited, true);
    assert.equal(result.killSent, true);
    assert.match(result.stdout, /^READY$/mu);
    await new Promise((resolveWait) =>
      setTimeout(resolveWait, 850),
    );
    assert.equal(existsSync(marker), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("heartbeat is stage-only and emitted while a child remains active", async () => {
  const heartbeats: Array<{
    stage: string;
    elapsedMs: number;
  }> = [];
  const result = await runHangingChild({
    timeoutMs: 125,
    heartbeatMs: 30,
    onHeartbeat: (value) => heartbeats.push(value),
  });
  assert.equal(result.childExited, true);
  assert.ok(heartbeats.length >= 2);
  for (const heartbeat of heartbeats) {
    assert.equal(
      heartbeat.stage,
      "SERVICE_BOOTSTRAP",
    );
    assert.ok(heartbeat.elapsedMs >= 0);
    assert.deepEqual(Object.keys(heartbeat).sort(), [
      "elapsedMs",
      "stage",
    ]);
  }
});

test("heartbeat timer is cleared before a completed child is reported", async () => {
  const heartbeats: Array<{
    stage: string;
    elapsedMs: number;
  }> = [];
  const result = await runManagedChild({
    executable: process.execPath,
    args: [
      "-e",
      "setTimeout(()=>process.exit(0),35)",
    ],
    cwd: root,
    environment: safeEnvironment,
    timeoutMs: 500,
    heartbeatMs: 10,
    stage: "POST_APPLY_DIAGNOSTIC",
    onHeartbeat: (value) => heartbeats.push(value),
  });
  assert.equal(result.ok, true);
  const countAtCompletion = heartbeats.length;
  await new Promise((resolveWait) =>
    setTimeout(resolveWait, 40),
  );
  assert.equal(heartbeats.length, countAtCompletion);
  assert.ok(
    heartbeats.every(
      (heartbeat) =>
        heartbeat.elapsedMs <= result.elapsedMs,
    ),
  );
});

test("only the first process signal is accepted", () => {
  const output: string[] = [];
  const lifecycle = new DisposableProofLifecycle({
    emit: (line) => output.push(line),
  });
  const handlers =
    installDisposableProofSignalHandlers(lifecycle);
  try {
    process.emit("SIGINT");
    process.emit("SIGTERM");
    assert.equal(lifecycle.signal, "SIGINT");
    assert.equal(handlers.signal.aborted, true);
    assert.equal(handlers.signal.reason, "SIGINT");
    assert.deepEqual(
      output.filter((line) =>
        line.startsWith("DISPOSABLE_SIGNAL="),
      ),
      ["DISPOSABLE_SIGNAL=SIGINT:RECEIVED"],
    );
  } finally {
    handlers.dispose();
  }
});

test("finally cleanup begins only after the managed child exit is confirmed", async () => {
  const events: string[] = [];
  let childExited = false;
  try {
    const result = await runHangingChild({ timeoutMs: 60 });
    childExited = result.childExited;
    events.push(
      result.childExited
        ? "CHILD_EXIT_CONFIRMED"
        : "CHILD_EXIT_UNCONFIRMED",
    );
  } finally {
    assert.equal(childExited, true);
    events.push("CLEANUP_STARTED");
  }
  assert.deepEqual(events, [
    "CHILD_EXIT_CONFIRMED",
    "CLEANUP_STARTED",
  ]);
  assert.equal(
    canStartDisposableProofCleanup(
      "/tmp/plave-project004-clean-proof-test",
      null,
    ),
    true,
  );
  const unconfirmed = new Error(
    "DISPOSABLE_CHILD_EXIT_UNCONFIRMED",
  ) as Error & { code: string };
  unconfirmed.code =
    "DISPOSABLE_CHILD_EXIT_UNCONFIRMED";
  assert.equal(
    canStartDisposableProofCleanup(
      "/tmp/plave-project004-clean-proof-test",
      unconfirmed,
    ),
    false,
  );
});
