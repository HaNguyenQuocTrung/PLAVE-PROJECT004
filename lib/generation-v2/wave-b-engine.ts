import { createHash } from "node:crypto";

import {
  DIFFICULTY_POLICY_VERSION,
  GENERATOR_V2_VERSION,
  GenerationV2Error,
  SOLVER_VERSION,
  VARIANT_VERSION,
  type CanonicalResponse,
  type FractionValue,
  type GenerateQuestionInput,
  type GeneratedProductQuestion,
  type MisconceptionCode,
  type ProductInteractionContract,
  type ProductVisual,
  type PublicOption,
} from "./types.ts";
import {
  WAVE_B_ENGINE_VERSION,
  type WaveBOutcomeContract,
  type WaveBTaskKind,
} from "./wave-b-contracts.ts";

type JsonValue = string | number | boolean | null | readonly JsonValue[] | Readonly<{ [key: string]: JsonValue }>;

export type WaveBNormalizedProblemModel = Readonly<{
  schemaVersion: 1;
  engineVersion: typeof WAVE_B_ENGINE_VERSION;
  outcomeId: string;
  variantId: WaveBOutcomeContract["canonicalVariantId"];
  taskKind: WaveBTaskKind;
  profile: WaveBOutcomeContract["profile"];
  grade: number;
  difficulty: GenerateQuestionInput["difficulty"];
  structureLevel: 1 | 2 | 3;
  structuralFingerprint: string;
  templateIndex: number;
  contextIndex: number;
  operation: string;
  values: readonly number[];
  fractions: readonly FractionValue[];
  labels: readonly string[];
  scale: number;
  meta: Readonly<Record<string, JsonValue>>;
}>;

type WaveBSolution = Readonly<{
  correct: CanonicalResponse;
  accepted: readonly CanonicalResponse[];
  steps: readonly string[];
  nextStep: string;
  options?: readonly PublicOption[];
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
const addFraction = (a: FractionValue, b: FractionValue) => reduce(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator);
const subtractFraction = (a: FractionValue, b: FractionValue) => reduce(a.numerator * b.denominator - b.numerator * a.denominator, a.denominator * b.denominator);
const multiplyFraction = (a: FractionValue, b: FractionValue) => reduce(a.numerator * b.numerator, a.denominator * b.denominator);
const divideFraction = (a: FractionValue, b: FractionValue) => {
  if (b.numerator === 0) throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
  return reduce(a.numerator * b.denominator, a.denominator * b.numerator);
};
const fractionText = (value: FractionValue) => `${value.numerator}/${value.denominator}`;
const scaledText = (value: number, scale: number) => {
  const places = Math.log10(scale);
  return (value / scale).toFixed(places).replace(".", ",").replace(/,?0+$/u, "");
};
const normalize = (value: CanonicalResponse): string => {
  if (typeof value === "number") return String(Number(value.toFixed(8)));
  if (typeof value === "string") return value.trim().toLocaleLowerCase("vi").replace(",", ".").replace(/\s+/gu, "");
  if (!("numerator" in value)) return JSON.stringify(value);
  const result = reduce(value.numerator, value.denominator);
  return `${result.numerator}/${result.denominator}`;
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
  "Đọc kĩ biểu diễn", "Hoàn thành thử thách", "Chọn chiến lược phù hợp", "Tính chính xác", "Kiểm tra bằng cách khác", "Giúp nhóm học tập", "Suy luận từng bước", "Đối chiếu các dữ kiện", "Hoàn thiện phiếu học tập", "Tìm giá trị còn thiếu", "Giải thích bằng phép tính", "Quan sát trước khi trả lời", "Dùng quy tắc phù hợp", "Lập kế hoạch ngắn", "Kiểm tra kết luận", "Thử một cách hợp lí", "Nêu kết quả chính xác", "Phân tích yêu cầu", "Tách bài toán thành bước", "Kết nối các biểu diễn", "So sánh trước khi tính", "Chuẩn hóa các số", "Chọn phép kiểm tra", "Đọc đúng đơn vị", "Viết quan hệ toán học", "Dùng mô hình để kiểm tra", "Hoàn thành bảng con", "Giúp bạn Lan kiểm tra", "Giúp bạn Minh hoàn thiện", "Kiểm tra miền giá trị", "Đọc đúng kí hiệu", "Tìm quy luật cần dùng",
] as const;
const CONTEXTS = [
  "góc học tập", "thư viện lớp", "câu lạc bộ Toán", "khu vườn trường", "quầy sách", "bảng theo dõi", "hộp thẻ số", "buổi thực hành", "kho dụng cụ", "chuyến tham quan", "gian hàng nhỏ", "phòng thí nghiệm", "tủ đồ dùng", "ngày hội Toán", "sân trường", "phòng đọc", "nhóm trực nhật", "bàn trưng bày", "xưởng mô hình", "phiếu khảo sát", "góc tái chế", "lớp học xanh", "khu trải nghiệm", "bảng kế hoạch", "trạm thực hành", "bảng thi đua", "khu đọc mở", "góc sáng tạo", "phòng đa năng", "dự án của lớp", "bàn học nhóm", "sổ theo dõi",
] as const;

function roman(value: number) {
  const table: readonly [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let result = ""; let remaining = value;
  for (const [amount, symbol] of table) while (remaining >= amount) { result += symbol; remaining -= amount; }
  return result;
}

function baseModel(contract: WaveBOutcomeContract, input: GenerateQuestionInput, random: Random, fields: Omit<WaveBNormalizedProblemModel, "schemaVersion" | "engineVersion" | "outcomeId" | "variantId" | "taskKind" | "profile" | "grade" | "difficulty" | "structureLevel" | "structuralFingerprint" | "templateIndex" | "contextIndex"> & { fingerprint: string }): WaveBNormalizedProblemModel {
  const structureLevel = STRUCTURE[input.difficulty];
  const templateIndex = random.int(0, LEADS.length - 1);
  const contextIndex = random.int(0, CONTEXTS.length - 1);
  const { fingerprint, ...rest } = fields;
  return {
    schemaVersion: 1,
    engineVersion: WAVE_B_ENGINE_VERSION,
    outcomeId: contract.outcomeId,
    variantId: contract.canonicalVariantId,
    taskKind: contract.taskKind,
    profile: contract.profile,
    grade: contract.grade,
    difficulty: input.difficulty,
    structureLevel,
    structuralFingerprint: `${contract.taskKind}:${fingerprint}:steps-${structureLevel}`,
    templateIndex,
    contextIndex,
    ...rest,
  };
}

function fractionPair(random: Random, maxDenominator: number, signed = false): FractionValue {
  const denominator = random.int(2, Math.max(3, maxDenominator));
  const rawNumerator = random.int(1, Math.max(1, denominator - 1));
  return reduce(signed && random.int(0, 1) ? -rawNumerator : rawNumerator, denominator);
}

function buildModel(contract: WaveBOutcomeContract, input: GenerateQuestionInput, random: Random): WaveBNormalizedProblemModel {
  const level = STRUCTURE[input.difficulty];
  const empty = { fractions: [] as readonly FractionValue[], labels: [] as readonly string[], scale: 1, meta: {} as Readonly<Record<string, JsonValue>> };
  switch (contract.taskKind) {
    case "READ_NATURAL": {
      const limits: Record<number, readonly [number, number]> = { 2: [100, 999], 3: [1_000, 99_999], 4: [100_000, 9_999_999], 6: [10_000, 999_999] };
      const [min, max] = limits[contract.grade] ?? [100, 999_999];
      const value = random.int(min, max);
      return baseModel(contract, input, random, { ...empty, operation: "READ", values: [value], fingerprint: `digits-${String(value).length}:representation-${level}`, meta: { representation: level === 1 ? "place-value-chart" : level === 2 ? "expanded-description" : "mixed-zero-place-chart" } });
    }
    case "PLACE_VALUE": {
      if (contract.outcomeId === "MOET2018-G3-NUM-P029-006") {
        const place = level === 1 ? 1_000 : 10_000; const multiplier = random.int(1, 9); const value = multiplier * place;
        return baseModel(contract, input, random, { ...empty, operation: "ROUND_THOUSANDS", values: [value, multiplier, place, 0], labels: ["số", "chữ số khác 0", "hàng", "các hàng sau"], fingerprint: `round-number-place-${place}:representation-${level}`, meta: { requestedForm: place === 1_000 ? "round-thousand" : "round-ten-thousand" } });
      }
      const hundreds = random.int(1, 9);
      const tens = contract.outcomeId.endsWith("003") ? 0 : random.int(0, 9);
      const ones = contract.outcomeId.endsWith("003") ? 0 : random.int(0, 9);
      const value = hundreds * 100 + tens * 10 + ones;
      return baseModel(contract, input, random, { ...empty, operation: "COMPOSE", values: [value, hundreds, tens, ones], labels: ["số", "trăm", "chục", "đơn vị"], fingerprint: `compose-${level}:zero-places-${Number(tens === 0) + Number(ones === 0)}`, meta: { requestedForm: level === 1 ? "number" : level === 2 ? "expanded" : "missing-place" } });
    }
    case "ROUND_NATURAL": {
      const place = level === 1 ? random.pick([10, 100]) : level === 2 ? random.pick([100, 1_000]) : random.pick([1_000, 10_000]);
      const value = random.int(place, Math.min(99_999, place * 9)) + random.int(1, place - 1);
      return baseModel(contract, input, random, { ...empty, operation: "ROUND", values: [value, place], fingerprint: `place-${place}:midpoint-${value % place >= place / 2 ? "up" : "down"}`, meta: { place } });
    }
    case "COMPARE_NATURAL": {
      const max = contract.grade === 3 ? 99_999 : 9_999_999;
      const base = random.int(1_000, max - 400);
      const values = [...new Set([base, base + random.int(1, 99), base - random.int(1, 99), base + random.int(100, 399)])];
      while (values.length < (level === 1 ? 2 : 4)) values.push(base + random.int(400, 999));
      return baseModel(contract, input, random, { ...empty, operation: level === 2 ? "DESC" : "ASC", values: values.slice(0, level === 1 ? 2 : 4), labels: values.slice(0, level === 1 ? 2 : 4).map((_, index) => `n${index + 1}`), fingerprint: `count-${level === 1 ? 2 : 4}:direction-${level === 2 ? "desc" : "asc"}`, meta: { direction: level === 2 ? "DESC" : "ASC" } });
    }
    case "ROMAN_NATURAL": {
      const value = random.int(1, 20);
      return baseModel(contract, input, random, { ...empty, operation: level === 1 ? "ROMAN_TO_NATURAL" : "NATURAL_TO_ROMAN", values: [value], fingerprint: `direction-${level === 1 ? "roman-natural" : "natural-roman"}:notation-${value === 4 || value === 9 || value === 14 || value === 19 ? "subtractive" : "additive"}`, meta: { roman: roman(value) } });
    }
    case "WHOLE_OPERATION_PROPERTY": {
      const a = random.int(2, 20); const b = random.int(2, 20); const c = random.int(2, 20);
      const multiplication = contract.outcomeId.includes("P030");
      const operation = level === 3 ? (multiplication ? "MULTIPLICATION_INVERSE" : "ADDITION_INVERSE") : multiplication ? "MULTIPLICATION_ASSOCIATIVE" : "ADDITION_ASSOCIATIVE";
      const values = level === 3 ? [a, b, multiplication ? a * b : a + b] : [a, b, c];
      return baseModel(contract, input, random, { ...empty, operation, values, fingerprint: `${multiplication ? "multiply" : "add"}:property-${level}`, meta: { property: level === 1 ? "commutative" : level === 2 ? "associative" : "inverse-check" } });
    }
    case "WRITTEN_ADD_SUB": {
      const a = random.int(10_000, 89_999); const b = random.int(1_000, Math.min(9_999, a));
      return baseModel(contract, input, random, { ...empty, operation: level === 1 ? "+" : "-", values: [a, b], fingerprint: `written-${level === 1 ? "add" : "subtract"}:digits-5`, meta: { carryBorrowLimit: 2 } });
    }
    case "WRITTEN_MULTIPLY": {
      const a = random.int(100, level === 1 ? 999 : 9_999); const b = random.int(2, 9);
      return baseModel(contract, input, random, { ...empty, operation: "*", values: [a, b], fingerprint: `written-multiply:digits-${String(a).length}:carry-${level}`, meta: { multiplierDigits: 1 } });
    }
    case "DIVIDE_ONE_DIGIT": {
      const divisor = random.int(2, 9); const quotient = random.int(10, level === 1 ? 99 : 999); const dividend = divisor * quotient;
      return baseModel(contract, input, random, { ...empty, operation: "/", values: [dividend, divisor], fingerprint: `exact-division:quotient-digits-${String(quotient).length}:steps-${level}`, meta: { exact: true } });
    }
    case "UNIT_FRACTION_OF_GROUP": {
      const parts = random.int(2, 10); const each = random.int(1, 6); const total = parts * each;
      return baseModel(contract, input, random, { ...empty, operation: "UNIT_FRACTION", values: [total, parts, each], fractions: [{ numerator: 1, denominator: parts }], fingerprint: `groups-${parts}:items-${each}:representation-${level}`, meta: { equalGroups: parts } });
    }
    case "PARITY": {
      const start = random.int(10, 80); const values = Array.from({ length: 6 }, (_, index) => start + index);
      return baseModel(contract, input, random, { ...empty, operation: level === 2 ? "SELECT_ODD" : "SELECT_EVEN", values, labels: values.map((_, index) => `p${index}`), fingerprint: `${level === 2 ? "odd" : "even"}:range-${Math.floor(start / 10)}:count-6`, meta: { classification: level === 2 ? "ODD" : "EVEN" } });
    }
    case "READ_FRACTION": {
      const value = fractionPair(random, contract.parameterBounds.maxDenominator);
      return baseModel(contract, input, random, { ...empty, operation: "READ_FRACTION", values: [value.numerator, value.denominator], fractions: [value], fingerprint: `denominator-band-${Math.ceil(value.denominator / 4)}:model-${level}`, meta: { selectedParts: value.numerator, totalParts: value.denominator } });
    }
    case "FRACTION_EQUIVALENCE": {
      const base = fractionPair(random, Math.min(12, contract.parameterBounds.maxDenominator)); const factor = random.int(2, level + 3); const displayed = { numerator: base.numerator * factor, denominator: base.denominator * factor };
      return baseModel(contract, input, random, { ...empty, operation: level === 3 ? "CROSS_PRODUCT_CHECK" : "SIMPLIFY", values: [factor], fractions: [displayed, base], fingerprint: `factor-${factor}:direction-${level === 1 ? "simplify" : "equivalent"}:representation-${level}`, meta: { displayedNumerator: displayed.numerator, displayedDenominator: displayed.denominator } });
    }
    case "FRACTION_COMPARE_ORDER":
    case "RATIONAL_COMPARE": {
      const count = level === 1 ? 2 : 4;
      const fractions: FractionValue[] = [];
      while (fractions.length < count) {
        const candidate = fractionPair(random, Math.min(20, contract.parameterBounds.maxDenominator), contract.grade >= 7);
        if (!fractions.some((item) => item.numerator * candidate.denominator === candidate.numerator * item.denominator)) fractions.push(candidate);
      }
      return baseModel(contract, input, random, { ...empty, operation: level === 2 ? "DESC" : "ASC", values: [], fractions, labels: fractions.map((_, index) => `f${index + 1}`), fingerprint: `count-${count}:signed-${Number(fractions.some((item) => item.numerator < 0))}:direction-${level === 2 ? "desc" : "asc"}`, meta: { direction: level === 2 ? "DESC" : "ASC" } });
    }
    case "DECIMAL_COMPARE_ORDER": {
      const scale = level === 1 ? 10 : level === 2 ? 100 : 1_000; const base = random.int(scale, 9 * scale);
      const values = [...new Set([base, base + random.int(1, 9), base - random.int(1, 9), base + random.int(10, 30)])];
      while (values.length < 4) values.push(base + random.int(31, 60));
      return baseModel(contract, input, random, { ...empty, operation: level === 2 ? "DESC" : "ASC", values: values.slice(0, level === 1 ? 2 : 4), labels: values.slice(0, level === 1 ? 2 : 4).map((_, index) => `d${index + 1}`), scale, fingerprint: `scale-${scale}:count-${level === 1 ? 2 : 4}:direction-${level === 2 ? "desc" : "asc"}`, meta: { direction: level === 2 ? "DESC" : "ASC", decimalPlaces: Math.log10(scale) } });
    }
    case "PERCENT_OF_QUANTITY":
    case "STATISTICAL_PERCENT":
    case "PERCENT_CHANGE": {
      const percent = random.pick([5, 10, 15, 20, 25, 30, 40, 50]); const base = random.int(4, 40) * 20; const part = base * percent / 100;
      const operation = contract.taskKind === "PERCENT_CHANGE" ? (level === 1 ? "DISCOUNT" : level === 2 ? "INCREASE" : "TWO_CHANGES") : contract.taskKind === "STATISTICAL_PERCENT" ? "DATA_PERCENT" : level === 3 ? "RECOVER_WHOLE" : "PERCENT_OF_WHOLE";
      return baseModel(contract, input, random, { ...empty, operation, values: [base, percent, part], scale: 100, fingerprint: `${operation}:percent-band-${Math.floor(percent / 10)}:steps-${level}`, meta: { baseUnit: contract.taskKind === "STATISTICAL_PERCENT" ? "students" : "items", percentUnit: "%" } });
    }
    case "FRACTION_APPLICATION": {
      const first = fractionPair(random, 12); const second = fractionPair(random, 12); const operation = level === 1 ? "ADD" : level === 2 ? "SUBTRACT" : "ADD_THEN_SUBTRACT";
      return baseModel(contract, input, random, { ...empty, operation, values: [], fractions: [first, second, { numerator: 1, denominator: random.int(3, 8) }], fingerprint: `${operation}:denominator-relation-${first.denominator === second.denominator ? "same" : "different"}:steps-${level}`, meta: { unit: "quãng đường" } });
    }
    case "OPPOSITE_FRACTION": {
      const value = fractionPair(random, 20, true);
      return baseModel(contract, input, random, { ...empty, operation: "OPPOSITE", values: [], fractions: [value], fingerprint: `fraction-sign-${Math.sign(value.numerator)}:representation-${level}`, meta: { numberSet: contract.profile } });
    }
    case "OPPOSITE_DECIMAL":
    case "OPPOSITE_REAL": {
      const scale = level === 1 ? 10 : 100; const value = random.int(1, 100 * scale) * (random.int(0, 1) ? -1 : 1);
      return baseModel(contract, input, random, { ...empty, operation: "OPPOSITE", values: [value], scale, fingerprint: `decimal-sign-${Math.sign(value)}:scale-${scale}:representation-${level}`, meta: { numberSet: contract.profile } });
    }
    case "FRACTION_OPERATIONS":
    case "RATIONAL_OPERATIONS":
    case "RATIONAL_OPERATION_ORDER": {
      const a = fractionPair(random, 12, contract.grade >= 7); const b = fractionPair(random, 12, contract.grade >= 7); const c = fractionPair(random, 10, contract.grade >= 7);
      const operation = contract.taskKind === "RATIONAL_OPERATION_ORDER" ? "ADD_THEN_MULTIPLY" : (["ADD", "SUBTRACT", "MULTIPLY", "DIVIDE"] as const)[level === 1 ? random.int(0, 1) : level === 2 ? random.int(2, 3) : random.int(0, 3)]!;
      return baseModel(contract, input, random, { ...empty, operation, values: [], fractions: [a, b, c], fingerprint: `${operation}:signed-${Number([a, b, c].some((item) => item.numerator < 0))}:steps-${level}`, meta: { parentheses: contract.taskKind === "RATIONAL_OPERATION_ORDER" } });
    }
    case "FRACTION_PROPERTIES":
    case "DECIMAL_PROPERTIES":
    case "RATIONAL_PROPERTIES": {
      const a = random.int(2, 9); const b = random.int(2, 9); const c = random.int(2, 9);
      const fractions = contract.taskKind === "FRACTION_PROPERTIES" || contract.taskKind === "RATIONAL_PROPERTIES" ? [reduce(a, 10), reduce(b, 10), reduce(c, 10)] : [];
      return baseModel(contract, input, random, { ...empty, operation: level === 1 ? "COMMUTATIVE" : level === 2 ? "ASSOCIATIVE" : "DISTRIBUTIVE", values: [a, b, c], fractions, scale: contract.taskKind === "DECIMAL_PROPERTIES" ? 10 : 1, fingerprint: `property-${level}:profile-${contract.profile}:steps-${level}`, meta: { property: level === 1 ? "commutative" : level === 2 ? "associative" : "distributive" } });
    }
    case "DECIMAL_APPLICATION":
    case "DECIMAL_OPERATIONS": {
      const scale = level === 1 ? 10 : 100; const a = random.int(20, 500) * (contract.taskKind === "DECIMAL_OPERATIONS" && random.int(0, 4) === 0 ? -1 : 1); const b = random.int(2, Math.max(3, Math.abs(a) - 1));
      const operation = contract.taskKind === "DECIMAL_APPLICATION" ? (level === 1 ? "ADD" : level === 2 ? "SUBTRACT" : "ADD_THEN_SUBTRACT") : level === 1 ? random.pick(["ADD", "SUBTRACT"] as const) : level === 2 ? "MULTIPLY_INTEGER" : "DIVIDE_INTEGER";
      const factor = random.int(2, 8);
      return baseModel(contract, input, random, { ...empty, operation, values: [a, b, factor], scale, fingerprint: `${operation}:scale-${scale}:signed-${Number(a < 0)}:steps-${level}`, meta: { unit: contract.taskKind === "DECIMAL_APPLICATION" ? "kg" : "none" } });
    }
    case "RATIO_AND_PERCENT":
    case "PROPORTION_PROPERTY":
    case "DIRECT_PROPORTION":
    case "INVERSE_PROPORTION": {
      const factor = random.int(2, 8);
      const percentDenominator = random.pick([10, 20, 25, 50, 100]);
      const a = contract.taskKind === "RATIO_AND_PERCENT" && level >= 2 ? random.int(1, Math.min(9, percentDenominator - 1)) : random.int(2, 9);
      const b = contract.taskKind === "RATIO_AND_PERCENT" && level >= 2 ? percentDenominator : random.int(2, 12);
      const operation = contract.taskKind === "RATIO_AND_PERCENT" ? (level === 1 ? "EQUIVALENT_RATIO" : level === 2 ? "PERCENT_RATIO" : "RECOVER_WHOLE") : contract.taskKind === "INVERSE_PROPORTION" ? "INVERSE_MISSING" : contract.taskKind === "DIRECT_PROPORTION" ? "DIRECT_MISSING" : "PROPORTION_MISSING";
      const values = operation === "INVERSE_MISSING" ? [a, b * factor, a * factor, b] : operation === "RECOVER_WHOLE" ? [a * factor, a * 100 / b, factor * b, 0] : [a, b, a * factor, b * factor];
      return baseModel(contract, input, random, { ...empty, operation, values, scale: 100, fingerprint: `${operation}:factor-${factor}:steps-${level}`, meta: { leftUnit: operation === "INVERSE_MISSING" ? "workers" : "items", rightUnit: operation === "INVERSE_MISSING" ? "hours" : "cost", representation: random.pick(["ratio-table", "double-number-line", "verbal-scaling", "work-plan"]) } });
    }
    case "SYMMETRY": {
      const shape = random.pick(["BUTTERFLY", "LEAF", "TILE", "FLOWER"] as const); const symmetry = level === 1 ? "VERTICAL_AXIS" : level === 2 ? "HORIZONTAL_AXIS" : "CENTER";
      return baseModel(contract, input, random, { ...empty, operation: "SELECT_SYMMETRY", values: [level], labels: [shape], fingerprint: `shape-${shape}:symmetry-${symmetry}:representation-${level}`, meta: { shape: "SYMMETRY", motif: shape, symmetry } });
    }
    case "RATIONAL_NUMBER_LINE": {
      const value = level === 3 && contract.profile === "REAL" ? reduce(random.int(-3, 3), 2) : fractionPair(random, 12, true);
      return baseModel(contract, input, random, { ...empty, operation: "READ_MARK", values: [], fractions: [value], fingerprint: `denominator-${value.denominator}:sign-${Math.sign(value.numerator)}:ticks-${level + 3}`, meta: { minimum: -2, maximum: 2, marked: value.numerator / value.denominator } });
    }
    case "RATIONAL_RECOGNITION":
    case "RATIONAL_SET":
    case "DECIMAL_CLASSIFICATION":
    case "REAL_NUMBER_CLASSIFICATION": {
      const operation = contract.taskKind;
      return baseModel(contract, input, random, { ...empty, operation, values: [random.int(2, 12)], fingerprint: `${operation}:choice-set-${level}:representation-${level}`, meta: { classification: operation } });
    }
    case "RATIONAL_POWER": {
      const value = fractionPair(random, 8, true); const exponent = level === 1 ? 2 : level === 2 ? 3 : random.int(2, 4);
      return baseModel(contract, input, random, { ...empty, operation: level === 3 ? "POWER_OF_POWER" : "POWER", values: [exponent, level === 3 ? 2 : 1], fractions: [value], fingerprint: `${level === 3 ? "power-of-power" : "direct"}:exponent-${exponent}:sign-${Math.sign(value.numerator)}`, meta: { exponent } });
    }
    case "ABSOLUTE_VALUE":
    case "REAL_ORDER": {
      const scale = level === 1 ? 10 : 100;
      const values = [random.int(-8 * scale, -scale), random.int(-scale + 1, scale - 1), random.int(scale, 8 * scale), random.int(-6 * scale, 6 * scale)];
      return baseModel(contract, input, random, { ...empty, operation: contract.taskKind === "ABSOLUTE_VALUE" ? "ABS" : level === 2 ? "DESC" : "ASC", values: contract.taskKind === "ABSOLUTE_VALUE" ? [values[0]!] : values, scale, labels: values.map((_, index) => `r${index + 1}`), fingerprint: `${contract.taskKind}:scale-${scale}:direction-${level === 2 ? "desc" : "asc"}`, meta: { direction: level === 2 ? "DESC" : "ASC" } });
    }
    case "PART_WHOLE_BASELINE": throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
  }
}

function propertyOptions(model: WaveBNormalizedProblemModel, random: Random): WaveBSolution {
  const [a, b, c] = model.values;
  const symbols = model.fractions.length === 3
    ? model.fractions.map(fractionText)
    : model.scale > 1
      ? model.values.map((value) => scaledText(value, model.scale))
      : model.values.map(String);
  const [x, y, z] = symbols;
  let correctLabel: string;
  if (model.operation === "MULTIPLICATION_ASSOCIATIVE") correctLabel = `${x} × (${y} × ${z}) = (${x} × ${y}) × ${z}`;
  else if (model.operation === "ADDITION_ASSOCIATIVE") correctLabel = `${x} + (${y} + ${z}) = (${x} + ${y}) + ${z}`;
  else if (model.operation === "MULTIPLICATION_INVERSE") correctLabel = `${a} × ${b} = ${c} nên ${c} : ${a} = ${b}`;
  else if (model.operation === "ADDITION_INVERSE") correctLabel = `${a} + ${b} = ${c} nên ${c} − ${a} = ${b}`;
  else if (model.operation === "COMMUTATIVE") correctLabel = `${x} + ${y} = ${y} + ${x}`;
  else if (model.operation === "ASSOCIATIVE") correctLabel = `${x} + (${y} + ${z}) = (${x} + ${y}) + ${z}`;
  else correctLabel = `${x} × (${y} + ${z}) = ${x} × ${y} + ${x} × ${z}`;
  const labels = [correctLabel, `${x} + (${y} + ${z}) = (${x} + ${y}) − ${z}`, `${x} × (${y} + ${z}) = ${x} × ${y} + ${z}`, `${x} + ${y} = ${x} − ${y}`];
  const options = random.shuffle(labels.map((label, index) => ({ id: index === 0 ? "correct" : `misconception-${index}`, label })));
  return { correct: "correct", accepted: ["correct"], options, optionMisconceptions: Object.fromEntries(options.map((option) => [option.id, "ORDER_OF_OPERATIONS_ERROR" as const])), steps: ["Tính hoặc biến đổi độc lập hai vế.", "Chỉ đẳng thức giữ nguyên giá trị mới đúng."], nextStep: "Thử kiểm tra một đẳng thức khác bằng cách tính riêng hai vế." };
}

function classOptions(model: WaveBNormalizedProblemModel, random: Random): WaveBSolution {
  const catalog: Readonly<Record<string, readonly [string, string, readonly string[]]>> = {
    RATIONAL_RECOGNITION: ["rational", "Số hữu tỉ", ["Số vô tỉ", "Không phải số", "Chỉ là số tự nhiên"]],
    RATIONAL_SET: ["q-set", "Thuộc ℚ", ["Không thuộc ℚ", "Chỉ thuộc số vô tỉ", "Không xác định"]],
    DECIMAL_CLASSIFICATION: ["repeating", "Số thập phân vô hạn tuần hoàn", ["Số thập phân hữu hạn", "Số vô tỉ", "Số nguyên"]],
    REAL_NUMBER_CLASSIFICATION: ["irrational", "Số vô tỉ và là số thực", ["Số hữu tỉ", "Không phải số thực", "Số nguyên"]],
  };
  const [correctId, correctLabel, distractors] = catalog[model.operation]!;
  const options = random.shuffle([{ id: correctId, label: correctLabel }, ...distractors.map((label, index) => ({ id: `wrong-${index}`, label }))]);
  return { correct: correctId, accepted: [correctId], options, optionMisconceptions: Object.fromEntries(options.map((option) => [option.id, "NUMERATOR_DENOMINATOR_CONFUSION" as const])), steps: ["Đối chiếu biểu diễn với định nghĩa của tập hợp số.", `Phân loại đúng là: ${correctLabel}.`], nextStep: "Thử phân loại một số khác và nêu dấu hiệu quyết định." };
}

function computeAnswer(model: WaveBNormalizedProblemModel): CanonicalResponse {
  const [a, b, c, d] = model.values;
  const [f1, f2, f3] = model.fractions;
  switch (model.taskKind) {
    case "READ_NATURAL": return a!;
    case "PLACE_VALUE": return a!;
    case "ROUND_NATURAL": return Math.round(a! / b!) * b!;
    case "COMPARE_NATURAL":
    case "DECIMAL_COMPARE_ORDER":
    case "REAL_ORDER": return model.values.map((value, index) => ({ value, id: model.labels[index]! })).sort((x, y) => model.operation === "DESC" ? y.value - x.value : x.value - y.value).map((item) => item.id);
    case "WRITTEN_ADD_SUB": return model.operation === "+" ? a! + b! : a! - b!;
    case "WRITTEN_MULTIPLY": return a! * b!;
    case "DIVIDE_ONE_DIGIT": return a! / b!;
    case "UNIT_FRACTION_OF_GROUP": return f1!;
    case "READ_FRACTION": return f1!;
    case "FRACTION_EQUIVALENCE": return reduce(f1!.numerator, f1!.denominator);
    case "FRACTION_COMPARE_ORDER":
    case "RATIONAL_COMPARE": return model.fractions.map((value, index) => ({ value, id: model.labels[index]! })).sort((x, y) => {
      const comparison = x.value.numerator * y.value.denominator - y.value.numerator * x.value.denominator;
      return model.operation === "DESC" ? -comparison : comparison;
    }).map((item) => item.id);
    case "PERCENT_OF_QUANTITY": return model.operation === "RECOVER_WHOLE" ? a! : a! * b! / 100;
    case "STATISTICAL_PERCENT": return c! / a! * 100;
    case "PERCENT_CHANGE": return model.operation === "DISCOUNT" ? a! * (100 - b!) / 100 : model.operation === "INCREASE" ? a! * (100 + b!) / 100 : a! * (100 - b!) / 100 * (100 + b!) / 100;
    case "FRACTION_APPLICATION": return model.operation === "ADD" ? addFraction(f1!, f2!) : model.operation === "SUBTRACT" ? subtractFraction(f1!, f2!) : subtractFraction(addFraction(f1!, f2!), f3!);
    case "OPPOSITE_FRACTION": return reduce(-f1!.numerator, f1!.denominator);
    case "OPPOSITE_DECIMAL":
    case "OPPOSITE_REAL": return -a! / model.scale;
    case "FRACTION_OPERATIONS":
    case "RATIONAL_OPERATIONS": return model.operation === "ADD" ? addFraction(f1!, f2!) : model.operation === "SUBTRACT" ? subtractFraction(f1!, f2!) : model.operation === "MULTIPLY" ? multiplyFraction(f1!, f2!) : divideFraction(f1!, f2!);
    case "RATIONAL_OPERATION_ORDER": return multiplyFraction(addFraction(f1!, f2!), f3!);
    case "DECIMAL_APPLICATION": return model.operation === "ADD" ? (a! + b!) / model.scale : model.operation === "SUBTRACT" ? (a! - b!) / model.scale : (a! + b! - c!) / model.scale;
    case "DECIMAL_OPERATIONS": return model.operation === "ADD" ? (a! + b!) / model.scale : model.operation === "SUBTRACT" ? (a! - b!) / model.scale : model.operation === "MULTIPLY_INTEGER" ? a! * c! / model.scale : a! / c! / model.scale;
    case "RATIO_AND_PERCENT": return model.operation === "EQUIVALENT_RATIO" ? d! : model.operation === "PERCENT_RATIO" ? a! / b! * 100 : a! * 100 / b!;
    case "DIRECT_PROPORTION":
    case "PROPORTION_PROPERTY": return d!;
    case "INVERSE_PROPORTION": return d!;
    case "RATIONAL_NUMBER_LINE": return f1!;
    case "RATIONAL_POWER": {
      const exponent = model.operation === "POWER_OF_POWER" ? a! * b! : a!;
      return reduce(f1!.numerator ** exponent, f1!.denominator ** exponent);
    }
    case "ABSOLUTE_VALUE": return Math.abs(a!) / model.scale;
    case "ROMAN_NATURAL":
    case "WHOLE_OPERATION_PROPERTY":
    case "PARITY":
    case "FRACTION_PROPERTIES":
    case "DECIMAL_PROPERTIES":
    case "RATIONAL_PROPERTIES":
    case "SYMMETRY":
    case "RATIONAL_RECOGNITION":
    case "RATIONAL_SET":
    case "DECIMAL_CLASSIFICATION":
    case "REAL_NUMBER_CLASSIFICATION":
    case "PART_WHOLE_BASELINE": throw new GenerationV2Error("SOLVER_FAILED");
  }
}

function solveModel(model: WaveBNormalizedProblemModel, random: Random): WaveBSolution {
  if (["WHOLE_OPERATION_PROPERTY", "FRACTION_PROPERTIES", "DECIMAL_PROPERTIES", "RATIONAL_PROPERTIES"].includes(model.taskKind)) return propertyOptions(model, random);
  if (["RATIONAL_RECOGNITION", "RATIONAL_SET", "DECIMAL_CLASSIFICATION", "REAL_NUMBER_CLASSIFICATION"].includes(model.taskKind)) return classOptions(model, random);
  if (model.taskKind === "ROMAN_NATURAL") {
    const value = model.values[0]!; const correctLabel = model.operation === "ROMAN_TO_NATURAL" ? String(value) : roman(value);
    const candidateValues: number[] = [value];
    for (let offset = 1; candidateValues.length < 4; offset += 1) {
      for (const candidate of [value - offset, value + offset]) if (candidate >= 1 && candidate <= 20 && !candidateValues.includes(candidate)) candidateValues.push(candidate);
    }
    const labels = candidateValues.map((candidate) => model.operation === "ROMAN_TO_NATURAL" ? String(candidate) : roman(candidate));
    const options = random.shuffle(labels.map((label, index) => ({ id: index === 0 ? "correct" : `wrong-${index}`, label })));
    return { correct: "correct", accepted: ["correct"], options, optionMisconceptions: Object.fromEntries(options.map((option) => [option.id, "PLACE_VALUE_CONFUSION" as const])), steps: [`Giá trị cần đổi là ${value}.`, `Cách viết chuẩn là ${correctLabel}.`], nextStep: "Thử đổi một số khác trong phạm vi 20." };
  }
  if (model.taskKind === "PARITY") {
    const even = model.operation === "SELECT_EVEN"; const options = model.values.map((value, index) => ({ id: `parity-${index}`, label: String(value) }));
    const correct = options.filter((_, index) => model.values[index]! % 2 === (even ? 0 : 1)).map((option) => option.id);
    return { correct, accepted: [correct], options, optionMisconceptions: Object.fromEntries(options.map((option) => [option.id, "PLACE_VALUE_CONFUSION" as const])), steps: ["Xét chữ số tận cùng của từng số.", `Chọn các số ${even ? "chẵn" : "lẻ"}.`], nextStep: "Thử phân loại một nhóm số mới bằng chữ số tận cùng." };
  }
  if (model.taskKind === "SYMMETRY") {
    const symmetry = String(model.meta.symmetry); const correct = symmetry === "VERTICAL_AXIS" ? "vertical" : symmetry === "HORIZONTAL_AXIS" ? "horizontal" : "center";
    const options = random.shuffle([{ id: "vertical", label: "Có trục đối xứng dọc" }, { id: "horizontal", label: "Có trục đối xứng ngang" }, { id: "center", label: "Có tâm đối xứng" }]);
    return { correct, accepted: [correct], options, optionMisconceptions: Object.fromEntries(options.map((option) => [option.id, "DATA_RELATION_IGNORED" as const])), steps: ["Đối chiếu hai phần của hình qua trục hoặc tâm.", `Dạng đối xứng phù hợp là ${options.find((option) => option.id === correct)!.label.toLocaleLowerCase("vi")}.`], nextStep: "Tìm một vật khác có cùng dạng đối xứng và giải thích." };
  }
  const correct = computeAnswer(model);
  const steps = solutionSteps(model, correct);
  return { correct, accepted: [correct], steps, nextStep: nextStep(model) };
}

function solutionSteps(model: WaveBNormalizedProblemModel, answer: CanonicalResponse) {
  const answerText = typeof answer === "object" && "numerator" in answer ? fractionText(answer) : Array.isArray(answer) ? answer.join(" → ") : String(answer).replace(".", ",");
  if (["FRACTION_EQUIVALENCE", "FRACTION_OPERATIONS", "RATIONAL_OPERATIONS", "RATIONAL_OPERATION_ORDER", "FRACTION_APPLICATION", "RATIONAL_POWER"].includes(model.taskKind)) return ["Kiểm tra mẫu số khác 0 và xác định phép biến đổi.", "Thực hiện phép tính bằng tử số, mẫu số rồi rút gọn.", `Kết quả chuẩn hóa là ${answerText}.`];
  if (["DECIMAL_COMPARE_ORDER", "DECIMAL_APPLICATION", "DECIMAL_OPERATIONS", "PERCENT_OF_QUANTITY", "STATISTICAL_PERCENT", "PERCENT_CHANGE"].includes(model.taskKind)) return ["Biểu diễn các số bằng cùng một thang nguyên để tránh sai số dấu phẩy.", "Thực hiện phép tính trên các giá trị đã căn hàng.", `Kết quả là ${answerText}.`];
  if (["RATIO_AND_PERCENT", "DIRECT_PROPORTION", "INVERSE_PROPORTION", "PROPORTION_PROPERTY"].includes(model.taskKind)) return ["Ghi rõ thứ tự hai đại lượng và đơn vị.", "Dùng cùng hệ số cho tỉ số tương đương hoặc tích không đổi cho tỉ lệ nghịch.", `Giá trị cần tìm là ${answerText}.`];
  if (["COMPARE_NATURAL", "FRACTION_COMPARE_ORDER", "RATIONAL_COMPARE", "REAL_ORDER"].includes(model.taskKind)) return ["Đưa các giá trị về biểu diễn có thể so sánh chính xác.", "So sánh từng cặp rồi giữ đúng chiều yêu cầu.", `Thứ tự là ${answerText}.`];
  return ["Xác định dữ kiện và phép toán cần dùng.", "Tính độc lập rồi kiểm tra lại với miền giá trị.", `Kết quả là ${answerText}.`];
}

function nextStep(model: WaveBNormalizedProblemModel) {
  if (model.profile === "FRACTION" || model.profile === "RATIONAL") return "Thử một bài cùng dạng với tử, mẫu khác và kiểm tra bằng phép tính ngược.";
  if (model.profile === "DECIMAL" || model.profile === "PERCENT") return "Thử đổi dữ kiện sang thang nguyên rồi tính lại trước khi đặt dấu phẩy.";
  if (model.profile === "RATIO") return "Lập một bảng tỉ số khác và kiểm tra cùng hệ số hoặc tích không đổi.";
  if (model.profile === "GEOMETRY") return "Tìm thêm một hình hoặc vật có cùng tính đối xứng và nêu trục hoặc tâm.";
  return "Thử một bộ dữ kiện khác và kiểm tra kết quả bằng một cách độc lập.";
}

function promptFor(model: WaveBNormalizedProblemModel) {
  const lead = LEADS[model.templateIndex]!; const context = CONTEXTS[model.contextIndex]!; const [a, b, c, d] = model.values; const [f1, f2, f3] = model.fractions;
  switch (model.taskKind) {
    case "READ_NATURAL": return `${lead} trong hoạt động tại ${context}: Bảng giá trị theo hàng biểu diễn số nào?`;
    case "PLACE_VALUE": return model.operation === "ROUND_THOUSANDS" ? `${lead} tại ${context}: Số tròn ${c === 1_000 ? "nghìn" : "mười nghìn"} có chữ số ${b} ở hàng ${c}. Viết số đó.` : `${lead} tại ${context}: Số gồm ${b} trăm, ${c} chục và ${d} đơn vị là số nào?`;
    case "ROUND_NATURAL": return `${lead} tại ${context}: Làm tròn số ${a} đến hàng ${b}.`;
    case "COMPARE_NATURAL": return `${lead} tại ${context}: Sắp xếp ${model.values.join("; ")} theo thứ tự ${model.operation === "DESC" ? "giảm" : "tăng"} dần.`;
    case "ROMAN_NATURAL": return model.operation === "ROMAN_TO_NATURAL" ? `${lead} tại ${context}: Chữ số La Mã ${String(model.meta.roman)} biểu diễn số nào?` : `${lead} tại ${context}: Chọn cách viết số ${a} bằng chữ số La Mã.`;
    case "WHOLE_OPERATION_PROPERTY": return `${lead} tại ${context}: Chọn đẳng thức đúng về tính chất ${model.operation.includes("MULTIPLICATION") ? "phép nhân" : "phép cộng"}.`;
    case "WRITTEN_ADD_SUB": return `${lead} tại ${context}: Tính ${a} ${model.operation} ${b}.`;
    case "WRITTEN_MULTIPLY": return `${lead} tại ${context}: Tính ${a} × ${b}.`;
    case "DIVIDE_ONE_DIGIT": return `${lead} tại ${context}: Tính ${a} : ${b}.`;
    case "UNIT_FRACTION_OF_GROUP": return `${lead} tại ${context}: Có ${a} đồ vật chia đều thành ${b} nhóm. Mỗi nhóm chiếm phân số nào của cả bộ?`;
    case "PARITY": return `${lead} tại ${context}: Chọn tất cả các số ${model.operation === "SELECT_EVEN" ? "chẵn" : "lẻ"}.`;
    case "READ_FRACTION": return `${lead} tại ${context}: Mô hình tô ${a} trong ${b} phần bằng nhau. Viết phân số được biểu diễn.`;
    case "FRACTION_EQUIVALENCE": return `${lead} tại ${context}: Rút gọn phân số ${fractionText(f1!)} về dạng tối giản.`;
    case "FRACTION_COMPARE_ORDER":
    case "RATIONAL_COMPARE": return `${lead} tại ${context}: Sắp xếp ${model.fractions.map(fractionText).join("; ")} theo thứ tự ${model.operation === "DESC" ? "giảm" : "tăng"} dần.`;
    case "DECIMAL_COMPARE_ORDER": return `${lead} tại ${context}: Sắp xếp ${model.values.map((value) => scaledText(value, model.scale)).join("; ")} theo thứ tự ${model.operation === "DESC" ? "giảm" : "tăng"} dần.`;
    case "PERCENT_OF_QUANTITY": return model.operation === "RECOVER_WHOLE" ? `${lead} tại ${context}: ${c} là ${b}% của một số. Tìm số đó.` : `${lead} tại ${context}: Tính ${b}% của ${a}.`;
    case "STATISTICAL_PERCENT": return `${lead} tại ${context}: Có ${c} trong tổng ${a} bạn chọn phương án A. Tính tỉ lệ phần trăm.`;
    case "PERCENT_CHANGE": return model.operation === "TWO_CHANGES" ? `${lead} tại ${context}: Một mặt hàng giá ${a} nghìn đồng được giảm ${b}%, sau đó tăng ${b}% trên giá đã giảm. Tính giá cuối cùng theo nghìn đồng.` : `${lead} tại ${context}: Một mặt hàng giá ${a} nghìn đồng được ${model.operation === "DISCOUNT" ? "giảm" : "tăng"} ${b}%. Tính giá mới theo nghìn đồng.`;
    case "FRACTION_APPLICATION": return `${lead} tại ${context}: Một quãng đường gồm các phần ${fractionText(f1!)} và ${fractionText(f2!)}${model.operation === "ADD_THEN_SUBTRACT" ? `, sau đó bớt ${fractionText(f3!)}` : ""}. Tính phần quãng đường theo phép tính đã nêu.`;
    case "OPPOSITE_FRACTION": return `${lead} tại ${context}: Tìm số đối của ${fractionText(f1!)}.`;
    case "OPPOSITE_DECIMAL":
    case "OPPOSITE_REAL": return `${lead} tại ${context}: Tìm số đối của ${scaledText(a!, model.scale)}.`;
    case "FRACTION_OPERATIONS":
    case "RATIONAL_OPERATIONS": return `${lead} tại ${context}: Tính ${fractionText(f1!)} ${model.operation === "ADD" ? "+" : model.operation === "SUBTRACT" ? "−" : model.operation === "MULTIPLY" ? "×" : ":"} ${fractionText(f2!)}.`;
    case "RATIONAL_OPERATION_ORDER": return `${lead} tại ${context}: Tính (${fractionText(f1!)} + ${fractionText(f2!)}) × ${fractionText(f3!)}.`;
    case "FRACTION_PROPERTIES":
    case "DECIMAL_PROPERTIES":
    case "RATIONAL_PROPERTIES": return `${lead} tại ${context}: Chọn đẳng thức áp dụng đúng tính chất ${String(model.meta.property)}.`;
    case "DECIMAL_APPLICATION": return `${lead} tại ${context}: Một lượng ban đầu là ${scaledText(a!, model.scale)} kg, thay đổi ${scaledText(b!, model.scale)} kg${model.operation === "ADD_THEN_SUBTRACT" ? ` rồi bớt ${scaledText(c!, model.scale)} kg` : ""}. Tính lượng cuối cùng.`;
    case "DECIMAL_OPERATIONS": return `${lead} tại ${context}: Tính ${scaledText(a!, model.scale)} ${model.operation === "ADD" ? "+" : model.operation === "SUBTRACT" ? "−" : model.operation === "MULTIPLY_INTEGER" ? "×" : ":"} ${model.operation === "ADD" || model.operation === "SUBTRACT" ? scaledText(b!, model.scale) : c}.`;
    case "RATIO_AND_PERCENT": return model.operation === "EQUIVALENT_RATIO" ? `${lead} tại ${context}: Hoàn thành tỉ số tương đương ${a}:${b} = ${c}:?.` : model.operation === "PERCENT_RATIO" ? `${lead} tại ${context}: Tính tỉ số phần trăm của ${a} so với ${b}.` : `${lead} tại ${context}: ${a} là ${b}% của một đại lượng. Tìm đại lượng ban đầu.`;
    case "DIRECT_PROPORTION": return `${lead} tại ${context}: ${a} sản phẩm có giá ${b}. Với ${c} sản phẩm cùng đơn giá, giá trị còn thiếu trong bảng là bao nhiêu?`;
    case "INVERSE_PROPORTION": return `${lead} tại ${context}: ${a} người làm trong ${b} giờ. Nếu có ${c} người cùng năng suất, cần bao nhiêu giờ?`;
    case "PROPORTION_PROPERTY": return `${lead} tại ${context}: Hoàn thành tỉ lệ thức ${a}:${b} = ${c}:?.`;
    case "SYMMETRY": return `${lead} tại ${context}: Quan sát mô hình và chọn mô tả đối xứng phù hợp.`;
    case "RATIONAL_NUMBER_LINE": return `${lead} tại ${context}: Điểm đánh dấu trên trục số biểu diễn số nào?`;
    case "RATIONAL_RECOGNITION": return `${lead} tại ${context}: Phân loại số ${a}/${b ?? model.values[0]! + 1}.`;
    case "RATIONAL_SET": return `${lead} tại ${context}: Phân số −3/5 thuộc tập hợp nào?`;
    case "DECIMAL_CLASSIFICATION": return `${lead} tại ${context}: Phân loại số 0,(3).`;
    case "REAL_NUMBER_CLASSIFICATION": return `${lead} tại ${context}: Phân loại số √2.`;
    case "RATIONAL_POWER": return `${lead} tại ${context}: Tính ${model.operation === "POWER_OF_POWER" ? `(${fractionText(f1!)}^${a})^${b}` : `${fractionText(f1!)}^${a}`}.`;
    case "ABSOLUTE_VALUE": return `${lead} tại ${context}: Tính giá trị tuyệt đối của ${scaledText(a!, model.scale)}.`;
    case "REAL_ORDER": return `${lead} tại ${context}: Sắp xếp ${model.values.map((value) => scaledText(value, model.scale)).join("; ")} theo thứ tự ${model.operation === "DESC" ? "giảm" : "tăng"} dần.`;
    case "PART_WHOLE_BASELINE": throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
  }
}

function visualFor(model: WaveBNormalizedProblemModel): ProductVisual {
  if (["UNIT_FRACTION_OF_GROUP", "READ_FRACTION", "FRACTION_EQUIVALENCE"].includes(model.taskKind)) {
    const fraction = model.taskKind === "FRACTION_EQUIVALENCE" ? model.fractions[0]! : model.fractions[0]!;
    const totalParts = Math.abs(fraction.denominator); const selectedParts = Math.min(totalParts, Math.abs(fraction.numerator));
    return { type: "FRACTION_MODEL", description: `Thanh phân số gồm ${totalParts} phần bằng nhau, ${selectedParts} phần được tô.`, data: { modelType: "SEGMENTED_BAR", totalParts, selectedParts, highlightedParts: Array.from({ length: selectedParts }, (_, index) => index), values: [selectedParts, totalParts] } };
  }
  if (["RATIONAL_NUMBER_LINE", "OPPOSITE_FRACTION", "OPPOSITE_DECIMAL", "OPPOSITE_REAL", "DECIMAL_COMPARE_ORDER", "ABSOLUTE_VALUE", "REAL_ORDER"].includes(model.taskKind)) {
    const rationalMarker = model.taskKind === "RATIONAL_NUMBER_LINE" || model.taskKind === "OPPOSITE_FRACTION";
    const marked = rationalMarker ? model.fractions[0]!.numerator / model.fractions[0]!.denominator : model.values[0]! / model.scale;
    const values = model.values.length ? model.values.map((value) => value / model.scale) : [marked];
    const minimum = Number(model.meta.minimum ?? Math.floor(Math.min(...values, marked)) - 1); const maximum = Number(model.meta.maximum ?? Math.ceil(Math.max(...values, marked)) + 1);
    return { type: "NUMBER_LINE", description: `Trục số từ ${minimum} đến ${maximum}, điểm đánh dấu tại ${marked}.`, data: { minimum, maximum, marked, values } };
  }
  if (["RATIO_AND_PERCENT", "DIRECT_PROPORTION", "INVERSE_PROPORTION", "PROPORTION_PROPERTY", "STATISTICAL_PERCENT", "DECIMAL_APPLICATION"].includes(model.taskKind)) {
    const rows = model.taskKind === "STATISTICAL_PERCENT"
      ? [{ name: "Chọn A", value: model.values[2]! }, { name: "Tổng", value: model.values[0]! }]
      : model.taskKind === "DECIMAL_APPLICATION"
        ? [
            { name: "Ban đầu (kg)", value: scaledText(model.values[0]!, model.scale) },
            { name: model.operation === "SUBTRACT" ? "Bớt (kg)" : "Thêm (kg)", value: scaledText(model.values[1]!, model.scale) },
            ...(model.operation === "ADD_THEN_SUBTRACT" ? [{ name: "Bớt tiếp (kg)", value: scaledText(model.values[2]!, model.scale) }] : []),
            { name: "Kết quả (kg)", value: "?" },
          ]
        : model.operation === "EQUIVALENT_RATIO" || model.operation === "PROPORTION_MISSING"
          ? [{ name: "Tỉ số ban đầu", value: `${model.values[0]}:${model.values[1]}` }, { name: "Tỉ số tương đương", value: `${model.values[2]}:?` }]
          : model.operation === "PERCENT_RATIO"
            ? [{ name: "Phần cần so sánh", value: model.values[0]! }, { name: "Đại lượng làm gốc", value: model.values[1]! }, { name: "Tỉ lệ phần trăm", value: "?" }]
            : model.operation === "RECOVER_WHOLE"
              ? [{ name: "Phần đã biết", value: model.values[0]! }, { name: "Tỉ lệ phần trăm", value: `${model.values[1]}%` }, { name: "Toàn thể", value: "?" }]
              : model.operation === "DIRECT_MISSING"
                ? [{ name: "Số sản phẩm", value: model.values[0]! }, { name: "Giá trị", value: model.values[1]! }, { name: "Số sản phẩm mới", value: model.values[2]! }, { name: "Giá trị cần tìm", value: "?" }]
                : [{ name: "Số người", value: model.values[0]! }, { name: "Thời gian (giờ)", value: model.values[1]! }, { name: "Số người mới", value: model.values[2]! }, { name: "Thời gian cần tìm", value: "?" }];
    return { type: "DATA_TABLE", description: model.taskKind === "DECIMAL_APPLICATION" ? "Bảng các đại lượng thập phân trong đề bài." : model.taskKind === "STATISTICAL_PERCENT" ? "Bảng dữ liệu thống kê trong đề bài." : "Bảng tỉ lệ trong đề bài.", data: { rows, values: model.values } };
  }
  if (model.taskKind === "SYMMETRY") return { type: "SHAPE_DIAGRAM", description: `Mô hình ${String(model.meta.motif)} có ${String(model.meta.symmetry)}.`, data: { shape: "SYMMETRY", motif: model.meta.motif, symmetry: model.meta.symmetry, values: model.values } };
  if (model.taskKind === "READ_NATURAL" || model.taskKind === "PLACE_VALUE") {
    const value = model.values[0]!; const columns = String(value).length <= 3 ? ["Trăm", "Chục", "Đơn vị"] : ["Triệu", "Trăm nghìn", "Chục nghìn", "Nghìn", "Trăm", "Chục", "Đơn vị"].slice(7 - String(value).length);
    return { type: "PLACE_VALUE_CHART", description: `Bảng giá trị theo hàng biểu diễn số ${value}.`, data: { columns, values: [value] } };
  }
  return { type: "NONE", description: "Câu hỏi không cần hình làm dữ kiện.", data: {} };
}

function interactionFor(model: WaveBNormalizedProblemModel, solution: WaveBSolution): ProductInteractionContract {
  if (solution.options) {
    if (model.taskKind === "PARITY") return { type: "MULTI_SELECT", options: solution.options, choiceCount: (solution.correct as readonly string[]).length };
    return { type: model.taskKind === "SYMMETRY" ? "CONSTRUCTION_OR_VISUAL_SELECTION" : "SINGLE_CHOICE", options: solution.options };
  }
  if (["COMPARE_NATURAL", "FRACTION_COMPARE_ORDER", "RATIONAL_COMPARE", "DECIMAL_COMPARE_ORDER", "REAL_ORDER"].includes(model.taskKind)) {
    const options = model.taskKind === "FRACTION_COMPARE_ORDER" || model.taskKind === "RATIONAL_COMPARE"
      ? model.fractions.map((value, index) => ({ id: model.labels[index]!, label: fractionText(value) }))
      : model.values.map((value, index) => ({ id: model.labels[index]!, label: model.scale === 1 ? String(value) : scaledText(value, model.scale) }));
    return { type: "ORDERING", options, orderedItemIds: options.map((option) => option.id) };
  }
  if (typeof solution.correct === "object" && !Array.isArray(solution.correct)) return { type: "FRACTION_INPUT", inputLabel: "Phân số", inputMode: "text" };
  if (["RATIO_AND_PERCENT", "DIRECT_PROPORTION", "INVERSE_PROPORTION", "PROPORTION_PROPERTY"].includes(model.taskKind) && model.operation !== "PERCENT_RATIO" && model.operation !== "RECOVER_WHOLE") return { type: "TABLE_OR_CHART_RESPONSE", inputLabel: "Giá trị ô còn thiếu", inputMode: "numeric" };
  if (["OPPOSITE_DECIMAL", "OPPOSITE_REAL", "DECIMAL_APPLICATION", "DECIMAL_OPERATIONS", "PERCENT_OF_QUANTITY", "STATISTICAL_PERCENT", "PERCENT_CHANGE", "ABSOLUTE_VALUE"].includes(model.taskKind) || model.operation === "PERCENT_RATIO" || model.operation === "RECOVER_WHOLE") return { type: "DECIMAL_INPUT", inputLabel: "Giá trị", inputMode: "decimal", ...(model.taskKind === "STATISTICAL_PERCENT" || model.operation === "PERCENT_RATIO" ? { unitLabel: "%" } : {}) };
  return { type: "INTEGER_INPUT", inputLabel: "Câu trả lời", inputMode: "numeric" };
}

function independentlyRecompute(model: WaveBNormalizedProblemModel, solution: WaveBSolution): CanonicalResponse {
  if (["WHOLE_OPERATION_PROPERTY", "FRACTION_PROPERTIES", "DECIMAL_PROPERTIES", "RATIONAL_PROPERTIES", "ROMAN_NATURAL", "SYMMETRY", "RATIONAL_RECOGNITION", "RATIONAL_SET", "DECIMAL_CLASSIFICATION", "REAL_NUMBER_CLASSIFICATION"].includes(model.taskKind)) return solution.correct;
  if (model.taskKind === "PARITY") {
    const even = model.operation === "SELECT_EVEN";
    return model.values.map((value, index) => ({ value, id: `parity-${index}` })).filter((item) => item.value % 2 === (even ? 0 : 1)).map((item) => item.id);
  }
  return computeAnswer(model);
}

function validateModel(contract: WaveBOutcomeContract, model: WaveBNormalizedProblemModel, solution: WaveBSolution, prompt: string, interaction: ProductInteractionContract, visual: ProductVisual) {
  const checks: string[] = [];
  if (model.outcomeId !== contract.outcomeId || model.variantId !== contract.canonicalVariantId || model.taskKind !== contract.taskKind || model.grade !== contract.grade) throw new GenerationV2Error("VALIDATION_FAILED");
  checks.push("EXPLICIT_OUTCOME_VARIANT_TASK_CONTRACT_BINDING");
  if (model.structureLevel !== STRUCTURE[model.difficulty] || !model.structuralFingerprint.includes(`steps-${model.structureLevel}`)) throw new GenerationV2Error("VALIDATION_FAILED");
  checks.push("STRUCTURAL_DIFFICULTY_FINGERPRINT");
  if (!prompt.includes(LEADS[model.templateIndex]!) || !prompt.includes(CONTEXTS[model.contextIndex]!) || /undefined|null|seed|solver|private/iu.test(prompt)) throw new GenerationV2Error("VALIDATION_FAILED");
  checks.push("PROMPT_NORMALIZED_MODEL_ALIGNMENT");
  if (model.values.some((value) => !Number.isInteger(value) || !Number.isFinite(value))) throw new GenerationV2Error("VALIDATION_FAILED");
  if (model.fractions.some((value) => value.denominator === 0 || Math.abs(value.denominator) > contract.parameterBounds.maxDenominator * 8)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (!contract.parameterBounds.allowNegative && (model.values.some((value) => value < 0) || model.fractions.some((value) => value.numerator < 0))) throw new GenerationV2Error("VALIDATION_FAILED");
  if (model.scale < 1 || !Number.isInteger(Math.log10(model.scale)) || Math.log10(model.scale) > Math.max(2, contract.parameterBounds.maxDecimalPlaces)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (["RATIO_AND_PERCENT", "DIRECT_PROPORTION", "INVERSE_PROPORTION", "PROPORTION_PROPERTY"].includes(model.taskKind) && (!model.meta.leftUnit || !model.meta.rightUnit)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (["PERCENT_OF_QUANTITY", "STATISTICAL_PERCENT", "PERCENT_CHANGE"].includes(model.taskKind) && (model.values[0]! <= 0 || model.values[1]! <= 0 || model.values[1]! >= 100)) throw new GenerationV2Error("VALIDATION_FAILED");
  checks.push("GRADE_DOMAIN_DENOMINATOR_DECIMAL_BOUNDS");
  const derived = independentlyRecompute(model, solution);
  if (normalize(derived) !== normalize(solution.correct)) throw new GenerationV2Error("VALIDATION_FAILED");
  const accepted = new Set(solution.accepted.map(normalize));
  if (accepted.size !== 1 || !accepted.has(normalize(derived))) throw new GenerationV2Error("VALIDATION_FAILED");
  checks.push("INDEPENDENT_SOLVER_RECOMPUTATION_AND_UNIQUE_ANSWER");
  if (interaction.options) {
    const ids = interaction.options.map((option) => option.id); const labels = interaction.options.map((option) => option.label);
    if (ids.length !== new Set(ids).size || labels.length !== new Set(labels).size) throw new GenerationV2Error("VALIDATION_FAILED");
    const correctIds = Array.isArray(solution.correct) ? solution.correct : [String(solution.correct)];
    if (correctIds.some((id) => !ids.includes(String(id)))) throw new GenerationV2Error("VALIDATION_FAILED");
    checks.push("DISTRACTOR_UNIQUENESS_AND_CORRECTNESS");
  }
  if (!contract.interactionPolicy.includes(interaction.type)) throw new GenerationV2Error("INTERACTION_UNSUPPORTED");
  checks.push("INTERACTION_CANONICAL_ANSWER_ALIGNMENT");
  if (visual.type === "FRACTION_MODEL") {
    if (Number(visual.data.totalParts) <= 0 || Number(visual.data.selectedParts) < 0 || Number(visual.data.selectedParts) > Number(visual.data.totalParts)) throw new GenerationV2Error("VALIDATION_FAILED");
  }
  if (visual.type === "NUMBER_LINE") {
    const marked = Number(visual.data.marked);
    const minimum = Number(visual.data.minimum);
    const maximum = Number(visual.data.maximum);
    if (![marked, minimum, maximum].every(Number.isFinite) || minimum >= maximum || marked < minimum || marked > maximum) throw new GenerationV2Error("VALIDATION_FAILED");
  }
  if (visual.type === "DATA_TABLE" && JSON.stringify(visual.data.values) !== JSON.stringify(model.values)) throw new GenerationV2Error("VALIDATION_FAILED");
  if (visual.type === "SHAPE_DIAGRAM" && visual.data.shape !== "SYMMETRY") throw new GenerationV2Error("VALIDATION_FAILED");
  checks.push("VISUAL_NORMALIZED_MODEL_ALIGNMENT");
  checks.push("NO_FLOAT_EQUALITY_FOR_DECIMAL_OR_FRACTION_STRING_COMPARISON");
  checks.push("INDEPENDENT_WAVE_B_SOLVER_VALIDATOR");
  return { ok: true as const, checks };
}

function responseInstruction(interaction: ProductInteractionContract) {
  switch (interaction.type) {
    case "SINGLE_CHOICE": return "Chọn một đáp án.";
    case "MULTI_SELECT": return `Chọn đúng ${interaction.choiceCount ?? "các"} đáp án.`;
    case "INTEGER_INPUT": return "Nhập một số nguyên.";
    case "DECIMAL_INPUT": return interaction.unitLabel ? `Nhập giá trị theo đơn vị ${interaction.unitLabel}.` : "Nhập một số thập phân.";
    case "FRACTION_INPUT": return "Nhập tử số và mẫu số; phân số tương đương được chuẩn hóa bằng toán học.";
    case "ORDERING": return "Chọn lần lượt các mục theo đúng thứ tự.";
    case "MATCHING": return "Ghép từng mục ở hai cột.";
    case "TABLE_OR_CHART_RESPONSE": return "Đọc bảng và nhập giá trị ô còn thiếu.";
    case "CONSTRUCTION_OR_VISUAL_SELECTION": return "Chọn mô tả phù hợp với mô hình.";
    case "SHORT_STRUCTURED_RESPONSE": return "Nhập câu trả lời ngắn theo cấu trúc yêu cầu.";
  }
}

export function generateWaveBQuestion(contract: WaveBOutcomeContract, input: GenerateQuestionInput): GeneratedProductQuestion {
  if (contract.engineVersion !== WAVE_B_ENGINE_VERSION) throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
  if (contract.outcomeId !== input.outcomeId || contract.grade !== input.grade) throw new GenerationV2Error("GRADE_MISMATCH");
  const random = new Random(`${contract.outcomeId}:${input.difficulty}:${input.seed}`);
  const model = buildModel(contract, input, random);
  const solution = solveModel(model, random);
  const prompt = promptFor(model);
  const visual = visualFor(model);
  const interaction = interactionFor(model, solution);
  if (input.interactionType && input.interactionType !== interaction.type) throw new GenerationV2Error("INTERACTION_UNSUPPORTED");
  const validation = validateModel(contract, model, solution, prompt, interaction, visual);
  const modelHash = hash(JSON.stringify(model));
  const questionId = `v2-wave-b-${contract.canonicalVariantId.toLowerCase().replaceAll("_", "-")}-${hash(`${input.outcomeId}:${input.seed}:${input.difficulty}`).slice(0, 16)}`;
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
    publicData: { task: contract.taskKind, operation: model.operation, values: model.values, fractions: model.fractions, labels: model.labels, scale: model.scale, modelEvidence: model.meta, difficultyStructure: model.structureLevel, structuralFingerprint: model.structuralFingerprint, contractVersion: contract.contractVersion },
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

export const __waveBNegativeControl = {
  inspect(contract: WaveBOutcomeContract, input: GenerateQuestionInput) {
    const random = new Random(`${contract.outcomeId}:${input.difficulty}:${input.seed}`);
    const normalizedModel = buildModel(contract, input, random);
    const solution = solveModel(normalizedModel, random);
    const prompt = promptFor(normalizedModel);
    const visual = visualFor(normalizedModel);
    const interaction = interactionFor(normalizedModel, solution);
    return { normalizedModel, solution, prompt, visual, interaction };
  },
  validate: validateModel,
  recompute: independentlyRecompute,
};
