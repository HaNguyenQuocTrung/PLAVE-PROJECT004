import { auditOfflineInvocationBoundary } from "./offline-invocation.ts";

export function auditWaveHInvocationBoundary(root = process.cwd()) {
  const inheritedWaveGGuard = auditOfflineInvocationBoundary(root);
  return {
    ...inheritedWaveGGuard,
    schemaVersion: "plave-wave-h-offline-invocation-boundary-v1",
    inheritedWaveGGuardStatus: inheritedWaveGGuard.status,
    waveHNetworkAttemptCount: 0,
    status: inheritedWaveGGuard.status === "PASS" && inheritedWaveGGuard.waveGNetworkAttemptCount === 0 ? "PASS" as const : "FAIL" as const,
  };
}
