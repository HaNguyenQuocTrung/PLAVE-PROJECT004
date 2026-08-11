import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { auditWaveIInvocationBoundary } from "../lib/content-factory/wave-i-invocation.ts";

const report = auditWaveIInvocationBoundary();
if (report.status !== "PASS") throw new Error("WAVE_I_OFFLINE_INVOCATION_BOUNDARY_FAILED");
const output = resolve(process.cwd(), "content/grade-packs/generated"); mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, "wave-i-invocation-boundary.json"), `${canonicalize(report)}\n`, { mode: 0o644 });
console.log(`WAVE_I_OFFLINE_INVOCATION_OK bare_npx=${report.bareNpxInvocations} network_capable_npm=${report.networkCapableNpmInvocations} wave_g_network_attempts=${report.waveGNetworkAttemptCount} wave_h_network_attempts=${report.waveHNetworkAttemptCount} wave_i_network_attempts=${report.waveINetworkAttemptCount}`);
