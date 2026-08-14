import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  AI_TUTOR_CONFIG_LOCK_NAME,
  AiTutorConfigurationLockError,
  acquireConfigurationLock,
  assertPrivateCredentialFile,
  mergeEnvironmentValues,
  writeEnvironmentAtomically,
} from "../lib/ai-tutor/configure-transaction.ts";

const projectRoot = process.cwd();
const syntheticGoogleKey = "TEST_ONLY_GOOGLE_KEY_FOR_CONFIGURE";
const syntheticOpenAiKey = "TEST_ONLY_OPENAI_KEY_FOR_CONFIGURE";

type Harness = Readonly<{
  child: ChildProcess;
  pgid: number;
  output(): string;
  completion: Promise<number>;
}>;

type ConfigureExtraEnvironment = Record<string, string | undefined>;

function configureTestEnvironment(root: string, extra: ConfigureExtraEnvironment = {}): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH,
    TMPDIR: process.env.TMPDIR,
    ...extra,
    NODE_ENV: "test",
    PLAVE_AI_TUTOR_CONFIG_TEST_ROOT: root,
    PLAVE_AI_TUTOR_CONFIG_TEST_STDIO: "1",
  };
}

function processGroupAlive(pgid: number) {
  try {
    process.kill(-pgid, 0);
    return true;
  } catch (error) {
    return !(
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ESRCH"
    );
  }
}

async function waitForGroupExit(pgid: number, timeoutMs: number) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (!processGroupAlive(pgid)) return true;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));
  }
  return !processGroupAlive(pgid);
}

async function terminateProcessGroup(pgid: number) {
  if (!processGroupAlive(pgid)) return;
  for (const signal of ["SIGINT", "SIGTERM", "SIGKILL"] as const) {
    try {
      process.kill(-pgid, signal);
    } catch {
      return;
    }
    if (await waitForGroupExit(pgid, signal === "SIGINT" ? 500 : 250)) return;
  }
}

function spawnPipe(root: string, answers: readonly string[], extra: ConfigureExtraEnvironment = {}): Harness {
  const child = spawn("node", [
    "--no-warnings",
    "--experimental-strip-types",
    "scripts/configure-ai-tutor.ts",
  ], {
    cwd: projectRoot,
    detached: true,
    env: configureTestEnvironment(root, {
      PLAVE_AI_TUTOR_CONFIG_TEST_ANSWERS: JSON.stringify(answers),
      ...extra,
    }),
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (!child.pid) throw new Error("AI_TUTOR_TEST_HARNESS_PID_MISSING");
  let captured = "";
  const append = (chunk: Buffer) => { captured += chunk.toString("utf8"); };
  child.stdout?.on("data", append);
  child.stderr?.on("data", append);
  child.stdin?.end();
  const completion = new Promise<number>((resolveCompletion, rejectCompletion) => {
    child.once("error", rejectCompletion);
    child.once("close", (code, signal) => resolveCompletion(code ?? (signal === "SIGINT" ? 130 : 1)));
  });
  return { child, pgid: child.pid, output: () => captured, completion };
}

function spawnBlockedPipe(root: string): Harness {
  const child = spawn("node", ["--no-warnings", "--experimental-strip-types", "scripts/configure-ai-tutor.ts"], {
    cwd: projectRoot,
    detached: true,
    env: configureTestEnvironment(root),
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (!child.pid) throw new Error("AI_TUTOR_TEST_HARNESS_PID_MISSING");
  let captured = "";
  const append = (chunk: Buffer) => { captured += chunk.toString("utf8"); };
  child.stdout?.on("data", append);
  child.stderr?.on("data", append);
  child.stdin?.write("\n");
  const completion = new Promise<number>((resolveCompletion, rejectCompletion) => {
    child.once("error", rejectCompletion);
    child.once("close", (code, signal) => resolveCompletion(code ?? (signal === "SIGINT" ? 130 : 1)));
  });
  return { child, pgid: child.pid, output: () => captured, completion };
}

async function waitForOutput(harness: Harness, expected: RegExp, timeoutMs = 5_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (expected.test(harness.output())) return;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 20));
  }
  throw new Error("AI_TUTOR_TEST_HARNESS_OUTPUT_TIMEOUT");
}

async function runPipe(root: string, answers: readonly string[], extra: ConfigureExtraEnvironment = {}) {
  const harness = spawnPipe(root, answers, extra);
  try {
    const exitCode = await Promise.race([
      harness.completion,
      new Promise<never>((_, rejectTimeout) => setTimeout(() => rejectTimeout(new Error("AI_TUTOR_TEST_HARNESS_TIMEOUT")), 8_000)),
    ]);
    return { exitCode, output: harness.output(), pgid: harness.pgid };
  } finally {
    await terminateProcessGroup(harness.pgid);
  }
}

function temporaryRoot() {
  return mkdtempSync(resolve(tmpdir(), "plave-ai-tutor-config-"));
}

function validKey(character: string) {
  return `TESTONLY${character.repeat(24)}`;
}

function cleanupRoot(root: string) {
  rmSync(root, { recursive: true, force: true });
}

function transientFiles(root: string) {
  return readdirSync(root).filter(
    (name) =>
      name === AI_TUTOR_CONFIG_LOCK_NAME ||
      name.startsWith(".ai-tutor-config.owner-") ||
      name.startsWith(".env.local.ai-tutor-"),
  );
}

test("credential target must be a current-owner regular non-symlink file with mode 0600", () => {
  const root = temporaryRoot();
  try {
    const target = resolve(root, ".env.local");
    writeFileSync(target, "PLAVE_AI_TUTOR_ENABLED=false\n", { mode: 0o600 });
    assert.doesNotThrow(() => assertPrivateCredentialFile(target));
    chmodSync(target, 0o644);
    assert.throws(
      () => assertPrivateCredentialFile(target),
      /AI_TUTOR_CONFIG_FILE_PERMISSION_INVALID/u,
    );
    rmSync(target);
    const backing = resolve(root, "backing");
    writeFileSync(backing, "", { mode: 0o600 });
    symlinkSync(backing, target);
    assert.throws(
      () => assertPrivateCredentialFile(target),
      /AI_TUTOR_CONFIG_FILE_PERMISSION_INVALID/u,
    );
  } finally {
    cleanupRoot(root);
  }
});

test("atomic environment persistence preserves unrelated entries and mode 0600", () => {
  const root = temporaryRoot();
  try {
    const target = resolve(root, ".env.local");
    const original = "UNRELATED_SETTING=keep\nPLAVE_AI_TUTOR_ENABLED=false\n";
    writeFileSync(target, original, { mode: 0o644 });
    const merged = mergeEnvironmentValues(original, [
      ["PLAVE_AI_TUTOR_ENABLED", "true"],
      ["PLAVE_AI_PROVIDER", "GOOGLE"],
      ["GOOGLE_API_KEY", syntheticGoogleKey],
      ["GOOGLE_AI_MODEL", "gemini-3.6-flash"],
    ]);
    writeEnvironmentAtomically(target, merged);
    const result = readFileSync(target, "utf8");
    assert.match(result, /^UNRELATED_SETTING=keep$/mu);
    assert.match(result, /^PLAVE_AI_TUTOR_ENABLED=true$/mu);
    assert.equal(statSync(target).mode & 0o777, 0o600);
    assert.deepEqual(transientFiles(root), []);
  } finally {
    cleanupRoot(root);
  }
});

test("stale dead-owner lock is recovered but live and nested locks fail closed", () => {
  const root = temporaryRoot();
  const lockPath = resolve(root, AI_TUTOR_CONFIG_LOCK_NAME);
  try {
    const stale = acquireConfigurationLock({
      lockPath,
      pid: 999_991,
      ppid: 0,
      processAlive: () => true,
    });
    const recovered = acquireConfigurationLock({
      lockPath,
      pid: process.pid,
      processAlive: (pid) => pid !== 999_991,
    });
    assert.equal(recovered.recoveredStaleOwnerPid, 999_991);
    stale.release();
    assert.throws(
      () =>
        acquireConfigurationLock({
          lockPath,
          pid: process.pid + 1,
          processAlive: () => true,
        }),
      (error: unknown) =>
        error instanceof AiTutorConfigurationLockError &&
        error.code === "AI_TUTOR_CONFIGURATION_LOCKED" &&
        error.ownerPid === process.pid,
    );
    assert.throws(
      () => acquireConfigurationLock({ lockPath, pid: process.pid }),
      (error: unknown) =>
        error instanceof AiTutorConfigurationLockError &&
        error.code === "AI_TUTOR_CONFIGURATION_LOCKED",
    );
    recovered.release();
    assert.equal(existsSync(lockPath), false);
  } finally {
    cleanupRoot(root);
  }
});

for (const scenario of [
  {
    name: "provider prompt",
    answers: [],
    interruptStep: "1",
  },
  {
    name: "key prompt",
    answers: [""],
    interruptStep: "2",
  },
  {
    name: "model prompt",
    answers: ["OPENAI", validKey("O")],
    interruptStep: "3",
  },
] as const) {
  test(`Ctrl+C at ${scenario.name} exits 130 without partial config, output or processes`, async () => {
    const root = temporaryRoot();
    try {
      const result = await runPipe(root, scenario.answers, {
        PLAVE_AI_TUTOR_CONFIG_TEST_INTERRUPT_STEP: scenario.interruptStep,
      });
      assert.equal(result.exitCode, 130);
      assert.match(result.output, /AI_TUTOR_CONFIGURATION_CANCELLED/u);
      assert.doesNotMatch(result.output, new RegExp(syntheticGoogleKey, "u"));
      assert.doesNotMatch(result.output, new RegExp(syntheticOpenAiKey, "u"));
      assert.equal(existsSync(resolve(root, ".env.local")), false);
      assert.deepEqual(transientFiles(root), []);
      assert.equal(processGroupAlive(result.pgid), false);
    } finally {
      cleanupRoot(root);
    }
  });
}

test("clean configure is atomic and a second sequential configure has no stale lock", async () => {
  const root = temporaryRoot();
  try {
    writeFileSync(resolve(root, ".env.local"), "UNRELATED_SETTING=keep\n", {
      mode: 0o600,
    });
    const first = await runPipe(
      root,
      ["", validKey("G")],
    );
    assert.equal(first.exitCode, 0);
    assert.doesNotMatch(first.output, new RegExp(syntheticGoogleKey, "u"));
    assert.match(first.output, /AI_TUTOR_STALE_LOCK_RECOVERED=NO/u);
    assert.equal(statSync(resolve(root, ".env.local")).mode & 0o777, 0o600);
    assert.match(readFileSync(resolve(root, ".env.local"), "utf8"), /^UNRELATED_SETTING=keep$/mu);
    assert.deepEqual(transientFiles(root), []);

    const second = await runPipe(root, [""]);
    assert.equal(second.exitCode, 0);
    assert.doesNotMatch(second.output, /Compaction failed|CONFIGURATION_LOCKED/u);
    assert.deepEqual(transientFiles(root), []);
    assert.equal(processGroupAlive(first.pgid), false);
    assert.equal(processGroupAlive(second.pgid), false);
  } finally {
    cleanupRoot(root);
  }
});

test("concurrent configure is serialized and harness finally cleans the process group", async () => {
  const root = temporaryRoot();
  const first = spawnBlockedPipe(root);
  try {
    await waitForOutput(first, /GOOGLE_API_KEY/u);
    const second = spawn("node", [
      "--no-warnings",
      "--experimental-strip-types",
      "scripts/configure-ai-tutor.ts",
    ], {
      cwd: projectRoot,
      env: configureTestEnvironment(root),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let secondOutput = "";
    second.stdout?.on("data", (chunk: Buffer) => {
      secondOutput += chunk.toString("utf8");
    });
    second.stderr?.on("data", (chunk: Buffer) => {
      secondOutput += chunk.toString("utf8");
    });
    const secondExit = await new Promise<number>((resolveExit, rejectExit) => {
      second.once("error", rejectExit);
      second.once("close", (code) => resolveExit(code ?? 1));
    });
    assert.equal(secondExit, 73);
    assert.match(secondOutput, /AI_TUTOR_CONFIGURATION_LOCKED/u);
    assert.match(secondOutput, /AI_TUTOR_LOCK_PATH=\.ai-tutor-config\.lock/u);
    assert.doesNotMatch(secondOutput, /Compaction failed|API_KEY=/u);
  } finally {
    await terminateProcessGroup(first.pgid);
    await first.completion.catch(() => 1);
    if (existsSync(resolve(root, AI_TUTOR_CONFIG_LOCK_NAME))) {
      const recovered = acquireConfigurationLock({
        lockPath: resolve(root, AI_TUTOR_CONFIG_LOCK_NAME),
        processAlive: () => false,
      });
      recovered.release();
    }
    assert.equal(processGroupAlive(first.pgid), false);
    assert.deepEqual(transientFiles(root), []);
    cleanupRoot(root);
  }
});

test("test stdio channel is explicit and cannot replace the production tty contract", () => {
  const source = readFileSync(resolve(projectRoot, "scripts/configure-ai-tutor.ts"), "utf8");
  assert.match(source, /process[.]env[.]NODE_ENV === "test"[\s\S]{0,160}requestedTestRoot[\s\S]{0,160}PLAVE_AI_TUTOR_CONFIG_TEST_STDIO === "1"/u);
  assert.match(source, /if \(!testStdio && !existsSync\(ttyPath\)\) throw new Error\("AI_TUTOR_TTY_REQUIRED"\)/u);
});
