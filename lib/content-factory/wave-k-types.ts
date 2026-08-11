import type { DifficultyBand, FactoryGrade, QuestionType } from "./types.ts";

export type WaveKOutcomeClassification =
  | "PRODUCIBLE_DETERMINISTIC"
  | "ALREADY_COVERED_SEMANTICALLY"
  | "AUTOMATED_VERIFICATION_INSUFFICIENT"
  | "OPEN_ENDED_OR_EXPERIENTIAL"
  | "VISUAL_EVIDENCE_REQUIRED"
  | "UNKNOWN_SOURCE_MAPPING";

export type WaveKClassificationDecision = Readonly<{
  outcomeId: string;
  grade: Exclude<FactoryGrade, 1>;
  classification: WaveKOutcomeClassification;
  reason: string;
  templateFamily: string | null;
  semanticAliasTargetSkillId: string | null;
}>;

export type WaveKInventoryRow = WaveKClassificationDecision & Readonly<{
  skillId: string;
  domain: string;
  subdomain: string;
  objective: string;
  unitIds: readonly string[];
  pages: Readonly<{ start: number; end: number }>;
  sourceDocumentId: string;
  sourceSha256: string;
  sourceReferenceId: string;
  coveredBeforeK: boolean;
  sourceMapRowCount: number;
}>;

export type WaveKCaseSeed = Readonly<{
  outcomeId: string;
  grade: Exclude<FactoryGrade, 1>;
  ordinal: number;
  structureTag: string;
  difficulty: DifficultyBand;
  answerType: QuestionType;
  prompt: string;
  options: readonly string[] | null;
  exactAnswer: string;
  explanationSteps: readonly string[];
  oracle: Readonly<{
    kind: string;
    payload: Readonly<Record<string, string | number | boolean | readonly number[] | readonly string[] | undefined>>;
  }>;
}>;
