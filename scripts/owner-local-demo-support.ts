import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  ownerLocalHealthContract,
  parseOwnerLocalHealth,
  type OwnerLocalHealth,
} from "../lib/owner-local-health-contract.ts";
import {
  assertProject004Workspace,
} from "./project004-identity.ts";

export type OwnerLocalSupabase = Readonly<{
  apiUrl: string;
  publishableKey: string;
  databaseUrl: URL;
}>;

export type OwnerLocalHealthProbeResult =
  | Readonly<{
      status: "READY";
      health: OwnerLocalHealth;
    }>
  | Readonly<{
      status: "ENDPOINT_NOT_READY";
    }>
  | Readonly<{
      status: "MALFORMED_RESPONSE";
    }>;

export type OwnerLocalHealthRootFailureCode =
  | "APP_HEALTH_READINESS_TIMEOUT"
  | "APP_HEALTH_MALFORMED_RESPONSE"
  | "APP_RUNTIME_FLAG_DISABLED"
  | "APP_ADAPTIVE_PILOT_CONFIGURATION_INVALID"
  | "APP_ON_DEMAND_RUNTIME_DISABLED";

export class OwnerLocalPreflightError extends Error {
  readonly code: OwnerLocalHealthRootFailureCode;

  constructor(code: OwnerLocalHealthRootFailureCode) {
    super(code);
    this.code = code;
  }
}

const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1"]);
export const ownerLocalAppPort = 3100;
export const ownerLocalAppOrigin = `http://127.0.0.1:${ownerLocalAppPort}`;
const ownerLocalMigrationCount = 44;
const ownerLocalSupabasePorts = [54320, 54321, 54322, 54323, 54324, 54327, 8083] as const;
export const ownerLocalManagedStatePath = join(
  tmpdir(),
  "plave-project004-owner-local-demo.state.json",
);
export const ownerLocalLegacyPidPath = join(
  tmpdir(),
  "plave-project004-owner-local-demo.pid",
);

export type ManagedStateObservation = Readonly<{
  present: boolean;
  formatValid: boolean;
  identityValid: boolean;
  managerPid: number | null;
  childPid: number | null;
}>;

function validPid(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

export function parseOwnerLocalManagedState(
  value: unknown,
): ManagedStateObservation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      present: true,
      formatValid: false,
      identityValid: false,
      managerPid: null,
      childPid: null,
    };
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort().join("|");
  const formatValid =
    keys === "cacheIdentity|childPid|managerPid|project|version" &&
    record.version === 1 &&
    validPid(record.managerPid) &&
    validPid(record.childPid);
  return {
    present: true,
    formatValid,
    identityValid:
      formatValid &&
      record.project === ownerLocalHealthContract.project &&
      record.cacheIdentity === ownerLocalHealthContract.cacheIdentity,
    managerPid: formatValid ? Number(record.managerPid) : null,
    childPid: formatValid ? Number(record.childPid) : null,
  };
}

export function readOwnerLocalManagedState(): ManagedStateObservation {
  if (existsSync(ownerLocalManagedStatePath)) {
    try {
      return parseOwnerLocalManagedState(
        JSON.parse(readFileSync(ownerLocalManagedStatePath, "utf8")),
      );
    } catch {
      return parseOwnerLocalManagedState(null);
    }
  }

  if (existsSync(ownerLocalLegacyPidPath)) {
    return {
      present: true,
      formatValid: false,
      identityValid: false,
      managerPid: null,
      childPid: null,
    };
  }

  return {
    present: false,
    formatValid: false,
    identityValid: false,
    managerPid: null,
    childPid: null,
  };
}

export function writeOwnerLocalManagedState(
  managerPid: number,
  childPid: number,
) {
  if (!validPid(managerPid) || !validPid(childPid)) {
    throw new Error("Managed Owner local process IDs are invalid.");
  }
  writeFileSync(
    ownerLocalManagedStatePath,
    `${JSON.stringify({
      version: 1,
      project: ownerLocalHealthContract.project,
      cacheIdentity: ownerLocalHealthContract.cacheIdentity,
      managerPid,
      childPid,
    })}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  rmSync(ownerLocalLegacyPidPath, { force: true });
}

export function removeOwnerLocalManagedState() {
  rmSync(ownerLocalManagedStatePath, { force: true });
  rmSync(ownerLocalLegacyPidPath, { force: true });
}

export async function withOwnerLocalManagedState<T>(
  managerPid: number,
  childPid: number,
  operation: () => Promise<T>,
  stateOperations: Readonly<{
    write: (managerPid: number, childPid: number) => void;
    remove: () => void;
  }> = {
    write: writeOwnerLocalManagedState,
    remove: removeOwnerLocalManagedState,
  },
) {
  stateOperations.write(managerPid, childPid);
  try {
    return await operation();
  } finally {
    stateOperations.remove();
  }
}

export function buildOwnerLocalChildEnvironment(
  config: OwnerLocalSupabase,
  generationSigningKey: string,
  baseEnvironment: NodeJS.ProcessEnv = process.env,
) {
  if (!/^[0-9a-f]{64}$/.test(generationSigningKey)) {
    throw new Error("Owner local generation signing key is invalid.");
  }
  const safeEnvironment = { ...baseEnvironment };
  for (const name of [
    "GOOGLE_API_KEY",
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_DB_PASSWORD",
    "SUPABASE_SERVICE_ROLE_KEY",
    "PLAVE_LOCAL_DATABASE_URL",
  ]) {
    safeEnvironment[name] = "";
  }
  return {
    ...safeEnvironment,
    NEXT_PUBLIC_SUPABASE_URL: config.apiUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: config.publishableKey,
    PLAVE_CURRICULUM_RUNTIME_ENABLED: "true",
    PLAVE_ON_DEMAND_GENERATION_ENABLED: "true",
    PLAVE_ON_DEMAND_GENERATION_SIGNING_KEY: generationSigningKey,
    PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED: "true",
    PLAVE_GENERATED_PRACTICE_MODE: "SHADOW",
    PLAVE_GENERATED_PRACTICE_PILOT_USER_IDS: "",
    PLAVE_OWNER_LOCAL_DEMO: "true",
    PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED: "false",
    PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED: "false",
    PLAVE_CONTROLLED_PILOT_ENABLED: "false",
    PLAVE_RETENTION_RUNTIME_ENABLED: "false",
    PLAVE_ADAPTIVE_PILOT_USER_IDS: "",
  };
}

export function parseSupabaseStatusEnvironment(output: string) {
  const values = new Map<string, string>();
  for (const line of output.split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (!match) continue;
    const raw = match[2];
    values.set(
      match[1],
      raw.startsWith('"') && raw.endsWith('"')
        ? raw.slice(1, -1)
        : raw,
    );
  }
  return values;
}

function assertLoopbackUrl(
  rawValue: string,
  protocols: readonly string[],
  label: string,
) {
  let parsed: URL;
  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error(`${label}: local URL is invalid.`);
  }
  if (
    !protocols.includes(parsed.protocol) ||
    !loopbackHosts.has(parsed.hostname)
  ) {
    throw new Error(`${label}: only a loopback endpoint is allowed.`);
  }
  return parsed;
}

export function loadOwnerLocalSupabase(): OwnerLocalSupabase {
  assertProject004Workspace();
  const status = spawnSync("supabase", ["status", "-o", "env"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  if (status.status !== 0) {
    throw new Error(
      "Supabase local is unavailable. Start the PROJECT004 local stack first.",
    );
  }

  const local = parseSupabaseStatusEnvironment(status.stdout);
  const apiUrl = local.get("API_URL") ?? "";
  const publishableKey = local.get("ANON_KEY") ?? "";
  const databaseUrlText =
    local.get("DB_URL") ?? "";
  const parsedApi = assertLoopbackUrl(
    apiUrl,
    ["http:", "https:"],
    "Supabase API",
  );
  const databaseUrl = assertLoopbackUrl(
    databaseUrlText,
    ["postgres:", "postgresql:"],
    "PostgreSQL",
  );
  if (publishableKey.length < 20) {
    throw new Error("Supabase local public key is unavailable.");
  }

  return {
    apiUrl: parsedApi.toString().replace(/\/$/, ""),
    publishableKey,
    databaseUrl,
  };
}

export function startOwnerLocalSupabase() {
  assertProject004Workspace();
  const existing = spawnSync("supabase", ["status"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  if (existing.status === 0) {
    throw new Error(
      "PROJECT004 local Supabase is already running; ownership is ambiguous.",
    );
  }
  const started = spawnSync("supabase", ["start"], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (started.status !== 0) {
    spawnSync("supabase", ["stop", "--no-backup"], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });
    const safeDiagnostic = `${started.stdout}\n${started.stderr}`
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter(
        (line) =>
          !/(?:key|password|token|secret|jwt|db_url|api_url|anon|service_role)/i.test(
            line,
          ) &&
          !line.includes("://") &&
          !line.includes("eyJ"),
      )
      .slice(-12);
    for (const line of safeDiagnostic) {
      process.stderr.write(`SUPABASE_START_DIAGNOSTIC=${line}\n`);
    }
    throw new Error("PROJECT004 local Supabase failed to start safely.");
  }
}

export function stopOwnerLocalSupabase() {
  assertProject004Workspace();
  const stopped = spawnSync("supabase", ["stop", "--no-backup"], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (stopped.status !== 0) {
    throw new Error("PROJECT004 local Supabase failed to stop safely.");
  }
}

export function materializeOwnerLocalCurriculum(
  config: OwnerLocalSupabase,
) {
  assertProject004Workspace();
  const environment = { ...process.env };
  delete environment.GOOGLE_API_KEY;
  delete environment.GEMINI_API_KEY;
  delete environment.OPENAI_API_KEY;
  environment.PLAVE_LOCAL_DATABASE_URL = config.databaseUrl.toString();
  environment.PLAVE_LOCAL_CURRICULUM_ACTIVATE = "false";
  const materialized = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      "scripts/materialize-universal-curriculum-local.ts",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: environment,
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  if (materialized.status !== 0) {
    throw new Error("Owner local curriculum materialization failed.");
  }
}

function postgresEnvironment(config: OwnerLocalSupabase) {
  const environment = { ...process.env };
  delete environment.PLAVE_LOCAL_DATABASE_URL;
  return {
    ...environment,
    PGHOST: config.databaseUrl.hostname,
    PGPORT: config.databaseUrl.port,
    PGDATABASE: config.databaseUrl.pathname.slice(1),
    PGUSER: decodeURIComponent(config.databaseUrl.username),
    PGPASSWORD: decodeURIComponent(config.databaseUrl.password),
  };
}

export function queryOwnerLocalDatabase(
  config: OwnerLocalSupabase,
  sql: string,
) {
  const result = spawnSync(
    "psql",
    ["-X", "--set", "ON_ERROR_STOP=1", "-At", "--field-separator", "\t"],
    {
      input: sql,
      encoding: "utf8",
      env: postgresEnvironment(config),
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    throw new Error("Owner local database query failed.");
  }
  return result.stdout.trim();
}

export function runOwnerLocalOperation(
  config: OwnerLocalSupabase,
  relativePath: string,
) {
  assertProject004Workspace();
  const result = spawnSync(
    "psql",
    [
      "-X",
      "--set",
      "ON_ERROR_STOP=1",
      "--file",
      resolve(process.cwd(), relativePath),
    ],
    {
      encoding: "utf8",
      env: postgresEnvironment(config),
      stdio: ["ignore", "inherit", "inherit"],
    },
  );
  if (result.status !== 0) {
    throw new Error("Owner local database operation failed.");
  }
}

const onDemandMigration =
  "supabase/migrations/0040_deterministic_on_demand_curriculum.sql";

export function ensureOwnerLocalOnDemandSchema(
  config: OwnerLocalSupabase,
) {
  const output = queryOwnerLocalDatabase(
    config,
    `
      select
        (pg_catalog.to_regclass(
          'private.curriculum_generation_runtime_secret'
        ) is not null)::integer,
        (pg_catalog.to_regclass(
          'public.curriculum_generated_questions'
        ) is not null)::integer,
        (pg_catalog.to_regclass(
          'private.curriculum_generated_solutions'
        ) is not null)::integer,
        (pg_catalog.to_regclass(
          'public.curriculum_generated_answers'
        ) is not null)::integer,
        (pg_catalog.to_regprocedure(
          'public.start_or_resume_generated_curriculum(jsonb,text,uuid)'
        ) is not null)::integer,
        (pg_catalog.to_regprocedure(
          'public.submit_generated_curriculum_answer(uuid,text,text,integer,uuid)'
        ) is not null)::integer,
        (pg_catalog.to_regprocedure(
          'public.get_my_generated_curriculum_evidence()'
        ) is not null)::integer,
        (pg_catalog.to_regprocedure(
          'public.get_parent_child_generated_curriculum_progress(uuid)'
        ) is not null)::integer;
    `,
  );
  const presence = output.split("\t").map(Number);
  if (presence.length !== 8 || presence.some((value) => ![0, 1].includes(value))) {
    throw new Error("Owner local on-demand schema inspection failed.");
  }
  if (presence.every((value) => value === 0)) {
    runOwnerLocalOperation(config, onDemandMigration);
    return;
  }
  if (presence.some((value) => value === 0)) {
    throw new Error("Owner local migration 0040 is partially applied.");
  }
}

export function configureOwnerLocalGenerationSigning(
  config: OwnerLocalSupabase,
  signingKeyHex: string,
) {
  if (!/^[0-9a-f]{64}$/.test(signingKeyHex)) {
    throw new Error("Owner local generation signing key is invalid.");
  }
  queryOwnerLocalDatabase(
    config,
    `
      insert into private.curriculum_generation_runtime_secret (
        singleton, signing_key_hex, key_version, configured_at
      ) values (true, '${signingKeyHex}', 1, now())
      on conflict (singleton) do update set
        signing_key_hex = excluded.signing_key_hex,
        key_version =
          private.curriculum_generation_runtime_secret.key_version + 1,
        configured_at = now();
    `,
  );
}

export function clearOwnerLocalGenerationSigning(
  config: OwnerLocalSupabase,
) {
  queryOwnerLocalDatabase(
    config,
    "delete from private.curriculum_generation_runtime_secret where singleton;",
  );
}

export const ownerLocalPreflightCheckNames = [
  "SUPABASE_HEALTH",
  "MIGRATIONS",
  "RELEASE_COUNTS",
  "DB_RELEASE_STATE",
  "ADAPTIVE_PILOT",
  "APP_PORT",
  "APP_RUNTIME_FLAG_OBSERVED",
  "MANAGED_PID_CACHE_IDENTITY",
  "RELEASE_RUNTIME_CONSISTENCY",
  "ON_DEMAND_RUNTIME_OBSERVED",
] as const;

type OwnerLocalPreflightCheckName =
  (typeof ownerLocalPreflightCheckNames)[number];

export type OwnerLocalPreflightFacts = Readonly<{
  supabaseHealthy: boolean;
  migrationsValid: boolean;
  releaseCountsValid: boolean;
  releaseState: "ACTIVE" | "INACTIVE" | "INVALID";
  adaptiveDatabaseDisabled: boolean;
  appPortManaged: boolean;
  healthObserved: boolean;
  healthRuntimeEnabled: boolean;
  healthAdaptivePilotDisabled: boolean;
  healthOnDemandGenerationEnabled: boolean;
  managedPidCacheIdentity: boolean;
}>;

export function evaluateOwnerLocalPreflight(
  facts: OwnerLocalPreflightFacts,
): Record<OwnerLocalPreflightCheckName, boolean> {
  return {
    SUPABASE_HEALTH: facts.supabaseHealthy,
    MIGRATIONS: facts.migrationsValid,
    RELEASE_COUNTS: facts.releaseCountsValid,
    DB_RELEASE_STATE: facts.releaseState === "ACTIVE",
    ADAPTIVE_PILOT:
      facts.adaptiveDatabaseDisabled &&
      facts.healthObserved &&
      facts.healthAdaptivePilotDisabled,
    APP_PORT: facts.appPortManaged && facts.healthObserved,
    APP_RUNTIME_FLAG_OBSERVED:
      facts.healthObserved && facts.healthRuntimeEnabled,
    MANAGED_PID_CACHE_IDENTITY: facts.managedPidCacheIdentity,
    RELEASE_RUNTIME_CONSISTENCY:
      facts.healthObserved &&
      ((facts.releaseState === "ACTIVE" &&
        facts.healthRuntimeEnabled) ||
        (facts.releaseState === "INACTIVE" &&
          !facts.healthRuntimeEnabled)),
    ON_DEMAND_RUNTIME_OBSERVED:
      facts.healthObserved && facts.healthOnDemandGenerationEnabled,
  };
}

export function migrationFilesComplete() {
  try {
    const migrationVersions = readdirSync(
      resolve(process.cwd(), "supabase/migrations"),
    )
      .map((name) => /^(\d{4})_.*\.sql$/.exec(name)?.[1])
      .filter((value): value is string => Boolean(value))
      .sort();
    const expected = Array.from(
      { length: ownerLocalMigrationCount },
      (_, index) => String(index + 1).padStart(4, "0"),
    );
    return (
      migrationVersions.length === expected.length &&
      migrationVersions.every(
        (version, index) => version === expected[index],
      )
    );
  } catch {
    return false;
  }
}

type DatabaseObservation = Readonly<{
  migrationsValid: boolean;
  releaseCountsValid: boolean;
  releaseState: "ACTIVE" | "INACTIVE" | "INVALID";
  adaptiveDatabaseDisabled: boolean;
}>;

const unavailableDatabaseObservation: DatabaseObservation = {
  migrationsValid: false,
  releaseCountsValid: false,
  releaseState: "INVALID",
  adaptiveDatabaseDisabled: false,
};

function observeOwnerLocalDatabase(
  config: OwnerLocalSupabase,
): DatabaseObservation {
  try {
    const output = queryOwnerLocalDatabase(
      config,
      `
        select
          (select count(*) from public.curriculum_releases
            where release_id = 'plave-math-grades-1-9-v1'),
          (select count(*) from public.curriculum_release_units
            where release_id = 'plave-math-grades-1-9-v1'),
          (select count(*) from public.curriculum_release_questions
            where release_id = 'plave-math-grades-1-9-v1'),
          (select count(*) from private.curriculum_release_solutions
            where release_id = 'plave-math-grades-1-9-v1'),
          (
            select count(distinct outcome_id)
            from public.curriculum_release_units as unit
            cross join lateral unnest(unit.official_outcome_ids)
              as outcome(outcome_id)
            where unit.release_id = 'plave-math-grades-1-9-v1'
          ),
          (select count(*) from public.curriculum_releases
            where release_id = 'plave-math-grades-1-9-v1'
              and status = 'ACTIVE'
              and activation_state = 'ACTIVE'
              and activated_at is not null
              and retired_at is null),
          (select count(*) from public.curriculum_releases
            where release_id = 'plave-math-grades-1-9-v1'
              and status = 'DRAFT'
              and activation_state = 'INACTIVE'
              and activated_at is null
              and retired_at is null),
          (
            pg_catalog.to_regclass('public.profiles') is not null
            and pg_catalog.to_regclass('public.practice_attempts') is not null
            and pg_catalog.to_regclass(
              'public.adaptive_practice_releases'
            ) is not null
            and pg_catalog.to_regclass(
              'public.curriculum_releases'
            ) is not null
            and pg_catalog.to_regclass(
              'public.teacher_curriculum_assignment_drafts'
            ) is not null
            and pg_catalog.to_regprocedure(
              'public.start_or_resume_curriculum_unit(text,uuid)'
            ) is not null
            and pg_catalog.to_regprocedure(
              'public.create_teacher_curriculum_assignment_draft(uuid,text,text,timestamp with time zone,text,text,text,text,text[],smallint,text,uuid)'
            ) is not null
            and pg_catalog.to_regclass(
              'public.curriculum_generated_questions'
            ) is not null
            and pg_catalog.to_regclass(
              'private.curriculum_generated_solutions'
            ) is not null
            and pg_catalog.to_regprocedure(
              'public.start_or_resume_generated_curriculum(jsonb,text,uuid)'
            ) is not null
            and pg_catalog.to_regprocedure(
              'public.get_my_generated_curriculum_evidence()'
            ) is not null
            and pg_catalog.to_regprocedure(
              'public.get_parent_child_generated_curriculum_progress(uuid)'
            ) is not null
            and pg_catalog.to_regprocedure(
              'public.get_parent_child_score_xp_mastery(uuid)'
            ) is not null
            and pg_catalog.to_regprocedure(
              'public.get_parent_child_motivation_v1(uuid)'
            ) is not null
          )::integer,
          (
            select count(*)
            from public.adaptive_practice_releases
            where
              runtime_enabled
              or controlled_pilot_enabled
              or retention_runtime_enabled
              or publication_status <> 'DRAFT'
              or student_visibility <> 'HIDDEN'
          );
      `,
    );
    const values = output.split("\t").map(Number);
    if (
      values.length !== 9 ||
      values.some((value) => !Number.isInteger(value))
    ) {
      return unavailableDatabaseObservation;
    }
    const releaseState =
      values[5] === 1 && values[6] === 0
        ? "ACTIVE"
        : values[5] === 0 && values[6] === 1
          ? "INACTIVE"
          : "INVALID";
    return {
      migrationsValid: values[7] === 1,
      releaseCountsValid:
        values[0] === 1 &&
        values[1] === 171 &&
        values[2] === 2052 &&
        values[3] === 2052 &&
        values[4] === 546,
      releaseState,
      adaptiveDatabaseDisabled: values[8] === 0,
    };
  } catch {
    return unavailableDatabaseObservation;
  }
}

async function observeSupabaseHealth(config: OwnerLocalSupabase) {
  try {
    const response = await fetch(`${config.apiUrl}/auth/v1/health`, {
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${config.publishableKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function processIsAlive(pid: number | null) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function managedCommandIsExpected(pid: number | null) {
  if (!pid) return false;
  const result = spawnSync("ps", ["-o", "command=", "-p", String(pid)], {
    encoding: "utf8",
  });
  return (
    result.status === 0 &&
    result.stdout.includes("scripts/start-owner-local-demo.ts")
  );
}

function parentPid(pid: number) {
  const result = spawnSync("ps", ["-o", "ppid=", "-p", String(pid)], {
    encoding: "utf8",
  });
  const value = Number(result.stdout.trim());
  return result.status === 0 && validPid(value) ? value : null;
}

function listenerPids() {
  const result = spawnSync(
    "lsof",
    ["-nP", "-t", `-iTCP:${ownerLocalAppPort}`, "-sTCP:LISTEN"],
    { encoding: "utf8" },
  );
  if (result.status !== 0) return [];
  return [
    ...new Set(
      result.stdout
        .split(/\s+/)
        .map(Number)
        .filter(validPid),
    ),
  ];
}

function isManagedDescendant(
  listenerPid: number,
  managedPids: readonly number[],
) {
  const expected = new Set(managedPids);
  const visited = new Set<number>();
  let current: number | null = listenerPid;
  for (let depth = 0; depth < 16 && current; depth += 1) {
    if (expected.has(current)) return true;
    if (visited.has(current)) return false;
    visited.add(current);
    current = parentPid(current);
  }
  return false;
}

async function probeOwnerLocalHealth(
  requestTimeoutMs: number,
): Promise<OwnerLocalHealthProbeResult> {
  try {
    const response = await fetch(
      `${ownerLocalAppOrigin}/api/internal/owner-local-health`,
      {
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(requestTimeoutMs),
      },
    );
    if (!response.ok) {
      return { status: "ENDPOINT_NOT_READY" };
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { status: "MALFORMED_RESPONSE" };
    }
    const health = parseOwnerLocalHealth(payload);
    return health
      ? { status: "READY", health }
      : { status: "MALFORMED_RESPONSE" };
  } catch {
    return { status: "ENDPOINT_NOT_READY" };
  }
}

function configSection(source: string, name: string) {
  const lines = source.split(/\r?\n/);
  const selected: string[] = [];
  let active = false;
  for (const line of lines) {
    const header = /^\s*\[([^\]]+)\]\s*$/.exec(line)?.[1];
    if (header) {
      active = header === name;
      continue;
    }
    if (active) selected.push(line);
  }
  return selected.join("\n");
}

function configValue(section: string, name: string) {
  return new RegExp(`^\\s*${name}\\s*=\\s*(.+?)\\s*$`, "m")
    .exec(section)?.[1];
}

function portIsFree(port: number) {
  const result = spawnSync(
    "lsof",
    ["-nP", "-t", `-iTCP:${port}`, "-sTCP:LISTEN"],
    { encoding: "utf8" },
  );
  return result.status !== 0 && result.stdout.trim() === "";
}

function ownerLocalDockerNamespaceIsAvailable() {
  const info = spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], {
    encoding: "utf8",
  });
  if (info.status !== 0) return false;
  const inventories = [
    ["ps", "--all", "--format", "{{.Names}}"],
    ["volume", "ls", "--format", "{{.Name}}"],
    ["network", "ls", "--format", "{{.Name}}"],
  ] as const;
  return inventories.every((args) => {
    const result = spawnSync("docker", args, { encoding: "utf8" });
    return (
      result.status === 0 &&
      !result.stdout.toLowerCase().includes("plave-project004")
    );
  });
}

export function assertOwnerLocalSetupPreflight() {
  assertProject004Workspace();
  const config = readFileSync(
    resolve(process.cwd(), "supabase/config.toml"),
    "utf8",
  );
  const packageSource = readFileSync(
    resolve(process.cwd(), "package.json"),
    "utf8",
  );
  const packageScripts = (
    JSON.parse(packageSource) as { scripts?: Record<string, string> }
  ).scripts ?? {};
  const api = configSection(config, "api");
  const database = configSection(config, "db");
  const studio = configSection(config, "studio");
  const smtp = configSection(config, "local_smtp");
  const auth = configSection(config, "auth");
  const authEmail = configSection(config, "auth.email");
  const analytics = configSection(config, "analytics");
  const edgeRuntime = configSection(config, "edge_runtime");
  const externalSections = [
    ...config.matchAll(/^\s*\[auth\.external\.([^\]]+)\]\s*$/gm),
  ].map((match) =>
    configSection(config, `auth.external.${match[1]}`),
  );
  const checks = {
    PROJECT_NAMESPACE:
      /^\s*project_id\s*=\s*"PLAVE-PROJECT004"\s*$/m.test(config) &&
      ownerLocalDockerNamespaceIsAvailable(),
    API_LOOPBACK: configValue(api, "port") === "54321",
    DATABASE_LOOPBACK:
      configValue(database, "port") === "54322" &&
      configValue(database, "shadow_port") === "54320",
    APP_PORT:
      configValue(auth, "site_url") === `"${ownerLocalAppOrigin}"` &&
      portIsFree(ownerLocalAppPort),
    SUPABASE_PORTS: ownerLocalSupabasePorts.every(portIsFree),
    LOCAL_MAIL_ONLY:
      configValue(smtp, "enabled") === "true" &&
      configValue(smtp, "port") === "54324" &&
      configValue(authEmail, "enable_confirmations") === "false" &&
      !/^\s*\[auth\.email\.smtp\]\s*$/m.test(config) &&
      externalSections.length > 0 &&
      externalSections.every(
        (section) => configValue(section, "enabled") === "false",
      ),
    AUXILIARY_PORTS:
      configValue(studio, "port") === "54323" &&
      configValue(studio, "api_url") === '"http://127.0.0.1"' &&
      configValue(analytics, "port") === "54327" &&
      configValue(edgeRuntime, "inspector_port") === "8083",
    MIGRATIONS_0001_0044: migrationFilesComplete(),
    SAFE_DEMO_ENV: [
      "owner-local-demo:preflight",
      "owner-local-demo:start",
      "owner-local-demo:stop",
      "owner-local-demo:teacher-invite",
    ].every((name) => !(packageScripts[name] ?? "").includes("--env-file")),
  };
  printPreflightChecks(checks);
  throwIfPreflightFailed(checks);
  process.stdout.write("OWNER_LOCAL_SETUP_PREFLIGHT=PASS\n");
  process.stdout.write("REMOTE_TARGET=NONE_LOOPBACK_ONLY\n");
  process.stdout.write(`APP_URL=${ownerLocalAppOrigin}\n`);
}

export async function waitForOwnerLocalHealth(
  options: Readonly<{
    deadlineMs?: number;
    retryIntervalMs?: number;
    requestTimeoutMs?: number;
    now?: () => number;
    sleep?: (durationMs: number) => Promise<void>;
    probe?: () => Promise<OwnerLocalHealthProbeResult>;
  }> = {},
): Promise<
  | Readonly<{
      ok: true;
      health: OwnerLocalHealth;
      attempts: number;
    }>
  | Readonly<{
      ok: false;
      code:
        | "APP_HEALTH_READINESS_TIMEOUT"
        | "APP_HEALTH_MALFORMED_RESPONSE";
      attempts: number;
    }>
> {
  const deadlineMs = options.deadlineMs ?? 30_000;
  const retryIntervalMs = options.retryIntervalMs ?? 250;
  const requestTimeoutMs = options.requestTimeoutMs ?? 2_000;
  const now = options.now ?? Date.now;
  const sleep =
    options.sleep ??
    ((durationMs: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, durationMs)));
  const probe =
    options.probe ??
    (() => probeOwnerLocalHealth(requestTimeoutMs));
  const startedAt = now();
  let attempts = 0;

  while (true) {
    attempts += 1;
    const observation = await probe();
    if (observation.status === "READY") {
      return { ok: true, health: observation.health, attempts };
    }
    if (observation.status === "MALFORMED_RESPONSE") {
      return {
        ok: false,
        code: "APP_HEALTH_MALFORMED_RESPONSE",
        attempts,
      };
    }
    const remainingMs = deadlineMs - (now() - startedAt);
    if (remainingMs <= 0) {
      return {
        ok: false,
        code: "APP_HEALTH_READINESS_TIMEOUT",
        attempts,
      };
    }
    await sleep(Math.min(retryIntervalMs, remainingMs));
  }
}

export function ownerLocalHealthFlagFailure(
  health: OwnerLocalHealth,
): OwnerLocalHealthRootFailureCode | null {
  if (!health.runtimeEnabled) return "APP_RUNTIME_FLAG_DISABLED";
  if (!health.adaptivePilotDisabled) {
    return "APP_ADAPTIVE_PILOT_CONFIGURATION_INVALID";
  }
  if (!health.onDemandGenerationEnabled) {
    return "APP_ON_DEMAND_RUNTIME_DISABLED";
  }
  return null;
}

function printPreflightChecks(
  checks: Readonly<Record<string, boolean>>,
) {
  for (const [name, passed] of Object.entries(checks)) {
    process.stdout.write(
      `PREFLIGHT_CHECK ${name}=${passed ? "PASS" : "FAIL"}\n`,
    );
  }
}

function throwIfPreflightFailed(
  checks: Readonly<Record<string, boolean>>,
) {
  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  if (failed.length > 0) {
    throw new Error(
      `Owner local demo preflight failed: ${failed.join(", ")}.`,
    );
  }
}

function throwOwnerLocalRootFailure(
  code: OwnerLocalHealthRootFailureCode,
): never {
  process.stdout.write(`PREFLIGHT_ROOT_FAILURE=${code}\n`);
  throw new OwnerLocalPreflightError(code);
}

export async function assertOwnerLocalDatabasePreflight(
  config: OwnerLocalSupabase,
  expectedActive: boolean,
) {
  assertProject004Workspace();
  const database = observeOwnerLocalDatabase(config);
  const checks = {
    SUPABASE_HEALTH: await observeSupabaseHealth(config),
    MIGRATIONS:
      migrationFilesComplete() && database.migrationsValid,
    RELEASE_COUNTS: database.releaseCountsValid,
    DB_RELEASE_STATE:
      database.releaseState ===
      (expectedActive ? "ACTIVE" : "INACTIVE"),
    ADAPTIVE_PILOT: database.adaptiveDatabaseDisabled,
  };
  printPreflightChecks(checks);
  throwIfPreflightFailed(checks);
}

export async function assertOwnerLocalDemoPreflight(
  providedConfig?: OwnerLocalSupabase,
) {
  assertProject004Workspace();
  let config = providedConfig;
  if (!config) {
    try {
      config = loadOwnerLocalSupabase();
    } catch {
      config = undefined;
    }
  }

  const healthReadiness = await waitForOwnerLocalHealth();
  if (!healthReadiness.ok) {
    throwOwnerLocalRootFailure(healthReadiness.code);
  }
  const health = healthReadiness.health;
  const healthFlagFailure = ownerLocalHealthFlagFailure(health);
  if (healthFlagFailure) {
    throwOwnerLocalRootFailure(healthFlagFailure);
  }

  const state = readOwnerLocalManagedState();
  const database = config
    ? observeOwnerLocalDatabase(config)
    : unavailableDatabaseObservation;
  const supabaseHealthy = config
    ? await observeSupabaseHealth(config)
    : false;
  const managerValid =
    state.present &&
    state.formatValid &&
    state.identityValid &&
    processIsAlive(state.managerPid) &&
    managedCommandIsExpected(state.managerPid);
  const managedPids = [state.managerPid, state.childPid].filter(
    validPid,
  );
  const listeners = listenerPids();
  const appPortManaged =
    managerValid &&
    listeners.length === 1 &&
    isManagedDescendant(listeners[0], managedPids);
  const managedPidCacheIdentity =
    managerValid &&
    health.project === ownerLocalHealthContract.project &&
    health.cacheIdentity === ownerLocalHealthContract.cacheIdentity;
  const checks = evaluateOwnerLocalPreflight({
    supabaseHealthy,
    migrationsValid:
      migrationFilesComplete() && database.migrationsValid,
    releaseCountsValid: database.releaseCountsValid,
    releaseState: database.releaseState,
    adaptiveDatabaseDisabled: database.adaptiveDatabaseDisabled,
    appPortManaged,
    healthObserved: true,
    healthRuntimeEnabled: health.runtimeEnabled,
    healthAdaptivePilotDisabled: health.adaptivePilotDisabled,
    healthOnDemandGenerationEnabled:
      health.onDemandGenerationEnabled,
    managedPidCacheIdentity,
  });

  printPreflightChecks(checks);
  throwIfPreflightFailed(checks);
  process.stdout.write("OWNER_LOCAL_DEMO_PREFLIGHT=PASS\n");
  process.stdout.write("UNIVERSAL_RELEASE=ACTIVE\n");
  process.stdout.write("CURRICULUM_RUNTIME=true\n");
  process.stdout.write("OWNER_LOCAL_PROCESS=MANAGED_PROJECT004_CACHE\n");
  process.stdout.write("REMOTE_TARGET=NONE_LOOPBACK_ONLY\n");
}

export function setOwnerLocalDemoFlags(enabled: boolean) {
  process.env.PLAVE_CURRICULUM_RUNTIME_ENABLED =
    enabled ? "true" : "false";
  process.env.PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED = "false";
  process.env.PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED = "false";
  process.env.PLAVE_CONTROLLED_PILOT_ENABLED = "false";
  process.env.PLAVE_RETENTION_RUNTIME_ENABLED = "false";
  delete process.env.PLAVE_ADAPTIVE_PILOT_USER_IDS;
}
