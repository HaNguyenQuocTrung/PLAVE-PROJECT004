import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  isOwnerLocalPort,
  reserveDisposablePorts,
} from "../scripts/project004-disposable-port-reservation.ts";
import { buildDisposableConfig } from "../scripts/project004-disposable-migration-workspace.ts";
import {
  assertDisposableCleanupScope,
  classifyDisposableStartFailure,
} from "../scripts/run-project004-clean-disposable-proof.ts";

const root = resolve(import.meta.dirname, "..");

function canBindLoopback(port: number) {
  return new Promise<boolean>((resolveResult, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        resolveResult(false);
      } else {
        reject(error);
      }
    });
    server.listen(
      {
        host: "127.0.0.1",
        port,
        exclusive: true,
      },
      () => {
        server.close((error) => {
          if (error) reject(error);
          else resolveResult(true);
        });
      },
    );
  });
}

test("dynamic allocator holds seven distinct loopback ports until explicit release", async () => {
  const reservation = await reserveDisposablePorts();
  const values = Object.values(reservation.ports);
  try {
    assert.equal(values.length, 7);
    assert.equal(new Set(values).size, 7);
    assert.equal(values.some(isOwnerLocalPort), false);
    for (const port of values) {
      assert.equal(
        await canBindLoopback(port),
        false,
        `port ${port} must remain OS-reserved`,
      );
    }
  } finally {
    await reservation.release();
  }
  for (const port of values) {
    assert.equal(
      await canBindLoopback(port),
      true,
      `port ${port} must be released`,
    );
  }
});

test("generated disposable config uses one allocated set for every service port", () => {
  const generated = readFileSync(
    resolve(root, "supabase/config.toml"),
    "utf8",
  );
  const ports = {
    api: 61001,
    database: 61002,
    shadow: 61003,
    pooler: 61004,
    studio: 61005,
    mail: 61006,
    analytics: 61007,
  };
  const config = buildDisposableConfig(
    generated,
    "plave-project004-clean-proof-abcdef123456",
    ports,
  );
  for (const port of Object.values(ports)) {
    assert.match(config, new RegExp(`= ${String(port)}$`, "mu"));
  }
  assert.match(
    config,
    /\[db[.]seed\][\s\S]*?\nenabled\s*=\s*false/u,
  );
  assert.match(
    config,
    /\[realtime\][\s\S]*?\nenabled\s*=\s*false/u,
  );
  assert.match(
    config,
    /\[studio\][\s\S]*?\nenabled\s*=\s*false/u,
  );
  assert.match(
    config,
    /\[local_smtp\][\s\S]*?\nenabled\s*=\s*false/u,
  );
});

test("cleanup scope accepts only one disposable temp workdir and project id", () => {
  assert.doesNotThrow(() =>
    assertDisposableCleanupScope(
      join(
        tmpdir(),
        "plave-project004-clean-proof-unit",
      ),
      "plave-project004-clean-proof-abcdef123456",
    ),
  );
  assert.throws(
    () =>
      assertDisposableCleanupScope(
        root,
        "plave-project004-clean-proof-abcdef123456",
      ),
    /DISPOSABLE_CLEANUP_SCOPE_REJECTED/u,
  );
  assert.throws(
    () =>
      assertDisposableCleanupScope(
        join(
          tmpdir(),
          "plave-project004-clean-proof-unit",
        ),
        "PLAVE-PROJECT004",
      ),
    /DISPOSABLE_CLEANUP_SCOPE_REJECTED/u,
  );
});

test("failure classifier does not invent port collision evidence", () => {
  assert.equal(
    classifyDisposableStartFailure(
      "failed to start docker container: health check failed",
    ),
    "DISPOSABLE_START_LOCAL_SERVICE_START_FAILED_SQLSTATE_UNKNOWN",
  );
  assert.equal(
    classifyDisposableStartFailure(
      "failed to start docker container: bind: port is already allocated",
    ),
    "DISPOSABLE_START_DISPOSABLE_PORT_UNAVAILABLE_SQLSTATE_UNKNOWN",
  );
  assert.equal(
    classifyDisposableStartFailure(
      'ERROR: role "platform_role" does not exist (SQLSTATE 42704)',
    ),
    "DISPOSABLE_START_BASELINE_ROLE_MISSING_SQLSTATE_42704",
  );
});

test("proof runner contains no fixed proof ports and cleanup cannot use --all", () => {
  const source = readFileSync(
    resolve(
      root,
      "scripts/run-project004-clean-disposable-proof.ts",
    ),
    "utf8",
  );
  assert.doesNotMatch(source, /\b5632[0-9]\b/u);
  assert.doesNotMatch(source, /"stop"[\s\S]{0,500}"--all"/u);
  assert.match(
    source,
    /"stop"[\s\S]{0,500}"--project-id"[\s\S]{0,200}"--no-backup"/u,
  );
  assert.match(source, /await reservation[.]release[(][)]/u);
});

test("Node 22 strip-types allocator smoke starts without Docker or remote access", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      "scripts/run-project004-clean-disposable-proof.ts",
      "--allocator-smoke",
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        SUPABASE_ACCESS_TOKEN: "",
      },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout,
    "CLEAN_DISPOSABLE_ALLOCATOR_SMOKE=PASS\n" +
      "REMOTE_ACCESS_PERFORMED=NO\n" +
      "REMOTE_MUTATION_PERFORMED=NO\n",
  );
});
