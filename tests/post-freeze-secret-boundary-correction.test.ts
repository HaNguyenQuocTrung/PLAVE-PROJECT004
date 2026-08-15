import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  auditSecretBoundary,
  auditSecretBoundarySource,
  SECRET_BOUNDARY_SCOPE_VERSION,
} from "../lib/security/secret-boundary-audit.ts";

test("official secret-boundary command points only to the credential-safe static audit", () => {
  const packageDocument = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
  assert.equal(packageDocument.scripts["security:secret-boundary"],
    "node --no-warnings --experimental-strip-types scripts/audit-secret-boundary.ts");
  const source = readFileSync("scripts/audit-secret-boundary.ts", "utf8");
  assert.match(source, /auditSecretBoundary/u);
  assert.doesNotMatch(source, /(?:createServer|\.listen\s*\(|\bfetch\s*\(|\.env\.local|\.\.\.process\.env)/u);
});

test("static audit detects indirect env access, credential output and environment inheritance", () => {
  const source = [
    "const suffix = '.env' + '.local';",
    "const localPath = resolve(root, suffix);",
    "readFileSync(localPath, 'utf8');",
    "const fake = process.env.GOOGLE_API_KEY;",
    "process.stdout.write(fake);",
    "const child = spawn('node', [], { env: process.env });",
    "void child;",
  ].join("\n");
  const codes = auditSecretBoundarySource("synthetic/indirect.ts", source).map((entry) => entry.code);
  assert.ok(codes.includes("REAL_ENV_FILE_ACCESS_FORBIDDEN"));
  assert.ok(codes.includes("CREDENTIAL_ENV_VALUE_READ_FORBIDDEN"));
  assert.ok(codes.includes("CREDENTIAL_OUTPUT_FORBIDDEN"));
  assert.ok(codes.includes("PROCESS_ENV_INHERITANCE_FORBIDDEN"));
});

test("placeholder environment example is not treated as executable credential access", () => {
  assert.deepEqual(auditSecretBoundarySource(".env.example", "GOOGLE_API_KEY=obviously_fake_placeholder_only\n"), []);
});

test("official audit uses tracked-only input, sanitized children, no network or port, and cleans up", () => {
  const parent = mkdtempSync(join(tmpdir(), "plave-secret-boundary-test-parent-"));
  try {
    const report = auditSecretBoundary(process.cwd(), parent);
    assert.equal(report.schemaVersion, SECRET_BOUNDARY_SCOPE_VERSION);
    assert.equal(report.status, "PASS");
    assert.equal(report.realEnvironmentFilesOpened, 0);
    assert.equal(report.credentialValueReads, 0);
    assert.deepEqual(report.inheritedProviderVariables, []);
    assert.deepEqual(report.copiedIgnoredOrSecretFiles, []);
    assert.equal(report.environmentLogged, false);
    assert.equal(report.networkAttemptCount, 0);
    assert.equal(report.portOperationCount, 0);
    assert.equal(report.disposableCleanup, true);
    assert.deepEqual(report.placeholderDiagnostics, []);
    assert.ok(report.syntheticDetections.includes("REAL_ENV_FILE_ACCESS_FORBIDDEN"));
    assert.ok(report.syntheticDetections.includes("PROCESS_ENV_INHERITANCE_FORBIDDEN"));
    assert.ok(report.executedChildren.every((entry) => entry.command === "/usr/bin/git"));
    assert.ok(report.executedChildren.every((entry) => entry.environmentNames.every((name) => ["LC_ALL", "NODE_ENV", "PATH"].includes(name))));
    assert.equal(existsSync(join(parent, "plave-secret-boundary-tracked-should-not-exist")), false);
    const serialized = JSON.stringify(report);
    assert.doesNotMatch(serialized, /obviously_fake_placeholder_only/u);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("detector reports bare package runners and network-capable child commands", () => {
  const source = [
    "spawn('npx tool');",
    "execSync('npm install package-name');",
  ].join("\n");
  const codes = auditSecretBoundarySource("synthetic/package-runner.ts", source).map((entry) => entry.code);
  assert.ok(codes.includes("BARE_NPX_FORBIDDEN"));
  assert.ok(codes.includes("NETWORK_CAPABLE_INVOCATION_FORBIDDEN"));
});
