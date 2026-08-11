import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { auditWaveLCredentialSource } from "../lib/content-factory/wave-l-credential-safe.ts";
import { auditWaveM } from "../lib/content-factory/wave-m-audit.ts";
import { auditWaveMCredentialSafe } from "../lib/content-factory/wave-m-credential-safe.ts";
import { auditWaveMInvocationBoundary } from "../lib/content-factory/wave-m-invocation.ts";

test("Wave M audit preserves A-K and Wave L hashes", () => {
  const audit = auditWaveM();
  assert.equal(audit.status, "PASSED"); assert.deepEqual(audit.errors, []);
  assert.equal(audit.frozen.combinedAKActual, "de5cff15605c2fd4d09bf06740db9475a9918d20396e9d06f5ec27200b362b1e");
  assert.equal(audit.frozen.waveLActual, "ffbe617c9790a74cad0e0a9093da077e5f18428b3c529610bf482b9a72be5932");
  assert.equal(audit.migrationInventory.count, 44); assert.equal(audit.totals.productionQuestionsAdded, 0);
});

test("offline invocation boundary has zero new incidents", () => {
  const audit = auditWaveMInvocationBoundary();
  assert.equal(audit.status, "PASS"); assert.equal(audit.waveMNetworkAttemptCount, 0); assert.equal(audit.waveMCredentialReadCount, 0);
  assert.equal(audit.bareNpxInvocations, 0); assert.equal(audit.networkCapableInvocations, 0); assert.deepEqual(audit.diagnostics, []);
  assert.ok(audit.localExecutables.every((entry) => entry.file && entry.executable));
});

test("credential audit uses disposable sanitized sources and opens no real environment file", () => {
  const audit = auditWaveMCredentialSafe();
  assert.equal(audit.status, "PASS"); assert.equal(audit.credentialValueReads, 0); assert.equal(audit.realEnvironmentFilesOpened, 0);
  assert.equal(audit.credentialValuesPrintedHashedMeasuredOrCompared, 0); assert.deepEqual(audit.providerEnvironmentVariablesInherited, []);
  assert.deepEqual(audit.copiedIgnoredSecretFiles, []); assert.deepEqual(audit.syntheticFixture.detections.sort(),
    ["CREDENTIAL_ENV_VALUE_READ_FORBIDDEN", "REAL_ENV_FILE_OPEN_FORBIDDEN"].sort());
});

test("synthetic regressions reject credential value reads and real local environment opens", () => {
  const credentialFixture = `const value = ${"process."}${"env."}${"GOOGLE_API_KEY"};`;
  const environmentFixture = `${"readFileSync"}('${".env."}${"local"}')`;
  assert.deepEqual(auditWaveLCredentialSource("synthetic-credential.ts", credentialFixture).map((entry) => entry.code),
    ["CREDENTIAL_ENV_VALUE_READ_FORBIDDEN"]);
  assert.deepEqual(auditWaveLCredentialSource("synthetic-environment.ts", environmentFixture).map((entry) => entry.code),
    ["REAL_ENV_FILE_OPEN_FORBIDDEN"]);
});

test("Wave M package scripts use verified local node execution", () => {
  const scripts = (JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> }).scripts;
  const commands = Object.entries(scripts).filter(([name]) => name.includes("wave-m")).map(([, command]) => command).join("\n");
  const bareRunner = new RegExp(`\\b${"n"}${"px"}\\b`, "u");
  assert.doesNotMatch(commands, bareRunner); assert.doesNotMatch(commands, /(?:install|update|registry|audit-online)/u);
  assert.match(commands, /npm_config_offline=true/u); assert.match(commands, /node --no-warnings --experimental-strip-types/u);
});

test("historical Wave M artifact preserves frozen compatibility while executable regressions stay green", () => {
  const audit = auditWaveM();
  const generated = JSON.parse(readFileSync("content/grade-packs/generated/wave-m-independent-audit.json", "utf8"));
  const documentation = readFileSync("docs/content-factory/WAVE_M.md", "utf8");
  assert.equal(audit.status, "PASSED");
  assert.equal(canonicalize(generated.compatibility), canonicalize(audit.compatibility));
  assert.equal(canonicalize(generated.frozen), canonicalize(audit.frozen));
  assert.deepEqual(generated.migrationInventory, { count: 44, first: "0001_auth_profiles.sql",
    last: "0044_motivation_level_streak_goals_achievements.sql", changed: false });
  assert.match(documentation, new RegExp(audit.frozen.combinedAKActual, "u"));
  assert.match(documentation, new RegExp(audit.frozen.waveLActual, "u"));
  assert.match(documentation, /FIXED_SAFE_SUPPORTED/u);
  assert.match(documentation, /exactly-once/u);
});
