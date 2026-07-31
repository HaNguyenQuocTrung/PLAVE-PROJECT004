#!/usr/bin/env node

import { spawn } from "node:child_process";
import {
  chmodSync,
  existsSync,
  readFileSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { join, resolve } from "node:path";

import {
  getSupabaseCliDumpConnection,
  readPublicSupabaseUrlFromEnvFile,
} from "./lib/plave-dev-database-url.mjs";
import { classifySupabaseDumpFailure } from "./lib/supabase-dump-errors.mjs";

const SAFE_FAILURE = "LOGICAL_DUMP_FAILED";
const MAX_DIAGNOSTIC_BYTES = 64 * 1024;
const outputDirectory = process.argv[2] ? resolve(process.argv[2]) : "";
const publicEnvFile = process.env.PLAVE_PUBLIC_ENV_FILE ?? "";
const databaseUrl = process.env.PLAVE_DEV_DB_URL ?? "";
let activeChild = null;

const clearCredential = () => {
  delete process.env.PLAVE_DEV_DB_URL;
  delete process.env.PGPASSWORD;
  delete process.env.SUPABASE_DB_PASSWORD;
};

const fail = (stage = "PREFLIGHT", reason = "UNKNOWN") => {
  clearCredential();
  console.error(`${SAFE_FAILURE}:${stage}:${reason}`);
  process.exit(1);
};

class SafeDumpFailure extends Error {
  constructor(stage, reason) {
    super(SAFE_FAILURE);
    this.stage = stage;
    this.reason = reason;
  }
}

for (const signal of ["SIGHUP", "SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    activeChild?.kill(signal);
    clearCredential();
    process.exit(1);
  });
}

const withoutSensitiveParentValues = { ...process.env };
delete withoutSensitiveParentValues.PLAVE_DEV_DB_URL;
delete withoutSensitiveParentValues.PGPASSWORD;
delete withoutSensitiveParentValues.SUPABASE_DB_PASSWORD;

const appendDiagnostic = (current, chunk) => {
  if (current.length >= MAX_DIAGNOSTIC_BYTES) return current;
  return `${current}${chunk.toString("utf8")}`.slice(0, MAX_DIAGNOSTIC_BYTES);
};

const removePartialOutput = (outputPath) => {
  try {
    if (existsSync(outputPath)) unlinkSync(outputPath);
  } catch {
    // The parent lifecycle removes the exact .incomplete directory.
  }
};

const runDump = async ({
  stage,
  fileName,
  stageArguments,
  passwordlessDatabaseUrl,
  childEnvironment,
}) => {
  const outputPath = join(outputDirectory, fileName);
  const args = [
    "db",
    "dump",
    "--db-url",
    passwordlessDatabaseUrl,
    "--file",
    outputPath,
    ...stageArguments,
    "--log-level",
    "error",
  ];
  const child = spawn("supabase", args, {
    env: {
      ...withoutSensitiveParentValues,
      ...childEnvironment,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  activeChild = child;

  let diagnosticText = "";
  child.stdout.on("data", (chunk) => {
    diagnosticText = appendDiagnostic(diagnosticText, chunk);
  });
  child.stderr.on("data", (chunk) => {
    diagnosticText = appendDiagnostic(diagnosticText, chunk);
  });

  const exitCode = await new Promise((resolveExit) => {
    child.once("close", resolveExit);
    child.once("error", () => resolveExit(-1));
  });
  activeChild = null;

  const outputIsValid =
    existsSync(outputPath) &&
    statSync(outputPath).isFile() &&
    statSync(outputPath).size > 0;
  if (exitCode !== 0 || !outputIsValid) {
    removePartialOutput(outputPath);
    throw new SafeDumpFailure(
      stage,
      classifySupabaseDumpFailure(diagnosticText, stage),
    );
  }
  chmodSync(outputPath, 0o600);
};

try {
  if (!outputDirectory || !publicEnvFile || !databaseUrl) {
    fail("PREFLIGHT", "UNKNOWN");
  }

  const publicSupabaseUrl = readPublicSupabaseUrlFromEnvFile(
    readFileSync(publicEnvFile, "utf8"),
  );
  const { passwordlessDatabaseUrl, childEnvironment } =
    getSupabaseCliDumpConnection(databaseUrl, publicSupabaseUrl);

  await runDump({
    stage: "ROLES",
    fileName: "roles.sql",
    stageArguments: ["--role-only"],
    passwordlessDatabaseUrl,
    childEnvironment,
  });

  await runDump({
    stage: "SCHEMA",
    fileName: "schema.sql",
    stageArguments: [],
    passwordlessDatabaseUrl,
    childEnvironment,
  });

  await runDump({
    stage: "DATA",
    fileName: "data.sql",
    stageArguments: [
      "--data-only",
      "--use-copy",
      "--exclude",
      "storage.buckets_vectors,storage.vector_indexes",
    ],
    passwordlessDatabaseUrl,
    childEnvironment,
  });

  const forbiddenValues = [
    databaseUrl,
    childEnvironment.PGPASSWORD,
    encodeURIComponent(childEnvironment.PGPASSWORD),
  ].filter((value) => value.length >= 8);
  for (const fileName of ["roles.sql", "schema.sql", "data.sql"]) {
    const content = readFileSync(join(outputDirectory, fileName), "utf8");
    if (forbiddenValues.some((value) => content.includes(value))) {
      fail("PREFLIGHT", "UNKNOWN");
    }
  }
} catch (error) {
  if (error instanceof SafeDumpFailure) {
    fail(error.stage, error.reason);
  }
  fail("PREFLIGHT", "UNKNOWN");
} finally {
  clearCredential();
}
