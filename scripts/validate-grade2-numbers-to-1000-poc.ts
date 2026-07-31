import { validateSkillFamilyConfig } from "../lib/content-engine/config.ts";
import {
  generateGradeTwoNumbersTo1000Draft,
  getQuestionTypeCount,
  validateGradeTwoNumberBoundaries,
  validateGradeTwoNumbersTo1000Draft,
} from "../lib/content-engine/grade2-numbers-to-1000.ts";
import {
  createGradeTwoNumbersTo1000ReviewPackage,
  gradeTwoNumbersTo1000ReviewSeeds,
  validateGradeTwoNumbersTo1000ReviewPackage,
} from "../lib/content-engine/grade2-numbers-to-1000-review.ts";

function assertCondition(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const seeds = gradeTwoNumbersTo1000ReviewSeeds;
const drafts = seeds.map(generateGradeTwoNumbersTo1000Draft);

for (const draft of drafts) {
  const result = validateGradeTwoNumbersTo1000Draft(draft);
  assertCondition(result.valid, result.errors.join("\n"));
  for (const family of draft.skillFamilies) {
    const configResult = validateSkillFamilyConfig(family);
    assertCondition(configResult.valid, configResult.errors.join("\n"));
  }
}

const repeated = generateGradeTwoNumbersTo1000Draft(seeds[0]);
assertCondition(
  JSON.stringify(repeated) === JSON.stringify(drafts[0]),
  "Cùng seed phải sinh cùng một draft.",
);
assertCondition(
  JSON.stringify(drafts[0]?.bundles) !==
    JSON.stringify(drafts[1]?.bundles),
  "Hai seed khác nhau phải tạo biến thể khác nhau.",
);

const boundaryResult = validateGradeTwoNumberBoundaries([
  0,
  9,
  10,
  99,
  100,
  999,
  1000,
]);
assertCondition(boundaryResult.valid, boundaryResult.errors.join("\n"));

const reviewPackage = createGradeTwoNumbersTo1000ReviewPackage();
const reviewValidation =
  validateGradeTwoNumbersTo1000ReviewPackage(reviewPackage);
assertCondition(reviewValidation.valid, reviewValidation.errors.join("\n"));

const referenceDraft = drafts[0];
assertCondition(Boolean(referenceDraft), "Thiếu reference draft.");
if (!referenceDraft) throw new Error("Thiếu reference draft.");

const questionCodes = referenceDraft.bundles.map(
  ({ question }) => question.code,
);
const prompts = referenceDraft.bundles.map(
  ({ question }) => question.prompt,
);
assertCondition(
  new Set(questionCodes).size === questionCodes.length,
  "Question code bị trùng.",
);
assertCondition(
  new Set(prompts).size === prompts.length,
  "Prompt bị trùng.",
);
assertCondition(
  getQuestionTypeCount(referenceDraft, "MULTIPLE_CHOICE") === 16,
  "POC phải có đúng 16 MCQ.",
);
assertCondition(
  getQuestionTypeCount(referenceDraft, "NUMBER_INPUT") === 8,
  "POC phải có đúng 8 NUMBER_INPUT.",
);

console.log(
  [
    "Grade 2 numbers-to-1000 engine POC validation passed.",
    `Seeds checked: ${seeds.length}.`,
    `Questions per draft: ${referenceDraft.bundles.length}.`,
    `Review samples checked: ${
      reviewPackage.seedPackages.length *
      reviewPackage.reviewSampleSizePerSeed
    }.`,
    "Distribution: 16 MCQ, 8 NUMBER_INPUT, 4 skill families × 6.",
    "Boundaries checked: 0, 9, 10, 99, 100, 999, 1000.",
    "Governance: official source VALIDATED; expert OPTIONAL_NOT_OBTAINED; publication DRAFT.",
  ].join("\n"),
);
