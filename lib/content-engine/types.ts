export const supportedGrades = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type Grade = (typeof supportedGrades)[number];

export type MathDomain =
  | "NUMBER_AND_PLACE_VALUE"
  | "ADDITION_AND_SUBTRACTION"
  | "MULTIPLICATION_AND_DIVISION"
  | "GEOMETRY"
  | "MEASUREMENT"
  | "TIME_AND_CALENDAR"
  | "MONEY"
  | "DATA_AND_STATISTICS"
  | "CHANCE";

export type NumberType =
  | "WHOLE_NON_NEGATIVE"
  | "INTEGER"
  | "FRACTION"
  | "DECIMAL";

export type MathOperation =
  | "COUNT"
  | "READ"
  | "WRITE"
  | "COMPARE"
  | "ORDER"
  | "COMPOSE"
  | "DECOMPOSE"
  | "ADD"
  | "SUBTRACT"
  | "MULTIPLY"
  | "DIVIDE";

export type RegroupingMode =
  | "NOT_APPLICABLE"
  | "FORBIDDEN"
  | "OPTIONAL"
  | "REQUIRED";

export type Difficulty = "EASY" | "MEDIUM" | "HARD" | "MIXED";
export type CognitiveLevel =
  | "REMEMBER"
  | "UNDERSTAND"
  | "APPLY"
  | "REASON";
export type EngineAnswerType = "MULTIPLE_CHOICE" | "NUMBER_INPUT";

export type EngineVisualType =
  | "NONE"
  | "NUMBER_CARD"
  | "PLACE_VALUE_CHART"
  | "NUMBER_LINE"
  | "GROUPED_OBJECTS"
  | "ARRAY"
  | "SHAPE_SCENE"
  | "MEASUREMENT_TOOL"
  | "CLOCK"
  | "CALENDAR"
  | "MONEY_CARD"
  | "PICTOGRAPH";

export type MisconceptionTag =
  | "PLACE_VALUE_ZERO"
  | "PLACE_VALUE_ORDER"
  | "NUMBER_WORD_ORDER"
  | "OFF_BY_ONE"
  | "COMPARE_FROM_ONES_FIRST"
  | "CARRY_OMITTED"
  | "BORROW_OMITTED"
  | "OPERATION_CONFUSION"
  | "EQUAL_GROUP_CONFUSION"
  | "UNIT_CONFUSION"
  | "VISUAL_COUNTING_ERROR";

export type EvidenceStatus =
  | "OFFICIAL_SOURCE_CONFIRMED"
  | "TECHNICAL_DECOMPOSITION"
  | "PRODUCT_DECISION"
  | "PRODUCT_HYPOTHESIS"
  | "OUT_OF_SCOPE";

export type OfficialSourceValidationStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "VALIDATED"
  | "NEEDS_CORRECTION";

export type TechnicalValidationStatus =
  | "NOT_RUN"
  | "PASSED"
  | "FAILED";

export type ExpertReviewStatus =
  | "OPTIONAL_NOT_OBTAINED"
  | "EXPERT_REVIEWED"
  | "EXPERT_CHANGES_REQUESTED";

export type OwnerDecisionStatus =
  | "NOT_REVIEWED"
  | "APPROVED_FOR_CONTROLLED_PILOT_PREPARATION"
  | "APPROVED_FOR_CONTROLLED_PILOT"
  | "REVISION_REQUIRED";

export type ContentPublicationStatus =
  | "DRAFT"
  | "PILOT_ELIGIBLE"
  | "PUBLISHED"
  | "RETIRED";

export type ContentGovernanceState = Readonly<{
  officialSourceValidation: OfficialSourceValidationStatus;
  technicalValidation: TechnicalValidationStatus;
  expertReview: ExpertReviewStatus;
  ownerDecision: OwnerDecisionStatus;
  publicationStatus: ContentPublicationStatus;
}>;

export type DigitCountRange = Readonly<{
  minimum: number;
  maximum: number;
}>;

export type SkillFamilyConfig = Readonly<{
  id: string;
  label: string;
  grade: Grade;
  domain: MathDomain;
  minValue: number;
  maxValue: number;
  digitCount: DigitCountRange;
  numberType: NumberType;
  allowedOperations: readonly MathOperation[];
  carryMode: RegroupingMode;
  borrowMode: RegroupingMode;
  multiplicationTables: readonly number[];
  divisionTables: readonly number[];
  numberOfSteps: number;
  difficulty: Difficulty;
  cognitiveLevel: CognitiveLevel;
  answerType: readonly EngineAnswerType[];
  visualType: EngineVisualType;
  accessibilityDescription: string;
  misconceptionTags: readonly MisconceptionTag[];
}>;

export type CurriculumOutcomeDefinition = Readonly<{
  id: string;
  grade: Grade;
  description: string;
  sourceReference: string;
  evidenceStatus: Extract<
    EvidenceStatus,
    "OFFICIAL_SOURCE_CONFIRMED" | "PRODUCT_HYPOTHESIS"
  >;
}>;

export type GradeSpecificUnitBlueprint = Readonly<{
  slug: string;
  title: string;
  grade: Grade;
  outcomeIds: readonly string[];
  skillFamilyIds: readonly string[];
  prerequisiteSlugs: readonly string[];
  displayOrder: number;
  governance: ContentGovernanceState;
}>;

export type QuestionTemplateDefinition = Readonly<{
  id: string;
  skillFamilyId: string;
  answerType: EngineAnswerType;
  difficulty: Exclude<Difficulty, "MIXED">;
  cognitiveLevel: CognitiveLevel;
  visualType: EngineVisualType;
  misconceptionTags: readonly MisconceptionTag[];
}>;

export type EngineQuestionOptions = Readonly<{
  A: string;
  B: string;
  C: string;
  D: string;
}>;

export type NumberCardVisual = Readonly<{
  kind: "NUMBER_CARD";
  value: number;
  description: string;
}>;

export type PlaceValueChartVisual = Readonly<{
  kind: "PLACE_VALUE_CHART";
  thousands: number;
  hundreds: number;
  tens: number;
  ones: number;
  description: string;
}>;

export type NumberLineVisual = Readonly<{
  kind: "NUMBER_LINE";
  start: number;
  end: number;
  focusValue: number;
  description: string;
}>;

export type EngineVisualSpec =
  | NumberCardVisual
  | PlaceValueChartVisual
  | NumberLineVisual;

export type ComposeNumberSource = Readonly<{
  kind: "COMPOSE_NUMBER";
  thousands: number;
  hundreds: number;
  tens: number;
  ones: number;
  value: number;
}>;

export type ReadNumberSource = Readonly<{
  kind: "READ_NUMBER";
  value: number;
  words: string;
}>;

export type IdentifyPlaceSource = Readonly<{
  kind: "IDENTIFY_PLACE";
  value: number;
  place: "THOUSANDS" | "HUNDREDS" | "TENS" | "ONES";
  digit: number;
}>;

export type NeighborNumberSource = Readonly<{
  kind: "NEIGHBOR_NUMBER";
  value: number;
  direction: "PREVIOUS" | "NEXT";
  answer: number;
}>;

export type GeneratedQuestionSource =
  | ComposeNumberSource
  | ReadNumberSource
  | IdentifyPlaceSource
  | NeighborNumberSource;

export type GeneratedQuestion = Readonly<{
  code: string;
  unitSlug: string;
  templateId: string;
  skillFamilyId: string;
  questionType: EngineAnswerType;
  prompt: string;
  options: EngineQuestionOptions | null;
  visual: EngineVisualSpec;
  difficulty: Exclude<Difficulty, "MIXED">;
  displayOrder: number;
}>;

export type GeneratedSolution = Readonly<{
  questionCode: string;
  correctAnswer: string;
  solutionSteps: readonly string[];
  explanation: string;
  hint: string;
}>;

export type GeneratedQuestionAudit = Readonly<{
  questionCode: string;
  source: GeneratedQuestionSource;
  expectedDisplayAnswer: string;
  distractorTagByOption: Readonly<
    Partial<Record<keyof EngineQuestionOptions, MisconceptionTag>>
  >;
}>;

export type GeneratedQuestionBundle = Readonly<{
  question: GeneratedQuestion;
  solution: GeneratedSolution;
  audit: GeneratedQuestionAudit;
}>;

export type GeneratedUnitDraft = Readonly<{
  seed: string;
  unit: GradeSpecificUnitBlueprint;
  outcome: CurriculumOutcomeDefinition;
  skillFamilies: readonly SkillFamilyConfig[];
  templates: readonly QuestionTemplateDefinition[];
  bundles: readonly GeneratedQuestionBundle[];
  generationStatus: "DRAFT_GENERATED";
  governance: ContentGovernanceState;
}>;

export type ValidationResult = Readonly<{
  valid: boolean;
  errors: readonly string[];
}>;
