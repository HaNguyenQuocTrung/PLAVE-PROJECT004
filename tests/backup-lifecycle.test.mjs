import { strict as assert } from "node:assert";
import { spawn, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const repositoryRoot = process.cwd();
const backupScript = "scripts/backup-supabase-dev-readonly.sh";
const realShasum = "/usr/bin/shasum";
const projectRef = "abcdefghijklmnopqrst";
const publicUrl = `https://${projectRef}.supabase.co`;

const fakeEncodedPassword =
  "Lifecycle%40Fake%25Password%3AOnly%2FTest%23Value";
const fakeDecodedPassword =
  "Lifecycle@Fake%Password:Only/Test#Value";
const fakeDatabaseUrl =
  `postgresql://postgres.${projectRef}:${fakeEncodedPassword}` +
  "@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres";

const writeExecutable = (filePath, source) => {
  writeFileSync(filePath, source, { mode: 0o700 });
  chmodSync(filePath, 0o700);
};

const createHarness = () => {
  const fixtureDirectory = mkdtempSync(
    join(tmpdir(), "plave-backup-lifecycle."),
  );
  const fakeBin = join(fixtureDirectory, "bin");
  const backupRoot = join(fixtureDirectory, "backups");
  const argvLog = join(fixtureDirectory, "supabase-argv.log");
  const publicEnvFile = join(fixtureDirectory, ".env.test");
  const bashEnvironmentFile = join(fixtureDirectory, ".bash_env.test");
  mkdirSync(fakeBin, { mode: 0o700 });
  writeFileSync(
    publicEnvFile,
    `NEXT_PUBLIC_SUPABASE_URL=${publicUrl}\n`,
    { mode: 0o600 },
  );
  writeFileSync(
    bashEnvironmentFile,
    `printf() {
  if [[ "\${PLAVE_FAKE_PRINTF_MODE:-success}" == "fail-completion" &&
        "\${2:-}" == "Backup validation: PASS" ]]; then
    return 75
  fi
  builtin printf "$@"
}
`,
    { mode: 0o600 },
  );

  writeExecutable(
    join(fakeBin, "supabase"),
    `#!/usr/bin/env bash
set -eu
if [[ "\${1:-}" == "--version" ]]; then
  printf '%s\\n' "\${PLAVE_FAKE_SUPABASE_VERSION:-2.110.0}"
  exit 0
fi
if [[ "\${1:-}" == "db" && "\${2:-}" == "dump" && "\${3:-}" == "--help" ]]; then
  printf '%s\\n' '--db-url --file --role-only --data-only --use-copy --exclude'
  exit 0
fi
printf '%s\\n' "$@" >> "\${PLAVE_FAKE_ARGV_LOG}"
stage='schema'
output_file=''
database_url=''
previous=''
for argument in "$@"; do
  if [[ "$previous" == "--file" ]]; then output_file="$argument"; fi
  if [[ "$previous" == "--db-url" ]]; then database_url="$argument"; fi
  case "$argument" in
    --role-only) stage='roles' ;;
    --data-only) stage='data' ;;
  esac
  previous="$argument"
done
[[ -n "$output_file" && -n "$database_url" ]] || exit 60
[[ "$database_url" != postgresql://*:*@* ]] || exit 61
[[ "\${PGPASSWORD:-}" == '${fakeDecodedPassword}' ]] || {
  printf '%s\\n' 'password authentication failed'
  exit 62
}
[[ "\${SUPABASE_DB_PASSWORD:-}" == "\${PGPASSWORD}" ]] || exit 63
case "\${PLAVE_FAKE_DUMP_MODE:-success}:\${stage}" in
  roles-auth:roles)
    printf '%s\\n' 'password authentication failed for user'
    exit 41
    ;;
  roles-permission:roles)
    printf '%s\\n' 'permission denied for relation pg_authid'
    exit 42
    ;;
  roles-unknown:roles)
    printf '%s\\n' 'RAW_INTERNAL_DETAIL_SHOULD_NOT_LEAK'
    exit 43
    ;;
  schema-fail:schema)
    printf '%s\\n' 'unclassified schema failure'
    exit 44
    ;;
  data-fail:data)
    printf '%s\\n' 'unclassified data failure'
    exit 45
    ;;
  zero-schema:schema)
    : > "$output_file"
    exit 0
    ;;
  incomplete-count-snapshot:data)
    printf '%s\\n' 'COPY "public"."fixture" ("value") FROM stdin;' '1' '\\.' > "$output_file"
    exit 0
    ;;
  signal:roles)
    trap 'exit 143' HUP INT TERM
    while :; do /bin/sleep 1; done
    ;;
esac
case "$stage" in
  roles)
    printf '%s\\n' 'CREATE ROLE "fixture_reader";' > "$output_file"
    ;;
  schema)
    printf '%s\\n' 'CREATE TABLE "public"."fixture" ("value" integer);' > "$output_file"
    ;;
  data)
    cat > "$output_file" <<'SQL'
COPY "auth"."users" ("id") FROM stdin;
auth-1
auth-2
\\.
COPY "public"."profiles" ("user_id") FROM stdin;
profile-1
profile-2
\\.
COPY "public"."student_profiles" ("user_id") FROM stdin;
student-1
\\.
COPY "public"."teacher_profiles" ("user_id") FROM stdin;
\\.
COPY "public"."parent_student_connections" ("id") FROM stdin;
connection-1
\\.
COPY "public"."practice_attempts" ("id") FROM stdin;
practice-attempt-1
\\.
COPY "public"."practice_answers" ("attempt_id") FROM stdin;
practice-answer-1
practice-answer-2
\\.
COPY "public"."diagnostic_attempts" ("id") FROM stdin;
diagnostic-attempt-1
\\.
COPY "public"."diagnostic_answers" ("attempt_id") FROM stdin;
\\.
COPY "public"."learning_units" ("slug", "grade") FROM stdin;
grade-1-unit	1
grade-2-unit	2
\\.
COPY "public"."questions" ("code") FROM stdin;
question-1
question-2
\\.
COPY "public"."question_solutions" ("question_id") FROM stdin;
solution-1
solution-2
\\.
SQL
    ;;
  *)
    exit 44
    ;;
esac
`,
  );

  writeExecutable(
    join(fakeBin, "docker"),
    `#!/usr/bin/env bash
set -eu
if [[ "\${PLAVE_FAKE_DOCKER_MODE:-success}" == "unavailable" ]]; then
  printf '%s\\n' 'Cannot connect to the Docker daemon' >&2
  exit 70
fi
case "\${1:-}" in
  version) printf '%s\\n' '28.1.1|28.1.1' ;;
  info) printf '%s\\n' '28.1.1' ;;
  image)
    [[ "\${2:-}" == "inspect" ]] || exit 72
    [[ "\${3:-}" == "public.ecr.aws/supabase/postgres:17.6.1.143" ]] || exit 73
    ;;
  run)
    [[ "\${PLAVE_FAKE_DOCKER_MODE:-success}" != "container-fail" ]] || exit 74
    printf '%s\\n' "$@" | grep -F -- '--network' >/dev/null
    printf '%s\\n' "$@" | grep -F -- 'none' >/dev/null
    printf '%s\\n' "$@" | grep -F -- '--entrypoint' >/dev/null
    printf '%s\\n' "$@" | grep -F -- 'pg_dump' >/dev/null
    printf '%s\\n' "$@" | grep -F -- 'public.ecr.aws/supabase/postgres:17.6.1.143' >/dev/null
    printf '%s\\n' "$@" | grep -F -- '--version' >/dev/null
    ;;
  *) exit 71 ;;
esac
`,
  );

  writeExecutable(
    join(fakeBin, "shasum"),
    `#!/usr/bin/env bash
set -eu
case "\${PLAVE_FAKE_SHASUM_MODE:-success}" in
  fail) exit 51 ;;
  corrupt)
    for argument in "$@"; do
      if [[ -f "$argument" ]]; then
        printf '%064d  %s\\n' 0 "$argument"
      fi
    done
    exit 0
    ;;
esac
exec "${realShasum}" "$@"
`,
  );

  writeExecutable(
    join(fakeBin, "stat"),
    `#!/usr/bin/env bash
set -eu
if [[ "\${PLAVE_FAKE_STAT_MODE:-success}" == "fail" ]]; then
  exit 52
fi
exec /usr/bin/stat "$@"
`,
  );

  return {
    fixtureDirectory,
    fakeBin,
    backupRoot,
    argvLog,
    env: {
      ...process.env,
      PATH: `${fakeBin}:${process.env.PATH}`,
      BASH_ENV: bashEnvironmentFile,
      PLAVE_DEV_DB_URL: fakeDatabaseUrl,
      PLAVE_DEV_BACKUP_ROOT: backupRoot,
      PLAVE_FAKE_ARGV_LOG: argvLog,
      PLAVE_PUBLIC_ENV_FILE: publicEnvFile,
    },
  };
};

const assertNoSecretValue = (text) => {
  for (const forbidden of [
    fakeDatabaseUrl,
    fakeEncodedPassword,
    fakeDecodedPassword,
  ]) {
    assert.equal(text.includes(forbidden), false);
  }
};

const assertNoCredentialLeak = (text) => {
  assertNoSecretValue(text);
  assert.doesNotMatch(text, /postgres(?:ql)?:\/\//iu);
};

const listBackupEntries = (backupRoot) =>
  existsSync(backupRoot) ? readdirSync(backupRoot).sort() : [];

const runLifecycle = (environment = {}) => {
  const harness = createHarness();
  const result = spawnSync("bash", [backupScript], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...harness.env, ...environment },
    timeout: 10_000,
  });
  return { harness, result };
};

const assertFailedAtomically = (
  { harness, result },
  expectedSafeError = null,
) => {
  try {
    assert.notEqual(result.status, 0);
    assertNoCredentialLeak(result.stdout + result.stderr);
    assert.doesNotMatch(result.stdout + result.stderr, /Backup ID:/u);
    assert.doesNotMatch(
      result.stdout + result.stderr,
      /plave-dev-\d{8}T\d{6}Z-[a-f0-9]{8}/u,
    );
    if (expectedSafeError) {
      assert.match(result.stderr, expectedSafeError);
    }
    assert.deepEqual(listBackupEntries(harness.backupRoot), []);
  } finally {
    rmSync(harness.fixtureDirectory, { recursive: true, force: true });
  }
};

test("successful dumps validate and publish atomically before printing the ID", () => {
  const { harness, result } = runLifecycle();
  try {
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    assertNoCredentialLeak(result.stdout);
    const lines = result.stdout.trim().split(/\r?\n/u);
    assert.equal(lines.length, 2);
    assert.equal(lines[0], "Backup validation: PASS");
    assert.match(
      lines[1],
      /^Backup ID: plave-dev-\d{8}T\d{6}Z-[a-f0-9]{8}$/u,
    );
    const backupId = lines[1].slice("Backup ID: ".length);
    const entries = listBackupEntries(harness.backupRoot);
    assert.deepEqual(entries, [backupId]);
    assert.doesNotMatch(entries[0], /\.incomplete$/u);

    const backupDirectory = join(harness.backupRoot, backupId);
    const expectedFiles = [
      "README_RESTORE.txt",
      "checksums.sha256",
      "data.sql",
      "manifest.json",
      "roles.sql",
      "schema.sql",
    ];
    assert.deepEqual(readdirSync(backupDirectory).sort(), expectedFiles);
    for (const fileName of expectedFiles) {
      const content = readFileSync(join(backupDirectory, fileName), "utf8");
      assert.ok(content.length > 0);
      assertNoCredentialLeak(content);
    }
    const manifest = JSON.parse(
      readFileSync(join(backupDirectory, "manifest.json"), "utf8"),
    );
    assert.deepEqual(manifest.expectedRestoreCounts, {
      authUsers: 2,
      profiles: 2,
      studentProfiles: 1,
      teacherProfiles: 0,
      parentStudentConnections: 1,
      practiceAttempts: 1,
      practiceAnswers: 2,
      diagnosticAttempts: 1,
      diagnosticAnswers: 0,
      grade1Units: 1,
      questions: 2,
      questionSolutions: 2,
    });
    const argvLog = readFileSync(harness.argvLog, "utf8");
    assertNoSecretValue(argvLog);
    assert.match(
      argvLog,
      new RegExp(
        `postgresql://postgres\\.${projectRef}` +
          "@aws-0-ap-southeast-1\\.pooler\\.supabase\\.com:5432/postgres",
        "u",
      ),
    );
    assert.match(argvLog, /--role-only/u);
    assert.match(argvLog, /--data-only/u);
    assert.match(argvLog, /--use-copy/u);
    assert.match(
      argvLog,
      /storage\.buckets_vectors,storage\.vector_indexes/u,
    );

    const validation = spawnSync(
      process.execPath,
      ["scripts/validate-supabase-dev-backup.mjs", backupDirectory],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    assert.equal(validation.status, 0, validation.stderr);
    assert.match(validation.stdout, /"status": "PASS"/u);
  } finally {
    rmSync(harness.fixtureDirectory, { recursive: true, force: true });
  }
});

test("role authentication failure is classified without leaking raw stderr", () => {
  assertFailedAtomically(
    runLifecycle({ PLAVE_FAKE_DUMP_MODE: "roles-auth" }),
    /^LOGICAL_DUMP_FAILED:ROLES:AUTH_FAILED$/mu,
  );
});

test("role permission failure is classified safely", () => {
  assertFailedAtomically(
    runLifecycle({ PLAVE_FAKE_DUMP_MODE: "roles-permission" }),
    /^LOGICAL_DUMP_FAILED:ROLES:PERMISSION_DENIED$/mu,
  );
});

test("unknown role failure does not leak raw stderr", () => {
  const execution = runLifecycle({ PLAVE_FAKE_DUMP_MODE: "roles-unknown" });
  try {
    assert.doesNotMatch(
      execution.result.stdout + execution.result.stderr,
      /RAW_INTERNAL_DETAIL_SHOULD_NOT_LEAK/u,
    );
  } finally {
    assertFailedAtomically(
      execution,
      /^LOGICAL_DUMP_FAILED:ROLES:UNKNOWN$/mu,
    );
  }
});

test("schema dump failure leaves no final or incomplete directory", () => {
  assertFailedAtomically(runLifecycle({ PLAVE_FAKE_DUMP_MODE: "schema-fail" }));
});

test("data dump failure leaves no final or incomplete directory", () => {
  assertFailedAtomically(runLifecycle({ PLAVE_FAKE_DUMP_MODE: "data-fail" }));
});

test("zero-byte schema dump is rejected before publication", () => {
  assertFailedAtomically(runLifecycle({ PLAVE_FAKE_DUMP_MODE: "zero-schema" }));
});

test("incomplete aggregate snapshot is rejected before publication", () => {
  assertFailedAtomically(
    runLifecycle({ PLAVE_FAKE_DUMP_MODE: "incomplete-count-snapshot" }),
  );
});

test("checksum generation failure leaves no published backup", () => {
  assertFailedAtomically(runLifecycle({ PLAVE_FAKE_SHASUM_MODE: "fail" }));
});

test("manifest metadata failure leaves no published backup", () => {
  assertFailedAtomically(runLifecycle({ PLAVE_FAKE_STAT_MODE: "fail" }));
});

test("validator failure leaves no published backup", () => {
  assertFailedAtomically(runLifecycle({ PLAVE_FAKE_SHASUM_MODE: "corrupt" }));
});

test("completion output failure rolls back the renamed backup", () => {
  assertFailedAtomically(
    runLifecycle({ PLAVE_FAKE_PRINTF_MODE: "fail-completion" }),
  );
});

test("unsupported Supabase CLI version fails before creating a backup directory", () => {
  assertFailedAtomically(
    runLifecycle({ PLAVE_FAKE_SUPABASE_VERSION: "2.109.0" }),
    /^LOGICAL_DUMP_FAILED:PREFLIGHT:CLI_VERSION_UNSUPPORTED$/mu,
  );
});

test("Docker unavailable fails before creating a backup directory", () => {
  assertFailedAtomically(
    runLifecycle({ PLAVE_FAKE_DOCKER_MODE: "unavailable" }),
    /^LOGICAL_DUMP_FAILED:PREFLIGHT:DOCKER_UNAVAILABLE$/mu,
  );
});

test("dump container probe failure occurs before creating a backup directory", () => {
  assertFailedAtomically(
    runLifecycle({ PLAVE_FAKE_DOCKER_MODE: "container-fail" }),
    /^LOGICAL_DUMP_FAILED:PREFLIGHT:DOCKER_UNAVAILABLE$/mu,
  );
});

test("signal interruption cleans the exact incomplete directory", async () => {
  const harness = createHarness();
  let stdout = "";
  let stderr = "";
  try {
    const child = spawn("bash", [backupScript], {
      cwd: repositoryRoot,
      detached: true,
      env: { ...harness.env, PLAVE_FAKE_DUMP_MODE: "signal" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    const deadline = Date.now() + 3_000;
    while (
      Date.now() < deadline &&
      listBackupEntries(harness.backupRoot).length === 0
    ) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal(listBackupEntries(harness.backupRoot).length, 1);

    process.kill(-child.pid, "SIGTERM");
    const result = await new Promise((resolve) => {
      child.once("close", (code, signal) => resolve({ code, signal }));
    });
    assert.ok(result.code !== 0 || result.signal !== null);
    assertNoCredentialLeak(stdout + stderr);
    assert.doesNotMatch(stdout + stderr, /Backup ID:/u);
    assert.deepEqual(listBackupEntries(harness.backupRoot), []);
  } finally {
    rmSync(harness.fixtureDirectory, { recursive: true, force: true });
  }
});
