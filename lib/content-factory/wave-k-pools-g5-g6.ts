import { waveKClassificationsG5G6 } from "./wave-k-classifications-g5-g6.ts";
import type { WaveKCaseSeed } from "./wave-k-types.ts";

type Payload = WaveKCaseSeed["oracle"]["payload"];
type AnswerType = WaveKCaseSeed["answerType"];

const n = (payload: Payload) => (payload.values as readonly number[] | undefined) ?? [];
const s = (payload: Payload) => (payload.labels as readonly string[] | undefined) ?? [];
const op = (payload: Payload) => String(payload.op);
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const rational = (numerator: number, denominator: number) => {
  if (denominator === 0) throw new Error("WAVE_K_G5_G6_ZERO_DENOMINATOR");
  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);
  const top = sign * numerator / divisor;
  const bottom = Math.abs(denominator) / divisor;
  return bottom === 1 ? String(top) : `${top}/${bottom}`;
};
const decimal = (scaled: number, places: number) => {
  const sign = scaled < 0 ? "-" : "";
  const digits = String(Math.abs(scaled)).padStart(places + 1, "0");
  return places === 0 ? `${sign}${digits}` : `${sign}${digits.slice(0, -places)}.${digits.slice(-places)}`;
};
const romanPairs = [
  [4, "IV"], [9, "IX"], [14, "XIV"], [19, "XIX"], [24, "XXIV"], [29, "XXIX"],
] as const;

function solveOracle(payload: Payload): string {
  const values = n(payload);
  switch (op(payload)) {
    case "SCALE_INTEGER": return String(values[0]! * values[1]!);
    case "DIVIDE_INTEGER": return String(values[0]! / values[1]!);
    case "KMH_TO_MS": return String(values[0]! * 5 / 18);
    case "MS_TO_KMH": return String(values[0]! * 18 / 5);
    case "ADD": return String(values[0]! + values[1]!);
    case "SUBTRACT": return String(values[0]! - values[1]!);
    case "MULTIPLY": return String(values[0]! * values[1]!);
    case "MIXED_AST": return String((values[0]! + values[1]!) * values[2]! - values[3]!);
    case "DISTRIBUTE": return String(values[0]! * (values[1]! + values[2]!));
    case "RATIONAL_ADD": return rational(values[0]! * values[3]! + values[2]! * values[1]!, values[1]! * values[3]!);
    case "RATIONAL_SUB": return rational(values[0]! * values[3]! - values[2]! * values[1]!, values[1]! * values[3]!);
    case "RATIONAL_COMPARE": return values[0]! * values[3]! < values[2]! * values[1]! ? "<" : values[0]! * values[3]! > values[2]! * values[1]! ? ">" : "=";
    case "RATIONAL_OPPOSITE": return rational(-values[0]!, values[1]!);
    case "DECIMAL_FROM_FRACTION": return decimal(values[0]! * 10 ** (values[2]! - values[1]!), values[2]!);
    case "DECIMAL_MIXED": return `${Math.floor(values[0]! / 10)} ${rational(values[0]! % 10, 10)}`;
    case "ROUND_SCALED": {
      const divisor = 10 ** (values[1]! - values[2]!);
      return decimal(Math.round(values[0]! / divisor), values[2]!);
    }
    case "DECIMAL_SCALE": return decimal(values[0]! * values[1]!, values[2]!);
    case "DECIMAL_UNSCALE": return decimal(values[0]! / values[1]!, values[2]!);
    case "ORDER_KTH": return String([...values.slice(0, 4)].sort((a, b) => a - b)[values[4]!]!);
    case "DECIMAL_ORDER_KTH": return decimal([...values.slice(0, 4)].sort((a, b) => a - b)[values[4]!]!, 2);
    case "MAX": return String(Math.max(...values));
    case "MIN": return String(Math.min(...values));
    case "COUNT_MATCH": return String(values.slice(1).filter((value) => value % values[0]! === 0).length);
    case "RATIO": return rational(values[0]!, values[1]!);
    case "CIRCLE_CIRCUMFERENCE": return rational(2 * values[0]! * values[1]!, values[2]!);
    case "CIRCLE_AREA": return rational(values[0]! * values[1]! * values[1]!, values[2]!);
    case "TRIANGLE_AREA": return rational(values[0]! * values[1]!, 2);
    case "TRAPEZOID_AREA": return rational((values[0]! + values[1]!) * values[2]!, 2);
    case "BOX_VOLUME": return String(values[0]! * values[1]! * values[2]!);
    case "BOX_SURFACE": return String(2 * (values[0]! * values[1]! + values[0]! * values[2]! + values[1]! * values[2]!));
    case "MIDPOINT": return String((values[0]! + values[1]!) / 2);
    case "SEGMENT_LENGTH": return String(Math.abs(values[1]! - values[0]!));
    case "ANGLE_CLASS": return values[0] === 90 ? "GÓC VUÔNG" : values[0] === 180 ? "GÓC BẸT" : values[0]! < 90 ? "GÓC NHỌN" : "GÓC TÙ";
    case "ANGLE_COMPLEMENT": return String(90 - values[0]!);
    case "ANGLE_SUPPLEMENT": return String(180 - values[0]!);
    case "COLLINEAR": return (values[2]! - values[0]!) * (values[5]! - values[1]!) === (values[3]! - values[1]!) * (values[4]! - values[0]!) ? "CÓ" : "KHÔNG";
    case "BETWEEN": return values[0]! < values[1]! && values[1]! < values[2]! ? "CÓ" : "KHÔNG";
    case "INCIDENCE": return values[1]! === values[2]! * values[0]! + values[3]! ? "THUỘC" : "KHÔNG THUỘC";
    case "ROMAN": return romanPairs.find(([value]) => value === values[0]!)![1];
    case "ROMAN_INVERSE": return String(romanPairs.find(([, numeral]) => numeral === s(payload)[0]!)![0]);
    case "PLACE_VALUE": return String(Math.floor(values[0]! / 10 ** values[1]!) % 10 * 10 ** values[1]!);
    case "DIVISOR_COUNT": return String(values.slice(1).filter((divisor) => values[0]! % divisor === 0).length);
    case "COMPARE": return values[0]! < values[1]! ? "<" : values[0]! > values[1]! ? ">" : "=";
    case "MEMBER": return Number.isInteger(values[0]!) && values[0]! >= 0 ? "CÓ" : "KHÔNG";
    case "POWER": return String(values[0]! ** values[1]!);
    case "POWER_PRODUCT": return String(values[0]! ** (values[1]! + values[2]!));
    case "POWER_QUOTIENT": return String(values[0]! ** (values[1]! - values[2]!));
    case "FRACTION_SCALE_NUMERATOR": return String(values[0]! * values[2]!);
    case "FRACTION_DISTRIBUTE": return rational(values[0]! * (values[2]! + values[3]!), values[1]! * values[4]!);
    case "DECIMAL_DISTRIBUTE": return decimal(values[0]! * (values[1]! + values[2]!), 2);
    case "REMAINDER": return String(values[0]! % values[1]!);
    case "OPPOSITE": return String(-values[0]!);
    case "SIGNED_DECIMAL_OPPOSITE": return decimal(-values[0]!, 1);
    case "SIGNED_DECIMAL_COMPARE": return values[0]! < values[1]! ? "<" : values[0]! > values[1]! ? ">" : "=";
    case "INTEGER_MEMBER": return Number.isInteger(values[0]!) ? "CÓ" : "KHÔNG";
    case "FINAL_SIGNED_CONTEXT": return String(values[0]! + values[1]!);
    case "GCD": return String(gcd(values[0]!, values[1]!));
    case "MIXED_TO_NUMERATOR": return String(values[0]! * values[2]! + values[1]!);
    case "FRACTION_EQUAL": return values[0]! * values[3]! === values[2]! * values[1]! ? "CÓ" : "KHÔNG";
    case "NORMALIZE_SIGN": return rational(values[0]!, values[1]!);
    case "PERCENT_VALUE": return decimal(values[0]! * values[1]!, 2);
    case "PERCENT_INVERSE": return String(values[0]! * 100 / values[1]!);
    case "PERCENT_RATIO": return String(values[0]! * 100 / values[1]!);
    case "SAMPLE_SPACE_COUNT": return String(values.reduce((product, value) => product * value, 1));
    case "DATA_VALID": return values.every((value) => Number.isInteger(value) && value >= 0 && value <= values[0]!) ? "HỢP LÍ" : "KHÔNG HỢP LÍ";
    case "LOOKUP": return s(payload)[values[0]!]!;
    default: throw new Error(`WAVE_K_G5_G6_ORACLE_KIND_UNSUPPORTED:${op(payload)}`);
  }
}

function payloadFor(family: string, ordinal: number): Payload {
  const i = ordinal - 1;
  const a = i + 2;
  switch (family) {
    case "AREA_UNIT_IDENTITY_CONVERSION": return { op: "SCALE_INTEGER", values: [a, i % 2 ? 10_000 : 100] };
    case "DIMENSIONAL_MOTION_EXACT": return i < 3 ? { op: "MULTIPLY", values: [12 + 3 * i, 2 + i] } : { op: "DIVIDE_INTEGER", values: [(20 + i) * (i - 1), i - 1] };
    case "DIMENSIONAL_MEASUREMENT_CONTEXT": return i < 3 ? { op: "BOX_VOLUME", values: [a, a + 1, a + 2] } : { op: "SCALE_INTEGER", values: [a, 60] };
    case "VELOCITY_UNIT_IDENTITY": return i < 3 ? { op: "KMH_TO_MS", values: [18 * a] } : { op: "MS_TO_KMH", values: [5 * a] };
    case "CIRCLE_MEASURE_DECLARED_PI": return i < 3 ? { op: "CIRCLE_CIRCUMFERENCE", values: [22, 7 * a, 7] } : { op: "CIRCLE_AREA", values: [22, 7 * a, 7] };
    case "TRIANGLE_TRAPEZOID_AREA": return i < 3 ? { op: "TRIANGLE_AREA", values: [2 * a, a + 3] } : { op: "TRAPEZOID_AREA", values: [a, a + 2, 2 * a] };
    case "RECTANGULAR_SOLID_MEASURE": return i < 3 ? { op: "BOX_VOLUME", values: [a, a + 1, a + 2] } : { op: "BOX_SURFACE", values: [a, a + 1, a + 2] };
    case "NATURAL_REPRESENT_COMPARE_ORDER": return i < 3
      ? { op: "MAX", values: [1200 + 31 * i, 1020 + 47 * i, 1100 + 23 * i] }
      : { op: "PLACE_VALUE", values: [123456 + 11111 * i, i % 4] };
    case "NATURAL_OPERATION_AST": return { op: i < 3 ? "MIXED_AST" : "DISTRIBUTE", values: i < 3 ? [20 + i, 4 + i, 3, 5] : [a, a + 3, a + 5] };
    case "NATURAL_PROPERTY_REWRITE": return { op: "DISTRIBUTE", values: [a, a + 3, a + 5] };
    case "NATURAL_POWER_PROPERTY_REWRITE": return { op: i < 3 ? "POWER_PRODUCT" : "POWER_QUOTIENT", values: i < 3 ? [a, 2, 1 + i] : [a, 5, 2] };
    case "DECIMAL_PROPERTY_REWRITE": return { op: "DECIMAL_DISTRIBUTE", values: [12 + i, 15 + i, 25 - i] };
    case "FRACTION_PROPERTY_REWRITE": return { op: "FRACTION_DISTRIBUTE", values: [a, a + 1, 1, 2, a + 3] };
    case "APPLIED_FRACTION_RATIONAL": return { op: i < 3 ? "RATIONAL_ADD" : "RATIONAL_SUB", values: i < 3 ? [1, a + 2, 1, (a + 2) * 2] : [3, a + 3, 1, a + 3] };
    case "DECIMAL_FRACTION_MIXED_REPRESENTATION": return i < 3
      ? { op: "DECIMAL_FROM_FRACTION", values: [a * 5, 1, 2] }
      : { op: "DECIMAL_MIXED", values: [10 * a + i - 2] };
    case "SCALED_DECIMAL_ROUNDING":
    case "SCALED_DECIMAL_ESTIMATE_ROUND": return { op: "ROUND_SCALED", values: [12345 + 137 * i, 3, i % 3] };
    case "MAP_SCALE_RATIO": return i < 3 ? { op: "SCALE_INTEGER", values: [a, 500] } : { op: "DIVIDE_INTEGER", values: [a * 1000, 500] };
    case "DECIMAL_POWER_OF_TEN_SCALE": return i < 3 ? { op: "DECIMAL_SCALE", values: [123 + 11 * i, 10, 2] } : { op: "DECIMAL_UNSCALE", values: [(230 + 10 * i) * 10, 10, 2] };
    case "DECIMAL_ORDER_UP_TO_FOUR": return { op: "DECIMAL_ORDER_KTH", values: [125 + i, 98 + 2 * i, 140 - i, 111 + 3 * i, i < 3 ? 0 : 2] };
    case "EMPIRICAL_FREQUENCY_RATIO":
    case "EMPIRICAL_PROBABILITY_FRACTION": return { op: "RATIO", values: [a, 2 * a + 3] };
    case "DATA_CLASSIFY_COMPARE_ORDER": return { op: i < 3 ? "COUNT_MATCH" : "MAX", values: i < 3 ? [2, a, a + 1, a + 2, a + 3] : [a, a + 7, a + 3, a + 5] };
    case "REGULAR_SHAPE_PROPERTY_ENUM": return i < 3
      ? { op: "LOOKUP", values: [i], labels: ["3", "4", "6"] }
      : { op: "LOOKUP", values: [i - 3], labels: ["TAM GIÁC ĐỀU", "HÌNH VUÔNG", "LỤC GIÁC ĐỀU"] };
    case "QUADRILATERAL_PROPERTY_ENUM": return { op: "LOOKUP", values: [i % 3], labels: ["HÌNH CHỮ NHẬT", "HÌNH THOI", "HÌNH THANG CÂN"] };
    case "SEGMENT_MIDPOINT_LENGTH_EXACT": return { op: i < 3 ? "SEGMENT_LENGTH" : "MIDPOINT", values: [2 * i, 2 * i + 8] };
    case "ANGLE_BAND_CLASSIFICATION": return { op: "ANGLE_CLASS", values: [[35, 90, 120, 55, 145, 180][i]!] };
    case "COORDINATE_COLLINEARITY": return { op: "COLLINEAR", values: i % 2 === 0 ? [0, 0, 1, 1, 2 + i, 2 + i] : [0, 0, 1, 2, 2 + i, 5 + i] };
    case "COORDINATE_BETWEENNESS": return { op: "BETWEEN", values: i % 2 === 0 ? [i, i + 2, i + 5] : [i + 2, i, i + 5] };
    case "ANGLE_MEASURE_EXACT": return { op: i < 3 ? "ANGLE_COMPLEMENT" : "ANGLE_SUPPLEMENT", values: [20 + 10 * i] };
    case "POINT_LINE_INCIDENCE": return { op: "INCIDENCE", values: i % 2 === 0 ? [a, 2 * a + 1, 2, 1] : [a, 2 * a + 2, 2, 1] };
    case "ROMAN_NUMERAL_CODEC_1_TO_30": return i < 3 ? { op: "ROMAN", values: [romanPairs[i]![0]] } : { op: "ROMAN_INVERSE", values: [], labels: [romanPairs[i]![1]] };
    case "NATURAL_DECIMAL_PLACE_REPRESENTATION": return { op: "PLACE_VALUE", values: [123456 + 11111 * i, i % 4] };
    case "DIVISIBILITY_DIGIT_RULES": return { op: "DIVISOR_COUNT", values: [120 + 15 * i, 2, 3, 5, 9] };
    case "APPLIED_NATURAL_OPERATION_AST": return { op: i < 3 ? "SUBTRACT" : "MULTIPLY", values: i < 3 ? [100 + 20 * i, 35 + i] : [a + 5, a + 2] };
    case "NATURAL_ORDER_COMPARE":
    case "INTEGER_ORDER_RELATION": return { op: "COMPARE", values: i < 3 ? [a, a + 1] : [-a, -(a + 1)] };
    case "SIGNED_DECIMAL_ORDER": return { op: "SIGNED_DECIMAL_COMPARE", values: i < 3 ? [10 * a + 2, 10 * a + 7] : [-(10 * a + 2), -(10 * a + 7)] };
    case "NATURAL_SET_MEMBERSHIP": return { op: "MEMBER", values: [i % 2 === 0 ? a : -a] };
    case "OPERATION_PRECEDENCE_AST": return { op: "MIXED_AST", values: [a, a + 1, 2 + i % 2, i] };
    case "SAME_BASE_POWER_PRODUCT_QUOTIENT": return { op: i < 3 ? "POWER_PRODUCT" : "POWER_QUOTIENT", values: i < 3 ? [2 + i, 2, 3] : [2 + i, 5, 2] };
    case "SET_NOTATION_MEMBERSHIP": return { op: "LOOKUP", values: [i % 2], labels: ["THUỘC", "KHÔNG THUỘC"] };
    case "NATURAL_POWER_EXACT": return { op: "POWER", values: [2 + i, 2 + i % 3] };
    case "NATURAL_DIVISIBILITY_RELATION":
    case "INTEGER_DIVISIBILITY_RELATION": return { op: "DIVISOR_COUNT", values: [36 + 6 * i, 2, 3, 4, 5, 6] };
    case "EUCLIDEAN_DIVISION_REMAINDER": return { op: "REMAINDER", values: [37 + 7 * i, 5 + i] };
    case "INTEGER_OPPOSITE": return { op: "OPPOSITE", values: [i % 2 ? -a : a] };
    case "SIGNED_DECIMAL_OPPOSITE": return { op: "SIGNED_DECIMAL_OPPOSITE", values: [i % 2 ? -(10 * a + 5) : 10 * a + 5] };
    case "INTEGER_SET_REPRESENTATION": return { op: "INTEGER_MEMBER", values: [i % 2 ? a + 0.5 : -a] };
    case "SIGNED_CONTEXT_INTERPRETATION": return { op: "FINAL_SIGNED_CONTEXT", values: [-5 - i, i < 3 ? a : -a] };
    case "APPLIED_NUMBER_THEORY": return { op: "GCD", values: [24 + 6 * i, 36 + 6 * i] };
    case "APPLIED_INTEGER_AST": return { op: i < 3 ? "ADD" : "SUBTRACT", values: [-10 - i, i < 3 ? 4 + i : -3 - i] };
    case "FRACTION_PROPERTY_IDENTITY": return { op: "FRACTION_SCALE_NUMERATOR", values: [a, a + 3, 2 + i % 3] };
    case "POSITIVE_MIXED_NUMBER_REPRESENTATION": return { op: "MIXED_TO_NUMERATOR", values: [a, i + 1, a + 3] };
    case "FRACTION_EQUALITY_CROSS_PRODUCT": return { op: "FRACTION_EQUAL", values: i % 2 === 0 ? [a, a + 1, 2 * a, 2 * (a + 1)] : [a, a + 1, 2 * a + 1, 2 * (a + 1)] };
    case "SIGNED_FRACTION_NORMALIZATION": return { op: "NORMALIZE_SIGN", values: i % 2 ? [a, -(a + 1)] : [-a, a + 1] };
    case "FRACTION_OPPOSITE": return { op: "RATIONAL_OPPOSITE", values: [i % 2 ? -a : a, a + 3] };
    case "FRACTION_ORDER_CROSS_PRODUCT": return { op: "RATIONAL_COMPARE", values: [a, a + 2, a + 1, a + 4] };
    case "PERCENT_VALUE_AND_INVERSE": return i < 3 ? { op: "PERCENT_VALUE", values: [20 + 10 * i, 25 + 5 * i] } : { op: "PERCENT_INVERSE", values: [20 + 10 * i, 10 + 5 * i] };
    case "RATIO_PERCENT_EXACT": return { op: "PERCENT_RATIO", values: [a, 2 * a] };
    case "FINITE_SAMPLE_SPACE_MODEL": return { op: "SAMPLE_SPACE_COUNT", values: i < 3 ? [2, a] : [2, 2, a] };
    case "DATA_REASONABLENESS_CONSTRAINT": return { op: "DATA_VALID", values: i % 2 === 0 ? [20, 3 + i, 7 + i, 10] : [20, 3, 22 + i, 4] };
    default: throw new Error(`WAVE_K_G5_G6_TEMPLATE_UNSUPPORTED:${family}`);
  }
}

const answerTypeFor = (family: string, payload: Payload): AnswerType => {
  const kind = op(payload);
  if (kind === "RATIONAL_COMPARE") return "SINGLE_CHOICE";
  if (kind.startsWith("RATIONAL") || kind === "RATIO" || kind === "NORMALIZE_SIGN" || kind === "FRACTION_DISTRIBUTE") return "RATIONAL_INPUT";
  if (["DECIMAL_FROM_FRACTION", "ROUND_SCALED", "DECIMAL_SCALE", "DECIMAL_UNSCALE", "PERCENT_VALUE", "DECIMAL_ORDER_KTH", "DECIMAL_DISTRIBUTE", "SIGNED_DECIMAL_OPPOSITE"].includes(kind)) return "DECIMAL_INPUT";
  if (["LOOKUP", "ANGLE_CLASS", "COLLINEAR", "BETWEEN", "INCIDENCE", "ROMAN", "COMPARE", "SIGNED_DECIMAL_COMPARE", "MEMBER", "INTEGER_MEMBER", "FRACTION_EQUAL", "DATA_VALID", "DECIMAL_MIXED"].includes(kind)) return "SINGLE_CHOICE";
  if (["CIRCLE_CIRCUMFERENCE", "CIRCLE_AREA", "TRIANGLE_AREA", "TRAPEZOID_AREA"].includes(kind) && solveOracle(payload).includes("/")) return "RATIONAL_INPUT";
  void family;
  return "INTEGER_INPUT";
};

function optionsFor(family: string, answerType: AnswerType, exactAnswer: string): readonly string[] | null {
  if (answerType !== "SINGLE_CHOICE") return null;
  const families: Readonly<Record<string, readonly string[]>> = {
    REGULAR_SHAPE_PROPERTY_ENUM: ["3", "4", "6"].includes(exactAnswer)
      ? ["3", "4", "6"]
      : ["TAM GIÁC ĐỀU", "HÌNH VUÔNG", "LỤC GIÁC ĐỀU"],
    QUADRILATERAL_PROPERTY_ENUM: ["HÌNH CHỮ NHẬT", "HÌNH THOI", "HÌNH THANG CÂN"],
    ANGLE_BAND_CLASSIFICATION: ["GÓC NHỌN", "GÓC VUÔNG", "GÓC TÙ", "GÓC BẸT"],
    SET_NOTATION_MEMBERSHIP: ["THUỘC", "KHÔNG THUỘC"],
  };
  const semantic = families[family]
    ?? (["<", ">", "="].includes(exactAnswer) ? ["<", ">", "=", "KHÔNG SO SÁNH ĐƯỢC"]
      : ["CÓ", "KHÔNG"].includes(exactAnswer) ? ["CÓ", "KHÔNG"]
        : ["THUỘC", "KHÔNG THUỘC"].includes(exactAnswer) ? ["THUỘC", "KHÔNG THUỘC"]
          : ["HỢP LÍ", "KHÔNG HỢP LÍ"].includes(exactAnswer) ? ["HỢP LÍ", "KHÔNG HỢP LÍ"]
            : [exactAnswer, `${exactAnswer}I`, `${exactAnswer}X`]);
  return [...new Set(semantic.map((option) => option.normalize("NFC")))];
}

function promptFor(family: string, ordinal: number, payload: Payload): string {
  const values = n(payload);
  const direct = ordinal <= 3;
  const shown = values.join(", ");
  const prompts: Readonly<Record<string, string>> = {
    AREA_UNIT_IDENTITY_CONVERSION: `Đổi ${values[0]} ${values[1] === 100 ? "km² sang ha" : "ha sang m²"}.`,
    DIMENSIONAL_MOTION_EXACT: direct ? `Một chuyển động đều có vận tốc ${values[0]} km/h trong ${values[1]} giờ. Tính quãng đường (km).` : `Một chuyển động đều đi ${values[0]} km trong ${values[1]} giờ. Tính vận tốc (km/h).`,
    DIMENSIONAL_MEASUREMENT_CONTEXT: direct ? `Một hộp chữ nhật dài ${values[0]} dm, rộng ${values[1]} dm, cao ${values[2]} dm. Tính thể tích (dm³).` : `Một khoảng thời gian dài ${values[0]} phút. Đổi sang giây.`,
    VELOCITY_UNIT_IDENTITY: direct ? `Đổi ${values[0]} km/h sang m/s.` : `Đổi ${values[0]} m/s sang km/h.`,
    CIRCLE_MEASURE_DECLARED_PI: direct ? `Cho đường tròn bán kính ${values[1]} cm và π = 22/7. Tính chu vi (cm).` : `Cho đường tròn bán kính ${values[1]} cm và π = 22/7. Tính diện tích (cm²).`,
    TRIANGLE_TRAPEZOID_AREA: direct ? `Tam giác có đáy ${values[0]} cm và chiều cao ${values[1]} cm. Tính diện tích (cm²).` : `Hình thang có hai đáy ${values[0]} cm, ${values[1]} cm và chiều cao ${values[2]} cm. Tính diện tích (cm²).`,
    RECTANGULAR_SOLID_MEASURE: direct ? `Hộp chữ nhật có ba kích thước ${values.join(" cm, ")} cm. Tính thể tích (cm³).` : `Hộp chữ nhật có ba kích thước ${values.join(" cm, ")} cm. Tính diện tích toàn phần (cm²).`,
    NATURAL_REPRESENT_COMPARE_ORDER: direct
      ? `Trong ba số ${shown}, hãy viết số lớn nhất.`
      : `Trong số ${values[0]}, giá trị của chữ số ở hàng 10^${values[1]} là bao nhiêu?`,
    NATURAL_OPERATION_AST: direct ? `Tính (${values[0]} + ${values[1]}) × ${values[2]} − ${values[3]}.` : `Tính hợp lí ${values[0]} × (${values[1]} + ${values[2]}).`,
    NATURAL_PROPERTY_REWRITE: `Dùng tính chất phân phối để tính ${values[0]} × (${values[1]} + ${values[2]}).`,
    APPLIED_FRACTION_RATIONAL: direct ? `Một bình có ${values[0]}/${values[1]} lít, thêm ${values[2]}/${values[3]} lít. Có tất cả bao nhiêu lít?` : `Một đoạn dài ${values[0]}/${values[1]} m, cắt đi ${values[2]}/${values[3]} m. Còn bao nhiêu mét?`,
    DECIMAL_FRACTION_MIXED_REPRESENTATION: direct
      ? `Viết phân số thập phân ${values[0]}/${10 ** values[1]} dưới dạng số thập phân có ${values[2]} chữ số sau dấu phẩy.`
      : `Viết phân số thập phân ${values[0]}/10 dưới dạng hỗn số tối giản.`,
    SCALED_DECIMAL_ROUNDING: `Số ${decimal(values[0], values[1])}; làm tròn đến ${values[2] === 0 ? "số tự nhiên gần nhất" : `${values[2]} chữ số thập phân`}.`,
    MAP_SCALE_RATIO: direct ? `Bản đồ tỉ lệ 1:500, đoạn đo được ${values[0]} cm. Tính khoảng cách thật (cm).` : `Bản đồ tỉ lệ 1:500, khoảng cách thật ${values[0]} cm. Tính độ dài trên bản đồ (cm).`,
    DECIMAL_POWER_OF_TEN_SCALE: direct ? `Tính ${decimal(values[0], values[2])} × 10.` : `Tính ${decimal(values[0], values[2])} ÷ 10.`,
    DECIMAL_ORDER_UP_TO_FOUR: `Sắp xếp ${values.slice(0, 4).map((v) => decimal(v, 2)).join(", ")} từ bé đến lớn. Viết số đứng thứ ${values[4]! + 1}.`,
    DECIMAL_PROPERTY_REWRITE: `Dùng tính chất phân phối để tính ${decimal(values[0], 1)} × (${decimal(values[1], 1)} + ${decimal(values[2], 1)}).`,
    EMPIRICAL_FREQUENCY_RATIO: `Một khả năng xuất hiện ${values[0]} lần trong ${values[1]} lần thử. Viết tỉ số số lần xuất hiện trên tổng số lần thử.`,
    DATA_CLASSIFY_COMPARE_ORDER: direct ? `Với dãy ${values.slice(1).join(", ")}, có bao nhiêu số chia hết cho ${values[0]}?` : `Trong dãy ${shown}, số lớn nhất là bao nhiêu?`,
    REGULAR_SHAPE_PROPERTY_ENUM: direct
      ? `Số cạnh của ${["tam giác đều", "hình vuông", "lục giác đều"][values[0]!] } là bao nhiêu?`
      : `Hình đều nào có ${[3, 4, 6][values[0]!]} cạnh?`,
    QUADRILATERAL_PROPERTY_ENUM: direct
      ? `Hình nào có ${["bốn góc vuông và hai cạnh kề dài khác nhau", "bốn cạnh bằng nhau và có một góc không vuông", "đúng một cặp cạnh đối song song và hai cạnh bên bằng nhau"][values[0]!] }?`
      : `Một tấm bìa có ${["bốn góc vuông, hai cạnh kề không bằng nhau", "bốn cạnh bằng nhau, ít nhất một góc không vuông", "chính xác một cặp cạnh đối song song, hai cạnh bên bằng nhau"][values[0]!] }. Gọi tên dạng tứ giác duy nhất thỏa các điều kiện.`,
    SEGMENT_MIDPOINT_LENGTH_EXACT: direct ? `Trên trục số, A ở ${values[0]} và B ở ${values[1]}. Tính độ dài AB.` : `Trên trục số, A ở ${values[0]} và B ở ${values[1]}. Tìm tọa độ trung điểm.`,
    ANGLE_BAND_CLASSIFICATION: `Góc có số đo ${values[0]}°. Phân loại góc.`,
    COORDINATE_COLLINEARITY: `Ba điểm A(${values[0]},${values[1]}), B(${values[2]},${values[3]}), C(${values[4]},${values[5]}) có thẳng hàng không?`,
    COORDINATE_BETWEENNESS: `Trên trục số, A=${values[0]}, B=${values[1]}, C=${values[2]}. B có nằm giữa A và C không?`,
    ANGLE_MEASURE_EXACT: direct ? `Hai góc phụ nhau, một góc bằng ${values[0]}°. Tính góc còn lại.` : `Hai góc bù nhau, một góc bằng ${values[0]}°. Tính góc còn lại.`,
    POINT_LINE_INCIDENCE: `Điểm P(${values[0]},${values[1]}) có thuộc đường thẳng y=${values[2]}x+${values[3]} không?`,
    ROMAN_NUMERAL_CODEC_1_TO_30: direct ? `Viết số ${values[0]} bằng chữ số La Mã.` : `Viết ${s(payload)[0]} bằng số tự nhiên.`,
    NATURAL_DECIMAL_PLACE_REPRESENTATION: `Trong số ${values[0]}, giá trị của chữ số ở hàng 10^${values[1]} là bao nhiêu?`,
    DIVISIBILITY_DIGIT_RULES: `Trong các số 2, 3, 5, 9, có bao nhiêu số là ước của ${values[0]}?`,
    APPLIED_NATURAL_OPERATION_AST: direct ? `Có ${values[0]} sản phẩm, bán ${values[1]}. Còn bao nhiêu sản phẩm?` : `Có ${values[0]} hộp, mỗi hộp ${values[1]} sản phẩm. Có tất cả bao nhiêu?`,
    NATURAL_ORDER_COMPARE: `Điền dấu <, > hoặc =: ${values[0]} __ ${values[1]}.`,
    NATURAL_SET_MEMBERSHIP: `${values[0]} có thuộc tập hợp số tự nhiên (gồm 0) không?`,
    OPERATION_PRECEDENCE_AST: `Tính theo đúng thứ tự: (${values[0]} + ${values[1]}) × ${values[2]} − ${values[3]}.`,
    SAME_BASE_POWER_PRODUCT_QUOTIENT: direct ? `Tính ${values[0]}^${values[1]} × ${values[0]}^${values[2]}.` : `Tính ${values[0]}^${values[1]} ÷ ${values[0]}^${values[2]}.`,
    SET_NOTATION_MEMBERSHIP: `Cho A={2,4,6,${10 + ordinal}}. Số ${ordinal % 2 ? 4 : 5} có quan hệ nào với A?`,
    NATURAL_POWER_EXACT: `Tính ${values[0]}^${values[1]}.`,
    NATURAL_DIVISIBILITY_RELATION: `Trong các số ${values.slice(1).join(", ")}, có bao nhiêu ước của ${values[0]}?`,
    NATURAL_POWER_PROPERTY_REWRITE: direct
      ? `Dùng quy tắc lũy thừa để tính ${values[0]}^${values[1]} × ${values[0]}^${values[2]}.`
      : `Dùng quy tắc lũy thừa để tính ${values[0]}^${values[1]} ÷ ${values[0]}^${values[2]}.`,
    EUCLIDEAN_DIVISION_REMAINDER: `Tìm số dư khi chia ${values[0]} cho ${values[1]}.`,
    INTEGER_OPPOSITE: `Tìm số đối của ${values[0]}.`,
    INTEGER_SET_REPRESENTATION: `${values[0]} có thuộc tập hợp số nguyên không?`,
    INTEGER_ORDER_RELATION: `Điền dấu <, > hoặc =: ${values[0]} __ ${values[1]}.`,
    SIGNED_CONTEXT_INTERPRETATION: `Nhiệt độ ban đầu ${values[0]}°C, thay đổi ${values[1]}°C. Nhiệt độ cuối là bao nhiêu °C?`,
    APPLIED_NUMBER_THEORY: `Có ${values[0]} vật loại A và ${values[1]} vật loại B. Chia thành nhiều nhóm giống nhau nhất, không dư. Có thể chia tối đa bao nhiêu nhóm?`,
    APPLIED_INTEGER_AST: direct ? `Số dư là ${values[0]}, thay đổi ${values[1]}. Số dư mới là bao nhiêu?` : `Tính hiệu ${values[0]} − (${values[1]}).`,
    FRACTION_PROPERTY_IDENTITY: `Dùng tính chất cơ bản của phân số: ${values[0]}/${values[1]} = ?/${values[1]! * values[2]!}. Tìm tử số còn thiếu.`,
    POSITIVE_MIXED_NUMBER_REPRESENTATION: `Hỗn số ${values[0]} ${values[1]}/${values[2]} có tử số của phân số đổi được là bao nhiêu?`,
    FRACTION_EQUALITY_CROSS_PRODUCT: `Hai phân số ${values[0]}/${values[1]} và ${values[2]}/${values[3]} có bằng nhau không?`,
    SIGNED_FRACTION_NORMALIZATION: `Chuẩn hóa dấu và rút gọn phân số ${values[0]}/${values[1]}.`,
    INTEGER_DIVISIBILITY_RELATION: `Trong các số ${values.slice(1).join(", ")}, có bao nhiêu ước của số nguyên ${values[0]}?`,
    FRACTION_OPPOSITE: `Tìm số đối của phân số ${values[0]}/${values[1]}.`,
    FRACTION_ORDER_CROSS_PRODUCT: `Điền dấu <, > hoặc =: ${values[0]}/${values[1]} __ ${values[2]}/${values[3]}.`,
    FRACTION_PROPERTY_REWRITE: `Dùng tính chất phân phối để tính ${values[0]}/${values[1]} × (${values[2]}/${values[4]} + ${values[3]}/${values[4]}).`,
    SIGNED_DECIMAL_OPPOSITE: `Tìm số đối của ${decimal(values[0], 1)}.`,
    SIGNED_DECIMAL_ORDER: `Điền dấu <, > hoặc =: ${decimal(values[0], 1)} __ ${decimal(values[1], 1)}.`,
    SCALED_DECIMAL_ESTIMATE_ROUND: `Số ${decimal(values[0], values[1])}; làm tròn đến ${values[2] === 0 ? "số tự nhiên" : `${values[2]} chữ số thập phân`}.`,
    PERCENT_VALUE_AND_INVERSE: direct ? `Tính ${values[1]}% của ${values[0]}.` : `${values[1]}% của một số bằng ${values[0]}. Tìm số đó.`,
    RATIO_PERCENT_EXACT: `${values[0]} bằng bao nhiêu phần trăm của ${values[1]}?`,
    FINITE_SAMPLE_SPACE_MODEL: `Một thí nghiệm có số lựa chọn độc lập ở từng bước là ${values.join(" và ")}. Có bao nhiêu kết quả trong không gian mẫu?`,
    DATA_REASONABLENESS_CONSTRAINT: `Cỡ mẫu là ${values[0]}; các tần số công khai là ${values.slice(1).join(", ")}. Dữ liệu có hợp lí theo điều kiện mỗi tần số là số nguyên từ 0 đến cỡ mẫu không?`,
    EMPIRICAL_PROBABILITY_FRACTION: `Một biến cố xuất hiện ${values[0]} lần trong ${values[1]} phép thử. Viết xác suất thực nghiệm dạng phân số tối giản.`,
  };
  const prompt = prompts[family];
  if (!prompt) throw new Error(`WAVE_K_G5_G6_PROMPT_UNSUPPORTED:${family}`);
  return prompt.normalize("NFC");
}

const outcomePromptContext: Readonly<Record<string, string>> = {
  "MOET2018-G5-NUM-P040-001": "Khi đọc, viết và xếp thứ tự số tự nhiên lớp 5,",
  "MOET2018-G6-NAA-P047-002": "Khi biểu diễn số tự nhiên trong hệ thập phân lớp 6,",
  "MOET2018-G5-NUM-P040-003": "Trong bài luyện bốn phép tính số tự nhiên lớp 5,",
  "MOET2018-G6-NAA-P047-011": "Trong tập hợp số tự nhiên lớp 6,",
  "MOET2018-G5-NUM-P040-004": "Khi vận dụng tính chất số tự nhiên để tính nhẩm ở lớp 5,",
  "MOET2018-G6-NAA-P047-016": "Khi kiểm chứng tính phân phối trong tập số tự nhiên lớp 6,",
  "MOET2018-G5-NUM-P041-006": "Trong bài toán phân số nhiều bước lớp 5,",
  "MOET2018-G6-NAA-P049-031": "Trong tình huống vận dụng phân số lớp 6,",
  "MOET2018-G5-NUM-P042-016": "Theo yêu cầu làm tròn số thập phân lớp 5,",
  "MOET2018-G6-NAA-P050-048": "Theo yêu cầu ước lượng số thập phân lớp 6,",
  "MOET2018-G5-NUM-P042-023": "Khi tính hợp lí với số thập phân lớp 5,",
  "MOET2018-G6-NAA-P050-051": "Khi áp dụng quy tắc dấu ngoặc với số thập phân lớp 6,",
  "MOET2018-G6-NAA-P047-005": "Trong thứ tự của tập số tự nhiên,",
  "MOET2018-G6-NAA-P048-022": "Trong thứ tự của tập số nguyên,",
};

function contextualPrompt(outcomeId: string, family: string, ordinal: number, payload: Payload) {
  const prompt = promptFor(family, ordinal, payload);
  const context = outcomePromptContext[outcomeId];
  return context ? `${context} ${prompt}`.normalize("NFC") : prompt;
}

const producible = waveKClassificationsG5G6.filter(
  (decision) => decision.classification === "PRODUCIBLE_DETERMINISTIC",
);

export const waveKCaseSeedsG5G6: readonly WaveKCaseSeed[] = producible.flatMap((decision) =>
  Array.from({ length: 6 }, (_, index): WaveKCaseSeed => {
    const ordinal = index + 1;
    const family = decision.templateFamily!;
    const payload = payloadFor(family, ordinal);
    const exactAnswer = solveOracle(payload);
    return {
      outcomeId: decision.outcomeId,
      grade: decision.grade,
      ordinal,
      structureTag: `${family}-${ordinal <= 3 ? "DIRECT" : "TRANSFER"}`,
      difficulty: ordinal <= 2 ? "FOUNDATIONAL" : "CORE",
      answerType: answerTypeFor(family, payload),
      prompt: contextualPrompt(decision.outcomeId, family, ordinal, payload),
      options: optionsFor(family, answerTypeFor(family, payload), exactAnswer),
      exactAnswer,
      explanationSteps: [
        `Xác định dữ kiện công khai theo cấu trúc ${family}.`,
        `Áp dụng quy tắc chính xác ${op(payload)} cho các dữ kiện đã cho.`,
        `Kết quả kiểm chứng độc lập là ${exactAnswer}.`,
      ],
      oracle: { kind: "WAVE_K_G5_G6_EXACT_V1", payload },
    };
  }),
);

export function verifyWaveKCasesG5G6(): readonly string[] {
  const errors: string[] = [];
  const byOutcome = Object.groupBy(waveKCaseSeedsG5G6, (seed) => seed.outcomeId);
  const publicForms = waveKCaseSeedsG5G6.map((seed) =>
    `${seed.prompt}|${seed.options?.join("|") ?? ""}`.normalize("NFC"),
  );
  if (producible.length !== 66) errors.push(`PRODUCIBLE_DECISION_COUNT:${producible.length}`);
  if (waveKCaseSeedsG5G6.length !== 396) errors.push(`CASE_COUNT:${waveKCaseSeedsG5G6.length}`);
  if (new Set(publicForms).size !== publicForms.length) errors.push(`GLOBAL_PUBLIC_FORM_COLLISION:${publicForms.length - new Set(publicForms).size}`);
  for (const decision of producible) {
    const cases = byOutcome[decision.outcomeId] ?? [];
    if (cases.length !== 6) errors.push(`POOL_SIZE:${decision.outcomeId}:${cases.length}`);
    if (new Set(cases.map((seed) => seed.structureTag)).size < 2) errors.push(`STRUCTURE_DEPTH:${decision.outcomeId}`);
    if (new Set(cases.map((seed) => seed.prompt)).size < 3) errors.push(`PUBLIC_FORM_DEPTH:${decision.outcomeId}`);
  }
  for (const seed of waveKCaseSeedsG5G6) {
    if (seed.oracle.kind !== "WAVE_K_G5_G6_EXACT_V1") errors.push(`ORACLE_KIND:${seed.outcomeId}:${seed.ordinal}`);
    let recomputed: string;
    try { recomputed = solveOracle(seed.oracle.payload); }
    catch (error) { errors.push(`ORACLE_FAILURE:${seed.outcomeId}:${seed.ordinal}:${String(error)}`); continue; }
    if (recomputed !== seed.exactAnswer) errors.push(`ANSWER_MISMATCH:${seed.outcomeId}:${seed.ordinal}`);
    if (seed.answerType === "SINGLE_CHOICE") {
      if (!seed.options?.includes(seed.exactAnswer)) errors.push(`OPTION_ANSWER_MISSING:${seed.outcomeId}:${seed.ordinal}`);
      if (new Set(seed.options ?? []).size !== (seed.options?.length ?? 0)) errors.push(`OPTION_DUPLICATE:${seed.outcomeId}:${seed.ordinal}`);
      if (seed.options?.some((option) => option !== option.normalize("NFC"))) errors.push(`OPTION_NON_NFC:${seed.outcomeId}:${seed.ordinal}`);
    } else if (seed.options !== null) errors.push(`UNEXPECTED_OPTIONS:${seed.outcomeId}:${seed.ordinal}`);
    if (seed.prompt !== seed.prompt.normalize("NFC")) errors.push(`NON_NFC:${seed.outcomeId}:${seed.ordinal}`);
    if (/[<>](?:script|img|iframe|svg)|javascript:|https?:\/\//iu.test(seed.prompt)) errors.push(`UNSAFE_OR_REMOTE_PROMPT:${seed.outcomeId}:${seed.ordinal}`);
    if (!seed.explanationSteps.at(-1)?.endsWith(`${seed.exactAnswer}.`)) errors.push(`EXPLANATION_MISMATCH:${seed.outcomeId}:${seed.ordinal}`);
  }
  return errors;
}
