import assert from "node:assert/strict";
import test from "node:test";
import { auditInvocationSource, auditOfflineInvocationBoundary, auditPackageScriptCommands } from "../lib/content-factory/offline-invocation.ts";

test("offline invocation boundary rejects bare package-runner fallback", () => {
  assert.deepEqual(auditPackageScriptCommands({ safe: "node scripts/local.ts", unsafe: "npx tsx scripts/local.ts" }).map((entry) => entry.code), ["BARE_NPX_FORBIDDEN"]);
  assert.deepEqual(auditInvocationSource("scripts/unsafe.ts", 'spawn("npx", ["tsx", "local.ts"]);').map((entry) => entry.code), ["PROGRAMMATIC_NPX_FORBIDDEN"]);
  assert.deepEqual(auditInvocationSource("scripts/install.ts", 'execSync("npm install package")').map((entry) => entry.code), ["NETWORK_CAPABLE_NPM_FORBIDDEN"]);
});

test("live Wave G invocation audit is offline, local-executable only and preserves Wave F history", () => {
  const report = auditOfflineInvocationBoundary();
  assert.equal(report.status, "PASS");
  assert.equal(report.offlineMode, true);
  assert.equal(report.bareNpxInvocations, 0);
  assert.equal(report.networkCapableNpmInvocations, 0);
  assert.equal(report.waveGNetworkAttemptCount, 0);
  assert.equal(report.localExecutables.every((entry) => entry.file && entry.executable), true);
  assert.deepEqual(report.historicalIncidents, [{ sprint: "WAVE_F", kind: "REGISTRY_DNS_RESOLUTION_ATTEMPT", result: "ENOTFOUND_NO_DOWNLOAD_NO_REMOTE_DATA", rewritten: false }]);
});
