import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildProject004RemoteDevCurriculumSql } from "./project004-remote-dev-curriculum.ts";
import {
  RemoteDevGuardFailure,
  buildMigrationPlanFingerprint,
  loadAndVerifyMigrationPlan,
  project004RemoteDevContract,
} from "./project004-remote-dev-guard.ts";

export const cleanDisposableProofVersion =
  "PROJECT004_CLEAN_DISPOSABLE_PROOF_V1";
export const cleanDisposableOrdering =
  "MIGRATIONS_0001_0040_THEN_CONTENT_TRANSACTION";
export const cleanDisposablePostgresImage =
  "public.ecr.aws/supabase/postgres:17.6.1.143";
export const cleanDisposableProofReceiptVersion =
  "PROJECT004_CLEAN_DISPOSABLE_PROOF_RECEIPT_V1";

export type CleanDisposableProofReceipt = {
  version: typeof cleanDisposableProofReceiptVersion;
  project: "PLAVE-PROJECT004";
  targetName: string;
  status: "PASS";
  migrationsApplied: "40/40";
  migrationFirstLast: "0001/0040";
  schemaSemanticFingerprintSha256: string;
  schemaRlsPrivateBoundary: "PASS";
  contentTransaction: "PASS";
  releaseBank: "171/2052/2052/546";
  universalRelease: "DRAFT/INACTIVE";
  curriculumRuntime: false;
  grade2ControlledAdaptivePilot: "DISABLED";
  authUserCount: 0;
  storageObjectCount: 0;
  syntheticUserCount: 0;
  proofFingerprintSha256: string;
  cleanup: "PASS";
  remoteAccessPerformed: false;
  remoteMutationPerformed: false;
  rootFailureCode: "NONE";
};

export type CleanDisposableProofManifest = {
  project: "PLAVE-PROJECT004";
  targetName: string;
  status: "FRESH_DISPOSABLE_PROOF_PASS";
  proofVersion: typeof cleanDisposableProofVersion;
  postgresImage: typeof cleanDisposablePostgresImage;
  postgresImageId: string;
  migrationPlanFingerprintSha256: string;
  migrationCount: 40;
  migrationFirst: "0001";
  migrationLast: "0040";
  lastMigrationPassed: "0040";
  firstMigrationFailed: "NONE";
  exactOrdering: typeof cleanDisposableOrdering;
  schemaSemanticFingerprintSha256: string;
  schemaRlsPrivateBoundary: "PASS";
  contentTransaction: "PASS";
  releases: 1;
  units: 171;
  publicQuestions: 2052;
  privateSolutions: 2052;
  officialOutcomes: 546;
  universalRelease: "DRAFT_INACTIVE";
  curriculumRuntime: false;
  adaptivePilot: "DISABLED";
  authUsers: 0;
  storageObjects: 0;
  syntheticUsers: 0;
  publicPayloadSha256: string;
  privateSolutionSha256: string;
  bundleSha256: string;
  cleanup: "PASS";
  proofFingerprintSha256: string;
};

function isSha256(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{64}$/u.test(value)
  );
}

export function buildCleanDisposableProofFingerprint(
  proof: Omit<
    CleanDisposableProofManifest,
    "proofFingerprintSha256"
  >,
) {
  const payload = [
    proof.proofVersion,
    `project=${proof.project}`,
    `target=${proof.targetName}`,
    `status=${proof.status}`,
    `image=${proof.postgresImage}`,
    `imageId=${proof.postgresImageId}`,
    `plan=${proof.migrationPlanFingerprintSha256}`,
    `migrations=${proof.migrationCount}|${proof.migrationFirst}|${proof.migrationLast}`,
    `boundary=${proof.lastMigrationPassed}|${proof.firstMigrationFailed}`,
    `ordering=${proof.exactOrdering}`,
    `semantic=${proof.schemaSemanticFingerprintSha256}`,
    `security=${proof.schemaRlsPrivateBoundary}`,
    `content=${proof.contentTransaction}|${proof.releases}|${proof.units}|${proof.publicQuestions}|${proof.privateSolutions}|${proof.officialOutcomes}`,
    `state=${proof.universalRelease}|${String(proof.curriculumRuntime)}|${proof.adaptivePilot}`,
    `identity=${proof.authUsers}|${proof.storageObjects}|${proof.syntheticUsers}`,
    `contentHashes=${proof.publicPayloadSha256}|${proof.privateSolutionSha256}|${proof.bundleSha256}`,
    `cleanup=${proof.cleanup}`,
  ].join("\n");
  return createHash("sha256").update(payload).digest("hex");
}

function fail(code: string): never {
  throw new RemoteDevGuardFailure(code);
}

export function verifyCleanDisposableProofManifest(
  manifest: CleanDisposableProofManifest,
  candidateRoot = process.cwd(),
) {
  const { plan } = loadAndVerifyMigrationPlan(candidateRoot);
  const content = buildProject004RemoteDevCurriculumSql();
  if (
    manifest.project !== "PLAVE-PROJECT004" ||
    manifest.targetName !==
      project004RemoteDevContract.projectName ||
    manifest.status !== "FRESH_DISPOSABLE_PROOF_PASS" ||
    manifest.proofVersion !== cleanDisposableProofVersion ||
    manifest.postgresImage !== cleanDisposablePostgresImage ||
    !isSha256(manifest.postgresImageId) ||
    manifest.migrationPlanFingerprintSha256 !==
      buildMigrationPlanFingerprint(plan) ||
    manifest.migrationCount !== 40 ||
    manifest.migrationFirst !== "0001" ||
    manifest.migrationLast !== "0040" ||
    manifest.lastMigrationPassed !== "0040" ||
    manifest.firstMigrationFailed !== "NONE" ||
    manifest.exactOrdering !== cleanDisposableOrdering ||
    !isSha256(manifest.schemaSemanticFingerprintSha256) ||
    manifest.schemaRlsPrivateBoundary !== "PASS" ||
    manifest.contentTransaction !== "PASS" ||
    manifest.releases !== 1 ||
    manifest.units !== 171 ||
    manifest.publicQuestions !== 2052 ||
    manifest.privateSolutions !== 2052 ||
    manifest.officialOutcomes !== 546 ||
    manifest.universalRelease !== "DRAFT_INACTIVE" ||
    manifest.curriculumRuntime ||
    manifest.adaptivePilot !== "DISABLED" ||
    manifest.authUsers !== 0 ||
    manifest.storageObjects !== 0 ||
    manifest.syntheticUsers !== 0 ||
    manifest.publicPayloadSha256 !==
      content.hashes.publicPayloadSha256 ||
    manifest.privateSolutionSha256 !==
      content.hashes.privateSolutionSha256 ||
    manifest.bundleSha256 !== content.hashes.bundleSha256 ||
    manifest.cleanup !== "PASS" ||
    !isSha256(manifest.proofFingerprintSha256)
  ) {
    fail("CLEAN_DISPOSABLE_PROOF_INVALID");
  }
  const { proofFingerprintSha256: _fingerprint, ...payload } =
    manifest;
  void _fingerprint;
  if (
    buildCleanDisposableProofFingerprint(payload) !==
    manifest.proofFingerprintSha256
  ) {
    fail("CLEAN_DISPOSABLE_PROOF_FINGERPRINT_MISMATCH");
  }
  return manifest;
}

export function loadAndVerifyCleanDisposableProof(
  candidateRoot = process.cwd(),
) {
  let manifest: CleanDisposableProofManifest;
  try {
    manifest = JSON.parse(
      readFileSync(
        resolve(
          candidateRoot,
          project004RemoteDevContract.disposableProof,
        ),
        "utf8",
      ),
    ) as CleanDisposableProofManifest;
  } catch {
    fail("CLEAN_DISPOSABLE_PROOF_UNAVAILABLE");
  }
  return verifyCleanDisposableProofManifest(
    manifest,
    candidateRoot,
  );
}

export function verifyCleanDisposableProofReceipt(
  receipt: CleanDisposableProofReceipt,
  candidateRoot = process.cwd(),
) {
  loadAndVerifyMigrationPlan(candidateRoot);
  if (
    receipt.version !==
      cleanDisposableProofReceiptVersion ||
    receipt.project !== "PLAVE-PROJECT004" ||
    receipt.targetName !==
      project004RemoteDevContract.projectName ||
    receipt.status !== "PASS" ||
    receipt.migrationsApplied !== "40/40" ||
    receipt.migrationFirstLast !== "0001/0040" ||
    receipt.schemaSemanticFingerprintSha256 !==
      project004RemoteDevContract
        .schemaSemanticFingerprintSha256 ||
    receipt.schemaRlsPrivateBoundary !== "PASS" ||
    receipt.contentTransaction !== "PASS" ||
    receipt.releaseBank !== "171/2052/2052/546" ||
    receipt.universalRelease !== "DRAFT/INACTIVE" ||
    receipt.curriculumRuntime ||
    receipt.grade2ControlledAdaptivePilot !==
      "DISABLED" ||
    receipt.authUserCount !== 0 ||
    receipt.storageObjectCount !== 0 ||
    receipt.syntheticUserCount !== 0 ||
    receipt.proofFingerprintSha256 !==
      project004RemoteDevContract
        .cleanDisposableProofFingerprintSha256 ||
    receipt.cleanup !== "PASS" ||
    receipt.remoteAccessPerformed ||
    receipt.remoteMutationPerformed ||
    receipt.rootFailureCode !== "NONE"
  ) {
    fail("CLEAN_DISPOSABLE_PROOF_RECEIPT_INVALID");
  }
  return receipt;
}

export function loadAndVerifyCleanDisposableProofReceipt(
  candidateRoot = process.cwd(),
) {
  let receipt: CleanDisposableProofReceipt;
  try {
    receipt = JSON.parse(
      readFileSync(
        resolve(
          candidateRoot,
          project004RemoteDevContract
            .disposableProofReceipt,
        ),
        "utf8",
      ),
    ) as CleanDisposableProofReceipt;
  } catch {
    fail("CLEAN_DISPOSABLE_PROOF_RECEIPT_UNAVAILABLE");
  }
  return verifyCleanDisposableProofReceipt(
    receipt,
    candidateRoot,
  );
}
