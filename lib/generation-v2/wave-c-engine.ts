import { createHash } from "node:crypto";

import type {
  CanonicalResponse,
  FractionValue,
  GenerateQuestionInput,
  GeneratedProductQuestion,
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
import {
  WAVE_C_ENGINE_VERSION,
  type WaveCOutcomeContract,
} from "./wave-c-contracts.ts";

type JsonValue = string | number | boolean | null | readonly JsonValue[] | Readonly<{ [key: string]: JsonValue }>;

export type WaveCNormalizedProblemModel = Readonly<{
  schemaVersion: 1;
  engineVersion: typeof WAVE_C_ENGINE_VERSION;
  outcomeId: string;
  variantId: WaveCOutcomeContract["canonicalVariantId"];
  taskMode: string;
  profile: WaveCOutcomeContract["profile"];
  grade: number;
  difficulty: GenerateQuestionInput["difficulty"];
  structureLevel: 1 | 2 | 3;
  structuralFingerprint: string;
  templateIndex: number;
  contextIndex: number;
  interactionType: ProductInteractionContract["type"];
  operation: string;
  values: readonly number[];
  rationals: readonly FractionValue[];
  labels: readonly string[];
  scale: number;
  meta: Readonly<Record<string, JsonValue>>;
}>;

type WaveCSolution = Readonly<{
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
const add = (a: FractionValue, b: FractionValue) => reduce(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator);
const subtract = (a: FractionValue, b: FractionValue) => reduce(a.numerator * b.denominator - b.numerator * a.denominator, a.denominator * b.denominator);
const multiply = (a: FractionValue, b: FractionValue) => reduce(a.numerator * b.numerator, a.denominator * b.denominator);
const divide = (a: FractionValue, b: FractionValue) => {
  if (b.numerator === 0) throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
  return reduce(a.numerator * b.denominator, a.denominator * b.numerator);
};
const fractionText = (value: FractionValue) => `${value.numerator}/${value.denominator}`;
const scaledText = (value: number, scale: number) => (value / scale).toFixed(Math.log10(scale)).replace(".", ",").replace(/,?0+$/u, "");
const signedTerm = (coefficient: number, variable = "x") => `${coefficient >= 0 ? "+" : "−"} ${Math.abs(coefficient)}${variable}`;

const normalize = (value: CanonicalResponse): string => {
  if (typeof value === "number") return String(Number(value.toFixed(8)));
  if (typeof value === "string") return value.trim().toLocaleLowerCase("vi").replaceAll("−", "-").replaceAll("×", "*").replaceAll(",", ".").replace(/\s+/gu, "");
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === "string")) return JSON.stringify(value);
    return JSON.stringify([...value].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
  }
  if ("numerator" in value) return fractionText(reduce(value.numerator, value.denominator));
  return JSON.stringify(value);
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
  shuffle<T>(items: readonly T[]): T[] { return [...items].map((item) => ({ item, order: this.int(0, 1_000_000) })).sort((a, b) => a.order - b.order).map(({ item }) => item); }
}

const STRUCTURE = { EASY: 1, MEDIUM: 2, HARD: 3 } as const;
const LEADS = [
  "Tính chính xác", "Suy luận từng bước", "Đối chiếu hai cách biểu diễn", "Hoàn thành phiếu học tập", "Giúp bạn Minh kiểm tra", "Dùng phép tính thích hợp", "Kiểm tra điều kiện trước", "Phân tích dữ kiện", "Tìm giá trị còn thiếu", "Giải thích bằng mô hình", "Chọn quy tắc phù hợp", "Đọc kĩ kí hiệu", "Kiểm tra bằng phép tính ngược", "Hoàn thành thử thách", "So sánh trước khi kết luận", "Dùng biểu diễn chính xác", "Kiểm tra miền giá trị", "Quan sát bảng dữ liệu", "Viết quan hệ toán học", "Tách bài toán thành bước", "Đánh giá lời giải", "Chuẩn hóa kết quả", "Dùng cấu trúc đại số", "Xác minh nghiệm", "Đọc đúng trục và nhãn", "Tìm lỗi thường gặp", "Hoàn thiện bảng con", "Kết nối công thức và dữ kiện", "Chọn bằng chứng trực tiếp", "Giúp nhóm học tập", "Thử một cách hợp lí", "Nêu kết quả tối giản",
] as const;
const CONTEXTS = [
  "góc học tập", "thư viện lớp", "câu lạc bộ Toán", "khu vườn trường", "quầy sách", "bảng theo dõi", "hộp thẻ số", "buổi thực hành", "kho dụng cụ", "chuyến tham quan", "gian hàng nhỏ", "phòng thí nghiệm", "tủ đồ dùng", "ngày hội Toán", "sân trường", "phòng đọc", "nhóm trực nhật", "bàn trưng bày", "xưởng mô hình", "phiếu khảo sát", "góc tái chế", "lớp học xanh", "khu trải nghiệm", "bảng kế hoạch", "trạm thực hành", "bảng thi đua", "khu đọc mở", "góc sáng tạo", "phòng đa năng", "dự án của lớp", "bàn học nhóm", "sổ theo dõi",
] as const;

function chooseInteraction(contract: WaveCOutcomeContract, input: GenerateQuestionInput) {
  if (input.interactionType && !contract.interactionPolicy.includes(input.interactionType)) throw new GenerationV2Error("INTERACTION_UNSUPPORTED");
  if (contract.canonicalVariantId === "QUADRATIC_EQUATION_SOLVING") {
    const required = input.difficulty === "EASY" ? "INTEGER_INPUT" : "ORDERING";
    if (input.interactionType && input.interactionType !== required) throw new GenerationV2Error("INTERACTION_UNSUPPORTED");
    return required;
  }
  if (input.interactionType) return input.interactionType;
  return contract.interactionPolicy[input.difficulty === "HARD" && contract.interactionPolicy.length > 1 ? 1 : 0]!;
}

function fraction(random: Random, maximum = 18, signed = false): FractionValue {
  const denominator = random.int(2, maximum);
  const numerator = random.int(1, denominator - 1) * (signed && random.int(0, 1) ? -1 : 1);
  return reduce(numerator, denominator);
}

function model(contract: WaveCOutcomeContract, input: GenerateQuestionInput, random: Random, fields: Readonly<{
  operation: string;
  values?: readonly number[];
  rationals?: readonly FractionValue[];
  labels?: readonly string[];
  scale?: number;
  meta?: Readonly<Record<string, JsonValue>>;
  fingerprint: string;
}>): WaveCNormalizedProblemModel {
  const structureLevel = STRUCTURE[input.difficulty];
  return {
    schemaVersion: 1,
    engineVersion: WAVE_C_ENGINE_VERSION,
    outcomeId: contract.outcomeId,
    variantId: contract.canonicalVariantId,
    taskMode: contract.taskMode,
    profile: contract.profile,
    grade: contract.grade,
    difficulty: input.difficulty,
    structureLevel,
    structuralFingerprint: `${contract.canonicalVariantId}:${fields.fingerprint}:structure-${structureLevel}`,
    templateIndex: random.int(0, LEADS.length - 1),
    contextIndex: random.int(0, CONTEXTS.length - 1),
    interactionType: chooseInteraction(contract, input),
    operation: fields.operation,
    values: fields.values ?? [],
    rationals: fields.rationals ?? [],
    labels: fields.labels ?? [],
    scale: fields.scale ?? 1,
    meta: fields.meta ?? {},
  };
}

function buildModel(contract: WaveCOutcomeContract, input: GenerateQuestionInput, random: Random): WaveCNormalizedProblemModel {
  const level = STRUCTURE[input.difficulty];
  switch (contract.canonicalVariantId) {
    case "MIXED_ARITHMETIC_EXPRESSION": {
      const a = random.int(12, 80); const b = random.int(2, 12); const c = random.int(2, 10);
      const parentheses = contract.taskMode.includes("PARENTHESES");
      const operation = parentheses ? (level === 1 ? "ADD_THEN_MULTIPLY_PAREN" : level === 2 ? "SUBTRACT_THEN_DIVIDE_PAREN" : "MULTIPLY_THEN_ADD_PAREN") : level === 1 ? "MULTIPLY_THEN_ADD" : level === 2 ? "DIVIDE_THEN_SUBTRACT" : "MULTIPLY_THEN_SUBTRACT";
      const values = operation === "SUBTRACT_THEN_DIVIDE_PAREN" ? [b * c + b, b, c] : operation === "DIVIDE_THEN_SUBTRACT" ? [b * c, b, c] : [a, b, c];
      return model(contract, input, random, { operation, values, fingerprint: `${operation}:operand-band-${Math.floor(a / 10)}` });
    }
    case "ALGEBRAIC_SUBSTITUTION": {
      const variables = contract.grade === 4 ? Math.min(level, 3) : level === 1 ? 1 : 2;
      const coefficients = [random.int(1, 6), random.int(1, 5), random.int(1, 4)];
      const assignments = [random.int(contract.grade >= 7 ? -5 : 1, 9), random.int(1, 8), random.int(1, 7)];
      return model(contract, input, random, { operation: variables === 1 ? "ONE_VARIABLE" : variables === 2 ? "TWO_VARIABLE" : "THREE_VARIABLE", values: [...coefficients.slice(0, variables), ...assignments.slice(0, variables), random.int(-8, 8)], labels: ["a", "b", "c"].slice(0, variables), fingerprint: `variables-${variables}:signed-${Number(assignments.some((value) => value < 0))}` });
    }
    case "RATIONAL_COMPARE_ORDER": {
      const count = contract.taskMode === "FRACTION_EXTREME" ? 4 : level === 1 ? 2 : 4;
      const common = random.pick([6, 8, 10, 12]);
      const rationals: FractionValue[] = [];
      while (rationals.length < count) {
        const divisor = random.pick([1, 2]);
        const candidate = reduce(random.int(1, common / divisor - 1), common / divisor);
        if (!rationals.some((item) => item.numerator * candidate.denominator === candidate.numerator * item.denominator)) rationals.push(candidate);
      }
      return model(contract, input, random, { operation: contract.taskMode === "FRACTION_EXTREME" ? (level === 2 ? "MIN" : "MAX") : level === 2 ? "DESC" : "ASC", rationals, labels: rationals.map((_, index) => `f${index + 1}`), fingerprint: `count-${count}:denominator-family-${common}:direction-${level}` });
    }
    case "FRACTION_COMMON_DENOMINATOR": {
      const small = random.pick([2, 3, 4, 5, 6]); const factor = random.int(2, level + 3); const large = small * factor; const numerator = random.int(1, small - 1);
      return model(contract, input, random, { operation: "WRITE_EQUIVALENT_WITH_TARGET_DENOMINATOR", values: [numerator, small, large, numerator * factor], rationals: [reduce(numerator, small)], fingerprint: `factor-${factor}:target-band-${Math.ceil(large / 6)}` });
    }
    case "FRACTION_EQUIVALENCE": {
      const base = fraction(random, contract.grade === 4 ? 12 : 30); const factor = random.int(2, level + 4);
      return model(contract, input, random, { operation: "SIMPLIFY", values: [factor], rationals: [{ numerator: base.numerator * factor, denominator: base.denominator * factor }, base], fingerprint: `factor-${factor}:denominator-band-${Math.ceil(base.denominator / 5)}` });
    }
    case "NUMERIC_OPERATION_PROPERTIES": {
      const a = random.int(2, 12); const b = random.int(2, 15); const c = random.int(2, 10); const decimal = contract.taskMode.includes("DECIMAL");
      return model(contract, input, random, { operation: level === 1 ? "DISTRIBUTIVE" : level === 2 ? "ASSOCIATIVE" : "INVERSE_RELATION", values: [a, b, c], scale: decimal ? 10 : 1, fingerprint: `${decimal ? "decimal" : "whole"}:property-${level}` });
    }
    case "FRACTION_APPLICATION": {
      const denominator = random.pick([3, 4, 5, 6, 8, 10]); const numerator = random.int(1, denominator - 1); const quantity = denominator * random.int(3, 15);
      const second = fraction(random, 12);
      return model(contract, input, random, { operation: level === 1 ? "FRACTION_OF_QUANTITY" : level === 2 ? "FRACTION_REMAINING" : "TWO_FRACTION_STEPS", values: [quantity], rationals: [reduce(numerator, denominator), second], fingerprint: `steps-${level}:denominator-${denominator}:context-${random.int(0, 4)}` });
    }
    case "RATIONAL_OPERATIONS": {
      const a = fraction(random, contract.grade === 4 ? 12 : 20); const b = fraction(random, contract.grade === 4 ? 12 : 20);
      const operation = contract.taskMode.includes("MULTIPLY_DIVIDE") ? random.pick(["MULTIPLY", "DIVIDE"] as const) : contract.taskMode.includes("ADD_SUB") ? random.pick(["ADD", "SUBTRACT"] as const) : (["ADD", "SUBTRACT", "MULTIPLY", "DIVIDE"] as const)[level] ?? "DIVIDE";
      return model(contract, input, random, { operation, rationals: [a, b], fingerprint: `${operation}:denominator-relation-${a.denominator === b.denominator ? "same" : "different"}` });
    }
    case "DATA_SEQUENCE_RECOGNITION": {
      const count = level === 1 ? 4 : 6;
      const values: number[] = [];
      while (values.length < count) {
        const candidate = random.int(2, 30);
        if (!values.includes(candidate)) values.push(candidate);
      }
      return model(contract, input, random, { operation: level === 2 ? "DESC" : "ASC", values, labels: values.map((_, index) => `d${index + 1}`), fingerprint: `count-${values.length}:direction-${level === 2 ? "desc" : "asc"}` });
    }
    case "DATA_INVESTIGATION": {
      const values = Array.from({ length: 4 }, () => random.int(4, 25));
      return model(contract, input, random, { operation: level === 1 ? "TOTAL" : level === 2 ? "RANGE" : "COMPARE_SUMS", values, labels: ["Nhóm A", "Nhóm B", "Nhóm C", "Nhóm D"], fingerprint: `statistic-${level}:value-band-${Math.floor(values[0]! / 5)}` });
    }
    case "DECIMAL_REPRESENTATION": {
      const scale = level === 1 ? 10 : level === 2 ? 100 : 1_000; const value = random.int(scale, 99 * scale - 1);
      return model(contract, input, random, { operation: contract.taskMode === "DECIMAL_PLACE_VALUE" && level === 3 ? "DIGIT_AT_PLACE" : "WRITE_DECIMAL", values: [value, random.int(1, Math.log10(scale))], scale, fingerprint: `${contract.taskMode}:scale-${scale}:representation-${level}` });
    }
    case "MIXED_DECIMAL_FRACTION_REPRESENTATION": {
      const denominator = random.pick([10, 100, 1_000]); const whole = random.int(1, 12); const numerator = random.int(1, denominator - 1);
      return model(contract, input, random, { operation: level === 1 ? "DECIMAL_FRACTION" : "MIXED_TO_IMPROPER", values: [whole, numerator, denominator], rationals: [reduce(whole * denominator + numerator, denominator)], fingerprint: `${level === 1 ? "decimal-fraction" : "mixed"}:denominator-${denominator}` });
    }
    case "PERCENTAGE_REASONING": {
      const percent = random.pick([5, 10, 20, 25, 40, 50, 75]); const whole = random.int(4, 40) * 20; const part = whole * percent / 100;
      return model(contract, input, random, { operation: level === 1 ? "PERCENT_OF_WHOLE" : level === 2 ? "RATE_FROM_PART" : "RECOVER_WHOLE", values: [whole, percent, part], scale: 100, fingerprint: `mode-${level}:percent-${percent}` });
    }
    case "DECIMAL_APPLICATION": {
      const scale = level === 1 ? 10 : 100; const a = random.int(20, 500); const b = random.int(10, Math.max(11, a - 1)); const c = random.int(3, 30);
      return model(contract, input, random, { operation: level === 1 ? "ADD" : level === 2 ? "SUBTRACT" : "ADD_THEN_SUBTRACT", values: level === 3 ? [a, b, c] : [a, b], scale, fingerprint: `steps-${level}:scale-${scale}:context-${random.int(0, 5)}` });
    }
    case "DECIMAL_ROUNDING": {
      const inputScale = 1_000; const targetScale = level === 1 ? 1 : level === 2 ? 10 : 100; const value = random.int(1_001, 99_999);
      return model(contract, input, random, { operation: "ROUND", values: [value, targetScale], scale: inputScale, fingerprint: `target-${targetScale}:direction-${value % (inputScale / targetScale) >= inputScale / targetScale / 2 ? "up" : "down"}` });
    }
    case "SCALE_REASONING": {
      const scaleRatio = random.pick([10_000, 25_000, 50_000, 100_000]); const mapCm = random.int(2, 20); const realMeters = mapCm * scaleRatio / 100;
      return model(contract, input, random, { operation: level === 3 ? "MAP_FROM_REAL" : "REAL_FROM_MAP", values: [mapCm, scaleRatio, realMeters], scale: 100, fingerprint: `${level === 3 ? "inverse" : "forward"}:ratio-${scaleRatio}` });
    }
    case "DECIMAL_OPERATIONS": {
      const scale = 100; const a = random.int(100, 4_000); const b = random.int(10, 500);
      const operation = contract.taskMode.includes("DIVISION") ? "DIVIDE" : contract.taskMode.includes("MULTIPLICATION") ? "MULTIPLY" : level === 1 ? "ADD" : "SUBTRACT";
      const values = operation === "DIVIDE" ? [b * random.int(2, 20), b] : operation === "SUBTRACT" ? [Math.max(a, b), Math.min(a, b)] : [a, b];
      return model(contract, input, random, { operation, values, scale, fingerprint: `${operation}:scale-${scale}:band-${Math.floor(a / 500)}` });
    }
    case "DECIMAL_SCALE_OPERATION": {
      const inputScale = 100; const value = random.int(101, 9_999); const factor = random.pick([10, 100, 1_000]); const operation = level === 2 ? "DIVIDE" : "MULTIPLY";
      return model(contract, input, random, { operation, values: [value, factor], scale: inputScale, fingerprint: `${operation}:factor-${factor}` });
    }
    case "DECIMAL_COMPARE_ORDER": {
      const scale = level === 1 ? 10 : level === 2 ? 100 : 1_000; const base = random.int(scale, scale * 20); const values = [...new Set([base, base + 1, base + random.int(2, 9), base - random.int(1, Math.min(9, base - 1))])];
      while (values.length < 4) values.push(base + values.length * 11);
      return model(contract, input, random, { operation: level === 2 ? "DESC" : "ASC", values: values.slice(0, 4), labels: ["d1", "d2", "d3", "d4"], scale, fingerprint: `scale-${scale}:direction-${level === 2 ? "desc" : "asc"}` });
    }
    case "SIGNED_FRACTION_REPRESENTATION": {
      const base = fraction(random, 20); const signAtDenominator = level !== 1; const displayed = { numerator: signAtDenominator ? base.numerator : -base.numerator, denominator: signAtDenominator ? -base.denominator : base.denominator };
      return model(contract, input, random, { operation: "NORMALIZE_SIGN", rationals: [displayed, reduce(displayed.numerator, displayed.denominator)], fingerprint: `sign-position-${signAtDenominator ? "denominator" : "numerator"}:representation-${level}` });
    }
    case "RATIO_PROPORTION": {
      const a = random.int(2, 10); const b = random.int(2, 12); const factor = random.int(2, 8);
      return model(contract, input, random, { operation: "MISSING_EQUAL_RATIO", values: [a, b, a * factor, b * factor], scale: 1, fingerprint: `factor-${factor}:unknown-position-${level}` });
    }
    case "PROPORTIONAL_REASONING": {
      const left = random.int(2, 8); const right = random.int(2, 8); const factor = random.int(3, 15); const total = (left + right) * factor;
      return model(contract, input, random, { operation: level === 2 ? "RIGHT_PART" : "LEFT_PART", values: [left, right, total, left * factor, right * factor], fingerprint: `ratio-${left}-${right}:target-${level === 2 ? "right" : "left"}` });
    }
    case "ALGEBRAIC_IDENTITY": {
      return model(contract, input, random, { operation: contract.taskMode === "NOTABLE_IDENTITIES" ? "MATCH_IDENTITIES" : "RECOGNIZE_IDENTITY", values: [random.int(2, 9), random.int(2, 9)], labels: ["I1", "I2", "I3"], fingerprint: `${contract.taskMode}:identity-family-${level}` });
    }
    case "POLYNOMIAL_SIMPLIFICATION": {
      const a = random.int(2, 9) * (random.int(0, 1) ? 1 : -1); const b = random.int(1, 8); const c = random.int(1, 8) * (random.int(0, 1) ? 1 : -1); const d = random.int(1, 9);
      return model(contract, input, random, { operation: level === 1 ? "LINEAR" : "QUADRATIC", values: [a, b, c, d], fingerprint: `degree-${level === 1 ? 1 : 2}:sign-pattern-${Number(a < 0)}${Number(c < 0)}` });
    }
    case "FUNCTION_GRAPH_RECOGNITION": {
      const slope = random.pick([-3, -2, -1, 1, 2, 3]); const intercept = random.int(-5, 5);
      return model(contract, input, random, { operation: "VERTICAL_LINE_TEST", values: [slope, intercept], labels: ["graph-function", "graph-circle", "graph-sideways", "graph-vertical"], fingerprint: `slope-${slope}:intercept-sign-${Math.sign(intercept)}:representation-${level}` });
    }
    case "FUNCTION_EVALUATION": {
      const a = random.int(-5, 6) || 2; const b = random.int(-10, 10); const x = random.int(-6, 8);
      return model(contract, input, random, { operation: level === 3 ? "QUADRATIC_FUNCTION" : "LINEAR_FUNCTION", values: [a, b, x], fingerprint: `degree-${level === 3 ? 2 : 1}:input-sign-${Math.sign(x)}` });
    }
    case "POLYNOMIAL_FACTORIZATION": {
      const a = random.int(2, 8); const b = random.int(1, 9);
      return model(contract, input, random, { operation: level === 1 ? "COMMON_FACTOR" : level === 2 ? "DIFFERENCE_SQUARES" : "PERFECT_SQUARE", values: [a, b], fingerprint: `method-${level}:coefficient-band-${Math.floor(a / 3)}` });
    }
    case "QUADRATIC_MODELING": {
      const root = random.int(4, 20); const other = -random.int(1, 9); const a = random.int(1, 3);
      return model(contract, input, random, { operation: contract.taskMode.includes("APPLICATION") ? "CONTEXT_VALID_ROOT" : "CONTEXT_VALID_ROOT", values: [a, root, other], meta: { contextKind: level === 1 ? "rectangle" : level === 2 ? "projectile" : "revenue" }, fingerprint: `context-${level}:positive-root-band-${Math.floor(root / 5)}` });
    }
    case "QUADRATIC_GRAPH_SYMMETRY": {
      const axis = random.int(-8, 8); const a = random.pick([-3, -2, -1, 1, 2, 3]); const c = random.int(-10, 10); const b = -2 * a * axis;
      return model(contract, input, random, { operation: "AXIS", values: [a, b, c, axis], fingerprint: `opening-${Math.sign(a)}:axis-band-${Math.sign(axis)}:coefficient-${Math.abs(a)}` });
    }
    case "RADICAL_TRANSFORMATION": {
      const outside = random.int(2, 9); const squareFree = random.pick([2, 3, 5, 6, 7, 10, 11, 13]);
      return model(contract, input, random, { operation: level === 3 ? "RATIONALIZE_SIMPLE" : "SIMPLIFY_RADICAL", values: [outside, squareFree, outside * outside * squareFree], fingerprint: `${level === 3 ? "rationalize" : "simplify"}:square-free-${squareFree}` });
    }
    case "LINEAR_SYSTEM":
    case "LINEAR_SYSTEM_MODELING":
    case "LINEAR_SYSTEM_SOLUTION_CHECK": {
      const x = random.int(-8, 15); const sampledY = random.int(-7, 14); const y = sampledY === x ? sampledY + 1 : sampledY; const a = level === 1 ? 1 : random.int(1, 4); const b = random.int(1, 4); const c = random.int(1, 4); let d = -random.int(1, 4); if (a * d === b * c) d -= 1;
      return model(contract, input, random, { operation: contract.canonicalVariantId === "LINEAR_SYSTEM_MODELING" ? "MODEL_AND_SOLVE" : contract.canonicalVariantId === "LINEAR_SYSTEM_SOLUTION_CHECK" ? "CHECK_PAIR" : "SOLVE_SYSTEM", values: [a, b, a * x + b * y, c, d, c * x + d * y, x, y], fingerprint: `${contract.canonicalVariantId}:determinant-band-${Math.abs(a * d - b * c)}:solution-sign-${Number(x < 0)}${Number(y < 0)}` });
    }
    case "QUADRATIC_EQUATION_SOLVING": {
      const r1 = random.int(-10, 8); const r2 = level === 1 ? r1 : r1 + random.int(1, 8);
      return model(contract, input, random, { operation: r1 === r2 ? "DOUBLE_ROOT" : "TWO_ROOTS", values: [1, -(r1 + r2), r1 * r2, r1, r2], fingerprint: `${r1 === r2 ? "double" : "two"}:root-sign-${Number(r1 < 0)}${Number(r2 < 0)}` });
    }
    case "RATIONAL_EQUATION_SOLVING": {
      const excluded = random.int(-6, 6); const root = excluded + random.int(1, 8); const coefficient = random.int(1, 5);
      return model(contract, input, random, { operation: "LINEAR_RATIONAL", values: [excluded, root, coefficient], fingerprint: `excluded-sign-${Math.sign(excluded)}:distance-${root - excluded}` });
    }
    case "PRODUCT_EQUATION_SOLVING": {
      const a = random.int(1, 5); const c = random.int(1, 5); const r1 = random.int(-9, 7); let r2 = random.int(-8, 9); if (r2 === r1) r2 += 2;
      return model(contract, input, random, { operation: "ZERO_PRODUCT", values: [a, -a * r1, c, -c * r2, r1, r2], fingerprint: `root-sign-${Number(r1 < 0)}${Number(r2 < 0)}:coefficient-band-${a + c}` });
    }
    case "INEQUALITY_PROPERTY": {
      const a = random.int(-12, 4); const b = random.int(a + 1, 15); const multiplier = level === 3 ? -random.int(2, 6) : random.int(2, 6);
      return model(contract, input, random, { operation: multiplier < 0 ? "MULTIPLY_NEGATIVE" : level === 2 ? "ADD_BOTH_SIDES" : "MULTIPLY_POSITIVE", values: [a, b, multiplier], fingerprint: `property-${level}:multiplier-sign-${Math.sign(multiplier)}` });
    }
    case "QUADRATIC_EQUATION_RECOGNITION": {
      const a = random.int(1, 6); const b = random.int(-8, 8); const c = random.int(-10, 10);
      return model(contract, input, random, { operation: "RECOGNIZE_QUADRATIC", values: [a, b, c], fingerprint: `coefficient-${a}:sign-pattern-${Number(b < 0)}${Number(c < 0)}` });
    }
    case "LINEAR_SYSTEM_RECOGNITION": {
      const a = random.int(1, 5); const b = random.int(-5, 5); const c = random.int(-10, 10);
      return model(contract, input, random, { operation: "RECOGNIZE_LINEAR_SYSTEM", values: [a, b, c], fingerprint: `coefficient-${a}:sign-pattern-${Number(b < 0)}` });
    }
    case "LINEAR_INEQUALITY_SOLVING": {
      const boundary = random.int(-10, 12); const coefficient = level === 3 ? -random.int(2, 6) : random.int(1, 6); const constant = random.int(-8, 8); const rhs = coefficient * boundary + constant; const relation = level === 2 ? "<=" : level === 3 ? ">" : "<";
      return model(contract, input, random, { operation: "SOLVE_LINEAR_INEQUALITY", values: [coefficient, constant, rhs, boundary], meta: { relation }, fingerprint: `relation-${relation}:coefficient-sign-${Math.sign(coefficient)}:boundary-band-${Math.sign(boundary)}` });
    }
    case "LINEAR_INEQUALITY_RECOGNITION": {
      const coefficient = random.int(1, 6); const boundary = random.int(-8, 10);
      return model(contract, input, random, { operation: "RECOGNIZE_LINEAR_INEQUALITY", values: [coefficient, boundary], fingerprint: `coefficient-${coefficient}:boundary-sign-${Math.sign(boundary)}:representation-${level}` });
    }
  }
}

const optionMisconceptions = (ids: readonly string[], code: MisconceptionCode): Readonly<Record<string, MisconceptionCode>> => Object.fromEntries(ids.map((id) => [id, code]));
const numericOptions = (correct: number, offsets: readonly number[], code: MisconceptionCode): Pick<WaveCSolution, "correct" | "accepted" | "options" | "optionMisconceptions"> => {
  const values = [correct, ...offsets.map((offset) => correct + offset)].filter((value, index, all) => all.indexOf(value) === index).slice(0, 4);
  while (values.length < 4) values.push(correct + values.length + 1);
  const options = values.map((value, index) => ({ id: index === 0 ? "correct" : `wrong-${index}`, label: String(value) }));
  return { correct: "correct", accepted: ["correct"], options, optionMisconceptions: optionMisconceptions(options.slice(1).map((item) => item.id), code) };
};
const baseSolution = (correct: CanonicalResponse, steps: readonly string[], nextStep: string): WaveCSolution => ({ correct, accepted: [correct], steps, nextStep });

function solveModel(m: WaveCNormalizedProblemModel): WaveCSolution {
  const v = m.values; const r = m.rationals;
  switch (m.variantId) {
    case "MIXED_ARITHMETIC_EXPRESSION": {
      const result = m.operation === "ADD_THEN_MULTIPLY_PAREN" ? (v[0]! + v[1]!) * v[2]! : m.operation === "SUBTRACT_THEN_DIVIDE_PAREN" ? (v[0]! - v[1]!) / v[2]! : m.operation === "MULTIPLY_THEN_ADD_PAREN" ? v[0]! * (v[1]! + v[2]!) : m.operation === "MULTIPLY_THEN_ADD" ? v[0]! + v[1]! * v[2]! : m.operation === "DIVIDE_THEN_SUBTRACT" ? v[0]! / v[1]! - v[2]! : v[0]! * v[1]! - v[2]!;
      if (!Number.isInteger(result)) throw new GenerationV2Error("SOLVER_FAILED");
      return baseSolution(result, ["Thực hiện phép tính trong ngoặc hoặc phép nhân, chia trước.", `Tính tiếp phép còn lại được ${result}.`], "Thử đặt một cặp ngoặc khác và giải thích vì sao kết quả đổi.");
    }
    case "ALGEBRAIC_SUBSTITUTION": {
      const count = m.labels.length; const coefficients = v.slice(0, count); const assignments = v.slice(count, count * 2); const constant = v[count * 2] ?? 0; const result = coefficients.reduce((sum, value, index) => sum + value * assignments[index]!, constant);
      const correct = m.interactionType === "FRACTION_INPUT" ? reduce(result, 1) : result;
      return baseSolution(correct, [`Thay ${m.labels.map((label, index) => `${label}=${assignments[index]}`).join(", ")}.`, `Nhân hệ số với giá trị tương ứng rồi cộng hằng số ${constant}.`, `Kết quả bằng ${result}.`], "Thay lại từng giá trị một lần nữa để kiểm tra dấu.");
    }
    case "RATIONAL_COMPARE_ORDER": {
      const order = r.map((value, index) => ({ value: value.numerator / value.denominator, id: m.labels[index]! })).sort((a, b) => a.value - b.value);
      if (m.operation === "MAX" || m.operation === "MIN") {
        const correctId = m.operation === "MAX" ? order.at(-1)!.id : order[0]!.id;
        const options = r.map((value, index) => ({ id: m.labels[index]!, label: fractionText(value) }));
        return { correct: correctId, accepted: [correctId], options, steps: ["Quy đồng hoặc dùng tích chéo để so sánh.", `${m.operation === "MAX" ? "Phân số lớn nhất" : "Phân số bé nhất"} là ${fractionText(r[m.labels.indexOf(correctId)]!)}.`], nextStep: "Kiểm tra lại bằng cách đặt các phân số trên cùng một trục số.", optionMisconceptions: optionMisconceptions(options.filter((item) => item.id !== correctId).map((item) => item.id), "NUMERATOR_DENOMINATOR_CONFUSION") };
      }
      const ids = (m.operation === "DESC" ? order.reverse() : order).map((item) => item.id);
      return { ...baseSolution(ids, ["So sánh bằng tích chéo chính xác.", `Sắp theo chiều ${m.operation === "DESC" ? "giảm" : "tăng"}.`], "Đọc lại chiều sắp xếp trước khi nộp."), options: r.map((value, index) => ({ id: m.labels[index]!, label: fractionText(value) })) };
    }
    case "FRACTION_COMMON_DENOMINATOR": return baseSolution(v[3]!, [`Nhân mẫu ${v[1]} với ${v[2]! / v[1]!} để được ${v[2]}.`, `Nhân tử ${v[0]} với cùng số đó được ${v[3]}.`], "Kiểm tra hai phân số bằng tích chéo.");
    case "FRACTION_EQUIVALENCE": return baseSolution(r[1]!, [`Chia cả tử và mẫu cho ${v[0]}.`, `Phân số tối giản là ${fractionText(r[1]!)}.`], "Kiểm tra tử và mẫu còn ước chung lớn hơn 1 hay không.");
    case "NUMERIC_OPERATION_PROPERTIES": {
      const [a, b, c] = v; const scale = m.scale; const text = (n: number) => scale === 1 ? String(n) : scaledText(n, scale);
      const options = m.operation === "DISTRIBUTIVE" ? [{ id: "correct", label: `${text(a)}×(${text(b)}+${text(c)}) = ${text(a)}×${text(b)} + ${text(a)}×${text(c)}` }, { id: "wrong-1", label: `${text(a)}×(${text(b)}+${text(c)}) = ${text(a)}×${text(b)} + ${text(c)}` }, { id: "wrong-2", label: `${text(a)}×(${text(b)}+${text(c)}) = (${text(a)}+${text(b)})×${text(c)}` }, { id: "wrong-3", label: `${text(a)}×(${text(b)}+${text(c)}) = ${text(a)}+${text(b)}+${text(c)}` }] : [{ id: "correct", label: `(${text(a)}+${text(b)})+${text(c)} = ${text(a)}+(${text(b)}+${text(c)})` }, { id: "wrong-1", label: `(${text(a)}+${text(b)})×${text(c)} = ${text(a)}+(${text(b)}×${text(c)})` }, { id: "wrong-2", label: `${text(a)}−(${text(b)}+${text(c)}) = (${text(a)}−${text(b)})+${text(c)}` }, { id: "wrong-3", label: `${text(a)}÷(${text(b)}+${text(c)}) = ${text(a)}÷${text(b)}+${text(a)}÷${text(c)}` }];
      return { correct: "correct", accepted: ["correct"], options, optionMisconceptions: optionMisconceptions(["wrong-1", "wrong-2", "wrong-3"], "ORDER_OF_OPERATIONS_ERROR"), steps: ["Đối chiếu từng phép biến đổi với tính chất phép tính.", "Chỉ biểu thức có id correct giữ nguyên giá trị với mọi số phù hợp."], nextStep: "Thay một bộ số nhỏ để loại nhanh biểu thức sai." };
    }
    case "FRACTION_APPLICATION": {
      const firstPart = multiply(reduce(v[0]!, 1), r[0]!);
      const result = m.operation === "FRACTION_OF_QUANTITY" ? firstPart : m.operation === "FRACTION_REMAINING" ? multiply(reduce(v[0]!, 1), subtract({ numerator: 1, denominator: 1 }, r[0]!)) : subtract(add(r[0]!, r[1]!), reduce(1, 10));
      const correct = m.interactionType === "INTEGER_INPUT" && result.denominator === 1 ? result.numerator : result;
      return baseSolution(correct, [`Viết đại lượng cần tìm bằng phép tính với ${fractionText(r[0]!)}.`, `Thực hiện từng bước và rút gọn được ${fractionText(result)}.`], "Đối chiếu kết quả với toàn thể để kiểm tra độ lớn hợp lí.");
    }
    case "RATIONAL_OPERATIONS": {
      const result = m.operation === "ADD" ? add(r[0]!, r[1]!) : m.operation === "SUBTRACT" ? subtract(r[0]!, r[1]!) : m.operation === "MULTIPLY" ? multiply(r[0]!, r[1]!) : divide(r[0]!, r[1]!);
      const operationName = m.operation === "ADD" ? "cộng" : m.operation === "SUBTRACT" ? "trừ" : m.operation === "MULTIPLY" ? "nhân" : "chia";
      return baseSolution(result, [`Thực hiện phép ${operationName} phân số theo đúng quy tắc.`, `Rút gọn được ${fractionText(result)}.`], "Dùng phép tính ngược để kiểm tra phân số kết quả.");
    }
    case "DATA_SEQUENCE_RECOGNITION": {
      const rows = v.map((value, index) => ({ value, id: m.labels[index]! })).sort((a, b) => a.value - b.value); const ids = (m.operation === "DESC" ? rows.reverse() : rows).map((row) => row.id);
      return { ...baseSolution(ids, ["Giữ nguyên từng quan sát của dãy số liệu.", `Sắp xếp theo chiều ${m.operation === "DESC" ? "giảm" : "tăng"}.`], "Kiểm tra không bỏ hoặc lặp quan sát."), options: v.map((value, index) => ({ id: m.labels[index]!, label: String(value) })) };
    }
    case "DATA_INVESTIGATION": {
      const result = m.operation === "TOTAL" ? v.reduce((sum, value) => sum + value, 0) : m.operation === "RANGE" ? Math.max(...v) - Math.min(...v) : v[0]! + v[1]! - v[2]! - v[3]!;
      const method = m.operation === "TOTAL" ? "cộng các giá trị" : m.operation === "RANGE" ? "lấy giá trị lớn nhất trừ giá trị bé nhất" : "so sánh tổng của hai cặp nhóm";
      return baseSolution(result, ["Đọc đúng từng nhãn và giá trị trong bảng.", `Thực hiện ${method} được ${result}.`], "Nêu ý nghĩa của kết quả trong bối cảnh khảo sát.");
    }
    case "DECIMAL_REPRESENTATION": {
      if (m.operation === "DIGIT_AT_PLACE") {
        const place = v[1]!; const digit = Math.floor(v[0]! / (m.scale / 10 ** place)) % 10;
        return baseSolution(digit, [`Viết ${scaledText(v[0]!, m.scale)} theo đúng các hàng.`, `Chữ số ở hàng được hỏi là ${digit}.`], "Đọc lại tên hàng bên trái và bên phải dấu phẩy.");
      }
      const result = Number((v[0]! / m.scale).toFixed(Math.log10(m.scale)));
      return baseSolution(result, [`Ghép phần nguyên và phần thập phân theo bảng hàng.`, `Số cần viết là ${scaledText(v[0]!, m.scale)}.`], "Thêm số 0 giữ chỗ nếu một hàng không có đơn vị.");
    }
    case "MIXED_DECIMAL_FRACTION_REPRESENTATION": return baseSolution(r[0]!, [`Đổi phần nguyên ${v[0]} thành ${v[0]! * v[2]!}/${v[2]}.`, `Cộng tử phần lẻ ${v[1]} rồi rút gọn được ${fractionText(r[0]!)}.`], "Đổi ngược về hỗn số để kiểm tra.");
    case "PERCENTAGE_REASONING": {
      const result = m.operation === "PERCENT_OF_WHOLE" ? v[2]! : m.operation === "RATE_FROM_PART" ? v[2]! * 100 / v[0]! : v[2]! * 100 / v[1]!;
      return baseSolution(result, [`Xác định đúng số toàn thể ${v[0]} và tỉ lệ ${v[1]}%.`, `Tính theo quan hệ phần = toàn thể × tỉ lệ/100 được ${result}.`], "Kiểm tra kết quả phần không vượt toàn thể khi tỉ lệ dưới 100%.");
    }
    case "DECIMAL_APPLICATION": {
      const resultScaled = m.operation === "ADD" ? v[0]! + v[1]! : m.operation === "SUBTRACT" ? v[0]! - v[1]! : v[0]! + v[1]! - v[2]!;
      const result = Number((resultScaled / m.scale).toFixed(Math.log10(m.scale)));
      const method = m.operation === "ADD" ? "phép cộng" : m.operation === "SUBTRACT" ? "phép trừ" : "phép cộng rồi phép trừ";
      return baseSolution(result, ["Biểu diễn mọi số bằng cùng số chữ số thập phân.", `Thực hiện ${method} theo từng bước được ${scaledText(resultScaled, m.scale)}.`], "Ước lượng phần nguyên để kiểm tra độ lớn kết quả.");
    }
    case "DECIMAL_ROUNDING": {
      const unit = m.scale / v[1]!; const roundedScaled = Math.round(v[0]! / unit) * unit; const result = Number((roundedScaled / m.scale).toFixed(Math.log10(v[1]!)));
      return baseSolution(result, [`Xác định hàng làm tròn theo thang ${v[1]}.`, `Nhìn chữ số ngay bên phải và được ${result}.`], "Đặt số trên trục số giữa hai mốc làm tròn.");
    }
    case "SCALE_REASONING": {
      const result = m.operation === "MAP_FROM_REAL" ? v[0]! : v[2]!;
      return baseSolution(result, [`Tỉ lệ 1:${v[1]} nghĩa là 1 cm trên bản đồ ứng với ${v[1]} cm thật.`, `Đổi đơn vị rồi tính được ${result} ${m.operation === "MAP_FROM_REAL" ? "cm" : "m"}.`], "Viết đầy đủ đơn vị ở cả hai vế để kiểm tra.");
    }
    case "DECIMAL_OPERATIONS": {
      let scaled: number; let outputScale = m.scale;
      if (m.operation === "ADD") scaled = v[0]! + v[1]!;
      else if (m.operation === "SUBTRACT") scaled = v[0]! - v[1]!;
      else if (m.operation === "MULTIPLY") { scaled = v[0]! * v[1]!; outputScale = m.scale * m.scale; }
      else { scaled = v[0]! / v[1]!; outputScale = 1; }
      const result = Number((scaled / outputScale).toFixed(Math.min(4, Math.log10(outputScale || 1))));
      return baseSolution(result, ["Chuyển số thập phân thành số nguyên đã nhân theo thang 100.", `Thực hiện phép ${m.operation} rồi đặt lại dấu phẩy được ${result}.`], "Dùng ước lượng để kiểm tra vị trí dấu phẩy.");
    }
    case "DECIMAL_SCALE_OPERATION": {
      const result = m.operation === "MULTIPLY" ? v[0]! / m.scale * v[1]! : v[0]! / m.scale / v[1]!;
      return baseSolution(result, [`Xác định ${m.operation === "MULTIPLY" ? "nhân" : "chia"} với ${v[1]}.`, `Dịch dấu phẩy ${Math.log10(v[1]!)} hàng theo đúng chiều được ${result}.`], "Nhân hoặc chia ngược để kiểm tra.");
    }
    case "DECIMAL_COMPARE_ORDER": {
      const rows = v.map((value, index) => ({ value, id: m.labels[index]! })).sort((a, b) => a.value - b.value); const ids = (m.operation === "DESC" ? rows.reverse() : rows).map((row) => row.id);
      return { ...baseSolution(ids, ["Viết các số với cùng số chữ số thập phân.", `Sắp theo chiều ${m.operation === "DESC" ? "giảm" : "tăng"}.`], "Kiểm tra chiều sắp xếp."), options: v.map((value, index) => ({ id: m.labels[index]!, label: scaledText(value, m.scale) })) };
    }
    case "SIGNED_FRACTION_REPRESENTATION": return baseSolution(r[1]!, [`Chuyển dấu âm ra trước phân số.`, `Rút gọn được ${fractionText(r[1]!)}.`], "Kiểm tra mẫu số cuối cùng là số dương.");
    case "RATIO_PROPORTION": return baseSolution(v[3]!, [`Hệ số từ ${v[0]} đến ${v[2]} là ${v[2]! / v[0]!}.`, `Nhân ${v[1]} với cùng hệ số được ${v[3]}.`], "Kiểm tra bằng tích chéo.");
    case "PROPORTIONAL_REASONING": {
      const result = m.operation === "RIGHT_PART" ? v[4]! : v[3]!;
      return baseSolution(result, [`Tổng số phần tỉ lệ là ${v[0]! + v[1]!}.`, `Mỗi phần bằng ${v[2]! / (v[0]! + v[1]!)}; phần cần tìm bằng ${result}.`], "Cộng hai phần để kiểm tra tổng ban đầu.");
    }
    case "ALGEBRAIC_IDENTITY": {
      if (m.operation === "MATCH_IDENTITIES") {
        const leftItems = [{ id: "square-sum", label: "(a+b)²" }, { id: "square-difference", label: "(a−b)²" }, { id: "difference-squares", label: "a²−b²" }];
        const rightItems = [{ id: "r1", label: "a²+2ab+b²" }, { id: "r2", label: "a²−2ab+b²" }, { id: "r3", label: "(a−b)(a+b)" }, { id: "r4", label: "a²+b²" }];
        const correct = [{ leftId: "square-sum", rightId: "r1" }, { leftId: "square-difference", rightId: "r2" }, { leftId: "difference-squares", rightId: "r3" }];
        return { ...baseSolution(correct, ["Khai triển từng bình phương theo tích.", "Đối chiếu dấu của số hạng giữa."], "Tự nhân hai nhị thức để kiểm tra."), leftItems, rightItems };
      }
      const options = [{ id: "correct", label: "(x+3)² = x²+6x+9 với mọi x" }, { id: "wrong-1", label: "(x+3)² = x²+9 với mọi x" }, { id: "wrong-2", label: "x²−9 = (x−3)² với mọi x" }, { id: "wrong-3", label: "x²+x = 2x² với mọi x" }];
      return { correct: "correct", accepted: ["correct"], options, optionMisconceptions: optionMisconceptions(["wrong-1", "wrong-2", "wrong-3"], "LIKE_TERM_ERROR"), steps: ["Một đồng nhất thức phải đúng với mọi giá trị biến.", "Khai triển lựa chọn đúng để kiểm tra."], nextStep: "Thử thêm x=1 và x=−1 để loại các lựa chọn sai." };
    }
    case "POLYNOMIAL_SIMPLIFICATION": {
      const [a, b, c, d] = v; const linear = m.operation === "LINEAR"; const xCoefficient = a! + c!; const constant = b! + d!; const result = linear ? `${xCoefficient}x${constant >= 0 ? "+" : ""}${constant}` : `${xCoefficient}x^2${constant >= 0 ? "+" : ""}${constant}`;
      return baseSolution(result, [`Nhóm các hạng tử ${linear ? "bậc nhất" : "bậc hai"} với nhau.`, `Cộng hệ số ${a} và ${c}; cộng hằng số ${b} và ${d}.`, `Dạng thu gọn là ${result}.`], "Thay x=1 vào hai biểu thức để kiểm tra.");
    }
    case "FUNCTION_GRAPH_RECOGNITION": {
      const options = [{ id: "graph-function", label: `Đường thẳng y=${v[0]}x${v[1]! >= 0 ? "+" : ""}${v[1]}` }, { id: "graph-circle", label: "Đường tròn tâm O" }, { id: "graph-sideways", label: "Parabol nằm ngang" }, { id: "graph-vertical", label: "Đường thẳng x=2" }];
      return { correct: "graph-function", accepted: ["graph-function"], options, optionMisconceptions: optionMisconceptions(["graph-circle", "graph-sideways", "graph-vertical"], "GRAPH_INTERPRETATION_ERROR"), steps: ["Kẻ tưởng tượng một đường thẳng đứng qua mỗi hoành độ.", "Đồ thị hàm số chỉ cho tối đa một tung độ với mỗi hoành độ."], nextStep: "Thử quy tắc với x=0 và x=1." };
    }
    case "FUNCTION_EVALUATION": {
      const result = m.operation === "QUADRATIC_FUNCTION" ? v[0]! * v[2]! * v[2]! + v[1]! : v[0]! * v[2]! + v[1]!;
      const correct = m.interactionType === "FRACTION_INPUT" ? reduce(result, 1) : result;
      return baseSolution(correct, [`Thay x=${v[2]} vào công thức.`, `Thực hiện lũy thừa/nhân trước rồi cộng ${v[1]}, được ${result}.`], "Thay lại vào công thức và kiểm tra dấu ngoặc.");
    }
    case "POLYNOMIAL_FACTORIZATION": {
      const [a, b] = v; const result = m.operation === "COMMON_FACTOR" ? `${a}(x+${b})` : m.operation === "DIFFERENCE_SQUARES" ? `(x-${b})(x+${b})` : `(x+${b})^2`;
      if (m.interactionType === "SINGLE_CHOICE") {
        const options = [{ id: "correct", label: result }, { id: "wrong-1", label: `(x-${b})^2` }, { id: "wrong-2", label: `x(x+${b})` }, { id: "wrong-3", label: `(x-${b})(x-${b})` }];
        return { correct: "correct", accepted: ["correct"], options, optionMisconceptions: optionMisconceptions(["wrong-1", "wrong-2", "wrong-3"], "LIKE_TERM_ERROR"), steps: ["Nhận dạng nhân tử chung hoặc hằng đẳng thức.", `Kết quả là ${result}.`], nextStep: "Nhân khai triển trở lại để kiểm tra." };
      }
      return baseSolution(result, ["Nhận dạng nhân tử chung hoặc hằng đẳng thức phù hợp.", `Viết dạng tích ${result}.`], "Nhân khai triển trở lại để kiểm tra.");
    }
    case "QUADRATIC_MODELING": return baseSolution(v[1]!, [`Mô hình có hai nghiệm ${v[1]} và ${v[2]}.`, `Điều kiện bối cảnh loại nghiệm ${v[2]} và giữ ${v[1]}.`], "Thay nghiệm vào mô hình và kiểm tra đơn vị thực tế.");
    case "QUADRATIC_GRAPH_SYMMETRY": {
      if (m.interactionType === "SINGLE_CHOICE") return { ...numericOptions(v[3]!, [1, -1, v[0]!], "GRAPH_INTERPRETATION_ERROR"), steps: [`Dùng x=−b/(2a) với a=${v[0]}, b=${v[1]}.`, `Trục đối xứng là x=${v[3]}.`], nextStep: "Kiểm tra hai điểm cách đều trục có cùng tung độ." };
      return baseSolution(v[3]!, [`Dùng x=−b/(2a) với a=${v[0]}, b=${v[1]}.`, `Trục đối xứng là x=${v[3]}.`], "Kiểm tra hai điểm cách đều trục có cùng tung độ.");
    }
    case "RADICAL_TRANSFORMATION": {
      const result = m.operation === "RATIONALIZE_SIMPLE" ? `sqrt(${v[1]})/${v[1]}` : `${v[0]}sqrt(${v[1]})`;
      if (m.interactionType === "SINGLE_CHOICE") {
        const options = [{ id: "correct", label: result }, { id: "wrong-1", label: `sqrt(${v[2]})` }, { id: "wrong-2", label: `${v[0]! * v[1]!}` }, { id: "wrong-3", label: `${v[1]}sqrt(${v[0]})` }];
        return { correct: "correct", accepted: ["correct"], options, optionMisconceptions: optionMisconceptions(["wrong-1", "wrong-2", "wrong-3"], "RADICAL_DOMAIN_ERROR"), steps: [`Tách ${v[2]}=${v[0]}²×${v[1]}.`, `Đưa căn của bình phương ra ngoài được ${result}.`], nextStep: "Bình phương hai biểu thức dương để kiểm tra." };
      }
      return baseSolution(result, [`Tách ${v[2]}=${v[0]}²×${v[1]}.`, `Đưa căn của bình phương ra ngoài được ${result}.`], "Bình phương hai biểu thức dương để kiểm tra.");
    }
    case "LINEAR_SYSTEM":
    case "LINEAR_SYSTEM_MODELING": {
      const determinant = v[0]! * v[4]! - v[1]! * v[3]!;
      if (determinant === 0) throw new GenerationV2Error("SOLVER_FAILED");
      const x = (v[2]! * v[4]! - v[1]! * v[5]!) / determinant;
      const y = (v[0]! * v[5]! - v[2]! * v[3]!) / determinant;
      if (!Number.isInteger(x) || !Number.isInteger(y)) throw new GenerationV2Error("SOLVER_FAILED");
      const correct = [{ leftId: "x", rightId: String(x) }, { leftId: "y", rightId: String(y) }]; const values = [...new Set([x, y, x + 1, y - 1, x - 2, y + 2])].slice(0, 5);
      return { ...baseSolution(correct, ["Khử một ẩn hoặc thế từ một phương trình.", `Tìm được x=${x}, y=${y}.`, "Thay cặp số vào cả hai phương trình."], "Kiểm tra đồng thời hai phương trình, không chỉ một."), leftItems: [{ id: "x", label: "x" }, { id: "y", label: "y" }], rightItems: values.map((value) => ({ id: String(value), label: String(value) })) };
    }
    case "LINEAR_SYSTEM_SOLUTION_CHECK": {
      const determinant = v[0]! * v[4]! - v[1]! * v[3]!;
      if (determinant === 0) throw new GenerationV2Error("SOLVER_FAILED");
      const x = (v[2]! * v[4]! - v[1]! * v[5]!) / determinant;
      const y = (v[0]! * v[5]! - v[2]! * v[3]!) / determinant;
      if (!Number.isInteger(x) || !Number.isInteger(y)) throw new GenerationV2Error("SOLVER_FAILED");
      const correct = `pair-${x}-${y}`; const options = [{ id: correct, label: `(${x}; ${y})` }, { id: "swap", label: `(${y}; ${x})` }, { id: "x-shift", label: `(${x + 1}; ${y})` }, { id: "y-shift", label: `(${x}; ${y - 1})` }];
      return { correct, accepted: [correct], options, optionMisconceptions: optionMisconceptions(["swap", "x-shift", "y-shift"], "ALGEBRAIC_SIGN_ERROR"), steps: ["Thay từng cặp vào phương trình thứ nhất.", "Chỉ giữ cặp cũng thỏa phương trình thứ hai."], nextStep: "Đánh dấu rõ thứ tự (x;y)." };
    }
    case "QUADRATIC_EQUATION_SOLVING": {
      const discriminant = v[1]! * v[1]! - 4 * v[0]! * v[2]!;
      const squareRoot = Math.sqrt(discriminant);
      if (!Number.isInteger(squareRoot)) throw new GenerationV2Error("SOLVER_FAILED");
      const roots = [(-v[1]! - squareRoot) / (2 * v[0]!), (-v[1]! + squareRoot) / (2 * v[0]!)].sort((a, b) => a - b);
      if (roots.some((root) => !Number.isInteger(root))) throw new GenerationV2Error("SOLVER_FAILED");
      if (roots[0] === roots[1] && m.interactionType === "INTEGER_INPUT") return baseSolution(roots[0]!, [`Phương trình có biệt thức bằng 0.`, `Nghiệm kép x=${roots[0]}.`], "Thay nghiệm vào phương trình ban đầu.");
      const ids = roots.map((root) => `root-${root}`);
      return { ...baseSolution(ids, ["Phân tích tam thức thành tích hai nhân tử.", `Hai nghiệm là ${roots.join(" và ")}.`], "Thay cả hai nghiệm vào phương trình."), options: roots.map((root) => ({ id: `root-${root}`, label: String(root) })) };
    }
    case "RATIONAL_EQUATION_SOLVING": {
      const correct = m.interactionType === "FRACTION_INPUT" ? reduce(v[1]!, 1) : v[1]!;
      return baseSolution(correct, [`Điều kiện xác định: x≠${v[0]}.`, "Nhân hai vế với mẫu chung rồi giải phương trình bậc nhất.", `Nghiệm x=${v[1]} thỏa điều kiện.`], "Luôn đối chiếu nghiệm với giá trị làm mẫu bằng 0.");
    }
    case "PRODUCT_EQUATION_SOLVING": {
      const roots = [v[4]!, v[5]!].sort((a, b) => a - b); const ids = roots.map((root) => `root-${root}`);
      return { ...baseSolution(ids, ["Tích bằng 0 khi ít nhất một nhân tử bằng 0.", `Giải hai phương trình bậc nhất được ${roots.join(" và ")}.`], "Kiểm tra không bỏ một nhân tử."), options: roots.map((root) => ({ id: `root-${root}`, label: String(root) })) };
    }
    case "INEQUALITY_PROPERTY": {
      const correctLabel = m.operation === "MULTIPLY_NEGATIVE" ? `${v[0]! * v[2]!} > ${v[1]! * v[2]!}` : `${v[0]! * v[2]!} < ${v[1]! * v[2]!}`;
      const options = [{ id: "correct", label: correctLabel }, { id: "wrong-1", label: m.operation === "MULTIPLY_NEGATIVE" ? `${v[0]! * v[2]!} < ${v[1]! * v[2]!}` : `${v[0]! * v[2]!} > ${v[1]! * v[2]!}` }, { id: "wrong-2", label: `${v[0]! + v[2]!} > ${v[1]! + v[2]!}` }, { id: "wrong-3", label: `${v[0]} = ${v[1]}` }];
      return { correct: "correct", accepted: ["correct"], options, optionMisconceptions: optionMisconceptions(["wrong-1", "wrong-2", "wrong-3"], "INEQUALITY_DIRECTION_ERROR"), steps: ["Cộng cùng một số giữ nguyên chiều.", "Nhân hoặc chia số âm phải đổi chiều bất đẳng thức."], nextStep: "Thử với hai số cụ thể trên trục số." };
    }
    case "QUADRATIC_EQUATION_RECOGNITION": {
      const options = [{ id: "correct", label: `${v[0]}x² ${signedTerm(v[1]!, "x")} ${v[2]! >= 0 ? "+" : "−"} ${Math.abs(v[2]!)} = 0` }, { id: "wrong-1", label: `${v[1]}x+${v[2]}=0` }, { id: "wrong-2", label: `0x²+${v[1]}x+${v[2]}=0` }, { id: "wrong-3", label: `${v[0]}x³+${v[2]}=0` }];
      return { correct: "correct", accepted: ["correct"], options, optionMisconceptions: optionMisconceptions(["wrong-1", "wrong-2", "wrong-3"], "LIKE_TERM_ERROR"), steps: ["Đưa về ax²+bx+c=0.", "Bậc hai yêu cầu a≠0."], nextStep: "Xác định bậc cao nhất có hệ số khác 0." };
    }
    case "LINEAR_SYSTEM_RECOGNITION": {
      const options = [{ id: "correct", label: `{ ${v[0]}x ${signedTerm(v[1]!, "y")} = ${v[2]}; x−y=1 }` }, { id: "wrong-1", label: `{ x²+y=2; x−y=1 }` }, { id: "wrong-2", label: `${v[0]}x+${v[1]}y=${v[2]}` }, { id: "wrong-3", label: `{ xy=2; x+y=3 }` }];
      return { correct: "correct", accepted: ["correct"], options, optionMisconceptions: optionMisconceptions(["wrong-1", "wrong-2", "wrong-3"], "LIKE_TERM_ERROR"), steps: ["Mỗi phương trình phải bậc nhất theo x và y.", "Một hệ cần hai phương trình được xét đồng thời."], nextStep: "Kiểm tra không có x², y² hoặc xy." };
    }
    case "LINEAR_INEQUALITY_SOLVING": {
      const relation = String(m.meta.relation);
      const boundary = (v[2]! - v[1]!) / v[0]!;
      if (!Number.isInteger(boundary)) throw new GenerationV2Error("SOLVER_FAILED");
      const finalRelation = v[0]! < 0 ? ({ "<": ">", "<=": ">=", ">": "<", ">=": "<=" } as Record<string, string>)[relation]! : relation; const result = `x${finalRelation}${boundary}`;
      if (m.interactionType === "SINGLE_CHOICE") {
        const inverse = ({ "<": ">", "<=": ">=", ">": "<", ">=": "<=" } as Record<string, string>)[finalRelation]!; const wrongBoundary = boundary === 0 ? 1 : -boundary; const options = [{ id: "correct", label: result }, { id: "wrong-1", label: `x${inverse}${boundary}` }, { id: "wrong-2", label: `x${finalRelation}${wrongBoundary}` }, { id: "wrong-3", label: `x=${boundary}` }];
        return { correct: "correct", accepted: ["correct"], options, optionMisconceptions: optionMisconceptions(["wrong-1", "wrong-2", "wrong-3"], "INEQUALITY_DIRECTION_ERROR"), steps: ["Chuyển hằng số và chia hai vế cho hệ số của x.", `Kết quả ${result}.`], nextStep: "Thử một giá trị nằm trong và một giá trị nằm ngoài miền nghiệm." };
      }
      return baseSolution(result, ["Chuyển hằng số và chia hai vế cho hệ số của x.", v[0]! < 0 ? "Do chia cho số âm, đổi chiều bất phương trình." : "Do chia cho số dương, giữ nguyên chiều.", `Kết quả ${result}.`], "Thử một giá trị nằm trong và một giá trị nằm ngoài miền nghiệm.");
    }
    case "LINEAR_INEQUALITY_RECOGNITION": {
      const options = [{ id: "correct", label: `${v[0]}x−${v[1]}<0` }, { id: "wrong-1", label: `${v[0]}x−${v[1]}=0` }, { id: "wrong-2", label: `${v[0]}x²−${v[1]}>0` }, { id: "wrong-3", label: `${v[0]}/x<${v[1]}` }];
      return { correct: "correct", accepted: ["correct"], options, optionMisconceptions: optionMisconceptions(["wrong-1", "wrong-2", "wrong-3"], "INEQUALITY_DIRECTION_ERROR"), steps: ["Bất phương trình phải có dấu <, >, ≤ hoặc ≥.", "Bậc nhất một ẩn có hệ số x khác 0 và không có x² hay x ở mẫu."], nextStep: "Đưa từng lựa chọn về dạng ax+b⋚0." };
    }
  }
}

function promptFor(m: WaveCNormalizedProblemModel) {
  const context = CONTEXTS[m.contextIndex]!; const lead = `${LEADS[m.templateIndex]!} trong ${context}`; const v = m.values; const r = m.rationals;
  switch (m.variantId) {
    case "MIXED_ARITHMETIC_EXPRESSION": {
      const expression = m.operation === "ADD_THEN_MULTIPLY_PAREN" ? `(${v[0]}+${v[1]})×${v[2]}` : m.operation === "SUBTRACT_THEN_DIVIDE_PAREN" ? `(${v[0]}−${v[1]})÷${v[2]}` : m.operation === "MULTIPLY_THEN_ADD_PAREN" ? `${v[0]}×(${v[1]}+${v[2]})` : m.operation === "MULTIPLY_THEN_ADD" ? `${v[0]}+${v[1]}×${v[2]}` : m.operation === "DIVIDE_THEN_SUBTRACT" ? `${v[0]}÷${v[1]}−${v[2]}` : `${v[0]}×${v[1]}−${v[2]}`;
      return `${lead}: Tính giá trị biểu thức ${expression}.`;
    }
    case "ALGEBRAIC_SUBSTITUTION": { const count = m.labels.length; const coefficients = v.slice(0, count); const assignments = v.slice(count, count * 2); const constant = v[count * 2] ?? 0; return `${lead}: Cho ${m.labels.map((label, index) => `${label}=${assignments[index]}`).join(", ")}. Tính ${m.labels.map((label, index) => `${coefficients[index]}${label}`).join(" + ")} ${constant >= 0 ? "+" : "−"} ${Math.abs(constant)}.`; }
    case "RATIONAL_COMPARE_ORDER": return m.operation === "MAX" || m.operation === "MIN" ? `${lead}: Chọn phân số ${m.operation === "MAX" ? "lớn nhất" : "bé nhất"} trong ${r.map(fractionText).join(", ")}.` : `${lead}: Sắp xếp ${r.map(fractionText).join(", ")} theo thứ tự ${m.operation === "DESC" ? "giảm dần" : "tăng dần"}.`;
    case "FRACTION_COMMON_DENOMINATOR": return `${lead}: Viết phân số bằng ${v[0]}/${v[1]} có mẫu số ${v[2]}. Nhập tử số còn thiếu.`;
    case "FRACTION_EQUIVALENCE": return `${lead}: Rút gọn phân số ${fractionText(r[0]!)} về dạng tối giản.`;
    case "NUMERIC_OPERATION_PROPERTIES": return `${lead}: Chọn phép biến đổi giữ nguyên giá trị của biểu thức theo đúng tính chất phép tính.`;
    case "FRACTION_APPLICATION": return m.operation === "FRACTION_OF_QUANTITY" ? `${lead}: ${context} có ${v[0]} phần bằng nhau về đơn vị đo; sử dụng ${fractionText(r[0]!)} số đó. Tìm lượng đã sử dụng.` : `${lead}: Trong ${context}, một nhiệm vụ dùng ${fractionText(r[0]!)} toàn bộ. Tìm phần còn lại hoặc kết quả sau các bước đã nêu.`;
    case "RATIONAL_OPERATIONS": return `${lead}: Tính ${fractionText(r[0]!)} ${m.operation === "ADD" ? "+" : m.operation === "SUBTRACT" ? "−" : m.operation === "MULTIPLY" ? "×" : "÷"} ${fractionText(r[1]!)} và rút gọn.`;
    case "DATA_SEQUENCE_RECOGNITION": return `${lead}: Dãy số liệu tại ${context} là ${v.join(", ")}. Sắp xếp theo thứ tự ${m.operation === "DESC" ? "giảm dần" : "tăng dần"}.`;
    case "DATA_INVESTIGATION": return `${lead}: Bảng khảo sát tại ${context} có các giá trị ${m.labels.map((label, index) => `${label}: ${v[index]}`).join("; ")}. ${m.operation === "TOTAL" ? "Tính tổng." : m.operation === "RANGE" ? "Tính khoảng biến thiên (lớn nhất trừ bé nhất)." : "Tính chênh lệch tổng hai nhóm đầu và hai nhóm cuối."}`;
    case "DECIMAL_REPRESENTATION": return m.operation === "DIGIT_AT_PLACE" ? `${lead}: Với số ${scaledText(v[0]!, m.scale)}, xác định chữ số ở vị trí thập phân thứ ${v[1]}.` : `${lead}: Viết số thập phân được biểu diễn bởi ${v[0]} phần ${m.scale}.`;
    case "MIXED_DECIMAL_FRACTION_REPRESENTATION": return `${lead}: Viết hỗn số ${v[0]} ${v[1]}/${v[2]} dưới dạng một phân số tối giản.`;
    case "PERCENTAGE_REASONING": return m.operation === "PERCENT_OF_WHOLE" ? `${lead}: Tìm ${v[1]}% của ${v[0]} tại ${context}.` : m.operation === "RATE_FROM_PART" ? `${lead}: ${v[2]} chiếm bao nhiêu phần trăm của ${v[0]}?` : `${lead}: ${v[1]}% của một số bằng ${v[2]}. Tìm số đó.`;
    case "DECIMAL_APPLICATION": {
      const quantities = v.map((value) => scaledText(value, m.scale));
      if (m.operation === "ADD") return `${lead}: Tại ${context}, có ${quantities[0]} đơn vị và bổ sung thêm ${quantities[1]} đơn vị. Hỏi có tất cả bao nhiêu đơn vị?`;
      if (m.operation === "SUBTRACT") return `${lead}: Tại ${context}, ban đầu có ${quantities[0]} đơn vị và đã dùng ${quantities[1]} đơn vị. Hỏi còn lại bao nhiêu đơn vị?`;
      return `${lead}: Tại ${context}, ban đầu có ${quantities[0]} đơn vị, bổ sung ${quantities[1]} đơn vị rồi dùng ${quantities[2]} đơn vị. Hỏi còn lại bao nhiêu đơn vị?`;
    }
    case "DECIMAL_ROUNDING": return `${lead}: Làm tròn ${scaledText(v[0]!, m.scale)} tới ${v[1] === 1 ? "số tự nhiên gần nhất" : v[1] === 10 ? "một chữ số thập phân" : "hai chữ số thập phân"}.`;
    case "SCALE_REASONING": return m.operation === "MAP_FROM_REAL" ? `${lead}: Bản đồ tỉ lệ 1:${v[1]}, khoảng cách thật ${v[2]} m. Tìm khoảng cách trên bản đồ (cm).` : `${lead}: Bản đồ tỉ lệ 1:${v[1]}, đo được ${v[0]} cm. Tìm khoảng cách thật (m).`;
    case "DECIMAL_OPERATIONS": return `${lead}: Tính ${scaledText(v[0]!, m.scale)} ${m.operation === "ADD" ? "+" : m.operation === "SUBTRACT" ? "−" : m.operation === "MULTIPLY" ? "×" : "÷"} ${scaledText(v[1]!, m.scale)}.`;
    case "DECIMAL_SCALE_OPERATION": return `${lead}: Tính ${scaledText(v[0]!, m.scale)} ${m.operation === "MULTIPLY" ? "×" : "÷"} ${v[1]}.`;
    case "DECIMAL_COMPARE_ORDER": return `${lead}: Sắp xếp ${v.map((value) => scaledText(value, m.scale)).join(", ")} theo thứ tự ${m.operation === "DESC" ? "giảm dần" : "tăng dần"}.`;
    case "SIGNED_FRACTION_REPRESENTATION": return `${lead}: Viết ${r[0]!.numerator}/${r[0]!.denominator} với mẫu dương và rút gọn.`;
    case "RATIO_PROPORTION": return `${lead}: Hoàn thành dãy tỉ số bằng nhau ${v[0]}:${v[1]} = ${v[2]}:□.`;
    case "PROPORTIONAL_REASONING": return `${lead}: Chia ${v[2]} theo tỉ lệ ${v[0]}:${v[1]}. Tìm ${m.operation === "RIGHT_PART" ? "phần thứ hai" : "phần thứ nhất"}.`;
    case "ALGEBRAIC_IDENTITY": return m.operation === "MATCH_IDENTITIES" ? `${lead}: Ghép mỗi hằng đẳng thức với khai triển đúng.` : `${lead}: Chọn đồng nhất thức đúng với mọi giá trị x.`;
    case "POLYNOMIAL_SIMPLIFICATION": return `${lead}: Thu gọn ${v[0]}${m.operation === "LINEAR" ? "x" : "x²"} ${v[1]! >= 0 ? "+" : "−"} ${Math.abs(v[1]!)} ${signedTerm(v[2]!, m.operation === "LINEAR" ? "x" : "x²")} ${v[3]! >= 0 ? "+" : "−"} ${Math.abs(v[3]!)}. Nhập dạng ax+b hoặc ax^2+b.`;
    case "FUNCTION_GRAPH_RECOGNITION": return `${lead}: Chọn hình biểu diễn đồ thị của một hàm số theo quy tắc đường thẳng đứng.`;
    case "FUNCTION_EVALUATION": return `${lead}: Cho f(x)=${v[0]}${m.operation === "QUADRATIC_FUNCTION" ? "x²" : "x"} ${v[1]! >= 0 ? "+" : "−"} ${Math.abs(v[1]!)}. Tính f(${v[2]}).`;
    case "POLYNOMIAL_FACTORIZATION": return `${lead}: Phân tích ${m.operation === "COMMON_FACTOR" ? `${v[0]}x+${v[0]! * v[1]!}` : m.operation === "DIFFERENCE_SQUARES" ? `x²−${v[1]! * v[1]!}` : `x²+${2 * v[1]!}x+${v[1]! * v[1]!}`} thành nhân tử. Dùng * cho phép nhân nếu cần.`;
    case "QUADRATIC_MODELING": return `${lead}: Mô hình tại ${context} có phương trình ${v[0]}(x−${v[1]})(x−(${v[2]}))=0 và x phải dương. Tìm giá trị x phù hợp bối cảnh.`;
    case "QUADRATIC_GRAPH_SYMMETRY": return `${lead}: Tìm hoành độ trục đối xứng của y=${v[0]}x² ${signedTerm(v[1]!, "x")} ${v[2]! >= 0 ? "+" : "−"} ${Math.abs(v[2]!)}.`;
    case "RADICAL_TRANSFORMATION": return `${lead}: Rút gọn sqrt(${v[2]}) về dạng a*sqrt(b) tối giản.`;
    case "LINEAR_SYSTEM":
    case "LINEAR_SYSTEM_MODELING":
    case "LINEAR_SYSTEM_SOLUTION_CHECK": return `${lead}: Xét hệ ${v[0]}x ${signedTerm(v[1]!, "y")} = ${v[2]}; ${v[3]}x ${signedTerm(v[4]!, "y")} = ${v[5]}. ${m.variantId === "LINEAR_SYSTEM_SOLUTION_CHECK" ? "Chọn cặp (x;y) thỏa cả hai phương trình." : "Tìm x và y."}`;
    case "QUADRATIC_EQUATION_SOLVING": return `${lead}: Giải phương trình x² ${signedTerm(v[1]!, "x")} ${v[2]! >= 0 ? "+" : "−"} ${Math.abs(v[2]!)}=0.${m.interactionType === "ORDERING" ? " Chọn các nghiệm theo thứ tự tăng dần." : ""}`;
    case "RATIONAL_EQUATION_SOLVING": return `${lead}: Giải phương trình (x−${v[1]})/(x−${v[0]})=0 và kiểm tra điều kiện xác định.`;
    case "PRODUCT_EQUATION_SOLVING": return `${lead}: Giải (${v[0]}x ${v[1]! >= 0 ? "+" : "−"} ${Math.abs(v[1]!)})(${v[2]}x ${v[3]! >= 0 ? "+" : "−"} ${Math.abs(v[3]!)})=0.`;
    case "INEQUALITY_PROPERTY": return `${lead}: Biết ${v[0]}<${v[1]}. Chọn kết luận đúng sau khi ${m.operation === "ADD_BOTH_SIDES" ? "cộng" : "nhân"} hai vế với ${v[2]}.`;
    case "QUADRATIC_EQUATION_RECOGNITION": return `${lead}: Chọn phương trình bậc hai một ẩn đúng định nghĩa.`;
    case "LINEAR_SYSTEM_RECOGNITION": return `${lead}: Chọn hệ hai phương trình bậc nhất hai ẩn.`;
    case "LINEAR_INEQUALITY_SOLVING": return `${lead}: Giải bất phương trình ${v[0]}x ${v[1]! >= 0 ? "+" : "−"} ${Math.abs(v[1]!)} ${String(m.meta.relation)} ${v[2]}. Nhập dạng x<k, x<=k, x>k hoặc x>=k.`;
    case "LINEAR_INEQUALITY_RECOGNITION": return `${lead}: Chọn bất phương trình bậc nhất một ẩn.`;
  }
}

function visualFor(m: WaveCNormalizedProblemModel): ProductVisual {
  const v = m.values; const r = m.rationals;
  if (["DATA_SEQUENCE_RECOGNITION", "DATA_INVESTIGATION", "ALGEBRAIC_SUBSTITUTION", "PERCENTAGE_REASONING", "DECIMAL_APPLICATION", "SCALE_REASONING", "RATIO_PROPORTION", "PROPORTIONAL_REASONING", "FUNCTION_EVALUATION", "LINEAR_SYSTEM_MODELING"].includes(m.variantId)) {
    let rows: readonly Readonly<Record<string, string | number>>[];
    if (m.variantId === "ALGEBRAIC_SUBSTITUTION") {
      const count = m.labels.length;
      rows = m.labels.map((label, index) => ({ name: label, value: v[count + index] ?? 0 }));
    } else if (m.variantId === "PERCENTAGE_REASONING") {
      rows = m.operation === "PERCENT_OF_WHOLE"
        ? [{ name: "Số toàn thể", value: v[0]! }, { name: "Tỉ lệ (%)", value: v[1]! }]
        : m.operation === "RATE_FROM_PART"
          ? [{ name: "Số toàn thể", value: v[0]! }, { name: "Số phần", value: v[2]! }]
          : [{ name: "Tỉ lệ (%)", value: v[1]! }, { name: "Số phần", value: v[2]! }];
    } else if (m.variantId === "SCALE_REASONING") {
      rows = m.operation === "MAP_FROM_REAL"
        ? [{ name: "Mẫu số tỉ lệ", value: v[1]! }, { name: "Khoảng cách thật (m)", value: v[2]! }]
        : [{ name: "Mẫu số tỉ lệ", value: v[1]! }, { name: "Khoảng cách bản đồ (cm)", value: v[0]! }];
    } else if (m.variantId === "RATIO_PROPORTION") {
      rows = [{ name: "Tỉ số thứ nhất", value: `${v[0]}:${v[1]}` }, { name: "Số đầu tỉ số thứ hai", value: v[2]! }];
    } else if (m.variantId === "PROPORTIONAL_REASONING") {
      rows = [{ name: "Tỉ lệ", value: `${v[0]}:${v[1]}` }, { name: "Tổng đại lượng", value: v[2]! }];
    } else if (m.variantId === "LINEAR_SYSTEM_MODELING") {
      rows = [{ name: "Phương trình 1", value: `${v[0]}x + ${v[1]}y = ${v[2]}` }, { name: "Phương trình 2", value: `${v[3]}x + ${v[4]}y = ${v[5]}` }];
    } else {
      rows = m.labels.length ? m.labels.map((label, index) => ({ name: label, value: v[index] ?? 0 })) : v.map((value, index) => ({ name: `Giá trị ${index + 1}`, value }));
    }
    return { type: "DATA_TABLE", description: "Bảng dữ liệu của bài toán.", data: { rows, operation: m.operation } };
  }
  if (["FRACTION_COMMON_DENOMINATOR", "FRACTION_EQUIVALENCE", "FRACTION_APPLICATION"].includes(m.variantId) && r[0]) {
    const visualFraction = m.variantId === "FRACTION_EQUIVALENCE" ? r[1]! : reduce(r[0].numerator, r[0].denominator);
    const totalParts = Math.abs(visualFraction.denominator);
    const selectedParts = Math.min(Math.abs(visualFraction.numerator), totalParts);
    return { type: "FRACTION_MODEL", description: `Mô hình phân số tương đương ${fractionText(visualFraction)}.`, data: { modelType: "SEGMENTED_BAR", totalParts, selectedParts, highlightedParts: Array.from({ length: selectedParts }, (_, index) => index) } };
  }
  if (["DECIMAL_REPRESENTATION", "MIXED_DECIMAL_FRACTION_REPRESENTATION", "DECIMAL_SCALE_OPERATION"].includes(m.variantId)) return { type: "PLACE_VALUE_CHART", description: "Bảng giá trị theo hàng dùng cùng số liệu với đề bài.", data: { columns: ["Chục", "Đơn vị", "Phần mười", "Phần trăm", "Phần nghìn"], values: [v[0] ?? 0], scale: m.scale } };
  if (["DECIMAL_ROUNDING", "DECIMAL_COMPARE_ORDER", "SIGNED_FRACTION_REPRESENTATION", "INEQUALITY_PROPERTY", "LINEAR_INEQUALITY_SOLVING", "LINEAR_INEQUALITY_RECOGNITION"].includes(m.variantId)) {
    const values = v.length ? v : r.map((value) => value.numerator / value.denominator); const minimum = Math.min(...values, -1); const maximum = Math.max(...values, 1);
    return { type: "NUMBER_LINE", description: "Trục số dùng cùng mốc và chiều với bài toán.", data: { values, minimum, maximum, marked: values[0] ?? 0, relation: m.meta.relation ?? null } };
  }
  if (m.variantId === "FUNCTION_GRAPH_RECOGNITION") return { type: "COORDINATE_GRAPH", description: "Bốn hình ứng viên để kiểm tra bằng đường thẳng đứng.", data: { graphKind: m.variantId, candidateGraphs: [{ id: "graph-function", label: `y=${v[0]}x${v[1]! >= 0 ? "+" : ""}${v[1]}`, kind: "LINE", slope: v[0], intercept: v[1] }, { id: "graph-circle", label: "Đường tròn", kind: "CIRCLE" }, { id: "graph-sideways", label: "Parabol nằm ngang", kind: "SIDEWAYS_PARABOLA" }, { id: "graph-vertical", label: "x=2", kind: "VERTICAL_LINE" }] } };
  if (["QUADRATIC_MODELING", "QUADRATIC_GRAPH_SYMMETRY", "LINEAR_SYSTEM_SOLUTION_CHECK"].includes(m.variantId)) {
    const coefficients = m.variantId === "QUADRATIC_MODELING" ? [v[0]!, -v[0]! * (v[1]! + v[2]!), v[0]! * v[1]! * v[2]!] : v.slice(0, 3);
    return { type: "COORDINATE_GRAPH", description: "Hệ trục tọa độ dùng cùng hệ số và dữ kiện với đề bài.", data: { graphKind: m.variantId, coefficients, roots: m.variantId === "QUADRATIC_MODELING" ? [v[1], v[2]] : null, system: m.variantId === "LINEAR_SYSTEM_SOLUTION_CHECK" ? v.slice(0, 6) : null, solution: m.variantId === "LINEAR_SYSTEM_SOLUTION_CHECK" ? [v[6], v[7]] : null, axis: m.variantId === "QUADRATIC_GRAPH_SYMMETRY" ? v[3] : null } };
  }
  return { type: "NONE", description: "Câu hỏi không cần hình làm bằng chứng toán học.", data: {} };
}

function interactionFor(m: WaveCNormalizedProblemModel, solution: WaveCSolution, random: Random): ProductInteractionContract {
  if (m.interactionType === "SINGLE_CHOICE" || m.interactionType === "CONSTRUCTION_OR_VISUAL_SELECTION") return { type: m.interactionType, options: random.shuffle(solution.options ?? []), choiceCount: 1 };
  if (m.interactionType === "ORDERING") return { type: "ORDERING", options: random.shuffle(solution.options ?? []), orderedItemIds: solution.options?.map((item) => item.id) };
  if (m.interactionType === "MATCHING") return { type: "MATCHING", leftItems: solution.leftItems, rightItems: random.shuffle(solution.rightItems ?? []) };
  if (m.interactionType === "FRACTION_INPUT") return { type: "FRACTION_INPUT", inputLabel: "Phân số tối giản", inputMode: "text" };
  if (m.interactionType === "DECIMAL_INPUT") return { type: "DECIMAL_INPUT", inputLabel: "Kết quả", inputMode: "decimal" };
  if (m.interactionType === "SHORT_STRUCTURED_RESPONSE") return { type: "SHORT_STRUCTURED_RESPONSE", inputLabel: "Biểu thức hoặc miền nghiệm", inputMode: "text" };
  if (m.interactionType === "TABLE_OR_CHART_RESPONSE") return { type: "TABLE_OR_CHART_RESPONSE", inputLabel: "Giá trị còn thiếu", inputMode: "numeric" };
  return { type: "INTEGER_INPUT", inputLabel: "Kết quả", inputMode: "numeric" };
}

function validateModel(contract: WaveCOutcomeContract, m: WaveCNormalizedProblemModel, solution: WaveCSolution, prompt: string, interaction: ProductInteractionContract, visual: ProductVisual) {
  if (m.outcomeId !== contract.outcomeId || m.grade !== contract.grade || m.variantId !== contract.canonicalVariantId || m.engineVersion !== WAVE_C_ENGINE_VERSION) throw new GenerationV2Error("VALIDATION_FAILED");
  if (prompt !== promptFor(m)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (m.rationals.some((value) => value.denominator === 0)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (m.values.some((value) => !Number.isFinite(value) || !Number.isInteger(value))) throw new GenerationV2Error("VALIDATION_FAILED");
  if (m.values.some((value) => Math.abs(value) > Math.max(100_000, contract.parameterBounds.maximum))) throw new GenerationV2Error("VALIDATION_FAILED");
  if (m.variantId === "RATIONAL_EQUATION_SOLVING" && m.values[0] === m.values[1]) throw new GenerationV2Error("VALIDATION_FAILED");
  const recomputed = solveModel(m);
  if (normalize(recomputed.correct) !== normalize(solution.correct)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (interaction.type !== m.interactionType) throw new GenerationV2Error("VALIDATION_FAILED");
  if (interaction.options) {
    const ids = interaction.options.map((option) => option.id); const labels = interaction.options.map((option) => option.label);
    if (new Set(ids).size !== ids.length || new Set(labels).size !== labels.length) throw new GenerationV2Error("VALIDATION_FAILED");
    if ((interaction.type === "SINGLE_CHOICE" || interaction.type === "CONSTRUCTION_OR_VISUAL_SELECTION") && !ids.includes(String(solution.correct))) throw new GenerationV2Error("VALIDATION_FAILED");
  }
  if (visual.type !== "NONE" && visual.description.length < 12) throw new GenerationV2Error("VALIDATION_FAILED");
  const serializedPublic = JSON.stringify({ prompt, interaction, visual });
  for (const forbidden of ["correctResponse", "acceptedResponses", "solverReceipt", "privateSolution", "rawSeed"]) if (serializedPublic.includes(forbidden)) throw new GenerationV2Error("VALIDATION_FAILED");
  return { ok: true as const, checks: ["EXPLICIT_OUTCOME_CONTRACT", "EXACT_INDEPENDENT_SOLVER_RESULT", "UNIQUE_NORMALIZED_ANSWER", "GRADE_AND_DOMAIN_BOUNDS", "PROMPT_MODEL_ALIGNMENT", "VISUAL_MODEL_ALIGNMENT", "DISTRACTOR_VALIDITY", "NO_PRIVATE_LEAK"] };
}

function responseInstruction(interaction: ProductInteractionContract) {
  if (interaction.type === "ORDERING") return "Chọn lần lượt các mục theo thứ tự yêu cầu.";
  if (interaction.type === "MATCHING") return "Ghép mỗi đại lượng với đúng giá trị.";
  if (interaction.type === "FRACTION_INPUT") return "Nhập tử số và mẫu số; phân số tương đương được chuẩn hóa toán học.";
  if (interaction.type === "SINGLE_CHOICE" || interaction.type === "CONSTRUCTION_OR_VISUAL_SELECTION") return "Chọn một đáp án.";
  if (interaction.type === "SHORT_STRUCTURED_RESPONSE") return "Nhập đúng dạng cấu trúc được nêu trong đề.";
  return "Nhập giá trị chính xác.";
}

export function generateWaveCQuestion(contract: WaveCOutcomeContract, input: GenerateQuestionInput): GeneratedProductQuestion {
  if (contract.grade !== input.grade) throw new GenerationV2Error("GRADE_MISMATCH");
  const random = new Random(`${contract.outcomeId}:${input.difficulty}:${input.seed}`);
  const normalizedModel = buildModel(contract, input, random);
  const solution = solveModel(normalizedModel);
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
    publicData: { taskMode: contract.taskMode, operation: normalizedModel.operation, values: normalizedModel.values, rationals: normalizedModel.rationals, labels: normalizedModel.labels, scale: normalizedModel.scale, meta: normalizedModel.meta, structuralFingerprint: normalizedModel.structuralFingerprint, difficultyStructure: normalizedModel.structureLevel },
    interaction,
    visual,
    accessibility: { prompt, visualAlternative: visual.description, responseInstruction: responseInstruction(interaction) },
  };
  const privateSolution = { correctResponse: solution.correct, acceptedResponses: solution.accepted, solutionSteps: solution.steps, optionMisconceptions: solution.optionMisconceptions ?? {}, nextStep: solution.nextStep };
  const solverReceipt = { solverVersion: SOLVER_VERSION, normalizedInputHash: modelHash, resultHash: hash(JSON.stringify(solution.correct)), uniqueSolution: true };
  return {
    publicSnapshot,
    privateSolution,
    solverReceipt,
    validation,
    provenance: { questionSource: "GENERATED_V2", outcomeId: contract.outcomeId, productFamilyId: contract.productFamilyId, variantId: contract.canonicalVariantId, variantVersion: VARIANT_VERSION, generatorVersion: GENERATOR_V2_VERSION, solverVersion: SOLVER_VERSION, difficultyPolicyVersion: DIFFICULTY_POLICY_VERSION, seedFingerprint: hash(input.seed).slice(0, 16), normalizedModelHash: modelHash, publicSnapshotHash: hash(JSON.stringify(publicSnapshot)), visualHash: hash(JSON.stringify(visual)), solverReceiptHash: hash(JSON.stringify(solverReceipt)) },
  };
}

export const __waveCNegativeControl = {
  inspect(contract: WaveCOutcomeContract, input: GenerateQuestionInput) {
    const random = new Random(`${contract.outcomeId}:${input.difficulty}:${input.seed}`);
    const normalizedModel = buildModel(contract, input, random);
    const solution = solveModel(normalizedModel);
    const prompt = promptFor(normalizedModel);
    const visual = visualFor(normalizedModel);
    const interaction = interactionFor(normalizedModel, solution, random);
    return { normalizedModel, solution, prompt, visual, interaction };
  },
  validate: validateModel,
  recompute: solveModel,
};
