import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  copyGeneratedPersistenceMigrationInventory,
  generatedPersistenceMigrationBoundary,
  loadGeneratedPersistenceMigrationInventory,
} from "../scripts/project004-generated-persistence-migration-inventory.ts";

test("generated persistence inventory pins 0001–0043 without changing the 0001–0042 baseline", () => {
  const inventory =
    loadGeneratedPersistenceMigrationInventory();
  assert.equal(inventory.entries.length, 43);
  assert.equal(inventory.entries[0]?.version, "0001");
  assert.equal(inventory.entries.at(-1)?.version, "0043");
  assert.equal(
    inventory.entries.find((entry) => entry.version === "0041")?.filename,
    generatedPersistenceMigrationBoundary.migration0041,
  );
  assert.equal(
    inventory.entries.find((entry) => entry.version === "0041")?.sha256,
    generatedPersistenceMigrationBoundary.migration0041Sha256,
  );
  assert.equal(inventory.entries.find((entry) => entry.version === "0042")?.filename, generatedPersistenceMigrationBoundary.migration0042);
  assert.equal(inventory.entries.find((entry) => entry.version === "0042")?.sha256, generatedPersistenceMigrationBoundary.migration0042Sha256);
  assert.equal(inventory.entries.at(-1)?.filename, generatedPersistenceMigrationBoundary.migration0043);
  assert.equal(inventory.entries.at(-1)?.sha256, generatedPersistenceMigrationBoundary.migration0043Sha256);
  const remotePlan = JSON.parse(
    readFileSync(
      "docs/operations/PROJECT004_REMOTE_DEV_MIGRATION_PLAN.json",
      "utf8",
    ),
  ) as { migrationCount: number; migrations: unknown[] };
  assert.equal(remotePlan.migrationCount, 40);
  assert.equal(remotePlan.migrations.length, 40);
});

test("all 43 migration copies are byte-identical", () => {
  const root = mkdtempSync(
    join(tmpdir(), "plave-project004-0041-inventory-"),
  );
  try {
    const audit =
      copyGeneratedPersistenceMigrationInventory(root);
    assert.deepEqual(audit, {
      sourceCount: 43,
      copyCount: 43,
      mismatchCount: 0,
      first: "0001",
      last: "0043",
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
