import type {
  ProductDifficulty,
  ProductInteractionType,
  ProductVariantId,
} from "./types.ts";
import {
  WAVE_A_OUTCOME_CONTRACTS,
  isWaveAImplementedByNewEngine,
} from "./wave-a-contracts.ts";
import {
  WAVE_B_OUTCOME_CONTRACTS,
  isWaveBImplementedByNewEngine,
} from "./wave-b-contracts.ts";
import {
  WAVE_C_OUTCOME_CONTRACTS,
  isWaveCImplementedByNewEngine,
} from "./wave-c-contracts.ts";
import {
  WAVE_D_OUTCOME_CONTRACTS,
  isWaveDImplementedByNewEngine,
} from "./wave-d-contracts.ts";
import {
  WAVE_E_OUTCOME_CONTRACTS,
  isWaveEImplementedByNewEngine,
} from "./wave-e-contracts.ts";
import {
  WAVE_F_OUTCOME_CONTRACTS,
  isWaveFImplementedByNewEngine,
} from "./wave-f-contracts.ts";

export type ProductVariantRegistryEntry = Readonly<{
  outcomeId: string;
  outcomeTitle: string;
  grade: number;
  unitId: string;
  productFamilyId: string;
  variantId: ProductVariantId;
  parameterPolicy: Readonly<{
    gradeBounds: string;
    forbidden: readonly string[];
  }>;
  difficultyPolicy: Readonly<Record<ProductDifficulty, string>>;
  interactionPolicy: readonly ProductInteractionType[];
  solverId: string;
  validatorId: string;
  visualContract: string;
  feedbackStrategy: string;
}>;

export const PRODUCT_VARIANT_REGISTRY = [
  {
    outcomeId: "MOET2018-G1-NUM-P022-004",
    outcomeTitle: "Nhận biết được ý nghĩa của phép cộng, phép trừ.",
    grade: 1,
    unitId: "grade-1-numbers-to-10",
    productFamilyId: "WHOLE_NUMBER_OPERATIONS",
    variantId: "ADD_SUB_MEANING",
    parameterPolicy: { gradeBounds: "0..10, kết quả không âm", forbidden: ["số âm", "nhớ/mượn vượt outcome"] },
    difficultyPolicy: { EASY: "một phép cộng bằng vật thể", MEDIUM: "phép trừ, ẩn kết quả", HARD: "chọn phép tính phù hợp với tình huống" },
    interactionPolicy: ["INTEGER_INPUT", "SINGLE_CHOICE"],
    solverId: "INTEGER_OPERATION_SOLVER_V2",
    validatorId: "GRADE1_ADD_SUB_VALIDATOR_V2",
    visualContract: "OBJECT_GROUPS khi biểu diễn bằng đồ vật",
    feedbackStrategy: "giải thích thêm vào hoặc bớt đi",
  },
  {
    outcomeId: "MOET2018-G2-NUM-P025-018",
    outcomeTitle: "Vận dụng được bảng nhân 2 và bảng nhân 5 trong thực hành tính.",
    grade: 2,
    unitId: "grade-2-multiplication-division",
    productFamilyId: "WHOLE_NUMBER_OPERATIONS",
    variantId: "MULTIPLY_DIVIDE_FACTS",
    parameterPolicy: { gradeBounds: "bảng 2 và bảng 5", forbidden: ["thừa số ngoài outcome", "chia có dư"] },
    difficultyPolicy: { EASY: "nhân trực tiếp", MEDIUM: "chia theo nhóm bằng nhau", HARD: "tìm thừa số hoặc số nhóm chưa biết" },
    interactionPolicy: ["SINGLE_CHOICE", "INTEGER_INPUT"],
    solverId: "EQUAL_GROUPS_SOLVER_V2",
    validatorId: "TABLE_2_5_VALIDATOR_V2",
    visualContract: "OBJECT_GROUPS đồng nhất với số nhóm và số phần tử",
    feedbackStrategy: "liên hệ phép nhân với phép chia",
  },
  {
    outcomeId: "MOET2018-G3-NUM-P029-004",
    outcomeTitle: "Nhận biết được cấu tạo thập phân của một số.",
    grade: 3,
    unitId: "grade-3-number-sense-to-100000-p1",
    productFamilyId: "PLACE_VALUE",
    variantId: "PLACE_VALUE_COMPARE",
    parameterPolicy: { gradeBounds: "số tự nhiên đến 100 000", forbidden: ["số thập phân", "hàng triệu"] },
    difficultyPolicy: { EASY: "xác định một chữ số", MEDIUM: "so sánh hai số gần nhau", HARD: "sắp xếp theo cấu tạo hàng" },
    interactionPolicy: ["SINGLE_CHOICE", "ORDERING"],
    solverId: "PLACE_VALUE_SOLVER_V2",
    validatorId: "PLACE_VALUE_G3_VALIDATOR_V2",
    visualContract: "PLACE_VALUE_CHART có nhãn hàng khớp số",
    feedbackStrategy: "đọc từ hàng lớn nhất khác nhau",
  },
  {
    outcomeId: "MOET2018-G4-NUM-P036-018",
    outcomeTitle: "Nhận biết được khái niệm ban đầu về phân số, tử số, mẫu số.",
    grade: 4,
    unitId: "grade-4-fraction-foundations",
    productFamilyId: "FRACTIONS",
    variantId: "FRACTION_PART_WHOLE",
    parameterPolicy: { gradeBounds: "phân số dương, tử không vượt mẫu", forbidden: ["phân số âm", "mẫu bằng 0"] },
    difficultyPolicy: { EASY: "đọc mô hình phần bằng nhau", MEDIUM: "viết phân số từ mô tả", HARD: "chọn mô hình tương ứng sau biến đổi biểu diễn" },
    interactionPolicy: ["FRACTION_INPUT", "CONSTRUCTION_OR_VISUAL_SELECTION"],
    solverId: "PART_WHOLE_SOLVER_V2",
    validatorId: "NORMALIZED_FRACTION_VALIDATOR_V2",
    visualContract: "FRACTION_MODEL đúng số phần và phần được chọn",
    feedbackStrategy: "tử số đếm phần chọn, mẫu số đếm tổng phần bằng nhau",
  },
  {
    outcomeId: "MOET2018-G9-NAA-P072-010",
    outcomeTitle: "Giải được hệ hai phương trình bậc nhất hai ẩn.",
    grade: 9,
    unitId: "grade-9-linear-systems",
    productFamilyId: "ALGEBRA",
    variantId: "LINEAR_SYSTEM",
    parameterPolicy: { gradeBounds: "hệ 2x2 có nghiệm nguyên duy nhất", forbidden: ["hệ vô nghiệm", "hệ vô số nghiệm"] },
    difficultyPolicy: { EASY: "một hệ số bằng 1", MEDIUM: "khử một ẩn trong một bước", HARD: "hai hệ số khác 1, cần biến đổi" },
    interactionPolicy: ["MATCHING", "INTEGER_INPUT"],
    solverId: "LINEAR_SYSTEM_SOLVER_V2",
    validatorId: "DETERMINANT_NONZERO_VALIDATOR_V2",
    visualContract: "không cần visual làm bằng chứng",
    feedbackStrategy: "thế nghiệm vào cả hai phương trình",
  },
  {
    outcomeId: "MOET2018-G3-GEO-P031-004",
    outcomeTitle: "Nhận biết đỉnh, cạnh, góc của hình chữ nhật, hình vuông; tâm, bán kính, đường kính của hình tròn.",
    grade: 3,
    unitId: "grade-3-polygon-properties",
    productFamilyId: "GEOMETRY",
    variantId: "GEOMETRY_PROPERTIES",
    parameterPolicy: { gradeBounds: "thuộc tính hình cơ bản lớp 3", forbidden: ["suy luận định lí", "tỉ lệ hình làm dữ kiện"] },
    difficultyPolicy: { EASY: "nhận biết một thuộc tính", MEDIUM: "chọn nhiều thuộc tính đúng", HARD: "phân biệt bán kính và đường kính trong hình có nhãn" },
    interactionPolicy: ["MULTI_SELECT", "CONSTRUCTION_OR_VISUAL_SELECTION"],
    solverId: "SHAPE_PROPERTY_SOLVER_V2",
    validatorId: "GEOMETRY_VISUAL_CONSISTENCY_V2",
    visualContract: "SHAPE_DIAGRAM có điểm và đoạn khớp dữ kiện",
    feedbackStrategy: "đối chiếu từng thuộc tính với định nghĩa",
  },
  {
    outcomeId: "MOET2018-G5-GEO-P044-013",
    outcomeTitle: "Chuyển đổi số đo thể tích và số đo thời gian.",
    grade: 5,
    unitId: "grade-5-measurement-practice-p1",
    productFamilyId: "MEASUREMENT",
    variantId: "UNIT_CONVERSION",
    parameterPolicy: { gradeBounds: "cm³, dm³, m³; giây, phút, giờ", forbidden: ["đổi đơn vị khác đại lượng", "hệ số sai"] },
    difficultyPolicy: { EASY: "một bước đơn vị liền kề", MEDIUM: "đổi qua hai bậc", HARD: "số đo hỗn hợp hoặc thập phân" },
    interactionPolicy: ["INTEGER_INPUT", "DECIMAL_INPUT"],
    solverId: "UNIT_DIMENSION_SOLVER_V2",
    validatorId: "UNIT_DIMENSION_VALIDATOR_V2",
    visualContract: "MEASUREMENT_MODEL ghi đủ đơn vị nguồn và đích",
    feedbackStrategy: "nêu quan hệ đơn vị trước khi tính",
  },
  {
    outcomeId: "MOET2018-G6-GEO-P051-003",
    outcomeTitle: "Giải quyết vấn đề thực tiễn về chu vi và diện tích hình đặc biệt.",
    grade: 6,
    unitId: "grade-6-area-measurement",
    productFamilyId: "GEOMETRY_MEASUREMENT",
    variantId: "PERIMETER_AREA",
    parameterPolicy: { gradeBounds: "hình chữ nhật hoặc hình ghép chữ L", forbidden: ["thiếu kích thước", "nhầm đơn vị độ dài/diện tích"] },
    difficultyPolicy: { EASY: "hình chữ nhật một công thức", MEDIUM: "chọn chu vi hay diện tích từ ngữ cảnh", HARD: "hình ghép chữ L hai bước" },
    interactionPolicy: ["INTEGER_INPUT", "SINGLE_CHOICE"],
    solverId: "POLYGON_MEASURE_SOLVER_V2",
    validatorId: "POLYGON_VISUAL_VALIDATOR_V2",
    visualContract: "AREA_MODEL có nhãn cạnh khớp model",
    feedbackStrategy: "phân biệt đường bao quanh và phần mặt phủ",
  },
  {
    outcomeId: "MOET2018-G7-STA-P061-001",
    outcomeTitle: "Đọc và mô tả dữ liệu từ biểu đồ hình quạt tròn và biểu đồ đoạn thẳng.",
    grade: 7,
    unitId: "grade-7-data-and-probability",
    productFamilyId: "STATISTICS",
    variantId: "CHART_DATA_INTERPRETATION",
    parameterPolicy: { gradeBounds: "biểu đồ đường hoặc quạt tròn với tổng nhất quán", forbidden: ["nhãn thiếu", "thang đo sai"] },
    difficultyPolicy: { EASY: "đọc một điểm", MEDIUM: "so sánh hai mốc", HARD: "tổng hợp xu hướng hoặc phần trăm" },
    interactionPolicy: ["TABLE_OR_CHART_RESPONSE", "SINGLE_CHOICE"],
    solverId: "CHART_QUERY_SOLVER_V2",
    validatorId: "CHART_DATASET_VALIDATOR_V2",
    visualContract: "BAR_CHART/line data dùng chung dataset với solver",
    feedbackStrategy: "đọc nhãn, thang đo rồi thực hiện phép tính",
  },
  {
    outcomeId: "MOET2018-G8-STA-P069-011",
    outcomeTitle: "Liên hệ xác suất thực nghiệm với xác suất của biến cố.",
    grade: 8,
    unitId: "grade-8-data-and-probability",
    productFamilyId: "PROBABILITY",
    variantId: "EXPERIMENTAL_PROBABILITY",
    parameterPolicy: { gradeBounds: "tần số thuận lợi không vượt tổng phép thử", forbidden: ["tổng bằng 0", "dữ liệu không khớp"] },
    difficultyPolicy: { EASY: "một biến cố, phân số tối giản", MEDIUM: "so sánh hai thực nghiệm", HARD: "gộp hai bảng rồi đánh giá" },
    interactionPolicy: ["FRACTION_INPUT"],
    solverId: "EXPERIMENTAL_PROBABILITY_SOLVER_V2",
    validatorId: "EXPERIMENT_COUNTS_VALIDATOR_V2",
    visualContract: "EXPERIMENT_TABLE tổng hàng khớp tổng phép thử",
    feedbackStrategy: "số lần thuận lợi chia tổng số lần thử",
  },
  {
    outcomeId: "MOET2018-G3-NUM-P030-013",
    outcomeTitle: "Giải bài toán thực tiễn có đến hai bước tính và quan hệ so sánh đơn giản.",
    grade: 3,
    unitId: "grade-3-applied-problem-solving",
    productFamilyId: "APPLIED_MATHEMATICS",
    variantId: "APPLIED_TWO_STEP",
    parameterPolicy: { gradeBounds: "số tự nhiên phù hợp lớp 3, tối đa hai bước", forbidden: ["dữ kiện thừa không phân biệt được", "kết quả âm"] },
    difficultyPolicy: { EASY: "một bước", MEDIUM: "hai bước trực tiếp", HARD: "hai bước với quan hệ hơn/kém và một dữ kiện không cần" },
    interactionPolicy: ["INTEGER_INPUT", "SINGLE_CHOICE"],
    solverId: "WORD_PROBLEM_MODEL_SOLVER_V2",
    validatorId: "WORD_PROBLEM_SUFFICIENCY_VALIDATOR_V2",
    visualContract: "visual chỉ dùng khi là dữ kiện thật",
    feedbackStrategy: "giải thích từng đại lượng trung gian",
  },
  {
    outcomeId: "MOET2018-G9-STA-P076-008",
    outcomeTitle: "Phát hiện và lí giải số liệu không chính xác dựa trên mối liên hệ toán học.",
    grade: 9,
    unitId: "grade-9-secondary-sta-p1-14",
    productFamilyId: "MATHEMATICAL_REASONING",
    variantId: "DATA_ERROR_REASONING",
    parameterPolicy: { gradeBounds: "quan hệ tổng, phần trăm hoặc trung bình kiểm chứng được", forbidden: ["nhiều lỗi đồng thời", "kết luận chủ quan"] },
    difficultyPolicy: { EASY: "tổng hàng đơn giản", MEDIUM: "phần trăm không cộng 100%", HARD: "trung bình không nhất quán với dữ liệu" },
    interactionPolicy: ["SINGLE_CHOICE"],
    solverId: "DATA_CONSISTENCY_SOLVER_V2",
    validatorId: "UNIQUE_DATA_ERROR_VALIDATOR_V2",
    visualContract: "DATA_TABLE cùng dataset với rule kiểm tra",
    feedbackStrategy: "chỉ ra phép kiểm tra làm lộ sai lệch",
  },
] as const satisfies readonly ProductVariantRegistryEntry[];

const BY_OUTCOME = new Map<string, ProductVariantRegistryEntry>(
  PRODUCT_VARIANT_REGISTRY.map((item) => [item.outcomeId, item]),
);

export const WAVE_A_PRODUCT_REGISTRY = WAVE_A_OUTCOME_CONTRACTS
  .filter(isWaveAImplementedByNewEngine)
  .map((contract): ProductVariantRegistryEntry => ({
    outcomeId: contract.outcomeId,
    outcomeTitle: contract.measurableIntent,
    grade: contract.grade,
    unitId: contract.unitId,
    productFamilyId: contract.productFamilyId,
    variantId: contract.canonicalVariantId,
    parameterPolicy: {
      gradeBounds: `${contract.parameterBounds.minimum}..${contract.parameterBounds.maximum}; steps<=${contract.parameterBounds.maxSteps}`,
      forbidden: ["out-of-grade parameters", "undefined answer", "generic fallback"],
    },
    difficultyPolicy: contract.difficultyPolicy,
    interactionPolicy: contract.interactionPolicy,
    solverId: contract.independentSolver,
    validatorId: contract.independentValidator,
    visualContract: contract.visualPolicy,
    feedbackStrategy: contract.feedbackPolicy,
  }));

const WAVE_A_BY_OUTCOME = new Map<string, ProductVariantRegistryEntry>(
  WAVE_A_PRODUCT_REGISTRY.map((item) => [item.outcomeId, item]),
);

export const WAVE_B_PRODUCT_REGISTRY = WAVE_B_OUTCOME_CONTRACTS
  .filter(isWaveBImplementedByNewEngine)
  .map((contract): ProductVariantRegistryEntry => ({
    outcomeId: contract.outcomeId,
    outcomeTitle: contract.measurableIntent,
    grade: contract.grade,
    unitId: contract.unitId,
    productFamilyId: contract.productFamilyId,
    variantId: contract.canonicalVariantId,
    parameterPolicy: {
      gradeBounds: `${contract.parameterBounds.minimum}..${contract.parameterBounds.maximum}; steps<=${contract.parameterBounds.maxSteps}; decimals<=${contract.parameterBounds.maxDecimalPlaces}; denominator<=${contract.parameterBounds.maxDenominator}`,
      forbidden: ["zero denominator", "uncontrolled floating-point equality", "out-of-grade parameters", "generic fallback"],
    },
    difficultyPolicy: contract.difficultyPolicy,
    interactionPolicy: contract.interactionPolicy,
    solverId: contract.independentSolver,
    validatorId: contract.independentValidator,
    visualContract: contract.visualPolicy,
    feedbackStrategy: contract.feedbackPolicy,
  }));

const WAVE_B_BY_OUTCOME = new Map<string, ProductVariantRegistryEntry>(
  WAVE_B_PRODUCT_REGISTRY.map((item) => [item.outcomeId, item]),
);

export const WAVE_C_PRODUCT_REGISTRY = WAVE_C_OUTCOME_CONTRACTS
  .filter(isWaveCImplementedByNewEngine)
  .map((contract): ProductVariantRegistryEntry => ({
    outcomeId: contract.outcomeId,
    outcomeTitle: contract.measurableIntent,
    grade: contract.grade,
    unitId: contract.unitId,
    productFamilyId: contract.productFamilyId,
    variantId: contract.canonicalVariantId,
    parameterPolicy: {
      gradeBounds: `${contract.parameterBounds.minimum}..${contract.parameterBounds.maximum}; steps<=${contract.parameterBounds.maxSteps}; decimals<=${contract.parameterBounds.maxDecimalPlaces}; denominator<=${contract.parameterBounds.maxDenominator}; exact=${contract.parameterBounds.exactArithmetic}`,
      forbidden: ["zero denominator", "floating-point equality for exact answers", "out-of-grade parameters", "generic fallback", "runtime LLM answer"],
    },
    difficultyPolicy: contract.difficultyPolicy,
    interactionPolicy: contract.interactionPolicy,
    solverId: contract.independentSolver,
    validatorId: contract.independentValidator,
    visualContract: contract.visualPolicy,
    feedbackStrategy: contract.feedbackPolicy,
  }));

const WAVE_C_BY_OUTCOME = new Map<string, ProductVariantRegistryEntry>(
  WAVE_C_PRODUCT_REGISTRY.map((item) => [item.outcomeId, item]),
);

export const WAVE_D_PRODUCT_REGISTRY = WAVE_D_OUTCOME_CONTRACTS
  .filter(isWaveDImplementedByNewEngine)
  .map((contract): ProductVariantRegistryEntry => ({
    outcomeId: contract.outcomeId,
    outcomeTitle: contract.measurableIntent,
    grade: contract.grade,
    unitId: contract.unitId,
    productFamilyId: contract.productFamilyId,
    variantId: contract.canonicalVariantId,
    parameterPolicy: {
      gradeBounds: `${contract.parameterBounds.minimum}..${contract.parameterBounds.maximum}; steps<=${contract.parameterBounds.maxSteps}; decimals<=${contract.parameterBounds.maxDecimalPlaces}; exact=${contract.parameterBounds.exactArithmetic}`,
      forbidden: ["invalid dimensions", "unit mismatch", "floating-point equality for exact answers", "out-of-grade parameters", "generic fallback", "runtime LLM answer"],
    },
    difficultyPolicy: contract.difficultyPolicy,
    interactionPolicy: contract.interactionPolicy,
    solverId: contract.independentSolver,
    validatorId: contract.independentValidator,
    visualContract: contract.visualPolicy,
    feedbackStrategy: contract.feedbackPolicy,
  }));

const WAVE_D_BY_OUTCOME = new Map<string, ProductVariantRegistryEntry>(
  WAVE_D_PRODUCT_REGISTRY.map((item) => [item.outcomeId, item]),
);

export const WAVE_E_PRODUCT_REGISTRY = WAVE_E_OUTCOME_CONTRACTS
  .filter(isWaveEImplementedByNewEngine)
  .map((contract): ProductVariantRegistryEntry => ({
    outcomeId: contract.outcomeId,
    outcomeTitle: contract.measurableIntent,
    grade: contract.grade,
    unitId: contract.unitId,
    productFamilyId: contract.productFamilyId,
    variantId: contract.canonicalVariantId,
    parameterPolicy: {
      gradeBounds: `${contract.parameterBounds.minimum}..${contract.parameterBounds.maximum}; steps<=${contract.parameterBounds.maxSteps}; decimals<=${contract.parameterBounds.maxDecimalPlaces}; exact=${contract.parameterBounds.exactArithmetic}`,
      forbidden: ["ambiguous dataset", "invalid probability domain", "visual/data mismatch", "out-of-grade parameters", "generic fallback", "runtime LLM answer"],
    },
    difficultyPolicy: contract.difficultyPolicy,
    interactionPolicy: contract.interactionPolicy,
    solverId: contract.independentSolver,
    validatorId: contract.independentValidator,
    visualContract: contract.visualPolicy,
    feedbackStrategy: contract.feedbackPolicy,
  }));

const WAVE_E_BY_OUTCOME = new Map<string, ProductVariantRegistryEntry>(
  WAVE_E_PRODUCT_REGISTRY.map((item) => [item.outcomeId, item]),
);

export const WAVE_F_PRODUCT_REGISTRY = WAVE_F_OUTCOME_CONTRACTS
  .filter(isWaveFImplementedByNewEngine)
  .map((contract): ProductVariantRegistryEntry => ({
    outcomeId: contract.outcomeId,
    outcomeTitle: contract.measurableIntent,
    grade: contract.grade,
    unitId: contract.unitId,
    productFamilyId: contract.productFamilyId,
    variantId: contract.canonicalVariantId,
    parameterPolicy: {
      gradeBounds: `${contract.parameterBounds.minimum}..${contract.parameterBounds.maximum}; steps<=${contract.parameterBounds.maxSteps}; decimals<=${contract.parameterBounds.maxDecimalPlaces}; exact=${contract.parameterBounds.exactArithmetic}`,
      forbidden: ["ambiguous answer", "invalid domain or unit", "prompt/visual mismatch", "out-of-grade parameters", "generic fallback", "runtime LLM answer"],
    },
    difficultyPolicy: contract.difficultyPolicy,
    interactionPolicy: contract.interactionPolicy,
    solverId: contract.independentSolver,
    validatorId: contract.independentValidator,
    visualContract: contract.visualPolicy,
    feedbackStrategy: contract.feedbackPolicy,
  }));

const WAVE_F_BY_OUTCOME = new Map<string, ProductVariantRegistryEntry>(
  WAVE_F_PRODUCT_REGISTRY.map((item) => [item.outcomeId, item]),
);

export const GENERATOR_V2_OUTCOME_REGISTRY = [
  ...PRODUCT_VARIANT_REGISTRY,
  ...WAVE_A_PRODUCT_REGISTRY,
  ...WAVE_B_PRODUCT_REGISTRY,
  ...WAVE_C_PRODUCT_REGISTRY,
  ...WAVE_D_PRODUCT_REGISTRY,
  ...WAVE_E_PRODUCT_REGISTRY,
  ...WAVE_F_PRODUCT_REGISTRY,
] as const;

export function getProductVariantByOutcome(outcomeId: string) {
  return BY_OUTCOME.get(outcomeId) ?? WAVE_A_BY_OUTCOME.get(outcomeId) ?? WAVE_B_BY_OUTCOME.get(outcomeId) ?? WAVE_C_BY_OUTCOME.get(outcomeId) ?? WAVE_D_BY_OUTCOME.get(outcomeId) ?? WAVE_E_BY_OUTCOME.get(outcomeId) ?? WAVE_F_BY_OUTCOME.get(outcomeId);
}
