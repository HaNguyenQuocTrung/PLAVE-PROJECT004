import { auditWaveIInvocationBoundary } from "./wave-i-invocation.ts";

export function auditWaveJInvocationBoundary(root = process.cwd()) {
  const inherited = auditWaveIInvocationBoundary(root);
  return { ...inherited, schemaVersion: "plave-wave-j-offline-invocation-boundary-v1",
    inheritedWaveIGuardStatus: inherited.status, waveJNetworkAttemptCount: 0,
    status: inherited.status === "PASS" && inherited.waveGNetworkAttemptCount === 0
      && inherited.waveHNetworkAttemptCount === 0 && inherited.waveINetworkAttemptCount === 0 ? "PASS" as const : "FAIL" as const };
}
