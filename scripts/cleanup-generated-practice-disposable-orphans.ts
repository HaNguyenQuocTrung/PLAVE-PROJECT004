import { spawnSync } from "node:child_process";

import { assertProject004Workspace } from "./project004-identity.ts";

const projectSuffix = "plave-project004-clean-proof-[0-9a-f]{11,12}";
const containerPattern = new RegExp(
  `^supabase_(?:db|auth|rest|storage|kong)_${projectSuffix}$`,
  "u",
);
const networkPattern = new RegExp(
  `^supabase_network_${projectSuffix}$`,
  "u",
);

function docker(args: string[]) {
  const result = spawnSync("docker", args, {
    cwd: assertProject004Workspace(),
    env: process.env,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error("DISPOSABLE_ORPHAN_CLEANUP_DOCKER_FAILED");
  }
  return result.stdout
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function assertDisposableOrphanTargets(input: Readonly<{
  containers: readonly string[];
  networks: readonly string[];
}>) {
  if (
    input.containers.length > 500 ||
    input.networks.length > 100 ||
    input.containers.some((name) => !containerPattern.test(name)) ||
    input.networks.some((name) => !networkPattern.test(name))
  ) {
    throw new Error("DISPOSABLE_ORPHAN_CLEANUP_SCOPE_REJECTED");
  }
}

export function cleanupGeneratedPracticeDisposableOrphans() {
  const containers = docker([
    "ps",
    "-a",
    "--format",
    "{{.Names}}",
    "--filter",
    "name=supabase_",
  ]).filter((name) => containerPattern.test(name));
  const networks = docker([
    "network",
    "ls",
    "--format",
    "{{.Name}}",
  ]).filter((name) => networkPattern.test(name));
  assertDisposableOrphanTargets({ containers, networks });
  if (containers.length > 0) {
    docker(["rm", "-f", ...containers]);
  }
  if (networks.length > 0) {
    docker(["network", "rm", ...networks]);
  }
  const remainingContainers = docker([
    "ps",
    "-a",
    "--format",
    "{{.Names}}",
    "--filter",
    "name=supabase_",
  ]).filter((name) => containerPattern.test(name));
  const remainingNetworks = docker([
    "network",
    "ls",
    "--format",
    "{{.Name}}",
  ]).filter((name) => networkPattern.test(name));
  if (
    remainingContainers.length !== 0 ||
    remainingNetworks.length !== 0
  ) {
    throw new Error("DISPOSABLE_ORPHAN_CLEANUP_INCOMPLETE");
  }
  return {
    containersRemoved: containers.length,
    networksRemoved: networks.length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = cleanupGeneratedPracticeDisposableOrphans();
  process.stdout.write(
    [
      `DISPOSABLE_ORPHAN_CONTAINERS_REMOVED=${String(result.containersRemoved)}`,
      `DISPOSABLE_ORPHAN_NETWORKS_REMOVED=${String(result.networksRemoved)}`,
      "OWNER_LOCAL_STACK_TOUCHED=NO",
      "DISPOSABLE_ORPHAN_CLEANUP=PASS",
    ].join("\n") + "\n",
  );
}
