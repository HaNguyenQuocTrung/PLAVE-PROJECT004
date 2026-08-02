import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  lstatSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";

export const AI_TUTOR_CONFIG_LOCK_NAME = ".ai-tutor-config.lock";
export const AI_TUTOR_CONFIG_LOCK_VERSION = 1;

type LockOwner = Readonly<{
  version: 1;
  pid: number;
  ppid: number;
  nonce: string;
  startedAt: string;
  workspace: "PLAVE-PROJECT004";
}>;

export class AiTutorConfigurationLockError extends Error {
  readonly code:
    | "AI_TUTOR_CONFIGURATION_LOCKED"
    | "AI_TUTOR_CONFIGURATION_LOCK_METADATA_INVALID";
  readonly ownerPid: number | null;

  constructor(
    code:
      | "AI_TUTOR_CONFIGURATION_LOCKED"
      | "AI_TUTOR_CONFIGURATION_LOCK_METADATA_INVALID",
    ownerPid: number | null,
  ) {
    super(code);
    this.name = "AiTutorConfigurationLockError";
    this.code = code;
    this.ownerPid = ownerPid;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseLockOwner(content: string): LockOwner | null {
  try {
    const value: unknown = JSON.parse(content);
    if (
      !isRecord(value) ||
      value.version !== AI_TUTOR_CONFIG_LOCK_VERSION ||
      !Number.isSafeInteger(value.pid) ||
      Number(value.pid) <= 0 ||
      !Number.isSafeInteger(value.ppid) ||
      Number(value.ppid) < 0 ||
      typeof value.nonce !== "string" ||
      !/^[a-f0-9-]{20,80}$/u.test(value.nonce) ||
      typeof value.startedAt !== "string" ||
      Number.isNaN(Date.parse(value.startedAt)) ||
      value.workspace !== "PLAVE-PROJECT004"
    ) {
      return null;
    }
    return value as LockOwner;
  } catch {
    return null;
  }
}

export function isProcessAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !(
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ESRCH"
    );
  }
}

function sameFile(
  first: Readonly<{ dev: number; ino: number }>,
  second: Readonly<{ dev: number; ino: number }>,
) {
  return first.dev === second.dev && first.ino === second.ino;
}

function createOwnerCandidate(lockPath: string, owner: LockOwner) {
  const candidate = resolve(
    dirname(lockPath),
    `.ai-tutor-config.owner-${owner.pid}-${owner.nonce}.tmp`,
  );
  let descriptor: number | null = null;
  try {
    descriptor = openSync(candidate, "wx", 0o600);
    writeFileSync(descriptor, `${JSON.stringify(owner)}\n`, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = null;
    return candidate;
  } catch (error) {
    if (descriptor !== null) closeSync(descriptor);
    if (existsSync(candidate)) unlinkSync(candidate);
    throw error;
  }
}

function tryCreateLock(lockPath: string, owner: LockOwner) {
  const candidate = createOwnerCandidate(lockPath, owner);
  try {
    linkSync(candidate, lockPath);
    chmodSync(lockPath, 0o600);
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "EEXIST"
    ) {
      return false;
    }
    throw error;
  } finally {
    if (existsSync(candidate)) unlinkSync(candidate);
  }
}

export type ConfigurationLock = Readonly<{
  lockPath: string;
  ownerPid: number;
  recoveredStaleOwnerPid: number | null;
  release(): void;
}>;

export function acquireConfigurationLock(input: Readonly<{
  lockPath: string;
  pid?: number;
  ppid?: number;
  now?: Date;
  processAlive?: (pid: number) => boolean;
}>): ConfigurationLock {
  const owner: LockOwner = {
    version: AI_TUTOR_CONFIG_LOCK_VERSION,
    pid: input.pid ?? process.pid,
    ppid: input.ppid ?? process.ppid,
    nonce: randomUUID(),
    startedAt: (input.now ?? new Date()).toISOString(),
    workspace: "PLAVE-PROJECT004",
  };
  const processAlive = input.processAlive ?? isProcessAlive;
  let recoveredStaleOwnerPid: number | null = null;

  if (!tryCreateLock(input.lockPath, owner)) {
    const before = lstatSync(input.lockPath);
    const content = readFileSync(input.lockPath, "utf8");
    const currentOwner = parseLockOwner(content);
    if (!currentOwner) {
      throw new AiTutorConfigurationLockError(
        "AI_TUTOR_CONFIGURATION_LOCK_METADATA_INVALID",
        null,
      );
    }
    if (processAlive(currentOwner.pid)) {
      throw new AiTutorConfigurationLockError(
        "AI_TUTOR_CONFIGURATION_LOCKED",
        currentOwner.pid,
      );
    }
    const after = lstatSync(input.lockPath);
    if (
      !sameFile(before, after) ||
      readFileSync(input.lockPath, "utf8") !== content
    ) {
      throw new AiTutorConfigurationLockError(
        "AI_TUTOR_CONFIGURATION_LOCKED",
        currentOwner.pid,
      );
    }
    unlinkSync(input.lockPath);
    recoveredStaleOwnerPid = currentOwner.pid;
    if (!tryCreateLock(input.lockPath, owner)) {
      throw new AiTutorConfigurationLockError(
        "AI_TUTOR_CONFIGURATION_LOCKED",
        null,
      );
    }
  }

  let released = false;
  return {
    lockPath: input.lockPath,
    ownerPid: owner.pid,
    recoveredStaleOwnerPid,
    release() {
      if (released) return;
      released = true;
      if (!existsSync(input.lockPath)) return;
      const currentOwner = parseLockOwner(readFileSync(input.lockPath, "utf8"));
      if (currentOwner?.pid === owner.pid && currentOwner.nonce === owner.nonce) {
        unlinkSync(input.lockPath);
      }
    },
  };
}

export function mergeEnvironmentValues(
  content: string,
  values: Array<readonly [string, string]>,
) {
  const replacements = new Map(values);
  const configuredKeys = new Set(replacements.keys());
  const seen = new Set<string>();
  const lines = content ? content.replace(/\n$/u, "").split("\n") : [];
  const nextLines: string[] = [];
  for (const line of lines) {
    const key = line.match(/^([A-Z][A-Z0-9_]*)=/u)?.[1];
    if (!key || !configuredKeys.has(key)) {
      nextLines.push(line);
      continue;
    }
    if (seen.has(key)) continue;
    nextLines.push(`${key}=${replacements.get(key)}`);
    seen.add(key);
  }
  for (const [key, value] of values) {
    if (!seen.has(key)) nextLines.push(`${key}=${value}`);
  }
  return `${nextLines.join("\n")}\n`;
}

export function writeEnvironmentAtomically(target: string, content: string) {
  const temporaryPath = resolve(
    dirname(target),
    `.env.local.ai-tutor-${process.pid}-${randomUUID()}.tmp`,
  );
  let descriptor: number | null = null;
  try {
    descriptor = openSync(temporaryPath, "wx", 0o600);
    writeFileSync(descriptor, content, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = null;
    renameSync(temporaryPath, target);
    chmodSync(target, 0o600);
  } catch (error) {
    if (descriptor !== null) closeSync(descriptor);
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
    throw error;
  }
}
