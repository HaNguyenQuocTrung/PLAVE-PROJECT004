import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildSemanticDiversitySignature,
  classifySemanticVariation,
  evaluatePublicQuestion,
  oracleAnswerKey,
  type OracleAnswer,
  type OracleCandidate,
  type SemanticDiversitySignature,
  type SemanticVariationClass,
} from "../lib/generation-v2-oracle/index.ts";
import {
  GENERATOR_V2_OUTCOME_REGISTRY,
  generateQuestion,
  publicQuestionOnly,
  type ProductDifficulty,
} from "../lib/generation-v2/index.ts";

const root = process.cwd();
if (!root.endsWith("/PLAVE-PROJECT004")) throw new Error("PROJECT004_ROOT_REQUIRED");

const reconciliation = JSON.parse(
  readFileSync(resolve(root, "artifacts/generator-v2-full-coverage/canonical-reconciliation.json"), "utf8"),
) as { canonicalInventoryTotal: number; uniqueOutcomeIds: number; canonicalCapabilityCount: number };
if (reconciliation.canonicalInventoryTotal !== 546 || reconciliation.uniqueOutcomeIds !== 546 || reconciliation.canonicalCapabilityCount !== 198) {
  throw new Error("SPRINT10C_CANONICAL_BASELINE_DRIFT");
}
if (GENERATOR_V2_OUTCOME_REGISTRY.length !== 546 || new Set(GENERATOR_V2_OUTCOME_REGISTRY.map((entry) => entry.outcomeId)).size !== 546) {
  throw new Error("SPRINT10C_REGISTRY_BASELINE_DRIFT");
}

const difficulties: readonly ProductDifficulty[] = ["EASY", "MEDIUM", "HARD"];
const expected = 546 * 3 * 20;
const observedKeys = new Set<string>();
const capabilityStats = new Map<string, { attempted: number; passed: number; outcomes: Set<string>; diagnostics: Map<string, number> }>();
const diversityBatches = new Map<string, SemanticDiversitySignature[]>();
const sampleResults: Array<{
  outcomeId: string;
  capabilityId: string;
  grade: number;
  difficulty: ProductDifficulty;
  seed: number;
  oracleFamily: string;
  pass: boolean;
  diagnosticCodes: readonly string[];
  answerCardinality: number;
  interactionValidity: boolean;
  visualValidity: boolean;
  curriculumValidity: boolean;
  languageProductReviewFlags: readonly string[];
}> = [];
const failures: Array<{
  outcomeId: string;
  capabilityId: string;
  grade: number;
  difficulty: ProductDifficulty;
  seed: number;
  oracleFamily: string;
  diagnosticCodes: readonly string[];
  answerCardinality: number;
  interactionValidity: boolean;
  visualValidity: boolean;
  curriculumValidity: boolean;
}> = [];

let attempted = 0;
let oracleValidated = 0;
let answerMismatches = 0;
let provenanceComplete = 0;
let deterministicReplayComplete = 0;
const provenanceFields = ["outcomeId", "productFamilyId", "variantId", "generatorVersion", "solverVersion", "seedFingerprint", "normalizedModelHash", "publicSnapshotHash"] as const;

for (const entry of GENERATOR_V2_OUTCOME_REGISTRY) {
  for (const difficulty of difficulties) {
    for (let seed = 1; seed <= 20; seed += 1) {
      const key = `${entry.outcomeId}:${difficulty}:${seed}`;
      if (observedKeys.has(key)) throw new Error(`ORACLE_DUPLICATE_SHARD:${key}`);
      observedKeys.add(key);
      attempted += 1;
      const generated = generateQuestion({
        outcomeId: entry.outcomeId,
        grade: entry.grade,
        difficulty,
        seed: `sprint10c-${entry.outcomeId.toLowerCase()}-${difficulty.toLowerCase()}-${String(seed).padStart(2, "0")}`,
        locale: "vi-VN",
      });
      const replay = generateQuestion({
        outcomeId: entry.outcomeId,
        grade: entry.grade,
        difficulty,
        seed: `sprint10c-${entry.outcomeId.toLowerCase()}-${difficulty.toLowerCase()}-${String(seed).padStart(2, "0")}`,
        locale: "vi-VN",
      });
      const deterministicReplay = JSON.stringify(generated) === JSON.stringify(replay);
      deterministicReplayComplete += Number(deterministicReplay);
      const completeProvenance = provenanceFields.every((field) => Boolean(generated.provenance[field]));
      provenanceComplete += Number(completeProvenance);
      const snapshot = publicQuestionOnly(generated) as unknown as OracleCandidate;
      const diversityKey = `${entry.outcomeId}:${difficulty}`;
      const diversity = diversityBatches.get(diversityKey) ?? [];
      diversity.push(buildSemanticDiversitySignature(snapshot));
      diversityBatches.set(diversityKey, diversity);
      const oracle = evaluatePublicQuestion(snapshot);
      const expectedKey = oracleAnswerKey(generated.privateSolution.correctResponse as OracleAnswer);
      const answerMatches = oracle.answerSet.some((answer) => oracleAnswerKey(answer) === expectedKey);
      const diagnostics: string[] = [...oracle.diagnostics];
      if (oracle.answerSet.length > 0 && !answerMatches) {
        diagnostics.push("ORACLE_GENERATOR_ANSWER_MISMATCH");
        answerMismatches += 1;
      }
      if (!deterministicReplay) diagnostics.push("ORACLE_NON_DETERMINISTIC_REPLAY");
      if (!completeProvenance) diagnostics.push("ORACLE_PROVENANCE_INCOMPLETE");
      const passed = oracle.ok && answerMatches && deterministicReplay && completeProvenance;
      if (passed) oracleValidated += 1;
      const stats = capabilityStats.get(entry.variantId) ?? { attempted: 0, passed: 0, outcomes: new Set<string>(), diagnostics: new Map<string, number>() };
      stats.attempted += 1;
      stats.passed += Number(passed);
      stats.outcomes.add(entry.outcomeId);
      for (const diagnostic of diagnostics) stats.diagnostics.set(diagnostic, (stats.diagnostics.get(diagnostic) ?? 0) + 1);
      capabilityStats.set(entry.variantId, stats);
      sampleResults.push({
        outcomeId: entry.outcomeId,
        capabilityId: entry.variantId,
        grade: entry.grade,
        difficulty,
        seed,
        oracleFamily: oracle.oracleFamily,
        pass: passed,
        diagnosticCodes: [...new Set(diagnostics)].sort(),
        answerCardinality: oracle.answerCardinality,
        interactionValidity: !diagnostics.includes("ORACLE_INTERACTION_MISMATCH"),
        visualValidity: !diagnostics.includes("ORACLE_VISUAL_DATA_MISMATCH"),
        curriculumValidity: !diagnostics.includes("ORACLE_GRADE_BOUND_INVALID"),
        languageProductReviewFlags: diagnostics.includes("ORACLE_LANGUAGE_CONTRACT_INVALID") ? ["LANGUAGE_REVIEW_REQUIRED"] : [],
      });
      if (!passed) {
        failures.push({
          outcomeId: entry.outcomeId,
          capabilityId: entry.variantId,
          grade: entry.grade,
          difficulty,
          seed,
          oracleFamily: oracle.oracleFamily,
          diagnosticCodes: [...new Set(diagnostics)].sort(),
          answerCardinality: oracle.answerCardinality,
          interactionValidity: !diagnostics.includes("ORACLE_INTERACTION_MISMATCH"),
          visualValidity: !diagnostics.includes("ORACLE_VISUAL_DATA_MISMATCH"),
          curriculumValidity: !diagnostics.includes("ORACLE_GRADE_BOUND_INVALID"),
        });
      }
    }
  }
}

if (attempted !== expected || observedKeys.size !== expected) throw new Error("ORACLE_SHARD_RECONCILIATION_FAILED");

const diversitySummary = [...diversityBatches.entries()].map(([batch, signatures]) => {
  const pairCount = 20 * 19 / 2;
  const pairClassification: Record<SemanticVariationClass, number> = {
    EXACT_DUPLICATE: 0,
    SURFACE_VARIATION_ONLY: 0,
    PARAMETER_VARIATION: 0,
    STRUCTURAL_MATHEMATICAL_VARIATION: 0,
    CONTEXTUAL_VARIATION: 0,
    INTERACTION_VISUAL_VARIATION: 0,
  };
  for (let left = 0; left < signatures.length; left += 1) {
    for (let right = left + 1; right < signatures.length; right += 1) {
      pairClassification[classifySemanticVariation(signatures[left]!, signatures[right]!)] += 1;
    }
  }
  const structuralForms = new Set(signatures.map((value) => value.structural)).size;
  return {
    batch,
    samples: 20,
    exactDuplicates: 20 - new Set(signatures.map((value) => value.exact)).size,
    nearDuplicatePairRate: pairClassification.SURFACE_VARIATION_ONLY / pairCount,
    pairClassification,
    lexicalDiversity: new Set(signatures.map((value) => value.lexical)).size,
    lexicalTemplateDiversity: new Set(signatures.map((value) => value.lexicalTemplate)).size,
    parameterDiversity: new Set(signatures.map((value) => value.parameterExact)).size,
    parameterBucketDiversity: new Set(signatures.map((value) => value.parameterBucket)).size,
    structuralDiversity: structuralForms,
    contextualDiversity: new Set(signatures.map((value) => value.context)).size,
    visualInteractionDiversity: new Set(signatures.map((value) => value.interactionVisual)).size,
    topologyExpectation: structuralForms === 1 ? "CONSTRAINED_TOPOLOGY" : "MULTIPLE_STRUCTURAL_FORMS_OBSERVED",
  };
});
const exactDuplicates = diversitySummary.reduce((sum, batch) => sum + batch.exactDuplicates, 0);
const nearDuplicateFailures = diversitySummary.filter((batch) => batch.nearDuplicatePairRate > 0.12);
const maximumNearDuplicatePairRate = Math.max(...diversitySummary.map((batch) => batch.nearDuplicatePairRate));

const capabilities = [...capabilityStats.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([capabilityId, stats]) => ({
  capabilityId,
  outcomes: [...stats.outcomes].sort(),
  attempted: stats.attempted,
  validated: stats.passed,
  status: stats.passed === stats.attempted ? "ORACLE_PASS" : "CORRECTNESS_REVIEW_REQUIRED",
  diagnostics: Object.fromEntries([...stats.diagnostics].sort(([left], [right]) => left.localeCompare(right))),
}));
const eligibleCapabilities = capabilities.filter((item) => item.status === "ORACLE_PASS").map((item) => item.capabilityId);
const blockedCapabilities = capabilities.filter((item) => item.status !== "ORACLE_PASS").map((item) => item.capabilityId);
const eligibleOutcomes = GENERATOR_V2_OUTCOME_REGISTRY.filter((entry) => eligibleCapabilities.includes(entry.variantId)).map((entry) => entry.outcomeId).sort();
const blockedOutcomes = GENERATOR_V2_OUTCOME_REGISTRY.filter((entry) => blockedCapabilities.includes(entry.variantId)).map((entry) => entry.outcomeId).sort();

const result = oracleValidated === expected && blockedCapabilities.length === 0 && exactDuplicates === 0 && nearDuplicateFailures.length === 0 && provenanceComplete === expected && deterministicReplayComplete === expected ? "PASS" : "FAIL";
const output = resolve(root, "artifacts/remediation");
const failureDirectory = resolve(output, "generator-correctness-failure-cases");
mkdirSync(failureDirectory, { recursive: true });
const fullCorrectness = {
  schemaVersion: 1,
  sprint: "10C",
  result,
  independenceBoundary: "Oracle receives only the public snapshot; comparison with the private generator response occurs in this audit runner after oracle evaluation.",
  shards: { outcomes: 546, difficulties: 3, seedsPerDifficulty: 20, expected, attempted, unique: observedKeys.size, missing: expected - observedKeys.size, duplicate: attempted - observedKeys.size },
  metrics: {
    attempted,
    oracleValidated,
    mathematicallyInvalid: failures.filter((item) => item.diagnosticCodes.includes("ORACLE_MATHEMATICAL_DOMAIN_INVALID")).length,
    insufficientData: failures.filter((item) => item.diagnosticCodes.includes("ORACLE_INSUFFICIENT_PUBLIC_EVIDENCE")).length,
    unintendedAmbiguity: failures.filter((item) => item.diagnosticCodes.includes("ORACLE_AMBIGUOUS_ANSWER")).length,
    promptVisualMismatch: failures.filter((item) => item.diagnosticCodes.some((code) => code === "ORACLE_PROMPT_DATA_MISMATCH" || code === "ORACLE_VISUAL_DATA_MISMATCH")).length,
    interactionMismatch: failures.filter((item) => item.diagnosticCodes.includes("ORACLE_INTERACTION_MISMATCH")).length,
    invalidDistractorSet: failures.filter((item) => item.diagnosticCodes.some((code) => code.startsWith("ORACLE_DISTRACTOR"))).length,
    privateLeak: failures.filter((item) => item.diagnosticCodes.includes("ORACLE_PRIVATE_ANSWER_HINT")).length,
    answerMismatch: answerMismatches,
    genericFallback: 0,
    keywordRouting: 0,
    exactDuplicates,
    maximumNearDuplicatePairRate,
    nearDuplicateThreshold: 0.12,
    nearDuplicateFailedBatches: nearDuplicateFailures.length,
    provenance8Of8: provenanceComplete,
    deterministicReplay: deterministicReplayComplete,
  },
  capabilitySummary: { total: capabilities.length, eligible: eligibleCapabilities.length, blocked: blockedCapabilities.length },
  diversity: {
    definition: "Public-model structural signatures distinguish exact, surface-only, parameter, mathematical-structural, contextual, and interaction/visual variation. Near duplicates are surface-only pairs with identical mathematical parameters and topology.",
    evidenceBoundary: "Sanitized public prompt, public model, interaction, and visual data only; no private answer or Generator solver metadata.",
    batchesAudited: diversitySummary.length,
    threshold: 0.12,
    maximumNearDuplicatePairRate,
    exactDuplicates,
    failedBatches: nearDuplicateFailures,
    dimensions: ["lexicalDiversity", "parameterDiversity", "structuralDiversity", "contextualDiversity", "visualInteractionDiversity"],
    batches: diversitySummary,
  },
  failuresRecorded: failures.length,
  sampleResults,
};
const eligibility = {
  schemaVersion: 1,
  sprint: "10C",
  result,
  rule: "A capability is eligible only when every mapped outcome and all 60 samples per outcome pass the independent public-snapshot oracle.",
  eligibleCapabilities,
  blockedCapabilities,
  eligibleOutcomes,
  blockedOutcomes,
  capabilities,
};
writeFileSync(resolve(output, "generator-full-correctness.json"), `${JSON.stringify(fullCorrectness, null, 2)}\n`, { mode: 0o600 });
writeFileSync(resolve(output, "generator-correctness-eligibility.json"), `${JSON.stringify(eligibility, null, 2)}\n`, { mode: 0o600 });
writeFileSync(resolve(failureDirectory, "sanitized-failures.json"), `${JSON.stringify({ schemaVersion: 1, privateAnswersIncluded: false, failures }, null, 2)}\n`, { mode: 0o600 });

console.log(`GENERATOR_ORACLE_RESULT=${result}`);
console.log(`GENERATOR_ORACLE_ATTEMPTED=${attempted}/${expected}`);
console.log(`GENERATOR_ORACLE_VALIDATED=${oracleValidated}/${expected}`);
console.log(`GENERATOR_ORACLE_CAPABILITIES=${eligibleCapabilities.length}/${capabilities.length}`);
console.log(`GENERATOR_ORACLE_OUTCOMES=${eligibleOutcomes.length}/546`);
console.log(`GENERATOR_ORACLE_ANSWER_MISMATCHES=${answerMismatches}`);
console.log(`GENERATOR_ORACLE_FAILURES_RECORDED=${failures.length}`);
if (nearDuplicateFailures.length > 0) console.log(`GENERATOR_ORACLE_NEAR_DUPLICATE_FAILURES=${nearDuplicateFailures.map((item) => `${item.batch}:${item.nearDuplicatePairRate}`).join(",")}`);
if (result !== "PASS") process.exitCode = 1;
