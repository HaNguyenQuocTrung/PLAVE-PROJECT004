import { auditWaveNInvocationBoundary } from "../lib/content-factory/wave-n-invocation.ts";

const audit = auditWaveNInvocationBoundary();
if (audit.status !== "PASS") throw new Error(`WAVE_N_INVOCATION_FAILED:${audit.diagnostics.join("|")}`);
console.log(`WAVE_N_INVOCATION_OK bare_npx=${audit.bareNpxInvocations} network_capable=${audit.networkCapableInvocations} network_attempts=${audit.waveNNetworkAttemptCount} credential_reads=${audit.waveNCredentialReadCount} port_3000=${audit.waveNPort3000Operations}`);
