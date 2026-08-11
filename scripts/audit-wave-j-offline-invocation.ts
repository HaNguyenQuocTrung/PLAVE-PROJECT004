import { auditWaveJInvocationBoundary } from "../lib/content-factory/wave-j-invocation.ts";

const result = auditWaveJInvocationBoundary();
if (result.status !== "PASS" || result.bareNpxInvocations !== 0 || result.networkCapableNpmInvocations !== 0
  || result.waveGNetworkAttemptCount !== 0 || result.waveHNetworkAttemptCount !== 0 || result.waveINetworkAttemptCount !== 0
  || result.waveJNetworkAttemptCount !== 0) throw new Error(`WAVE_J_OFFLINE_INVOCATION_FAILED:${JSON.stringify(result.diagnostics)}`);
console.log(`WAVE_J_OFFLINE_INVOCATION_OK bare_npx=${result.bareNpxInvocations} network_capable_npm=${result.networkCapableNpmInvocations} wave_g_network_attempts=${result.waveGNetworkAttemptCount} wave_h_network_attempts=${result.waveHNetworkAttemptCount} wave_i_network_attempts=${result.waveINetworkAttemptCount} wave_j_network_attempts=${result.waveJNetworkAttemptCount}`);
