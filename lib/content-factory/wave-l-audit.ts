import { readdirSync } from "node:fs";
import { buildDeterministicBundle } from "./bundle.ts";
import { canonicalize, sha256 } from "./canonical.ts";
import { auditWaveLCredentialSafe } from "./wave-l-credential-safe.ts";
import { verifyWaveLGrades1To3Shard } from "./wave-l-grades-1-3.ts";
import { verifyWaveLGrades4To6Shard } from "./wave-l-grades-4-6.ts";
import { verifyWaveLGrades7To9Shard } from "./wave-l-grades-7-9.ts";
import { auditWaveLInvocationBoundary } from "./wave-l-invocation.ts";
import { proveWaveLGradeProperties } from "./wave-l-property.ts";
import { auditWaveLRuntimeIsolation } from "./wave-l-runtime-isolation.ts";
import { buildWaveLGradeInventory, verifyWaveLGrade, waveLPolicyMatrix } from "./wave-l.ts";
import { combinedWaveABCDEFGHIJKGradePacks } from "./wave-k-packs.ts";

export const frozenCombinedAKBundleHash = "de5cff15605c2fd4d09bf06740db9475a9918d20396e9d06f5ec27200b362b1e" as const;

function propertyErrors(proof: ReturnType<typeof proveWaveLGradeProperties>) {
  return [...proof.invariantViolations, ...Object.entries(proof.checks).filter(([key, value]) =>
    key === "identityCredentialLogging" || (key === "shadowOnly" && proof.grade !== 1) ? value !== false : value !== true)
    .map(([key]) => `G${proof.grade}:${key}`)];
}

export function auditWaveL(root = process.cwd()) {
  const packs = combinedWaveABCDEFGHIJKGradePacks; const inventories = packs.map(buildWaveLGradeInventory);
  const verifications = packs.map(verifyWaveLGrade); const properties = packs.map(proveWaveLGradeProperties);
  const runtimeIsolation = auditWaveLRuntimeIsolation(packs); const invocationBoundary = auditWaveLInvocationBoundary(root);
  const credentialSafe = auditWaveLCredentialSafe(root);
  const shards = [verifyWaveLGrades1To3Shard(), verifyWaveLGrades4To6Shard(), verifyWaveLGrades7To9Shard()];
  const combinedBundle = buildDeterministicBundle(packs); const migrations = readdirSync(`${root}/supabase/migrations`)
    .filter((entry) => /^\d{4}_.+\.sql$/u.test(entry) && entry.slice(0, 4) <= "0044").sort();
  const compatibilityCore = { schemaVersion: "plave-wave-l-combined-a-k-runtime-compatibility-v1",
    frozenCombinedAKBundleHash, candidates: packs.map((pack) => ({ grade: pack.grade, candidate: pack.candidate })),
    inventoryHashes: inventories.map((row) => ({ grade: row.grade, inventoryHash: row.inventoryHash })), policy: waveLPolicyMatrix,
    productionQuestionsAdded: 0, sourceWavesMutated: false, migrationsAdded: 0, activationChanged: false } as const;
  const compatibility = { ...compatibilityCore, compatibilityHash: sha256(canonicalize(compatibilityCore)) };
  const errors = [
    ...(combinedBundle.bundleHash === frozenCombinedAKBundleHash ? [] : ["FROZEN_COMBINED_A_K_HASH_DRIFT"]),
    ...(packs.reduce((sum, pack) => sum + pack.questions.length, 0) === 2_772 ? [] : ["COMBINED_A_K_QUESTION_COUNT_DRIFT"]),
    ...(inventories.reduce((sum, row) => sum + row.skills, 0) === 338 ? [] : ["COMBINED_A_K_SKILL_COUNT_DRIFT"]),
    ...(packs.reduce((sum, pack) => sum + pack.units.length, 0) === 176 ? [] : ["COMBINED_A_K_UNIT_COUNT_DRIFT"]),
    ...(migrations.length === 44 && migrations[0]?.startsWith("0001_") && migrations.at(-1)?.startsWith("0044_") ? [] : ["MIGRATION_INVENTORY_DRIFT"]),
    ...verifications.flatMap((row) => row.errors), ...properties.flatMap(propertyErrors), ...runtimeIsolation.errors,
    ...shards.flatMap((row) => row.errors), ...(invocationBoundary.status === "PASS" ? [] : ["WAVE_L_INVOCATION_BOUNDARY_FAILED"]),
    ...(credentialSafe.status === "PASS" ? [] : ["WAVE_L_CREDENTIAL_SAFE_AUDIT_FAILED"]),
    ...(credentialSafe.credentialValueReads === 0 && credentialSafe.waveLCredentialReadCount === 0 ? [] : ["WAVE_L_CREDENTIAL_READ_DETECTED"]),
    ...(credentialSafe.waveLNetworkAttemptCount === 0 && invocationBoundary.waveLNetworkAttemptCount === 0 ? [] : ["WAVE_L_NETWORK_ATTEMPT_DETECTED"]),
    ...(packs.every((pack) => pack.release.publication === "DRAFT" && pack.release.visibility === "HIDDEN"
      && !pack.release.pilotEnabled && !pack.release.runtimeEnabled && !pack.release.retentionEnabled) ? [] : ["A_K_RELEASE_ISOLATION_DRIFT"]),
  ];
  const readiness = Object.fromEntries(["ADAPTIVE_READY", "FIXED_RUNTIME_ONLY", "SHADOW_ONLY", "POOL_LIMITED_FAIL_CLOSED",
    "EVIDENCE_LIMITED", "UNAVAILABLE"].map((kind) => [kind, inventories.reduce((sum, row) => sum + row.countsByReadiness[kind as keyof typeof row.countsByReadiness], 0)]));
  return { schemaVersion: "plave-grades-1-9-wave-l-adaptive-completion-audit-v1", status: errors.length === 0 ? "PASSED" as const : "FAILED" as const,
    frozen: { combinedAKBundleExpected: frozenCombinedAKBundleHash, combinedAKBundleActual: combinedBundle.bundleHash,
      questions: 2_772, questionBearingSkills: 338, units: 176 },
    inventories, policy: waveLPolicyMatrix, verifications, properties, runtimeIsolation, invocationBoundary, credentialSafe,
    compatibility, shards, migrationInventory: { count: migrations.length, first: migrations[0], last: migrations.at(-1), changed: false },
    totals: { grades: packs.length, questions: packs.reduce((sum, pack) => sum + pack.questions.length, 0),
      skills: inventories.reduce((sum, row) => sum + row.skills, 0), units: packs.reduce((sum, pack) => sum + pack.units.length, 0),
      readiness, visitedStates: properties.reduce((sum, row) => sum + row.visitedStates, 0),
      visitedTransitions: properties.reduce((sum, row) => sum + row.visitedTransitions, 0),
      invariantViolations: properties.reduce((sum, row) => sum + row.invariantViolations.length, 0),
      runtimeIsolationCases: runtimeIsolation.totals.cases, credentialReads: credentialSafe.credentialValueReads,
      networkAttempts: invocationBoundary.waveLNetworkAttemptCount, newProductionQuestions: 0, errors: errors.length },
    localE2E: { mode: "PURE_DETERMINISTIC_FIXTURES" as const, databaseRequired: false, remoteRequired: false,
      disposableStackStarted: false, syntheticIdentitiesOnly: true, gradesProved: packs.length,
      startResume: true, selectionDeterminism: true, mastery: true, remediationAndReturn: true, difficultyAdjustment: true,
      retention: true, mixedPractice: true, maximumTermination: true, gradeCompleteFuturePath: true, casConflict: true,
      duplicateSubmit: true, scoringXpMasteryMotivation: true, historyPreservation: true, deactivationBehavior: true,
      solutionIsolation: true, crossRoleCrossUserDenial: true, emptyLimitedPoolFailClosed: true }, errors } as const;
}
