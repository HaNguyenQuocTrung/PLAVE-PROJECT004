import { randomBytes } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, lstatSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { assertProject004Workspace } from "./project004-identity.ts";
import {
  buildResolvedRemoteDatabaseEnvironment,
} from "./project004-remote-connectivity-resolver.ts";
import {
  createCanonicalRemoteDevCommandRunner,
  type RemoteDevPrivateConfig,
} from "./project004-remote-dev-guard.ts";
import {
  executeMigration0041RemotePreflight,
  type Migration0041PreflightReport,
} from "./project004-remote-migration-0041.ts";
import type { RemoteDevCommandRunner } from "./project004-remote-dev-operations.ts";
import type { ResolvedRemoteDatabaseEndpoint } from "./project004-remote-connectivity-resolver.ts";
import {
  buildProject004UniversalActivationPsqlInvocation,
} from "./project004-universal-activation-execution.ts";
import {
  promptProject004UniversalRemoteEnvironment,
} from "./run-project004-remote-universal-preflight.ts";
import {
  buildGeneratedPilotChildEnvironment,
  loadGeneratedPilotAllowlistFile,
  project004GeneratedPilotRuntimeContract,
  Project004GeneratedPilotFailure,
} from "./project004-generated-pilot-runtime.ts";

const secretSentinel = "PROJECT004_GENERATED_PILOT_SECRET_V1";

function sqlText(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

export function buildGeneratedPilotSigningSecretSql(input: Readonly<{
  action: "INSTALL" | "REMOVE";
  signingKey: string;
}>) {
  if (!/^[0-9a-f]{64}$/u.test(input.signingKey)) {
    throw new Project004GeneratedPilotFailure("GENERATED_PILOT_SIGNING_KEY_INVALID");
  }
  if (input.action === "INSTALL") {
    return `
begin;
select pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('project004-generated-pilot-secret-v1', 0)
);
do $pilot$
begin
  if (select count(*) from private.curriculum_generation_runtime_secret) <> 0 then
    raise exception using errcode = 'P0001',
      message = 'GENERATED_PILOT:SIGNING_SECRET_ALREADY_PRESENT';
  end if;
  if not exists (
    select 1 from public.curriculum_releases
    where release_id = 'plave-math-grades-1-9-v1'
      and status = 'ACTIVE' and activation_state = 'ACTIVE'
  ) then
    raise exception using errcode = 'P0001',
      message = 'GENERATED_PILOT:RELEASE_UNAVAILABLE';
  end if;
end
$pilot$;
insert into private.curriculum_generation_runtime_secret (
  singleton, signing_key_hex, key_version, configured_at
) values (true, ${sqlText(input.signingKey)}, 1, now());
select '${secretSentinel}:INSTALL:PASS';
commit;
`;
  }
  return `
begin;
select pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('project004-generated-pilot-secret-v1', 0)
);
delete from private.curriculum_generation_runtime_secret
where singleton and signing_key_hex = ${sqlText(input.signingKey)};
do $pilot$
begin
  if exists (
    select 1 from private.curriculum_generation_runtime_secret
    where signing_key_hex = ${sqlText(input.signingKey)}
  ) then
    raise exception using errcode = 'P0001',
      message = 'GENERATED_PILOT:SIGNING_SECRET_CLEANUP_FAILED';
  end if;
end
$pilot$;
select '${secretSentinel}:REMOVE:PASS';
commit;
`;
}

function executeSecretSql(input: Readonly<{
  runner: RemoteDevCommandRunner;
  config: RemoteDevPrivateConfig;
  endpoint: ResolvedRemoteDatabaseEndpoint;
  environment: NodeJS.ProcessEnv;
  action: "INSTALL" | "REMOVE";
  signingKey: string;
}>) {
  const invocation = buildProject004UniversalActivationPsqlInvocation(
    buildGeneratedPilotSigningSecretSql(input),
  );
  const result = input.runner(
    "psql",
    invocation.args,
    buildResolvedRemoteDatabaseEnvironment(
      input.config,
      input.endpoint,
      input.environment,
    ),
    invocation.input,
  );
  const expected = `${secretSentinel}:${input.action}:PASS`;
  const count = `${result.stdout}\n${result.stderr}`
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line === expected).length;
  if (!result.ok || count !== 1) {
    throw new Project004GeneratedPilotFailure(
      input.action === "INSTALL"
        ? "GENERATED_PILOT_SIGNING_SECRET_INSTALL_FAILED"
        : "GENERATED_PILOT_SIGNING_SECRET_CLEANUP_FAILED",
    );
  }
}

function validPilotPreflight(report: Migration0041PreflightReport) {
  return Boolean(
    report.ok &&
      report.remotePhase === "ALREADY_APPLIED" &&
      report.project004Canonical === "PASS" &&
      report.remoteIdentityGuard === "PASS" &&
      report.generatedRuntimeRemoteOff === "PASS" &&
      report.releaseContract === "PASS" &&
      report.grade1Boundary === "PASS" &&
      report.adaptivePilotDisabled === "PASS" &&
      report.rlsPrivateBoundary === "PASS" &&
      report.counts?.migrationCount === 41 &&
      report.counts.migrationFirst === "0001" &&
      report.counts.migrationLast === "0041" &&
      report.counts.provenanceFieldCount === 8 &&
      report.counts.partialProvenanceRowCount === 0 &&
      report.config &&
      report.resolvedEndpoint,
  );
}

async function assertPortAvailable() {
  await new Promise<void>((resolveReady, reject) => {
    const server = createServer();
    server.once("error", () => reject(new Project004GeneratedPilotFailure("GENERATED_PILOT_PORT_UNAVAILABLE")));
    server.listen(
      project004GeneratedPilotRuntimeContract.port,
      project004GeneratedPilotRuntimeContract.host,
      () => server.close(() => resolveReady()),
    );
  });
}

function signalChildGroup(child: ChildProcess, signal: NodeJS.Signals) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  try {
    if (process.platform === "win32") child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch {
    // The child may already have exited.
  }
}

export function waitForPilotChild(child: ChildProcess) {
  return new Promise<Readonly<{ code: number; signal: NodeJS.Signals | null }>>((resolveExit, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolveExit({
      code: code ?? (signal ? 1 : 0),
      signal,
    }));
  });
}

export async function terminatePilotChildGroup(
  child: ChildProcess,
  graceMs = 5_000,
) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  signalChildGroup(child, "SIGTERM");
  let graceTimer: ReturnType<typeof setTimeout> | null = null;
  const exited = await Promise.race([
    new Promise<boolean>((resolveExit) => child.once("exit", () => resolveExit(true))),
    new Promise<boolean>((resolveExit) => {
      graceTimer = setTimeout(() => resolveExit(false), graceMs);
    }),
  ]);
  if (graceTimer) clearTimeout(graceTimer);
  if (!exited && child.exitCode === null && child.signalCode === null) {
    signalChildGroup(child, "SIGKILL");
    let killTimer: ReturnType<typeof setTimeout> | null = null;
    await Promise.race([
      new Promise<void>((resolveExit) => child.once("exit", () => resolveExit())),
      new Promise<void>((resolveExit) => {
        killTimer = setTimeout(resolveExit, graceMs);
      }),
    ]);
    if (killTimer) clearTimeout(killTimer);
  }
}

function safeDelta(after: number, before: number) {
  const delta = after - before;
  return Number.isSafeInteger(delta) && delta >= 0 ? delta : null;
}

export async function waitForGeneratedPilotHealth(options?: Readonly<{
  fetcher?: typeof fetch;
  timeoutMs?: number;
  now?: () => number;
  delay?: (milliseconds: number) => Promise<void>;
}>) {
  const fetcher = options?.fetcher ?? fetch;
  const now = options?.now ?? Date.now;
  const delay = options?.delay ?? ((milliseconds: number) =>
    new Promise<void>((resolveDelay) => setTimeout(resolveDelay, milliseconds)));
  const deadline = now() + (options?.timeoutMs ?? 90_000);
  while (now() < deadline) {
    try {
      const response = await fetcher(
        `http://${project004GeneratedPilotRuntimeContract.host}:${project004GeneratedPilotRuntimeContract.port}/api/internal/generated-pilot-health`,
        { cache: "no-store", signal: AbortSignal.timeout(2_500) },
      );
      if (response.ok) {
        const value = await response.json() as Record<string, unknown>;
        if (
          value.status === "OK" &&
          value.version === "project004-generated-pilot-health-v1" &&
          value.mode === "PILOT_LIVE" &&
          value.loopbackOnly === true &&
          value.targetValid === true &&
          value.allowlistValid === true &&
          value.allowlistCount === 1 &&
          value.adaptivePilotDisabled === true
        ) {
          return;
        }
      }
    } catch {
      // Connection refusal, route compilation, and transient 404 are readiness states.
    }
    await delay(250);
  }
  throw new Project004GeneratedPilotFailure("GENERATED_PILOT_HEALTH_TIMEOUT");
}

export async function startProject004GeneratedPilot(options?: Readonly<{
  candidateRoot?: string;
  environment?: NodeJS.ProcessEnv;
  runner?: RemoteDevCommandRunner;
  spawnChild?: typeof spawn;
  preflight?: typeof executeMigration0041RemotePreflight;
  prompt?: NonNullable<Parameters<typeof promptProject004UniversalRemoteEnvironment>[0]>["prompt"];
  waitForHealth?: typeof waitForGeneratedPilotHealth;
}>) {
  const root = assertProject004Workspace(options?.candidateRoot ?? process.cwd());
  const allowlist = loadGeneratedPilotAllowlistFile(root);
  const prompted = promptProject004UniversalRemoteEnvironment({
    environment: options?.environment,
    prompt: options?.prompt,
  });
  if (!prompted.ok) {
    throw new Project004GeneratedPilotFailure(prompted.code);
  }
  const runner = options?.runner ?? createCanonicalRemoteDevCommandRunner(root);
  const signingKey = randomBytes(32).toString("hex");
  const session = randomBytes(32).toString("hex");
  let secretInstalled = false;
  let child: ChildProcess | null = null;
  let stopping = false;
  let preflightState: Migration0041PreflightReport | null = null;
  let childExit: Promise<Readonly<{ code: number; signal: NodeJS.Signals | null }>> | null = null;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    if (child) signalChildGroup(child, "SIGTERM");
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    const preflight = (options?.preflight ?? executeMigration0041RemotePreflight)({
      environment: prompted.environment,
      candidateRoot: root,
      runner,
    });
    preflightState = preflight;
    if (!validPilotPreflight(preflight) || !preflight.config || !preflight.resolvedEndpoint) {
      throw new Project004GeneratedPilotFailure("GENERATED_PILOT_REMOTE_PREFLIGHT_FAILED");
    }
    await assertPortAvailable();
    executeSecretSql({
      runner,
      config: preflight.config,
      endpoint: preflight.resolvedEndpoint,
      environment: prompted.environment,
      action: "INSTALL",
      signingKey,
    });
    secretInstalled = true;
    const cachePath = resolve(root, project004GeneratedPilotRuntimeContract.cacheDirectory);
    if (existsSync(cachePath)) {
      if (lstatSync(cachePath).isSymbolicLink()) {
        throw new Project004GeneratedPilotFailure("GENERATED_PILOT_CACHE_SYMLINK_REJECTED");
      }
      rmSync(cachePath, { recursive: true, force: true });
    }
    const childEnvironment = buildGeneratedPilotChildEnvironment({
      candidateRoot: root,
      allowlist: allowlist.raw,
      signingKey,
      session,
      environment: options?.environment,
    });
    const nextBin = resolve(root, "node_modules/next/dist/bin/next");
    process.stdout.write([
      "PROJECT004_CANONICAL=PASS",
      "GENERATED_PILOT_TARGET_GUARD=PASS",
      "GENERATED_PILOT_MODE=PILOT_LIVE",
      "GENERATED_PILOT_LOOPBACK_ONLY=PASS",
      "GENERATED_PILOT_ALLOWLIST_VALID=PASS",
      `GENERATED_PILOT_ALLOWLIST_COUNT=${allowlist.count}`,
      "GRADE2_CONTROLLED_ADAPTIVE_PILOT=DISABLED",
      "GENERATED_PILOT_START=BEGIN",
      "",
    ].join("\n"));
    child = (options?.spawnChild ?? spawn)(
      process.execPath,
      [
        nextBin,
        "dev",
        "--hostname",
        project004GeneratedPilotRuntimeContract.host,
        "--port",
        String(project004GeneratedPilotRuntimeContract.port),
      ],
      {
        cwd: root,
        env: childEnvironment,
        stdio: "inherit",
        detached: process.platform !== "win32",
      },
    );
    childExit = waitForPilotChild(child);
    await Promise.race([
      (options?.waitForHealth ?? waitForGeneratedPilotHealth)(),
      childExit.then(() => {
        throw new Project004GeneratedPilotFailure("GENERATED_PILOT_CHILD_EXITED_BEFORE_READY");
      }),
    ]);
    process.stdout.write([
      "GENERATED_PILOT_HEALTH=PASS",
      "GENERATED_PILOT_START=READY",
      `GENERATED_PILOT_URL=http://${project004GeneratedPilotRuntimeContract.host}:${project004GeneratedPilotRuntimeContract.port}`,
      "",
    ].join("\n"));
    const result = await childExit;
    return result.code;
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    try {
      if (child && child.exitCode === null && child.signalCode === null) {
        await terminatePilotChildGroup(child);
      }
      if (childExit) {
        await childExit.catch(() => ({ code: 1, signal: null }));
      }
      if (
        secretInstalled &&
        preflightState?.config &&
        preflightState.resolvedEndpoint
      ) {
        // Cleanup is scoped to the exact in-memory key created by this process.
        // It cannot remove any pre-existing row because install requires zero rows.
        executeSecretSql({
          runner,
          config: preflightState.config,
          endpoint: preflightState.resolvedEndpoint,
          environment: prompted.environment,
          action: "REMOVE",
          signingKey,
        });
        const after = (options?.preflight ?? executeMigration0041RemotePreflight)({
          environment: prompted.environment,
          candidateRoot: root,
          runner,
        });
        const beforeCounts = preflightState.counts;
        const afterCounts = after.counts;
        const attemptDelta = beforeCounts && afterCounts
          ? safeDelta(afterCounts.attemptRows, beforeCounts.attemptRows)
          : null;
        const questionDelta = beforeCounts && afterCounts
          ? safeDelta(afterCounts.semanticQuestionRows, beforeCounts.semanticQuestionRows)
          : null;
        const answerDelta = beforeCounts && afterCounts
          ? safeDelta(afterCounts.generatedAnswerRows, beforeCounts.generatedAnswerRows)
          : null;
        const historyDelta = beforeCounts && afterCounts
          ? safeDelta(afterCounts.learningHistoryRows, beforeCounts.learningHistoryRows)
          : null;
        process.stdout.write([
          "GENERATED_PILOT_START=STOPPED",
          "GENERATED_PILOT_MODE_AFTER=OFF",
          "GENERATED_PILOT_SIGNING_SECRET_CLEANUP=PASS",
          `GENERATED_ATTEMPT_COUNT_DELTA=${attemptDelta ?? "UNVERIFIED"}`,
          `GENERATED_QUESTION_COUNT_DELTA=${questionDelta ?? "UNVERIFIED"}`,
          `GENERATED_ANSWER_COUNT_DELTA=${answerDelta ?? "UNVERIFIED"}`,
          `LEARNING_HISTORY_COUNT_DELTA=${historyDelta ?? "UNVERIFIED"}`,
          `PROVENANCE_COMPLETENESS=${afterCounts?.partialProvenanceRowCount === 0 ? "PASS" : "FAIL"}`,
          `POST_STOP_REMOTE_DIAGNOSTIC=${validPilotPreflight(after) ? "PASS" : "FAIL"}`,
          "GRADE2_CONTROLLED_ADAPTIVE_PILOT=DISABLED",
          "",
        ].join("\n"));
      }
    } finally {
      prompted.clear();
    }
  }
}

export function renderGeneratedPilotStartSmoke() {
  const install = buildGeneratedPilotSigningSecretSql({
    action: "INSTALL",
    signingKey: "a".repeat(64),
  });
  const remove = buildGeneratedPilotSigningSecretSql({
    action: "REMOVE",
    signingKey: "a".repeat(64),
  });
  const pass =
    install.includes(`${secretSentinel}:INSTALL:PASS`) &&
    remove.includes(`${secretSentinel}:REMOVE:PASS`) &&
    project004GeneratedPilotRuntimeContract.host === "127.0.0.1";
  return [
    `GENERATED_PILOT_START_EXECUTABLE=${pass ? "PASS" : "FAIL"}`,
    "REMOTE_ACCESS_PERFORMED=NO",
    "REMOTE_MUTATION_PERFORMED=NO",
    "GENERATED_RUNTIME_DEFAULT=OFF",
    "",
  ].join("\n");
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  if (process.argv.includes("--smoke")) {
    process.stdout.write(renderGeneratedPilotStartSmoke());
  } else {
    try {
      process.exitCode = await startProject004GeneratedPilot();
    } catch (error) {
      const code = error instanceof Project004GeneratedPilotFailure
        ? error.code
        : "GENERATED_PILOT_START_FAILED";
      process.stdout.write([
        "GENERATED_PILOT_START=FAIL",
        `ROOT_FAILURE_CODE=${code}`,
        "",
      ].join("\n"));
      process.exitCode = 1;
    }
  }
}
