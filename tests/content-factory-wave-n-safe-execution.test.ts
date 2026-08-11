import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { auditWaveLCredentialSource } from "../lib/content-factory/wave-l-credential-safe.ts";
import { buildWaveNFinalAudit, FROZEN_COMBINED_A_K_HASH, FROZEN_WAVE_L_HASH,
  FROZEN_WAVE_M_HASH, FROZEN_WAVE_M_OVERLAY_HASH, waveNScopeInventory } from "../lib/content-factory/wave-n.ts";
import { auditWaveNCredentialSafe } from "../lib/content-factory/wave-n-credential-safe.ts";
import { auditWaveNInvocationBoundary } from "../lib/content-factory/wave-n-invocation.ts";
import { renderWaveNArtifacts } from "../lib/content-factory/wave-n-report.ts";

const audit = buildWaveNFinalAudit();

test("WN-SCOPE-FREEZE: no blocker or critical defect is hidden by the scope classification", () => {
  assert.equal(waveNScopeInventory.filter((row) => String(row.classification) === "SUBMISSION_BLOCKER").length, 0);
  assert.equal(waveNScopeInventory.filter((row) => String(row.classification) === "CRITICAL_DEFECT").length, 0);
  assert.equal(audit.totals.submissionBlockers, 0); assert.equal(audit.totals.criticalDefects, 0); assert.deepEqual(audit.errors, []);
});

test("WN-OFFLINE-BOUNDARY: local-only invocation has zero new incidents", () => {
  const result = auditWaveNInvocationBoundary(); assert.equal(result.status, "PASS"); assert.deepEqual(result.diagnostics, []);
  assert.equal(result.bareNpxInvocations, 0); assert.equal(result.networkCapableInvocations, 0);
  assert.equal(result.waveNNetworkAttemptCount, 0); assert.equal(result.waveNCredentialReadCount, 0); assert.equal(result.waveNPort3000Operations, 0);
});

test("WN-CREDENTIAL-BOUNDARY: disposable audit opens no real environment or credential", () => {
  const result = auditWaveNCredentialSafe(); assert.equal(result.status, "PASS"); assert.deepEqual(result.diagnostics, []);
  assert.equal(result.credentialValueReads, 0); assert.equal(result.realEnvironmentFilesOpened, 0);
  assert.equal(result.providerEnvironmentVariablesInherited.length, 0); assert.equal(result.copiedIgnoredSecretFiles.length, 0);
});

test("WN-CREDENTIAL-REGRESSIONS: synthetic forbidden reads fail closed", () => {
  const credentialFixture = `const value = ${"process."}${"env."}${"GOOGLE_API_KEY"};`;
  const environmentFixture = `${"readFileSync"}('${".env."}${"local"}')`;
  assert.deepEqual(auditWaveLCredentialSource("synthetic-credential.ts", credentialFixture).map((row) => row.code), ["CREDENTIAL_ENV_VALUE_READ_FORBIDDEN"]);
  assert.deepEqual(auditWaveLCredentialSource("synthetic-environment.ts", environmentFixture).map((row) => row.code), ["REAL_ENV_FILE_OPEN_FORBIDDEN"]);
});

test("WN-SECURITY-PRIVACY: isolation, deny defaults and solution boundary remain closed", () => {
  const receipt = audit.securityPrivacy; assert.equal(receipt.status, "PASS"); assert.equal(receipt.serverOnlyEntitlements, true);
  assert.equal(receipt.denyAllDefaults, true); assert.equal(receipt.roleUserIsolation, true); assert.equal(receipt.directUrlApiFailClosed, true);
  assert.equal(receipt.solutionLeakage, false); assert.equal(receipt.directTablePrivilegeExpansion, false); assert.equal(receipt.dynamicSqlAdded, false);
  assert.equal(receipt.dependencyAudit.localVulnerabilityFindings, 0); assert.equal(receipt.dependencyAudit.freshRegistryQueryPerformed, false);
});

test("WN-UI-DEMO-TRUTH: final docs preserve hidden status and accepted limitations", () => {
  const docs = renderWaveNArtifacts(audit); const completion = docs["docs/final/PLAVE_FYP_COMPLETION.md"];
  const scope = docs["docs/final/PLAVE_SCOPE_AND_LIMITATIONS.md"]; const demo = docs["docs/final/PLAVE_DEMO_GUIDE.md"];
  assert.match(completion, /DRAFT\/HIDDEN/u); assert.match(scope, /PARTIAL/u); assert.match(scope, /UNKNOWN/u);
  assert.match(demo, /Do not claim Grades 2–9 publication/u); assert.match(demo, /keyboard|component\/route/iu);
});

test("WN-GENERATED-HANDOFF: historical freeze receipts remain exact after authorized additive integration", () => {
  const receipt = JSON.parse(readFileSync("content/grade-packs/generated/wave-n-final-release-receipt.json", "utf8"));
  assert.equal(receipt.combinedAKHash, FROZEN_COMBINED_A_K_HASH);
  assert.equal(receipt.waveLCompatibilityHash, FROZEN_WAVE_L_HASH);
  assert.equal(receipt.waveMCompatibilityHash, FROZEN_WAVE_M_HASH);
  assert.equal(receipt.waveMCorrectiveOverlayHash, FROZEN_WAVE_M_OVERLAY_HASH);
  assert.equal(receipt.sourceTreeDigest, "9a7555fd4a92c5545ba59ee4f190a040cc0631deff35a088a9afb24546c13855");
  assert.equal(receipt.receiptHash, "fa4eedfec30f999f6bcb88e6dc4ea972643f60b9c646cab4a7a094fb90edf6a5");
  assert.deepEqual(audit.errors, []);
});
