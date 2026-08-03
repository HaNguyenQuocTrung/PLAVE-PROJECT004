export type OracleDifficulty = "EASY" | "MEDIUM" | "HARD";

export type OracleOption = Readonly<{ id: string; label: string }>;
export type OraclePair = Readonly<{ leftId: string; rightId: string }>;
export type OracleFraction = Readonly<{ numerator: number; denominator: number }>;
export type OracleAnswer =
  | number
  | string
  | OracleFraction
  | readonly string[]
  | readonly OraclePair[];

export type OracleInteraction = Readonly<{
  type: string;
  options?: readonly OracleOption[];
  choiceCount?: number;
  leftItems?: readonly OracleOption[];
  rightItems?: readonly OracleOption[];
  inputMode?: string;
  unitLabel?: string;
  orderedItemIds?: readonly string[];
}>;

export type OracleVisual = Readonly<{
  type: string;
  description: string;
  data: Readonly<Record<string, unknown>>;
}>;

export type OracleCandidate = Readonly<{
  schemaVersion: number;
  questionId: string;
  grade: number;
  outcomeId: string;
  variantId: string;
  difficulty: OracleDifficulty;
  publicPrompt: string;
  publicData: Readonly<Record<string, unknown>>;
  interaction: OracleInteraction;
  visual: OracleVisual;
  accessibility: Readonly<{
    prompt: string;
    visualAlternative: string;
    responseInstruction: string;
  }>;
}>;

export type OracleDiagnosticCode =
  | "ORACLE_UNSUPPORTED_CAPABILITY"
  | "ORACLE_PUBLIC_DATA_INVALID"
  | "ORACLE_INSUFFICIENT_PUBLIC_EVIDENCE"
  | "ORACLE_MATHEMATICAL_DOMAIN_INVALID"
  | "ORACLE_AMBIGUOUS_ANSWER"
  | "ORACLE_PROMPT_DATA_MISMATCH"
  | "ORACLE_VISUAL_DATA_MISMATCH"
  | "ORACLE_INTERACTION_MISMATCH"
  | "ORACLE_INTERACTION_ANSWER_TYPE_MISMATCH"
  | "ORACLE_DISTRACTOR_DUPLICATE"
  | "ORACLE_DISTRACTOR_EQUIVALENT_TO_ANSWER"
  | "ORACLE_PRIVATE_ANSWER_HINT"
  | "ORACLE_LANGUAGE_CONTRACT_INVALID"
  | "ORACLE_GRADE_BOUND_INVALID"
  | "ORACLE_MISSING_SOLUTION"
  | "ORACLE_EXTRANEOUS_SOLUTION"
  | "ORACLE_DUPLICATE_SOLUTION"
  | "ORACLE_DOMAIN_VIOLATION"
  | "ORACLE_INVALID_SOLUTION_FORMAT";

export type OracleResult = Readonly<{
  ok: boolean;
  oracleFamily: string;
  answerSet: readonly OracleAnswer[];
  answerCardinality: number;
  diagnostics: readonly OracleDiagnosticCode[];
  checks: readonly string[];
}>;

export class GeneratorOracleError extends Error {
  readonly code: OracleDiagnosticCode;

  constructor(code: OracleDiagnosticCode) {
    super(code);
    this.name = "GeneratorOracleError";
    this.code = code;
  }
}
