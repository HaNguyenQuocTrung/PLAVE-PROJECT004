import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  assertProject004Workspace,
} from "./project004-identity.ts";
import {
  loadAndVerifyMigrationPlan,
} from "./project004-remote-dev-guard.ts";
import {
  buildProject004PrefixSemanticFingerprintSql,
  parsePrefixSemanticFingerprint,
} from "./project004-prefix-semantic-fingerprint.ts";

function fail(code: string): never {
  throw new Error(code);
}

function disposableDatabaseEnvironment(
  environment: NodeJS.ProcessEnv,
) {
  if (
    environment.PLAVE_PROJECT004_DISPOSABLE_PREFIX_DB !== "YES"
  ) {
    fail("DISPOSABLE_PREFIX_DATABASE_APPROVAL_REQUIRED");
  }
  const rawUrl =
    environment.PLAVE_PROJECT004_PREFIX_LOCAL_DATABASE_URL ?? "";
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    fail("DISPOSABLE_PREFIX_DATABASE_URL_INVALID");
  }
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !["127.0.0.1", "localhost", "::1"].includes(
      parsed.hostname,
    ) ||
    parsed.port === "54322" ||
    !/^plave_project004_prefix_[a-z0-9_]+$/u.test(
      parsed.pathname.slice(1),
    )
  ) {
    fail("DISPOSABLE_PREFIX_DATABASE_TARGET_REJECTED");
  }
  const child = { ...environment };
  delete child.PLAVE_PROJECT004_PREFIX_LOCAL_DATABASE_URL;
  delete child.PLAVE_PROJECT004_DISPOSABLE_PREFIX_DB;
  child.PGHOST = parsed.hostname;
  child.PGPORT = parsed.port || "5432";
  child.PGUSER = decodeURIComponent(parsed.username);
  child.PGPASSWORD = decodeURIComponent(parsed.password);
  child.PGDATABASE = parsed.pathname.slice(1);
  child.PGSSLMODE =
    parsed.searchParams.get("sslmode") ?? "disable";
  child.PGCONNECT_TIMEOUT = "5";
  return child;
}

function runPsql(options: {
  args: string[];
  environment: NodeJS.ProcessEnv;
  input?: string;
}) {
  const result = spawnSync(
    "psql",
    [
      "--no-psqlrc",
      "--quiet",
      "--set",
      "ON_ERROR_STOP=1",
      ...options.args,
    ],
    {
      cwd: assertProject004Workspace(),
      env: options.environment,
      encoding: "utf8",
      input: options.input,
      stdio: [
        options.input === undefined ? "ignore" : "pipe",
        "pipe",
        "pipe",
      ],
      timeout: 120_000,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (result.status !== 0 || result.signal !== null) {
    fail("DISPOSABLE_PREFIX_DATABASE_OPERATION_FAILED");
  }
  return result.stdout;
}

const freshBaselineSql = String.raw`
begin read only;
select concat_ws(
  '|',
  'FRESH_PREFIX_BASELINE_V1',
  case when pg_catalog.to_regclass('auth.users')
    is null then 1 else 0 end,
  case when pg_catalog.to_regnamespace('extensions')
    is null then 1 else 0 end,
  (
    select count(*)
    from auth.users
  ),
  (
    select count(*)
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname in ('public', 'private')
      and relation.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
      and relation.relname in (
        'profiles',
        'student_profiles',
        'learning_units',
        'questions',
        'curriculum_releases'
      )
  )
);
commit;
`;

function requireFreshBaseline(output: string) {
  const line = output
    .split(/\r?\n/u)
    .map((candidate) => candidate.trim())
    .filter(Boolean)
    .at(-1);
  if (line !== "FRESH_PREFIX_BASELINE_V1|0|0|0|0") {
    fail("DISPOSABLE_PREFIX_DATABASE_NOT_FRESH");
  }
}

const post0040Sql = String.raw`
begin read only;
select concat_ws(
  '|',
  'FRESH_FORWARD_RESULT_V1',
  (pg_catalog.to_regclass(
    'public.teacher_curriculum_assignment_drafts'
  ) is not null)::integer,
  (pg_catalog.to_regclass(
    'private.assignment_submission_mutations'
  ) is not null)::integer,
  (pg_catalog.to_regclass(
    'public.curriculum_generated_questions'
  ) is not null)::integer,
  (pg_catalog.to_regclass(
    'private.curriculum_generated_solutions'
  ) is not null)::integer,
  (pg_catalog.to_regprocedure(
    'public.start_or_resume_generated_curriculum(jsonb,text,uuid)'
  ) is not null)::integer,
  (pg_catalog.to_regprocedure(
    'public.submit_generated_curriculum_answer(uuid,text,text,integer,uuid)'
  ) is not null)::integer,
  (select count(*) from auth.users),
  (select count(*) from public.curriculum_releases),
  (select count(*) from private.curriculum_generation_runtime_secret),
  (
    select count(*)
    from public.adaptive_practice_releases
    where runtime_enabled
      or controlled_pilot_enabled
      or retention_runtime_enabled
  )
);
commit;
`;

export function runProject004PrefixFreshLocalIntegration(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const root = assertProject004Workspace();
  const { plan } = loadAndVerifyMigrationPlan(root);
  const databaseEnvironment =
    disposableDatabaseEnvironment(environment);
  requireFreshBaseline(
    runPsql({
      args: ["--tuples-only", "--no-align"],
      environment: databaseEnvironment,
      input: freshBaselineSql,
    }),
  );

  for (const entry of plan.migrations.slice(0, 38)) {
    runPsql({
      args: [
        "--file",
        resolve(root, "supabase/migrations", entry.file),
      ],
      environment: databaseEnvironment,
    });
  }
  const canonical = parsePrefixSemanticFingerprint(
    runPsql({
      args: ["--tuples-only", "--no-align"],
      environment: databaseEnvironment,
      input: buildProject004PrefixSemanticFingerprintSql(
        root,
        38,
      ),
    }),
  );

  for (const entry of plan.migrations.slice(38)) {
    runPsql({
      args: [
        "--file",
        resolve(root, "supabase/migrations", entry.file),
      ],
      environment: databaseEnvironment,
    });
  }
  const post0040 = runPsql({
    args: ["--tuples-only", "--no-align"],
    environment: databaseEnvironment,
    input: post0040Sql,
  })
    .split(/\r?\n/u)
    .map((candidate) => candidate.trim())
    .filter(Boolean)
    .at(-1);
  if (
    post0040 !==
    "FRESH_FORWARD_RESULT_V1|1|1|1|1|1|1|0|0|0|0"
  ) {
    fail("FRESH_FORWARD_INTEGRATION_POSTCHECK_FAILED");
  }
  return {
    canonical,
    migration0039: "PASS" as const,
    migration0040: "PASS" as const,
  };
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  const result = runProject004PrefixFreshLocalIntegration();
  process.stdout.write(
    `CANONICAL_PREFIX_SEMANTIC_OVERALL_SHA256=${result.canonical.overallSha256}\n`,
  );
  for (const category of result.canonical.categories) {
    process.stdout.write(
      `CANONICAL_PREFIX_SEMANTIC_${category.category}=${category.count}/${category.sha256}\n`,
    );
  }
  process.stdout.write(
    "MIGRATION_0039_FRESH_LOCAL=PASS\n" +
      "MIGRATION_0040_FRESH_LOCAL=PASS\n" +
      "DISPOSABLE_DATABASE_MUST_BE_DISCARDED=YES\n",
  );
}
