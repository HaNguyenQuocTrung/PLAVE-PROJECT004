import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { auditOfflineInvocationBoundary } from "../lib/content-factory/offline-invocation.ts";

const report = auditOfflineInvocationBoundary();
if (report.status !== "PASS") {
  for (const diagnostic of report.diagnostics) console.error(`${diagnostic.path}:${diagnostic.code}:${diagnostic.evidence}`);
  throw new Error("OFFLINE_INVOCATION_BOUNDARY_FAILED");
}
const output = resolve(process.cwd(), "content/grade-packs/generated");
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, "wave-g-invocation-boundary.json"), `${canonicalize(report)}\n`, { mode: 0o644 });
console.log(`OFFLINE_INVOCATION_BOUNDARY_OK bare_npx=${report.bareNpxInvocations} network_capable_npm=${report.networkCapableNpmInvocations} wave_g_network_attempts=${report.waveGNetworkAttemptCount}`);
