import { mkdir, readFile, writeFile } from "node:fs/promises";
import { canonicalContractHash, OUTCOME_CONTRACT_VERSION, type OutcomeGenerationContract } from "../lib/generation-contracts/schema.ts";

const coverage = JSON.parse(await readFile("artifacts/generation-coverage/universal-v1-coverage.json", "utf8")) as { matrix: readonly Record<string, unknown>[]; baseline: Record<string, number> };
if (coverage.baseline.outcomes !== 546) throw new Error("UNIVERSAL_CURRICULUM_BASELINE_DRIFT");
const blocked = coverage.matrix.filter((row) => row.status !== "SUPPORTED");
if (blocked.length !== 375) throw new Error("COVERAGE_WORK_QUEUE_DRIFT");

const contracts = blocked.map((row) => {
  const reasons = Array.isArray(row.reasons) ? row.reasons.map(String) : [];
  const missingEvidence = reasons.includes("NO_PRIMARY_QUESTION_MAPPING") || reasons.includes("INSUFFICIENT_EVIDENCE_FORMS");
  const contract: Omit<OutcomeGenerationContract, "canonicalContractHash"> = {
    contractId: `contract-${String(row.outcome)}`,
    contractVersion: OUTCOME_CONTRACT_VERSION,
    outcomeId: String(row.outcome),
    grade: Number(row.grade),
    domain: typeof row.domain === "string" && row.domain !== "UNKNOWN" ? row.domain : null,
    unitId: typeof row.unit === "string" && row.unit !== "UNKNOWN" ? row.unit : null,
    outcomeTitle: null,
    mathematicalIntent: null,
    measurableSkillComponents: [String(row.outcome)],
    allowedConcepts: [],
    excludedConcepts: [],
    prerequisiteAssumptions: [],
    parameterBounds: null,
    answerTypes: typeof row.answerType === "string" && row.answerType !== "UNKNOWN" ? [row.answerType] : [],
    evidenceForms: [],
    generatorFamilies: [],
    solverFamily: null,
    uniquenessPolicy: null,
    normalizationPolicy: null,
    visualContract: typeof row.visualType === "string" && row.visualType !== "NONE" ? { type: row.visualType } : null,
    difficultyDimensions: [],
    ambiguityConstraints: [],
    vietnameseTerminology: [],
    sourceEvidence: [
      { sourceType: "CANONICAL_COVERAGE_MATRIX", locator: "artifacts/generation-coverage/universal-v1-coverage.json", detail: `classification=${String(row.status)}; reasons=${reasons.join(",")}` },
      { sourceType: "CANONICAL_OUTCOME_ID", locator: String(row.outcome), detail: "Identifier preserved from official outcome inventory." },
    ],
    derivationMethod: "Evidence-derived draft; fields are null/empty where repository evidence is insufficient.",
    confidence: missingEvidence ? "LOW" : "MEDIUM",
    reviewStatus: missingEvidence ? "BLOCKED_SOURCE_REQUIRED" : "READY_FOR_PEDAGOGICAL_REVIEW",
    reviewNotes: missingEvidence ? ["Need canonical outcome title/intent, evidence forms, answer contract and solver family before generator authoring.", ...reasons] : ["Materialized evidence requires parameter-space, variation-budget and independent-solver review.", ...reasons],
  };
  return { ...contract, canonicalContractHash: canonicalContractHash(contract) };
});

const byGrade: Record<string, number> = {};
const byStatus: Record<string, number> = {};
const byDomain: Record<string, number> = {};
for (const contract of contracts) {
  byGrade[contract.grade] = (byGrade[contract.grade] ?? 0) + 1;
  byStatus[contract.reviewStatus] = (byStatus[contract.reviewStatus] ?? 0) + 1;
  byDomain[contract.domain ?? "UNKNOWN"] = (byDomain[contract.domain ?? "UNKNOWN"] ?? 0) + 1;
}
const packageValue = { schemaVersion: 1, source: "universal-v1-coverage", contractVersion: OUTCOME_CONTRACT_VERSION, authored: contracts.length, contracts, summary: { byGrade, byStatus, byDomain } };
await mkdir("artifacts/generation-contracts", { recursive: true });
await writeFile("artifacts/generation-contracts/universal-v1-contracts.json", JSON.stringify(packageValue, null, 2), { mode: 0o600 });
console.log(`CONTRACTS_AUTHORED=${contracts.length}/375`);
console.log(`READY_FOR_PEDAGOGICAL_REVIEW=${byStatus.READY_FOR_PEDAGOGICAL_REVIEW ?? 0}`);
console.log(`BLOCKED_SOURCE_REQUIRED=${byStatus.BLOCKED_SOURCE_REQUIRED ?? 0}`);
console.log(`DRAFT_EVIDENCE_DERIVED=${byStatus.DRAFT_EVIDENCE_DERIVED ?? 0}`);
console.log(`GRADE_COUNTS=${JSON.stringify(byGrade)}`);
console.log(`ARCHETYPE_COUNTS=${JSON.stringify(byDomain)}`);
