import {
  chmodSync,
  existsSync,
  lstatSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

import { assertProject004Workspace } from "./project004-identity.ts";
import { project004RemoteDevContract } from "./project004-remote-dev-guard.ts";

export const project004RemoteRuntimeContract = {
  targetName: "plave-project004-dev-clean",
  runtimeMode: "REMOTE_DEVELOPMENT",
  environmentFile: ".env.remote-dev.local",
  loopbackHost: "127.0.0.1",
  loopbackPort: 3001,
  cacheDirectory: ".next-remote-dev-project004",
} as const;

const requiredEnvironmentKeys = [
  "PLAVE_PROJECT004_REMOTE_RUNTIME_MODE",
  "PLAVE_PROJECT004_REMOTE_TARGET_NAME",
  "PLAVE_PROJECT004_REMOTE_PROJECT_REF",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "PLAVE_CURRICULUM_RUNTIME_ENABLED",
  "PLAVE_ON_DEMAND_GENERATION_ENABLED",
  "PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED",
  "PLAVE_GENERATED_PRACTICE_MODE",
  "PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED",
  "PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED",
  "PLAVE_CONTROLLED_PILOT_ENABLED",
  "PLAVE_RETENTION_RUNTIME_ENABLED",
  "PLAVE_ADAPTIVE_PILOT_USER_IDS",
] as const;

const forbiddenEnvironmentKeys = new Set([
  "DATABASE_URL",
  "DIRECT_URL",
  "PLAVE_LOCAL_DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "SUPABASE_DB_PASSWORD",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
]);

const inheritedEnvironmentAllowlist = new Set([
  "COLORTERM",
  "HOME",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "NO_COLOR",
  "PATH",
  "SHELL",
  "TERM",
  "TMPDIR",
  "TZ",
]);

const childEnvironmentKeysPinnedEmpty = [
  ...forbiddenEnvironmentKeys,
  "PLAVE_LOCAL_CURRICULUM_ACTIVATE",
  "PLAVE_ON_DEMAND_GENERATION_SIGNING_KEY",
  "PLAVE_OWNER_LOCAL_DEMO",
  "PLAVE_PROJECT004_REMOTE_DB_PASSWORD",
  "PLAVE_PROJECT004_REMOTE_ENVIRONMENT_CLASS",
  "PLAVE_PROJECT004_REMOTE_OWNER_APPROVAL",
  "PLAVE_PROJECT004_REMOTE_PROJECT_REF",
  "SUPABASE_ACCESS_TOKEN",
] as const;

const frozenProjectFragment = `project${"003"}`;

export type Project004RemoteRuntimeConfig = {
  runtimeMode: string;
  targetName: string;
  projectRef: string;
  publicUrl: string;
  publishableKey: string;
  curriculumRuntimeEnabled: string;
  onDemandGenerationEnabled: string;
  generatedPracticeRuntimeEnabled: string;
  generatedPracticeMode: string;
  grade2NumbersTo1000Enabled: string;
  adaptivePracticeRuntimeEnabled: string;
  controlledPilotEnabled: string;
  retentionRuntimeEnabled: string;
  adaptivePilotUserIds: string;
};

export class Project004RemoteRuntimeFailure extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

function fail(code: string): never {
  throw new Project004RemoteRuntimeFailure(code);
}

function parseEnvironmentFile(source: string) {
  const values = new Map<string, string>();
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) fail("REMOTE_RUNTIME_ENV_FORMAT_INVALID");
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1);
    if (
      !/^[A-Z][A-Z0-9_]*$/u.test(key) ||
      values.has(key) ||
      /[\r\n\0]/u.test(value)
    ) {
      fail("REMOTE_RUNTIME_ENV_FORMAT_INVALID");
    }
    values.set(key, value);
  }
  return values;
}

function assertPublishableKey(value: string) {
  const modernKey = /^sb_publishable_[A-Za-z0-9_-]{20,}$/u;
  const legacyAnonKey = /^eyJ[A-Za-z0-9._-]{40,}$/u;
  if (
    value.length > 2_048 ||
    (!modernKey.test(value) && !legacyAnonKey.test(value))
  ) {
    fail("REMOTE_RUNTIME_PUBLISHABLE_KEY_INVALID");
  }
}

function assertRemotePublicUrl(projectRef: string, value: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    fail("REMOTE_RUNTIME_PUBLIC_URL_INVALID");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== `${projectRef}.supabase.co` ||
    parsed.port !== "" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    fail("REMOTE_RUNTIME_PUBLIC_URL_TARGET_MISMATCH");
  }
}

export function assertProject004RemoteRuntimeConfig(
  config: Project004RemoteRuntimeConfig,
) {
  if (
    project004RemoteRuntimeContract.targetName !==
      project004RemoteDevContract.projectName ||
    config.targetName !==
      project004RemoteRuntimeContract.targetName ||
    (config.targetName.toLowerCase().includes(frozenProjectFragment) ||
      /(?:^|[-_])(prod|production|live|main|primary)(?:$|[-_])/iu.test(
        config.targetName,
      ))
  ) {
    fail("REMOTE_RUNTIME_TARGET_REJECTED");
  }
  if (
    config.runtimeMode !==
    project004RemoteRuntimeContract.runtimeMode
  ) {
    fail("REMOTE_RUNTIME_MODE_REJECTED");
  }
  if (
    !/^[a-z0-9]{20}$/u.test(config.projectRef) ||
    config.projectRef.toLowerCase().includes(frozenProjectFragment)
  ) {
    fail("REMOTE_RUNTIME_PROJECT_REF_INVALID");
  }
  assertRemotePublicUrl(config.projectRef, config.publicUrl);
  assertPublishableKey(config.publishableKey);

  const disabledFlags = [
    config.onDemandGenerationEnabled,
    config.generatedPracticeRuntimeEnabled,
    config.grade2NumbersTo1000Enabled,
    config.adaptivePracticeRuntimeEnabled,
    config.controlledPilotEnabled,
    config.retentionRuntimeEnabled,
  ];
  if (
    !["true", "false"].includes(
      config.curriculumRuntimeEnabled,
    ) ||
    config.generatedPracticeMode !== "OFF" ||
    disabledFlags.some((value) => value !== "false") ||
    config.adaptivePilotUserIds !== ""
  ) {
    fail("REMOTE_RUNTIME_FEATURE_FLAG_CONTRACT_REJECTED");
  }
  return config;
}

export function createProject004RemoteRuntimeConfig(input: {
  targetName?: string;
  projectRef: string;
  publicUrl: string;
  publishableKey: string;
}): Project004RemoteRuntimeConfig {
  return assertProject004RemoteRuntimeConfig({
    runtimeMode: project004RemoteRuntimeContract.runtimeMode,
    targetName:
      input.targetName ??
      project004RemoteRuntimeContract.targetName,
    projectRef: input.projectRef.trim(),
    publicUrl: input.publicUrl.trim(),
    publishableKey: input.publishableKey.trim(),
    curriculumRuntimeEnabled: "true",
    onDemandGenerationEnabled: "false",
    generatedPracticeRuntimeEnabled: "false",
    generatedPracticeMode: "OFF",
    grade2NumbersTo1000Enabled: "false",
    adaptivePracticeRuntimeEnabled: "false",
    controlledPilotEnabled: "false",
    retentionRuntimeEnabled: "false",
    adaptivePilotUserIds: "",
  });
}

export function serializeProject004RemoteRuntimeConfig(
  config: Project004RemoteRuntimeConfig,
) {
  assertProject004RemoteRuntimeConfig(config);
  return [
    `PLAVE_PROJECT004_REMOTE_RUNTIME_MODE=${config.runtimeMode}`,
    `PLAVE_PROJECT004_REMOTE_TARGET_NAME=${config.targetName}`,
    `PLAVE_PROJECT004_REMOTE_PROJECT_REF=${config.projectRef}`,
    `NEXT_PUBLIC_SUPABASE_URL=${config.publicUrl}`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${config.publishableKey}`,
    `PLAVE_CURRICULUM_RUNTIME_ENABLED=${config.curriculumRuntimeEnabled}`,
    `PLAVE_ON_DEMAND_GENERATION_ENABLED=${config.onDemandGenerationEnabled}`,
    `PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED=${config.generatedPracticeRuntimeEnabled}`,
    `PLAVE_GENERATED_PRACTICE_MODE=${config.generatedPracticeMode}`,
    `PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED=${config.grade2NumbersTo1000Enabled}`,
    `PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED=${config.adaptivePracticeRuntimeEnabled}`,
    `PLAVE_CONTROLLED_PILOT_ENABLED=${config.controlledPilotEnabled}`,
    `PLAVE_RETENTION_RUNTIME_ENABLED=${config.retentionRuntimeEnabled}`,
    `PLAVE_ADAPTIVE_PILOT_USER_IDS=${config.adaptivePilotUserIds}`,
    "",
  ].join("\n");
}

export function parseProject004RemoteRuntimeConfig(
  source: string,
) {
  const values = parseEnvironmentFile(source);
  const actualKeys = [...values.keys()].sort();
  const expectedKeys = [...requiredEnvironmentKeys].sort();
  const expectedKeySet = new Set<string>(expectedKeys);
  const safelyOptionalGeneratedKeys = new Set([
    "PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED",
    "PLAVE_GENERATED_PRACTICE_MODE",
  ]);
  const requiredKeys = expectedKeys.filter(
    (key) => !safelyOptionalGeneratedKeys.has(key),
  );
  if (
    actualKeys.some((key) => !expectedKeySet.has(key)) ||
    requiredKeys.some((key) => !values.has(key)) ||
    actualKeys.some((key) => forbiddenEnvironmentKeys.has(key))
  ) {
    fail("REMOTE_RUNTIME_ENV_KEY_SET_INVALID");
  }
  return assertProject004RemoteRuntimeConfig({
    runtimeMode:
      values.get("PLAVE_PROJECT004_REMOTE_RUNTIME_MODE") ?? "",
    targetName:
      values.get("PLAVE_PROJECT004_REMOTE_TARGET_NAME") ?? "",
    projectRef:
      values.get("PLAVE_PROJECT004_REMOTE_PROJECT_REF") ?? "",
    publicUrl:
      values.get("NEXT_PUBLIC_SUPABASE_URL") ?? "",
    publishableKey:
      values.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ??
      "",
    curriculumRuntimeEnabled:
      values.get("PLAVE_CURRICULUM_RUNTIME_ENABLED") ?? "",
    onDemandGenerationEnabled:
      values.get("PLAVE_ON_DEMAND_GENERATION_ENABLED") ?? "",
    generatedPracticeRuntimeEnabled:
      values.get("PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED") ??
      "false",
    generatedPracticeMode:
      values.get("PLAVE_GENERATED_PRACTICE_MODE") ?? "OFF",
    grade2NumbersTo1000Enabled:
      values.get("PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED") ?? "",
    adaptivePracticeRuntimeEnabled:
      values.get("PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED") ??
      "",
    controlledPilotEnabled:
      values.get("PLAVE_CONTROLLED_PILOT_ENABLED") ?? "",
    retentionRuntimeEnabled:
      values.get("PLAVE_RETENTION_RUNTIME_ENABLED") ?? "",
    adaptivePilotUserIds:
      values.get("PLAVE_ADAPTIVE_PILOT_USER_IDS") ?? "",
  });
}

export function writeProject004RemoteRuntimeConfigFile(
  config: Project004RemoteRuntimeConfig,
  candidateRoot = process.cwd(),
) {
  const root = assertProject004Workspace(candidateRoot);
  const destination = resolve(
    root,
    project004RemoteRuntimeContract.environmentFile,
  );
  if (existsSync(destination) && lstatSync(destination).isSymbolicLink()) {
    fail("REMOTE_RUNTIME_ENV_SYMLINK_REJECTED");
  }
  const temporary = `${destination}.pending-${process.pid}`;
  try {
    writeFileSync(
      temporary,
      serializeProject004RemoteRuntimeConfig(config),
      { encoding: "utf8", mode: 0o600, flag: "wx" },
    );
    chmodSync(temporary, 0o600);
    renameSync(temporary, destination);
    chmodSync(destination, 0o600);
  } finally {
    if (existsSync(temporary)) rmSync(temporary);
  }
  return destination;
}

export function setProject004RemoteRuntimeUniversalFlag(
  enabled: boolean,
  candidateRoot = process.cwd(),
) {
  const config =
    loadProject004RemoteRuntimeConfigFile(candidateRoot);
  return writeProject004RemoteRuntimeConfigFile(
    assertProject004RemoteRuntimeConfig({
      ...config,
      curriculumRuntimeEnabled: enabled ? "true" : "false",
    }),
    candidateRoot,
  );
}

export function loadProject004RemoteRuntimeConfigFile(
  candidateRoot = process.cwd(),
) {
  const root = assertProject004Workspace(candidateRoot);
  const path = resolve(
    root,
    project004RemoteRuntimeContract.environmentFile,
  );
  if (!existsSync(path)) fail("REMOTE_RUNTIME_ENV_FILE_MISSING");
  const stat = lstatSync(path);
  const processUid =
    typeof process.getuid === "function" ? process.getuid() : null;
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    (stat.mode & 0o777) !== 0o600 ||
    (processUid !== null && stat.uid !== processUid)
  ) {
    fail("REMOTE_RUNTIME_ENV_FILE_PERMISSION_INVALID");
  }
  return parseProject004RemoteRuntimeConfig(
    readFileSync(path, "utf8"),
  );
}

export function buildProject004RemoteRuntimeChildEnvironment(
  config: Project004RemoteRuntimeConfig,
  environment: Readonly<Record<string, string | undefined>> =
    process.env,
) {
  assertProject004RemoteRuntimeConfig(config);
  const child: NodeJS.ProcessEnv = {
    NODE_ENV: "development",
  };
  for (const [key, value] of Object.entries(environment)) {
    if (value !== undefined && inheritedEnvironmentAllowlist.has(key)) {
      child[key] = value;
    }
  }
  for (const key of childEnvironmentKeysPinnedEmpty) {
    child[key] = "";
  }
  child.NEXT_TELEMETRY_DISABLED = "1";
  child.__NEXT_PROCESSED_ENV = "true";
  child.PLAVE_PROJECT004_REMOTE_RUNTIME_MODE =
    project004RemoteRuntimeContract.runtimeMode;
  child.PLAVE_PROJECT004_REMOTE_TARGET_NAME =
    project004RemoteRuntimeContract.targetName;
  child.NEXT_PUBLIC_SUPABASE_URL = config.publicUrl;
  child.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
    config.publishableKey;
  child.PLAVE_CURRICULUM_RUNTIME_ENABLED =
    config.curriculumRuntimeEnabled;
  child.PLAVE_ON_DEMAND_GENERATION_ENABLED = "false";
  child.PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED = "false";
  child.PLAVE_GENERATED_PRACTICE_MODE = "OFF";
  child.PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED = "false";
  child.PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED = "false";
  child.PLAVE_CONTROLLED_PILOT_ENABLED = "false";
  child.PLAVE_RETENTION_RUNTIME_ENABLED = "false";
  child.PLAVE_ADAPTIVE_PILOT_USER_IDS = "";
  return child;
}

export function renderProject004RemoteRuntimeContractSmoke() {
  const sampleRef = "abcdefghijklmnopqrst";
  const config = createProject004RemoteRuntimeConfig({
    projectRef: sampleRef,
    publicUrl: `https://${sampleRef}.supabase.co`,
    publishableKey: `sb_publishable_${"x".repeat(24)}`,
  });
  const parsed = parseProject004RemoteRuntimeConfig(
    serializeProject004RemoteRuntimeConfig(config),
  );
  const child = buildProject004RemoteRuntimeChildEnvironment(
    parsed,
    {
      PATH: process.env.PATH,
      DATABASE_URL: "must-not-pass",
      SUPABASE_SERVICE_ROLE_KEY: "must-not-pass",
      PLAVE_LOCAL_DATABASE_URL: "must-not-pass",
    },
  );
  const pass =
    parsed.targetName ===
      project004RemoteRuntimeContract.targetName &&
    child.DATABASE_URL === "" &&
    child.SUPABASE_SERVICE_ROLE_KEY === "" &&
    child.PLAVE_LOCAL_DATABASE_URL === "" &&
    child.PLAVE_CURRICULUM_RUNTIME_ENABLED === "true" &&
    child.PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED === "false" &&
    child.PLAVE_GENERATED_PRACTICE_MODE === "OFF" &&
    child.PLAVE_ADAPTIVE_PILOT_USER_IDS === "";
  return [
    `REMOTE_RUNTIME_CONFIG_CONTRACT=${pass ? "PASS" : "FAIL"}`,
    `REMOTE_RUNTIME_TARGET_GUARD=${pass ? "PASS" : "FAIL"}`,
    `REMOTE_RUNTIME_SECRET_BOUNDARY=${pass ? "PASS" : "FAIL"}`,
    "REMOTE_ACCESS_PERFORMED=NO",
    "REMOTE_MUTATION_PERFORMED=NO",
    "",
  ].join("\n");
}
