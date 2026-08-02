import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { basename, resolve } from "node:path";

import { assertProject004Workspace } from "./project004-identity.ts";

export const generatedPersistenceMigrationBoundary = {
  count: 42,
  first: "0001",
  last: "0042",
  migration0041:
    "0041_generated_practice_semantic_provenance.sql",
  migration0041Sha256:
    "ddead90b474185686d859d9ba88aea969bebd7fc8e8fcff66fc38eea61f83e67",
  migration0042:
    "0042_fix_generated_question_provenance_trigger_security.sql",
  migration0042Sha256:
    "c3adecf481c8eb8b50872a4b165ea29539598f568f91cdd5f7993b3cc04662d7",
} as const;

export type GeneratedPersistenceMigrationEntry = Readonly<{
  version: string;
  filename: string;
  absolutePath: string;
  sha256: string;
}>;

function sha256File(path: string) {
  return createHash("sha256")
    .update(readFileSync(path))
    .digest("hex");
}

export function loadGeneratedPersistenceMigrationInventory(
  candidateRoot = process.cwd(),
) {
  const root = assertProject004Workspace(candidateRoot);
  const migrationsDirectory = resolve(
    root,
    "supabase/migrations",
  );
  const filenames = readdirSync(migrationsDirectory)
    .filter((filename) =>
      /^[0-9]{4}_[a-z0-9]+(?:_[a-z0-9]+)*[.]sql$/u.test(
        filename,
      ),
    )
    .sort((left, right) => left.localeCompare(right));
  const entries: GeneratedPersistenceMigrationEntry[] =
    filenames.map((filename) => {
      const absolutePath = resolve(
        migrationsDirectory,
        filename,
      );
      return {
        version: filename.slice(0, 4),
        filename,
        absolutePath,
        sha256: sha256File(absolutePath),
      };
    });
  const expectedVersions = Array.from(
    { length: generatedPersistenceMigrationBoundary.count },
    (_, index) => String(index + 1).padStart(4, "0"),
  );
  const versions = entries.map((entry) => entry.version);
  if (
    entries.length !== generatedPersistenceMigrationBoundary.count ||
    versions.join(",") !== expectedVersions.join(",") ||
    entries[0]?.version !==
      generatedPersistenceMigrationBoundary.first ||
    entries.at(-1)?.version !==
      generatedPersistenceMigrationBoundary.last
  ) {
    throw new Error(
      "GENERATED_PERSISTENCE_MIGRATION_BOUNDARY_INVALID",
    );
  }
  const migration0041 = entries.find((entry) => entry.version === "0041");
  if (
    migration0041?.filename !==
      generatedPersistenceMigrationBoundary.migration0041 ||
    migration0041.sha256 !==
      generatedPersistenceMigrationBoundary.migration0041Sha256
  ) {
    throw new Error(
      "GENERATED_PERSISTENCE_MIGRATION_0041_CHECKSUM_MISMATCH",
    );
  }
  const migration0042 = entries.at(-1);
  if (
    migration0042?.filename !==
      generatedPersistenceMigrationBoundary.migration0042 ||
    migration0042.sha256 !==
      generatedPersistenceMigrationBoundary.migration0042Sha256
  ) {
    throw new Error(
      "GENERATED_PERSISTENCE_MIGRATION_0042_CHECKSUM_MISMATCH",
    );
  }
  return { root, migrationsDirectory, entries };
}

export function copyGeneratedPersistenceMigrationInventory(
  targetDirectory: string,
  candidateRoot = process.cwd(),
) {
  const inventory =
    loadGeneratedPersistenceMigrationInventory(candidateRoot);
  mkdirSync(targetDirectory, {
    recursive: true,
    mode: 0o700,
  });
  for (const entry of inventory.entries) {
    copyFileSync(
      entry.absolutePath,
      resolve(targetDirectory, entry.filename),
    );
  }
  const copied = readdirSync(targetDirectory)
    .filter((filename) => filename.endsWith(".sql"))
    .sort();
  const mismatchCount = inventory.entries.filter(
    (entry) => {
      const copy = resolve(targetDirectory, entry.filename);
      return (
        basename(copy) !== entry.filename ||
        sha256File(copy) !== entry.sha256
      );
    },
  ).length;
  if (
    copied.length !== inventory.entries.length ||
    copied.join(",") !==
      inventory.entries.map((entry) => entry.filename).join(",") ||
    mismatchCount !== 0
  ) {
    throw new Error(
      "GENERATED_PERSISTENCE_MIGRATION_COPY_MISMATCH",
    );
  }
  return {
    sourceCount: inventory.entries.length,
    copyCount: copied.length,
    mismatchCount,
    first: inventory.entries[0]?.version ?? "NONE",
    last: inventory.entries.at(-1)?.version ?? "NONE",
  };
}
