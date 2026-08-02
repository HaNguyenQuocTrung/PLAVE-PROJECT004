import { createHash } from "node:crypto";

import {
  DIFFICULTY_POLICY_VERSION,
  GENERATOR_V2_VERSION,
  GenerationV2Error,
  SOLVER_VERSION,
  VARIANT_VERSION,
  type CanonicalResponse,
  type GenerateQuestionInput,
  type GeneratedProductQuestion,
  type MisconceptionCode,
  type ProductInteractionContract,
  type ProductVisual,
  type PublicOption,
} from "./types.ts";
import {
  WAVE_A_ENGINE_VERSION,
  type WaveAOutcomeContract,
} from "./wave-a-contracts.ts";

type JsonScalar = string | number | boolean | null;
type ModelMeta = Readonly<Record<string, JsonScalar | readonly JsonScalar[] | readonly Readonly<Record<string, JsonScalar>>[]>>;

export type WaveANormalizedProblemModel = Readonly<{
  schemaVersion: 1;
  engineVersion: typeof WAVE_A_ENGINE_VERSION;
  outcomeId: string;
  variantId: WaveAOutcomeContract["canonicalVariantId"];
  modelKind: Exclude<WaveAOutcomeContract["modelKind"], "PROVEN_V2_BASELINE">;
  profile: WaveAOutcomeContract["profile"];
  grade: number;
  difficulty: GenerateQuestionInput["difficulty"];
  structureLevel: 1 | 2 | 3;
  structuralFingerprint: string;
  templateIndex: number;
  contextIndex: number;
  task: string;
  operation: string;
  values: readonly number[];
  labels: readonly string[];
  meta: ModelMeta;
}>;

type WaveASolution = Readonly<{
  correct: CanonicalResponse;
  accepted: readonly CanonicalResponse[];
  steps: readonly string[];
  nextStep: string;
  options?: readonly PublicOption[];
  optionMisconceptions?: Readonly<Record<string, MisconceptionCode>>;
}>;

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const gcd = (a: number, b: number): number => b === 0 ? Math.abs(a) : gcd(b, a % b);
const reduceFraction = (numerator: number, denominator: number) => {
  if (denominator === 0) throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);
  return { numerator: sign * numerator / divisor, denominator: sign * denominator / divisor };
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
  shuffle<T>(items: readonly T[]): T[] {
    return [...items].map((item) => ({ item, key: this.int(0, 1_000_000) })).sort((a, b) => a.key - b.key).map(({ item }) => item);
  }
}

const STRUCTURE = { EASY: 1, MEDIUM: 2, HARD: 3 } as const;
const LEADS = [
  "Tính cẩn thận", "Hoàn thành thử thách", "Quan sát dữ kiện", "Giúp bạn Minh kiểm tra", "Chọn chiến lược phù hợp", "Viết kết quả", "Đọc rồi trả lời", "Tìm giá trị còn thiếu", "Kiểm tra bằng phép tính ngược", "Suy luận từng bước", "So sánh trước khi trả lời", "Hoàn thiện bài toán",
  "Thử cách làm hợp lí", "Phân tích yêu cầu", "Đối chiếu các dữ kiện", "Giúp nhóm học tập", "Trình bày kết quả", "Chọn bước bắt đầu", "Dùng quy tắc phù hợp", "Kiểm tra kết luận", "Hoàn thành phiếu học tập", "Giải thích bằng phép tính", "Tìm quy luật cần dùng", "Xác định điều phải tìm",
  "Đọc biểu diễn toán học", "Chọn phép kiểm tra", "Lập kế hoạch ngắn", "Giúp bạn Lan hoàn thiện", "Tách bài toán thành bước", "Nêu kết quả chính xác", "Kiểm tra miền giá trị", "Dùng dữ kiện cần thiết", "Hoàn thành bảng con", "Thử một cách suy luận", "Đọc kĩ kí hiệu", "Kết nối các quan hệ",
] as const;
const CONTEXTS = [
  "góc học tập", "thư viện lớp", "câu lạc bộ Toán", "khu vườn trường", "quầy sách", "bảng theo dõi", "hộp thẻ số", "buổi thực hành", "kho dụng cụ", "chuyến tham quan", "gian hàng nhỏ", "phòng thí nghiệm",
  "tủ đồ dùng", "ngày hội Toán", "sân trường", "phòng đọc", "nhóm trực nhật", "bàn trưng bày", "xưởng mô hình", "phiếu khảo sát", "góc tái chế", "lớp học xanh", "khu trải nghiệm", "bảng kế hoạch",
  "nhóm học cuối tuần", "góc trò chơi số", "tủ sách chung", "buổi sinh hoạt lớp", "trạm thực hành", "bảng thi đua", "khu đọc mở", "góc sáng tạo", "phòng đa năng", "dự án của lớp", "bàn học nhóm", "sổ theo dõi",
] as const;

function safeWholeMaximum(contract: WaveAOutcomeContract) {
  const gradeCap = [0, 100, 1_000, 100_000, 1_000_000, 10_000_000, 100_000, 100_000, 100_000, 100_000][contract.grade] ?? 10_000;
  const exactCaps: Readonly<Record<string, number>> = {
    "MOET2018-G1-NUM-P022-002": 20,
    "MOET2018-G1-NUM-P022-005": 20,
    "MOET2018-G1-NUM-P022-010": 10,
    "MOET2018-G2-NUM-P025-005": 100,
    "MOET2018-G2-NUM-P025-006": 100,
    "MOET2018-G2-NUM-P025-009": 50,
    "MOET2018-G2-NUM-P025-013": 20,
    "MOET2018-G3-NUM-P030-016": 100,
  };
  return Math.min(contract.parameterBounds.maximum, exactCaps[contract.outcomeId] ?? gradeCap);
}

function baseModel(contract: WaveAOutcomeContract, input: GenerateQuestionInput, random: Random) {
  const structureLevel = STRUCTURE[input.difficulty];
  const templateIndex = random.int(0, LEADS.length - 1);
  const contextIndex = random.int(0, CONTEXTS.length - 1);
  return { structureLevel, templateIndex, contextIndex };
}

function model(
  contract: WaveAOutcomeContract,
  input: GenerateQuestionInput,
  random: Random,
  fields: Omit<WaveANormalizedProblemModel, "schemaVersion" | "engineVersion" | "outcomeId" | "variantId" | "modelKind" | "profile" | "grade" | "difficulty" | "structureLevel" | "templateIndex" | "contextIndex" | "structuralFingerprint"> & { structuralFingerprint: string },
): WaveANormalizedProblemModel {
  const base = baseModel(contract, input, random);
  return {
    schemaVersion: 1,
    engineVersion: WAVE_A_ENGINE_VERSION,
    outcomeId: contract.outcomeId,
    variantId: contract.canonicalVariantId,
    modelKind: contract.modelKind as Exclude<WaveAOutcomeContract["modelKind"], "PROVEN_V2_BASELINE">,
    profile: contract.profile,
    grade: contract.grade,
    difficulty: input.difficulty,
    ...base,
    ...fields,
  };
}

function buildNumericModel(contract: WaveAOutcomeContract, input: GenerateQuestionInput, random: Random) {
  const max = safeWholeMaximum(contract);
  const level = STRUCTURE[input.difficulty];
  const capability = contract.canonicalVariantId;
  if (capability === "NUMBER_RECOGNITION_REPRESENTATION" || capability === "PLACE_VALUE_COMPOSE") {
    const upper = Math.max(99, Math.min(max, 999_999));
    const value = random.int(contract.grade <= 2 ? 10 : 100, upper);
    const place = contract.grade <= 2 ? (level === 1 ? 1 : 10) : level === 1 ? 1 : level === 2 ? 10 : 100;
    const digit = Math.floor(value / place) % 10;
    const task = capability === "PLACE_VALUE_COMPOSE" || level >= 2 ? "DIGIT_VALUE" : "READ_REPRESENTATION";
    return model(contract, input, random, { task, operation: "PLACE_VALUE", values: [value, place, digit], labels: ["số", "hàng", "chữ số"], meta: { representation: level === 1 ? "base-ten blocks" : level === 2 ? "expanded form" : "place-value statement", unknownPosition: level }, structuralFingerprint: `${task}:representation-${level}:steps-${level}` });
  }

  const signed = contract.profile === "INTEGER";
  const choose = (minimum: number, maximum: number) => signed ? random.int(-maximum, maximum) : random.int(minimum, maximum);
  const smallMax = Math.max(10, Math.min(max, contract.grade <= 2 ? max : 9_999));
  let operation = "+";
  if (capability === "MULTIPLY_DIVIDE") operation = level === 1 ? "*" : level === 2 ? "/" : random.pick(["*", "/"]);
  else if (capability === "INTEGER_OPERATION") operation = random.pick(["+", "-", "*"]);
  else if (capability === "MIXED_ARITHMETIC_EXPRESSION") {
    operation = contract.grade <= 2
      ? level === 1 ? "+-" : level === 2 ? "-+" : "+-UNKNOWN"
      : level === 1 ? "+-" : level === 2 ? "*+" : "PARENTHESIZED";
  }
  else if (capability === "MENTAL_ARITHMETIC") operation = random.pick(["+", "-", "*", "/"]);
  else if (capability === "WRITTEN_ARITHMETIC") operation = level === 1 ? random.pick(["+", "-"]) : random.pick(["+", "-", "*", "/"]);
  else if (capability === "MISSING_COMPONENT") operation = random.pick(["+", "-", "*", "/"]);
  else operation = random.pick(["+", "-"]);

  if (operation === "*" || operation === "/") {
    const factor = random.int(2, Math.min(contract.grade <= 3 ? 10 : 30, Math.max(2, Math.floor(Math.sqrt(smallMax)))));
    const other = random.int(2, Math.min(contract.grade <= 3 ? 10 : 40, Math.max(2, Math.floor(smallMax / factor))));
    const product = factor * other;
    const values = operation === "/" ? [product, factor, other] : [factor, other, product];
    const task = level === 1 ? "DIRECT" : level === 2 ? "MISSING_OPERAND" : "INVERSE_CHECK";
    return model(contract, input, random, { task, operation, values, labels: ["a", "b", "kết quả"], meta: { unknownPosition: level === 1 ? "result" : level === 2 ? "operand" : "inverse", representation: level === 1 ? "equation" : level === 2 ? "missing-box" : "operation-pair", reasoningSteps: level }, structuralFingerprint: `${operation}:${task}:unknown-${level}:steps-${level}` });
  }

  if (["+-", "-+", "+-UNKNOWN", "*+", "PARENTHESIZED"].includes(operation)) {
    const a = random.int(2, Math.min(50, smallMax));
    const b = random.int(2, Math.min(20, smallMax));
    const first = operation === "-+" ? Math.max(a, b) : a;
    const second = operation === "-+" ? Math.min(a, b) : b;
    const c = random.int(1, Math.min(15, smallMax, first + second));
    const values = operation === "+-UNKNOWN"
      ? [first, second, c, first + second - c]
      : [first, second, c];
    const task = operation === "+-UNKNOWN"
      ? "MISSING_START"
      : level === 1 ? "LEFT_TO_RIGHT" : level === 2 ? (operation === "*+" ? "PRECEDENCE" : "LEFT_TO_RIGHT_REVERSED") : "PARENTHESES";
    return model(contract, input, random, { task, operation, values, labels: operation === "+-UNKNOWN" ? ["số cần tìm", "số cộng", "số trừ", "kết quả"] : ["a", "b", "c"], meta: { unknownPosition: operation === "+-UNKNOWN" ? "first-operand" : "result", representation: operation === "+-UNKNOWN" ? "missing-box" : level === 3 ? "parenthesized" : "linear-expression", reasoningSteps: level }, structuralFingerprint: `${operation}:expression-${level}:steps-${level}` });
  }

  const a = signed ? choose(1, Math.min(100, smallMax)) : random.int(Math.min(2, smallMax), smallMax);
  const bLimit = Math.max(1, Math.min(Math.abs(a) || 10, contract.grade <= 2 ? 100 : 2_000));
  const b = signed ? choose(1, bLimit) : random.int(1, bLimit);
  const normalizedA = operation === "-" && !signed && a < b ? b : a;
  const normalizedB = operation === "-" && !signed && a < b ? a : b;
  const directResult = operation === "+" ? normalizedA + normalizedB : normalizedA - normalizedB;
  if (level === 3) {
    const c = signed ? choose(1, 30) : random.int(1, Math.max(1, Math.min(30, directResult)));
    return model(contract, input, random, { task: "TWO_STEP", operation: `${operation}${operation === "+" ? "-" : "+"}`, values: [normalizedA, normalizedB, c], labels: ["a", "b", "c"], meta: { unknownPosition: "result", representation: "two-step-expression", reasoningSteps: 3 }, structuralFingerprint: `${operation}:two-step:combined-operation:steps-3` });
  }
  const task = level === 1 ? "DIRECT" : "MISSING_OPERAND";
  return model(contract, input, random, { task, operation, values: [normalizedA, normalizedB, directResult], labels: ["a", "b", "kết quả"], meta: { unknownPosition: level === 1 ? "result" : "left-operand", representation: level === 1 ? "equation" : "missing-box", reasoningSteps: level }, structuralFingerprint: `${operation}:${task}:unknown-${level}:steps-${level}` });
}

function buildWaveAModel(contract: WaveAOutcomeContract, input: GenerateQuestionInput, random: Random): WaveANormalizedProblemModel {
  const level = STRUCTURE[input.difficulty];
  const max = safeWholeMaximum(contract);
  switch (contract.modelKind) {
    case "NUMERIC": return buildNumericModel(contract, input, random);
    case "ORDER": {
      if (contract.canonicalVariantId === "COMPARE_ORDER_ESTIMATE" && level === 3) {
        const actual = random.int(31, 189);
        return model(contract, input, random, { task: "ESTIMATE_TENS", operation: "ROUND_TO_10", values: [actual, 10], labels: ["số đồ vật", "nhóm chục"], meta: { direction: "nearest", representation: "grouped-objects", reasoningSteps: 3 }, structuralFingerprint: "estimate:group-tens:representation-objects:steps-3" });
      }
      const decimal = contract.profile === "DECIMAL";
      const integer = contract.profile === "INTEGER";
      const count = level === 1 ? 3 : 4;
      const base = random.int(integer ? -50 : 10, Math.min(9_000, max));
      const raw = Array.from({ length: count }, (_, index) => base + (index + 1) * random.int(2, 19));
      const values = raw.map((value, index) => decimal ? Number((value / 10 + index / 100).toFixed(2)) : integer && index % 2 === 0 ? -Math.abs(value % 100) : value);
      const unique = [...new Set(values)];
      while (unique.length < count) unique.push(Math.max(...unique) + (decimal ? 0.1 : 1));
      const direction = level === 2 ? "DESC" : "ASC";
      return model(contract, input, random, { task: level === 3 ? "ORDER_WITH_CLOSE_VALUES" : "ORDER", operation: direction, values: unique, labels: unique.map((_, index) => `n${index + 1}`), meta: { direction, representation: integer ? "number-line" : decimal ? "decimal-cards" : "number-cards", reasoningSteps: level }, structuralFingerprint: `order:${direction}:count-${count}:representation-${integer ? "signed" : decimal ? "decimal" : "whole"}:steps-${level}` });
    }
    case "ROUND": {
      if (contract.profile === "DECIMAL") {
        const scale = level === 1 ? 10 : level === 2 ? 100 : 1_000;
        const raw = random.int(101, 9_999) / scale;
        const step = level === 1 ? 1 : level === 2 ? 0.1 : 0.01;
        return model(contract, input, random, { task: "ROUND_DECIMAL", operation: "ROUND", values: [raw, step], labels: ["số", "độ chính xác"], meta: { roundingPlace: step, representation: level === 3 ? "accuracy-statement" : "place-name", reasoningSteps: level }, structuralFingerprint: `round:decimal:step-${step}:representation-${level}` });
      }
      const availablePlaces = max >= 10_000 ? [10, 100, 1_000] : max >= 1_000 ? [10, 100, 100] : [10, 10, 10];
      const place = availablePlaces[level - 1]!;
      const value = random.int(place + 1, Math.max(place + 2, Math.min(max, place * 99)));
      return model(contract, input, random, { task: contract.canonicalVariantId === "COMPARE_ORDER_ESTIMATE" ? "ESTIMATE_TENS" : "ROUND_INTEGER", operation: "ROUND", values: [value, place], labels: ["số", "hàng làm tròn"], meta: { roundingPlace: place, representation: level === 3 ? "number-line-midpoint" : "place-name", reasoningSteps: level }, structuralFingerprint: `round:integer:place-${place}:representation-${level}` });
    }
    case "MATCH": {
      const multiplication = contract.outcomeId.endsWith("006");
      const a = random.int(2, 20); let b = random.int(2, 20);
      if (b === a) b = b === 20 ? 19 : b + 1;
      const result = multiplication ? a * b : a + b;
      return model(contract, input, random, { task: multiplication ? "MULTIPLICATION_COMPONENTS" : "ADDITION_COMPONENTS", operation: multiplication ? "*" : "+", values: [a, b, result], labels: multiplication ? ["Thừa số thứ nhất", "Thừa số thứ hai", "Tích"] : ["Số hạng thứ nhất", "Số hạng thứ hai", "Tổng"], meta: { representation: level === 1 ? "labeled-equation" : level === 2 ? "shuffled-roles" : "inverse-operation-pair", reasoningSteps: level }, structuralFingerprint: `match:${multiplication ? "multiply" : "add"}:representation-${level}:roles-3` });
    }
    case "INTEGER_LINE": {
      const value = random.int(-20 - level * 5, 20 + level * 5);
      const task = level === 1 ? "READ_MARK" : level === 2 ? "OPPOSITE" : "DISTANCE_FROM_ZERO";
      return model(contract, input, random, { task, operation: task, values: [value, -value, Math.abs(value)], labels: ["điểm đánh dấu", "số đối", "khoảng cách"], meta: { minimumTick: Math.min(-10, value - 3), maximumTick: Math.max(10, value + 3), marked: value, representation: "number-line", reasoningSteps: level }, structuralFingerprint: `integer-line:${task}:visual-required:steps-${level}` });
    }
    case "FRACTION": {
      const denominatorA = random.int(2, Math.min(12 + level * 4, contract.parameterBounds.maxDenominator));
      const denominatorB = random.int(2, Math.min(12 + level * 4, contract.parameterBounds.maxDenominator));
      const numeratorA = random.int(1, denominatorA - 1);
      const numeratorB = random.int(1, denominatorB - 1);
      if (contract.canonicalVariantId === "RATIONAL_NUMBER_REASONING") return model(contract, input, random, { task: "COMPARE_FRACTIONS", operation: "COMPARE", values: [numeratorA, denominatorA, numeratorB, denominatorB], labels: ["tử A", "mẫu A", "tử B", "mẫu B"], meta: { representation: level === 1 ? "common-denominator" : level === 2 ? "cross-product" : "number-line-reasoning", reasoningSteps: level }, structuralFingerprint: `fraction:compare:representation-${level}:steps-${level}` });
      const whole = random.int(20, Math.min(600, max));
      const percentMode = contract.profile === "PERCENT";
      const rateNumerator = percentMode ? random.pick([10, 20, 25, 40, 50, 75]) : random.int(1, Math.min(denominatorA - 1, 5));
      const rateDenominator = percentMode ? 100 : denominatorA;
      const adjustedWhole = percentMode ? whole * 100 / gcd(whole, 100) : whole * rateDenominator;
      const task = level === 3 ? "RECOVER_WHOLE" : "FIND_PART";
      return model(contract, input, random, { task, operation: percentMode ? "PERCENT_OF" : "FRACTION_OF", values: [rateNumerator, rateDenominator, adjustedWhole], labels: ["tỉ lệ tử", "tỉ lệ mẫu", "số ban đầu"], meta: { representation: percentMode ? "percent" : "fraction", unknownPosition: task === "FIND_PART" ? "part" : "whole", reasoningSteps: level }, structuralFingerprint: `rate:${percentMode ? "percent" : "fraction"}:${task}:steps-${level}` });
    }
    case "POWER_ROOT": {
      if (contract.profile === "RADICAL") {
        const root = random.int(2, 30);
        const index = level === 3 && contract.grade >= 9 ? 3 : 2;
        const radicand = root ** index;
        return model(contract, input, random, { task: level === 1 ? "PRINCIPAL_ROOT" : level === 2 ? "EXACT_ROOT" : "ROOT_REASONING", operation: index === 2 ? "SQRT" : "CBRT", values: [radicand, index, root], labels: ["số dưới căn", "bậc căn", "căn"], meta: { representation: level === 3 ? "calculator-check" : "perfect-power", reasoningSteps: level }, structuralFingerprint: `root:index-${index}:representation-${level}:steps-${level}` });
      }
      const base = contract.profile === "FRACTION" ? random.int(2, 5) : random.int(2, 9);
      const e2 = random.int(1, Math.min(3, contract.parameterBounds.maxExponent));
      const e1 = level === 3
        ? random.int(e2, Math.max(e2, Math.min(5, contract.parameterBounds.maxExponent)))
        : random.int(2, Math.min(4, contract.parameterBounds.maxExponent));
      const sameBaseOutcome = contract.outcomeId === "MOET2018-G6-NAA-P047-009";
      const task = sameBaseOutcome
        ? level === 3 ? "DIVIDE_SAME_BASE" : "MULTIPLY_SAME_BASE"
        : level === 1 ? "EVALUATE_POWER" : level === 2 ? "MULTIPLY_SAME_BASE" : "DIVIDE_SAME_BASE";
      return model(contract, input, random, { task, operation: "POWER", values: [base, e1, e2], labels: ["cơ số", "số mũ 1", "số mũ 2"], meta: { representation: task, reasoningSteps: level }, structuralFingerprint: `power:${task}:exponents-${level}:steps-${level}` });
    }
    case "MULTI_SELECT": {
      const divisibilityRule = contract.canonicalVariantId === "DIVISIBILITY_RULE";
      const target = divisibilityRule ? random.pick([2, 3, 5, 9]) : random.pick([12, 18, 24, 30, 36, 40, 48, 60]);
      const candidateSet = new Set<number>();
      if (divisibilityRule) {
        for (let index = 0; candidateSet.size < 6; index += 1) {
          const quotient = random.int(2, 18);
          candidateSet.add(target * quotient + (index % 2 === 0 ? 0 : random.int(1, target - 1)));
        }
      } else {
        const factors = Array.from({ length: target }, (_, index) => index + 1).filter((candidate) => target % candidate === 0);
        candidateSet.add(random.pick(factors));
        candidateSet.add(random.pick(factors.filter((candidate) => !candidateSet.has(candidate))));
        while (candidateSet.size < 6) candidateSet.add(random.int(2, Math.max(12, target - 1)));
      }
      const candidates = random.shuffle([...candidateSet]);
      return model(contract, input, random, { task: divisibilityRule ? "SELECT_DIVISIBLE" : level === 3 ? "SELECT_COMMON_FACTORS" : "SELECT_FACTORS", operation: "DIVISIBILITY", values: [target, ...candidates], labels: candidates.map((_, index) => `c${index + 1}`), meta: { divisor: target, candidates, representation: level === 1 ? "number-list" : level === 2 ? "factor-table" : "common-factor-filter", reasoningSteps: level }, structuralFingerprint: `multi-select:${contract.canonicalVariantId}:candidates-6:representation-${level}:steps-${level}` });
    }
    case "CLASSIFY": {
      const value = contract.canonicalVariantId === "PRIME_FACTORIZATION"
        ? random.pick([12, 18, 20, 24, 30, 36, 42, 45, 50, 60, 72, 75])
        : random.int(2, 80);
      const propertyTask = contract.outcomeId === "MOET2018-G4-NUM-P035-014"
        ? "ADDITION_ASSOCIATIVE"
        : contract.outcomeId === "MOET2018-G4-NUM-P035-015" ? "MULTIPLICATION_ASSOCIATIVE" : "DISTRIBUTIVE";
      return model(contract, input, random, { task: contract.canonicalVariantId === "PRIME_FACTORIZATION" ? "PRIME_FACTORIZATION" : contract.canonicalVariantId === "OPERATION_PROPERTY" ? propertyTask : contract.canonicalVariantId === "ARITHMETIC_ERROR_DETECTION" ? "DETECT_ERROR" : "PRIME_OR_COMPOSITE", operation: "CLASSIFY", values: [value, random.int(2, 12), random.int(2, 12)], labels: ["giá trị", "a", "b"], meta: { representation: level === 1 ? "direct" : level === 2 ? "factor-witness" : "reasoned-choice", reasoningSteps: level }, structuralFingerprint: `classify:${contract.canonicalVariantId}:${propertyTask}:representation-${level}:steps-${level}` });
    }
    case "PATTERN": {
      const step = random.int(1, 12) * (contract.grade <= 2 ? 1 : random.pick([1, 5, 10]));
      const start = random.int(0, Math.min(100, max));
      return model(contract, input, random, { task: level === 1 ? "NEXT" : level === 2 ? "PREVIOUS" : "MISSING_MIDDLE", operation: "ARITHMETIC_SEQUENCE", values: [start, step, start + step, start + 2 * step, start + 3 * step], labels: ["bắt đầu", "bước", "t1", "t2", "t3"], meta: { unknownPosition: level, representation: level === 3 ? "gap-sequence" : "number-line", reasoningSteps: level }, structuralFingerprint: `pattern:arithmetic:unknown-${level}:representation-${level}` });
    }
    case "APPLIED": {
      const a = random.int(contract.grade <= 2 ? 5 : 20, Math.min(contract.grade <= 2 ? 80 : 500, max));
      const b = random.int(2, Math.min(40, a));
      const c = random.int(1, Math.min(25, a + b));
      const task = contract.profile === "INTEGER" ? "SIGNED_CONTEXT" : level === 1 ? "ONE_STEP" : level === 2 ? "TWO_STEP" : "SELECT_RELEVANT_THEN_TWO_STEP";
      return model(contract, input, random, { task, operation: contract.profile === "INTEGER" ? "+-SIGNED" : level === 1 ? "+" : "+-", values: [a, b, c, random.int(2, 19)], labels: ["ban đầu", "thay đổi", "thay đổi 2", "dữ kiện phụ"], meta: { context: CONTEXTS[random.int(0, CONTEXTS.length - 1)]!, unknownPosition: "result", relevantInformation: level === 3 ? 3 : level + 1, reasoningSteps: level }, structuralFingerprint: `applied:${task}:relevant-${level + 1}:steps-${level}` });
    }
    case "ROMAN": {
      const value = random.int(1, 30);
      return model(contract, input, random, { task: level === 1 ? "ROMAN_TO_NATURAL" : "NATURAL_TO_ROMAN", operation: "CONVERT", values: [value], labels: ["giá trị"], meta: { direction: level === 1 ? "roman-to-natural" : "natural-to-roman", representation: level === 3 ? "subtractive-notation" : "direct", reasoningSteps: level }, structuralFingerprint: `roman:direction-${level}:representation-${level}:steps-${level}` });
    }
    case "SET": {
      const start = random.int(0, 8); const end = start + random.int(5, 10);
      const values = Array.from({ length: end - start + 1 }, (_, index) => start + index);
      return model(contract, input, random, { task: level === 1 ? "SELECT_MEMBERS" : level === 2 ? "SELECT_NON_MEMBERS" : "RULE_DEFINED_SET", operation: level === 3 ? "MULTIPLES_OF_3" : "EVEN_IN_RANGE", values, labels: values.map((_, index) => `n${index}`), meta: { setRule: level === 3 ? "multiples-of-3" : "even", universe: values, representation: level === 1 ? "roster" : level === 2 ? "membership-symbol" : "set-builder-words", reasoningSteps: level }, structuralFingerprint: `set:${level === 3 ? "multiple3" : "even"}:representation-${level}:size-${values.length}` });
    }
    case "SHAPE": {
      const shape = random.pick(["CYLINDER", "SPHERE"] as const);
      const orientation = random.int(0, 7);
      return model(contract, input, random, { task: level === 1 ? "RECOGNIZE_SOLID" : level === 2 ? "SELECT_PROPERTY" : "DISTINGUISH_SOLIDS", operation: "SHAPE_CLASSIFICATION", values: [orientation], labels: [shape], meta: { shape, orientation, representation: level === 3 ? "rotated-and-contextual" : "direct-solid", reasoningSteps: level }, structuralFingerprint: `shape:${shape}:task-${level}:orientation-varied` });
    }
    case "DATA": {
      const valueSet = new Set<number>();
      while (valueSet.size < 4) valueSet.add(random.int(5, 60));
      const values = [...valueSet];
      const task = contract.canonicalVariantId === "DATA_RELATION_REASONING" ? (level === 3 ? "MISSING_FROM_TOTAL" : "DIFFERENCE_RELATION") : level === 1 ? "ORDER_RECORDS" : level === 2 ? "SELECT_ABOVE_THRESHOLD" : "ORDER_BY_DERIVED_VALUE";
      return model(contract, input, random, { task, operation: "DATA_RELATION", values, labels: ["A", "B", "C", "D"], meta: { records: values.map((value, index) => ({ id: `r${index + 1}`, value })), criterion: task, representation: "data-table", reasoningSteps: level }, structuralFingerprint: `data:${task}:records-4:steps-${level}` });
    }
    case "ALGEBRA": {
      const a = random.int(2, 9); const b = random.int(1, 9); const x = random.int(2, 8);
      const rational = contract.canonicalVariantId === "RATIONAL_EXPRESSION_OPERATION";
      return model(contract, input, random, { task: rational ? (level === 1 ? "EVALUATE_RATIONAL_SUM" : level === 2 ? "EVALUATE_RATIONAL_PRODUCT" : "PROPERTY_EQUIVALENCE") : level === 1 ? "RECOGNIZE_ALGEBRAIC" : level === 2 ? "IDENTIFY_DEGREE" : "IDENTIFY_POLYNOMIAL", operation: rational ? "RATIONAL" : "ALGEBRA_RECOGNITION", values: [a, b, x], labels: ["hệ số", "hằng số", "x"], meta: { safeEvaluationPoint: x, denominatorA: x + b, denominatorB: x + a, representation: level === 3 ? "equivalent-forms" : "direct-expression", reasoningSteps: level }, structuralFingerprint: `algebra:${rational ? "rational" : "recognition"}:task-${level}:steps-${level}` });
    }
    case "POLYNOMIAL": {
      const p = [random.int(1, 6), random.int(-6, 6), random.int(-5, 5)];
      const q = [random.int(1, 5), random.int(-5, 5), random.int(-4, 4)];
      const evaluate = contract.outcomeId === "MOET2018-G8-NAA-P063-008";
      const task = evaluate ? "EVALUATE" : level === 1 ? "ADD" : level === 2 ? "SUBTRACT" : "MULTIPLY_LINEAR";
      return model(contract, input, random, { task, operation: "POLYNOMIAL", values: [...p, ...q, random.int(-3, 4)], labels: ["p2", "p1", "p0", "q2", "q1", "q0", "x"], meta: { polynomialP: p, polynomialQ: q, representation: level === 3 ? "expanded-product" : "coefficient-vector", reasoningSteps: level }, structuralFingerprint: `polynomial:${task}:degree-${level === 3 ? 2 : 2}:steps-${level}` });
    }
    case "RADICAL": {
      const outside = random.int(2, 9); const inside = random.pick([2, 3, 5, 6, 7]);
      return model(contract, input, random, { task: level === 1 ? "RECOGNIZE_DOMAIN" : level === 2 ? "SIMPLIFY_PRODUCT" : "MOVE_FACTOR", operation: "RADICAL", values: [outside, inside, outside * outside * inside], labels: ["thừa số ngoài", "phần còn trong căn", "số dưới căn"], meta: { rootIndex: contract.outcomeId.endsWith("003") && level === 3 ? 3 : 2, representation: level === 1 ? "domain-condition" : "perfect-square-factor", reasoningSteps: level }, structuralFingerprint: `radical:task-${level}:perfect-factor:steps-${level}` });
    }
    case "INEQUALITY": {
      const a = random.int(-20, 5); const b = random.int(a + 1, 20); const c = level === 3 ? -random.int(2, 8) : random.int(2, 8);
      return model(contract, input, random, { task: level === 1 ? "ADD_BOTH_SIDES" : level === 2 ? "TRANSITIVE" : "MULTIPLY_NEGATIVE", operation: "INEQUALITY", values: [a, b, c], labels: ["a", "b", "biến đổi"], meta: { originalRelation: "<", multiplierSign: Math.sign(c), representation: level === 3 ? "negative-multiplier" : "symbolic", reasoningSteps: level }, structuralFingerprint: `inequality:task-${level}:sign-${Math.sign(c)}:steps-${level}` });
    }
    case "BANKING": {
      const principal = random.int(20, 300) * 100_000;
      const rate = random.pick([4, 5, 6, 7, 8, 10]);
      const periods = level === 1 ? 1 : random.int(1, 3);
      const task = contract.outcomeId === "MOET2018-G8-EXP-P070-002" || level === 3 ? "FIND_PRINCIPAL" : level === 1 ? "TRANSACTION_BALANCE" : "SIMPLE_INTEREST";
      return model(contract, input, random, { task, operation: "SIMPLE_INTEREST", values: [principal, rate, periods, random.int(1, 20) * 100_000], labels: ["vốn", "lãi suất phần trăm", "thời gian", "giao dịch"], meta: { currency: "VND", compounding: false, representation: level === 1 ? "transaction" : "simple-interest-table", reasoningSteps: level }, structuralFingerprint: `banking:${task}:periods-${periods}:steps-${level}` });
    }
    case "MIXED_NUMBER": {
      const whole = random.int(1, 8); const denominator = random.int(2, 12); const numerator = random.int(1, denominator - 1);
      return model(contract, input, random, { task: level === 1 ? "MIXED_TO_IMPROPER" : level === 2 ? "IMPROPER_TO_MIXED" : "EQUIVALENT_REPRESENTATION", operation: "CONVERT", values: [whole, numerator, denominator], labels: ["phần nguyên", "tử", "mẫu"], meta: { representation: level === 3 ? "model-and-symbol" : "symbolic", reasoningSteps: level }, structuralFingerprint: `mixed-number:task-${level}:representation-${level}:steps-${level}` });
    }
    case "REMAINDER": {
      const divisor = random.int(2, 12); const quotient = random.int(2, 20); const remainder = level === 1 ? 0 : random.int(1, divisor - 1); const dividend = divisor * quotient + remainder;
      return model(contract, input, random, { task: level === 1 ? "EXACT_DIVISION" : level === 2 ? "FIND_REMAINDER" : "FIND_DIVIDEND_FROM_QR", operation: "DIVISION_ALGORITHM", values: [dividend, divisor, quotient, remainder], labels: ["số bị chia", "số chia", "thương", "số dư"], meta: { representation: level === 3 ? "division-identity" : "division-statement", reasoningSteps: level }, structuralFingerprint: `division-remainder:task-${level}:remainder-${remainder === 0 ? "zero" : "positive"}:steps-${level}` });
    }
    case "PROVEN_V2_BASELINE": throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
  }
}

function isPrime(value: number) {
  if (value < 2) return false;
  for (let divisor = 2; divisor * divisor <= value; divisor += 1) if (value % divisor === 0) return false;
  return true;
}

function roman(value: number) {
  const table: readonly [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let remaining = value; let output = "";
  for (const [amount, symbol] of table) while (remaining >= amount) { output += symbol; remaining -= amount; }
  return output;
}

function polynomialLabel(coefficients: readonly number[]) {
  const [a, b, c] = coefficients;
  const pieces = [`${a}x²`, b === 0 ? "" : `${b! >= 0 ? "+ " : "− "}${Math.abs(b!)}x`, c === 0 ? "" : `${c! >= 0 ? "+ " : "− "}${Math.abs(c!)}`].filter(Boolean);
  return pieces.join(" ").replace(/^1x/u, "x");
}

function nextStepFor(model: WaveANormalizedProblemModel) {
  switch (model.modelKind) {
    case "NUMERIC": return model.operation === "PLACE_VALUE" ? "Thử đọc một số khác theo từng hàng rồi kiểm tra lại cách viết số." : "Thử một phép tính cùng dạng và tự kiểm tra bằng phép tính ngược.";
    case "ORDER": return "Thử sắp xếp một nhóm số khác và so sánh từng cặp liền nhau.";
    case "ROUND": return "Thử làm tròn một số khác rồi kiểm tra vị trí của nó giữa hai mốc.";
    case "MATCH": return "Viết một phép tính mới và gọi tên từng thành phần của phép tính đó.";
    case "INTEGER_LINE": return "Đánh dấu một số nguyên khác rồi xác định số đối hoặc khoảng cách đến 0.";
    case "FRACTION": return "Thử với một cặp phân số khác và giải thích cách em so sánh hoặc tính giá trị.";
    case "POWER_ROOT": return "Thử một lũy thừa hoặc căn cùng dạng và kiểm tra bằng phép tính ngược.";
    case "MULTI_SELECT": return "Kiểm tra từng số trong một danh sách mới bằng đúng dấu hiệu chia hết.";
    case "CLASSIFY": return "Thử phân loại một số hoặc đẳng thức khác và nêu dấu hiệu em đã dùng.";
    case "PATTERN": return "Tạo một dãy cùng quy luật rồi tìm một số còn thiếu ở vị trí khác.";
    case "APPLIED": return "Gạch dưới dữ kiện cần dùng rồi lập phép tính cho một tình huống tương tự.";
    case "ROMAN": return "Thử đổi một số khác giữa số tự nhiên và chữ số La Mã.";
    case "SET": return "Thử lập một tập hợp khác theo cùng quy tắc và kiểm tra từng phần tử.";
    case "SHAPE": return "Quan sát một vật khác và nêu thuộc tính giúp em nhận ra khối hình.";
    case "DATA": return "Thử đọc một bảng khác và nói rõ các bản ghi em dùng để tính hoặc sắp xếp.";
    case "ALGEBRA": return "Thử nhận diện một biểu thức khác và chỉ ra biến, hệ số hoặc bậc.";
    case "POLYNOMIAL": return "Thử một phép toán đa thức cùng dạng và kiểm tra từng hệ số.";
    case "RADICAL": return "Thử một căn thức khác và kiểm tra điều kiện hoặc thừa số chính phương.";
    case "INEQUALITY": return "Thử biến đổi một bất đẳng thức khác và chú ý chiều của dấu so sánh.";
    case "BANKING": return "Thử một tình huống số dư hoặc lãi đơn khác và ghi rõ đơn vị đồng.";
    case "MIXED_NUMBER": return "Thử đổi một hỗn số khác và kiểm tra lại bằng phép chia tử cho mẫu.";
    case "REMAINDER": return "Thử một phép chia khác và kiểm tra số dư luôn nhỏ hơn số chia.";
  }
}

function solveWaveAModel(model: WaveANormalizedProblemModel, random: Random): WaveASolution {
  const v = model.values;
  const nextStep = nextStepFor(model);
  switch (model.modelKind) {
    case "NUMERIC": {
      if (model.operation === "PLACE_VALUE") {
        const answer = model.task === "DIGIT_VALUE" ? v[2]! * v[1]! : v[0]!;
        return { correct: answer, accepted: [answer, String(answer)], steps: [`Xác định đúng hàng có giá trị ${v[1]}.`, `Chữ số liên quan là ${v[2]}.`, `Giá trị cần tìm là ${answer}.`], nextStep };
      }
      let answer: number;
      if (model.operation === "+-") answer = v[0]! + v[1]! - v[2]!;
      else if (model.operation === "-+") answer = v[0]! - v[1]! + v[2]!;
      else if (model.operation === "+-UNKNOWN") answer = v[0]!;
      else if (model.operation === "*+") answer = v[0]! * v[1]! + v[2]!;
      else if (model.operation === "PARENTHESIZED") answer = (v[0]! + v[1]!) * v[2]!;
      else if (model.task === "MISSING_OPERAND") answer = v[0]!;
      else if (model.task === "INVERSE_CHECK") answer = model.operation === "/" ? v[2]! : v[2]!;
      else if (model.task === "TWO_STEP") answer = model.operation === "+-" ? v[0]! + v[1]! - v[2]! : v[0]! - v[1]! + v[2]!;
      else if (model.operation === "+") answer = v[0]! + v[1]!;
      else if (model.operation === "-") answer = v[0]! - v[1]!;
      else if (model.operation === "*") answer = v[0]! * v[1]!;
      else if (model.operation === "/") answer = v[0]! / v[1]!;
      else throw new GenerationV2Error("SOLVER_FAILED");
      return { correct: answer, accepted: [answer, String(answer)], steps: [model.operation === "+-UNKNOWN" ? "Dùng phép tính ngược để tìm số trong ô trống." : "Thực hiện lần lượt các phép tính theo thứ tự từ trái sang phải.", `Kiểm tra lại từng phép tính trong biểu thức.`, `Kết quả là ${answer}.`], nextStep };
    }
    case "ORDER": {
      if (model.task === "ESTIMATE_TENS") {
        const answer = Math.round(v[0]! / 10) * 10;
        return { correct: answer, accepted: [answer, String(answer)], steps: [`Nhóm ${v[0]} theo các chục.`, `Làm tròn đến chục gần nhất được ${answer}.`], nextStep };
      }
      const ordered = [...v].sort((a, b) => model.operation === "DESC" ? b - a : a - b).map((value) => `value-${String(value)}`);
      return { correct: ordered, accepted: [ordered], steps: ["Chuẩn hóa các số về cùng dạng biểu diễn.", `Sắp xếp ${model.operation === "DESC" ? "giảm" : "tăng"} dần.`, ordered.map((id) => id.slice(6)).join(" → ")], nextStep };
    }
    case "ROUND": {
      const answer = Number((Math.round(v[0]! / v[1]!) * v[1]!).toFixed(8));
      return { correct: answer, accepted: [answer, String(answer).replace(".", ",")], steps: [`Xác định bước làm tròn ${v[1]}.`, "So sánh với điểm giữa của hai mốc gần nhất.", `Kết quả là ${answer}.`], nextStep };
    }
    case "MATCH": {
      const pairs = model.labels.map((_, index) => ({ leftId: `role-${index}`, rightId: `value-${index}-${String(v[index])}` }));
      return { correct: pairs, accepted: [pairs], steps: [`Đọc phép tính ${v[0]} ${model.operation} ${v[1]} = ${v[2]}.`, "Ghép từng giá trị với đúng vai trò của nó."], nextStep };
    }
    case "INTEGER_LINE": {
      const answer = model.task === "READ_MARK" ? v[0]! : model.task === "OPPOSITE" ? v[1]! : v[2]!;
      return { correct: answer, accepted: [answer, String(answer)], steps: ["Đọc chiều tăng của trục số từ trái sang phải.", model.task === "OPPOSITE" ? "Số đối nằm cách 0 một khoảng bằng nhau ở phía còn lại." : "Đếm khoảng cách theo các vạch đơn vị.", `Kết quả là ${answer}.`], nextStep };
    }
    case "FRACTION": {
      if (model.task === "COMPARE_FRACTIONS") {
        const left = v[0]! * v[3]!; const right = v[2]! * v[1]!;
        const correct = left < right ? "less" : left > right ? "greater" : "equal";
        const options = random.shuffle([{ id: "less", label: "<" }, { id: "equal", label: "=" }, { id: "greater", label: ">" }]);
        return { correct, accepted: [correct], options, optionMisconceptions: { less: "NUMERATOR_DENOMINATOR_CONFUSION", greater: "NUMERATOR_DENOMINATOR_CONFUSION", equal: "NUMERATOR_DENOMINATOR_CONFUSION" }, steps: [`So sánh ${v[0]} × ${v[3]} và ${v[2]} × ${v[1]}.`, `${left} ${left < right ? "<" : left > right ? ">" : "="} ${right}.`], nextStep };
      }
      const part = v[2]! * v[0]! / v[1]!;
      const answer = model.task === "RECOVER_WHOLE" ? v[2]! : part;
      return { correct: answer, accepted: [answer, String(answer).replace(".", ",")], steps: [`Viết tỉ lệ ${v[0]}/${v[1]}.`, model.task === "RECOVER_WHOLE" ? `Lấy phần đã biết chia cho ${v[0]}/${v[1]}.` : `Nhân ${v[2]} với ${v[0]}/${v[1]}.`, `Kết quả là ${answer}.`], nextStep };
    }
    case "POWER_ROOT": {
      let answer: number;
      if (model.operation === "SQRT") answer = Math.sqrt(v[0]!);
      else if (model.operation === "CBRT") answer = Math.cbrt(v[0]!);
      else if (model.task === "EVALUATE_POWER") answer = v[0]! ** v[1]!;
      else if (model.task === "MULTIPLY_SAME_BASE") answer = v[0]! ** (v[1]! + v[2]!);
      else answer = v[0]! ** (v[1]! - v[2]!);
      return { correct: answer, accepted: [answer, String(answer)], steps: [model.operation === "POWER" ? "Giữ nguyên cơ số và xử lí số mũ theo phép tính." : "Chọn căn số học không âm khi lấy căn bậc hai.", `Kết quả là ${answer}.`], nextStep };
    }
    case "MULTI_SELECT": {
      const divisor = v[0]!;
      const candidates = v.slice(1);
      const correctValues = model.task === "SELECT_FACTORS" || model.task === "SELECT_COMMON_FACTORS"
        ? candidates.filter((candidate) => divisor % candidate === 0)
        : candidates.filter((candidate) => candidate % divisor === 0);
      const options = candidates.map((value, index) => ({ id: `candidate-${index}-${value}-${correctValues.indexOf(value)}`, label: String(value) }));
      const normalizedCorrect = options.filter((option) => correctValues.includes(Number(option.label))).map((option) => option.id);
      return { correct: normalizedCorrect, accepted: [normalizedCorrect], options, optionMisconceptions: Object.fromEntries(options.map((option) => [option.id, "FACTOR_MULTIPLE_CONFUSION" as const])), steps: [`Áp dụng định nghĩa chia hết với ${divisor}.`, `Các giá trị thỏa điều kiện: ${correctValues.join(", ")}.`], nextStep };
    }
    case "CLASSIFY": {
      const value = v[0]!;
      if (model.task === "PRIME_OR_COMPOSITE") {
        const correct = isPrime(value) ? "prime" : "composite";
        const options = random.shuffle([{ id: "prime", label: "Số nguyên tố" }, { id: "composite", label: "Hợp số" }, { id: "neither", label: "Không thuộc hai loại trên" }]);
        return { correct, accepted: [correct], options, optionMisconceptions: { prime: "PRIME_COMPOSITE_CONFUSION", composite: "PRIME_COMPOSITE_CONFUSION", neither: "PRIME_COMPOSITE_CONFUSION" }, steps: [`Kiểm tra các ước của ${value}.`, isPrime(value) ? "Số chỉ có hai ước là 1 và chính nó." : "Tìm được một ước khác 1 và chính nó."], nextStep };
      }
      if (model.task === "PRIME_FACTORIZATION") {
        const factors: number[] = []; let remaining = value;
        for (let divisor = 2; divisor <= remaining; divisor += 1) while (remaining % divisor === 0) { factors.push(divisor); remaining /= divisor; }
        const correctLabel = factors.join(" × ") || String(value);
        const options = random.shuffle([{ id: "factor-correct", label: correctLabel }, { id: "factor-sum", label: factors.join(" + ") || `${value} + 0` }, { id: "factor-self", label: `${value} × 1` }, { id: "factor-missing", label: factors.slice(1).join(" × ") || "1" }]);
        return { correct: "factor-correct", accepted: ["factor-correct"], options, optionMisconceptions: { "factor-sum": "FACTOR_MULTIPLE_CONFUSION", "factor-self": "PRIME_COMPOSITE_CONFUSION", "factor-missing": "FACTOR_MULTIPLE_CONFUSION" }, steps: [`Chia ${value} lần lượt cho các số nguyên tố nhỏ nhất.`, `${value} = ${correctLabel}.`], nextStep };
      }
      const a = v[1]!; const b = v[2]!;
      if (model.task === "ADDITION_ASSOCIATIVE") {
        const correctLabel = `${a} + (${b} + ${value}) = (${a} + ${b}) + ${value}`;
        const options = random.shuffle([{ id: "property-correct", label: correctLabel }, { id: "property-left", label: `${a} + (${b} + ${value}) = (${a} + ${b}) − ${value}` }, { id: "property-add", label: `${a} + (${b} + ${value}) = ${a + b}` }, { id: "property-sign", label: `${a} + (${b} + ${value}) = ${a} − (${b} + ${value})` }]);
        return { correct: "property-correct", accepted: ["property-correct"], options, optionMisconceptions: { "property-left": "ORDER_OF_OPERATIONS_ERROR", "property-add": "ORDER_OF_OPERATIONS_ERROR", "property-sign": "SIGN_ERROR" }, steps: ["Tính chất kết hợp cho phép đổi cách nhóm các số hạng mà không đổi tổng.", correctLabel], nextStep };
      }
      if (model.task === "MULTIPLICATION_ASSOCIATIVE") {
        const correctLabel = `${a} × (${b} × ${value}) = (${a} × ${b}) × ${value}`;
        const options = random.shuffle([{ id: "property-correct", label: correctLabel }, { id: "property-left", label: `${a} × (${b} × ${value}) = (${a} + ${b}) × ${value}` }, { id: "property-add", label: `${a} × (${b} × ${value}) = ${a * b + value}` }, { id: "property-sign", label: `${a} × (${b} × ${value}) = (${a} × ${b}) + ${value}` }]);
        return { correct: "property-correct", accepted: ["property-correct"], options, optionMisconceptions: { "property-left": "MULTIPLICATION_AS_ADDITION", "property-add": "ORDER_OF_OPERATIONS_ERROR", "property-sign": "MULTIPLICATION_AS_ADDITION" }, steps: ["Tính chất kết hợp cho phép đổi cách nhóm các thừa số mà không đổi tích.", correctLabel], nextStep };
      }
      const correctLabel = `${a} × (${b} + ${value}) = ${a * b} + ${a * value}`;
      const options = random.shuffle([{ id: "property-correct", label: correctLabel }, { id: "property-left", label: `${a} × (${b} + ${value}) = ${a * b} + ${value}` }, { id: "property-add", label: `${a} × (${b} + ${value}) = ${a + b + value}` }, { id: "property-sign", label: `${a} × (${b} + ${value}) = ${a * b} − ${a * value}` }]);
      return { correct: "property-correct", accepted: ["property-correct"], options, optionMisconceptions: { "property-left": "ORDER_OF_OPERATIONS_ERROR", "property-add": "MULTIPLICATION_AS_ADDITION", "property-sign": "SIGN_ERROR" }, steps: ["Nhân thừa số ngoài ngoặc với từng số hạng trong ngoặc.", correctLabel], nextStep };
    }
    case "PATTERN": {
      const answer = model.task === "NEXT" ? v[4]! : model.task === "PREVIOUS" ? v[0]! - v[1]! : v[3]!;
      return { correct: answer, accepted: [answer, String(answer)], steps: [`Hiệu giữa hai số liên tiếp là ${v[1]}.`, `Giá trị cần tìm là ${answer}.`], nextStep };
    }
    case "APPLIED": {
      const answer = model.task === "SIGNED_CONTEXT" ? v[0]! - v[1]! + v[2]! : model.task === "ONE_STEP" ? v[0]! + v[1]! : v[0]! + v[1]! - v[2]!;
      return { correct: answer, accepted: [answer, String(answer)], steps: ["Xác định đại lượng ban đầu và chiều thay đổi.", model.task.includes("TWO_STEP") ? "Thực hiện lần lượt hai quan hệ cần thiết; bỏ dữ kiện không liên quan." : "Thực hiện một phép tính phù hợp.", `Kết quả là ${answer}.`], nextStep };
    }
    case "ROMAN": {
      const correctRoman = roman(v[0]!);
      if (model.task === "ROMAN_TO_NATURAL") return { correct: v[0]!, accepted: [v[0]!, String(v[0]!)], steps: [`Tách ${correctRoman} theo giá trị từng kí hiệu.`, `Giá trị là ${v[0]}.`], nextStep };
      const alternativeSet = new Set([correctRoman, `${roman(Math.max(1, v[0]! - 1))}I`, roman(Math.min(30, v[0]! + 1)), correctRoman.split("").reverse().join("")]);
      while (alternativeSet.size < 4) alternativeSet.add(roman(random.int(1, 30)));
      const alternatives = [...alternativeSet].slice(0, 4);
      const options = random.shuffle(alternatives.map((label, index) => ({ id: label === correctRoman ? "roman-correct" : `roman-wrong-${index}`, label })));
      return { correct: "roman-correct", accepted: ["roman-correct"], options, optionMisconceptions: Object.fromEntries(options.filter((option) => option.id !== "roman-correct").map((option) => [option.id, "PLACE_VALUE_CONFUSION" as const])), steps: [`Phân tích ${v[0]} thành chục, năm và đơn vị.`, `Cách viết chuẩn là ${correctRoman}.`], nextStep };
    }
    case "SET": {
      const values = v;
      const shouldSelect = (value: number) => model.operation === "MULTIPLES_OF_3" ? value % 3 === 0 : value % 2 === 0;
      const options = values.map((value, index) => ({ id: `member-${index}-${value}`, label: String(value) }));
      const correct = options.filter((option) => shouldSelect(Number(option.label))).map((option) => option.id);
      return { correct, accepted: [correct], options, optionMisconceptions: Object.fromEntries(options.map((option) => [option.id, "FACTOR_MULTIPLE_CONFUSION" as const])), steps: [`Đọc quy tắc của tập hợp: ${model.operation === "MULTIPLES_OF_3" ? "bội của 3" : "số chẵn"}.`, `Chọn đúng ${correct.length} phần tử thỏa quy tắc.`], nextStep };
    }
    case "SHAPE": {
      const shape = String(model.meta.shape);
      const options = random.shuffle([{ id: "shape-cylinder", label: "Khối trụ" }, { id: "shape-sphere", label: "Khối cầu" }, { id: "shape-cube", label: "Khối lập phương" }]);
      const correct = shape === "CYLINDER" ? "shape-cylinder" : "shape-sphere";
      return { correct, accepted: [correct], options, optionMisconceptions: { "shape-cylinder": "DATA_RELATION_IGNORED", "shape-sphere": "DATA_RELATION_IGNORED", "shape-cube": "DATA_RELATION_IGNORED" }, steps: [shape === "CYLINDER" ? "Khối trụ có hai mặt đáy tròn và một mặt cong." : "Khối cầu có một mặt cong, không có mặt đáy.", `Hình là ${shape === "CYLINDER" ? "khối trụ" : "khối cầu"}.`], nextStep };
    }
    case "DATA": {
      if (model.task === "ORDER_RECORDS" || model.task === "ORDER_BY_DERIVED_VALUE") {
        const options = v.map((value, index) => ({ id: `record-${index}`, label: `${model.labels[index]}: ${value}` }));
        const correct = options.map((option, index) => ({ option, value: v[index]! })).sort((a, b) => a.value - b.value).map(({ option }) => option.id);
        return { correct, accepted: [correct], options, steps: ["Đọc cùng một tiêu chí cho bốn bản ghi.", `Sắp xếp tăng dần theo giá trị: ${[...v].sort((a, b) => a - b).join("; ")}.`], nextStep };
      }
      if (model.task === "SELECT_ABOVE_THRESHOLD") {
        const threshold = Math.round(v.reduce((sum, value) => sum + value, 0) / v.length);
        const options = v.map((value, index) => ({ id: `record-${index}`, label: `${model.labels[index]}: ${value}` }));
        const correct = options.filter((_, index) => v[index]! > threshold).map((option) => option.id);
        return { correct, accepted: [correct], options, optionMisconceptions: Object.fromEntries(options.map((option) => [option.id, "DATA_RELATION_IGNORED" as const])), steps: [`Ngưỡng được cho là ${threshold}.`, "Chọn các bản ghi có giá trị lớn hơn ngưỡng."], nextStep };
      }
      const answer = model.task === "MISSING_FROM_TOTAL" ? v[0]! + v[1]! + v[2]! : Math.abs(v[1]! - v[0]!);
      return { correct: answer, accepted: [answer, String(answer)], steps: [model.task === "MISSING_FROM_TOTAL" ? "Cộng đúng ba bản ghi A, B và C." : "Lấy giá trị lớn hơn giữa A và B trừ giá trị nhỏ hơn.", `Kết quả là ${answer}.`], nextStep };
    }
    case "ALGEBRA": {
      if (model.operation === "RATIONAL") {
        const a = v[0]!; const b = v[1]!; const x = v[2]!;
        const left = reduceFraction(a, x + b); const right = reduceFraction(b, x + a);
        const result = model.task === "EVALUATE_RATIONAL_PRODUCT" ? reduceFraction(left.numerator * right.numerator, left.denominator * right.denominator) : reduceFraction(left.numerator * right.denominator + right.numerator * left.denominator, left.denominator * right.denominator);
        return { correct: result, accepted: [result, `${result.numerator}/${result.denominator}`], steps: [`Thay x = ${x}; các mẫu ${x + b} và ${x + a} đều khác 0.`, "Quy đồng hoặc nhân phân thức theo phép tính đã nêu.", `Kết quả tối giản là ${result.numerator}/${result.denominator}.`], nextStep };
      }
      const options = random.shuffle([{ id: "algebra-correct", label: `${v[0]}x + ${v[1]}` }, { id: "algebra-number", label: `${v[0]} + ${v[1]}` }, { id: "algebra-equation", label: `${v[0]}x + ${v[1]} = 0` }, { id: "algebra-invalid", label: `${v[0]} ÷ 0` }]);
      return { correct: "algebra-correct", accepted: ["algebra-correct"], options, optionMisconceptions: { "algebra-number": "DATA_RELATION_IGNORED", "algebra-equation": "DATA_RELATION_IGNORED", "algebra-invalid": "DATA_RELATION_IGNORED" }, steps: ["Biểu thức đại số có số, phép tính và ít nhất một biến.", `${v[0]}x + ${v[1]} là biểu thức phù hợp.`], nextStep };
    }
    case "POLYNOMIAL": {
      const p = v.slice(0, 3); const q = v.slice(3, 6); const x = v[6]!;
      if (model.task === "EVALUATE") {
        const answer = p[0]! * x * x + p[1]! * x + p[2]!;
        return { correct: answer, accepted: [answer, String(answer)], steps: [`Thay x = ${x} vào đa thức.`, `${p[0]}×${x}² + ${p[1]}×${x} + ${p[2]} = ${answer}.`], nextStep };
      }
      let result: number[];
      if (model.task === "ADD") result = p.map((value, index) => value + q[index]!);
      else if (model.task === "SUBTRACT") result = p.map((value, index) => value - q[index]!);
      else result = [p[0]! * q[0]!, p[0]! * q[1]! + p[1]! * q[0]!, p[0]! * q[2]! + p[1]! * q[1]! + p[2]! * q[0]!];
      const correctLabel = polynomialLabel(result);
      const signError = [...result];
      const nonZeroIndex = signError.findIndex((coefficient) => coefficient !== 0);
      if (nonZeroIndex >= 0) signError[nonZeroIndex] = -signError[nonZeroIndex]!;
      else signError[0] = 1;
      const options = random.shuffle([{ id: "polynomial-correct", label: correctLabel }, { id: "polynomial-sign", label: polynomialLabel(signError) }, { id: "polynomial-constant", label: polynomialLabel([result[0]!, result[1]!, result[2]! + 1]) }, { id: "polynomial-uncombined", label: `${polynomialLabel(p)} + (${polynomialLabel(q)})` }]);
      return { correct: "polynomial-correct", accepted: ["polynomial-correct"], options, optionMisconceptions: { "polynomial-sign": "SIGN_ERROR", "polynomial-constant": "CARRY_BORROW_ERROR", "polynomial-uncombined": "ORDER_OF_OPERATIONS_ERROR" }, steps: ["Nhóm các hạng tử đồng dạng theo cùng số mũ.", `Kết quả chuẩn hóa là ${correctLabel}.`], nextStep };
    }
    case "RADICAL": {
      const outside = v[0]!; const inside = v[1]!; const radicand = v[2]!;
      if (model.task === "RECOGNIZE_DOMAIN") {
        const options = random.shuffle([{ id: "radical-correct", label: `√(${outside}x + ${inside}), với ${outside}x + ${inside} ≥ 0` }, { id: "radical-no-condition", label: `√(${outside}x + ${inside}), với mọi x` }, { id: "radical-negative", label: `√(−${radicand}) trong tập số thực` }]);
        return { correct: "radical-correct", accepted: ["radical-correct"], options, optionMisconceptions: { "radical-no-condition": "EXPONENT_RULE_ERROR", "radical-negative": "SIGN_ERROR" }, steps: ["Căn bậc hai thực cần biểu thức dưới căn không âm.", `Điều kiện là ${outside}x + ${inside} ≥ 0.`], nextStep };
      }
      const options = random.shuffle([{ id: "radical-correct", label: `${outside}√${inside}` }, { id: "radical-add", label: `${outside + inside}` }, { id: "radical-square", label: `${outside * outside}√${inside}` }, { id: "radical-unsimplified", label: `√${radicand + 1}` }]);
      return { correct: "radical-correct", accepted: ["radical-correct"], options, optionMisconceptions: { "radical-add": "EXPONENT_RULE_ERROR", "radical-square": "EXPONENT_RULE_ERROR", "radical-unsimplified": "CARRY_BORROW_ERROR" }, steps: [`${radicand} = ${outside * outside} × ${inside}.`, `√${radicand} = ${outside}√${inside}.`], nextStep };
    }
    case "INEQUALITY": {
      const [a, b, c] = v;
      const correctLabel = model.task === "MULTIPLY_NEGATIVE" ? `${a! * c!} > ${b! * c!}` : model.task === "ADD_BOTH_SIDES" ? `${a! + c!} < ${b! + c!}` : `Nếu ${a} < ${b} và ${b} < ${b! + Math.abs(c!)} thì ${a} < ${b! + Math.abs(c!)}`;
      const reversedLabel = correctLabel.replaceAll(">", "§").replaceAll("<", ">").replaceAll("§", "<");
      const options = random.shuffle([{ id: "inequality-correct", label: correctLabel }, { id: "inequality-direction", label: reversedLabel }, { id: "inequality-equal", label: `${a} = ${b}` }]);
      return { correct: "inequality-correct", accepted: ["inequality-correct"], options, optionMisconceptions: { "inequality-direction": "SIGN_ERROR", "inequality-equal": "DATA_RELATION_IGNORED" }, steps: [model.task === "MULTIPLY_NEGATIVE" ? "Nhân hai vế với số âm thì phải đảo chiều bất đẳng thức." : "Áp dụng cùng một phép biến đổi hợp lệ cho quan hệ thứ tự.", correctLabel], nextStep };
    }
    case "BANKING": {
      const [principal, rate, periods, transaction] = v;
      const interest = principal! * rate! * periods! / 100;
      const answer = model.task === "TRANSACTION_BALANCE" ? principal! - transaction! : model.task === "FIND_PRINCIPAL" ? principal : interest;
      return { correct: answer!, accepted: [answer!, String(answer!)], steps: [model.task === "TRANSACTION_BALANCE" ? "Lấy số dư ban đầu trừ khoản chi." : model.task === "FIND_PRINCIPAL" ? `Dùng vốn = tiền lãi ÷ (${rate}% × ${periods}).` : `Lãi đơn = vốn × ${rate}% × ${periods}.`, `Kết quả là ${answer} đồng.`], nextStep };
    }
    case "MIXED_NUMBER": {
      const [whole, numerator, denominator] = v;
      const answer = reduceFraction(whole! * denominator! + numerator!, denominator!);
      return { correct: answer, accepted: [answer, `${answer.numerator}/${answer.denominator}`], steps: [`Nhân phần nguyên ${whole} với mẫu ${denominator}.`, `Cộng tử ${numerator} được ${answer.numerator}.`, `Giữ mẫu ${answer.denominator}.`], nextStep };
    }
    case "REMAINDER": {
      const answer = model.task === "EXACT_DIVISION" ? v[2]! : model.task === "FIND_REMAINDER" ? v[3]! : v[0]!;
      return { correct: answer, accepted: [answer, String(answer)], steps: [`Dùng ${v[0]} = ${v[1]} × ${v[2]} + ${v[3]}.`, `Số dư ${v[3]} nhỏ hơn số chia ${v[1]}.`, `Giá trị cần tìm là ${answer}.`], nextStep };
    }
  }
}

function promptFor(model: WaveANormalizedProblemModel) {
  const context = CONTEXTS[model.contextIndex]!;
  const lead = `${LEADS[model.templateIndex]!} trong hoạt động tại ${context}`;
  const v = model.values;
  switch (model.modelKind) {
    case "NUMERIC":
      if (model.operation === "PLACE_VALUE") return model.task === "DIGIT_VALUE" ? `${lead}: Trong số ${v[0]}, chữ số ${v[2]} ở hàng có giá trị ${v[1]}. Giá trị của chữ số đó là bao nhiêu?` : `${lead}: Bảng ở ${context} biểu diễn số ${v[0]}. Viết số được biểu diễn.`;
      if (model.task === "MISSING_OPERAND") return `${lead}: Điền số còn thiếu trong phép tính □ ${model.operation} ${v[1]} = ${v[2]}.`;
      if (model.task === "INVERSE_CHECK") return `${lead}: Với bộ số ${v[0]}, ${v[1]}, ${v[2]}, hãy dùng phép ${model.operation === "/" ? "chia" : "nhân"} để tìm giá trị còn thiếu.`;
      if (model.operation === "+-") return `${lead}: Tính từ trái sang phải ${v[0]} + ${v[1]} − ${v[2]}.`;
      if (model.operation === "-+") return `${lead}: Tính từ trái sang phải ${v[0]} − ${v[1]} + ${v[2]}.`;
      if (model.operation === "+-UNKNOWN") return `${lead}: Tìm số trong ô trống: □ + ${v[1]} − ${v[2]} = ${v[3]}.`;
      if (model.operation === "*+") return `${lead}: Tính đúng thứ tự ${v[0]} × ${v[1]} + ${v[2]}.`;
      if (model.operation === "PARENTHESIZED") return `${lead}: Tính (${v[0]} + ${v[1]}) × ${v[2]}.`;
      if (model.task === "TWO_STEP") return `${lead}: Tại ${context}, tính biểu thức hai bước từ các số ${v[0]}, ${v[1]}, ${v[2]} theo thứ tự ${model.operation}.`;
      return `${lead}: Tính ${v[0]} ${model.operation} ${v[1]}.`;
    case "ORDER": return model.task === "ESTIMATE_TENS" ? `${lead}: Có khoảng ${v[0]} đồ vật ở ${context}. Ước lượng theo chục gần nhất.` : `${lead}: Sắp xếp các số sau theo thứ tự ${model.operation === "DESC" ? "giảm" : "tăng"} dần.`;
    case "ROUND": return `${lead}: Làm tròn ${String(v[0]).replace(".", ",")} đến bước ${String(v[1]).replace(".", ",")}.`;
    case "MATCH": return `${lead}: Với phép tính ${v[0]} ${model.operation} ${v[1]} = ${v[2]}, ghép mỗi số với đúng thành phần của phép tính.`;
    case "INTEGER_LINE": return model.task === "READ_MARK" ? `${lead}: Điểm được đánh dấu trên trục số biểu diễn số nguyên nào?` : model.task === "OPPOSITE" ? `${lead}: Số đối của ${v[0]} là số nào?` : `${lead}: Khoảng cách từ ${v[0]} đến 0 trên trục số bằng bao nhiêu đơn vị?`;
    case "FRACTION": return model.task === "COMPARE_FRACTIONS" ? `${lead}: So sánh ${v[0]}/${v[1]} và ${v[2]}/${v[3]}.` : model.task === "RECOVER_WHOLE" ? `${lead}: Một phần bằng ${v[0]}/${v[1]} của số ban đầu. Từ dữ kiện đã cho, tìm số ban đầu.` : `${lead}: Tính ${v[0]}/${v[1]} của ${v[2]}.`;
    case "POWER_ROOT": return model.operation === "SQRT" ? `${lead}: Tính căn bậc hai số học của ${v[0]}.` : model.operation === "CBRT" ? `${lead}: Tính căn bậc ba của ${v[0]}.` : model.task === "EVALUATE_POWER" ? `${lead}: Tính ${v[0]}^${v[1]}.` : model.task === "MULTIPLY_SAME_BASE" ? `${lead}: Tính ${v[0]}^${v[1]} × ${v[0]}^${v[2]}.` : `${lead}: Tính ${v[0]}^${v[1]} : ${v[0]}^${v[2]}.`;
    case "MULTI_SELECT": return `${lead}: Chọn tất cả các số trong danh sách thỏa điều kiện ${model.task === "SELECT_DIVISIBLE" ? `chia hết cho ${v[0]}` : `là ước của ${v[0]}`}.`;
    case "CLASSIFY": return model.task === "PRIME_OR_COMPOSITE" ? `${lead}: Số ${v[0]} là số nguyên tố hay hợp số?` : model.task === "PRIME_FACTORIZATION" ? `${lead}: Chọn phân tích ${v[0]} thành tích các thừa số nguyên tố.` : model.task === "ADDITION_ASSOCIATIVE" ? `${lead}: Chọn đẳng thức áp dụng đúng tính chất kết hợp của phép cộng.` : model.task === "MULTIPLICATION_ASSOCIATIVE" ? `${lead}: Chọn đẳng thức áp dụng đúng tính chất kết hợp của phép nhân.` : `${lead}: Chọn đẳng thức áp dụng đúng tính chất phân phối.`;
    case "PATTERN": return `${lead}: Dãy số ở ${context} bắt đầu ${v[0]} và mỗi bước thay đổi ${v[1]}. Tìm số còn thiếu theo yêu cầu.`;
    case "APPLIED": {
      if (model.task === "SIGNED_CONTEXT") return `${lead}: Nhiệt độ ban đầu là ${v[0]}°C, sau đó giảm ${v[1]}°C rồi tăng ${v[2]}°C. Nhiệt độ cuối cùng là bao nhiêu?`;
      if (model.task === "ONE_STEP") return `${lead}: Có ${v[0]} đồ vật, sau đó nhận thêm ${v[1]} đồ vật. Hỏi có tất cả bao nhiêu đồ vật?`;
      if (model.task === "TWO_STEP") return `${lead}: Có ${v[0]} đồ vật, nhận thêm ${v[1]} đồ vật rồi dùng bớt ${v[2]} đồ vật. Hỏi còn lại bao nhiêu đồ vật?`;
      return `${lead}: Có ${v[0]} đồ vật, nhận thêm ${v[1]} đồ vật rồi dùng bớt ${v[2]} đồ vật. Nhóm bên cạnh có ${v[3]} đồ vật nhưng không liên quan đến câu hỏi. Hỏi còn lại bao nhiêu đồ vật?`;
    }
    case "ROMAN": return model.task === "ROMAN_TO_NATURAL" ? `${lead}: Chữ số La Mã ${roman(v[0]!)} biểu diễn số tự nhiên nào?` : `${lead}: Chọn cách viết số ${v[0]} bằng chữ số La Mã.`;
    case "SET": return `${lead}: Chọn tất cả phần tử thuộc tập hợp ${model.operation === "MULTIPLES_OF_3" ? "các bội của 3" : "các số chẵn"} trong danh sách.`;
    case "SHAPE": return `${lead}: Quan sát mô hình khối ở ${context} và chọn tên đúng.`;
    case "DATA": return model.task.includes("ORDER") ? `${lead}: Sắp xếp bốn bản ghi trong bảng theo giá trị tăng dần.` : model.task === "SELECT_ABOVE_THRESHOLD" ? `${lead}: Chọn các bản ghi lớn hơn giá trị trung bình của bốn số liệu.` : model.task === "MISSING_FROM_TOTAL" ? `${lead}: Tính tổng giá trị của ba bản ghi A, B và C trong bảng.` : `${lead}: Độ chênh lệch giữa giá trị của bản ghi A và bản ghi B là bao nhiêu?`;
    case "ALGEBRA": return model.operation === "RATIONAL" ? `${lead}: Tại x = ${v[2]}, tính giá trị phép toán giữa ${v[0]}/(x+${v[1]}) và ${v[1]}/(x+${v[0]}), biết các mẫu khác 0.` : `${lead}: Chọn biểu thức đại số phù hợp.`;
    case "POLYNOMIAL": return model.task === "EVALUATE" ? `${lead}: Tính giá trị đa thức ${polynomialLabel(v.slice(0, 3))} tại x = ${v[6]}.` : `${lead}: Chọn kết quả đúng khi ${model.task === "ADD" ? "cộng" : model.task === "SUBTRACT" ? "trừ" : "nhân"} hai đa thức ${polynomialLabel(v.slice(0, 3))} và ${polynomialLabel(v.slice(3, 6))}.`;
    case "RADICAL": return model.task === "RECOGNIZE_DOMAIN" ? `${lead}: Chọn căn thức có điều kiện xác định đúng.` : `${lead}: Rút gọn √${v[2]} bằng cách đưa thừa số chính phương ra ngoài dấu căn.`;
    case "INEQUALITY": return `${lead}: Biết ${v[0]} < ${v[1]}. Chọn kết luận đúng sau phép biến đổi đã nêu.`;
    case "BANKING": return model.task === "TRANSACTION_BALANCE" ? `${lead}: Tài khoản có ${v[0]} đồng và chi ${v[3]} đồng. Số dư còn lại là bao nhiêu?` : model.task === "FIND_PRINCIPAL" ? `${lead}: Một khoản đầu tư nhận ${v[0]! * v[1]! * v[2]! / 100} đồng tiền lãi theo lãi đơn ${v[1]}% mỗi kì trong ${v[2]} kì. Số vốn ban đầu là bao nhiêu?` : `${lead}: Tính tiền lãi đơn của ${v[0]} đồng với lãi suất ${v[1]}% mỗi kì trong ${v[2]} kì.`;
    case "MIXED_NUMBER": return `${lead}: Đổi hỗn số ${v[0]} ${v[1]}/${v[2]} thành phân số.`;
    case "REMAINDER": return model.task === "FIND_REMAINDER" ? `${lead}: Chia ${v[0]} cho ${v[1]}. Số dư là bao nhiêu?` : model.task === "FIND_DIVIDEND_FROM_QR" ? `${lead}: Biết số chia ${v[1]}, thương ${v[2]} và số dư ${v[3]}. Tìm số bị chia.` : `${lead}: Chia hết ${v[0]} cho ${v[1]}. Tìm thương.`;
  }
}

function visualFor(model: WaveANormalizedProblemModel): ProductVisual {
  if (model.modelKind === "INTEGER_LINE" || model.profile === "INTEGER" && model.modelKind === "ORDER") return { type: "NUMBER_LINE", description: `Trục số từ ${model.meta.minimumTick ?? Math.min(...model.values) - 2} đến ${model.meta.maximumTick ?? Math.max(...model.values) + 2}; điểm đánh dấu ${model.meta.marked ?? "theo dữ kiện"}.`, data: { minimum: model.meta.minimumTick ?? Math.min(...model.values) - 2, maximum: model.meta.maximumTick ?? Math.max(...model.values) + 2, marked: model.meta.marked ?? null, values: model.values } };
  if (model.modelKind === "SHAPE") return { type: "SHAPE_DIAGRAM", description: `Mô hình ${model.meta.shape === "CYLINDER" ? "khối trụ" : "khối cầu"} được xoay theo hướng ${model.meta.orientation}.`, data: { shape: model.meta.shape, orientation: model.meta.orientation } };
  if (model.modelKind === "DATA") return { type: "DATA_TABLE", description: `Bảng gồm ${model.labels.map((label, index) => `${label}: ${model.values[index]}`).join(", ")}.`, data: { labels: model.labels, values: model.values, task: model.task } };
  if (model.modelKind === "NUMERIC" && model.operation === "PLACE_VALUE") {
    const value = model.values[0]!;
    const allColumns = ["Trăm nghìn", "Chục nghìn", "Nghìn", "Trăm", "Chục", "Đơn vị"];
    const digitCount = Math.min(allColumns.length, String(Math.abs(value)).length);
    return { type: "PLACE_VALUE_CHART", description: `Bảng giá trị theo hàng của số ${value}.`, data: { columns: allColumns.slice(allColumns.length - digitCount), values: [value] } };
  }
  return { type: "NONE", description: "Không cần hình minh họa để làm bằng chứng toán học.", data: {} };
}

function interactionFor(model: WaveANormalizedProblemModel, solution: WaveASolution): ProductInteractionContract {
  if ((model.modelKind === "ORDER" || model.modelKind === "DATA") && Array.isArray(solution.correct) && model.task !== "SELECT_ABOVE_THRESHOLD") return { type: "ORDERING", options: model.values.map((value, index) => ({ id: model.modelKind === "DATA" ? `record-${index}` : `value-${String(value)}`, label: model.modelKind === "DATA" ? `${model.labels[index]}: ${value}` : String(value) })), orderedItemIds: solution.correct as readonly string[] };
  if (solution.options) {
    const multi = Array.isArray(solution.correct) && solution.correct.every((item) => typeof item === "string") && (model.modelKind === "MULTI_SELECT" || model.modelKind === "SET" || model.task === "SELECT_ABOVE_THRESHOLD");
    return { type: multi ? "MULTI_SELECT" : model.modelKind === "SHAPE" ? "CONSTRUCTION_OR_VISUAL_SELECTION" : "SINGLE_CHOICE", options: solution.options, choiceCount: multi ? solution.correct.length : 1 };
  }
  if (model.modelKind === "MATCH") return { type: "MATCHING", leftItems: model.labels.map((label, index) => ({ id: `role-${index}`, label })), rightItems: model.values.map((value, index) => ({ id: `value-${index}-${String(value)}`, label: String(value) })) };
  if (model.modelKind === "FRACTION" && model.task === "COMPARE_FRACTIONS") return { type: "SINGLE_CHOICE", options: solution.options, choiceCount: 1 };
  if (model.modelKind === "MIXED_NUMBER" || typeof solution.correct === "object" && !Array.isArray(solution.correct)) return { type: "FRACTION_INPUT", inputLabel: "Phân số", inputMode: "text" };
  const decimal = model.profile === "DECIMAL" || model.profile === "FINANCE" || typeof solution.correct === "number" && !Number.isInteger(solution.correct);
  return { type: decimal ? "DECIMAL_INPUT" : "INTEGER_INPUT", inputLabel: "Câu trả lời", inputMode: decimal ? "decimal" : "numeric", ...(model.profile === "FINANCE" ? { unitLabel: "đồng" } : {}) };
}

function normalizeCanonical(value: CanonicalResponse) {
  if (typeof value === "number") return String(Number(value.toFixed(8)));
  if (typeof value === "string") return value.trim().toLocaleLowerCase("vi").replace(",", ".").replace(/\s+/gu, "");
  if ("numerator" in value) {
    const fraction = reduceFraction(value.numerator, value.denominator);
    return `${fraction.numerator}/${fraction.denominator}`;
  }
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === "string")) return JSON.stringify(value);
    return JSON.stringify([...value].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
  }
  throw new GenerationV2Error("VALIDATION_FAILED");
}

function independentlyDeriveCorrect(model: WaveANormalizedProblemModel, interaction: ProductInteractionContract): CanonicalResponse {
  const v = model.values;
  switch (model.modelKind) {
    case "NUMERIC":
      if (model.operation === "PLACE_VALUE") return model.task === "DIGIT_VALUE" ? v[2]! * v[1]! : v[0]!;
      if (model.operation === "+-") return v[0]! + v[1]! - v[2]!;
      if (model.operation === "-+") return v[0]! - v[1]! + v[2]!;
      if (model.operation === "+-UNKNOWN") return v[0]!;
      if (model.operation === "*+") return v[0]! * v[1]! + v[2]!;
      if (model.operation === "PARENTHESIZED") return (v[0]! + v[1]!) * v[2]!;
      if (model.task === "MISSING_OPERAND") return v[0]!;
      if (model.task === "INVERSE_CHECK") return v[2]!;
      if (model.task === "TWO_STEP") return model.operation === "+-" ? v[0]! + v[1]! - v[2]! : v[0]! - v[1]! + v[2]!;
      if (model.operation === "+") return v[0]! + v[1]!;
      if (model.operation === "-") return v[0]! - v[1]!;
      if (model.operation === "*") return v[0]! * v[1]!;
      if (model.operation === "/") return v[0]! / v[1]!;
      throw new GenerationV2Error("VALIDATION_FAILED");
    case "ORDER":
      return model.task === "ESTIMATE_TENS"
        ? Math.round(v[0]! / 10) * 10
        : [...v].sort((a, b) => model.operation === "DESC" ? b - a : a - b).map((value) => `value-${String(value)}`);
    case "ROUND": return Number((Math.round(v[0]! / v[1]!) * v[1]!).toFixed(8));
    case "MATCH": return model.labels.map((_, index) => ({ leftId: `role-${index}`, rightId: `value-${index}-${String(v[index])}` }));
    case "INTEGER_LINE": return model.task === "READ_MARK" ? v[0]! : model.task === "OPPOSITE" ? v[1]! : v[2]!;
    case "FRACTION": {
      if (model.task === "COMPARE_FRACTIONS") {
        const left = v[0]! * v[3]!; const right = v[2]! * v[1]!;
        return left < right ? "less" : left > right ? "greater" : "equal";
      }
      return model.task === "RECOVER_WHOLE" ? v[2]! : v[2]! * v[0]! / v[1]!;
    }
    case "POWER_ROOT":
      if (model.operation === "SQRT") return Math.sqrt(v[0]!);
      if (model.operation === "CBRT") return Math.cbrt(v[0]!);
      if (model.task === "EVALUATE_POWER") return v[0]! ** v[1]!;
      if (model.task === "MULTIPLY_SAME_BASE") return v[0]! ** (v[1]! + v[2]!);
      return v[0]! ** (v[1]! - v[2]!);
    case "MULTI_SELECT": {
      const target = v[0]!;
      return (interaction.options ?? []).filter((option) => {
        const candidate = Number(option.label);
        return model.task === "SELECT_DIVISIBLE" ? candidate % target === 0 : target % candidate === 0;
      }).map((option) => option.id);
    }
    case "CLASSIFY":
      if (model.task === "PRIME_OR_COMPOSITE") return isPrime(v[0]!) ? "prime" : "composite";
      return model.task === "PRIME_FACTORIZATION" ? "factor-correct" : "property-correct";
    case "PATTERN": return model.task === "NEXT" ? v[4]! : model.task === "PREVIOUS" ? v[0]! - v[1]! : v[3]!;
    case "APPLIED": return model.task === "SIGNED_CONTEXT" ? v[0]! - v[1]! + v[2]! : model.task === "ONE_STEP" ? v[0]! + v[1]! : v[0]! + v[1]! - v[2]!;
    case "ROMAN": return model.task === "ROMAN_TO_NATURAL" ? v[0]! : "roman-correct";
    case "SET": return (interaction.options ?? []).filter((option) => model.operation === "MULTIPLES_OF_3" ? Number(option.label) % 3 === 0 : Number(option.label) % 2 === 0).map((option) => option.id);
    case "SHAPE": return model.meta.shape === "CYLINDER" ? "shape-cylinder" : "shape-sphere";
    case "DATA": {
      if (model.task === "ORDER_RECORDS" || model.task === "ORDER_BY_DERIVED_VALUE") return v.map((value, index) => ({ id: `record-${index}`, value })).sort((a, b) => a.value - b.value).map((item) => item.id);
      if (model.task === "SELECT_ABOVE_THRESHOLD") {
        const threshold = Math.round(v.reduce((sum, value) => sum + value, 0) / v.length);
        return v.map((value, index) => ({ id: `record-${index}`, value })).filter((item) => item.value > threshold).map((item) => item.id);
      }
      return model.task === "MISSING_FROM_TOTAL" ? v[0]! + v[1]! + v[2]! : Math.abs(v[1]! - v[0]!);
    }
    case "ALGEBRA": {
      if (model.operation !== "RATIONAL") return "algebra-correct";
      const left = reduceFraction(v[0]!, v[2]! + v[1]!); const right = reduceFraction(v[1]!, v[2]! + v[0]!);
      return model.task === "EVALUATE_RATIONAL_PRODUCT"
        ? reduceFraction(left.numerator * right.numerator, left.denominator * right.denominator)
        : reduceFraction(left.numerator * right.denominator + right.numerator * left.denominator, left.denominator * right.denominator);
    }
    case "POLYNOMIAL": return model.task === "EVALUATE" ? v[0]! * v[6]! ** 2 + v[1]! * v[6]! + v[2]! : "polynomial-correct";
    case "RADICAL": return "radical-correct";
    case "INEQUALITY": return "inequality-correct";
    case "BANKING": return model.task === "TRANSACTION_BALANCE" ? v[0]! - v[3]! : model.task === "FIND_PRINCIPAL" ? v[0]! : v[0]! * v[1]! * v[2]! / 100;
    case "MIXED_NUMBER": return reduceFraction(v[0]! * v[2]! + v[1]!, v[2]!);
    case "REMAINDER": return model.task === "EXACT_DIVISION" ? v[2]! : model.task === "FIND_REMAINDER" ? v[3]! : v[0]!;
  }
}

function independentValidateWaveA(contract: WaveAOutcomeContract, model: WaveANormalizedProblemModel, solution: WaveASolution, prompt: string, interaction: ProductInteractionContract, visual: ProductVisual) {
  const checks: string[] = [];
  if (contract.outcomeId !== model.outcomeId || contract.canonicalVariantId !== model.variantId || contract.modelKind !== model.modelKind) throw new GenerationV2Error("VALIDATION_FAILED");
  checks.push("EXPLICIT_OUTCOME_VARIANT_CONTRACT_BINDING");
  if (model.structureLevel !== STRUCTURE[model.difficulty] || !model.structuralFingerprint.includes(`steps-${model.structureLevel}`) && !model.structuralFingerprint.includes(`task-${model.structureLevel}`) && !model.structuralFingerprint.includes(`representation-${model.structureLevel}`)) throw new GenerationV2Error("VALIDATION_FAILED");
  checks.push("STRUCTURAL_DIFFICULTY_FINGERPRINT");
  if (!prompt.trim() || !prompt.includes(LEADS[model.templateIndex]!) || !prompt.includes(CONTEXTS[model.contextIndex]!) || /undefined|null|seed|private|solverReceipt/iu.test(prompt)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (/\b(?:one_step|two_step|select_relevant|left_to_right|precedence|parenthesized|missing_from_total|difference_relation|add|subtract|multiply_linear)\b/iu.test(prompt)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (contract.grade <= 2 && contract.canonicalVariantId === "MIXED_ARITHMETIC_EXPRESSION" && /[×÷^]/u.test(prompt)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (model.modelKind === "DATA" && model.task === "DIFFERENCE_RELATION" && !/A.+B|B.+A/u.test(prompt)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (model.modelKind === "DATA" && model.task === "MISSING_FROM_TOTAL" && !/A, B và C/u.test(prompt)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (model.modelKind === "BANKING" && model.task === "FIND_PRINCIPAL" && !prompt.includes(String(model.values[0]! * model.values[1]! * model.values[2]! / 100))) throw new GenerationV2Error("VALIDATION_FAILED");
  if (contract.outcomeId === "MOET2018-G6-NAA-P047-009" && !["MULTIPLY_SAME_BASE", "DIVIDE_SAME_BASE"].includes(model.task)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (contract.outcomeId === "MOET2018-G4-NUM-P035-014" && model.task !== "ADDITION_ASSOCIATIVE") throw new GenerationV2Error("VALIDATION_FAILED");
  if (contract.outcomeId === "MOET2018-G4-NUM-P035-015" && model.task !== "MULTIPLICATION_ASSOCIATIVE") throw new GenerationV2Error("VALIDATION_FAILED");
  checks.push("PROMPT_MODEL_ALIGNMENT");
  for (const value of model.values) if (!Number.isFinite(value) || Math.abs(value) > Math.max(Math.abs(contract.parameterBounds.minimum), contract.parameterBounds.maximum) * 10) throw new GenerationV2Error("VALIDATION_FAILED");
  if (!contract.parameterBounds.allowNegative && model.values.some((value) => value < 0)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (model.modelKind === "NUMERIC" && model.operation === "/" && model.values[1] === 0) throw new GenerationV2Error("VALIDATION_FAILED");
  if (model.modelKind === "REMAINDER" && (model.values[3]! < 0 || model.values[3]! >= model.values[1]!)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (model.modelKind === "FRACTION" && [model.values[1], model.values[3]].some((value) => value === 0)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (model.modelKind === "POWER_ROOT" && model.operation === "SQRT" && model.values[0]! < 0) throw new GenerationV2Error("VALIDATION_FAILED");
  checks.push("GRADE_AND_MATHEMATICAL_DOMAIN_BOUNDS");
  const independentlyDerived = independentlyDeriveCorrect(model, interaction);
  if (normalizeCanonical(independentlyDerived) !== normalizeCanonical(solution.correct)) throw new GenerationV2Error("VALIDATION_FAILED");
  const accepted = new Set(solution.accepted.map(normalizeCanonical));
  if (accepted.size !== 1 || !accepted.has(normalizeCanonical(independentlyDerived))) throw new GenerationV2Error("VALIDATION_FAILED");
  checks.push("UNIQUE_ACCEPTED_ANSWER_POLICY");
  checks.push("INDEPENDENT_ANSWER_RECOMPUTATION");
  if (interaction.options) {
    const ids = interaction.options.map((option) => option.id); const labels = interaction.options.map((option) => option.label);
    if (new Set(ids).size !== ids.length || new Set(labels).size !== labels.length) throw new GenerationV2Error("VALIDATION_FAILED");
    const correctIds = Array.isArray(solution.correct) ? solution.correct.filter((item): item is string => typeof item === "string") : [String(solution.correct)];
    if (correctIds.some((id) => !ids.includes(id))) throw new GenerationV2Error("VALIDATION_FAILED");
    checks.push("DISTRACTOR_UNIQUENESS_AND_CORRECTNESS");
  }
  if (interaction.type === "MATCHING") {
    const leftIds = interaction.leftItems?.map((item) => item.id) ?? [];
    const rightIds = interaction.rightItems?.map((item) => item.id) ?? [];
    const rightLabels = interaction.rightItems?.map((item) => item.label) ?? [];
    if (!leftIds.length || leftIds.length !== new Set(leftIds).size || rightIds.length !== leftIds.length || rightIds.length !== new Set(rightIds).size || rightLabels.length !== new Set(rightLabels).size) throw new GenerationV2Error("VALIDATION_FAILED");
    checks.push("MATCHING_ITEM_ID_AND_LABEL_UNIQUENESS");
  }
  if (!contract.interactionPolicy.includes(interaction.type)) throw new GenerationV2Error("INTERACTION_UNSUPPORTED");
  checks.push("INTERACTION_ANSWER_ALIGNMENT");
  if (visual.type !== "NONE" && !JSON.stringify(visual.data).includes(String(model.values[0] ?? ""))) throw new GenerationV2Error("VALIDATION_FAILED");
  checks.push("VISUAL_NORMALIZED_MODEL_ALIGNMENT");
  checks.push("INDEPENDENT_WAVE_A_SOLVER_VALIDATOR");
  return { ok: true as const, checks };
}

function responseInstruction(interaction: ProductInteractionContract) {
  switch (interaction.type) {
    case "SINGLE_CHOICE": return "Chọn một đáp án.";
    case "MULTI_SELECT": return `Chọn đúng ${interaction.choiceCount ?? "các"} đáp án.`;
    case "INTEGER_INPUT": return "Nhập một số nguyên.";
    case "DECIMAL_INPUT": return interaction.unitLabel === "đồng" ? "Nhập số tiền bằng đồng." : "Nhập một số thập phân.";
    case "FRACTION_INPUT": return "Nhập tử số và mẫu số.";
    case "ORDERING": return "Chọn lần lượt các mục theo đúng thứ tự.";
    case "MATCHING": return "Ghép mỗi thành phần với giá trị tương ứng.";
    case "TABLE_OR_CHART_RESPONSE": return "Đọc bảng rồi nhập kết quả.";
    case "CONSTRUCTION_OR_VISUAL_SELECTION": return "Chọn hình hoặc mô hình phù hợp.";
    case "SHORT_STRUCTURED_RESPONSE": return "Nhập câu trả lời ngắn theo cấu trúc được yêu cầu.";
  }
}

export function generateWaveAQuestion(contract: WaveAOutcomeContract, input: GenerateQuestionInput): GeneratedProductQuestion {
  if (contract.engineVersion !== WAVE_A_ENGINE_VERSION) throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
  if (contract.outcomeId !== input.outcomeId || contract.grade !== input.grade) throw new GenerationV2Error("GRADE_MISMATCH");
  if (input.interactionType && !contract.interactionPolicy.includes(input.interactionType)) throw new GenerationV2Error("INTERACTION_UNSUPPORTED");
  const random = new Random(`${contract.outcomeId}:${input.difficulty}:${input.seed}`);
  const normalizedModel = buildWaveAModel(contract, input, random);
  const solution = solveWaveAModel(normalizedModel, random);
  const prompt = promptFor(normalizedModel);
  const visual = visualFor(normalizedModel);
  const interaction = interactionFor(normalizedModel, solution);
  const validation = independentValidateWaveA(contract, normalizedModel, solution, prompt, interaction, visual);
  const modelHash = hash(JSON.stringify(normalizedModel));
  const questionId = `v2-wave-a-${contract.canonicalVariantId.toLowerCase().replaceAll("_", "-")}-${hash(`${input.outcomeId}:${input.seed}:${input.difficulty}`).slice(0, 16)}`;
  const publicSnapshot = {
    schemaVersion: 2 as const,
    questionId,
    grade: contract.grade,
    outcomeId: contract.outcomeId,
    productFamilyId: contract.productFamilyId,
    variantId: contract.canonicalVariantId,
    variantVersion: VARIANT_VERSION,
    difficulty: input.difficulty,
    publicPrompt: prompt,
    publicData: {
      task: normalizedModel.task,
      operation: normalizedModel.operation,
      values: normalizedModel.values,
      labels: normalizedModel.labels,
      modelEvidence: normalizedModel.meta,
      difficultyStructure: normalizedModel.structureLevel,
      structuralFingerprint: normalizedModel.structuralFingerprint,
      contractVersion: contract.contractVersion,
    },
    interaction,
    visual,
    accessibility: { prompt, visualAlternative: visual.description, responseInstruction: responseInstruction(interaction) },
  };
  const privateSolution = {
    correctResponse: solution.correct,
    acceptedResponses: solution.accepted,
    solutionSteps: solution.steps,
    optionMisconceptions: solution.optionMisconceptions ?? {},
    nextStep: solution.nextStep,
  };
  const solverReceipt = { solverVersion: SOLVER_VERSION, normalizedInputHash: modelHash, resultHash: hash(JSON.stringify(solution.correct)), uniqueSolution: true };
  return {
    publicSnapshot,
    privateSolution,
    solverReceipt,
    validation,
    provenance: {
      questionSource: "GENERATED_V2",
      outcomeId: contract.outcomeId,
      productFamilyId: contract.productFamilyId,
      variantId: contract.canonicalVariantId,
      variantVersion: VARIANT_VERSION,
      generatorVersion: GENERATOR_V2_VERSION,
      solverVersion: SOLVER_VERSION,
      difficultyPolicyVersion: DIFFICULTY_POLICY_VERSION,
      seedFingerprint: hash(input.seed).slice(0, 16),
      normalizedModelHash: modelHash,
      publicSnapshotHash: hash(JSON.stringify(publicSnapshot)),
      visualHash: hash(JSON.stringify(visual)),
      solverReceiptHash: hash(JSON.stringify(solverReceipt)),
    },
  };
}

export const __waveANegativeControl = {
  validate: independentValidateWaveA,
  solve: solveWaveAModel,
  inspect(contract: WaveAOutcomeContract, input: GenerateQuestionInput) {
    const random = new Random(`${contract.outcomeId}:${input.difficulty}:${input.seed}`);
    const normalizedModel = buildWaveAModel(contract, input, random);
    const solution = solveWaveAModel(normalizedModel, random);
    const prompt = promptFor(normalizedModel);
    const visual = visualFor(normalizedModel);
    const interaction = interactionFor(normalizedModel, solution);
    return { normalizedModel, solution, prompt, visual, interaction };
  },
};
