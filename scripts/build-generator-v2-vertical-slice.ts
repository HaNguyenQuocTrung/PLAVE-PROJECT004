import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  PRODUCT_VARIANT_REGISTRY,
  assertPublicBoundary,
  generateQuestion,
  publicQuestionOnly,
  verifyQuestionIntegrity,
} from "../lib/generation-v2/index.ts";

const root = process.cwd();
if (!root.endsWith("/PLAVE-PROJECT004")) throw new Error("PROJECT004_ROOT_REQUIRED");
const output = resolve(root, "artifacts/generator-v2-vertical-slice");
const failureRoot = resolve(output, "failure-cases");
const screenshotRoot = resolve(output, "screenshots");
mkdirSync(failureRoot, { recursive: true });
mkdirSync(screenshotRoot, { recursive: true });

const difficulties = ["EASY", "MEDIUM", "HARD"] as const;
const sampleIndex: unknown[] = [];
type DifficultySummary = {
  difficulty: (typeof difficulties)[number];
  samples: number;
  exactUnique: number;
  exactDuplicateRate: number;
  structuralSignatures: string[];
};
type DiversityGates = {
  exactDuplicateRate: boolean;
  nearDuplicatePairRate: boolean;
  dominantTemplateRate: boolean;
  difficultyStructuralSeparation: boolean;
  answerDistribution: boolean;
  deterministicReplay: boolean;
};
type DiversityVariant = {
  variantId: string;
  outcomeId: string;
  grade: number;
  samples: number;
  exactDuplicateRate: number;
  nearDuplicatePairRate: number;
  nearDuplicateThreshold: number;
  uniqueLinguisticTemplates: number;
  dominantTemplateRate: number;
  dominantAnswerRate: number;
  byDifficulty: DifficultySummary[];
  gates: DiversityGates;
  pass: boolean;
};
const diversityVariants: DiversityVariant[] = [];
let totalSamples = 0;

function contentFingerprint(snapshot: ReturnType<typeof publicQuestionOnly>) {
  return JSON.stringify({
    prompt: snapshot.publicPrompt,
    data: snapshot.publicData,
    interaction: snapshot.interaction,
    visual: snapshot.visual,
  });
}

function nearTemplate(prompt: string) {
  return prompt
    .toLocaleLowerCase("vi")
    .replace(/-?\d+(?:[.,]\d+)?/gu, "#")
    .replace(/\s+/gu, " ")
    .trim();
}

for (const entry of PRODUCT_VARIANT_REGISTRY) {
  const allContent = new Set<string>();
  const templateCounts = new Map<string, number>();
  const answerCounts = new Map<string, number>();
  const byDifficulty: DifficultySummary[] = [];
  for (const difficulty of difficulties) {
    const structural = new Set<string>();
    const content = new Set<string>();
    for (let index = 1; index <= 100; index += 1) {
      const seed = `sprint8b-${entry.variantId.toLowerCase().replaceAll("_", "-")}-${difficulty.toLowerCase()}-${String(index).padStart(3, "0")}`;
      const generated = generateQuestion({ outcomeId: entry.outcomeId, grade: entry.grade, difficulty, seed, locale: "vi-VN" });
      verifyQuestionIntegrity(generated);
      assertPublicBoundary(publicQuestionOnly(generated));
      const snapshot = publicQuestionOnly(generated);
      const exact = contentFingerprint(snapshot);
      content.add(exact);
      allContent.add(`${difficulty}:${exact}`);
      const template = nearTemplate(snapshot.publicPrompt);
      templateCounts.set(template, (templateCounts.get(template) ?? 0) + 1);
      structural.add(JSON.stringify({
        difficultyStructure: snapshot.publicData.difficultyStructure,
        interaction: snapshot.interaction.type,
        task: snapshot.publicData.task ?? snapshot.publicData.query ?? snapshot.publicData.relation ?? snapshot.publicData.unknown ?? snapshot.publicData.rule,
        visual: snapshot.visual.type,
      }));
      const interactionOptions = snapshot.interaction.options ?? [];
      const correct = generated.privateSolution.correctResponse;
      const answer = (snapshot.interaction.type === "SINGLE_CHOICE" || snapshot.interaction.type === "CONSTRUCTION_OR_VISUAL_SELECTION")
        ? `POSITION_${interactionOptions.findIndex((option) => option.id === String(correct))}`
        : snapshot.interaction.type === "MULTI_SELECT" && Array.isArray(correct)
          ? `POSITIONS_${correct.map((id) => interactionOptions.findIndex((option) => option.id === id)).sort().join("_")}`
          : JSON.stringify(correct);
      answerCounts.set(answer, (answerCounts.get(answer) ?? 0) + 1);
      totalSamples += 1;
      if (index <= 3) {
        sampleIndex.push({
          sampleId: `${entry.variantId}:${difficulty}:${index}`,
          outcomeId: entry.outcomeId,
          unitId: entry.unitId,
          grade: entry.grade,
          difficulty,
          variantId: entry.variantId,
          reproductionSeed: seed,
          publicSnapshot: snapshot,
          publicSnapshotHash: generated.provenance.publicSnapshotHash,
        });
      }
      const replay = generateQuestion({ outcomeId: entry.outcomeId, grade: entry.grade, difficulty, seed, locale: "vi-VN" });
      if (JSON.stringify(generated) !== JSON.stringify(replay)) throw new Error(`NON_DETERMINISTIC:${entry.variantId}:${seed}`);
    }
    byDifficulty.push({ difficulty, samples: 100, exactUnique: content.size, exactDuplicateRate: 1 - content.size / 100, structuralSignatures: [...structural] });
  }
  const totalPairs = 300 * 299 / 2;
  const nearPairs = [...templateCounts.values()].reduce((sum, count) => sum + count * (count - 1) / 2, 0);
  const dominantTemplateRate = Math.max(...templateCounts.values()) / 300;
  const dominantAnswerRate = Math.max(...answerCounts.values()) / 300;
  const exactDuplicateRate = 1 - allContent.size / 300;
  const nearDuplicatePairRate = nearPairs / totalPairs;
  const structuralSeparation = byDifficulty.every((item, index) => byDifficulty.every((other, otherIndex) => index === otherIndex || item.structuralSignatures.every((signature) => !other.structuralSignatures.includes(signature))));
  const gates = {
    exactDuplicateRate: exactDuplicateRate === 0,
    nearDuplicatePairRate: nearDuplicatePairRate <= 0.12,
    dominantTemplateRate: dominantTemplateRate <= 0.15,
    difficultyStructuralSeparation: structuralSeparation,
    answerDistribution: dominantAnswerRate <= 0.35,
    deterministicReplay: true,
  };
  diversityVariants.push({
    variantId: entry.variantId,
    outcomeId: entry.outcomeId,
    grade: entry.grade,
    samples: 300,
    exactDuplicateRate,
    nearDuplicatePairRate,
    nearDuplicateThreshold: 0.12,
    uniqueLinguisticTemplates: templateCounts.size,
    dominantTemplateRate,
    dominantAnswerRate,
    byDifficulty,
    gates,
    pass: Object.values(gates).every(Boolean),
  });
}

const oldVariants = JSON.parse(readFileSync(resolve(root, "artifacts/generator-product-audit/diversity-analysis.json"), "utf8")) as { variants: readonly { variant: string; runtimeReachable: boolean }[] };
const replacements: Record<string, string> = {
  ADDITION_SUBTRACTION: "ADD_SUB_MEANING",
  MULTIPLICATION_DIVISION: "MULTIPLY_DIVIDE_FACTS",
  PLACE_VALUE: "PLACE_VALUE_COMPARE",
  FRACTION_RECOGNITION: "FRACTION_PART_WHOLE",
  EQUATION_SOLVING: "LINEAR_SYSTEM",
  SHAPE_PROPERTIES: "GEOMETRY_PROPERTIES",
  UNIT_CONVERSION: "UNIT_CONVERSION",
  AREA: "PERIMETER_AREA",
  CHART_INTERPRETATION: "CHART_DATA_INTERPRETATION",
  EXPERIMENTAL_PROBABILITY: "EXPERIMENTAL_PROBABILITY",
  ONE_STEP_CONTEXT: "APPLIED_TWO_STEP",
};
const duplicates: Record<string, string> = { PERIMETER: "PERIMETER_AREA", TABLE_INTERPRETATION: "CHART_DATA_INTERPRETATION", DATA_COMPARISON: "CHART_DATA_INTERPRETATION", THEORETICAL_PROBABILITY: "EXPERIMENTAL_PROBABILITY" };
const migrationMap = oldVariants.variants.map((item) => {
  if (!item.runtimeReachable) return { legacyVariantId: item.variant, status: "SYNTHETIC_WITHOUT_OUTCOME", productCoverage: false, replacement: item.variant === "ERROR_DETECTION" ? "DATA_ERROR_REASONING" : null };
  if (replacements[item.variant]) return { legacyVariantId: item.variant, status: "REPLACED_BY_CANONICAL_VARIANT", productCoverage: false, replacement: replacements[item.variant] };
  if (duplicates[item.variant]) return { legacyVariantId: item.variant, status: "DUPLICATE_SEMANTICS", productCoverage: false, replacement: duplicates[item.variant] };
  if (item.variant === "DIVISIBILITY") return { legacyVariantId: item.variant, status: "UNSAFE_OR_INVALID", productCoverage: false, replacement: null };
  return { legacyVariantId: item.variant, status: "REAL_OUTCOME_MAPPED", productCoverage: false, replacement: null };
});

const diversity = {
  schemaVersion: 1,
  generatorVersion: "plave-generator-v2.0.0",
  sampleCount: totalSamples,
  policy: {
    exactDuplicateRate: "0 inside each 100-seed variant/difficulty batch",
    nearDuplicateDefinition: "pair shares Vietnamese prompt after numbers are normalized",
    nearDuplicatePairRateMaximum: 0.12,
    dominantTemplateRateMaximum: 0.15,
    dominantAnswerRateMaximum: 0.35,
    difficulty: "structural signatures must not overlap between EASY, MEDIUM and HARD",
  },
  variants: diversityVariants,
  pass: diversityVariants.every((item) => item.pass),
};
writeFileSync(resolve(output, "sample-index.json"), `${JSON.stringify({ schemaVersion: 1, samples: sampleIndex }, null, 2)}\n`);
writeFileSync(resolve(output, "diversity.json"), `${JSON.stringify(diversity, null, 2)}\n`);
writeFileSync(resolve(output, "variant-migration-map.json"), `${JSON.stringify({ schemaVersion: 1, legacyVariantCount: migrationMap.length, canonicalProductVariantCount: 12, entries: migrationMap }, null, 2)}\n`);
writeFileSync(resolve(failureRoot, "negative-controls.json"), `${JSON.stringify({ status: "COVERED_BY_TEST", controls: ["PROMPT_SOLVER_MISMATCH", "TWO_VALID_ANSWERS", "DIVIDE_BY_ZERO", "FRACTION_NOT_NORMALIZED", "UNIT_MISMATCH", "GEOMETRY_VISUAL_MISMATCH", "CHART_LABEL_MISMATCH", "DIFFICULTY_RELABEL", "FAMILY_RELABEL", "OUT_OF_GRADE_PARAMETER", "DUPLICATE_DISTRACTOR"] }, null, 2)}\n`);
console.log(`GENERATOR_V2_SAMPLES=${totalSamples}`);
console.log(`DIVERSITY_PASS=${diversity.pass ? "YES" : "NO"}`);
for (const item of diversityVariants) if (!item.pass) console.log(`FAILED_VARIANT=${item.variantId}:${JSON.stringify(item.gates)}`);
