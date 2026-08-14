import assert from "node:assert/strict";
import { closeSync, mkdirSync, mkdtempSync, openSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";

import { createProductionLocalTemporaryRoot } from "../scripts/production-local-temporary-root.ts";

test("production-local temporary roots use the supplied platform temp directory", () => {
  const fixture = mkdtempSync(join(tmpdir(), "plave-production-temp-test-"));
  try {
    for (const platformDirectory of ["linux-tmp", "macos-tmp"]) {
      const temporaryParent = join(fixture, platformDirectory);
      mkdirSync(temporaryParent, { mode: 0o700 });
      const temporaryRoot = createProductionLocalTemporaryRoot(temporaryParent);
      assert.equal(dirname(temporaryRoot), temporaryParent);
      assert.match(basename(temporaryRoot), /^plave-production-local-/u);
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("production-local temporary roots fail closed for missing or non-directory parents", () => {
  const fixture = mkdtempSync(join(tmpdir(), "plave-production-temp-guard-"));
  try {
    assert.throws(
      () => createProductionLocalTemporaryRoot(join(fixture, "missing")),
      /PRODUCTION_LOCAL_TEMP_PARENT_INVALID/u,
    );
    const file = join(fixture, "not-a-directory");
    closeSync(openSync(file, "wx", 0o600));
    assert.throws(
      () => createProductionLocalTemporaryRoot(file),
      /PRODUCTION_LOCAL_TEMP_PARENT_INVALID/u,
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
