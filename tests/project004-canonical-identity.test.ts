import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  assertProject004Workspace,
  auditProject004CanonicalReferences,
} from "../scripts/project004-identity.ts";

const root = resolve(new URL("..", import.meta.url).pathname);
const frozenPackageIdentity = `plave-project${"003"}@`;

test("canonical audit permits only archived frozen-project references", () => {
  assert.equal(assertProject004Workspace(root), root);
  const audit = auditProject004CanonicalReferences(root);
  assert.deepEqual(audit.operationalReferenceFiles, []);
  assert.ok(audit.archivedReferenceFiles.length > 0);
});

test("npm identity command never emits the frozen package identity", () => {
  const result = spawnSync("npm", ["run", "identity:check"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, new RegExp(frozenPackageIdentity));
  assert.match(result.stdout, /PROJECT004_CANONICAL=PASS/);
});

test("workspace guard fails closed for cwd, package, database and cache identity", () => {
  const temporaryRoot = mkdtempSync(
    join(tmpdir(), "plave-project004-identity-"),
  );
  try {
    assert.throws(
      () => assertProject004Workspace(temporaryRoot),
      /PROJECT004_IDENTITY:CWD_MISMATCH/,
    );

    const candidate = join(temporaryRoot, "PLAVE-PROJECT004");
    mkdirSync(join(candidate, "supabase"), { recursive: true });
    writeFileSync(
      join(candidate, "package.json"),
      JSON.stringify({ name: "wrong-project" }),
    );
    writeFileSync(
      join(candidate, "supabase/config.toml"),
      'project_id = "PLAVE-PROJECT004"\n',
    );
    writeFileSync(
      join(candidate, "next.config.ts"),
      '".next-owner-local-project004"\n',
    );
    assert.throws(
      () => assertProject004Workspace(candidate),
      /PROJECT004_IDENTITY:PACKAGE_MISMATCH/,
    );

    writeFileSync(
      join(candidate, "package.json"),
      JSON.stringify({ name: "plave-project004" }),
    );
    writeFileSync(
      join(candidate, "supabase/config.toml"),
      'project_id = "wrong-project"\n',
    );
    assert.throws(
      () => assertProject004Workspace(candidate),
      /PROJECT004_IDENTITY:LOCAL_DATABASE_MISMATCH/,
    );

    writeFileSync(
      join(candidate, "supabase/config.toml"),
      'project_id = "PLAVE-PROJECT004"\n',
    );
    writeFileSync(join(candidate, "next.config.ts"), '".next"\n');
    assert.throws(
      () => assertProject004Workspace(candidate),
      /PROJECT004_IDENTITY:CACHE_MISMATCH/,
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
