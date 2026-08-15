import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import {
  buildWaveMInputScope,
  WAVE_M_INPUT_SCOPE_VERSION,
} from "../lib/content-factory/wave-m-input-scope.ts";
import { auditWaveM } from "../lib/content-factory/wave-m-audit.ts";

function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), "plave-wave-m-scope-fixture-"));
  for (const directory of ["lib/content-factory", "scripts", "tests", "docs"] ) mkdirSync(join(root, directory), { recursive: true });
  writeFileSync(join(root, "lib/content-factory/wave-m-audit.ts"), "export const waveM = 1;\n", "utf8");
  writeFileSync(join(root, "scripts/build-content-factory-wave-m.ts"), "export const build = 1;\n", "utf8");
  writeFileSync(join(root, "tests/content-factory-wave-m-safe-execution.test.ts"), "export const testInput = 1;\n", "utf8");
  return root;
}

test("Wave M scope is explicit, versioned and independent of later out-of-scope files", () => {
  const root = fixtureRoot();
  try {
    const before = buildWaveMInputScope(root);
    assert.equal(before.scopeVersion, WAVE_M_INPUT_SCOPE_VERSION);
    assert.equal(before.inputCount, 3);
    writeFileSync(join(root, "docs/wave-n-later-file.md"), "outside declared Wave M inputs\n", "utf8");
    writeFileSync(join(root, "lib/content-factory/wave-n-later.ts"), "export const later = true;\n", "utf8");
    const after = buildWaveMInputScope(root);
    assert.equal(after.inputDigest, before.inputDigest);
    assert.deepEqual(after.inputs, before.inputs);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Wave M input digest changes when a declared input changes", () => {
  const root = fixtureRoot();
  try {
    const before = buildWaveMInputScope(root);
    const path = join(root, "lib/content-factory/wave-m-audit.ts");
    writeFileSync(path, `${readFileSync(path, "utf8")}export const changed = true;\n`, "utf8");
    const after = buildWaveMInputScope(root);
    assert.notEqual(after.inputDigest, before.inputDigest);
    assert.equal(after.inputCount, before.inputCount);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("two Wave M audits are byte-identical before artifact serialization", () => {
  const first = canonicalize(auditWaveM());
  const second = canonicalize(auditWaveM());
  assert.equal(second, first);
});
