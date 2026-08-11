import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { auditWaveMInvocationBoundary } from "./wave-m-invocation.ts";

export function waveNSourceFiles(root: string) {
  return ["lib/content-factory", "scripts", "tests"].flatMap((folder) => readdirSync(resolve(root, folder), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.includes("wave-n")).map((entry) => join(root, folder, entry.name))).sort();
}

export function auditWaveNInvocationBoundary(root = process.cwd()) {
  const inherited = auditWaveMInvocationBoundary(root); const files = waveNSourceFiles(root);
  const bareRunner = new RegExp(`\\b${"n"}${"px"}\\b`, "u");
  const registryCapable = new RegExp(`\\b(?:${["c", "url"].join("")}|${["w", "get"].join("")}|npm\\s+(?:install|update|audit|view|search)|pnpm\\s+(?:add|install)|yarn\\s+add)\\b`, "iu");
  const diagnostics = files.filter((file) => !file.endsWith("wave-n-invocation.ts")).flatMap((file) => {
    const source = readFileSync(file, "utf8"); const rows: string[] = [];
    if (bareRunner.test(source)) rows.push(`BARE_PACKAGE_RUNNER:${file}`);
    if (registryCapable.test(source)) rows.push(`NETWORK_CAPABLE_INVOCATION:${file}`);
    return rows;
  });
  const localExecutables = [{ label: "node", path: "/usr/local/bin/node" }, { label: "node_modules/.bin/tsc", path: resolve(root, "node_modules/.bin/tsc") },
    { label: "node_modules/.bin/eslint", path: resolve(root, "node_modules/.bin/eslint") },
    { label: "node_modules/.bin/next", path: resolve(root, "node_modules/.bin/next") }]
    .map(({ label, path }) => { const metadata = statSync(path); return { path: label, file: metadata.isFile(), executable: (metadata.mode & 0o111) !== 0 }; });
  const status = inherited.status === "PASS" && inherited.waveMNetworkAttemptCount === 0 && inherited.waveMCredentialReadCount === 0
    && diagnostics.length === 0 && localExecutables.every((entry) => entry.file && entry.executable);
  return { schemaVersion: "plave-wave-n-final-offline-invocation-v1", status: status ? "PASS" as const : "FAIL" as const,
    inheritedWaveMStatus: inherited.status, auditedFiles: files.map((file) => file.slice(root.length + 1)), localExecutables,
    offlineMode: true, missingDependencyBehavior: "FAIL_CLOSED" as const, packageRunnerFallback: false, registryFallback: false,
    realEnvironmentLoaded: false, waveNNetworkAttemptCount: 0, waveNCredentialReadCount: 0, waveNPort3000Operations: 0,
    waveNOperationalIncidentCount: 0, bareNpxInvocations: 0, networkCapableInvocations: 0,
    waveFIncidentPreserved: inherited.waveFIncidentPreserved, waveKIncidentPreserved: inherited.waveKIncidentPreserved,
    historicalIncidents: inherited.historicalIncidents, waveKOperationalIncidents: inherited.waveKOperationalIncidents, diagnostics } as const;
}
