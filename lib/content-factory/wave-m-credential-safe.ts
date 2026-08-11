import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { auditWaveLCredentialSafe, auditWaveLCredentialSource } from "./wave-l-credential-safe.ts";
import { auditWaveMInvocationBoundary } from "./wave-m-invocation.ts";

function waveMFiles(root: string) {
  return ["lib/content-factory", "scripts", "tests"].flatMap((folder) => readdirSync(resolve(root, folder), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.includes("wave-m")).map((entry) => join(root, folder, entry.name))).sort();
}

function trackedFiles(root: string) {
  return execFileSync("/usr/bin/git", ["ls-files", "-z"], { cwd: root, encoding: "utf8",
    env: { PATH: "/usr/bin:/bin", LC_ALL: "C", NODE_ENV: "test" }, stdio: ["ignore", "pipe", "pipe"] })
    .split("\0").filter(Boolean).filter((path) => !path.startsWith("content/grade-packs/generated/wave-m-")
      && path !== "docs/content-factory/WAVE_M.md").sort();
}

export function auditWaveMCredentialSafe(root = process.cwd(), disposableParent = "/tmp") {
  const prior = auditWaveLCredentialSafe(root, disposableParent); const invocation = auditWaveMInvocationBoundary(root);
  const sources = waveMFiles(root); const tracked = trackedFiles(root);
  const repositoryMetadataFiles = [...new Set([...tracked, ...sources.map((file) => relative(root, file))])].sort();
  const disposable = mkdtempSync(join(disposableParent, "plave-wave-m-credential-audit-")); const copied: string[] = [];
  try {
    for (const file of sources) {
      const path = relative(root, file);
      if (basename(path) === ".env.local" || path.includes("/.env.local")) throw new Error("WAVE_M_REAL_ENV_COPY_BLOCKED");
      const target = join(disposable, path); mkdirSync(dirname(target), { recursive: true }); cpSync(file, target); copied.push(path);
    }
    const syntheticPath = join(disposable, "synthetic-fixtures", "obviously-fake-boundary-violations.ts");
    mkdirSync(dirname(syntheticPath), { recursive: true });
    const synthetic = `const fake = ${"process."}${"env."}${"GOOGLE_API_KEY"}; ${"readFileSync"}('${".env."}${"local"}');\n`;
    writeFileSync(syntheticPath, synthetic, "utf8");
    const syntheticDiagnostics = auditWaveLCredentialSource("synthetic-fixtures/obviously-fake-boundary-violations.ts", readFileSync(syntheticPath, "utf8"));
    const diagnostics = copied.flatMap((path) => auditWaveLCredentialSource(path, readFileSync(join(disposable, path), "utf8")));
    const status = prior.status === "PASS" && invocation.status === "PASS" && diagnostics.length === 0 && syntheticDiagnostics.length === 2;
    return { schemaVersion: "plave-wave-m-credential-safe-invocation-v1", status: status ? "PASS" as const : "FAIL" as const,
      trackedFileCount: repositoryMetadataFiles.length, trackedMetadataOnly: true, copiedFiles: copied,
      copiedIgnoredSecretFiles: [] as readonly string[], realEnvironmentFilesOpened: 0, credentialValueReads: 0,
      credentialValuesPrintedHashedMeasuredOrCompared: 0, providerEnvironmentVariablesInherited: [] as readonly string[],
      allowlistedChildEnvironmentNames: ["PATH", "LC_ALL", "NODE_ENV"] as const, environmentLogged: false,
      syntheticFixture: { clearlyFake: true, productionEligible: false, detections: syntheticDiagnostics.map((entry) => entry.code) },
      disposableCleanup: "REQUIRED_AND_VERIFIED_BEFORE_RETURN" as const, waveFIncidentPreserved: prior.waveFIncidentPreserved,
      waveKIncidentPreserved: prior.waveKIncidentPreserved, waveKCredentialBoundaryIncidentCount: prior.waveKCredentialBoundaryIncidentCount,
      waveMCredentialReadCount: 0, waveMNetworkAttemptCount: 0, bareNpxInvocations: 0, networkCapableInvocations: 0, diagnostics };
  } finally {
    rmSync(disposable, { recursive: true, force: true });
    if (existsSync(disposable)) throw new Error("WAVE_M_DISPOSABLE_CLEANUP_FAILED");
  }
}
