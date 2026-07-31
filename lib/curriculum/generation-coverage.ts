import inventoryJson from "../../docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json" with {
  type: "json",
};

import { generatePreviewUnit } from "./engine.ts";
import { curriculumUnits } from "./registry.ts";
import type {
  PreviewAudit,
  PreviewQuestion,
  PreviewSolution,
  PreviewUnitDraft,
} from "./types.ts";

export const generationCoverageSeeds = [
  "outcome-audit-alpha",
  "outcome-audit-bravo",
  "outcome-audit-charlie",
  "outcome-audit-delta",
] as const;

export type OutcomeGenerationClassification =
  | "TRUE_PARAMETRIC"
  | "MATERIALIZED_ONLY"
  | "INSUFFICIENT_STRATEGY";

type InventoryOutcome = Readonly<{
  id: string;
  grade: number;
  mappedUnitIds: readonly string[];
  implementationEvidence?: Readonly<{
    primaryQuestionCodes: readonly string[];
    questionEvidenceForms: readonly string[];
  }>;
}>;

type Inventory = Readonly<{
  totalOfficialOutcomes: number;
  outcomes: readonly InventoryOutcome[];
}>;

type QuestionVariant = Readonly<{
  question: PreviewQuestion;
  solution: PreviewSolution;
  audit: PreviewAudit;
}>;

export type OutcomeGenerationCoverage = Readonly<{
  outcomeId: string;
  grade: number;
  classification: OutcomeGenerationClassification;
  mappedUnitIds: readonly string[];
  questionCodes: readonly string[];
  evidenceForms: readonly string[];
  deterministicReplay: boolean;
  completeQuestionMapping: boolean;
  variantQuestionCount: number;
  reasonCodes: readonly string[];
}>;

export type GenerationCoverageReport = Readonly<{
  totalOutcomes: number;
  trueParametricOutcomes: number;
  materializedOnlyOutcomes: number;
  insufficientStrategyOutcomes: number;
  byGrade: readonly Readonly<{
    grade: number;
    total: number;
    trueParametric: number;
    materializedOnly: number;
    insufficientStrategy: number;
  }>[];
  outcomes: readonly OutcomeGenerationCoverage[];
}>;

const inventory = inventoryJson as Inventory;
const unitBySlug = new Map(curriculumUnits.map((unit) => [unit.slug, unit]));

function serialize(value: unknown) {
  return JSON.stringify(value);
}

function getVariant(
  drafts: ReadonlyMap<string, PreviewUnitDraft>,
  questionCode: string,
): QuestionVariant | null {
  for (const draft of drafts.values()) {
    const questionIndex = draft.questions.findIndex(
      (question) => question.code === questionCode,
    );
    if (questionIndex < 0) continue;
    const question = draft.questions[questionIndex];
    const solution = draft.solutions[questionIndex];
    const audit = draft.audits[questionIndex];
    if (
      !question ||
      !solution ||
      !audit ||
      solution.questionCode !== questionCode ||
      audit.questionCode !== questionCode
    ) {
      return null;
    }
    return { question, solution, audit };
  }
  return null;
}

function hasParameterImpact(variants: readonly QuestionVariant[]) {
  const parameterVariants = new Set(
    variants.map((variant) => serialize(variant.audit.parameters)),
  );
  if (parameterVariants.size < 2) return false;

  const publicSemantics = new Set(
    variants.map((variant) =>
      serialize({
        prompt: variant.question.prompt,
        visual: variant.question.visual,
      }),
    ),
  );
  const privateSemantics = new Set(
    variants.map((variant) =>
      serialize({
        correctAnswer: variant.solution.correctAnswer,
        steps: variant.solution.steps,
        feedback: variant.solution.feedback,
      }),
    ),
  );

  return publicSemantics.size >= 2 && privateSemantics.size >= 2;
}

function classifyOutcome(
  outcome: InventoryOutcome,
  draftsBySeed: ReadonlyMap<
    string,
    ReadonlyMap<string, PreviewUnitDraft>
  >,
): OutcomeGenerationCoverage {
  const reasonCodes: string[] = [];
  const questionCodes = [
    ...new Set(
      outcome.implementationEvidence?.primaryQuestionCodes ?? [],
    ),
  ];
  const evidenceForms = [
    ...new Set(
      outcome.implementationEvidence?.questionEvidenceForms ?? [],
    ),
  ];
  const unknownUnit = outcome.mappedUnitIds.some(
    (unitSlug) => !unitBySlug.has(unitSlug),
  );
  if (unknownUnit) reasonCodes.push("UNKNOWN_MAPPED_UNIT");
  if (questionCodes.length === 0) {
    reasonCodes.push("NO_PRIMARY_QUESTION_MAPPING");
  }
  if (evidenceForms.length < 2) {
    reasonCodes.push("INSUFFICIENT_EVIDENCE_FORMS");
  }

  const firstSeed = generationCoverageSeeds[0];
  const firstDrafts = draftsBySeed.get(firstSeed);
  let completeQuestionMapping = Boolean(firstDrafts);
  let deterministicReplay = true;
  let variantQuestionCount = 0;

  for (const questionCode of questionCodes) {
    const variants = generationCoverageSeeds
      .map((seed) => {
        const drafts = draftsBySeed.get(seed);
        return drafts ? getVariant(drafts, questionCode) : null;
      })
      .filter((variant): variant is QuestionVariant => variant !== null);
    if (variants.length !== generationCoverageSeeds.length) {
      completeQuestionMapping = false;
      continue;
    }

    const replayDrafts = new Map(
      outcome.mappedUnitIds
        .filter((unitSlug) => unitBySlug.has(unitSlug))
        .map((unitSlug) => [
          unitSlug,
          generatePreviewUnit(unitSlug, firstSeed),
        ]),
    );
    const replay = getVariant(replayDrafts, questionCode);
    if (!replay || serialize(replay) !== serialize(variants[0])) {
      deterministicReplay = false;
    }
    if (hasParameterImpact(variants)) variantQuestionCount += 1;
  }

  if (!completeQuestionMapping) {
    reasonCodes.push("INCOMPLETE_QUESTION_MAPPING");
  }
  if (!deterministicReplay) {
    reasonCodes.push("NON_DETERMINISTIC_REPLAY");
  }
  if (
    questionCodes.length > 0 &&
    variantQuestionCount < questionCodes.length
  ) {
    reasonCodes.push("STATIC_OR_SUPERFICIAL_VARIANT");
  }

  const safeFoundation =
    !unknownUnit &&
    completeQuestionMapping &&
    deterministicReplay &&
    evidenceForms.length >= 2;
  const classification: OutcomeGenerationClassification =
    safeFoundation && variantQuestionCount === questionCodes.length
      ? "TRUE_PARAMETRIC"
      : safeFoundation && variantQuestionCount === 0
        ? "MATERIALIZED_ONLY"
        : "INSUFFICIENT_STRATEGY";

  return {
    outcomeId: outcome.id,
    grade: outcome.grade,
    classification,
    mappedUnitIds: outcome.mappedUnitIds,
    questionCodes,
    evidenceForms,
    deterministicReplay,
    completeQuestionMapping,
    variantQuestionCount,
    reasonCodes,
  };
}

export function auditOutcomeGenerationCoverage(): GenerationCoverageReport {
  const draftsBySeed = new Map(
    generationCoverageSeeds.map((seed) => [
      seed,
      new Map(
        curriculumUnits.map((unit) => [
          unit.slug,
          generatePreviewUnit(unit.slug, seed),
        ]),
      ),
    ]),
  );
  const outcomes = inventory.outcomes.map((outcome) =>
    classifyOutcome(outcome, draftsBySeed),
  );

  return {
    totalOutcomes: outcomes.length,
    trueParametricOutcomes: outcomes.filter(
      (outcome) => outcome.classification === "TRUE_PARAMETRIC",
    ).length,
    materializedOnlyOutcomes: outcomes.filter(
      (outcome) => outcome.classification === "MATERIALIZED_ONLY",
    ).length,
    insufficientStrategyOutcomes: outcomes.filter(
      (outcome) =>
        outcome.classification === "INSUFFICIENT_STRATEGY",
    ).length,
    byGrade: Array.from({ length: 9 }, (_, index) => index + 1).map(
      (grade) => {
        const gradeOutcomes = outcomes.filter(
          (outcome) => outcome.grade === grade,
        );
        return {
          grade,
          total: gradeOutcomes.length,
          trueParametric: gradeOutcomes.filter(
            (outcome) =>
              outcome.classification === "TRUE_PARAMETRIC",
          ).length,
          materializedOnly: gradeOutcomes.filter(
            (outcome) =>
              outcome.classification === "MATERIALIZED_ONLY",
          ).length,
          insufficientStrategy: gradeOutcomes.filter(
            (outcome) =>
              outcome.classification === "INSUFFICIENT_STRATEGY",
          ).length,
        };
      },
    ),
    outcomes,
  };
}

export function getOfficialOutcomeInventoryCount() {
  return inventory.totalOfficialOutcomes;
}
