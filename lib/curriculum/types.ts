export const curriculumGrades = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export type CurriculumGrade = (typeof curriculumGrades)[number];

export type CurriculumDomain =
  | "NUMBERS_AND_OPERATIONS"
  | "ALGEBRA_AND_PREALGEBRA"
  | "GEOMETRY"
  | "MEASUREMENT"
  | "STATISTICS_AND_PROBABILITY"
  | "APPLIED_PROBLEM_SOLVING";

export type CurriculumReadiness =
  | "OFFICIAL_SOURCE_MAPPED"
  | "TEACHABLE_IMPLEMENTED"
  | "VALIDATOR_PASSED"
  | "BLUEPRINT_ONLY"
  | "NOT_IMPLEMENTED"
  | "NEEDS_SOURCE_VALIDATION";

export type PreviewAnswerType =
  | "MULTIPLE_CHOICE"
  | "NUMBER_INPUT"
  | "TEXT_INPUT";

export type PreviewCognitiveLevel =
  | "UNDERSTAND"
  | "APPLY"
  | "REASON";

export type VisualRequirement =
  | "TEXT_ONLY"
  | "COUNTER_ROW"
  | "PLACE_VALUE_CHART"
  | "FRACTION_BAR"
  | "DECIMAL_PLACE_VALUE_CHART"
  | "NUMBER_LINE"
  | "RATIO_TABLE"
  | "BALANCE_MODEL"
  | "COORDINATE_PLANE"
  | "SHAPE_SCENE"
  | "SOLID_NET"
  | "MEASUREMENT_SCALE"
  | "ANGLE_DIAGRAM"
  | "AREA_MODEL"
  | "DATA_DISPLAY"
  | "CLOCK_FACE";

type PreviewVisualBase = Readonly<{
  description: string;
}>;

export type PreviewVisualSpec =
  | (PreviewVisualBase & Readonly<{ type: "TEXT_ONLY" }>)
  | (PreviewVisualBase &
      Readonly<{
        type: "COUNTER_ROW";
        groups: number;
        itemsPerGroup: number;
        counts?: readonly number[];
      }>)
  | (PreviewVisualBase &
      Readonly<{
        type: "PLACE_VALUE_CHART";
        value: number;
      }>)
  | (PreviewVisualBase &
      Readonly<{
        type: "FRACTION_BAR";
        numerator: number;
        denominator: number;
        comparisons?: readonly Readonly<{
          numerator: number;
          denominator: number;
        }>[];
      }>)
  | (PreviewVisualBase &
      Readonly<{
        type: "DECIMAL_PLACE_VALUE_CHART";
        values: readonly [string, ...string[]];
      }>)
  | (PreviewVisualBase &
      Readonly<{
        type: "NUMBER_LINE";
        minimum: number;
        maximum: number;
        points: readonly number[];
      }>)
  | (PreviewVisualBase &
      Readonly<{
        type: "RATIO_TABLE";
        rows: readonly [
          readonly [number, number],
          readonly [number, number],
        ];
      }>)
  | (PreviewVisualBase &
      Readonly<{
        type: "BALANCE_MODEL";
        variableBlocks: number;
        leftUnits: number;
        rightUnits: number;
      }>)
  | (PreviewVisualBase &
      Readonly<{
        type: "COORDINATE_PLANE";
        points: readonly Readonly<{ x: number; y: number }>[];
      }>)
  | (PreviewVisualBase &
      Readonly<{
        type: "SHAPE_SCENE";
        shape: "CIRCLE" | "TRIANGLE" | "SQUARE" | "RECTANGLE";
      }>)
  | (PreviewVisualBase &
      Readonly<{
        type: "SOLID_NET";
        solid: "CUBE" | "CUBOID" | "CYLINDER";
        faceCount: number;
      }>)
  | (PreviewVisualBase &
      Readonly<{
        type: "MEASUREMENT_SCALE";
        start: number;
        end: number;
        unit: "cm";
      }>)
  | (PreviewVisualBase &
      Readonly<{
        type: "ANGLE_DIAGRAM";
        degrees: number;
      }>)
  | (PreviewVisualBase &
      Readonly<{
        type: "AREA_MODEL";
        shape: "RECTANGLE" | "TRIANGLE";
        width: number;
        height: number;
      }>)
  | (PreviewVisualBase &
      Readonly<{
        type: "DATA_DISPLAY";
        entries: readonly Readonly<{
          label: string;
          count: number;
          value?: string;
        }>[];
      }>)
  | (PreviewVisualBase &
      Readonly<{
        type: "CLOCK_FACE";
        hour: number;
        minute: 0 | 15 | 30 | 45;
      }>);

export type VerticalUnitKind =
  | "WHOLE_NUMBERS_TO_10"
  | "GRADE1_NUMBER_OPERATIONS_TO_100"
  | "PLACE_VALUE_TO_1000"
  | "UNIT_FRACTIONS"
  | "FRACTION_OPERATIONS"
  | "DECIMAL_OPERATIONS"
  | "INTEGER_OPERATIONS"
  | "MULTIPLICATION_DIVISION"
  | "WHOLE_NUMBER_OPERATIONS"
  | "RATIO_AND_PROPORTION"
  | "LINEAR_EQUATIONS"
  | "LINEAR_SYSTEMS"
  | "LINEAR_FUNCTIONS"
  | "QUADRATIC_FUNCTIONS"
  | "GEOMETRY_PRACTICE"
  | "MEASUREMENT_PRACTICE"
  | "ANGLE_PRACTICE"
  | "AREA_MEASUREMENT_PRACTICE"
  | "GRADE2_DATA_CHANCE"
  | "SECONDARY_GEOMETRY"
  | "SECONDARY_MEASUREMENT"
  | "DATA_AND_PROBABILITY"
  | "RATIONAL_NUMBER_OPERATIONS"
  | "PREALGEBRA_POWERS"
  | "P0_OUTCOME_COMPLETION"
  | "P1_OUTCOME_COMPLETION"
  | "GRADE3_OUTCOME_COMPLETION"
  | "GRADE4_OUTCOME_COMPLETION"
  | "GRADE5_OUTCOME_COMPLETION"
  | "GRADE6_OUTCOME_COMPLETION"
  | "GRADE7_OUTCOME_COMPLETION"
  | "GRADE8_OUTCOME_COMPLETION"
  | "GRADE9_OUTCOME_COMPLETION"
  | "APPLIED_PROBLEM_SOLVING";

export type CurriculumSourceReference = Readonly<{
  id: string;
  authority: "Bộ Giáo dục và Đào tạo";
  title: string;
  document: string;
  url: string;
  location: string;
  accessedAt: string;
  status: "OFFICIAL_PRIMARY_SOURCE";
}>;

export type CurriculumOutcome = Readonly<{
  id: string;
  grade: CurriculumGrade;
  domain: CurriculumDomain;
  summary: string;
  sourceReferenceIds: readonly string[];
  status: "OFFICIAL_SOURCE_MAPPED";
}>;

export type ReusableParameter = Readonly<{
  name: string;
  description: string;
  minimum?: number;
  maximum?: number;
}>;

export type TheorySection = Readonly<{
  id: string;
  title: string;
  explanation: readonly string[];
  visualDescription: string;
  officialOutcomeIds?: readonly string[];
}>;

export type WorkedExample = Readonly<{
  id: string;
  title: string;
  prompt: string;
  steps: readonly string[];
  answer: string;
  visualDescription: string;
  officialOutcomeIds?: readonly string[];
}>;

export type CurriculumUnit = Readonly<{
  slug: string;
  title: string;
  grade: CurriculumGrade;
  domain: CurriculumDomain;
  outcomeIds: readonly string[];
  officialOutcomeIds: readonly string[];
  skillFamilies: readonly string[];
  prerequisiteSlugs: readonly string[];
  reusableParameters: readonly ReusableParameter[];
  gradeSpecificRestrictions: readonly string[];
  requiredVisual: VisualRequirement;
  answerTypes: readonly PreviewAnswerType[];
  cognitiveLevels: readonly PreviewCognitiveLevel[];
  misconceptionTags: readonly string[];
  sourceReferenceIds: readonly string[];
  readiness: readonly CurriculumReadiness[];
  generationStatus: "DRAFT_GENERATED";
  sourceValidationStatus:
    | "OFFICIAL_SOURCE_MAPPED"
    | "NEEDS_SOURCE_VALIDATION";
  kind: VerticalUnitKind;
  theory: readonly TheorySection[];
  examples: readonly WorkedExample[];
}>;

export type DomainCoverageEntry = Readonly<{
  grade: CurriculumGrade;
  domain: CurriculumDomain;
  status:
    | "TEACHABLE_IMPLEMENTED"
    | "BLUEPRINT_ONLY"
    | "NOT_APPLICABLE"
    | "NOT_APPLICABLE_BY_OFFICIAL_CURRICULUM";
  note: string;
}>;

export type PreviewOption = Readonly<{
  key: "A" | "B" | "C" | "D";
  label: string;
}>;

export type PreviewQuestion = Readonly<{
  code: string;
  unitSlug: string;
  skillFamily: string;
  answerType: PreviewAnswerType;
  prompt: string;
  options: readonly PreviewOption[] | null;
  cognitiveLevel: PreviewCognitiveLevel;
  visual: PreviewVisualSpec;
  misconceptionTags: readonly string[];
}>;

export type PreviewSolution = Readonly<{
  questionCode: string;
  correctAnswer: string;
  steps: readonly string[];
  feedback: string;
}>;

export type PreviewAudit = Readonly<{
  questionCode: string;
  generatorVersion: "vertical-preview-v1";
  sourceReferenceIds: readonly string[];
  parameters: readonly Readonly<{
    name: string;
    value: string | number;
  }>[];
  primaryOfficialOutcomeId?: string;
  supportingOfficialOutcomeIds?: readonly string[];
  evidenceForm?: "RECOGNIZE_UNDERSTAND" | "PERFORM" | "REASON_EXPLAIN" | "APPLY" | "ERROR_ANALYSIS";
  visualRequirement?: VisualRequirement;
}>;

export type PreviewUnitDraft = Readonly<{
  seed: string;
  unit: CurriculumUnit;
  questions: readonly PreviewQuestion[];
  solutions: readonly PreviewSolution[];
  audits: readonly PreviewAudit[];
  generationStatus: "DRAFT_GENERATED";
}>;

export type CurriculumValidationResult = Readonly<{
  valid: boolean;
  errors: readonly string[];
}>;
