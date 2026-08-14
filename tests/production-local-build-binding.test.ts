import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  assertProductionLocalBuildBinding,
  writeProductionLocalBuildBinding,
} from "../scripts/production-local-build-binding.ts";

test("production-local build binding accepts only its exact public runtime source", () => {
  const fixture = mkdtempSync(join(tmpdir(), "plave-build-binding-"));
  try {
    writeProductionLocalBuildBinding(fixture, "VALIDATED_RUNTIME_FILE");
    assert.doesNotThrow(() =>
      assertProductionLocalBuildBinding(
        fixture,
        "VALIDATED_RUNTIME_FILE",
      ),
    );
    assert.throws(
      () =>
        assertProductionLocalBuildBinding(
          fixture,
          "EXPLICIT_ENVIRONMENT",
        ),
      /PRODUCTION_LOCAL_BUILD_RUNTIME_BINDING_INVALID/u,
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("production-local build binding fails closed when missing, malformed or extended", () => {
  const fixture = mkdtempSync(join(tmpdir(), "plave-build-binding-guard-"));
  try {
    assert.throws(
      () =>
        assertProductionLocalBuildBinding(
          fixture,
          "VALIDATED_RUNTIME_FILE",
        ),
      /PRODUCTION_LOCAL_BUILD_RUNTIME_BINDING_INVALID/u,
    );
    const binding = join(fixture, ".plave-public-runtime-binding.json");
    writeFileSync(binding, "{}\n", "utf8");
    assert.throws(
      () =>
        assertProductionLocalBuildBinding(
          fixture,
          "VALIDATED_RUNTIME_FILE",
        ),
      /PRODUCTION_LOCAL_BUILD_RUNTIME_BINDING_INVALID/u,
    );
    rmSync(binding);
    mkdirSync(binding);
    assert.throws(
      () =>
        assertProductionLocalBuildBinding(
          fixture,
          "VALIDATED_RUNTIME_FILE",
        ),
      /PRODUCTION_LOCAL_BUILD_RUNTIME_BINDING_INVALID/u,
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
