import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  evaluatePublicQuestion,
  type OracleCandidate,
} from "../lib/generation-v2-oracle/index.ts";
import {
  GENERATOR_V2_OUTCOME_REGISTRY,
  generateQuestion,
  publicQuestionOnly,
  type ProductDifficulty,
} from "../lib/generation-v2/index.ts";

const root = process.cwd();
if (!root.endsWith("/PLAVE-PROJECT004")) throw new Error("PROJECT004_ROOT_REQUIRED");
const confirmed =
  process.env.PLAVE_SPRINT10C_PRODUCT_REVIEW === "DEVELOPER_CONFIRMED";
const difficulties: readonly ProductDifficulty[] = ["EASY", "MEDIUM", "HARD"];
const representatives = [
  ...new Map(
    GENERATOR_V2_OUTCOME_REGISTRY.map((entry) => [entry.variantId, entry]),
  ).values(),
];

const samples = representatives.map((entry, index) => {
  const difficulty = difficulties[index % difficulties.length]!;
  const seed = `s10c-review-${String(index + 1).padStart(3, "0")}-${entry.variantId
    .toLowerCase()
    .replaceAll("_", "-")
    .slice(0, 70)}`;
  const generated = generateQuestion({
    outcomeId: entry.outcomeId,
    grade: entry.grade,
    difficulty,
    seed,
    locale: "vi-VN",
  });
  const oracle = evaluatePublicQuestion(
    publicQuestionOnly(generated) as unknown as OracleCandidate,
  );
  const prompt = generated.publicSnapshot.publicPrompt;
  const languageContract =
    prompt.trim().length >= 24 &&
    !/\{\{|\}\}|undefined|null|todo|placeholder|theo yêu cầu|phép toán giữa|màu màu|phần còn lại hoặc kết quả|x−-/iu.test(
      prompt,
    );
  const visualContract =
    generated.publicSnapshot.visual.type === "NONE" ||
    generated.publicSnapshot.visual.description.trim().length > 8;
  const feedbackContract =
    generated.privateSolution.solutionSteps.length > 0 &&
    generated.privateSolution.nextStep.trim().length > 8;
  return {
    reviewIndex: index + 1,
    outcomeId: entry.outcomeId,
    capabilityId: entry.variantId,
    grade: entry.grade,
    productFamilyId: entry.productFamilyId,
    difficulty,
    seed,
    interactionType: generated.publicSnapshot.interaction.type,
    visualType: generated.publicSnapshot.visual.type,
    prompt,
    visualDescription: generated.publicSnapshot.visual.description,
    responseInstruction: generated.publicSnapshot.accessibility.responseInstruction,
    checks: {
      independentOracle: oracle.ok,
      sufficientPublicEvidence: oracle.answerCardinality === 1,
      generatorValidation: generated.validation.ok,
      uniqueSolution: generated.solverReceipt.uniqueSolution,
      languageContract,
      visualContract,
      feedbackContract,
      privateAnswerIncluded: false,
    },
    developerReview: confirmed ? "REVIEWED_ACCEPTED" : "PENDING",
  };
});

if (
  samples.length !== 198 ||
  new Set(samples.map((item) => item.capabilityId)).size !== 198 ||
  samples.some((item) => Object.values(item.checks).some((value) => value !== true && value !== false)) ||
  samples.some((item) => !item.checks.independentOracle || !item.checks.sufficientPublicEvidence || !item.checks.generatorValidation || !item.checks.uniqueSolution || !item.checks.languageContract || !item.checks.visualContract || !item.checks.feedbackContract || item.checks.privateAnswerIncluded)
) {
  throw new Error("SPRINT10C_PRODUCT_REVIEW_CONTRACT_FAILED");
}

const output = resolve(root, "artifacts/remediation");
mkdirSync(output, { recursive: true });
writeFileSync(
  resolve(output, "generator-correctness-product-review.json"),
  `${JSON.stringify({
    schemaVersion: 1,
    sprint: "10C",
    status: confirmed ? "PASS" : "PENDING_DEVELOPER_REVIEW",
    ownerApprovalRecorded: false,
    representativeCapabilities: samples.length,
    grades: [...new Set(samples.map((item) => item.grade))].sort(),
    difficulties: [...new Set(samples.map((item) => item.difficulty))].sort(),
    interactionTypes: [...new Set(samples.map((item) => item.interactionType))].sort(),
    visualTypes: [...new Set(samples.map((item) => item.visualType))].sort(),
    privateAnswersIncluded: false,
    samples,
  }, null, 2)}\n`,
  { mode: 0o600 },
);

console.log(`GENERATOR_CORRECTNESS_PRODUCT_REVIEW=${confirmed ? "PASS" : "PENDING"}`);
console.log(`GENERATOR_CORRECTNESS_PRODUCT_REVIEW_SAMPLES=${samples.length}/198`);
