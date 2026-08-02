import { createHash } from "node:crypto";

import type {
  CanonicalResponse,
  FractionValue,
  GenerateQuestionInput,
  GeneratedProductQuestion,
  MatchingPair,
  MisconceptionCode,
  ProductInteractionContract,
  ProductVisual,
  PublicOption,
} from "./types.ts";
import {
  DIFFICULTY_POLICY_VERSION,
  GENERATOR_V2_VERSION,
  GenerationV2Error,
  SOLVER_VERSION,
  VARIANT_VERSION,
} from "./types.ts";
import { WAVE_D_CAPABILITY_METADATA } from "./wave-d-capability-metadata.ts";
import { WAVE_D_ENGINE_VERSION, type WaveDOutcomeContract } from "./wave-d-contracts.ts";

type JsonValue = string | number | boolean | null | readonly JsonValue[] | Readonly<{ [key: string]: JsonValue }>;

export type WaveDNormalizedProblemModel = Readonly<{
  schemaVersion: 1;
  engineVersion: typeof WAVE_D_ENGINE_VERSION;
  outcomeId: string;
  variantId: WaveDOutcomeContract["canonicalVariantId"];
  profile: WaveDOutcomeContract["profile"];
  grade: number;
  difficulty: GenerateQuestionInput["difficulty"];
  structureLevel: 1 | 2 | 3;
  structuralFingerprint: string;
  templateIndex: number;
  contextIndex: number;
  representationIndex: number;
  collaboratorIndex: number;
  interactionType: ProductInteractionContract["type"];
  operation: string;
  values: readonly number[];
  labels: readonly string[];
  scale: number;
  meta: Readonly<Record<string, JsonValue>>;
}>;

type SemanticSolution = Readonly<{
  answer: CanonicalResponse;
  distractors: readonly string[];
  steps: readonly string[];
  nextStep: string;
}>;
type WaveDSolution = Readonly<{
  correct: CanonicalResponse;
  accepted: readonly CanonicalResponse[];
  steps: readonly string[];
  nextStep: string;
  options?: readonly PublicOption[];
  leftItems?: readonly PublicOption[];
  rightItems?: readonly PublicOption[];
  optionMisconceptions?: Readonly<Record<string, MisconceptionCode>>;
}>;

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const gcd = (a: number, b: number): number => b === 0 ? Math.abs(a) : gcd(b, a % b);
const reduce = (numerator: number, denominator: number): FractionValue => {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator === 0) throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);
  return { numerator: sign * numerator / divisor, denominator: sign * denominator / divisor };
};
const rounded = (value: number, places = 2) => {
  const factor = 10 ** places;
  // Generated operands are bounded integers/decimal constants. The small
  // tolerance removes IEEE-754 representation drift at an exact decimal tie
  // (for example 7.065 represented just below the midpoint) without changing
  // any value at the requested precision.
  return Math.round((value + 1e-10) * factor) / factor;
};
const display = (value: CanonicalResponse): string => {
  if (typeof value === "number") return String(value).replace(".", ",");
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) {
    const fraction = value as FractionValue;
    return `${fraction.numerator}/${fraction.denominator}`;
  }
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === "string")) return value.join(" → ");
    return value.map((pair) => `${pair.leftId}=${pair.rightId}`).join("; ");
  }
  throw new GenerationV2Error("SOLVER_FAILED");
};
const normalize = (value: CanonicalResponse): string => {
  if (typeof value === "number") return String(rounded(value, 8));
  if (typeof value === "string") return value.trim().toLocaleLowerCase("vi").replaceAll("−", "-").replaceAll(",", ".").replace(/\s+/gu, "");
  if (Array.isArray(value)) return JSON.stringify(value);
  const fraction = value as FractionValue;
  return `${reduce(fraction.numerator, fraction.denominator).numerator}/${reduce(fraction.numerator, fraction.denominator).denominator}`;
};

class Random {
  private cursor = 0;
  private readonly seed: string;
  constructor(seed: string) { this.seed = seed; }
  int(minimum: number, maximum: number) {
    if (maximum < minimum) throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
    const bytes = createHash("sha256").update(`${this.seed}:${this.cursor++}`).digest();
    return minimum + bytes.readUInt32BE(0) % (maximum - minimum + 1);
  }
  pick<T>(items: readonly T[]): T { return items[this.int(0, items.length - 1)]!; }
  shuffle<T>(items: readonly T[]): T[] { return [...items].map((item) => ({ item, key: this.int(0, 1_000_000) })).sort((a, b) => a.key - b.key).map(({ item }) => item); }
}

const STRUCTURE = { EASY: 1, MEDIUM: 2, HARD: 3 } as const;
const LEADS = [
  "Đọc kĩ yêu cầu", "Xác định dữ kiện cần dùng", "Kiểm tra từng điều kiện", "Hoàn thành phiếu thực hành", "Giúp nhóm học tập", "Chọn quan hệ phù hợp", "Tính theo đúng đơn vị", "Đọc kĩ các nhãn", "Suy luận từng bước", "Đối chiếu hai biểu diễn", "Xác định đại lượng cần tìm", "Kiểm tra bằng định nghĩa", "Dùng quy tắc thích hợp", "Tìm giá trị còn thiếu", "Đánh giá từng phương án", "Chọn bằng chứng trực tiếp", "Hoàn thành thử thách", "Kiểm tra kết quả ngược", "Nêu kết luận từ dữ kiện", "Giải thích cách làm", "So sánh trước khi chọn", "Sắp xếp dữ kiện", "Xác minh trên bảng", "Đọc đúng thông tin", "Tách bài toán thành từng bước", "Chọn cách làm hợp lí", "Kiểm tra miền giá trị", "Chuẩn hóa kết quả", "Phân tích sai lầm thường gặp", "Kết nối dữ kiện và câu hỏi", "Giúp bạn học kiểm tra", "Hoàn thiện lời giải",
] as const;
const CONTEXTS = [
  "hoạt động trên lớp", "bài tập của nhóm", "phiếu học tập", "lượt thực hành", "buổi ôn tập", "câu lạc bộ Toán", "nhiệm vụ hôm nay", "bảng kế hoạch học", "trò chơi học tập", "giờ luyện tập", "bài kiểm tra nhanh", "bàn học nhóm", "góc tự học", "ngày hội Toán", "bộ bài tập", "dự án của lớp", "bảng theo dõi", "giờ học chiều", "khu trải nghiệm", "sổ ghi chép", "hộp thẻ học", "phần trình bày", "phiếu khảo sát", "bản nháp của nhóm", "bài toán minh họa", "lượt thử sức", "buổi thực hành", "bảng thi đua", "chuyến tham quan", "hoạt động vận dụng", "góc sáng tạo", "phần tự kiểm tra",
] as const;
const REPRESENTATIONS = ["phiếu dữ kiện", "bảng con", "thẻ học tập", "ghi chú đã cho", "sơ đồ trên bảng", "bản nháp", "bảng kiểm", "mảnh ghép thông tin", "trang sổ tay", "bản trình bày", "bảng dữ kiện", "bộ thẻ học", "tờ hướng dẫn", "bảng thực hành", "phần ghi chép của nhóm", "bảng minh họa"] as const;
const COLLABORATORS = ["An", "Bình", "Chi", "Dũng", "Giang", "Hà", "Khang", "Lan", "Minh", "Nam", "Ngọc", "Phương", "Quân", "Thảo", "Trang", "Vy"] as const;

const CIRCLE_INSCRIBED_OPERATION_BY_OUTCOME: Readonly<Record<string, string>> = {
  "MOET2018-G9-GEO-P075-022": "CIRCUMCENTER_DEFINITION",
  "MOET2018-G9-GEO-P075-023": "INCENTER_DEFINITION",
  "MOET2018-G9-GEO-P075-025": "CYCLIC_QUADRILATERAL_ANGLE",
  "MOET2018-G9-GEO-P075-027": "RECTANGLE_CIRCUMRADIUS",
  "MOET2018-G9-GEO-P075-028": "RIGHT_TRIANGLE_CIRCUMRADIUS",
  "MOET2018-G9-GEO-P075-029": "EQUILATERAL_INRADIUS",
};
const CIRCLE_RELATION_OPERATION_BY_OUTCOME: Readonly<Record<string, string>> = {
  "MOET2018-G9-GEO-P074-009": "TANGENT_PROPERTY",
  "MOET2018-G9-GEO-P074-012": "LINE_CIRCLE_POSITION",
  "MOET2018-G9-GEO-P074-013": "TWO_CIRCLES_POSITION",
  "MOET2018-G9-GEO-P074-015": "CIRCLE_SYMMETRY",
  "MOET2018-G9-GEO-P074-017": "CHORD_DIAMETER_COMPARE",
};
const TIME_OPERATION_BY_OUTCOME: Readonly<Record<string, string>> = {
  "MOET2018-G1-GEO-P023-006": "READ_CLOCK",
  "MOET2018-G1-GEO-P023-009": "READ_CLOCK",
  "MOET2018-G1-GEO-P023-010": "WEEKDAY_SEQUENCE",
  "MOET2018-G1-GEO-P023-014": "READ_CLOCK",
  "MOET2018-G1-GEO-P023-015": "WEEKDAY_OFFSET",
  "MOET2018-G1-EXP-P024-003": "READ_CLOCK",
  "MOET2018-G2-GEO-P027-010": "READ_CLOCK",
  "MOET2018-G2-GEO-P027-013": "HOUR_DAY_RELATION",
  "MOET2018-G2-GEO-P027-014": "MONTH_DAYS",
  "MOET2018-G3-GEO-P032-011": "READ_CLOCK",
  "MOET2018-G3-GEO-P032-019": "MONTH_SEQUENCE",
  "MOET2018-G4-GEO-P038-009": "CENTURY_RELATION",
};
const TRIANGLE_PROPERTY_OPERATION_BY_OUTCOME: Readonly<Record<string, string>> = {
  "MOET2018-G7-GEO-P059-007": "TRIANGLE_ANGLE_SUM",
  "MOET2018-G7-GEO-P059-011": "ISOSCELES_BASE_ANGLE",
  "MOET2018-G7-GEO-P059-016": "POINT_LINE_DISTANCE",
  "MOET2018-G7-GEO-P059-017": "TRIANGLE_INEQUALITY",
};
const SPECIAL_LINE_BY_OUTCOME: Readonly<Record<string, string>> = {
  "MOET2018-G5-GEO-P043-006": "ALTITUDE",
  "MOET2018-G7-GEO-P059-014": "ANGLE_BISECTOR_CONSTRUCTION",
  "MOET2018-G7-GEO-P059-018": "ANGLE_BISECTOR",
  "MOET2018-G7-GEO-P060-022": "PERPENDICULAR_BISECTOR",
  "MOET2018-G7-GEO-P060-025": "SOFTWARE_CONSTRUCTION",
  "MOET2018-G8-GEO-P067-023": "INTERNAL_ANGLE_BISECTOR_THEOREM",
};
const CONSTRUCTION_KIND_BY_OUTCOME: Readonly<Record<string, string>> = {
  "MOET2018-G1-GEO-P023-007": "SHAPE_ASSEMBLY",
  "MOET2018-G2-GEO-P026-006": "FOLD_CUT_ASSEMBLY",
  "MOET2018-G3-GEO-P031-001": "DECORATIVE_ASSEMBLY",
  "MOET2018-G3-GEO-P031-007": "CIRCLE_WITH_COMPASS",
  "MOET2018-G3-GEO-P031-008": "RIGHT_ANGLE_AND_CIRCLE",
  "MOET2018-G4-GEO-P037-001": "APPLIED_SHAPE_CONSTRUCTION",
  "MOET2018-G4-GEO-P037-005": "SHAPE_CONSTRUCTION",
  "MOET2018-G5-GEO-P043-001": "APPLIED_SHAPE_CONSTRUCTION",
  "MOET2018-G6-EXP-P055-003": "SYMMETRY_FOLD",
  "MOET2018-G7-EXP-P062-003": "ANGLE_BISECTOR_PARALLEL_PRISM",
  "MOET2018-G7-GEO-P060-024": "SOFTWARE_GEOMETRY",
  "MOET2018-G8-EXP-P070-007": "PYRAMID_PERSPECTIVE",
  "MOET2018-G8-GEO-P068-001": "SOFTWARE_GEOMETRY",
  "MOET2018-G8-GEO-P068-002": "SIMILARITY_DRAWING",
  "MOET2018-G9-GEO-P076-006": "SOFTWARE_GEOMETRY",
  "MOET2018-G9-GEO-P076-007": "CIRCLE_TRIANGLE_POLYGON_DRAWING",
};
const CONSTRUCTION_LABELS: Readonly<Record<string, string>> = {
  SHAPE_ASSEMBLY: "lắp ghép các hình phẳng đơn giản", FOLD_CUT_ASSEMBLY: "gấp, cắt và ghép hình", DECORATIVE_ASSEMBLY: "ghép hình trang trí", CIRCLE_WITH_COMPASS: "vẽ đường tròn bằng compa", RIGHT_ANGLE_AND_CIRCLE: "vẽ góc vuông và đường tròn", APPLIED_SHAPE_CONSTRUCTION: "đo, vẽ và lắp ghép hình", SHAPE_CONSTRUCTION: "tạo lập hình đã học", SYMMETRY_FOLD: "gấp giấy tạo hình đối xứng", ANGLE_BISECTOR_PARALLEL_PRISM: "tạo hình có phân giác, đường song song hoặc lăng trụ", SOFTWARE_GEOMETRY: "dùng phần mềm hỗ trợ vẽ hình", PYRAMID_PERSPECTIVE: "tạo phối cảnh hình chóp", SIMILARITY_DRAWING: "vẽ hình đồng dạng", CIRCLE_TRIANGLE_POLYGON_DRAWING: "vẽ đường tròn, tam giác vuông hoặc đa giác đều",
};
const PAYMENT_SCENARIOS = [
  { prompt: "Thanh toán một đơn hàng trực tuyến trên trang chính thức", answer: "thẻ hoặc ví điện tử có xác thực" },
  { prompt: "Mua một món đồ giá trị nhỏ tại quầy chỉ nhận tiền mặt", answer: "tiền mặt" },
  { prompt: "Thanh toán hoá đơn điện hằng tháng cần lưu lại chứng từ", answer: "chuyển khoản ngân hàng" },
  { prompt: "Đặt vé tàu trên ứng dụng và cần xác nhận ngay", answer: "thẻ hoặc ví điện tử có xác thực" },
  { prompt: "Nộp khoản phí vào tài khoản chính thức của nhà trường", answer: "chuyển khoản ngân hàng" },
  { prompt: "Mua hàng tại cửa hàng có máy quẹt thẻ và không muốn mang nhiều tiền", answer: "thẻ ngân hàng" },
  { prompt: "Trả tiền tại chợ nhỏ không có thiết bị thanh toán điện tử", answer: "tiền mặt" },
  { prompt: "Chuyển tiền cho người thân qua tài khoản đã kiểm tra đúng tên", answer: "chuyển khoản ngân hàng" },
] as const;
const OPERATION_LABELS: Readonly<Record<string, string>> = {
  SELECT_MEASURE: "chọn số đo phù hợp", COMBINE_MEASURES: "kết hợp hai số đo", CONVERT_AND_COMBINE: "đổi đơn vị rồi kết hợp",
  RECTANGLE_AREA: "diện tích hình chữ nhật", TRIANGLE_AREA: "diện tích tam giác", TRAPEZOID_AREA: "diện tích hình thang",
  INCENTER_DEFINITION: "tâm đường tròn nội tiếp", CIRCUMCENTER_DEFINITION: "tâm đường tròn ngoại tiếp", CYCLIC_QUADRILATERAL_ANGLE: "góc đối của tứ giác nội tiếp", RECTANGLE_CIRCUMRADIUS: "bán kính ngoại tiếp hình chữ nhật", RIGHT_TRIANGLE_CIRCUMRADIUS: "bán kính ngoại tiếp tam giác vuông", EQUILATERAL_INRADIUS: "bán kính nội tiếp tam giác đều",
  CIRCUMFERENCE: "chu vi đường tròn", CIRCLE_AREA: "diện tích hình tròn", ARC_LENGTH: "độ dài cung", SECTOR_AREA: "diện tích quạt tròn", ANNULUS_AREA: "diện tích vành khuyên",
  DENOMINATION: "nhận biết mệnh giá", CHANGE: "tính tiền thừa", BALANCE: "tính số dư", SIMPLE_INTEREST: "tính tiền lãi đơn giản",
  SINE_RATIO: "tỉ số sin", COSINE_RATIO: "tỉ số côsin", FIND_SIDE_BY_RATIO: "tìm cạnh bằng hệ thức lượng",
  VOLUME: "thể tích", SURFACE_MEASURE: "diện tích bề mặt",
  READ_CLOCK: "đọc giờ", WEEKDAY_SEQUENCE: "thứ tự ngày trong tuần", WEEKDAY_OFFSET: "xác định ngày sau một khoảng", MONTH_DAYS: "số ngày trong tháng", MONTH_SEQUENCE: "thứ tự tháng", HOUR_DAY_RELATION: "đổi ngày, giờ và phút", CENTURY_RELATION: "đổi thế kỉ sang năm",
  TRIANGLE_ANGLE_SUM: "tổng ba góc của tam giác", TRIANGLE_INEQUALITY: "quan hệ ba cạnh của tam giác", ISOSCELES_BASE_ANGLE: "góc đáy tam giác cân", POINT_LINE_DISTANCE: "khoảng cách từ điểm đến đường thẳng",
  TEST_POLYNOMIAL_ROOT: "kiểm tra nghiệm của đa thức", EVALUATE_POLYNOMIAL: "tính giá trị đa thức", COMBINE_POLYNOMIALS: "thực hiện phép tính đa thức",
  ADD: "phép cộng", SUBTRACT: "phép trừ", MULTIPLY: "phép nhân", DIVIDE: "phép chia",
  TANGENT_PROPERTY: "tính chất tiếp tuyến", LINE_CIRCLE_POSITION: "vị trí đường thẳng và đường tròn", TWO_CIRCLES_POSITION: "vị trí hai đường tròn", CIRCLE_SYMMETRY: "đối xứng của đường tròn", CHORD_DIAMETER_COMPARE: "so sánh dây và đường kính",
};
const operationLabel = (operation: string) => OPERATION_LABELS[operation] ?? operation.toLocaleLowerCase("vi").replaceAll("_", " ");
const SHAPE_LABELS: Readonly<Record<string, string>> = {
  CIRCLE: "hình tròn", SQUARE: "hình vuông", RECTANGLE: "hình chữ nhật", TRIANGLE: "hình tam giác", QUADRILATERAL: "hình tứ giác",
  TRAPEZOID: "hình thang", PARALLELOGRAM: "hình bình hành", RHOMBUS: "hình thoi", REGULAR_HEXAGON: "hình lục giác đều", ISOSCELES_TRAPEZOID: "hình thang cân",
  ACUTE_TRIANGLE: "tam giác nhọn", RIGHT_TRIANGLE: "tam giác vuông", OBTUSE_TRIANGLE: "tam giác tù", EQUILATERAL_TRIANGLE: "tam giác đều",
  CUBE: "hình lập phương", RECTANGULAR_PRISM: "hình hộp chữ nhật", TRIANGULAR_PRISM: "lăng trụ đứng tam giác", QUADRILATERAL_PRISM: "lăng trụ đứng tứ giác",
  TRIANGULAR_PYRAMID: "hình chóp tam giác", SQUARE_PYRAMID: "hình chóp tứ giác đều", CONE: "hình nón", CYLINDER: "hình trụ", SPHERE: "hình cầu",
};
const shapeLabel = (shape: string) => SHAPE_LABELS[shape] ?? shape.toLocaleLowerCase("vi").replaceAll("_", " ");
const POLYGON_SHAPES_BY_OUTCOME: Readonly<Record<string, readonly string[]>> = {
  "MOET2018-G2-GEO-P026-007": ["QUADRILATERAL"],
  "MOET2018-G3-GEO-P031-006": ["TRIANGLE", "QUADRILATERAL"],
  "MOET2018-G3-GEO-P031-009": ["SQUARE", "RECTANGLE"],
  "MOET2018-G4-GEO-P037-004": ["PARALLELOGRAM", "RHOMBUS"],
  "MOET2018-G5-GEO-P043-007": ["TRAPEZOID", "PARALLELOGRAM", "RHOMBUS"],
  "MOET2018-G6-GEO-P050-001": ["EQUILATERAL_TRIANGLE", "SQUARE", "REGULAR_HEXAGON"],
  "MOET2018-G6-GEO-P050-002": ["EQUILATERAL_TRIANGLE", "SQUARE", "REGULAR_HEXAGON"],
  "MOET2018-G6-GEO-P051-004": ["RECTANGLE", "RHOMBUS", "PARALLELOGRAM", "ISOSCELES_TRAPEZOID"],
  "MOET2018-G6-GEO-P051-011": ["REGULAR_HEXAGON"],
  "MOET2018-G8-GEO-P066-008": ["QUADRILATERAL"],
  "MOET2018-G8-GEO-P066-009": ["PARALLELOGRAM"],
  "MOET2018-G8-GEO-P066-010": ["RHOMBUS"],
  "MOET2018-G8-GEO-P066-011": ["ISOSCELES_TRAPEZOID"],
  "MOET2018-G8-GEO-P066-012": ["RECTANGLE"],
  "MOET2018-G8-GEO-P066-013": ["SQUARE"],
  "MOET2018-G8-GEO-P066-014": ["QUADRILATERAL"],
  "MOET2018-G8-GEO-P066-015": ["RECTANGLE"],
  "MOET2018-G8-GEO-P066-016": ["RHOMBUS"],
  "MOET2018-G8-GEO-P066-017": ["ISOSCELES_TRAPEZOID"],
  "MOET2018-G8-GEO-P066-018": ["PARALLELOGRAM"],
};
const POLYGON_CONSTRUCTION_OUTCOMES = new Set(["MOET2018-G3-GEO-P031-009", "MOET2018-G5-GEO-P043-007"]);
const POLYGON_SUFFICIENT_CONDITION: Readonly<Record<string, string>> = {
  "MOET2018-G8-GEO-P066-015": "hình bình hành có hai đường chéo bằng nhau",
  "MOET2018-G8-GEO-P066-016": "hình bình hành có hai đường chéo vuông góc",
  "MOET2018-G8-GEO-P066-017": "hình thang có hai đường chéo bằng nhau",
  "MOET2018-G8-GEO-P066-018": "tứ giác có hai đường chéo cắt nhau tại trung điểm mỗi đường",
};

function chooseInteraction(contract: WaveDOutcomeContract, input: GenerateQuestionInput) {
  if (input.interactionType && !contract.interactionPolicy.includes(input.interactionType)) throw new GenerationV2Error("INTERACTION_UNSUPPORTED");
  if (input.interactionType) return input.interactionType;
  if (input.difficulty !== "HARD" || contract.interactionPolicy.length === 1) return contract.interactionPolicy[0]!;
  const harderChoice = 1 + Number.parseInt(hash(input.seed).slice(0, 2), 16) % (contract.interactionPolicy.length - 1);
  return contract.interactionPolicy[harderChoice]!;
}

function makeModel(contract: WaveDOutcomeContract, input: GenerateQuestionInput, random: Random, data: Readonly<{
  operation: string;
  values?: readonly number[];
  labels?: readonly string[];
  scale?: number;
  meta?: Readonly<Record<string, JsonValue>>;
  fingerprint: string;
}>): WaveDNormalizedProblemModel {
  return {
    schemaVersion: 1,
    engineVersion: WAVE_D_ENGINE_VERSION,
    outcomeId: contract.outcomeId,
    variantId: contract.canonicalVariantId,
    profile: contract.profile,
    grade: contract.grade,
    difficulty: input.difficulty,
    structureLevel: STRUCTURE[input.difficulty],
    structuralFingerprint: `${contract.canonicalVariantId}:${data.fingerprint}:structure-${STRUCTURE[input.difficulty]}`,
    templateIndex: random.int(0, LEADS.length - 1),
    contextIndex: random.int(0, CONTEXTS.length - 1),
    representationIndex: random.int(0, REPRESENTATIONS.length - 1),
    collaboratorIndex: random.int(0, COLLABORATORS.length - 1),
    interactionType: chooseInteraction(contract, input),
    operation: data.operation,
    values: data.values ?? [],
    labels: data.labels ?? [],
    scale: data.scale ?? 1,
    meta: data.meta ?? {},
  };
}

const shapeNames = ["hình tam giác", "hình chữ nhật", "hình vuông", "hình thang", "hình bình hành", "hình thoi", "hình tròn"] as const;
const angleClasses = (angle: number) => angle < 90 ? "góc nhọn" : angle === 90 ? "góc vuông" : angle < 180 ? "góc tù" : "góc bẹt";

function buildModel(contract: WaveDOutcomeContract, input: GenerateQuestionInput, random: Random): WaveDNormalizedProblemModel {
  const level = STRUCTURE[input.difficulty];
  const cap = contract.canonicalVariantId;
  switch (cap) {
    case "ANGLE_MEASUREMENT": {
      const angle = random.pick([30, 45, 60, 90, 120, 135, 150, 180]);
      return makeModel(contract, input, random, { operation: input.interactionType === "INTEGER_INPUT" || input.difficulty === "HARD" ? "READ_ANGLE" : "CLASSIFY_ANGLE", values: [angle], fingerprint: `angle-${angle}:task-${level}`, meta: { shape: "ANGLE" } });
    }
    case "APPLIED_GEOMETRY_MEASUREMENT": {
      const width = random.int(3, 12 + level * 3); const height = random.int(2, 9 + level * 2);
      return makeModel(contract, input, random, { operation: level === 1 ? "RECTANGLE_PERIMETER" : "RECTANGLE_AREA", values: [width, height], fingerprint: `rectangle:${level}:ratio-${Math.floor(width / height)}`, meta: { shape: "RECTANGLE", unit: "cm" } });
    }
    case "APPLIED_MEASUREMENT_MODEL": {
      const value = random.int(4, 40 + level * 20); const extra = random.int(2, 12); const factor = random.pick([10, 100, 1_000]);
      return makeModel(contract, input, random, { operation: level === 1 ? "SELECT_MEASURE" : level === 2 ? "COMBINE_MEASURES" : "CONVERT_AND_COMBINE", values: [value, extra, factor], scale: factor, fingerprint: `applied-measure:${level}:factor-${factor}`, meta: { unit: factor === 1_000 ? "ml" : "cm", targetUnit: factor === 1_000 ? "l" : "m" } });
    }
    case "APPLIED_RATIONAL_REASONING": {
      const denominator = random.pick([2, 4, 5, 8, 10]); const numerator = random.int(-denominator * level, denominator * level);
      return makeModel(contract, input, random, { operation: "SIGNED_RATIONAL_CHANGE", values: [numerator, denominator, random.int(1, 5)], fingerprint: `rational:${level}:den-${denominator}`, meta: { unit: "m" } });
    }
    case "AREA_PERIMETER": {
      const a = random.int(3, 12 + level * 4); const b = random.int(2, 9 + level * 3); const c = random.int(2, 8);
      const operation = level === 1 ? "RECTANGLE_AREA" : level === 2 ? "TRIANGLE_AREA" : "TRAPEZOID_AREA";
      return makeModel(contract, input, random, { operation, values: operation === "TRAPEZOID_AREA" ? [a, b, c] : [a, b], labels: operation === "RECTANGLE_AREA" ? ["chiều dài", "chiều rộng"] : operation === "TRIANGLE_AREA" ? ["đáy", "chiều cao"] : ["đáy lớn", "chiều cao", "đáy nhỏ"], fingerprint: `${operation}:band-${Math.floor(a / 4)}:orientation-${random.int(0, 3)}`, meta: { shape: operation.replace("_AREA", ""), unit: "cm" } });
    }
    case "CIRCLE_ANGLE_RELATION": {
      const inscribed = random.pick([20, 25, 30, 35, 40, 45, 50, 60]);
      const operation = contract.outcomeId === "MOET2018-G9-GEO-P075-024" ? "IDENTIFY_CIRCLE_ANGLE" : level === 1 ? "CENTRAL_FROM_INSCRIBED" : "INSCRIBED_FROM_ARC";
      return makeModel(contract, input, random, { operation, values: [inscribed, inscribed * 2], fingerprint: `${operation}:band-${Math.floor(inscribed / 10)}`, meta: { shape: "CIRCLE_ANGLES" } });
    }
    case "CIRCLE_INSCRIBED_CIRCUMSCRIBED": {
      const side = random.pick([6, 8, 10, 12, 14, 16]);
      const operation = CIRCLE_INSCRIBED_OPERATION_BY_OUTCOME[contract.outcomeId];
      if (!operation) throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
      return makeModel(contract, input, random, { operation, values: [side, random.int(55, 125)], fingerprint: `${operation}:side-band-${Math.floor(side / 4)}`, meta: { shape: "INSCRIBED_CIRCUMSCRIBED" } });
    }
    case "CIRCLE_MEASURE": {
      const radius = random.int(2, 12 + level * 3); const angle = random.pick([60, 90, 120, 180]); const inner = Math.max(1, radius - random.int(1, Math.min(4, radius - 1)));
      const operation = contract.grade === 5 ? (level === 1 ? "CIRCUMFERENCE" : "CIRCLE_AREA") : level === 1 ? "ARC_LENGTH" : level === 2 ? "SECTOR_AREA" : "ANNULUS_AREA";
      return makeModel(contract, input, random, { operation, values: [radius, angle, inner], scale: 100, fingerprint: `${operation}:radius-band-${Math.floor(radius / 3)}:angle-${angle}`, meta: { shape: "CIRCLE_MEASURE", pi: 3.14, unit: "cm" } });
    }
    case "CIRCLE_RELATION": {
      const r1 = random.int(3, 10); const r2 = random.int(2, 8); const distance = random.pick([Math.abs(r1 - r2), r1 + r2, r1 + r2 + 2]);
      const operation = CIRCLE_RELATION_OPERATION_BY_OUTCOME[contract.outcomeId];
      if (!operation) throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
      return makeModel(contract, input, random, { operation, values: [r1, r2, distance], fingerprint: `${operation}:relation-${distance === r1 + r2 ? "tangent" : distance > r1 + r2 ? "separate" : "intersect"}`, meta: { shape: "CIRCLE_RELATION" } });
    }
    case "COORDINATE_POINT": {
      const x = random.int(-6 - level, 6 + level); const y = random.int(-6 - level, 6 + level);
      return makeModel(contract, input, random, { operation: "ORDERED_PAIR", values: [x, y], labels: ["hoành độ", "tung độ"], fingerprint: `quadrant-${Math.sign(x)}-${Math.sign(y)}:level-${level}`, meta: { graphKind: "POINT" } });
    }
    case "DIRECT_MEASUREMENT_ESTIMATION": {
      const actual = random.int(3, contract.grade <= 2 ? 20 : 80); const unitIndex = random.int(0, 3);
      return makeModel(contract, input, random, { operation: level === 1 ? "READ_SCALE" : "PLAUSIBLE_ESTIMATE", values: [actual, unitIndex, random.int(1, 4)], fingerprint: `measure:${level}:unit-${unitIndex}:band-${Math.floor(actual / 10)}`, meta: { unit: ["cm", "kg", "l", "°C"][unitIndex]!, instrument: ["thước", "cân", "ca đong", "nhiệt kế"][unitIndex]! } });
    }
    case "DIVISION_REMAINDER": {
      const divisor = random.int(2, 12); const quotient = random.int(2, 10 + level * 4); const remainder = random.int(0, divisor - 1); const dividend = divisor * quotient + remainder;
      return makeModel(contract, input, random, { operation: "EUCLIDEAN_DIVISION", values: [dividend, divisor, quotient, remainder], labels: ["thương", "số dư"], fingerprint: `divisor-${divisor}:remainder-${remainder === 0 ? "zero" : "nonzero"}:level-${level}`, meta: {} });
    }
    case "EARLY_ARITHMETIC_APPLICATION": {
      const a = random.int(2, 9); const b = random.int(1, 10 - a); const operation = level === 1 ? "COUNT" : "ADD";
      return makeModel(contract, input, random, { operation, values: [a, b], fingerprint: `${operation}:total-${a + b}:context-${random.int(0, 5)}`, meta: { object: random.pick(["bàn", "cửa sổ", "hộp bút", "chậu cây"]) } });
    }
    case "FUNCTION_MODEL_RECOGNITION": {
      const repeated = level > 1 && random.int(0, 1) === 1; const x = random.int(1, 5); const y1 = random.int(2, 9); const y2 = repeated ? y1 + random.int(1, 4) : y1;
      return makeModel(contract, input, random, { operation: "FUNCTION_TABLE_CHECK", values: [x, y1, repeated ? x : x + 1, y2], fingerprint: `function-${repeated ? "invalid" : "valid"}:level-${level}`, meta: { repeatedInput: repeated } });
    }
    case "GEOMETRIC_CONSTRUCTION_PLAN": {
      const kind = CONSTRUCTION_KIND_BY_OUTCOME[contract.outcomeId];
      if (!kind) throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
      return makeModel(contract, input, random, { operation: "ORDER_CONSTRUCTION", values: [level], labels: ["dữ kiện", "đường chuẩn", "quan hệ", "kiểm tra"], fingerprint: `${kind}:steps-${level + 2}:tool-${random.int(0, 3)}`, meta: { shape: kind, constructionKind: kind, constructionLabel: CONSTRUCTION_LABELS[kind]! } });
    }
    case "GEOMETRIC_PROOF_REASONING": {
      const theorem = random.pick(["VERTICAL_ANGLES", "ISOSCELES_BASE_ANGLES", "PARALLEL_ALTERNATE_ANGLES"] as const);
      return makeModel(contract, input, random, { operation: "ORDER_PROOF", values: [level], labels: [`${theorem}-premise`, `${theorem}-definition`, `${theorem}-deduction`, `${theorem}-conclusion`], fingerprint: `${theorem}:proof-depth-${level}`, meta: { shape: "PROOF", theorem } });
    }
    case "LINEAR_EQUATION_MODEL": {
      const x = random.int(-8, 14); const a = random.int(2, 7); const b = random.int(-10, 10); const c = a * x + b;
      return makeModel(contract, input, random, { operation: level === 1 ? "SOLVE_AX_PLUS_B" : "MODEL_AND_SOLVE", values: [a, b, c, x], fingerprint: `linear-equation:a-${a}:sign-${Math.sign(b)}:level-${level}`, meta: {} });
    }
    case "LINEAR_FUNCTION_MODEL": {
      const slope = random.int(1, 8); const intercept = random.int(-5, 10); const x = random.int(1, 12); const y = slope * x + intercept;
      return makeModel(contract, input, random, { operation: level === 1 ? "EVALUATE_LINEAR_FUNCTION" : "INTERPRET_LINEAR_RATE", values: [slope, intercept, x, y], fingerprint: `linear-function:slope-${slope}:intercept-sign-${Math.sign(intercept)}`, meta: { graphKind: "LINE" } });
    }
    case "LINEAR_GRAPH_CONSTRUCTION": {
      const slope = random.pick([-3, -2, -1, 1, 2, 3]); const intercept = random.int(-4, 4);
      return makeModel(contract, input, random, { operation: "SELECT_LINEAR_GRAPH", values: [slope, intercept, 0, intercept, 2, 2 * slope + intercept], fingerprint: `line:slope-${slope}:intercept-${intercept}:orientation-${random.int(0, 3)}`, meta: { graphKind: "LINE_CANDIDATES" } });
    }
    case "LINEAR_GRAPH_RELATION": {
      const slope1 = random.pick([-3, -2, -1, 1, 2, 3]); const parallel = random.int(0, 1) === 1; const slope2 = parallel ? slope1 : random.pick([slope1 + 1, -slope1]);
      return makeModel(contract, input, random, { operation: contract.outcomeId === "MOET2018-G8-NAA-P064-013" ? "READ_SLOPE" : "CLASSIFY_LINES_BY_SLOPE", values: [slope1, random.int(-3, 3), slope2, random.int(-3, 3)], fingerprint: `slopes-${slope1}-${slope2}:relation-${parallel ? "parallel" : "intersect"}`, meta: { graphKind: "TWO_LINES" } });
    }
    case "LINE_RELATION": {
      const relation = random.pick(["PARALLEL", "PERPENDICULAR", "INTERSECTING"] as const); const angle = relation === "PERPENDICULAR" ? 90 : relation === "PARALLEL" ? 0 : random.pick([30, 45, 60, 120]);
      return makeModel(contract, input, random, { operation: "CLASSIFY_LINE_RELATION", values: [angle], fingerprint: `relation-${relation}:angle-${angle}:level-${level}`, meta: { shape: "LINES", relation } });
    }
    case "MONEY_FINANCE": {
      if (contract.grade <= 3) {
        const denominations = contract.grade === 2
          ? [1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000]
          : [1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000, 200_000, 500_000];
        const denomination = random.pick(denominations);
        return makeModel(contract, input, random, { operation: "DENOMINATION", values: [denomination], scale: 1, fingerprint: `denomination-${denomination}:banknote-view-${random.int(0, 5)}`, meta: { currency: "đồng" } });
      }
      const price = random.int(2, 20 + level * 10) * 1_000;
      const quantity = random.int(1, 5);
      const paid = Math.ceil(price * quantity / 10_000) * 10_000 + 10_000;
      const rate = random.pick([5, 10, 20]);
      const outcomeId = contract.outcomeId;
      if (outcomeId === "MOET2018-G4-EXP-P040-002") {
        return makeModel(contract, input, random, { operation: "CHANGE", values: [price, quantity, paid], scale: 1, fingerprint: `CHANGE:items-${quantity}:price-band-${Math.floor(price / 10_000)}:payment-band-${Math.floor(paid / 10_000)}`, meta: { currency: "đồng" } });
      }
      if (outcomeId === "MOET2018-G5-EXP-P046-001") {
        if (level === 1) return makeModel(contract, input, random, { operation: "CHANGE", values: [price, quantity, paid], scale: 1, fingerprint: `CHANGE:items-${quantity}:price-band-${Math.floor(price / 10_000)}:payment-band-${Math.floor(paid / 10_000)}`, meta: { currency: "đồng" } });
        if (level === 2) {
          const purchaseCost = price * quantity; const signedMargin = random.pick([-1, 1]) * random.int(1, 8) * 1_000; const sellingAmount = purchaseCost + signedMargin;
          return makeModel(contract, input, random, { operation: "PROFIT_OR_LOSS", values: [purchaseCost, sellingAmount], scale: 1, fingerprint: `PROFIT_OR_LOSS:sign-${Math.sign(signedMargin)}:margin-band-${Math.abs(signedMargin) / 1_000}:cost-band-${Math.floor(purchaseCost / 10_000)}`, meta: { currency: "đồng" } });
        }
        const principal = random.int(5, 50) * 10_000; const interest = principal * rate / 100;
        return makeModel(contract, input, random, { operation: "INTEREST_RATE", values: [principal, interest, 0, rate], scale: 100, fingerprint: `INTEREST_RATE:principal-band-${Math.floor(principal / 100_000)}:rate-${rate}:representation-${random.int(0, 4)}`, meta: { currency: "đồng", period: "một kì" } });
      }
      if (outcomeId === "MOET2018-G6-EXP-P054-001") {
        if (level === 1) {
          const debt = random.int(8, 40) * 10_000; const repayment = random.int(1, Math.max(1, Math.floor(debt / 20_000))) * 10_000;
          return makeModel(contract, input, random, { operation: "DEBT_BALANCE", values: [debt, repayment], scale: 1, fingerprint: `DEBT_BALANCE:debt-band-${Math.floor(debt / 100_000)}:repayment-band-${Math.floor(repayment / 10_000)}`, meta: { currency: "đồng" } });
        }
        const principal = random.int(5, 80) * 10_000; const interest = principal * rate / 100;
        const operation = level === 2 ? "SIMPLE_INTEREST" : "INTEREST_RATE";
        return makeModel(contract, input, random, { operation, values: [principal, interest, 0, rate], scale: 100, fingerprint: `${operation}:principal-band-${Math.floor(principal / 100_000)}:rate-${rate}:representation-${random.int(0, 4)}`, meta: { currency: "đồng", period: "một kì" } });
      }
      if (outcomeId === "MOET2018-G6-EXP-P054-002") {
        const opening = random.int(5, 30) * 10_000; const income = random.int(2, 15) * 10_000; const expense = random.int(1, Math.floor((opening + income) / 10_000) - 1) * 10_000;
        return makeModel(contract, input, random, { operation: "TRANSACTION_BALANCE", values: [opening, income, expense], scale: 1, fingerprint: `TRANSACTION_BALANCE:opening-${Math.floor(opening / 100_000)}:income-${Math.floor(income / 50_000)}:expense-${Math.floor(expense / 50_000)}:depth-${level}`, meta: { currency: "đồng" } });
      }
      if (outcomeId === "MOET2018-G6-NAA-P047-004" || outcomeId === "MOET2018-G6-NAA-P048-028") {
        if (level === 1) return makeModel(contract, input, random, { operation: "PURCHASE_TOTAL", values: [price, quantity], scale: 1, fingerprint: `PURCHASE_TOTAL:items-${quantity}:price-band-${Math.floor(price / 10_000)}:context-${random.int(0, 4)}`, meta: { currency: "đồng" } });
        if (level === 2) return makeModel(contract, input, random, { operation: "CHANGE", values: [price, quantity, paid], scale: 1, fingerprint: `CHANGE:items-${quantity}:price-band-${Math.floor(price / 10_000)}:payment-band-${Math.floor(paid / 10_000)}`, meta: { currency: "đồng" } });
        const budget = random.int(8, 50) * 10_000; const unitPrice = random.int(2, 12) * 10_000;
        return makeModel(contract, input, random, { operation: "MAX_QUANTITY", values: [budget, unitPrice], scale: 1, fingerprint: `MAX_QUANTITY:budget-band-${Math.floor(budget / 100_000)}:unit-band-${Math.floor(unitPrice / 20_000)}:remainder-${budget % unitPrice === 0 ? "exact" : "nonzero"}`, meta: { currency: "đồng" } });
      }
      if (outcomeId === "MOET2018-G8-EXP-P070-001") {
        if (level === 3) {
          const scenarioIndex = random.int(0, PAYMENT_SCENARIOS.length - 1);
          return makeModel(contract, input, random, { operation: "PAYMENT_METHOD", values: [scenarioIndex], scale: 1, fingerprint: `PAYMENT_METHOD:scenario-${scenarioIndex}:risk-check-${random.int(0, 4)}`, meta: { currency: "đồng" } });
        }
        const opening = random.int(20, 100) * 10_000; const income = random.int(5, 40) * 10_000; const expense = random.int(2, Math.floor((opening + income) / 20_000)) * 10_000;
        return makeModel(contract, input, random, { operation: "BANK_STATEMENT_BALANCE", values: [opening, income, expense], scale: 1, fingerprint: `BANK_STATEMENT_BALANCE:opening-${Math.floor(opening / 200_000)}:income-${Math.floor(income / 100_000)}:expense-${Math.floor(expense / 100_000)}:depth-${level}`, meta: { currency: "đồng" } });
      }
      throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
    }
    case "NATURAL_NUMBER_STRUCTURE": {
      const number = random.int(1_000, 999_999); const place = random.pick([1, 10, 100, 1_000, 10_000]);
      return makeModel(contract, input, random, { operation: contract.outcomeId === "MOET2018-G4-NUM-P034-002" ? "SUCCESSOR" : "PLACE_VALUE", values: [number, place], fingerprint: `natural:${level}:place-${place}:band-${Math.floor(number / 100_000)}`, meta: {} });
    }
    case "NUMBER_LINE_PLACEMENT": {
      const start = random.int(0, 40); const step = random.pick([1, 2, 5, 10]); const missing = random.int(1, 4);
      return makeModel(contract, input, random, { operation: "MISSING_TICK", values: [start, step, missing, start + step * missing], fingerprint: `line:step-${step}:missing-${missing}:band-${Math.floor(start / 10)}`, meta: {} });
    }
    case "POINT_LINE_RELATION": {
      const relation = random.pick(["MIDPOINT", "COLLINEAR", "BETWEEN", "RAY", "INCIDENT"] as const); const a = random.int(1, 12); const b = a + random.int(2, 10);
      return makeModel(contract, input, random, { operation: "IDENTIFY_POINT_LINE_RELATION", values: [a, b, (a + b) / 2], fingerprint: `${relation}:distance-band-${Math.floor((b - a) / 3)}:orientation-${random.int(0, 4)}`, meta: { shape: "POINT_LINE", relation } });
    }
    case "POLYGON_PROPERTIES": {
      const shapes = POLYGON_SHAPES_BY_OUTCOME[contract.outcomeId];
      if (!shapes?.length) throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
      const shape = random.pick(shapes);
      const operation = POLYGON_CONSTRUCTION_OUTCOMES.has(contract.outcomeId)
        ? "SELECT_GRID_DRAWING"
        : contract.outcomeId === "MOET2018-G6-GEO-P051-011"
          ? "SELECT_HEXAGON_ASSEMBLY"
          : contract.outcomeId === "MOET2018-G8-GEO-P066-008"
            ? "QUADRILATERAL_ANGLE_SUM"
            : POLYGON_SUFFICIENT_CONDITION[contract.outcomeId]
              ? "IDENTIFY_SUFFICIENT_CONDITION"
              : "POLYGON_PROPERTY";
      return makeModel(contract, input, random, { operation, values: [random.int(2, 12), level], fingerprint: `${shape}:${operation}:depth-${level}:orientation-${random.int(0, 5)}`, meta: { shape, sufficientCondition: POLYGON_SUFFICIENT_CONDITION[contract.outcomeId] ?? null } });
    }
    case "POLYLINE_PERIMETER": {
      const count = 2 + level; const segments = Array.from({ length: count }, () => random.int(2, 15));
      return makeModel(contract, input, random, { operation: "SUM_POLYLINE", values: segments, fingerprint: `segments-${count}:total-band-${Math.floor(segments.reduce((a, b) => a + b, 0) / 10)}`, meta: { shape: "POLYLINE", unit: "cm" } });
    }
    case "POLYNOMIAL_REASONING": {
      const x = random.int(-4, 5); const a = random.int(1, 5); const b = random.int(-7, 7); const c = random.int(-8, 8);
      const operation = contract.outcomeId === "MOET2018-G7-NAA-P058-033" ? "TEST_POLYNOMIAL_ROOT" : contract.outcomeId === "MOET2018-G7-NAA-P058-035" ? "EVALUATE_POLYNOMIAL" : "COMBINE_POLYNOMIALS";
      return makeModel(contract, input, random, { operation, values: [a, b, c, x], fingerprint: `${operation}:degree-${level === 1 ? 1 : 2}:signs-${Math.sign(b)}-${Math.sign(c)}`, meta: {} });
    }
    case "PYTHAGORE_APPLICATION": {
      const triple = random.pick([[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [9, 12, 15]] as const); const factor = random.int(1, level + 2);
      return makeModel(contract, input, random, { operation: level === 1 ? "FIND_HYPOTENUSE" : "FIND_LEG", values: triple.map((value) => value * factor), fingerprint: `pythagore:triple-${triple.join("-")}:unknown-${level}`, meta: { shape: "RIGHT_TRIANGLE", unit: "m" } });
    }
    case "QUADRATIC_GRAPH_CONSTRUCTION": {
      const a = random.pick([-2, -1, 1, 2]); const h = random.int(-3, 3); const k = random.int(-4, 4);
      return makeModel(contract, input, random, { operation: "SELECT_PARABOLA_GRAPH", values: [a, h, k, h - 1, a + k, h + 1, a + k], fingerprint: `parabola:a-${a}:vertex-quadrant-${Math.sign(h)}-${Math.sign(k)}`, meta: { graphKind: "PARABOLA_CANDIDATES" } });
    }
    case "RIGHT_TRIANGLE_TRIGONOMETRY": {
      const triple = random.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17]] as const); const factor = random.int(1, level + 2); const operation = level === 1 ? "SINE_RATIO" : level === 2 ? "COSINE_RATIO" : "FIND_SIDE_BY_RATIO";
      return makeModel(contract, input, random, { operation, values: triple.map((value) => value * factor), scale: 1_000, fingerprint: `trig:${operation}:triple-${triple.join("-")}:factor-${factor}`, meta: { shape: "RIGHT_TRIANGLE", angleLabel: "A" } });
    }
    case "SHAPE_CLASSIFICATION": {
      const shape = contract.grade === 1 ? random.pick(["CIRCLE", "SQUARE", "RECTANGLE", "TRIANGLE"]) : random.pick(["TRAPEZOID", "CIRCLE", "ACUTE_TRIANGLE", "RIGHT_TRIANGLE", "OBTUSE_TRIANGLE", "EQUILATERAL_TRIANGLE"]);
      return makeModel(contract, input, random, { operation: "CLASSIFY_SHAPE", values: [random.int(0, 8)], fingerprint: `${shape}:orientation-${random.int(0, 7)}:level-${level}`, meta: { shape } });
    }
    case "SIMILARITY_THALES": {
      const base = random.int(2, 10); const scale = random.int(2, 5); const second = random.int(3, 12);
      const operation = level === 1 ? "SIMILARITY_RATIO" : level === 2 ? "THALES_MISSING_LENGTH" : "INDIRECT_HEIGHT";
      return makeModel(contract, input, random, { operation, values: [base, scale, base * scale, second, second * scale], fingerprint: `${operation}:scale-${scale}:base-band-${Math.floor(base / 3)}`, meta: { shape: "SIMILAR_TRIANGLES", unit: "m" } });
    }
    case "SOLID_NET": {
      const solid = random.pick(["CUBE", "RECTANGULAR_PRISM", "CYLINDER"] as const);
      return makeModel(contract, input, random, { operation: "SELECT_VALID_NET", values: [level], fingerprint: `${solid}:net-family-${random.int(0, 5)}:level-${level}`, meta: { shape: solid, candidates: 4 } });
    }
    case "SOLID_PROPERTIES": {
      const solid = contract.grade <= 3 ? random.pick(["CUBE", "RECTANGULAR_PRISM"]) : contract.grade === 7 ? random.pick(["TRIANGULAR_PRISM", "QUADRILATERAL_PRISM", "CUBE"]) : contract.grade === 8 ? random.pick(["TRIANGULAR_PYRAMID", "SQUARE_PYRAMID"]) : random.pick(["CONE", "CYLINDER", "SPHERE"]);
      return makeModel(contract, input, random, { operation: "SOLID_PROPERTY", values: [level], fingerprint: `${solid}:property-${level}:orientation-${random.int(0, 5)}`, meta: { shape: solid } });
    }
    case "SOLID_SURFACE_VOLUME": {
      const shape = contract.grade <= 6 ? "RECTANGULAR_PRISM" : contract.grade === 7 ? "TRIANGULAR_PRISM" : contract.grade === 8 ? "SQUARE_PYRAMID" : random.pick(["CYLINDER", "CONE", "SPHERE"] as const);
      const operation = level === 1 ? "VOLUME" : "SURFACE_MEASURE";
      if (shape === "RECTANGULAR_PRISM") {
        const length = random.int(3, 12); const width = random.int(2, 9); const height = random.int(2, 10);
        return makeModel(contract, input, random, { operation, values: [length, width, height], labels: ["chiều dài", "chiều rộng", "chiều cao"], scale: 100, fingerprint: `${shape}:${operation}:${length}-${width}-${height}`, meta: { shape, unit: "cm", pi: 3.14 } });
      }
      if (shape === "TRIANGULAR_PRISM") {
        const [base0, height0, hypotenuse0] = random.pick([[3, 4, 5], [5, 12, 13], [6, 8, 10]] as const); const factor = random.int(1, 2); const length = random.int(3, 12);
        return makeModel(contract, input, random, { operation, values: [base0 * factor, height0 * factor, length, hypotenuse0 * factor], labels: ["cạnh đáy tam giác vuông", "chiều cao tam giác vuông", "chiều dài lăng trụ", "cạnh huyền đáy"], scale: 100, fingerprint: `${shape}:${operation}:${base0}-${height0}:factor-${factor}:length-${length}`, meta: { shape, unit: "cm", pi: 3.14 } });
      }
      if (shape === "SQUARE_PYRAMID") {
        const [halfBase0, height0, slant0] = random.pick([[3, 4, 5], [5, 12, 13], [6, 8, 10]] as const); const factor = random.int(1, 2); const baseSide = 2 * halfBase0 * factor; const height = height0 * factor; const slantHeight = slant0 * factor;
        return makeModel(contract, input, random, { operation, values: [baseSide, height, slantHeight], labels: ["cạnh đáy vuông", "chiều cao hình chóp", "đường cao mặt bên"], scale: 100, fingerprint: `${shape}:${operation}:${halfBase0}-${height0}:factor-${factor}`, meta: { shape, unit: "cm", pi: 3.14 } });
      }
      if (shape === "SPHERE") {
        const radius = random.int(2, 10);
        return makeModel(contract, input, random, { operation, values: [radius], labels: ["bán kính"], scale: 100, fingerprint: `${shape}:${operation}:radius-${radius}`, meta: { shape, unit: "cm", pi: 3.14 } });
      }
      if (shape === "CONE") {
        const [radius0, height0, slant0] = random.pick([[3, 4, 5], [5, 12, 13], [6, 8, 10]] as const); const factor = random.int(1, 2);
        return makeModel(contract, input, random, { operation, values: [radius0 * factor, height0 * factor, slant0 * factor], labels: ["bán kính đáy", "chiều cao", "đường sinh"], scale: 100, fingerprint: `${shape}:${operation}:${radius0}-${height0}:factor-${factor}`, meta: { shape, unit: "cm", pi: 3.14 } });
      }
      const radius = random.int(2, 10); const height = random.int(3, 14);
      return makeModel(contract, input, random, { operation, values: [radius, height], labels: ["bán kính đáy", "chiều cao"], scale: 100, fingerprint: `${shape}:${operation}:radius-${radius}:height-${height}`, meta: { shape, unit: "cm", pi: 3.14 } });
    }
    case "SPATIAL_POSITION": {
      const relation = random.pick(["ABOVE", "BELOW", "LEFT", "RIGHT", "BETWEEN", "IN_FRONT"] as const);
      return makeModel(contract, input, random, { operation: "SPATIAL_RELATION", values: [level], fingerprint: `${relation}:scene-${random.int(0, 9)}:objects-${level + 2}`, meta: { shape: "SPATIAL_SCENE", relation, objectA: "quả bóng", objectB: relation === "BETWEEN" ? "hai chiếc hộp" : "chiếc hộp" } });
    }
    case "SPEED_DISTANCE_TIME": {
      const time = random.int(1, 5 + level); const speed = random.int(2, 12) * 5; const distance = speed * time;
      return makeModel(contract, input, random, { operation: level === 1 ? "READ_SPEED_UNIT" : "DISTANCE_FROM_SPEED_TIME", values: [speed, time, distance], fingerprint: `speed-${speed}:time-${time}:level-${level}`, meta: { unit: "km/h" } });
    }
    case "SYMMETRY_REGULARITY": {
      const sides = random.pick([3, 4, 5, 6, 8]); const operation = contract.grade <= 6 ? "SYMMETRY_AXES" : "ROTATIONAL_ORDER";
      return makeModel(contract, input, random, { operation, values: [sides], fingerprint: `${operation}:sides-${sides}:orientation-${random.int(0, 7)}`, meta: { shape: "REGULAR_POLYGON", symmetry: operation } });
    }
    case "TIME_CALENDAR": {
      const operation = TIME_OPERATION_BY_OUTCOME[contract.outcomeId];
      if (!operation) throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
      if (operation === "WEEKDAY_SEQUENCE" || operation === "WEEKDAY_OFFSET") {
        const weekday = random.int(1, 7); const offset = random.int(1, 6); const answer = (weekday - 1 + offset) % 7 + 1;
        return makeModel(contract, input, random, { operation, values: [weekday, offset, answer], labels: ["ngày bắt đầu", "số ngày sau"], fingerprint: `${operation}:weekday-${weekday}:offset-${offset}`, meta: { cycle: 7 } });
      }
      if (operation === "MONTH_DAYS") {
        const month = random.int(1, 12); const days = month === 2 ? 28 : [4, 6, 9, 11].includes(month) ? 30 : 31;
        return makeModel(contract, input, random, { operation, values: [month, days], labels: ["tháng"], fingerprint: `${operation}:month-${month}`, meta: { commonYear: true } });
      }
      if (operation === "MONTH_SEQUENCE") {
        const month = random.int(1, 12); const offset = random.int(1, 4); const answer = (month - 1 + offset) % 12 + 1;
        return makeModel(contract, input, random, { operation, values: [month, offset, answer], labels: ["tháng bắt đầu", "số tháng sau"], fingerprint: `${operation}:month-${month}:offset-${offset}`, meta: { cycle: 12 } });
      }
      if (operation === "HOUR_DAY_RELATION") {
        const amount = random.int(1, 4); const factor = random.pick([24, 60]);
        return makeModel(contract, input, random, { operation, values: [amount, factor, amount * factor], fingerprint: `${operation}:factor-${factor}:amount-${amount}`, meta: { relation: factor === 24 ? "DAY_TO_HOUR" : "HOUR_TO_MINUTE" } });
      }
      if (operation === "CENTURY_RELATION") {
        const centuries = random.int(1, 9);
        return makeModel(contract, input, random, { operation, values: [centuries, centuries * 100], fingerprint: `${operation}:centuries-${centuries}`, meta: { relation: "CENTURY_TO_YEAR" } });
      }
      const hour = random.int(1, 12); const minute = contract.grade === 1 ? 0 : contract.grade === 2 ? random.pick([15, 30]) : random.int(0, 11) * 5;
      return makeModel(contract, input, random, { operation, values: [hour, minute], fingerprint: `${operation}:hour-${hour}:minute-${minute}`, meta: { unit: "phút" } });
    }
    case "TRIANGLE_CONGRUENCE": {
      const criterion = random.pick(["SSS", "SAS", "ASA", "RHS"] as const);
      return makeModel(contract, input, random, { operation: "CONGRUENCE_CRITERION", values: [level], fingerprint: `${criterion}:correspondence-${random.int(0, 5)}:level-${level}`, meta: { shape: "TWO_TRIANGLES", criterion } });
    }
    case "TRIANGLE_PROPERTIES": {
      const operation = TRIANGLE_PROPERTY_OPERATION_BY_OUTCOME[contract.outcomeId];
      if (!operation) throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
      if (operation === "TRIANGLE_ANGLE_SUM") { const a = random.int(35, 75); const b = random.int(35, 75); return makeModel(contract, input, random, { operation, values: [a, b, 180 - a - b], fingerprint: `angle-sum:${Math.floor(a / 10)}-${Math.floor(b / 10)}`, meta: { shape: "TRIANGLE" } }); }
      if (operation === "TRIANGLE_INEQUALITY") { const a = random.int(3, 12); const b = random.int(3, 12); return makeModel(contract, input, random, { operation, values: [a, b, a + b - 1], fingerprint: `inequality:${a}-${b}:level-${level}`, meta: { shape: "TRIANGLE" } }); }
      const baseAngle = random.int(35, 70); return makeModel(contract, input, random, { operation, values: [baseAngle, 180 - 2 * baseAngle], fingerprint: `triangle-property:${contract.outcomeId}:band-${Math.floor(baseAngle / 10)}`, meta: { shape: "TRIANGLE" } });
    }
    case "TRIANGLE_SPECIAL_LINES": {
      const line = contract.outcomeId === "MOET2018-G7-GEO-P060-023" ? random.pick(["MEDIAN", "ALTITUDE", "ANGLE_BISECTOR", "PERPENDICULAR_BISECTOR"] as const) : SPECIAL_LINE_BY_OUTCOME[contract.outcomeId];
      if (!line) throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
      return makeModel(contract, input, random, { operation: "IDENTIFY_SPECIAL_LINE", values: [level], fingerprint: `${line}:orientation-${random.int(0, 7)}:level-${level}`, meta: { shape: "TRIANGLE_SPECIAL_LINE", line } });
    }
    case "UNIT_CONVERSION_MEASUREMENT": {
      if (contract.outcomeId === "MOET2018-G1-GEO-P023-008") {
        const value = random.int(2, 100);
        return makeModel(contract, input, random, { operation: "READ_CENTIMETER_MEASURE", values: [value], scale: 1, fingerprint: `read-centimeter:${Math.floor(value / 10)}:level-${level}`, meta: { unit: "cm", targetUnit: "cm" } });
      }
      const factor = random.pick(contract.grade <= 2 ? [10, 100, 1_000] : [10, 100, 1_000, 10_000]); const value = random.int(2, 50 + level * 20); const multiply = random.int(0, 1) === 1;
      const units = factor === 10 ? ["cm", "mm"] : factor === 100 ? ["m", "cm"] : factor === 1_000 ? ["l", "ml"] : ["m²", "cm²"];
      return makeModel(contract, input, random, { operation: multiply ? "MULTIPLY_UNIT_FACTOR" : "DIVIDE_UNIT_FACTOR", values: [value, factor], scale: factor, fingerprint: `unit-factor-${factor}:direction-${multiply ? "large-small" : "small-large"}:band-${Math.floor(value / 10)}`, meta: { unit: multiply ? units[0] : units[1], targetUnit: multiply ? units[1] : units[0] } });
    }
    case "UNIT_FRACTION_MODEL": {
      const denominator = random.pick([2, 3, 4, 5, 6, 8, 10]);
      return makeModel(contract, input, random, { operation: "UNIT_FRACTION", values: [1, denominator], fingerprint: `unit-fraction:den-${denominator}:orientation-${random.int(0, 4)}`, meta: { modelType: "SEGMENTED_BAR" } });
    }
    case "VIETE_RELATION": {
      const root1 = random.int(-8, 8); let root2 = random.int(-8, 8); if (root2 === root1) root2 += 1;
      return makeModel(contract, input, random, { operation: "ROOTS_FROM_SUM_PRODUCT", values: [root1 + root2, root1 * root2, root1, root2], labels: ["x₁", "x₂"], fingerprint: `viete:sum-sign-${Math.sign(root1 + root2)}:product-sign-${Math.sign(root1 * root2)}:level-${level}`, meta: {} });
    }
    case "VISUAL_OPERATION_MODEL": {
      const operation = contract.grade === 1 ? random.pick(["ADD", "SUBTRACT"] as const) : random.pick(["ADD", "SUBTRACT", "MULTIPLY", "DIVIDE"] as const); const a = random.int(2, 9); const b = operation === "SUBTRACT" ? random.int(1, a) : random.int(1, 6); const values = operation === "DIVIDE" ? [a * b, b] : [a, b];
      return makeModel(contract, input, random, { operation, values, fingerprint: `${operation}:objects-${values.join("-")}:layout-${random.int(0, 5)}`, meta: { object: random.pick(["chấm tròn", "khối gỗ", "bông hoa", "quả bóng"]) } });
    }
  }
  throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
}

function propertyForShape(shape: string): string {
  const properties: Record<string, string> = {
    TRIANGLE: "có 3 cạnh", EQUILATERAL_TRIANGLE: "3 cạnh bằng nhau", QUADRILATERAL: "có 4 cạnh", TRAPEZOID: "có một cặp cạnh đối song song", SQUARE: "4 cạnh bằng nhau và 4 góc vuông", RECTANGLE: "4 góc vuông và hai cặp cạnh đối bằng nhau", RHOMBUS: "4 cạnh bằng nhau", PARALLELOGRAM: "hai cặp cạnh đối song song", REGULAR_HEXAGON: "6 cạnh bằng nhau", ISOSCELES_TRAPEZOID: "hai đường chéo bằng nhau",
  };
  return properties[shape] ?? "có thuộc tính đúng theo định nghĩa";
}

function solveModel(m: WaveDNormalizedProblemModel): SemanticSolution {
  const v = m.values; const cap = m.variantId;
  const result = (answer: CanonicalResponse, distractors: readonly string[], steps: readonly string[], nextStep: string): SemanticSolution => ({ answer, distractors, steps, nextStep });
  switch (cap) {
    case "ANGLE_MEASUREMENT": return m.operation === "READ_ANGLE" ? result(v[0]!, [String(v[0]! + 10), String(Math.abs(180 - v[0]!)), String(Math.max(0, v[0]! - 10))], [`Số đo đã cho là ${v[0]}°.`], "Đối chiếu số đo với 90° và 180°.") : result(angleClasses(v[0]!), ["góc nhọn", "góc vuông", "góc tù", "góc bẹt"].filter((item) => item !== angleClasses(v[0]!)), [`${v[0]}° thuộc loại ${angleClasses(v[0]!)}.`], "So sánh góc với góc vuông.");
    case "APPLIED_GEOMETRY_MEASUREMENT": { const answer = m.operation === "RECTANGLE_PERIMETER" ? 2 * (v[0]! + v[1]!) : v[0]! * v[1]!; return result(answer, [String(v[0]! + v[1]!), String(v[0]! * v[1]!), String(2 * v[0]! * v[1]!)].filter((item) => item !== String(answer)), [m.operation === "RECTANGLE_PERIMETER" ? `2 × (${v[0]} + ${v[1]}) = ${answer}.` : `${v[0]} × ${v[1]} = ${answer}.`], "Kiểm tra kết quả dùng cm hay cm²."); }
    case "APPLIED_MEASUREMENT_MODEL": { const answer = m.operation === "SELECT_MEASURE" ? v[0]! : m.operation === "COMBINE_MEASURES" ? v[0]! + v[1]! : rounded((v[0]! + v[1]!) / v[2]!, 3); return result(answer, [String(v[0]!), String(v[0]! + v[1]! + 1), String(rounded(answer * v[2]!, 3))], ["Xác định cùng đại lượng và đơn vị.", `Thực hiện bước ${operationLabel(m.operation)} để được ${answer}.`], "Viết đơn vị cạnh kết quả khi tự kiểm tra."); }
    case "APPLIED_RATIONAL_REASONING": { const answer = reduce(v[0]!, v[1]!); return result(answer, [`${Math.abs(v[0]!)}/${v[1]}`, `${v[0]! + 1}/${v[1]}`, `${v[0]}/${v[1]! + 1}`], [`Độ thay đổi có dấu là ${v[0]}/${v[1]}.`, `Rút gọn được ${display(answer)}.`], "Kiểm tra dấu theo chiều thay đổi."); }
    case "AREA_PERIMETER": { const answer = m.operation === "RECTANGLE_AREA" ? v[0]! * v[1]! : m.operation === "TRIANGLE_AREA" ? v[0]! * v[1]! / 2 : (v[0]! + v[2]!) * v[1]! / 2; return result(answer, [String(v[0]! + v[1]!), String(v[0]! * v[1]!), String(2 * (v[0]! + v[1]!))].filter((item) => item !== String(answer)), [`Chọn công thức ${operationLabel(m.operation)}.`, `Thay số được ${answer} cm².`], "Kiểm tra hình và đơn vị diện tích."); }
    case "CIRCLE_ANGLE_RELATION": { const answer = m.operation === "IDENTIFY_CIRCLE_ANGLE" ? "góc nội tiếp" : m.operation === "CENTRAL_FROM_INSCRIBED" ? v[1]! : v[0]!; return result(answer, ["góc ở tâm", "góc nội tiếp", "góc ngoài", String(v[0]!), String(v[1]!)].filter((item) => item !== String(answer)), ["Góc ở tâm bằng hai lần góc nội tiếp cùng chắn một cung.", `Kết quả là ${display(answer)}${typeof answer === "number" ? "°" : ""}.`], "Xác định hai cạnh của góc trước khi dùng quan hệ."); }
    case "CIRCLE_INSCRIBED_CIRCUMSCRIBED": { let answer: CanonicalResponse; if (m.operation === "INCENTER_DEFINITION") answer = "giao điểm các đường phân giác"; else if (m.operation === "CIRCUMCENTER_DEFINITION") answer = "giao điểm các đường trung trực"; else if (m.operation === "CYCLIC_QUADRILATERAL_ANGLE") answer = 180 - v[1]!; else if (m.operation === "EQUILATERAL_INRADIUS") answer = rounded(v[0]! * Math.sqrt(3) / 6, 2); else answer = rounded(v[0]! / 2, 2); return result(answer, ["giao điểm các đường cao", "giao điểm các đường trung tuyến", String(v[0]!), String(v[1]!)].filter((item) => item !== String(answer)), [`Áp dụng quan hệ ${operationLabel(m.operation)}.`, `Kết quả duy nhất là ${display(answer)}.`], "Phân biệt tâm nội tiếp và tâm ngoại tiếp."); }
    case "CIRCLE_MEASURE": { const r = v[0]!; const angle = v[1]!; const inner = v[2]!; const answer = m.operation === "CIRCUMFERENCE" ? rounded(2 * 3.14 * r, 2) : m.operation === "CIRCLE_AREA" ? rounded(3.14 * r * r, 2) : m.operation === "ARC_LENGTH" ? rounded(2 * 3.14 * r * angle / 360, 2) : m.operation === "SECTOR_AREA" ? rounded(3.14 * r * r * angle / 360, 2) : rounded(3.14 * (r * r - inner * inner), 2); return result(answer, [String(rounded(3.14 * r, 2)), String(rounded(2 * 3.14 * r * r, 2)), String(rounded(answer + r, 2))], [`Dùng π = 3,14 và bán kính ${r}.`, `Theo công thức ${operationLabel(m.operation)}, kết quả là ${answer}.`], "Kiểm tra bán kính, góc ở tâm và đơn vị."); }
    case "CIRCLE_RELATION": { let answer: CanonicalResponse; if (m.operation === "TANGENT_PROPERTY") answer = ["bán kính vuông góc tiếp tuyến", "hai tiếp tuyến từ một điểm bằng nhau"]; else if (m.operation === "CIRCLE_SYMMETRY") answer = ["tâm là tâm đối xứng", "mọi đường kính là trục đối xứng"]; else if (m.operation === "CHORD_DIAMETER_COMPARE") answer = "đường kính không ngắn hơn mọi dây"; else if (m.operation === "LINE_CIRCLE_POSITION") answer = v[2]! < v[0]! ? "cắt nhau" : v[2] === v[0] ? "tiếp xúc" : "không giao nhau"; else answer = v[2] === v[0]! + v[1]! || v[2] === Math.abs(v[0]! - v[1]!) ? "tiếp xúc" : v[2]! > v[0]! + v[1]! ? "không giao nhau" : "cắt nhau"; return result(answer, ["cắt nhau", "tiếp xúc", "không giao nhau", "đường kính luôn ngắn hơn dây"].filter((item) => !display(answer).includes(item)), ["So sánh khoảng cách tâm với bán kính hoặc dùng định nghĩa tiếp tuyến.", `Kết luận: ${display(answer)}.`], "Vẽ bán kính tới tiếp điểm để kiểm tra."); }
    case "COORDINATE_POINT": return result([{ leftId: "x", rightId: String(v[0]!) }, { leftId: "y", rightId: String(v[1]!) }], [`x=${v[1]}; y=${v[0]}`, `(${v[1]}; ${v[0]})`, `(${Math.abs(v[0]!)}; ${Math.abs(v[1]!)})`], [`Đọc hoành độ trước: ${v[0]}.`, `Đọc tung độ sau: ${v[1]}.`], "Luôn viết hoành độ trước tung độ.");
    case "DIRECT_MEASUREMENT_ESTIMATION": return result(v[0]!, [String(v[0]! * 10), String(Math.max(1, Math.round(v[0]! / 10))), String(v[0]! + 7)], [`Đọc vạch và đơn vị ${String(m.meta.unit)}.`, `Giá trị phù hợp là ${v[0]} ${String(m.meta.unit)}.`], "Kiểm tra kích thước thực tế và đơn vị.");
    case "DIVISION_REMAINDER": return m.interactionType === "MATCHING" ? result([{ leftId: "q", rightId: String(v[2]!) }, { leftId: "r", rightId: String(v[3]!) }], [`q=${v[3]}; r=${v[2]}`], [`${v[0]} = ${v[1]} × ${v[2]} + ${v[3]}.`, `Số dư ${v[3]} nhỏ hơn số chia ${v[1]}.`], "Kiểm tra số dư luôn nhỏ hơn số chia.") : result(v[3]!, [String(v[2]!), String(v[1]!), String(v[3]! + v[1]!)], [`${v[0]} = ${v[1]} × ${v[2]} + ${v[3]}.`], "Dùng công thức phép chia có dư.");
    case "EARLY_ARITHMETIC_APPLICATION": { const answer = m.operation === "COUNT" ? v[0]! : v[0]! + v[1]!; return result(answer, [String(answer + 1), String(Math.max(0, answer - 1)), String(v[0]!)], [`Đếm ${v[0]}${m.operation === "ADD" ? ` rồi thêm ${v[1]}` : ""}.`, `Có ${answer}.`], "Đếm lại mỗi vật đúng một lần."); }
    case "FUNCTION_MODEL_RECOGNITION": { const answer = m.meta.repeatedInput ? "không phải hàm số" : "là hàm số"; return result(answer, [answer === "là hàm số" ? "không phải hàm số" : "là hàm số", "không đủ dữ kiện"], [m.meta.repeatedInput ? "Một đầu vào có hai đầu ra khác nhau." : "Mỗi đầu vào có đúng một đầu ra.", `Quan hệ ${answer}.`], "Kiểm tra từng giá trị đầu vào."); }
    case "GEOMETRIC_CONSTRUCTION_PLAN": { const steps = ["Xác định dữ kiện và dụng cụ", "Tạo điểm hoặc đường chuẩn", "Dựng quan hệ hình học cần có", "Kiểm tra hình bằng định nghĩa"]; return result(steps, [...steps].reverse(), ["Chọn đúng dụng cụ.", "Tạo điểm/đường chuẩn.", "Dựng quan hệ cần có.", "Kiểm tra kết quả bằng định nghĩa."], "Dùng phép kiểm tra hình học sau khi dựng."); }
    case "GEOMETRIC_PROOF_REASONING": { const steps = ["Ghi giả thiết", "Nêu định nghĩa hoặc định lí dùng", "Suy ra quan hệ trung gian", "Kết luận điều cần chứng minh"]; return result(steps, [...steps].reverse(), ["Bắt đầu từ giả thiết.", "Mỗi suy luận phải có căn cứ.", "Kết luận đúng điều cần chứng minh."], "Không dùng kết luận làm giả thiết."); }
    case "LINEAR_EQUATION_MODEL": return result(v[3]!, [String(-v[3]!), String(v[2]! - v[1]!), String(rounded(v[2]! / v[0]!, 2))], [`${v[0]}x ${v[1]! >= 0 ? "+" : "−"} ${Math.abs(v[1]!)} = ${v[2]}.`, `x = (${v[2]} − (${v[1]})) : ${v[0]} = ${v[3]}.`], "Thế nghiệm vào phương trình ban đầu.");
    case "LINEAR_FUNCTION_MODEL": return result(v[3]!, [String(v[0]! * v[2]!), String(v[2]! + v[1]!), String(v[3]! - v[1]!)], [`y = ${v[0]}x ${v[1]! >= 0 ? "+" : "−"} ${Math.abs(v[1]!)}.`, `Với x=${v[2]}, y=${v[3]}.`], "Kiểm tra ý nghĩa hệ số góc và tung độ gốc.");
    case "LINEAR_GRAPH_CONSTRUCTION": return result("đồ thị qua (0; b) và (2; 2a+b)", ["đồ thị có hệ số góc đổi dấu", "đồ thị có tung độ gốc bằng 0", "đường thẳng đứng"], [`Điểm thứ nhất là (0; ${v[1]}).`, `Điểm thứ hai là (2; ${v[5]}).`], "Đối chiếu cả độ dốc và giao với trục Oy.");
    case "LINEAR_GRAPH_RELATION": { const answer = m.operation === "READ_SLOPE" ? v[0]! : v[0] === v[2] ? "song song" : "cắt nhau"; return result(answer, ["song song", "cắt nhau", "trùng nhau", String(-v[0]!)].filter((item) => item !== String(answer)), [m.operation === "READ_SLOPE" ? `Hệ số của x là ${v[0]}.` : `So sánh hai hệ số góc ${v[0]} và ${v[2]}.`, `Kết luận: ${display(answer)}.`], "Đường song song có hệ số góc bằng nhau và tung độ gốc khác nhau."); }
    case "LINE_RELATION": { const answer = String(m.meta.relation) === "PARALLEL" ? "song song" : String(m.meta.relation) === "PERPENDICULAR" ? "vuông góc" : "cắt nhau"; return result(answer, ["song song", "vuông góc", "cắt nhau"].filter((item) => item !== answer), [`Góc/quan hệ đã cho là ${v[0]}° hoặc không giao nhau.`, `Hai đường ${answer}.`], "Kiểm tra góc 90° và số giao điểm."); }
    case "MONEY_FINANCE": {
      if (m.operation === "DENOMINATION") {
        const answer = `${v[0]!.toLocaleString("vi-VN")} đồng`;
        const distractors = [1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000, 200_000, 500_000]
          .filter((value) => value !== v[0])
          .slice(Math.abs(v[0]!) % 4, Math.abs(v[0]!) % 4 + 4)
          .map((value) => `${value.toLocaleString("vi-VN")} đồng`);
        return result(answer, distractors, ["Đọc số được in trên tờ tiền.", `Đây là tờ ${answer}.`], "Đối chiếu đủ các chữ số và đơn vị đồng.");
      }
      let answer: CanonicalResponse;
      if (m.operation === "CHANGE") answer = v[2]! - v[0]! * v[1]!;
      else if (m.operation === "PURCHASE_TOTAL") answer = v[0]! * v[1]!;
      else if (m.operation === "MAX_QUANTITY") answer = Math.floor(v[0]! / v[1]!);
      else if (m.operation === "PROFIT_OR_LOSS") answer = v[1]! - v[0]!;
      else if (m.operation === "SIMPLE_INTEREST") answer = rounded(v[0]! * v[3]! / 100, 0);
      else if (m.operation === "INTEREST_RATE") answer = rounded(v[1]! / v[0]! * 100, 2);
      else if (m.operation === "DEBT_BALANCE") answer = v[0]! - v[1]!;
      else if (m.operation === "TRANSACTION_BALANCE" || m.operation === "BANK_STATEMENT_BALANCE") answer = v[0]! + v[1]! - v[2]!;
      else if (m.operation === "PAYMENT_METHOD") answer = PAYMENT_SCENARIOS[v[0]!]!.answer;
      else throw new GenerationV2Error("SOLVER_FAILED");
      const distractors = m.operation === "PAYMENT_METHOD"
        ? ["tiền mặt", "chuyển khoản ngân hàng", "thẻ ngân hàng", "thẻ hoặc ví điện tử có xác thực"].filter((item) => item !== answer)
        : [String(v[0]!), String(v[1]!), String(typeof answer === "number" ? Math.abs(answer - (v[0] ?? 0)) : 0)].filter((item) => item !== String(answer));
      const resultUnit = m.operation === "INTEREST_RATE" ? "%" : m.operation === "MAX_QUANTITY" ? " sản phẩm" : m.operation === "PAYMENT_METHOD" ? "" : " đồng";
      return result(answer, distractors, ["Xác định đúng dữ kiện tiền vào, tiền ra, giá mua, giá bán hoặc tỉ lệ của một kì.", `Kết quả là ${display(answer)}${resultUnit}.`], "Đối chiếu chiều dòng tiền, thời kì và đơn vị trước khi kết luận.");
    }
    case "NATURAL_NUMBER_STRUCTURE": { const answer = m.operation === "SUCCESSOR" ? v[0]! + 1 : Math.floor(v[0]! / v[1]!) % 10 * v[1]!; return result(answer, [String(v[0]!), String(Math.floor(v[0]! / v[1]!) % 10), String(answer * 10)], [m.operation === "SUCCESSOR" ? `Số liền sau ${v[0]} là ${answer}.` : `Chữ số ở hàng ${v[1]} có giá trị ${answer}.`], "Đọc từ hàng cao xuống hàng thấp."); }
    case "NUMBER_LINE_PLACEMENT": return result(v[3]!, [String(v[0]! + v[2]!), String(v[3]! + v[1]!), String(v[3]! - v[1]!)], [`Mỗi khoảng tăng ${v[1]}.`, `Mốc thứ ${v[2]} là ${v[0]} + ${v[1]} × ${v[2]} = ${v[3]}.`], "Kiểm tra khoảng cách giữa các vạch bằng nhau.");
    case "POINT_LINE_RELATION": { const answer = String(m.meta.relation).toLocaleLowerCase("en") === "midpoint" ? "trung điểm" : ({ COLLINEAR: "thẳng hàng", BETWEEN: "nằm giữa", RAY: "tia", INCIDENT: "thuộc đường thẳng" } as Record<string, string>)[String(m.meta.relation)] ?? "quan hệ điểm-đường"; return result(answer, ["trung điểm", "thẳng hàng", "nằm giữa", "tia", "không thuộc đường thẳng"].filter((item) => item !== answer), [`Dùng định nghĩa của ${answer}.`, "Đối chiếu vị trí và độ dài trên hình."], "Kiểm tra các điều kiện định nghĩa, không chỉ nhìn hình."); }
    case "POLYGON_PROPERTIES": {
      const shape = String(m.meta.shape);
      const answer = m.operation === "SELECT_GRID_DRAWING"
        ? `${shapeLabel(shape)} có các đỉnh đúng trên giao điểm lưới`
        : m.operation === "SELECT_HEXAGON_ASSEMBLY"
          ? "ghép 6 tam giác đều quanh một đỉnh chung"
          : m.operation === "QUADRILATERAL_ANGLE_SUM"
            ? "tổng bốn góc bằng 360°"
            : m.operation === "IDENTIFY_SUFFICIENT_CONDITION"
              ? String(m.meta.sufficientCondition)
              : propertyForShape(shape);
      return result(answer, ["mọi cạnh đều khác nhau", "không có cạnh song song", "hai đường chéo luôn vuông góc", "tổng góc bằng 180°", "đặt các đỉnh lệch khỏi giao điểm lưới"].filter((item) => item !== answer), [`Hình là ${shapeLabel(shape)}.`, `Điều kiện hoặc thuộc tính xác định: ${answer}.`], "Đối chiếu đúng định nghĩa, dấu hiệu và yêu cầu tạo hình của outcome.");
    }
    case "POLYLINE_PERIMETER": { const answer = v.reduce((sum, value) => sum + value, 0); return result(answer, [String(answer - v[0]!), String(answer + v[0]!), String(v[0]! * v.length)], [`Cộng ${v.length} đoạn: ${v.join(" + ")} = ${answer}.`], "Đánh dấu mỗi đoạn sau khi cộng."); }
    case "POLYNOMIAL_REASONING": { const value = v[0]! * v[3]! * v[3]! + v[1]! * v[3]! + v[2]!; const answer = m.operation === "TEST_POLYNOMIAL_ROOT" ? (value === 0 ? "là nghiệm" : "không là nghiệm") : m.operation === "COMBINE_POLYNOMIALS" ? `${v[0]}x²${v[1]! >= 0 ? "+" : ""}${v[1]}x${v[2]! >= 0 ? "+" : ""}${v[2]}` : value; return result(answer, [String(-value), String(value + v[0]!), `${v[0] + v[1]}x²`], [`Thay x=${v[3]} và gom đúng hạng tử cùng bậc.`, `Kết quả là ${display(answer)}.`], "Kiểm tra dấu của từng hạng tử."); }
    case "PYTHAGORE_APPLICATION": { const answer = m.operation === "FIND_HYPOTENUSE" ? v[2]! : v[1]!; return result(answer, [String(v[0]! + v[1]!), String(Math.abs(v[2]! - v[0]!)), String(rounded(Math.sqrt(v[0]! * v[0]! + v[1]! * v[1]!), 2))].filter((item) => item !== String(answer)), [`Dùng bình phương cạnh huyền bằng tổng bình phương hai cạnh góc vuông.`, `Độ dài cần tìm là ${answer}.`], "Xác định đúng cạnh huyền trước khi lập phương trình."); }
    case "QUADRATIC_GRAPH_CONSTRUCTION": return result("parabol có đỉnh và chiều mở đúng", ["parabol đổi chiều mở", "parabol lệch trục đối xứng", "đường thẳng"], [`Đỉnh là (${v[1]}; ${v[2]}).`, `Dấu a=${v[0]} quyết định chiều mở.`], "Kiểm tra đỉnh, trục đối xứng và hai điểm đối xứng.");
    case "RIGHT_TRIANGLE_TRIGONOMETRY": { const answer = m.operation === "SINE_RATIO" ? reduce(v[0]!, v[2]!) : m.operation === "COSINE_RATIO" ? reduce(v[1]!, v[2]!) : v[1]!; return result(answer, [`${v[1]}/${v[2]}`, `${v[2]}/${v[0]}`, String(v[0]! + v[1]!)].filter((item) => item !== display(answer)), ["Xác định cạnh đối, cạnh kề và cạnh huyền.", `${operationLabel(m.operation)} cho kết quả ${display(answer)}.`], "Ghi tên cạnh theo góc đang xét."); }
    case "SHAPE_CLASSIFICATION": { const answer = ({ CIRCLE: "hình tròn", SQUARE: "hình vuông", RECTANGLE: "hình chữ nhật", TRIANGLE: "hình tam giác", TRAPEZOID: "hình thang", ACUTE_TRIANGLE: "tam giác nhọn", RIGHT_TRIANGLE: "tam giác vuông", OBTUSE_TRIANGLE: "tam giác tù", EQUILATERAL_TRIANGLE: "tam giác đều" } as Record<string, string>)[String(m.meta.shape)]!; return result(answer, shapeNames.filter((item) => item !== answer), [`Đối chiếu cạnh và góc của hình.`, `Đây là ${answer}.`], "Dùng thuộc tính xác định thay vì hướng xoay."); }
    case "SIMILARITY_THALES": { const answer = m.operation === "SIMILARITY_RATIO" ? v[1]! : m.operation === "THALES_MISSING_LENGTH" ? v[4]! : v[4]!; return result(answer, [String(v[0]! + v[1]!), String(v[3]!), String(rounded(v[4]! / v[1]!, 2))], [`Tỉ số đồng dạng là ${v[1]}.`, `${v[3]} × ${v[1]} = ${v[4]}.`], "Ghép đúng các cạnh tương ứng."); }
    case "SOLID_NET": { const solid = shapeLabel(String(m.meta.shape)); const answer = `hình khai triển hợp lệ của ${solid}`; return result(answer, ["hình bị chồng mặt khi gấp", "hình thiếu một mặt", "các mặt kề sai vị trí"], [`Đếm đủ các mặt của ${solid}.`, "Kiểm tra các mặt kề khi gấp."], "Hình khai triển hợp lệ không chồng mặt."); }
    case "SOLID_PROPERTIES": { const shape = String(m.meta.shape); const facts: Record<string, string> = { CUBE: "6 mặt vuông, 12 cạnh, 8 đỉnh", RECTANGULAR_PRISM: "6 mặt, 12 cạnh, 8 đỉnh", TRIANGULAR_PRISM: "2 đáy tam giác song song", QUADRILATERAL_PRISM: "2 đáy tứ giác song song", TRIANGULAR_PYRAMID: "đáy tam giác và 3 mặt bên", SQUARE_PYRAMID: "đáy vuông và 4 mặt bên", CONE: "một đáy tròn và một đỉnh", CYLINDER: "hai đáy tròn song song", SPHERE: "mọi điểm trên mặt cầu cách tâm bằng bán kính" }; const answer = facts[shape]!; return result(answer, ["không có mặt đáy", "mọi mặt đều là hình tròn", "chỉ có một cạnh", "không có tâm"].filter((item) => item !== answer), [`Nhận dạng ${shapeLabel(shape)}.`, `Thuộc tính đúng: ${answer}.`], "Phân biệt mặt, cạnh và đỉnh."); }
    case "SOLID_SURFACE_VOLUME": {
      const [a, b, c, d] = v; const shape = String(m.meta.shape); let answer: number;
      if (m.operation === "VOLUME") {
        answer = shape === "CYLINDER" ? rounded(3.14 * a! ** 2 * b!, 2)
          : shape === "CONE" ? rounded(3.14 * a! ** 2 * b! / 3, 2)
            : shape === "SPHERE" ? rounded(4 * 3.14 * a! ** 3 / 3, 2)
              : shape === "SQUARE_PYRAMID" ? rounded(a! ** 2 * b! / 3, 2)
                : shape === "TRIANGULAR_PRISM" ? rounded(a! * b! * c! / 2, 2)
                  : a! * b! * c!;
      } else {
        answer = shape === "CYLINDER" ? rounded(2 * 3.14 * a! * (a! + b!), 2)
          : shape === "CONE" ? rounded(3.14 * a! * (a! + c!), 2)
            : shape === "SPHERE" ? rounded(4 * 3.14 * a! ** 2, 2)
              : shape === "SQUARE_PYRAMID" ? rounded(a! ** 2 + 2 * a! * c!, 2)
                : shape === "TRIANGULAR_PRISM" ? rounded(a! * b! + (a! + b! + d!) * c!, 2)
                  : 2 * (a! * b! + b! * c! + a! * c!);
      }
      return result(answer, [String((a ?? 1) * (b ?? 1) * (c ?? 1)), String(2 * ((a ?? 0) + (b ?? 0) + (c ?? 0))), String(rounded(answer * 3, 2))].filter((item) => item !== String(answer)), [`Xác định ${shapeLabel(shape)} và đại lượng ${operationLabel(m.operation)}.`, `Dùng đúng các kích thước đã ghi, thay vào công thức được ${answer}.`], "Kiểm tra đơn vị bình phương hay lập phương.");
    }
    case "SPATIAL_POSITION": { const answer = ({ ABOVE: "ở trên", BELOW: "ở dưới", LEFT: "bên trái", RIGHT: "bên phải", BETWEEN: "ở giữa", IN_FRONT: "ở trước" } as Record<string, string>)[String(m.meta.relation)]!; return result(answer, ["ở trên", "ở dưới", "bên trái", "bên phải", "ở giữa", "ở sau"].filter((item) => item !== answer), [`Quan sát vị trí của ${String(m.meta.objectA)} so với ${String(m.meta.objectB)}.`, `Quan hệ là ${answer}.`], "Nói rõ vật nào được so với vật nào."); }
    case "SPEED_DISTANCE_TIME": { const answer = m.operation === "READ_SPEED_UNIT" ? "km/h" : v[2]!; return result(answer, ["km", "giờ", "m²", String(v[0]! + v[1]!)].filter((item) => item !== String(answer)), [m.operation === "READ_SPEED_UNIT" ? "Vận tốc là quãng đường đi trong một đơn vị thời gian." : `${v[0]} × ${v[1]} = ${v[2]} km.`], "Kiểm tra đơn vị vận tốc, thời gian và quãng đường."); }
    case "SYMMETRY_REGULARITY": { const answer = v[0]!; return result(answer, [String(v[0]! - 1), String(v[0]! + 1), "2"].filter((item) => item !== String(answer)), [`Đa giác đều ${v[0]} cạnh có ${v[0]} trục/nhịp quay tương ứng.`, `Kết quả là ${v[0]}.`], "Phân biệt phép quay với phép phản xạ."); }
    case "TIME_CALENDAR": {
      const answer = m.operation === "READ_CLOCK" ? `${v[0]}:${String(v[1]!).padStart(2, "0")}` : v[v.length - 1]!;
      return result(answer, [String(v[0]!), String(v[1] ?? 0), String(typeof answer === "number" ? answer + 1 : `${v[0]}:${String((v[1] ?? 0) + 5).padStart(2, "0")}`)], [`Dùng đúng chu kì hoặc quan hệ ${operationLabel(m.operation)}.`, `Kết quả cần chọn là ${display(answer)}.`], "Kiểm tra 7 ngày một tuần, 12 tháng một năm, 60 phút một giờ, 24 giờ một ngày và 100 năm một thế kỉ.");
    }
    case "TRIANGLE_CONGRUENCE": { const criterion = String(m.meta.criterion); return result(criterion, ["AAA", "SSA", "chỉ một cạnh", "chỉ một góc"].filter((item) => item !== criterion), [`Đối chiếu các cạnh/góc tương ứng.`, `Trường hợp hợp lệ là ${criterion}.`], "AAA chỉ chứng minh đồng dạng, không đủ cho bằng nhau."); }
    case "TRIANGLE_PROPERTIES": { const answer = m.operation === "TRIANGLE_ANGLE_SUM" ? v[2]! : m.operation === "TRIANGLE_INEQUALITY" ? "tạo được tam giác" : m.operation === "ISOSCELES_BASE_ANGLE" ? v[0]! : "đoạn vuông góc"; return result(answer, ["không tạo được tam giác", String(v[0]!), String(v[1]!), "đường xiên"].filter((item) => item !== String(answer)), [`Áp dụng ${operationLabel(m.operation)}.`, `Kết quả là ${display(answer)}.`], "Kiểm tra tổng góc hoặc bất đẳng thức tam giác."); }
    case "TRIANGLE_SPECIAL_LINES": { const names: Record<string, string> = { ALTITUDE: "đường cao", PERPENDICULAR_BISECTOR: "đường trung trực", MEDIAN: "đường trung tuyến", ANGLE_BISECTOR: "đường phân giác", ANGLE_BISECTOR_CONSTRUCTION: "dựng tia phân giác bằng hai cung tròn", SOFTWARE_CONSTRUCTION: "dựng và kiểm tra đường đặc biệt bằng công cụ hình học", INTERNAL_ANGLE_BISECTOR_THEOREM: "đường phân giác chia cạnh đối diện theo tỉ lệ hai cạnh kề" }; const answer = names[String(m.meta.line)]!; return result(answer, Object.values(names).filter((item) => item !== answer), [`Đối chiếu điểm đi qua và quan hệ vuông góc/chia đôi.`, `Kết luận đúng là ${answer}.`], "Nêu đủ điều kiện hoặc tỉ lệ của đường đặc biệt."); }
    case "UNIT_CONVERSION_MEASUREMENT": { const answer = m.operation === "READ_CENTIMETER_MEASURE" ? v[0]! : m.operation === "MULTIPLY_UNIT_FACTOR" ? v[0]! * v[1]! : rounded(v[0]! / v[1]!, 4); return result(answer, [String(v[0]! + 1), String(v[0]! * 10), String(v[0]! / 10)].filter((item) => item !== String(answer)), [m.operation === "READ_CENTIMETER_MEASURE" ? `Đoạn thẳng dài ${v[0]} cm.` : `Hệ số đổi là ${v[1]}.`, m.operation === "READ_CENTIMETER_MEASURE" ? `Số đo cần viết là ${answer} cm.` : `${m.operation === "MULTIPLY_UNIT_FACTOR" ? "Nhân" : "Chia"} để được ${answer}.`], "Chỉ đổi giữa các đơn vị cùng đại lượng."); }
    case "UNIT_FRACTION_MODEL": { const answer = reduce(1, v[1]!); return result(answer, [`${v[1]}/1`, `1/${v[1]! + 1}`, `2/${v[1]}`], [`Một trong ${v[1]} phần bằng nhau là ${display(answer)}.`], "Phân số đơn vị luôn có tử số 1."); }
    case "VIETE_RELATION": return result([{ leftId: "x1", rightId: String(Math.min(v[2]!, v[3]!)) }, { leftId: "x2", rightId: String(Math.max(v[2]!, v[3]!)) }], [`${v[0]}; ${v[1]}`, `${-v[2]}; ${-v[3]}`], [`x₁ + x₂ = ${v[0]}.`, `x₁x₂ = ${v[1]}.`, `Hai nghiệm là ${v[2]} và ${v[3]}.`], "Kiểm tra đồng thời tổng và tích.");
    case "VISUAL_OPERATION_MODEL": { const answer = m.operation === "ADD" ? v[0]! + v[1]! : m.operation === "SUBTRACT" ? v[0]! - v[1]! : m.operation === "MULTIPLY" ? v[0]! * v[1]! : v[0]! / v[1]!; return result(answer, [String(v[0]! + v[1]!), String(Math.abs(v[0]! - v[1]!)), String(v[0]! * v[1]!)].filter((item) => item !== String(answer)), [`Mô hình thể hiện ${operationLabel(m.operation)}.`, `Kết quả là ${answer}.`], "Nói xem mô hình là thêm, bớt, nhóm đều hay chia đều."); }
  }
  throw new GenerationV2Error("SOLVER_FAILED");
}

function promptFor(m: WaveDNormalizedProblemModel): string {
  const lead = LEADS[m.templateIndex]!; const context = CONTEXTS[m.contextIndex]!; const representation = REPRESENTATIONS[m.representationIndex]!; const collaborator = COLLABORATORS[m.collaboratorIndex]!; const v = m.values; const cap = m.variantId;
  const prefix = `${lead} trong ${context}, dựa trên ${representation} của bạn ${collaborator}.`;
  switch (cap) {
    case "ANGLE_MEASUREMENT": return `${prefix} Góc trong hình có số đo ${v[0]}°. ${m.operation === "READ_ANGLE" ? "Nhập số đo góc." : "Đó là loại góc nào?"}`;
    case "APPLIED_GEOMETRY_MEASUREMENT": return `${prefix} Hình chữ nhật có chiều dài ${v[0]} cm và chiều rộng ${v[1]} cm. ${m.operation === "RECTANGLE_PERIMETER" ? "Tính chu vi." : "Tính diện tích."}`;
    case "APPLIED_MEASUREMENT_MODEL": return m.operation === "SELECT_MEASURE"
      ? `${prefix} Một vật có số đo ${v[0]} ${String(m.meta.unit)}. Hãy nhập số đo đó theo đơn vị ${String(m.meta.unit)}.`
      : m.operation === "COMBINE_MEASURES"
        ? `${prefix} Hai số đo cùng đơn vị là ${v[0]} ${String(m.meta.unit)} và ${v[1]} ${String(m.meta.unit)}. Cộng hai số đo và ghi kết quả theo ${String(m.meta.unit)}.`
        : `${prefix} Hai số đo là ${v[0]} ${String(m.meta.unit)} và ${v[1]} ${String(m.meta.unit)}. Cộng chúng rồi đổi sang ${String(m.meta.targetUnit)}, biết 1 ${String(m.meta.targetUnit)} = ${v[2]} ${String(m.meta.unit)}.`;
    case "APPLIED_RATIONAL_REASONING": return `${prefix} Một vị trí ${v[0]! < 0 ? "giảm" : "tăng"} ${Math.abs(v[0]!)}/${v[1]} m. Viết độ thay đổi có dấu dưới dạng phân số tối giản.`;
    case "AREA_PERIMETER": return `${prefix} Mô hình có các kích thước ${v.map((value) => `${value} cm`).join("; ")}. Tính ${m.operation === "RECTANGLE_AREA" ? "diện tích hình chữ nhật" : m.operation === "TRIANGLE_AREA" ? "diện tích tam giác" : "diện tích hình thang"}.`;
    case "CIRCLE_ANGLE_RELATION": return m.operation === "IDENTIFY_CIRCLE_ANGLE"
      ? `${prefix} Góc có đỉnh nằm trên đường tròn và hai cạnh chứa hai dây cung. Hãy gọi tên góc.`
      : m.operation === "CENTRAL_FROM_INSCRIBED"
        ? `${prefix} Một góc nội tiếp chắn cung đã cho có số đo ${v[0]}°. Tính góc ở tâm cùng chắn cung.`
        : `${prefix} Góc ở tâm chắn cung đã cho có số đo ${v[1]}°. Tính góc nội tiếp cùng chắn cung.`;
    case "CIRCLE_INSCRIBED_CIRCUMSCRIBED": return m.operation === "INCENTER_DEFINITION"
      ? `${prefix} Trong một tam giác, tâm đường tròn nội tiếp là giao điểm của những đường nào?`
      : m.operation === "CIRCUMCENTER_DEFINITION"
        ? `${prefix} Trong một tam giác, tâm đường tròn ngoại tiếp là giao điểm của những đường nào?`
        : m.operation === "CYCLIC_QUADRILATERAL_ANGLE"
          ? `${prefix} Một tứ giác nội tiếp có một góc bằng ${v[1]}°. Tính số đo góc đối diện.`
          : m.operation === "RECTANGLE_CIRCUMRADIUS"
            ? `${prefix} Hình chữ nhật nội tiếp đường tròn có đường chéo dài ${v[0]} cm. Tính bán kính đường tròn ngoại tiếp.`
            : m.operation === "RIGHT_TRIANGLE_CIRCUMRADIUS"
              ? `${prefix} Tam giác vuông có cạnh huyền dài ${v[0]} cm. Tính bán kính đường tròn ngoại tiếp.`
              : `${prefix} Tam giác đều có cạnh dài ${v[0]} cm. Tính bán kính đường tròn nội tiếp và làm tròn đến hai chữ số thập phân.`;
    case "CIRCLE_MEASURE": return m.operation === "ANNULUS_AREA"
      ? `${prefix} Một vành khuyên có bán kính ngoài ${v[0]} cm và bán kính trong ${v[2]} cm. Tính diện tích với π=3,14.`
      : m.operation === "ARC_LENGTH" || m.operation === "SECTOR_AREA"
        ? `${prefix} Đường tròn có bán kính ${v[0]} cm và góc ở tâm ${v[1]}°. Tính ${operationLabel(m.operation)} với π=3,14.`
        : `${prefix} Đường tròn có bán kính ${v[0]} cm. Tính ${operationLabel(m.operation)} với π=3,14.`;
    case "CIRCLE_RELATION": return m.operation === "TANGENT_PROPERTY"
      ? `${prefix} Chọn tất cả tính chất đúng của tiếp tuyến và bán kính đi qua tiếp điểm.`
      : m.operation === "CIRCLE_SYMMETRY"
        ? `${prefix} Chọn tất cả tính chất đối xứng đúng của đường tròn.`
        : m.operation === "CHORD_DIAMETER_COMPARE"
          ? `${prefix} Chọn kết luận đúng khi so sánh độ dài một dây bất kỳ với đường kính của cùng đường tròn.`
          : m.operation === "LINE_CIRCLE_POSITION"
            ? `${prefix} Đường tròn có bán kính ${v[0]} cm; khoảng cách từ tâm đến đường thẳng là ${v[2]} cm. Xác định vị trí tương đối của đường thẳng và đường tròn.`
            : `${prefix} Hai đường tròn có bán kính ${v[0]} cm và ${v[1]} cm; khoảng cách hai tâm là ${v[2]} cm. Xác định vị trí tương đối của hai đường tròn.`;
    case "COORDINATE_POINT": return `${prefix} Điểm M có hoành độ ${v[0]} và tung độ ${v[1]}. Ghép đúng hai tọa độ.`;
    case "DIRECT_MEASUREMENT_ESTIMATION": return `${prefix} ${String(m.meta.instrument).replace(/^./u, (letter) => letter.toLocaleUpperCase("vi"))} chỉ ${v[0]} ${String(m.meta.unit)}. ${m.interactionType === "SINGLE_CHOICE" ? "Chọn số đo phù hợp." : "Nhập số đo phù hợp."}`;
    case "DIVISION_REMAINDER": return `${prefix} Thực hiện phép chia ${v[0]} cho ${v[1]}. Xác định thương và số dư.`;
    case "EARLY_ARITHMETIC_APPLICATION": return `${prefix} Có ${v[0]} ${String(m.meta.object)}${m.operation === "ADD" ? ` và thêm ${v[1]}` : ""}. Có tất cả bao nhiêu?`;
    case "FUNCTION_MODEL_RECOGNITION": return `${prefix} Bảng có các cặp (${v[0]};${v[1]}) và (${v[2]};${v[3]}). Quan hệ này có phải hàm số không?`;
    case "GEOMETRIC_CONSTRUCTION_PLAN": return m.interactionType === "CONSTRUCTION_OR_VISUAL_SELECTION"
      ? `${prefix} Chọn phương án nêu đầy đủ các bước ${String(m.meta.constructionLabel)} theo đúng thứ tự.`
      : `${prefix} Sắp xếp các bước ${String(m.meta.constructionLabel)} theo thứ tự hợp lệ.`;
    case "GEOMETRIC_PROOF_REASONING": return `${prefix} Sắp xếp giả thiết, định nghĩa, suy luận và kết luận cho chứng minh hình học trong sơ đồ.`;
    case "LINEAR_EQUATION_MODEL": return `${prefix} Giải phương trình ${v[0]}x ${v[1]! >= 0 ? "+" : "−"} ${Math.abs(v[1]!)} = ${v[2]}.`;
    case "LINEAR_FUNCTION_MODEL": return `${prefix} Hàm số y=${v[0]}x${v[1]! >= 0 ? "+" : ""}${v[1]}. Tính y khi x=${v[2]}.`;
    case "LINEAR_GRAPH_CONSTRUCTION": return `${prefix} Chọn đồ thị của y=${v[0]}x${v[1]! >= 0 ? "+" : ""}${v[1]} dựa trên hai điểm đã cho.`;
    case "LINEAR_GRAPH_RELATION": return `${prefix} Hai đường có hệ số góc ${v[0]} và ${v[2]}. ${m.operation === "READ_SLOPE" ? "Nêu hệ số góc đường thứ nhất." : "Chúng song song hay cắt nhau?"}`;
    case "LINE_RELATION": return `${prefix} Hai đường trong hình có dữ kiện góc ${v[0]}° và quan hệ hình học đã đánh dấu. Chọn quan hệ đúng.`;
    case "MONEY_FINANCE": {
      if (m.operation === "DENOMINATION") return `${prefix} Quan sát hình tờ tiền và chọn đúng mệnh giá.`;
      if (m.operation === "CHANGE") return `${prefix} Đơn giá ${v[0].toLocaleString("vi-VN")} đồng, số lượng ${v[1]}, số tiền đưa ${v[2].toLocaleString("vi-VN")} đồng. Tính tiền thừa.`;
      if (m.operation === "PURCHASE_TOTAL") return `${prefix} Một sản phẩm giá ${v[0].toLocaleString("vi-VN")} đồng. Tính số tiền mua ${v[1]} sản phẩm.`;
      if (m.operation === "MAX_QUANTITY") return `${prefix} Có ${v[0].toLocaleString("vi-VN")} đồng, mỗi sản phẩm giá ${v[1].toLocaleString("vi-VN")} đồng. Mua được nhiều nhất bao nhiêu sản phẩm?`;
      if (m.operation === "PROFIT_OR_LOSS") return `${prefix} Giá mua là ${v[0].toLocaleString("vi-VN")} đồng và giá bán là ${v[1].toLocaleString("vi-VN")} đồng. Tính lãi hoặc lỗ; nhập số dương nếu lãi, số âm nếu lỗ.`;
      if (m.operation === "SIMPLE_INTEREST") return `${prefix} Tiền gốc ${v[0].toLocaleString("vi-VN")} đồng, lãi suất một kì ${v[3]}%. Tính tiền lãi của một kì.`;
      if (m.operation === "INTEREST_RATE") return `${prefix} Tiền gốc ${v[0].toLocaleString("vi-VN")} đồng, tiền lãi một kì ${v[1].toLocaleString("vi-VN")} đồng. Tính lãi suất của một kì.`;
      if (m.operation === "DEBT_BALANCE") return `${prefix} Dư nợ đầu kì là ${v[0].toLocaleString("vi-VN")} đồng và đã trả ${v[1].toLocaleString("vi-VN")} đồng. Tính dư nợ còn lại.`;
      if (m.operation === "TRANSACTION_BALANCE" || m.operation === "BANK_STATEMENT_BALANCE") return `${prefix} Số dư đầu kì ${v[0].toLocaleString("vi-VN")} đồng, tiền vào ${v[1].toLocaleString("vi-VN")} đồng và tiền ra ${v[2].toLocaleString("vi-VN")} đồng. Tính số dư cuối kì.`;
      if (m.operation === "PAYMENT_METHOD") return `${prefix} Tình huống: ${PAYMENT_SCENARIOS[v[0]!]!.prompt}. Chọn hình thức thanh toán phù hợp nhất.`;
      throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
    }
    case "NATURAL_NUMBER_STRUCTURE": return `${prefix} Với số ${v[0]} và hàng ${v[1]}, hãy tìm ${m.operation === "SUCCESSOR" ? "số liền sau" : "giá trị của chữ số ở hàng đó"}.`;
    case "NUMBER_LINE_PLACEMENT": return `${prefix} Tia số bắt đầu ở ${v[0]}, mỗi vạch tăng ${v[1]}. Số ở vạch thứ ${v[2]} là bao nhiêu?`;
    case "POINT_LINE_RELATION": return `${prefix} Quan sát các điểm trên mô hình có mốc ${v[0]} và ${v[1]}. Chọn quan hệ điểm–đường đúng.`;
    case "POLYGON_PROPERTIES": return m.operation === "SELECT_GRID_DRAWING"
      ? `${prefix} Chọn cách vẽ ${shapeLabel(String(m.meta.shape))} có các đỉnh đặt đúng trên giao điểm lưới.`
      : m.operation === "SELECT_HEXAGON_ASSEMBLY"
        ? `${prefix} Chọn cách ghép các tam giác đều để tạo thành hình lục giác đều.`
        : m.operation === "QUADRILATERAL_ANGLE_SUM"
          ? `${prefix} Chọn kết luận đúng về tổng các góc trong một tứ giác lồi.`
          : m.operation === "IDENTIFY_SUFFICIENT_CONDITION"
            ? `${prefix} Chọn dấu hiệu đủ để nhận biết ${shapeLabel(String(m.meta.shape))}.`
            : `${prefix} ${shapeLabel(String(m.meta.shape))} đã được xoay. Chọn thuộc tính xác định đúng của hình.`;
    case "POLYLINE_PERIMETER": return `${prefix} Đường gấp khúc có các đoạn dài ${v.map((value) => `${value} cm`).join("; ")}. Tính tổng độ dài.`;
    case "POLYNOMIAL_REASONING": return `${prefix} Với P(x)=${v[0]}x²${v[1]! >= 0 ? "+" : ""}${v[1]}x${v[2]! >= 0 ? "+" : ""}${v[2]} và x=${v[3]}, hãy ${operationLabel(m.operation)}.`;
    case "PYTHAGORE_APPLICATION": return m.operation === "FIND_HYPOTENUSE"
      ? `${prefix} Tam giác vuông có hai cạnh góc vuông dài ${v[0]} m và ${v[1]} m. Dùng định lí Pythagore tìm cạnh huyền.`
      : `${prefix} Tam giác vuông có một cạnh góc vuông dài ${v[0]} m và cạnh huyền dài ${v[2]} m. Dùng định lí Pythagore tìm cạnh góc vuông còn lại.`;
    case "QUADRATIC_GRAPH_CONSTRUCTION": return `${prefix} Chọn parabol y=${v[0]}(x ${v[1]! >= 0 ? "−" : "+"} ${Math.abs(v[1]!)})² ${v[2]! >= 0 ? "+" : "−"} ${Math.abs(v[2]!)} từ đỉnh và chiều mở.`;
    case "RIGHT_TRIANGLE_TRIGONOMETRY": return m.operation === "FIND_SIDE_BY_RATIO"
      ? `${prefix} Tam giác vuông có một cạnh góc vuông dài ${v[0]} và cạnh huyền dài ${v[2]}. Dùng hệ thức lượng để tìm cạnh góc vuông còn lại.`
      : `${prefix} Xét góc A của tam giác vuông: cạnh đối diện góc A dài ${v[0]}, cạnh kề góc A dài ${v[1]} và cạnh huyền dài ${v[2]}. Tính ${operationLabel(m.operation)} của góc A.`;
    case "SHAPE_CLASSIFICATION": return `${prefix} Hình được mô tả trong sơ đồ. Chọn đúng tên hình theo cạnh và góc, không theo hướng xoay.`;
    case "SIMILARITY_THALES": return m.operation === "SIMILARITY_RATIO"
      ? `${prefix} Hai hình đồng dạng có một cặp cạnh tương ứng dài ${v[0]} và ${v[2]}. Tìm tỉ số đồng dạng từ hình thứ nhất sang hình thứ hai.`
      : `${prefix} Hai hình đồng dạng theo tỉ số từ hình thứ nhất sang hình thứ hai là ${v[1]}. Một cạnh của hình thứ nhất dài ${v[3]}. Tìm độ dài cạnh tương ứng ở hình thứ hai.`;
    case "SOLID_NET": return `${prefix} Chọn hình khai triển có đủ mặt và quan hệ kề đúng cho ${shapeLabel(String(m.meta.shape))}.`;
    case "SOLID_PROPERTIES": return `${prefix} Quan sát ${shapeLabel(String(m.meta.shape))}. Chọn mô tả đúng về mặt, cạnh, đỉnh hoặc yếu tố đặc trưng.`;
    case "SOLID_SURFACE_VOLUME": return `${prefix} ${shapeLabel(String(m.meta.shape)).replace(/^./u, (letter) => letter.toLocaleUpperCase("vi"))} có ${m.labels.map((label, index) => `${label} ${v[index]} cm`).join(", ")}. Tính ${m.operation === "VOLUME" ? "thể tích (cm³)" : "diện tích toàn phần (cm²)"}${["CYLINDER", "CONE", "SPHERE"].includes(String(m.meta.shape)) ? " với π=3,14" : ""}.`;
    case "SPATIAL_POSITION": return `${prefix} Trong sơ đồ, ${String(m.meta.objectA)} có vị trí nào so với ${String(m.meta.objectB)}?`;
    case "SPEED_DISTANCE_TIME": return `${prefix} Chuyển động có vận tốc ${v[0]} km/h trong ${v[1]} giờ. ${m.operation === "READ_SPEED_UNIT" ? "Chọn đơn vị vận tốc." : "Tính quãng đường."}`;
    case "SYMMETRY_REGULARITY": return `${prefix} Đa giác đều có ${v[0]} cạnh. Xác định ${m.operation === "SYMMETRY_AXES" ? "số trục đối xứng" : "bậc đối xứng quay"}.`;
    case "TIME_CALENDAR": {
      if (m.operation === "READ_CLOCK") return `${prefix} Đồng hồ chỉ ${v[0]} giờ ${v[1]} phút. Viết thời điểm theo dạng giờ:phút.`;
      if (m.operation === "WEEKDAY_SEQUENCE" || m.operation === "WEEKDAY_OFFSET") return `${prefix} Quy ước thứ Hai là 1, ..., Chủ nhật là 7. Bắt đầu ở ngày ${v[0]}, sau ${v[1]} ngày là ngày số mấy?`;
      if (m.operation === "MONTH_DAYS") return `${prefix} Trong năm thường, tháng ${v[0]} có bao nhiêu ngày?`;
      if (m.operation === "MONTH_SEQUENCE") return `${prefix} Bắt đầu ở tháng ${v[0]}, sau ${v[1]} tháng là tháng mấy?`;
      if (m.operation === "HOUR_DAY_RELATION") return `${prefix} Đổi ${v[0]} ${String(m.meta.relation) === "DAY_TO_HOUR" ? "ngày sang giờ" : "giờ sang phút"}.`;
      return `${prefix} Đổi ${v[0]} thế kỉ sang năm.`;
    }
    case "TRIANGLE_CONGRUENCE": return `${prefix} Hai tam giác có dữ kiện cạnh–góc được đánh dấu. Chọn trường hợp bằng nhau hợp lệ.`;
    case "TRIANGLE_PROPERTIES": return m.operation === "TRIANGLE_ANGLE_SUM"
      ? `${prefix} Tam giác có hai góc ${v[0]}° và ${v[1]}°. Tìm góc còn lại.`
      : m.operation === "ISOSCELES_BASE_ANGLE"
        ? `${prefix} Tam giác cân có góc ở đỉnh ${v[1]}°. Tìm số đo mỗi góc ở đáy.`
        : m.operation === "TRIANGLE_INEQUALITY"
          ? `${prefix} Ba đoạn thẳng dài ${v[0]} cm, ${v[1]} cm và ${v[2]} cm. Chúng có tạo thành một tam giác không?`
          : `${prefix} Từ điểm đã cho đến đường thẳng, chọn đoạn biểu diễn khoảng cách ngắn nhất.`;
    case "TRIANGLE_SPECIAL_LINES": return `${prefix} Đoạn thẳng trong tam giác có dấu hiệu tương ứng. Đó là đường đặc biệt nào?`;
    case "UNIT_CONVERSION_MEASUREMENT": return m.operation === "READ_CENTIMETER_MEASURE"
      ? `${prefix} Một đoạn thẳng dài ${v[0]} cm. Hãy viết số đo của đoạn thẳng theo xăng-ti-mét (cm).`
      : `${prefix} Đổi ${v[0]} ${String(m.meta.unit)} sang ${String(m.meta.targetUnit)} bằng cách ${m.operation === "MULTIPLY_UNIT_FACTOR" ? "nhân" : "chia"} với hệ số ${v[1]}.`;
    case "UNIT_FRACTION_MODEL": return `${prefix} Một hình được chia thành ${v[1]} phần bằng nhau và chọn một phần. Viết phân số đơn vị.`;
    case "VIETE_RELATION": return `${prefix} Hai nghiệm có tổng ${v[0]} và tích ${v[1]}. Ghép đúng x₁, x₂.`;
    case "VISUAL_OPERATION_MODEL": return `${prefix} Mô hình ${String(m.meta.object)} biểu diễn ${operationLabel(m.operation)} với các số ${v.join(" và ")}. Tính kết quả.`;
  }
  throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
}

function semanticLabels(answer: CanonicalResponse): string[] {
  if (Array.isArray(answer)) {
    if (answer.every((item) => typeof item === "string")) return [...answer];
    return answer.map((pair) => `${pair.leftId}=${pair.rightId}`);
  }
  return [display(answer)];
}

function adaptSolution(m: WaveDNormalizedProblemModel, semantic: SemanticSolution, random: Random): WaveDSolution {
  const misconception: MisconceptionCode = m.profile === "MEASUREMENT" ? "UNIT_CONVERSION_ERROR" : m.profile === "ALGEBRA" ? "ALGEBRAIC_SIGN_ERROR" : m.profile === "COORDINATE" ? "GRAPH_INTERPRETATION_ERROR" : m.variantId.includes("AREA") ? "PERIMETER_AREA_CONFUSION" : "DATA_RELATION_IGNORED";
  if (m.interactionType === "SINGLE_CHOICE" || m.interactionType === "CONSTRUCTION_OR_VISUAL_SELECTION") {
    const correctLabel = display(semantic.answer); const labels = [...new Set([correctLabel, ...semantic.distractors.filter((item) => item !== correctLabel)])].slice(0, 4);
    while (labels.length < 4) labels.push(`${correctLabel} — phương án khác ${labels.length + 1}`);
    const options = random.shuffle(labels.map((label) => ({ id: `o-${hash(`${m.outcomeId}:${label}`).slice(0, 8)}`, label })));
    const correct = options.find((option) => option.label === correctLabel)!.id;
    return { correct, accepted: [correct], steps: semantic.steps, nextStep: semantic.nextStep, options, optionMisconceptions: Object.fromEntries(options.filter((option) => option.id !== correct).map((option) => [option.id, misconception])) };
  }
  if (m.interactionType === "MULTI_SELECT") {
    const correctLabels = [...new Set(semanticLabels(semantic.answer))]; const allLabels = [...new Set([...correctLabels, ...semantic.distractors.filter((item) => !correctLabels.includes(item))])].slice(0, Math.max(4, correctLabels.length + 2));
    const options = random.shuffle(allLabels.map((label) => ({ id: `o-${hash(`${m.outcomeId}:${label}`).slice(0, 8)}`, label })));
    const correct = correctLabels.map((label) => options.find((option) => option.label === label)!.id);
    return { correct, accepted: [correct], steps: semantic.steps, nextStep: semantic.nextStep, options, optionMisconceptions: Object.fromEntries(options.filter((option) => !correct.includes(option.id)).map((option) => [option.id, misconception])) };
  }
  if (m.interactionType === "ORDERING") {
    const orderedLabels = semanticLabels(semantic.answer); const options = orderedLabels.map((label) => ({ id: `o-${hash(`${m.outcomeId}:${label}`).slice(0, 8)}`, label })); const correct = options.map((option) => option.id);
    return { correct, accepted: [correct], steps: semantic.steps, nextStep: semantic.nextStep, options };
  }
  if (m.interactionType === "MATCHING") {
    const pairs: readonly MatchingPair[] = Array.isArray(semantic.answer) && semantic.answer.every((item) => typeof item !== "string") ? semantic.answer : [{ leftId: "result", rightId: display(semantic.answer) }];
    const leftItems = pairs.map((pair) => ({ id: pair.leftId, label: pair.leftId === "x1" ? "x₁" : pair.leftId === "x2" ? "x₂" : pair.leftId === "result" ? "kết quả" : pair.leftId }));
    const rightItems = [...new Map([
      ...pairs.map((pair) => ({ id: pair.rightId, label: pair.rightId })),
      ...semantic.distractors.slice(0, 3).map((label) => ({ id: label, label })),
    ].map((item) => [item.id, item])).values()];
    return { correct: pairs, accepted: [pairs], steps: semantic.steps, nextStep: semantic.nextStep, leftItems, rightItems };
  }
  let correct = semantic.answer;
  let convertedRationalToNumericInput = false;
  if (m.interactionType === "FRACTION_INPUT" && (typeof correct === "number" || typeof correct === "string")) correct = reduce(Number(correct), 1);
  if ((m.interactionType === "INTEGER_INPUT" || m.interactionType === "DECIMAL_INPUT") && typeof correct !== "number") {
    const rational = !Array.isArray(correct) && typeof correct === "object" ? correct as FractionValue : null;
    const parsed = rational ? rational.numerator / rational.denominator : Number(display(correct).replace(",", "."));
    if (Number.isFinite(parsed)) {
      correct = parsed;
      convertedRationalToNumericInput = rational !== null;
    }
  }
  if ((m.interactionType === "SHORT_STRUCTURED_RESPONSE" || m.interactionType === "TABLE_OR_CHART_RESPONSE") && typeof correct !== "string") correct = display(correct);
  const accepted: CanonicalResponse[] = [correct];
  // Numeric text is normalized by the shared validator. Keeping both a number
  // and its equivalent text here would violate the single canonical-answer
  // invariant after a rational answer is adapted to DECIMAL_INPUT.
  if (typeof correct === "number" && !convertedRationalToNumericInput) accepted.push(String(correct).replace(".", ","));
  return { correct, accepted, steps: semantic.steps, nextStep: semantic.nextStep };
}

function publicValuesFor(m: WaveDNormalizedProblemModel): readonly number[] {
  const v = m.values;
  switch (m.variantId) {
    case "CIRCLE_ANGLE_RELATION": return m.operation === "IDENTIFY_CIRCLE_ANGLE" ? [] : m.operation === "CENTRAL_FROM_INSCRIBED" ? [v[0]!] : [v[1]!];
    case "DIVISION_REMAINDER": return v.slice(0, 2);
    case "LINEAR_EQUATION_MODEL": return v.slice(0, 3);
    case "LINEAR_FUNCTION_MODEL": return v.slice(0, 3);
    case "MONEY_FINANCE": {
      if (m.operation === "DENOMINATION") return [v[0]!];
      if (m.operation === "SIMPLE_INTEREST") return [v[0]!, v[3]!];
      if (m.operation === "INTEREST_RATE") return [v[0]!, v[1]!];
      if (m.operation === "PAYMENT_METHOD") return [];
      return v;
    }
    case "NUMBER_LINE_PLACEMENT": return v.slice(0, 3);
    case "PYTHAGORE_APPLICATION": return m.operation === "FIND_HYPOTENUSE" ? [v[0]!, v[1]!] : [v[0]!, v[2]!];
    case "RIGHT_TRIANGLE_TRIGONOMETRY": return m.operation === "FIND_SIDE_BY_RATIO" ? [v[0]!, v[2]!] : v;
    case "SIMILARITY_THALES": return m.operation === "SIMILARITY_RATIO" ? [v[0]!, v[2]!] : v.slice(0, 4);
    case "SPEED_DISTANCE_TIME": return v.slice(0, 2);
    case "TRIANGLE_PROPERTIES": return m.operation === "TRIANGLE_ANGLE_SUM" ? v.slice(0, 2) : m.operation === "ISOSCELES_BASE_ANGLE" ? [v[1]!] : v;
    case "VIETE_RELATION": return v.slice(0, 2);
    case "TIME_CALENDAR": return m.operation === "READ_CLOCK" ? v : m.operation === "MONTH_DAYS" || m.operation === "CENTURY_RELATION" ? [v[0]!] : v.slice(0, 2);
    default: return v;
  }
}

function visualFor(m: WaveDNormalizedProblemModel): ProductVisual {
  const expected = WAVE_D_CAPABILITY_METADATA[m.variantId].visualType; const v = publicValuesFor(m);
  if (expected === "OBJECT_GROUPS") return { type: expected, description: `Các nhóm ${String(m.meta.object)} biểu diễn đúng ${operationLabel(m.operation)} với ${v.join(" và ")}.`, data: { operation: m.operation, values: v, object: m.meta.object, groups: v } };
  if (expected === "NUMBER_LINE") return { type: expected, description: "Trục số có mốc, bước và điểm cần đọc khớp dữ kiện.", data: { minimum: Math.min(0, ...v), maximum: Math.max(...v, 1), values: v, marked: v[0], operation: m.operation } };
  if (expected === "FRACTION_MODEL") return { type: expected, description: `Thanh phân số gồm ${v[1]} phần bằng nhau và tô một phần.`, data: { modelType: "SEGMENTED_BAR", totalParts: v[1], selectedParts: 1, highlightedParts: [0] } };
  if (expected === "PLACE_VALUE_CHART") return { type: expected, description: "Bảng hàng số dùng đúng số và giá trị hàng trong đề.", data: { columns: ["Trăm nghìn", "Chục nghìn", "Nghìn", "Trăm", "Chục", "Đơn vị"], values: [v[0]], place: v[1] } };
  if (expected === "DATA_TABLE") {
    if (m.variantId === "MONEY_FINANCE" && m.operation === "DENOMINATION") return { type: expected, description: "Hình mô phỏng một tờ tiền Việt Nam với mệnh giá được in rõ ràng.", data: { rows: [{ name: "Tờ tiền", value: v[0] }], operation: m.operation, currency: "đồng" } };
    if (m.variantId === "MONEY_FINANCE") {
      const names = m.operation === "SIMPLE_INTEREST" ? ["Tiền gốc", "Lãi suất một kì"]
        : m.operation === "INTEREST_RATE" ? ["Tiền gốc", "Tiền lãi một kì"]
          : m.operation === "PAYMENT_METHOD" ? ["Tình huống"]
            : m.operation === "TRANSACTION_BALANCE" || m.operation === "BANK_STATEMENT_BALANCE" ? ["Số dư đầu kì", "Tiền vào", "Tiền ra"]
              : m.operation === "PROFIT_OR_LOSS" ? ["Giá mua", "Giá bán"]
                : m.operation === "DEBT_BALANCE" ? ["Dư nợ đầu kì", "Đã trả"]
                  : m.operation === "MAX_QUANTITY" ? ["Ngân sách", "Đơn giá"]
                    : m.operation === "PURCHASE_TOTAL" ? ["Đơn giá", "Số lượng"] : ["Đơn giá", "Số lượng", "Số tiền đưa"];
      const values = m.operation === "PAYMENT_METHOD" ? [PAYMENT_SCENARIOS[m.values[0]!]!.prompt] : v;
      return { type: expected, description: "Bảng giao dịch công khai chứa đúng dữ kiện cần tính, không chứa kết quả suy ra.", data: { rows: names.map((name, index) => ({ name, value: values[index] ?? "?" })), operation: m.operation, currency: "đồng" } };
    }
    return { type: expected, description: "Bảng dữ liệu công khai chứa đúng đại lượng đã nêu, không chứa đáp án suy ra.", data: { rows: m.labels.length ? m.labels.map((label, index) => ({ name: label, value: v[index] ?? "?" })) : v.slice(0, Math.max(2, v.length - 1)).map((value, index) => ({ name: `Dữ kiện ${index + 1}`, value })), operation: m.operation } };
  }
  if (expected === "COORDINATE_GRAPH") return { type: expected, description: "Hệ trục và các ứng viên dùng cùng hệ số, tọa độ với mô hình.", data: { graphKind: m.meta.graphKind ?? m.operation, values: v, point: m.variantId === "COORDINATE_POINT" ? [v[0], v[1]] : null, slope: v[0] ?? null, intercept: v[1] ?? null, vertex: m.variantId === "QUADRATIC_GRAPH_CONSTRUCTION" ? [v[1], v[2]] : null, candidateGraphs: [{ id: "g1", kind: m.variantId === "QUADRATIC_GRAPH_CONSTRUCTION" ? "PARABOLA" : "LINE", values: v }, { id: "g2", kind: "DISTRACTOR_SIGN", values: v.map((value) => -value) }, { id: "g3", kind: "DISTRACTOR_SWAP", values: [...v].reverse() }, { id: "g4", kind: "DISTRACTOR_AXIS", values: v }] } };
  if (expected === "MEASUREMENT_MODEL") return { type: expected, description: "Mô hình đo ghi đủ kích thước và đơn vị từ normalized model.", data: { values: v, operation: m.operation, unit: m.meta.unit ?? "đơn vị", targetUnit: m.meta.targetUnit ?? null, scale: m.scale, shape: m.meta.shape ?? "MEASURE" } };
  if (expected === "AREA_MODEL") return { type: expected, description: "Sơ đồ diện tích/đường tròn có kích thước khớp đề bài.", data: { values: v, operation: m.operation, shape: m.meta.shape ?? "AREA", unit: m.meta.unit ?? "cm" } };
  if (expected === "SHAPE_DIAGRAM") return { type: expected, description: "Sơ đồ hình học sinh từ cùng quan hệ, kích thước và nhãn với solver.", data: { shape: m.meta.shape ?? m.variantId, relation: m.meta.relation ?? null, line: m.meta.line ?? null, theorem: m.meta.theorem ?? null, criterion: m.meta.criterion ?? null, values: v, operation: m.operation, orientation: m.contextIndex % 8 } };
  return { type: "NONE", description: "Câu hỏi không cần hình làm bằng chứng.", data: {} };
}

function interactionFor(m: WaveDNormalizedProblemModel, solution: WaveDSolution, random: Random): ProductInteractionContract {
  if (m.interactionType === "SINGLE_CHOICE" || m.interactionType === "CONSTRUCTION_OR_VISUAL_SELECTION") return { type: m.interactionType, options: solution.options, choiceCount: 1 };
  if (m.interactionType === "MULTI_SELECT") return { type: "MULTI_SELECT", options: solution.options, choiceCount: Array.isArray(solution.correct) ? solution.correct.length : 1 };
  if (m.interactionType === "ORDERING") return { type: "ORDERING", options: random.shuffle(solution.options ?? []) };
  if (m.interactionType === "MATCHING") return { type: "MATCHING", leftItems: solution.leftItems, rightItems: random.shuffle(solution.rightItems ?? []) };
  if (m.interactionType === "FRACTION_INPUT") return { type: "FRACTION_INPUT", inputLabel: "Phân số tối giản", inputMode: "text" };
  if (m.interactionType === "DECIMAL_INPUT") return { type: "DECIMAL_INPUT", inputLabel: "Kết quả", inputMode: "decimal" };
  if (m.interactionType === "SHORT_STRUCTURED_RESPONSE") return { type: "SHORT_STRUCTURED_RESPONSE", inputLabel: "Biểu thức hoặc kết luận", inputMode: "text" };
  if (m.interactionType === "TABLE_OR_CHART_RESPONSE") return { type: "TABLE_OR_CHART_RESPONSE", inputLabel: "Giá trị", inputMode: "text" };
  return { type: "INTEGER_INPUT", inputLabel: "Kết quả", inputMode: "numeric" };
}

function validateModel(contract: WaveDOutcomeContract, model: WaveDNormalizedProblemModel, solution: WaveDSolution, prompt: string, interaction: ProductInteractionContract, visual: ProductVisual) {
  if (model.outcomeId !== contract.outcomeId || model.grade !== contract.grade || model.variantId !== contract.canonicalVariantId || model.engineVersion !== WAVE_D_ENGINE_VERSION) throw new GenerationV2Error("VALIDATION_FAILED");
  if (prompt !== promptFor(model) || interaction.type !== model.interactionType) throw new GenerationV2Error("VALIDATION_FAILED");
  if (model.values.some((value) => !Number.isFinite(value) || Math.abs(value) > Math.max(10_000_000, contract.parameterBounds.maximum))) throw new GenerationV2Error("VALIDATION_FAILED");
  if (model.values.some((value) => !Number.isInteger(value) && model.variantId !== "POINT_LINE_RELATION")) throw new GenerationV2Error("VALIDATION_FAILED");
  if (visual.type !== WAVE_D_CAPABILITY_METADATA[model.variantId].visualType) throw new GenerationV2Error("VALIDATION_FAILED");
  const semantic = solveModel(model); const replay = adaptSolution(model, semantic, new Random(`${contract.outcomeId}:${model.difficulty}:validation`));
  if (["SINGLE_CHOICE", "CONSTRUCTION_OR_VISUAL_SELECTION", "MULTI_SELECT"].includes(model.interactionType)) {
    const correctLabels = model.interactionType === "MULTI_SELECT" ? semanticLabels(semantic.answer) : [display(semantic.answer)]; const actualLabels = interaction.options?.filter((option) => Array.isArray(solution.correct) ? (solution.correct as readonly string[]).includes(option.id) : option.id === solution.correct).map((option) => option.label) ?? [];
    if (JSON.stringify([...actualLabels].sort()) !== JSON.stringify([...correctLabels].sort())) throw new GenerationV2Error("VALIDATION_FAILED");
  } else if (normalize(replay.correct) !== normalize(solution.correct)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (interaction.options) {
    const ids = interaction.options.map((option) => option.id); const labels = interaction.options.map((option) => option.label);
    if (new Set(ids).size !== ids.length || new Set(labels).size !== labels.length) throw new GenerationV2Error("VALIDATION_FAILED");
  }
  const publicText = JSON.stringify({ prompt, interaction, visual });
  for (const forbidden of ["correctResponse", "acceptedResponses", "privateSolution", "solverReceipt", "rawSeed"]) if (publicText.includes(forbidden)) throw new GenerationV2Error("VALIDATION_FAILED");
  return { ok: true as const, checks: ["EXPLICIT_OUTCOME_CONTRACT", "INDEPENDENT_SOLVER_RECOMPUTATION", "UNIQUE_OR_EXPLICIT_ACCEPTED_ANSWER", "GRADE_AND_DOMAIN_BOUNDS", "PROMPT_MODEL_ALIGNMENT", "VISUAL_MODEL_ALIGNMENT", "DISTRACTOR_FALSEHOOD_AND_UNIQUENESS", "NO_PRIVATE_LEAK"] };
}

function responseInstruction(interaction: ProductInteractionContract) {
  if (interaction.type === "ORDERING") return "Sắp xếp các bước theo thứ tự hợp lệ.";
  if (interaction.type === "MATCHING") return "Ghép từng đại lượng với giá trị đúng.";
  if (interaction.type === "FRACTION_INPUT") return "Nhập tử số và mẫu số; phân số tương đương được chuẩn hóa.";
  if (interaction.type === "SINGLE_CHOICE" || interaction.type === "CONSTRUCTION_OR_VISUAL_SELECTION") return "Chọn một phương án.";
  if (interaction.type === "MULTI_SELECT") return "Chọn tất cả phương án đúng.";
  if (interaction.type === "SHORT_STRUCTURED_RESPONSE") return "Nhập biểu thức hoặc kết luận theo mẫu trong đề.";
  return "Nhập giá trị chính xác.";
}

export function generateWaveDQuestion(contract: WaveDOutcomeContract, input: GenerateQuestionInput): GeneratedProductQuestion {
  if (contract.grade !== input.grade) throw new GenerationV2Error("GRADE_MISMATCH");
  const random = new Random(`${contract.outcomeId}:${input.difficulty}:${input.seed}`);
  const normalizedModel = buildModel(contract, input, random);
  const semantic = solveModel(normalizedModel);
  const solution = adaptSolution(normalizedModel, semantic, random);
  const prompt = promptFor(normalizedModel);
  const visual = visualFor(normalizedModel);
  const interaction = interactionFor(normalizedModel, solution, random);
  const validation = validateModel(contract, normalizedModel, solution, prompt, interaction, visual);
  const modelHash = hash(JSON.stringify(normalizedModel));
  const publicSnapshot = {
    schemaVersion: 2 as const,
    questionId: `v2-${contract.canonicalVariantId.toLowerCase().replaceAll("_", "-")}-${hash(`${input.outcomeId}:${input.seed}:${input.difficulty}`).slice(0, 16)}`,
    grade: contract.grade,
    outcomeId: contract.outcomeId,
    productFamilyId: contract.productFamilyId,
    variantId: contract.canonicalVariantId,
    variantVersion: VARIANT_VERSION,
    difficulty: input.difficulty,
    publicPrompt: prompt,
    publicData: { taskMode: contract.taskMode, operation: normalizedModel.operation, values: publicValuesFor(normalizedModel), labels: normalizedModel.labels, scale: normalizedModel.scale, meta: normalizedModel.meta, structuralFingerprint: normalizedModel.structuralFingerprint, difficultyStructure: normalizedModel.structureLevel },
    interaction,
    visual,
    accessibility: { prompt, visualAlternative: visual.description, responseInstruction: responseInstruction(interaction) },
  };
  const privateSolution = { correctResponse: solution.correct, acceptedResponses: solution.accepted, solutionSteps: solution.steps, optionMisconceptions: solution.optionMisconceptions ?? {}, nextStep: solution.nextStep };
  const solverReceipt = { solverVersion: SOLVER_VERSION, normalizedInputHash: modelHash, resultHash: hash(JSON.stringify(solution.correct)), uniqueSolution: true };
  return { publicSnapshot, privateSolution, solverReceipt, validation, provenance: { questionSource: "GENERATED_V2", outcomeId: contract.outcomeId, productFamilyId: contract.productFamilyId, variantId: contract.canonicalVariantId, variantVersion: VARIANT_VERSION, generatorVersion: GENERATOR_V2_VERSION, solverVersion: SOLVER_VERSION, difficultyPolicyVersion: DIFFICULTY_POLICY_VERSION, seedFingerprint: hash(input.seed).slice(0, 16), normalizedModelHash: modelHash, publicSnapshotHash: hash(JSON.stringify(publicSnapshot)), visualHash: hash(JSON.stringify(visual)), solverReceiptHash: hash(JSON.stringify(solverReceipt)) } };
}

export const __waveDNegativeControl = {
  inspect(contract: WaveDOutcomeContract, input: GenerateQuestionInput) {
    const random = new Random(`${contract.outcomeId}:${input.difficulty}:${input.seed}`); const normalizedModel = buildModel(contract, input, random); const semantic = solveModel(normalizedModel); const solution = adaptSolution(normalizedModel, semantic, random); const prompt = promptFor(normalizedModel); const visual = visualFor(normalizedModel); const interaction = interactionFor(normalizedModel, solution, random); return { normalizedModel, semantic, solution, prompt, visual, interaction };
  },
  validate: validateModel,
  recompute: solveModel,
};
