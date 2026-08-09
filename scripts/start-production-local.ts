import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { assertProject004Workspace } from "./project004-identity.ts";
import {
  loadProject004RemoteRuntimeConfigFile,
  Project004RemoteRuntimeFailure,
} from "./project004-remote-runtime-connection.ts";
import { productionLocalBuildContract } from "./production-local-build-contract.ts";

type PublicRuntime = Readonly<{
  url: string;
  publishableKey: string;
  source: "EXPLICIT_ENVIRONMENT" | "VALIDATED_RUNTIME_FILE";
  flags: Readonly<Record<string, string>>;
}>;

function resolvePublicRuntime(root: string): PublicRuntime {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (Boolean(url) !== Boolean(publishableKey)) {
    throw new Error("PRODUCTION_LOCAL_SUPABASE_PUBLIC_ENV_PARTIAL");
  }
  if (url && publishableKey) {
    return {
      url,
      publishableKey,
      source: "EXPLICIT_ENVIRONMENT",
      flags: {},
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

if (!buildMode) {
  const buildId = resolve(
    root,
    productionLocalBuildContract.distDirectory,
    "BUILD_ID",
  );
  if (!existsSync(buildId)) {
    process.stderr.write(
      "PRODUCTION_LOCAL_START=FAIL\n" +
        "ROOT_FAILURE_CODE=PRODUCTION_LOCAL_BUILD_MISSING\n" +
        "REQUIRED_COMMAND=npm run build:production-local\n",
    );
    process.exit(1);
  }
}

const child = spawn(
  process.execPath,
  [nextBin, buildMode ? "build" : "start", ...process.argv.slice(buildMode ? 3 : 2)],
  {
    cwd: root,
    env: {
      ...process.env,
      ...runtime.flags,
      [productionLocalBuildContract.environmentFlag]: "true",
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_SUPABASE_URL: runtime.url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: runtime.publishableKey,
    },
    stdio: "inherit",
    detached: false,
  },
);

process.stdout.write(
  [
    `PRODUCTION_LOCAL_${buildMode ? "BUILD" : "START"}=BEGIN`,
    "SUPABASE_PUBLIC_ENV_PRESENT=2/2",
    `SUPABASE_PUBLIC_ENV_SOURCE=${runtime.source}`,
    "SUPABASE_SECRET_ENV_PRINTED=NO",
    "",
  ].join("\n"),
);

let stopping = false;
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
  process.stderr.write(
    `PRODUCTION_LOCAL_${buildMode ? "BUILD" : "START"}=FAIL\nROOT_FAILURE_CODE=NEXT_${buildMode ? "BUILD" : "START"}_FAILED\n`,
  );
  process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  process.exitCode = stopping ? 0 : signal ? 1 : (code ?? 0);
});
