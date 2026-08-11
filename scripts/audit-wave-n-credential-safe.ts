import { auditWaveNCredentialSafe } from "../lib/content-factory/wave-n-credential-safe.ts";

const audit = auditWaveNCredentialSafe();
if (audit.status !== "PASS") throw new Error(`WAVE_N_CREDENTIAL_SAFE_FAILED:${audit.diagnostics.join("|")}`);
console.log(`WAVE_N_CREDENTIAL_SAFE_OK copied=${audit.auditedFiles.length} credential_reads=${audit.credentialValueReads} real_env_opened=${audit.realEnvironmentFilesOpened} network_attempts=${audit.waveNNetworkAttemptCount}`);
