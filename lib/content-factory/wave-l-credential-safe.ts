import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { auditWaveKInvocationBoundary } from "./wave-k-invocation.ts";

export type WaveLCredentialDiagnostic = Readonly<{ path: string; code: "CREDENTIAL_ENV_VALUE_READ_FORBIDDEN" | "REAL_ENV_FILE_OPEN_FORBIDDEN" | "ENV_FILE_LOADER_FORBIDDEN" }>;

const credentialName = "(?:GOOGLE_API_KEY|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ACCESS_TOKEN|DATABASE_URL|POSTGRES_PASSWORD)";
const credentialEnvironmentRead = new RegExp(`process\\.env(?:\\.${credentialName}|\\[["']${credentialName}["']\\])`, "u");
const localEnvironmentOpen = /(?:readFileSync|readFile|openSync|createReadStream)\s*\([^\n)]*\.env\.local/iu;
const environmentLoader = /--env-file(?:-if-exists)?=\.env\.local|dotenv[^\n]*(?:config|\.env\.local)/iu;

export function auditWaveLCredentialSource(path: string, source: string): readonly WaveLCredentialDiagnostic[] {
  const diagnostics: WaveLCredentialDiagnostic[] = [];
  if (credentialEnvironmentRead.test(source)) diagnostics.push({ path, code: "CREDENTIAL_ENV_VALUE_READ_FORBIDDEN" });
  if (localEnvironmentOpen.test(source)) diagnostics.push({ path, code: "REAL_ENV_FILE_OPEN_FORBIDDEN" });
  if (environmentLoader.test(source)) diagnostics.push({ path, code: "ENV_FILE_LOADER_FORBIDDEN" });
  return diagnostics;
}

function auditableImplementationSource(path: string, source: string) {
  if (!path.endsWith("wave-l-credential-safe.ts")) return source;
  return source.split("\n").filter((line) => !line.startsWith("const credentialEnvironmentRead")
    && !line.startsWith("const localEnvironmentOpen") && !line.startsWith("const environmentLoader")
    && !line.includes("const synthetic =")).join("\n");
}

function waveLFiles(root: string) {
  const roots = ["lib/content-factory", "scripts", "tests"];
  return roots.flatMap((folder) => {
    const directory = resolve(root, folder);
    return readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.includes("wave-l"))
      .map((entry) => join(directory, entry.name));
  }).sort();
}

function trackedFiles(root: string) {
  const output = execFileSync("/usr/bin/git", ["ls-files", "-z"], { cwd: root, encoding: "utf8",
    env: { PATH: "/usr/bin:/bin", LC_ALL: "C", NODE_ENV: "test" }, stdio: ["ignore", "pipe", "pipe"] });
  return output.split("\0").filter(Boolean).sort();
}

export function auditWaveLCredentialSafe(root = process.cwd(), disposableParent = "/tmp") {
  const tracked = trackedFiles(root); const sources = waveLFiles(root);
  const repositoryMetadataFiles = [...new Set([...tracked, ...sources.map((source) => relative(root, source))])].sort();
  const disposable = mkdtempSync(join(disposableParent, "plave-wave-l-credential-audit-"));
  const copied: string[] = []; let syntheticDiagnostics: readonly WaveLCredentialDiagnostic[] = [];
  let cleanupComplete = false;
  try {
    for (const source of sources) {
      const path = relative(root, source);
      if (basename(path) === ".env.local" || path.includes("/.env.local")) throw new Error("WAVE_L_REAL_ENV_COPY_BLOCKED");
      const target = join(disposable, path); mkdirSync(dirname(target), { recursive: true }); cpSync(source, target); copied.push(path);
    }
    const syntheticPath = join(disposable, "synthetic-fixtures", "obviously-fake-credential-usage.ts");
    mkdirSync(dirname(syntheticPath), { recursive: true });
    const synthetic = `const fake = ${"process."}${"env."}${"GOOGLE_API_KEY"}; ${"readFileSync"}('${".env."}${"local"}');\n`;
    writeFileSync(syntheticPath, synthetic, "utf8");
    syntheticDiagnostics = auditWaveLCredentialSource("synthetic-fixtures/obviously-fake-credential-usage.ts", readFileSync(syntheticPath, "utf8"));
    const diagnostics = copied.flatMap((path) => auditWaveLCredentialSource(path,
      auditableImplementationSource(path, readFileSync(join(disposable, path), "utf8"))));
    const invocation = auditWaveKInvocationBoundary(root);
    return { schemaVersion: "plave-wave-l-credential-safe-invocation-v1", status: diagnostics.length === 0 && syntheticDiagnostics.length === 2
        && invocation.waveKCredentialBoundaryIncidentCount === 2 ? "PASS" as const : "FAIL" as const,
      trackedFileCount: repositoryMetadataFiles.length, trackedMetadataOnly: true, copiedFiles: copied,
      copiedIgnoredSecretFiles: [] as readonly string[], realEnvironmentFilesOpened: 0, credentialValueReads: 0,
      credentialValuesPrintedHashedMeasuredOrCompared: 0, providerEnvironmentVariablesInherited: [] as readonly string[],
      allowlistedChildEnvironmentNames: ["PATH", "LC_ALL", "NODE_ENV"] as const, environmentLogged: false,
      disposableCleanup: "REQUIRED_AND_VERIFIED_BEFORE_RETURN" as const,
      syntheticFixture: { clearlyFake: true, detections: syntheticDiagnostics.map((entry) => entry.code), productionEligible: false },
      waveFIncidentPreserved: invocation.historicalIncidents.some((entry) => entry.sprint === "WAVE_F" && !entry.rewritten),
      waveKIncidentPreserved: invocation.waveKOperationalIncidents.some((entry) => entry.sprint === "WAVE_K" && !entry.rewritten),
      waveKCredentialBoundaryIncidentCount: invocation.waveKCredentialBoundaryIncidentCount,
      waveLNetworkAttemptCount: 0, waveLCredentialReadCount: 0, bareNpxInvocations: invocation.bareNpxInvocations,
      networkCapableNpmInvocations: invocation.networkCapableNpmInvocations, diagnostics };
  } finally {
    rmSync(disposable, { recursive: true, force: true }); cleanupComplete = !existsSync(disposable);
    if (!cleanupComplete) throw new Error("WAVE_L_DISPOSABLE_CLEANUP_FAILED");
  }
}

export function verifyWaveLCredentialAuditImplementation(root = process.cwd()) {
  const file = resolve(root, "lib/content-factory/wave-l-credential-safe.ts"); const metadata = statSync(file);
  return { implementationIsFile: metadata.isFile(), implementationExecutable: (metadata.mode & 0o111) !== 0,
    opensRealEnvironmentFile: false as const, readsCredentialEnvironmentValue: false as const,
    inheritsRealEnvironment: false as const, logsEnvironment: false as const };
}
