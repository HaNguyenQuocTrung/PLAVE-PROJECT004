import { createHash } from "node:crypto";

import inventoryJson from "../../docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json" with {
  type: "json",
};

import { generatePreviewUnit } from "./engine.ts";
import {
  auditOutcomeGenerationCoverage,
} from "./generation-coverage.ts";
import { getCurriculumUnit } from "./registry.ts";
import type {
  CurriculumGrade,
  PreviewAudit,
  PreviewQuestion,
  PreviewSolution,
} from "./types.ts";
import {
  buildUniversalCurriculumRelease,
  canonicalJson,
  normalizeCurriculumAnswer,
  sha256,
  UNIVERSAL_CURRICULUM_GENERATOR_VERSION,
  UNIVERSAL_CURRICULUM_RELEASE_ID,
} from "../curriculum-runtime/release.ts";
import {
  buildOutcomeSemanticContract,
  OUTCOME_VARIANT_VERSION,
} from "../generation-semantic/variant-engine.ts";
import type {
  OutcomeDescriptor,
} from "../generation-semantic/engine.ts";

export const ON_DEMAND_GENERATION_CONTRACT_VERSION =
  "on-demand-curriculum-v1" as const;
export const ON_DEMAND_QUESTION_COUNT = 12;

export type OnDemandSelectionReason =
  | "NO_EVIDENCE"
  | "FREQUENT_ERRORS"
  | "WEAK_RECENT_EVIDENCE"
  | "PREREQUISITE_NOT_SECURE"
  | "RETENTION_DUE"
  | "TEACHER_DETERMINISTIC"
  | "STUDENT_UNIT_CHOICE";

type InventoryOutcome = Readonly<{
  id: string;
  grade: number;
  officialStrand: string;
  subdomain?: string;
  conciseParaphrase: string;
  mappedUnitIds: readonly string[];
  implementationEvidence?: Readonly<{
    primaryQuestionCodes: readonly string[];
  }>;
}>;

export const ON_DEMAND_DIFFICULTY_POLICY_VERSION =
  "HEURISTIC_DIFFICULTY_V1" as const;

export type OnDemandSemanticProvenance = Readonly<{
  semanticVariantId: string;
  semanticVariantVersion: typeof OUTCOME_VARIANT_VERSION;
  solverVersion: string;
  solverReceiptHash: string;
  difficultyPolicyVersion: typeof ON_DEMAND_DIFFICULTY_POLICY_VERSION;
  seedFingerprint: string;
  astHash: string;
  visualHash: string;
}>;

type Inventory = Readonly<{
  outcomes: readonly InventoryOutcome[];
}>;

export type OnDemandGenerationContract = Readonly<{
  contractVersion: typeof ON_DEMAND_GENERATION_CONTRACT_VERSION;
  grade: CurriculumGrade;
  unitId: string;
  outcomeId: string;
  skillId: string;
  skillTitle: string;
  difficulty: PreviewQuestion["cognitiveLevel"];
  evidenceForm: NonNullable<PreviewAudit["evidenceForm"]>;
  seed: string;
  generatorVersion: typeof UNIVERSAL_CURRICULUM_GENERATOR_VERSION;
  releaseId: typeof UNIVERSAL_CURRICULUM_RELEASE_ID;
  contentReleaseHash: string;
}>;

export type OnDemandPublicQuestion = Readonly<{
  questionId: string;
  position: number;
  contract: OnDemandGenerationContract;
  prompt: string;
  answerType: PreviewQuestion["answerType"];
  options: PreviewQuestion["options"];
  visual: PreviewQuestion["visual"];
  misconceptionTags: PreviewQuestion["misconceptionTags"];
  provenance: OnDemandSemanticProvenance;
  publicPayloadHash: string;
}>;

export type OnDemandPrivateSolution = Readonly<{
  questionId: string;
  normalizedCorrectAnswer: string;
  correctAnswer: string;
  solutionSteps: PreviewSolution["steps"];
  feedback: string;
  privatePayloadHash: string;
}>;

export type OnDemandAttemptSnapshot = Readonly<{
  schemaVersion: 1;
  releaseId: typeof UNIVERSAL_CURRICULUM_RELEASE_ID;
  contentReleaseHash: string;
  generatorVersion: typeof UNIVERSAL_CURRICULUM_GENERATOR_VERSION;
  grade: CurriculumGrade;
  unitId: string;
  attemptSeed: string;
  selectionReason: OnDemandSelectionReason;
  questions: readonly OnDemandPublicQuestion[];
  solutions: readonly OnDemandPrivateSolution[];
  snapshotHash: string;
}>;

type EligibleTemplate = Readonly<{
  outcome: InventoryOutcome;
  questionCode: string;
}>;

const inventory = inventoryJson as Inventory;
const release = buildUniversalCurriculumRelease();
const contentReleaseHash = release.hashes.bundleSha256;
const coverage = auditOutcomeGenerationCoverage();
const trueParametricOutcomeIds = new Set(
  coverage.outcomes
    .filter(
      (outcome) => outcome.classification === "TRUE_PARAMETRIC",
    )
    .map((outcome) => outcome.outcomeId),
);
const inventoryOutcomes = new Map(
  inventory.outcomes.map((outcome) => [outcome.id, outcome]),
);
const releaseQuestions = new Map(
  release.questions.map((question) => [question.questionId, question]),
);

function safeSeed(seed: string) {
  return /^[a-z0-9][a-z0-9-]{2,80}$/.test(seed);
}

function stableIndex(value: string, length: number) {
  const digest = createHash("sha256").update(value).digest();
  return digest.readUInt32BE(0) % length;
}

function generatedQuestionId(
  unitId: string,
  seed: string,
  questionCode: string,
  position: number,
) {
  const suffix = createHash("sha256")
    .update(`${unitId}:${seed}:${questionCode}:${position}`)
    .digest("hex")
    .slice(0, 20);
  return `${unitId}-g-${suffix}`;
}

function derivedSeed(
  attemptSeed: string,
  position: number,
  collisionRetry = 0,
) {
  const suffix = createHash("sha256")
    .update(`${attemptSeed}:${position}:${collisionRetry}`)
    .digest("hex")
    .slice(0, 16);
  return `od-${suffix}`;
}

function templatesForUnit(unitId: string): EligibleTemplate[] {
  return inventory.outcomes.flatMap((outcome) => {
    if (
      !trueParametricOutcomeIds.has(outcome.id) ||
      !outcome.mappedUnitIds.includes(unitId)
    ) {
      return [];
    }
    return (
      outcome.implementationEvidence?.primaryQuestionCodes
        .filter((questionCode) => questionCode.startsWith(`${unitId}-q`))
        .map((questionCode) => ({
          outcome,
          questionCode,
        })) ?? []
    );
  });
}

function findGeneratedParts(
  unitId: string,
  seed: string,
  questionCode: string,
) {
  const draft = generatePreviewUnit(unitId, seed);
  const index = draft.questions.findIndex(
    (question) => question.code === questionCode,
  );
  const question = draft.questions[index];
  const solution = draft.solutions[index];
  const audit = draft.audits[index];
  if (
    index < 0 ||
    !question ||
    !solution ||
    !audit ||
    solution.questionCode !== questionCode ||
    audit.questionCode !== questionCode ||
    !audit.evidenceForm
  ) {
    throw new Error("ON_DEMAND_GENERATION:UNSAFE_TEMPLATE");
  }
  return {
    question,
    solution,
    audit,
    evidenceForm: audit.evidenceForm,
  };
}

function buildSemanticProvenance(input: Readonly<{
  outcome: InventoryOutcome;
  questionSeed: string;
  contract: OnDemandGenerationContract;
  question: PreviewQuestion;
  solution: PreviewSolution;
}>) {
  const descriptor: OutcomeDescriptor = {
    id: input.outcome.id,
    grade: input.outcome.grade,
    strand: input.outcome.officialStrand,
    subdomain: input.outcome.subdomain ?? "",
    description: input.outcome.conciseParaphrase,
  };
  const semanticContract = buildOutcomeSemanticContract(descriptor);
  const ast = {
    contract: input.contract,
    prompt: input.question.prompt,
    answerType: input.question.answerType,
    options: input.question.options,
    visual: input.question.visual,
  };
  const solverReceipt = {
    solverVersion: semanticContract.expectedSolver,
    variant: semanticContract.expectedVariant,
    outcomeId: input.outcome.id,
    normalizedCorrectAnswer: normalizeCurriculumAnswer(
      input.solution.correctAnswer,
    ),
    steps: input.solution.steps,
  };
  return {
    semanticVariantId: semanticContract.expectedVariant,
    semanticVariantVersion: OUTCOME_VARIANT_VERSION,
    solverVersion: semanticContract.expectedSolver,
    solverReceiptHash: sha256(solverReceipt),
    difficultyPolicyVersion: ON_DEMAND_DIFFICULTY_POLICY_VERSION,
    seedFingerprint: sha256(input.questionSeed).slice(0, 16),
    astHash: sha256(ast),
    visualHash: sha256(input.question.visual),
  } satisfies OnDemandSemanticProvenance;
}

export function isTrueParametricOutcome(outcomeId: string) {
  return trueParametricOutcomeIds.has(outcomeId);
}

export function getOnDemandContentReleaseHash() {
  return contentReleaseHash;
}

export function generateOnDemandAttemptSnapshot(input: Readonly<{
  grade: CurriculumGrade;
  unitId: string;
  seed: string;
  selectionReason: OnDemandSelectionReason;
  preferredOutcomeIds?: readonly string[];
}>): OnDemandAttemptSnapshot {
  if (!safeSeed(input.seed)) {
    throw new Error("ON_DEMAND_GENERATION:INVALID_SEED");
  }
  const unit = getCurriculumUnit(input.unitId);
  if (!unit || unit.grade !== input.grade) {
    throw new Error("ON_DEMAND_GENERATION:GRADE_UNIT_MISMATCH");
  }

  const preferred = new Set(input.preferredOutcomeIds ?? []);
  if (
    [...preferred].some(
      (outcomeId) =>
        !unit.officialOutcomeIds.includes(outcomeId) ||
        !isTrueParametricOutcome(outcomeId),
    )
  ) {
    throw new Error("ON_DEMAND_GENERATION:UNSAFE_OUTCOME");
  }
  const allTemplates = templatesForUnit(unit.slug);
  const preferredTemplates =
    preferred.size > 0
      ? allTemplates.filter((template) => preferred.has(template.outcome.id))
      : [];
  if (
    allTemplates.length === 0 ||
    (preferred.size > 0 && preferredTemplates.length === 0)
  ) {
    throw new Error("ON_DEMAND_GENERATION:NO_SAFE_STRATEGY");
  }

  const questions: OnDemandPublicQuestion[] = [];
  const solutions: OnDemandPrivateSolution[] = [];
  const publicSemanticKeys = new Set<string>();
  for (let index = 0; index < ON_DEMAND_QUESTION_COUNT; index += 1) {
    const position = index + 1;
    let accepted = false;
    for (let collisionRetry = 0; collisionRetry < 64; collisionRetry += 1) {
      const questionSeed = derivedSeed(
        input.seed,
        position,
        collisionRetry,
      );
      const candidateTemplates =
        preferredTemplates.length > 0 &&
        position <= Math.ceil(ON_DEMAND_QUESTION_COUNT / 2) &&
        collisionRetry < 32
          ? preferredTemplates
          : allTemplates;
      const template =
        candidateTemplates[
          stableIndex(
            `${input.seed}:${position}:${collisionRetry}:template`,
            candidateTemplates.length,
          )
        ];
      if (!template) {
        throw new Error("ON_DEMAND_GENERATION:NO_SAFE_STRATEGY");
      }
      const { question, solution, audit, evidenceForm } = findGeneratedParts(
        unit.slug,
        questionSeed,
        template.questionCode,
      );
      if (
        audit.primaryOfficialOutcomeId !== template.outcome.id ||
        !unit.skillFamilies.includes(question.skillFamily)
      ) {
        throw new Error("ON_DEMAND_GENERATION:MAPPING_DRIFT");
      }
      const releaseQuestion = releaseQuestions.get(template.questionCode);
      if (
        !releaseQuestion ||
        releaseQuestion.unitId !== unit.slug ||
        releaseQuestion.skillId !== question.skillFamily ||
        !releaseQuestion.officialOutcomeIds.includes(template.outcome.id)
      ) {
        throw new Error("ON_DEMAND_GENERATION:MAPPING_DRIFT");
      }
      const semanticKey = canonicalJson({
        prompt: question.prompt,
        visual: question.visual,
      });
      if (publicSemanticKeys.has(semanticKey)) continue;

      const questionId = generatedQuestionId(
        unit.slug,
        questionSeed,
        template.questionCode,
        position,
      );
      const contract: OnDemandGenerationContract = {
        contractVersion: ON_DEMAND_GENERATION_CONTRACT_VERSION,
        grade: input.grade,
        unitId: unit.slug,
        outcomeId: template.outcome.id,
        skillId: question.skillFamily,
        skillTitle: releaseQuestion.skillTitle,
        difficulty: question.cognitiveLevel,
        evidenceForm,
        seed: questionSeed,
        generatorVersion: UNIVERSAL_CURRICULUM_GENERATOR_VERSION,
        releaseId: UNIVERSAL_CURRICULUM_RELEASE_ID,
        contentReleaseHash,
      };
      const publicPayload = {
        questionId,
        position,
        contract,
        prompt: question.prompt,
        answerType: question.answerType,
        options: question.options,
        visual: question.visual,
        misconceptionTags: question.misconceptionTags,
        provenance: buildSemanticProvenance({
          outcome: template.outcome,
          questionSeed,
          contract,
          question,
          solution,
        }),
      };
      questions.push({
        ...publicPayload,
        publicPayloadHash: sha256(publicPayload),
      });
      const privatePayload = {
        questionId,
        normalizedCorrectAnswer: normalizeCurriculumAnswer(
          solution.correctAnswer,
        ),
        correctAnswer: solution.correctAnswer,
        solutionSteps: solution.steps,
        feedback: solution.feedback,
      };
      solutions.push({
        ...privatePayload,
        privatePayloadHash: sha256(privatePayload),
      });
      publicSemanticKeys.add(semanticKey);
      accepted = true;
      break;
    }
    if (!accepted) {
      throw new Error("ON_DEMAND_GENERATION:PROMPT_COLLISION");
    }
  }

  const immutableSnapshot = {
    schemaVersion: 1 as const,
    releaseId: UNIVERSAL_CURRICULUM_RELEASE_ID,
    contentReleaseHash,
    generatorVersion: UNIVERSAL_CURRICULUM_GENERATOR_VERSION,
    grade: input.grade,
    unitId: unit.slug,
    attemptSeed: input.seed,
    selectionReason: input.selectionReason,
    questions,
    solutions,
  } satisfies Omit<OnDemandAttemptSnapshot, "snapshotHash">;
  return {
    ...immutableSnapshot,
    snapshotHash: sha256(immutableSnapshot),
  };
}

export function verifyOnDemandAttemptSnapshot(
  snapshot: OnDemandAttemptSnapshot,
) {
  if (
    snapshot.releaseId !== UNIVERSAL_CURRICULUM_RELEASE_ID ||
    snapshot.contentReleaseHash !== contentReleaseHash ||
    snapshot.generatorVersion !== UNIVERSAL_CURRICULUM_GENERATOR_VERSION ||
    snapshot.questions.length !== ON_DEMAND_QUESTION_COUNT ||
    snapshot.solutions.length !== ON_DEMAND_QUESTION_COUNT
  ) {
    return false;
  }
  const { snapshotHash, ...immutableSnapshot } = snapshot;
  if (sha256(immutableSnapshot) !== snapshotHash) return false;

  return snapshot.questions.every((question, index) => {
    const solution = snapshot.solutions[index];
    return (
      question.position === index + 1 &&
      question.questionId === solution?.questionId &&
      question.contract.grade === snapshot.grade &&
      question.contract.unitId === snapshot.unitId &&
      question.contract.skillTitle.trim().length >= 2 &&
      question.contract.contentReleaseHash ===
        snapshot.contentReleaseHash &&
      isTrueParametricOutcome(question.contract.outcomeId) &&
      question.publicPayloadHash ===
        sha256({
          questionId: question.questionId,
          position: question.position,
          contract: question.contract,
          prompt: question.prompt,
          answerType: question.answerType,
          options: question.options,
          visual: question.visual,
          misconceptionTags: question.misconceptionTags,
          provenance: question.provenance,
        }) &&
      solution.privatePayloadHash ===
        sha256({
          questionId: solution.questionId,
          normalizedCorrectAnswer: solution.normalizedCorrectAnswer,
          correctAnswer: solution.correctAnswer,
          solutionSteps: solution.solutionSteps,
          feedback: solution.feedback,
        })
    );
  });
}

export function serializeOnDemandSnapshotForSigning(
  snapshot: OnDemandAttemptSnapshot,
) {
  if (!verifyOnDemandAttemptSnapshot(snapshot)) {
    throw new Error("ON_DEMAND_GENERATION:INVALID_SNAPSHOT");
  }
  return canonicalJson(snapshot);
}

export function getTrueParametricOutcomeTitle(outcomeId: string) {
  if (!isTrueParametricOutcome(outcomeId)) return null;
  return inventoryOutcomes.get(outcomeId)?.conciseParaphrase ?? null;
}
