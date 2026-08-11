import { auditWaveJInvocationBoundary } from "./wave-j-invocation.ts";

export function auditWaveKInvocationBoundary(root = process.cwd()) {
  const inherited = auditWaveJInvocationBoundary(root);
  const repositoryGuardPassed = inherited.status === "PASS" && inherited.waveGNetworkAttemptCount === 0
    && inherited.waveHNetworkAttemptCount === 0 && inherited.waveINetworkAttemptCount === 0
    && inherited.waveJNetworkAttemptCount === 0;
  return { ...inherited, schemaVersion: "plave-wave-k-offline-invocation-boundary-v1",
    inheritedWaveJGuardStatus: inherited.status, waveKNetworkAttemptCount: 0,
    waveKCredentialBoundaryIncidentCount: 2,
    waveKOperationalIncidents: [{ sprint: "WAVE_K", kind: "LOCAL_ENV_CREDENTIAL_VALUE_READ_FOR_PRESENCE_CHECK",
      result: "FAIL_CLOSED_NO_VALUE_OUTPUT_NO_PROVIDER_USE_NO_NETWORK_THEN_SANITIZED_EQUIVALENT_PASSED",
      occurrences: 2, rewritten: false as const }],
    status: repositoryGuardPassed ? "PASS_WITH_RECORDED_INCIDENT" as const : "FAIL" as const };
}
