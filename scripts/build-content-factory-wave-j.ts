import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { auditWaveJ } from "../lib/content-factory/wave-j-audit.ts";
import { buildWaveJReportRows, renderWaveJDepthMarkdown } from "../lib/content-factory/wave-j-report.ts";
import { waveJGradePacks, combinedWaveABCDEFGHIJGradePacks } from "../lib/content-factory/wave-j-packs.ts";
import { buildWaveJDepthAudit } from "../lib/content-factory/wave-j-depth.ts";
import { combinedWaveABCDEFGHIGradePacks } from "../lib/content-factory/wave-i-packs.ts";

const audit = auditWaveJ();
if (audit.errors.length) throw new Error(`WAVE_J_BUILD_BLOCKED:${audit.errors.join(",")}`);
const rows = buildWaveJReportRows(); const output = join(process.cwd(), "content/grade-packs/generated"); mkdirSync(output, { recursive: true });
const json = (name: string, value: unknown) => writeFileSync(join(output, name), `${canonicalize(value)}\n`, "utf8");
const markdown = (name: string, value: string) => writeFileSync(join(output, name), value, "utf8");
json("wave-j-depth-audit.json", { schemaVersion: "plave-grades-1-9-wave-j-depth-audit-v1", rows: audit.depthRows });
markdown("wave-j-depth-audit.md", renderWaveJDepthMarkdown(rows));
json("wave-j-difficulty-evidence.json", { schemaVersion: "plave-wave-j-difficulty-evidence-v1", basis: "CONTRACT_DERIVED",
  pedagogicalEffectivenessClaim: false, rows: audit.rows.flatMap((row) => row.difficultyEvidence) });
json("wave-j-question-banks.json", { schemaVersion: "plave-wave-j-question-banks-v1", banks: waveJGradePacks.map((pack) => ({
  grade: pack.grade, questions: pack.questions, explanations: pack.explanations, blueprints: pack.blueprints, production: pack.production })) });
json("wave-j-candidates.json", { schemaVersion: "plave-wave-j-candidates-v1",
  waveJ: waveJGradePacks.map((pack) => ({ grade: pack.grade, candidate: pack.candidate, questionCount: pack.questions.length, release: pack.release })),
  combined: combinedWaveABCDEFGHIJGradePacks.map((pack) => ({ grade: pack.grade, candidate: pack.candidate, questionCount: pack.questions.length, release: pack.release })) });
json("wave-j-adaptive-pool-sufficiency.json", { schemaVersion: "plave-wave-j-adaptive-pool-sufficiency-v1",
  rows: audit.depthRows.map((row) => ({ grade: row.grade, skillId: row.skillId, beforeQuestions: row.before.questions,
    afterQuestions: row.afterQuestions, beforeStructures: row.before.reasoningStructures, afterStructures: row.afterReasoningStructures,
    classificationBefore: row.classificationBefore, classificationAfter: row.classificationAfter, exposureRiskBefore: row.before.exposureRisk })) });
json("wave-j-coverage.json", { schemaVersion: "plave-grades-1-9-wave-j-coverage-v1", rows });
json("wave-j-independent-audit.json", audit);
markdown("wave-j-independent-audit.md", `${renderWaveJDepthMarkdown(rows)}\nWave J bundle: \`${audit.waveJBundle.bundleHash}\`\n\nCombined A–J bundle: \`${audit.combinedBundle.bundleHash}\`\n\nErrors: ${audit.errors.length}.\n`);
json("wave-j-invocation-boundary.json", audit.invocationBoundary);
json("bundle-wave-j-depth-grades-1-2-3-4-5-6-7-8-9.json", audit.waveJBundle);
json("bundle-combined-wave-a-b-c-d-e-f-g-h-i-j-grades-1-2-3-4-5-6-7-8-9.json", audit.combinedBundle);
const regenerated = buildWaveJDepthAudit(combinedWaveABCDEFGHIGradePacks);
if (canonicalize(regenerated) !== canonicalize(audit.depthRows)) throw new Error("WAVE_J_REGENERATION_DRIFT");
console.log(`WAVE_J_BUILD_OK grades=9 skills=${audit.totals.skills} gaps=${audit.totals.gapSkillsBefore}->${audit.totals.gapSkillsAfter} added=${audit.totals.addedQuestions} wave_j=${audit.waveJBundle.bundleHash} combined=${audit.combinedBundle.bundleHash}`);
