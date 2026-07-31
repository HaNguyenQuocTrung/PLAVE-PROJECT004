import { existsSync, lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  GENERATED_PRACTICE_PILOT_LOOPBACK_HOST,
  GENERATED_PRACTICE_PILOT_TARGET,
  parseGeneratedPracticePilotAllowlist,
} from "../lib/curriculum/generated-practice-pilot.ts";
import { assertProject004Workspace } from "./project004-identity.ts";
import {
  buildProject004RemoteRuntimeChildEnvironment,
  loadProject004RemoteRuntimeConfigFile,
} from "./project004-remote-runtime-connection.ts";

export const project004GeneratedPilotRuntimeContract = {
  targetName: GENERATED_PRACTICE_PILOT_TARGET,
  host: GENERATED_PRACTICE_PILOT_LOOPBACK_HOST,
  port: 3002,
  cacheDirectory: ".next-generated-pilot-project004",
  allowlistFile: ".env.generated-pilot.local",
  allowlistKey: "PLAVE_GENERATED_PRACTICE_PILOT_USER_IDS",
  mode: "PILOT_LIVE",
} as const;

export class Project004GeneratedPilotFailure extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

function fail(code: string): never {
  throw new Project004GeneratedPilotFailure(code);
}

export function parseGeneratedPilotEnvironmentFile(source: string) {
  const lines = source
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));
  if (lines.length !== 1) fail("GENERATED_PILOT_ALLOWLIST_FILE_INVALID");
  const separator = lines[0]?.indexOf("=") ?? -1;
  if (separator <= 0) fail("GENERATED_PILOT_ALLOWLIST_FILE_INVALID");
  const key = lines[0]?.slice(0, separator) ?? "";
  const value = lines[0]?.slice(separator + 1) ?? "";
  if (
    key !== project004GeneratedPilotRuntimeContract.allowlistKey ||
    /[\r\n\0]/u.test(value)
  ) {
    fail("GENERATED_PILOT_ALLOWLIST_FILE_INVALID");
  }
  const allowlist = parseGeneratedPracticePilotAllowlist(value);
  if (!allowlist.valid) fail("GENERATED_PILOT_ALLOWLIST_INVALID");
  if (allowlist.count !== 1) fail("GENERATED_PILOT_ALLOWLIST_COUNT_INVALID");
  return { raw: value.trim().toLowerCase(), count: allowlist.count };
}

export function loadGeneratedPilotAllowlistFile(candidateRoot = process.cwd()) {
  const root = assertProject004Workspace(candidateRoot);
  const path = resolve(
    root,
    project004GeneratedPilotRuntimeContract.allowlistFile,
  );
  if (!existsSync(path)) fail("GENERATED_PILOT_ALLOWLIST_FILE_MISSING");
  const stat = lstatSync(path);
  const processUid = typeof process.getuid === "function" ? process.getuid() : null;
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    (stat.mode & 0o777) !== 0o600 ||
    (processUid !== null && stat.uid !== processUid)
  ) {
    fail("GENERATED_PILOT_ALLOWLIST_FILE_PERMISSION_INVALID");
  }
  return parseGeneratedPilotEnvironmentFile(readFileSync(path, "utf8"));
}

export function buildGeneratedPilotChildEnvironment(input: Readonly<{
  candidateRoot?: string;
  allowlist: string;
  signingKey: string;
  session: string;
  environment?: Readonly<Record<string, string | undefined>>;
}>) {
  if (!/^[0-9a-f]{64}$/u.test(input.signingKey)) {
    fail("GENERATED_PILOT_SIGNING_KEY_INVALID");
  }
  if (!/^[0-9a-f]{64}$/u.test(input.session)) {
    fail("GENERATED_PILOT_SESSION_INVALID");
  }
  const parsedAllowlist = parseGeneratedPracticePilotAllowlist(input.allowlist);
  if (!parsedAllowlist.valid || parsedAllowlist.count !== 1) {
    fail("GENERATED_PILOT_ALLOWLIST_COUNT_INVALID");
  }
  const runtime = loadProject004RemoteRuntimeConfigFile(input.candidateRoot);
  const child = buildProject004RemoteRuntimeChildEnvironment(
    runtime,
    input.environment,
  );
  child.PLAVE_ON_DEMAND_GENERATION_ENABLED = "true";
  child.PLAVE_ON_DEMAND_GENERATION_SIGNING_KEY = input.signingKey;
  child.PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED = "true";
  child.PLAVE_GENERATED_PRACTICE_MODE = "PILOT_LIVE";
  child.PLAVE_GENERATED_PRACTICE_PILOT_USER_IDS = input.allowlist;
  child.PLAVE_GENERATED_PRACTICE_BIND_HOST =
    project004GeneratedPilotRuntimeContract.host;
  child.PLAVE_GENERATED_PRACTICE_PILOT_OWNER_STARTED = "true";
  child.PLAVE_GENERATED_PRACTICE_PILOT_SESSION = input.session;
  child.PLAVE_PROJECT004_GENERATED_PILOT_RUNTIME = "true";
  child.PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED = "false";
  child.PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED = "false";
  child.PLAVE_CONTROLLED_PILOT_ENABLED = "false";
  child.PLAVE_RETENTION_RUNTIME_ENABLED = "false";
  child.PLAVE_ADAPTIVE_PILOT_USER_IDS = "";
  return child;
}
