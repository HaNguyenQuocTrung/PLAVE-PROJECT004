import type {
  ProductDifficulty,
  ProductInteractionType,
  ProductVariantId,
} from "./types.ts";

export const WAVE_B_CONTRACT_VERSION = "PLAVE_PRODUCT_ASSESSMENT_CONTRACT_V2" as const;
export const WAVE_B_ENGINE_VERSION = "plave-generator-v2-wave-b.1" as const;

export type WaveBProfile = "WHOLE" | "FRACTION" | "DECIMAL" | "RATIO" | "PERCENT" | "RATIONAL" | "REAL" | "GEOMETRY" | "DATA";

export type WaveBTaskKind =
  | "READ_NATURAL"
  | "ROUND_NATURAL"
  | "COMPARE_NATURAL"
  | "ROMAN_NATURAL"
  | "PLACE_VALUE"
  | "WHOLE_OPERATION_PROPERTY"
  | "WRITTEN_ADD_SUB"
  | "WRITTEN_MULTIPLY"
  | "DIVIDE_ONE_DIGIT"
  | "UNIT_FRACTION_OF_GROUP"
  | "PARITY"
  | "READ_FRACTION"
  | "PART_WHOLE_BASELINE"
  | "FRACTION_EQUIVALENCE"
  | "FRACTION_COMPARE_ORDER"
  | "DECIMAL_COMPARE_ORDER"
  | "PERCENT_OF_QUANTITY"
  | "STATISTICAL_PERCENT"
  | "FRACTION_APPLICATION"
  | "OPPOSITE_FRACTION"
  | "OPPOSITE_DECIMAL"
  | "OPPOSITE_REAL"
  | "FRACTION_OPERATIONS"
  | "FRACTION_PROPERTIES"
  | "DECIMAL_APPLICATION"
  | "DECIMAL_OPERATIONS"
  | "RATIO_AND_PERCENT"
  | "DECIMAL_PROPERTIES"
  | "SYMMETRY"
  | "RATIONAL_NUMBER_LINE"
  | "RATIONAL_RECOGNITION"
  | "RATIONAL_SET"
  | "RATIONAL_POWER"
  | "RATIONAL_OPERATION_ORDER"
  | "DECIMAL_CLASSIFICATION"
  | "REAL_NUMBER_CLASSIFICATION"
  | "RATIONAL_COMPARE"
  | "RATIONAL_OPERATIONS"
  | "RATIONAL_PROPERTIES"
  | "INVERSE_PROPORTION"
  | "DIRECT_PROPORTION"
  | "ABSOLUTE_VALUE"
  | "REAL_ORDER"
  | "PROPORTION_PROPERTY"
  | "PERCENT_CHANGE";

export type WaveBOutcomeContract = Readonly<{
  contractType: typeof WAVE_B_CONTRACT_VERSION;
  contractVersion: "wave-b-v2.1";
  engineVersion: typeof WAVE_B_ENGINE_VERSION | "PROVEN_V2_BASELINE";
  outcomeId: string;
  grade: number;
  unitId: string;
  productFamilyId: string;
  canonicalVariantId: ProductVariantId;
  taskKind: WaveBTaskKind;
  profile: WaveBProfile;
  measurableIntent: string;
  permittedEvidenceForms: readonly string[];
  normalizedProblemModel: Readonly<{ kind: WaveBTaskKind; requiredFields: readonly string[] }>;
  parameterBounds: Readonly<{ minimum: number; maximum: number; maxSteps: number; maxDecimalPlaces: number; maxDenominator: number; allowNegative: boolean; languageBand: string }>;
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
  family: string;
  interactions: readonly ProductInteractionType[];
  evidence: readonly string[];
  answer: string;
  visual: string;
  misconceptions: readonly string[];
}>;

const POLICIES: Readonly<Partial<Record<ProductVariantId, CapabilityPolicy>>> = {
  NUMBER_RECOGNITION_REPRESENTATION: { family: "NUMBER_SENSE", interactions: ["INTEGER_INPUT"], evidence: ["read-number", "represent-number"], answer: "normalized integer", visual: "PLACE_VALUE_CHART", misconceptions: ["place-value shift", "digit reversal"] },
  PLACE_VALUE_COMPOSE: { family: "PLACE_VALUE", interactions: ["INTEGER_INPUT"], evidence: ["compose", "decompose", "round-number recognition"], answer: "normalized integer", visual: "PLACE_VALUE_CHART", misconceptions: ["zero placeholder omitted", "place-value shift"] },
  ROUND_ESTIMATE: { family: "NUMBER_SENSE", interactions: ["INTEGER_INPUT"], evidence: ["round-to-place"], answer: "normalized integer", visual: "NUMBER_LINE", misconceptions: ["wrong rounding place", "ignored next digit"] },
  COMPARE_ORDER: { family: "NUMBER_SENSE", interactions: ["ORDERING"], evidence: ["compare", "order", "extreme-value"], answer: "exact ordered item ids", visual: "NONE", misconceptions: ["reversed order", "place-value confusion"] },
  ROMAN_NUMERAL: { family: "NUMBER_REPRESENTATION", interactions: ["SINGLE_CHOICE"], evidence: ["convert-roman-natural"], answer: "one canonical Roman option", visual: "NONE", misconceptions: ["subtractive notation reversed", "symbol confusion"] },
  OPERATION_PROPERTY: { family: "OPERATION_PROPERTIES", interactions: ["SINGLE_CHOICE"], evidence: ["identify-equivalent-expression"], answer: "one mathematically equivalent option", visual: "NONE", misconceptions: ["invalid commutation", "inverse relation confusion"] },
  WRITTEN_ARITHMETIC: { family: "WHOLE_NUMBER_OPERATIONS", interactions: ["INTEGER_INPUT"], evidence: ["written-calculation"], answer: "normalized integer", visual: "NONE", misconceptions: ["carry/borrow error", "partial product omitted"] },
  MULTIPLY_DIVIDE: { family: "WHOLE_NUMBER_OPERATIONS", interactions: ["INTEGER_INPUT"], evidence: ["division", "inverse check"], answer: "normalized integer", visual: "NONE", misconceptions: ["multiplication/division confusion", "remainder introduced"] },
  FRACTION_UNIT_QUANTITY: { family: "FRACTIONS", interactions: ["FRACTION_INPUT"], evidence: ["unit-fraction-of-group"], answer: "mathematically reduced equivalent fraction", visual: "FRACTION_MODEL", misconceptions: ["group count used as numerator", "unequal partition"] },
  PARITY_CLASSIFICATION: { family: "NUMBER_SENSE", interactions: ["MULTI_SELECT"], evidence: ["classify-even-odd"], answer: "exact unordered selected ids", visual: "NONE", misconceptions: ["last-digit rule ignored", "odd/even reversed"] },
  FRACTION_REPRESENTATION: { family: "FRACTIONS", interactions: ["FRACTION_INPUT"], evidence: ["read-fraction", "write-fraction"], answer: "mathematically reduced equivalent fraction", visual: "FRACTION_MODEL", misconceptions: ["numerator/denominator swapped", "whole partition misread"] },
  FRACTION_PART_WHOLE: { family: "FRACTIONS", interactions: ["FRACTION_INPUT", "CONSTRUCTION_OR_VISUAL_SELECTION"], evidence: ["part-whole model"], answer: "existing normalized fraction contract", visual: "FRACTION_MODEL", misconceptions: ["numerator/denominator confusion"] },
  FRACTION_EQUIVALENCE: { family: "FRACTIONS", interactions: ["FRACTION_INPUT"], evidence: ["equivalent-fraction", "simplify-fraction"], answer: "any mathematically equivalent fraction normalizes to one value", visual: "FRACTION_MODEL", misconceptions: ["only numerator scaled", "addition used instead of scaling"] },
  RATIONAL_COMPARE_ORDER: { family: "RATIONAL_NUMBERS", interactions: ["ORDERING"], evidence: ["compare-fractions", "compare-rationals", "order-rationals"], answer: "exact ordered item ids derived by integer cross-products", visual: "NUMBER_LINE when signed", misconceptions: ["denominator-only comparison", "sign ignored"] },
  DECIMAL_COMPARE_ORDER: { family: "DECIMALS", interactions: ["ORDERING"], evidence: ["compare-decimals", "order-decimals"], answer: "exact ordered ids from integer-scaled decimals", visual: "NUMBER_LINE", misconceptions: ["string-length comparison", "trailing-zero confusion"] },
  PERCENTAGE_REASONING: { family: "PERCENTAGE", interactions: ["DECIMAL_INPUT", "INTEGER_INPUT"], evidence: ["percent-of-quantity", "recover-rate", "interpret-percent-data"], answer: "integer-scaled decimal with stated precision", visual: "DATA_TABLE when data is evidence", misconceptions: ["percent treated as whole number", "wrong base quantity"] },
  FRACTION_APPLICATION: { family: "FRACTIONS", interactions: ["FRACTION_INPUT", "INTEGER_INPUT"], evidence: ["model-fraction-context", "multi-step-fraction"], answer: "reduced rational result", visual: "FRACTION_MODEL when the partition is evidence", misconceptions: ["wrong operation", "ignored second step"] },
  OPPOSITE_NUMBER: { family: "RATIONAL_NUMBERS", interactions: ["FRACTION_INPUT", "DECIMAL_INPUT"], evidence: ["identify-additive-opposite"], answer: "same magnitude with opposite sign", visual: "NUMBER_LINE", misconceptions: ["reciprocal used", "sign unchanged"] },
  RATIONAL_OPERATIONS: { family: "RATIONAL_NUMBERS", interactions: ["FRACTION_INPUT"], evidence: ["fraction-operation", "rational-operation"], answer: "reduced rational result", visual: "NONE", misconceptions: ["denominators added", "division not inverted", "sign error"] },
  NUMERIC_OPERATION_PROPERTIES: { family: "OPERATION_PROPERTIES", interactions: ["SINGLE_CHOICE"], evidence: ["commutative-associative-distributive", "parentheses"], answer: "one exactly equivalent expression", visual: "NONE", misconceptions: ["invalid distribution", "order-of-operations error"] },
  DECIMAL_APPLICATION: { family: "DECIMALS", interactions: ["DECIMAL_INPUT"], evidence: ["model-decimal-context", "multi-step-decimal"], answer: "integer-scaled decimal", visual: "DATA_TABLE when quantities are tabulated", misconceptions: ["decimal place shift", "wrong operation"] },
  DECIMAL_OPERATIONS: { family: "DECIMALS", interactions: ["DECIMAL_INPUT"], evidence: ["add-subtract-multiply-divide-decimals"], answer: "integer-scaled decimal", visual: "NONE", misconceptions: ["decimal alignment error", "division scale error"] },
  RATIO_PROPORTION: { family: "RATIO_AND_RATE", interactions: ["TABLE_OR_CHART_RESPONSE", "DECIMAL_INPUT"], evidence: ["ratio", "rate", "equivalent-ratio", "proportion"], answer: "reduced ratio or unique missing table value", visual: "DATA_TABLE", misconceptions: ["ratio order reversed", "non-equivalent scaling", "wrong base"] },
  SYMMETRY_RECOGNITION: { family: "GEOMETRY", interactions: ["CONSTRUCTION_OR_VISUAL_SELECTION"], evidence: ["recognize-axis-or-center-symmetry"], answer: "one uniquely matching symmetric figure", visual: "SHAPE_DIAGRAM", misconceptions: ["decorative balance confused with symmetry", "axis/center confusion"] },
  RATIONAL_NUMBER_LINE: { family: "RATIONAL_NUMBERS", interactions: ["FRACTION_INPUT"], evidence: ["locate-rational", "read-number-line"], answer: "reduced rational coordinate", visual: "NUMBER_LINE", misconceptions: ["tick interval misread", "sign ignored"] },
  NUMBER_SET_CLASSIFICATION: { family: "NUMBER_SETS", interactions: ["SINGLE_CHOICE", "MULTI_SELECT"], evidence: ["classify-rational-real-decimal", "set-membership"], answer: "one class or exact selected ids", visual: "NONE", misconceptions: ["irrational/rational confusion", "terminating/repeating confusion"] },
  RATIONAL_POWER: { family: "RATIONAL_NUMBERS", interactions: ["FRACTION_INPUT"], evidence: ["power-of-rational", "same-base-rule"], answer: "reduced rational result", visual: "NONE", misconceptions: ["base multiplied by exponent", "wrong exponent rule"] },
  RATIONAL_OPERATION_ORDER: { family: "RATIONAL_NUMBERS", interactions: ["FRACTION_INPUT"], evidence: ["operation-order", "parentheses", "transposition"], answer: "reduced rational result", visual: "NONE", misconceptions: ["parentheses ignored", "sign error", "left-to-right error"] },
  PROPORTIONAL_REASONING: { family: "RATIO_AND_RATE", interactions: ["TABLE_OR_CHART_RESPONSE", "INTEGER_INPUT"], evidence: ["direct-proportion", "inverse-proportion", "missing-value"], answer: "unique missing proportional value", visual: "DATA_TABLE", misconceptions: ["direct/inverse confusion", "scale factor mismatch"] },
  REAL_NUMBER_ORDER: { family: "REAL_NUMBERS", interactions: ["DECIMAL_INPUT", "ORDERING"], evidence: ["absolute-value", "order-real-numbers"], answer: "integer-scaled real value or exact ordered ids", visual: "NUMBER_LINE", misconceptions: ["sign ignored", "absolute value made negative"] },
  ADD_SUB_MEANING: { family: "UNUSED", interactions: ["INTEGER_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  MULTIPLY_DIVIDE_FACTS: { family: "UNUSED", interactions: ["INTEGER_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  PLACE_VALUE_COMPARE: { family: "UNUSED", interactions: ["INTEGER_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  LINEAR_SYSTEM: { family: "UNUSED", interactions: ["INTEGER_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  GEOMETRY_PROPERTIES: { family: "UNUSED", interactions: ["SINGLE_CHOICE"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  UNIT_CONVERSION: { family: "UNUSED", interactions: ["INTEGER_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  PERIMETER_AREA: { family: "UNUSED", interactions: ["INTEGER_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  CHART_DATA_INTERPRETATION: { family: "UNUSED", interactions: ["INTEGER_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  EXPERIMENTAL_PROBABILITY: { family: "UNUSED", interactions: ["FRACTION_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  APPLIED_TWO_STEP: { family: "UNUSED", interactions: ["INTEGER_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  DATA_ERROR_REASONING: { family: "UNUSED", interactions: ["SINGLE_CHOICE"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  COUNTING_SEQUENCE: { family: "UNUSED", interactions: ["INTEGER_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  COMPARE_ORDER_ESTIMATE: { family: "UNUSED", interactions: ["ORDERING"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  ADD_SUB_CALCULATION: { family: "UNUSED", interactions: ["INTEGER_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  MENTAL_ARITHMETIC: { family: "UNUSED", interactions: ["INTEGER_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  MIXED_ARITHMETIC_EXPRESSION: { family: "UNUSED", interactions: ["INTEGER_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  OPERATION_COMPONENTS: { family: "UNUSED", interactions: ["MATCHING"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  MISSING_COMPONENT: { family: "UNUSED", interactions: ["INTEGER_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  INTEGER_NUMBER_LINE: { family: "UNUSED", interactions: ["INTEGER_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  INTEGER_OPERATION: { family: "UNUSED", interactions: ["INTEGER_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  RATIONAL_NUMBER_REASONING: { family: "UNUSED", interactions: ["FRACTION_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  FRACTION_PERCENT_VALUE: { family: "UNUSED", interactions: ["INTEGER_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  POWER_AND_ROOT: { family: "UNUSED", interactions: ["INTEGER_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  DIVISIBILITY_RULE: { family: "UNUSED", interactions: ["MULTI_SELECT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  FACTOR_MULTIPLE: { family: "UNUSED", interactions: ["MULTI_SELECT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  PRIME_COMPOSITE: { family: "UNUSED", interactions: ["SINGLE_CHOICE"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  PRIME_FACTORIZATION: { family: "UNUSED", interactions: ["SINGLE_CHOICE"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  NUMERICAL_PATTERN: { family: "UNUSED", interactions: ["INTEGER_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  ARITHMETIC_ERROR_DETECTION: { family: "UNUSED", interactions: ["SINGLE_CHOICE"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  APPLIED_ARITHMETIC: { family: "UNUSED", interactions: ["INTEGER_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  SET_MEMBERSHIP: { family: "UNUSED", interactions: ["MULTI_SELECT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  SHAPE_RECOGNITION: { family: "UNUSED", interactions: ["SINGLE_CHOICE"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  DATA_CLASSIFICATION: { family: "UNUSED", interactions: ["ORDERING"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  ALGEBRAIC_EXPRESSION_RECOGNITION: { family: "UNUSED", interactions: ["SINGLE_CHOICE"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  POLYNOMIAL_OPERATION: { family: "UNUSED", interactions: ["SINGLE_CHOICE"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  RATIONAL_EXPRESSION_OPERATION: { family: "UNUSED", interactions: ["FRACTION_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  RADICAL_EXPRESSION: { family: "UNUSED", interactions: ["SINGLE_CHOICE"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  INEQUALITY_PROPERTY: { family: "UNUSED", interactions: ["SINGLE_CHOICE"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  DATA_RELATION_REASONING: { family: "UNUSED", interactions: ["INTEGER_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  BANKING_FINANCE: { family: "UNUSED", interactions: ["DECIMAL_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  MIXED_NUMBER_REPRESENTATION: { family: "UNUSED", interactions: ["FRACTION_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
  DIVISION_WITH_REMAINDER: { family: "UNUSED", interactions: ["INTEGER_INPUT"], evidence: [], answer: "unused", visual: "NONE", misconceptions: [] },
};

type Spec = readonly [string, number, ProductVariantId, WaveBTaskKind, WaveBProfile, string, "PROVEN_V2_BASELINE"?];
const s = (...value: Spec) => value;

const SPECS = [
  s("MOET2018-G2-NUM-P024-001", 2, "NUMBER_RECOGNITION_REPRESENTATION", "READ_NATURAL", "WHOLE", "Đọc và viết số tự nhiên trong phạm vi 1 000."),
  s("MOET2018-G2-NUM-P024-003", 2, "PLACE_VALUE_COMPOSE", "PLACE_VALUE", "WHOLE", "Nhận biết số tròn trăm bằng cấu tạo hàng."),
  s("MOET2018-G2-NUM-P024-004", 2, "PLACE_VALUE_COMPOSE", "PLACE_VALUE", "WHOLE", "Viết số thành tổng của trăm, chục và đơn vị."),
  s("MOET2018-G3-NUM-P029-001", 3, "NUMBER_RECOGNITION_REPRESENTATION", "READ_NATURAL", "WHOLE", "Đọc và viết số tự nhiên đến 100 000."),
  s("MOET2018-G3-NUM-P029-002", 3, "ROUND_ESTIMATE", "ROUND_NATURAL", "WHOLE", "Làm tròn số đến chục, trăm, nghìn hoặc mười nghìn."),
  s("MOET2018-G3-NUM-P029-003", 3, "COMPARE_ORDER", "COMPARE_NATURAL", "WHOLE", "So sánh hai số tự nhiên trong phạm vi 100 000."),
  s("MOET2018-G3-NUM-P029-005", 3, "ROMAN_NUMERAL", "ROMAN_NATURAL", "WHOLE", "Đọc và viết số La Mã trong phạm vi 20."),
  s("MOET2018-G3-NUM-P029-006", 3, "PLACE_VALUE_COMPOSE", "PLACE_VALUE", "WHOLE", "Nhận biết số tròn nghìn và tròn mười nghìn."),
  s("MOET2018-G3-NUM-P029-007", 3, "OPERATION_PROPERTY", "WHOLE_OPERATION_PROPERTY", "WHOLE", "Áp dụng giao hoán, kết hợp của cộng và quan hệ cộng–trừ."),
  s("MOET2018-G3-NUM-P029-008", 3, "WRITTEN_ARITHMETIC", "WRITTEN_ADD_SUB", "WHOLE", "Cộng và trừ số có đến năm chữ số theo giới hạn nhớ/mượn."),
  s("MOET2018-G3-NUM-P029-009", 3, "COMPARE_ORDER", "COMPARE_NATURAL", "WHOLE", "Sắp xếp tối đa bốn số trong phạm vi 100 000."),
  s("MOET2018-G3-NUM-P029-011", 3, "COMPARE_ORDER", "COMPARE_NATURAL", "WHOLE", "Xác định số lớn nhất hoặc nhỏ nhất trong một nhóm."),
  s("MOET2018-G3-NUM-P030-015", 3, "OPERATION_PROPERTY", "WHOLE_OPERATION_PROPERTY", "WHOLE", "Áp dụng giao hoán, kết hợp của nhân và quan hệ nhân–chia."),
  s("MOET2018-G3-NUM-P030-017", 3, "MULTIPLY_DIVIDE", "DIVIDE_ONE_DIGIT", "WHOLE", "Thực hiện phép chia cho số có một chữ số."),
  s("MOET2018-G3-NUM-P030-018", 3, "WRITTEN_ARITHMETIC", "WRITTEN_MULTIPLY", "WHOLE", "Nhân số nhiều chữ số với số có một chữ số."),
  s("MOET2018-G3-NUM-P031-024", 3, "FRACTION_UNIT_QUANTITY", "UNIT_FRACTION_OF_GROUP", "FRACTION", "Xác định phân số đơn vị của nhóm đồ vật chia đều."),
  s("MOET2018-G4-NUM-P034-001", 4, "NUMBER_RECOGNITION_REPRESENTATION", "READ_NATURAL", "WHOLE", "Đọc và viết số tự nhiên đến lớp triệu."),
  s("MOET2018-G4-NUM-P034-003", 4, "COMPARE_ORDER", "COMPARE_NATURAL", "WHOLE", "So sánh số tự nhiên trong phạm vi lớp triệu."),
  s("MOET2018-G4-NUM-P034-005", 4, "PARITY_CLASSIFICATION", "PARITY", "WHOLE", "Phân loại số chẵn và số lẻ bằng chữ số tận cùng."),
  s("MOET2018-G4-NUM-P036-016", 4, "FRACTION_REPRESENTATION", "READ_FRACTION", "FRACTION", "Đọc và viết phân số dương phù hợp lớp 4."),
  s("MOET2018-G4-NUM-P036-018", 4, "FRACTION_PART_WHOLE", "PART_WHOLE_BASELINE", "FRACTION", "Nhận biết phân số, tử số và mẫu số từ mô hình phần–toàn thể.", "PROVEN_V2_BASELINE"),
  s("MOET2018-G4-NUM-P036-019", 4, "FRACTION_EQUIVALENCE", "FRACTION_EQUIVALENCE", "FRACTION", "Vận dụng tính chất cơ bản để tạo phân số tương đương."),
  s("MOET2018-G5-NUM-P041-009", 5, "RATIONAL_COMPARE_ORDER", "FRACTION_COMPARE_ORDER", "FRACTION", "Quy đồng, so sánh và sắp xếp phân số."),
  s("MOET2018-G5-NUM-P041-011", 5, "DECIMAL_COMPARE_ORDER", "DECIMAL_COMPARE_ORDER", "DECIMAL", "So sánh và sắp xếp số thập phân bằng giá trị theo hàng."),
  s("MOET2018-G5-NUM-P043-024", 5, "PERCENTAGE_REASONING", "PERCENT_OF_QUANTITY", "PERCENT", "Tính bài toán phần trăm phù hợp khi dùng máy tính cầm tay."),
  s("MOET2018-G5-STA-P045-007", 5, "PERCENTAGE_REASONING", "STATISTICAL_PERCENT", "DATA", "Liên hệ tỉ số phần trăm với dữ liệu thống kê thực tiễn."),
  s("MOET2018-G6-NAA-P047-002", 6, "NUMBER_RECOGNITION_REPRESENTATION", "READ_NATURAL", "WHOLE", "Biểu diễn số tự nhiên trong hệ thập phân."),
  s("MOET2018-G6-NAA-P049-031", 6, "FRACTION_APPLICATION", "FRACTION_APPLICATION", "FRACTION", "Giải vấn đề thực tiễn gắn với phép tính phân số."),
  s("MOET2018-G6-NAA-P049-033", 6, "FRACTION_EQUIVALENCE", "FRACTION_EQUIVALENCE", "FRACTION", "Áp dụng hai tính chất cơ bản của phân số."),
  s("MOET2018-G6-NAA-P049-035", 6, "FRACTION_EQUIVALENCE", "FRACTION_EQUIVALENCE", "FRACTION", "Nhận biết hai phân số bằng nhau bằng tích chéo."),
  s("MOET2018-G6-NAA-P049-038", 6, "OPPOSITE_NUMBER", "OPPOSITE_FRACTION", "FRACTION", "Xác định số đối của một phân số."),
  s("MOET2018-G6-NAA-P049-040", 6, "RATIONAL_OPERATIONS", "FRACTION_OPERATIONS", "FRACTION", "Thực hiện cộng, trừ, nhân và chia phân số."),
  s("MOET2018-G6-NAA-P049-043", 6, "NUMERIC_OPERATION_PROPERTIES", "FRACTION_PROPERTIES", "FRACTION", "Dùng tính chất phép toán và dấu ngoặc với phân số."),
  s("MOET2018-G6-NAA-P050-044", 6, "DECIMAL_APPLICATION", "DECIMAL_APPLICATION", "DECIMAL", "Giải bài toán thực tiễn về số thập phân, tỉ số và phần trăm."),
  s("MOET2018-G6-NAA-P050-045", 6, "OPPOSITE_NUMBER", "OPPOSITE_DECIMAL", "DECIMAL", "Nhận biết số thập phân âm và số đối."),
  s("MOET2018-G6-NAA-P050-047", 6, "DECIMAL_OPERATIONS", "DECIMAL_OPERATIONS", "DECIMAL", "Thực hiện bốn phép tính với số thập phân."),
  s("MOET2018-G6-NAA-P050-050", 6, "RATIO_PROPORTION", "RATIO_AND_PERCENT", "RATIO", "Tính tỉ số và tỉ số phần trăm của hai đại lượng."),
  s("MOET2018-G6-NAA-P050-051", 6, "NUMERIC_OPERATION_PROPERTIES", "DECIMAL_PROPERTIES", "DECIMAL", "Dùng tính chất phép toán và dấu ngoặc với số thập phân."),
  s("MOET2018-G6-GEO-P051-008", 6, "SYMMETRY_RECOGNITION", "SYMMETRY", "GEOMETRY", "Nhận biết trục hoặc tâm đối xứng trong hình toán học và thực tiễn."),
  s("MOET2018-G6-GEO-P051-010", 6, "SYMMETRY_RECOGNITION", "SYMMETRY", "GEOMETRY", "Nhận biết vẻ đẹp tự nhiên qua trục hoặc tâm đối xứng."),
  s("MOET2018-G7-NAA-P055-001", 7, "RATIONAL_NUMBER_LINE", "RATIONAL_NUMBER_LINE", "RATIONAL", "Biểu diễn số hữu tỉ trên trục số."),
  s("MOET2018-G7-NAA-P055-002", 7, "OPPOSITE_NUMBER", "OPPOSITE_FRACTION", "RATIONAL", "Xác định số đối của số hữu tỉ."),
  s("MOET2018-G7-NAA-P055-003", 7, "NUMBER_SET_CLASSIFICATION", "RATIONAL_RECOGNITION", "RATIONAL", "Nhận biết số hữu tỉ và ví dụ đúng."),
  s("MOET2018-G7-NAA-P055-004", 7, "NUMBER_SET_CLASSIFICATION", "RATIONAL_SET", "RATIONAL", "Nhận biết tập hợp số hữu tỉ và phần tử của tập hợp."),
  s("MOET2018-G7-NAA-P056-006", 7, "RATIONAL_POWER", "RATIONAL_POWER", "RATIONAL", "Tính lũy thừa số mũ tự nhiên của số hữu tỉ và dùng quy tắc số mũ."),
  s("MOET2018-G7-NAA-P056-007", 7, "RATIONAL_OPERATION_ORDER", "RATIONAL_OPERATION_ORDER", "RATIONAL", "Thực hiện phép tính hữu tỉ theo thứ tự, dấu ngoặc và chuyển vế."),
  s("MOET2018-G7-NAA-P056-010", 7, "OPPOSITE_NUMBER", "OPPOSITE_REAL", "REAL", "Xác định số đối của số thực trong trường hợp thuận lợi."),
  s("MOET2018-G7-NAA-P056-011", 7, "NUMBER_SET_CLASSIFICATION", "DECIMAL_CLASSIFICATION", "REAL", "Phân biệt số thập phân hữu hạn và vô hạn tuần hoàn."),
  s("MOET2018-G7-NAA-P056-012", 7, "NUMBER_SET_CLASSIFICATION", "REAL_NUMBER_CLASSIFICATION", "REAL", "Phân biệt số vô tỉ, số thực và số hữu tỉ."),
  s("MOET2018-G7-NAA-P056-013", 7, "RATIONAL_COMPARE_ORDER", "RATIONAL_COMPARE", "RATIONAL", "Nhận biết thứ tự trong tập hợp số hữu tỉ."),
  s("MOET2018-G7-NAA-P056-014", 7, "RATIONAL_NUMBER_LINE", "RATIONAL_NUMBER_LINE", "REAL", "Biểu diễn số thực thuận lợi trên trục số."),
  s("MOET2018-G7-NAA-P056-015", 7, "RATIONAL_COMPARE_ORDER", "RATIONAL_COMPARE", "RATIONAL", "So sánh hai số hữu tỉ bằng biểu diễn chính xác."),
  s("MOET2018-G7-NAA-P056-016", 7, "RATIONAL_OPERATIONS", "RATIONAL_OPERATIONS", "RATIONAL", "Thực hiện bốn phép tính trong tập hợp số hữu tỉ."),
  s("MOET2018-G7-NAA-P056-018", 7, "NUMERIC_OPERATION_PROPERTIES", "RATIONAL_PROPERTIES", "RATIONAL", "Dùng tính chất phép toán và dấu ngoặc với số hữu tỉ."),
  s("MOET2018-G7-NAA-P057-019", 7, "PROPORTIONAL_REASONING", "INVERSE_PROPORTION", "RATIO", "Giải bài toán đơn giản về hai đại lượng tỉ lệ nghịch."),
  s("MOET2018-G7-NAA-P057-020", 7, "PROPORTIONAL_REASONING", "DIRECT_PROPORTION", "RATIO", "Giải bài toán đơn giản về hai đại lượng tỉ lệ thuận."),
  s("MOET2018-G7-NAA-P057-026", 7, "REAL_NUMBER_ORDER", "ABSOLUTE_VALUE", "REAL", "Tính giá trị tuyệt đối của số thực thuận lợi."),
  s("MOET2018-G7-NAA-P057-027", 7, "REAL_NUMBER_ORDER", "REAL_ORDER", "REAL", "Sắp xếp số thực thuận lợi theo thứ tự."),
  s("MOET2018-G7-NAA-P057-028", 7, "RATIO_PROPORTION", "PROPORTION_PROPERTY", "RATIO", "Nhận biết tỉ lệ thức và tính chất tích chéo."),
  s("MOET2018-G7-NAA-P057-032", 7, "RATIO_PROPORTION", "PROPORTION_PROPERTY", "RATIO", "Vận dụng tính chất tỉ lệ thức để tìm giá trị chưa biết."),
  s("MOET2018-G7-EXP-P062-005", 7, "PERCENTAGE_REASONING", "PERCENT_CHANGE", "PERCENT", "Tính tăng hoặc giảm theo phần trăm trong tình huống rõ ràng."),
] as const satisfies readonly Spec[];

const GRADE_BOUNDS: Readonly<Record<number, WaveBOutcomeContract["parameterBounds"]>> = {
  2: { minimum: 0, maximum: 1_000, maxSteps: 1, maxDecimalPlaces: 0, maxDenominator: 10, allowNegative: false, languageBand: "primary-early" },
  3: { minimum: 0, maximum: 100_000, maxSteps: 2, maxDecimalPlaces: 0, maxDenominator: 12, allowNegative: false, languageBand: "primary" },
  4: { minimum: 0, maximum: 10_000_000, maxSteps: 2, maxDecimalPlaces: 0, maxDenominator: 12, allowNegative: false, languageBand: "primary" },
  5: { minimum: 0, maximum: 1_000_000, maxSteps: 3, maxDecimalPlaces: 3, maxDenominator: 24, allowNegative: false, languageBand: "primary-upper" },
  6: { minimum: -1_000_000, maximum: 1_000_000, maxSteps: 3, maxDecimalPlaces: 3, maxDenominator: 30, allowNegative: true, languageBand: "lower-secondary" },
  7: { minimum: -1_000_000, maximum: 1_000_000, maxSteps: 4, maxDecimalPlaces: 3, maxDenominator: 30, allowNegative: true, languageBand: "lower-secondary" },
};

function difficultyPolicy(capability: ProductVariantId): Readonly<Record<ProductDifficulty, string>> {
  return {
    EASY: `${capability}: direct one-step evidence in one representation`,
    MEDIUM: `${capability}: changed unknown position or equivalent representation with two linked steps`,
    HARD: `${capability}: bounded multi-step reasoning, error detection or information selection`,
  };
}

export const WAVE_B_OUTCOME_CONTRACTS: readonly WaveBOutcomeContract[] = SPECS.map(([outcomeId, grade, capability, taskKind, profile, intent, engine]) => {
  const policy = POLICIES[capability]!;
  const bounds = GRADE_BOUNDS[grade];
  if (!policy || policy.family === "UNUSED" || !bounds) throw new Error(`WAVE_B_POLICY_MISSING:${outcomeId}:${capability}`);
  return {
    contractType: WAVE_B_CONTRACT_VERSION,
    contractVersion: "wave-b-v2.1",
    engineVersion: engine ?? WAVE_B_ENGINE_VERSION,
    outcomeId,
    grade,
    unitId: `grade-${grade}-wave-b-${capability.toLowerCase().replaceAll("_", "-")}`,
    productFamilyId: policy.family,
    canonicalVariantId: capability,
    taskKind,
    profile,
    measurableIntent: intent,
    permittedEvidenceForms: policy.evidence,
    normalizedProblemModel: { kind: taskKind, requiredFields: ["taskKind", "values", "structureLevel", "exactArithmetic"] },
    parameterBounds: bounds,
    acceptedAnswerPolicy: policy.answer,
    uniquenessPolicy: "EXACTLY_ONE_NORMALIZED_ANSWER",
    interactionPolicy: policy.interactions,
    difficultyPolicy: difficultyPolicy(capability),
    variationPolicy: ["wording", "context", "unknown-position", "representation", "reasoning-structure"],
    independentSolver: engine ? "PROVEN_V2_INDEPENDENT_SOLVER" : `WAVE_B_${taskKind}_SOLVER_V2`,
    independentValidator: engine ? "PROVEN_V2_INDEPENDENT_VALIDATOR" : `WAVE_B_${taskKind}_VALIDATOR_V2`,
    misconceptionCatalog: policy.misconceptions,
    distractorPolicy: `Only misconception-derived distractors for ${capability}; duplicate and mathematically correct distractors are rejected.`,
    feedbackPolicy: `Vietnamese Grade ${grade} feedback names the relevant ${capability} misconception, shows bounded steps and gives one next step.`,
    visualPolicy: policy.visual,
    prerequisitePolicy: `Use only Grade ${grade} or earlier mathematics explicitly required by the canonical outcome.`,
  };
});

if (WAVE_B_OUTCOME_CONTRACTS.length !== 61 || new Set(WAVE_B_OUTCOME_CONTRACTS.map((item) => item.outcomeId)).size !== 61) throw new Error("WAVE_B_EXPLICIT_OUTCOME_REGISTRY_MUST_BE_61_UNIQUE");

const BY_OUTCOME = new Map(WAVE_B_OUTCOME_CONTRACTS.map((contract) => [contract.outcomeId, contract]));
export function getWaveBOutcomeContract(outcomeId: string) { return BY_OUTCOME.get(outcomeId); }
export function isWaveBImplementedByNewEngine(contract: WaveBOutcomeContract) { return contract.engineVersion === WAVE_B_ENGINE_VERSION; }
