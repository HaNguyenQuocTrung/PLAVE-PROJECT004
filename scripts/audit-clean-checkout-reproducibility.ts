import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import { assertProject004Workspace } from "./project004-identity.ts";

type Category =
  | "REQUIRED_SOURCE"
  | "REQUIRED_TEST"
  | "REQUIRED_MIGRATION"
  | "REQUIRED_DOCUMENTATION"
  | "GENERATED_ARTIFACT"
  | "LOCAL_SECRET"
  | "LOCAL_CACHE"
  | "OPTIONAL_EVIDENCE"
  | "UNKNOWN";

type Entry = Readonly<{
  path: string;
  gitStatus: string;
  category: Category;
  trackedAtHead: boolean;
}>;

const root = assertProject004Workspace();
const artifactDirectory = resolve(root, "artifacts/remediation");
const artifactPath = resolve(artifactDirectory, "clean-checkout-reproducibility.json");
const verifyOnly = process.argv.includes("--verify-only");

function runGit(args: string[]) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error("CLEAN_ROOM_GIT_COMMAND_FAILED");
  return result.stdout;
}

function categoryFor(inputPath: string): Category {
  const path = inputPath.replace(/\/$/u, "");
  if (path === ".env.example" || path.endsWith(".local.example")) {
    return "REQUIRED_DOCUMENTATION";
  }
  if (/^(?:\.env(?:\.|$)|\.project004-.*\.local$)/u.test(path)) return "LOCAL_SECRET";
  if (/^(?:node_modules|\.next(?:-|\/|$)|\.local-artifacts|coverage|playwright-report|test-results|supabase\/\.temp|supabase\/\.branches)(?:\/|$)/u.test(path)) {
    return "LOCAL_CACHE";
  }
  if (path === "next-env.d.ts" || /(?:^|\/)\.DS_Store$|\.log$/u.test(path)) {
    return "GENERATED_ARTIFACT";
  }
  if (/^supabase\/migrations\/[^/]+\.sql$/u.test(path)) return "REQUIRED_MIGRATION";
  if (/^tests\//u.test(path) || /^scripts\/(?:audit|run|finalize|inventory|build)-/u.test(path)) {
    return "REQUIRED_TEST";
  }
  if (/^(?:docs\/|README(?:\.|$))/u.test(path)) return "REQUIRED_DOCUMENTATION";
  if (/^artifacts\/remediation\//u.test(path)) return "GENERATED_ARTIFACT";
  if (/^artifacts\/(?:generated-candidates|official-gdpt-source|official-contract-review)(?:\/|$)/u.test(path)) {
    return "GENERATED_ARTIFACT";
  }
  if (/^artifacts\//u.test(path)) return "OPTIONAL_EVIDENCE";
  if (
    /^(?:app|components|data|lib|public|scripts|styles|supabase)(?:\/|$)/u.test(path) ||
    /^(?:package(?:-lock)?\.json|next\.config\.ts|proxy\.ts|tsconfig(?:\.[^.]+)?\.json|eslint\.config\.|\.gitignore|\.npmignore|\.env\.example)/u.test(path)
  ) {
    return "REQUIRED_SOURCE";
  }
  return "UNKNOWN";
}

function parseDetailedStatus() {
  const raw = runGit(["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  const entries: Entry[] = [];
  for (const record of raw.split("\0").filter(Boolean)) {
    const gitStatus = record.slice(0, 2);
    const path = record.slice(3);
    const category = categoryFor(path);
    entries.push({ path, gitStatus, category, trackedAtHead: gitStatus !== "??" });
  }
  return entries;
}

function parseIgnoredStatus() {
  const raw = runGit(["status", "--porcelain=v1", "-z", "--ignored", "--untracked-files=normal"]);
  const ignored: Entry[] = [];
  for (const record of raw.split("\0").filter(Boolean)) {
    if (!record.startsWith("!! ")) continue;
    const path = record.slice(3).replace(/\/$/u, "");
    ignored.push({ path, gitStatus: "!!", category: categoryFor(path), trackedAtHead: false });
  }
  return ignored;
}

function safeRuntimeEnvironment(nodeEnvironment: "development" | "production") {
  return {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR,
    LANG: "C",
    LC_ALL: "C",
    NODE_ENV: nodeEnvironment,
    GOOGLE_API_KEY: "",
    OPENAI_API_KEY: "",
    PLAVE_AI_TUTOR_ENABLED: "false",
  };
}

function runCleanRoomGate(cleanRoot: string, script: "typecheck" | "build") {
  const startedAt = Date.now();
  const result = spawnSync("npm", ["run", "--silent", script], {
    cwd: cleanRoot,
    env: safeRuntimeEnvironment(script === "build" ? "production" : "development"),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    timeout: script === "build" ? 300_000 : 180_000,
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    status: result.status === 0 ? "PASS" : result.signal ? "TIMEOUT_OR_SIGNAL" : "FAIL",
    exitCode: result.status,
    signal: result.signal,
    durationMs: Date.now() - startedAt,
    routeCount: script === "build" ? (output.match(/^├|^┌|^└/gmu)?.length ?? null) : null,
    failureSummary:
      result.status === 0
        ? []
        : output
            .split("\n")
            .filter((line) => /(?:error|failed|cannot find|timed out)/iu.test(line))
            .slice(-12),
  };
}

function copyIntendedSource(cleanRoot: string, entries: Entry[]) {
  for (const entry of entries) {
    if (!entry.category.startsWith("REQUIRED_")) continue;
    const source = resolve(root, entry.path);
    if (!existsSync(source)) continue;
    const destination = resolve(cleanRoot, entry.path);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(source, destination, { recursive: true, force: true });
  }
}

function main() {
  const changedEntries = parseDetailedStatus();
  const ignoredEntries = parseIgnoredStatus();
  const trackedAtHead = new Set(
    runGit(["ls-tree", "-r", "--name-only", "HEAD"]).split("\n").filter(Boolean),
  );
  const requiredUntracked = changedEntries
    .filter((entry) => entry.gitStatus === "??" && entry.category.startsWith("REQUIRED_"))
    .map((entry) => entry.path)
    .sort();
  const requiredModified = changedEntries
    .filter((entry) => entry.gitStatus !== "??" && entry.category.startsWith("REQUIRED_"))
    .map((entry) => entry.path)
    .sort();
  const ignoredImplementation = ignoredEntries
    .filter((entry) => entry.category.startsWith("REQUIRED_"))
    .map((entry) => entry.path)
    .sort();
  const generatedEvidence = changedEntries
    .filter((entry) => entry.category === "GENERATED_ARTIFACT" || entry.category === "OPTIONAL_EVIDENCE")
    .map((entry) => entry.path);
  const localSecretPaths = ignoredEntries
    .filter((entry) => entry.category === "LOCAL_SECRET")
    .map((entry) => entry.path)
    .sort();

  const tempParent = mkdtempSync(resolve(tmpdir(), "plave-sprint10a-clean-room-"));
  const cleanRoot = resolve(tempParent, "PLAVE-PROJECT004");
  let typecheck: ReturnType<typeof runCleanRoomGate> | null = null;
  let build: ReturnType<typeof runCleanRoomGate> | null = null;
  let cleanup = "FAIL";
  try {
    mkdirSync(cleanRoot, { mode: 0o700 });
    const archive = spawnSync("git", ["archive", "--format=tar", "HEAD"], {
      cwd: root,
      encoding: null,
      maxBuffer: 256 * 1024 * 1024,
    });
    if (archive.status !== 0 || !Buffer.isBuffer(archive.stdout)) {
      throw new Error("CLEAN_ROOM_HEAD_ARCHIVE_FAILED");
    }
    const extracted = spawnSync("tar", ["-xf", "-", "-C", cleanRoot], {
      input: archive.stdout,
      encoding: null,
      maxBuffer: 16 * 1024 * 1024,
    });
    if (extracted.status !== 0) throw new Error("CLEAN_ROOM_HEAD_EXTRACT_FAILED");
    copyIntendedSource(cleanRoot, changedEntries);
    const dependencies = spawnSync(
      "cp",
      ["-cR", resolve(root, "node_modules"), resolve(cleanRoot, "node_modules")],
      { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    );
    if (dependencies.status !== 0) {
      throw new Error("CLEAN_ROOM_DEPENDENCY_CLONE_FAILED");
    }
    typecheck = runCleanRoomGate(cleanRoot, "typecheck");
    build = runCleanRoomGate(cleanRoot, "build");
  } finally {
    rmSync(tempParent, { recursive: true, force: true });
    cleanup = existsSync(tempParent) ? "FAIL" : "PASS";
  }

  const headReproducible = requiredUntracked.length === 0 && requiredModified.length === 0;
  const intendedSnapshotBuilds = typecheck?.status === "PASS" && build?.status === "PASS";
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status:
      headReproducible && intendedSnapshotBuilds
        ? "PASS"
        : headReproducible
          ? "FAIL_CLEAN_ROOM_BUILD"
          : "FAIL_HEAD_NOT_REPRODUCIBLE",
    head: runGit(["rev-parse", "HEAD"]).trim(),
    branch: runGit(["branch", "--show-current"]).trim(),
    trackedFileCountAtHead: trackedAtHead.size,
    workingTree: {
      changedEntries,
      ignoredEntries,
      modifiedTrackedCount: changedEntries.filter((entry) => entry.gitStatus !== "??").length,
      untrackedCount: changedEntries.filter((entry) => entry.gitStatus === "??").length,
      requiredModifiedCount: requiredModified.length,
      requiredUntrackedCount: requiredUntracked.length,
      requiredModifiedFiles: requiredModified,
      requiredUntrackedFiles: requiredUntracked,
      ignoredImplementationFiles: ignoredImplementation,
      generatedEvidenceCount: generatedEvidence.length,
      localSecretPaths,
    },
    cleanCheckout: {
      reproducibleFromHead: headReproducible,
      exactMissingRequiredFiles: requiredUntracked,
      exactChangedRequiredFiles: requiredModified,
      blocker: headReproducible ? null : "F-004_REQUIRED_IMPLEMENTATION_NOT_RECORDED_AT_HEAD",
    },
    intendedWorkingTreeSnapshot: {
      environment: "DOCUMENTED_LOCAL_ENV_WITH_AI_DISABLED_AND_NO_PROVIDER_KEY",
      nodeModules: "COPY_ON_WRITE_CLONE_OF_CURRENT_LOCKFILE_INSTALL_FOR_OFFLINE_CHECK",
      typecheck,
      build,
      cleanRoomCleanup: cleanup,
    },
    gitMutations: 0,
    remoteMutations: 0,
  };
  if (!verifyOnly) {
    mkdirSync(artifactDirectory, { recursive: true, mode: 0o700 });
    chmodSync(artifactDirectory, 0o700);
    writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
    chmodSync(artifactPath, 0o600);
  }
  process.stdout.write(
    [
      `CLEAN_CHECKOUT_HEAD_REPRODUCIBLE=${headReproducible ? "YES" : "NO"}`,
      `CLEAN_CHECKOUT_REQUIRED_UNTRACKED=${requiredUntracked.length}`,
      `CLEAN_CHECKOUT_REQUIRED_MODIFIED=${requiredModified.length}`,
      `CLEAN_ROOM_TYPECHECK=${typecheck?.status ?? "NOT_RUN"}`,
      `CLEAN_ROOM_BUILD=${build?.status ?? "NOT_RUN"}`,
      `CLEAN_ROOM_CLEANUP=${cleanup}`,
      `CLEAN_CHECKOUT_REPRODUCIBILITY=${report.status}`,
      "",
    ].join("\n"),
  );
  if (!headReproducible || !intendedSnapshotBuilds || cleanup !== "PASS") {
    process.exitCode = 1;
  }
}

main();
