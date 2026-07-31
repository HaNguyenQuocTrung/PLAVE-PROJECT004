import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const databaseUrlText =
  process.env.PLAVE_RLS_REMEDIATION_TEST_DB_URL ?? "";
const expectedPort =
  process.env.PLAVE_RLS_REMEDIATION_TEST_DB_PORT ?? "";
const expectedWorkdir =
  process.env.PLAVE_RLS_REMEDIATION_TEST_WORKDIR ?? "";

function fail(message) {
  throw new Error(message);
}

if (
  !expectedWorkdir.startsWith("/tmp/plave-rls-remediation.") ||
  !fs.existsSync(path.join(expectedWorkdir, "supabase", "config.toml"))
) {
  fail("Disposable Supabase workdir is not verified.");
}

const config = fs.readFileSync(
  path.join(expectedWorkdir, "supabase", "config.toml"),
  "utf8",
);
if (!config.includes('project_id = "plave-rls-remediation-isolated"')) {
  fail("Unexpected disposable project ID.");
}

let databaseUrl;
try {
  databaseUrl = new URL(databaseUrlText);
} catch {
  fail("Local database URL is invalid.");
}

if (
  !["127.0.0.1", "localhost"].includes(databaseUrl.hostname) ||
  databaseUrl.port !== expectedPort ||
  databaseUrl.pathname !== "/postgres"
) {
  fail("Database target is not the approved local disposable target.");
}

const psqlEnvironment = {
  ...process.env,
  PGHOST: databaseUrl.hostname,
  PGPORT: databaseUrl.port,
  PGDATABASE: databaseUrl.pathname.slice(1),
  PGUSER: decodeURIComponent(databaseUrl.username),
  PGPASSWORD: decodeURIComponent(databaseUrl.password),
};
delete psqlEnvironment.PLAVE_RLS_REMEDIATION_TEST_DB_URL;

const remediationPath = path.join(
  repositoryRoot,
  "supabase",
  "operations",
  "remote-dev-rls-drift",
  "REMOVE_RLS_AUTO_ENABLE_REMOTE_DEV.sql",
);
const fixturePath = path.join(
  repositoryRoot,
  "tests",
  "fixtures",
  "rls-auto-enable-active.sql",
);
const migration0035Path = path.join(
  repositoryRoot,
  "supabase",
  "migrations",
  "0035_grade2_numbers_to_1000_release_candidate_draft.sql",
);
const migration0036Path = path.join(
  repositoryRoot,
  "supabase",
  "migrations",
  "0036_adaptive_practice_runtime_draft.sql",
);

function psql(input, expectSuccess = true) {
  const result = spawnSync(
    "psql",
    ["-X", "-v", "ON_ERROR_STOP=1", "-At"],
    {
      input,
      encoding: "utf8",
      env: psqlEnvironment,
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  if (expectSuccess && result.status !== 0) {
    fail("Disposable local SQL command failed.");
  }
  if (!expectSuccess && result.status === 0) {
    fail("Expected fail-closed SQL command to fail.");
  }
  return result;
}

function psqlFile(filePath, expectSuccess = true) {
  const result = spawnSync(
    "psql",
    ["-X", "-v", "ON_ERROR_STOP=1", "-At", "-f", filePath],
    {
      encoding: "utf8",
      env: psqlEnvironment,
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  if (expectSuccess && result.status !== 0) {
    fail("Disposable local SQL file failed.");
  }
  if (!expectSuccess && result.status === 0) {
    fail("Expected fail-closed SQL file to fail.");
  }
  return result;
}

function query(sql) {
  return psql(sql).stdout.trim();
}

function createOfficialFixture() {
  psqlFile(fixturePath);
  assert.equal(
    query(`
      select
        md5(pg_get_functiondef('public.rls_auto_enable()'::regprocedure))
        || '|'
        || md5(
          regexp_replace(
            lower(
              pg_get_functiondef(
                'public.rls_auto_enable()'::regprocedure
              )
            ),
            '\\s+',
            ' ',
            'g'
          )
        );
    `),
    "6998ea6b4c2480f5d2e34b5dcf3f8d36|" +
      "685bfb43070e3afbcc764020048aaa0c",
  );
}

function dropFixture() {
  psql(`
    drop event trigger if exists ensure_rls;
    drop function if exists public.rls_auto_enable();
  `);
}

function assertFixtureStillPresent() {
  assert.equal(
    query(`
      select
        (to_regprocedure('public.rls_auto_enable()') is not null)::text
        || '|'
        || exists(
          select 1
          from pg_event_trigger
          where evtname = 'ensure_rls'
        )::text;
    `),
    "true|true",
  );
}

assert.equal(
  query(`
    select
      (select count(*) from public.learning_units where grade = 1)
      || '|'
      || (
        select count(*)
        from public.questions as question
        join public.learning_units as unit
          on unit.slug = question.unit_slug
        where unit.grade = 1
      )
      || '|'
      || (
        select count(*)
        from public.question_solutions as solution
        join public.questions as question
          on question.code = solution.question_id
        join public.learning_units as unit
          on unit.slug = question.unit_slug
        where unit.grade = 1
      );
  `),
  "13|312|312",
);

const rlsBefore = query(`
  select md5(
    string_agg(
      relation.relname
      || ':' || relation.relrowsecurity::text
      || ':' || relation.relforcerowsecurity::text,
      ',' order by relation.relname
    )
  )
  from pg_class as relation
  join pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind in ('r', 'p');
`);

createOfficialFixture();
psql(`
  create or replace function public.rls_auto_enable()
  returns event_trigger
  language plpgsql
  security definer
  set search_path = pg_catalog
  as $$ begin null; end; $$;
`);
const fingerprintFailure = psqlFile(remediationPath, false);
assert.match(
  fingerprintFailure.stderr,
  /PLAVE_RLS_DRIFT:FUNCTION_METADATA_MISMATCH/,
);
assertFixtureStillPresent();
dropFixture();

createOfficialFixture();
psql(`
  alter function public.rls_auto_enable()
    depends on extension plpgsql;
`);
const dependencyFailure = psqlFile(remediationPath, false);
assert.match(
  dependencyFailure.stderr,
  /PLAVE_RLS_DRIFT:FUNCTION_DEPENDENCY_MISMATCH/,
);
assertFixtureStillPresent();
dropFixture();

createOfficialFixture();
psql("alter event trigger ensure_rls disable;");
const triggerFailure = psqlFile(remediationPath, false);
assert.match(
  triggerFailure.stderr,
  /PLAVE_RLS_DRIFT:EVENT_TRIGGER_MISMATCH/,
);
assertFixtureStillPresent();
dropFixture();

createOfficialFixture();
const success = psqlFile(remediationPath);
assert.match(success.stdout, /REMOTE_RLS_DRIFT_REMEDIATED/);
assert.equal(
  query(`
      select
        (to_regprocedure('public.rls_auto_enable()') is null)::text
        || '|'
        || (
          not exists(
            select 1 from pg_event_trigger where evtname = 'ensure_rls'
          )
        )::text;
  `),
  "true|true",
);
assert.equal(
  query(`
    select md5(
      string_agg(
        relation.relname
        || ':' || relation.relrowsecurity::text
        || ':' || relation.relforcerowsecurity::text,
        ',' order by relation.relname
      )
    )
    from pg_class as relation
    join pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p');
  `),
  rlsBefore,
);

psqlFile(migration0035Path);
psqlFile(migration0036Path);

assert.equal(
  query(`
    select
      (select count(*) from public.learning_units where grade = 1)
      || '|'
      || (
        select count(*)
        from public.questions as question
        join public.learning_units as unit
          on unit.slug = question.unit_slug
        where unit.grade = 1
      )
      || '|'
      || (
        select count(*)
        from public.question_solutions as solution
        join public.questions as question
          on question.code = solution.question_id
        join public.learning_units as unit
          on unit.slug = question.unit_slug
        where unit.grade = 1
      )
      || '|'
      || (
        select count(*)
        from public.learning_units
        where slug = 'grade-2-numbers-to-1000'
          and not published
      )
      || '|'
      || (
        select count(*)
        from pg_class as relation
        join pg_namespace as namespace
          on namespace.oid = relation.relnamespace
        where namespace.nspname = 'public'
          and relation.relname in (
            'adaptive_practice_releases',
            'adaptive_practice_attempts',
            'adaptive_practice_answers'
          )
          and relation.relrowsecurity
          and relation.relforcerowsecurity
      );
  `),
  "13|312|312|1|3",
);

process.stdout.write(
  JSON.stringify(
    {
      status: "PASS",
      target: "LOCAL_DISPOSABLE_ONLY",
      fingerprintRollback: true,
      dependencyRollback: true,
      triggerStateRollback: true,
      remediationRemovedExactObjects: true,
      rlsStatePreserved: true,
      drafts0035And0036AppliedAfterRemediation: true,
      grade1Baseline: "13/312/312",
    },
    null,
    2,
  ) + "\n",
);
