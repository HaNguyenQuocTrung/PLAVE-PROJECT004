import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalize, sha256 } from "../lib/content-factory/canonical.ts";
import { auditWaveK } from "../lib/content-factory/wave-k-audit.ts";
import { waveKCaseSeeds } from "../lib/content-factory/wave-k-questions.ts";
import { waveKGradePacks, combinedWaveABCDEFGHIJKGradePacks } from "../lib/content-factory/wave-k-packs.ts";
import { renderWaveKCoverageMarkdown } from "../lib/content-factory/wave-k-report.ts";

const audit = auditWaveK(); if (audit.errors.length) throw new Error(`WAVE_K_BUILD_BLOCKED:${audit.errors.slice(0, 50).join(",")}`);
const output = join(process.cwd(), "content/grade-packs/generated"); mkdirSync(output, { recursive: true });
const json = (name: string, value: unknown) => writeFileSync(join(output, name), `${canonicalize(value)}\n`, "utf8");
const markdown = (name: string, value: string) => writeFileSync(join(output, name), value, "utf8");
const batches = audit.inventory.rows.filter((row) => row.classification === "PRODUCIBLE_DETERMINISTIC").map((row) => ({
  batchId: `g${row.grade}-${row.unitIds[0]}-${row.outcomeId.toLowerCase()}`, grade: row.grade, domains: [row.domain], units: row.unitIds,
  outcomeId: row.outcomeId, pages: row.pages, templateFamily: row.templateFamily,
  questionCount: waveKCaseSeeds.filter((seed) => seed.outcomeId === row.outcomeId).length,
  batchHash: sha256(canonicalize({ row, seeds: waveKCaseSeeds.filter((seed) => seed.outcomeId === row.outcomeId) })), frozen: true }));
json("wave-k-canonical-gap-inventory.json", audit.inventory);
json("wave-k-grade-1-evidence-coverage.json", audit.gradeOneEvidenceCoverage);
json("wave-k-batch-manifests.json", { schemaVersion: "plave-wave-k-domain-batch-manifests-v1", batches });
json("wave-k-question-pools.json", { schemaVersion: "plave-wave-k-final-question-pools-v1", grades: waveKGradePacks.map((pack) => ({
  grade: pack.grade, questions: pack.questions, explanations: pack.explanations, blueprints: pack.blueprints, production: pack.production })) });
json("wave-k-candidates.json", { schemaVersion: "plave-wave-k-candidates-v1",
  waveK: waveKGradePacks.map((pack) => ({ grade: pack.grade, candidate: pack.candidate, questionCount: pack.questions.length, release: pack.release })),
  combined: combinedWaveABCDEFGHIJKGradePacks.map((pack) => ({ grade: pack.grade, candidate: pack.candidate, questionCount: pack.questions.length, release: pack.release })) });
json("wave-k-coverage.json", { schemaVersion: "plave-wave-k-final-coverage-v1", rows: audit.rows, totals: audit.totals });
markdown("wave-k-coverage.md", renderWaveKCoverageMarkdown(audit));
json("wave-k-excluded-outcomes.json", { schemaVersion: "plave-wave-k-excluded-outcomes-v1",
  rows: audit.inventory.rows.filter((row) => row.classification !== "PRODUCIBLE_DETERMINISTIC" && row.classification !== "ALREADY_COVERED_SEMANTICALLY") });
json("wave-k-source-audit.json", { schemaVersion: "plave-wave-k-source-audit-v1", source: audit.inventory.source,
  inventoryHash: audit.inventory.inventoryHash, rows: audit.inventory.rows.map((row) => ({ outcomeId: row.outcomeId, grade: row.grade,
    domain: row.domain, unitIds: row.unitIds, pages: row.pages, classification: row.classification, reason: row.reason })) });
json("wave-k-oracle-audit.json", { schemaVersion: "plave-wave-k-oracle-audit-v1", cases: waveKCaseSeeds.map((seed) => ({
  outcomeId: seed.outcomeId, ordinal: seed.ordinal, kind: seed.oracle.kind, status: "PASSED" })), errors: audit.questionPoolErrors });
json("wave-k-depth-audit.json", { schemaVersion: "plave-wave-k-depth-audit-v1", rows: audit.depthRows });
json("wave-k-duplicate-audit.json", { schemaVersion: "plave-wave-k-duplicate-audit-v1",
  uniqueCanonicalPublicForms: audit.totals.uniqueCanonicalPublicForms, collisions: audit.duplicateErrors });
json("wave-k-progression-audit.json", { schemaVersion: "plave-wave-k-progression-audit-v1", graph: audit.graph,
  rows: audit.rows.map((row) => ({ grade: row.grade, remediation: row.remediation, simulation: row.simulation })) });
json("wave-k-independent-audit.json", audit);
markdown("wave-k-independent-audit.md", `${renderWaveKCoverageMarkdown(audit)}\nWave K bundle: \`${audit.waveKBundle.bundleHash}\`\n\nCombined A–K bundle: \`${audit.combinedBundle.bundleHash}\`\n`);
json("wave-k-invocation-boundary.json", audit.invocationBoundary);
json("bundle-wave-k-final-grades-1-2-3-4-5-6-7-8-9.json", audit.waveKBundle);
json("bundle-combined-wave-a-b-c-d-e-f-g-h-i-j-k-grades-1-2-3-4-5-6-7-8-9.json", audit.combinedBundle);
console.log(`WAVE_K_BUILD_OK grades=9 inventory=${audit.totals.auditedRemaining} produced_skills=${audit.totals.producibleSkills} questions=${audit.totals.questions} remaining_producible=${audit.totals.remainingProducible} wave_k=${audit.waveKBundle.bundleHash} combined=${audit.combinedBundle.bundleHash}`);
