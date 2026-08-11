import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildWaveNFinalAudit } from "../lib/content-factory/wave-n.ts";
import { renderWaveNArtifacts } from "../lib/content-factory/wave-n-report.ts";

const audit = buildWaveNFinalAudit();
if (audit.status !== "PASSED") throw new Error(`WAVE_N_BUILD_FAILED:${audit.errors.join("|")}`);
for (const [path, content] of Object.entries(renderWaveNArtifacts(audit))) {
  const absolute = resolve(process.cwd(), path); mkdirSync(dirname(absolute), { recursive: true }); writeFileSync(absolute, content, "utf8");
}
console.log(`WAVE_N_BUILD_OK grades=${audit.totals.grades} pass=${audit.totals.gradePass} partial=${audit.totals.gradePartialAccepted} fail=${audit.totals.gradeFail} source_tree=${audit.sourceSubmissionInventory.sourceTreeDigest} manifest=${audit.checksumManifest.manifestHash} receipt=${audit.releaseReceipt.receiptHash}`);
