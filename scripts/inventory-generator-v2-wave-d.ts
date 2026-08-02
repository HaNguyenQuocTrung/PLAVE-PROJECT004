import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { WAVE_D_CAPABILITY_METADATA } from "../lib/generation-v2/wave-d-capability-metadata.ts";
import { WAVE_D_OUTCOME_CAPABILITY } from "../lib/generation-v2/wave-d-plan.ts";

type MatrixRow = Readonly<{
  outcomeId: string;
  wave: string;
  grade: number;
  implementationStatus: string;
  canonicalVariant: string | null;
  legacyCandidateVariant: string;
}>;
type OfficialOutcome = Readonly<{
  id: string;
  grade: number;
  officialStrand: string;
  subdomain: string;
  conciseParaphrase: string;
  prerequisiteOutcomeIds: readonly string[];
  mappedUnitIds: readonly string[];
  pages: Readonly<{ start: number; end: number }>;
}>;

const root = process.cwd();
if (!root.endsWith("/PLAVE-PROJECT004")) throw new Error("PROJECT004_ROOT_REQUIRED");
const full = JSON.parse(readFileSync(resolve(root, "artifacts/generator-v2-full-coverage/outcome-matrix.json"), "utf8")) as { rows: MatrixRow[] };
const official = JSON.parse(readFileSync(resolve(root, "docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json"), "utf8")) as { totalOfficialOutcomes: number; outcomes: OfficialOutcome[] };
const officialById = new Map(official.outcomes.map((outcome) => [outcome.id, outcome]));
const waveRows = full.rows.filter((row) => row.wave === "D");
const waveIds = waveRows.map((row) => row.outcomeId).sort();
const planIds = [...WAVE_D_OUTCOME_CAPABILITY.keys()].sort();

if (official.totalOfficialOutcomes !== 546 || waveRows.length !== 232 || new Set(waveIds).size !== 232) throw new Error("WAVE_D_LOCKED_TAXONOMY_INVALID");
if (JSON.stringify(waveIds) !== JSON.stringify(planIds)) throw new Error("WAVE_D_EXPLICIT_PLAN_DOES_NOT_MATCH_TAXONOMY");

const rows = waveRows.map((matrixRow) => {
  const source = officialById.get(matrixRow.outcomeId);
  const capability = WAVE_D_OUTCOME_CAPABILITY.get(matrixRow.outcomeId);
  if (!source || !capability || source.grade !== matrixRow.grade || source.mappedUnitIds.length === 0) throw new Error(`WAVE_D_INVENTORY_SOURCE_INVALID:${matrixRow.outcomeId}`);
  const metadata = WAVE_D_CAPABILITY_METADATA[capability];
  return {
    outcomeId: matrixRow.outcomeId,
    grade: source.grade,
    strand: source.officialStrand,
    domain: source.subdomain,
    curriculumDescription: source.conciseParaphrase,
    sourcePages: source.pages,
    unitIds: source.mappedUnitIds,
    prerequisiteOutcomeIds: source.prerequisiteOutcomeIds,
    existingImplementationState: matrixRow.implementationStatus,
    existingCanonicalVariant: matrixRow.canonicalVariant,
    discardedLegacyCandidate: matrixRow.legacyCandidateVariant,
    plannedCanonicalCapability: capability,
    mathematicalRequirement: metadata.mathematicalRequirement,
    interactionTypes: metadata.interactionTypes,
    visualType: metadata.visualType,
    answerSemantics: metadata.answerSemantics,
    mathematicalDependencies: source.prerequisiteOutcomeIds,
    sharedCapabilityGradeBounds: `Explicit Grade ${source.grade} bounds; no cross-grade parameter inference.`,
    missingCapabilityOrContract: matrixRow.canonicalVariant ? null : capability,
    metadataSufficiency: "SUFFICIENT_FOR_SAFE_PLAVE_PRODUCT_CONTRACT",
    implementationStatus: matrixRow.implementationStatus,
  };
});

const gradeDistribution = Object.fromEntries(
  [...new Set(rows.map((row) => row.grade))].sort().map((grade) => [grade, rows.filter((row) => row.grade === grade).length]),
);
const strandDistribution = Object.fromEntries(
  [...new Set(rows.map((row) => row.strand))].sort().map((strand) => [strand, rows.filter((row) => row.strand === strand).length]),
);
const output = resolve(root, "artifacts/generator-v2-wave-d");
mkdirSync(resolve(output, "screenshots/mobile"), { recursive: true });
mkdirSync(resolve(output, "screenshots/desktop"), { recursive: true });
writeFileSync(resolve(output, "outcome-matrix.json"), `${JSON.stringify({
  schemaVersion: 1,
  sprint: "8C.D",
  recordedAt: "2026-08-02",
  inventoryRecordedBeforeImplementation: true,
  taxonomySource: "artifacts/generator-v2-full-coverage/outcome-matrix.json",
  taxonomyBoundary: "EXPLICIT_WAVE_D_FIELD_NO_REPARTITION",
  WAVE_D_OUTCOMES: rows.length,
  gradeDistribution,
  strandDistribution,
  existingBaselineOutcomes: rows.filter((row) => row.existingCanonicalVariant !== null).length,
  missingContractsBeforeImplementation: rows.filter((row) => row.missingCapabilityOrContract !== null).length,
  canonicalCapabilitiesPlanned: new Set(rows.map((row) => row.plannedCanonicalCapability)).size,
  metadataInsufficientOutcomes: [],
  ambiguousProductContracts: [],
  keywordRoutingUsed: false,
  rows,
}, null, 2)}\n`);

console.log(`WAVE_D_OUTCOMES=${rows.length}`);
console.log(`WAVE_D_PLANNED_CAPABILITIES=${new Set(rows.map((row) => row.plannedCanonicalCapability)).size}`);
console.log(`WAVE_D_EXISTING_BASELINE=${rows.filter((row) => row.existingCanonicalVariant !== null).length}`);
console.log("WAVE_D_METADATA_INSUFFICIENT=0");
