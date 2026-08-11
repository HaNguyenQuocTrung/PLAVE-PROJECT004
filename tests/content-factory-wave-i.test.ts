import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { combinedWaveABCDEFGHGradePacks } from "../lib/content-factory/wave-h-packs.ts";
import { auditWaveI } from "../lib/content-factory/wave-i-audit.ts";
import { combinedWaveABCDEFGHIGradePacks, waveIGradeAudits, waveIPolicyCandidates } from "../lib/content-factory/wave-i-packs.ts";
import { buildWaveIReportRows, renderWaveIRemediationMarkdown } from "../lib/content-factory/wave-i-report.ts";

test("Wave I audit inventories only question-bearing A–H skills and resolves every action gap", () => {
  const audit = auditWaveI();
  assert.deepEqual(audit.totals, { grades: 9, questions: 1848, skills: 189, edges: 135, sourceEvidencedEdges: 0,
    contractDerivedEdges: 14, hypothesisEdges: 121, missingRemediationBefore: 58, missingRemediationAfter: 0,
    missingAdvanceBefore: 68, missingAdvanceAfter: 0, broadErrorMappingsBefore: 189, broadErrorMappingsAfter: 0,
    bridgeQuestions: 0, taxonomyCodes: 13, simulationStates: 90, simulationTransitions: 90,
    uniqueCanonicalPublicForms: 1848, errors: 0 });
  assert.deepEqual(audit.graph, { nodes: 575, edges: 183, cycles: 0, missingReferences: 0, forwardGradeDependencies: 0 });
  assert.equal(waveIGradeAudits.every((entry) => entry.remediationMap.every((map) => map.questionIds.length > 0)), true);
});

test("Wave I deterministic traversal covers retry, remediation, return, retention and fail-closed paths", () => {
  for (const row of auditWaveI().rows) {
    assert.deepEqual(row.simulation.checks, { singleErrorRetry: true, repeatedErrorRemediation: true, successfulReturn: true,
      correctContinuation: true, retentionHistoryPreserved: true, mixedPractice: true, unknownFailClosed: true,
      emptyPoolFailClosed: true, maximumTermination: true, alwaysValidNextAction: true, schoolGradeMutation: false,
      entitlementGrant: false, noSolutionLeakage: true });
    assert.equal(row.simulation.base.checks.startResumeIdempotency && row.simulation.base.checks.casConflict
      && row.simulation.base.checks.duplicateSubmit && row.simulation.base.checks.scoringXpMastery, true);
  }
});

test("Wave H remains frozen and Wave I adds policy-only hidden candidates", () => {
  assert.equal(buildDeterministicBundle(combinedWaveABCDEFGHGradePacks).bundleHash, "5e39cddd1c352409c02214902dac90bf95444c2ae0c80ffdb7b9d7090297cf2e");
  assert.equal(waveIPolicyCandidates.every((entry) => entry.bridgeQuestionCount === 0 && entry.release.publication === "DRAFT"
    && entry.release.visibility === "HIDDEN" && !entry.release.runtimeEnabled && !entry.release.pilotEnabled && !entry.release.retentionEnabled), true);
  assert.deepEqual(combinedWaveABCDEFGHIGradePacks.map((pack) => pack.questions.length), [312, 192, 192, 192, 192, 192, 192, 192, 192]);
});

test("Wave I policy and combined A–I bundles are stable and reports reconcile", () => {
  const audit = auditWaveI(); assert.equal(audit.policyBundleHash, "d7546888e1b67e179adc9193b1f8e4d9ab5602d3a453df291e9f9f3437bb4928");
  assert.equal(audit.combinedBundle.bundleHash, "12b4acc67db62701dc50b210e11d8db09fabe176647e325849e33620f109cb7c");
  assert.equal(canonicalize(audit.combinedBundle), canonicalize(buildDeterministicBundle([...combinedWaveABCDEFGHIGradePacks].reverse())));
  const rows = buildWaveIReportRows(); assert.deepEqual(JSON.parse(readFileSync("content/grade-packs/generated/wave-i-coverage.json", "utf8")).rows, rows);
  assert.equal(readFileSync("content/grade-packs/generated/wave-i-remediation-map.md", "utf8"), renderWaveIRemediationMarkdown(rows));
});

test("invocation boundary remains offline and preserves Wave F incident history", () => {
  const boundary = auditWaveI().invocationBoundary; assert.equal(boundary.status, "PASS");
  assert.equal(boundary.bareNpxInvocations + boundary.networkCapableNpmInvocations + boundary.waveGNetworkAttemptCount
    + boundary.waveHNetworkAttemptCount + boundary.waveINetworkAttemptCount, 0);
  assert.deepEqual(boundary.historicalIncidents, [{ sprint: "WAVE_F", kind: "REGISTRY_DNS_RESOLUTION_ATTEMPT",
    result: "ENOTFOUND_NO_DOWNLOAD_NO_REMOTE_DATA", rewritten: false }]);
});
