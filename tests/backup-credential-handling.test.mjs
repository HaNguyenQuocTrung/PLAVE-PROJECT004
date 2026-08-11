import { strict as assert } from "node:assert";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  DATABASE_URL_ERROR,
  getSupabaseCliDumpConnection,
  validatePlaveDevDatabaseUrl,
} from "../scripts/lib/plave-dev-database-url.mjs";

const projectRef = "abcdefghijklmnopqrst";
const publicUrl = `https://${projectRef}.supabase.co`;
const sessionHost = "aws-0-ap-southeast-1.pooler.supabase.com";
const makeUrl = ({
  password = "Alpha123",
  ref = projectRef,
  host = sessionHost,
  port = "5432",
  path = "/postgres",
} = {}) =>
  `postgresql://postgres.${ref}:${password}@${host}:${port}${path}`;

const assertRejected = (databaseUrl) => {
  assert.throws(
    () => validatePlaveDevDatabaseUrl(databaseUrl, publicUrl),
    (error) =>
      error instanceof Error && error.message === DATABASE_URL_ERROR,
  );
};

test("alphanumeric Session Pooler password validates without being returned", () => {
  const password = "Alpha123456";
  const databaseUrl = makeUrl({ password });
  const result = validatePlaveDevDatabaseUrl(databaseUrl, publicUrl);

  assert.deepEqual(result, {
    projectRef: "abcd…qrst",
    hostname: sessionHost,
    port: 5432,
    database: "postgres",
    connectionMode: "SESSION_POOLER",
  });
  assert.doesNotMatch(JSON.stringify(result), new RegExp(password, "u"));
  assert.doesNotMatch(JSON.stringify(result), new RegExp(databaseUrl, "u"));
});

test("percent-encoded reserved password characters validate", () => {
  const encodedPassword = "Alpha%40Beta%25Gamma%3ADelta%2FPath%23Hash";
  const databaseUrl = makeUrl({ password: encodedPassword });
  const result = validatePlaveDevDatabaseUrl(databaseUrl, publicUrl);
  const dumpConnection = getSupabaseCliDumpConnection(
    databaseUrl,
    publicUrl,
  );
  assert.equal(result.connectionMode, "SESSION_POOLER");
  assert.equal(
    dumpConnection.passwordlessDatabaseUrl,
    `postgresql://postgres.${projectRef}@${sessionHost}:5432/postgres`,
  );
  assert.equal(
    dumpConnection.childEnvironment.PGPASSWORD,
    "Alpha@Beta%Gamma:Delta/Path#Hash",
  );
  assert.equal(
    dumpConnection.childEnvironment.SUPABASE_DB_PASSWORD,
    dumpConnection.childEnvironment.PGPASSWORD,
  );
  assert.equal(
    dumpConnection.passwordlessDatabaseUrl.includes(encodedPassword),
    false,
  );
});

test("URI missing the @host boundary is rejected", () => {
  assertRejected(
    `postgresql://postgres.${projectRef}:Alpha123/postgres`,
  );
});

test("wrong project ref is rejected", () => {
  assertRejected(makeUrl({ ref: "wrongprojectref12345" }));
});

test("wrong pooler host and direct database host are rejected", () => {
  assertRejected(makeUrl({ host: "evil.example.com" }));
  assertRejected(makeUrl({ host: `${projectRef}.supabase.co` }));
});

test("transaction pooler port and missing port are rejected", () => {
  assertRejected(makeUrl({ port: "6543" }));
  assertRejected(
    `postgresql://postgres.${projectRef}:Alpha123@${sessionHost}/postgres`,
  );
});

test("raw reserved characters and malformed percent escapes are rejected", () => {
  assertRejected(makeUrl({ password: "Alpha:Beta" }));
  assertRejected(makeUrl({ password: "Alpha%4ZBeta" }));
});

test("CLI output contains only masked target metadata", () => {
  const fixtureDirectory = mkdtempSync(
    join(tmpdir(), "plave-backup-url-validator."),
  );
  try {
    const publicEnvFile = join(fixtureDirectory, ".env.test");
    writeFileSync(
      publicEnvFile,
      `NEXT_PUBLIC_SUPABASE_URL=${publicUrl}\n`,
      { mode: 0o600 },
    );
    const encodedPassword =
      "Fake%40Password%25With%3AReserved%2FChars%23Only";
    const databaseUrl = makeUrl({ password: encodedPassword });
    const result = spawnSync(
      process.execPath,
      ["scripts/validate-plave-dev-database-url.mjs"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          PLAVE_DEV_DB_URL: databaseUrl,
          PLAVE_PUBLIC_ENV_FILE: publicEnvFile,
        },
      },
    );

    assert.equal(result.status, 0);
    assert.match(result.stdout, /REMOTE_SESSION_POOLER_OK/u);
    assert.match(result.stdout, /project=abcd…qrst/u);
    assert.match(result.stdout, /mode=SESSION_POOLER/u);
    assert.equal(result.stderr, "");
    for (const forbidden of [
      databaseUrl,
      encodedPassword,
      "Fake@Password%With:Reserved/Chars#Only",
    ]) {
      assert.doesNotMatch(result.stdout + result.stderr, new RegExp(forbidden, "u"));
    }
  } finally {
    rmSync(fixtureDirectory, { recursive: true, force: true });
  }
});

test("invalid URI fails without leaking credentials or creating backup artifacts", () => {
  const fixtureDirectory = mkdtempSync(
    join(tmpdir(), "plave-backup-script-failure."),
  );
  try {
    const publicEnvFile = join(fixtureDirectory, ".env.test");
    writeFileSync(
      publicEnvFile,
      `NEXT_PUBLIC_SUPABASE_URL=${publicUrl}\n`,
      { mode: 0o600 },
    );

    const encodedPassword =
      "NeverReal%40Password%25With%3AReserved%2FChars%23Only";
    const databaseUrl =
      `postgresql://postgres.${projectRef}:${encodedPassword}` +
      `@${sessionHost}:6543/postgres`;
    const backupRoot = join(fixtureDirectory, "must-not-exist");
    const result = spawnSync("bash", ["scripts/backup-supabase-dev-readonly.sh"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        PLAVE_DEV_DB_URL: databaseUrl,
        PLAVE_DEV_BACKUP_ROOT: backupRoot,
        PLAVE_PUBLIC_ENV_FILE: publicEnvFile,
      },
    });

    assert.notEqual(result.status, 0);
    assert.equal(existsSync(backupRoot), false);
    assert.doesNotMatch(result.stdout + result.stderr, /NeverReal/u);
    assert.doesNotMatch(result.stdout + result.stderr, /%40|%25|%3A|%2F|%23/u);
    assert.doesNotMatch(
      result.stdout + result.stderr,
      /postgres(?:ql)?:\/\//iu,
    );
    assert.match(result.stderr, /Backup blocked:/u);
  } finally {
    rmSync(fixtureDirectory, { recursive: true, force: true });
  }
});

test("backup script fails closed for missing or malformed isolated public env", () => {
  const fixtureDirectory = mkdtempSync(
    join(tmpdir(), "plave-backup-public-env-failure."),
  );
  try {
    const backupRoot = join(fixtureDirectory, "must-not-exist");
    const malformedEnvFile = join(fixtureDirectory, ".env.malformed");
    writeFileSync(
      malformedEnvFile,
      "NEXT_PUBLIC_SUPABASE_URL=not-a-valid-url\n",
      { mode: 0o600 },
    );
    for (const publicEnvFile of [
      join(fixtureDirectory, "missing.env"),
      malformedEnvFile,
    ]) {
      const result = spawnSync(
        "bash",
        ["scripts/backup-supabase-dev-readonly.sh"],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          env: {
            ...process.env,
            PLAVE_DEV_DB_URL: makeUrl(),
            PLAVE_DEV_BACKUP_ROOT: backupRoot,
            PLAVE_PUBLIC_ENV_FILE: publicEnvFile,
          },
        },
      );
      assert.notEqual(result.status, 0);
      assert.equal(existsSync(backupRoot), false);
      assert.match(result.stderr, /Backup blocked:/u);
      assert.doesNotMatch(result.stdout + result.stderr, /Alpha123|postgresql:/u);
    }
  } finally {
    rmSync(fixtureDirectory, { recursive: true, force: true });
  }
});

test("backup script has no URL format-string or process-argument path", () => {
  const source = readFileSync(
    "scripts/backup-supabase-dev-readonly.sh",
    "utf8",
  );
  const runnerSource = readFileSync(
    "scripts/run-plave-dev-logical-dump.mjs",
    "utf8",
  );
  assert.doesNotMatch(source, /set\s+-x/u);
  assert.doesNotMatch(source, /printf\s+["']?\$\{?PLAVE_DEV_DB_URL/u);
  assert.doesNotMatch(source, /echo\s+["']?\$\{?PLAVE_DEV_DB_URL/u);
  assert.match(source, /required_flag in/u);
  assert.match(source, /trap finish EXIT/u);
  assert.match(source, /trap 'exit 129' HUP/u);
  assert.match(source, /trap 'exit 130' INT/u);
  assert.match(source, /trap 'exit 143' TERM/u);
  assert.match(source, /cleanup_generated_directory/u);
  assert.match(source, /clear_credential/u);
  assert.match(source, /PLAVE_BACKUP_EXPECTED_COUNTS/u);
  assert.match(source, /Could not derive sanitized aggregate counts from data[.]sql/u);
  assert.doesNotMatch(source, /authUsers:\s*5/u);
  assert.doesNotMatch(source, /practiceAnswers:\s*340/u);
  assert.doesNotMatch(source, /questionSolutions:\s*312/u);
  assert.doesNotMatch(source, /publication_committed/u);
  assert.match(
    source,
    /cleanup_generated_directory\(\)[\s\S]*?if \[\[ -z "\$\{cleanup_target\}" \]\]/u,
  );
  assert.doesNotMatch(
    runnerSource,
    /args\s*:\s*\[[^\]]*(databaseUrl|PGPASSWORD|SUPABASE_DB_PASSWORD)/su,
  );
  assert.match(runnerSource, /passwordlessDatabaseUrl/u);
  assert.match(runnerSource, /delete withoutSensitiveParentValues\.PLAVE_DEV_DB_URL/u);
  assert.match(runnerSource, /delete withoutSensitiveParentValues\.PGPASSWORD/u);
  assert.match(
    runnerSource,
    /delete withoutSensitiveParentValues\.SUPABASE_DB_PASSWORD/u,
  );
});

test("dump runner rejects invalid URI before creating artifacts or spawning tools", () => {
  const fixtureDirectory = mkdtempSync(
    join(tmpdir(), "plave-backup-runner-failure."),
  );
  try {
    const outputDirectory = join(fixtureDirectory, "output");
    const publicEnvFile = join(fixtureDirectory, ".env.test");
    writeFileSync(
      publicEnvFile,
      `NEXT_PUBLIC_SUPABASE_URL=${publicUrl}\n`,
      { mode: 0o600 },
    );
    const fakePassword = "RunnerFake%40Secret%25Only";
    const invalidUrl = makeUrl({
      password: fakePassword,
      host: "not-supabase.example.com",
    });
    const result = spawnSync(
      process.execPath,
      ["scripts/run-plave-dev-logical-dump.mjs", outputDirectory],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          PLAVE_DEV_DB_URL: invalidUrl,
          PLAVE_PUBLIC_ENV_FILE: publicEnvFile,
        },
      },
    );

    assert.notEqual(result.status, 0);
    assert.equal(existsSync(outputDirectory), false);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /^LOGICAL_DUMP_FAILED:PREFLIGHT:UNKNOWN\n$/u,
    );
    assert.doesNotMatch(result.stderr, /RunnerFake|%40|%25|postgresql:/u);
  } finally {
    rmSync(fixtureDirectory, { recursive: true, force: true });
  }
});
