import { createHash } from "node:crypto";
import { appendFileSync, existsSync, lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { canonicalize } from "../lib/content-factory/canonical.ts";
import { finalLocalSourceInventory } from "../lib/release-integration/final-local-acceptance.ts";

type FileEntry = Readonly<{ path: string; indexMode: string; fileMode: string; size: number; sha256: string }>;
type Snapshot = Readonly<{
  schemaVersion: "plave-ci-repository-immutability-v1";
  tracked: readonly FileEntry[];
  untrackedNonIgnored: readonly string[];
  generatorInputPaths: readonly string[];
  generatorInputDigest: string;
  aggregateDigest: string;
}>;

function git(root: string, args: readonly string[]) {
  const result = spawnSync("/usr/bin/git", args, {
    cwd: root,
    encoding: "utf8",
    env: { PATH: "/usr/bin:/bin", LC_ALL: "C", LANG: "C", TZ: "UTC", NODE_ENV: "test" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.status !== 0) throw new Error(`CI_IMMUTABILITY:GIT_FAILED:${args[0] ?? "unknown"}`);
  return String(result.stdout);
}

function canonicalSort(values: readonly string[]) {
  return [...values].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
}

function indexModes(root: string) {
  const output = git(root, ["ls-files", "--stage", "-z"]);
  const modes = new Map<string, string>();
  for (const record of output.split("\0").filter(Boolean)) {
    const match = /^(\d+) [0-9a-f]+ \d+\t([\s\S]+)$/u.exec(record);
    if (!match) throw new Error("CI_IMMUTABILITY:INVALID_INDEX_RECORD");
    modes.set(match[2], match[1]);
  }
  return modes;
}

function sha256File(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function captureCiRepositorySnapshot(root = process.cwd()): Snapshot {
  const modes = indexModes(root);
  const trackedPaths = canonicalSort(git(root, ["ls-files", "--cached", "-z"]).split("\0").filter(Boolean));
  const tracked = trackedPaths.map((path) => {
    const absolute = resolve(root, path);
    if (!existsSync(absolute)) return { path, indexMode: modes.get(path) ?? "MISSING", fileMode: "MISSING", size: -1, sha256: "MISSING" };
    const stat = lstatSync(absolute);
    if (!stat.isFile()) throw new Error(`CI_IMMUTABILITY:TRACKED_NON_FILE:${path}`);
    return {
      path,
      indexMode: modes.get(path) ?? "MISSING",
      fileMode: (stat.mode & 0o777).toString(8).padStart(3, "0"),
      size: stat.size,
      sha256: sha256File(absolute),
    };
  });
  const untrackedNonIgnored = canonicalSort(git(root, ["ls-files", "--others", "--exclude-standard", "-z"]).split("\0").filter(Boolean));
  const missingTracked = tracked.some((entry) => entry.sha256 === "MISSING");
  const source = missingTracked ? { paths: [] as string[], digest: "MISSING_TRACKED_INPUT" } : finalLocalSourceInventory(root);
  const core = { tracked, untrackedNonIgnored, generatorInputPaths: source.paths, generatorInputDigest: source.digest } as const;
  return {
    schemaVersion: "plave-ci-repository-immutability-v1",
    ...core,
    aggregateDigest: createHash("sha256").update(canonicalize(core)).digest("hex"),
  };
}

function baselinePath(root: string) {
  const configured = process.env.PLAVE_CI_IMMUTABILITY_BASELINE;
  if (!configured || !isAbsolute(configured)) throw new Error("CI_IMMUTABILITY:BASELINE_PATH_REQUIRED");
  const target = resolve(configured);
  const rootReal = realpathSync(root);
  const targetParent = realpathSync(dirname(target));
  if (targetParent === rootReal || targetParent.startsWith(`${rootReal}${sep}`)) throw new Error("CI_IMMUTABILITY:BASELINE_MUST_BE_OUTSIDE_REPOSITORY");
  return target;
}

function pathMap(entries: readonly FileEntry[]) {
  return new Map(entries.map((entry) => [entry.path, entry]));
}

export function compareCiRepositorySnapshots(baseline: Snapshot, current: Snapshot) {
  const mutations: Array<Readonly<{ path: string; type: string }>> = [];
  const before = pathMap(baseline.tracked);
  const after = pathMap(current.tracked);
  for (const path of canonicalSort([...new Set([...before.keys(), ...after.keys()])])) {
    const left = before.get(path);
    const right = after.get(path);
    if (!left) mutations.push({ path, type: "TRACKED_ADDED" });
    else if (!right) mutations.push({ path, type: "TRACKED_DELETED" });
    else if (left.indexMode !== right.indexMode || left.fileMode !== right.fileMode) mutations.push({ path, type: "MODE_CHANGED" });
    else if (left.sha256 !== right.sha256 || left.size !== right.size) mutations.push({ path, type: "TRACKED_CONTENT_CHANGED" });
  }
  const beforeUntracked = new Set(baseline.untrackedNonIgnored);
  const afterUntracked = new Set(current.untrackedNonIgnored);
  for (const path of current.untrackedNonIgnored) if (!beforeUntracked.has(path)) mutations.push({ path, type: "UNEXPECTED_UNTRACKED_SOURCE" });
  for (const path of baseline.untrackedNonIgnored) if (!afterUntracked.has(path)) mutations.push({ path, type: "BASELINE_UNTRACKED_REMOVED" });
  if (canonicalize(baseline.generatorInputPaths) !== canonicalize(current.generatorInputPaths)) mutations.push({ path: "<final-local-input-manifest>", type: "GENERATOR_INPUT_MANIFEST_CHANGED" });
  if (baseline.generatorInputDigest !== current.generatorInputDigest) mutations.push({ path: "<final-local-input-digest>", type: "GENERATOR_INPUT_DIGEST_CHANGED" });
  return mutations;
}

function appendSummary(label: string, snapshot: Snapshot, status: "BASELINE" | "PASS" | "FAIL", mutations: readonly Readonly<{ path: string; type: string }>[]) {
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (!summary) return;
  const lines = [
    `### Repository immutability: ${label}`,
    `- Result: ${status}`,
    `- Tracked files: ${snapshot.tracked.length}`,
    `- Untracked non-ignored files: ${snapshot.untrackedNonIgnored.length}`,
    `- Final-local inputs: ${snapshot.generatorInputPaths.length}`,
    `- Aggregate digest: \`${snapshot.aggregateDigest}\``,
    ...mutations.map((entry) => `- ${entry.type}: \`${entry.path}\``),
    "",
  ];
  appendFileSync(summary, `${lines.join("\n")}\n`, { encoding: "utf8" });
}

function main() {
  const [mode, label = "unnamed"] = process.argv.slice(2);
  const root = process.cwd();
  const target = baselinePath(root);
  const current = captureCiRepositorySnapshot(root);
  if (mode === "initialize") {
    writeFileSync(target, `${canonicalize(current)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    appendSummary(label, current, "BASELINE", []);
    console.log(`CI_REPOSITORY_IMMUTABILITY_BASELINE_OK tracked=${current.tracked.length} inputs=${current.generatorInputPaths.length} digest=${current.aggregateDigest}`);
    return;
  }
  if (mode !== "verify") throw new Error("CI_IMMUTABILITY:MODE_MUST_BE_INITIALIZE_OR_VERIFY");
  const baseline = JSON.parse(readFileSync(target, "utf8")) as Snapshot;
  const mutations = compareCiRepositorySnapshots(baseline, current);
  appendSummary(label, current, mutations.length === 0 ? "PASS" : "FAIL", mutations);
  for (const mutation of mutations) console.error(`CI_REPOSITORY_MUTATION type=${mutation.type} path=${mutation.path}`);
  if (mutations.length !== 0) throw new Error(`CI_IMMUTABILITY:MUTATIONS_DETECTED:${mutations.length}`);
  console.log(`CI_REPOSITORY_IMMUTABILITY_OK label=${label} tracked=${current.tracked.length} inputs=${current.generatorInputPaths.length} digest=${current.aggregateDigest}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
