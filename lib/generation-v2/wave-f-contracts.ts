import inventoryJson from "../../docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json" with { type: "json" };
import type { ProductDifficulty, ProductInteractionType, ProductVariantId } from "./types.ts";
import { WAVE_F_CAPABILITY_METADATA, type WaveFProfile } from "./wave-f-capability-metadata.ts";
import { WAVE_F_OUTCOME_CAPABILITY, type WaveFCapabilityId } from "./wave-f-plan.ts";

export const WAVE_F_CONTRACT_VERSION = "PLAVE_PRODUCT_ASSESSMENT_CONTRACT_V2" as const;
export const WAVE_F_ENGINE_VERSION = "plave-generator-v2-wave-f.1" as const;

export type WaveFOutcomeContract = Readonly<{
  contractType: typeof WAVE_F_CONTRACT_VERSION;
  contractVersion: "wave-f-v2.1";
  engineVersion: typeof WAVE_F_ENGINE_VERSION;
  outcomeId: string;
  grade: number;
  unitId: string;
  productFamilyId: string;
  canonicalVariantId: WaveFCapabilityId & ProductVariantId;
  taskMode: WaveFCapabilityId;
  profile: WaveFProfile;
  measurableIntent: string;
  permittedEvidenceForms: readonly string[];
  normalizedProblemModel: Readonly<{ kind: WaveFCapabilityId; requiredFields: readonly string[] }>;
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
const family = (profile: WaveFProfile) => profile === "ARITHMETIC" ? "NUMBERS_AND_OPERATIONS" : profile === "MEASUREMENT" ? "MEASUREMENT_AND_MODELING" : profile === "DATA" ? "STATISTICS_AND_DATA" : profile === "FINANCE" ? "FINANCIAL_LITERACY" : profile === "ALGEBRA" ? "ALGEBRA_AND_FUNCTIONS" : "APPLIED_MATHEMATICS";
const maximum = (grade: number) => grade <= 2 ? 100 : grade <= 5 ? 1_000_000 : 10_000_000;

export const WAVE_F_OUTCOME_CONTRACTS = [...WAVE_F_OUTCOME_CAPABILITY.entries()].map(([outcomeId, capability]): WaveFOutcomeContract => {
  const source = officialById.get(outcomeId);
  if (!source || source.mappedUnitIds.length === 0) throw new Error(`WAVE_F_OFFICIAL_OUTCOME_MISSING:${outcomeId}`);
  const metadata = WAVE_F_CAPABILITY_METADATA[capability];
  return {
    contractType: WAVE_F_CONTRACT_VERSION, contractVersion: "wave-f-v2.1", engineVersion: WAVE_F_ENGINE_VERSION,
    outcomeId, grade: source.grade, unitId: source.mappedUnitIds[0]!, productFamilyId: family(metadata.profile),
    canonicalVariantId: capability, taskMode: capability, profile: metadata.profile,
    measurableIntent: source.conciseParaphrase, permittedEvidenceForms: [metadata.mathematicalRequirement, metadata.answerSemantics],
    normalizedProblemModel: { kind: capability, requiredFields: ["operation", "values", "labels", "meta", "structuralFingerprint"] },
    parameterBounds: { minimum: 0, maximum: maximum(source.grade), maxSteps: source.grade <= 2 ? 1 : source.grade <= 5 ? 2 : 3, maxDecimalPlaces: 0, exactArithmetic: true },
    acceptedAnswerPolicy: metadata.answerSemantics,
    uniquenessPolicy: "one canonical answer or an explicit finite mathematically equivalent accepted set",
    interactionPolicy: metadata.interactionTypes,
    difficultyPolicy: {
      EASY: "one direct identification or one-step calculation",
      MEDIUM: "changed unknown position, representation or linked comparison",
      HARD: "multi-relation evidence selection or misconception diagnosis within grade bounds",
    },
    variationPolicy: ["mathematical parameters", "operation or unknown position", "scenario family", "wording frame", "representation", "answer distribution", "misconception family"],
    independentSolver: `${capability}_INDEPENDENT_SOLVER_V2`, independentValidator: `${capability}_CONTRACT_VALIDATOR_V2`,
    misconceptionCatalog: [metadata.misconceptionFamily],
    distractorPolicy: `derive false options from ${metadata.misconceptionFamily}; reject duplicates and any also-correct option`,
    feedbackPolicy: `name the checked ${metadata.mathematicalRequirement}, identify the misconception and give one Grade ${source.grade} next step`,
    visualPolicy: `${metadata.visualType} generated from the same canonical problem model; never decorative`,
    prerequisitePolicy: source.prerequisiteOutcomeIds.length ? `explicit prerequisites: ${source.prerequisiteOutcomeIds.join(",")}` : "no inferred prerequisite",
  };
}).sort((a, b) => a.outcomeId.localeCompare(b.outcomeId));

if (official.totalOfficialOutcomes !== 546 || WAVE_F_OUTCOME_CONTRACTS.length !== 10) throw new Error("WAVE_F_CONTRACT_COUNT_INVALID");
if (new Set(WAVE_F_OUTCOME_CONTRACTS.map((contract) => contract.outcomeId)).size !== 10) throw new Error("WAVE_F_DUPLICATE_OUTCOME_CONTRACT");
const BY_OUTCOME = new Map(WAVE_F_OUTCOME_CONTRACTS.map((contract) => [contract.outcomeId, contract]));
export const getWaveFOutcomeContract = (outcomeId: string) => BY_OUTCOME.get(outcomeId);
export const isWaveFImplementedByNewEngine = (contract: WaveFOutcomeContract) => contract.engineVersion === WAVE_F_ENGINE_VERSION;
