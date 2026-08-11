import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, normalize, relative, resolve } from "node:path";
import ts from "typescript";

export const SECRET_BOUNDARY_SCOPE_VERSION = "plave-post-freeze-secret-boundary-v1" as const;

export type SecretBoundaryDiagnosticCode =
  | "REAL_ENV_FILE_ACCESS_FORBIDDEN"
  | "CREDENTIAL_ENV_VALUE_READ_FORBIDDEN"
  | "PROCESS_ENV_INHERITANCE_FORBIDDEN"
  | "CREDENTIAL_OUTPUT_FORBIDDEN"
  | "BARE_NPX_FORBIDDEN"
  | "NETWORK_CAPABLE_INVOCATION_FORBIDDEN"
  | "NETWORK_API_FORBIDDEN"
  | "PORT_BIND_FORBIDDEN";

export type SecretBoundaryDiagnostic = Readonly<{
  path: string;
  line: number;
  code: SecretBoundaryDiagnosticCode;
}>;

type ExecutedChild = Readonly<{ command: string; arguments: readonly string[]; environmentNames: readonly string[] }>;

const allowlistedChildEnvironment = Object.freeze({ PATH: "/usr/bin:/bin", LC_ALL: "C", NODE_ENV: "test" });
const providerEnvironmentNames = new Set([
  "GOOGLE_API_KEY",
  "OPENAI_API_KEY",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "POSTGRES_PASSWORD",
]);
const credentialEnvironmentNames = new Set(providerEnvironmentNames);
const sourceExtensions = new Set([".cjs", ".cts", ".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"]);
const fileAccessFunctions = new Set([
  "access",
  "accessSync",
  "createReadStream",
  "existsSync",
  "glob",
  "globSync",
  "lstat",
  "lstatSync",
  "open",
  "openSync",
  "readFile",
  "readFileSync",
  "stat",
  "statSync",
]);
const outputFunctions = new Set(["error", "info", "log", "warn", "write"]);
const networkFunctionNames = new Set(["fetch"]);

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function isExcludedTrackedPath(path: string) {
  const normalized = path.replaceAll("\\", "/");
  const name = basename(normalized);
  return name === ".env.local"
    || /^\.env\..+\.local$/u.test(name)
    || /(?:^|\/)(?:node_modules|\.next[^/]*|coverage|dist|build|tmp|artifacts|\.local-artifacts)(?:\/|$)/u.test(normalized)
    || /(?:^|\/)(?:credentials?|secrets?)(?:\/|\.|$)/iu.test(normalized)
    || /\.(?:log|pem|p12|pfx)$/iu.test(name);
}

function trackedFiles(root: string, executedChildren: ExecutedChild[]) {
  const args = ["ls-files", "-z"] as const;
  executedChildren.push({ command: "/usr/bin/git", arguments: args, environmentNames: Object.keys(allowlistedChildEnvironment).sort() });
  const output = execFileSync("/usr/bin/git", args, {
    cwd: root,
    encoding: "utf8",
    env: allowlistedChildEnvironment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return output.split("\0").filter(Boolean).filter((path) => !isExcludedTrackedPath(path)).sort();
}

function copyTrackedWorkspace(root: string, workspace: string, paths: readonly string[]) {
  const copied: string[] = [];
  for (const path of paths) {
    const normalized = normalize(path);
    if (normalized.startsWith("..") || resolve(root, normalized) === root || isExcludedTrackedPath(normalized)) continue;
    const target = resolve(workspace, normalized);
    if (relative(workspace, target).startsWith("..")) throw new Error("SECRET_BOUNDARY_TRACKED_PATH_ESCAPE");
    mkdirSync(dirname(target), { recursive: true });
    cpSync(resolve(root, normalized), target, { dereference: false });
    copied.push(normalized);
  }
  return copied;
}

function lineOf(sourceFile: ts.SourceFile, node: ts.Node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function callName(expression: ts.Expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return "";
}

function isProcessEnvironment(expression: ts.Expression): boolean {
  return ts.isPropertyAccessExpression(expression)
    && ts.isIdentifier(expression.expression)
    && expression.expression.text === "process"
    && expression.name.text === "env";
}

function credentialEnvironmentName(expression: ts.Expression) {
  if (ts.isPropertyAccessExpression(expression) && isProcessEnvironment(expression.expression)) return expression.name.text;
  if (ts.isElementAccessExpression(expression) && isProcessEnvironment(expression.expression)
    && expression.argumentExpression && ts.isStringLiteralLike(expression.argumentExpression)) return expression.argumentExpression.text;
  return null;
}

function evaluateString(expression: ts.Expression | undefined, values: ReadonlyMap<string, string>): string | null {
  if (!expression) return null;
  if (ts.isStringLiteralLike(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
  if (ts.isIdentifier(expression)) return values.get(expression.text) ?? null;
  if (ts.isParenthesizedExpression(expression)) return evaluateString(expression.expression, values);
  if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = evaluateString(expression.left, values); const right = evaluateString(expression.right, values);
    return left === null || right === null ? null : `${left}${right}`;
  }
  if (ts.isCallExpression(expression) && ["join", "resolve"].includes(callName(expression.expression))) {
    const segments = expression.arguments.map((argument) => evaluateString(argument, values)).filter((value): value is string => value !== null);
    return segments.length === 0 ? null : segments.join("/");
  }
  return null;
}

function containsLocalEnvironmentPath(value: string | null) {
  return value !== null && /(?:^|[\\/])\.env(?:\.[^\\/]+)?\.local(?:$|[\\/])/iu.test(value.replaceAll("'", "").replaceAll('"', ""));
}

function expressionContainsCredential(expression: ts.Expression, taintedIdentifiers: ReadonlySet<string>): boolean {
  const name = credentialEnvironmentName(expression);
  if (name && credentialEnvironmentNames.has(name)) return true;
  if (ts.isIdentifier(expression) && taintedIdentifiers.has(expression.text)) return true;
  return expression.forEachChild((child) => ts.isExpression(child) && expressionContainsCredential(child, taintedIdentifiers) ? true : undefined) === true;
}

function pushDiagnostic(diagnostics: SecretBoundaryDiagnostic[], sourceFile: ts.SourceFile, node: ts.Node, code: SecretBoundaryDiagnosticCode) {
  const diagnostic = { path: sourceFile.fileName, line: lineOf(sourceFile, node), code } as const;
  if (!diagnostics.some((entry) => entry.path === diagnostic.path && entry.line === diagnostic.line && entry.code === diagnostic.code)) diagnostics.push(diagnostic);
}

export function auditSecretBoundarySource(path: string, source: string): readonly SecretBoundaryDiagnostic[] {
  if (!sourceExtensions.has(extname(path))) return [];
  const kind = path.endsWith(".tsx") || path.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, kind);
  const values = new Map<string, string>(); const taintedIdentifiers = new Set<string>(); const diagnostics: SecretBoundaryDiagnostic[] = [];

  function collect(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const value = evaluateString(node.initializer, values); if (value !== null) values.set(node.name.text, value);
      if (expressionContainsCredential(node.initializer, taintedIdentifiers)) taintedIdentifiers.add(node.name.text);
    }
    ts.forEachChild(node, collect);
  }
  collect(sourceFile);

  function visit(node: ts.Node) {
    if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node))) {
      const name = credentialEnvironmentName(node);
      if (name && credentialEnvironmentNames.has(name)) pushDiagnostic(diagnostics, sourceFile, node, "CREDENTIAL_ENV_VALUE_READ_FORBIDDEN");
    }
    if ((ts.isSpreadElement(node) || ts.isSpreadAssignment(node)) && isProcessEnvironment(node.expression)) {
      pushDiagnostic(diagnostics, sourceFile, node, "PROCESS_ENV_INHERITANCE_FORBIDDEN");
    }
    if (ts.isPropertyAssignment(node) && ((ts.isIdentifier(node.name) && node.name.text === "env")
      || (ts.isStringLiteralLike(node.name) && node.name.text === "env")) && isProcessEnvironment(node.initializer)) {
      pushDiagnostic(diagnostics, sourceFile, node, "PROCESS_ENV_INHERITANCE_FORBIDDEN");
    }
    if (ts.isCallExpression(node)) {
      const name = callName(node.expression);
      if (fileAccessFunctions.has(name) && containsLocalEnvironmentPath(evaluateString(node.arguments[0]!, values))) {
        pushDiagnostic(diagnostics, sourceFile, node, "REAL_ENV_FILE_ACCESS_FORBIDDEN");
      }
      if (outputFunctions.has(name) && node.arguments.some((argument) => expressionContainsCredential(argument, taintedIdentifiers))) {
        pushDiagnostic(diagnostics, sourceFile, node, "CREDENTIAL_OUTPUT_FORBIDDEN");
      }
      if (networkFunctionNames.has(name)) pushDiagnostic(diagnostics, sourceFile, node, "NETWORK_API_FORBIDDEN");
      if (name === "listen") pushDiagnostic(diagnostics, sourceFile, node, "PORT_BIND_FORBIDDEN");
      const command = evaluateString(node.arguments[0]!, values);
      if (command && /(?:^|\s)npx(?:\s|$)/u.test(command)) pushDiagnostic(diagnostics, sourceFile, node, "BARE_NPX_FORBIDDEN");
      if (command && /(?:^|\s)(?:curl|wget|npm\s+(?:install|update|audit|view|search)|pnpm\s+(?:add|install)|yarn\s+(?:add|install))(?:\s|$)/iu.test(command)) {
        pushDiagnostic(diagnostics, sourceFile, node, "NETWORK_CAPABLE_INVOCATION_FORBIDDEN");
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return diagnostics.sort((left, right) => left.line - right.line || left.code.localeCompare(right.code));
}

function resolveRelativeImport(workspace: string, importer: string, specifier: string) {
  if (!specifier.startsWith(".")) return null;
  const base = resolve(dirname(resolve(workspace, importer)), specifier);
  const candidates = extname(base) ? [base] : [base, ...[".ts", ".tsx", ".mjs", ".js"].map((extension) => `${base}${extension}`)];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ? relative(workspace, match) : null;
}

function expandRelativeImports(workspace: string, initial: ReadonlySet<string>) {
  const selected = new Set(initial); const queue = [...selected];
  while (queue.length > 0) {
    const path = queue.shift()!;
    if (!sourceExtensions.has(extname(path)) || !existsSync(resolve(workspace, path))) continue;
    const source = readFileSync(resolve(workspace, path), "utf8");
    for (const match of source.matchAll(/(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/gu)) {
      const imported = resolveRelativeImport(workspace, path, match[1]!);
      if (imported && !selected.has(imported)) { selected.add(imported); queue.push(imported); }
    }
  }
  return selected;
}

function collectAuditedSources(workspace: string, tracked: readonly string[], packageScripts: Readonly<Record<string, string>>) {
  const selected = new Set<string>(["package.json"]);
  for (const path of tracked) {
    if (/^scripts\/.*(?:audit|security).*\.(?:[cm]?[jt]s|sh)$/iu.test(path)) selected.add(path);
  }
  for (const [name, command] of Object.entries(packageScripts)) {
    if (!/(?:audit|security)/iu.test(name)) continue;
    for (const match of command.matchAll(/(?:^|\s)((?:scripts|lib)\/[\w./-]+\.(?:[cm]?[jt]s|sh))(?:\s|$)/gu)) selected.add(match[1]!);
  }
  const all = expandRelativeImports(workspace, selected);
  const official = expandRelativeImports(workspace, new Set(["scripts/audit-secret-boundary.ts"]));
  return {
    all: [...all].filter((path) => existsSync(resolve(workspace, path))).sort(),
    official: [...official].filter((path) => existsSync(resolve(workspace, path))).sort(),
  } as const;
}

function auditPackageScripts(path: string, scripts: Readonly<Record<string, string>>) {
  const diagnostics: SecretBoundaryDiagnostic[] = [];
  for (const [name, command] of Object.entries(scripts)) {
    const line = 1;
    if (/(?:^|\s)npx(?:\s|$)/u.test(command)) diagnostics.push({ path: `${path}#${name}`, line, code: "BARE_NPX_FORBIDDEN" });
    if (/(?:^|\s)(?:curl|wget|npm\s+(?:install|update|audit|view|search)|pnpm\s+(?:add|install)|yarn\s+(?:add|install))(?:\s|$)/iu.test(command)) {
      diagnostics.push({ path: `${path}#${name}`, line, code: "NETWORK_CAPABLE_INVOCATION_FORBIDDEN" });
    }
  }
  return diagnostics;
}

function remoteTargetMetadata(paths: readonly string[], workspace: string) {
  const hits: string[] = [];
  for (const path of paths) {
    if (!sourceExtensions.has(extname(path)) && path !== "package.json") continue;
    const source = readFileSync(resolve(workspace, path), "utf8");
    if (/(?:https?:\/\/|postgres(?:ql)?:\/\/|supabase\.co|remote[-_ ]target)/iu.test(source)) hits.push(path);
  }
  return [...new Set(hits)].sort();
}

export function auditSecretBoundary(root = process.cwd(), disposableParent = "/tmp") {
  const executedChildren: ExecutedChild[] = [];
  const tracked = trackedFiles(root, executedChildren);
  const workspace = mkdtempSync(join(disposableParent, "plave-secret-boundary-tracked-"));
  let report: Omit<ReturnType<typeof buildReport>, "disposableCleanup"> | null = null;
  try {
    const copied = copyTrackedWorkspace(root, workspace, tracked);
    const packageDocument = JSON.parse(readFileSync(resolve(workspace, "package.json"), "utf8")) as { scripts?: Record<string, string> };
    const packageScripts = packageDocument.scripts ?? {};
    const auditedSources = collectAuditedSources(workspace, copied, packageScripts);
    const repositoryDiagnostics = [
      ...auditPackageScripts("package.json", packageScripts),
      ...auditedSources.all.flatMap((path) => path === "package.json" ? [] : auditSecretBoundarySource(path, readFileSync(resolve(workspace, path), "utf8"))),
    ].sort((left, right) => left.path.localeCompare(right.path) || left.line - right.line || left.code.localeCompare(right.code));
    const officialPaths = new Set(auditedSources.official);
    const packageDiagnostics = repositoryDiagnostics.filter((entry) => entry.path.startsWith("package.json#"));
    const diagnostics = repositoryDiagnostics.filter((entry) => officialPaths.has(entry.path) || packageDiagnostics.includes(entry));

    const fixtureDirectory = resolve(workspace, "synthetic-fixtures");
    mkdirSync(fixtureDirectory, { recursive: true });
    const syntheticPath = resolve(fixtureDirectory, "obviously-fake-secret-boundary.ts");
    writeFileSync(syntheticPath, [
      "const forbiddenPath = resolve(root, '.env' + '.local');",
      "readFileSync(forbiddenPath, 'utf8');",
      "const obviouslyFake = process.env.GOOGLE_API_KEY;",
      "console.log(obviouslyFake);",
      "const inherited = { ...process.env };",
      "void inherited;",
    ].join("\n"), "utf8");
    const syntheticDiagnostics = auditSecretBoundarySource("synthetic-fixtures/obviously-fake-secret-boundary.ts", readFileSync(syntheticPath, "utf8"));
    const placeholderDiagnostics = auditSecretBoundarySource("synthetic-fixtures/.env.example", "GOOGLE_API_KEY=obviously_fake_placeholder_only\n");
    const inputDigest = sha256(auditedSources.all.map((path) => `${path}\0${sha256(readFileSync(resolve(workspace, path)))}`).join("\n"));
    report = buildReport({ tracked, copied, auditedFiles: auditedSources.all, officialFiles: auditedSources.official,
      diagnostics, repositoryDiagnostics, syntheticDiagnostics, placeholderDiagnostics,
      inputDigest, remoteMetadataPaths: remoteTargetMetadata(auditedSources.all, workspace), executedChildren });
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
  if (!report) throw new Error("SECRET_BOUNDARY_REPORT_NOT_BUILT");
  return { ...report, disposableCleanup: !existsSync(workspace) } as const;
}

function buildReport(input: Readonly<{
  tracked: readonly string[];
  copied: readonly string[];
  auditedFiles: readonly string[];
  officialFiles: readonly string[];
  diagnostics: readonly SecretBoundaryDiagnostic[];
  repositoryDiagnostics: readonly SecretBoundaryDiagnostic[];
  syntheticDiagnostics: readonly SecretBoundaryDiagnostic[];
  placeholderDiagnostics: readonly SecretBoundaryDiagnostic[];
  inputDigest: string;
  remoteMetadataPaths: readonly string[];
  executedChildren: readonly ExecutedChild[];
}>) {
  const syntheticCodes = new Set(input.syntheticDiagnostics.map((entry) => entry.code));
  const requiredSyntheticCodes: readonly SecretBoundaryDiagnosticCode[] = [
    "REAL_ENV_FILE_ACCESS_FORBIDDEN",
    "CREDENTIAL_ENV_VALUE_READ_FORBIDDEN",
    "CREDENTIAL_OUTPUT_FORBIDDEN",
    "PROCESS_ENV_INHERITANCE_FORBIDDEN",
  ];
  const inheritedProviderVariables = input.executedChildren.flatMap((entry) => entry.environmentNames)
    .filter((name) => providerEnvironmentNames.has(name));
  const networkAttemptCount = input.executedChildren.filter((entry) => /(?:curl|wget|npm|pnpm|yarn|npx)/u.test(entry.command)).length;
  const portOperationCount = input.executedChildren.filter((entry) => entry.arguments.some((argument) => /(?:--port|:3000\b)/u.test(argument))).length;
  const realEnvironmentFilesOpened = input.copied.filter((path) => isExcludedTrackedPath(path)).length;
  const credentialValueReads = input.diagnostics.filter((entry) => entry.code === "CREDENTIAL_ENV_VALUE_READ_FORBIDDEN").length;
  const status = input.diagnostics.length === 0
    && input.placeholderDiagnostics.length === 0
    && requiredSyntheticCodes.every((code) => syntheticCodes.has(code))
    && realEnvironmentFilesOpened === 0
    && inheritedProviderVariables.length === 0
    && networkAttemptCount === 0
    && portOperationCount === 0;
  return {
    schemaVersion: SECRET_BOUNDARY_SCOPE_VERSION,
    status: status ? "PASS" as const : "FAIL" as const,
    trackedOnlyWorkspace: true,
    trackedFileCount: input.tracked.length,
    copiedTrackedFileCount: input.copied.length,
    auditedFileCount: input.auditedFiles.length,
    auditedFiles: input.auditedFiles,
    officialDependencyFiles: input.officialFiles,
    inputDigest: input.inputDigest,
    inputDigestScope: "PACKAGE_AUDIT_SECURITY_AND_TRANSITIVE_IMPORTS" as const,
    diagnostics: input.diagnostics,
    repositoryDiagnostics: input.repositoryDiagnostics,
    syntheticDetections: [...syntheticCodes].sort(),
    placeholderDiagnostics: input.placeholderDiagnostics,
    remoteTargetMetadataPaths: input.remoteMetadataPaths,
    copiedIgnoredOrSecretFiles: input.copied.filter((path) => isExcludedTrackedPath(path)),
    realEnvironmentFilesOpened,
    credentialValueReads,
    inheritedProviderVariables,
    childEnvironmentAllowlist: Object.keys(allowlistedChildEnvironment).sort(),
    environmentLogged: input.diagnostics.some((entry) => entry.code === "CREDENTIAL_OUTPUT_FORBIDDEN"),
    networkAttemptCount,
    portOperationCount,
    executedChildren: input.executedChildren,
    syntheticFixtureProductionEligible: false,
  } as const;
}
