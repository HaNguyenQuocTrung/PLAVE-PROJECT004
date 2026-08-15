import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import test from "node:test";

import { finalLocalSourceInventory } from "../lib/release-integration/final-local-acceptance.ts";
import { captureCiRepositorySnapshot, compareCiRepositorySnapshots } from "../scripts/verify-ci-repository-immutability.ts";

const root = resolve(import.meta.dirname, "..");
const auditArtifact = resolve(root, "content/grade-packs/generated/wave-g-invocation-boundary.json");

function digest(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function auditEnvironment(offline: boolean) {
  return {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: tmpdir(),
    LANG: "C",
    LC_ALL: "C",
    TZ: "UTC",
    NODE_ENV: "test" as const,
    npm_config_offline: offline ? "true" : "false",
  } satisfies NodeJS.ProcessEnv;
}

function runAudit(offline: boolean) {
  return spawnSync(process.execPath, ["--no-warnings", "--experimental-strip-types", "scripts/audit-offline-invocation-boundary.ts"], {
    cwd: root,
    encoding: "utf8",
    env: auditEnvironment(offline),
    stdio: ["ignore", "pipe", "pipe"],
  });
}

test("offline dependency verification is read-only on success and failure", () => {
  const before = digest(auditArtifact);
  const success = runAudit(true);
  assert.equal(success.status, 0, success.stderr);
  assert.equal(digest(auditArtifact), before);
  const failure = runAudit(false);
  assert.notEqual(failure.status, 0);
  assert.equal(digest(auditArtifact), before);
});

test("concurrent offline verification cannot cross-write the canonical artifact", async () => {
  const before = digest(auditArtifact);
  const run = () => new Promise<number | null>((accept, reject) => {
    const child = spawn(process.execPath, ["--no-warnings", "--experimental-strip-types", "scripts/audit-offline-invocation-boundary.ts"], {
      cwd: root,
      env: auditEnvironment(true),
      stdio: "ignore",
    });
    child.once("error", reject);
    child.once("exit", accept);
  });
  assert.deepEqual(await Promise.all([run(), run()]), [0, 0]);
  assert.equal(digest(auditArtifact), before);
});

function initializeFixture(fileOrder: readonly string[]) {
  const fixture = mkdtempSync(resolve(tmpdir(), "plave-final-local-scope-"));
  for (const path of fileOrder) {
    const absolute = resolve(fixture, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, `fixture:${path}\n`, "utf8");
  }
  const init = spawnSync("/usr/bin/git", ["init", "--quiet"], { cwd: fixture, encoding: "utf8" });
  assert.equal(init.status, 0, init.stderr);
  const add = spawnSync("/usr/bin/git", ["add", "--", ...fileOrder], { cwd: fixture, encoding: "utf8" });
  assert.equal(add.status, 0, add.stderr);
  return fixture;
}

test("final-local source inventory is tracked-only and canonical across creation order", () => {
  const logical = ["README.md", "scripts/check.ts", "docs/current.md"];
  const first = initializeFixture(logical);
  const second = initializeFixture([...logical].reverse());
  try {
    const baseline = finalLocalSourceInventory(first);
    assert.equal(finalLocalSourceInventory(second).digest, baseline.digest);
    writeFileSync(resolve(first, "untracked-source.ts"), "untracked\n", "utf8");
    mkdirSync(resolve(first, ".next"), { recursive: true });
    writeFileSync(resolve(first, ".next/cache.json"), "ignored residue\n", "utf8");
    assert.equal(finalLocalSourceInventory(first).digest, baseline.digest);

    const trackedPath = resolve(first, "docs/current.md");
    writeFileSync(trackedPath, "declared input changed\n", "utf8");
    assert.notEqual(finalLocalSourceInventory(first).digest, baseline.digest);
  } finally {
    rmSync(first, { recursive: true, force: true });
    rmSync(second, { recursive: true, force: true });
  }
});

test("immutability comparison reports content, mode, untracked and generator mutations", () => {
  const fixture = initializeFixture(["README.md", "scripts/check.ts"]);
  try {
    const baseline = captureCiRepositorySnapshot(fixture);
    writeFileSync(resolve(fixture, "README.md"), "mutated\n", "utf8");
    chmodSync(resolve(fixture, "scripts/check.ts"), 0o755);
    writeFileSync(resolve(fixture, "unexpected.ts"), "residue\n", "utf8");
    const mutations = compareCiRepositorySnapshots(baseline, captureCiRepositorySnapshot(fixture));
    assert.deepEqual(mutations.map((entry) => `${entry.type}:${entry.path}`), [
      "TRACKED_CONTENT_CHANGED:README.md",
      "MODE_CHANGED:scripts/check.ts",
      "UNEXPECTED_UNTRACKED_SOURCE:unexpected.ts",
      "GENERATOR_INPUT_DIGEST_CHANGED:<final-local-input-digest>",
    ]);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
