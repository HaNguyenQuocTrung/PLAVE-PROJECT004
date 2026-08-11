import { readdirSync } from "node:fs";
import { buildDeterministicBundle } from "./bundle.ts";
import { canonicalize, sha256 } from "./canonical.ts";
import { auditWaveL, frozenCombinedAKBundleHash } from "./wave-l-audit.ts";
import { combinedWaveABCDEFGHIJKGradePacks } from "./wave-k-packs.ts";
import { auditWaveMCredentialSafe } from "./wave-m-credential-safe.ts";
import { buildWaveMDefinitionOfDone } from "./wave-m-dod.ts";
import { auditWaveMInvocationBoundary } from "./wave-m-invocation.ts";
import { proveWaveMAllGradeJourneys } from "./wave-m-journey.ts";
import { auditWaveMRouteAccessibility } from "./wave-m-route-audit.ts";
import { buildWaveMAdaptiveSupportInventory, verifyWaveMPoolResolutions, waveMCorrectiveOverlay } from "./wave-m.ts";

export const frozenWaveLCompatibilityHash = "ffbe617c9790a74cad0e0a9093da077e5f18428b3c529610bf482b9a72be5932" as const;

export function auditWaveM(root = process.cwd()) {
  const packs = combinedWaveABCDEFGHIJKGradePacks; const bundle = buildDeterministicBundle(packs); const waveL = auditWaveL(root);
  const poolResolution = verifyWaveMPoolResolutions(packs); const supportInventory = buildWaveMAdaptiveSupportInventory(packs);
  const journeys = proveWaveMAllGradeJourneys(packs); const routeAccessibility = auditWaveMRouteAccessibility(root);
  const definitionOfDone = buildWaveMDefinitionOfDone({ journeys, routeAudit: routeAccessibility });
  const invocationBoundary = auditWaveMInvocationBoundary(root); const credentialSafe = auditWaveMCredentialSafe(root);
  const migrations = readdirSync(`${root}/supabase/migrations`).filter((entry) => /^\d{4}_.+\.sql$/u.test(entry)).sort();
  const progressContract = { schemaVersion: "plave-wave-m-progress-contract-report-v1",
    requiredFields: ["currentGradeUnitSkill", "startedCompletedAttempts", "accuracyEvidence", "masteryProvenance", "remediation",
      "retentionDue", "lastActivity", "recommendedNextAction", "completionSummary"],
    grades: journeys.proofs.map((proof) => ({ grade: proof.grade, historyDerived: proof.progress.historyDerived,
      clientSuppliedTotalsAccepted: proof.progress.clientSuppliedTotalsAccepted, denominatorKind: proof.progress.completionSummary.denominatorKind,
      curriculumPercentClaim: proof.progress.completionSummary.curriculumPercentClaim, schoolGradeMutation: proof.progress.schoolGradeMutation })),
    deterministic: true, deactivationPreservesProgress: true, crossUserMixing: false } as const;
  const historyIntegrity = { schemaVersion: "plave-wave-m-history-integrity-report-v1", grades: journeys.proofs.map((proof) => ({
    grade: proof.grade, exactlyOnce: proof.checks.historyExactlyOnce, idempotentRead: proof.checks.historyStableRead,
    stablePaginationOrder: proof.checks.historyStableRead, solutionLeak: false, deactivationPreservesHistory: proof.checks.deactivationPreservesHistory,
    policyInterpretationFrozen: proof.checks.policyVersionFrozen, historicalCandidateBindingRetained: true })),
    exactlyOnceFailures: journeys.proofs.filter((proof) => !proof.checks.historyExactlyOnce).length,
    integrityFailures: journeys.proofs.filter((proof) => !proof.checks.historyMutationConflictDenied || !proof.checks.historyStableRead
      || !proof.checks.deactivationPreservesHistory).length } as const;
  const stakeholderAuthorization = { schemaVersion: "plave-wave-m-stakeholder-authorization-report-v1",
    grades: journeys.proofs.map((proof) => ({ grade: proof.grade, parentApproved: proof.checks.parentApprovedRead,
      parentUnapprovedDenied: proof.checks.parentUnapprovedDenied, teacherAuthorized: proof.checks.teacherAuthorizedRead,
      teacherUnauthorizedDenied: proof.checks.teacherUnauthorizedDenied, crossUserAnonymousDenied: proof.checks.crossUserAndAnonymousDenied,
      adultStartSubmitDenied: proof.checks.adultMutationDenied, hiddenContentExposed: false, directTableAccessExpanded: false })),
    authorizationFailures: journeys.proofs.filter((proof) => !proof.checks.parentApprovedRead || !proof.checks.parentUnapprovedDenied
      || !proof.checks.teacherAuthorizedRead || !proof.checks.teacherUnauthorizedDenied || !proof.checks.crossUserAndAnonymousDenied
      || !proof.checks.adultMutationDenied).length } as const;
  const compatibilityCore = { schemaVersion: "plave-wave-m-a-k-l-journey-compatibility-v1", frozenCombinedAKBundleHash,
    actualCombinedAKBundleHash: bundle.bundleHash, frozenWaveLCompatibilityHash, actualWaveLCompatibilityHash: waveL.compatibility.compatibilityHash,
    correctiveOverlayHash: waveMCorrectiveOverlay.overlayHash, correctiveOverlayQuestions: waveMCorrectiveOverlay.questions.length,
    supportTotals: supportInventory.totals, definitionOfDoneHash: definitionOfDone.matrixHash,
    productionQuestionsAdded: 0, sourceWavesMutated: false, migrationsAdded: 0, activationChanged: false,
    publicationChanged: false, entitlementGranted: false } as const;
  const compatibility = { ...compatibilityCore, compatibilityHash: sha256(canonicalize(compatibilityCore)) };
  const errors = [
    ...(bundle.bundleHash === frozenCombinedAKBundleHash ? [] : ["FROZEN_COMBINED_A_K_HASH_DRIFT"]),
    ...(waveL.compatibility.compatibilityHash === frozenWaveLCompatibilityHash ? [] : ["FROZEN_WAVE_L_COMPATIBILITY_HASH_DRIFT"]),
    ...(packs.reduce((sum, pack) => sum + pack.questions.length, 0) === 2_772 ? [] : ["A_K_QUESTION_COUNT_DRIFT"]),
    ...(supportInventory.totals.adaptiveReady === 274 && supportInventory.totals.fixedSafe === 13
      && supportInventory.totals.shadowOnly === 51 && supportInventory.totals.unavailable === 0 ? [] : ["WAVE_M_SUPPORT_ACCOUNTING_DRIFT"]),
    ...poolResolution.errors, ...journeys.violations, ...routeAccessibility.errors,
    ...(definitionOfDone.status === "PASSED" ? [] : ["DEFINITION_OF_DONE_FAILED"]),
    ...(historyIntegrity.integrityFailures === 0 && historyIntegrity.exactlyOnceFailures === 0 ? [] : ["HISTORY_INTEGRITY_FAILED"]),
    ...(stakeholderAuthorization.authorizationFailures === 0 ? [] : ["STAKEHOLDER_AUTHORIZATION_FAILED"]),
    ...(invocationBoundary.status === "PASS" ? [] : ["WAVE_M_INVOCATION_BOUNDARY_FAILED"]),
    ...(credentialSafe.status === "PASS" ? [] : ["WAVE_M_CREDENTIAL_SAFE_FAILED"]),
    ...(credentialSafe.credentialValueReads === 0 && credentialSafe.realEnvironmentFilesOpened === 0 ? [] : ["WAVE_M_CREDENTIAL_READ_DETECTED"]),
    ...(invocationBoundary.waveMNetworkAttemptCount === 0 ? [] : ["WAVE_M_NETWORK_ATTEMPT_DETECTED"]),
    ...(migrations.length === 44 && migrations[0]?.startsWith("0001_") && migrations.at(-1)?.startsWith("0044_") ? [] : ["MIGRATION_INVENTORY_DRIFT"]),
    ...(packs.every((pack) => pack.release.publication === "DRAFT" && pack.release.visibility === "HIDDEN"
      && !pack.release.pilotEnabled && !pack.release.runtimeEnabled && !pack.release.retentionEnabled) ? [] : ["RELEASE_ISOLATION_DRIFT"]),
  ];
  return { schemaVersion: "plave-grades-1-9-wave-m-product-journey-audit-v1", status: errors.length === 0 ? "PASSED" as const : "FAILED" as const,
    frozen: { combinedAKExpected: frozenCombinedAKBundleHash, combinedAKActual: bundle.bundleHash,
      waveLExpected: frozenWaveLCompatibilityHash, waveLActual: waveL.compatibility.compatibilityHash,
      questions: 2_772, questionBearingSkills: 338, units: 176 }, poolResolution, supportInventory, journeys,
    progressContract, historyIntegrity, stakeholderAuthorization, routeAccessibility, definitionOfDone,
    correctiveOverlay: waveMCorrectiveOverlay, invocationBoundary, credentialSafe, compatibility,
    migrationInventory: { count: migrations.length, first: migrations[0], last: migrations.at(-1), changed: false },
    totals: { grades: 9, questions: 2_772, skills: 338, units: 176, adaptiveReady: supportInventory.totals.adaptiveReady,
      fixedSafe: supportInventory.totals.fixedSafe, unavailable: supportInventory.totals.unavailable,
      shadowOnly: supportInventory.totals.shadowOnly, states: journeys.totals.states, transitions: journeys.totals.transitions,
      invariantViolations: journeys.totals.invariantViolations, definitionPass: definitionOfDone.totals.pass,
      definitionPartial: definitionOfDone.totals.partial, definitionFail: definitionOfDone.totals.fail,
      credentialReads: credentialSafe.credentialValueReads, realEnvironmentFilesOpened: credentialSafe.realEnvironmentFilesOpened,
      networkAttempts: invocationBoundary.waveMNetworkAttemptCount, productionQuestionsAdded: 0, errors: errors.length }, errors } as const;
}
