export const GENERATION_V1_VERSION = "grade2-generation-v1" as const;
export const GENERATION_V1_POLICY = "HEURISTIC_DIFFICULTY_V1" as const;

export const generationSkills = [
  "G2_COMPOSE_TO_1000",
  "G2_COMPARE_LENGTH",
  "G2_READ_LENGTH",
] as const;
export type GenerationSkill = (typeof generationSkills)[number];
export type GenerationDifficulty = "EASY" | "MEDIUM" | "HARD";
export type GenerationQuestionType = "MULTIPLE_CHOICE";

export type GenerationSpec = Readonly<{
  grade: 2;
  skillId: GenerationSkill;
  outcomeId: string;
  generatorId: string;
  generatorVersion: typeof GENERATION_V1_VERSION;
  seed: string;
  locale: "vi-VN";
  difficulty: GenerationDifficulty;
  questionType: GenerationQuestionType;
  requestedCount: number;
}>;

export type GeneratedQuestion = Readonly<{
  generatedId: string;
  prompt: string;
  options: readonly string[];
  correctIndex: number;
  privateSolution: Readonly<{ steps: readonly string[]; explanation: string }>;
  grade: 2;
  skillId: GenerationSkill;
  outcomeId: string;
  difficulty: GenerationDifficulty;
  provenance: Readonly<{
    generatorId: string;
    generatorVersion: typeof GENERATION_V1_VERSION;
    seedFingerprint: string;
    difficultyPolicy: typeof GENERATION_V1_POLICY;
  }>;
  visual?: Readonly<Record<string, unknown>>;
  canonicalHash: string;
}>;

export type GenerationRejection = Readonly<{
  code: string;
  count: number;
}>;

export type CandidateArtifact = Readonly<{
  status: "DRAFT_REVIEW_REQUIRED";
  manifest: Readonly<{
    schemaVersion: 1;
    generatorVersion: typeof GENERATION_V1_VERSION;
    difficultyPolicy: typeof GENERATION_V1_POLICY;
    seed: string;
    requested: number;
    generated: number;
    validated: number;
    rejected: number;
    duplicate: number;
    counts: Readonly<Record<string, number>>;
    publicHash: string;
    privateHash: string;
  }>;
  publicQuestions: readonly Omit<GeneratedQuestion, "privateSolution">[];
  privateSolutions: readonly GeneratedQuestion["privateSolution"][];
  rejections: readonly GenerationRejection[];
}>;
