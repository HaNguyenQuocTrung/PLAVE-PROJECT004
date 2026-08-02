import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { basename, relative, resolve } from "node:path";

import { assertProject004Workspace } from "./project004-identity.ts";

type ScanHit = Readonly<{ path: string; occurrences: number; surface: string }>;

const root = assertProject004Workspace();
const devDirectory = resolve(root, ".next-secret-boundary-dev");
const buildDirectory = resolve(root, ".next-secret-boundary-build");
const artifactDirectory = resolve(root, "artifacts/remediation");
const artifactPath = resolve(artifactDirectory, "secret-boundary.json");
const nextBinary = resolve(root, "node_modules/next/dist/bin/next");

function countBufferOccurrences(buffer: Buffer, needle: Buffer) {
  let count = 0;
  let offset = 0;
  while ((offset = buffer.indexOf(needle, offset)) !== -1) {
    count += 1;
    offset += needle.length;
  }
  return count;
}

function scanPath(
  candidate: string,
  canary: Buffer,
  surface: string,
  hits: ScanHit[],
) {
  if (!existsSync(candidate)) return;
  const metadata = lstatSync(candidate);
  if (metadata.isSymbolicLink()) return;
  if (metadata.isDirectory()) {
    for (const entry of readdirSync(candidate)) {
      scanPath(resolve(candidate, entry), canary, surface, hits);
    }
    return;
  }
  if (!metadata.isFile()) return;
  const occurrences = countBufferOccurrences(readFileSync(candidate), canary);
  if (occurrences > 0) {
    hits.push({
      path: relative(root, candidate),
      occurrences,
      surface,
    });
  }
}

async function freeLoopbackPort() {
  return new Promise<number>((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("SECRET_BOUNDARY_PORT_RESOLUTION_FAILED"));
        return;
      }
      const port = address.port;
      server.close((error) => (error ? reject(error) : resolvePort(port)));
    });
  });
}

function collectOutput(child: ChildProcess) {
  let output = "";
  const append = (chunk: Buffer) => {
    if (output.length < 2_000_000) output += chunk.toString();
  };
  child.stdout?.on("data", append);
  child.stderr?.on("data", append);
  return () => output;
}

async function waitForExit(child: ChildProcess) {
  return new Promise<number>((resolveExit) => {
    child.once("exit", (code, signal) => {
      resolveExit(code ?? (signal ? 128 : 1));
    });
  });
}

async function stopProcessTree(child: ChildProcess | null) {
  if (!child?.pid || child.exitCode !== null) return;
  const exited = waitForExit(child);
  try {
    if (process.platform === "win32") child.kill("SIGTERM");
    else process.kill(-child.pid, "SIGTERM");
  } catch {
    return;
  }
  const stopped = await Promise.race([
    exited.then(() => true),
    new Promise<false>((resolveWait) => setTimeout(() => resolveWait(false), 10_000)),
  ]);
  if (!stopped && child.pid) {
    try {
      if (process.platform === "win32") child.kill("SIGKILL");
      else process.kill(-child.pid, "SIGKILL");
    } catch {
      // The process may have exited between checks.
    }
  }
}

async function waitForCompiledRoute(baseUrl: string) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/tutor/stream`, {
        signal: AbortSignal.timeout(3_000),
      });
      if (response.status >= 200) return response.status;
    } catch {
      // The dev server is still compiling.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 350));
  }
  throw new Error("SECRET_BOUNDARY_DEV_READINESS_TIMEOUT");
}

function spawnNext(args: string[], environment: NodeJS.ProcessEnv) {
  return spawn(process.execPath, [nextBinary, ...args], {
    cwd: root,
    env: environment,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function main() {
  if (!existsSync(nextBinary)) throw new Error("SECRET_BOUNDARY_NEXT_BINARY_MISSING");
  const localEnvironment = readFileSync(resolve(root, ".env.local"), "utf8");
  const configuredKey = localEnvironment.match(/^GOOGLE_API_KEY=(.*)$/mu)?.[1]?.trim() ?? "";
  if (configuredKey) throw new Error("SECRET_BOUNDARY_REAL_KEY_MUST_BE_UNSET");

  const canaryValue = `PLAVE_CANARY_${randomBytes(32).toString("hex")}`;
  const canary = Buffer.from(canaryValue);
  const commonEnvironment: NodeJS.ProcessEnv = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_secret_boundary_test_only",
    PLAVE_AI_TUTOR_ENABLED: "true",
    PLAVE_AI_PROVIDER: "GOOGLE",
    GOOGLE_API_KEY: canaryValue,
    GOOGLE_AI_MODEL: "gemini-3.6-flash",
    PLAVE_AI_TUTOR_TEST_MODE: "true",
    OPENAI_API_KEY: "",
  };
  const previousUmask = process.umask(0o077);
  let devChild: ChildProcess | null = null;
  let devLog = "";
  let buildLog = "";
  let devRouteStatus: number | null = null;
  let buildExitCode: number | null = null;
  const hits: ScanHit[] = [];
  const cacheModes: Array<{ path: string; mode: string }> = [];
  let report: Record<string, unknown> = {};
  try {
    rmSync(devDirectory, { recursive: true, force: true });
    rmSync(buildDirectory, { recursive: true, force: true });

    const port = await freeLoopbackPort();
    devChild = spawnNext(
      ["dev", "--hostname", "127.0.0.1", "--port", String(port)],
      { ...commonEnvironment, PLAVE_SECRET_BOUNDARY_AUDIT_MODE: "DEV" },
    );
    const getDevLog = collectOutput(devChild);
    devRouteStatus = await waitForCompiledRoute(`http://127.0.0.1:${port}`);
    await stopProcessTree(devChild);
    devLog = getDevLog();
    scanPath(devDirectory, canary, "DEV_CACHE_AND_OUTPUT", hits);
    if (existsSync(devDirectory)) {
      cacheModes.push({
        path: basename(devDirectory),
        mode: (statSync(devDirectory).mode & 0o777).toString(8).padStart(3, "0"),
      });
    }
    rmSync(devDirectory, { recursive: true, force: true });

    const buildChild = spawnNext(
      ["build"],
      { ...commonEnvironment, PLAVE_SECRET_BOUNDARY_AUDIT_MODE: "BUILD" },
    );
    const getBuildLog = collectOutput(buildChild);
    buildExitCode = await waitForExit(buildChild);
    buildLog = getBuildLog();

    scanPath(buildDirectory, canary, "PRODUCTION_BUILD", hits);
    if (existsSync(buildDirectory)) {
      cacheModes.push({
        path: basename(buildDirectory),
        mode: (statSync(buildDirectory).mode & 0o777).toString(8).padStart(3, "0"),
      });
    }
    for (const sourcePath of ["app", "components", "lib", "scripts", "tests", "next.config.ts"]) {
      scanPath(resolve(root, sourcePath), canary, "SOURCE", hits);
    }
    for (const evidencePath of ["artifacts", ".local-artifacts", "public"]) {
      scanPath(resolve(root, evidencePath), canary, "ARTIFACT_LOG_OR_PUBLIC", hits);
    }
    const inMemoryLogOccurrences =
      countBufferOccurrences(Buffer.from(devLog), canary) +
      countBufferOccurrences(Buffer.from(buildLog), canary);
    const clientHits = hits.filter(({ path }) =>
      /(?:^|\/)(?:static|client|chunks)(?:\/|$)/u.test(path),
    );
    const passed =
      buildExitCode === 0 &&
      devRouteStatus !== null &&
      hits.length === 0 &&
      clientHits.length === 0 &&
      inMemoryLogOccurrences === 0;
    report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      status: passed ? "PASS" : "FAIL",
      providerRequestsMade: 0,
      realKeyUsed: false,
      canaryPersisted: false,
      canaryFingerprintStored: false,
      devRouteStatus,
      buildExitCode,
      buildFailureSummary:
        buildExitCode === 0
          ? null
          : buildLog
              .replaceAll(canaryValue, "[REDACTED_CANARY]")
              .split("\n")
              .filter((line) => /(?:error|fail|exited)/iu.test(line))
              .slice(-8),
      canaryOccurrences: hits.reduce((sum, hit) => sum + hit.occurrences, 0),
      clientStaticOccurrences: clientHits.reduce((sum, hit) => sum + hit.occurrences, 0),
      logOccurrences: inMemoryLogOccurrences,
      matchingFiles: hits,
      cacheDirectoryModes: cacheModes,
      sourceBoundary: "PASS_WHEN_ZERO",
      cleanup: "PENDING",
    };
  } finally {
    await stopProcessTree(devChild);
    rmSync(devDirectory, { recursive: true, force: true });
    rmSync(buildDirectory, { recursive: true, force: true });
    process.umask(previousUmask);
  }

  report.cleanup =
    !existsSync(devDirectory) && !existsSync(buildDirectory) ? "PASS" : "FAIL";
  mkdirSync(artifactDirectory, { recursive: true, mode: 0o700 });
  chmodSync(artifactDirectory, 0o700);
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  chmodSync(artifactPath, 0o600);
  if (report.status !== "PASS" || report.cleanup !== "PASS") {
    throw new Error("SECRET_BOUNDARY_AUDIT_FAILED");
  }
  process.stdout.write(
    [
      "SECRET_BOUNDARY_CANARY=PASS",
      "SECRET_BOUNDARY_CLIENT_STATIC=PASS",
      "SECRET_BOUNDARY_LOG_ARTIFACT=PASS",
      "SECRET_BOUNDARY_CLEANUP=PASS",
      "SECURITY_SECRET_BOUNDARY=PASS",
      "",
    ].join("\n"),
  );
}

await main();
