import { createHash } from "node:crypto";

export const OUTCOME_CONTRACT_VERSION = "outcome-generation-contract-v1" as const;
export type ContractReviewStatus = "DRAFT_EVIDENCE_DERIVED" | "READY_FOR_PEDAGOGICAL_REVIEW" | "APPROVED" | "REJECTED" | "BLOCKED_SOURCE_REQUIRED";
export type ContractConfidence = "LOW" | "MEDIUM" | "HIGH";

export type OutcomeGenerationContract = Readonly<{
  contractId: string;
  contractVersion: typeof OUTCOME_CONTRACT_VERSION;
  outcomeId: string;
  grade: number;
  domain: string | null;
  unitId: string | null;
  outcomeTitle: string | null;
  mathematicalIntent: string | null;
  measurableSkillComponents: readonly string[];
  allowedConcepts: readonly string[];
  excludedConcepts: readonly string[];
  prerequisiteAssumptions: readonly string[];
  parameterBounds: Readonly<Record<string, unknown>> | null;
  answerTypes: readonly string[];
  evidenceForms: readonly string[];
  generatorFamilies: readonly string[];
  solverFamily: string | null;
  uniquenessPolicy: string | null;
  normalizationPolicy: string | null;
  visualContract: Readonly<Record<string, unknown>> | null;
  difficultyDimensions: readonly string[];
  ambiguityConstraints: readonly string[];
  vietnameseTerminology: readonly string[];
  sourceEvidence: readonly Readonly<{ sourceType: string; locator: string; detail: string }>[];
  derivationMethod: string;
  confidence: ContractConfidence;
  reviewStatus: ContractReviewStatus;
  reviewNotes: readonly string[];
  canonicalContractHash: string;
}>;

export function canonicalContractHash(contract: Omit<OutcomeGenerationContract, "canonicalContractHash">) {
  const canonical = JSON.stringify(Object.fromEntries(Object.entries(contract).sort(([a], [b]) => a.localeCompare(b))));
  return createHash("sha256").update(canonical).digest("hex");
}

export function validateOutcomeGenerationContract(value: unknown): value is OutcomeGenerationContract {
  if (!value || typeof value !== "object") return false;
  const contract = value as Partial<OutcomeGenerationContract>;
  return typeof contract.contractId === "string" && contract.contractVersion === OUTCOME_CONTRACT_VERSION &&
    typeof contract.outcomeId === "string" && Number.isInteger(contract.grade) &&
    Array.isArray(contract.measurableSkillComponents) && contract.measurableSkillComponents.length > 0 &&
    Array.isArray(contract.answerTypes) && Array.isArray(contract.evidenceForms) &&
    Array.isArray(contract.generatorFamilies) && Array.isArray(contract.sourceEvidence) &&
    typeof contract.canonicalContractHash === "string" &&
    ["DRAFT_EVIDENCE_DERIVED", "READY_FOR_PEDAGOGICAL_REVIEW", "APPROVED", "REJECTED", "BLOCKED_SOURCE_REQUIRED"].includes(contract.reviewStatus ?? "");
}
