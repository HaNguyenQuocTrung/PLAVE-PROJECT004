import assert from "node:assert/strict";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  auditCanonicalMigrationFilenames,
  loadTrackedCanonicalMigrationInventory,
} from "../scripts/canonical-migration-inventory.ts";
import {
  canonicalTeacherInvitationProjectRef,
  loadProtectedDatabaseEnvironment,
  loadProtectedInvitationCode,
  parseOperatorArguments,
  runTeacherInvitationOperator,
  TeacherInvitationOperatorFailure,
  type SafePsqlRunner,
} from "../scripts/owner-teacher-invitation-operator.ts";

const ledger = { count: 45, first: "0001", last: "0045" } as const;

function failureCode(operation: () => unknown) {
  try {
    operation();
  } catch (error) {
    assert.ok(error instanceof TeacherInvitationOperatorFailure);
    return error.code;
  }
  assert.fail("Expected TeacherInvitationOperatorFailure");
}

function protectedFile(root: string, name: string, content: string) {
  const path = join(root, name);
  writeFileSync(path, `${content}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
}

function syntheticDatabaseUri() {
  const password = ["synthetic", "operator", "test", "only"].join("-");
  return [
    "postgresql://postgres.",
    canonicalTeacherInvitationProjectRef,
    ":",
    password,
    "@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require",
  ].join("");
}

function invitationCode() {
  return `PLV-TCH-${"A".repeat(32)}`;
}

test("canonical migration inventory is derived as exact contiguous 0001-0045", () => {
  const inventory = loadTrackedCanonicalMigrationInventory();
  assert.equal(inventory.ok, true);
  assert.equal(inventory.first, "0001");
  assert.equal(inventory.last, "0045");
  assert.equal(inventory.count, 45);
});

test("canonical migration audit rejects missing, duplicate and unexpected versions", () => {
  const valid = Array.from(
    { length: 45 },
    (_, index) =>
      `${String(index + 1).padStart(4, "0")}_migration_${String(index + 1)}.sql`,
  );
  assert.equal(auditCanonicalMigrationFilenames(valid).ok, true);
  const missing = valid.filter((name) => !name.startsWith("0012_"));
  assert.deepEqual(
    auditCanonicalMigrationFilenames(missing).missingVersions,
    ["0012"],
  );
  const duplicate = [...valid, "0012_duplicate.sql"];
  assert.deepEqual(
    auditCanonicalMigrationFilenames(duplicate).duplicateVersions,
    ["0012"],
  );
  assert.deepEqual(
    auditCanonicalMigrationFilenames(valid, [
      ...valid,
      "0046_untracked.sql",
    ]).unexpectedFiles,
    ["0046_untracked.sql"],
  );
});

test("Supabase seed contract is explicitly disabled without a dangling path", () => {
  const config = readFileSync("supabase/config.toml", "utf8");
  const section = /\[db[.]seed\]([\s\S]*?)(?=\n\[|$)/u.exec(config)?.[1] ?? "";
  assert.match(section, /^\s*enabled\s*=\s*false\s*$/mu);
  assert.match(section, /^\s*sql_paths\s*=\s*\[\]\s*$/mu);
  assert.doesNotMatch(section, /seed[.]sql/u);
});

test("credential and code files require absolute regular owner-only mode-600 files", () => {
  const root = mkdtempSync(join(tmpdir(), "plave-teacher-operator-files-"));
  try {
    const credential = protectedFile(root, "database", syntheticDatabaseUri());
    const code = protectedFile(root, "code", invitationCode());
    const environment = loadProtectedDatabaseEnvironment(
      credential,
      canonicalTeacherInvitationProjectRef,
    );
    assert.equal(environment.PGDATABASE, "postgres");
    assert.equal(environment.PGSSLMODE, "require");
    assert.equal(loadProtectedInvitationCode(code), invitationCode());

    chmodSync(credential, 0o640);
    assert.equal(
      failureCode(() =>
        loadProtectedDatabaseEnvironment(
          credential,
          canonicalTeacherInvitationProjectRef,
        ),
      ),
      "CREDENTIAL_FILE_INVALID",
    );
    chmodSync(credential, 0o600);
    const link = join(root, "database-link");
    symlinkSync(credential, link);
    assert.equal(
      failureCode(() =>
        loadProtectedDatabaseEnvironment(
          link,
          canonicalTeacherInvitationProjectRef,
        ),
      ),
      "CREDENTIAL_FILE_INVALID",
    );
    assert.equal(
      failureCode(() => loadProtectedInvitationCode("relative-code")),
      "CODE_FILE_INVALID",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function withOperatorFiles(
  operation: (files: { credentialFile: string; codeFile: string }) => void,
) {
  const root = mkdtempSync(join(tmpdir(), "plave-teacher-operator-run-"));
  try {
    operation({
      credentialFile: protectedFile(root, "database", syntheticDatabaseUri()),
      codeFile: protectedFile(root, "code", invitationCode()),
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("wrong project ref and expiry boundaries fail before any connection", () => {
  withOperatorFiles(({ credentialFile }) => {
    let calls = 0;
    const runner: SafePsqlRunner = () => {
      calls += 1;
      return { status: 0, stdout: "" };
    };
    assert.equal(
      failureCode(() =>
        runTeacherInvitationOperator(
          {
            command: "issue",
            projectRef: "wrong-project",
            credentialFile,
            expiresHours: 24,
            ledger,
          },
          runner,
        ),
      ),
      "PROJECT_REF_MISMATCH",
    );
    for (const expiresHours of [0, 169, 1.5]) {
      assert.equal(
        failureCode(() =>
          runTeacherInvitationOperator(
            {
              command: "issue",
              projectRef: canonicalTeacherInvitationProjectRef,
              credentialFile,
              expiresHours,
              ledger,
            },
            runner,
          ),
        ),
        "EXPIRY_INVALID",
      );
    }
    assert.equal(calls, 0);
  });
});

test("CLI parser rejects direct URI and password arguments without rejecting protected paths", () => {
  const protectedPath = "/absolute/private/plave-canonical-database-uri";
  assert.deepEqual(
    parseOperatorArguments([
      "issue",
      "--project-ref",
      canonicalTeacherInvitationProjectRef,
      "--credential-file",
      protectedPath,
      "--expires-hours",
      "24",
    ]),
    {
      command: "issue",
      projectRef: canonicalTeacherInvitationProjectRef,
      credentialFile: protectedPath,
      expiresHours: 24,
    },
  );
  assert.equal(
    failureCode(() =>
      parseOperatorArguments([
        "issue",
        "--project-ref",
        canonicalTeacherInvitationProjectRef,
        "--credential-file",
        syntheticDatabaseUri(),
        "--expires-hours",
        "24",
      ]),
    ),
    "DIRECT_CREDENTIAL_ARGUMENT_REJECTED",
  );
  assert.equal(
    failureCode(() =>
      parseOperatorArguments([
        "issue",
        "--password",
        "synthetic-only",
      ]),
    ),
    "DIRECT_CREDENTIAL_ARGUMENT_REJECTED",
  );
});

test("wrong database ledger or function contract blocks with zero mutation", () => {
  withOperatorFiles(({ credentialFile }) => {
    let mutationCalls = 0;
    const runner: SafePsqlRunner = (sql) => {
      if (sql.includes("PLAVE_TEACHER_INVITATION_GATE_V1")) {
        assert.match(sql, /current_database\(\) = 'postgres'/u);
        assert.match(sql, /count\(\*\) = 45/u);
        assert.match(sql, /version = '0012'/u);
        assert.match(sql, /private[.]issue_teacher_invitation/u);
        assert.match(sql, /relrowsecurity/u);
        return {
          status: 0,
          stdout: "PLAVE_TEACHER_INVITATION_GATE_V1|FAIL\n",
        };
      }
      mutationCalls += 1;
      return { status: 0, stdout: "" };
    };
    assert.equal(
      failureCode(() =>
        runTeacherInvitationOperator(
          {
            command: "issue",
            projectRef: canonicalTeacherInvitationProjectRef,
            credentialFile,
            expiresHours: 24,
            ledger,
          },
          runner,
        ),
      ),
      "REMOTE_TARGET_GATE_FAILED",
    );
    assert.equal(mutationCalls, 0);
  });
});

test("issue accepts only bounded expiry and returns one plaintext value", () => {
  withOperatorFiles(({ credentialFile }) => {
    const code = invitationCode();
    const runner: SafePsqlRunner = (sql) =>
      sql.includes("PLAVE_TEACHER_INVITATION_GATE_V1")
        ? {
            status: 0,
            stdout: "PLAVE_TEACHER_INVITATION_GATE_V1|PASS\n",
          }
        : { status: 0, stdout: `${code}\n` };
    for (const expiresHours of [1, 24, 168]) {
      const result = runTeacherInvitationOperator(
        {
          command: "issue",
          projectRef: canonicalTeacherInvitationProjectRef,
          credentialFile,
          expiresHours,
          ledger,
        },
        runner,
      );
      assert.equal(result.command, "issue");
      if (result.command === "issue") {
        assert.equal(result.invitationCode, code);
        assert.equal(result.expiresHours, expiresHours);
      }
    }
    const duplicateRunner: SafePsqlRunner = (sql) =>
      sql.includes("PLAVE_TEACHER_INVITATION_GATE_V1")
        ? {
            status: 0,
            stdout: "PLAVE_TEACHER_INVITATION_GATE_V1|PASS\n",
          }
        : { status: 0, stdout: `${code}\n${code}\n` };
    assert.equal(
      failureCode(() =>
        runTeacherInvitationOperator(
          {
            command: "issue",
            projectRef: canonicalTeacherInvitationProjectRef,
            credentialFile,
            expiresHours: 24,
            ledger,
          },
          duplicateRunner,
        ),
      ),
      "REMOTE_ISSUE_FAILED",
    );
  });
});

test("status reports only sanitized lifecycle state", () => {
  withOperatorFiles(({ credentialFile, codeFile }) => {
    for (const state of [
      "AVAILABLE",
      "CLAIMED",
      "REVOKED",
      "EXPIRED",
      "INVALID",
    ] as const) {
      const expiry = state === "INVALID" ? "NONE" : "2026-08-15T00:00:00Z";
      const runner: SafePsqlRunner = (sql) =>
        sql.includes("PLAVE_TEACHER_INVITATION_GATE_V1")
          ? {
              status: 0,
              stdout: "PLAVE_TEACHER_INVITATION_GATE_V1|PASS\n",
            }
          : {
              status: 0,
              stdout: `PLAVE_TEACHER_INVITATION_STATUS_V1|${state}|${expiry}|${state === "AVAILABLE" ? "YES" : "NO"}\n`,
            };
      const result = runTeacherInvitationOperator(
        {
          command: "status",
          projectRef: canonicalTeacherInvitationProjectRef,
          credentialFile,
          codeFile,
          ledger,
        },
        runner,
      );
      assert.equal(result.command, "status");
      if (result.command === "status") {
        assert.equal(result.state, state);
        assert.equal(result.usable, state === "AVAILABLE");
      }
    }
  });
});

test("revoke mutates AVAILABLE only and reports every no-op lifecycle", () => {
  withOperatorFiles(({ credentialFile, codeFile }) => {
    for (const outcome of [
      "REVOKED",
      "CLAIMED",
      "REVOKED_ALREADY",
      "EXPIRED",
      "INVALID",
    ] as const) {
      const runner: SafePsqlRunner = (sql) =>
        sql.includes("PLAVE_TEACHER_INVITATION_GATE_V1")
          ? {
              status: 0,
              stdout: "PLAVE_TEACHER_INVITATION_GATE_V1|PASS\n",
            }
          : {
              status: 0,
              stdout: `PLAVE_TEACHER_INVITATION_REVOKE_V1|${outcome}\n`,
            };
      const result = runTeacherInvitationOperator(
        {
          command: "revoke",
          projectRef: canonicalTeacherInvitationProjectRef,
          credentialFile,
          codeFile,
          ledger,
        },
        runner,
      );
      assert.deepEqual(result, { command: "revoke", outcome });
    }
  });
});

test("operator source rejects direct credentials and never emits secrets in failures", () => {
  const runner = readFileSync(
    "scripts/run-owner-teacher-invitation-operator.ts",
    "utf8",
  );
  const operator = readFileSync(
    "scripts/owner-teacher-invitation-operator.ts",
    "utf8",
  );
  assert.match(operator, /DIRECT_CREDENTIAL_ARGUMENT_REJECTED/u);
  assert.match(runner, /SECURE_TTY_REQUIRED/u);
  assert.equal(runner.match(/result[.]invitationCode/gu)?.length, 1);
  assert.doesNotMatch(operator, /env:\s*\{\s*[.][.][.]process[.]env/u);
  assert.doesNotMatch(
    `${runner}\n${operator}`,
    /process[.](?:stdout|stderr)[.]write\([^)]*(?:PGPASSWORD|credentialFile|databaseUrl|codeFile)/u,
  );
  assert.equal(
    failureCode(() =>
      loadProtectedDatabaseEnvironment(
        "/definitely/missing",
        canonicalTeacherInvitationProjectRef,
      ),
    ),
    "CREDENTIAL_FILE_INVALID",
  );
});
