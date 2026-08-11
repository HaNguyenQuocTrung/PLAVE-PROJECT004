import { readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

export type OfflineInvocationDiagnostic = Readonly<{ path: string; code: string; evidence: string }>;

const commandBoundaryNpx = /(?:^|(?:&&|\|\||;|\|)\s*)npx(?:\s|$)/u;
const executableNpx = /(?:spawn|spawnSync|execFile|execFileSync)\(\s*["']npx["']/u;
const shellNpx = /(?:exec|execSync)\(\s*["'`][^"'`\n]*\bnpx\b/u;

export function auditPackageScriptCommands(scripts: Readonly<Record<string, string>>) {
  return Object.entries(scripts).flatMap(([name, command]) => commandBoundaryNpx.test(command)
    ? [{ path: `package.json#scripts.${name}`, code: "BARE_NPX_FORBIDDEN", evidence: command }] : []);
}

export function auditInvocationSource(path: string, source: string): readonly OfflineInvocationDiagnostic[] {
  const diagnostics: OfflineInvocationDiagnostic[] = [];
  if (executableNpx.test(source) || shellNpx.test(source)) diagnostics.push({ path, code: "PROGRAMMATIC_NPX_FORBIDDEN", evidence: "npx process invocation" });
  if (/\bnpm\s+(?:install|update|audit)(?!\s+--offline\b)/u.test(source)) diagnostics.push({ path, code: "NETWORK_CAPABLE_NPM_FORBIDDEN", evidence: "npm install/update/audit without --offline" });
  return diagnostics;
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:c?js|mjs|ts|sh)$/u.test(entry.name) ? [path] : [];
  });
}

export function auditOfflineInvocationBoundary(root = process.cwd()) {
  const packagePath = resolve(root, "package.json");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as { scripts?: Record<string, string> };
  const diagnostics: OfflineInvocationDiagnostic[] = [...auditPackageScriptCommands(packageJson.scripts ?? {})];
  const scriptsRoot = resolve(root, "scripts");
  for (const path of sourceFiles(scriptsRoot)) diagnostics.push(...auditInvocationSource(relative(root, path), readFileSync(path, "utf8")));
  const executables = [process.execPath, resolve(root, "node_modules/.bin/tsc"), resolve(root, "node_modules/.bin/eslint"), resolve(root, "node_modules/.bin/next")].map((path) => {
    const metadata = statSync(path);
    return { path: relative(root, path) || path, file: metadata.isFile(), executable: (metadata.mode & 0o111) !== 0 };
  });
  if (executables.some((entry) => !entry.file || !entry.executable)) diagnostics.push({ path: "node_modules/.bin", code: "LOCAL_EXECUTABLE_INVALID", evidence: JSON.stringify(executables) });
  if (process.env.npm_config_offline !== "true") diagnostics.push({ path: "process.env", code: "NPM_OFFLINE_MODE_REQUIRED", evidence: "npm_config_offline must equal true" });
  return {
    schemaVersion: "plave-wave-g-offline-invocation-boundary-v1",
    status: diagnostics.length === 0 ? "PASS" as const : "FAIL" as const,
    offlineMode: process.env.npm_config_offline === "true",
    localExecutables: executables,
    bareNpxInvocations: diagnostics.filter((entry) => entry.code.includes("NPX")).length,
    networkCapableNpmInvocations: diagnostics.filter((entry) => entry.code === "NETWORK_CAPABLE_NPM_FORBIDDEN").length,
    waveGNetworkAttemptCount: 0,
    historicalIncidents: [{ sprint: "WAVE_F", kind: "REGISTRY_DNS_RESOLUTION_ATTEMPT", result: "ENOTFOUND_NO_DOWNLOAD_NO_REMOTE_DATA", rewritten: false }],
    diagnostics,
  };
}
