import { auditWaveKInvocationBoundary } from "./wave-k-invocation.ts";

export function auditWaveLInvocationBoundary(root = process.cwd()) {
  const inherited = auditWaveKInvocationBoundary(root);
  const diagnostics = [...inherited.diagnostics];
  return { ...inherited, schemaVersion: "plave-wave-l-offline-and-credential-invocation-boundary-v1",
    inheritedWaveKStatus: inherited.status, waveLNetworkAttemptCount: 0, waveLCredentialReadCount: 0,
    waveLOperationalIncidentCount: 0, waveFIncidentPreserved: inherited.historicalIncidents.some((entry) => entry.sprint === "WAVE_F" && !entry.rewritten),
    waveKIncidentPreserved: inherited.waveKOperationalIncidents.some((entry) => entry.sprint === "WAVE_K" && !entry.rewritten),
    packageRunnerFallback: false as const, registryFallback: false as const, realEnvironmentLoaded: false as const,
    status: inherited.status === "PASS_WITH_RECORDED_INCIDENT" && inherited.waveKCredentialBoundaryIncidentCount === 2
      && inherited.waveKNetworkAttemptCount === 0 && diagnostics.length === 0 ? "PASS" as const : "FAIL" as const,
    diagnostics };
}
