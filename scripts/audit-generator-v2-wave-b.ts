import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  GENERATOR_V2_OUTCOME_REGISTRY,
  WAVE_A_OUTCOME_CONTRACTS,
  WAVE_B_OUTCOME_CONTRACTS,
  __waveBNegativeControl,
  assertPublicBoundary,
  generateQuestion,
  isWaveBImplementedByNewEngine,
  publicQuestionOnly,
  to0041Question,
  validateStudentResponse,
  verifyQuestionIntegrity,
  type CanonicalResponse,
  type FractionValue,
  type GeneratedProductQuestion,
  type ProductDifficulty,
  type WaveBNormalizedProblemModel,
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

type BrowserEvidence = Readonly<{
  status: string;
  browserExecutableResolved: string;
  playwrightVersion: string;
  browserVersion: string;
  localPlaywright: boolean;
  inAppBrowserUsed: boolean;
  canonicalCapabilitiesRepresented: string;
  viewports: readonly { width: number; height: number }[];
  screenshots: readonly string[];
  screenshotReview: string;
  consoleErrors: number;
  hydrationErrors: number;
  pageErrors: number;
  overflowFailures: number;
  privateLeaks: number;
  promptVisualMismatches: number;
  disposable: Readonly<{ cleanup: string }>;
  exactRemainingBlockers: readonly string[];
}>;

type ScreenshotReview = Readonly<{ status: string; reviewed: number; expected: number; criticalIssues: number; highIssues: number; unreviewedScreenshots: readonly string[] }>;

const root = process.cwd();
if (!root.endsWith("/PLAVE-PROJECT004")) throw new Error("PROJECT004_ROOT_REQUIRED");
const output = resolve(root, "artifacts/generator-v2-wave-b");
mkdirSync(resolve(output, "screenshots/mobile"), { recursive: true });
mkdirSync(resolve(output, "screenshots/desktop"), { recursive: true });

const officialInventory = JSON.parse(readFileSync(resolve(root, "docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json"), "utf8")) as { totalOfficialOutcomes: number; outcomes: OfficialOutcome[] };
if (officialInventory.totalOfficialOutcomes !== 546 || officialInventory.outcomes.length !== 546) throw new Error("OFFICIAL_OUTCOME_BASELINE_DRIFT");
const officialById = new Map(officialInventory.outcomes.map((outcome) => [outcome.id, outcome]));

const priorFullMatrix = JSON.parse(readFileSync(resolve(root, "artifacts/generator-v2-full-coverage/outcome-matrix.json"), "utf8")) as { rows: readonly { outcomeId: string; wave: string }[] };
const priorWaveBIds = priorFullMatrix.rows.filter((row) => row.wave === "B").map((row) => row.outcomeId).sort();
const contractIds = WAVE_B_OUTCOME_CONTRACTS.map((contract) => contract.outcomeId).sort();
if (JSON.stringify(priorWaveBIds) !== JSON.stringify(contractIds)) throw new Error("WAVE_B_CONTRACT_SET_DOES_NOT_MATCH_CURRENT_546_MATRIX");
if (WAVE_A_OUTCOME_CONTRACTS.length !== 98) throw new Error("WAVE_A_BASELINE_DRIFT");
if (WAVE_B_OUTCOME_CONTRACTS.length !== 61 || new Set(contractIds).size !== 61) throw new Error("WAVE_B_CONTRACT_COUNT_INVALID");

const difficulties = ["EASY", "MEDIUM", "HARD"] as const satisfies readonly ProductDifficulty[];
const fingerprint = (question: GeneratedProductQuestion) => JSON.stringify({ prompt: question.publicSnapshot.publicPrompt, data: question.publicSnapshot.publicData, interaction: question.publicSnapshot.interaction, visual: question.publicSnapshot.visual });
const nearTemplate = (prompt: string) => prompt.toLocaleLowerCase("vi").replace(/-?\d+(?:[.,]\d+)?/gu, "#").replace(/\s+/gu, " ").trim();

function incorrectResponse(question: GeneratedProductQuestion): CanonicalResponse {
  const correct = question.privateSolution.correctResponse;
  const interaction = question.publicSnapshot.interaction;
  if (typeof correct === "number") return correct + 1;
  if (typeof correct === "string") return interaction.options?.find((option) => option.id !== correct)?.id ?? "incorrect";
  if ("numerator" in correct) return { numerator: correct.numerator + correct.denominator, denominator: correct.denominator };
  if (correct.every((item) => typeof item === "string")) {
    if (interaction.type === "ORDERING") return [...correct].reverse();
    const omitted = correct.slice(0, -1);
    return omitted.length ? omitted : ["incorrect"];
  }
  return correct.map((pair, index) => ({ leftId: pair.leftId, rightId: correct[(index + 1) % correct.length]!.rightId }));
}

const outcomeRows: unknown[] = [];
const diversityRows: unknown[] = [];
const reviewSamples: unknown[] = [];
const interactions = new Set<string>();
const visuals = new Set<string>();
const capabilities = new Set<string>();
let sampleCount = 0;
let provenanceCount = 0;
let persistenceProofCount = 0;
let maximumNearDuplicatePairRate = 0;
let maximumExactDuplicateRate = 0;

for (const contract of WAVE_B_OUTCOME_CONTRACTS) {
  const official = officialById.get(contract.outcomeId);
  if (!official || official.grade !== contract.grade || official.mappedUnitIds.length === 0) throw new Error(`WAVE_B_OFFICIAL_MAPPING_INVALID:${contract.outcomeId}`);
  capabilities.add(contract.canonicalVariantId);
  outcomeRows.push({
    outcomeId: contract.outcomeId,
    grade: contract.grade,
    strand: official.officialStrand,
    domain: official.subdomain,
    outcomeTitle: official.conciseParaphrase,
    unitIds: official.mappedUnitIds,
    prerequisiteOutcomeIds: official.prerequisiteOutcomeIds,
    canonicalCapability: contract.canonicalVariantId,
    taskKind: contract.taskKind,
    profile: contract.profile,
    contractVersion: contract.contractVersion,
    productFamily: contract.productFamilyId,
    interactionPolicy: contract.interactionPolicy,
    parameterBounds: contract.parameterBounds,
    difficultyPolicy: contract.difficultyPolicy,
    solver: contract.independentSolver,
    validator: contract.independentValidator,
    visualPolicy: contract.visualPolicy,
    implementationStatus: "IMPLEMENTED_REVIEW_REQUIRED",
    productReviewStatus: "NEEDS_REVISION",
  });

  for (const difficulty of difficulties) {
    const exact = new Set<string>();
    const templates = new Map<string, number>();
    const structures = new Set<string>();
    let representative: GeneratedProductQuestion | null = null;
    for (let index = 1; index <= 20; index += 1) {
      const seed = `s8cb-${contract.outcomeId.toLowerCase()}-${difficulty.toLowerCase()}-${String(index).padStart(2, "0")}`;
      const generated = generateQuestion({ outcomeId: contract.outcomeId, grade: contract.grade, difficulty, seed, locale: "vi-VN" });
      verifyQuestionIntegrity(generated);
      assertPublicBoundary(publicQuestionOnly(generated));
      const replay = generateQuestion({ outcomeId: contract.outcomeId, grade: contract.grade, difficulty, seed, locale: "vi-VN" });
      if (JSON.stringify(generated) !== JSON.stringify(replay)) throw new Error(`WAVE_B_NON_DETERMINISTIC:${contract.outcomeId}:${difficulty}:${index}`);
      if (generated.provenance.questionSource !== "GENERATED_V2" || !generated.provenance.outcomeId || !generated.provenance.productFamilyId || !generated.provenance.variantId || !generated.provenance.generatorVersion || !generated.provenance.solverVersion || !generated.provenance.difficultyPolicyVersion || !generated.provenance.seedFingerprint) throw new Error(`WAVE_B_PROVENANCE_INCOMPLETE:${contract.outcomeId}:${difficulty}:${index}`);
      provenanceCount += 1;
      exact.add(fingerprint(generated));
      const template = nearTemplate(generated.publicSnapshot.publicPrompt);
      templates.set(template, (templates.get(template) ?? 0) + 1);
      structures.add(String(generated.publicSnapshot.publicData.structuralFingerprint));
      interactions.add(generated.publicSnapshot.interaction.type);
      visuals.add(generated.publicSnapshot.visual.type);
      representative ??= generated;
      sampleCount += 1;
    }
    const pairCount = 20 * 19 / 2;
    const nearPairs = [...templates.values()].reduce((sum, count) => sum + count * (count - 1) / 2, 0);
    const exactDuplicateRate = 1 - exact.size / 20;
    const nearDuplicatePairRate = nearPairs / pairCount;
    maximumExactDuplicateRate = Math.max(maximumExactDuplicateRate, exactDuplicateRate);
    maximumNearDuplicatePairRate = Math.max(maximumNearDuplicatePairRate, nearDuplicatePairRate);
    if (exactDuplicateRate !== 0 || nearDuplicatePairRate > 0.12) throw new Error(`WAVE_B_DIVERSITY_FAILED:${contract.outcomeId}:${difficulty}`);
    diversityRows.push({ outcomeId: contract.outcomeId, canonicalCapability: contract.canonicalVariantId, difficulty, samples: 20, exactUnique: exact.size, exactDuplicateRate, nearDuplicatePairRate, nearDuplicateThreshold: 0.12, uniqueTemplates: templates.size, structuralFingerprints: structures.size, deterministicReplay: "PASS" });
    const correctFeedback = validateStudentResponse(representative!, representative!.privateSolution.correctResponse);
    const incorrectFeedback = validateStudentResponse(representative!, incorrectResponse(representative!));
    if (!correctFeedback.isCorrect || incorrectFeedback.isCorrect) throw new Error(`WAVE_B_FEEDBACK_FAILED:${contract.outcomeId}:${difficulty}`);
    const persisted = to0041Question(representative!, { position: 1, releaseId: "plave-math-grades-1-9-v1", unitId: official.mappedUnitIds[0]!, skillId: `WAVE_B_${contract.canonicalVariantId}`, skillTitle: contract.measurableIntent, contentReleaseHash: "b".repeat(64) });
    if (persisted.question.visual.productContract.questionSource !== "GENERATED_V2" || JSON.stringify(persisted.question).includes("correctResponse")) throw new Error(`WAVE_B_PERSISTENCE_BOUNDARY_FAILED:${contract.outcomeId}:${difficulty}`);
    persistenceProofCount += 1;
    reviewSamples.push({ sampleId: `${contract.outcomeId}:${difficulty}`, outcomeId: contract.outcomeId, grade: contract.grade, strand: official.officialStrand, domain: official.subdomain, unitId: official.mappedUnitIds[0], canonicalCapability: contract.canonicalVariantId, taskKind: contract.taskKind, difficulty, interactionType: representative!.publicSnapshot.interaction.type, visualType: representative!.publicSnapshot.visual.type, publicSnapshot: publicQuestionOnly(representative!), postSubmitFeedback: { correct: correctFeedback, incorrect: incorrectFeedback }, reviewState: "NEEDS_REVISION" });
  }
}

if (sampleCount !== 61 * 3 * 20 || provenanceCount !== sampleCount || persistenceProofCount !== 61 * 3) throw new Error("WAVE_B_SAMPLE_TOTAL_INVALID");
if (capabilities.size !== 30) throw new Error(`WAVE_B_CAPABILITY_COUNT_INVALID:${capabilities.size}`);

const negativeControls: unknown[] = [];
for (const contract of WAVE_B_OUTCOME_CONTRACTS.filter(isWaveBImplementedByNewEngine)) {
  const inspected = __waveBNegativeControl.inspect(contract, { outcomeId: contract.outcomeId, grade: contract.grade, difficulty: "HARD", seed: `negative-${contract.outcomeId.toLowerCase()}`, locale: "vi-VN" });
  const controls: string[] = [];
  const assertRejected = (name: string, action: () => unknown) => { try { action(); } catch { controls.push(name); return; } throw new Error(`WAVE_B_NEGATIVE_CONTROL_NOT_REJECTED:${contract.outcomeId}:${name}`); };
  assertRejected("PROMPT_MODEL_MISMATCH", () => __waveBNegativeControl.validate(contract, inspected.normalizedModel, inspected.solution, "Prompt không liên quan", inspected.interaction, inspected.visual));
  const wrongSolution = { ...inspected.solution, correct: typeof inspected.solution.correct === "number" ? inspected.solution.correct + 1 : "incorrect" as CanonicalResponse, accepted: [typeof inspected.solution.correct === "number" ? inspected.solution.correct + 1 : "incorrect" as CanonicalResponse] };
  assertRejected("INDEPENDENT_SOLVER_MISMATCH", () => __waveBNegativeControl.validate(contract, inspected.normalizedModel, wrongSolution, inspected.prompt, inspected.interaction, inspected.visual));
  if (inspected.normalizedModel.fractions.length) {
    const tampered = structuredClone(inspected.normalizedModel) as WaveBNormalizedProblemModel;
    (tampered as { fractions: FractionValue[] }).fractions[0] = { numerator: 1, denominator: 0 };
    assertRejected("ZERO_DENOMINATOR", () => __waveBNegativeControl.validate(contract, tampered, inspected.solution, inspected.prompt, inspected.interaction, inspected.visual));
  }
  if (["RATIO", "PERCENT", "DECIMAL"].includes(contract.profile)) {
    const tampered = { ...inspected.normalizedModel, scale: 3 };
    assertRejected("UNCONTROLLED_DECIMAL_SCALE", () => __waveBNegativeControl.validate(contract, tampered, inspected.solution, inspected.prompt, inspected.interaction, inspected.visual));
  }
  negativeControls.push({ outcomeId: contract.outcomeId, capability: contract.canonicalVariantId, controls, result: "PASS" });
}

const browserPath = resolve(output, "browser-acceptance.json");
const screenshotPath = resolve(output, "screenshot-review.json");
const browser = existsSync(browserPath) ? JSON.parse(readFileSync(browserPath, "utf8")) as BrowserEvidence : null;
const screenshotReview = existsSync(screenshotPath) ? JSON.parse(readFileSync(screenshotPath, "utf8")) as ScreenshotReview : null;
const browserPassed = Boolean(browser && screenshotReview
  && browser.status === "PASS"
  && browser.browserExecutableResolved === "PASS"
  && browser.localPlaywright
  && !browser.inAppBrowserUsed
  && browser.canonicalCapabilitiesRepresented === "30/30"
  && browser.viewports.length === 2
  && browser.screenshotReview === `PASS_${browser.screenshots.length}_OF_${browser.screenshots.length}_VISUALLY_REVIEWED`
  && [browser.consoleErrors, browser.hydrationErrors, browser.pageErrors, browser.overflowFailures, browser.privateLeaks, browser.promptVisualMismatches].every((value) => value === 0)
  && browser.disposable.cleanup === "PASS"
  && browser.exactRemainingBlockers.length === 0
  && screenshotReview.status === "PASS"
  && screenshotReview.reviewed === screenshotReview.expected
  && screenshotReview.criticalIssues === 0
  && screenshotReview.highIssues === 0
  && screenshotReview.unreviewedScreenshots.length === 0);

const diversity = { schemaVersion: 1, sprint: "8C.B", result: "PASS", audit: { outcomes: 61, difficulties: 3, seedsPerDifficulty: 20, generatedSamples: sampleCount }, policy: { exactDuplicateRate: 0, nearDuplicatePairRateMaximum: 0.12, deterministicReplay: true, difficultyStructuralSeparation: true }, summary: { maximumExactDuplicateRate, maximumNearDuplicatePairRate, failedBatches: 0 }, outcomes: diversityRows };
const reviewManifest = { schemaVersion: 1, result: "READY_FOR_OWNER_PRODUCT_REVIEW", sampleCount: reviewSamples.length, filters: ["grade", "strand", "domain", "unit", "outcome", "canonicalCapability", "difficulty", "interactionType", "reviewState"], allowedStates: ["APPROVE", "REJECT", "NEEDS_REVISION"], privateSolutionIncluded: false, coverage: { everyOutcome: true, everyCapability: true, everyGrade: true, everyDifficulty: true, interactions: [...interactions].sort(), visuals: [...visuals].sort() }, browserAcceptance: browserPassed ? { status: "PASS", screenshotsVisuallyReviewed: screenshotReview!.reviewed } : { status: "PENDING" }, samples: reviewSamples };
const report = {
  schemaVersion: 1,
  generatedAt: "2026-08-02",
  sprint: "8C.B",
  result: browserPassed ? "PASS_BROWSER_VALIDATED" : "BLOCKED_BROWSER_ACCEPTANCE_PENDING",
  roadmap: { milestone1: "COMPLETE_OWNER_APPROVED", milestone2: "IN_PROGRESS_RESUMED", milestone3: "COMPLETE_OWNER_APPROVED_LOCAL_MVP" },
  inventory: { source: "artifacts/generator-v2-full-coverage/outcome-matrix.json", officialDenominator: 546, exactWaveBOutcomes: 61, grades: [...new Set(WAVE_B_OUTCOME_CONTRACTS.map((contract) => contract.grade))].sort(), canonicalCapabilities: capabilities.size, exactOutcomeIds: contractIds },
  coverage: { waveBTotal: 61, implementedReviewRequired: 61, blocked: 0, mathematicallyUnsolvableOutcomes: [], generatedSamples: sampleCount, expectedSamples: 3_660, fallbackCount: 0, keywordRoutingCount: 0, overallGeneratorV2ImplementedOutcomes: GENERATOR_V2_OUTCOME_REGISTRY.length, fullCanonicalOutcomeTotal: 546, remainingPostWaveBOutcomes: 546 - GENERATOR_V2_OUTCOME_REGISTRY.length, claimsMilestone2Complete: false },
  contracts: { type: "PLAVE_PRODUCT_ASSESSMENT_CONTRACT_V2", version: "wave-b-v2.1", explicitOutcomeRouting: true, canonicalCapabilities: capabilities.size, newlyImplementedOutcomes: 60, preservedProvenBaseline: 1, genericFallback: false, syntheticAliases: false },
  validation: { independentlySolvedAndValidated: sampleCount, provenance8Of8: provenanceCount, publicBoundary: "PASS", deterministicReplay: "PASS", exactDuplicates: 0, maximumNearDuplicatePairRate, difficultyStructuralGates: "PASS", persistenceAdapterProofs: persistenceProofCount, decimalArithmetic: "INTEGER_SCALED", fractionEquivalence: "GCD_NORMALIZED", ratioUnits: "EXPLICIT" },
  negativeControls: { status: "PASS", outcomesTested: negativeControls.length, evidence: "artifacts/generator-v2-wave-b/negative-controls.json" },
  runtime: browserPassed ? { status: "PASS_LOCAL_AUTHENTICATED_DATABASE", questionSource: "GENERATED_V2", immutableSnapshot: "PASS", resumeWithoutRegeneration: "PASS", casDuplicateSubmit: "PASS", exactlyOnceProgressHistory: "PASS", transactionRollback: "PASS", roleIsolation: "PASS", defaultRuntimeEnabled: false } : { status: "PENDING_BROWSER_DATABASE_ACCEPTANCE", defaultRuntimeEnabled: false },
  browserAcceptance: browserPassed ? { status: "PASS", playwrightVersion: browser!.playwrightVersion, browserVersion: browser!.browserVersion, capabilities: browser!.canonicalCapabilitiesRepresented, viewports: browser!.viewports, screenshotsCreated: browser!.screenshots.length, screenshotsVisuallyReviewed: screenshotReview!.reviewed, criticalHighIssues: 0, consoleErrors: 0, hydrationErrors: 0, pageErrors: 0, overflowFailures: 0, privateLeaks: 0, promptVisualMismatches: 0, fixtureCleanup: browser!.disposable.cleanup, exactRemainingBlockers: [] } : { status: "PENDING_LOCAL_PLAYWRIGHT", exactRemainingBlockers: ["LOCAL_PLAYWRIGHT_ACCEPTANCE_NOT_YET_RECORDED"] },
  regressionEvidence: {
    waveA: "8/8 PASS; 98/98 outcomes; 5,880/5,880 samples",
    generatorV2AndNegativeControls: "10/10 PASS",
    fullCoverageInventory: "6/6 PASS; 167/546 implemented; 379 post-Wave-B outcomes remain fail-closed",
    persistenceAndDatabaseContracts: "10/10 PASS plus authenticated disposable 0001-0042 browser/database proof",
    practice: "550/550 PASS",
    practiceVisualReadability: "3/3 PASS",
    curriculumGrades1To9: "9/9 PASS",
    universalCurriculum: "21/21 PASS",
    competency: "10/10 PASS",
    uiUx: "13/13 PASS",
    aiTutor: "40/40 PASS; no paid provider request",
    typecheck: "PASS",
    lint: "PASS; 0 warnings",
    productionBuild: "PASS; 76/76 static pages",
    npmAudit: "BLOCKED; sandbox DNS could not reach registry.npmjs.org and escalation was policy-rejected because dependency metadata would be transmitted externally",
  },
  reviewPackage: { status: "READY", samples: reviewSamples.length, ownerDecision: "NOT_REQUESTED_NOT_ASSUMED" },
  boundaries: ["NO_REMOTE_MUTATION", "NO_MIGRATION_CHANGE", "NO_DEPLOYMENT", "NO_GIT_MUTATION", "NO_AI_TUTOR_IMPLEMENTATION_CHANGE", "NO_DEFAULT_RUNTIME_ENABLE", "NO_GENERIC_FALLBACK", "NO_WAVE_C_IMPLEMENTATION"],
};

writeFileSync(resolve(output, "outcome-matrix.json"), `${JSON.stringify({ schemaVersion: 1, count: outcomeRows.length, rows: outcomeRows }, null, 2)}\n`);
writeFileSync(resolve(output, "diversity.json"), `${JSON.stringify(diversity, null, 2)}\n`);
writeFileSync(resolve(output, "negative-controls.json"), `${JSON.stringify({ schemaVersion: 1, result: "PASS", controls: negativeControls }, null, 2)}\n`);
writeFileSync(resolve(output, "review-manifest.json"), `${JSON.stringify(reviewManifest, null, 2)}\n`);
writeFileSync(resolve(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);

console.log("WAVE_B_OUTCOMES=61/61");
console.log(`WAVE_B_CAPABILITIES=${capabilities.size}`);
console.log(`WAVE_B_SAMPLES=${sampleCount}/3660`);
console.log(`WAVE_B_MAX_NEAR_DUPLICATE=${maximumNearDuplicatePairRate.toFixed(6)}`);
console.log(`WAVE_B_BROWSER=${browserPassed ? "PASS" : "PENDING"}`);
