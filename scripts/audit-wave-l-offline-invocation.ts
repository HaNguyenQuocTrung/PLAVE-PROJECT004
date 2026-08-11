import { auditWaveLInvocationBoundary } from "../lib/content-factory/wave-l-invocation.ts";

const result = auditWaveLInvocationBoundary();
if (result.status !== "PASS" || result.bareNpxInvocations !== 0 || result.networkCapableNpmInvocations !== 0
  || result.waveLNetworkAttemptCount !== 0 || result.waveLCredentialReadCount !== 0 || result.waveLOperationalIncidentCount !== 0) {
  throw new Error(`WAVE_L_INVOCATION_BOUNDARY_FAILED:${JSON.stringify(result.diagnostics)}`);
}
console.log(`WAVE_L_INVOCATION_OK bare_npx=${result.bareNpxInvocations} network_capable=${result.networkCapableNpmInvocations} network_attempts=${result.waveLNetworkAttemptCount} credential_reads=${result.waveLCredentialReadCount}`);
