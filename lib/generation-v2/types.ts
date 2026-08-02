export const GENERATOR_V2_VERSION = "plave-generator-v2.0.0" as const;
export const VARIANT_VERSION = "product-v2-1" as const;
export const DIFFICULTY_POLICY_VERSION = "PLAVE_DIFFICULTY_V2" as const;
export const SOLVER_VERSION = "PLAVE_SOLVER_V2" as const;

export type ProductDifficulty = "EASY" | "MEDIUM" | "HARD";
export type ProductLocale = "vi-VN";

export type ProductInteractionType =
  | "SINGLE_CHOICE"
  | "MULTI_SELECT"
  | "INTEGER_INPUT"
  | "DECIMAL_INPUT"
  | "FRACTION_INPUT"
  | "ORDERING"
  | "MATCHING"
  | "TABLE_OR_CHART_RESPONSE"
  | "CONSTRUCTION_OR_VISUAL_SELECTION"
  | "SHORT_STRUCTURED_RESPONSE";

export type WaveACanonicalVariantId =
  | "NUMBER_RECOGNITION_REPRESENTATION"
  | "COUNTING_SEQUENCE"
  | "PLACE_VALUE_COMPOSE"
  | "COMPARE_ORDER"
  | "COMPARE_ORDER_ESTIMATE"
  | "ROUND_ESTIMATE"
  | "ADD_SUB_CALCULATION"
  | "MENTAL_ARITHMETIC"
  | "WRITTEN_ARITHMETIC"
  | "MULTIPLY_DIVIDE"
  | "MIXED_ARITHMETIC_EXPRESSION"
  | "OPERATION_COMPONENTS"
  | "MISSING_COMPONENT"
  | "INTEGER_NUMBER_LINE"
  | "INTEGER_OPERATION"
  | "RATIONAL_NUMBER_REASONING"
  | "FRACTION_PERCENT_VALUE"
  | "POWER_AND_ROOT"
  | "DIVISIBILITY_RULE"
  | "FACTOR_MULTIPLE"
  | "PRIME_COMPOSITE"
  | "PRIME_FACTORIZATION"
  | "OPERATION_PROPERTY"
  | "NUMERICAL_PATTERN"
  | "ARITHMETIC_ERROR_DETECTION"
  | "APPLIED_ARITHMETIC"
  | "ROMAN_NUMERAL"
  | "SET_MEMBERSHIP"
  | "SHAPE_RECOGNITION"
  | "DATA_CLASSIFICATION"
  | "ALGEBRAIC_EXPRESSION_RECOGNITION"
  | "POLYNOMIAL_OPERATION"
  | "RATIONAL_EXPRESSION_OPERATION"
  | "RADICAL_EXPRESSION"
  | "INEQUALITY_PROPERTY"
  | "DATA_RELATION_REASONING"
  | "BANKING_FINANCE"
  | "MIXED_NUMBER_REPRESENTATION"
  | "DIVISION_WITH_REMAINDER";

export type WaveDCanonicalVariantId =
  | "ANGLE_MEASUREMENT"
  | "APPLIED_GEOMETRY_MEASUREMENT"
  | "APPLIED_MEASUREMENT_MODEL"
  | "APPLIED_RATIONAL_REASONING"
  | "AREA_PERIMETER"
  | "CIRCLE_ANGLE_RELATION"
  | "CIRCLE_INSCRIBED_CIRCUMSCRIBED"
  | "CIRCLE_MEASURE"
  | "CIRCLE_RELATION"
  | "COORDINATE_POINT"
  | "DIRECT_MEASUREMENT_ESTIMATION"
  | "DIVISION_REMAINDER"
  | "EARLY_ARITHMETIC_APPLICATION"
  | "FUNCTION_MODEL_RECOGNITION"
  | "GEOMETRIC_CONSTRUCTION_PLAN"
  | "GEOMETRIC_PROOF_REASONING"
  | "LINEAR_EQUATION_MODEL"
  | "LINEAR_FUNCTION_MODEL"
  | "LINEAR_GRAPH_CONSTRUCTION"
  | "LINEAR_GRAPH_RELATION"
  | "LINE_RELATION"
  | "MONEY_FINANCE"
  | "NATURAL_NUMBER_STRUCTURE"
  | "NUMBER_LINE_PLACEMENT"
  | "POINT_LINE_RELATION"
  | "POLYGON_PROPERTIES"
  | "POLYLINE_PERIMETER"
  | "POLYNOMIAL_REASONING"
  | "PYTHAGORE_APPLICATION"
  | "QUADRATIC_GRAPH_CONSTRUCTION"
  | "RIGHT_TRIANGLE_TRIGONOMETRY"
  | "SHAPE_CLASSIFICATION"
  | "SIMILARITY_THALES"
  | "SOLID_NET"
  | "SOLID_PROPERTIES"
  | "SOLID_SURFACE_VOLUME"
  | "SPATIAL_POSITION"
  | "SPEED_DISTANCE_TIME"
  | "SYMMETRY_REGULARITY"
  | "TIME_CALENDAR"
  | "TRIANGLE_CONGRUENCE"
  | "TRIANGLE_PROPERTIES"
  | "TRIANGLE_SPECIAL_LINES"
  | "UNIT_CONVERSION_MEASUREMENT"
  | "UNIT_FRACTION_MODEL"
  | "VIETE_RELATION"
  | "VISUAL_OPERATION_MODEL";

export type WaveECanonicalVariantId =
  | "DIVISION_FACT_APPLICATION" | "PICTOGRAPH_READ" | "EVENT_CERTAINTY_LANGUAGE" | "PICTOGRAPH_INFERENCE"
  | "DATA_COLLECTION_CLASSIFICATION" | "PRACTICAL_MEASUREMENT_PLAN" | "TABLE_DATA_READ" | "TABLE_DATA_INFERENCE"
  | "SIMPLE_TRIAL_OUTCOMES" | "ARITHMETIC_MEAN" | "BAR_CHART_READ" | "BAR_CHART_PROBLEM"
  | "EXPERIMENT_FREQUENCY" | "BAR_CHART_PATTERN" | "VOLUME_ESTIMATION" | "RELATIVE_EXPERIMENT_FREQUENCY"
  | "PIE_CHART_READ" | "PIE_CHART_PROBLEM" | "REPRESENTATION_SELECTION" | "SOFTWARE_GEOMETRY_CONSTRUCTION"
  | "MULTIFORM_DATA_READ" | "MULTIFORM_DATA_PROBLEM" | "PROBABILITY_MODEL" | "DATA_REASONABLENESS"
  | "MULTIFORM_DATA_PATTERN" | "CROSS_CURRICULAR_DATA_READ" | "PIE_LINE_CHART_PROBLEM"
  | "DATA_REPRESENTATION_EQUIVALENCE" | "PIE_LINE_PATTERN" | "THEORETICAL_PROBABILITY_RATIO"
  | "PRACTICAL_DATA_REPRESENTATION" | "LINEAR_FUNCTION_TABLE" | "TRIANGLE_MIDLINE_REASONING"
  | "SOFTWARE_DATA_TOOL" | "QUADRATIC_FUNCTION_TABLE_GRAPH" | "FREQUENCY_COUNT" | "FREQUENCY_INTERPRETATION"
  | "GROUPED_FREQUENCY_TABLE" | "SAMPLE_SPACE_RANDOM_TRIAL" | "GROWTH_INVESTMENT" | "INSURANCE_REASONING"
  | "GEOMETRY_MEDIA_PLAN" | "SOLID_MEASUREMENT_APPLICATION" | "CHEMICAL_EQUATION_SYSTEM"
  | "TRIGONOMETRIC_FIELD_MEASUREMENT" | "GENETICS_PROBABILITY";

export type WaveFCanonicalVariantId =
  | "TENS_ONES_STRUCTURE"
  | "MASS_COMPARISON_REASONING"
  | "UNIFORM_MOTION_REASONING"
  | "CROSS_CURRICULAR_STATISTICS_REASONING"
  | "TAX_CALCULATION_REASONING"
  | "RATIONAL_EXPRESSION_PROPERTY_REASONING"
  | "RATIONAL_EXPRESSION_CONCEPT_REASONING"
  | "SCIENTIFIC_ALGEBRA_REASONING";

export type ProductVariantId =
  | "ADD_SUB_MEANING"
  | "MULTIPLY_DIVIDE_FACTS"
  | "PLACE_VALUE_COMPARE"
  | "FRACTION_PART_WHOLE"
  | "LINEAR_SYSTEM"
  | "GEOMETRY_PROPERTIES"
  | "UNIT_CONVERSION"
  | "PERIMETER_AREA"
  | "CHART_DATA_INTERPRETATION"
  | "EXPERIMENTAL_PROBABILITY"
  | "APPLIED_TWO_STEP"
  | "DATA_ERROR_REASONING"
  | "FRACTION_UNIT_QUANTITY"
  | "PARITY_CLASSIFICATION"
  | "FRACTION_REPRESENTATION"
  | "FRACTION_EQUIVALENCE"
  | "RATIONAL_COMPARE_ORDER"
  | "DECIMAL_COMPARE_ORDER"
  | "PERCENTAGE_REASONING"
  | "FRACTION_APPLICATION"
  | "OPPOSITE_NUMBER"
  | "RATIONAL_OPERATIONS"
  | "NUMERIC_OPERATION_PROPERTIES"
  | "DECIMAL_APPLICATION"
  | "DECIMAL_OPERATIONS"
  | "RATIO_PROPORTION"
  | "SYMMETRY_RECOGNITION"
  | "RATIONAL_NUMBER_LINE"
  | "NUMBER_SET_CLASSIFICATION"
  | "RATIONAL_POWER"
  | "RATIONAL_OPERATION_ORDER"
  | "PROPORTIONAL_REASONING"
  | "REAL_NUMBER_ORDER"
  | "ALGEBRAIC_SUBSTITUTION"
  | "FRACTION_COMMON_DENOMINATOR"
  | "DATA_SEQUENCE_RECOGNITION"
  | "DATA_INVESTIGATION"
  | "DECIMAL_REPRESENTATION"
  | "MIXED_DECIMAL_FRACTION_REPRESENTATION"
  | "DECIMAL_ROUNDING"
  | "SCALE_REASONING"
  | "DECIMAL_SCALE_OPERATION"
  | "SIGNED_FRACTION_REPRESENTATION"
  | "ALGEBRAIC_IDENTITY"
  | "POLYNOMIAL_SIMPLIFICATION"
  | "FUNCTION_GRAPH_RECOGNITION"
  | "FUNCTION_EVALUATION"
  | "POLYNOMIAL_FACTORIZATION"
  | "QUADRATIC_MODELING"
  | "QUADRATIC_GRAPH_SYMMETRY"
  | "RADICAL_TRANSFORMATION"
  | "QUADRATIC_EQUATION_SOLVING"
  | "RATIONAL_EQUATION_SOLVING"
  | "PRODUCT_EQUATION_SOLVING"
  | "LINEAR_SYSTEM_MODELING"
  | "LINEAR_SYSTEM_SOLUTION_CHECK"
  | "QUADRATIC_EQUATION_RECOGNITION"
  | "LINEAR_SYSTEM_RECOGNITION"
  | "LINEAR_INEQUALITY_SOLVING"
  | "LINEAR_INEQUALITY_RECOGNITION"
  | WaveACanonicalVariantId
  | WaveDCanonicalVariantId
  | WaveECanonicalVariantId
  | WaveFCanonicalVariantId;

export type PublicOption = Readonly<{ id: string; label: string }>;
export type MatchingPair = Readonly<{ leftId: string; rightId: string }>;
export type FractionValue = Readonly<{ numerator: number; denominator: number }>;

export type ProductInteractionContract = Readonly<{
  type: ProductInteractionType;
  options?: readonly PublicOption[];
  choiceCount?: number;
  orderedItemIds?: readonly string[];
  leftItems?: readonly PublicOption[];
  rightItems?: readonly PublicOption[];
  inputLabel?: string;
  inputMode?: "numeric" | "decimal" | "text";
  unitLabel?: string;
}>;

export type ProductVisual = Readonly<{
  type:
    | "NONE"
    | "OBJECT_GROUPS"
    | "PLACE_VALUE_CHART"
    | "FRACTION_MODEL"
    | "SHAPE_DIAGRAM"
    | "MEASUREMENT_MODEL"
    | "AREA_MODEL"
    | "BAR_CHART"
    | "EXPERIMENT_TABLE"
    | "DATA_TABLE"
    | "NUMBER_LINE"
    | "COORDINATE_GRAPH";
  description: string;
  data: Readonly<Record<string, unknown>>;
}>;

export type PublicQuestionSnapshot = Readonly<{
  schemaVersion: 2;
  questionId: string;
  grade: number;
  outcomeId: string;
  productFamilyId: string;
  variantId: ProductVariantId;
  variantVersion: typeof VARIANT_VERSION;
  difficulty: ProductDifficulty;
  publicPrompt: string;
  publicData: Readonly<Record<string, unknown>>;
  interaction: ProductInteractionContract;
  visual: ProductVisual;
  accessibility: Readonly<{
    prompt: string;
    visualAlternative: string;
    responseInstruction: string;
  }>;
}>;

export type MisconceptionCode =
  | "CARRY_BORROW_ERROR"
  | "PLACE_VALUE_CONFUSION"
  | "REVERSED_OPERATION"
  | "MULTIPLICATION_AS_ADDITION"
  | "NUMERATOR_DENOMINATOR_CONFUSION"
  | "SIGN_ERROR"
  | "UNIT_CONVERSION_ERROR"
  | "PERIMETER_AREA_CONFUSION"
  | "MISREAD_CHART_SCALE"
  | "PROBABILITY_DENOMINATOR_ERROR"
  | "IGNORED_SECOND_STEP"
  | "DATA_RELATION_IGNORED"
  | "ROUNDING_PLACE_ERROR"
  | "FACTOR_MULTIPLE_CONFUSION"
  | "PRIME_COMPOSITE_CONFUSION"
  | "EXPONENT_RULE_ERROR"
  | "ORDER_OF_OPERATIONS_ERROR"
  | "REMAINDER_ERROR"
  | "ALGEBRAIC_SIGN_ERROR"
  | "EQUATION_DOMAIN_ERROR"
  | "LIKE_TERM_ERROR"
  | "FUNCTION_SUBSTITUTION_ERROR"
  | "INEQUALITY_DIRECTION_ERROR"
  | "GRAPH_INTERPRETATION_ERROR"
  | "RADICAL_DOMAIN_ERROR";

export type CanonicalResponse =
  | number
  | string
  | FractionValue
  | readonly string[]
  | readonly MatchingPair[];

export type PrivateSolutionContract = Readonly<{
  correctResponse: CanonicalResponse;
  acceptedResponses: readonly CanonicalResponse[];
  solutionSteps: readonly string[];
  optionMisconceptions: Readonly<Record<string, MisconceptionCode>>;
  nextStep: string;
}>;

export type SolverReceipt = Readonly<{
  solverVersion: typeof SOLVER_VERSION;
  normalizedInputHash: string;
  resultHash: string;
  uniqueSolution: boolean;
}>;

export type ValidationResult = Readonly<{
  ok: true;
  checks: readonly string[];
}>;

export type ProvenanceContract = Readonly<{
  questionSource: "GENERATED_V2";
  outcomeId: string;
  productFamilyId: string;
  variantId: ProductVariantId;
  variantVersion: typeof VARIANT_VERSION;
  generatorVersion: typeof GENERATOR_V2_VERSION;
  solverVersion: typeof SOLVER_VERSION;
  difficultyPolicyVersion: typeof DIFFICULTY_POLICY_VERSION;
  seedFingerprint: string;
  normalizedModelHash: string;
  publicSnapshotHash: string;
  visualHash: string;
  solverReceiptHash: string;
}>;

export type FeedbackContract = Readonly<{
  isCorrect: boolean;
  headline: string;
  explanation: string;
  steps: readonly string[];
  nextStep: string;
  misconception?: MisconceptionCode;
}>;

export type GeneratedProductQuestion = Readonly<{
  publicSnapshot: PublicQuestionSnapshot;
  privateSolution: PrivateSolutionContract;
  solverReceipt: SolverReceipt;
  validation: ValidationResult;
  provenance: ProvenanceContract;
}>;

export type GenerateQuestionInput = Readonly<{
  outcomeId: string;
  grade: number;
  difficulty: ProductDifficulty;
  seed: string;
  interactionType?: ProductInteractionType;
  locale: ProductLocale;
}>;

export type GenerationV2ErrorCode =
  | "GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED"
  | "GRADE_MISMATCH"
  | "LOCALE_UNSUPPORTED"
  | "INTERACTION_UNSUPPORTED"
  | "INVALID_SEED"
  | "MODEL_CONSTRAINT_FAILED"
  | "SOLVER_FAILED"
  | "VALIDATION_FAILED";

export class GenerationV2Error extends Error {
  readonly code: GenerationV2ErrorCode;
  constructor(code: GenerationV2ErrorCode) {
    super(code === "GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED" ? code : `GENERATION_V2:${code}`);
    this.code = code;
    this.name = "GenerationV2Error";
  }
}
