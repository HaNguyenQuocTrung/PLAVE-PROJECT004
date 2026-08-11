import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { createCoverageMatrix, renderCoverageMarkdown } from "../lib/content-factory/coverage.ts";
import { fixturesForGrades } from "../lib/content-factory/fixtures.ts";
import { buildPrerequisiteGraph } from "../lib/content-factory/graph.ts";
import { assertGradeOneUnchanged, gradeOneSourceDigest } from "../lib/content-factory/legacy-digest.ts";
import { getGradePacks } from "../lib/content-factory/packs.ts";
import { simulateCandidate, simulateWaveACandidate } from "../lib/content-factory/simulation.ts";
import {
  createOfficialSourceMap,
  officialCurriculumSource,
} from "../lib/content-factory/official-source-map.ts";
import { validateCrossPackDuplicates, validateGradePack } from "../lib/content-factory/validation.ts";
import { factoryGrades, type FactoryGrade } from "../lib/content-factory/types.ts";
import { buildWaveAEvidenceRows, renderWaveAEvidenceMarkdown } from "../lib/content-factory/wave-a-report.ts";

function parseGrades(args: readonly string[]): readonly FactoryGrade[] {
  const raw = args.find((arg) => arg.startsWith("--grades="))?.slice(9) ?? "1-9";
  const result = new Set<number>();
  for (const part of raw.split(",")) {
    const range = /^(\d)-(\d)$/u.exec(part);
    if (range) { for (let grade = Number(range[1]); grade <= Number(range[2]); grade += 1) result.add(grade); }
    else if (/^\d$/u.test(part)) result.add(Number(part)); else throw new Error("INVALID_GRADE_SELECTION");
  }
  const grades = [...result].sort((a, b) => a - b);
  if (grades.some((grade) => !factoryGrades.includes(grade as FactoryGrade))) throw new Error("GRADE_OUT_OF_RANGE");
  return grades as FactoryGrade[];
}

const [, , command = "validate", ...args] = process.argv;
const grades = parseGrades(args);
const dryRun = args.includes("--dry-run");
const packs = getGradePacks(grades);
const root = process.cwd();
const before = grades.includes(1) ? gradeOneSourceDigest((path) => readFileSync(resolve(root, path), "utf8")) : null;

function ensureOutput() { const output = resolve(root, "content/grade-packs/generated"); mkdirSync(output, { recursive: true }); return output; }

if (command === "validate") {
  const diagnostics = [...packs.flatMap(validateGradePack), ...validateCrossPackDuplicates(packs), ...buildPrerequisiteGraph(getGradePacks(factoryGrades)).diagnostics];
  const fixtureDiagnostics = fixturesForGrades(grades).flatMap(validateGradePack);
  const errors = [...diagnostics, ...fixtureDiagnostics].filter((item) => item.severity === "ERROR");
  console.log(`CONTENT_FACTORY_VALIDATE grades=${grades.join(",")} errors=${errors.length} warnings=${[...diagnostics, ...fixtureDiagnostics].filter((item) => item.severity === "WARNING").length}`);
  if (errors.length) { for (const item of errors) console.error(`${item.code} entity=${item.entityId}`); process.exitCode = 1; }
} else if (command === "coverage") {
  const coverage = createCoverageMatrix(packs);
  if (!dryRun) { const output = ensureOutput(); writeFileSync(resolve(output, "coverage.json"), `${canonicalize({ schemaVersion: "content-factory-coverage-v2", rows: coverage })}\n`, { mode: 0o644 }); writeFileSync(resolve(output, "coverage.md"), renderCoverageMarkdown(coverage), { mode: 0o644 }); }
  console.log(`CONTENT_FACTORY_COVERAGE grades=${grades.join(",")} rows=${coverage.length} dryRun=${dryRun}`);
} else if (command === "report") {
  const rows = buildWaveAEvidenceRows(packs);
  if (!dryRun) {
    const output = ensureOutput();
    writeFileSync(resolve(output, "wave-a-evidence.json"), `${canonicalize({ schemaVersion: "plave-wave-a-evidence-v1", rows })}\n`, { mode: 0o644 });
    writeFileSync(resolve(output, "wave-a-evidence.md"), renderWaveAEvidenceMarkdown(rows), { mode: 0o644 });
  }
  console.log(`CONTENT_FACTORY_REPORT grades=${grades.join(",")} rows=${rows.length} dryRun=${dryRun}`);
} else if (command === "bundle") {
  const bundle = buildDeterministicBundle(packs);
  if (!dryRun) { const output = ensureOutput(); writeFileSync(resolve(output, `bundle-grades-${grades.join("-")}.json`), `${canonicalize(bundle)}\n`, { mode: 0o644 }); }
  console.log(`CONTENT_FACTORY_BUNDLE grades=${grades.join(",")} hash=${bundle.bundleHash} dryRun=${dryRun}`);
} else if (command === "source-map") {
  const productionGrades = grades.filter((grade): grade is Exclude<FactoryGrade, 1> => grade !== 1);
  const maps = productionGrades.map((grade) => ({ grade, records: createOfficialSourceMap(grade) }));
  if (!dryRun) {
    const output = ensureOutput();
    for (const map of maps) {
      writeFileSync(
        resolve(output, `source-map-grade-${map.grade}.json`),
        `${canonicalize({ schemaVersion: "plave-curriculum-source-map-v1", source: officialCurriculumSource, ...map })}\n`,
        { mode: 0o644 },
      );
    }
    writeFileSync(
      resolve(output, "source-maps-grades-2-9.json"),
      `${canonicalize({ schemaVersion: "plave-curriculum-source-map-index-v1", source: officialCurriculumSource, maps })}\n`,
      { mode: 0o644 },
    );
  }
  console.log(`CONTENT_FACTORY_SOURCE_MAP grades=${productionGrades.join(",")} records=${maps.reduce((sum, map) => sum + map.records.length, 0)} dryRun=${dryRun}`);
} else if (command === "simulate") {
  const simulationPacks = [...packs.filter((pack) => pack.candidate), ...fixturesForGrades(grades)];
  const reports = simulationPacks.map((pack) => {
    const minimum = pack.candidate ? 12 : 3; const maximum = pack.candidate ? Math.min(24, pack.questions.length) : 6;
    return simulateCandidate(pack.grade, pack.questions, { version: pack.adaptivePolicy.version, minimumQuestions: minimum, maximumQuestions: maximum, masteryCorrect: minimum }, pack.questions.map((question, index) => ({ submissionId: `submission-${index}`, questionId: question.id, correct: index < minimum })));
  });
  const waveAReports = packs.filter((pack) => pack.grade >= 2 && pack.candidate && pack.questions.length >= 24).map(simulateWaveACandidate);
  const gradeOneShadowReports = packs.filter((pack) => pack.grade === 1 && pack.candidate && pack.questions.length >= 24).map(simulateWaveACandidate);
  console.log(`CONTENT_FACTORY_SIMULATE grades=${grades.join(",")} fixtures=${reports.length} waveACandidates=${waveAReports.length} gradeOneShadowCandidates=${gradeOneShadowReports.length} scenarios=${(waveAReports.length + gradeOneShadowReports.length) * 3} softwareBehaviorOnly=true`);
} else throw new Error("UNKNOWN_CONTENT_FACTORY_COMMAND");

if (before) {
  const after = gradeOneSourceDigest((path) => readFileSync(resolve(root, path), "utf8"));
  assertGradeOneUnchanged(before, after);
  console.log(`GRADE1_IMMUTABILITY sourceHash=${before.aggregate} unchanged=true`);
}
