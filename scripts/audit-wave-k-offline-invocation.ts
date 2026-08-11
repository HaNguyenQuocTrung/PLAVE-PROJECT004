import { auditWaveKInvocationBoundary } from "../lib/content-factory/wave-k-invocation.ts";

const result = auditWaveKInvocationBoundary();
if (result.status !== "PASS_WITH_RECORDED_INCIDENT" || result.bareNpxInvocations !== 0 || result.networkCapableNpmInvocations !== 0
  || result.waveGNetworkAttemptCount !== 0 || result.waveHNetworkAttemptCount !== 0 || result.waveINetworkAttemptCount !== 0
  || result.waveJNetworkAttemptCount !== 0 || result.waveKNetworkAttemptCount !== 0 || result.waveKCredentialBoundaryIncidentCount !== 2) {
  throw new Error(`WAVE_K_OFFLINE_INVOCATION_FAILED:${JSON.stringify(result.diagnostics)}`);
}
console.log(`WAVE_K_OFFLINE_INVOCATION_REPOSITORY_OK_INCIDENT_RECORDED bare_npx=${result.bareNpxInvocations} network_capable_npm=${result.networkCapableNpmInvocations} wave_g_network_attempts=${result.waveGNetworkAttemptCount} wave_h_network_attempts=${result.waveHNetworkAttemptCount} wave_i_network_attempts=${result.waveINetworkAttemptCount} wave_j_network_attempts=${result.waveJNetworkAttemptCount} wave_k_network_attempts=${result.waveKNetworkAttemptCount} wave_k_credential_boundary_incidents=${result.waveKCredentialBoundaryIncidentCount}`);
