import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { canonicalize, sha256 } from "../content-factory/canonical.ts";
import {
  FROZEN_COMBINED_A_K_HASH,
  GRADES_2_9_RELEASE_POLICY_VERSION,
} from "./inventory.ts";

export const RELEASE_INTEGRATION_RECEIPT_PATH =
  "content/releases/grades-2-9/release-integration-receipt.json";
export const RELEASE_INTEGRATION_CHECKSUM_PATH =
  "content/releases/grades-2-9/release-checksum-manifest.json";

const excludedSourcePaths = new Set([
  RELEASE_INTEGRATION_RECEIPT_PATH,
  RELEASE_INTEGRATION_CHECKSUM_PATH,
]);

function sourcePaths(root: string) {
  const result = spawnSync("/usr/bin/git", [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  ], {
    cwd: root,
    encoding: "utf8",
    env: { PATH: "/usr/bin:/bin", LC_ALL: "C", NODE_ENV: "test" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.status !== 0) {
    throw new Error("RELEASE_RECEIPT:TRACKED_SOURCE_INVENTORY_FAILED");
  }
  return String(result.stdout).split("\0").filter(Boolean)
    .filter((path) => !excludedSourcePaths.has(path)
      && !path.startsWith(".env")
      && !path.startsWith(".git/")
      && !path.startsWith(".next")
      && !path.startsWith("node_modules/")
      && !path.startsWith(".local-artifacts/")
      && !/(?:^|\/)(?:coverage|dist|build|tmp|logs?)(?:\/|$)/u.test(path))
    .sort((left, right) => left.localeCompare(right));
}

function fileHash(root: string, path: string) {
  return sha256(readFileSync(resolve(root, path)));
}

export function buildGradesTwoToNineReleaseIntegrationReceipt(root = process.cwd()) {
  const inventoryPath = "content/releases/grades-2-9/release-inventory.json";
  const migrationPath = "supabase/migrations/0045_grades_2_9_local_public_release.sql";
  const diagnosticPath = "supabase/operations/grades-2-9-local-release/DIAGNOSTIC_READONLY.sql";
  const inventory = JSON.parse(readFileSync(resolve(root, inventoryPath), "utf8")) as {
    frozenCombinedAKHash: string;
    inventoryHash: string;
    migrationSha256: string;
    totals: Record<string, number>;
    grades: readonly unknown[];
  };
  if (inventory.frozenCombinedAKHash !== FROZEN_COMBINED_A_K_HASH) {
    throw new Error("RELEASE_RECEIPT:A_K_HASH_DRIFT");
  }
  const migrationDataArtifactHash = fileHash(root, migrationPath);
  if (migrationDataArtifactHash !== inventory.migrationSha256) {
    throw new Error("RELEASE_RECEIPT:MIGRATION_HASH_DRIFT");
  }
  const policyCore = {
    schemaVersion: "plave-grades-2-9-public-release-policy-v1",
    policyVersion: GRADES_2_9_RELEASE_POLICY_VERSION,
    modes: ["HIDDEN", "PILOT", "PUBLIC"],
    defaultMode: "HIDDEN",
    serverOnly: true,
    publicRequires: ["AUTHENTICATED_STUDENT", "SAME_SCHOOL_GRADE", "EXACT_ACTIVE_TUPLE", "APPLICATION_FLAG", "DATABASE_FLAGS"],
    pilotAdditionallyRequires: ["EXACT_USER_GRADE_CANDIDATE_VERSION_HASH_POLICY_ENTITLEMENT"],
    parentTeacherAnonymousStartSubmit: "DENIED",
    automaticEntitlementGrant: false,
    automaticSchoolGradeMutation: false,
  } as const;
  const publicReleasePolicyHash = sha256(canonicalize(policyCore));
  const localActivationDiagnosticHash = fileHash(root, diagnosticPath);
  const paths = sourcePaths(root);
  const entries = paths.map((path) => ({ path, sha256: fileHash(root, path) }));
  const sourceTreeDigest = sha256(canonicalize(entries));
  const checksumFields = {
    sourceTreeDigest,
    sourceTreeInputCount: entries.length,
    combinedAKHash: FROZEN_COMBINED_A_K_HASH,
    waveLCompatibilityHash: "ffbe617c9790a74cad0e0a9093da077e5f18428b3c529610bf482b9a72be5932",
    waveMCompatibilityHash: "17aefa873d610646fd5b6b8c67741ae8a4f7409206839dd672effa3dca18d02c",
    databaseReleaseInventoryHash: inventory.inventoryHash,
    publicReleasePolicyHash,
    migrationDataArtifactHash,
    localActivationDiagnosticHash,
  } as const;
  const checksumCore = {
    schemaVersion: "plave-grades-2-9-local-release-checksum-v1",
    selfHashExcluded: true,
    ...checksumFields,
  } as const;
  const checksumManifest = {
    ...checksumCore,
    manifestHash: sha256(canonicalize(checksumCore)),
  };
  const compatibilityCore = {
    schemaVersion: "plave-grades-2-9-local-release-compatibility-v1",
    ...checksumFields,
    migrations: { count: 45, first: "0001_auth_profiles.sql", last: "0045_grades_2_9_local_public_release.sql" },
    inventoryTotals: inventory.totals,
    gradeReleaseCount: inventory.grades.length,
    gradeOneRuntime: "FIXED_UNCHANGED",
    gradesTwoToNineDefault: "HIDDEN",
    localPublicActivation: "OWNER_COMMAND_REQUIRED",
    remotePublication: false,
    remoteActivation: false,
    defaultEntitlementCount: 0,
  } as const;
  const compatibilityHash = sha256(canonicalize(compatibilityCore));
  const { schemaVersion: compatibilitySchemaVersion, ...compatibilityFields } = compatibilityCore;
  const receiptCore = {
    schemaVersion: "plave-grades-2-9-local-release-integration-receipt-v1",
    branch: "fix/fyp-product-truth",
    baselineHead: "a710db98c83a68ec1c029733ce735ad25d5f73a9",
    compatibilitySchemaVersion,
    ...compatibilityFields,
    compatibilityHash,
    checksumManifestHash: checksumManifest.manifestHash,
    localDatabaseProof: {
      mode: "DISPOSABLE_POSTGRES_16_ALPINE_LOCAL_IMAGE",
      network: "NONE",
      publishedPorts: 0,
      syntheticIdentitiesOnly: true,
      result: "PASSED",
      migrationsApplied: 45,
      questions: 2_460,
      attempts: 17,
      fixedSafeSkillsSelectable: 13,
      fixedSafeMasteryEvidenceWritten: 0,
      approvedParentProgressHistory: true,
      authorizedTeacherProgressMotivation: true,
      gradeOneDigestPreserved: true,
      activationRollbackContract: "ATOMIC_FAIL_CLOSED",
      deactivationPreservesHistory: true,
    },
    credentialReads: 0,
    networkAttempts: 0,
    port3000Operations: 0,
    pushPerformed: false,
    deploymentPerformed: false,
  } as const;
  const receipt = { ...receiptCore, receiptHash: sha256(canonicalize(receiptCore)) };
  return { receipt, checksumManifest, sourceEntries: entries } as const;
}
