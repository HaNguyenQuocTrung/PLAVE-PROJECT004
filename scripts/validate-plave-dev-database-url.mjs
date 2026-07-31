#!/usr/bin/env node

import { readFileSync } from "node:fs";

import {
  DATABASE_URL_ERROR,
  readPublicSupabaseUrlFromEnvFile,
  validatePlaveDevDatabaseUrl,
} from "./lib/plave-dev-database-url.mjs";

const reject = () => {
  console.error(DATABASE_URL_ERROR);
  process.exit(1);
};

try {
  const databaseUrl = process.env.PLAVE_DEV_DB_URL;
  const publicEnvFile = process.env.PLAVE_PUBLIC_ENV_FILE;
  if (!databaseUrl || !publicEnvFile) reject();

  const publicSupabaseUrl = readPublicSupabaseUrlFromEnvFile(
    readFileSync(publicEnvFile, "utf8"),
  );
  const sanitized = validatePlaveDevDatabaseUrl(
    databaseUrl,
    publicSupabaseUrl,
  );

  process.stdout.write(
    [
      "REMOTE_SESSION_POOLER_OK",
      `project=${sanitized.projectRef}`,
      `host=${sanitized.hostname}`,
      `port=${sanitized.port}`,
      `database=${sanitized.database}`,
      `mode=${sanitized.connectionMode}`,
    ].join("|"),
  );
} catch {
  reject();
} finally {
  delete process.env.PLAVE_DEV_DB_URL;
}
