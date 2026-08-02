import inventoryJson from "../../docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json" with { type: "json" };

import type {
  ProductDifficulty,
  ProductInteractionType,
  ProductVariantId,
} from "./types.ts";
import { WAVE_D_CAPABILITY_METADATA, type WaveDProfile } from "./wave-d-capability-metadata.ts";
import { WAVE_D_OUTCOME_CAPABILITY, type WaveDCapabilityId } from "./wave-d-plan.ts";

export const WAVE_D_CONTRACT_VERSION = "PLAVE_PRODUCT_ASSESSMENT_CONTRACT_V2" as const;
export const WAVE_D_ENGINE_VERSION = "plave-generator-v2-wave-d.1" as const;

export type WaveDOutcomeContract = Readonly<{
  contractType: typeof WAVE_D_CONTRACT_VERSION;
  contractVersion: "wave-d-v2.1";
  engineVersion: typeof WAVE_D_ENGINE_VERSION | "PROVEN_V2_BASELINE";
  outcomeId: string;
  grade: number;
  unitId: string;
  productFamilyId: string;
  canonicalVariantId: WaveDCapabilityId & ProductVariantId;
  taskMode: WaveDCapabilityId;
  profile: WaveDProfile;
  measurableIntent: string;
  permittedEvidenceForms: readonly string[];
  normalizedProblemModel: Readonly<{ kind: WaveDCapabilityId; requiredFields: readonly string[] }>;
  parameterBounds: Readonly<{ minimum: number; maximum: number; maxSteps: number; maxDecimalPlaces: number; exactArithmetic: boolean }>;
  acceptedAnswerPolicy: string;
  uniquenessPolicy: string;
  interactionPolicy: readonly ProductInteractionType[];
  difficultyPolicy: Readonly<Record<ProductDifficulty, string>>;
  variationPolicy: readonly string[];
  independentSolver: string;
  independentValidator: string;
  misconceptionCatalog: readonly string[];
  distractorPolicy: string;
  feedbackPolicy: string;
  visualPolicy: string;
  prerequisitePolicy: string;
}>;

type OfficialOutcome = Readonly<{
  id: string;
  grade: number;
  conciseParaphrase: string;
  prerequisiteOutcomeIds: readonly string[];
  mappedUnitIds: readonly string[];
}>;

const official = inventoryJson as unknown as { totalOfficialOutcomes: number; outcomes: OfficialOutcome[] };
const officialById = new Map(official.outcomes.map((outcome) => [outcome.id, outcome]));
const BASELINES = new Set([
  "MOET2018-G3-GEO-P031-004",
  "MOET2018-G5-GEO-P044-013",
  "MOET2018-G6-GEO-P051-003",
]);
const gradeMaximum = (grade: number) => grade <= 1 ? 100 : grade === 2 ? 1_000 : grade === 3 ? 100_000 : grade <= 5 ? 1_000_000 : 10_000_000;
const family = (profile: WaveDProfile) => profile === "ARITHMETIC" ? "NUMBERS_AND_OPERATIONS" : profile === "ALGEBRA" || profile === "COORDINATE" ? "ALGEBRA_AND_GEOMETRY" : profile === "FINANCE" ? "APPLIED_FINANCE" : profile === "TIME" ? "TIME_AND_CALENDAR" : "GEOMETRY_AND_MEASUREMENT";
const POLYGON_CONSTRUCTION_OUTCOMES = new Set([
  "MOET2018-G3-GEO-P031-009",
  "MOET2018-G5-GEO-P043-007",
  "MOET2018-G6-GEO-P051-011",
]);
const CLOCK_READING_OUTCOMES = new Set([
  "MOET2018-G1-GEO-P023-006",
  "MOET2018-G1-GEO-P023-009",
  "MOET2018-G1-GEO-P023-014",
  "MOET2018-G1-EXP-P024-003",
  "MOET2018-G2-GEO-P027-010",
  "MOET2018-G3-GEO-P032-011",
]);
const CLASSIFICATION_OUTCOMES = new Set([
  "MOET2018-G5-GEO-P044-010",
  "MOET2018-G7-GEO-P059-016",
  "MOET2018-G7-GEO-P059-017",
  "MOET2018-G7-NAA-P058-033",
  "MOET2018-G9-GEO-P075-022",
  "MOET2018-G9-GEO-P075-023",
  "MOET2018-G9-GEO-P075-024",
]);
const interactionPolicy = (capability: WaveDCapabilityId, grade: number, outcomeId: string, defaults: readonly ProductInteractionType[]) => {
  if (CLOCK_READING_OUTCOMES.has(outcomeId)) return ["SHORT_STRUCTURED_RESPONSE"] as const;
  if (CLASSIFICATION_OUTCOMES.has(outcomeId)) return ["SINGLE_CHOICE"] as const;
  if (outcomeId === "MOET2018-G7-NAA-P058-034") return ["SHORT_STRUCTURED_RESPONSE"] as const;
  if (capability === "POLYGON_PROPERTIES") {
    if (POLYGON_CONSTRUCTION_OUTCOMES.has(outcomeId)) return ["CONSTRUCTION_OR_VISUAL_SELECTION"] as const;
    if (grade <= 4) return ["SINGLE_CHOICE"] as const;
    return defaults.filter((type) => type !== "CONSTRUCTION_OR_VISUAL_SELECTION");
  }
  if (capability !== "MONEY_FINANCE") return defaults;
  if (outcomeId === "MOET2018-G8-EXP-P070-001") return ["TABLE_OR_CHART_RESPONSE", "SINGLE_CHOICE"] as const;
  if (grade <= 3) return ["SINGLE_CHOICE"] as const;
  if (grade === 4) return ["INTEGER_INPUT"] as const;
  return defaults.filter((type) => type !== "SINGLE_CHOICE");
};
const maximumFor = (capability: WaveDCapabilityId, grade: number) => capability === "MONEY_FINANCE"
  ? grade === 2 ? 100_000 : grade === 3 ? 500_000 : 10_000_000
  : gradeMaximum(grade);

export const WAVE_D_OUTCOME_CONTRACTS = [...WAVE_D_OUTCOME_CAPABILITY.entries()]
  .map(([outcomeId, capability]): WaveDOutcomeContract => {
    const source = officialById.get(outcomeId);
    if (!source || source.mappedUnitIds.length === 0) throw new Error(`WAVE_D_OFFICIAL_OUTCOME_MISSING:${outcomeId}`);
    const metadata = WAVE_D_CAPABILITY_METADATA[capability];
    return {
      contractType: WAVE_D_CONTRACT_VERSION,
      contractVersion: "wave-d-v2.1",
      engineVersion: BASELINES.has(outcomeId) ? "PROVEN_V2_BASELINE" : WAVE_D_ENGINE_VERSION,
      outcomeId,
      grade: source.grade,
      unitId: source.mappedUnitIds[0]!,
      productFamilyId: family(metadata.profile),
      canonicalVariantId: capability,
      taskMode: capability,
      profile: metadata.profile,
      measurableIntent: source.conciseParaphrase,
      permittedEvidenceForms: [metadata.mathematicalRequirement, metadata.answerSemantics],
      normalizedProblemModel: { kind: capability, requiredFields: ["values", "labels", "operation", "visualState", "structuralFingerprint"] },
      parameterBounds: {
        minimum: source.grade >= 7 ? -1_000 : 0,
        maximum: maximumFor(capability, source.grade),
        maxSteps: source.grade <= 2 ? 1 : source.grade <= 5 ? 2 : 3,
        maxDecimalPlaces: source.grade < 5 ? 0 : 3,
        exactArithmetic: true,
      },
      acceptedAnswerPolicy: metadata.answerSemantics,
      uniquenessPolicy: "one canonical answer or an explicit mathematically equivalent accepted set",
      interactionPolicy: interactionPolicy(capability, source.grade, outcomeId, metadata.interactionTypes),
      difficultyPolicy: {
        EASY: "direct representation with one explicit relation",
        MEDIUM: "changed unknown position or two linked representations",
        HARD: "multi-relation reasoning, diagnostic misconception or contextual selection within grade bounds",
      },
      variationPolicy: ["mathematical parameters", "unknown position", "orientation", "context", "visual state", "misconception family"],
      independentSolver: `${capability}_INDEPENDENT_SOLVER_V2`,
      independentValidator: `${capability}_CONTRACT_VALIDATOR_V2`,
      misconceptionCatalog: [metadata.misconceptionFamily],
      distractorPolicy: `derive false options only from ${metadata.misconceptionFamily}; validate uniqueness and falsehood`,
      feedbackPolicy: `state the checked ${metadata.mathematicalRequirement}, identify the relevant misconception and give one grade-appropriate next step`,
      visualPolicy: `${metadata.visualType} generated from the same normalized mathematical model`,
      prerequisitePolicy: source.prerequisiteOutcomeIds.length ? `explicit prerequisites: ${source.prerequisiteOutcomeIds.join(",")}` : "no inferred prerequisite",
    };
  })
  .sort((a, b) => a.outcomeId.localeCompare(b.outcomeId));

if (official.totalOfficialOutcomes !== 546 || WAVE_D_OUTCOME_CONTRACTS.length !== 232) throw new Error("WAVE_D_CONTRACT_COUNT_INVALID");
if (new Set(WAVE_D_OUTCOME_CONTRACTS.map((contract) => contract.outcomeId)).size !== 232) throw new Error("WAVE_D_DUPLICATE_OUTCOME_CONTRACT");

const BY_OUTCOME = new Map(WAVE_D_OUTCOME_CONTRACTS.map((contract) => [contract.outcomeId, contract]));
export const getWaveDOutcomeContract = (outcomeId: string) => BY_OUTCOME.get(outcomeId);
export const isWaveDImplementedByNewEngine = (contract: WaveDOutcomeContract) => contract.engineVersion === WAVE_D_ENGINE_VERSION;
