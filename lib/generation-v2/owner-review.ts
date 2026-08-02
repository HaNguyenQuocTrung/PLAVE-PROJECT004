import {
  GENERATOR_V2_OUTCOME_REGISTRY,
  generateQuestion,
  publicQuestionOnly,
  type CanonicalResponse,
  type GeneratedProductQuestion,
  type ProductDifficulty,
  type PublicQuestionSnapshot,
} from "./index.ts";

const difficulties: readonly ProductDifficulty[] = ["EASY", "MEDIUM", "HARD"];

function domainFor(outcomeId: string) {
  if (outcomeId.includes("-NUM-")) return "NUMBERS_AND_OPERATIONS";
  if (outcomeId.includes("-NAA-")) return "ALGEBRA_AND_PREALGEBRA";
  if (outcomeId.includes("-GEO-")) return "GEOMETRY_AND_MEASUREMENT";
  if (outcomeId.includes("-STA-")) return "STATISTICS_AND_PROBABILITY";
  if (outcomeId.includes("-EXP-")) return "PRACTICE_AND_EXPERIENCE";
  throw new Error(`OWNER_REVIEW_DOMAIN_UNKNOWN:${outcomeId}`);
}

function reviewSeed(outcomeId: string, difficulty: ProductDifficulty, sampleNumber: number) {
  return `sprint8cf-owner-${outcomeId.toLowerCase()}-${difficulty.toLowerCase()}-${String(sampleNumber).padStart(2, "0")}`;
}

function incorrectResponse(question: GeneratedProductQuestion): CanonicalResponse {
  const interaction = question.publicSnapshot.interaction;
  const correct = question.privateSolution.correctResponse;
  if (["SINGLE_CHOICE", "CONSTRUCTION_OR_VISUAL_SELECTION"].includes(interaction.type)) {
    return interaction.options!.find((option) => option.id !== correct)!.id;
  }
  if (interaction.type === "MULTI_SELECT") {
    return [interaction.options!.find((option) => !(correct as string[]).includes(option.id))!.id];
  }
  if (interaction.type === "FRACTION_INPUT") return { numerator: 999, denominator: 1000 };
  if (interaction.type === "ORDERING") return [...(correct as string[])].reverse();
  if (interaction.type === "MATCHING") {
    const pairs = correct as readonly { leftId: string; rightId: string }[];
    return pairs.map((pair, index) => ({ leftId: pair.leftId, rightId: pairs[(index + 1) % pairs.length]!.rightId }));
  }
  return "999999";
}

export type OwnerReviewSampleSpec = Readonly<{
  sampleId: string;
  outcomeId: string;
  capabilityId: string;
  grade: number;
  difficulty: ProductDifficulty;
  sampleNumber: number;
  seed: string;
}>;

/**
 * The canonical public snapshot intentionally contains the mathematical data
 * needed to render a question. A few legacy coordinate visuals also carried
 * pre-computed fields named `solution`/`axis`. Those fields are not required by
 * the Owner review transport and would look like an answer key in browser
 * state, so the review surface derives its visuals from the public equations
 * instead.
 */
export function ownerReviewPublicQuestion(
  question: GeneratedProductQuestion,
): PublicQuestionSnapshot {
  const snapshot = publicQuestionOnly(question);
  const visualData = { ...snapshot.visual.data };
  delete visualData.solution;
  delete visualData.axis;
  return {
    ...snapshot,
    // Review rendering uses the prompt, typed interaction and visual model.
    // Generator fingerprints/task routing metadata are deliberately omitted
    // from the browser payload.
    publicData: {},
    visual: {
      ...snapshot.visual,
      data: visualData,
    },
  };
}

function buildSpec(outcomeId: string, capabilityId: string, grade: number, difficulty: ProductDifficulty, sampleNumber: number): OwnerReviewSampleSpec {
  return {
    sampleId: `${outcomeId}:${difficulty}:${sampleNumber}`,
    outcomeId,
    capabilityId,
    grade,
    difficulty,
    sampleNumber,
    seed: reviewSeed(outcomeId, difficulty, sampleNumber),
  };
}

export function buildFullOwnerReviewSampleSpecs() {
  const representatives = new Map<string, (typeof GENERATOR_V2_OUTCOME_REGISTRY)[number]>();
  for (const entry of GENERATOR_V2_OUTCOME_REGISTRY) if (!representatives.has(entry.variantId)) representatives.set(entry.variantId, entry);

  const specs = [...representatives.values()].map((entry, index) =>
    buildSpec(entry.outcomeId, entry.variantId, entry.grade, difficulties[index % difficulties.length]!, (index % 20) + 1)
  );
  const generatedById = new Map(specs.map((spec) => [spec.sampleId, generateQuestion({ outcomeId: spec.outcomeId, grade: spec.grade, difficulty: spec.difficulty, seed: spec.seed, locale: "vi-VN" })]));
  const observedInteractions = new Set([...generatedById.values()].map((question) => question.publicSnapshot.interaction.type));
  const requiredInteractions = new Set(GENERATOR_V2_OUTCOME_REGISTRY.flatMap((entry) => [...entry.interactionPolicy]));

  // One sample represents every canonical capability. Only add a small
  // supplement when the representative selection does not exercise an actual
  // interaction surface used by the complete registry.
  for (const interaction of requiredInteractions) {
    if (observedInteractions.has(interaction)) continue;
    let found = false;
    for (const entry of representatives.values()) {
      if (!entry.interactionPolicy.some((candidate) => candidate === interaction)) continue;
      for (const difficulty of difficulties) {
        for (let sampleNumber = 1; sampleNumber <= 20; sampleNumber += 1) {
          const spec = buildSpec(entry.outcomeId, entry.variantId, entry.grade, difficulty, sampleNumber);
          const question = generateQuestion({ outcomeId: spec.outcomeId, grade: spec.grade, difficulty, seed: spec.seed, locale: "vi-VN" });
          if (question.publicSnapshot.interaction.type !== interaction) continue;
          if (!generatedById.has(spec.sampleId)) specs.push(spec);
          generatedById.set(spec.sampleId, question);
          observedInteractions.add(interaction);
          found = true;
          break;
        }
        if (found) break;
      }
      if (found) break;
    }
    if (!found) throw new Error(`OWNER_REVIEW_INTERACTION_NOT_GENERATED:${interaction}`);
  }

  return specs;
}

export function buildFullOwnerReviewManifestSamples() {
  return buildFullOwnerReviewSampleSpecs().map((spec) => {
    const entry = GENERATOR_V2_OUTCOME_REGISTRY.find((candidate) => candidate.outcomeId === spec.outcomeId)!;
    const question = generateQuestion({ outcomeId: spec.outcomeId, grade: spec.grade, difficulty: spec.difficulty, seed: spec.seed, locale: "vi-VN" });
    return {
      ...spec,
      domain: domainFor(spec.outcomeId),
      curriculumDescription: entry.outcomeTitle,
      expectedSkill: entry.outcomeTitle,
      interactionType: question.publicSnapshot.interaction.type,
      visualType: question.publicSnapshot.visual.type,
      publicSnapshot: ownerReviewPublicQuestion(question),
      reviewUrl: `/internal/generator-v2-owner-review#${encodeURIComponent(spec.sampleId)}`,
      reviewState: "UNREVIEWED",
      ownerDecision: null,
      ownerNote: "",
    } as const;
  });
}

export function generateOwnerReviewQuestion(sampleId: string) {
  const spec = buildFullOwnerReviewSampleSpecs().find((candidate) => candidate.sampleId === sampleId);
  if (!spec) return null;
  return generateQuestion({ outcomeId: spec.outcomeId, grade: spec.grade, difficulty: spec.difficulty, seed: spec.seed, locale: "vi-VN" });
}

export { incorrectResponse as ownerReviewIncorrectResponse };
