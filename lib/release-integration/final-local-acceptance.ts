import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { canonicalize, sha256 } from "../content-factory/canonical.ts";

export const FINAL_LOCAL_MATRIX_PATH = "content/releases/grades-1-9/final-local-acceptance-matrix.json";
export const FINAL_LOCAL_DOCUMENTATION_MANIFEST_PATH = "content/releases/grades-1-9/final-local-documentation-manifest.json";
export const FINAL_LOCAL_CHECKSUM_PATH = "content/releases/grades-1-9/final-local-checksum-manifest.json";
export const FINAL_LOCAL_RECEIPT_PATH = "content/releases/grades-1-9/final-local-acceptance-receipt.json";

const generatedPaths = new Set([
  FINAL_LOCAL_MATRIX_PATH,
  FINAL_LOCAL_DOCUMENTATION_MANIFEST_PATH,
  FINAL_LOCAL_CHECKSUM_PATH,
  FINAL_LOCAL_RECEIPT_PATH,
]);

const documentationPaths = [
  "README.md",
  "docs/final/PLAVE_FYP_COMPLETION.md",
  "docs/final/PLAVE_GRADES_1_9_LOCAL_ACCEPTANCE.md",
  "docs/final/PLAVE_SCOPE_AND_LIMITATIONS.md",
  "docs/final/PLAVE_DEMO_GUIDE.md",
  "docs/final/PLAVE_RELEASE_READINESS.md",
  "docs/final/PLAVE_REMOTE_RELEASE_HANDOFF.md",
  "docs/final/PLAVE_DOCUMENTATION_STATUS.md",
  "docs/releases/GRADES_1_9_REAL_LOCAL_BROWSER_ACCEPTANCE.md",
  "docs/releases/GRADES_2_9_LOCAL_RELEASE.md",
  "docs/operations/FINAL_SUBMISSION_STATUS.json",
] as const;

const EXPECTED = {
  combinedAKHash: "de5cff15605c2fd4d09bf06740db9475a9918d20396e9d06f5ec27200b362b1e",
  browserReceiptHash: "ff804a5893aae4d53a784e71f3443d99d0d1b6626623eb1b0704d489b6d54ec5",
  browserSourceTreeDigest: "0a65caf2fd472bac6d02978ebfad9773a3d2b5badf87f1fa0d1752f49eb6ecf4",
  browserCompatibilityHash: "b2dad94003adf4399766586d3a28562cac4862d591cb598b894ec5b730713596",
  browserReleaseReceiptHash: "ac50b890bdf3949258379581a80b6113dfef402456e0a35c25614999ec402221",
  browserChecksumManifestHash: "702a9b05521b7118d7feb39581f9dde7963b1bcde51c4c999bfbc71dd6d484b7",
  migration0045Hash: "8ef040428b424bf84fe50c4077a891e042956e77436aca9f6f55ca1bf19a663f",
  databaseInventoryHash: "829093cc59a2bf1d2d228030d63d27d43180163813490b266d7e92433d1e57b4",
  publicReleasePolicyHash: "369e4ace70f7f1c1ba30626d4d6f46dd8a58b30152488f726c6f55586495174b",
} as const;

function fileHash(root: string, path: string) {
  return sha256(readFileSync(resolve(root, path)));
}

function compareCanonicalPaths(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function finalLocalSourcePaths(root: string) {
  const result = spawnSync("/usr/bin/git", ["ls-files", "--cached", "-z"], {
    cwd: root,
    encoding: "utf8",
    env: { PATH: "/usr/bin:/bin", LC_ALL: "C", NODE_ENV: "test" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.status !== 0) throw new Error("FINAL_LOCAL_ACCEPTANCE:SOURCE_INVENTORY_FAILED");
  return String(result.stdout).split("\0").filter(Boolean)
    .filter((path) => !generatedPaths.has(path)
      && !path.startsWith(".env")
      && !path.startsWith(".git/")
      && !path.startsWith(".next")
      && !path.startsWith("node_modules/")
      && !path.startsWith(".local-artifacts/")
      && !/(?:^|\/)(?:coverage|dist|build|tmp|logs?)(?:\/|$)/u.test(path))
    .sort(compareCanonicalPaths);
}

export function finalLocalSourceInventory(root: string) {
  const paths = finalLocalSourcePaths(root);
  const entries = paths.map((path) => ({ path, sha256: fileHash(root, path) }));
  return { paths, entries, digest: sha256(canonicalize(entries)) } as const;
}

function assertExpected(actual: string, expected: string, code: string) {
  if (actual !== expected) throw new Error(`FINAL_LOCAL_ACCEPTANCE:${code}`);
}

export function buildFinalLocalAcceptance(root = process.cwd()) {
  const inventory = JSON.parse(readFileSync(resolve(root, "content/releases/grades-2-9/release-inventory.json"), "utf8")) as {
    frozenCombinedAKHash: string;
    inventoryHash: string;
    totals: { questions: number; skills: number; units: number; runtimeUnits: number; adaptiveSkills: number; fixedSafeSkills: number };
    grades: Array<{ grade: number; questions: number; skills: number; units: unknown[]; runtimeUnits: number; adaptiveSkills: number; fixedSafeSkills: number }>;
  };
  const browser = JSON.parse(readFileSync(resolve(root, "docs/e2e/GRADES_1_9_REAL_LOCAL_BROWSER_E2E_RECEIPT.json"), "utf8")) as { receiptHash: string };
  const release = JSON.parse(readFileSync(resolve(root, "content/releases/grades-2-9/release-integration-receipt.json"), "utf8")) as {
    compatibilityHash: string; receiptHash: string; sourceTreeDigest: string; checksumManifestHash: string; publicReleasePolicyHash: string;
  };

  assertExpected(inventory.frozenCombinedAKHash, EXPECTED.combinedAKHash, "A_K_HASH_DRIFT");
  assertExpected(inventory.inventoryHash, EXPECTED.databaseInventoryHash, "DATABASE_INVENTORY_HASH_DRIFT");
  assertExpected(browser.receiptHash, EXPECTED.browserReceiptHash, "BROWSER_RECEIPT_HASH_DRIFT");
  assertExpected(release.sourceTreeDigest, EXPECTED.browserSourceTreeDigest, "BROWSER_SOURCE_TREE_HASH_DRIFT");
  assertExpected(release.compatibilityHash, EXPECTED.browserCompatibilityHash, "BROWSER_COMPATIBILITY_HASH_DRIFT");
  assertExpected(release.receiptHash, EXPECTED.browserReleaseReceiptHash, "BROWSER_RELEASE_RECEIPT_HASH_DRIFT");
  assertExpected(release.checksumManifestHash, EXPECTED.browserChecksumManifestHash, "BROWSER_CHECKSUM_HASH_DRIFT");
  assertExpected(release.publicReleasePolicyHash, EXPECTED.publicReleasePolicyHash, "PUBLIC_POLICY_HASH_DRIFT");
  assertExpected(fileHash(root, "supabase/migrations/0045_grades_2_9_local_public_release.sql"), EXPECTED.migration0045Hash, "MIGRATION_0045_HASH_DRIFT");

  const shared = {
    contentPresent: "PASS",
    catalogVisibilityInLocalPublic: "PASS",
    browserLogin: "PASS",
    startResume: "PASS",
    incorrectCorrectFeedback: "PASS",
    progress: "PASS",
    history: "PASS",
    persistenceAfterRelogin: "PASS",
    authorization: "PASS",
    responsiveMobile: "PASS",
    accessibilityChecks: "PASS",
    consoleHydrationNetworkAudit: "PASS",
    finalResult: "LOCAL_ACCEPTED",
  } as const;
  const grades = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((grade) => grade === 1 ? {
    grade,
    ...shared,
    databaseMaterialized: "LEGACY_FIXED_DATABASE_PRESENT",
    runtimeMode: "PUBLIC_FIXED",
    deactivationPreservation: "NOT_APPLICABLE_FIXED_RUNTIME",
    remoteRelease: "SCHEMA_MATERIALIZED_HIDDEN_NOT_ACTIVATED",
    productionAvailability: "CURRENT_GRADE_1_PUBLIC_RUNTIME",
  } : {
    grade,
    ...shared,
    databaseMaterialized: "PASS_CANONICAL_0045",
    runtimeMode: "LOCAL_PUBLIC_ADAPTIVE_AND_FIXED_SAFE",
    deactivationPreservation: "PASS",
    remoteRelease: "SCHEMA_MATERIALIZED_HIDDEN_NOT_ACTIVATED",
    productionAvailability: "NOT_YET_CLAIMED",
  });
  const matrixCore = {
    schemaVersion: "plave-grades-1-9-final-local-acceptance-matrix-v1",
    baselineHead: "5bb8cc39311d387bd0240f3e8dcd9aef84be8bb3",
    remoteRelease: "SCHEMA_MATERIALIZED_HIDDEN_NOT_ACTIVATED",
    productionAvailabilityGradesTwoToNine: "NOT_YET_CLAIMED",
    grades,
  } as const;
  const matrix = { ...matrixCore, matrixHash: sha256(canonicalize(matrixCore)) };

  const documentationEntries = documentationPaths.map((path) => ({ path, sha256: fileHash(root, path) }));
  const documentationCore = {
    schemaVersion: "plave-grades-1-9-final-local-documentation-manifest-v1",
    status: "CANONICAL_CURRENT",
    historicalSnapshotsPreserved: true,
    entries: documentationEntries,
  } as const;
  const documentationManifest = { ...documentationCore, manifestHash: sha256(canonicalize(documentationCore)) };

  const { entries: sourceEntries, digest: sourceTreeDigest } = finalLocalSourceInventory(root);
  const checksumCore = {
    schemaVersion: "plave-grades-1-9-final-local-checksum-v1",
    selfReferentialFilesExcluded: [...generatedPaths].sort(),
    sourceScopeVersion: "plave-final-local-acceptance-source-scope-v2-tracked-only",
    sourceTreeDigest,
    sourceTreeInputCount: sourceEntries.length,
    acceptanceMatrixHash: matrix.matrixHash,
    documentationManifestHash: documentationManifest.manifestHash,
    stableHashes: EXPECTED,
  } as const;
  const checksumManifest = { ...checksumCore, manifestHash: sha256(canonicalize(checksumCore)) };

  const receiptCore = {
    schemaVersion: "plave-grades-1-9-final-local-acceptance-receipt-v2",
    branch: "fix/fyp-product-truth",
    baselineHead: "5bb8cc39311d387bd0240f3e8dcd9aef84be8bb3",
    finalHeadBinding: {
      mode: "SOURCE_SCOPE_EXCLUDES_COMMIT_ID",
      commitHashExcludedToAvoidSelfReference: true,
    },
    migrations: { count: 46, first: "0001_auth_profiles.sql", last: "0046_unified_grade_1_9_xp.sql" },
    inventory: {
      allGrades: { questions: 2_772, skills: 338, units: 176 },
      gradeOne: { questions: 312, runtime: "PUBLIC_FIXED" },
      gradesTwoToNine: { ...inventory.totals, noQuestionSourceUnits: inventory.totals.units - inventory.totals.runtimeUnits },
    },
    acceptance: { gradesLocalAccepted: 9, browserJourneysPassed: 9, fixedSafeSkillsPassed: 13, fixedSafeSkillsExpected: 13 },
    acceptanceMatrixHash: matrix.matrixHash,
    documentationManifestHash: documentationManifest.manifestHash,
    checksumManifestHash: checksumManifest.manifestHash,
    sourceTreeDigest,
    stableHashes: EXPECTED,
    historicalIncidents: [
      "WAVE_F_REGISTRY_DNS_ATTEMPT_RECORDED",
      "WAVE_K_CREDENTIAL_PRESENCE_READ_RECORDED",
      "POST_FREEZE_REAL_ENV_FILE_OPEN_RECORDED_NO_VALUE_OUTPUT",
      "PRE_MOCK_KEYCHAIN_BROWSER_PROMPT_RECORDED_NO_CREDENTIAL_READ",
      "FINAL_DELIVERY_REAL_WORKTREE_NEXT_ENV_DISCOVERY_RECORDED_NO_VALUE_OUTPUT_BUILD_ABORTED",
    ],
    receiptGenerationBoundary: {
      keychainAccesses: 0, keychainPrompts: 0, realEnvironmentFileOpens: 0, credentialReads: 0,
      inheritedProviderVariables: 0, browserLaunches: 0, externalNetworkAttempts: 0,
      remoteServiceOrDatabaseAttempts: 0, portOperations: 0, port3000Operations: 0,
      remoteMutations: 0, pushOrDeployOperations: 0,
    },
    remoteState: {
      evidenceClass: "OWNER_PRESERVED_OPERATIONAL_EVIDENCE_NOT_REQUERIED_BY_GENERATOR",
      migration0045: "APPLIED_AND_VERIFIED",
      migration0046: "NOT_APPLIED_OWNER_AUTHORIZATION_REQUIRED",
      gradesTwoToNineReleaseData: "MATERIALIZED_DRAFT_HIDDEN",
      gradesTwoToNineActivation: "NOT_EXECUTED",
      deployment: "NOT_EXECUTED",
    },
  } as const;
  const receipt = { ...receiptCore, receiptHash: sha256(canonicalize(receiptCore)) };
  return { matrix, documentationManifest, checksumManifest, receipt, sourceEntries } as const;
}
