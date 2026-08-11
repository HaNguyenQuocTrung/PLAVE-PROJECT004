import { auditWaveMInvocationBoundary } from "../lib/content-factory/wave-m-invocation.ts";

const audit = auditWaveMInvocationBoundary();
if (audit.status !== "PASS") {
  console.error(`WAVE_M_INVOCATION_FAILED ${audit.diagnostics.join("|")}`);
  process.exitCode = 1;
} else {
  console.log(`WAVE_M_INVOCATION_OK bare_npx=${audit.bareNpxInvocations} network_capable=${audit.networkCapableInvocations} network_attempts=${audit.waveMNetworkAttemptCount} credential_reads=${audit.waveMCredentialReadCount}`);
}
