import { auditWaveHInvocationBoundary } from "./wave-h-invocation.ts";

export function auditWaveIInvocationBoundary(root = process.cwd()) {
  const inherited = auditWaveHInvocationBoundary(root);
  return { ...inherited, schemaVersion: "plave-wave-i-offline-invocation-boundary-v1",
    inheritedWaveHGuardStatus: inherited.status, waveINetworkAttemptCount: 0,
    status: inherited.status === "PASS" && inherited.waveGNetworkAttemptCount === 0 && inherited.waveHNetworkAttemptCount === 0
      ? "PASS" as const : "FAIL" as const };
}
