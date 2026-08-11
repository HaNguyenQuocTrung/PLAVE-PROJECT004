import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { auditWaveHInvocationBoundary } from "../lib/content-factory/wave-h-invocation.ts";

const report = auditWaveHInvocationBoundary();
const output = resolve(process.cwd(), "content/grade-packs/generated");
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, "wave-h-invocation-boundary.json"), `${canonicalize(report)}\n`, { mode: 0o644 });
if (report.status !== "PASS") {
  for (const diagnostic of report.diagnostics) console.error(`${diagnostic.path}:${diagnostic.code}`);
  process.exitCode = 1;
} else {
  console.log(`WAVE_H_OFFLINE_INVOCATION_OK bare_npx=${report.bareNpxInvocations} network_capable_npm=${report.networkCapableNpmInvocations} wave_g_network_attempts=${report.waveGNetworkAttemptCount} wave_h_network_attempts=${report.waveHNetworkAttemptCount}`);
}
