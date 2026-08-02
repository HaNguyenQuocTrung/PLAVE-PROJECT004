import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, lstatSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  AiTutorLocalRuntimeFailure,
  assertAiTutorLocalPortAvailable,
  inspectAiTutorLocalPort,
  waitForAiTutorLocalChild,
} from "./start-ai-tutor-local.ts";
import { assertProject004Workspace } from "./project004-identity.ts";
import {
  buildProject004RemoteRuntimeChildEnvironment,
  loadProject004RemoteRuntimeConfigFile,
  Project004RemoteRuntimeFailure,
} from "./project004-remote-runtime-connection.ts";

export const generatorV2OwnerReviewRuntimeContract = {
  host: "127.0.0.1",
  port: 3033,
  path: "/internal/generator-v2-owner-review",
  cacheDirectory: ".next-generator-v2-owner-review",
  manifest: "artifacts/generator-v2-owner-review/manifest.json",
} as const;

type ManifestSample = Readonly<{
  sampleId: string;
  capabilityId: string;
  grade: number;
  domain: string;
  difficulty: string;
  interactionType: string;
  publicSnapshot: unknown;
}>;

type OwnerReviewManifest = Readonly<{
  sampleCount: number;
  canonicalCapabilities: number;
  privateSolutionIncluded: boolean;
  ownerDecision: unknown;
  samples: readonly ManifestSample[];
}>;

export class GeneratorV2OwnerReviewRuntimeFailure extends Error {
  readonly code: string;
  readonly listeners: readonly {
    pid: number;
    command: string;
    endpoint: string;
  }[];

  constructor(
    code: string,
    listeners: readonly {
      pid: number;
      command: string;
      endpoint: string;
    }[] = [],
  ) {
    super(code);
    this.code = code;
    this.listeners = listeners;
  }
}

function fail(code: string): never {
  throw new GeneratorV2OwnerReviewRuntimeFailure(code);
}

function containsForbiddenPublicField(value: unknown): string | null {
  const forbidden = new Set([
    "acceptedResponses",
    "answerKey",
    "correctAnswer",
    "correctResponse",
    "normalizedModelHash",
    "privateSolution",
    "rawSeed",
    "solverOutput",
    "solverReceipt",
    "solverReceiptHash",
    "solution",
    "validation",
  ]);
  const walk = (candidate: unknown): string | null => {
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        const found = walk(item);
        if (found) return found;
      }
      return null;
    }
    if (!candidate || typeof candidate !== "object") return null;
    for (const [key, nested] of Object.entries(candidate)) {
      if (forbidden.has(key)) return key;
      const found = walk(nested);
      if (found) return found;
    }
    return null;
  };
  return walk(value);
}

export function validateGeneratorV2OwnerReviewManifest(
  candidateRoot = process.cwd(),
) {
  const root = assertProject004Workspace(candidateRoot);
  const path = resolve(root, generatorV2OwnerReviewRuntimeContract.manifest);
  if (!existsSync(path) || lstatSync(path).isSymbolicLink()) {
    fail("GENERATOR_V2_OWNER_REVIEW_MANIFEST_MISSING");
  }
  let manifest: OwnerReviewManifest;
  try {
    manifest = JSON.parse(readFileSync(path, "utf8")) as OwnerReviewManifest;
  } catch {
    fail("GENERATOR_V2_OWNER_REVIEW_MANIFEST_JSON_INVALID");
  }
  const samples = manifest.samples ?? [];
  const capabilities = new Set(samples.map((sample) => sample.capabilityId));
  const sampleIds = new Set(samples.map((sample) => sample.sampleId));
  const grades = new Set(samples.map((sample) => sample.grade));
  const domains = new Set(samples.map((sample) => sample.domain));
  const difficulties = new Set(samples.map((sample) => sample.difficulty));
  const interactions = new Set(samples.map((sample) => sample.interactionType));
  const forbidden = containsForbiddenPublicField(
    samples.map((sample) => sample.publicSnapshot),
  );
  if (
    manifest.sampleCount !== 198 ||
    samples.length !== 198 ||
    manifest.canonicalCapabilities !== 198 ||
    capabilities.size !== 198 ||
    sampleIds.size !== 198 ||
    grades.size !== 9 ||
    ![1,2,3,4,5,6,7,8,9].every((grade) => grades.has(grade)) ||
    domains.size !== 5 ||
    difficulties.size !== 3 ||
    !["EASY", "MEDIUM", "HARD"].every((difficulty) => difficulties.has(difficulty)) ||
    interactions.size !== 10 ||
    manifest.privateSolutionIncluded !== false ||
    manifest.ownerDecision !== null ||
    forbidden
  ) {
    fail(
      forbidden
        ? `GENERATOR_V2_OWNER_REVIEW_PRIVATE_FIELD_REJECTED_${forbidden}`
        : "GENERATOR_V2_OWNER_REVIEW_MANIFEST_CONTRACT_INVALID",
    );
  }
  return {
    samples: samples.length,
    capabilities: capabilities.size,
    grades: grades.size,
    domains: domains.size,
    difficulties: difficulties.size,
    interactions: interactions.size,
  };
}

export function buildGeneratorV2OwnerReviewChildEnvironment(
  candidateRoot = process.cwd(),
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  const root = assertProject004Workspace(candidateRoot);
  const remoteConfig = loadProject004RemoteRuntimeConfigFile(root);
  const child = buildProject004RemoteRuntimeChildEnvironment(
    remoteConfig,
    environment,
  );
  child.PLAVE_GENERATOR_V2_OWNER_REVIEW = "true";
  child.PLAVE_AI_TUTOR_ENABLED = "false";
  child.PLAVE_AI_PROVIDER = "";
  child.GOOGLE_API_KEY = "";
  child.GEMINI_API_KEY = "";
  child.OPENAI_API_KEY = "";
  return child;
}

function cleanupCache(root: string) {
  const path = resolve(
    root,
    generatorV2OwnerReviewRuntimeContract.cacheDirectory,
  );
  if (!existsSync(path)) return;
  if (lstatSync(path).isSymbolicLink()) {
    fail("GENERATOR_V2_OWNER_REVIEW_CACHE_SYMLINK_REJECTED");
  }
  rmSync(path, { recursive: true, force: true });
}

export async function startGeneratorV2OwnerReview(options?: {
  candidateRoot?: string;
  environment?: Readonly<Record<string, string | undefined>>;
  inspectPort?: typeof inspectAiTutorLocalPort;
  probePort?: (host: string, port: number) => Promise<void>;
  spawnChild?: typeof spawn;
  signalSource?: NodeJS.Process;
  terminationGraceMs?: number;
  onPrepared?: (input: Readonly<{ url: string }>) => void;
}) {
  const root = assertProject004Workspace(
    options?.candidateRoot ?? process.cwd(),
  );
  validateGeneratorV2OwnerReviewManifest(root);
  const childEnvironment = buildGeneratorV2OwnerReviewChildEnvironment(
    root,
    options?.environment ?? process.env,
  );
  try {
    await assertAiTutorLocalPortAvailable(
      generatorV2OwnerReviewRuntimeContract.host,
      generatorV2OwnerReviewRuntimeContract.port,
      options?.inspectPort ?? inspectAiTutorLocalPort,
      options?.probePort,
    );
  } catch (error) {
    if (error instanceof AiTutorLocalRuntimeFailure) {
      throw new GeneratorV2OwnerReviewRuntimeFailure(
        error.code.replace("AI_TUTOR_LOCAL", "GENERATOR_V2_OWNER_REVIEW"),
        error.listeners,
      );
    }
    throw error;
  }
  cleanupCache(root);
  const nextBin = resolve(root, "node_modules/next/dist/bin/next");
  if (!existsSync(nextBin)) fail("GENERATOR_V2_OWNER_REVIEW_NEXT_BINARY_MISSING");
  const url = `http://${generatorV2OwnerReviewRuntimeContract.host}:${generatorV2OwnerReviewRuntimeContract.port}${generatorV2OwnerReviewRuntimeContract.path}`;
  options?.onPrepared?.({ url });
  const child: ChildProcess = (options?.spawnChild ?? spawn)(
    process.execPath,
    [
      nextBin,
      "dev",
      "--hostname",
      generatorV2OwnerReviewRuntimeContract.host,
      "--port",
      String(generatorV2OwnerReviewRuntimeContract.port),
    ],
    {
      cwd: root,
      env: childEnvironment,
      stdio: "inherit",
      detached: process.platform !== "win32",
    },
  );
  try {
    return await waitForAiTutorLocalChild(child, {
      signalSource: options?.signalSource,
      terminationGraceMs: options?.terminationGraceMs,
    });
  } finally {
    cleanupCache(root);
  }
}

function sanitized(value: string) {
  return value.replace(/[^A-Za-z0-9 ._:/()[\]-]/gu, "?").slice(0, 240);
}

function renderFailure(error: unknown) {
  const runtime = error instanceof GeneratorV2OwnerReviewRuntimeFailure
    ? error
    : null;
  const remote = error instanceof Project004RemoteRuntimeFailure
    ? error
    : null;
  const lines = ["GENERATOR_V2_OWNER_REVIEW_START=FAIL"];
  for (const listener of runtime?.listeners ?? []) {
    lines.push(
      `GENERATOR_V2_OWNER_REVIEW_PORT_OCCUPIED_PID=${String(listener.pid)}`,
      `GENERATOR_V2_OWNER_REVIEW_PORT_OCCUPIED_COMMAND=${sanitized(listener.command)}`,
      `GENERATOR_V2_OWNER_REVIEW_PORT_OCCUPIED_LISTENER=${sanitized(listener.endpoint)}`,
    );
  }
  lines.push(
    `ROOT_FAILURE_CODE=${runtime?.code ?? remote?.code ?? "GENERATOR_V2_OWNER_REVIEW_START_FAILED"}`,
    "",
  );
  return lines.join("\n");
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  try {
    process.exitCode = await startGeneratorV2OwnerReview({
      onPrepared: ({ url }) => {
        process.stdout.write([
          "GENERATOR_V2_OWNER_REVIEW_TARGET_GUARD=PASS",
          "GENERATOR_V2_OWNER_REVIEW_LOOPBACK_ONLY=PASS",
          "GENERATOR_V2_OWNER_REVIEW_SUPABASE_PUBLIC_CONFIG=PASS",
          "GENERATOR_V2_OWNER_REVIEW_PRIVATE_FIELDS=0",
          "GENERATOR_V2_OWNER_REVIEW_SAMPLES=198",
          "GENERATOR_V2_OWNER_REVIEW_CAPABILITIES=198",
          `GENERATOR_V2_OWNER_REVIEW_URL=${url}`,
          "GENERATOR_V2_OWNER_REVIEW_START=READY",
          "",
        ].join("\n"));
      },
    });
  } catch (error) {
    process.stdout.write(renderFailure(error));
    process.exitCode = 1;
  }
}
