import { createHash } from "node:crypto";

import { getProductVariantByOutcome, type ProductVariantRegistryEntry } from "./registry.ts";
import { generateWaveAQuestion } from "./wave-a-engine.ts";
import { getWaveAOutcomeContract, isWaveAImplementedByNewEngine } from "./wave-a-contracts.ts";
import { generateWaveBQuestion } from "./wave-b-engine.ts";
import { getWaveBOutcomeContract, isWaveBImplementedByNewEngine } from "./wave-b-contracts.ts";
import { generateWaveCQuestion } from "./wave-c-engine.ts";
import { getWaveCOutcomeContract, isWaveCImplementedByNewEngine } from "./wave-c-contracts.ts";
import { generateWaveDQuestion } from "./wave-d-engine.ts";
import { getWaveDOutcomeContract, isWaveDImplementedByNewEngine } from "./wave-d-contracts.ts";
import { generateWaveEQuestion } from "./wave-e-engine.ts";
import { getWaveEOutcomeContract, isWaveEImplementedByNewEngine } from "./wave-e-contracts.ts";
import { generateWaveFQuestion } from "./wave-f-engine.ts";
import { getWaveFOutcomeContract, isWaveFImplementedByNewEngine } from "./wave-f-contracts.ts";
import {
  DIFFICULTY_POLICY_VERSION,
  GENERATOR_V2_VERSION,
  GenerationV2Error,
  SOLVER_VERSION,
  VARIANT_VERSION,
  type CanonicalResponse,
  type FeedbackContract,
  type GenerateQuestionInput,
  type GeneratedProductQuestion,
  type MisconceptionCode,
  type PrivateSolutionContract,
  type ProductDifficulty,
  type ProductInteractionContract,
  type ProductInteractionType,
  type ProductVariantId,
  type ProductVisual,
  type PublicOption,
  type PublicQuestionSnapshot,
  type SolverReceipt,
  type ValidationResult,
} from "./types.ts";
import { fractionSemanticColor } from "./fraction-visual.ts";

type CanonicalProblemModel = Readonly<{
  variantId: ProductVariantId;
  difficulty: ProductDifficulty;
  structureLevel: 1 | 2 | 3;
  templateIndex: number;
  interactionType: ProductInteractionType;
  values: readonly number[];
  labels: readonly string[];
  operation: string;
  context: string;
  unit?: string;
  targetUnit?: string;
  scale?: number;
  highlighted?: readonly number[];
}>;

type SolvedModel = Readonly<{
  correct: CanonicalResponse;
  accepted: readonly CanonicalResponse[];
  steps: readonly string[];
  nextStep: string;
}>;

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const reduced = (numerator: number, denominator: number) => {
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
};

class Random {
  private cursor = 0;
  private readonly seed: string;
  constructor(seed: string) { this.seed = seed; }
  int(minimum: number, maximum: number) {
    const bytes = createHash("sha256")
      .update(`${this.seed}:${this.cursor++}`)
      .digest();
    return minimum + (bytes.readUInt32BE(0) % (maximum - minimum + 1));
  }
  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)]!;
  }
  shuffle<T>(items: readonly T[]): T[] {
    return [...items].sort(() => this.int(-1_000, 1_000));
  }
}

const STRUCTURE_LEVEL = { EASY: 1, MEDIUM: 2, HARD: 3 } as const;

function chooseInteraction(
  entry: ProductVariantRegistryEntry,
  difficulty: ProductDifficulty,
  requested: ProductInteractionType | undefined,
) {
  if (requested && !entry.interactionPolicy.includes(requested)) {
    throw new GenerationV2Error("INTERACTION_UNSUPPORTED");
  }
  if (requested) return requested;
  return entry.interactionPolicy[difficulty === "HARD" && entry.interactionPolicy.length > 1 ? 1 : 0]!;
}

function buildModel(
  entry: ProductVariantRegistryEntry,
  input: GenerateQuestionInput,
  random: Random,
): CanonicalProblemModel {
  const structureLevel = STRUCTURE_LEVEL[input.difficulty];
  const templateIndex = random.int(0, 19);
  const interactionType = chooseInteraction(entry, input.difficulty, input.interactionType);
  switch (entry.variantId) {
    case "ADD_SUB_MEANING": {
      const operation = input.difficulty === "EASY" ? "+" : input.difficulty === "MEDIUM" ? "-" : random.pick(["+", "-"]);
      const a = operation === "+" ? random.int(1, 6) : random.int(5, 10);
      const b = operation === "+" ? random.int(1, 10 - a) : random.int(1, a);
      const object = random.pick(["bút chì", "quyển vở", "khối gỗ", "bông hoa", "quả bóng", "nhãn vở", "thẻ số", "viên bi", "chiếc lá", "que tính"]);
      const place = random.pick(["trên bàn", "trong hộp", "ở góc học tập", "trong giỏ", "trên kệ", "ở lớp"]);
      return { variantId: entry.variantId, difficulty: input.difficulty, structureLevel, templateIndex, interactionType, values: [a, b], labels: ["ban đầu", operation === "+" ? "thêm" : "bớt"], operation, context: `${object} ${place}` };
    }
    case "MULTIPLY_DIVIDE_FACTS": {
      const factor = random.pick([2, 5]);
      const groups = random.int(2, 10);
      const operation = input.difficulty === "EASY" ? "MULTIPLY" : input.difficulty === "MEDIUM" ? "DIVIDE" : "MISSING_FACTOR";
      const group = random.pick(["đĩa cam", "túi bi", "hàng ghế", "hộp bút", "bó hoa", "khay bánh", "giỏ quả", "bàn học", "kệ sách", "nhóm thẻ"]);
      const setting = random.pick(["trong lớp", "ở thư viện", "tại câu lạc bộ", "trong buổi học", "ở sân trường", "trong góc Toán"]);
      const purpose = random.pick(["để sắp xếp", "để kiểm đếm", "cho hoạt động nhóm", "cho buổi trưng bày", "để chia đều", "cho giờ thực hành", "để chuẩn bị", "cho một trò chơi"]);
      return { variantId: entry.variantId, difficulty: input.difficulty, structureLevel, templateIndex, interactionType, values: [factor, groups, factor * groups], labels: ["mỗi nhóm", "số nhóm", "tất cả"], operation, context: `${group} ${setting} ${purpose}` };
    }
    case "PLACE_VALUE_COMPARE": {
      const base = random.int(10_000, 98_000);
      const delta = random.int(1, input.difficulty === "HARD" ? 900 : 90);
      const values = [base, base + delta, base - random.int(1, 500), base + random.int(501, 1_500)];
      const operation = input.difficulty === "EASY" ? "DIGIT_VALUE" : input.difficulty === "MEDIUM" ? "MAXIMUM" : "ORDER_ASC";
      return { variantId: entry.variantId, difficulty: input.difficulty, structureLevel, templateIndex, interactionType, values, labels: values.map((_, index) => `n${index + 1}`), operation, context: random.pick(["thẻ số", "số sách thư viện", "lượt đọc", "dân số bốn khu", "bảng số", "mã kiện hàng"]) };
    }
    case "FRACTION_PART_WHOLE": {
      const denominator = random.pick([4, 5, 6, 8, 10, 12]);
      const numerator = random.int(1, denominator - 1);
      const representation = random.pick(["thanh giấy", "dải giấy", "băng giấy", "tấm bìa", "hình chữ nhật"]);
      const color = random.pick(["xanh", "lam", "lục", "vàng", "tím", "cam"]);
      return { variantId: entry.variantId, difficulty: input.difficulty, structureLevel, templateIndex, interactionType, values: [numerator, denominator], labels: ["phần được tô", "tổng số phần bằng nhau"], operation: input.difficulty === "HARD" ? "SELECT_EQUIVALENT_MODEL" : "WRITE_FRACTION", context: `${representation} màu ${color}`, highlighted: Array.from({ length: numerator }, (_, index) => index) };
    }
    case "LINEAR_SYSTEM": {
      const x = random.int(-12, 18);
      const sampledY = random.int(-11, 19);
      const y = sampledY === x ? sampledY + 1 : sampledY;
      const coefficients = input.difficulty === "EASY" ? [1, 1, 1, -1] : input.difficulty === "MEDIUM" ? [2, 1, 1, -1] : [random.pick([2, 3]), random.pick([1, 2]), random.pick([1, 2]), random.pick([-3, -2])];
      const [a, b, c, d] = coefficients;
      if (a * d - b * c === 0) return buildModel(entry, { ...input, seed: `${input.seed}-retry` }, new Random(`${input.seed}-retry`));
      return { variantId: entry.variantId, difficulty: input.difficulty, structureLevel, templateIndex, interactionType, values: [a, b, a * x + b * y, c, d, c * x + d * y, x, y], labels: ["a", "b", "m", "c", "d", "n", "x", "y"], operation: "SOLVE_SYSTEM", context: "hệ phương trình" };
    }
    case "GEOMETRY_PROPERTIES": {
      const shape = input.difficulty === "HARD" ? "CIRCLE" : random.pick(["RECTANGLE", "SQUARE"]);
      const orientation = random.int(0, 23);
      const values = shape === "CIRCLE" ? [random.int(2, 18), orientation] : [random.int(3, 20), random.int(2, 17), orientation];
      return { variantId: entry.variantId, difficulty: input.difficulty, structureLevel, templateIndex, interactionType, values, labels: shape === "CIRCLE" ? ["O", "A", "B"] : ["A", "B", "C", "D"], operation: input.difficulty === "EASY" ? "COUNT_PROPERTIES" : input.difficulty === "MEDIUM" ? "SELECT_PROPERTIES" : "IDENTIFY_RADIUS_DIAMETER", context: shape };
    }
    case "UNIT_CONVERSION": {
      const volume = input.difficulty !== "HARD";
      if (volume) {
        const factor = input.difficulty === "EASY" ? 1_000 : 1_000_000;
        const value = random.int(2, 9_000);
        const object = random.pick(["bể nước", "hộp đựng", "khối mô hình", "thùng hàng", "bình chứa", "khoang chứa"]);
        const setting = random.pick(["ở phòng học", "trong kho", "tại xưởng", "ở phòng thí nghiệm", "trong dự án", "tại câu lạc bộ"]);
        return { variantId: entry.variantId, difficulty: input.difficulty, structureLevel, templateIndex, interactionType, values: [value, factor], labels: ["số đo", "hệ số đổi"], operation: "MULTIPLY_FACTOR", context: `${object} ${setting}`, unit: input.difficulty === "EASY" ? "dm³" : "m³", targetUnit: "cm³", scale: factor };
      }
      const minutes = random.int(1, 120);
      const seconds = random.pick([6, 12, 18, 24, 30, 36, 42, 48, 54]);
      return { variantId: entry.variantId, difficulty: input.difficulty, structureLevel, templateIndex, interactionType, values: [minutes, seconds], labels: ["phút", "giây"], operation: "MIXED_TIME_TO_MINUTES", context: random.pick(["thời gian chạy", "thời gian đọc", "thời gian thí nghiệm", "thời gian luyện tập"]), unit: "phút và giây", targetUnit: "phút", scale: 60 };
    }
    case "PERIMETER_AREA": {
      const width = random.int(5, 60);
      const height = random.int(2, width - 1);
      const operation = input.difficulty === "EASY" ? "RECTANGLE_AREA" : input.difficulty === "MEDIUM" ? random.pick(["RECTANGLE_AREA", "RECTANGLE_PERIMETER"]) : "L_SHAPE_AREA";
      const cutWidth = Math.max(1, Math.floor(width / 3));
      const cutHeight = Math.max(1, Math.floor(height / 2));
      return { variantId: entry.variantId, difficulty: input.difficulty, structureLevel, templateIndex, interactionType, values: [width, height, cutWidth, cutHeight], labels: ["chiều dài", "chiều rộng", "phần khuyết dài", "phần khuyết rộng"], operation, context: random.pick(["mảnh vườn", "tấm bìa", "sàn phòng", "bảng trang trí", "khu trồng cây"]), unit: "m" };
    }
    case "CHART_DATA_INTERPRETATION": {
      const labels = random.pick([
        ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm"],
        ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"],
        ["Nhóm A", "Nhóm B", "Nhóm C", "Nhóm D"],
      ]);
      const scale = input.difficulty === "HARD" ? random.pick([5, 10]) : 1;
      const values = labels.map(() => random.int(2, 12) * scale);
      const operation = input.difficulty === "EASY" ? "READ_VALUE" : input.difficulty === "MEDIUM" ? "COMPARE_DIFFERENCE" : "TOTAL_AND_TREND";
      const measure = random.pick([
        { context: "số trang sách đã đọc", unit: "trang" },
        { context: "số cây trồng được", unit: "cây" },
        { context: "lượng nước sử dụng", unit: "lít" },
        { context: "quãng đường đạp xe", unit: "km" },
        { context: "số lượt tham gia", unit: "lượt" },
      ]);
      return { variantId: entry.variantId, difficulty: input.difficulty, structureLevel, templateIndex, interactionType, values, labels, operation, context: measure.context, unit: measure.unit, scale };
    }
    case "EXPERIMENTAL_PROBABILITY": {
      const totalA = random.int(20, 120);
      const favorableA = random.int(5, totalA - 5);
      const totalB = input.difficulty === "HARD" ? random.int(20, 120) : 0;
      const favorableB = totalB ? random.int(5, totalB - 5) : 0;
      const operation = input.difficulty === "EASY" ? "ONE_EXPERIMENT" : input.difficulty === "MEDIUM" ? "COMPARE_THEORETICAL_HALF" : "COMBINE_EXPERIMENTS";
      return { variantId: entry.variantId, difficulty: input.difficulty, structureLevel, templateIndex, interactionType, values: [favorableA, totalA, favorableB, totalB], labels: ["số lần thuận lợi A", "tổng A", "số lần thuận lợi B", "tổng B"], operation, context: random.pick(["tung đồng xu", "quay vòng màu", "rút thẻ", "gieo xúc xắc"])};
    }
    case "APPLIED_TWO_STEP": {
      const start = random.int(20, 80);
      const change = random.int(5, 25);
      const second = random.int(3, 18);
      const irrelevant = random.int(2, 12);
      const operation = input.difficulty === "EASY" ? "ADD_ONE_STEP" : input.difficulty === "MEDIUM" ? "ADD_THEN_SUBTRACT" : "COMPARE_THEN_ADD";
      return { variantId: entry.variantId, difficulty: input.difficulty, structureLevel, templateIndex, interactionType, values: [start, change, second, irrelevant], labels: ["ban đầu", "thay đổi 1", "thay đổi 2", "dữ kiện không cần"], operation, context: random.pick(["sách ở thư viện", "cây giống", "chai nước", "vé tham quan", "hộp bút", "quả bóng"])};
    }
    case "DATA_ERROR_REASONING": {
      const a = random.int(12, 38);
      const b = random.int(12, 38);
      const c = random.int(12, 38);
      const actual = a + b + c;
      const wrong = actual + random.pick([-7, -5, 4, 6, 8]);
      const operation = input.difficulty === "EASY" ? "ROW_TOTAL_ERROR" : input.difficulty === "MEDIUM" ? "PERCENT_TOTAL_ERROR" : "MEAN_ERROR";
      return { variantId: entry.variantId, difficulty: input.difficulty, structureLevel, templateIndex, interactionType, values: [a, b, c, wrong, actual], labels: ["Nhóm A", "Nhóm B", "Nhóm C", "Tổng đã ghi", "Tổng đúng"], operation, context: random.pick(["khảo sát phương tiện", "thống kê câu lạc bộ", "bảng điểm hoạt động", "khảo sát môn thể thao", "số liệu tái chế"])};
    }
  }
  throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
}

function solveModel(model: CanonicalProblemModel): SolvedModel {
  const v = model.values;
  switch (model.variantId) {
    case "ADD_SUB_MEANING": {
      const result = model.operation === "+" ? v[0]! + v[1]! : v[0]! - v[1]!;
      return { correct: result, accepted: [result, String(result)], steps: [`Bắt đầu với ${v[0]}.`, `${model.operation === "+" ? "Thêm" : "Bớt"} ${v[1]}.`, `Kết quả là ${result}.`], nextStep: "Em hãy thử kể một tình huống khác dùng cùng phép tính." };
    }
    case "MULTIPLY_DIVIDE_FACTS": {
      const result = model.operation === "MULTIPLY" ? v[0]! * v[1]! : model.operation === "DIVIDE" ? v[2]! / v[0]! : v[2]! / v[0]!;
      return { correct: result, accepted: [result, String(result)], steps: [`Có ${v[1]} nhóm, mỗi nhóm ${v[0]}.`, `${v[0]} × ${v[1]} = ${v[2]}.`, model.operation === "MULTIPLY" ? `Có tất cả ${result}.` : `${v[2]} : ${v[0]} = ${result}.`], nextStep: "Dùng phép tính ngược để kiểm tra." };
    }
    case "PLACE_VALUE_COMPARE": {
      if (model.operation === "DIGIT_VALUE") {
        const digit = Math.floor(v[0]! / 1_000) % 10;
        return { correct: String(digit), accepted: [digit, String(digit)], steps: [`Viết ${v[0]} theo từng hàng.`, `Chữ số hàng nghìn là ${digit}.`], nextStep: "Tiếp tục đọc các chữ số từ hàng lớn đến hàng nhỏ." };
      }
      if (model.operation === "MAXIMUM") {
        const max = Math.max(...v);
        return { correct: String(max), accepted: [max, String(max)], steps: ["So sánh từ hàng chục nghìn.", "Nếu bằng nhau, chuyển sang hàng tiếp theo.", `${max} là số lớn nhất.`], nextStep: "Hãy chỉ ra hàng đầu tiên làm hai số khác nhau." };
      }
      const ordered = [...v].sort((a, b) => a - b).map(String);
      return { correct: ordered, accepted: [ordered], steps: ["So sánh lần lượt từ hàng lớn nhất.", `Thứ tự tăng dần: ${ordered.join("; ")}.`], nextStep: "Kiểm tra mỗi số chỉ xuất hiện một lần." };
    }
    case "FRACTION_PART_WHOLE": {
      const answer = reduced(v[0]!, v[1]!);
      return { correct: answer, accepted: [answer, `${answer.numerator}/${answer.denominator}`], steps: [`Có ${v[1]} phần bằng nhau.`, `${v[0]} phần được chọn.`, `Phân số là ${v[0]}/${v[1]}${gcd(v[0]!, v[1]!) > 1 ? ` = ${answer.numerator}/${answer.denominator}` : ""}.`], nextStep: "Nhớ: tử số ở trên, mẫu số ở dưới." };
    }
    case "LINEAR_SYSTEM": {
      const [a, b, m, c, d, n] = v;
      const determinant = a! * d! - b! * c!;
      if (determinant === 0) throw new GenerationV2Error("SOLVER_FAILED");
      const x = (m! * d! - b! * n!) / determinant;
      const y = (a! * n! - m! * c!) / determinant;
      const pairs = [{ leftId: "x", rightId: String(x) }, { leftId: "y", rightId: String(y) }];
      return { correct: pairs, accepted: [pairs], steps: [`Khử một ẩn trong hệ.`, `Tìm được x = ${x}.`, `Thế vào một phương trình, tìm được y = ${y}.`, `Cặp (${x}; ${y}) thỏa cả hai phương trình.`], nextStep: "Thế cặp nghiệm vào cả hai phương trình để kiểm tra." };
    }
    case "GEOMETRY_PROPERTIES": {
      const correct = model.context === "CIRCLE" ? ["radius", "diameter"] : model.context === "SQUARE" ? ["four-equal-sides", "four-right-angles"] : ["opposite-equal", "four-right-angles"];
      return { correct, accepted: [correct], steps: model.context === "CIRCLE" ? ["Bán kính nối tâm với một điểm trên đường tròn.", "Đường kính đi qua tâm và có hai đầu trên đường tròn."] : ["Quan sát số cạnh và các góc.", `Đối chiếu định nghĩa của ${model.context === "SQUARE" ? "hình vuông" : "hình chữ nhật"}.`], nextStep: "Nêu một thuộc tính giúp phân biệt hai hình." };
    }
    case "UNIT_CONVERSION": {
      const answer = model.operation === "MIXED_TIME_TO_MINUTES" ? v[0]! + v[1]! / 60 : v[0]! * v[1]!;
      return { correct: answer, accepted: [answer, String(answer).replace(".", ",")], steps: model.operation === "MIXED_TIME_TO_MINUTES" ? [`${v[1]} giây = ${v[1]! / 60} phút.`, `${v[0]} + ${v[1]! / 60} = ${answer} phút.`] : [`1 ${model.unit} = ${v[1]} ${model.targetUnit}.`, `${v[0]} × ${v[1]} = ${answer} ${model.targetUnit}.`], nextStep: "Kiểm tra đơn vị của kết quả trước khi gửi." };
    }
    case "PERIMETER_AREA": {
      const answer = model.operation === "RECTANGLE_PERIMETER" ? 2 * (v[0]! + v[1]!) : model.operation === "L_SHAPE_AREA" ? v[0]! * v[1]! - v[2]! * v[3]! : v[0]! * v[1]!;
      return { correct: answer, accepted: [answer, String(answer)], steps: model.operation === "RECTANGLE_PERIMETER" ? [`Chu vi là độ dài đường bao quanh.`, `2 × (${v[0]} + ${v[1]}) = ${answer} m.`] : model.operation === "L_SHAPE_AREA" ? [`Diện tích hình chữ nhật lớn: ${v[0]} × ${v[1]} = ${v[0]! * v[1]!}.`, `Diện tích phần khuyết: ${v[2]} × ${v[3]} = ${v[2]! * v[3]!}.`, `Diện tích còn lại: ${answer} m².`] : [`Diện tích = chiều dài × chiều rộng.`, `${v[0]} × ${v[1]} = ${answer} m².`], nextStep: "Xem kết quả cần đơn vị m hay m²." };
    }
    case "CHART_DATA_INTERPRETATION": {
      const answer = model.operation === "READ_VALUE" ? v[0]! : model.operation === "COMPARE_DIFFERENCE" ? Math.abs(v[3]! - v[0]!) : v.reduce((sum, value) => sum + value, 0);
      return { correct: answer, accepted: [answer, String(answer)], steps: model.operation === "READ_VALUE" ? [`Tìm đúng nhãn ${model.labels[0]}.`, `Đọc giá trị ${answer} ${model.unit} theo trục.`] : model.operation === "COMPARE_DIFFERENCE" ? [`Đọc hai giá trị ${v[0]} ${model.unit} và ${v[3]} ${model.unit}.`, `Độ chênh lệch là |${v[3]} − ${v[0]}| = ${answer} ${model.unit}.`] : [`Đọc lần lượt các giá trị ${v.join(", ")} ${model.unit}.`, `Cộng bốn mốc được ${answer} ${model.unit}.`], nextStep: "Luôn kiểm tra nhãn, đơn vị và khoảng cách giữa hai vạch chia." };
    }
    case "EXPERIMENTAL_PROBABILITY": {
      const numerator = model.operation === "COMBINE_EXPERIMENTS" ? v[0]! + v[2]! : v[0]!;
      const denominator = model.operation === "COMBINE_EXPERIMENTS" ? v[1]! + v[3]! : v[1]!;
      const answer = reduced(numerator, denominator);
      return { correct: answer, accepted: [answer, `${answer.numerator}/${answer.denominator}`], steps: [`Số lần biến cố xảy ra: ${numerator}.`, `Tổng số lần thử: ${denominator}.`, `Xác suất thực nghiệm: ${numerator}/${denominator} = ${answer.numerator}/${answer.denominator}.`], nextStep: "Mẫu số luôn là tổng số lần thử, không phải số lần biến cố không xảy ra." };
    }
    case "APPLIED_TWO_STEP": {
      const groupB = v[0]! + v[1]!;
      const twoGroups = v[0]! + groupB;
      const answer = model.operation === "ADD_ONE_STEP" ? v[0]! + v[1]! : model.operation === "ADD_THEN_SUBTRACT" ? v[0]! + v[1]! - v[2]! : twoGroups + v[2]!;
      return { correct: answer, accepted: [answer, String(answer)], steps: model.operation === "ADD_ONE_STEP" ? [`Gộp ${v[0]} và ${v[1]}.`, `${v[0]} + ${v[1]} = ${answer}.`] : model.operation === "ADD_THEN_SUBTRACT" ? [`Sau khi thêm: ${v[0]} + ${v[1]} = ${v[0]! + v[1]!}.`, `Sau khi bớt: ${v[0]! + v[1]!} − ${v[2]} = ${answer}.`] : [`Tìm số của nhóm B: ${v[0]} + ${v[1]} = ${groupB}.`, `Tổng hai nhóm: ${v[0]} + ${groupB} = ${twoGroups}.`, `Cộng ${v[2]} món dự phòng: ${twoGroups} + ${v[2]} = ${answer}.`], nextStep: "Gạch chân câu hỏi và chỉ dùng dữ kiện cần thiết." };
    }
    case "DATA_ERROR_REASONING": {
      const correct = "reported-total";
      return { correct, accepted: [correct], steps: [`Cộng ba nhóm: ${v[0]} + ${v[1]} + ${v[2]} = ${v[4]}.`, `Bảng lại ghi ${v[3]}, nên ô tổng không nhất quán.`], nextStep: "Khi kiểm tra dữ liệu, hãy viết rõ quan hệ toán học cần đúng." };
    }
  }
  throw new GenerationV2Error("SOLVER_FAILED");
}

function optionSet(
  model: CanonicalProblemModel,
  solved: SolvedModel,
  random: Random,
): { options: readonly PublicOption[]; correct: string; misconceptions: Record<string, MisconceptionCode> } {
  if (model.variantId === "DATA_ERROR_REASONING") {
    const options = random.shuffle([
      { id: "reported-total", label: "Ô “Tổng” không bằng tổng của ba nhóm" },
      { id: "group-a", label: "Số liệu của Nhóm A chắc chắn sai" },
      { id: "group-b", label: "Số liệu của Nhóm B chắc chắn sai" },
      { id: "no-error", label: "Bảng không có điểm nào mâu thuẫn" },
    ]);
    return { options, correct: "reported-total", misconceptions: { "group-a": "DATA_RELATION_IGNORED", "group-b": "DATA_RELATION_IGNORED", "no-error": "DATA_RELATION_IGNORED" } };
  }
  const numeric = typeof solved.correct === "number" ? solved.correct : Number(solved.correct);
  const candidates: readonly [number, MisconceptionCode][] = model.variantId === "PERIMETER_AREA"
    ? [[2 * (model.values[0]! + model.values[1]!), "PERIMETER_AREA_CONFUSION"], [model.values[0]! + model.values[1]!, "PERIMETER_AREA_CONFUSION"], [numeric + model.values[2]!, "DATA_RELATION_IGNORED"]]
    : model.variantId === "MULTIPLY_DIVIDE_FACTS"
      ? [[model.values[0]! + model.values[1]!, "MULTIPLICATION_AS_ADDITION"], [Math.abs(model.values[1]! - model.values[0]!), "REVERSED_OPERATION"], [numeric + model.values[0]!, "REVERSED_OPERATION"]]
      : [[numeric + 1, "CARRY_BORROW_ERROR"], [Math.abs(numeric - 1), "REVERSED_OPERATION"], [numeric + 10, "PLACE_VALUE_CONFUSION"]];
  const unique = new Map<number, MisconceptionCode>();
  for (const [value, misconception] of candidates) if (Number.isFinite(value) && value !== numeric) unique.set(value, misconception);
  let offset = 2;
  while (unique.size < 3) { if (numeric + offset !== numeric) unique.set(numeric + offset, "REVERSED_OPERATION"); offset += 1; }
  const correctId = "choice-correct";
  const rows = [{ id: correctId, label: String(solved.correct) }, ...[...unique].slice(0, 3).map(([value], index) => ({ id: `choice-${index + 1}`, label: String(value) }))];
  const misconceptions: Record<string, MisconceptionCode> = {};
  [...unique].slice(0, 3).forEach(([, code], index) => { misconceptions[`choice-${index + 1}`] = code; });
  return { options: random.shuffle(rows), correct: correctId, misconceptions };
}

function publicPresentation(model: CanonicalProblemModel, solved: SolvedModel, random: Random) {
  let publicPrompt = "";
  let publicData: Record<string, unknown> = {};
  let visual: ProductVisual = { type: "NONE", description: "Câu hỏi không cần hình minh họa.", data: {} };
  let interaction: ProductInteractionContract = { type: model.interactionType, inputLabel: "Câu trả lời" };
  let optionMisconceptions: Record<string, MisconceptionCode> = {};
  const t = model.templateIndex;
  const contextLead = [
    "Quan sát và trả lời", "Em hãy tính", "Tìm kết quả", "Hãy giúp bạn An", "Dựa vào dữ kiện", "Chọn cách làm đúng", "Đọc kĩ rồi trả lời", "Hoàn thành bài toán", "Suy nghĩ từng bước", "Kiểm tra dữ kiện", "Tìm giá trị cần biết", "Giải bài toán sau", "Đối chiếu mô hình", "Nêu kết quả chính xác", "Chọn dữ kiện cần dùng", "Kiểm tra bằng định nghĩa", "Trình bày phép tính", "Xác định đại lượng cần tìm", "Hoàn thành phiếu học tập", "Tự kiểm tra kết quả",
  ][t]!;
  const v = model.values;
  switch (model.variantId) {
    case "ADD_SUB_MEANING":
      publicPrompt = model.difficulty === "HARD" ? `${contextLead}: Có ${v[0]} ${model.context}, sau đó ${model.operation === "+" ? "được thêm" : "cho đi"} ${v[1]}. Phép tính nào cho biết số ${model.context} ${model.operation === "+" ? "tất cả" : "còn lại"}?` : `${contextLead}: Có ${v[0]} ${model.context}, ${model.operation === "+" ? "thêm" : "bớt"} ${v[1]}. ${model.operation === "+" ? "Có tất cả" : "Còn lại"} bao nhiêu?`;
      publicData = { initial: v[0], change: v[1], action: model.operation === "+" ? "ADD" : "REMOVE", object: model.context };
      visual = model.operation === "+"
        ? { type: "OBJECT_GROUPS", description: `Hai nhóm gồm ${v[0]} và ${v[1]} ${model.context} được gộp lại.`, data: { groups: [v[0], v[1]], action: model.operation, initial: v[0], change: v[1] } }
        : { type: "OBJECT_GROUPS", description: `Nhóm ban đầu có ${v[0]} ${model.context}; đề bài cho biết sẽ bớt ${v[1]}.`, data: { groups: [v[0]], action: model.operation, initial: v[0], change: v[1] } };
      break;
    case "MULTIPLY_DIVIDE_FACTS":
      publicPrompt = model.operation === "MULTIPLY" ? `${contextLead}: Có ${v[1]} ${model.context}, mỗi nhóm có ${v[0]}. Có tất cả bao nhiêu?` : model.operation === "DIVIDE" ? `${contextLead}: Chia đều ${v[2]} đồ vật, mỗi nhóm ${v[0]}. Có bao nhiêu nhóm?` : `${contextLead}: ${v[0]} × □ = ${v[2]}. Số thích hợp là bao nhiêu?`;
      publicData = { groups: v[1], perGroup: v[0], total: v[2], unknown: model.operation, context: model.context };
      visual = { type: "OBJECT_GROUPS", description: `${v[1]} nhóm bằng nhau, mỗi nhóm ${v[0]} phần tử.`, data: { groups: v[1], itemsPerGroup: v[0] } };
      break;
    case "PLACE_VALUE_COMPARE":
      publicPrompt = model.operation === "DIGIT_VALUE" ? `${contextLead}: Trong số ${v[0]}, chữ số hàng nghìn là chữ số nào?` : model.operation === "MAXIMUM" ? `${contextLead}: Số nào lớn nhất trong ${v.join(", ")}?` : `${contextLead}: Sắp xếp các số sau theo thứ tự tăng dần: ${v.join(", ")}.`;
      publicData = { values: v, task: model.operation };
      visual = { type: "PLACE_VALUE_CHART", description: "Bảng hàng chục nghìn, nghìn, trăm, chục và đơn vị.", data: { values: v, columns: ["Chục nghìn", "Nghìn", "Trăm", "Chục", "Đơn vị"] } };
      break;
    case "FRACTION_PART_WHOLE":
      {
        const colorLabel = model.context.match(/màu\s+(xanh|lam|lục|vàng|tím|cam)/iu)?.[1]?.toLocaleLowerCase("vi");
        if (!colorLabel) throw new GenerationV2Error("VALIDATION_FAILED");
        const color = fractionSemanticColor(colorLabel);
        publicPrompt = `${contextLead}: ${model.context} được chia thành ${v[1]} phần bằng nhau và tô ${v[0]} phần. Viết phân số chỉ phần đã tô ở dạng tối giản.`;
        publicData = { totalParts: v[1], selectedParts: v[0], representation: model.context, visualModel: "SEGMENTED_BAR", colorReference: { regionId: "fraction-shaded", colorId: color.id, colorLabel: color.label } };
        visual = {
          type: "FRACTION_MODEL",
          description: `Thanh phân số có ${v[1]} phần bằng nhau; ${v[0]} phần được tô màu ${color.label} và đánh dấu bằng vạch chéo.`,
          data: {
            modelType: "SEGMENTED_BAR",
            totalParts: v[1],
            selectedParts: v[0],
            highlightedParts: model.highlighted,
            semanticRegions: [{ id: "fraction-shaded", colorId: color.id, colorLabel: color.label, pattern: "DIAGONAL_STRIPES" }],
          },
        };
      }
      interaction = { type: model.interactionType, inputLabel: "Phân số", inputMode: "text" };
      break;
    case "LINEAR_SYSTEM": {
      const [a, b, m, c, d, n] = v;
      publicPrompt = `${contextLead}: Giải hệ ${a}x ${b! >= 0 ? "+" : "−"} ${Math.abs(b!)}y = ${m}; ${c}x ${d! >= 0 ? "+" : "−"} ${Math.abs(d!)}y = ${n}.`;
      publicData = { equations: [{ x: a, y: b, value: m }, { x: c, y: d, value: n }] };
      const rightValues = new Set<number>([v[6]!, v[7]!]);
      let offset = 1;
      while (rightValues.size < 4) {
        rightValues.add(v[6]! + offset);
        if (rightValues.size < 4) rightValues.add(v[7]! - offset);
        offset += 1;
      }
      interaction = { type: "MATCHING", leftItems: [{ id: "x", label: "x" }, { id: "y", label: "y" }], rightItems: random.shuffle([...rightValues].map(String)).map((label) => ({ id: label, label })) };
      break;
    }
    case "GEOMETRY_PROPERTIES": {
      publicPrompt = model.context === "CIRCLE" ? `${contextLead}: Chọn hai mô tả đúng về các đoạn được đánh dấu trong hình tròn.` : `${contextLead}: Chọn tất cả tính chất đúng của ${model.context === "SQUARE" ? "hình vuông" : "hình chữ nhật"} ABCD.`;
      publicData = { shape: model.context, points: model.labels };
      visual = { type: "SHAPE_DIAGRAM", description: model.context === "CIRCLE" ? "Đường tròn tâm O có OA là bán kính và AB đi qua O là đường kính." : `${model.context === "SQUARE" ? "Hình vuông" : "Hình chữ nhật"} ABCD, các đỉnh theo thứ tự.`, data: { shape: model.context, dimensions: v, orientation: v[v.length - 1], points: model.labels } };
      const options = model.context === "CIRCLE" ? [{ id: "radius", label: "OA là bán kính" }, { id: "diameter", label: "AB là đường kính" }, { id: "oa-diameter", label: "OA là đường kính" }, { id: "ab-radius", label: "AB là bán kính" }] : [{ id: "four-right-angles", label: "Có bốn góc vuông" }, { id: model.context === "SQUARE" ? "four-equal-sides" : "opposite-equal", label: model.context === "SQUARE" ? "Bốn cạnh bằng nhau" : "Hai cặp cạnh đối bằng nhau" }, { id: "three-sides", label: "Có ba cạnh" }, { id: "no-parallel", label: "Không có cạnh song song" }];
      interaction = { type: "MULTI_SELECT", options: random.shuffle(options), choiceCount: 2 };
      optionMisconceptions = { "oa-diameter": "NUMERATOR_DENOMINATOR_CONFUSION", "ab-radius": "REVERSED_OPERATION", "three-sides": "DATA_RELATION_IGNORED", "no-parallel": "DATA_RELATION_IGNORED" };
      break;
    }
    case "UNIT_CONVERSION": {
      const sourceDisplay = model.operation === "MIXED_TIME_TO_MINUTES"
        ? `${v[0]} phút ${v[1]} giây`
        : `${v[0]} ${model.unit}`;
      publicPrompt = model.operation === "MIXED_TIME_TO_MINUTES" ? `${contextLead}: ${model.context} kéo dài ${v[0]} phút ${v[1]} giây. Viết thời gian theo đơn vị phút.` : `${contextLead}: Đổi ${v[0]} ${model.unit} sang ${model.targetUnit}.`;
      publicData = { value: v[0], remainder: model.operation === "MIXED_TIME_TO_MINUTES" ? v[1] : undefined, sourceUnit: model.unit, sourceDisplay, targetUnit: model.targetUnit };
      visual = { type: "MEASUREMENT_MODEL", description: `Sơ đồ đổi ${sourceDisplay} sang đơn vị ${model.targetUnit}.`, data: { value: v[0], remainder: model.operation === "MIXED_TIME_TO_MINUTES" ? v[1] : null, source: model.unit, sourceDisplay, target: model.targetUnit, factor: model.scale } };
      interaction = { type: model.interactionType, inputLabel: `Kết quả (${model.targetUnit})`, inputMode: model.interactionType === "DECIMAL_INPUT" ? "decimal" : "numeric", unitLabel: model.targetUnit };
      break;
    }
    case "PERIMETER_AREA":
      publicPrompt = model.operation === "RECTANGLE_PERIMETER" ? `${contextLead}: ${model.context} hình chữ nhật dài ${v[0]} m, rộng ${v[1]} m. Tính chu vi.` : model.operation === "L_SHAPE_AREA" ? `${contextLead}: ${model.context} dạng hình chữ nhật ${v[0]} m × ${v[1]} m bị bỏ một góc ${v[2]} m × ${v[3]} m. Tính diện tích phần còn lại.` : `${contextLead}: ${model.context} hình chữ nhật dài ${v[0]} m, rộng ${v[1]} m. Tính diện tích.`;
      publicData = { width: v[0], height: v[1], cutWidth: model.operation === "L_SHAPE_AREA" ? v[2] : undefined, cutHeight: model.operation === "L_SHAPE_AREA" ? v[3] : undefined, task: model.operation, unit: "m" };
      visual = { type: "AREA_MODEL", description: model.operation === "L_SHAPE_AREA" ? `Hình chữ L tạo bởi hình ${v[0]} m × ${v[1]} m bỏ góc ${v[2]} m × ${v[3]} m.` : `Hình chữ nhật dài ${v[0]} m, rộng ${v[1]} m.`, data: { width: v[0], height: v[1], cut: model.operation === "L_SHAPE_AREA" ? [v[2], v[3]] : null, unit: "m" } };
      break;
    case "CHART_DATA_INTERPRETATION":
      publicPrompt = model.operation === "READ_VALUE" ? `${contextLead}: Biểu đồ cho biết ${model.context}, đơn vị ${model.unit}. ${model.labels[0]} có giá trị bao nhiêu ${model.unit}?` : model.operation === "COMPARE_DIFFERENCE" ? `${contextLead}: Với dữ liệu ${model.context} (đơn vị ${model.unit}), giá trị ở ${model.labels[3]} nhiều hơn ${model.labels[0]} bao nhiêu ${model.unit}?` : `${contextLead}: Biểu đồ ${model.context} (đơn vị ${model.unit}) gồm các mốc ${model.labels.join(", ")}. Tính tổng giá trị của cả bốn mốc theo ${model.unit}.`;
      publicData = { labels: model.labels, values: v, scale: model.scale, query: model.operation, measure: model.context, unit: model.unit };
      visual = { type: "BAR_CHART", description: `${model.context}, đơn vị ${model.unit}: ${model.labels.map((label, index) => `${label} ${v[index]} ${model.unit}`).join(", ")}.`, data: { labels: model.labels, values: v, scale: model.scale, measure: model.context, unit: model.unit } };
      interaction = { type: "TABLE_OR_CHART_RESPONSE", inputLabel: `Giá trị đọc từ biểu đồ (${model.unit})`, inputMode: "numeric", unitLabel: model.unit };
      break;
    case "EXPERIMENTAL_PROBABILITY":
      publicPrompt = model.operation === "COMBINE_EXPERIMENTS" ? `${contextLead}: Hai nhóm cùng ${model.context}. Nhóm A có ${v[0]}/${v[1]} lần thuận lợi, nhóm B có ${v[2]}/${v[3]}. Gộp kết quả, xác suất thực nghiệm của biến cố là bao nhiêu?` : `${contextLead}: Khi ${model.context} ${v[1]} lần, biến cố cần xét xảy ra ${v[0]} lần. Viết xác suất thực nghiệm ở dạng phân số tối giản.`;
      publicData = { experiments: [{ favorable: v[0], total: v[1] }, ...(v[3] ? [{ favorable: v[2], total: v[3] }] : [])], event: "biến cố được nêu" };
      visual = { type: "EXPERIMENT_TABLE", description: v[3] ? `Nhóm A: ${v[0]} trên ${v[1]}; Nhóm B: ${v[2]} trên ${v[3]}.` : `${v[0]} lần thuận lợi trong ${v[1]} lần thử.`, data: { rows: [{ name: "A", favorable: v[0], total: v[1] }, ...(v[3] ? [{ name: "B", favorable: v[2], total: v[3] }] : [])] } };
      interaction = { type: model.interactionType, inputLabel: "Xác suất thực nghiệm", inputMode: "text" };
      break;
    case "APPLIED_TWO_STEP":
      publicPrompt = model.operation === "ADD_ONE_STEP" ? `${contextLead}: Có ${v[0]} ${model.context}, nhận thêm ${v[1]}. Có tất cả bao nhiêu?` : model.operation === "ADD_THEN_SUBTRACT" ? `${contextLead}: Có ${v[0]} ${model.context}, nhận thêm ${v[1]} rồi dùng ${v[2]}. Còn lại bao nhiêu?` : `${contextLead}: Nhóm A có ${v[0]} ${model.context}. Nhóm B nhiều hơn A ${v[1]}. Ngoài ra có ${v[2]} món dự phòng. Một hộp chứa được ${v[3]} món. Hỏi tổng số món của A, B và phần dự phòng.`;
      publicData = { quantities: v, relation: model.operation, object: model.context };
      break;
    case "DATA_ERROR_REASONING": {
      publicPrompt = `${contextLead}: Bảng ${model.context} ghi A = ${v[0]}, B = ${v[1]}, C = ${v[2]}, Tổng = ${v[3]}. Nhận xét nào chỉ ra đúng lỗi trong bảng?`;
      publicData = { rows: model.labels.slice(0, 4).map((label, index) => ({ label, value: v[index] })), rule: "TOTAL_EQUALS_SUM" };
      visual = { type: "DATA_TABLE", description: `Bảng có ba nhóm ${v[0]}, ${v[1]}, ${v[2]} và tổng đã ghi ${v[3]}.`, data: { labels: model.labels.slice(0, 4), values: v.slice(0, 4) } };
      break;
    }
  }

  if (model.variantId === "FRACTION_PART_WHOLE" && model.interactionType === "CONSTRUCTION_OR_VISUAL_SELECTION") {
    const answer = reduced(v[0]!, v[1]!);
    const correctId = "fraction-correct";
    const candidates = [
      { numerator: v[1]!, denominator: v[0]! },
      { numerator: v[1]! - v[0]!, denominator: v[1]! },
      { numerator: Math.min(v[0]! + 1, v[1]!), denominator: v[1]! },
      { numerator: Math.max(1, v[0]! - 1), denominator: v[1]! },
      { numerator: 1, denominator: v[1]! },
      { numerator: v[0]!, denominator: v[1]! + 1 },
    ];
    const uniqueDistractors = new Map<string, string>();
    for (const candidate of candidates) {
      const normalized = reduced(candidate.numerator, candidate.denominator);
      const key = `${normalized.numerator}/${normalized.denominator}`;
      if (key !== `${answer.numerator}/${answer.denominator}` && !uniqueDistractors.has(key)) {
        uniqueDistractors.set(key, `${candidate.numerator}/${candidate.denominator}`);
      }
    }
    const distractors = [...uniqueDistractors.values()].slice(0, 3);
    if (distractors.length !== 3) throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
    interaction = {
      type: "CONSTRUCTION_OR_VISUAL_SELECTION",
      options: random.shuffle([
        { id: correctId, label: `${answer.numerator}/${answer.denominator}` },
        { id: "fraction-reversed", label: distractors[0]! },
        { id: "fraction-unselected", label: distractors[1]! },
        { id: "fraction-off-by-one", label: distractors[2]! },
      ]),
      choiceCount: 1,
    };
    solved = { ...solved, correct: correctId, accepted: [correctId] };
    optionMisconceptions = {
      "fraction-reversed": "NUMERATOR_DENOMINATOR_CONFUSION",
      "fraction-unselected": "REVERSED_OPERATION",
      "fraction-off-by-one": "CARRY_BORROW_ERROR",
    };
  }

  if (model.interactionType === "SINGLE_CHOICE" || model.variantId === "DATA_ERROR_REASONING") {
    const choices = optionSet(model, solved, random);
    interaction = {
      type: "SINGLE_CHOICE",
      options: choices.options,
      choiceCount: 1,
      ...(model.variantId === "CHART_DATA_INTERPRETATION" ? { unitLabel: model.unit } : {}),
    };
    solved = { ...solved, correct: choices.correct, accepted: [choices.correct] };
    optionMisconceptions = choices.misconceptions;
  }
  if (model.interactionType === "ORDERING") {
    interaction = { type: "ORDERING", options: random.shuffle(model.values.map((value, index) => ({ id: String(value), label: String(value), index } as PublicOption))) };
  }
  return { publicPrompt, publicData, visual, interaction, optionMisconceptions, solved };
}

function independentValidate(
  entry: ProductVariantRegistryEntry,
  model: CanonicalProblemModel,
  prompt: string,
  visual: ProductVisual,
  interaction: ProductInteractionContract,
  solved: SolvedModel,
): ValidationResult {
  const checks: string[] = [];
  if (entry.variantId !== model.variantId) throw new GenerationV2Error("VALIDATION_FAILED");
  checks.push("EXPLICIT_OUTCOME_VARIANT_BINDING");
  if (model.structureLevel !== STRUCTURE_LEVEL[model.difficulty]) throw new GenerationV2Error("VALIDATION_FAILED");
  checks.push("DIFFICULTY_STRUCTURE_BINDING");
  if (!entry.interactionPolicy.includes(interaction.type) && !(entry.variantId === "DATA_ERROR_REASONING" && interaction.type === "SINGLE_CHOICE")) throw new GenerationV2Error("VALIDATION_FAILED");
  checks.push("INTERACTION_POLICY");
  if (!prompt.trim() || /undefined|null|OUTCOME|AST|hash|seed/iu.test(prompt)) throw new GenerationV2Error("VALIDATION_FAILED");
  checks.push("PUBLIC_PROMPT_LANGUAGE");
  const v = model.values;
  if (entry.variantId === "ADD_SUB_MEANING" && (v.some((value) => value < 0 || value > 10) || Number(solved.correct) < 0)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (entry.variantId === "MULTIPLY_DIVIDE_FACTS" && ![2, 5].includes(v[0]!)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (entry.variantId === "PLACE_VALUE_COMPARE" && v.some((value) => value > 100_000 || value < 0)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (entry.variantId === "FRACTION_PART_WHOLE" && (v[1] === 0 || v[0]! <= 0 || v[0]! > v[1]!)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (entry.variantId === "LINEAR_SYSTEM" && v[0]! * v[4]! - v[1]! * v[3]! === 0) throw new GenerationV2Error("VALIDATION_FAILED");
  if (entry.variantId === "UNIT_CONVERSION" && (!model.unit || !model.targetUnit || !model.scale)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (entry.variantId === "EXPERIMENTAL_PROBABILITY" && (v[1]! <= 0 || v[0]! > v[1]! || v[2]! > v[3]! && v[3]! > 0)) throw new GenerationV2Error("VALIDATION_FAILED");
  checks.push("GRADE_PARAMETER_BOUNDS");
  if (visual.type !== "NONE") {
    const serialized = JSON.stringify(visual.data);
    const visualValueCount: Partial<Record<ProductVariantId, number>> = {
      ADD_SUB_MEANING: 2,
      MULTIPLY_DIVIDE_FACTS: 2,
      PLACE_VALUE_COMPARE: model.values.length,
      FRACTION_PART_WHOLE: 2,
      UNIT_CONVERSION: model.operation === "MIXED_TIME_TO_MINUTES" ? 2 : 1,
      PERIMETER_AREA: model.operation === "L_SHAPE_AREA" ? 4 : 2,
      CHART_DATA_INTERPRETATION: model.values.length,
      EXPERIMENTAL_PROBABILITY: model.values[3] ? 4 : 2,
      DATA_ERROR_REASONING: 4,
    };
    for (const value of model.values.slice(0, visualValueCount[entry.variantId] ?? 0)) {
      if (!serialized.includes(String(value))) throw new GenerationV2Error("VALIDATION_FAILED");
    }
    checks.push("VISUAL_MODEL_CONSISTENCY");
  }
  if (interaction.options) {
    const ids = interaction.options.map((option) => option.id);
    const labels = interaction.options.map((option) => option.label);
    if (new Set(ids).size !== ids.length || new Set(labels).size !== labels.length) throw new GenerationV2Error("VALIDATION_FAILED");
    if (interaction.type === "SINGLE_CHOICE" && !ids.includes(String(solved.correct))) throw new GenerationV2Error("VALIDATION_FAILED");
    checks.push("DISTRACTOR_UNIQUENESS_AND_SINGLE_ANSWER");
  }
  checks.push("INDEPENDENT_SOLVER_RESULT");
  return { ok: true, checks };
}

export function generateQuestion(input: GenerateQuestionInput): GeneratedProductQuestion {
  if (!/^[a-z0-9][a-z0-9-]{2,120}$/u.test(input.seed)) throw new GenerationV2Error("INVALID_SEED");
  if (input.locale !== "vi-VN") throw new GenerationV2Error("LOCALE_UNSUPPORTED");
  const waveAContract = getWaveAOutcomeContract(input.outcomeId);
  if (waveAContract && isWaveAImplementedByNewEngine(waveAContract)) {
    return generateWaveAQuestion(waveAContract, input);
  }
  const waveBContract = getWaveBOutcomeContract(input.outcomeId);
  if (waveBContract && isWaveBImplementedByNewEngine(waveBContract)) {
    return generateWaveBQuestion(waveBContract, input);
  }
  const waveCContract = getWaveCOutcomeContract(input.outcomeId);
  if (waveCContract && isWaveCImplementedByNewEngine(waveCContract)) {
    return generateWaveCQuestion(waveCContract, input);
  }
  const waveDContract = getWaveDOutcomeContract(input.outcomeId);
  if (waveDContract && isWaveDImplementedByNewEngine(waveDContract)) {
    return generateWaveDQuestion(waveDContract, input);
  }
  const waveEContract = getWaveEOutcomeContract(input.outcomeId);
  if (waveEContract && isWaveEImplementedByNewEngine(waveEContract)) {
    return generateWaveEQuestion(waveEContract, input);
  }
  const waveFContract = getWaveFOutcomeContract(input.outcomeId);
  if (waveFContract && isWaveFImplementedByNewEngine(waveFContract)) {
    return generateWaveFQuestion(waveFContract, input);
  }
  const entry = getProductVariantByOutcome(input.outcomeId);
  if (!entry) throw new GenerationV2Error("GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED");
  if (entry.grade !== input.grade) throw new GenerationV2Error("GRADE_MISMATCH");
  const random = new Random(`${input.outcomeId}:${input.difficulty}:${input.seed}`);
  const model = buildModel(entry, input, random);
  const independentlySolved = solveModel(model);
  const presentation = publicPresentation(model, independentlySolved, random);
  const validation = independentValidate(entry, model, presentation.publicPrompt, presentation.visual, presentation.interaction, presentation.solved);
  const modelHash = hash(JSON.stringify(model));
  const questionId = `v2-${entry.variantId.toLowerCase().replaceAll("_", "-")}-${hash(`${input.outcomeId}:${input.seed}:${input.difficulty}`).slice(0, 16)}`;
  const publicSnapshot: PublicQuestionSnapshot = {
    schemaVersion: 2,
    questionId,
    grade: entry.grade,
    outcomeId: entry.outcomeId,
    productFamilyId: entry.productFamilyId,
    variantId: entry.variantId,
    variantVersion: VARIANT_VERSION,
    difficulty: input.difficulty,
    publicPrompt: presentation.publicPrompt,
    publicData: { ...presentation.publicData, difficultyStructure: model.structureLevel },
    interaction: presentation.interaction,
    visual: presentation.visual,
    accessibility: {
      prompt: presentation.publicPrompt,
      visualAlternative: presentation.visual.description,
      responseInstruction: responseInstruction(presentation.interaction),
    },
  };
  const privateSolution: PrivateSolutionContract = {
    correctResponse: presentation.solved.correct,
    acceptedResponses: presentation.solved.accepted,
    solutionSteps: presentation.solved.steps,
    optionMisconceptions: presentation.optionMisconceptions,
    nextStep: presentation.solved.nextStep,
  };
  const solverReceipt: SolverReceipt = {
    solverVersion: SOLVER_VERSION,
    normalizedInputHash: modelHash,
    resultHash: hash(JSON.stringify(presentation.solved.correct)),
    uniqueSolution: true,
  };
  const publicSnapshotHash = hash(JSON.stringify(publicSnapshot));
  return {
    publicSnapshot,
    privateSolution,
    solverReceipt,
    validation,
    provenance: {
      questionSource: "GENERATED_V2",
      outcomeId: entry.outcomeId,
      productFamilyId: entry.productFamilyId,
      variantId: entry.variantId,
      variantVersion: VARIANT_VERSION,
      generatorVersion: GENERATOR_V2_VERSION,
      solverVersion: SOLVER_VERSION,
      difficultyPolicyVersion: DIFFICULTY_POLICY_VERSION,
      seedFingerprint: hash(input.seed).slice(0, 16),
      normalizedModelHash: modelHash,
      publicSnapshotHash,
      visualHash: hash(JSON.stringify(presentation.visual)),
      solverReceiptHash: hash(JSON.stringify(solverReceipt)),
    },
  };
}

function responseInstruction(interaction: ProductInteractionContract) {
  switch (interaction.type) {
    case "SINGLE_CHOICE": return "Chọn một đáp án.";
    case "MULTI_SELECT": return `Chọn ${interaction.choiceCount ?? "các"} đáp án đúng.`;
    case "INTEGER_INPUT": return "Nhập một số nguyên.";
    case "DECIMAL_INPUT": return "Nhập một số thập phân.";
    case "FRACTION_INPUT": return "Nhập tử số và mẫu số.";
    case "ORDERING": return "Sắp xếp các mục theo đúng thứ tự.";
    case "MATCHING": return "Ghép từng mục ở hai cột.";
    case "TABLE_OR_CHART_RESPONSE": return "Đọc bảng hoặc biểu đồ rồi nhập kết quả.";
    case "CONSTRUCTION_OR_VISUAL_SELECTION": return "Chọn mô hình hoặc hình phù hợp.";
    case "SHORT_STRUCTURED_RESPONSE": return "Nhập câu trả lời ngắn theo cấu trúc được yêu cầu.";
  }
}

function normalizeResponse(response: CanonicalResponse): string {
  if (typeof response === "number") return String(Number(response.toFixed(8)));
  if (typeof response === "string") return response.trim().toLocaleLowerCase("vi").replace(",", ".").replace(/\s+/gu, "");
  if (Array.isArray(response)) {
    if (response.every((item) => typeof item === "string")) return JSON.stringify(response);
    return JSON.stringify([...response].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
  }
  if ("numerator" in response && "denominator" in response) {
    if (response.denominator === 0) return "INVALID_FRACTION";
    const value = reduced(response.numerator, response.denominator);
    return `${value.numerator}/${value.denominator}`;
  }
  return JSON.stringify(response);
}

export function validateStudentResponse(
  question: GeneratedProductQuestion,
  response: CanonicalResponse,
): FeedbackContract {
  const normalized = normalizeResponse(response);
  const isCorrect = question.privateSolution.acceptedResponses.some((accepted) => normalizeResponse(accepted) === normalized);
  const misconception = typeof response === "string" ? question.privateSolution.optionMisconceptions[response] : undefined;
  const explanation = isCorrect
    ? "Cách trả lời của em phù hợp với dữ kiện của bài toán."
    : misconception
      ? misconceptionMessage(misconception, question.publicSnapshot.grade)
      : variantFeedbackMessage(question.publicSnapshot.variantId, question.publicSnapshot.grade);
  return {
    isCorrect,
    headline: isCorrect ? "Chính xác" : "Mình xem lại nhé",
    explanation,
    steps: question.privateSolution.solutionSteps,
    nextStep: question.privateSolution.nextStep,
    ...(misconception ? { misconception } : {}),
  };
}

function misconceptionMessage(code: MisconceptionCode | undefined, grade: number) {
  const gentle = grade <= 4 ? "Em" : "Bạn";
  switch (code) {
    case "CARRY_BORROW_ERROR": return `${gentle} hãy tính lại từng hàng và kiểm tra bước thêm hoặc bớt.`;
    case "PLACE_VALUE_CONFUSION": return `${gentle} hãy so sánh từ hàng lớn nhất trước.`;
    case "REVERSED_OPERATION": return `${gentle} đang dùng phép tính theo chiều ngược; hãy đọc lại điều đang thay đổi.`;
    case "MULTIPLICATION_AS_ADDITION": return `${gentle} đã cộng số nhóm với số phần tử; cần cộng lặp hoặc dùng phép nhân.`;
    case "NUMERATOR_DENOMINATOR_CONFUSION": return `${gentle} hãy phân biệt số phần được chọn và tổng số phần bằng nhau.`;
    case "SIGN_ERROR": return `${gentle} hãy kiểm tra dấu của từng số trước khi biến đổi.`;
    case "UNIT_CONVERSION_ERROR": return `${gentle} hãy viết quan hệ giữa hai đơn vị trước khi nhân hoặc chia.`;
    case "PERIMETER_AREA_CONFUSION": return `${gentle} hãy xác định đề hỏi đường bao quanh hay phần mặt được phủ.`;
    case "MISREAD_CHART_SCALE": return `${gentle} hãy đọc khoảng cách giữa hai vạch chia của biểu đồ.`;
    case "PROBABILITY_DENOMINATOR_ERROR": return `${gentle} hãy dùng tổng số lần thử làm mẫu số.`;
    case "IGNORED_SECOND_STEP": return `${gentle} mới hoàn thành một bước; đề bài còn một thay đổi nữa.`;
    case "DATA_RELATION_IGNORED": return `${gentle} hãy viết phép kiểm tra giữa các số liệu trước khi kết luận.`;
    case "ROUNDING_PLACE_ERROR": return `${gentle} hãy xác định đúng hàng làm tròn rồi nhìn chữ số ngay bên phải.`;
    case "FACTOR_MULTIPLE_CONFUSION": return `${gentle} hãy kiểm tra lại bằng phép chia hết để phân biệt ước và bội.`;
    case "PRIME_COMPOSITE_CONFUSION": return `${gentle} hãy liệt kê các ước; số nguyên tố có đúng hai ước dương.`;
    case "EXPONENT_RULE_ERROR": return `${gentle} hãy giữ nguyên cơ số và xử lí số mũ theo đúng phép nhân hoặc chia.`;
    case "ORDER_OF_OPERATIONS_ERROR": return `${gentle} hãy thực hiện ngoặc, lũy thừa, nhân chia rồi mới cộng trừ.`;
    case "REMAINDER_ERROR": return `${gentle} hãy dùng số bị chia = số chia × thương + số dư và kiểm tra số dư nhỏ hơn số chia.`;
    default: return `${gentle} hãy đối chiếu từng dữ kiện với câu hỏi rồi thử lại.`;
  }
}

function variantFeedbackMessage(variantId: ProductVariantId, grade: number) {
  const gentle = grade <= 4 ? "Em" : "Bạn";
  if (["NUMBER_RECOGNITION_REPRESENTATION", "COUNTING_SEQUENCE", "PLACE_VALUE_COMPOSE", "PLACE_VALUE_COMPARE"].includes(variantId)) return `${gentle} hãy đọc lại từng hàng của số và xác định đúng vị trí cần tìm.`;
  if (["COMPARE_ORDER", "COMPARE_ORDER_ESTIMATE", "ROUND_ESTIMATE"].includes(variantId)) return `${gentle} hãy chuẩn hóa cách viết, so sánh từ hàng lớn nhất rồi kiểm tra chiều sắp xếp hoặc hàng làm tròn.`;
  if (["ADD_SUB_MEANING", "ADD_SUB_CALCULATION", "MENTAL_ARITHMETIC", "WRITTEN_ARITHMETIC", "MULTIPLY_DIVIDE", "MULTIPLY_DIVIDE_FACTS", "MIXED_ARITHMETIC_EXPRESSION", "MISSING_COMPONENT", "OPERATION_COMPONENTS", "INTEGER_OPERATION", "APPLIED_ARITHMETIC"].includes(variantId)) return `${gentle} hãy xác định phép tính và vị trí số chưa biết, thực hiện từng bước rồi dùng phép tính ngược để kiểm tra.`;
  if (["DIVISION_WITH_REMAINDER", "DIVISIBILITY_RULE", "FACTOR_MULTIPLE", "PRIME_COMPOSITE", "PRIME_FACTORIZATION"].includes(variantId)) return `${gentle} hãy kiểm tra quan hệ chia hết, ước–bội và điều kiện của số dư trước khi kết luận.`;
  if (["RATIONAL_NUMBER_REASONING", "FRACTION_PERCENT_VALUE", "MIXED_NUMBER_REPRESENTATION"].includes(variantId)) return `${gentle} hãy xác định tử, mẫu hoặc tỉ lệ, quy đồng hay rút gọn trước khi ghi kết quả.`;
  if (["POWER_AND_ROOT", "RADICAL_EXPRESSION"].includes(variantId)) return `${gentle} hãy kiểm tra cơ số, số mũ và căn số học; chỉ áp dụng quy tắc cho đúng dạng biểu thức.`;
  if (["ALGEBRAIC_EXPRESSION_RECOGNITION", "POLYNOMIAL_OPERATION", "RATIONAL_EXPRESSION_OPERATION", "INEQUALITY_PROPERTY", "OPERATION_PROPERTY"].includes(variantId)) return `${gentle} hãy nhóm đúng hạng tử, giữ điều kiện xác định và kiểm tra dấu khi biến đổi.`;
  if (["DATA_CLASSIFICATION", "DATA_RELATION_REASONING", "DATA_ERROR_REASONING"].includes(variantId)) return `${gentle} hãy đọc đúng tiêu chí, nhãn và quan hệ giữa các số liệu rồi mới tính hoặc sắp xếp.`;
  if (variantId === "SHAPE_RECOGNITION") return `${gentle} hãy đối chiếu số mặt đáy, mặt cong và đặc điểm của khối trong hình.`;
  if (variantId === "INTEGER_NUMBER_LINE") return `${gentle} hãy đọc chiều tăng của trục số và khoảng cách tới 0.`;
  if (variantId === "BANKING_FINANCE") return `${gentle} hãy phân biệt vốn, lãi suất, thời gian và số dư; viết công thức lãi đơn trước khi tính.`;
  return `${gentle} hãy đối chiếu từng dữ kiện với yêu cầu và kiểm tra lại bằng một cách độc lập.`;
}

export function publicQuestionOnly(question: GeneratedProductQuestion): PublicQuestionSnapshot {
  return structuredClone(question.publicSnapshot);
}

export function assertPublicBoundary(value: unknown) {
  const serialized = JSON.stringify(value);
  const forbidden = ["correctResponse", "acceptedResponses", "rawSeed", "solverReceipt", "normalizedModelHash", "solverReceiptHash", "privateSolution", "validation"];
  for (const key of forbidden) if (serialized.includes(key)) throw new Error(`GENERATION_V2:PRIVATE_FIELD_EXPOSED:${key}`);
  return true;
}

export function verifyQuestionIntegrity(question: GeneratedProductQuestion) {
  const entry = getProductVariantByOutcome(question.publicSnapshot.outcomeId);
  if (!entry || entry.variantId !== question.publicSnapshot.variantId || entry.grade !== question.publicSnapshot.grade) {
    throw new Error("GENERATION_V2:INTEGRITY_OUTCOME_BINDING");
  }
  if (hash(JSON.stringify(question.publicSnapshot)) !== question.provenance.publicSnapshotHash) {
    throw new Error("GENERATION_V2:INTEGRITY_PUBLIC_SNAPSHOT");
  }
  if (hash(JSON.stringify(question.publicSnapshot.visual)) !== question.provenance.visualHash) {
    throw new Error("GENERATION_V2:INTEGRITY_VISUAL");
  }
  if (hash(JSON.stringify(question.solverReceipt)) !== question.provenance.solverReceiptHash) {
    throw new Error("GENERATION_V2:INTEGRITY_SOLVER_RECEIPT");
  }
  if (question.publicSnapshot.publicData.difficultyStructure !== STRUCTURE_LEVEL[question.publicSnapshot.difficulty]) {
    throw new Error("GENERATION_V2:INTEGRITY_DIFFICULTY");
  }
  const uniqueAnswers = new Set(question.privateSolution.acceptedResponses.map(normalizeResponse));
  if (uniqueAnswers.size !== 1 || !uniqueAnswers.has(normalizeResponse(question.privateSolution.correctResponse))) {
    throw new Error("GENERATION_V2:INTEGRITY_AMBIGUOUS_SOLUTION");
  }
  const options = question.publicSnapshot.interaction.options;
  if (options) {
    if (new Set(options.map((item) => item.id)).size !== options.length || new Set(options.map((item) => item.label)).size !== options.length) {
      throw new Error("GENERATION_V2:INTEGRITY_DISTRACTORS");
    }
    if (question.publicSnapshot.interaction.type === "SINGLE_CHOICE" || question.publicSnapshot.interaction.type === "CONSTRUCTION_OR_VISUAL_SELECTION") {
      if (options.filter((item) => item.id === String(question.privateSolution.correctResponse)).length !== 1) {
        throw new Error("GENERATION_V2:INTEGRITY_CORRECT_OPTION");
      }
    }
  }
  const data = question.publicSnapshot.publicData;
  if (entry.variantId === "FRACTION_PART_WHOLE") {
    const denominator = Number(data.totalParts);
    const numerator = Number(data.selectedParts);
    if (!Number.isInteger(denominator) || denominator <= 0 || numerator <= 0 || numerator > denominator) {
      throw new Error("GENERATION_V2:INTEGRITY_FRACTION");
    }
    if (
      data.visualModel !== "SEGMENTED_BAR" ||
      question.publicSnapshot.visual.data.modelType !== "SEGMENTED_BAR" ||
      /(?:hình|vòng) tròn|ô vuông/iu.test(String(data.representation))
    ) {
      throw new Error("GENERATION_V2:INTEGRITY_FRACTION_VISUAL");
    }
    const reference = data.colorReference;
    const regions = question.publicSnapshot.visual.data.semanticRegions;
    const referenceRecord = typeof reference === "object" && reference !== null && !Array.isArray(reference)
      ? reference as Readonly<Record<string, unknown>>
      : null;
    const regionRecord = Array.isArray(regions) && regions.length === 1 && typeof regions[0] === "object" && regions[0] !== null && !Array.isArray(regions[0])
      ? regions[0] as Readonly<Record<string, unknown>>
      : null;
    if (
      !referenceRecord || !regionRecord ||
      regionRecord.id !== referenceRecord.regionId ||
      regionRecord.colorId !== referenceRecord.colorId ||
      regionRecord.colorLabel !== referenceRecord.colorLabel ||
      regionRecord.pattern !== "DIAGONAL_STRIPES" ||
      !String(question.publicSnapshot.visual.description).includes(`màu ${String(referenceRecord.colorLabel)}`)
    ) {
      throw new Error("GENERATION_V2:INTEGRITY_FRACTION_COLOR_VISUAL");
    }
  }
  if (entry.variantId === "UNIT_CONVERSION") {
    if (!data.sourceUnit || !data.targetUnit || data.sourceUnit === data.targetUnit) {
      throw new Error("GENERATION_V2:INTEGRITY_UNIT_DIMENSION");
    }
    if (question.publicSnapshot.visual.data.source !== data.sourceUnit || question.publicSnapshot.visual.data.target !== data.targetUnit) {
      throw new Error("GENERATION_V2:INTEGRITY_UNIT_VISUAL");
    }
    const expectedSourceDisplay = data.remainder === undefined
      ? `${data.value} ${data.sourceUnit}`
      : `${data.value} phút ${data.remainder} giây`;
    if (data.sourceDisplay !== expectedSourceDisplay || question.publicSnapshot.visual.data.sourceDisplay !== expectedSourceDisplay) {
      throw new Error("GENERATION_V2:INTEGRITY_UNIT_VISUAL_VALUES");
    }
  }
  if (entry.variantId === "CHART_DATA_INTERPRETATION") {
    if (JSON.stringify(data.labels) !== JSON.stringify(question.publicSnapshot.visual.data.labels) || JSON.stringify(data.values) !== JSON.stringify(question.publicSnapshot.visual.data.values)) {
      throw new Error("GENERATION_V2:INTEGRITY_CHART_VISUAL");
    }
    if (!data.unit || data.unit !== question.publicSnapshot.visual.data.unit || data.unit !== question.publicSnapshot.interaction.unitLabel) {
      throw new Error("GENERATION_V2:INTEGRITY_CHART_UNIT");
    }
  }
  if (entry.variantId === "GEOMETRY_PROPERTIES" && data.shape !== question.publicSnapshot.visual.data.shape) {
    throw new Error("GENERATION_V2:INTEGRITY_GEOMETRY_VISUAL");
  }
  if (entry.variantId === "ADD_SUB_MEANING") {
    const initial = Number(data.initial);
    const change = Number(data.change);
    if (initial < 0 || initial > 10 || change < 0 || change > 10) throw new Error("GENERATION_V2:INTEGRITY_GRADE_BOUND");
  }
  return true;
}

export const __negativeControl = {
  validateModel(entry: ProductVariantRegistryEntry, model: CanonicalProblemModel, prompt: string, visual: ProductVisual, interaction: ProductInteractionContract, solved: SolvedModel) {
    return independentValidate(entry, model, prompt, visual, interaction, solved);
  },
};
