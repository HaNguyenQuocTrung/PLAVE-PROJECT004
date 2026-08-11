import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import type { CandidateQuestion, DifficultyBand, FactoryGrade, GradePack, QuestionType } from "./types.ts";
import { waveJSeeds, type WaveJSeed, type WaveJStructureTag } from "./wave-j-questions.ts";

export type WaveJDepthClassification = "DEPTH_SUFFICIENT" | "DIFFICULTY_GAP" | "STRUCTURAL_DIVERSITY_GAP"
  | "ANSWER_FORM_GAP" | "RETRY_POOL_GAP" | "SOURCE_LIMITED" | "AUTOMATED_VERIFICATION_INSUFFICIENT";
export type WaveJDifficultyLevel = "FOUNDATIONAL" | "CORE" | "ADVANCED";

export type WaveJDifficultyEvidence = Readonly<{
  questionId: string;
  level: WaveJDifficultyLevel;
  repositoryBand: DifficultyBand;
  reasoningSteps: number;
  coordinatedSkillCount: number;
  representationTransformations: number;
  distractorCount: number;
  constraintCount: number;
  machineVerified: boolean;
  basis: "CONTRACT_DERIVED";
  pedagogicalEffectivenessClaim: false;
}>;

export type WaveJSkillDepthAudit = Readonly<{
  grade: FactoryGrade;
  skillId: string;
  sourceReferenceIds: readonly string[];
  immutableLegacy: boolean;
  before: Readonly<{
    questions: number;
    reasoningStructures: number;
    answerForms: Readonly<Record<string, number>>;
    difficulty: Readonly<Record<WaveJDifficultyLevel, number>>;
    parameterFingerprints: number;
    duplicateDensity: number;
    exposureRisk: "LOW" | "BOUNDED" | "HIGH";
    retryDifferentStructureAvailable: boolean;
    remediationItemAvailable: boolean;
    retentionItemAvailable: boolean;
  }>;
  requiredStructureTags: readonly WaveJStructureTag[];
  gapCodesBefore: readonly WaveJDepthClassification[];
  classificationBefore: WaveJDepthClassification;
  addedQuestions: number;
  afterQuestions: number;
  afterReasoningStructures: number;
  classificationAfter: WaveJDepthClassification;
  adaptiveRequirementBasis: "WAVE_I_ATTEMPT_LIMIT_AND_ACTION_CONTRACT";
  unknownPreserved: boolean;
}>;

export const waveJAdaptivePoolRequirements = Object.freeze({
  waveIAttemptLimit: 6,
  minimumQuestionPool: 6,
  minimumReasoningStructuresForRetry: 2,
  minimumDistinctSessionItems: 3,
  basis: "WAVE_I_ATTEMPT_LIMIT_AND_ACTION_CONTRACT" as const,
  pedagogicalThresholdClaim: false as const,
});

export function waveJStructureFingerprint(prompt: string) {
  return normalizedDefinition(prompt).toLocaleLowerCase("vi")
    .replace(/-?\d+(?:[.,]\d+)?/gu, "#")
    .replace(/[a-z](?=\s*[=/])/giu, "x")
    .replace(/\s+/gu, " ").trim();
}

function countBy(values: readonly string[]) {
  return Object.fromEntries([...new Set(values)].sort().map((value) => [value, values.filter((entry) => entry === value).length]));
}

function difficultyCounts(questions: readonly CandidateQuestion[]) {
  return { FOUNDATIONAL: questions.filter((q) => q.difficulty === "FOUNDATIONAL").length,
    CORE: questions.filter((q) => q.difficulty === "CORE").length,
    ADVANCED: questions.filter((q) => q.difficulty === "EXTENSION").length } as const;
}

function sourceIds(questions: readonly CandidateQuestion[]) {
  return [...new Set(questions.flatMap((question) => question.provenance.sourceReferenceIds))].sort();
}

export function buildWaveJDepthAudit(sourcePacks: readonly GradePack[]): readonly WaveJSkillDepthAudit[] {
  return sourcePacks.flatMap((pack) => [...new Set(pack.questions.map((question) => question.skillId))].sort().map((skillId) => {
    const questions = pack.questions.filter((question) => question.skillId === skillId);
    const structures = new Set(questions.map((question) => waveJStructureFingerprint(question.prompt))).size;
    const publicForms = new Set(questions.map((question) => normalizedDefinition(`${question.prompt}|${question.options?.join("|") ?? ""}`))).size;
    const additions = waveJSeeds.filter((seed) => seed.grade === pack.grade && seed.skillId === skillId);
    const tags = [...new Set(additions.map((seed) => seed.structureTag))];
    const gapCodes: WaveJDepthClassification[] = [];
    if (questions.length < waveJAdaptivePoolRequirements.minimumQuestionPool) gapCodes.push("RETRY_POOL_GAP");
    if (tags.length > 0) gapCodes.push("STRUCTURAL_DIVERSITY_GAP");
    const primary = gapCodes.includes("RETRY_POOL_GAP") ? "RETRY_POOL_GAP"
      : gapCodes.includes("STRUCTURAL_DIVERSITY_GAP") ? "STRUCTURAL_DIVERSITY_GAP"
        : "DEPTH_SUFFICIENT";
    const addedStructures = new Set(additions.map((seed) => seed.structureTag)).size;
    const afterQuestions = questions.length + additions.length;
    const afterStructures = structures + addedStructures;
    const after = afterQuestions >= waveJAdaptivePoolRequirements.minimumQuestionPool
      && afterStructures >= waveJAdaptivePoolRequirements.minimumReasoningStructuresForRetry ? "DEPTH_SUFFICIENT" : primary;
    return { grade: pack.grade, skillId, sourceReferenceIds: sourceIds(questions), immutableLegacy: pack.immutableReference,
      before: { questions: questions.length, reasoningStructures: structures,
        answerForms: countBy(questions.map((question) => question.answer.type)), difficulty: difficultyCounts(questions),
        parameterFingerprints: new Set(questions.map((question) => `${question.provenance.seed ?? "legacy"}|${question.answer.exactValue ?? ""}`)).size,
        duplicateDensity: questions.length === 0 ? 0 : (questions.length - publicForms) / questions.length,
        exposureRisk: questions.length < 6 ? "HIGH" : structures < 2 ? "BOUNDED" : "LOW",
        retryDifferentStructureAvailable: structures >= 2, remediationItemAvailable: questions.some((q) => q.instructionalPurpose === "REMEDIATION") || pack.immutableReference,
        retentionItemAvailable: questions.length >= 3 },
      requiredStructureTags: tags, gapCodesBefore: gapCodes.length ? gapCodes : ["DEPTH_SUFFICIENT"], classificationBefore: primary,
      addedQuestions: additions.length, afterQuestions, afterReasoningStructures: afterStructures, classificationAfter: after,
      adaptiveRequirementBasis: "WAVE_I_ATTEMPT_LIMIT_AND_ACTION_CONTRACT", unknownPreserved: pack.immutableReference };
  }));
}

function difficultyLevel(band: DifficultyBand): WaveJDifficultyLevel {
  return band === "EXTENSION" ? "ADVANCED" : band;
}

export function buildWaveJDifficultyEvidence(seed: WaveJSeed, question: CandidateQuestion): WaveJDifficultyEvidence {
  const machineVerified = seed.difficulty === "FOUNDATIONAL" ? seed.reasoningSteps === 1 && seed.coordinatedSkillCount === 1
    : seed.difficulty === "CORE" ? seed.reasoningSteps >= 2 && seed.representationTransformations >= 1
      : seed.reasoningSteps >= 3 && seed.constraintCount >= 3;
  return { questionId: question.id, level: difficultyLevel(seed.difficulty), repositoryBand: seed.difficulty,
    reasoningSteps: seed.reasoningSteps, coordinatedSkillCount: seed.coordinatedSkillCount,
    representationTransformations: seed.representationTransformations, distractorCount: question.options ? question.options.length - 1 : 0,
    constraintCount: seed.constraintCount, machineVerified, basis: "CONTRACT_DERIVED", pedagogicalEffectivenessClaim: false };
}

export function hashWaveJDepthAudit(rows: readonly WaveJSkillDepthAudit[]) {
  return sha256(canonicalize({ schemaVersion: "plave-wave-j-depth-audit-v1", rows }));
}

export const waveJGapSkillIds = [...new Set(waveJSeeds.map((seed) => seed.skillId))].sort();
export const waveJAnswerTypes = [...new Set(waveJSeeds.map((seed) => seed.answerType))].sort() as readonly QuestionType[];
