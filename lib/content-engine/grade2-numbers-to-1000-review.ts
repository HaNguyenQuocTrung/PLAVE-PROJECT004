import {
  generateGradeTwoNumbersTo1000Draft,
  validateGradeTwoNumbersTo1000Draft,
} from "./grade2-numbers-to-1000.ts";
import {
  gradeTwoNumbersTo1000Assets,
  gradeTwoNumbersTo1000SourceManifest,
} from "./grade2-numbers-to-1000-sources.ts";
import {
  validateContentAssets,
  validateUnitSourceTraceabilityManifest,
} from "./source-traceability.ts";
import type {
  CognitiveLevel,
  ContentGovernanceState,
  Difficulty,
  EngineAnswerType,
  EngineQuestionOptions,
  EngineVisualSpec,
  GeneratedQuestionSource,
  MisconceptionTag,
  ValidationResult,
} from "./types.ts";

export const gradeTwoNumbersTo1000ReviewSeeds = [
  "g2-review-place-value",
  "g2-review-zero-boundaries",
  "g2-review-number-language",
  "g2-review-sequence",
  "g2-review-accessibility",
] as const;

export type GradeTwoContentReviewSample = Readonly<{
  sampleId: string;
  seed: string;
  prompt: string;
  answerType: EngineAnswerType;
  skillFamilyId: string;
  cognitiveLevel: CognitiveLevel;
  difficulty: Exclude<Difficulty, "MIXED">;
  options: EngineQuestionOptions | null;
  visual: EngineVisualSpec;
  accessibilityDescription: string;
  misconceptionTags: readonly MisconceptionTag[];
  distractorTagByOption: Readonly<
    Partial<Record<keyof EngineQuestionOptions, MisconceptionTag>>
  >;
  correctAnswer: string;
  solutionSteps: readonly string[];
  auditSource: GeneratedQuestionSource;
}>;

export type GradeTwoContentReviewSeedPackage = Readonly<{
  seed: string;
  samples: readonly GradeTwoContentReviewSample[];
}>;

export type GradeTwoContentReviewPackage = Readonly<{
  unitSlug: "grade-2-numbers-to-1000";
  reviewSampleSizePerSeed: 24;
  seedPackages: readonly GradeTwoContentReviewSeedPackage[];
  unitDecisionStatus: "PRODUCT_DECISION";
  skillFamilyDecisionStatus: "PRODUCT_DECISION";
  sampleSizeDecisionStatus: "PRODUCT_HYPOTHESIS";
  governance: ContentGovernanceState;
  sourceManifestVersion: "poc-v1";
}>;

export function createGradeTwoNumbersTo1000ReviewPackage(): GradeTwoContentReviewPackage {
  return {
    unitSlug: "grade-2-numbers-to-1000",
    reviewSampleSizePerSeed: 24,
    seedPackages: gradeTwoNumbersTo1000ReviewSeeds.map((seed) => {
      const draft = generateGradeTwoNumbersTo1000Draft(seed);
      const templateById = new Map(
        draft.templates.map((template) => [template.id, template]),
      );
      return {
        seed,
        samples: draft.bundles.map((bundle) => {
          const template = templateById.get(
            bundle.question.templateId,
          );
          if (!template) {
            throw new Error(
              `Thiếu template ${bundle.question.templateId}.`,
            );
          }
          return {
            sampleId: `${seed}:${bundle.question.code}`,
            seed,
            prompt: bundle.question.prompt,
            answerType: bundle.question.questionType,
            skillFamilyId: bundle.question.skillFamilyId,
            cognitiveLevel: template.cognitiveLevel,
            difficulty: bundle.question.difficulty,
            options: bundle.question.options,
            visual: bundle.question.visual,
            accessibilityDescription:
              bundle.question.visual.description,
            misconceptionTags: template.misconceptionTags,
            distractorTagByOption:
              bundle.audit.distractorTagByOption,
            correctAnswer: bundle.solution.correctAnswer,
            solutionSteps: bundle.solution.solutionSteps,
            auditSource: bundle.audit.source,
          };
        }),
      };
    }),
    unitDecisionStatus: "PRODUCT_DECISION",
    skillFamilyDecisionStatus: "PRODUCT_DECISION",
    sampleSizeDecisionStatus: "PRODUCT_HYPOTHESIS",
    governance: {
      officialSourceValidation: "VALIDATED",
      technicalValidation: "PASSED",
      expertReview: "OPTIONAL_NOT_OBTAINED",
      ownerDecision: "NOT_REVIEWED",
      publicationStatus: "DRAFT",
    },
    sourceManifestVersion: "poc-v1",
  };
}

function sourceValue(source: GeneratedQuestionSource) {
  return source.value;
}

function expectedDisplayAnswer(source: GeneratedQuestionSource) {
  switch (source.kind) {
    case "COMPOSE_NUMBER":
      return String(source.value);
    case "READ_NUMBER":
      return source.words;
    case "IDENTIFY_PLACE":
      return String(source.digit);
    case "NEIGHBOR_NUMBER":
      return String(source.answer);
  }
}

function visualMatchesSource(sample: GradeTwoContentReviewSample) {
  const { visual, auditSource } = sample;
  if (auditSource.kind === "READ_NUMBER") {
    return (
      visual.kind === "NUMBER_CARD" &&
      visual.value === auditSource.value
    );
  }
  if (auditSource.kind === "NEIGHBOR_NUMBER") {
    return (
      visual.kind === "NUMBER_LINE" &&
      visual.focusValue === auditSource.value &&
      visual.start >= 0 &&
      visual.end <= 1000
    );
  }
  const value = auditSource.value;
  return (
    visual.kind === "PLACE_VALUE_CHART" &&
    visual.thousands === Math.floor(value / 1000) &&
    visual.hundreds === Math.floor((value % 1000) / 100) &&
    visual.tens === Math.floor((value % 100) / 10) &&
    visual.ones === value % 10
  );
}

export function validateGradeTwoNumbersTo1000ReviewPackage(
  reviewPackage: GradeTwoContentReviewPackage,
): ValidationResult {
  const errors: string[] = [];
  if (
    reviewPackage.unitSlug !== "grade-2-numbers-to-1000" ||
    reviewPackage.reviewSampleSizePerSeed !== 24 ||
    reviewPackage.seedPackages.length < 5 ||
    reviewPackage.unitDecisionStatus !== "PRODUCT_DECISION" ||
    reviewPackage.skillFamilyDecisionStatus !==
      "PRODUCT_DECISION" ||
    reviewPackage.sampleSizeDecisionStatus !==
      "PRODUCT_HYPOTHESIS" ||
    reviewPackage.governance.officialSourceValidation !==
      "VALIDATED" ||
    reviewPackage.governance.technicalValidation !== "PASSED" ||
    reviewPackage.governance.expertReview !==
      "OPTIONAL_NOT_OBTAINED" ||
    reviewPackage.governance.ownerDecision !== "NOT_REVIEWED" ||
    reviewPackage.governance.publicationStatus !== "DRAFT" ||
    reviewPackage.sourceManifestVersion !== "poc-v1"
  ) {
    errors.push("Review package metadata không hợp lệ.");
  }
  const sourceValidation = validateUnitSourceTraceabilityManifest(
    gradeTwoNumbersTo1000SourceManifest,
  );
  errors.push(
    ...sourceValidation.errors.map(
      (error) => `Source manifest: ${error}`,
    ),
  );
  const assetValidation = validateContentAssets(
    gradeTwoNumbersTo1000Assets,
  );
  errors.push(
    ...assetValidation.errors.map((error) => `Asset: ${error}`),
  );

  const sampleIds = new Set<string>();
  for (const seedPackage of reviewPackage.seedPackages) {
    if (
      seedPackage.samples.length !==
      reviewPackage.reviewSampleSizePerSeed
    ) {
      errors.push(`${seedPackage.seed}: review sample không đủ 24 câu.`);
    }
    const draft = generateGradeTwoNumbersTo1000Draft(
      seedPackage.seed,
    );
    const draftValidation = validateGradeTwoNumbersTo1000Draft(draft);
    errors.push(
      ...draftValidation.errors.map(
        (error) => `${seedPackage.seed}: ${error}`,
      ),
    );

    const skillCounts = new Map<string, number>();
    for (const sample of seedPackage.samples) {
      if (sampleIds.has(sample.sampleId)) {
        errors.push(`${sample.sampleId}: sample ID bị trùng.`);
      }
      sampleIds.add(sample.sampleId);
      skillCounts.set(
        sample.skillFamilyId,
        (skillCounts.get(sample.skillFamilyId) ?? 0) + 1,
      );
      const value = sourceValue(sample.auditSource);
      if (!Number.isInteger(value) || value < 0 || value > 1000) {
        errors.push(`${sample.sampleId}: giá trị ngoài phạm vi 0–1000.`);
      }
      if (
        sample.prompt.trim().length < 12 ||
        sample.prompt.length > 160 ||
        /(?:có thể|xấp xỉ|khoảng bao nhiêu|tùy theo)/i.test(
          sample.prompt,
        )
      ) {
        errors.push(`${sample.sampleId}: wording có thể mơ hồ.`);
      }
      if (
        /(?:phép cộng|phép trừ|phép nhân|phép chia|\d\s*(?:[+×÷]|-\s*)\s*\d)/i.test(
          sample.prompt,
        )
      ) {
        errors.push(`${sample.sampleId}: chứa phép tính ngoài scope.`);
      }
      if (
        /(?:so sánh|sắp xếp|lớn nhất|nhỏ nhất|ước lượng)/i.test(
          sample.prompt,
        )
      ) {
        errors.push(
          `${sample.sampleId}: chứa comparison/order thuộc unit kế tiếp.`,
        );
      }
      if (/Số gồm 0 (?:nghìn|trăm)/i.test(sample.prompt)) {
        errors.push(`${sample.sampleId}: có hàng 0 dẫn đầu không tự nhiên.`);
      }
      if (
        sample.accessibilityDescription !==
          sample.visual.description ||
        sample.accessibilityDescription.trim().length < 12 ||
        /đáp án|correct|is_correct|https?:|data:|<|>/i.test(
          sample.accessibilityDescription,
        )
      ) {
        errors.push(
          `${sample.sampleId}: visual và accessibility description không nhất quán.`,
        );
      }
      if (!visualMatchesSource(sample)) {
        errors.push(
          `${sample.sampleId}: visual không khớp audit source.`,
        );
      }
      if (
        sample.misconceptionTags.length === 0 ||
        sample.solutionSteps.length < 2 ||
        sample.solutionSteps.some((step) => step.trim().length < 8)
      ) {
        errors.push(
          `${sample.sampleId}: thiếu misconception tag hoặc lời giải.`,
        );
      }
      if (sample.answerType === "MULTIPLE_CHOICE") {
        if (!sample.options) {
          errors.push(`${sample.sampleId}: MCQ thiếu options.`);
        } else {
          const values = Object.values(sample.options);
          const selected =
            sample.options[
              sample.correctAnswer as keyof EngineQuestionOptions
            ];
          if (
            Object.keys(sample.options).sort().join(",") !==
              "A,B,C,D" ||
            new Set(values).size !== 4 ||
            !/^[A-D]$/.test(sample.correctAnswer) ||
            selected !== expectedDisplayAnswer(sample.auditSource)
          ) {
            errors.push(
              `${sample.sampleId}: MCQ không có một đáp án canonical.`,
            );
          }
          const wrongKeys = (["A", "B", "C", "D"] as const).filter(
            (key) => key !== sample.correctAnswer,
          );
          if (
            Object.keys(sample.distractorTagByOption).length !== 3 ||
            wrongKeys.some(
              (key) => !sample.distractorTagByOption[key],
            ) ||
            sample.correctAnswer in sample.distractorTagByOption
          ) {
            errors.push(
              `${sample.sampleId}: distractor chưa map misconception.`,
            );
          }
        }
      } else if (
        sample.options !== null ||
        Object.keys(sample.distractorTagByOption).length !== 0 ||
        !/^(?:0|[1-9][0-9]{0,3})$/.test(sample.correctAnswer) ||
        Number(sample.correctAnswer) > 1000 ||
        sample.correctAnswer !==
          expectedDisplayAnswer(sample.auditSource)
      ) {
        errors.push(
          `${sample.sampleId}: NUMBER_INPUT không parse nhất quán.`,
        );
      }
    }

    for (const skillFamilyId of [
      "NUMBER_RECOGNITION_TO_1000",
      "READ_WRITE_TO_1000",
      "PLACE_VALUE_TO_1000",
      "SEQUENCE_TO_1000",
    ]) {
      if (skillCounts.get(skillFamilyId) !== 6) {
        errors.push(
          `${seedPackage.seed}: ${skillFamilyId} phải có 6 sample.`,
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
