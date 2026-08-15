import { spawn, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { resolve } from "node:path";

import { assertProject004Workspace } from "./project004-identity.ts";
import {
  AiTutorLocalRuntimeFailure,
  resolveAiTutorServerRuntimeConfiguration,
} from "./start-ai-tutor-local.ts";
import {
  assertProductionLocalBuildBinding,
  writeProductionLocalBuildBinding,
} from "./production-local-build-binding.ts";
import {
  loadProject004RemoteRuntimeConfigFile,
  Project004RemoteRuntimeFailure,
} from "./project004-remote-runtime-connection.ts";
import { productionLocalBuildContract } from "./production-local-build-contract.ts";
import { createProductionLocalTemporaryRoot } from "./production-local-temporary-root.ts";

type PublicRuntime = Readonly<{
  url: string;
  publishableKey: string;
  source: "EXPLICIT_ENVIRONMENT" | "VALIDATED_RUNTIME_FILE";
  flags: Readonly<Record<string, string>>;
}>;

function resolvePublicRuntime(root: string): PublicRuntime {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const authFailureTestMode = process.env.PLAVE_AUTH_FAILURE_TEST_MODE;
  if (Boolean(url) !== Boolean(publishableKey)) {
    throw new Error("PRODUCTION_LOCAL_SUPABASE_PUBLIC_ENV_PARTIAL");
  }
  if (authFailureTestMode && (!url || !publishableKey)) {
    throw new Error("PRODUCTION_LOCAL_AUTH_TEST_MODE_TARGET_INVALID");
  }
  if (url && publishableKey) {
    const loopback = new URL(url);
    const testModeEnabled = authFailureTestMode === "UNREACHABLE";
    if (
      authFailureTestMode &&
      (!testModeEnabled ||
        loopback.protocol !== "http:" ||
        !["127.0.0.1", "localhost", "::1"].includes(loopback.hostname) ||
        publishableKey !== "synthetic-public-key")
    ) {
      throw new Error("PRODUCTION_LOCAL_AUTH_TEST_MODE_TARGET_INVALID");
    }
    return {
      url,
      publishableKey,
      source: "EXPLICIT_ENVIRONMENT",
      flags: testModeEnabled
        ? { PLAVE_AUTH_FAILURE_TEST_MODE: "UNREACHABLE" }
        : {},
    };
  }

  const config = loadProject004RemoteRuntimeConfigFile(root);
  return {
    url: config.publicUrl,
    publishableKey: config.publishableKey,
    source: "VALIDATED_RUNTIME_FILE",
    flags: {
      PLAVE_PROJECT004_REMOTE_RUNTIME_MODE: config.runtimeMode,
      PLAVE_PROJECT004_REMOTE_TARGET_NAME: config.targetName,
      PLAVE_CURRICULUM_RUNTIME_ENABLED: config.curriculumRuntimeEnabled,
      PLAVE_ON_DEMAND_GENERATION_ENABLED: "false",
      PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED: "false",
      PLAVE_GENERATED_PRACTICE_MODE: "OFF",
      PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED: "false",
      PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED: "false",
      PLAVE_CONTROLLED_PILOT_ENABLED: "false",
      PLAVE_RETENTION_RUNTIME_ENABLED: "false",
      PLAVE_ADAPTIVE_PILOT_USER_IDS: "",
    },
  };
}

const root = assertProject004Workspace();
const nextBin = resolve(root, "node_modules/next/dist/bin/next");
const buildMode = process.argv[2] === "--build";
const applicationMode = "FULL_APPLICATION_AI_RUNTIME_REQUIRED" as const;
const distDirectory = productionLocalBuildContract.distDirectory;
if (!existsSync(nextBin)) {
  throw new Error("PRODUCTION_LOCAL_NEXT_BINARY_MISSING");
}

let runtime: PublicRuntime;
try {
  runtime = resolvePublicRuntime(root);
} catch (error) {
  const code =
    error instanceof Project004RemoteRuntimeFailure
      ? error.code
      : error instanceof Error
        ? error.message
        : "PRODUCTION_LOCAL_ENV_RESOLUTION_FAILED";
  process.stderr.write(`PRODUCTION_LOCAL_START=FAIL\nROOT_FAILURE_CODE=${code}\n`);
  process.exit(1);
}

let tutorConfig: ReturnType<typeof resolveAiTutorServerRuntimeConfiguration> | null = null;
if (!buildMode) {
  try {
    tutorConfig = resolveAiTutorServerRuntimeConfiguration(root, process.env);
  } catch (error) {
    const code =
      error instanceof AiTutorLocalRuntimeFailure
        ? error.code
        : "PRODUCTION_LOCAL_AI_TUTOR_CONFIGURATION_INVALID";
    process.stderr.write(
      `PRODUCTION_LOCAL_START=FAIL\nROOT_FAILURE_CODE=${code}\n`,
    );
    process.exit(1);
  }
  const buildRoot = resolve(root, distDirectory);
  const buildId = resolve(buildRoot, "BUILD_ID");
  if (!existsSync(buildId)) {
    process.stderr.write(
      "PRODUCTION_LOCAL_START=FAIL\n" +
        "ROOT_FAILURE_CODE=PRODUCTION_LOCAL_BUILD_MISSING\n" +
        "REQUIRED_COMMAND=npm run build:production-local\n",
    );
    process.exit(1);
  }
  try {
    assertProductionLocalBuildBinding(
      buildRoot,
      runtime.source,
      applicationMode,
    );
  } catch {
    process.stderr.write(
      "PRODUCTION_LOCAL_START=FAIL\n" +
        "ROOT_FAILURE_CODE=PRODUCTION_LOCAL_BUILD_RUNTIME_BINDING_INVALID\n" +
        "REQUIRED_COMMAND=npm run build:production-local\n",
    );
    process.exit(1);
  }
}

const temporaryRoot = createProductionLocalTemporaryRoot();
const temporaryHome = resolve(temporaryRoot, "home");
const temporaryTmp = resolve(temporaryRoot, "tmp");
const runtimeRoot = resolve(temporaryRoot, "PLAVE-PROJECT004");
mkdirSync(temporaryHome, { recursive: true, mode: 0o700 });
mkdirSync(temporaryTmp, { recursive: true, mode: 0o700 });
mkdirSync(runtimeRoot, { recursive: true, mode: 0o700 });

const childEnvironment = {
  HOME: temporaryHome,
  PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
  TMPDIR: temporaryTmp,
  LANG: "C.UTF-8",
  LC_ALL: "C.UTF-8",
  npm_config_offline: "true",
  __NEXT_PROCESSED_ENV: "true",
  ...runtime.flags,
  [productionLocalBuildContract.environmentFlag]: "true",
  NODE_ENV: "production",
  NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PUBLIC_SUPABASE_URL: runtime.url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: runtime.publishableKey,
  PLAVE_AI_TUTOR_ENABLED: tutorConfig?.enabled ?? "false",
  PLAVE_AI_PROVIDER: tutorConfig?.provider ?? "",
  GOOGLE_API_KEY: tutorConfig?.apiKey ?? "",
  GOOGLE_AI_MODEL: tutorConfig?.model ?? "",
  GEMINI_API_KEY: "",
  OPENAI_API_KEY: "",
  OPENAI_MODEL: "",
  PLAVE_AI_TUTOR_TEST_MODE: "",
} satisfies NodeJS.ProcessEnv;
if (runtime.flags.PLAVE_AUTH_FAILURE_TEST_MODE === "UNREACHABLE") {
  childEnvironment.NODE_OPTIONS = `--import=${resolve(runtimeRoot, "scripts/mock-unreachable-auth-fetch.mjs")}`;
}

const workspaceResult = spawnSync(
  "/usr/bin/rsync",
  [
    "-a",
    "--exclude=.git",
    "--exclude=.env*",
    "--exclude=.next*",
    "--exclude=node_modules",
    "--exclude=coverage",
    "--exclude=dist",
    "--exclude=build",
    "--exclude=artifacts",
    "--exclude=reports",
    "--exclude=.local-artifacts",
    "--exclude=supabase/.temp",
    "--exclude=*.log",
    `${root}/`,
    `${runtimeRoot}/`,
  ],
  {
    cwd: root,
    env: childEnvironment,
    stdio: "ignore",
  },
);
if (workspaceResult.status !== 0 || workspaceResult.error) {
  rmSync(temporaryRoot, { recursive: true, force: true });
  throw new Error("PRODUCTION_LOCAL_SANITIZED_WORKSPACE_FAILED");
}
for (const forbidden of [".env", ".env.local", ".env.production", ".git"]) {
  if (existsSync(resolve(runtimeRoot, forbidden))) {
    rmSync(temporaryRoot, { recursive: true, force: true });
    throw new Error("PRODUCTION_LOCAL_SANITIZED_WORKSPACE_INVALID");
  }
}
symlinkSync(resolve(root, "node_modules"), resolve(runtimeRoot, "node_modules"), "dir");
if (!buildMode) {
  symlinkSync(
    resolve(root, distDirectory),
    resolve(runtimeRoot, distDirectory),
    "dir",
  );
}

const child = spawn(
  process.execPath,
  [
    nextBin,
    buildMode ? "build" : "start",
    ...(buildMode ? ["--webpack"] : []),
    ...process.argv.slice(buildMode ? 3 : 2),
  ],
  {
    cwd: runtimeRoot,
    env: childEnvironment,
    stdio: "inherit",
    detached: false,
  },
);

process.stdout.write(
  [
    `PRODUCTION_LOCAL_${buildMode ? "BUILD" : "START"}=BEGIN`,
    "PRODUCTION_LOCAL_WORKSPACE=DISPOSABLE_ENV_EXCLUDED",
    "SUPABASE_PUBLIC_ENV_PRESENT=2/2",
    `SUPABASE_PUBLIC_ENV_SOURCE=${runtime.source}`,
    `PRODUCTION_LOCAL_APPLICATION_MODE=${applicationMode}`,
    `AI_TUTOR_RUNTIME_CONFIGURATION=${buildMode ? "DEFERRED_SERVER_RUNTIME" : "VALIDATED_GOOGLE"}`,
    "SUPABASE_SECRET_ENV_PRINTED=NO",
    "AI_TUTOR_SECRET_ENV_PRINTED=NO",
    "",
  ].join("\n"),
);

let stopping = false;
let cleaned = false;
function cleanup() {
  if (cleaned) return;
  cleaned = true;
  rmSync(temporaryRoot, { recursive: true, force: true });
}
process.once("exit", cleanup);
function promoteSanitizedBuild() {
  const built = resolve(runtimeRoot, distDirectory);
  if (!existsSync(resolve(built, "BUILD_ID"))) {
    throw new Error("PRODUCTION_LOCAL_SANITIZED_BUILD_MISSING");
  }
  writeProductionLocalBuildBinding(built, runtime.source, applicationMode);
  const destination = resolve(root, distDirectory);
  const pending = `${destination}.pending-${String(process.pid)}`;
  const previous = `${destination}.previous-${String(process.pid)}`;
  rmSync(pending, { recursive: true, force: true });
  rmSync(previous, { recursive: true, force: true });
  cpSync(built, pending, { recursive: true });
  let previousMoved = false;
  try {
    if (existsSync(destination)) {
      renameSync(destination, previous);
      previousMoved = true;
    }
    renameSync(pending, destination);
    rmSync(previous, { recursive: true, force: true });
  } catch (error) {
    rmSync(pending, { recursive: true, force: true });
    if (previousMoved && !existsSync(destination) && existsSync(previous)) {
      renameSync(previous, destination);
    }
    throw error;
  }
}
function stop(signal: NodeJS.Signals) {
  if (stopping || !child.pid) return;
  stopping = true;
  try {
    child.kill(signal);
  } catch {
    // The child may have exited between the signal and this check.
  }
}
process.once("SIGINT", () => stop("SIGTERM"));
process.once("SIGTERM", () => stop("SIGTERM"));

child.once("error", () => {
  cleanup();
  process.stderr.write(
    `PRODUCTION_LOCAL_${buildMode ? "BUILD" : "START"}=FAIL\nROOT_FAILURE_CODE=NEXT_${buildMode ? "BUILD" : "START"}_FAILED\n`,
  );
  process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  let finalCode = stopping ? 0 : signal ? 1 : (code ?? 0);
  if (buildMode && finalCode === 0) {
    try {
      promoteSanitizedBuild();
      process.stdout.write("PRODUCTION_LOCAL_BUILD=PROMOTED_SANITIZED\n");
    } catch {
      process.stderr.write(
        "PRODUCTION_LOCAL_BUILD=FAIL\nROOT_FAILURE_CODE=SANITIZED_BUILD_PROMOTION_FAILED\n",
      );
      finalCode = 1;
    }
  }
  cleanup();
  process.exitCode = finalCode;
});
