import type {
  ProductDifficulty,
  ProductInteractionType,
  ProductVariantId,
  WaveACanonicalVariantId,
} from "./types.ts";

export const WAVE_A_CONTRACT_VERSION = "PLAVE_PRODUCT_ASSESSMENT_CONTRACT_V2" as const;
export const WAVE_A_ENGINE_VERSION = "plave-generator-v2-wave-a.1" as const;

export type WaveAModelKind =
  | "NUMERIC"
  | "ORDER"
  | "ROUND"
  | "MATCH"
  | "INTEGER_LINE"
  | "FRACTION"
  | "POWER_ROOT"
  | "MULTI_SELECT"
  | "CLASSIFY"
  | "PATTERN"
  | "APPLIED"
  | "ROMAN"
  | "SET"
  | "SHAPE"
  | "DATA"
  | "ALGEBRA"
  | "POLYNOMIAL"
  | "RADICAL"
  | "INEQUALITY"
  | "BANKING"
  | "MIXED_NUMBER"
  | "REMAINDER";

export type WaveAProfile =
  | "WHOLE"
  | "DECIMAL"
  | "INTEGER"
  | "FRACTION"
  | "PERCENT"
  | "ALGEBRA"
  | "RADICAL"
  | "DATA"
  | "FINANCE"
  | "GEOMETRY";

export type WaveAOutcomeContract = Readonly<{
  contractType: typeof WAVE_A_CONTRACT_VERSION;
  contractVersion: "wave-a-v2.1";
  engineVersion: typeof WAVE_A_ENGINE_VERSION | "PROVEN_V2_BASELINE";
  outcomeId: string;
  grade: number;
  unitId: string;
  productFamilyId: string;
  canonicalVariantId: ProductVariantId;
  modelKind: WaveAModelKind | "PROVEN_V2_BASELINE";
  profile: WaveAProfile;
  measurableIntent: string;
  permittedEvidenceForms: readonly string[];
  normalizedProblemModel: Readonly<{ kind: string; requiredFields: readonly string[] }>;
  parameterBounds: Readonly<{
    minimum: number;
    maximum: number;
    maxSteps: number;
    allowNegative: boolean;
    maxDecimalPlaces: number;
    maxDenominator: number;
    maxExponent: number;
    carryBorrowPolicy: string;
    languageBand: string;
  }>;
  acceptedAnswerPolicy: string;
  uniquenessPolicy: "EXACTLY_ONE_NORMALIZED_ANSWER";
  interactionPolicy: readonly ProductInteractionType[];
  difficultyPolicy: Readonly<Record<ProductDifficulty, string>>;
  variationPolicy: readonly string[];
  independentSolver: string;
  independentValidator: string;
  misconceptionCatalog: readonly string[];
  distractorPolicy: string;
  feedbackPolicy: string;
  visualPolicy: string;
  prerequisitePolicy: string;
}>;

type CapabilityPolicy = Readonly<{
  modelKind: WaveAModelKind;
  family: string;
  interactions: readonly ProductInteractionType[];
  evidence: readonly string[];
  modelFields: readonly string[];
  answerPolicy: string;
  misconceptions: readonly string[];
  visual: string;
}>;

const CAPABILITY_POLICIES: Readonly<Record<WaveACanonicalVariantId, CapabilityPolicy>> = {
  NUMBER_RECOGNITION_REPRESENTATION: { modelKind: "NUMERIC", family: "NUMBER_SENSE", interactions: ["INTEGER_INPUT", "SINGLE_CHOICE"], evidence: ["read-number", "compose-number", "represent-number"], modelFields: ["placeValues", "representation"], answerPolicy: "normalized integer", misconceptions: ["place-value shift", "digit reversal"], visual: "PLACE_VALUE_CHART when representation is evidence" },
  COUNTING_SEQUENCE: { modelKind: "PATTERN", family: "NUMBER_SENSE", interactions: ["INTEGER_INPUT"], evidence: ["continue-sequence", "identify-predecessor-successor"], modelFields: ["start", "step", "unknownIndex"], answerPolicy: "normalized integer", misconceptions: ["wrong direction", "off-by-one"], visual: "NUMBER_LINE for predecessor/successor evidence" },
  PLACE_VALUE_COMPOSE: { modelKind: "NUMERIC", family: "PLACE_VALUE", interactions: ["INTEGER_INPUT"], evidence: ["compose", "decompose", "digit-value"], modelFields: ["digits", "placeValues", "unknownPlace"], answerPolicy: "normalized integer", misconceptions: ["place-value shift", "zero placeholder omitted"], visual: "PLACE_VALUE_CHART" },
  COMPARE_ORDER: { modelKind: "ORDER", family: "NUMBER_SENSE", interactions: ["ORDERING", "SINGLE_CHOICE"], evidence: ["compare", "order", "extreme-value"], modelFields: ["values", "direction", "numberDomain"], answerPolicy: "exact ordered item ids", misconceptions: ["reversed order", "place-value confusion", "sign confusion"], visual: "NUMBER_LINE for signed values; otherwise NONE" },
  COMPARE_ORDER_ESTIMATE: { modelKind: "ORDER", family: "NUMBER_SENSE", interactions: ["ORDERING", "INTEGER_INPUT"], evidence: ["order", "estimate-by-tens"], modelFields: ["values", "direction", "estimationGroup"], answerPolicy: "exact ordered ids or normalized integer by task", misconceptions: ["reversed order", "wrong estimation group"], visual: "OBJECT_GROUPS when estimating; otherwise NONE" },
  ROUND_ESTIMATE: { modelKind: "ROUND", family: "NUMBER_SENSE", interactions: ["INTEGER_INPUT", "DECIMAL_INPUT"], evidence: ["round-to-place", "estimate-with-precision"], modelFields: ["value", "roundingPlace", "precision"], answerPolicy: "normalized integer or decimal", misconceptions: ["rounded wrong place", "ignored next digit"], visual: "NUMBER_LINE for midpoint evidence" },
  ADD_SUB_CALCULATION: { modelKind: "NUMERIC", family: "WHOLE_NUMBER_OPERATIONS", interactions: ["INTEGER_INPUT"], evidence: ["addition", "subtraction", "unknown-position"], modelFields: ["operands", "operations", "unknownPosition"], answerPolicy: "normalized integer", misconceptions: ["missed carry", "missed borrow", "reversed operation"], visual: "OBJECT_GROUPS only in lower grades" },
  MENTAL_ARITHMETIC: { modelKind: "NUMERIC", family: "WHOLE_NUMBER_OPERATIONS", interactions: ["INTEGER_INPUT"], evidence: ["mental-strategy", "compensation", "round-number calculation"], modelFields: ["operands", "operations", "strategyShape"], answerPolicy: "normalized integer", misconceptions: ["place-value shift", "wrong compensation"], visual: "NONE" },
  WRITTEN_ARITHMETIC: { modelKind: "NUMERIC", family: "WHOLE_NUMBER_OPERATIONS", interactions: ["INTEGER_INPUT"], evidence: ["written-calculation", "multi-digit operation"], modelFields: ["operands", "operations", "carryBorrowCount"], answerPolicy: "normalized integer", misconceptions: ["missed carry", "missed borrow", "partial product omitted"], visual: "NONE" },
  MULTIPLY_DIVIDE: { modelKind: "NUMERIC", family: "WHOLE_NUMBER_OPERATIONS", interactions: ["INTEGER_INPUT", "SINGLE_CHOICE"], evidence: ["equal-groups", "multiplication", "division"], modelFields: ["factors", "dividend", "divisor", "unknownPosition"], answerPolicy: "normalized integer", misconceptions: ["multiplication/division confusion", "added factors"], visual: "OBJECT_GROUPS in Grades 1–3" },
  MIXED_ARITHMETIC_EXPRESSION: { modelKind: "NUMERIC", family: "NUMERICAL_EXPRESSIONS", interactions: ["INTEGER_INPUT"], evidence: ["evaluate-expression", "operation-order", "parentheses"], modelFields: ["operands", "operations", "parentheses", "unknownPosition"], answerPolicy: "normalized integer", misconceptions: ["left-to-right error", "parentheses ignored"], visual: "NONE" },
  OPERATION_COMPONENTS: { modelKind: "MATCH", family: "OPERATION_LANGUAGE", interactions: ["MATCHING"], evidence: ["identify-operation-components"], modelFields: ["operation", "operands", "componentRoles"], answerPolicy: "exact normalized matching pairs", misconceptions: ["operand/result role confusion", "multiplication/division term confusion"], visual: "NONE" },
  MISSING_COMPONENT: { modelKind: "NUMERIC", family: "OPERATION_LANGUAGE", interactions: ["INTEGER_INPUT"], evidence: ["inverse-operation", "find-unknown-component"], modelFields: ["operation", "knownValues", "unknownRole"], answerPolicy: "normalized integer", misconceptions: ["wrong inverse operation", "reversed operands"], visual: "NONE" },
  INTEGER_NUMBER_LINE: { modelKind: "INTEGER_LINE", family: "INTEGERS", interactions: ["INTEGER_INPUT", "ORDERING"], evidence: ["locate-integer", "opposite-number", "interpret-negative"], modelFields: ["ticks", "markedPosition", "task"], answerPolicy: "normalized integer or exact ordered ids", misconceptions: ["sign error", "reversed number line"], visual: "NUMBER_LINE required" },
  INTEGER_OPERATION: { modelKind: "NUMERIC", family: "INTEGERS", interactions: ["INTEGER_INPUT"], evidence: ["integer-operation", "sign-rule", "parentheses"], modelFields: ["signedOperands", "operations", "parentheses"], answerPolicy: "normalized integer", misconceptions: ["sign error", "parentheses ignored"], visual: "NONE" },
  RATIONAL_NUMBER_REASONING: { modelKind: "FRACTION", family: "RATIONAL_NUMBERS", interactions: ["FRACTION_INPUT", "SINGLE_CHOICE"], evidence: ["compare-fractions", "rational-operation"], modelFields: ["fractions", "operation", "commonDenominator"], answerPolicy: "equivalent reduced fractions accepted", misconceptions: ["numerator-only comparison", "denominator addition"], visual: "FRACTION_MODEL when representation is evidence" },
  FRACTION_PERCENT_VALUE: { modelKind: "FRACTION", family: "RATIONAL_NUMBERS", interactions: ["INTEGER_INPUT", "DECIMAL_INPUT"], evidence: ["fraction-of-quantity", "percent-of-quantity", "recover-whole"], modelFields: ["rate", "wholeOrPart", "unknownRole"], answerPolicy: "normalized numeric value", misconceptions: ["multiplied by denominator", "percent treated as whole number"], visual: "NONE" },
  POWER_AND_ROOT: { modelKind: "POWER_ROOT", family: "POWERS_ROOTS", interactions: ["INTEGER_INPUT", "DECIMAL_INPUT", "SINGLE_CHOICE"], evidence: ["evaluate-power", "same-base rule", "principal-root"], modelFields: ["base", "exponents", "rootIndex", "task"], answerPolicy: "exact integer or bounded decimal", misconceptions: ["multiplied base by exponent", "added exponents for division", "negative principal root"], visual: "NONE" },
  DIVISIBILITY_RULE: { modelKind: "MULTI_SELECT", family: "DIVISIBILITY", interactions: ["MULTI_SELECT"], evidence: ["apply-divisibility-rule", "identify-divisible-numbers"], modelFields: ["candidates", "divisor"], answerPolicy: "exact unordered selected ids", misconceptions: ["factor/multiple confusion", "digit-sum rule misapplied"], visual: "NONE" },
  FACTOR_MULTIPLE: { modelKind: "MULTI_SELECT", family: "DIVISIBILITY", interactions: ["MULTI_SELECT", "INTEGER_INPUT"], evidence: ["identify-factor-multiple", "gcd-lcm"], modelFields: ["numbers", "candidateFactors", "task"], answerPolicy: "exact selection or normalized integer", misconceptions: ["factor/multiple confusion", "gcd/lcm swapped"], visual: "NONE" },
  PRIME_COMPOSITE: { modelKind: "CLASSIFY", family: "DIVISIBILITY", interactions: ["SINGLE_CHOICE"], evidence: ["classify-prime-composite"], modelFields: ["value", "factorWitness"], answerPolicy: "one classification id", misconceptions: ["one treated as prime", "odd treated as prime"], visual: "NONE" },
  PRIME_FACTORIZATION: { modelKind: "CLASSIFY", family: "DIVISIBILITY", interactions: ["SINGLE_CHOICE"], evidence: ["select-prime-factorization"], modelFields: ["value", "primeFactors"], answerPolicy: "one equivalent factorization id", misconceptions: ["non-prime factor retained", "factor omitted"], visual: "NONE" },
  OPERATION_PROPERTY: { modelKind: "CLASSIFY", family: "OPERATION_PROPERTIES", interactions: ["SINGLE_CHOICE"], evidence: ["identify-equivalent-expression", "apply-commutative-associative-distributive"], modelFields: ["expression", "property", "equivalents"], answerPolicy: "one mathematically equivalent option", misconceptions: ["operation precedence error", "invalid distribution"], visual: "NONE" },
  NUMERICAL_PATTERN: { modelKind: "PATTERN", family: "NUMBER_PATTERNS", interactions: ["INTEGER_INPUT"], evidence: ["continue-pattern", "infer-arithmetic-rule"], modelFields: ["terms", "rule", "unknownIndex"], answerPolicy: "normalized integer", misconceptions: ["wrong repeated difference", "copied previous term"], visual: "NUMBER_LINE optional" },
  ARITHMETIC_ERROR_DETECTION: { modelKind: "CLASSIFY", family: "MATHEMATICAL_REASONING", interactions: ["SINGLE_CHOICE"], evidence: ["detect-error", "select-correction"], modelFields: ["workedSteps", "errorType", "correctedValue"], answerPolicy: "one error/correction option", misconceptions: ["missed carry", "sign error", "precedence error"], visual: "NONE" },
  APPLIED_ARITHMETIC: { modelKind: "APPLIED", family: "APPLIED_MATHEMATICS", interactions: ["INTEGER_INPUT", "DECIMAL_INPUT"], evidence: ["model-context", "multi-step-arithmetic", "select-information"], modelFields: ["quantities", "relations", "unknown", "relevantInformation"], answerPolicy: "normalized numeric answer with explicit unit", misconceptions: ["wrong operation", "ignored step", "used irrelevant information"], visual: "visual only when mathematical evidence" },
  ROMAN_NUMERAL: { modelKind: "ROMAN", family: "NUMBER_REPRESENTATION", interactions: ["SINGLE_CHOICE", "INTEGER_INPUT"], evidence: ["convert-roman-natural"], modelFields: ["naturalValue", "romanValue", "direction"], answerPolicy: "canonical Roman numeral or normalized integer", misconceptions: ["subtractive notation reversed", "symbol value confusion"], visual: "NONE" },
  SET_MEMBERSHIP: { modelKind: "SET", family: "SETS", interactions: ["MULTI_SELECT", "SINGLE_CHOICE"], evidence: ["identify-member", "represent-finite-set"], modelFields: ["universe", "setRule", "members"], answerPolicy: "exact unordered member ids", misconceptions: ["member/non-member confusion", "boundary omitted"], visual: "NONE" },
  SHAPE_RECOGNITION: { modelKind: "SHAPE", family: "GEOMETRY", interactions: ["CONSTRUCTION_OR_VISUAL_SELECTION"], evidence: ["recognize-solid-by-properties"], modelFields: ["shape", "properties", "orientation"], answerPolicy: "one shape id", misconceptions: ["cylinder/sphere confusion", "2D/3D confusion"], visual: "SHAPE_DIAGRAM required" },
  DATA_CLASSIFICATION: { modelKind: "DATA", family: "STATISTICS", interactions: ["ORDERING", "MULTI_SELECT"], evidence: ["classify-data", "order-data-by-criterion"], modelFields: ["records", "criterion", "expectedGroups"], answerPolicy: "exact ordered or selected record ids", misconceptions: ["wrong criterion", "ascending/descending reversal"], visual: "DATA_TABLE required" },
  ALGEBRAIC_EXPRESSION_RECOGNITION: { modelKind: "ALGEBRA", family: "ALGEBRA", interactions: ["SINGLE_CHOICE", "MATCHING"], evidence: ["recognize-expression", "identify-degree", "identify-term"], modelFields: ["coefficients", "variables", "degrees", "task"], answerPolicy: "one canonical symbolic option or exact match", misconceptions: ["coefficient/exponent confusion", "degree terms added incorrectly"], visual: "NONE" },
  POLYNOMIAL_OPERATION: { modelKind: "POLYNOMIAL", family: "ALGEBRA", interactions: ["SINGLE_CHOICE", "INTEGER_INPUT"], evidence: ["polynomial-operation", "evaluate-polynomial", "exact-division"], modelFields: ["coefficientVectors", "operation", "evaluationPoint"], answerPolicy: "one normalized coefficient vector or numeric evaluation", misconceptions: ["like terms not combined", "sign distribution error", "degree error"], visual: "NONE" },
  RATIONAL_EXPRESSION_OPERATION: { modelKind: "ALGEBRA", family: "ALGEBRA", interactions: ["FRACTION_INPUT", "SINGLE_CHOICE"], evidence: ["operate-rational-expressions", "apply-operation-properties"], modelFields: ["numeratorCoefficients", "denominatorCoefficients", "operation", "safeEvaluationPoint"], answerPolicy: "equivalent reduced fraction at stated evaluation point", misconceptions: ["denominators added", "distribution error", "zero denominator ignored"], visual: "NONE" },
  RADICAL_EXPRESSION: { modelKind: "RADICAL", family: "ALGEBRA", interactions: ["INTEGER_INPUT", "SINGLE_CHOICE"], evidence: ["recognize-radical-expression", "simplify-perfect-factor", "evaluate-root"], modelFields: ["radicand", "rootIndex", "perfectFactor", "task"], answerPolicy: "principal real root or one equivalent radical form", misconceptions: ["negative square root chosen", "root distributed over sum", "perfect factor missed"], visual: "NONE" },
  INEQUALITY_PROPERTY: { modelKind: "INEQUALITY", family: "ALGEBRA", interactions: ["SINGLE_CHOICE"], evidence: ["apply-order-property", "recognize-transitivity"], modelFields: ["relation", "transformation", "signOfMultiplier"], answerPolicy: "one logically valid inequality", misconceptions: ["direction not reversed for negative multiplier", "invalid transitive chain"], visual: "NUMBER_LINE optional" },
  DATA_RELATION_REASONING: { modelKind: "DATA", family: "MATHEMATICAL_REASONING", interactions: ["INTEGER_INPUT", "SINGLE_CHOICE"], evidence: ["infer-simple-data-relation", "check-numeric-consistency"], modelFields: ["records", "relation", "unknown"], answerPolicy: "one relation-consistent value", misconceptions: ["ignored relation", "used wrong row"], visual: "DATA_TABLE required" },
  BANKING_FINANCE: { modelKind: "BANKING", family: "FINANCIAL_LITERACY", interactions: ["DECIMAL_INPUT", "INTEGER_INPUT"], evidence: ["simple-interest", "transaction-balance", "investment-capital"], modelFields: ["principal", "rate", "periods", "transactionType", "unknown"], answerPolicy: "normalized currency amount", misconceptions: ["rate not converted to decimal", "interest/principal swapped"], visual: "DATA_TABLE for transaction evidence" },
  MIXED_NUMBER_REPRESENTATION: { modelKind: "MIXED_NUMBER", family: "RATIONAL_NUMBERS", interactions: ["FRACTION_INPUT", "SINGLE_CHOICE"], evidence: ["recognize-mixed-number", "convert-mixed-improper"], modelFields: ["whole", "numerator", "denominator", "direction"], answerPolicy: "equivalent reduced fraction accepted", misconceptions: ["whole not multiplied by denominator", "numerator/denominator swapped"], visual: "FRACTION_MODEL optional" },
  DIVISION_WITH_REMAINDER: { modelKind: "REMAINDER", family: "WHOLE_NUMBER_OPERATIONS", interactions: ["INTEGER_INPUT", "MATCHING"], evidence: ["division-exact-or-remainder", "interpret-quotient-remainder"], modelFields: ["dividend", "divisor", "quotient", "remainder", "unknown"], answerPolicy: "normalized quotient or remainder requested explicitly", misconceptions: ["remainder at least divisor", "quotient/remainder swapped"], visual: "OBJECT_GROUPS optional" },
};

const GRADE_BOUNDS: Readonly<Record<number, WaveAOutcomeContract["parameterBounds"]>> = {
  1: { minimum: 0, maximum: 100, maxSteps: 2, allowNegative: false, maxDecimalPlaces: 0, maxDenominator: 1, maxExponent: 1, carryBorrowPolicy: "no carry/borrow unless the outcome explicitly permits it", languageBand: "short concrete Grade 1 Vietnamese" },
  2: { minimum: 0, maximum: 1_000, maxSteps: 2, allowNegative: false, maxDecimalPlaces: 0, maxDenominator: 1, maxExponent: 1, carryBorrowPolicy: "at most one carry/borrow when permitted", languageBand: "concrete Grade 2 Vietnamese" },
  3: { minimum: 0, maximum: 100_000, maxSteps: 3, allowNegative: false, maxDecimalPlaces: 0, maxDenominator: 12, maxExponent: 2, carryBorrowPolicy: "grade-appropriate written arithmetic", languageBand: "Grade 3 Vietnamese with explicit quantities" },
  4: { minimum: 0, maximum: 100_000_000, maxSteps: 3, allowNegative: false, maxDecimalPlaces: 0, maxDenominator: 20, maxExponent: 3, carryBorrowPolicy: "at most three non-consecutive carries/borrows where stated", languageBand: "Grade 4 Vietnamese" },
  5: { minimum: 0, maximum: 1_000_000_000, maxSteps: 4, allowNegative: false, maxDecimalPlaces: 3, maxDenominator: 100, maxExponent: 3, carryBorrowPolicy: "unrestricted within natural-number outcome bounds", languageBand: "Grade 5 Vietnamese" },
  6: { minimum: -10_000, maximum: 1_000_000, maxSteps: 4, allowNegative: true, maxDecimalPlaces: 3, maxDenominator: 60, maxExponent: 6, carryBorrowPolicy: "signed and natural-number rules explicit", languageBand: "Grade 6 mathematical Vietnamese" },
  7: { minimum: -100_000, maximum: 1_000_000, maxSteps: 4, allowNegative: true, maxDecimalPlaces: 4, maxDenominator: 100, maxExponent: 8, carryBorrowPolicy: "rational-number rules explicit", languageBand: "Grade 7 mathematical Vietnamese" },
  8: { minimum: -1_000_000, maximum: 1_000_000, maxSteps: 5, allowNegative: true, maxDecimalPlaces: 4, maxDenominator: 100, maxExponent: 8, carryBorrowPolicy: "algebraic sign rules explicit", languageBand: "Grade 8 algebraic Vietnamese" },
  9: { minimum: -1_000_000, maximum: 1_000_000, maxSteps: 5, allowNegative: true, maxDecimalPlaces: 5, maxDenominator: 100, maxExponent: 10, carryBorrowPolicy: "real-number and algebraic rules explicit", languageBand: "Grade 9 algebraic Vietnamese" },
};

type OutcomeSpec = Readonly<{
  id: string;
  grade: number;
  capability: ProductVariantId;
  profile: WaveAProfile;
  intent: string;
  engine?: "PROVEN_V2_BASELINE";
}>;

const s = (id: string, grade: number, capability: ProductVariantId, profile: WaveAProfile, intent: string, engine?: "PROVEN_V2_BASELINE"): OutcomeSpec => ({ id, grade, capability, profile, intent, ...(engine ? { engine } : {}) });

const OUTCOME_SPECS = [
  s("MOET2018-G1-NUM-P021-001", 1, "NUMBER_RECOGNITION_REPRESENTATION", "WHOLE", "Đếm và chuyển đổi giữa cách đọc, cách viết và biểu diễn số tự nhiên trong phạm vi lớp 1."),
  s("MOET2018-G1-NUM-P022-002", 1, "MIXED_ARITHMETIC_EXPRESSION", "WHOLE", "Tính biểu thức có hai dấu cộng/trừ theo thứ tự từ trái sang phải."),
  s("MOET2018-G1-NUM-P022-004", 1, "ADD_SUB_MEANING", "WHOLE", "Nhận biết ý nghĩa thêm vào và bớt đi của phép cộng, phép trừ.", "PROVEN_V2_BASELINE"),
  s("MOET2018-G1-NUM-P022-005", 1, "APPLIED_ARITHMETIC", "WHOLE", "Lập phép cộng hoặc trừ phù hợp với một tình huống có lời văn và tính kết quả."),
  s("MOET2018-G1-NUM-P022-006", 1, "COMPARE_ORDER", "WHOLE", "So sánh và xếp thứ tự tối đa bốn số trong phạm vi 100."),
  s("MOET2018-G1-NUM-P022-007", 1, "ADD_SUB_CALCULATION", "WHOLE", "Thực hiện cộng, trừ không nhớ trong phạm vi 100."),
  s("MOET2018-G1-NUM-P022-008", 1, "MENTAL_ARITHMETIC", "WHOLE", "Cộng, trừ nhẩm các số tròn chục trong phạm vi 100."),
  s("MOET2018-G1-NUM-P022-010", 1, "MENTAL_ARITHMETIC", "WHOLE", "Cộng, trừ nhẩm trong phạm vi 10."),
  s("MOET2018-G2-NUM-P024-002", 2, "COUNTING_SEQUENCE", "WHOLE", "Xác định số liền trước hoặc liền sau của một số."),
  s("MOET2018-G2-NUM-P025-005", 2, "OPERATION_COMPONENTS", "WHOLE", "Nhận biết số hạng, tổng, số bị trừ, số trừ và hiệu."),
  s("MOET2018-G2-NUM-P025-006", 2, "OPERATION_COMPONENTS", "WHOLE", "Nhận biết thừa số, tích, số bị chia, số chia và thương."),
  s("MOET2018-G2-NUM-P025-007", 2, "COMPARE_ORDER", "WHOLE", "So sánh hai số trong phạm vi 1000 bằng giá trị theo hàng."),
  s("MOET2018-G2-NUM-P025-009", 2, "MULTIPLY_DIVIDE", "WHOLE", "Nhận biết phép nhân là các nhóm bằng nhau và phép chia là chia đều hoặc chia theo nhóm."),
  s("MOET2018-G2-NUM-P025-011", 2, "WRITTEN_ARITHMETIC", "WHOLE", "Cộng, trừ đến 1000 với nhiều nhất một lượt nhớ hoặc mượn."),
  s("MOET2018-G2-NUM-P025-012", 2, "MENTAL_ARITHMETIC", "WHOLE", "Cộng, trừ nhẩm số tròn chục hoặc tròn trăm trong phạm vi 1000."),
  s("MOET2018-G2-NUM-P025-013", 2, "MENTAL_ARITHMETIC", "WHOLE", "Cộng, trừ nhẩm trong phạm vi 20."),
  s("MOET2018-G2-NUM-P025-014", 2, "COMPARE_ORDER_ESTIMATE", "WHOLE", "Xếp tối đa bốn số trong phạm vi 1000 và ước lượng đồ vật theo nhóm chục."),
  s("MOET2018-G2-NUM-P025-015", 2, "MIXED_ARITHMETIC_EXPRESSION", "WHOLE", "Tính biểu thức có hai dấu cộng/trừ theo thứ tự từ trái sang phải."),
  s("MOET2018-G2-NUM-P025-016", 2, "ROUND_ESTIMATE", "WHOLE", "Ước lượng số lượng theo các nhóm một chục."),
  s("MOET2018-G2-NUM-P025-018", 2, "MULTIPLY_DIVIDE_FACTS", "WHOLE", "Vận dụng bảng nhân 2 và bảng nhân 5.", "PROVEN_V2_BASELINE"),
  s("MOET2018-G2-NUM-P025-019", 2, "COMPARE_ORDER", "WHOLE", "Xác định số lớn nhất hoặc nhỏ nhất trong tối đa bốn số đến 1000."),
  s("MOET2018-G2-NUM-P026-020", 2, "APPLIED_ARITHMETIC", "WHOLE", "Giải bài toán một bước về thêm, bớt, nhiều hơn hoặc ít hơn."),
  s("MOET2018-G2-GEO-P026-008", 2, "SHAPE_RECOGNITION", "GEOMETRY", "Phân biệt khối trụ và khối cầu qua thuộc tính quan sát được."),
  s("MOET2018-G3-NUM-P029-004", 3, "PLACE_VALUE_COMPARE", "WHOLE", "Nhận biết cấu tạo thập phân và giá trị theo hàng của số.", "PROVEN_V2_BASELINE"),
  s("MOET2018-G3-NUM-P030-012", 3, "MENTAL_ARITHMETIC", "WHOLE", "Cộng, trừ, nhân hoặc chia nhẩm trong trường hợp đơn giản."),
  s("MOET2018-G3-NUM-P030-014", 3, "MIXED_ARITHMETIC_EXPRESSION", "WHOLE", "Nhận biết và tính giá trị biểu thức số đơn giản."),
  s("MOET2018-G3-NUM-P030-016", 3, "DIVISION_WITH_REMAINDER", "WHOLE", "Thực hiện phép chia hết và phép chia có dư với số dư hợp lệ."),
  s("MOET2018-G3-NUM-P030-022", 3, "MISSING_COMPONENT", "WHOLE", "Tìm thành phần chưa biết bằng quan hệ nghịch đảo của phép tính."),
  s("MOET2018-G3-EXP-P034-002", 3, "DATA_CLASSIFICATION", "DATA", "Phân loại và sắp xếp một bộ số liệu nhỏ theo tiêu chí được nêu rõ."),
  s("MOET2018-G4-NUM-P035-007", 4, "ROUND_ESTIMATE", "WHOLE", "Làm tròn số tự nhiên đến hàng được chỉ định."),
  s("MOET2018-G4-NUM-P035-008", 4, "WRITTEN_ARITHMETIC", "WHOLE", "Cộng, trừ số tự nhiên nhiều chữ số trong giới hạn nhớ đã nêu."),
  s("MOET2018-G4-NUM-P035-009", 4, "MULTIPLY_DIVIDE", "WHOLE", "Chia số tự nhiên cho số có không quá hai chữ số."),
  s("MOET2018-G4-NUM-P035-010", 4, "MENTAL_ARITHMETIC", "WHOLE", "Nhân hoặc chia số tự nhiên cho lũy thừa của 10."),
  s("MOET2018-G4-NUM-P035-011", 4, "WRITTEN_ARITHMETIC", "WHOLE", "Nhân số tự nhiên với số có không quá hai chữ số."),
  s("MOET2018-G4-NUM-P035-013", 4, "MENTAL_ARITHMETIC", "WHOLE", "Dùng cấu tạo số và tính chất phép tính để tính nhẩm thuận tiện."),
  s("MOET2018-G4-NUM-P035-014", 4, "OPERATION_PROPERTY", "WHOLE", "Áp dụng giao hoán, kết hợp của cộng và quan hệ cộng–trừ."),
  s("MOET2018-G4-NUM-P035-015", 4, "OPERATION_PROPERTY", "WHOLE", "Áp dụng giao hoán, kết hợp của nhân và quan hệ nhân–chia."),
  s("MOET2018-G4-NUM-P036-017", 4, "APPLIED_ARITHMETIC", "WHOLE", "Giải bài toán thực tiễn hai hoặc ba bước với quan hệ trực tiếp."),
  s("MOET2018-G5-NUM-P040-001", 5, "NUMBER_RECOGNITION_REPRESENTATION", "WHOLE", "Đọc, viết, so sánh và xếp thứ tự số tự nhiên."),
  s("MOET2018-G5-NUM-P040-002", 5, "APPLIED_ARITHMETIC", "WHOLE", "Giải bài toán đến bốn bước với số tự nhiên và quan hệ trực tiếp."),
  s("MOET2018-G5-NUM-P040-003", 5, "WRITTEN_ARITHMETIC", "WHOLE", "Thực hiện bốn phép tính với số tự nhiên."),
  s("MOET2018-G5-NUM-P040-004", 5, "OPERATION_PROPERTY", "WHOLE", "Vận dụng tính chất phép tính để tính nhẩm và tính hợp lí."),
  s("MOET2018-G5-STA-P045-008", 5, "DATA_CLASSIFICATION", "DATA", "Thu thập, phân loại, so sánh và sắp xếp số liệu theo tiêu chí."),
  s("MOET2018-G6-NAA-P047-001", 6, "ROMAN_NUMERAL", "WHOLE", "Chuyển đổi số tự nhiên từ 1 đến 30 và chữ số La Mã tương ứng."),
  s("MOET2018-G6-NAA-P047-003", 6, "DIVISIBILITY_RULE", "WHOLE", "Dùng dấu hiệu chia hết cho 2, 3, 5 hoặc 9."),
  s("MOET2018-G6-NAA-P047-005", 6, "COMPARE_ORDER", "WHOLE", "So sánh và sắp thứ tự số tự nhiên."),
  s("MOET2018-G6-NAA-P047-006", 6, "FACTOR_MULTIPLE", "WHOLE", "Nhận biết quan hệ chia hết, ước và bội."),
  s("MOET2018-G6-NAA-P047-007", 6, "SET_MEMBERSHIP", "WHOLE", "Nhận biết tập hợp số tự nhiên và phần tử thuộc tập hợp."),
  s("MOET2018-G6-NAA-P047-008", 6, "MIXED_ARITHMETIC_EXPRESSION", "WHOLE", "Thực hiện đúng thứ tự phép tính trong biểu thức số."),
  s("MOET2018-G6-NAA-P047-009", 6, "POWER_AND_ROOT", "WHOLE", "Nhân hoặc chia hai lũy thừa cùng cơ số bằng quy tắc số mũ."),
  s("MOET2018-G6-NAA-P047-010", 6, "SET_MEMBERSHIP", "WHOLE", "Dùng kí hiệu thuộc/không thuộc và mô tả tập hợp hữu hạn."),
  s("MOET2018-G6-NAA-P047-011", 6, "WRITTEN_ARITHMETIC", "WHOLE", "Thực hiện cộng, trừ, nhân, chia trong tập số tự nhiên."),
  s("MOET2018-G6-NAA-P047-013", 6, "POWER_AND_ROOT", "WHOLE", "Tính lũy thừa với số mũ tự nhiên trong miền an toàn."),
  s("MOET2018-G6-NAA-P047-014", 6, "DIVISIBILITY_RULE", "WHOLE", "Vận dụng tính chia hết của tổng, hiệu và tích số tự nhiên."),
  s("MOET2018-G6-NAA-P047-015", 6, "OPERATION_PROPERTY", "WHOLE", "Dùng tính chất phép tính và lũy thừa để tính nhanh hợp lí."),
  s("MOET2018-G6-NAA-P047-016", 6, "OPERATION_PROPERTY", "WHOLE", "Áp dụng giao hoán, kết hợp và phân phối trong tính toán."),
  s("MOET2018-G6-NAA-P048-017", 6, "INTEGER_NUMBER_LINE", "INTEGER", "Biểu diễn và đọc số nguyên trên trục số."),
  s("MOET2018-G6-NAA-P048-018", 6, "PRIME_COMPOSITE", "WHOLE", "Phân loại số nguyên tố và hợp số bằng số ước."),
  s("MOET2018-G6-NAA-P048-020", 6, "INTEGER_NUMBER_LINE", "INTEGER", "Xác định số đối của một số nguyên."),
  s("MOET2018-G6-NAA-P048-021", 6, "INTEGER_NUMBER_LINE", "INTEGER", "Nhận biết số nguyên âm và vị trí của chúng trên trục số."),
  s("MOET2018-G6-NAA-P048-022", 6, "COMPARE_ORDER", "INTEGER", "Xác định thứ tự trong tập hợp số nguyên."),
  s("MOET2018-G6-NAA-P048-023", 6, "APPLIED_ARITHMETIC", "INTEGER", "Diễn giải số nguyên âm trong bối cảnh nhiệt độ, độ cao hoặc lỗ/lãi."),
  s("MOET2018-G6-NAA-P048-024", 6, "COMPARE_ORDER", "INTEGER", "So sánh hai số nguyên theo vị trí trên trục số."),
  s("MOET2018-G6-NAA-P048-026", 6, "INTEGER_OPERATION", "INTEGER", "Thực hiện cộng, trừ, nhân và chia hết trong tập số nguyên."),
  s("MOET2018-G6-NAA-P048-027", 6, "PRIME_FACTORIZATION", "WHOLE", "Chọn hoặc hoàn thành phân tích số tự nhiên thành thừa số nguyên tố."),
  s("MOET2018-G6-NAA-P048-029", 6, "INTEGER_OPERATION", "INTEGER", "Vận dụng tính chất phép tính và quy tắc dấu ngoặc với số nguyên."),
  s("MOET2018-G6-NAA-P048-030", 6, "FACTOR_MULTIPLE", "FRACTION", "Xác định UCLN/BCNN và vận dụng vào phân số tối giản hoặc phép cộng trừ phân số."),
  s("MOET2018-G6-NAA-P049-032", 6, "APPLIED_ARITHMETIC", "INTEGER", "Giải bài toán thực tiễn bằng phép tính số nguyên."),
  s("MOET2018-G6-NAA-P049-034", 6, "MIXED_NUMBER_REPRESENTATION", "FRACTION", "Nhận biết và chuyển đổi hỗn số dương với phân số không âm."),
  s("MOET2018-G6-NAA-P049-037", 6, "DIVISIBILITY_RULE", "INTEGER", "Nhận biết quan hệ chia hết, ước và bội trong tập số nguyên."),
  s("MOET2018-G6-NAA-P049-039", 6, "RATIONAL_NUMBER_REASONING", "FRACTION", "So sánh hai phân số bằng mẫu chung hoặc tích chéo."),
  s("MOET2018-G6-NAA-P049-042", 6, "FRACTION_PERCENT_VALUE", "FRACTION", "Tính phân số của một số hoặc tìm số ban đầu từ giá trị phân số."),
  s("MOET2018-G6-NAA-P050-046", 6, "COMPARE_ORDER", "DECIMAL", "So sánh hai số thập phân sau khi chuẩn hóa phần thập phân."),
  s("MOET2018-G6-NAA-P050-048", 6, "ROUND_ESTIMATE", "DECIMAL", "Ước lượng và làm tròn số thập phân đến độ chính xác được nêu."),
  s("MOET2018-G6-NAA-P050-049", 6, "FRACTION_PERCENT_VALUE", "PERCENT", "Tính phần trăm của một số hoặc tìm số ban đầu từ giá trị phần trăm."),
  s("MOET2018-G7-NAA-P056-008", 7, "POWER_AND_ROOT", "FRACTION", "Mô tả và tính lũy thừa số mũ tự nhiên của số hữu tỉ."),
  s("MOET2018-G7-NAA-P056-009", 7, "POWER_AND_ROOT", "RADICAL", "Nhận biết căn bậc hai số học là giá trị không âm."),
  s("MOET2018-G7-NAA-P056-017", 7, "POWER_AND_ROOT", "RADICAL", "Tính đúng hoặc gần đúng căn bậc hai số học của số nguyên dương."),
  s("MOET2018-G7-NAA-P057-021", 7, "ALGEBRAIC_EXPRESSION_RECOGNITION", "ALGEBRA", "Phân biệt biểu thức đại số với biểu thức số và phát biểu quan hệ biến–hệ số."),
  s("MOET2018-G7-NAA-P057-022", 7, "MIXED_ARITHMETIC_EXPRESSION", "WHOLE", "Nhận biết và tính giá trị biểu thức số."),
  s("MOET2018-G7-NAA-P057-023", 7, "ALGEBRAIC_EXPRESSION_RECOGNITION", "ALGEBRA", "Nhận biết biểu diễn và bậc của đa thức một biến."),
  s("MOET2018-G7-NAA-P057-025", 7, "ALGEBRAIC_EXPRESSION_RECOGNITION", "ALGEBRA", "Nhận biết đa thức một biến từ các biểu thức cho trước."),
  s("MOET2018-G7-NAA-P057-029", 7, "ROUND_ESTIMATE", "DECIMAL", "Ước lượng và làm tròn số theo độ chính xác cho trước."),
  s("MOET2018-G7-EXP-P062-001", 7, "BANKING_FINANCE", "FINANCE", "Tính số dư sau giao dịch và lãi đơn trong tình huống ngân hàng được nêu rõ."),
  s("MOET2018-G8-NAA-P063-002", 8, "ALGEBRAIC_EXPRESSION_RECOGNITION", "ALGEBRA", "Nhận biết đơn thức, đa thức nhiều biến và bậc tương ứng."),
  s("MOET2018-G8-NAA-P063-004", 8, "POLYNOMIAL_OPERATION", "ALGEBRA", "Cộng, trừ hoặc nhân đa thức nhiều biến trong trường hợp đơn giản."),
  s("MOET2018-G8-NAA-P063-005", 8, "POLYNOMIAL_OPERATION", "ALGEBRA", "Thực hiện phép chia hết đa thức cho đơn thức."),
  s("MOET2018-G8-NAA-P063-006", 8, "POLYNOMIAL_OPERATION", "ALGEBRA", "Nhân đơn thức với đa thức hoặc chia hết hai đơn thức."),
  s("MOET2018-G8-NAA-P063-008", 8, "POLYNOMIAL_OPERATION", "ALGEBRA", "Tính giá trị đa thức tại giá trị biến cho trước."),
  s("MOET2018-G8-NAA-P064-016", 8, "RATIONAL_EXPRESSION_OPERATION", "ALGEBRA", "Thực hiện bốn phép tính với hai phân thức đại số tại miền xác định an toàn."),
  s("MOET2018-G8-NAA-P064-020", 8, "RATIONAL_EXPRESSION_OPERATION", "ALGEBRA", "Áp dụng tính chất giao hoán, kết hợp, phân phối và dấu ngoặc cho phân thức đại số."),
  s("MOET2018-G8-STA-P068-003", 8, "DATA_RELATION_REASONING", "DATA", "Suy ra quan hệ toán học đơn giản và giá trị còn thiếu từ số liệu biểu diễn."),
  s("MOET2018-G8-EXP-P070-002", 8, "BANKING_FINANCE", "FINANCE", "Tính vốn đầu tư cần thiết để đạt lãi đơn mong đợi với lãi suất và thời hạn rõ ràng."),
  s("MOET2018-G9-NAA-P071-002", 9, "POWER_AND_ROOT", "RADICAL", "Nhận biết căn bậc hai của số không âm và căn bậc ba của số thực."),
  s("MOET2018-G9-NAA-P071-003", 9, "RADICAL_EXPRESSION", "ALGEBRA", "Nhận biết căn thức bậc hai hoặc bậc ba của biểu thức đại số cùng điều kiện xác định."),
  s("MOET2018-G9-NAA-P071-007", 9, "RADICAL_EXPRESSION", "RADICAL", "Thực hiện biến đổi đơn giản với căn bậc hai của tích, thương hoặc bình phương."),
  s("MOET2018-G9-NAA-P071-008", 9, "POWER_AND_ROOT", "RADICAL", "Tính đúng hoặc gần đúng căn bậc hai, căn bậc ba của số hữu tỉ."),
  s("MOET2018-G9-NAA-P073-024", 9, "INEQUALITY_PROPERTY", "ALGEBRA", "Nhận biết và áp dụng bắc cầu, cộng cùng số và nhân với số dương/âm của bất đẳng thức."),
] as const satisfies readonly OutcomeSpec[];

function difficultyPolicy(capability: ProductVariantId): Readonly<Record<ProductDifficulty, string>> {
  return {
    EASY: `${capability}: one direct step and one explicit representation`,
    MEDIUM: `${capability}: unknown position or a second representation with one required transformation`,
    HARD: `${capability}: multi-step reasoning, error detection or information selection within grade bounds`,
  };
}

export const WAVE_A_OUTCOME_CONTRACTS: readonly WaveAOutcomeContract[] = OUTCOME_SPECS.map((spec) => {
  const policy = spec.engine === "PROVEN_V2_BASELINE"
    ? ({
        modelKind: "PROVEN_V2_BASELINE",
        family: spec.capability === "PLACE_VALUE_COMPARE" ? "PLACE_VALUE" : "WHOLE_NUMBER_OPERATIONS",
        interactions: (spec.capability === "PLACE_VALUE_COMPARE" ? ["SINGLE_CHOICE", "ORDERING"] : spec.capability === "ADD_SUB_MEANING" ? ["INTEGER_INPUT", "SINGLE_CHOICE"] : ["SINGLE_CHOICE", "INTEGER_INPUT"]) as readonly ProductInteractionType[],
        evidence: ["proven-v2-baseline"],
        modelFields: ["existingNormalizedModel"],
        answerPolicy: "existing independently normalized V2 answer",
        misconceptions: ["existing family-specific misconception catalog"],
        visual: "existing normalized-model visual contract",
      } as const)
    : CAPABILITY_POLICIES[spec.capability as WaveACanonicalVariantId];
  if (!policy) throw new Error(`WAVE_A_CAPABILITY_POLICY_MISSING:${spec.id}:${spec.capability}`);
  const gradeBounds = GRADE_BOUNDS[spec.grade];
  if (!gradeBounds) throw new Error(`WAVE_A_GRADE_BOUNDS_MISSING:${spec.grade}`);
  const bounds = spec.capability === "BANKING_FINANCE"
    ? { ...gradeBounds, maximum: 100_000_000 }
    : gradeBounds;
  return {
    contractType: WAVE_A_CONTRACT_VERSION,
    contractVersion: "wave-a-v2.1",
    engineVersion: spec.engine ?? WAVE_A_ENGINE_VERSION,
    outcomeId: spec.id,
    grade: spec.grade,
    unitId: `grade-${spec.grade}-wave-a-${spec.capability.toLowerCase().replaceAll("_", "-")}`,
    productFamilyId: policy.family,
    canonicalVariantId: spec.capability,
    modelKind: policy.modelKind,
    profile: spec.profile,
    measurableIntent: spec.intent,
    permittedEvidenceForms: policy.evidence,
    normalizedProblemModel: { kind: policy.modelKind, requiredFields: policy.modelFields },
    parameterBounds: bounds,
    acceptedAnswerPolicy: policy.answerPolicy,
    uniquenessPolicy: "EXACTLY_ONE_NORMALIZED_ANSWER",
    interactionPolicy: policy.interactions,
    difficultyPolicy: difficultyPolicy(spec.capability),
    variationPolicy: ["wording", "context", "unknown-position", "representation", "reasoning-structure"],
    independentSolver: spec.engine ? "PROVEN_V2_INDEPENDENT_SOLVER" : `WAVE_A_${policy.modelKind}_SOLVER_V2`,
    independentValidator: spec.engine ? "PROVEN_V2_INDEPENDENT_VALIDATOR" : `WAVE_A_${policy.modelKind}_VALIDATOR_V2`,
    misconceptionCatalog: policy.misconceptions,
    distractorPolicy: `Only misconception-derived distractors for ${spec.capability}; duplicate or correct distractors are rejected.`,
    feedbackPolicy: `Vietnamese Grade ${spec.grade} feedback names the detected misconception, shows the valid ${spec.capability} step sequence and gives one next step.`,
    visualPolicy: policy.visual,
    prerequisitePolicy: `Use only Grade ${spec.grade} or earlier concepts; no unlisted higher-grade notation or operation.`,
  };
});

if (WAVE_A_OUTCOME_CONTRACTS.length !== 98 || new Set(WAVE_A_OUTCOME_CONTRACTS.map((item) => item.outcomeId)).size !== 98) {
  throw new Error("WAVE_A_EXPLICIT_OUTCOME_REGISTRY_MUST_BE_98_UNIQUE");
}

const BY_OUTCOME = new Map(WAVE_A_OUTCOME_CONTRACTS.map((contract) => [contract.outcomeId, contract]));

export function getWaveAOutcomeContract(outcomeId: string) {
  return BY_OUTCOME.get(outcomeId);
}

export function isWaveAImplementedByNewEngine(contract: WaveAOutcomeContract) {
  return contract.engineVersion === WAVE_A_ENGINE_VERSION;
}
