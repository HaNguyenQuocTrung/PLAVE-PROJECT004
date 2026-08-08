import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createServer, type Server } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { buildDisposableConfig } from "./project004-disposable-migration-workspace.ts";
import { reserveDisposablePorts } from "./project004-disposable-port-reservation.ts";
import { assertProject004Workspace } from "./project004-identity.ts";
import { parseSupabaseStatusEnvironment } from "./owner-local-demo-support.ts";

export type LearningPersistenceStack = Readonly<{
  root: string;
  projectId: string;
  workdir: string;
  appOrigin: string | null;
  apiUrl: string;
  publishableKey: string;
  databaseUrl: URL;
  query: (sql: string) => string;
}>;

export type LearningPersistenceScope =
  | "all"
  | "learning"
  | "grade3"
  | "teacher"
  | "schema-skew";

const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1"]);
const supabaseExecutable = "/opt/homebrew/bin/supabase";

function fail(message: string): never {
  throw new Error(message);
}

function safeEnvironment() {
  const environment: NodeJS.ProcessEnv = {
    NODE_ENV: process.env.NODE_ENV ?? "development",
  };
  for (const name of ["PATH", "HOME", "TMPDIR", "LANG", "LC_ALL", "TERM", "SHELL"]) {
    if (process.env[name]) environment[name] = process.env[name];
  }
  return environment;
}

function runSync(
  command: string,
  args: string[],
  options: Readonly<{
    cwd: string;
    env?: NodeJS.ProcessEnv;
    input?: string;
    timeout?: number;
    label: string;
  }>,
) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ?? safeEnvironment(),
    input: options.input,
    encoding: "utf8",
    timeout: options.timeout ?? 300_000,
    maxBuffer: 30 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const safeDiagnostic = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
      .split(/\r?\n/u)
      .filter(
        (line) =>
          line.trim() &&
          !/(?:key|password|token|secret|jwt|db_url|api_url|authorization)/iu.test(line) &&
          !line.includes("://") &&
          !line.includes("eyJ"),
      )
      .slice(-8)
      .join(" | ");
    fail(`${options.label} failed${safeDiagnostic ? `: ${safeDiagnostic}` : "."}`);
  }
  return result.stdout ?? "";
}

function reserveAppPort() {
  return new Promise<{ port: number; server: Server }>((resolvePromise, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0, exclusive: true }, () => {
      const address = server.address();
      if (!address || typeof address === "string" || address.port === 3000) {
        server.close();
        reject(new Error("ROUND2I_APP_PORT_RESERVATION_FAILED"));
        return;
      }
      resolvePromise({ port: address.port, server });
    });
  });
}

function closeServer(server: Server) {
  return new Promise<void>((resolvePromise, reject) => {
    server.close((error) => (error ? reject(error) : resolvePromise()));
  });
}

function migrationVersion(filename: string) {
  const match = /^(\d{4})_[a-z0-9_]+[.]sql$/u.exec(filename);
  return match ? Number(match[1]) : null;
}

function prepareWorkspace(
  root: string,
  temporaryRoot: string,
  projectId: string,
  boundary: 42 | 44,
  ports: Awaited<ReturnType<typeof reserveDisposablePorts>>["ports"],
  appPort: number,
) {
  const workdir = resolve(temporaryRoot, "supabase-stack");
  const supabaseDirectory = resolve(workdir, "supabase");
  const migrationsDirectory = resolve(supabaseDirectory, "migrations");
  mkdirSync(migrationsDirectory, { recursive: true, mode: 0o700 });
  const sourceConfig = readFileSync(resolve(root, "supabase/config.toml"), "utf8");
  let config = buildDisposableConfig(sourceConfig, projectId, ports);
  config = config
    .replace(/^site_url\s*=\s*"[^"]*"$/mu, `site_url = "http://127.0.0.1:${String(appPort)}"`)
    .replace(
      /^additional_redirect_urls\s*=\s*\[[^\n]*\]$/mu,
      `additional_redirect_urls = ["http://127.0.0.1:${String(appPort)}"]`,
    );
  writeFileSync(resolve(supabaseDirectory, "config.toml"), config, {
    encoding: "utf8",
    mode: 0o600,
  });
  const filenames = readdirSync(resolve(root, "supabase/migrations"))
    .filter((filename) => {
      const version = migrationVersion(filename);
      return version !== null && version <= boundary;
    })
    .sort();
  if (
    filenames.length !== boundary ||
    migrationVersion(filenames[0] ?? "") !== 1 ||
    migrationVersion(filenames.at(-1) ?? "") !== boundary
  ) {
    fail(`Round 2I migration boundary 0001-${String(boundary).padStart(4, "0")} is incomplete.`);
  }
  for (const filename of filenames) {
    copyFileSync(
      resolve(root, "supabase/migrations", filename),
      resolve(migrationsDirectory, filename),
    );
  }
  return workdir;
}

function parseLocalStatus(workdir: string) {
  const output = runSync(supabaseExecutable, ["status", "-o", "env"], {
    cwd: workdir,
    label: "Round 2I local status",
  });
  const values = parseSupabaseStatusEnvironment(output);
  const apiUrl = values.get("API_URL") ?? "";
  const publishableKey = values.get("ANON_KEY") ?? "";
  const databaseText = values.get("DB_URL") ?? "";
  const api = new URL(apiUrl);
  const databaseUrl = new URL(databaseText);
  if (
    !loopbackHosts.has(api.hostname) ||
    !loopbackHosts.has(databaseUrl.hostname) ||
    publishableKey.length < 20
  ) {
    fail("Round 2I endpoint proof rejected a non-loopback or incomplete target.");
  }
  return {
    apiUrl: api.toString().replace(/\/$/u, ""),
    publishableKey,
    databaseUrl,
  };
}

function psqlEnvironment(databaseUrl: URL) {
  return {
    ...safeEnvironment(),
    PGHOST: databaseUrl.hostname,
    PGPORT: databaseUrl.port,
    PGDATABASE: databaseUrl.pathname.slice(1),
    PGUSER: decodeURIComponent(databaseUrl.username),
    PGPASSWORD: decodeURIComponent(databaseUrl.password),
  };
}

function queryDatabase(root: string, databaseUrl: URL, sql: string) {
  return runSync("psql", ["-AtX", "-v", "ON_ERROR_STOP=1"], {
    cwd: root,
    env: psqlEnvironment(databaseUrl),
    input: sql,
    label: "Round 2I local database query",
  }).trim();
}

function materializeCurriculum(root: string, databaseUrl: URL) {
  const environment = {
    ...safeEnvironment(),
    PLAVE_LOCAL_DATABASE_URL: databaseUrl.toString(),
    PLAVE_LOCAL_CURRICULUM_ACTIVATE: "true",
  };
  runSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      resolve(root, "scripts/materialize-universal-curriculum-local.ts"),
    ],
    {
      cwd: root,
      env: environment,
      timeout: 180_000,
      label: "Round 2I curriculum materialization",
    },
  );
}

function prepareAppWorkspace(root: string, temporaryRoot: string) {
  const runtimeRoot = resolve(temporaryRoot, "PLAVE-PROJECT004");
  mkdirSync(runtimeRoot, { mode: 0o700 });
  runSync(
    "rsync",
    [
      "-a",
      `--link-dest=${root}`,
      "--exclude=.git",
      "--exclude=.env*",
      "--exclude=.next*",
      "--exclude=supabase/.temp",
      `${root}/`,
      `${runtimeRoot}/`,
    ],
    { cwd: root, label: "Round 2I sanitized app workspace" },
  );
  return runtimeRoot;
}

function appEnvironment(apiUrl: string, publishableKey: string) {
  return {
    ...safeEnvironment(),
    NEXT_PUBLIC_SUPABASE_URL: apiUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    PLAVE_CURRICULUM_RUNTIME_ENABLED: "true",
    PLAVE_OWNER_LOCAL_DEMO: "true",
    PLAVE_ON_DEMAND_GENERATION_ENABLED: "false",
    PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED: "false",
    PLAVE_GENERATOR_V2_ENABLED: "false",
    PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED: "false",
    PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED: "false",
    PLAVE_CONTROLLED_PILOT_ENABLED: "false",
    PLAVE_RETENTION_RUNTIME_ENABLED: "false",
    GOOGLE_API_KEY: "",
    GEMINI_API_KEY: "",
    OPENAI_API_KEY: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
  };
}

async function waitForApp(origin: string, child: ChildProcess) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) fail("Round 2I application exited before readiness.");
    try {
      const response = await fetch(`${origin}/login`, {
        signal: AbortSignal.timeout(2_000),
        redirect: "manual",
      });
      if (response.status >= 200 && response.status < 400) return;
    } catch {
      // Readiness retry.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  fail("Round 2I application readiness timed out.");
}

async function stopChild(child: ChildProcess | null) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolvePromise) => child.once("exit", () => resolvePromise())),
    new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 5_000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

function listenerIdentity(port: number) {
  const result = spawnSync("lsof", ["-nP", `-iTCP:${String(port)}`, "-sTCP:LISTEN", "-t"], {
    encoding: "utf8",
    env: safeEnvironment(),
  });
  if (result.status !== 0 && result.status !== 1) {
    fail("Round 2I listener ownership inspection failed.");
  }
  return (result.stdout ?? "").trim().split(/\r?\n/u).filter(Boolean).sort().join(",");
}

function assertNoDockerResidue(projectId: string, root: string) {
  for (const [args, label] of [
    [["ps", "-a", "--format", "{{.Names}}"], "containers"],
    [["volume", "ls", "--format", "{{.Name}}"], "volumes"],
    [["network", "ls", "--format", "{{.Name}}"], "networks"],
  ] as const) {
    const output = runSync("docker", [...args], {
      cwd: root,
      label: `Round 2I ${label} reconciliation`,
    });
    if (output.split(/\r?\n/u).some((line) => line.includes(projectId))) {
      fail(`Round 2I cleanup left ${label}.`);
    }
  }
}

export async function runWithGuaranteedCleanup<T>(
  operation: () => Promise<T>,
  cleanup: () => Promise<void>,
) {
  try {
    return await operation();
  } finally {
    await cleanup();
  }
}

export async function withLearningPersistenceStack<T>(options: {
  boundary: 42 | 44;
  startApp: boolean;
  operation: (stack: LearningPersistenceStack) => Promise<T>;
}) {
  const root = assertProject004Workspace();
  const port3000Before = listenerIdentity(3000);
  if (!port3000Before) fail("Port 3000 protection baseline is unavailable.");
  const temporaryRoot = mkdtempSync(join(tmpdir(), "plave-project004-round2i-"));
  const projectId = `PLAVE-PROJECT004-ROUND2I-${String(process.pid)}-${randomBytes(4).toString("hex")}`;
  let reservations: Awaited<ReturnType<typeof reserveDisposablePorts>> | null = null;
  let appReservation: Awaited<ReturnType<typeof reserveAppPort>> | null = null;
  let workdir: string | null = null;
  let supabaseStarted = false;
  let appChild: ChildProcess | null = null;
  let interrupted = false;
  const onSignal = () => {
    interrupted = true;
    if (appChild?.exitCode === null) appChild.kill("SIGTERM");
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  try {
    reservations = await reserveDisposablePorts();
    appReservation = await reserveAppPort();
    workdir = prepareWorkspace(
      root,
      temporaryRoot,
      projectId,
      options.boundary,
      reservations.ports,
      appReservation.port,
    );
    await reservations.release();
    supabaseStarted = true;
    runSync(supabaseExecutable, ["start"], {
      cwd: workdir,
      timeout: 300_000,
      label: "Round 2I disposable Supabase start",
    });
    const local = parseLocalStatus(workdir);
    if (
      Number(new URL(local.apiUrl).port) !== reservations.ports.api ||
      Number(local.databaseUrl.port) !== reservations.ports.database
    ) {
      fail("Round 2I local endpoint ports did not match their reservations.");
    }
    const applied = queryDatabase(
      root,
      local.databaseUrl,
      "select count(*) || '|' || max(version) from supabase_migrations.schema_migrations;",
    );
    if (applied !== `${String(options.boundary)}|${String(options.boundary).padStart(4, "0")}`) {
      fail("Round 2I migration application boundary was incorrect.");
    }
    materializeCurriculum(root, local.databaseUrl);
    const release = queryDatabase(
      root,
      local.databaseUrl,
      `select concat_ws('|', count(*),
        (select count(*) from public.curriculum_release_units),
        (select count(*) from public.curriculum_release_questions),
        count(*) filter (where status = 'ACTIVE' and activation_state = 'ACTIVE'))
       from public.curriculum_releases;`,
    );
    if (release !== "1|171|2052|1") fail("Round 2I curriculum release fingerprint failed.");
    let appOrigin: string | null = null;
    if (options.startApp) {
      const runtimeRoot = prepareAppWorkspace(root, temporaryRoot);
      await closeServer(appReservation.server);
      appOrigin = `http://127.0.0.1:${String(appReservation.port)}`;
      appChild = spawn(
        process.execPath,
        [
          resolve(runtimeRoot, "node_modules/next/dist/bin/next"),
          "dev",
          "--hostname",
          "127.0.0.1",
          "--port",
          String(appReservation.port),
        ],
        {
          cwd: runtimeRoot,
          env: appEnvironment(local.apiUrl, local.publishableKey),
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      appChild.stdout?.resume();
      appChild.stderr?.resume();
      await waitForApp(appOrigin, appChild);
    } else {
      await closeServer(appReservation.server);
    }
    const result = await options.operation({
      root,
      projectId,
      workdir,
      appOrigin,
      apiUrl: local.apiUrl,
      publishableKey: local.publishableKey,
      databaseUrl: local.databaseUrl,
      query: (sql) => queryDatabase(root, local.databaseUrl, sql),
    });
    if (interrupted) fail("Round 2I was interrupted.");
    return result;
  } finally {
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
    await Promise.allSettled([
      reservations?.release() ?? Promise.resolve(),
      appReservation ? closeServer(appReservation.server) : Promise.resolve(),
    ]);
    await stopChild(appChild);
    if (supabaseStarted && workdir) {
      runSync(supabaseExecutable, ["stop", "--no-backup"], {
        cwd: workdir,
        timeout: 180_000,
        label: "Round 2I disposable Supabase stop",
      });
    }
    rmSync(temporaryRoot, { recursive: true, force: true });
    if (existsSync(temporaryRoot)) fail("Round 2I temporary workspace cleanup failed.");
    assertNoDockerResidue(projectId, root);
    if (listenerIdentity(3000) !== port3000Before) {
      fail("Port 3000 process ownership changed during Round 2I.");
    }
    if (appReservation && listenerIdentity(appReservation.port)) {
      fail("Round 2I application listener remained after cleanup.");
    }
  }
}
