import inventoryJson from "../../docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json" with { type: "json" };
import type { ProductDifficulty, ProductInteractionType, ProductVariantId } from "./types.ts";
import { WAVE_E_CAPABILITY_METADATA, type WaveEProfile } from "./wave-e-capability-metadata.ts";
import { WAVE_E_OUTCOME_CAPABILITY, type WaveECapabilityId } from "./wave-e-plan.ts";

export const WAVE_E_CONTRACT_VERSION = "PLAVE_PRODUCT_ASSESSMENT_CONTRACT_V2" as const;
export const WAVE_E_ENGINE_VERSION = "plave-generator-v2-wave-e.1" as const;
export type WaveEOutcomeContract = Readonly<{
  contractType: typeof WAVE_E_CONTRACT_VERSION;
  contractVersion: "wave-e-v2.1";
  engineVersion: typeof WAVE_E_ENGINE_VERSION | "PROVEN_V2_BASELINE";
  outcomeId: string;
  grade: number;
  unitId: string;
  productFamilyId: string;
  canonicalVariantId: WaveECapabilityId & ProductVariantId;
  taskMode: WaveECapabilityId;
  profile: WaveEProfile;
  measurableIntent: string;
  permittedEvidenceForms: readonly string[];
  normalizedProblemModel: Readonly<{ kind: WaveECapabilityId; requiredFields: readonly string[] }>;
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
type OfficialOutcome = Readonly<{ id: string; grade: number; conciseParaphrase: string; prerequisiteOutcomeIds: readonly string[]; mappedUnitIds: readonly string[] }>;
const official = inventoryJson as unknown as { totalOfficialOutcomes: number; outcomes: OfficialOutcome[] };
const officialById = new Map(official.outcomes.map((outcome) => [outcome.id, outcome]));
const BASELINES = new Set(["MOET2018-G7-STA-P061-001", "MOET2018-G8-STA-P069-011"]);
const family = (profile: WaveEProfile) => profile === "DATA" ? "STATISTICS_AND_DATA" : profile === "PROBABILITY" ? "PROBABILITY" : profile === "ALGEBRA" ? "ALGEBRA_AND_FUNCTIONS" : profile === "GEOMETRY" ? "GEOMETRY_AND_REASONING" : profile === "MEASUREMENT" ? "MEASUREMENT_AND_MODELING" : profile === "FINANCE" ? "FINANCIAL_LITERACY" : profile === "ARITHMETIC" ? "NUMBERS_AND_OPERATIONS" : "APPLIED_MATHEMATICS";
const maximum = (grade: number) => grade <= 3 ? 1_000 : grade <= 6 ? 100_000 : 10_000_000;
const interactionPolicy = (capability: WaveECapabilityId, outcomeId: string, defaults: readonly ProductInteractionType[]): readonly ProductInteractionType[] => {
  if (capability === "LINEAR_FUNCTION_TABLE") return ["MATCHING"];
  if (capability === "FREQUENCY_INTERPRETATION" && (outcomeId.endsWith("012") || outcomeId.endsWith("013"))) return ["SINGLE_CHOICE"];
  return defaults;
};
const productTitle = (value: string) => value
  .replaceAll("", "≠")
  .replaceAll("ax2", "ax²")
  .replaceAll("y=ax2", "y = ax²")
  .replace("–Vẽđượcđồthịcủahàmsốy=ax²(a≠0).", "Vẽ được đồ thị của hàm số y = ax² (a ≠ 0).");

export const WAVE_E_OUTCOME_CONTRACTS = [...WAVE_E_OUTCOME_CAPABILITY.entries()].map(([outcomeId, capability]): WaveEOutcomeContract => {
  const source = officialById.get(outcomeId); if (!source || source.mappedUnitIds.length === 0) throw new Error(`WAVE_E_OFFICIAL_OUTCOME_MISSING:${outcomeId}`);
  const metadata = WAVE_E_CAPABILITY_METADATA[capability];
  return {
    contractType: WAVE_E_CONTRACT_VERSION, contractVersion: "wave-e-v2.1", engineVersion: BASELINES.has(outcomeId) ? "PROVEN_V2_BASELINE" : WAVE_E_ENGINE_VERSION,
    outcomeId, grade: source.grade, unitId: source.mappedUnitIds[0]!, productFamilyId: family(metadata.profile), canonicalVariantId: capability, taskMode: capability, profile: metadata.profile,
    measurableIntent: productTitle(source.conciseParaphrase), permittedEvidenceForms: [metadata.mathematicalRequirement, metadata.answerSemantics],
    normalizedProblemModel: { kind: capability, requiredFields: ["values", "labels", "operation", "visualState", "structuralFingerprint"] },
    parameterBounds: { minimum: 0, maximum: maximum(source.grade), maxSteps: source.grade <= 3 ? 1 : source.grade <= 6 ? 2 : 3, maxDecimalPlaces: source.grade <= 4 ? 0 : 3, exactArithmetic: true },
    acceptedAnswerPolicy: metadata.answerSemantics, uniquenessPolicy: "one canonical answer or an explicit finite mathematically equivalent accepted set", interactionPolicy: interactionPolicy(capability, outcomeId, metadata.interactionTypes),
    difficultyPolicy: { EASY: "one direct read, classification or calculation", MEDIUM: "changed unknown position or two linked representations", HARD: "multi-relation reasoning, evidence selection or misconception diagnosis within grade bounds" },
    variationPolicy: ["dataset parameters", "scenario family", "unknown position", "representation", "visual structure", "answer distribution", "misconception family"],
    independentSolver: `${capability}_INDEPENDENT_SOLVER_V2`, independentValidator: `${capability}_CONTRACT_VALIDATOR_V2`, misconceptionCatalog: [metadata.misconceptionFamily],
    distractorPolicy: `derive false options from ${metadata.misconceptionFamily}; reject duplicates and any also-correct option`,
    feedbackPolicy: `name the checked ${metadata.mathematicalRequirement}, identify the relevant misconception and give one Grade ${source.grade} next step`,
    visualPolicy: `${metadata.visualType} generated from the same canonical problem model`, prerequisitePolicy: source.prerequisiteOutcomeIds.length ? `explicit prerequisites: ${source.prerequisiteOutcomeIds.join(",")}` : "no inferred prerequisite",
  };
}).sort((a, b) => a.outcomeId.localeCompare(b.outcomeId));

if (official.totalOfficialOutcomes !== 546 || WAVE_E_OUTCOME_CONTRACTS.length !== 86) throw new Error("WAVE_E_CONTRACT_COUNT_INVALID");
if (new Set(WAVE_E_OUTCOME_CONTRACTS.map((contract) => contract.outcomeId)).size !== 86) throw new Error("WAVE_E_DUPLICATE_OUTCOME_CONTRACT");
const BY_OUTCOME = new Map(WAVE_E_OUTCOME_CONTRACTS.map((contract) => [contract.outcomeId, contract]));
export const getWaveEOutcomeContract = (outcomeId: string) => BY_OUTCOME.get(outcomeId);
export const isWaveEImplementedByNewEngine = (contract: WaveEOutcomeContract) => contract.engineVersion === WAVE_E_ENGINE_VERSION;
