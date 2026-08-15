import { readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

export type CanonicalMigrationInventoryAudit = Readonly<{
  ok: boolean;
  first: string;
  last: string;
  count: number;
  missingVersions: readonly string[];
  duplicateVersions: readonly string[];
  unexpectedFiles: readonly string[];
  trackedFiles: readonly string[];
}>;

const canonicalMigrationPattern =
  /^([0-9]{4})_[a-z0-9]+(?:_[a-z0-9]+)*[.]sql$/u;

function versionSequence(last: number) {
  return Array.from(
    { length: last },
    (_, index) => String(index + 1).padStart(4, "0"),
  );
}

export function auditCanonicalMigrationFilenames(
  trackedFiles: readonly string[],
  directoryFiles: readonly string[] = trackedFiles,
): CanonicalMigrationInventoryAudit {
  const normalizedTracked = [...trackedFiles].sort();
  const versions = new Map<string, number>();
  const unexpected = new Set<string>();

  for (const filename of normalizedTracked) {
    const match = canonicalMigrationPattern.exec(filename);
    if (!match || match[1] === "0000") {
      unexpected.add(filename);
      continue;
    }
    const version = match[1];
    versions.set(version, (versions.get(version) ?? 0) + 1);
  }

  const trackedSet = new Set(normalizedTracked);
  for (const filename of directoryFiles) {
    if (!trackedSet.has(filename)) unexpected.add(filename);
  }

  const orderedVersions = [...versions.keys()].sort();
  const highest = Number(orderedVersions.at(-1) ?? 0);
  const expected = versionSequence(highest);
  const missingVersions = expected.filter(
    (version) => !versions.has(version),
  );
  const duplicateVersions = [...versions]
    .filter(([, count]) => count !== 1)
    .map(([version]) => version)
    .sort();
  const unexpectedFiles = [...unexpected].sort();
  const first = orderedVersions[0] ?? "NONE";
  const last = orderedVersions.at(-1) ?? "NONE";

  return {
    ok:
      first === "0001" &&
      highest > 0 &&
      normalizedTracked.length === expected.length &&
      missingVersions.length === 0 &&
      duplicateVersions.length === 0 &&
      unexpectedFiles.length === 0,
    first,
    last,
    count: normalizedTracked.length,
    missingVersions,
    duplicateVersions,
    unexpectedFiles,
    trackedFiles: normalizedTracked,
  };
}

export function loadTrackedCanonicalMigrationInventory(
  root = process.cwd(),
) {
  const migrationDirectory = resolve(root, "supabase/migrations");
  const tracked = spawnSync(
    "git",
    ["ls-files", "--", "supabase/migrations"],
    { cwd: root, encoding: "utf8" },
  );
  if (tracked.status !== 0) {
    throw new Error("CANONICAL_MIGRATION_INVENTORY_UNAVAILABLE");
  }
  const trackedFiles = tracked.stdout
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((path) => relative(migrationDirectory, resolve(root, path)))
    .filter((path) => path.endsWith(".sql"));
  const directoryFiles = readdirSync(migrationDirectory, {
    withFileTypes: true,
  })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name);
  return auditCanonicalMigrationFilenames(trackedFiles, directoryFiles);
}
