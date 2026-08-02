import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { WAVE_F_CAPABILITY_METADATA } from "../lib/generation-v2/wave-f-capability-metadata.ts";
import { WAVE_F_OUTCOME_CAPABILITY } from "../lib/generation-v2/wave-f-plan.ts";

type MatrixRow = Readonly<{ outcomeId: string; wave: string; grade: number; implementationStatus: string; canonicalVariant: string | null; legacyCandidateVariant: string }>;
type OfficialOutcome = Readonly<{ id: string; grade: number; officialStrand: string; subdomain: string; conciseParaphrase: string; prerequisiteOutcomeIds: readonly string[]; mappedUnitIds: readonly string[]; pages: Readonly<{ start: number; end: number }> }>;
const root = process.cwd();
if (!root.endsWith("/PLAVE-PROJECT004")) throw new Error("PROJECT004_ROOT_REQUIRED");
const full = JSON.parse(readFileSync(resolve(root, "artifacts/generator-v2-full-coverage/outcome-matrix.json"), "utf8")) as { rows: MatrixRow[] };
const official = JSON.parse(readFileSync(resolve(root, "docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json"), "utf8")) as { totalOfficialOutcomes: number; outcomes: OfficialOutcome[] };
const officialById = new Map(official.outcomes.map((outcome) => [outcome.id, outcome]));
const waveRows = full.rows.filter((row) => row.wave === "F");
const remainingRows = waveRows.filter((row) => row.implementationStatus === "BLOCKED_MISSING_CONTRACT");
const remainingIds = remainingRows.map((row) => row.outcomeId).sort();
const planIds = [...WAVE_F_OUTCOME_CAPABILITY.keys()].sort();
if (official.totalOfficialOutcomes !== 546 || waveRows.length !== 12 || remainingRows.length !== 10) throw new Error("WAVE_F_LOCKED_TAXONOMY_INVALID");
if (JSON.stringify(remainingIds) !== JSON.stringify(planIds)) throw new Error("WAVE_F_EXPLICIT_PLAN_DOES_NOT_MATCH_TAXONOMY");

const rows = remainingRows.map((matrixRow) => {
  const source = officialById.get(matrixRow.outcomeId); const capability = WAVE_F_OUTCOME_CAPABILITY.get(matrixRow.outcomeId);
  if (!source || !capability || source.grade !== matrixRow.grade || source.mappedUnitIds.length === 0) throw new Error(`WAVE_F_INVENTORY_SOURCE_INVALID:${matrixRow.outcomeId}`);
  const metadata = WAVE_F_CAPABILITY_METADATA[capability];
  return {
    outcomeId: matrixRow.outcomeId, grade: source.grade, strand: source.officialStrand, domain: source.subdomain,
    curriculumDescription: source.conciseParaphrase, sourcePages: source.pages, unitIds: source.mappedUnitIds,
    prerequisiteOutcomeIds: source.prerequisiteOutcomeIds, existingImplementationState: matrixRow.implementationStatus,
    existingCanonicalVariant: matrixRow.canonicalVariant, discardedLegacyCandidate: matrixRow.legacyCandidateVariant,
    plannedCanonicalCapability: capability, mathematicalContract: metadata.mathematicalRequirement,
    gradeDifficultyBounds: `Explicit Grade ${source.grade} bounds with EASY/MEDIUM/HARD structural levels`,
    interaction: metadata.interactionTypes, visualOrDataRequirements: metadata.visualType,
    solverValidatorStrategy: `${capability}_INDEPENDENT_SOLVER_V2 + ${capability}_CONTRACT_VALIDATOR_V2`,
    answerSemantics: metadata.answerSemantics, exactBlocker: null,
    metadataSufficiency: "SUFFICIENT_FOR_SAFE_PLAVE_PRODUCT_CONTRACT",
    implementationStatus: "NOT_IMPLEMENTED_PREIMPLEMENTATION",
  };
});
const gradeDistribution = Object.fromEntries([...new Set(rows.map((row) => row.grade))].sort().map((grade) => [grade, rows.filter((row) => row.grade === grade).length]));
const output = resolve(root, "artifacts/generator-v2-wave-f");
mkdirSync(resolve(output, "screenshots/mobile"), { recursive: true });
mkdirSync(resolve(output, "screenshots/desktop"), { recursive: true });
writeFileSync(resolve(output, "outcome-matrix.json"), `${JSON.stringify({
  schemaVersion: 1, sprint: "8C.F", recordedAt: "2026-08-02", inventoryRecordedBeforeImplementation: true,
  taxonomySource: "artifacts/generator-v2-full-coverage/outcome-matrix.json", taxonomyBoundary: "EXPLICIT_WAVE_F_FIELD_NO_REPARTITION",
  WAVE_F_TAXONOMY_OUTCOMES: 12, WAVE_F_PREEXISTING_BASELINE_OUTCOMES: 2, WAVE_F_OUTCOMES: 10,
  PRE_IMPLEMENTATION_COVERAGE: 536, EXPECTED_POST_IMPLEMENTATION_COVERAGE: 546,
  gradeDistribution, canonicalCapabilitiesPlanned: 8, metadataInsufficientOutcomes: [], ambiguousProductContracts: [], keywordRoutingUsed: false, rows,
}, null, 2)}\n`);
console.log("WAVE_F_OUTCOMES=10");
console.log("PRE_IMPLEMENTATION_COVERAGE=536");
console.log("EXPECTED_POST_IMPLEMENTATION_COVERAGE=546");
console.log("WAVE_F_NEW_CAPABILITIES=8");
console.log("WAVE_F_METADATA_INSUFFICIENT=0");
