import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
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
  isReadOnlySqlCommand,
} from "../scripts/project004-remote-dev-audited-runner.ts";
import {
  loadAndVerifyMigrationPlan,
} from "../scripts/project004-remote-dev-guard.ts";
import {
  buildCanonicalPrefixSourceFingerprint,
  buildProject004PrefixSemanticFingerprintSql,
  comparePrefixSemanticFingerprints,
  parsePrefixSemanticFingerprint,
  prefixSemanticCategories,
  prefixSemanticFingerprintVersion,
} from "../scripts/project004-prefix-semantic-fingerprint.ts";
import {
  assessForwardRecoveryEligibility,
  buildForwardRecoveryPreconditionSql,
  classifyRecoveryExtraObject,
  loadPrefixSemanticManifest,
  parseForwardRecoveryPrecondition,
  verifyForwardRecoveryDryRunOutput,
} from "../scripts/project004-prefix-recovery-contract.ts";
import {
  createAuditedForwardRecoveryRunner,
  executeAuthorizedForwardRecovery,
} from "../scripts/project004-remote-forward-recovery.ts";
import {
  runProject004ForwardRecoveryCommand,
} from "../scripts/run-project004-remote-forward-recovery.ts";
import {
  runProject004PrefixRecoveryAuditCommand,
} from "../scripts/run-project004-prefix-recovery-audit.ts";
import type { SafeForeignObjectInspection } from "../scripts/inspect-project004-remote-foreign-object.ts";
import type { RemotePartialStateAuditReport } from "../scripts/project004-remote-partial-state-audit.ts";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function semanticOutput(overrides?: {
  category?: string;
  count?: number;
  sha256?: string;
}) {
  return prefixSemanticCategories
    .map((category, index) => {
      const selected = overrides?.category === category;
      return [
        prefixSemanticFingerprintVersion,
        category,
        selected ? (overrides.count ?? index + 1) : index + 1,
        selected
          ? (overrides.sha256 ?? hash(`changed-${category}`))
          : hash(category),
      ].join("|");
    })
    .join("\n") + "\n";
}

function incidentFixture(): RemotePartialStateAuditReport {
  return {
    ok: true,
    rootFailureCode: "REMOTE_PARTIAL_STATE_CONFIRMED",
    currentRunMutationPerformed: "NO",
    preexistingRemoteApplicationState: "YES",
    project004Canonical: "PASS",
    remoteIdentityGuard: "PASS",
    localMigrationChecksums: "PASS",
    baselineCounts: {
      platformBaselineObjects: 3709,
      plaveApplicationObjects: 189,
      foreignApplicationObjects: 1,
      authUserCount: 0,
      storageObjectCount: 0,
      migrationTableExists: 1,
      migrationHistoryCount: 38,
      plaveMigrationHistoryCount: 38,
      foreignMigrationHistoryCount: 0,
    },
    migration: {
      count: 38,
      firstLast: "0001/0038",
      contiguousPrefix: "PASS",
      prefixLast: "0038",
      missingMigrations: "0039,0040",
      foreignMigrations: 0,
      duplicateVersions: 0,
      outOfOrderVersions: "NOT_AVAILABLE",
      checksumDriftCount: "NOT_AVAILABLE",
      checksumMetadata: "NOT_AVAILABLE",
    },
    schema: {
      expectedForPrefix: 189,
      observedCanonical: 189,
      extraObjects: 1,
      missingObjects: 0,
      rlsPrivateBoundary: "PASS",
    },
    data: {
      authUsers: 0,
      storageObjects: 0,
      syntheticUsers: 0,
      curriculumCounts:
        "LEGACY:17/204/204;RELEASE:0/0/0/0",
      releaseState: "EMPTY",
      runtimeState: "false",
      pilotState: "DISABLED",
    },
    foreignClassification: "SUPABASE_AUTOMATIC_RLS",
    recoveryEligible: "NO",
    commandCounts: {
      projectList: 1,
      readOnlySql: 7,
      mutation: 0,
      unexpected: 0,
    },
    staticDryRunAudit: {
      dryRunArgvContract: "PASS",
      sanitizedDryRunArgvEvidence:
        "supabase/db/push/--dry-run",
      childProcessSequence: "PASS",
      dryRunOutputParser: "PASS",
      fallbackMutationPath: "NOT_FOUND",
      hiddenSchemaPushPath: "NOT_FOUND",
      priorCapturedArgv: "NOT_RECORDED",
    },
  };
}

const automaticRlsInspection: SafeForeignObjectInspection = {
  foreignObjectCount: 1,
  objectCategory: "ROUTINE",
  schemaCategory: "PUBLIC_APPLICATION_SURFACE",
  ownerCategory: "PLATFORM_SUPERUSER",
  extensionDependencyCount: 0,
  platformConfigurationProvenance:
    "SUPABASE_AUTOMATIC_RLS",
  automaticRlsProvenance: "YES",
  dataApiProvenance: "NO_DIRECT_CATALOG_DEPENDENCY",
  safeObjectIdentifier: "public.rls_auto_enable()",
  plaveMigrationConflict: "NO",
  matchingActiveEventTriggerCount: 1,
};

test("canonical prefix manifest is source-pinned but catalog-unverified", () => {
  const { plan, manifest } = loadPrefixSemanticManifest();
  assert.equal(
    manifest.canonicalSourceFingerprintSha256,
    buildCanonicalPrefixSourceFingerprint(plan, 38),
  );
  assert.equal(manifest.canonicalCatalogStatus, "UNVERIFIED");
  assert.equal(
    manifest.freshLocalIntegration.migration0039,
    "UNVERIFIED",
  );
  assert.equal(
    manifest.freshLocalIntegration.migration0040,
    "UNVERIFIED",
  );
  assert.equal(manifest.recoveryAuthorization, "NOT_AUTHORIZED");
});

test("semantic SQL covers structural, function, security, grant and extension categories without returning definitions", () => {
  const sql = buildProject004PrefixSemanticFingerprintSql();
  assert.equal(
    isReadOnlySqlCommand(["--command", sql]),
    true,
  );
  for (const token of [
    "pg_catalog.pg_attribute",
    "pg_catalog.pg_constraint",
    "pg_catalog.pg_index",
    "pg_catalog.pg_proc",
    "pg_catalog.pg_trigger",
    "pg_catalog.pg_policy",
    "pg_catalog.aclexplode",
    "relrowsecurity",
    "relforcerowsecurity",
    "provolatile",
    "prosecdef",
    "proconfig",
    "pg_catalog.pg_extension",
    "pg_catalog.pg_depend",
  ]) {
    assert.match(sql, new RegExp(token.replaceAll(".", "[.]"), "u"));
  }
  assert.doesNotMatch(sql, /dependency[.]objid::text/u);
  const finalProjection = sql.slice(
    sql.lastIndexOf("select concat_ws("),
  );
  assert.doesNotMatch(
    finalProjection,
    /pg_get_(?:functiondef|constraintdef|indexdef|triggerdef|expr)/u,
  );
  assert.match(
    finalProjection,
    /category,\s*row_count,\s*fingerprint/u,
  );
});

test("semantic output parser is order-independent and detects one-category drift", () => {
  const canonical = parsePrefixSemanticFingerprint(
    semanticOutput(),
  );
  const reordered = parsePrefixSemanticFingerprint(
    semanticOutput()
      .trim()
      .split("\n")
      .reverse()
      .join("\n") + "\n",
  );
  assert.deepEqual(reordered, canonical);
  assert.deepEqual(
    comparePrefixSemanticFingerprints(canonical, reordered),
    {
      matches: true,
      mismatchCount: 0,
      mismatchedCategories: [],
    },
  );
  const drifted = parsePrefixSemanticFingerprint(
    semanticOutput({ category: "POLICY" }),
  );
  const comparison = comparePrefixSemanticFingerprints(
    canonical,
    drifted,
  );
  assert.equal(comparison.matches, false);
  assert.equal(comparison.mismatchCount, 1);
  assert.deepEqual(comparison.mismatchedCategories, [
    "POLICY",
  ]);
});

test("extra object is baseline only for the exact Automatic RLS provenance", () => {
  assert.equal(
    classifyRecoveryExtraObject({
      extraObjectCount: 1,
      inspection: automaticRlsInspection,
    }),
    "PLATFORM_BASELINE_SUPABASE_AUTOMATIC_RLS",
  );
  assert.equal(
    classifyRecoveryExtraObject({
      extraObjectCount: 1,
      inspection: {
        ...automaticRlsInspection,
        matchingActiveEventTriggerCount: 0,
      },
    }),
    "FOREIGN_OR_UNVERIFIED",
  );
  assert.equal(
    classifyRecoveryExtraObject({
      extraObjectCount: 2,
      inspection: automaticRlsInspection,
    }),
    "FOREIGN_OR_UNVERIFIED",
  );
});

test("eligibility requires semantic equality, platform provenance, local 0039/0040 integration and forward preconditions", () => {
  const input = {
    incident: incidentFixture(),
    semanticFingerprintMatches: true,
    semanticMismatchCount: 0,
    extraObjectClassification:
      "PLATFORM_BASELINE_SUPABASE_AUTOMATIC_RLS" as const,
    forwardPreconditionsPass: true,
    migration0039FreshLocalPass: true,
    migration0040FreshLocalPass: true,
  };
  const eligible = assessForwardRecoveryEligibility(input);
  assert.equal(eligible.eligible, true);
  assert.equal(eligible.effectiveExtraObjectCount, 0);

  for (const patch of [
    { semanticFingerprintMatches: false },
    {
      extraObjectClassification:
        "FOREIGN_OR_UNVERIFIED" as const,
    },
    { forwardPreconditionsPass: false },
    { migration0039FreshLocalPass: false },
    { migration0040FreshLocalPass: false },
  ]) {
    assert.equal(
      assessForwardRecoveryEligibility({
        ...input,
        ...patch,
      }).eligible,
      false,
    );
  }
});

test("forward precondition contract is read-only and fails on every future marker or active row", () => {
  const sql = buildForwardRecoveryPreconditionSql();
  assert.equal(
    isReadOnlySqlCommand(["--command", sql]),
    true,
  );
  const pass = parseForwardRecoveryPrecondition(
    "FORWARD_PRECONDITION_V1|0|0|0|0|0|0|0\n",
  );
  assert.equal(pass.pass, true);
  for (let index = 0; index < 7; index += 1) {
    const values = Array.from({ length: 7 }, () => 0);
    values[index] = 1;
    assert.equal(
      parseForwardRecoveryPrecondition(
        `FORWARD_PRECONDITION_V1|${values.join("|")}\n`,
      ).pass,
      false,
    );
  }
});

test("forward dry-run accepts exactly 0039 then 0040 and rejects prefix, seed or reordering", () => {
  const { plan } = loadAndVerifyMigrationPlan();
  const migration0039 = plan.migrations[38];
  const migration0040 = plan.migrations[39];
  const valid = [
    migration0039?.file,
    migration0040?.file,
  ].join("\n");
  assert.deepEqual(
    verifyForwardRecoveryDryRunOutput(valid, plan),
    {
      count: 2,
      first: "0039",
      last: "0040",
    },
  );
  for (const invalid of [
    `${plan.migrations[37]?.file}\n${valid}`,
    `${migration0040?.file}\n${migration0039?.file}`,
    `${valid}\nseed.sql`,
    migration0039?.file ?? "",
  ]) {
    assert.throws(() =>
      verifyForwardRecoveryDryRunOutput(invalid, plan),
    );
  }
});

test("forward audited runner permits one verified schema push and one exact content transaction only", () => {
  const directory = mkdtempSync(
    join(tmpdir(), "project004-forward-gate-"),
  );
  const contentPath = join(directory, "content.sql");
  const content = "begin;\nselect 1;\ncommit;\n";
  writeFileSync(contentPath, content, {
    encoding: "utf8",
    mode: 0o600,
  });
  try {
    const delegated: string[] = [];
    const audited = createAuditedForwardRecoveryRunner({
      delegate: (command, args) => {
        delegated.push(`${command}:${args.join(" ")}`);
        return { ok: true, stdout: "", stderr: "" };
      },
      contentPath,
      contentSha256: hash(content),
    });
    const environment: NodeJS.ProcessEnv = {
      NODE_ENV: "test",
    };
    assert.equal(
      audited.runner(
        "supabase",
        ["db", "push"],
        environment,
      ).ok,
      false,
    );
    assert.equal(
      audited.runner(
        "supabase",
        ["db", "push", "--dry-run"],
        environment,
      ).ok,
      true,
    );
    audited.confirmDryRun();
    assert.equal(
      audited.runner(
        "supabase",
        ["db", "push"],
        environment,
      ).ok,
      true,
    );
    assert.equal(
      audited.runner(
        "psql",
        [
          "--no-psqlrc",
          "--quiet",
          "--set",
          "ON_ERROR_STOP=1",
          "--file",
          contentPath,
        ],
        environment,
      ).ok,
      true,
    );
    assert.equal(
      audited.runner(
        "supabase",
        ["db", "push"],
        environment,
      ).ok,
      false,
    );
    assert.equal(audited.counts.dryRun, 1);
    assert.equal(audited.counts.schemaPush, 1);
    assert.equal(audited.counts.contentTransaction, 1);
    assert.equal(audited.counts.mutation, 4);
    assert.equal(audited.counts.unexpected, 2);
    assert.equal(delegated.length, 3);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("unverified canonical manifest stops forward recovery before prompt, remote command or mutation", () => {
  let promptCount = 0;
  let executeCount = 0;
  const command = runProject004ForwardRecoveryCommand({
    argv: ["--owner-approved-forward-recovery"],
    prompt: () => {
      promptCount += 1;
      return { ok: true, value: "not-used" };
    },
    execute: (options) => {
      executeCount += 1;
      return executeAuthorizedForwardRecovery(options);
    },
  });
  assert.equal(command.exitCode, 1);
  assert.equal(promptCount, 0);
  assert.equal(executeCount, 0);
  assert.match(
    command.output,
    /ROOT_FAILURE_CODE=PREFIX_RECOVERY_NOT_VERIFIED/u,
  );
  assert.match(
    command.output,
    /CURRENT_RUN_MUTATION_PERFORMED=NO/u,
  );
  assert.match(command.output, /SCHEMA_PUSH_ATTEMPTS=0/u);
});

test("forward recovery executable is not exposed as an npm mutation command while eligibility is unverified", () => {
  const packageJson = JSON.parse(
    readFileSync("package.json", "utf8"),
  ) as { scripts?: Record<string, string> };
  assert.equal(
    packageJson.scripts?.["remote-dev:forward-recovery"],
    undefined,
  );
  const result = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      "scripts/run-project004-remote-forward-recovery.ts",
      "--owner-approved-forward-recovery",
    ],
    {
      cwd: process.cwd(),
      env: {
        NODE_ENV: "test",
        PATH: process.env.PATH,
      },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10_000,
    },
  );
  assert.equal(result.status, 1);
  assert.match(
    result.stdout,
    /ROOT_FAILURE_CODE=PREFIX_RECOVERY_NOT_VERIFIED/u,
  );
  assert.match(
    result.stdout,
    /CURRENT_RUN_MUTATION_PERFORMED=NO/u,
  );
  assert.doesNotMatch(
    result.stdout,
    /(?:password|token|key|project reference)/iu,
  );
});

test("fresh local canonical capture is disposable-only, excludes Owner port, and is not executed by the default suite", () => {
  const source = readFileSync(
    "scripts/run-project004-prefix-fresh-local-integration.ts",
    "utf8",
  );
  assert.match(
    source,
    /PLAVE_PROJECT004_DISPOSABLE_PREFIX_DB !== "YES"/u,
  );
  assert.match(source, /parsed[.]port === "54322"/u);
  assert.match(
    source,
    /plave_project004_prefix_\[a-z0-9_\]\+/u,
  );
  assert.match(
    source,
    /plan[.]migrations[.]slice\(0, 38\)/u,
  );
  assert.match(
    source,
    /plan[.]migrations[.]slice\(38\)/u,
  );
  assert.match(
    source,
    /DISPOSABLE_DATABASE_MUST_BE_DISCARDED=YES/u,
  );
  const packageJson = JSON.parse(
    readFileSync("package.json", "utf8"),
  ) as { scripts?: Record<string, string> };
  assert.equal(
    Object.values(packageJson.scripts ?? {}).some((command) =>
      command.includes(
        "run-project004-prefix-fresh-local-integration.ts",
      ),
    ),
    false,
  );
});

test("prefix recovery audit command uses secure prompts and renders only safe aggregate evidence", () => {
  const projectRef = "a".repeat(20);
  const password = "x".repeat(20);
  const values = [projectRef, password];
  const labels: string[] = [];
  const command = runProject004PrefixRecoveryAuditCommand({
    prompt: (label) => {
      labels.push(label);
      return { ok: true, value: values.shift() ?? "" };
    },
    execute: () => ({
      ok: true,
      rootFailureCode:
        "CANONICAL_SEMANTIC_FINGERPRINT_UNVERIFIED",
      currentRunMutationPerformed: "NO",
      preexistingRemoteApplicationState: "YES",
      incident: incidentFixture(),
      canonicalSemanticFingerprint: "UNVERIFIED",
      remoteSemanticFingerprint: "NOT_RUN",
      semanticMismatchCount: "NOT_RUN",
      extraObjectClassification:
        "PLATFORM_BASELINE_SUPABASE_AUTOMATIC_RLS",
      forwardPreconditions: "PASS",
      migration0039FreshLocal: "UNVERIFIED",
      migration0040FreshLocal: "UNVERIFIED",
      partialStateRecoveryEligible: "NO",
      effectiveExtraObjectCount: 0,
      commandCounts: {
        projectList: 1,
        readOnlySql: 9,
        mutation: 0,
        unexpected: 0,
      },
    }),
  });
  assert.equal(command.exitCode, 0);
  assert.deepEqual(labels, [
    "Project004 remote project reference: ",
    "Project004 remote database password: ",
  ]);
  assert.match(
    command.output,
    /EXTRA_OBJECT_CLASSIFICATION=PLATFORM_BASELINE_SUPABASE_AUTOMATIC_RLS/u,
  );
  assert.match(
    command.output,
    /PARTIAL_STATE_RECOVERY_ELIGIBLE=NO/u,
  );
  assert.match(
    command.output,
    /CURRENT_RUN_MUTATION_PERFORMED=NO/u,
  );
  assert.doesNotMatch(
    command.output,
    new RegExp(`${projectRef}|${password}`, "u"),
  );
});

test("npm prefix recovery audit smoke stops at unavailable TTY before remote access", () => {
  const result = spawnSync(
    "npm",
    ["run", "--silent", "remote-dev:prefix-recovery-audit"],
    {
      cwd: process.cwd(),
      env: {
        NODE_ENV: "test",
        PATH: process.env.PATH,
      },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10_000,
    },
  );
  assert.equal(result.status, 1);
  assert.match(
    result.stdout,
    /ROOT_FAILURE_CODE=SECURE_TTY_UNAVAILABLE/u,
  );
  assert.match(
    result.stdout,
    /CURRENT_RUN_MUTATION_PERFORMED=NO/u,
  );
  assert.match(result.stdout, /MUTATION_COMMAND_COUNT=0/u);
});
