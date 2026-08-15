import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer, type Server } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { reserveDisposablePorts } from "./project004-disposable-port-reservation.ts";
import { assertProject004Workspace } from "./project004-identity.ts";

export type RealLocalGradesStack = Readonly<{
  root: string;
  temporaryRoot: string;
  projectId: string;
  appOrigin: string;
  apiUrl: string;
  publishableKey: string;
  syntheticPassword: string;
  query: (sql: string) => string;
  activate: () => void;
  deactivate: () => void;
  diagnostic: () => void;
}>;

const images = [
  "public.ecr.aws/supabase/postgres:17.6.1.143",
  "public.ecr.aws/supabase/gotrue:v2.193.0",
  "public.ecr.aws/supabase/postgrest:v14.15",
  "public.ecr.aws/supabase/kong:2.8.1",
] as const;

function fail(code: string): never { throw new Error(code); }

function environment(home: string, additions: Record<string, string | undefined> = {}) {
  return {
    HOME: home,
    PATH: "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin",
    TMPDIR: tmpdir(),
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    NODE_ENV: "development",
    NEXT_TELEMETRY_DISABLED: "1",
    SUPABASE_TELEMETRY_DISABLED: "true",
    npm_config_offline: "true",
    ...additions,
  } satisfies Record<string, string | undefined>;
}

function safeDiagnostic(output: string) {
  return output.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)
    .filter((line) => !/(?:key|password|token|secret|jwt|db_url|api_url|authorization)/iu.test(line) && !line.includes("://") && !line.includes("eyJ"))
    .slice(-8).join(" | ");
}

function run(executable: string, args: string[], options: {
  root: string;
  home: string;
  code: string;
  input?: string;
  timeout?: number;
  additions?: Record<string, string | undefined>;
}) {
  const result = spawnSync(executable, args, {
    cwd: options.root,
    env: environment(options.home, options.additions),
    input: options.input,
    encoding: "utf8",
    timeout: options.timeout ?? 300_000,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0 || result.error) {
    const detail = safeDiagnostic(`${result.stdout ?? ""}\n${result.stderr ?? ""}`);
    fail(`${options.code}${detail ? `:${detail}` : ""}`);
  }
  return result.stdout ?? "";
}

function docker(root: string, home: string, args: string[], code: string) {
  return run("/usr/local/bin/docker", args, { root, home, code });
}

function reserveAppPort() {
  return new Promise<{ server: Server; port: number }>((resolvePromise, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0, exclusive: true }, () => {
      server.removeListener("error", reject);
      const address = server.address();
      if (!address || typeof address === "string" || address.port === 3000) {
        server.close();
        reject(new Error("REAL_LOCAL_APP_PORT_INVALID"));
      } else resolvePromise({ server, port: address.port });
    });
  });
}

function closeServer(server: Server) {
  return new Promise<void>((resolvePromise, reject) => {
    if (!server.listening) return resolvePromise();
    server.close((error) => error ? reject(error) : resolvePromise());
  });
}

function query(root: string, home: string, database: string, sql: string) {
  return run("/usr/local/bin/docker", [
    "exec", "--interactive", database, "psql", "-U", "postgres", "-d", "postgres", "-AtX", "-v", "ON_ERROR_STOP=1",
  ], { root, home, input: sql, code: "REAL_LOCAL_DATABASE_QUERY_FAILED" }).trim();
}

async function waitForDatabase(root: string, home: string, database: string) {
  const deadline = Date.now() + 90_000;
  let ready = 0;
  while (Date.now() < deadline) {
    const result = spawnSync("/usr/local/bin/docker", ["exec", database, "psql", "-U", "postgres", "-d", "postgres", "-AtX", "-c", "select 1;"], {
      cwd: root, env: environment(home), encoding: "utf8",
    });
    if (result.status === 0 && result.stdout.trim() === "1") {
      ready += 1;
      if (ready >= 4) return;
    } else ready = 0;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));
  }
  fail("REAL_LOCAL_DATABASE_READINESS_TIMEOUT");
}

async function waitForAuth(root: string, home: string, database: string, auth: string) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const state = spawnSync("/usr/local/bin/docker", ["inspect", "--format", "{{.State.Running}}", auth], {
      cwd: root, env: environment(home), encoding: "utf8",
    });
    if (state.status !== 0 || state.stdout.trim() !== "true") fail("REAL_LOCAL_AUTH_EXITED");
    const probe = spawnSync("/usr/local/bin/docker", ["exec", database, "psql", "-U", "postgres", "-d", "postgres", "-AtX", "-c", "select to_regclass('auth.users') is not null;"], {
      cwd: root, env: environment(home), encoding: "utf8",
    });
    if (probe.status === 0 && probe.stdout.trim() === "t") return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));
  }
  fail("REAL_LOCAL_AUTH_READINESS_TIMEOUT");
}

async function waitForUrl(url: string, headers: HeadersInit = {}) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { headers, redirect: "manual", signal: AbortSignal.timeout(2_000) });
      if (response.status >= 200 && response.status < 500) return;
    } catch { /* local readiness retry */ }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));
  }
  fail("REAL_LOCAL_SERVICE_READINESS_TIMEOUT");
}

function roleToken(secret: string, role: "anon") {
  const encode = (value: string) => Buffer.from(value).toString("base64url");
  const header = encode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = encode(JSON.stringify({ iss: "supabase-demo", ref: "plave-local-e2e", role, iat: 1_700_000_000, exp: 4_102_444_800 }));
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${createHmac("sha256", secret).update(unsigned).digest("base64url")}`;
}

function applyMigrations(root: string, home: string, database: string) {
  const names = readdirSync(resolve(root, "supabase/migrations"))
    .filter((name) => /^\d{4}_[a-z0-9_]+[.]sql$/u.test(name)).sort();
  if (names.length !== 47 || names[0] !== "0001_auth_profiles.sql" || names.at(-1) !== "0047_unified_learning_activity_projection.sql") {
    fail("REAL_LOCAL_MIGRATION_BOUNDARY_INVALID");
  }
  query(root, home, database, "create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations(version text primary key,statements text[]);");
  for (const name of names) {
    const containerPath = `/tmp/plave-${name}`;
    docker(root, home, ["cp", resolve(root, "supabase/migrations", name), `${database}:${containerPath}`], `REAL_LOCAL_MIGRATION_${name.slice(0, 4)}_COPY_FAILED`);
    docker(root, home, ["exec", database, "psql", "-U", "postgres", "-d", "postgres", "-X", "-v", "ON_ERROR_STOP=1", "--file", containerPath], `REAL_LOCAL_MIGRATION_${name.slice(0, 4)}_FAILED`);
    query(root, home, database, `insert into supabase_migrations.schema_migrations(version,statements) values('${name.slice(0, 4)}',array[]::text[]) on conflict do nothing;`);
  }
}

function releaseOperation(root: string, home: string, database: string, action: "diagnostic" | "activate" | "deactivate") {
  const file = action === "activate" ? "ACTIVATE_PUBLIC.sql" : action === "deactivate" ? "DEACTIVATE.sql" : "DIAGNOSTIC_READONLY.sql";
  const containerPath = `/tmp/plave-release-${file}`;
  docker(root, home, ["cp", resolve(root, "supabase/operations/grades-2-9-local-release", file), `${database}:${containerPath}`], `REAL_LOCAL_RELEASE_${action.toUpperCase()}_COPY_FAILED`);
  docker(root, home, ["exec", database, "psql", "-U", "postgres", "-d", "postgres", "-X", "-v", "ON_ERROR_STOP=1", "--file", containerPath], `REAL_LOCAL_RELEASE_${action.toUpperCase()}_FAILED`);
}

function prepareApp(root: string, temporaryRoot: string, home: string) {
  const runtimeRoot = resolve(temporaryRoot, "PLAVE-PROJECT004");
  mkdirSync(runtimeRoot, { recursive: true, mode: 0o700 });
  run("/usr/bin/rsync", [
    "-a", `--link-dest=${root}`, "--exclude=.git", "--exclude=.env*", "--exclude=.next*", "--exclude=node_modules",
    "--exclude=coverage", "--exclude=dist", "--exclude=build", "--exclude=artifacts", "--exclude=reports", "--exclude=.local-artifacts",
    "--exclude=supabase/.temp", "--exclude=*.log", `${root}/`, `${runtimeRoot}/`,
  ], { root, home, code: "REAL_LOCAL_APP_WORKSPACE_FAILED" });
  for (const forbidden of [".env.local", ".git", ".next"]) if (existsSync(resolve(runtimeRoot, forbidden))) fail("REAL_LOCAL_APP_WORKSPACE_UNSANITIZED");
  symlinkSync(resolve(root, "node_modules"), resolve(runtimeRoot, "node_modules"), "dir");
  return runtimeRoot;
}

async function waitForApp(origin: string, child: ChildProcess, logPath: string) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      const log = existsSync(logPath) ? safeDiagnostic(readFileSync(logPath, "utf8")) : "NO_LOG";
      fail(`REAL_LOCAL_APP_EXITED${log ? `:${log}` : ""}`);
    }
    try {
      const response = await fetch(`${origin}/login`, { redirect: "manual", signal: AbortSignal.timeout(2_000) });
      if (response.status >= 200 && response.status < 400) return;
    } catch { /* local readiness retry */ }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  fail("REAL_LOCAL_APP_READINESS_TIMEOUT");
}

async function stopChild(child: ChildProcess | null) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolvePromise) => child.once("exit", () => resolvePromise())),
    new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 8_000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

export async function withRealLocalGradesStack<T>(operation: (stack: RealLocalGradesStack) => Promise<T>) {
  const root = assertProject004Workspace();
  const temporaryRoot = mkdtempSync(join(tmpdir(), "plave-grades-browser-e2e-"));
  const home = resolve(temporaryRoot, "home");
  mkdirSync(home, { recursive: true, mode: 0o700 });
  const projectId = `plave-browser-e2e-${String(process.pid)}-${randomBytes(4).toString("hex")}`;
  const ports = await reserveDisposablePorts();
  const app = await reserveAppPort();
  const network = `${projectId}-network`;
  const database = `${projectId}-database`;
  const auth = `${projectId}-auth`;
  const rest = `${projectId}-rest`;
  const gateway = `${projectId}-gateway`;
  const created: string[] = [];
  let appChild: ChildProcess | null = null;
  let appLogPath: string | null = null;
  try {
    for (const image of images) run("/usr/local/bin/docker", ["image", "inspect", image], { root, home, code: "REAL_LOCAL_IMAGE_MISSING" });
    await ports.release();
    docker(root, home, ["network", "create", "--opt", "com.docker.network.bridge.enable_ip_masquerade=false", network], "REAL_LOCAL_NETWORK_CREATE_FAILED");
    const databasePassword = randomBytes(24).toString("hex");
    const jwtSecret = randomBytes(48).toString("hex");
    const publishableKey = roleToken(jwtSecret, "anon");
    docker(root, home, ["run", "--pull=never", "--detach", "--name", database, "--network", network, "--network-alias", "database", "--env", `POSTGRES_PASSWORD=${databasePassword}`, "--env", "POSTGRES_DB=postgres", images[0]], "REAL_LOCAL_DATABASE_START_FAILED");
    created.push(database);
    await waitForDatabase(root, home, database);
    run("/usr/local/bin/docker", ["exec", "--interactive", database, "psql", "-U", "supabase_admin", "-d", "postgres", "-AtX", "-v", "ON_ERROR_STOP=1"], {
      root, home, input: `alter role supabase_auth_admin with password '${databasePassword}';`, code: "REAL_LOCAL_AUTH_ROLE_FAILED",
    });
    docker(root, home, [
      "run", "--pull=never", "--detach", "--name", auth, "--restart", "on-failure:5", "--network", network, "--network-alias", "auth",
      "--env", "GOTRUE_API_HOST=0.0.0.0", "--env", "GOTRUE_API_PORT=9999",
      "--env", `API_EXTERNAL_URL=http://127.0.0.1:${String(ports.ports.api)}/auth/v1`,
      "--env", `GOTRUE_SITE_URL=http://127.0.0.1:${String(app.port)}`, "--env", `GOTRUE_URI_ALLOW_LIST=http://127.0.0.1:${String(app.port)}`,
      "--env", "GOTRUE_DB_DRIVER=postgres", "--env", "GOTRUE_DB_NAMESPACE=auth",
      "--env", `GOTRUE_DB_DATABASE_URL=postgres://supabase_auth_admin:${databasePassword}@database:5432/postgres?sslmode=disable`,
      "--env", "GOTRUE_DISABLE_SIGNUP=false", "--env", "GOTRUE_EXTERNAL_EMAIL_ENABLED=true", "--env", "GOTRUE_MAILER_AUTOCONFIRM=true",
      "--env", "GOTRUE_JWT_ADMIN_ROLES=service_role", "--env", "GOTRUE_JWT_AUD=authenticated", "--env", "GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated",
      "--env", "GOTRUE_JWT_EXP=3600", "--env", `GOTRUE_JWT_SECRET=${jwtSecret}`, images[1],
    ], "REAL_LOCAL_AUTH_START_FAILED");
    created.push(auth);
    await waitForAuth(root, home, database, auth);
    docker(root, home, ["stop", auth], "REAL_LOCAL_AUTH_QUIESCE_FAILED");
    applyMigrations(root, home, database);
    docker(root, home, ["start", auth], "REAL_LOCAL_AUTH_RESTART_FAILED");
    await waitForAuth(root, home, database, auth);
    docker(root, home, ["run", "--pull=never", "--detach", "--name", rest, "--network", network, "--network-alias", "rest", "--env", `PGRST_DB_URI=postgres://postgres:${databasePassword}@database:5432/postgres`, "--env", "PGRST_DB_SCHEMAS=public,graphql_public", "--env", "PGRST_DB_ANON_ROLE=anon", "--env", `PGRST_JWT_SECRET=${jwtSecret}`, "--env", "PGRST_DB_USE_LEGACY_GUCS=false", images[2]], "REAL_LOCAL_REST_START_FAILED");
    created.push(rest);
    const kong = resolve(temporaryRoot, "kong.yml");
    writeFileSync(kong, '_format_version: "1.1"\nservices:\n  - name: auth\n    url: http://auth:9999\n    routes:\n      - name: auth-route\n        strip_path: true\n        paths: [/auth/v1]\n  - name: rest\n    url: http://rest:3000\n    routes:\n      - name: rest-route\n        strip_path: true\n        paths: [/rest/v1]\n', { mode: 0o600 });
    docker(root, home, ["run", "--pull=never", "--detach", "--name", gateway, "--network", network, "--network-alias", "gateway", "--publish", `127.0.0.1:${String(ports.ports.api)}:8000`, "--volume", `${kong}:/home/kong/kong.yml:ro`, "--env", "KONG_DATABASE=off", "--env", "KONG_DECLARATIVE_CONFIG=/home/kong/kong.yml", images[3]], "REAL_LOCAL_GATEWAY_START_FAILED");
    created.push(gateway);
    const apiUrl = `http://127.0.0.1:${String(ports.ports.api)}`;
    await waitForUrl(`${apiUrl}/auth/v1/health`);
    await waitForUrl(`${apiUrl}/rest/v1/`, { apikey: publishableKey, Authorization: `Bearer ${publishableKey}` });
    if (query(root, home, database, "select count(*)||'|'||max(version) from supabase_migrations.schema_migrations;") !== "47|0047") fail("REAL_LOCAL_MIGRATION_HISTORY_INVALID");
    if (query(root, home, database, "select count(*) from public.curriculum_grade_release_policies where release_mode='HIDDEN' and not catalog_enabled and not runtime_enabled;") !== "8") fail("REAL_LOCAL_DEFAULT_NOT_HIDDEN");
    releaseOperation(root, home, database, "diagnostic");
    releaseOperation(root, home, database, "activate");
    await closeServer(app.server);
    const runtimeRoot = prepareApp(root, temporaryRoot, home);
    const appOrigin = `http://127.0.0.1:${String(app.port)}`;
    const runtimeEnvironment = {
      NODE_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: apiUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      PLAVE_CURRICULUM_RUNTIME_ENABLED: "true",
      PLAVE_GRADES_2_9_RELEASE_MODE: "PUBLIC",
      PLAVE_ON_DEMAND_GENERATION_ENABLED: "false",
      PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED: "false",
      PLAVE_GENERATED_PRACTICE_MODE: "OFF",
      PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED: "false",
      PLAVE_CONTROLLED_PILOT_ENABLED: "false",
      PLAVE_RETENTION_RUNTIME_ENABLED: "false",
      PLAVE_ADAPTIVE_PILOT_USER_IDS: "",
    };
    const nextExecutable = resolve(runtimeRoot, "node_modules/next/dist/bin/next");
    run(process.execPath, [nextExecutable, "build", "--webpack"], {
      root: runtimeRoot,
      home,
      code: "REAL_LOCAL_PRODUCTION_BUILD_FAILED",
      additions: runtimeEnvironment,
      timeout: 600_000,
    });
    const logPath = resolve(temporaryRoot, "application.log");
    appLogPath = logPath;
    const log = openSync(logPath, "wx", 0o600);
    appChild = spawn(process.execPath, [nextExecutable, "start", "--hostname", "127.0.0.1", "--port", String(app.port)], {
      cwd: runtimeRoot,
      env: environment(home, runtimeEnvironment),
      stdio: ["ignore", log, log],
    });
    closeSync(log);
    await waitForApp(appOrigin, appChild, logPath);
    return await operation({
      root, temporaryRoot, projectId, appOrigin, apiUrl, publishableKey,
      syntheticPassword: `Plave-Browser-${randomBytes(12).toString("hex")}!`,
      query: (sql) => query(root, home, database, sql),
      activate: () => releaseOperation(root, home, database, "activate"),
      deactivate: () => releaseOperation(root, home, database, "deactivate"),
      diagnostic: () => releaseOperation(root, home, database, "diagnostic"),
    });
  } catch (error) {
    const diagnostic = appLogPath && existsSync(appLogPath)
      ? safeDiagnostic(readFileSync(appLogPath, "utf8"))
      : "";
    if (diagnostic) process.stderr.write(`REAL_LOCAL_APP_DIAGNOSTIC=${diagnostic}\n`);
    throw error;
  } finally {
    await stopChild(appChild);
    await Promise.allSettled([ports.release(), closeServer(app.server)]);
    for (const container of [...created].reverse()) {
      const removed = spawnSync("/usr/local/bin/docker", ["rm", "--force", container], { cwd: root, env: environment(home), encoding: "utf8" });
      if (removed.status !== 0) fail("REAL_LOCAL_CONTAINER_CLEANUP_FAILED");
    }
    if (created.length) docker(root, home, ["network", "rm", network], "REAL_LOCAL_NETWORK_CLEANUP_FAILED");
    rmSync(temporaryRoot, { recursive: true, force: true });
    for (const inventory of [
      { args: ["ps", "-a", "--format", "{{.Names}}"], label: "CONTAINER" },
      { args: ["network", "ls", "--format", "{{.Name}}"], label: "NETWORK" },
      { args: ["volume", "ls", "--format", "{{.Name}}"], label: "VOLUME" },
    ] as const) {
      const output = run("/usr/local/bin/docker", [...inventory.args], { root, home, code: "REAL_LOCAL_DOCKER_RECONCILIATION_FAILED" });
      if (output.split(/\r?\n/u).some((line) => line.includes(projectId))) fail(`REAL_LOCAL_DOCKER_RESIDUE_${inventory.label}`);
    }
  }
}
