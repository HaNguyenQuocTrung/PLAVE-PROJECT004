import { auditWaveMCredentialSafe } from "../lib/content-factory/wave-m-credential-safe.ts";

const audit = auditWaveMCredentialSafe();
if (audit.status !== "PASS") {
  console.error(`WAVE_M_CREDENTIAL_SAFE_FAILED ${audit.diagnostics.map((entry) => `${entry.path}:${entry.code}`).join("|")}`);
  process.exitCode = 1;
} else {
  console.log(`WAVE_M_CREDENTIAL_SAFE_OK tracked=${audit.trackedFileCount} copied=${audit.copiedFiles.length} credential_reads=${audit.credentialValueReads} real_env_opened=${audit.realEnvironmentFilesOpened} network_attempts=${audit.waveMNetworkAttemptCount}`);
}
