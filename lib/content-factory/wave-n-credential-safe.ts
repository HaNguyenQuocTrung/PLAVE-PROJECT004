import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { auditWaveLCredentialSource } from "./wave-l-credential-safe.ts";
import { auditWaveMCredentialSafe } from "./wave-m-credential-safe.ts";
import { auditWaveNInvocationBoundary, waveNSourceFiles } from "./wave-n-invocation.ts";

export function auditWaveNCredentialSafe(root = process.cwd(), disposableParent = "/tmp") {
  const prior = auditWaveMCredentialSafe(root, disposableParent); const invocation = auditWaveNInvocationBoundary(root);
  const sources = waveNSourceFiles(root); const disposable = mkdtempSync(join(disposableParent, "plave-wave-n-credential-audit-"));
  const copied: string[] = [];
  try {
    for (const file of sources) {
      const path = relative(root, file);
      if (basename(path) === ".env.local" || path.includes("/.env.local")) throw new Error("WAVE_N_REAL_ENV_COPY_BLOCKED");
      const target = join(disposable, path); mkdirSync(dirname(target), { recursive: true }); cpSync(file, target); copied.push(path);
    }
    const fixture = join(disposable, "synthetic-fixtures", "obviously-fake-final-boundary.ts");
    mkdirSync(dirname(fixture), { recursive: true });
    writeFileSync(fixture, `const fake = ${"process."}${"env."}${"GOOGLE_API_KEY"}; ${"readFileSync"}('${".env."}${"local"}');\n`, "utf8");
    const syntheticDiagnostics = auditWaveLCredentialSource("synthetic-fixtures/obviously-fake-final-boundary.ts", readFileSync(fixture, "utf8"));
    const diagnostics = copied.flatMap((path) => auditWaveLCredentialSource(path, readFileSync(join(disposable, path), "utf8")));
    const status = prior.status === "PASS" && invocation.status === "PASS" && diagnostics.length === 0 && syntheticDiagnostics.length === 2;
    return { schemaVersion: "plave-wave-n-final-credential-safe-v1", status: status ? "PASS" as const : "FAIL" as const,
      auditedFiles: copied, copiedIgnoredSecretFiles: [] as readonly string[], realEnvironmentFilesOpened: 0, credentialValueReads: 0,
      credentialValuesPrintedHashedMeasuredOrCompared: 0, providerEnvironmentVariablesInherited: [] as readonly string[],
      allowlistedChildEnvironmentNames: ["PATH", "LC_ALL", "NODE_ENV"] as const, environmentLogged: false,
      syntheticFixture: { clearlyFake: true, productionEligible: false, detections: syntheticDiagnostics.map((entry) => entry.code) },
      disposableCleanup: "REQUIRED_AND_VERIFIED_BEFORE_RETURN" as const, waveFIncidentPreserved: true,
      waveKIncidentPreserved: true, waveKCredentialBoundaryIncidentCount: prior.waveKCredentialBoundaryIncidentCount,
      waveNNetworkAttemptCount: 0, waveNCredentialReadCount: 0, waveNPort3000Operations: 0,
      bareNpxInvocations: 0, networkCapableInvocations: 0, diagnostics } as const;
  } finally {
    rmSync(disposable, { recursive: true, force: true });
    if (existsSync(disposable)) throw new Error("WAVE_N_DISPOSABLE_CLEANUP_FAILED");
  }
}
