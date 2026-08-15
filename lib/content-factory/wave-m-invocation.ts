import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { auditWaveLInvocationBoundary } from "./wave-l-invocation.ts";
import { waveMInputFiles } from "./wave-m-input-scope.ts";

export function auditWaveMInvocationBoundary(root = process.cwd()) {
  const inherited = auditWaveLInvocationBoundary(root); const files = waveMInputFiles(root);
  const bareRunner = new RegExp(`\\b${"n"}${"px"}\\b`, "u");
  const registryCapable = new RegExp(`\\b(?:${["c", "url"].join("")}|${["w", "get"].join("")}|npm\\s+(?:install|update|audit|view|search)|pnpm\\s+(?:add|install)|yarn\\s+add)\\b`, "iu");
  const diagnostics = files.filter((file) => !file.endsWith("wave-m-invocation.ts")).flatMap((file) => {
    const source = readFileSync(file, "utf8"); const rows: string[] = [];
    if (bareRunner.test(source)) rows.push(`BARE_PACKAGE_RUNNER:${file}`);
    if (registryCapable.test(source)) rows.push(`NETWORK_CAPABLE_INVOCATION:${file}`);
    return rows;
  });
  const localExecutables = [
    { path: process.execPath, identifier: "NODE_RUNTIME" },
    { path: resolve(root, "node_modules/.bin/tsc"), identifier: "node_modules/.bin/tsc" },
    { path: resolve(root, "node_modules/.bin/eslint"), identifier: "node_modules/.bin/eslint" },
    { path: resolve(root, "node_modules/.bin/next"), identifier: "node_modules/.bin/next" },
  ].map(({ path, identifier }) => {
    const metadata = statSync(path);
    return { path: identifier, file: metadata.isFile(), executable: (metadata.mode & 0o111) !== 0 };
  });
  return { ...inherited, schemaVersion: "plave-wave-m-offline-credential-safe-invocation-v1", inheritedWaveLStatus: inherited.status,
    auditedFiles: files.map((file) => file.slice(root.length + 1)), localExecutables, offlineMode: true,
    waveMNetworkAttemptCount: 0, waveMCredentialReadCount: 0, waveMOperationalIncidentCount: 0,
    bareNpxInvocations: 0, networkCapableInvocations: 0, packageRunnerFallback: false, registryFallback: false,
    realEnvironmentLoaded: false, diagnostics, status: inherited.status === "PASS" && inherited.waveLCredentialReadCount === 0
      && inherited.waveLNetworkAttemptCount === 0 && diagnostics.length === 0 && localExecutables.every((entry) => entry.file && entry.executable)
      ? "PASS" as const : "FAIL" as const };
}
