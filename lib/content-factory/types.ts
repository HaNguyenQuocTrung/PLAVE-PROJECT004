export const factoryGrades = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type FactoryGrade = (typeof factoryGrades)[number];

export type SourceTruthStatus =
  | "VERIFIED_REPOSITORY_SOURCE"
  | "SOURCE_VERIFIED"
  | "PARTIAL_REPOSITORY_EVIDENCE"
  | "OWNER_OFFICIAL_SOURCE"
  | "SOURCE_REQUIRED"
  | "PRODUCT_HYPOTHESIS"
  | "POC_ONLY";

export type ReviewStatus =
  | "SOURCE_REQUIRED"
  | "DRAFT"
  | "GENERATED"
  | "AUTOMATED_VALIDATION_FAILED"
  | "AUTOMATED_VERIFICATION_INSUFFICIENT"
  | "AUTOMATED_VALIDATION_PASSED"
  | "EVIDENCE_GATE_PASSED"
  | "BUNDLED"
  | "PILOT_ELIGIBLE"
  | "PUBLISHED"
  | "RETIRED";

export type ContentMetric =
  | Readonly<{ state: "COUNT"; value: number }>
  | Readonly<{ state: "MISSING" | "UNKNOWN" | "NOT_APPLICABLE" }>;

export type SourceReference = Readonly<{
  id: string;
  status: SourceTruthStatus;
  repositoryEvidence?: readonly string[];
  ownerReference?: string;
  note: string;
}>;

export type StableEntity = Readonly<{
  id: string;
  grade: FactoryGrade;
  displayName: string;
  sourceReferenceIds: readonly string[];
}>;

export type DomainSpec = StableEntity;
export type UnitSpec = StableEntity & Readonly<{
  domainId: string;
  displayOrder: number;
  knowledgeNodeIds: readonly string[];
  skillIds: readonly string[];
  objectiveIds: readonly string[];
  publicationStatus: "DRAFT" | "PUBLISHED" | "RETIRED";
}>;
export type KnowledgeNodeSpec = StableEntity & Readonly<{ skillIds: readonly string[] }>;
export type SkillSpec = StableEntity & Readonly<{
  domainId: string;
  objectiveIds: readonly string[];
}>;
export type LearningObjectiveSpec = StableEntity & Readonly<{ description: string }>;

export type PrerequisiteEdge = Readonly<{
  fromSkillId: string;
  toSkillId: string;
  evidence: "CURRICULUM_AUTHORITATIVE" | "REPOSITORY_RUNTIME_ORDER" | "HYPOTHESIS_REQUIRES_EVIDENCE";
  sourceReferenceIds: readonly string[];
}>;

export type DifficultyBand = "FOUNDATIONAL" | "CORE" | "EXTENSION";
export type QuestionType =
  | "SINGLE_CHOICE"
  | "INTEGER_INPUT"
  | "RATIONAL_INPUT"
  | "DECIMAL_INPUT"
  | "AUTOMATED_VERIFICATION_INSUFFICIENT";

export type AnswerContract = Readonly<{
  type: QuestionType;
  exactValue?: string;
  decimalPlaces?: number;
  unit?: string;
  derivation?: MathExpression;
  comparison?: Readonly<{
    left: MathExpression;
    right: MathExpression;
    relation: "<" | "=" | ">";
    exactAnswer: string;
  }>;
  geometry?: Readonly<{ kind: "TRIANGLE_SIDES"; sides: readonly [number, number, number] }>;
}>;

export type MathExpression =
  | Readonly<{ op: "VALUE"; numerator: number; denominator: number }>
  | Readonly<{ op: "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE"; left: MathExpression; right: MathExpression }>
  | Readonly<{ op: "SQRT"; value: MathExpression }>;

export type QuestionBlueprint = Readonly<{
  id: string;
  grade: FactoryGrade;
  skillId: string;
  difficulty: DifficultyBand;
  questionType: QuestionType;
  templateId: string | null;
  targetCount: number;
  sourceReferenceIds: readonly string[];
}>;

export type CandidateQuestion = Readonly<{
  id: string;
  grade: FactoryGrade;
  unitId?: string;
  blueprintId: string;
  skillId: string;
  prompt: string;
  options: readonly string[] | null;
  answer: AnswerContract;
  explanationId: string;
  difficulty: DifficultyBand;
  provenance: Readonly<{
    kind: "LEGACY_AUTHORED" | "HUMAN_AUTHORED" | "DETERMINISTIC_TEMPLATE" | "AI_CANDIDATE";
    templateVersion: string | null;
    seed: string | null;
    sourceReferenceIds: readonly string[];
  }>;
  reviewStatus: ReviewStatus;
  published: boolean;
  pilotEligible: boolean;
  fixtureOnly: boolean;
  duplicateFingerprint?: string;
  validationReceiptIds?: readonly string[];
  instructionalPurpose?:
    | "FOUNDATION"
    | "STANDARD_APPLICATION"
    | "MISCONCEPTION_TARGETING"
    | "REMEDIATION"
    | "TRANSFER_APPLICATION";
}>;

export type ExplanationSpec = Readonly<{
  id: string;
  questionId: string;
  steps: readonly string[];
  finalAnswer: string;
  evidenceReceiptIds: readonly string[];
}>;

export type AutomatedEvidenceReceipt = Readonly<{
  id: string;
  entityId: string;
  check:
    | "SOURCE_MAPPING"
    | "MATHEMATICAL_ANSWER"
    | "EXPLANATION_CONSISTENCY"
    | "SKILL_PREREQUISITES"
    | "GRADE_RANGE"
    | "DUPLICATE_AMBIGUITY"
    | "SOLUTION_LEAKAGE_SECURITY"
    | "BUNDLE_DETERMINISM"
    | "ADAPTIVE_SIMULATION"
    | "REGRESSION_TESTS";
  status: "PASSED" | "FAILED" | "INSUFFICIENT";
  evidence: string;
}>;

export type CandidateBinding = Readonly<{
  candidateId: string;
  version: string;
  bundleHash: string;
  policyVersion: string;
}>;

export type ReleaseState = Readonly<{
  publication: "DRAFT" | "PUBLISHED" | "RETIRED";
  visibility: "HIDDEN" | "VISIBLE";
  pilotEnabled: boolean;
  runtimeEnabled: boolean;
  retentionEnabled: boolean;
}>;

export type AdaptivePolicyEvidenceBasis =
  | "EXISTING_VERIFIED_PRODUCT_CONTRACT"
  | "DERIVED_COMPATIBILITY_VALUE"
  | "PRODUCT_HYPOTHESIS";

export type AdaptivePolicyContract = Readonly<{
  sessionLength: Readonly<{ minimum: number; maximum: number; basis: AdaptivePolicyEvidenceBasis }>;
  minimumSkillEvidence: Readonly<{ value: number; basis: AdaptivePolicyEvidenceBasis }>;
  masteryThreshold: Readonly<{ correct: number; basis: AdaptivePolicyEvidenceBasis }>;
  remediationIncorrectStreak: Readonly<{ value: number; basis: AdaptivePolicyEvidenceBasis }>;
  resume: Readonly<{ idempotent: true; basis: AdaptivePolicyEvidenceBasis }>;
  retentionReview: Readonly<{ enabled: false; contract: "SHADOW_ONLY"; basis: AdaptivePolicyEvidenceBasis }>;
  deterministicSelection: true;
  scoringHistoryRewrite: false;
  pedagogicalEffectivenessClaim: false;
}>;

export type ProductionSummary = Readonly<{
  wave: "A" | "B" | "C" | "D" | "A+B" | "A+B+C" | "A+B+C+D";
  selectedSliceId: string;
  selectionBasis: readonly string[];
  generated: number;
  repaired: number;
  evidenceGatePassed: number;
  verificationInsufficient: number;
  rejected: number;
  duplicate: number;
  candidateEligible: number;
}>;

export type LegacyAssetReference = Readonly<{
  kind: "IMMUTABLE_GRADE1_SQL_RELEASE";
  files: readonly string[];
  expected: Readonly<{ units: 13; questions: 312; solutions: 312; diagnosticRows: 24 }>;
  canonicalValidator: string;
}>;

export type GradePack = Readonly<{
  schemaVersion: "content-factory-grade-pack-v1";
  grade: FactoryGrade;
  packId: string;
  packVersion: string;
  immutableReference: boolean;
  testOnly: boolean;
  locale: "vi-VN";
  unicodeNormalization: "NFC";
  sources: readonly SourceReference[];
  domains: readonly DomainSpec[];
  units: readonly UnitSpec[];
  knowledgeNodes: readonly KnowledgeNodeSpec[];
  skills: readonly SkillSpec[];
  objectives: readonly LearningObjectiveSpec[];
  prerequisites: readonly PrerequisiteEdge[];
  blueprints: readonly QuestionBlueprint[];
  questions: readonly CandidateQuestion[];
  quarantinedQuestions?: readonly CandidateQuestion[];
  explanations: readonly ExplanationSpec[];
  evidenceReceipts: readonly AutomatedEvidenceReceipt[];
  candidate: CandidateBinding | null;
  adaptivePolicy: Readonly<{
    version: string;
    status: "NOT_DEFINED" | "DRAFT" | "VALIDATED";
    contract?: AdaptivePolicyContract;
  }>;
  release: ReleaseState;
  production?: ProductionSummary;
  legacyAsset: LegacyAssetReference | null;
}>;

export type ValidationDiagnostic = Readonly<{
  code: string;
  severity: "ERROR" | "WARNING" | "INFO";
  entityId: string;
  classification?:
    | "CONFIRMED_CONTENT_DEFECT"
    | "MISSING_LEGACY_METADATA"
    | "UNSUPPORTED_LEGACY_REPRESENTATION"
    | "VALIDATOR_FALSE_POSITIVE"
    | "MIGRATION_TO_NEW_MODEL_BLOCKER";
  message: string;
}>;
