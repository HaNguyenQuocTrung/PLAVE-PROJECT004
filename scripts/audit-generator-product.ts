import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import inventoryJson from "../docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json" with {
  type: "json",
};
import {
  generateSemanticPilotAttemptSnapshot,
} from "../lib/curriculum/semantic-pilot-generation.ts";
import { curriculumUnits } from "../lib/curriculum/registry.ts";
import type {
  Difficulty,
  Family,
} from "../lib/generation-semantic/engine.ts";
import {
  buildOutcomeSemanticContract,
  generateVariantAst,
  OUTCOME_SEMANTIC_VARIANTS,
  renderVariantPrompt,
  solverForOutcomeVariant,
  solveVariantAst,
  type OutcomeSemanticContract,
  type Variant,
} from "../lib/generation-semantic/variant-engine.ts";
import { sha256 } from "../lib/curriculum-runtime/release.ts";

type InventoryOutcome = Readonly<{
  id: string;
  grade: number;
  officialStrand: string;
  subdomain?: string;
  conciseParaphrase: string;
  mappedUnitIds: readonly string[];
}>;

type AuditCategory =
  | "RUNTIME_DISCONNECTED"
  | "STATIC_BANK_STILL_USED"
  | "FEATURE_FLAG_BLOCKED"
  | "FAMILY_MAPPING_WRONG"
  | "OUTCOME_ALIGNMENT_WRONG"
  | "GRADE_LEVEL_WRONG"
  | "INVALID_OR_AMBIGUOUS_QUESTION"
  | "WEAK_DISTRACTORS"
  | "LOW_VARIATION"
  | "DIFFICULTY_NOT_MEANINGFUL"
  | "VISUAL_MISSING_OR_INCORRECT"
  | "LANGUAGE_QUALITY"
  | "FEEDBACK_OR_EXPLANATION_WEAK"
  | "PERSISTENCE_OR_RESUME_ERROR"
  | "PROGRESS_UPDATE_ERROR"
  | "PRIVATE_DATA_LEAK"
  | "UI_RENDERING_ERROR"
  | "UNIMPLEMENTED_VARIANT";

type ProductVerdict = Readonly<{
  usable: boolean;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
  categories: readonly AuditCategory[];
  summary: string;
}>;

type AuditSample = Readonly<{
  sampleId: string;
  variant: Variant;
  difficulty: Difficulty;
  seedIndex: number;
  reproductionSeed: string;
  seedFingerprint: string;
  runtimeReachable: boolean;
  grade: number | null;
  outcomeId: string | null;
  unitId: string | null;
  astKind: string;
  complexity: number;
  prompt: string;
  normalizedTemplate: string;
  answerType: string | null;
  optionLabels: readonly string[];
  correctOptionKey: string | null;
  correctOptionLabel: string;
  visualType: string | null;
  visualTemplate: string | null;
  solutionSteps: readonly string[];
  feedback: string | null;
  stemMathematicallyAnswerable: boolean;
  publicQuestion: Readonly<{
    questionId: string;
    position: number;
    prompt: string;
    answerType: "MULTIPLE_CHOICE" | "NUMBER_INPUT" | "TEXT_INPUT";
    options: readonly Readonly<{ key: string; label: string }>[] | null;
    visual: unknown;
    cognitiveLevel: "UNDERSTAND" | "APPLY" | "REASON";
  }> | null;
  productVerdict: ProductVerdict;
}>;

const root = process.cwd();
if (!root.endsWith("/PLAVE-PROJECT004")) {
  throw new Error("GENERATOR_AUDIT_PROJECT_ROOT_INVALID");
}

const artifactRoot = resolve(root, "artifacts/generator-product-audit");
const failureRoot = resolve(artifactRoot, "failure-cases");
mkdirSync(failureRoot, { recursive: true });
mkdirSync(resolve(artifactRoot, "screenshots"), { recursive: true });

const inventory = inventoryJson as { outcomes: readonly InventoryOutcome[] };
const difficulties: readonly Difficulty[] = ["EASY", "MEDIUM", "HARD"];
const samplesPerDifficulty = 20;

function runtimeUnitId(outcome: InventoryOutcome) {
  return curriculumUnits.find(
    (unit) =>
      outcome.mappedUnitIds.includes(unit.slug) &&
      unit.officialOutcomeIds.includes(outcome.id),
  )?.slug ?? null;
}

function hashText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function familyForVariant(variant: Variant): Family {
  if (/FRACTION/u.test(variant)) return "FRACTION";
  if (/DECIMAL/u.test(variant)) return "DECIMAL";
  if (/RATIO|PERCENT/u.test(variant)) return "RATIO_PERCENT";
  if (/DIVISIBILITY/u.test(variant)) return "DIVISIBILITY";
  if (/POWER_ROOT/u.test(variant)) return "POWER_ROOT";
  if (/EXPRESSION|MISSING|SUBSTITUTION|LIKE_TERM|ALGEBRA/u.test(variant)) return "EXPRESSION";
  if (/EQUATION/u.test(variant)) return "EQUATION";
  if (/INEQUALITY/u.test(variant)) return "INEQUALITY";
  if (/FUNCTION|SEQUENCE|RELATION/u.test(variant)) return "FUNCTION";
  if (/MEASUREMENT|UNIT|TIME_MONEY/u.test(variant)) return "MEASUREMENT";
  if (/COORDINATE/u.test(variant)) return "COORDINATE";
  if (/GEOMET|SHAPE|ANGLE|PERIMETER|AREA|VOLUME|THEOREM|SPATIAL/u.test(variant)) return "GEOMETRY";
  if (/TABLE|CHART|FREQUENCY|CENTRAL|DATA/u.test(variant)) return "STATISTICS";
  if (/PROBABILITY|SAMPLE_SPACE/u.test(variant)) return "PROBABILITY";
  if (/CONTEXT|INFORMATION|ERROR|MODELING|EXPLANATION|REPRESENTATION/u.test(variant)) return "WORD_PROBLEM";
  return "INTEGER_ARITHMETIC";
}

function expectedVisual(variant: Variant) {
  return /PLACE_VALUE|MEASUREMENT|PERIMETER|AREA|VOLUME|SHAPE|ANGLE|COORDINATE|CHART|TABLE/u.test(variant)
    ? variant
    : "NONE";
}

function syntheticContract(variant: Variant): OutcomeSemanticContract {
  return {
    outcomeId: `audit-proof-only-${variant.toLowerCase()}`,
    expectedFamily: familyForVariant(variant),
    expectedVariant: variant,
    expectedEvidenceForm: variant.toLowerCase().replaceAll("_", "-"),
    expectedAnswerType: "SINGLE_CHOICE",
    expectedSolver: solverForOutcomeVariant(variant),
    expectedVisual: expectedVisual(variant),
    expectedDifficultyDimensions: [
      "complexity",
      "operand-or-premise-count",
      "representation-depth",
    ],
    prerequisiteBounds: ["schoolGrade=9"],
  };
}

function normalizeTemplate(value: string) {
  return value
    .toLocaleLowerCase("vi")
    .replace(/-?\d+(?:[.,]\d+)?/gu, "#")
    .replace(/\b[a-d]\b/giu, "x")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizeVisual(value: unknown) {
  if (!value) return null;
  return JSON.stringify(value)
    .replace(/-?\d+(?:\.\d+)?/gu, "#")
    .replace(/[0-9a-f]{16,}/giu, "<hash>");
}

function verdictForVariant(
  variant: Variant,
  runtimeReachable: boolean,
): ProductVerdict {
  if (!runtimeReachable) {
    return {
      usable: false,
      severity: "CRITICAL",
      categories: ["UNIMPLEMENTED_VARIANT", "RUNTIME_DISCONNECTED"],
      summary: "Variant chỉ có synthetic proof; không có outcome thực để runtime chọn hoặc persist.",
    };
  }
  const answerableStem = new Set<Variant>([
    "PLACE_VALUE",
    "NUMBER_COMPARISON",
    "NUMBER_ORDERING",
    "EQUATION_SOLVING",
    "FUNCTION_INPUT_OUTPUT",
  ]);
  if (answerableStem.has(variant)) {
    return {
      usable: false,
      severity: "HIGH",
      categories: [
        "LOW_VARIATION",
        "DIFFICULTY_NOT_MEANINGFUL",
        "FEEDBACK_OR_EXPLANATION_WEAK",
      ],
      summary:
        "Stem có thể giải đúng riêng lẻ nhưng chưa production-usable: lặp template, độ khó chưa tách biệt thực chất và lời giải không giải thích phép toán cụ thể.",
    };
  }

  if (/FRACTION|DECIMAL|RATIO|PERCENT/u.test(variant)) {
    return {
      usable: false,
      severity: "CRITICAL",
      categories: ["OUTCOME_ALIGNMENT_WRONG", "INVALID_OR_AMBIGUOUS_QUESTION", "WEAK_DISTRACTORS"],
      summary: "Prompt nêu tên kỹ năng chung nhưng solver mặc định cộng hai giá trị hoặc dùng phép khác với outcome.",
    };
  }
  if (/PROBABILITY|SAMPLE_SPACE/u.test(variant)) {
    return {
      usable: false,
      severity: "CRITICAL",
      categories: ["INVALID_OR_AMBIGUOUS_QUESTION", "VISUAL_MISSING_OR_INCORRECT", "OUTCOME_ALIGNMENT_WRONG"],
      summary: "Số trường hợp thuận lợi/tổng trường hợp dùng để chấm không xuất hiện đầy đủ trong prompt/visual.",
    };
  }
  if (/SHAPE|ANGLE|COORDINATE|GEOMETRIC|THEOREM|SPATIAL/u.test(variant)) {
    return {
      usable: false,
      severity: "CRITICAL",
      categories: ["VISUAL_MISSING_OR_INCORRECT", "INVALID_OR_AMBIGUOUS_QUESTION", "LANGUAGE_QUALITY"],
      summary: "Giả thiết/visual không xác định bài toán cụ thể và đáp án có thể là tên variant nội bộ.",
    };
  }
  if (/TABLE|CHART|FREQUENCY|CENTRAL|DATA/u.test(variant)) {
    return {
      usable: false,
      severity: "HIGH",
      categories: ["OUTCOME_ALIGNMENT_WRONG", "VISUAL_MISSING_OR_INCORRECT", "INVALID_OR_AMBIGUOUS_QUESTION"],
      summary: "Query chỉ là tên family; solver thường lấy max/mean mà không nêu đại lượng cần đọc hoặc so sánh.",
    };
  }
  if (/CONTEXT|INFORMATION|ERROR|MODELING|EXPLANATION|REPRESENTATION/u.test(variant)) {
    return {
      usable: false,
      severity: "HIGH",
      categories: ["OUTCOME_ALIGNMENT_WRONG", "LANGUAGE_QUALITY", "FEEDBACK_OR_EXPLANATION_WEAK"],
      summary: "Không tạo tình huống toán học thật; chỉ liệt kê đại lượng hoặc lặp lại câu mô tả outcome.",
    };
  }
  if (/MEASUREMENT|UNIT|TIME_MONEY|PERIMETER|AREA|VOLUME/u.test(variant)) {
    return {
      usable: false,
      severity: "HIGH",
      categories: ["INVALID_OR_AMBIGUOUS_QUESTION", "VISUAL_MISSING_OR_INCORRECT", "OUTCOME_ALIGNMENT_WRONG"],
      summary: "Đơn vị/đích đổi/hình và vai trò các số đo không được nêu nhất quán; TIME_MONEY vẫn dùng cm.",
    };
  }
  if (/ADDITION|MULTIPLICATION|INTEGER|DIVISIBILITY|POWER_ROOT|NUMERICAL/u.test(variant)) {
    return {
      usable: false,
      severity: "HIGH",
      categories: ["INVALID_OR_AMBIGUOUS_QUESTION", "DIFFICULTY_NOT_MEANINGFUL", "LANGUAGE_QUALITY"],
      summary: "Prompt gộp nhiều phép toán nhưng solver âm thầm chọn một phép; không nói rõ học sinh phải tính gì.",
    };
  }
  if (/MISSING|SUBSTITUTION|EXPRESSION|LIKE_TERM|ALGEBRA|INEQUALITY|RELATION|SEQUENCE/u.test(variant)) {
    return {
      usable: false,
      severity: "HIGH",
      categories: ["OUTCOME_ALIGNMENT_WRONG", "GRADE_LEVEL_WRONG", "INVALID_OR_AMBIGUOUS_QUESTION"],
      summary: "Hầu hết variant đại số dùng cùng AST ax+b và cùng phép thế giá trị, kể cả khi outcome yêu cầu việc khác.",
    };
  }
  return {
    usable: false,
    severity: "HIGH",
    categories: ["LOW_VARIATION", "LANGUAGE_QUALITY", "FEEDBACK_OR_EXPLANATION_WEAK"],
    summary: "Câu hỏi không đạt product-quality criteria.",
  };
}

function median(values: readonly number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
}

function tokenSet(value: string) {
  return new Set(
    normalizeTemplate(value)
      .replace(/[^\p{L}#]+/gu, " ")
      .split(" ")
      .filter(Boolean),
  );
}

function jaccard(left: string, right: string) {
  const a = tokenSet(left);
  const b = tokenSet(right);
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 1 : intersection / union;
}

const outcomesByVariant = new Map<Variant, InventoryOutcome[]>();
for (const outcome of inventory.outcomes) {
  try {
    const contract = buildOutcomeSemanticContract({
      id: outcome.id,
      grade: outcome.grade,
      strand: outcome.officialStrand,
      subdomain: outcome.subdomain ?? "",
      description: outcome.conciseParaphrase,
    });
    if (runtimeUnitId(outcome)) {
      outcomesByVariant.set(contract.expectedVariant, [
        ...(outcomesByVariant.get(contract.expectedVariant) ?? []),
        outcome,
      ]);
    }
  } catch {
    // Unreadable outcomes are counted separately in the final report.
  }
}

const samples: AuditSample[] = [];
const mathematicallyAnswerableStemVariants = new Set<Variant>([
  "PLACE_VALUE",
  "NUMBER_COMPARISON",
  "NUMBER_ORDERING",
  "EQUATION_SOLVING",
  "FUNCTION_INPUT_OUTPUT",
]);
for (const variant of OUTCOME_SEMANTIC_VARIANTS) {
  const outcome = outcomesByVariant.get(variant)?.[0] ?? null;
  const runtimeReachable = Boolean(outcome);
  const unitId = outcome ? runtimeUnitId(outcome) : null;
  const contract = outcome
    ? buildOutcomeSemanticContract({
        id: outcome.id,
        grade: outcome.grade,
        strand: outcome.officialStrand,
        subdomain: outcome.subdomain ?? "",
        description: outcome.conciseParaphrase,
      })
    : syntheticContract(variant);
  const description = outcome?.conciseParaphrase ?? `Synthetic proof-only ${variant}`;
  for (const difficulty of difficulties) {
    for (let seedIndex = 1; seedIndex <= samplesPerDifficulty; seedIndex += 1) {
      const raw = `sprint-8a:${variant}:${difficulty}:${seedIndex}`;
      const attemptSeed = `pilot-${hashText(raw).slice(0, 48)}`;
      const questionSeed = `pilot-${sha256(`${attemptSeed}:1:0`).slice(0, 48)}`;
      const ast = generateVariantAst(
        contract,
        description,
        outcome?.grade ?? 9,
        difficulty,
        questionSeed,
      );
      const solved = solveVariantAst(contract, ast);
      let prompt = renderVariantPrompt(ast);
      let answerType: string | null = null;
      let optionLabels: readonly string[] = [];
      let correctOptionKey: string | null = null;
      let correctOptionLabel = solved.derivedResult;
      let visualType: string | null = null;
      let visualTemplate: string | null = null;
      let solutionSteps: readonly string[] = [];
      let feedback: string | null = null;
      let publicQuestion: AuditSample["publicQuestion"] = null;
      if (outcome) {
        const snapshot = generateSemanticPilotAttemptSnapshot({
          grade: outcome.grade as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
          unitId: unitId ?? "",
          outcomeId: outcome.id,
          attemptSeed,
          baseDifficulty: difficulty,
          selectionReason: "NO_EVIDENCE",
        });
        const question = snapshot.questions[0];
        const solution = snapshot.solutions[0];
        if (!question || !solution) throw new Error(`AUDIT_SNAPSHOT_EMPTY:${variant}`);
        prompt = question.prompt;
        answerType = question.answerType;
        optionLabels = question.options?.map((option) => option.label) ?? [];
        correctOptionKey = solution.correctAnswer;
        correctOptionLabel =
          question.options?.find((option) => option.key === solution.correctAnswer)?.label ??
          solution.correctAnswer;
        visualType = question.visual.type;
        visualTemplate = normalizeVisual(question.visual);
        solutionSteps = solution.solutionSteps;
        feedback = solution.feedback;
        publicQuestion = {
          questionId: question.questionId,
          position: question.position,
          prompt: question.prompt,
          answerType: question.answerType,
          options: question.options,
          visual: question.visual,
          cognitiveLevel: question.contract.difficulty,
        };
      }
      samples.push({
        sampleId: `${variant}:${difficulty}:${seedIndex}`,
        variant,
        difficulty,
        seedIndex,
        reproductionSeed: attemptSeed,
        seedFingerprint: hashText(raw).slice(0, 16),
        runtimeReachable,
        grade: outcome?.grade ?? null,
        outcomeId: outcome?.id ?? null,
        unitId,
        astKind: ast.kind,
        complexity: ast.complexity,
        prompt,
        normalizedTemplate: normalizeTemplate(prompt),
        answerType,
        optionLabels,
        correctOptionKey,
        correctOptionLabel,
        visualType,
        visualTemplate,
        solutionSteps,
        feedback,
        stemMathematicallyAnswerable:
          runtimeReachable && mathematicallyAnswerableStemVariants.has(variant),
        publicQuestion,
        productVerdict: verdictForVariant(variant, runtimeReachable),
      });
    }
  }
}

const variantResults = OUTCOME_SEMANTIC_VARIANTS.map((variant) => {
  const items = samples.filter((sample) => sample.variant === variant);
  const prompts = items.map((sample) => sample.prompt);
  const templates = items.map((sample) => sample.normalizedTemplate);
  let nearDuplicatePairs = 0;
  let comparedPairs = 0;
  for (let left = 0; left < prompts.length; left += 1) {
    for (let right = left + 1; right < prompts.length; right += 1) {
      comparedPairs += 1;
      if (jaccard(prompts[left] ?? "", prompts[right] ?? "") >= 0.85) {
        nearDuplicatePairs += 1;
      }
    }
  }
  const templateCounts = new Map<string, number>();
  for (const template of templates) {
    templateCounts.set(template, (templateCounts.get(template) ?? 0) + 1);
  }
  const answerKeyDistribution = Object.fromEntries(
    ["A", "B", "C", "D"].map((key) => [
      key,
      items.filter((sample) => sample.correctOptionKey === key).length,
    ]),
  );
  const byDifficulty = Object.fromEntries(
    difficulties.map((difficulty) => {
      const group = items.filter((sample) => sample.difficulty === difficulty);
      return [
        difficulty,
        {
          sampleCount: group.length,
          medianPromptLength: median(group.map((sample) => sample.prompt.length)),
          medianNumberCount: median(
            group.map((sample) => sample.prompt.match(/-?\d+(?:[.,]\d+)?/gu)?.length ?? 0),
          ),
          uniqueTemplates: new Set(group.map((sample) => sample.normalizedTemplate)).size,
          visualTypes: [...new Set(group.map((sample) => sample.visualType).filter(Boolean))],
          complexity: [...new Set(group.map((sample) => sample.complexity))],
        },
      ];
    }),
  );
  const verdict = items[0]?.productVerdict ?? verdictForVariant(variant, false);
  const result = {
    variant,
    runtimeReachable: items[0]?.runtimeReachable ?? false,
    representativeGrade: items[0]?.grade ?? null,
    representativeOutcomeId: items[0]?.outcomeId ?? null,
    representativeUnitId: items[0]?.unitId ?? null,
    sampleCount: items.length,
    exactDuplicateRate: 1 - new Set(prompts).size / Math.max(1, prompts.length),
    nearDuplicatePairRate: nearDuplicatePairs / Math.max(1, comparedPairs),
    uniqueTemplateCount: templateCounts.size,
    dominantTemplateRate:
      Math.max(0, ...templateCounts.values()) / Math.max(1, templates.length),
    operandSignatureDiversity:
      new Set(
        prompts.map((prompt) =>
          (prompt.match(/-?\d+(?:[.,]\d+)?/gu) ?? []).join("|"),
        ),
      ).size / Math.max(1, prompts.length),
    answerLabelDiversity:
      new Set(items.map((sample) => sample.correctOptionLabel)).size /
      Math.max(1, items.length),
    answerKeyDistribution,
    distractorTemplateDiversity:
      new Set(
        items.flatMap((sample) =>
          sample.optionLabels
            .filter((label) => label !== sample.correctOptionLabel)
            .map(normalizeTemplate),
        ),
      ).size /
      Math.max(
        1,
        items.reduce((sum, sample) => sum + Math.max(0, sample.optionLabels.length - 1), 0),
      ),
    visualTypeDiversity: new Set(items.map((sample) => sample.visualType).filter(Boolean)).size,
    visualTemplateDiversity: new Set(items.map((sample) => sample.visualTemplate).filter(Boolean)).size,
    linguisticTemplateDiversity: templateCounts.size / Math.max(1, items.length),
    difficulty: byDifficulty,
    productVerdict: verdict,
  };
  if (!verdict.usable) {
    const reproduction = items[0];
    writeFileSync(
      resolve(failureRoot, `${variant.toLowerCase()}.json`),
      `${JSON.stringify({
        variant,
        severity: verdict.severity,
        categories: verdict.categories,
        summary: verdict.summary,
        exactFiles: [
          "lib/generation-semantic/variant-engine.ts",
          "lib/curriculum/semantic-pilot-generation.ts",
          "lib/curriculum/on-demand-runtime.ts",
        ],
        functions: [
          "deriveVariant",
          "generateVariantAst",
          "solveVariantAst",
          "renderVariantPrompt",
          "generateSemanticPilotAttemptSnapshot",
        ],
        route: "/api/on-demand-curriculum/start",
        reproductionSeed: reproduction?.reproductionSeed ?? null,
        reproductionSeedFingerprint: reproduction?.seedFingerprint ?? null,
        reproductionSampleId: reproduction?.sampleId ?? null,
        sample: reproduction ?? null,
      }, null, 2)}\n`,
      "utf8",
    );
  }
  return result;
});

const gradeResults = Array.from({ length: 9 }, (_, index) => index + 1).map(
  (grade) => {
    const items = samples.filter((sample) => sample.grade === grade);
    return {
      grade,
      sampleCount: items.length,
      variantCount: new Set(items.map((sample) => sample.variant)).size,
      usable: items.filter((sample) => sample.productVerdict.usable).length,
      unusable: items.filter((sample) => !sample.productVerdict.usable).length,
      mathematicallyAnswerableStems: items.filter(
        (sample) => sample.stemMathematicallyAnswerable,
      ).length,
    };
  },
);

const usable = samples.filter((sample) => sample.productVerdict.usable).length;
const unusable = samples.length - usable;
const mathematicallyAnswerableStems = samples.filter(
  (sample) => sample.stemMathematicallyAnswerable,
).length;
const sampleIndex = {
  schemaVersion: 1,
  audit: "SPRINT_8A_GENERATOR_PRODUCT_AUDIT",
  generatedAt: new Date().toISOString(),
  policy: {
    variants: OUTCOME_SEMANTIC_VARIANTS.length,
    difficulties,
    seedsPerVariantPerDifficulty: samplesPerDifficulty,
    totalSamples: samples.length,
  },
  samples,
};
const diversity = {
  schemaVersion: 1,
  variantsWithRealOutcomes: variantResults.filter((item) => item.runtimeReachable).length,
  proofOnlyVariants: variantResults.filter((item) => !item.runtimeReachable).map((item) => item.variant),
  usable,
  unusable,
  mathematicallyAnswerableStems,
  usableRate: usable / samples.length,
  grades: gradeResults,
  variants: variantResults,
};

writeFileSync(
  resolve(artifactRoot, "sample-index.json"),
  `${JSON.stringify(sampleIndex, null, 2)}\n`,
  "utf8",
);
writeFileSync(
  resolve(artifactRoot, "diversity-analysis.json"),
  `${JSON.stringify(diversity, null, 2)}\n`,
  "utf8",
);

process.stdout.write(
  [
    "GENERATOR_PRODUCT_DIAGNOSTIC=PASS",
    `VARIANTS=${OUTCOME_SEMANTIC_VARIANTS.length}`,
    `RUNTIME_VARIANTS=${variantResults.filter((item) => item.runtimeReachable).length}`,
    `PROOF_ONLY_VARIANTS=${variantResults.filter((item) => !item.runtimeReachable).length}`,
    `SAMPLES=${samples.length}`,
    `USABLE=${usable}`,
    `UNUSABLE=${unusable}`,
    `MATHEMATICALLY_ANSWERABLE_STEMS=${mathematicallyAnswerableStems}`,
    "",
  ].join("\n"),
);
