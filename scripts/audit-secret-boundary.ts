import { auditSecretBoundary } from "../lib/security/secret-boundary-audit.ts";

const report = auditSecretBoundary();

process.stdout.write([
  `SECURITY_SECRET_BOUNDARY=${report.status}`,
  `TRACKED_ONLY_FILES=${report.trackedFileCount}`,
  `AUDITED_FILES=${report.auditedFileCount}`,
  `CREDENTIAL_READS=${report.credentialValueReads}`,
  `REAL_ENV_OPENS=${report.realEnvironmentFilesOpened}`,
  `INHERITED_PROVIDER_VARS=${report.inheritedProviderVariables.length}`,
  `NETWORK_ATTEMPTS=${report.networkAttemptCount}`,
  `PORT_OPERATIONS=${report.portOperationCount}`,
  `DISPOSABLE_CLEANUP=${report.disposableCleanup ? "PASS" : "FAIL"}`,
  "",
].join("\n"));

if (report.status !== "PASS") {
  throw new Error(`SECRET_BOUNDARY_AUDIT_FAILED:${report.diagnostics.map((entry) => entry.code).join(",")}`);
}
