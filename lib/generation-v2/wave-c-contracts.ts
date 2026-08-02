import type {
  ProductDifficulty,
  ProductInteractionType,
  ProductVariantId,
} from "./types.ts";

export const WAVE_C_CONTRACT_VERSION = "PLAVE_PRODUCT_ASSESSMENT_CONTRACT_V2" as const;
export const WAVE_C_ENGINE_VERSION = "plave-generator-v2-wave-c.1" as const;

export type WaveCProfile = "WHOLE" | "FRACTION" | "DECIMAL" | "RATIO" | "DATA" | "ALGEBRA" | "FUNCTION" | "EQUATION" | "INEQUALITY";

export type WaveCCapabilityId =
  | "MIXED_ARITHMETIC_EXPRESSION"
  | "ALGEBRAIC_SUBSTITUTION"
  | "RATIONAL_COMPARE_ORDER"
  | "FRACTION_COMMON_DENOMINATOR"
  | "FRACTION_EQUIVALENCE"
  | "NUMERIC_OPERATION_PROPERTIES"
  | "FRACTION_APPLICATION"
  | "RATIONAL_OPERATIONS"
  | "DATA_SEQUENCE_RECOGNITION"
  | "DATA_INVESTIGATION"
  | "DECIMAL_REPRESENTATION"
  | "MIXED_DECIMAL_FRACTION_REPRESENTATION"
  | "PERCENTAGE_REASONING"
  | "DECIMAL_APPLICATION"
  | "DECIMAL_ROUNDING"
  | "SCALE_REASONING"
  | "DECIMAL_OPERATIONS"
  | "DECIMAL_SCALE_OPERATION"
  | "DECIMAL_COMPARE_ORDER"
  | "SIGNED_FRACTION_REPRESENTATION"
  | "RATIO_PROPORTION"
  | "PROPORTIONAL_REASONING"
  | "ALGEBRAIC_IDENTITY"
  | "POLYNOMIAL_SIMPLIFICATION"
  | "FUNCTION_GRAPH_RECOGNITION"
  | "FUNCTION_EVALUATION"
  | "POLYNOMIAL_FACTORIZATION"
  | "QUADRATIC_MODELING"
  | "QUADRATIC_GRAPH_SYMMETRY"
  | "RADICAL_TRANSFORMATION"
  | "LINEAR_SYSTEM"
  | "QUADRATIC_EQUATION_SOLVING"
  | "RATIONAL_EQUATION_SOLVING"
  | "PRODUCT_EQUATION_SOLVING"
  | "LINEAR_SYSTEM_MODELING"
  | "INEQUALITY_PROPERTY"
  | "LINEAR_SYSTEM_SOLUTION_CHECK"
  | "QUADRATIC_EQUATION_RECOGNITION"
  | "LINEAR_SYSTEM_RECOGNITION"
  | "LINEAR_INEQUALITY_SOLVING"
  | "LINEAR_INEQUALITY_RECOGNITION";

export type WaveCOutcomeContract = Readonly<{
  contractType: typeof WAVE_C_CONTRACT_VERSION;
  contractVersion: "wave-c-v2.1";
  engineVersion: typeof WAVE_C_ENGINE_VERSION | "PROVEN_V2_BASELINE";
  outcomeId: string;
  grade: number;
  unitId: string;
  productFamilyId: string;
  canonicalVariantId: WaveCCapabilityId & ProductVariantId;
  taskMode: string;
  profile: WaveCProfile;
  measurableIntent: string;
  permittedEvidenceForms: readonly string[];
  normalizedProblemModel: Readonly<{ kind: WaveCCapabilityId; mode: string; requiredFields: readonly string[] }>;
  parameterBounds: Readonly<{ minimum: number; maximum: number; maxSteps: number; maxDecimalPlaces: number; maxDenominator: number; allowNegative: boolean; exactArithmetic: boolean; languageBand: string }>;
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

type Policy = Readonly<{
  family: string;
  evidence: readonly string[];
  answer: string;
  visual: string;
  misconceptions: readonly string[];
}>;

const q = (family: string, evidence: readonly string[], answer: string, visual: string, misconceptions: readonly string[]): Policy => ({ family, evidence, answer, visual, misconceptions });
const POLICIES: Readonly<Record<WaveCCapabilityId, Policy>> = {
  MIXED_ARITHMETIC_EXPRESSION: q("NUMERIC_EXPRESSIONS", ["calculate-exact-expression"], "one exact integer", "NONE", ["operation order", "parentheses ignored"]),
  ALGEBRAIC_SUBSTITUTION: q("ALGEBRA", ["substitute-and-evaluate"], "one exact integer or reduced rational", "DATA_TABLE when assignments are evidence", ["wrong variable value", "sign error"]),
  RATIONAL_COMPARE_ORDER: q("FRACTIONS", ["compare-and-order-fractions"], "exact ordered item ids", "FRACTION_MODEL when representation is evidence", ["denominator-only comparison", "reversed order"]),
  FRACTION_COMMON_DENOMINATOR: q("FRACTIONS", ["construct-equivalent-fraction"], "one reduced equivalent rational target", "FRACTION_MODEL", ["only numerator scaled", "wrong common denominator"]),
  FRACTION_EQUIVALENCE: q("FRACTIONS", ["simplify-fraction"], "any mathematically equivalent fraction normalizes to one value", "FRACTION_MODEL", ["numerator/denominator not scaled together"]),
  NUMERIC_OPERATION_PROPERTIES: q("OPERATION_PROPERTIES", ["identify-equivalent-transformation"], "one equivalent expression id", "NONE", ["invalid distribution", "invalid association"]),
  FRACTION_APPLICATION: q("FRACTIONS", ["model-and-solve-fraction-context"], "one reduced rational or exact quantity", "FRACTION_MODEL when partition is evidence", ["wrong operation", "ignored step"]),
  RATIONAL_OPERATIONS: q("FRACTIONS", ["perform-fraction-operation"], "one reduced rational", "NONE", ["denominators added", "division not inverted"]),
  DATA_SEQUENCE_RECOGNITION: q("STATISTICS", ["recognize-and-order-data-sequence"], "exact ordered observation ids", "DATA_TABLE", ["sorted frequencies instead of observations", "reversed order"]),
  DATA_INVESTIGATION: q("STATISTICS", ["read-collected-data", "derive-total-or-range"], "one exact statistic", "DATA_TABLE", ["misread category", "omitted observation"]),
  DECIMAL_REPRESENTATION: q("DECIMALS", ["read-write-decimal", "identify-decimal-place"], "integer-scaled decimal or digit", "PLACE_VALUE_CHART", ["decimal place shift", "whole/fractional part confusion"]),
  MIXED_DECIMAL_FRACTION_REPRESENTATION: q("DECIMALS", ["convert-decimal-fraction-and-mixed-number"], "one reduced rational", "PLACE_VALUE_CHART", ["power-of-ten denominator error", "whole part omitted"]),
  PERCENTAGE_REASONING: q("PERCENTAGE", ["find-percent-or-rate"], "one exact integer-scaled result", "DATA_TABLE", ["wrong base quantity", "percent treated as whole"]),
  DECIMAL_APPLICATION: q("DECIMALS", ["model-multi-step-decimal-context"], "one integer-scaled decimal", "DATA_TABLE when quantities are evidence", ["wrong operation", "decimal alignment"]),
  DECIMAL_ROUNDING: q("DECIMALS", ["round-decimal-to-place"], "one integer-scaled decimal at declared precision", "NUMBER_LINE", ["wrong rounding place", "ignored next digit"]),
  SCALE_REASONING: q("RATIO_AND_RATE", ["convert-map-and-real-distance"], "one exact scaled distance with unit", "DATA_TABLE", ["inverse scale", "unit mismatch"]),
  DECIMAL_OPERATIONS: q("DECIMALS", ["perform-decimal-operation"], "one integer-scaled decimal", "NONE", ["decimal alignment", "incorrect scaling"]),
  DECIMAL_SCALE_OPERATION: q("DECIMALS", ["multiply-divide-by-power-of-ten"], "one integer-scaled decimal", "PLACE_VALUE_CHART", ["decimal moved wrong direction", "wrong number of places"]),
  DECIMAL_COMPARE_ORDER: q("DECIMALS", ["order-decimals"], "exact ordered ids using integer scaling", "NUMBER_LINE", ["string-length comparison", "reversed order"]),
  SIGNED_FRACTION_REPRESENTATION: q("RATIONAL_NUMBERS", ["normalize-signed-fraction"], "one reduced rational with normalized sign", "NUMBER_LINE", ["negative denominator left unnormalized", "sign lost"]),
  RATIO_PROPORTION: q("RATIO_AND_RATE", ["complete-equal-ratio-sequence"], "one unique proportional value", "DATA_TABLE", ["non-equivalent scaling", "ratio order reversed"]),
  PROPORTIONAL_REASONING: q("RATIO_AND_RATE", ["divide-quantity-in-given-ratio"], "one unique requested part", "DATA_TABLE", ["used one ratio term as total", "parts reversed"]),
  ALGEBRAIC_IDENTITY: q("ALGEBRA", ["recognize-or-match-identity"], "one identity id or exact matching", "NONE", ["middle term omitted", "sign pattern error"]),
  POLYNOMIAL_SIMPLIFICATION: q("ALGEBRA", ["combine-like-terms"], "canonical coefficient expression", "NONE", ["unlike terms combined", "coefficient sign error"]),
  FUNCTION_GRAPH_RECOGNITION: q("FUNCTIONS", ["recognize-function-graph"], "one graph id satisfying vertical-line rule", "COORDINATE_GRAPH", ["axes mistaken for graph", "multiple y-values ignored"]),
  FUNCTION_EVALUATION: q("FUNCTIONS", ["evaluate-formula-at-input"], "one exact integer or reduced rational", "DATA_TABLE", ["input not substituted everywhere", "operation order"]),
  POLYNOMIAL_FACTORIZATION: q("ALGEBRA", ["factor-by-identity-or-common-factor"], "canonical factorized expression", "NONE", ["common factor omitted", "identity sign error"]),
  QUADRATIC_MODELING: q("FUNCTIONS", ["solve-bounded-quadratic-context"], "one context-valid root", "COORDINATE_GRAPH", ["invalid root retained", "linear model used"]),
  QUADRATIC_GRAPH_SYMMETRY: q("FUNCTIONS", ["identify-quadratic-axis"], "one exact axis value", "COORDINATE_GRAPH", ["used intercept as axis", "sign error in -b/2a"]),
  RADICAL_TRANSFORMATION: q("ALGEBRA", ["simplify-radical-expression"], "canonical exact radical form", "NONE", ["invalid radical split", "square factor missed"]),
  LINEAR_SYSTEM: q("EQUATIONS", ["solve-linear-system"], "one ordered pair", "NONE", ["sign error", "pair satisfies one equation only"]),
  QUADRATIC_EQUATION_SOLVING: q("EQUATIONS", ["solve-quadratic-equation"], "one double root or exact ordered roots", "NONE", ["one root omitted", "factor sign error"]),
  RATIONAL_EQUATION_SOLVING: q("EQUATIONS", ["solve-rational-equation-with-domain"], "one exact admissible root", "NONE", ["excluded value retained", "denominator not cleared"]),
  PRODUCT_EQUATION_SOLVING: q("EQUATIONS", ["apply-zero-product-property"], "exact ordered roots", "NONE", ["only one factor solved", "sign error"]),
  LINEAR_SYSTEM_MODELING: q("EQUATIONS", ["model-and-solve-two-quantity-context"], "one ordered pair with named quantities", "DATA_TABLE", ["quantities reversed", "one equation modeled incorrectly"]),
  INEQUALITY_PROPERTY: q("INEQUALITIES", ["recognize-valid-inequality-transformation"], "one valid transformation id", "NUMBER_LINE", ["direction not reversed", "addition property misused"]),
  LINEAR_SYSTEM_SOLUTION_CHECK: q("EQUATIONS", ["check-ordered-pair-in-both-equations"], "one ordered-pair option", "COORDINATE_GRAPH", ["checked only one equation", "coordinates reversed"]),
  QUADRATIC_EQUATION_RECOGNITION: q("EQUATIONS", ["recognize-quadratic-standard-form"], "one equation id", "NONE", ["degree misidentified", "leading coefficient zero"]),
  LINEAR_SYSTEM_RECOGNITION: q("EQUATIONS", ["recognize-linear-equation-and-system"], "one system id", "NONE", ["nonlinear term accepted", "single equation mistaken for system"]),
  LINEAR_INEQUALITY_SOLVING: q("INEQUALITIES", ["solve-linear-inequality"], "canonical interval inequality", "NUMBER_LINE", ["direction not reversed", "boundary sign error"]),
  LINEAR_INEQUALITY_RECOGNITION: q("INEQUALITIES", ["recognize-linear-inequality-and-solution"], "one inequality id", "NUMBER_LINE", ["equation mistaken for inequality", "nonlinear expression accepted"]),
};

type Spec = readonly [string, number, WaveCCapabilityId, string, WaveCProfile, readonly ProductInteractionType[], string, "PROVEN_V2_BASELINE"?];
const s = (...value: Spec) => value;

const SPECS = [
  s("MOET2018-G3-NUM-P030-019", 3, "MIXED_ARITHMETIC_EXPRESSION", "NUMERIC_EXPRESSION_PARENTHESES", "WHOLE", ["INTEGER_INPUT"], "Tính biểu thức số có tối đa hai phép tính, thực hiện ngoặc trước."),
  s("MOET2018-G3-NUM-P030-020", 3, "MIXED_ARITHMETIC_EXPRESSION", "NUMERIC_EXPRESSION_ORDER", "WHOLE", ["INTEGER_INPUT"], "Tính biểu thức số có tối đa hai phép tính theo thứ tự thực hiện phép tính."),
  s("MOET2018-G4-NUM-P035-006", 4, "ALGEBRAIC_SUBSTITUTION", "MULTIVARIABLE_SUBSTITUTION", "ALGEBRA", ["INTEGER_INPUT"], "Thay giá trị cho một đến ba chữ và tính biểu thức đơn giản."),
  s("MOET2018-G4-NUM-P036-020", 4, "RATIONAL_COMPARE_ORDER", "FRACTION_COMPARE_ORDER", "FRACTION", ["ORDERING"], "So sánh và sắp xếp phân số cùng mẫu hoặc có mẫu chia hết nhau."),
  s("MOET2018-G4-NUM-P036-021", 4, "FRACTION_COMMON_DENOMINATOR", "COMMON_DENOMINATOR", "FRACTION", ["INTEGER_INPUT"], "Quy đồng hai phân số khi một mẫu chia hết mẫu còn lại."),
  s("MOET2018-G4-NUM-P036-022", 4, "FRACTION_EQUIVALENCE", "FRACTION_SIMPLIFY", "FRACTION", ["FRACTION_INPUT"], "Rút gọn phân số trong trường hợp đơn giản."),
  s("MOET2018-G4-NUM-P036-023", 4, "NUMERIC_OPERATION_PROPERTIES", "DISTRIBUTIVE_PROPERTY", "WHOLE", ["SINGLE_CHOICE"], "Vận dụng tính chất phân phối để nhận biết biểu thức tương đương."),
  s("MOET2018-G4-NUM-P036-024", 4, "RATIONAL_COMPARE_ORDER", "FRACTION_EXTREME", "FRACTION", ["SINGLE_CHOICE"], "Xác định phân số lớn nhất hoặc bé nhất trong nhóm không quá bốn phân số."),
  s("MOET2018-G4-NUM-P037-025", 4, "FRACTION_APPLICATION", "FRACTION_MULTI_STEP_APPLICATION", "FRACTION", ["FRACTION_INPUT"], "Giải bài toán hai hoặc ba bước có phân số của một số."),
  s("MOET2018-G4-NUM-P037-026", 4, "RATIONAL_OPERATIONS", "FRACTION_MULTIPLY_DIVIDE", "FRACTION", ["FRACTION_INPUT"], "Nhân hoặc chia chính xác hai phân số dương."),
  s("MOET2018-G4-STA-P038-001", 4, "DATA_SEQUENCE_RECOGNITION", "STATISTICAL_SEQUENCE", "DATA", ["ORDERING"], "Nhận biết và tổ chức một dãy số liệu thống kê."),
  s("MOET2018-G4-EXP-P040-003", 4, "DATA_INVESTIGATION", "DATA_COLLECTION_ANALYSIS", "DATA", ["TABLE_OR_CHART_RESPONSE"], "Phân tích số liệu đơn giản đã thu thập trong một bối cảnh trải nghiệm."),
  s("MOET2018-G5-NUM-P041-005", 5, "DECIMAL_REPRESENTATION", "DECIMAL_READ_WRITE", "DECIMAL", ["DECIMAL_INPUT"], "Đọc và viết số thập phân từ cấu tạo theo hàng."),
  s("MOET2018-G5-NUM-P041-006", 5, "FRACTION_APPLICATION", "FRACTION_MULTI_STEP_APPLICATION", "FRACTION", ["FRACTION_INPUT"], "Giải bài toán một hoặc nhiều bước với phép tính phân số."),
  s("MOET2018-G5-NUM-P041-007", 5, "MIXED_DECIMAL_FRACTION_REPRESENTATION", "DECIMAL_FRACTION_MIXED_NUMBER", "DECIMAL", ["FRACTION_INPUT"], "Biểu diễn phân số thập phân và hỗn số dưới dạng phân số chính xác."),
  s("MOET2018-G5-NUM-P041-008", 5, "DECIMAL_REPRESENTATION", "DECIMAL_PLACE_VALUE", "DECIMAL", ["DECIMAL_INPUT"], "Xác định phần nguyên, phần thập phân và giá trị một hàng thập phân."),
  s("MOET2018-G5-NUM-P041-010", 5, "FRACTION_EQUIVALENCE", "FRACTION_SIMPLIFY", "FRACTION", ["FRACTION_INPUT"], "Rút gọn phân số về dạng tối giản."),
  s("MOET2018-G5-NUM-P041-012", 5, "RATIONAL_OPERATIONS", "FRACTION_FOUR_OPERATIONS", "FRACTION", ["FRACTION_INPUT"], "Thực hiện bốn phép tính với phân số trong giới hạn lớp 5."),
  s("MOET2018-G5-NUM-P041-013", 5, "RATIONAL_OPERATIONS", "FRACTION_ADD_SUB_PRODUCT_DENOMINATOR", "FRACTION", ["FRACTION_INPUT"], "Cộng hoặc trừ phân số bằng mẫu chung là tích hai mẫu."),
  s("MOET2018-G5-NUM-P042-014", 5, "PERCENTAGE_REASONING", "PERCENT_OF_AND_RATE", "RATIO", ["DECIMAL_INPUT", "INTEGER_INPUT"], "Tính tỉ số phần trăm hoặc giá trị phần trăm trong bối cảnh phù hợp."),
  s("MOET2018-G5-NUM-P042-015", 5, "DECIMAL_APPLICATION", "DECIMAL_MULTI_STEP_APPLICATION", "DECIMAL", ["DECIMAL_INPUT"], "Giải bài toán một hoặc nhiều bước với số thập phân."),
  s("MOET2018-G5-NUM-P042-016", 5, "DECIMAL_ROUNDING", "DECIMAL_ROUND_TO_PLACE", "DECIMAL", ["DECIMAL_INPUT"], "Làm tròn số thập phân tới đơn vị, phần mười hoặc phần trăm."),
  s("MOET2018-G5-NUM-P042-017", 5, "SCALE_REASONING", "MAP_SCALE", "RATIO", ["INTEGER_INPUT", "DECIMAL_INPUT"], "Dùng tỉ lệ bản đồ để tìm khoảng cách thật hoặc khoảng cách trên bản đồ."),
  s("MOET2018-G5-NUM-P042-018", 5, "DECIMAL_OPERATIONS", "DECIMAL_DIVISION", "DECIMAL", ["DECIMAL_INPUT"], "Chia một số cho số thập phân dạng a,b hoặc 0,ab với thương hữu hạn."),
  s("MOET2018-G5-NUM-P042-019", 5, "DECIMAL_OPERATIONS", "DECIMAL_ADD_SUBTRACT", "DECIMAL", ["DECIMAL_INPUT"], "Cộng hoặc trừ chính xác hai số thập phân."),
  s("MOET2018-G5-NUM-P042-020", 5, "DECIMAL_OPERATIONS", "DECIMAL_MULTIPLICATION", "DECIMAL", ["DECIMAL_INPUT"], "Nhân một số với số thập phân dạng a,b hoặc 0,ab."),
  s("MOET2018-G5-NUM-P042-021", 5, "DECIMAL_SCALE_OPERATION", "DECIMAL_POWER_OF_TEN", "DECIMAL", ["DECIMAL_INPUT"], "Nhân hoặc chia nhẩm số thập phân với lũy thừa của 10 hoặc nghịch đảo tương ứng."),
  s("MOET2018-G5-NUM-P042-022", 5, "DECIMAL_COMPARE_ORDER", "DECIMAL_COMPARE_ORDER", "DECIMAL", ["ORDERING"], "Sắp xếp tối đa bốn số thập phân theo chiều chỉ định."),
  s("MOET2018-G5-NUM-P042-023", 5, "NUMERIC_OPERATION_PROPERTIES", "DECIMAL_OPERATION_PROPERTY", "DECIMAL", ["SINGLE_CHOICE"], "Vận dụng tính chất và quan hệ phép tính với số thập phân."),
  s("MOET2018-G5-EXP-P046-002", 5, "DATA_INVESTIGATION", "DATA_COLLECTION_ANALYSIS", "DATA", ["TABLE_OR_CHART_RESPONSE"], "Phân tích số liệu thống kê đã thu thập trong bối cảnh lớp 5."),
  s("MOET2018-G6-NAA-P049-036", 6, "SIGNED_FRACTION_REPRESENTATION", "SIGNED_FRACTION", "FRACTION", ["FRACTION_INPUT"], "Chuẩn hóa phân số có tử hoặc mẫu là số nguyên âm."),
  s("MOET2018-G7-NAA-P057-024", 7, "RATIO_PROPORTION", "EQUAL_RATIO_SEQUENCE", "RATIO", ["TABLE_OR_CHART_RESPONSE"], "Nhận biết và hoàn thành dãy tỉ số bằng nhau."),
  s("MOET2018-G7-NAA-P057-030", 7, "ALGEBRAIC_SUBSTITUTION", "ALGEBRAIC_EXPRESSION_VALUE", "ALGEBRA", ["FRACTION_INPUT", "INTEGER_INPUT"], "Tính chính xác giá trị biểu thức đại số với số hữu tỉ."),
  s("MOET2018-G7-NAA-P057-031", 7, "PROPORTIONAL_REASONING", "DIVIDE_IN_GIVEN_RATIO", "RATIO", ["TABLE_OR_CHART_RESPONSE", "INTEGER_INPUT"], "Chia một đại lượng thành các phần theo tỉ lệ cho trước."),
  s("MOET2018-G8-NAA-P063-001", 8, "ALGEBRAIC_IDENTITY", "NOTABLE_IDENTITIES", "ALGEBRA", ["MATCHING"], "Ghép các hằng đẳng thức bình phương và lập phương với khai triển đúng."),
  s("MOET2018-G8-NAA-P063-003", 8, "ALGEBRAIC_IDENTITY", "IDENTITY_RECOGNITION", "ALGEBRA", ["SINGLE_CHOICE"], "Nhận biết đồng nhất thức và hằng đẳng thức qua thay đổi giá trị."),
  s("MOET2018-G8-NAA-P063-007", 8, "POLYNOMIAL_SIMPLIFICATION", "COMBINE_LIKE_TERMS", "ALGEBRA", ["SHORT_STRUCTURED_RESPONSE"], "Thu gọn đơn thức hoặc đa thức bằng cách nhóm hạng tử đồng dạng."),
  s("MOET2018-G8-NAA-P064-012", 8, "FUNCTION_GRAPH_RECOGNITION", "FUNCTION_GRAPH", "FUNCTION", ["CONSTRUCTION_OR_VISUAL_SELECTION"], "Nhận biết đồ thị biểu diễn một hàm số bằng quy tắc đường thẳng đứng."),
  s("MOET2018-G8-NAA-P064-018", 8, "FUNCTION_EVALUATION", "FUNCTION_VALUE", "FUNCTION", ["INTEGER_INPUT"], "Tính giá trị hàm số từ công thức tại một đầu vào cho trước."),
  s("MOET2018-G8-NAA-P064-019", 8, "POLYNOMIAL_FACTORIZATION", "IDENTITY_FACTORIZATION", "ALGEBRA", ["SHORT_STRUCTURED_RESPONSE", "SINGLE_CHOICE"], "Phân tích đa thức thành nhân tử bằng hằng đẳng thức, nhóm hoặc đặt nhân tử chung."),
  s("MOET2018-G9-NAA-P071-001", 9, "QUADRATIC_MODELING", "QUADRATIC_APPLICATION", "FUNCTION", ["INTEGER_INPUT", "DECIMAL_INPUT"], "Giải bài toán thực tiễn có mô hình hàm số bậc hai và chọn nghiệm phù hợp bối cảnh."),
  s("MOET2018-G9-NAA-P071-004", 9, "QUADRATIC_GRAPH_SYMMETRY", "QUADRATIC_AXIS", "FUNCTION", ["DECIMAL_INPUT", "SINGLE_CHOICE"], "Xác định trục đối xứng của đồ thị hàm số bậc hai từ mô hình chính xác."),
  s("MOET2018-G9-NAA-P071-006", 9, "RADICAL_TRANSFORMATION", "RADICAL_SIMPLIFICATION", "ALGEBRA", ["SHORT_STRUCTURED_RESPONSE", "SINGLE_CHOICE"], "Biến đổi căn thức bậc hai đơn giản với điều kiện xác định tường minh."),
  s("MOET2018-G9-NAA-P072-010", 9, "LINEAR_SYSTEM", "LINEAR_SYSTEM_SOLVE", "EQUATION", ["MATCHING"], "Giải hệ hai phương trình bậc nhất hai ẩn có nghiệm duy nhất.", "PROVEN_V2_BASELINE"),
  s("MOET2018-G9-NAA-P072-011", 9, "QUADRATIC_EQUATION_SOLVING", "QUADRATIC_SOLVE", "EQUATION", ["INTEGER_INPUT", "ORDERING"], "Giải phương trình bậc hai một ẩn có nghiệm nguyên được kiểm chứng."),
  s("MOET2018-G9-NAA-P072-012", 9, "RATIONAL_EQUATION_SOLVING", "RATIONAL_EQUATION", "EQUATION", ["FRACTION_INPUT", "INTEGER_INPUT"], "Giải phương trình chứa ẩn ở mẫu, nêu và kiểm tra điều kiện xác định."),
  s("MOET2018-G9-NAA-P072-013", 9, "PRODUCT_EQUATION_SOLVING", "PRODUCT_EQUATION", "EQUATION", ["ORDERING"], "Giải phương trình tích hai nhân tử bậc nhất bằng tính chất tích bằng không."),
  s("MOET2018-G9-NAA-P072-014", 9, "LINEAR_SYSTEM_MODELING", "LINEAR_SYSTEM_APPLICATION", "EQUATION", ["MATCHING"], "Lập và giải hệ hai phương trình từ hai đại lượng thực tiễn có nghiệm nguyên duy nhất."),
  s("MOET2018-G9-NAA-P072-016", 9, "INEQUALITY_PROPERTY", "INEQUALITY_PROPERTIES", "INEQUALITY", ["SINGLE_CHOICE"], "Nhận biết biến đổi bất đẳng thức đúng, kể cả khi nhân hoặc chia số âm."),
  s("MOET2018-G9-NAA-P072-017", 9, "LINEAR_SYSTEM_SOLUTION_CHECK", "SYSTEM_SOLUTION_CONCEPT", "EQUATION", ["SINGLE_CHOICE"], "Kiểm tra một cặp số có thỏa mãn đồng thời hai phương trình hay không."),
  s("MOET2018-G9-NAA-P072-018", 9, "QUADRATIC_EQUATION_RECOGNITION", "QUADRATIC_DEFINITION", "EQUATION", ["SINGLE_CHOICE"], "Nhận biết phương trình bậc hai một ẩn và điều kiện hệ số bậc hai khác không."),
  s("MOET2018-G9-NAA-P072-019", 9, "LINEAR_SYSTEM_RECOGNITION", "LINEAR_SYSTEM_DEFINITION", "EQUATION", ["SINGLE_CHOICE"], "Nhận biết phương trình bậc nhất hai ẩn và hệ gồm hai phương trình như vậy."),
  s("MOET2018-G9-NAA-P072-020", 9, "LINEAR_SYSTEM", "LINEAR_SYSTEM_CALCULATOR", "EQUATION", ["MATCHING"], "Tính và kiểm tra nghiệm hệ hai phương trình bậc nhất bằng quy trình máy tính cầm tay."),
  s("MOET2018-G9-NAA-P072-021", 9, "QUADRATIC_EQUATION_SOLVING", "QUADRATIC_CALCULATOR", "EQUATION", ["INTEGER_INPUT", "ORDERING"], "Tính và kiểm tra nghiệm phương trình bậc hai bằng quy trình máy tính cầm tay."),
  s("MOET2018-G9-NAA-P072-022", 9, "QUADRATIC_MODELING", "QUADRATIC_EQUATION_APPLICATION", "EQUATION", ["INTEGER_INPUT", "DECIMAL_INPUT"], "Lập phương trình bậc hai cho bài toán thực tiễn và chọn nghiệm phù hợp."),
  s("MOET2018-G9-NAA-P073-023", 9, "LINEAR_INEQUALITY_SOLVING", "LINEAR_INEQUALITY", "INEQUALITY", ["SHORT_STRUCTURED_RESPONSE", "SINGLE_CHOICE"], "Giải bất phương trình bậc nhất một ẩn và biểu diễn đúng chiều nghiệm."),
  s("MOET2018-G9-NAA-P073-025", 9, "LINEAR_INEQUALITY_RECOGNITION", "LINEAR_INEQUALITY_CONCEPT", "INEQUALITY", ["SINGLE_CHOICE"], "Nhận biết bất phương trình bậc nhất một ẩn và một giá trị thuộc miền nghiệm."),
] as const satisfies readonly Spec[];

function bounds(grade: number) {
  return {
    minimum: grade <= 4 ? 0 : -100,
    maximum: grade <= 5 ? 100_000 : grade <= 7 ? 10_000 : 2_000,
    maxSteps: grade <= 4 ? 3 : grade <= 7 ? 4 : 6,
    maxDecimalPlaces: grade <= 4 ? 0 : grade === 5 ? 3 : 4,
    maxDenominator: grade <= 4 ? 24 : grade <= 7 ? 60 : 100,
    allowNegative: grade >= 6,
    exactArithmetic: true,
    languageBand: `GRADE_${grade}_VIETNAMESE`,
  } as const;
}

function difficulty(capability: WaveCCapabilityId): Readonly<Record<ProductDifficulty, string>> {
  return {
    EASY: `${capability}: direct one-step evidence with canonical representation`,
    MEDIUM: `${capability}: changed unknown position or representation with at least two reasoning actions`,
    HARD: `${capability}: bounded multi-step reasoning, domain check, or misconception discrimination`,
  };
}

export const WAVE_C_OUTCOME_CONTRACTS: readonly WaveCOutcomeContract[] = SPECS.map(([outcomeId, grade, capability, taskMode, profile, interactions, intent, engine]) => {
  const policy = POLICIES[capability];
  return {
    contractType: WAVE_C_CONTRACT_VERSION,
    contractVersion: "wave-c-v2.1",
    engineVersion: engine ?? WAVE_C_ENGINE_VERSION,
    outcomeId,
    grade,
    unitId: `grade-${grade}-wave-c-${capability.toLowerCase().replaceAll("_", "-")}`,
    productFamilyId: policy.family,
    canonicalVariantId: capability,
    taskMode,
    profile,
    measurableIntent: intent,
    permittedEvidenceForms: policy.evidence,
    normalizedProblemModel: { kind: capability, mode: taskMode, requiredFields: ["capability", "taskMode", "values", "exactRationals", "structureLevel"] },
    parameterBounds: bounds(grade),
    acceptedAnswerPolicy: policy.answer,
    uniquenessPolicy: "EXACTLY_ONE_NORMALIZED_ANSWER",
    interactionPolicy: interactions,
    difficultyPolicy: difficulty(capability),
    variationPolicy: ["wording", "context", "unknown-position", "parameter-structure", "representation", "misconception-family"],
    independentSolver: engine ? "PROVEN_V2_INDEPENDENT_SOLVER" : `WAVE_C_${capability}_EXACT_SOLVER_V2`,
    independentValidator: engine ? "PROVEN_V2_INDEPENDENT_VALIDATOR" : `WAVE_C_${capability}_INDEPENDENT_VALIDATOR_V2`,
    misconceptionCatalog: policy.misconceptions,
    distractorPolicy: `Only mathematically invalid, misconception-derived distractors for ${capability}; duplicate or also-correct options are rejected.`,
    feedbackPolicy: `Vietnamese Grade ${grade} feedback identifies the ${capability} misconception, shows exact steps, and gives one next action.`,
    visualPolicy: policy.visual,
    prerequisitePolicy: `Only Grade ${grade} or earlier dependencies explicitly named by this outcome contract are allowed.`,
  };
});

if (WAVE_C_OUTCOME_CONTRACTS.length !== 57 || new Set(WAVE_C_OUTCOME_CONTRACTS.map((item) => item.outcomeId)).size !== 57) throw new Error("WAVE_C_EXPLICIT_OUTCOME_REGISTRY_MUST_BE_57_UNIQUE");
if (new Set(WAVE_C_OUTCOME_CONTRACTS.map((item) => item.canonicalVariantId)).size !== 41) throw new Error("WAVE_C_CANONICAL_CAPABILITY_COUNT_MUST_BE_41");

const BY_OUTCOME = new Map(WAVE_C_OUTCOME_CONTRACTS.map((contract) => [contract.outcomeId, contract]));
export function getWaveCOutcomeContract(outcomeId: string) { return BY_OUTCOME.get(outcomeId); }
export function isWaveCImplementedByNewEngine(contract: WaveCOutcomeContract) { return contract.engineVersion === WAVE_C_ENGINE_VERSION; }
