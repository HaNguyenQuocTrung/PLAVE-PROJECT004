import { auditWaveLCredentialSafe } from "../lib/content-factory/wave-l-credential-safe.ts";

const result = auditWaveLCredentialSafe();
if (result.status !== "PASS" || result.realEnvironmentFilesOpened !== 0 || result.credentialValueReads !== 0
  || result.providerEnvironmentVariablesInherited.length !== 0 || result.waveLNetworkAttemptCount !== 0) {
  throw new Error(`WAVE_L_CREDENTIAL_SAFE_AUDIT_FAILED:${JSON.stringify(result.diagnostics)}`);
}
console.log(`WAVE_L_CREDENTIAL_SAFE_OK tracked=${result.trackedFileCount} copied=${result.copiedFiles.length} credential_reads=${result.credentialValueReads} network_attempts=${result.waveLNetworkAttemptCount}`);
