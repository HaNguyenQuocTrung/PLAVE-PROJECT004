import {
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import {
  basename,
  extname,
  join,
  relative,
  resolve,
} from "node:path";

export const project004Identity = {
  directoryName: "PLAVE-PROJECT004",
  packageName: "plave-project004",
  supabaseProjectId: "PLAVE-PROJECT004",
  ownerCacheDirectory: ".next-owner-local-project004",
} as const;

export function assertProject004Workspace(
  candidateRoot = process.cwd(),
  options?: { allowEphemeralDirectoryName?: boolean },
) {
  const root = realpathSync(candidateRoot);
  if (
    basename(root) !== project004Identity.directoryName &&
    options?.allowEphemeralDirectoryName !== true
  ) {
    throw new Error("PROJECT004_IDENTITY:CWD_MISMATCH");
  }

  let packageName = "";
  try {
    const packageJson = JSON.parse(
      readFileSync(resolve(root, "package.json"), "utf8"),
    ) as Record<string, unknown>;
    packageName =
      typeof packageJson.name === "string" ? packageJson.name : "";
  } catch {
    throw new Error("PROJECT004_IDENTITY:PACKAGE_UNAVAILABLE");
  }
  if (packageName !== project004Identity.packageName) {
    throw new Error("PROJECT004_IDENTITY:PACKAGE_MISMATCH");
  }

  const supabaseConfig = readFileSync(
    resolve(root, "supabase/config.toml"),
    "utf8",
  );
  if (
    !new RegExp(
      `^project_id = "${project004Identity.supabaseProjectId}"$`,
      "m",
    ).test(supabaseConfig)
  ) {
    throw new Error("PROJECT004_IDENTITY:LOCAL_DATABASE_MISMATCH");
  }

  const nextConfig = readFileSync(
    resolve(root, "next.config.ts"),
    "utf8",
  );
  if (!nextConfig.includes(project004Identity.ownerCacheDirectory)) {
    throw new Error("PROJECT004_IDENTITY:CACHE_MISMATCH");
  }
  return root;
}

const frozenProjectName = `PROJECT${"003"}`;
const frozenPackageName = `plave-project${"003"}`;
const archivedMarker = "ARCHIVED_NON_OPERATIONAL";
// Exact historical evidence, negative security documentation, and a synthetic
// cleanup identity are reference-only. Keeping this path allowlist explicit
// prevents a production workspace copy or ambiguous identity from being
// reclassified as archival merely because it lives under docs/tests.
const referenceOnlyFrozenIdentityPaths = new Set([
  "artifacts/complete-project-reaudit/test-evidence.json",
  "artifacts/remediation/sprint-10a-report.json",
  "docs/operations/PROJECT004_REMOTE_UNIVERSAL_ACTIVATION.md",
  "docs/status/PLAVE_COMPLETE_USER_DEVELOPER_REAUDIT.md",
  "docs/status/SPRINT_10A_CRITICAL_REMEDIATION.md",
  "tests/generated-practice-disposable-cleanup.test.ts",
]);
const frozenUntouchedOutputMarker =
  `${frozenProjectName}=FROZEN_UNTOUCHED`;
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".next-owner-local-project004",
  "coverage",
  "dist",
  "node_modules",
]);
const textExtensions = new Set([
  ".cjs",
  ".css",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".mts",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

export function auditProject004CanonicalReferences(
  candidateRoot = process.cwd(),
) {
  const root = assertProject004Workspace(candidateRoot);
  const archivedReferenceFiles: string[] = [];
  const operationalReferenceFiles: string[] = [];

  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          visit(join(directory, entry.name));
        }
        continue;
      }
      if (
        !entry.isFile() ||
        !textExtensions.has(extname(entry.name).toLowerCase())
      ) {
        continue;
      }
      const path = join(directory, entry.name);
      const projectPath = relative(root, path);
      const content = readFileSync(path, "utf8");
      const operationalContent = content.replaceAll(
        frozenUntouchedOutputMarker,
        "",
      );
      const hasFrozenReference =
        projectPath.toUpperCase().includes(frozenProjectName) ||
        operationalContent
          .toUpperCase()
          .includes(frozenProjectName) ||
        operationalContent
          .toLowerCase()
          .includes(frozenPackageName);
      if (!hasFrozenReference) continue;
      if (content.includes(archivedMarker) || referenceOnlyFrozenIdentityPaths.has(projectPath)) {
        archivedReferenceFiles.push(projectPath);
      } else {
        operationalReferenceFiles.push(projectPath);
      }
    }
  };

  visit(root);
  return {
    archivedReferenceFiles: archivedReferenceFiles.sort(),
    operationalReferenceFiles: operationalReferenceFiles.sort(),
  };
}
