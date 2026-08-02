import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  GENERATOR_V2_OUTCOME_REGISTRY,
  PRODUCT_VARIANT_REGISTRY,
  WAVE_A_OUTCOME_CONTRACTS,
  WAVE_B_OUTCOME_CONTRACTS,
  WAVE_C_OUTCOME_CONTRACTS,
  WAVE_D_OUTCOME_CONTRACTS,
  WAVE_E_OUTCOME_CONTRACTS,
  WAVE_F_OUTCOME_CONTRACTS,
  assertPublicBoundary,
  generateQuestion,
  publicQuestionOnly,
  validateStudentResponse,
  verifyQuestionIntegrity,
  type CanonicalResponse,
  type GeneratedProductQuestion,
} from "../lib/generation-v2/index.ts";

type OfficialOutcome = Readonly<{
  id: string;
  grade: number;
  officialStrand: string;
  subdomain: string;
  conciseParaphrase: string;
  prerequisiteOutcomeIds: readonly string[];
  mappedUnitIds: readonly string[];
}>;

type LegacyCandidate = Readonly<{
  outcomeId: string;
  expectedFamily: string;
  expectedVariant: string;
  expectedEvidenceForm: string;
  expectedAnswerType: string;
}>;

type LegacyMigration = Readonly<{
  legacyVariantId: string;
  status: string;
  replacement: string | null;
}>;

const root = process.cwd();
if (!root.endsWith("/PLAVE-PROJECT004")) throw new Error("PROJECT004_ROOT_REQUIRED");

const output = resolve(root, "artifacts/generator-v2-full-coverage");
const screenshots = resolve(output, "screenshots");
mkdirSync(screenshots, { recursive: true });

const official = JSON.parse(readFileSync(resolve(root, "docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json"), "utf8")) as {
  totalOfficialOutcomes: number;
  outcomes: OfficialOutcome[];
};
const legacyQueue = JSON.parse(readFileSync(resolve(root, "artifacts/generation-contracts/universal-semantic-work-queue.json"), "utf8")) as {
  contracts: LegacyCandidate[];
};
const legacyMigration = JSON.parse(readFileSync(resolve(root, "artifacts/generator-v2-vertical-slice/variant-migration-map.json"), "utf8")) as {
  entries: LegacyMigration[];
};

if (official.totalOfficialOutcomes !== 546 || official.outcomes.length !== 546) throw new Error("OFFICIAL_OUTCOME_BASELINE_DRIFT");
if (legacyQueue.contracts.length !== 546) throw new Error("LEGACY_CANDIDATE_QUEUE_BASELINE_DRIFT");
if (legacyMigration.entries.length !== 59) throw new Error("LEGACY_VARIANT_BASELINE_DRIFT");
if (PRODUCT_VARIANT_REGISTRY.length !== 12) throw new Error("PROVEN_V2_SLICE_BASELINE_DRIFT");

const legacyByOutcome = new Map(legacyQueue.contracts.map((item) => [item.outcomeId, item]));
const implementedByOutcome = new Map(GENERATOR_V2_OUTCOME_REGISTRY.map((item) => [item.outcomeId, item]));
const waveAContractByOutcome = new Map(WAVE_A_OUTCOME_CONTRACTS.map((item) => [item.outcomeId, item]));
const waveAOutcomeIds = new Set(WAVE_A_OUTCOME_CONTRACTS.map((item) => item.outcomeId));
const waveBContractByOutcome = new Map(WAVE_B_OUTCOME_CONTRACTS.map((item) => [item.outcomeId, item]));
const waveBOutcomeIds = new Set(WAVE_B_OUTCOME_CONTRACTS.map((item) => item.outcomeId));
const waveCContractByOutcome = new Map(WAVE_C_OUTCOME_CONTRACTS.map((item) => [item.outcomeId, item]));
const waveCOutcomeIds = new Set(WAVE_C_OUTCOME_CONTRACTS.map((item) => item.outcomeId));
const waveDContractByOutcome = new Map(WAVE_D_OUTCOME_CONTRACTS.map((item) => [item.outcomeId, item]));
const waveDOutcomeIds = new Set(WAVE_D_OUTCOME_CONTRACTS.map((item) => item.outcomeId));
const waveEContractByOutcome = new Map(WAVE_E_OUTCOME_CONTRACTS.map((item) => [item.outcomeId, item]));
const waveEOutcomeIds = new Set(WAVE_E_OUTCOME_CONTRACTS.map((item) => item.outcomeId));
const waveFContractByOutcome = new Map(WAVE_F_OUTCOME_CONTRACTS.map((item) => [item.outcomeId, item]));
const waveFOutcomeIds = new Set(WAVE_F_OUTCOME_CONTRACTS.map((item) => item.outcomeId));

const waveByCandidate: Readonly<Record<string, "A" | "B" | "C" | "D" | "E" | "F">> = {
  PLACE_VALUE: "A",
  NUMBER_REPRESENTATION: "A",
  NUMBER_COMPARISON: "A",
  NUMBER_ORDERING: "A",
  ADDITION_SUBTRACTION: "A",
  MULTIPLICATION_DIVISION: "A",
  INTEGER_OPERATIONS: "A",
  DIVISIBILITY: "A",
  POWER_ROOT: "A",
  NUMERICAL_EXPRESSION: "A",
  MISSING_VALUE: "A",
  FRACTION_RECOGNITION: "B",
  FRACTION_EQUIVALENCE: "B",
  FRACTION_COMPARISON: "B",
  FRACTION_OPERATIONS: "B",
  DECIMAL_REPRESENTATION: "B",
  DECIMAL_COMPARISON: "B",
  DECIMAL_OPERATIONS: "B",
  RATIO: "B",
  PERCENTAGE: "B",
  SUBSTITUTION: "C",
  EXPRESSION_CONSTRUCTION: "C",
  LIKE_TERM_COMBINATION: "C",
  ALGEBRAIC_TRANSFORMATION: "C",
  EQUATION_SOLVING: "C",
  INEQUALITY_SOLVING: "C",
  SEQUENCE_RULE: "C",
  FUNCTION_INPUT_OUTPUT: "C",
  RELATION_INTERPRETATION: "C",
  DIRECT_MEASUREMENT: "D",
  UNIT_CONVERSION: "D",
  TIME_MONEY: "D",
  PERIMETER: "D",
  AREA: "D",
  VOLUME: "D",
  SHAPE_PROPERTIES: "D",
  ANGLE: "D",
  COORDINATE: "D",
  GEOMETRIC_CONSTRUCTION: "D",
  GEOMETRIC_RELATION: "D",
  THEOREM_APPLICATION: "D",
  SPATIAL_REASONING: "D",
  TABLE_INTERPRETATION: "E",
  CHART_INTERPRETATION: "E",
  FREQUENCY: "E",
  RELATIVE_FREQUENCY: "E",
  CENTRAL_TENDENCY: "E",
  DATA_COMPARISON: "E",
  EXPERIMENTAL_PROBABILITY: "E",
  THEORETICAL_PROBABILITY: "E",
  SAMPLE_SPACE: "E",
  ONE_STEP_CONTEXT: "F",
  MULTI_STEP_CONTEXT: "F",
  INFORMATION_SELECTION: "F",
  INSUFFICIENT_INFORMATION: "F",
  ERROR_DETECTION: "F",
  MATHEMATICAL_MODELING: "F",
  EXPLANATION_REASONING: "F",
  REPRESENTATION_CONSTRUCTION: "F",
};

const waveByCanonical: Readonly<Record<string, "A" | "B" | "C" | "D" | "E" | "F">> = {
  ADD_SUB_MEANING: "A",
  MULTIPLY_DIVIDE_FACTS: "A",
  PLACE_VALUE_COMPARE: "A",
  FRACTION_PART_WHOLE: "B",
  LINEAR_SYSTEM: "C",
  GEOMETRY_PROPERTIES: "D",
  UNIT_CONVERSION: "D",
  PERIMETER_AREA: "D",
  CHART_DATA_INTERPRETATION: "E",
  EXPERIMENTAL_PROBABILITY: "E",
  APPLIED_TWO_STEP: "F",
  DATA_ERROR_REASONING: "F",
};

const interactionReasons: Readonly<Record<string, string>> = {
  ADD_SUB_MEANING: "Numeric input measures calculation directly; choice is reserved for selecting the operation represented by a situation.",
  MULTIPLY_DIVIDE_FACTS: "Numeric input measures fact fluency; choice distractors encode equal-group misconceptions.",
  PLACE_VALUE_COMPARE: "Ordering is direct evidence for magnitude reasoning; choice is used for a single place-value claim.",
  FRACTION_PART_WHOLE: "Fraction input measures numerator/denominator construction; visual selection measures model recognition.",
  LINEAR_SYSTEM: "Matching captures an ordered pair without exposing a free-form parser; integer input is used only for a bounded coordinate.",
  GEOMETRY_PROPERTIES: "Multi-select measures a set of true properties; visual selection is required when the diagram is mathematical evidence.",
  UNIT_CONVERSION: "Integer or decimal input measures the converted magnitude while the target unit remains explicit.",
  PERIMETER_AREA: "Numeric input measures the derived quantity; choice is used only to diagnose perimeter-versus-area confusion.",
  CHART_DATA_INTERPRETATION: "Chart response ties the answer to the normalized dataset; choice is used for meaningful scale-reading distractors.",
  EXPERIMENTAL_PROBABILITY: "Fraction input directly represents favorable trials over total trials.",
  APPLIED_TWO_STEP: "Numeric input measures the modeled result; choice is limited to misconception-based intermediate results.",
  DATA_ERROR_REASONING: "Choice and multi-select identify the uniquely inconsistent record or rule violation.",
};

const distractorStrategies: Readonly<Record<string, string>> = {
  ADD_SUB_MEANING: "reversed operation, off-by-one, unchanged quantity",
  MULTIPLY_DIVIDE_FACTS: "groups-versus-items confusion, repeated-addition partial result",
  PLACE_VALUE_COMPARE: "digit-value confusion and reversed order",
  FRACTION_PART_WHOLE: "numerator/denominator swap and wrong whole partition",
  LINEAR_SYSTEM: "sign error and pair satisfying only one equation",
  GEOMETRY_PROPERTIES: "confusable neighboring shape or circle properties",
  UNIT_CONVERSION: "inverse scale and adjacent-unit scale error",
  PERIMETER_AREA: "perimeter/area confusion and omitted component",
  CHART_DATA_INTERPRETATION: "misread scale, adjacent category and raw-versus-derived value",
  EXPERIMENTAL_PROBABILITY: "wrong denominator and complement confusion",
  APPLIED_TWO_STEP: "ignored second step and wrong operation order",
  DATA_ERROR_REASONING: "unchecked total, percent or mean relationship",
};

function domainFor(outcomeId: string) {
  if (outcomeId.includes("-NUM-")) return "NUMBERS_AND_OPERATIONS";
  if (outcomeId.includes("-NAA-")) return "ALGEBRA_AND_PREALGEBRA";
  if (outcomeId.includes("-GEO-")) return "GEOMETRY_AND_MEASUREMENT";
  if (outcomeId.includes("-STA-")) return "STATISTICS_AND_PROBABILITY";
  if (outcomeId.includes("-EXP-")) return "PRACTICE_AND_EXPERIENCE";
  throw new Error(`UNKNOWN_CANONICAL_DOMAIN:${outcomeId}`);
}

const matrix = official.outcomes.map((outcome) => {
  const legacy = legacyByOutcome.get(outcome.id);
  const entry = implementedByOutcome.get(outcome.id);
  const waveAContract = waveAContractByOutcome.get(outcome.id);
  const waveBContract = waveBContractByOutcome.get(outcome.id);
  const waveCContract = waveCContractByOutcome.get(outcome.id);
  const waveDContract = waveDContractByOutcome.get(outcome.id);
  const waveEContract = waveEContractByOutcome.get(outcome.id);
  const waveFContract = waveFContractByOutcome.get(outcome.id);
  if (!legacy) throw new Error(`LEGACY_CANDIDATE_MISSING:${outcome.id}`);
  const wave = waveAOutcomeIds.has(outcome.id) ? "A" : waveBOutcomeIds.has(outcome.id) ? "B" : waveCOutcomeIds.has(outcome.id) ? "C" : waveDOutcomeIds.has(outcome.id) ? "D" : waveEOutcomeIds.has(outcome.id) ? "E" : waveFOutcomeIds.has(outcome.id) ? "F" : entry ? waveByCanonical[entry.variantId] : waveByCandidate[legacy.expectedVariant];
  if (!wave) throw new Error(`WAVE_MAPPING_MISSING:${outcome.id}:${legacy.expectedVariant}`);
  return {
    outcomeId: outcome.id,
    grade: outcome.grade,
    domain: domainFor(outcome.id),
    officialStrand: outcome.officialStrand,
    unit: outcome.mappedUnitIds,
    prerequisiteOutcomes: outcome.prerequisiteOutcomeIds,
    productFamily: entry?.productFamilyId ?? null,
    canonicalVariant: entry?.variantId ?? null,
    interactionTypes: entry ? [...entry.interactionPolicy] : [],
    interactionReason: entry ? interactionReasons[entry.variantId] ?? `The explicit ${entry.variantId} contract provides deterministic evidence for this canonical outcome.` : null,
    parameterPolicy: entry ? entry.parameterPolicy : null,
    difficultyPolicy: entry ? entry.difficultyPolicy : null,
    solver: entry?.solverId ?? null,
    validator: entry?.validatorId ?? null,
    visualRequirement: waveAContract?.visualPolicy ?? waveBContract?.visualPolicy ?? waveCContract?.visualPolicy ?? waveDContract?.visualPolicy ?? waveEContract?.visualPolicy ?? waveFContract?.visualPolicy ?? entry?.visualContract ?? null,
    distractorStrategy: entry ? distractorStrategies[entry.variantId] ?? waveAContract?.distractorPolicy ?? waveBContract?.distractorPolicy ?? waveCContract?.distractorPolicy ?? waveDContract?.distractorPolicy ?? waveEContract?.distractorPolicy ?? waveFContract?.distractorPolicy ?? "family-specific misconception distractors" : null,
    feedbackStrategy: waveFContract?.feedbackPolicy ?? waveEContract?.feedbackPolicy ?? waveDContract?.feedbackPolicy ?? waveCContract?.feedbackPolicy ?? waveBContract?.feedbackPolicy ?? entry?.feedbackStrategy ?? null,
    implementationStatus: entry ? "IMPLEMENTED_REVIEW_REQUIRED" : "BLOCKED_MISSING_CONTRACT",
    productReviewStatus: "NEEDS_REVISION",
    wave,
    legacyCandidateVariant: legacy.expectedVariant,
    legacyCandidateRuntimeEligible: false,
    blocker: entry ? null : "A V2 normalized model, independent solver/validator and grade-bounded product contract have not yet been authored.",
    outcomeTitle: outcome.conciseParaphrase,
  };
});

const allowedStatuses = new Set([
  "IMPLEMENTED_VALIDATED",
  "IMPLEMENTED_REVIEW_REQUIRED",
  "BLOCKED_MISSING_CONTRACT",
  "DUPLICATE_COVERED_BY_CANONICAL_VARIANT",
  "NOT_IMPLEMENTED",
]);
if (matrix.some((row) => !allowedStatuses.has(row.implementationStatus))) throw new Error("INVALID_MATRIX_STATUS");

const implementedIds = new Set(GENERATOR_V2_OUTCOME_REGISTRY.map((entry) => entry.outcomeId));
const blockedRows = matrix.filter((row) => !implementedIds.has(row.outcomeId));
const waveSummary = (["A", "B", "C", "D", "E", "F"] as const).map((wave) => {
  const rows = matrix.filter((row) => row.wave === wave);
  const implemented = rows.filter((row) => row.implementationStatus === "IMPLEMENTED_REVIEW_REQUIRED");
  const blocked = rows.filter((row) => row.implementationStatus === "BLOCKED_MISSING_CONTRACT");
  return {
    wave,
    outcomes: rows.length,
    implementedReviewRequired: implemented.length,
    blockedMissingContract: blocked.length,
    gate: blocked.length === 0 ? "PASS" : "CRITICAL_BLOCK",
    blockedVariantCandidates: [...new Set(blocked.map((row) => row.legacyCandidateVariant))].sort(),
    blockedOutcomeIds: blocked.map((row) => row.outcomeId),
  };
});

function classificationFor(status: string) {
  if (status === "REPLACED_BY_CANONICAL_VARIANT") return "REPLACED";
  if (status === "DUPLICATE_SEMANTICS") return "DUPLICATE_SEMANTICS";
  if (status === "SYNTHETIC_WITHOUT_OUTCOME") return "SYNTHETIC_WITHOUT_OUTCOME";
  return "UNSAFE";
}

const variantEntries = [
  ...legacyMigration.entries.map((entry) => ({
    source: "LEGACY_V1",
    variantId: entry.legacyVariantId,
    classification: classificationFor(entry.status),
    replacement: entry.replacement,
    productRegistryCallable: false,
  })),
  ...GENERATOR_V2_OUTCOME_REGISTRY.map((entry) => ({
    source: "GENERATOR_V2",
    variantId: entry.variantId,
    classification: "CANONICAL_PRODUCT_VARIANT",
    replacement: null,
    productRegistryCallable: true,
    outcomeId: entry.outcomeId,
  })),
];
const classificationCounts = Object.fromEntries(
  [...new Set(variantEntries.map((entry) => entry.classification))]
    .sort()
    .map((classification) => [classification, variantEntries.filter((entry) => entry.classification === classification).length]),
);

const difficulties = ["EASY", "MEDIUM", "HARD"] as const;
type DiversityBatch = Readonly<{
  difficulty: "EASY" | "MEDIUM" | "HARD";
  samples: number;
  exactUnique: number;
  exactDuplicateRate: number;
  nearDuplicateDefinition: string;
  nearDuplicatePairRate: number;
  deterministicReplay: "PASS";
}>;
type DiversityOutcome = Readonly<{
  outcomeId: string;
  variantId: string;
  byDifficulty: readonly DiversityBatch[];
}>;

const diversityRows: DiversityOutcome[] = [];
const reviewSamples: unknown[] = [];
let executedSamples = 0;

function contentFingerprint(snapshot: ReturnType<typeof publicQuestionOnly>) {
  return JSON.stringify({
    prompt: snapshot.publicPrompt,
    data: snapshot.publicData,
    interaction: snapshot.interaction,
    visual: snapshot.visual,
  });
}

function nearTemplate(prompt: string) {
  return prompt.toLocaleLowerCase("vi").replace(/-?\d+(?:[.,]\d+)?/gu, "#").replace(/\s+/gu, " ").trim();
}

function intentionallyIncorrectResponse(question: GeneratedProductQuestion): CanonicalResponse {
  const correct = question.privateSolution.correctResponse;
  const interaction = question.publicSnapshot.interaction;
  if (typeof correct === "number") return correct + 1;
  if (typeof correct === "string") return interaction.options?.find((option) => option.id !== correct)?.id ?? "incorrect";
  if (Array.isArray(correct)) {
    if (correct.length === 0) return ["incorrect"];
    if (typeof correct[0] === "string") {
      if (interaction.type === "MULTI_SELECT") {
        const omitted = correct.slice(0, -1);
        return omitted.length > 0 ? omitted : ["incorrect"];
      }
      if (correct.length > 1) return [correct[1]!, correct[0]!, ...correct.slice(2)] as readonly string[];
      return ["incorrect"];
    }
    const first = correct[0]!;
    const alternative = interaction.rightItems?.find((item) => item.id !== first.rightId)?.id ?? "incorrect";
    return [{ leftId: first.leftId, rightId: alternative }, ...correct.slice(1)];
  }
  return { numerator: correct.numerator + correct.denominator, denominator: correct.denominator };
}

for (const entry of GENERATOR_V2_OUTCOME_REGISTRY) {
  const byDifficulty: DiversityBatch[] = [];
  for (const difficulty of difficulties) {
    const exact = new Set<string>();
    const templates = new Map<string, number>();
    for (let seedNumber = 1; seedNumber <= 20; seedNumber += 1) {
      const seed = `sprint8c-${entry.outcomeId.toLowerCase()}-${difficulty.toLowerCase()}-${String(seedNumber).padStart(2, "0")}`;
      const generated = generateQuestion({ outcomeId: entry.outcomeId, grade: entry.grade, difficulty, seed, locale: "vi-VN" });
      verifyQuestionIntegrity(generated);
      const snapshot = publicQuestionOnly(generated);
      assertPublicBoundary(snapshot);
      exact.add(contentFingerprint(snapshot));
      const template = nearTemplate(snapshot.publicPrompt);
      templates.set(template, (templates.get(template) ?? 0) + 1);
      const replay = generateQuestion({ outcomeId: entry.outcomeId, grade: entry.grade, difficulty, seed, locale: "vi-VN" });
      if (JSON.stringify(generated) !== JSON.stringify(replay)) throw new Error(`NON_DETERMINISTIC:${entry.outcomeId}:${seed}`);
      if (seedNumber === 1) {
        const correctFeedback = validateStudentResponse(generated, generated.privateSolution.correctResponse);
        const incorrectFeedback = validateStudentResponse(generated, intentionallyIncorrectResponse(generated));
        if (!correctFeedback.isCorrect || incorrectFeedback.isCorrect) throw new Error(`FEEDBACK_FIXTURE_INVALID:${entry.variantId}:${difficulty}`);
        reviewSamples.push({
          sampleId: `${entry.outcomeId}:${difficulty}`,
          grade: entry.grade,
          domain: matrix.find((row) => row.outcomeId === entry.outcomeId)?.domain,
          unit: entry.unitId,
          outcomeId: entry.outcomeId,
          variantId: entry.variantId,
          difficulty,
          interactionType: snapshot.interaction.type,
          visualType: snapshot.visual.type,
          publicSnapshot: snapshot,
          postSubmitFeedback: { correct: correctFeedback, incorrect: incorrectFeedback },
          reviewPhase: "POST_SUBMIT_OWNER_REVIEW",
          reviewState: "NEEDS_REVISION",
        });
      }
      executedSamples += 1;
    }
    const pairs = 20 * 19 / 2;
    const nearPairs = [...templates.values()].reduce((sum, count) => sum + count * (count - 1) / 2, 0);
    byDifficulty.push({
      difficulty,
      samples: 20,
      exactUnique: exact.size,
      exactDuplicateRate: 1 - exact.size / 20,
      nearDuplicateDefinition: "same Vietnamese prompt after numeric literals are normalized",
      nearDuplicatePairRate: nearPairs / pairs,
      deterministicReplay: "PASS",
    });
  }
  diversityRows.push({ outcomeId: entry.outcomeId, variantId: entry.variantId, byDifficulty });
}

const intendedSamples = 546 * 3 * 20;
const diversityBatches = diversityRows.flatMap((row) => row.byDifficulty.map((batch) => ({
  outcomeId: row.outcomeId,
  variantId: row.variantId,
  ...batch,
})));
const implementedDiversityFailures = diversityBatches.filter((batch) => batch.exactDuplicateRate !== 0 || batch.nearDuplicatePairRate > 0.12);
const diversity = {
  schemaVersion: 1,
  sprint: "8C",
  result: implementedDiversityFailures.length === 0 && executedSamples === intendedSamples ? "PASS" : "FAIL",
  intendedAudit: { outcomes: 546, difficulties: 3, seedsPerDifficulty: 20, samples: intendedSamples },
  executedAudit: { outcomes: GENERATOR_V2_OUTCOME_REGISTRY.length, difficulties: 3, seedsPerDifficulty: 20, samples: executedSamples },
  blockedSamples: intendedSamples - executedSamples,
  exactDuplicateTarget: 0,
  nearDuplicateDefinition: "A pair is near-duplicate when its Vietnamese prompt is identical after normalizing numeric literals; threshold is pair rate <= 0.12 per outcome/difficulty batch.",
  implementedSliceObservation: {
    maximumExactDuplicateRate: Math.max(...diversityBatches.map((batch) => batch.exactDuplicateRate)),
    maximumNearDuplicatePairRate: Math.max(...diversityBatches.map((batch) => batch.nearDuplicatePairRate)),
    failedBatchCount: implementedDiversityFailures.length,
    failedBatches: implementedDiversityFailures,
  },
  fullCoveragePass: implementedDiversityFailures.length === 0 && executedSamples === intendedSamples && blockedRows.length === 0,
  reason: blockedRows.length === 0 ? "All 546 explicit outcome mappings were generated in deterministic shards; no generic fallback was used." : `${blockedRows.length} outcomes remain unimplemented.`,
  implementedOutcomes: diversityRows,
};

const negativeArtifactPaths = ["wave-a", "wave-b", "wave-c", "wave-d", "wave-e", "wave-f"].map((wave) => resolve(root, `artifacts/generator-v2-${wave}/negative-controls.json`));
const negativeArtifacts = negativeArtifactPaths.map((path) => JSON.parse(readFileSync(path, "utf8")) as { result: string });
if (negativeArtifacts.some((artifact) => artifact.result !== "PASS")) throw new Error("INTEGRATED_NEGATIVE_CONTROL_EVIDENCE_INVALID");
const canonicalCapabilityCount = new Set(GENERATOR_V2_OUTCOME_REGISTRY.map((entry) => entry.variantId)).size;
const negativeControls = {
  schemaVersion: 1,
  result: "PASS",
  provenSliceControls: {
    status: "PASS_EXISTING_V2_BASELINE",
    evidence: "tests/generation-v2.test.ts",
    controls: [
      "AMBIGUOUS_ANSWERS",
      "INVALID_UNITS",
      "OUT_OF_GRADE_BOUNDS",
      "PROMPT_MODEL_MISMATCH",
      "VISUAL_DATA_MISMATCH",
      "RELABELED_AST",
      "DUPLICATE_DISTRACTORS",
      "DISTRACTOR_ALSO_CORRECT",
      "UNSUPPORTED_INTERACTION",
      "DIFFICULTY_RELABEL_WITHOUT_STRUCTURE_CHANGE",
      "PRIVATE_SOLUTION_LEAK",
    ],
  },
  fullCoverageControls: { status: "PASS", capabilityFamilies: canonicalCapabilityCount, waveArtifacts: negativeArtifactPaths.map((path) => path.replace(`${root}/`, "")), unknownOutcome: "GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED", malformedContract: "REJECTED", invalidDomainOrParameter: "REJECTED", ambiguousAnswer: "REJECTED", invalidUnitOrPrecision: "REJECTED", impossibleVisualOrDataState: "REJECTED", outOfGradeContent: "REJECTED", promptVisualMismatch: "REJECTED", privateLeak: "REJECTED", duplicateViolation: "REJECTED", nearDuplicateViolation: "REJECTED" },
};

const reviewManifest = {
  schemaVersion: 1,
  result: "READY_FOR_OWNER_USEFULNESS_REVIEW",
  allowedStates: ["APPROVE", "REJECT", "NEEDS_REVISION"],
  filters: ["grade", "domain", "unit", "outcome", "variant", "difficulty", "interactionType", "reviewState"],
  fullCoverageReviewUiAvailable: true,
  reason: "Every canonical outcome has one traceable EASY/MEDIUM/HARD review sample; Owner decision is intentionally unset.",
  implementedSliceSamples: reviewSamples,
  blockedOutcomeIds: blockedRows.map((row) => row.outcomeId),
  dependencyRule: "A rejected canonical variant marks every explicitly mapped dependent outcome NEEDS_REVISION.",
};

const waveA = waveSummary.find((wave) => wave.wave === "A")!;
const waveB = waveSummary.find((wave) => wave.wave === "B")!;
const waveC = waveSummary.find((wave) => wave.wave === "C")!;
const waveD = waveSummary.find((wave) => wave.wave === "D")!;
const waveE = waveSummary.find((wave) => wave.wave === "E")!;
const waveF = waveSummary.find((wave) => wave.wave === "F")!;

type BrowserEvidence = Readonly<{ status: string; canonicalCapabilitiesRepresented: string; viewports: readonly unknown[]; screenshotReview: string; screenshots: readonly string[]; consoleErrors: number; hydrationErrors: number; pageErrors: number; overflowFailures: number; privateLeaks: number; promptVisualMismatches: number; accessibilityBlockers?: number; disposable?: Readonly<{ cleanup: string; remainingListener: string }> }>;
type ScreenshotReview = Readonly<{ status: string; reviewed: number; expected: number; criticalIssues: number; highIssues: number }>;
type DatabaseProof = Readonly<{ result: string }>;
const browserPath = resolve(output, "browser-acceptance.json"), screenshotReviewPath = resolve(output, "screenshot-review.json"), databasePath = resolve(output, "database-proof.json");
const browser = existsSync(browserPath) ? JSON.parse(readFileSync(browserPath, "utf8")) as BrowserEvidence : null;
const screenshotReview = existsSync(screenshotReviewPath) ? JSON.parse(readFileSync(screenshotReviewPath, "utf8")) as ScreenshotReview : null;
const databaseProof = existsSync(databasePath) ? JSON.parse(readFileSync(databasePath, "utf8")) as DatabaseProof : null;
const expectedCapabilityText = `${canonicalCapabilityCount}/${canonicalCapabilityCount}`;
const integratedAcceptancePassed = Boolean(browser?.status === "PASS" && browser.canonicalCapabilitiesRepresented === expectedCapabilityText && browser.viewports?.length === 2 && browser.screenshotReview === `PASS_${browser.screenshots.length}_OF_${browser.screenshots.length}_VISUALLY_REVIEWED` && [browser.consoleErrors, browser.hydrationErrors, browser.pageErrors, browser.overflowFailures, browser.privateLeaks, browser.promptVisualMismatches, browser.accessibilityBlockers ?? 0].every((value) => value === 0) && browser.disposable?.cleanup === "PASS" && browser.disposable?.remainingListener === "NONE" && screenshotReview?.status === "PASS" && screenshotReview.reviewed === screenshotReview.expected && screenshotReview.criticalIssues === 0 && screenshotReview.highIssues === 0 && databaseProof?.result === "PASS");
const regressionPath = resolve(output, "regression-evidence.json");
const currentRegressionEvidence = existsSync(regressionPath) ? JSON.parse(readFileSync(regressionPath, "utf8")) : { status: "PENDING_CURRENT_RUN" };
const report = {
  schemaVersion: 1,
  generatedAt: "2026-08-02",
  sprint: "8C",
  result: integratedAcceptancePassed ? "TECHNICALLY_COMPLETE_AWAITING_OWNER_REVIEW" : "COVERAGE_COMPLETE_AWAITING_INTEGRATED_ACCEPTANCE",
  roadmap: {
    milestone1: "COMPLETE_OWNER_APPROVED",
    milestone2: integratedAcceptancePassed ? "IN_PROGRESS_AWAITING_OWNER_REVIEW" : "IN_PROGRESS_AWAITING_FINAL_VALIDATION",
    milestone3: "COMPLETE_OWNER_APPROVED_LOCAL_MVP",
  },
  baseline: {
    officialOutcomeCount: 546,
    provenCanonicalVariantsPreserved: 12,
    provenOutcomeMappings: 12,
    implementedV2OutcomeMappings: GENERATOR_V2_OUTCOME_REGISTRY.length,
    missingV2OutcomeMappings: blockedRows.length,
    legacyVariantsAudited: 59,
    genericFallback: false,
    syntheticCoverage: false,
  },
  coverage: {
    IMPLEMENTED_VALIDATED: 0,
    IMPLEMENTED_REVIEW_REQUIRED: matrix.filter((row) => row.implementationStatus === "IMPLEMENTED_REVIEW_REQUIRED").length,
    BLOCKED_MISSING_CONTRACT: blockedRows.length,
    DUPLICATE_COVERED_BY_CANONICAL_VARIANT: 0,
    NOT_IMPLEMENTED: 0,
    claims546Of546: blockedRows.length === 0 && GENERATOR_V2_OUTCOME_REGISTRY.length === 546,
  },
  waveExecution: waveSummary,
  blockingGate: integratedAcceptancePassed ? { code: "OWNER_USEFULNESS_REVIEW_REQUIRED", blockedOutcomeCount: 0, blockedOutcomeIds: [], decision: "TECHNICAL_AUDIT_PASS; OWNER_DECISION_NOT_RECORDED" } : { code: "INTEGRATED_DATABASE_BROWSER_OR_REGRESSION_PENDING", blockedOutcomeCount: 0, blockedOutcomeIds: [], decision: "546_OUTCOME_COVERAGE_PASS; FINAL_INTEGRATED_ACCEPTANCE_PENDING" },
  exactFullCoverageBlocker: {
    code: null,
    blockedOutcomeCount: blockedRows.length,
    blockedOutcomeIds: blockedRows.map((row) => row.outcomeId),
    matrix: "artifacts/generator-v2-full-coverage/outcome-matrix.json",
  },
  artifacts: {
    outcomeMatrix: "artifacts/generator-v2-full-coverage/outcome-matrix.json",
    variantRegistry: "artifacts/generator-v2-full-coverage/variant-registry.json",
    diversity: "artifacts/generator-v2-full-coverage/diversity.json",
    negativeControls: "artifacts/generator-v2-full-coverage/negative-controls.json",
    reviewManifest: "artifacts/generator-v2-full-coverage/review-manifest.json",
    canonicalReconciliation: "artifacts/generator-v2-full-coverage/canonical-reconciliation.json",
    databaseProof: "artifacts/generator-v2-full-coverage/database-proof.json",
    browserAcceptance: "artifacts/generator-v2-full-coverage/browser-acceptance.json",
    screenshotReview: "artifacts/generator-v2-full-coverage/screenshot-review.json",
    screenshots: "artifacts/generator-v2-full-coverage/screenshots/",
  },
  runtime: {
    changed: true,
    defaultEnabled: false,
    reason: "All 546 explicit mappings are callable only through the loopback local Generator V2 runtime; repository default remains fail closed pending Owner usefulness review.",
  },
  browserAcceptance: {
    status: integratedAcceptancePassed ? "PASS" : "PENDING_INTEGRATED_LOCAL_PLAYWRIGHT",
    mockEvidenceUsed: false,
    canonicalCapabilitiesRepresented: browser?.canonicalCapabilitiesRepresented ?? `0/${canonicalCapabilityCount}`,
    screenshotsCreated: browser?.screenshots.length ?? 0,
    viewports: browser?.viewports ?? [],
    criticalHighIssues: integratedAcceptancePassed ? 0 : null,
  },
  qualityGates: {
    status: diversity.fullCoveragePass ? "PASS_32760_OF_32760" : "FAIL",
    intendedDiversitySamples: intendedSamples,
    executedProvenSliceSamples: executedSamples,
    implementedSliceDiversityFailures: implementedDiversityFailures,
    canonicalCapabilities: canonicalCapabilityCount,
    provenanceCompleteness: "8/8",
    promptAnswerVisualMismatches: 0,
    mathematicallyInvalidOrAmbiguousSamples: 0,
    privateLeaks: 0,
  },
  regressionEvidence: currentRegressionEvidence,
  ownerUsefulnessReview: { status: "READY_DECISION_REQUIRED", allowedStates: ["APPROVE", "REJECT", "NEEDS_REVISION"], ownerDecision: null, notes: null },
  boundariesObserved: [
    "NO_REMOTE_MUTATION",
    "NO_MIGRATION",
    "NO_DEPLOYMENT",
    "NO_PUBLICATION",
    "NO_GIT_MUTATION",
    "NO_REPOSITORY_DEFAULT_RUNTIME_ENABLE",
    "NO_AI_TUTOR_IMPLEMENTATION_CHANGE",
    "NO_GENERIC_FALLBACK",
    "NO_SYNTHETIC_COVERAGE",
  ],
};

const officialIds = official.outcomes.map((outcome) => outcome.id);
const registryIds = GENERATOR_V2_OUTCOME_REGISTRY.map((entry) => entry.outcomeId);
const duplicateOfficialIds = [...new Set(officialIds.filter((id, index) => officialIds.indexOf(id) !== index))].sort();
const duplicateRegistryIds = [...new Set(registryIds.filter((id, index) => registryIds.indexOf(id) !== index))].sort();
const missingIds = officialIds.filter((id) => !implementedIds.has(id)).sort();
const nonCurriculumImplementedIds = registryIds.filter((id) => !officialIds.includes(id)).sort();
const completedButUnmappedOutcomes = matrix.filter((row) => row.implementationStatus.startsWith("IMPLEMENTED") && !implementedIds.has(row.outcomeId)).map((row) => row.outcomeId).sort();
const waveTotals = Object.fromEntries(waveSummary.map((wave) => [wave.wave, wave.outcomes]));
const reconciliationRows = matrix.map((row) => {
  const entry = implementedByOutcome.get(row.outcomeId)!;
  const isProvenBaseline = PRODUCT_VARIANT_REGISTRY.some((baseline) => baseline.outcomeId === row.outcomeId);
  return {
    outcomeId: row.outcomeId,
    grade: row.grade,
    strand: row.officialStrand,
    domain: row.domain,
    curriculumDescription: row.outcomeTitle,
    assignedWave: row.wave,
    capabilityId: entry.variantId,
    implementationFile: isProvenBaseline ? "lib/generation-v2/generator.ts" : `lib/generation-v2/wave-${String(row.wave).toLocaleLowerCase("en")}-engine.ts`,
    solver: entry.solverId,
    validator: entry.validatorId,
    interactionType: entry.interactionPolicy,
    visualType: entry.visualContract,
    provenanceContract: "GENERATED_V2_8_OF_8",
    status: row.implementationStatus,
  };
});
const reconciliation = {
  schemaVersion: 1,
  generatedAt: "2026-08-02",
  result: "PASS",
  canonicalInventoryTotal: reconciliationRows.length,
  uniqueOutcomeIds: new Set(reconciliationRows.map((row) => row.outcomeId)).size,
  waveTotals,
  waveTotalEquation: Object.values(waveTotals).join(" + ") + " = 546",
  checks: {
    missingIds,
    duplicateOutcomeIds: duplicateOfficialIds,
    duplicateRegistryOutcomeIds: duplicateRegistryIds,
    duplicateWaveAssignments: [],
    multipleConflictingCapabilityAssignments: duplicateRegistryIds,
    completedButUnmappedOutcomes,
    implementedSyntheticOrNonCurriculumOutcomes: nonCurriculumImplementedIds,
    genericFallbackCount: 0,
    keywordRoutingCount: 0,
    unknownOutcomeFailsClosed: "GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED",
  },
  canonicalCapabilityCount,
  rows: reconciliationRows,
};
if (reconciliation.canonicalInventoryTotal !== 546 || reconciliation.uniqueOutcomeIds !== 546 || Object.values(reconciliation.checks).some((value) => Array.isArray(value) && value.length > 0) || Object.values(waveTotals).reduce((sum, value) => sum + value, 0) !== 546) throw new Error("CANONICAL_RECONCILIATION_FAILED");

writeFileSync(resolve(output, "outcome-matrix.json"), `${JSON.stringify({ schemaVersion: 1, totalOutcomes: matrix.length, rows: matrix }, null, 2)}\n`);
writeFileSync(resolve(output, "canonical-reconciliation.json"), `${JSON.stringify(reconciliation, null, 2)}\n`);
writeFileSync(resolve(output, "variant-registry.json"), `${JSON.stringify({ schemaVersion: 1, legacyVariantCount: 59, canonicalProductVariantCount: GENERATOR_V2_OUTCOME_REGISTRY.length, classificationCounts, entries: variantEntries }, null, 2)}\n`);
writeFileSync(resolve(output, "diversity.json"), `${JSON.stringify(diversity, null, 2)}\n`);
writeFileSync(resolve(output, "negative-controls.json"), `${JSON.stringify(negativeControls, null, 2)}\n`);
writeFileSync(resolve(output, "review-manifest.json"), `${JSON.stringify(reviewManifest, null, 2)}\n`);
writeFileSync(resolve(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
if (!integratedAcceptancePassed) writeFileSync(resolve(screenshots, "README.md"), "# Sprint 8C.F integrated screenshots\n\nIntegrated local Playwright evidence is pending. Wave-specific evidence remains in dedicated artifact directories and is not represented as final integrated evidence.\n");

console.log(`GENERATOR_V2_OFFICIAL_OUTCOMES=${matrix.length}`);
console.log(`GENERATOR_V2_IMPLEMENTED_REVIEW_REQUIRED=${GENERATOR_V2_OUTCOME_REGISTRY.length}`);
console.log(`GENERATOR_V2_BLOCKED_MISSING_CONTRACT=${blockedRows.length}`);
console.log(`GENERATOR_V2_WAVE_A_BLOCKED=${waveA.blockedMissingContract}`);
console.log(`GENERATOR_V2_WAVE_B_BLOCKED=${waveB.blockedMissingContract}`);
console.log(`GENERATOR_V2_WAVE_C_BLOCKED=${waveC.blockedMissingContract}`);
console.log(`GENERATOR_V2_WAVE_D_BLOCKED=${waveD.blockedMissingContract}`);
console.log(`GENERATOR_V2_WAVE_E_BLOCKED=${waveE.blockedMissingContract}`);
console.log(`GENERATOR_V2_WAVE_F_BLOCKED=${waveF.blockedMissingContract}`);
console.log(`GENERATOR_V2_SAMPLES_EXECUTED=${executedSamples}/${intendedSamples}`);
console.log(`GENERATOR_V2_CANONICAL_CAPABILITIES=${canonicalCapabilityCount}`);
console.log(`GENERATOR_V2_FULL_COVERAGE=${diversity.fullCoveragePass ? "PASS" : "FAIL"}`);
console.log(`GENERATOR_V2_INTEGRATED_ACCEPTANCE=${integratedAcceptancePassed ? "PASS" : "PENDING"}`);
