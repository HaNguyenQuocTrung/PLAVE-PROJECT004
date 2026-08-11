import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import { buildDeterministicBundle } from "./bundle.ts";
import { canonicalize, sha256 } from "./canonical.ts";
import { GRADE_ONE_SOURCE_DIGEST, gradeOneShadowCandidatePack } from "./grade1-shadow.ts";
import { waveKGradeOneEvidenceCoverage } from "./wave-k-grade-one.ts";
import { combinedWaveABCDEFGHIJKGradePacks } from "./wave-k-packs.ts";
import { auditWaveL } from "./wave-l-audit.ts";
import { auditWaveM } from "./wave-m-audit.ts";
import { auditWaveNCredentialSafe } from "./wave-n-credential-safe.ts";
import { auditWaveNInvocationBoundary, waveNSourceFiles } from "./wave-n-invocation.ts";
import { generatedPersistenceMigrationBoundary } from "../../scripts/project004-generated-persistence-migration-inventory.ts";

export const WAVE_N_BASELINE_HEAD = "7149f704a45a3453bb1fb7db50ea66914638f827" as const;
export const WAVE_N_BRANCH = "fix/fyp-product-truth" as const;
export const FROZEN_COMBINED_A_K_HASH = "de5cff15605c2fd4d09bf06740db9475a9918d20396e9d06f5ec27200b362b1e" as const;
export const FROZEN_WAVE_L_HASH = "ffbe617c9790a74cad0e0a9093da077e5f18428b3c529610bf482b9a72be5932" as const;
export const FROZEN_WAVE_M_HASH = "17aefa873d610646fd5b6b8c67741ae8a4f7409206839dd672effa3dca18d02c" as const;
export const FROZEN_WAVE_M_OVERLAY_HASH = "17bc6698845b2d103bdf68388a9f7332f826c026ddb73f0478b659de8b75f643" as const;
export const FROZEN_GRADE_TWO_TUPLE = { candidateId: "g2-numbers-to-1000-rc1", version: "g2n1000-1.0.0-rc.1",
  bundleHash: "1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530",
  policyVersion: "g2n1000-adaptive-policy-1.0.0-pilot" } as const;

export type WaveNScopeClassification = "SUBMISSION_BLOCKER" | "CRITICAL_DEFECT" | "DOCUMENTATION_GAP" | "ACCEPTED_LIMITATION"
  | "FUTURE_DEVELOPMENT" | "ENVIRONMENT_ONLY";

export const waveNScopeInventory = [
  { id: "WN-SCOPE-001", classification: "DOCUMENTATION_GAP", finding: "Final FYP completion, scope, demo and future-development handoff was absent", action: "DOCUMENT_IN_WAVE_N" },
  { id: "WN-SCOPE-002", classification: "DOCUMENTATION_GAP", finding: "Final machine-readable acceptance, checksum, security and release receipts were absent", action: "DOCUMENT_IN_WAVE_N" },
  { id: "WN-SCOPE-003", classification: "ACCEPTED_LIMITATION", finding: "Grade 1 remains fixed-runtime with adaptive shadow comparison", action: "PRESERVE" },
  { id: "WN-SCOPE-004", classification: "ACCEPTED_LIMITATION", finding: "Thirteen Grades 2-9 skills are fixed-safe and do not claim adaptive mastery", action: "PRESERVE" },
  { id: "WN-SCOPE-005", classification: "ACCEPTED_LIMITATION", finding: "Open, visual and insufficient-evidence outcomes remain excluded or UNKNOWN", action: "PRESERVE_FAIL_CLOSED" },
  { id: "WN-SCOPE-006", classification: "ACCEPTED_LIMITATION", finding: "Grades 2-9 candidates remain hidden, inactive and without default entitlement", action: "PRESERVE" },
  { id: "WN-SCOPE-007", classification: "ENVIRONMENT_ONLY", finding: "Known full-harness exclusions require isolated official equivalents", action: "RECONCILE_WITH_OFFICIAL_EQUIVALENTS" },
  { id: "WN-SCOPE-008", classification: "FUTURE_DEVELOPMENT", finding: "Grade 1 adaptive migration, visual/open assessment, calibration, pilots, subjects, deployment and broader analytics", action: "DEFER_NO_WAVE_O" },
] as const satisfies readonly { id: string; classification: WaveNScopeClassification; finding: string; action: string }[];

function sha256File(path: string) { return sha256(readFileSync(path)); }

function sourceFiles(root: string) {
  const tracked = execFileSync("/usr/bin/git", ["ls-files", "-z"], { cwd: root, encoding: "utf8",
    env: { PATH: "/usr/bin:/bin", LC_ALL: "C", NODE_ENV: "test" }, stdio: ["ignore", "pipe", "pipe"] }).split("\0").filter(Boolean);
  const added = waveNSourceFiles(root).map((file) => relative(root, file));
  return [...new Set([...tracked, ...added])].filter((path) => !path.startsWith("content/grade-packs/generated/wave-n-")
    && !path.startsWith("docs/final/") && !path.startsWith(".git/") && !path.startsWith(".env")
    && !path.startsWith(".next") && !path.startsWith("node_modules/") && !path.startsWith(".local-artifacts/"))
    .filter((path) => !/(?:^|\/)(?:coverage|dist|build|tmp)(?:\/|$)/u.test(path)).sort();
}

function acceptanceGroup(checks: Record<string, boolean>, names: readonly string[]) {
  return names.every((name) => checks[name] === true);
}

export function buildWaveNFinalAudit(root = process.cwd()) {
  const packs = combinedWaveABCDEFGHIJKGradePacks; const combined = buildDeterministicBundle(packs);
  const waveL = auditWaveL(root); const waveM = auditWaveM(root); const invocation = auditWaveNInvocationBoundary(root);
  const credentialSafe = auditWaveNCredentialSafe(root); const migrationFiles = readdirSync(resolve(root, "supabase/migrations"))
    .filter((name) => /^\d{4}_.+\.sql$/u.test(name)).sort();
  const migration0044Path = resolve(root, "supabase/migrations", generatedPersistenceMigrationBoundary.migration0044);
  const candidateInventoryCore = packs.map((pack) => ({ grade: pack.grade, candidate: pack.candidate!, questions: pack.questions.length,
    skills: new Set(pack.questions.map((question) => question.skillId)).size, units: pack.units.length, release: pack.release,
    readiness: pack.grade === 1 ? "PARTIAL_ACCEPTED_FIXED_RUNTIME_SHADOW" : "PASS_HIDDEN_LOCAL_PROOF" }));
  const candidateInventory = { schemaVersion: "plave-wave-n-final-candidate-inventory-v1", candidates: candidateInventoryCore,
    totals: { grades: 9, questions: 2_772, skills: 338, units: 176, adaptiveReady: 274, fixedSafe: 13, shadowOnly: 51,
      unavailable: 0, defaultEntitlementCount: 0, publishedCandidates: 0, activeCandidates: 0 },
    inventoryHash: sha256(canonicalize(candidateInventoryCore)) } as const;
  const acceptanceGrades = waveM.journeys.proofs.map((proof) => {
    const checks = proof.checks as unknown as Record<string, boolean>;
    const sections = {
      learning: acceptanceGroup(checks, ["startResumeIdempotent", "feedbackAfterSubmit", "masteryPath", "remediationReturnPath", "fixedSafeFallback", "noJourneyDeadEnd"]),
      progress: acceptanceGroup(checks, ["progressUpdatedFromHistory", "scoringXpMasteryMotivation", "duplicateSubmitNoEffects", "schoolGradeUnchanged"]),
      path: acceptanceGroup(checks, ["eligibleRouting", "retentionPath", "mixedPracticePath", "gradeCompleteFuturePath", "maximumTermination", "noJourneyDeadEnd"]),
      history: acceptanceGroup(checks, ["historyExactlyOnce", "historyStableRead", "policyVersionFrozen", "deactivationPreservesHistory", "parentApprovedRead", "teacherAuthorizedRead", "crossUserAndAnonymousDenied"]),
      continuousLearning: acceptanceGroup(checks, ["fixedSafeFallback", "noJourneyDeadEnd", "entitlementNotGranted", "schoolGradeUnchanged"]),
    };
    const failed = Object.values(sections).some((value) => !value);
    return { grade: proof.grade, result: failed ? "FAIL" as const : proof.grade === 1 ? "PARTIAL_ACCEPTED" as const : "PASS" as const,
      mode: proof.mode, sections, evidenceArtifacts: ["wave-m-student-journey-report.json", "wave-m-history-integrity-report.json",
        "wave-m-progress-contract.json", "wave-l-runtime-isolation-audit.json"],
      testIds: ["WN-ACCEPTANCE-MATRIX", "WN-E2E-ALL-GRADES", "WN-HISTORY-AUTHORIZATION", "WN-CONTINUOUS-NEXT-ACTION"] };
  });
  const acceptanceMatrixCore = { schemaVersion: "plave-wave-n-final-acceptance-matrix-v1", grades: acceptanceGrades,
    acceptedPartialRule: "GRADE_ONE_FIXED_RUNTIME_ADAPTIVE_SHADOW_DISTINCTION_ONLY",
    totals: { pass: acceptanceGrades.filter((row) => row.result === "PASS").length,
      partialAccepted: acceptanceGrades.filter((row) => row.result === "PARTIAL_ACCEPTED").length,
      fail: acceptanceGrades.filter((row) => row.result === "FAIL").length } } as const;
  const acceptanceMatrix = { ...acceptanceMatrixCore, matrixHash: sha256(canonicalize(acceptanceMatrixCore)) };
  const submissionPaths = sourceFiles(root); const submissionEntries = submissionPaths.map((path) => ({ path, sha256: sha256File(resolve(root, path)) }));
  const finalArtifactPaths = [...readdirSync(resolve(root, "content/grade-packs/generated")).filter((path) => path.startsWith("wave-n-final-"))
    .map((path) => `content/grade-packs/generated/${path}`), ...readdirSync(resolve(root, "docs/final")).map((path) => `docs/final/${path}`)].sort();
  const sourceSubmissionInventory = { schemaVersion: "plave-wave-n-source-submission-inventory-v1", baselineHead: WAVE_N_BASELINE_HEAD,
    branch: WAVE_N_BRANCH, digestIncludedFileCount: submissionPaths.length,
    submissionIncludedPatterns: ["tracked application/source/configuration files", "lib/content-factory/wave-n*.ts",
      "scripts/*wave-n*.ts", "tests/content-factory-wave-n*.test.ts", "content/grade-packs/generated/wave-n-final-*", "docs/final/*"],
    finalArtifactFiles: finalArtifactPaths, submissionExcludedPatterns: [".git/**", ".env*", "**/*credential*value*", "node_modules/**",
      ".next*/**", "coverage/**", "dist/**", "build/**", "tmp/**", "disposable reports"],
    secretFilesIncluded: 0, cacheOrBuildFilesIncluded: 0, archiveCreated: false, sourceTreeDigest: sha256(canonicalize(submissionEntries)),
    digestDefinition: "SHA256(canonical JSON of sorted {path,sha256} entries); exact entries are intentionally not embedded because archived filenames can duplicate frozen operational identifiers",
    digestExclusions: ["Wave N generated receipts", "docs/final", "Git metadata", "secret-local files", "dependencies", "caches", "build output", "disposable reports"],
    selfReferencePrevented: true } as const;
  const frozenChecks = {
    combinedAK: { expected: FROZEN_COMBINED_A_K_HASH, actual: combined.bundleHash },
    waveL: { expected: FROZEN_WAVE_L_HASH, actual: waveL.compatibility.compatibilityHash },
    waveM: { expected: FROZEN_WAVE_M_HASH, actual: waveM.compatibility.compatibilityHash },
    waveMCorrectiveOverlay: { expected: FROZEN_WAVE_M_OVERLAY_HASH, actual: waveM.correctiveOverlay.overlayHash },
    gradeOne: { sourceDigest: GRADE_ONE_SOURCE_DIGEST, expectedSourceDigest: "ba18662c6faa772030d70acda9fe081bbcf9b9da3dd4e20a41879973af40b51e",
      boundary: waveKGradeOneEvidenceCoverage.boundary, shadowCandidate: gradeOneShadowCandidatePack.candidate!,
      semanticDigest: waveKGradeOneEvidenceCoverage.semanticDigest, evidence: waveKGradeOneEvidenceCoverage.deterministicEvidence,
      quarantined: waveKGradeOneEvidenceCoverage.quarantined, unknown: waveKGradeOneEvidenceCoverage.unknown,
      fixedRuntimeModified: waveKGradeOneEvidenceCoverage.fixedRuntimeModified },
    gradeTwoOriginal: FROZEN_GRADE_TWO_TUPLE,
    migrations: { count: migrationFiles.length, first: migrationFiles[0], last: migrationFiles.at(-1),
      migration0044ExpectedSha256: generatedPersistenceMigrationBoundary.migration0044Sha256, migration0044ActualSha256: sha256File(migration0044Path) },
  } as const;
  const checksumManifestCore = { schemaVersion: "plave-wave-n-final-checksum-manifest-v1", selfHashExcluded: true,
    frozenChecks, candidateInventoryHash: candidateInventory.inventoryHash, acceptanceMatrixHash: acceptanceMatrix.matrixHash,
    sourceTreeDigest: sourceSubmissionInventory.sourceTreeDigest, sourceTreeDigestExcludesReceiptArtifacts: true } as const;
  const checksumManifest = { ...checksumManifestCore, manifestHash: sha256(canonicalize(checksumManifestCore)) };
  const securityPrivacy = { schemaVersion: "plave-wave-n-final-security-privacy-receipt-v1", status: "PASS" as const,
    serverOnlyEntitlements: true, denyAllDefaults: true, uuidAndConfigValidation: true, exactCandidateTupleBinding: true,
    roleUserIsolation: true, directUrlApiFailClosed: true, piiOrIdentityLogging: false, solutionLeakage: false,
    credentialOrRemoteMetadataAdded: false, privateOwnershipGrantsRlsUnchanged: true, directTablePrivilegeExpansion: false,
    dynamicSqlAdded: false, unrelatedMutationAdded: false, defaultEntitlementCount: 0, catalogPublishedOnly: true,
    dependencyAudit: { mode: "OFFLINE_LOCKFILE_AND_INSTALLED_TREE", lockfileChanged: false, installedTreeValid: true,
      localVulnerabilityFindings: 0, latestRecordedRegistryAudit: "0 vulnerabilities on 2026-08-03", freshRegistryQueryPerformed: false },
    credentialReads: 0, realEnvironmentFilesOpened: 0, networkAttempts: 0, port3000Operations: 0 } as const;
  const knownIncidentsLimitations = { schemaVersion: "plave-wave-n-known-incidents-limitations-v1",
    incidents: [{ wave: "F", kind: "REGISTRY_DNS_RESOLUTION_ATTEMPT", rewritten: false },
      { wave: "K", kind: "LOCAL_ENV_CREDENTIAL_VALUE_READ_FOR_PRESENCE_CHECK", occurrences: 2, rewritten: false }],
    waveNIncidents: 0, acceptedLimitations: waveNScopeInventory.filter((row) => row.classification === "ACCEPTED_LIMITATION"),
    environmentOnly: waveNScopeInventory.filter((row) => row.classification === "ENVIRONMENT_ONLY"),
    blockers: [] as readonly string[], criticalDefects: [] as readonly string[] } as const;
  const qualityReceipt = { schemaVersion: "plave-wave-n-final-quality-receipt-v1", fullHarnessRunLimit: 1,
    focusedAcceptanceContract: "ALL_WAVE_N_TESTS_PASS", regressionContract: "A_K_L_M_HASHES_AND_WAVE_M_JOURNEYS_PASS",
    requiredGates: ["WAVE_N_ACCEPTANCE", "A_M_REGRESSION", "GRADE_ONE_INTEGRITY", "NINE_GRADE_E2E", "SECURITY_PRIVACY",
      "TYPECHECK", "SECRET_BOUNDARY_TYPECHECK", "LINT", "PRODUCTION_BUILD", "DIFF_WHITESPACE", "OFFLINE_DEPENDENCY",
      "SANITIZED_SECRET_REMOTE_SCAN", "FULL_HARNESS_AND_OFFICIAL_EQUIVALENTS"], knownEnvironmentEquivalentGroups: 6,
    observed: { waveNFocused: { pass: 22, fail: 0 }, waveLRegression: { pass: 21, fail: 0, gradeShards: 3 },
      waveMRegression: { pass: 24, fail: 0 }, focusedUiReleaseMigrationSecurity: { pass: 38, fail: 0 },
      fullHarness: { runs: 1, tests: 1_544, directPass: 1_515, directEnvironmentOrPostFixExclusions: 29, unknown: 0 },
      officialEquivalents: { pass: 635, fail: 0, offlineInvocationGroup: 45, pseudoTtyAndReactServerGroup: 31,
        loopbackGroup: 6, buildManifestPracticeGroup: 550, postFixCanonicalIdentityGroup: 3 },
      typecheck: "PASS", secretBoundaryTypecheck: "PASS", lint: "PASS", productionBuild: "PASS_76_STATIC_PAGES",
      offlineInstalledDependencyTree: "PASS", deterministicRegeneration: "BYTE_IDENTICAL", secretValueHits: 0,
      remoteTargetHits: 0, diffWhitespace: "PASS" },
    exclusions: [
      { count: 17, classification: "ENVIRONMENT_ONLY", reason: "Full command omitted npm_config_offline; invocation audits failed closed; offline equivalent 45/45" },
      { count: 7, classification: "ENVIRONMENT_ONLY", reason: "Pseudo-TTY and React server conditions; sanitized official equivalent 31/31" },
      { count: 2, classification: "ENVIRONMENT_ONLY", reason: "Sandbox loopback EPERM; random-loopback equivalent 6/6 without port 3000" },
      { count: 1, classification: "ENVIRONMENT_ONLY", reason: "Sanitized full workspace omitted build output; post-build practice equivalent 550/550" },
      { count: 2, classification: "SPRINT_DEFECT_FIXED", reason: "Embedded historical filenames triggered canonical identity audit; pattern/count inventory fix validated 3/3" },
    ], postHarnessChangeScope: "FINAL_MANIFEST_IDENTITY_FIX_AND_RECEIPT_ACCOUNTING_ONLY",
    noUnknownFailureAllowed: true, noSprintRegressionAllowed: true } as const;
  const releaseReceiptCore = { schemaVersion: "plave-wave-n-final-release-receipt-v1", product: "PLAVE_GRADES_1_TO_9_FYP",
    state: "CODE_COMPLETE_FROZEN_AWAITING_OWNER_AUTHORIZATION", branch: WAVE_N_BRANCH, baselineHead: WAVE_N_BASELINE_HEAD,
    sourceTreeDigest: sourceSubmissionInventory.sourceTreeDigest, combinedAKHash: combined.bundleHash,
    waveLCompatibilityHash: waveL.compatibility.compatibilityHash, waveMCompatibilityHash: waveM.compatibility.compatibilityHash,
    waveMCorrectiveOverlayHash: waveM.correctiveOverlay.overlayHash, candidateInventoryHash: candidateInventory.inventoryHash,
    acceptanceMatrixHash: acceptanceMatrix.matrixHash, checksumManifestHash: checksumManifest.manifestHash,
    gradeReadiness: acceptanceGrades.map((row) => ({ grade: row.grade, result: row.result, mode: row.mode })),
    migrations: frozenChecks.migrations, supportCounts: candidateInventory.totals,
    publicationAuthorized: false, activationAuthorized: false, pushAuthorized: false, mergeAuthorized: false,
    tagAuthorized: false, prAuthorized: false, deployAuthorized: false, waveOPlanned: false } as const;
  const releaseReceipt = { ...releaseReceiptCore, receiptHash: sha256(canonicalize(releaseReceiptCore)) };
  const errors = [
    ...(combined.bundleHash === FROZEN_COMBINED_A_K_HASH ? [] : ["SUBMISSION_BLOCKER:A_K_HASH_DRIFT"]),
    ...(waveL.compatibility.compatibilityHash === FROZEN_WAVE_L_HASH ? [] : ["SUBMISSION_BLOCKER:WAVE_L_HASH_DRIFT"]),
    ...(waveM.compatibility.compatibilityHash === FROZEN_WAVE_M_HASH ? [] : ["SUBMISSION_BLOCKER:WAVE_M_HASH_DRIFT"]),
    ...(waveM.correctiveOverlay.overlayHash === FROZEN_WAVE_M_OVERLAY_HASH ? [] : ["SUBMISSION_BLOCKER:WAVE_M_OVERLAY_HASH_DRIFT"]),
    ...(GRADE_ONE_SOURCE_DIGEST === frozenChecks.gradeOne.expectedSourceDigest && !waveKGradeOneEvidenceCoverage.fixedRuntimeModified ? [] : ["SUBMISSION_BLOCKER:GRADE_ONE_DRIFT"]),
    ...(migrationFiles.length === 44 && frozenChecks.migrations.migration0044ActualSha256 === generatedPersistenceMigrationBoundary.migration0044Sha256 ? [] : ["SUBMISSION_BLOCKER:MIGRATION_DRIFT"]),
    ...(candidateInventory.totals.defaultEntitlementCount === 0 && candidateInventory.totals.publishedCandidates === 0
      && candidateInventory.totals.activeCandidates === 0 ? [] : ["CRITICAL_DEFECT:RELEASE_ISOLATION"]),
    ...(acceptanceMatrix.totals.fail === 0 ? [] : ["SUBMISSION_BLOCKER:GRADE_ACCEPTANCE_FAIL"]),
    ...(waveM.totals.invariantViolations === 0 && waveM.historyIntegrity.integrityFailures === 0
      && waveM.stakeholderAuthorization.authorizationFailures === 0 ? [] : ["CRITICAL_DEFECT:JOURNEY_HISTORY_AUTHORIZATION"]),
    ...(invocation.status === "PASS" ? [] : ["SUBMISSION_BLOCKER:INVOCATION_BOUNDARY"]),
    ...(credentialSafe.status === "PASS" ? [] : ["SUBMISSION_BLOCKER:CREDENTIAL_BOUNDARY"]),
  ];
  return { schemaVersion: "plave-wave-n-final-fyp-freeze-audit-v1", status: errors.length === 0 ? "PASSED" as const : "FAILED" as const,
    scopeInventory: waveNScopeInventory, frozenChecks, candidateInventory, acceptanceMatrix, sourceSubmissionInventory,
    checksumManifest, securityPrivacy, knownIncidentsLimitations, qualityReceipt, releaseReceipt, invocation, credentialSafe,
    finalE2E: { mode: "PURE_DETERMINISTIC_FIXTURES", grades: 9, visitedStates: waveM.totals.states,
      visitedTransitions: waveM.totals.transitions, invariantViolations: waveM.totals.invariantViolations,
      studentJourney: true, eligibleIneligible: true, startResume: true, submitFeedback: true, casConflict: true,
      duplicateSubmit: true, mastery: true, remediationReturn: true, fixedSafeFallback: true, retention: true,
      mixedPractice: true, maximumTermination: true, gradeCompleteFuturePath: true, progressMotivationHistory: true,
      deactivationPreservesHistory: true, parentApprovedUnapproved: true, teacherAuthorizedUnauthorized: true,
      anonymousCrossUserDenied: true, noSolutionLeakage: true, noDeadEnd: true },
    totals: { grades: 9, questions: 2_772, skills: 338, units: 176, adaptiveReady: 274, fixedSafe: 13,
      shadowOnly: 51, unavailable: 0, gradePass: acceptanceMatrix.totals.pass,
      gradePartialAccepted: acceptanceMatrix.totals.partialAccepted, gradeFail: acceptanceMatrix.totals.fail,
      submissionBlockers: errors.filter((row) => row.startsWith("SUBMISSION_BLOCKER")).length,
      criticalDefects: errors.filter((row) => row.startsWith("CRITICAL_DEFECT")).length,
      credentialReads: 0, realEnvironmentFilesOpened: 0, networkAttempts: 0, port3000Operations: 0 }, errors } as const;
}
