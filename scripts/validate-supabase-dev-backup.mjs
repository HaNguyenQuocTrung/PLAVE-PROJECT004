#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  lstatSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const fail = (message) => {
  console.error(`Backup validation failed: ${message}`);
  process.exit(1);
};

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = realpathSync(resolve(scriptDirectory, ".."));
const inputDirectory = process.argv[2];
const options = new Set(process.argv.slice(3));
const stagingMode = options.delete("--staging");
const quietMode = options.delete("--quiet");

if (!inputDirectory) {
  fail("Pass the backup directory as the only argument.");
}
if (options.size !== 0) {
  fail("Unsupported validator option.");
}

let backupDirectory;
try {
  backupDirectory = realpathSync(resolve(inputDirectory));
} catch {
  fail("Backup directory is unavailable.");
}
const relativeToRepository = relative(repositoryRoot, backupDirectory);
if (
  relativeToRepository === "" ||
  (!relativeToRepository.startsWith("..") &&
    !relativeToRepository.includes(`..${process.platform === "win32" ? "\\" : "/"}`))
) {
  fail("Backup directory must be outside the repository.");
}

const requiredFiles = [
  "roles.sql",
  "schema.sql",
  "data.sql",
  "manifest.json",
  "checksums.sha256",
  "README_RESTORE.txt",
];

for (const fileName of requiredFiles) {
  const filePath = join(backupDirectory, fileName);
  let fileStats;
  try {
    fileStats = lstatSync(filePath);
  } catch {
    fail(`${fileName} is unavailable.`);
  }
  if (!fileStats.isFile() || fileStats.isSymbolicLink()) {
    fail(`${fileName} must be a regular non-symlink file.`);
  }
  if (fileStats.size === 0) {
    fail(`${fileName} must not be empty.`);
  }
  if ((fileStats.mode & 0o077) !== 0) {
    fail(`${fileName} permissions are broader than 0600.`);
  }
}

const directoryStats = statSync(backupDirectory);
if ((directoryStats.mode & 0o077) !== 0) {
  fail("Backup directory permissions are broader than 0700.");
}

let manifest;
try {
  manifest = JSON.parse(
    readFileSync(join(backupDirectory, "manifest.json"), "utf8"),
  );
} catch {
  fail("Manifest is unavailable or invalid.");
}

if (
  manifest.formatVersion !== 1 ||
  typeof manifest.backupId !== "string" ||
  !/^plave-dev-\d{8}T\d{6}Z-[a-f0-9]{8}$/u.test(manifest.backupId) ||
  manifest.sourceClassification !== "TEST_DEMO_ONLY_CONFIRMED" ||
  manifest.sourceEnvironmentRole !== "CONTROLLED_DEV_STAGING" ||
  manifest.remoteTarget !== "VERIFIED_PLAVE_DEV_SESSION_POOLER" ||
  manifest.transactionIntent !== "READ_ONLY_LOGICAL_DUMP" ||
  manifest.remoteMutationPerformed !== false
) {
  fail("Manifest identity or safety metadata is invalid.");
}

if (
  manifest.tooling?.supabaseCliVersion !== "2.110.0" ||
  manifest.tooling?.dumpContainerImage !==
    "public.ecr.aws/supabase/postgres:17.6.1.143" ||
  manifest.tooling?.commandFamily !== "supabase db dump" ||
  manifest.tooling?.credentialTransport !==
    "PASSWORDLESS_DB_URL_WITH_TEMPORARY_LIBPQ_ENVIRONMENT" ||
  !Array.isArray(manifest.tooling?.dataExclusions) ||
  manifest.tooling.dataExclusions.length !== 2 ||
  manifest.tooling.dataExclusions[0] !== "storage.buckets_vectors" ||
  manifest.tooling.dataExclusions[1] !== "storage.vector_indexes"
) {
  fail("Supabase CLI dump-tool contract is missing or incompatible.");
}

const expectedDirectoryName = stagingMode
  ? `${manifest.backupId}.incomplete`
  : manifest.backupId;
if (basename(backupDirectory) !== expectedDirectoryName) {
  fail("Manifest backup ID does not match its directory.");
}

const sha256 = (filePath) =>
  createHash("sha256").update(readFileSync(filePath)).digest("hex");

for (const fileName of ["roles.sql", "schema.sql", "data.sql"]) {
  const fileRecord = manifest.files?.[fileName];
  const filePath = join(backupDirectory, fileName);
  if (
    typeof fileRecord?.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(fileRecord.sha256) ||
    fileRecord.sha256 !== sha256(filePath) ||
    fileRecord.sizeBytes !== statSync(filePath).size
  ) {
    fail(`${fileName} manifest metadata does not match the file.`);
  }
}

const checksumLines = readFileSync(
  join(backupDirectory, "checksums.sha256"),
  "utf8",
)
  .trim()
  .split(/\r?\n/u);

const expectedChecksumFiles = new Set([
  "roles.sql",
  "schema.sql",
  "data.sql",
  "manifest.json",
  "README_RESTORE.txt",
]);

if (checksumLines.length !== expectedChecksumFiles.size) {
  fail("Checksum file has an unexpected number of entries.");
}

for (const line of checksumLines) {
  const match = /^([a-f0-9]{64})  ([A-Za-z0-9_.-]+)$/u.exec(line);
  if (!match) {
    fail("Checksum line format is invalid.");
  }
  const [, expectedHash, fileName] = match;
  if (!expectedChecksumFiles.delete(fileName)) {
    fail(`Unexpected or duplicate checksum entry: ${fileName}`);
  }
  if (sha256(join(backupDirectory, fileName)) !== expectedHash) {
    fail(`Checksum mismatch: ${fileName}`);
  }
}

if (expectedChecksumFiles.size !== 0) {
  fail("Checksum file is missing expected entries.");
}

const textualArtifacts = requiredFiles.map((fileName) =>
  readFileSync(join(backupDirectory, fileName), "utf8"),
);
const forbiddenPatterns = [
  /postgres(?:ql)?:\/\/[^\s]+/iu,
  /supabase[_-]?service[_-]?role[_-]?key\s*[:=]/iu,
  /jwt[_-]?secret\s*[:=]/iu,
  /password\s*[:=]\s*[^\s]+/iu,
  /\bpassword\s+'(?!null\b)[^']+'/iu,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/u,
];

for (const pattern of forbiddenPatterns) {
  if (textualArtifacts.some((content) => pattern.test(content))) {
    fail(`Potential credential pattern detected: ${pattern.source}`);
  }
}

if (!quietMode) {
  console.log(
    JSON.stringify(
      {
        status: "PASS",
        backupId: manifest.backupId,
        files: requiredFiles.length,
        checksumsVerified: 5,
        repositoryArtifact: false,
        restrictivePermissions: true,
        credentialPatternsDetected: 0,
        storageIncluded: false,
      },
      null,
      2,
    ),
  );
}
