import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  assertDisposableMigrationWorkspaceSmokeMarker,
  cleanupPreparedDisposableMigrationWorkspace,
  clearDisposableMigrationWorkspaceSmokeMarker,
  prepareDisposableMigrationWorkspace,
} from "../scripts/project004-disposable-migration-workspace.ts";
import {
  parseRuntimeMigrationBoundaryOutput,
  renderDisposableProofFailure,
} from "../scripts/run-project004-clean-disposable-proof.ts";

const root = resolve(import.meta.dirname, "..");

test("historical workspace keeps its exact 0001-0040 prefix after validating canonical 0001-0044", () => {
  const prepared = prepareDisposableMigrationWorkspace({
    candidateRoot: root,
    projectId:
      "plave-project004-clean-proof-111111111111",
    ports: {
      api: 61101,
      database: 61102,
      shadow: 61103,
      pooler: 61104,
      studio: 61105,
      mail: 61106,
      analytics: 61107,
    },
  });
  try {
    assert.deepEqual(prepared.report, {
      sourceDiscoveredCount: 40,
      sourceParsedCount: 40,
      sourceFirst: "0001",
      sourceLast: "0040",
      sourceChecksums: "PASS",
      tempCopyCount: 40,
      tempParsedCount: 40,
      tempFirst: "0001",
      tempLast: "0040",
      tempChecksumMismatchCount: 0,
      expectedBoundary: "40/0001/0040",
      actualBoundary: "40/0001/0040",
      failedBoundarySubconditions: [],
      workspacePreparation: "PASS",
    });
    assert.equal(
      readdirSync(prepared.migrationsDirectory).length,
      40,
    );
    assert.equal(existsSync(prepared.workdir), true);
    assert.equal(
      prepared.root,
      root,
    );
    assert.equal(
      prepared.workdir.startsWith(root),
      false,
    );
    const sourceFilenames = readdirSync(
      resolve(root, "supabase/migrations"),
    ).sort();
    assert.equal(sourceFilenames.length, 44);
    assert.match(sourceFilenames[0] ?? "", /^0001_/u);
    assert.match(sourceFilenames.at(-1) ?? "", /^0044_/u);
    assert.deepEqual(
      readdirSync(prepared.migrationsDirectory).sort(),
      sourceFilenames.slice(0, 40),
    );
    const config = readFileSync(
      resolve(prepared.supabaseDirectory, "config.toml"),
      "utf8",
    );
    assert.match(
      config,
      /^project_id = "plave-project004-clean-proof-111111111111"$/mu,
    );
    assert.match(config, /^port = 61101$/mu);
  } finally {
    assert.equal(
      cleanupPreparedDisposableMigrationWorkspace(prepared),
      true,
    );
    assert.equal(existsSync(prepared.workdir), false);
  }
});

test("workspace failures are pre-execution while runtime history boundary failures report execution started", () => {
  const workspaceOutput = renderDisposableProofFailure({
    code: "DISPOSABLE_MIGRATION_WORKSPACE_BOUNDARY_INVALID",
    cleanup: "PASS",
  });
  assert.match(
    workspaceOutput,
    /MIGRATION_EXECUTION_STARTED=NO/u,
  );
  assert.match(
    workspaceOutput,
    /MIGRATION_LAST_PASS=NOT_RUN/u,
  );
  assert.match(
    workspaceOutput,
    /MIGRATION_FIRST_FAIL=NOT_RUN/u,
  );

  const runtimeOutput = renderDisposableProofFailure({
    code: "DISPOSABLE_RUNTIME_MIGRATION_HISTORY_BOUNDARY_INVALID",
    cleanup: "PASS",
    expectedBoundary: "40/0001/0040",
    actualBoundary: "INVALID/INVALID/INVALID",
    failedBoundarySubconditions: [
      "RUNTIME_HISTORY_PAYLOAD_ROW_UNIQUE",
    ],
  });
  assert.match(
    runtimeOutput,
    /MIGRATION_EXECUTION_STARTED=YES/u,
  );
  assert.match(
    runtimeOutput,
    /MIGRATION_LAST_PASS=UNVERIFIED/u,
  );
  assert.match(
    runtimeOutput,
    /FAILED_BOUNDARY_SUBCONDITION=RUNTIME_HISTORY_PAYLOAD_ROW_UNIQUE/u,
  );
  assert.doesNotMatch(
    runtimeOutput,
    /MIGRATION_FIRST_FAIL=0001/u,
  );
});

test("runtime boundary parser reads the payload row instead of the trailing psql row-count footer", () => {
  const alignedPsqlOutput = [
    " concat_ws",
    "-----------------------",
    " 40|0001|0040|40",
    "(1 row)",
    "",
  ].join("\n");
  assert.deepEqual(
    parseRuntimeMigrationBoundaryOutput(
      alignedPsqlOutput,
      true,
    ),
    {
      pass: true,
      count: 40,
      first: "0001",
      last: "0040",
      canonicalCount: 40,
      expectedBoundary: "40/0001/0040",
      actualBoundary: "40/0001/0040",
      failedSubconditions: [],
    },
  );
});

test("proof calls canonical workspace preparation and is smoke-marker locked before port or process work", () => {
  const proof = readFileSync(
    resolve(
      root,
      "scripts/run-project004-clean-disposable-proof.ts",
    ),
    "utf8",
  );
  assert.match(
    proof,
    /assertDisposableMigrationWorkspaceSmokeMarker[(]root[)]/u,
  );
  assert.match(
    proof,
    /prepareDisposableMigrationWorkspace[(]/u,
  );
  assert.ok(
    proof.indexOf(
      "assertDisposableMigrationWorkspaceSmokeMarker(root)",
    ) <
      proof.indexOf("reserveDisposablePorts()"),
  );
  assert.doesNotMatch(
    proof,
    /copyCanonicalMigrationInventory/u,
  );
  assert.doesNotMatch(proof, /copyFileSync/u);
  assert.doesNotMatch(
    proof,
    /parseCanonicalMigrationFilename|auditCanonicalMigrationDirectory/u,
  );
  assert.doesNotMatch(
    proof,
    /\\[["']init["'],\\s*["']--workdir["']/u,
  );
});

test("Node 22 executable npm workspace smoke runs exact production preparation and unlocks only its matching marker", () => {
  assert.equal(process.versions.node.split(".")[0], "22");
  clearDisposableMigrationWorkspaceSmokeMarker(root);
  assert.throws(
    () =>
      assertDisposableMigrationWorkspaceSmokeMarker(root),
    /DISPOSABLE_WORKSPACE_SMOKE_REQUIRED/u,
  );
  const result = spawnSync(
    "npm",
    [
      "run",
      "--silent",
      "smoke:disposable-migration-workspace",
    ],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /SOURCE_DISCOVERED_COUNT=40/u,
  );
  assert.match(result.stdout, /SOURCE_PARSED_COUNT=40/u);
  assert.ok(
    result.stdout.includes(
      "SOURCE_FIRST_LAST=0001/0040",
    ),
  );
  assert.match(result.stdout, /SOURCE_CHECKSUMS=PASS/u);
  assert.match(result.stdout, /TEMP_COPY_COUNT=40/u);
  assert.match(result.stdout, /TEMP_PARSED_COUNT=40/u);
  assert.ok(
    result.stdout.includes(
      "TEMP_FIRST_LAST=0001/0040",
    ),
  );
  assert.match(
    result.stdout,
    /TEMP_CHECKSUM_MISMATCH_COUNT=0/u,
  );
  assert.ok(
    result.stdout.includes(
      "EXPECTED_BOUNDARY=40/0001/0040",
    ),
  );
  assert.ok(
    result.stdout.includes(
      "ACTUAL_BOUNDARY=40/0001/0040",
    ),
  );
  assert.match(
    result.stdout,
    /FAILED_BOUNDARY_SUBCONDITION=NONE/u,
  );
  assert.match(
    result.stdout,
    /WORKSPACE_PREPARATION=PASS/u,
  );
  assert.match(
    result.stdout,
    /TEMP_WORKSPACE_CLEANUP=PASS/u,
  );
  assert.doesNotThrow(() =>
    assertDisposableMigrationWorkspaceSmokeMarker(root),
  );
});
