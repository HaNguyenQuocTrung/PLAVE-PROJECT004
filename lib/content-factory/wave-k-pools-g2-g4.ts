import { waveKClassificationsG2G4 } from "./wave-k-classifications-g2-g4.ts";
import type { WaveKCaseSeed, WaveKClassificationDecision } from "./wave-k-types.ts";

type Payload = WaveKCaseSeed["oracle"]["payload"];
type BuiltCase = Readonly<{
  tag: string;
  prompt: string;
  answer: string;
  answerType?: WaveKCaseSeed["answerType"];
  options?: readonly string[];
  kind: string;
  payload: Payload;
  explanation: readonly string[];
}>;

const difficulty = (ordinal: number): WaveKCaseSeed["difficulty"] => ordinal <= 2 ? "FOUNDATIONAL" : "CORE";
const tags = ["DIRECT", "INVERSE", "CONTEXT"] as const;
const relation = (a: number, b: number) => a < b ? "<" : a > b ? ">" : "=";
const modality = (favorable: number, total: number) => favorable === 0 ? "không thể" : favorable === total ? "chắc chắn" : "có thể";
const monthNames = ["tháng Một", "tháng Hai", "tháng Ba", "tháng Tư", "tháng Năm", "tháng Sáu", "tháng Bảy", "tháng Tám", "tháng Chín", "tháng Mười", "tháng Mười Một", "tháng Mười Hai"] as const;
const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"] as const;

function seed(decision: WaveKClassificationDecision, ordinal: number, built: BuiltCase): WaveKCaseSeed {
  const answerType = built.answerType ?? (/^-?\d+$/u.test(built.answer) ? "INTEGER_INPUT" : "SINGLE_CHOICE");
  const choiceSets: Readonly<Record<string, readonly string[]>> = {
    OP_COMPONENT: ["số hạng", "tổng", "số bị trừ", "số trừ", "hiệu"],
    EVENT_MODALITY: ["có thể", "chắc chắn", "không thể"],
    HEAVIER: ["vật A", "vật B", "bằng nhau"],
    UNIT_LABEL: ["kg", "l", "°C", "°"],
    DIVISIBLE_LABEL: ["đúng", "sai"],
    SHAPE_FACT: ["có", "không"],
    EXPRESSION_FEATURE: ["có", "không"],
    ANGLE_CLASS: ["góc nhọn", "góc tù", "góc bẹt"],
    PARITY: ["số chẵn", "số lẻ"],
  };
  const preferred = built.options ?? choiceSets[built.kind] ?? [];
  const fallback = preferred.length > 0 ? [built.answer, ...preferred] : [built.answer, "không xác định", "đáp án khác"];
  const options = answerType === "SINGLE_CHOICE"
    ? [...new Set(fallback.map((option) => option.normalize("NFC")))].slice(0, Math.max(2, Math.min(4, preferred.length || 3)))
    : null;
  if (options && !options.includes(built.answer)) options[0] = built.answer;
  return {
    outcomeId: decision.outcomeId,
    grade: decision.grade,
    ordinal,
    structureTag: `${decision.templateFamily}:${built.tag}`,
    difficulty: difficulty(ordinal),
    answerType,
    options,
    prompt: built.prompt.normalize("NFC"),
    exactAnswer: built.answer.normalize("NFC"),
    explanationSteps: built.explanation.map((step) => step.normalize("NFC")),
    oracle: { kind: built.kind, payload: built.payload },
  };
}

function six(decision: WaveKClassificationDecision, build: (index: number) => BuiltCase) {
  return Array.from({ length: 6 }, (_, index) => seed(decision, index + 1, build(index)));
}

function scaleCases(decision: WaveKClassificationDecision, unitFrom: string, unitTo: string, factor: number) {
  return six(decision, (i) => {
    const value = i + 2;
    const inverse = i % 3 === 1;
    const input = inverse ? value * factor : value;
    const answer = inverse ? value : value * factor;
    return { tag: tags[i % 3]!, prompt: inverse ? `${input} ${unitTo} bằng bao nhiêu ${unitFrom}?` : `${input} ${unitFrom} bằng bao nhiêu ${unitTo}?`, answer: String(answer), kind: "SCALE", payload: { input, factor, inverse }, explanation: [`Dùng quan hệ 1 ${unitFrom} = ${factor} ${unitTo}.`, `Kết quả là ${answer} ${inverse ? unitFrom : unitTo}.`] };
  });
}

function placeComposeCases(decision: WaveKClassificationDecision, places: readonly number[]) {
  return six(decision, (i) => {
    const digits = places.map((_, p) => (i * 3 + p + 1) % 10);
    if (digits[0] === 0) digits[0] = i + 1;
    const answer = digits.reduce((sum, digit, p) => sum + digit * places[p]!, 0);
    const publicTerms = digits.map((digit, p) => `${digit} × ${places[p]}`).join(" + ");
    const readWrite = decision.templateFamily?.includes("READ_WRITE") ?? false;
    return { tag: tags[i % 3]!, prompt: i % 2 === 0 ? `${readWrite ? "Viết số theo mô tả các hàng" : "Tính giá trị của dạng khai triển"}: ${publicTerms}.` : `${readWrite ? "Ghép các giá trị theo vị trí để viết số" : "Thu gọn khai triển thập phân"}: ${publicTerms}.`, answer: String(answer), kind: "PLACE_COMPOSE", payload: { digits, places }, explanation: [`Nhân từng chữ số với giá trị hàng tương ứng.`, `Cộng các giá trị theo vị trí được ${answer}.`] };
  });
}

function comparisonCases(decision: WaveKClassificationDecision, maximum: number) {
  return six(decision, (i) => {
    const base = maximum > 1_000_000 ? 1_000_000 : maximum > 10_000 ? 10_000 : 0;
    const a = Math.min(maximum - 20, base + 137 * (i + 2));
    const b = i === 2 ? a : Math.min(maximum - 1, a + (i % 2 === 0 ? 17 : -23));
    const answer = relation(a, b);
    return { tag: tags[i % 3]!, prompt: `Trong phạm vi ${maximum}, điền dấu <, = hoặc >: ${a} … ${b}.`, answer, kind: "COMPARE", payload: { a, b }, explanation: [`So sánh giá trị theo từng hàng.`, `Quan hệ đúng là ${a} ${answer} ${b}.`] };
  });
}

function roundingCases(decision: WaveKClassificationDecision, maximumPlace: number) {
  const places = [10, 100, 1000, 10_000, maximumPlace, 100] as const;
  return six(decision, (i) => {
    const place = places[i]!;
    const cap = maximumPlace === 10_000 ? 99_999 : 9_999_999;
    const value = Math.min(place * 7 + [3, 51, 449, 5_501, 49_999, 63][i]!, cap);
    const answer = Math.floor((value + place / 2) / place) * place;
    return { tag: tags[i % 3]!, prompt: `Trong phạm vi có hàng làm tròn lớn nhất ${maximumPlace}, làm tròn ${value} đến hàng có giá trị ${place}; dùng quy tắc chữ số kế tiếp từ 5 thì tăng một.`, answer: String(answer), kind: "ROUND_HALF_UP", payload: { value, place }, explanation: [`Xét phần dư của ${value} khi chia cho ${place}.`, `Kết quả làm tròn là ${answer}.`] };
  });
}

function orderingCases(decision: WaveKClassificationDecision, extremaOnly: boolean) {
  return six(decision, (i) => {
    const offset = decision.grade === 3 ? 10_000 * (i + 1) : 0;
    const values = [offset + 241 + i * 101, offset + 124 + i * 113, offset + 412 + i * 107, offset + 214 + i * 109];
    const sorted = [...values].sort((a, b) => a - b);
    const mode = extremaOnly ? (i % 2 === 0 ? "MAX" : "MIN") : (i % 2 === 0 ? "SECOND_ASC" : "SECOND_DESC");
    const answer = mode === "MAX" ? Math.max(...values) : mode === "MIN" ? Math.min(...values) : mode === "SECOND_ASC" ? sorted[1]! : sorted.at(-2)!;
    const request = mode === "MAX" ? "lớn nhất" : mode === "MIN" ? "bé nhất" : mode === "SECOND_ASC" ? "đứng thứ hai khi xếp tăng dần" : "đứng thứ hai khi xếp giảm dần";
    return { tag: tags[i % 3]!, prompt: `Trong các số ${values.join(", ")}, số ${request} là số nào?`, answer: String(answer), kind: "LIST_SELECT", payload: { values, mode }, explanation: [`Sắp xếp hoặc so sánh đủ bốn số.`, `Số cần chọn là ${answer}.`] };
  });
}

function unitLiteracyCases(decision: WaveKClassificationDecision, unit: string, maximum: number) {
  return six(decision, (i) => {
    const value = Math.max(1, (125 + i * 137) % maximum || maximum);
    const quantity = unit === "kg" ? "khối lượng" : unit === "l" ? "dung tích" : unit === "°C" ? "nhiệt độ Celsius" : "số đo góc";
    return i % 3 === 1
      ? { tag: tags[i % 3]!, prompt: `Để ghi ${quantity} có giá trị số ${value}, cần dùng kí hiệu đơn vị nào trong các lựa chọn?`, answer: unit, answerType: "SINGLE_CHOICE", kind: "UNIT_LABEL", payload: { unit }, explanation: [`Kí hiệu phù hợp với ${quantity} là ${unit}.`] }
      : { tag: tags[i % 3]!, prompt: `Một nhãn ghi ${value} ${unit}. Giá trị số trên nhãn là bao nhiêu?`, answer: String(value), kind: "PUBLIC_VALUE", payload: { value }, explanation: [`Đọc phần số của số đo ${value} ${unit}.`, `Giá trị là ${value}.`] };
  });
}

function calendarCases(decision: WaveKClassificationDecision) {
  return six(decision, (i) => {
    const monthIndex = [0, 2, 3, 6, 8, 10][i]!;
    if (i % 2 === 0) return { tag: tags[i % 3]!, prompt: `Trong bài lịch lớp ${decision.grade}, với năm không nhuận, ${monthNames[monthIndex]} có bao nhiêu ngày?`, answer: String(monthDays[monthIndex]), kind: "MONTH_DAYS", payload: { monthIndex, commonYear: true }, explanation: [`Tra cứu quy tắc số ngày cố định của ${monthNames[monthIndex]}.`, `${monthNames[monthIndex]} có ${monthDays[monthIndex]} ngày.`] };
    const next = monthIndex + 1;
    return { tag: tags[i % 3]!, prompt: `Trong bài lịch lớp ${decision.grade}, tháng đứng ngay sau ${monthNames[monthIndex]} là tháng thứ mấy trong năm?`, answer: String(next + 1), kind: "NEXT_MONTH", payload: { monthIndex }, explanation: [`${monthNames[monthIndex]} là tháng thứ ${monthIndex + 1}.`, `Tháng kế tiếp là tháng thứ ${next + 1}.`] };
  });
}

function buildFamily(decision: WaveKClassificationDecision): readonly WaveKCaseSeed[] {
  switch (decision.templateFamily) {
    case "G2_OPERATION_COMPONENT_LABELS": return six(decision, (i) => {
      const add = i % 2 === 0; const a = 12 + i * 3; const b = 5 + i; const target = i % 3; const labels = add ? ["số hạng", "số hạng", "tổng"] : ["số bị trừ", "số trừ", "hiệu"];
      return { tag: tags[i % 3]!, prompt: `Trong phép tính ${a} ${add ? "+" : "−"} ${b} = ${add ? a + b : a - b}, thành phần ở vị trí ${target + 1} gọi là gì?`, answer: labels[target]!, kind: "OP_COMPONENT", payload: { operation: add ? "ADD" : "SUBTRACT", target }, explanation: [`Dựa vào tên ba vị trí của phép ${add ? "cộng" : "trừ"}.`, `Vị trí ${target + 1} là ${labels[target]}.`] };
    });
    case "G2_FINITE_EVENT_MODALITY":
    case "G3_SINGLE_TRIAL_OUTCOME_MODALITY": return six(decision, (i) => {
      const total = 4 + i; const favorable = i % 3 === 0 ? 0 : i % 3 === 1 ? total : 1 + (i % (total - 1)); const answer = modality(favorable, total);
      return { tag: tags[i % 3]!, prompt: `Trong bài khả năng lớp ${decision.grade}, một phép thử có ${total} kết quả đồng khả năng đã liệt kê đầy đủ; có ${favorable} kết quả thỏa sự kiện A. Sự kiện A là có thể, chắc chắn hay không thể?`, answer, kind: "EVENT_MODALITY", payload: { favorable, total }, explanation: [`So sánh ${favorable} kết quả thuận lợi với tổng ${total} kết quả.`, `Sự kiện là ${answer}.`] };
    });
    case "G2_LABELED_MASS_COMPARISON": return six(decision, (i) => { const a = 3 + i * 2; const b = i === 2 ? a : 10 + i; const answer = a > b ? "vật A" : a < b ? "vật B" : "bằng nhau"; return { tag: tags[i % 3]!, prompt: `Vật A nặng ${a} kg và vật B nặng ${b} kg. Vật nào nặng hơn, hay hai vật bằng nhau?`, answer, kind: "HEAVIER", payload: { a, b }, explanation: [`Hai số đo cùng đơn vị kg.`, `${answer === "bằng nhau" ? "Hai vật nặng bằng nhau" : `${answer} nặng hơn`}.`] }; });
    case "G2_DAY_HOUR_MINUTE_FACTS": return six(decision, (i) => { const dayMode = i % 2 === 0; const value = i + 1; const factor = dayMode ? 24 : 60; const answer = value * factor; return { tag: tags[i % 3]!, prompt: `${value} ${dayMode ? "ngày" : "giờ"} bằng bao nhiêu ${dayMode ? "giờ" : "phút"}?`, answer: String(answer), kind: "SCALE", payload: { input: value, factor, inverse: false }, explanation: [`Một ${dayMode ? "ngày có 24 giờ" : "giờ có 60 phút"}.`, `Kết quả là ${answer}.`] }; });
    case "G2_KILOGRAM_QUANTITY_LITERACY": return unitLiteracyCases(decision, "kg", 1000);
    case "G2_LITRE_QUANTITY_LITERACY": return unitLiteracyCases(decision, "l", 1000);
    case "G2_ROUND_HUNDRED_RECOGNITION": return six(decision, (i) => { const value = (i + 2) * 100 + (i % 2 === 0 ? 0 : 10); if (i % 2 === 0) { const answer = value % 100 === 0 ? "đúng" : "sai"; return { tag: tags[i % 3]!, prompt: `Khẳng định “${value} là số tròn trăm” đúng hay sai?`, answer, kind: "DIVISIBLE_LABEL", payload: { value, divisor: 100 }, explanation: [`Kiểm tra hai chữ số cuối hoặc chia ${value} cho 100.`, `Khẳng định là ${answer}.`] }; } const answer = Math.ceil(value / 100) * 100; return { tag: tags[i % 3]!, prompt: `Số tròn trăm nhỏ nhất không bé hơn ${value} là số nào?`, answer: String(answer), kind: "NEXT_MULTIPLE", payload: { value, divisor: 100 }, explanation: [`Tìm bội của 100 ngay trên ${value}.`, `Số cần tìm là ${answer}.`] }; });
    case "G2_NUMBER_READ_WRITE_TO_1000": return placeComposeCases(decision, [100, 10, 1]);
    case "G2_PREDECESSOR_SUCCESSOR_TO_1000": return six(decision, (i) => { const value = 120 + i * 113; const delta = i % 2 === 0 ? -1 : 1; const answer = value + delta; return { tag: tags[i % 3]!, prompt: `Số liền ${delta < 0 ? "trước" : "sau"} của ${value} là số nào?`, answer: String(answer), kind: "OFFSET", payload: { value, delta }, explanation: [`${delta < 0 ? "Trừ" : "Cộng"} 1.`, `Kết quả là ${answer}.`] }; });
    case "G2_HUNDREDS_TENS_ONES_EXPANSION": return placeComposeCases(decision, [100, 10, 1]);
    case "G2_TEXTUAL_SHAPE_PROPERTY_APPLICATION": return six(decision, (i) => { const shape = (["hình vuông", "hình chữ nhật", "hình tam giác", "khối cầu", "khối trụ", "hình tứ giác"] as const)[i]!; const property = i < 3 || i === 5 ? "sides" : "rolls"; const table: Record<string, number | string> = { "hình vuông": 4, "hình chữ nhật": 4, "hình tam giác": 3, "khối cầu": "có", "khối trụ": "có", "hình tứ giác": 4 }; const answer = String(table[shape]); const prompt = property === "sides" ? `Một khung ${shape} dùng một que thẳng cho mỗi cạnh. Cần bao nhiêu que để làm khung?` : `Một đồ vật có dạng ${shape}. Đồ vật đó có thể lăn trên mặt phẳng không? Trả lời có hoặc không.`; return { tag: tags[i % 3]!, prompt, answer, kind: "SHAPE_FACT", payload: { shape, property }, explanation: [`Dùng tính chất đã nêu của ${shape}.`, `Đáp án là ${answer}.`] }; });
    case "G2_CALENDAR_MONTH_DAY_FACTS":
    case "G3_CALENDAR_MONTH_FACTS": return calendarCases(decision);
    case "G3_CLOSED_MEASUREMENT_APPLICATION":
    case "G4_CLOSED_MEASUREMENT_APPLICATION": return six(decision, (i) => { const units = ["cm", "kg", "l", "phút", "đồng", "cm²"] as const; const objects = ["dải dây", "khối hàng", "bình nước", "khoảng thời gian", "khoản tiền", "mảnh bìa"] as const; const unit = units[i]!; const object = objects[i]!; const a = 120 + i * 15; const b = 20 + i * 4; const subtract = i % 2 === 1; const answer = subtract ? a - b : a + b; return { tag: tags[i % 3]!, prompt: `Trong bài đo lường lớp ${decision.grade}, một ${object} có số đo ${a} ${unit}, sau đó ${subtract ? `bớt ${b} ${unit}` : `thêm ${b} ${unit}`}. Số đo mới là bao nhiêu ${unit}?`, answer: String(answer), kind: "BINARY", payload: { a, b, operation: subtract ? "SUBTRACT" : "ADD" }, explanation: [`Các dữ kiện đều cùng đơn vị ${unit}.`, `${a} ${subtract ? "−" : "+"} ${b} = ${answer} ${unit}.`] }; });
    case "G3_NUMERIC_EXPRESSION_GRAMMAR": return six(decision, (i) => {
      const mode = i % 3; const operators = i < 3 ? 1 + i : 2 + (i % 2); const terms = Array.from({ length: operators + 1 }, (_, p) => String(2 + i + p)); const joined = terms.join(i % 2 === 0 ? " + " : " × "); const expression = mode === 2 ? `(${joined})` : joined;
      const answer = mode === 0 ? String(operators) : mode === 1 ? String(operators + 1) : "có";
      const prompt = mode === 0 ? `Biểu thức số ${expression} có bao nhiêu dấu phép tính?` : mode === 1 ? `Biểu thức số ${expression} có bao nhiêu số hạng hoặc thừa số?` : `Biểu thức số ${expression} có dấu ngoặc hay không?`;
      return { tag: tags[mode]!, prompt, answer, kind: "EXPRESSION_FEATURE", payload: { expression, mode: mode === 0 ? "OPERATORS" : mode === 1 ? "TERMS" : "PARENTHESES" }, explanation: [`Phân tích các kí hiệu công khai trong biểu thức.`, `Đáp án là ${answer}.`] };
    });
    case "G3_MULTIPLICATION_PROPERTIES_AND_INVERSE": return six(decision, (i) => { const a = 2 + i; const b = 3 + (i % 4); const c = 2 + (i % 3); const mode = i % 3; const answer = mode === 0 ? a : mode === 1 ? a * b * c : b; const stem = mode === 0 ? `Điền số: ${a} × ${b} = ${b} × …` : mode === 1 ? `Tính (${a} × ${b}) × ${c}.` : `Biết ${a} × ${b} = ${a * b}. Tính ${a * b} : ${a}.`; const prompt = `Trong bài tính chất phép nhân lớp 3: ${stem}`; return { tag: tags[i % 3]!, prompt, answer: String(answer), kind: "MULTIPLICATION_PROPERTY", payload: { a, b, c, mode }, explanation: [`Dùng tính chất phép nhân hoặc quan hệ nhân–chia.`, `Kết quả là ${answer}.`] }; });
    case "G3_ROMAN_NUMERALS_I_TO_XX": return six(decision, (i) => { const value = [4, 7, 9, 12, 16, 19][i]!; const toRoman = i % 2 === 0; return { tag: tags[i % 3]!, prompt: toRoman ? `Số ${value} được viết bằng chữ số La Mã như thế nào?` : `Chữ số La Mã ${roman[value - 1]} biểu diễn số nào?`, answer: toRoman ? roman[value - 1]! : String(value), kind: "ROMAN", payload: { value, toRoman }, explanation: [`Đối chiếu bảng chữ số La Mã từ I đến XX.`, `Đáp án là ${toRoman ? roman[value - 1] : value}.`] }; });
    case "G3_ROUND_THOUSAND_TEN_THOUSAND": return six(decision, (i) => { const divisor = i % 2 === 0 ? 1000 : 10_000; const value = divisor * (i + 2) + (i % 3 === 0 ? 0 : 100); if (i % 2 === 0) { const answer = value % divisor === 0 ? "đúng" : "sai"; return { tag: tags[i % 3]!, prompt: `Khẳng định “${value} là số tròn ${divisor === 1000 ? "nghìn" : "mười nghìn"}” đúng hay sai?`, answer, kind: "DIVISIBLE_LABEL", payload: { value, divisor }, explanation: [`Kiểm tra ${value} có chia hết cho ${divisor} không.`, `Khẳng định là ${answer}.`] }; } const answer = Math.ceil(value / divisor) * divisor; return { tag: tags[i % 3]!, prompt: `Số tròn mười nghìn nhỏ nhất không bé hơn ${value} là số nào?`, answer: String(answer), kind: "NEXT_MULTIPLE", payload: { value, divisor }, explanation: [`Tìm bội của ${divisor} ngay trên ${value}.`, `Số cần tìm là ${answer}.`] }; });
    case "G3_ORDER_UP_TO_FOUR_NUMBERS": return orderingCases(decision, false);
    case "G3_EXTREMA_UP_TO_FOUR_NUMBERS": return orderingCases(decision, true);
    case "G3_NUMBER_READ_WRITE_TO_100000": return placeComposeCases(decision, [10_000, 1000, 100, 10, 1]);
    case "G3_DECLARED_PLACE_ROUNDING": return roundingCases(decision, 10_000);
    case "G3_COMPARE_TO_100000": return comparisonCases(decision, 100_000);
    case "G3_DECIMAL_PLACE_VALUE_EXPANSION": return placeComposeCases(decision, [10_000, 1000, 100, 10, 1]);
    case "G3_PLANE_SHAPE_ELEMENT_FACTS": return six(decision, (i) => { const rows = [["hình chữ nhật", "vertices", 4], ["hình vuông", "sides", 4], ["hình tròn", "diameterRadii", 2], ["hình chữ nhật", "angles", 4], ["hình vuông", "vertices", 4], ["hình tròn", "radiiInDiameter", 2]] as const; const [shape, property, answer] = rows[i]!; return { tag: tags[i % 3]!, prompt: `${shape} có ${property.includes("diameter") || property.includes("Radii") ? "bao nhiêu bán kính trên một đường kính" : property === "vertices" ? "bao nhiêu đỉnh" : property === "sides" ? "bao nhiêu cạnh" : "bao nhiêu góc"}?`, answer: String(answer), kind: "PLANE_FACT", payload: { shape, property }, explanation: [`Dùng cấu tạo của ${shape}.`, `Đáp án là ${answer}.`] }; });
    case "G3_SOLID_ELEMENT_FACTS": return six(decision, (i) => { const shape = i % 2 === 0 ? "khối lập phương" : "khối hộp chữ nhật"; const property = (["vertices", "edges", "faces"] as const)[i % 3]!; const answer = property === "vertices" ? 8 : property === "edges" ? 12 : 6; return { tag: tags[i % 3]!, prompt: `${shape} có bao nhiêu ${property === "vertices" ? "đỉnh" : property === "edges" ? "cạnh" : "mặt"}?`, answer: String(answer), kind: "SOLID_FACT", payload: { shape, property }, explanation: [`Dùng cấu tạo của ${shape}.`, `Số cần tìm là ${answer}.`] }; });
    case "G3_LITRE_MILLILITRE_RELATION": return scaleCases(decision, "l", "ml", 1000);
    case "G3_KILOGRAM_GRAM_RELATION": return scaleCases(decision, "kg", "g", 1000);
    case "G3_CELSIUS_QUANTITY_LITERACY": return unitLiteracyCases(decision, "°C", 100);
    case "G3_MIDPOINT_FROM_EXPLICIT_CONSTRAINTS": return six(decision, (i) => { const half = 3 + i; const whole = half * 2; const askHalf = i % 2 === 0; const answer = askHalf ? half : whole; return { tag: tags[i % 3]!, prompt: askHalf ? `M là trung điểm AB và AB dài ${whole} cm. AM dài bao nhiêu cm?` : `M nằm giữa A, B và AM = MB = ${half} cm. AB dài bao nhiêu cm?`, answer: String(answer), kind: "MIDPOINT", payload: { half, whole, askHalf }, explanation: [`Trung điểm chia đoạn thẳng thành hai phần bằng nhau.`, `Kết quả là ${answer} cm.`] }; });
    case "G4_ANGLE_CLASSIFICATION_BY_MEASURE": return six(decision, (i) => { const degrees = [35, 60, 110, 145, 180, 75][i]!; const answer = degrees < 90 ? "góc nhọn" : degrees < 180 ? "góc tù" : "góc bẹt"; return { tag: tags[i % 3]!, prompt: `Góc có số đo ${degrees}° là góc nhọn, góc tù hay góc bẹt?`, answer, kind: "ANGLE_CLASS", payload: { degrees }, explanation: [`So sánh ${degrees}° với 90° và 180°.`, `Đây là ${answer}.`] }; });
    case "G4_DIRECT_TWO_THREE_STEP_PROBLEMS": return six(decision, (i) => { const start = 40 + i * 5; const change = 12 + i; const groups = 2 + (i % 3); const bonus = 3 + i; const mode = i % 3; const answer = mode === 0 ? (start + change) * groups : mode === 1 ? start * groups - change : (start - change) * groups + bonus; const prompt = mode === 0 ? `Mỗi hộp có ${start} viên, thêm ${change} viên vào mỗi hộp rồi chuẩn bị ${groups} hộp như nhau. Có tất cả bao nhiêu viên?` : mode === 1 ? `Có ${groups} hộp, mỗi hộp ${start} viên; sau đó dùng ${change} viên. Còn lại bao nhiêu viên?` : `Mỗi hộp ban đầu có ${start} viên, lấy khỏi mỗi hộp ${change} viên, chuẩn bị ${groups} hộp rồi thêm chung ${bonus} viên. Có tất cả bao nhiêu viên?`; return { tag: tags[mode]!, prompt, answer: String(answer), kind: "MULTISTEP_MODE", payload: { start, change, groups, bonus, mode }, explanation: [`Thực hiện đúng thứ tự ${mode === 2 ? "ba" : "hai"} bước đã nêu.`, `Kết quả là ${answer} viên.`] }; });
    case "G4_AREA_UNIT_RELATIONS": return six(decision, (i) => { const pairs = [["m²", "dm²", 100], ["dm²", "mm²", 10_000], ["m²", "mm²", 1_000_000]] as const; const [from, to, factor] = pairs[i % 3]!; const value = 2 + i; const inverse = i >= 3; const input = inverse ? value * factor : value; const answer = inverse ? value : value * factor; return { tag: tags[i % 3]!, prompt: `${input} ${inverse ? to : from} bằng bao nhiêu ${inverse ? from : to}?`, answer: String(answer), kind: "SCALE", payload: { input, factor, inverse }, explanation: [`Dùng quan hệ diện tích 1 ${from} = ${factor} ${to}.`, `Kết quả là ${answer} ${inverse ? from : to}.`] }; });
    case "G4_REPEATED_TRIAL_FREQUENCY": return six(decision, (i) => { const target = i % 3; const values = i % 2 === 0 ? Array.from({ length: 8 + i }, (_, p) => (p * (i + 1) + i) % 3) : [...Array.from({ length: 4 + i }, () => target), (target + 1) % 3, (target + 1) % 3, (target + 2) % 3]; if (i % 2 === 0) { const answer = values.filter(v => v === target).length; return { tag: tags[i % 3]!, prompt: `Kết quả ${values.length} lượt thử được mã hóa lần lượt là ${values.join(", ")}. Mã ${target} xuất hiện bao nhiêu lần?`, answer: String(answer), kind: "FREQUENCY", payload: { values, target }, explanation: [`Kiểm đếm từng lần mã ${target} xuất hiện.`, `Tần số là ${answer}.`] }; } const counts = [0, 1, 2].map(value => values.filter(entry => entry === value).length); const answer = counts.indexOf(Math.max(...counts)); return { tag: tags[i % 3]!, prompt: `Kết quả ${values.length} lượt thử là ${values.join(", ")}. Mã nào trong 0, 1, 2 xuất hiện nhiều nhất?`, answer: String(answer), kind: "MODE_VALUE", payload: { values }, explanation: [`Kiểm đếm tần số của từng mã.`, `Mã ${answer} có tần số lớn nhất.`] }; });
    case "G4_STATISTICAL_SEQUENCE_RECOGNITION": return six(decision, (i) => { const values = [3 + i, 5 + i, 4 + i, 6 + i, 7 + i]; const position = i % values.length; const answer = i % 2 === 0 ? values.length : values[position]!; return { tag: tags[i % 3]!, prompt: i % 2 === 0 ? `Dãy số liệu ${values.join(", ")} có bao nhiêu giá trị?` : `Trong dãy số liệu ${values.join(", ")}, giá trị ở vị trí thứ ${position + 1} là bao nhiêu?`, answer: String(answer), kind: "DATA_LOOKUP", payload: { values, mode: i % 2 === 0 ? "COUNT" : "POSITION", position }, explanation: [`Đọc đủ dãy số liệu theo thứ tự.`, `Kết quả là ${answer}.`] }; });
    case "G4_SUBSTITUTE_ONE_TO_THREE_VARIABLES": return six(decision, (i) => { const a = 2 + i; const b = 4 + i; const c = 1 + i; const variableCount = i % 3 + 1; const answer = variableCount === 1 ? 2 * a + 3 : variableCount === 2 ? a + 2 * b : a + b * c; const prompt = variableCount === 1 ? `Với a = ${a}, tính 2 × a + 3.` : variableCount === 2 ? `Với a = ${a}, b = ${b}, tính a + 2 × b.` : `Với a = ${a}, b = ${b}, c = ${c}, tính a + b × c.`; return { tag: tags[i % 3]!, prompt, answer: String(answer), kind: "SUBSTITUTE", payload: { a, b, c, variableCount }, explanation: [`Thay các giá trị đã cho vào biểu thức.`, `Tính đúng thứ tự được ${answer}.`] }; });
    case "G4_CONVENIENT_CALCULATION_PROPERTIES": return six(decision, (i) => { const a = 20 + i; const b = 80 - i; const c = 3 + i; const mode = i % 2; const answer = mode === 0 ? a + b + c : a * c + b * c; const prompt = mode === 0 ? `Tính thuận tiện ${a} + ${b} + ${c}.` : `Tính thuận tiện ${a} × ${c} + ${b} × ${c}.`; return { tag: tags[i % 3]!, prompt, answer: String(answer), kind: "CONVENIENT", payload: { a, b, c, mode }, explanation: [`Nhóm các số hoặc đặt thừa số chung.`, `Kết quả là ${answer}.`] }; });
    case "G4_ADDITION_PROPERTIES_AND_INVERSE": return six(decision, (i) => { const a = 30 + i; const b = 12 + i; const c = 7 + i; const mode = i % 3; const answer = mode === 0 ? a : mode === 1 ? a + b + c : b; const prompt = mode === 0 ? `Điền số: ${a} + ${b} = ${b} + …` : mode === 1 ? `Tính (${a} + ${b}) + ${c}.` : `Biết ${a} + ${b} = ${a + b}. Tính ${a + b} − ${a}.`; return { tag: tags[i % 3]!, prompt, answer: String(answer), kind: "ADDITION_PROPERTY", payload: { a, b, c, mode }, explanation: [`Dùng tính chất phép cộng hoặc quan hệ cộng–trừ.`, `Kết quả là ${answer}.`] }; });
    case "G4_MULTIPLICATION_PROPERTIES_AND_INVERSE": return six(decision, (i) => { const a = 2 + i; const b = 3 + i; const c = 2 + (i % 3); const mode = i % 3; const answer = mode === 0 ? a : mode === 1 ? a * b * c : b; const prompt = mode === 0 ? `Điền số: ${a} × ${b} = ${b} × …` : mode === 1 ? `Tính (${a} × ${b}) × ${c}.` : `Biết ${a} × ${b} = ${a * b}. Tính ${a * b} : ${a}.`; return { tag: tags[i % 3]!, prompt, answer: String(answer), kind: "MULTIPLICATION_PROPERTY", payload: { a, b, c, mode }, explanation: [`Dùng tính chất phép nhân hoặc quan hệ nhân–chia.`, `Kết quả là ${answer}.`] }; });
    case "G4_FRACTION_READ_WRITE": return six(decision, (i) => { const numerator = i + 1; const denominator = i + 3; return i % 2 === 0 ? { tag: tags[i % 3]!, prompt: `Phân số có tử số ${numerator} và mẫu số ${denominator} được viết thế nào?`, answer: `${numerator}/${denominator}`, answerType: "SINGLE_CHOICE", options: [`${numerator}/${denominator}`, `${denominator}/${numerator}`, `${numerator}/${denominator + 1}`], kind: "FRACTION_WRITE", payload: { numerator, denominator }, explanation: [`Viết tử số trên mẫu số.`, `Phân số là ${numerator}/${denominator}.`] } : { tag: tags[i % 3]!, prompt: `Trong phân số ${numerator}/${denominator}, mẫu số là bao nhiêu?`, answer: String(denominator), kind: "FRACTION_PART", payload: { numerator, denominator, part: "DENOMINATOR" }, explanation: [`Mẫu số nằm dưới gạch phân số.`, `Mẫu số là ${denominator}.`] }; });
    case "G4_FRACTION_EXTREMA_RESTRICTED_DENOMINATORS": return six(decision, (i) => { const denominator = 6 + i; const numerators = [1 + i % 2, 3, 4, 5]; const maximum = i % 2 === 0; const answerNumerator = maximum ? Math.max(...numerators) : Math.min(...numerators); const fractionOptions = numerators.map(n => `${n}/${denominator}`); return { tag: tags[i % 3]!, prompt: `Trong các phân số ${fractionOptions.join(", ")}, phân số ${maximum ? "lớn nhất" : "bé nhất"} là phân số nào?`, answer: `${answerNumerator}/${denominator}`, answerType: "SINGLE_CHOICE", options: fractionOptions, kind: "FRACTION_EXTREMA", payload: { numerators, denominators: numerators.map(() => denominator), maximum }, explanation: [`Các phân số có cùng mẫu ${denominator} nên so sánh tử số.`, `Đáp án là ${answerNumerator}/${denominator}.`] }; });
    case "G4_SECOND_CENTURY_TIME_RELATIONS": return six(decision, (i) => { const century = i % 2 === 1; const input = 2 + i; const factor = century ? 100 : 60; const answer = input * factor; return { tag: tags[i % 3]!, prompt: `${input} ${century ? "thế kỉ" : "phút"} bằng bao nhiêu ${century ? "năm" : "giây"}?`, answer: String(answer), kind: "SCALE", payload: { input, factor, inverse: false }, explanation: [`Một ${century ? "thế kỉ có 100 năm" : "phút có 60 giây"}.`, `Kết quả là ${answer}.`] }; });
    case "G4_DEGREE_UNIT_LITERACY": return unitLiteracyCases(decision, "°", 180);
    case "G4_EVEN_ODD_CLASSIFICATION": return six(decision, (i) => { const value = 231 + i * 17; if (i % 2 === 0) { const answer = value % 2 === 0 ? "số chẵn" : "số lẻ"; return { tag: tags[i % 3]!, prompt: `${value} là số chẵn hay số lẻ?`, answer, kind: "PARITY", payload: { value }, explanation: [`Xét chữ số hàng đơn vị hoặc phần dư khi chia 2.`, `${value} là ${answer}.`] }; } const targetParity = i % 3 === 0 ? 0 : 1; const answer = value + (value % 2 === targetParity ? 2 : 1); return { tag: tags[i % 3]!, prompt: `Số ${targetParity === 0 ? "chẵn" : "lẻ"} nhỏ nhất lớn hơn ${value} là số nào?`, answer: String(answer), kind: "NEXT_PARITY", payload: { value, targetParity }, explanation: [`Kiểm tra lần lượt các số ngay sau ${value}.`, `Số cần tìm là ${answer}.`] }; });
    case "G4_DECLARED_PLACE_ROUNDING": return roundingCases(decision, 100_000);
    case "G4_MULTIPLY_DIVIDE_POWERS_OF_TEN": return six(decision, (i) => { const factor = [10, 100, 1000][i % 3]!; const value = 3 + i; const divide = i % 2 === 1; const input = divide ? value * factor : value; const answer = divide ? value : value * factor; return { tag: tags[i % 3]!, prompt: `Tính ${input} ${divide ? ":" : "×"} ${factor}.`, answer: String(answer), kind: "SCALE", payload: { input, factor, inverse: divide }, explanation: [`${divide ? "Chia" : "Nhân"} với ${factor}.`, `Kết quả là ${answer}.`] }; });
    case "G4_ARITHMETIC_MEAN": return six(decision, (i) => { const base = 4 + i * 2; if (i % 2 === 0) { const values = [base - 2, base, base + 2]; return { tag: tags[i % 3]!, prompt: `Tính số trung bình cộng của ${values.join(", ")}.`, answer: String(base), kind: "MEAN", payload: { values }, explanation: [`Cộng ${values.length} số rồi chia cho ${values.length}.`, `Số trung bình cộng là ${base}.`] }; } const known = [base - 3, base - 1, base + 1]; const missing = base + 3; return { tag: tags[i % 3]!, prompt: `Bốn số có trung bình cộng là ${base}; ba số đã biết là ${known.join(", ")}. Số còn thiếu là bao nhiêu?`, answer: String(missing), kind: "MEAN_MISSING", payload: { known, mean: base, totalCount: 4 }, explanation: [`Tổng bốn số phải là ${base} × 4.`, `Trừ tổng ba số đã biết được ${missing}.`] }; });
    case "G4_NUMBER_READ_WRITE_TO_MILLIONS": return placeComposeCases(decision, [1_000_000, 100_000, 10_000, 1000, 100, 10, 1]);
    case "G4_COMPARE_TO_MILLIONS": return comparisonCases(decision, 9_999_999);
    case "G4_MILLIONS_PLACE_VALUE_EXPANSION": return placeComposeCases(decision, [1_000_000, 100_000, 10_000, 1000, 100, 10, 1]);
    default: throw new Error(`WAVE_K_G2_G4_TEMPLATE_UNIMPLEMENTED:${decision.templateFamily}`);
  }
}

function oracleAnswer(kind: string, payload: Payload): string {
  const n = (key: string) => { const value = payload[key]; if (typeof value !== "number") throw new Error(`ORACLE_NUMBER_REQUIRED:${key}`); return value; };
  const s = (key: string) => { const value = payload[key]; if (typeof value !== "string") throw new Error(`ORACLE_STRING_REQUIRED:${key}`); return value; };
  const ns = (key: string) => { const value = payload[key]; if (!Array.isArray(value) || value.some(entry => typeof entry !== "number")) throw new Error(`ORACLE_NUMBER_ARRAY_REQUIRED:${key}`); return value as readonly number[]; };
  switch (kind) {
    case "OP_COMPONENT": return s("operation") === "ADD" ? ["số hạng", "số hạng", "tổng"][n("target")]! : ["số bị trừ", "số trừ", "hiệu"][n("target")]!;
    case "EVENT_MODALITY": return modality(n("favorable"), n("total"));
    case "HEAVIER": return n("a") > n("b") ? "vật A" : n("a") < n("b") ? "vật B" : "bằng nhau";
    case "SCALE": return String(payload.inverse ? n("input") / n("factor") : n("input") * n("factor"));
    case "UNIT_LABEL": return s("unit");
    case "PUBLIC_VALUE": return String(n("value"));
    case "DIVISIBLE_LABEL": return n("value") % n("divisor") === 0 ? "đúng" : "sai";
    case "NEXT_MULTIPLE": return String(Math.ceil(n("value") / n("divisor")) * n("divisor"));
    case "PLACE_COMPOSE": return String(ns("digits").reduce((sum, digit, index) => sum + digit * ns("places")[index]!, 0));
    case "OFFSET": return String(n("value") + n("delta"));
    case "SHAPE_FACT": { const shape = s("shape"); const facts: Record<string, Record<string, string>> = { "hình vuông": { sides: "4" }, "hình chữ nhật": { sides: "4" }, "hình tam giác": { sides: "3" }, "khối cầu": { rolls: "có" }, "khối trụ": { rolls: "có" }, "hình tứ giác": { rolls: "4" } }; return facts[shape]?.[s("property")] ?? (shape === "hình tứ giác" ? "4" : "không"); }
    case "MONTH_DAYS": return String(monthDays[n("monthIndex")]);
    case "NEXT_MONTH": return String(n("monthIndex") + 2);
    case "BINARY": return String(s("operation") === "ADD" ? n("a") + n("b") : n("a") - n("b"));
    case "EXPRESSION_FEATURE": { const expression = s("expression"); const mode = s("mode"); if (mode === "OPERATORS") return String((expression.match(/[+−×:]/gu) ?? []).length); if (mode === "TERMS") return String((expression.match(/[+−×:]/gu) ?? []).length + 1); return expression.includes("(") && expression.includes(")") ? "có" : "không"; }
    case "MULTIPLICATION_PROPERTY": return String(n("mode") === 0 ? n("a") : n("mode") === 1 ? n("a") * n("b") * n("c") : n("b"));
    case "ROMAN": return payload.toRoman ? roman[n("value") - 1]! : String(n("value"));
    case "LIST_SELECT": { const sorted = [...ns("values")].sort((a, b) => a - b); const mode = s("mode"); return String(mode === "MAX" ? sorted.at(-1) : mode === "MIN" ? sorted[0] : mode === "SECOND_ASC" ? sorted[1] : sorted.at(-2)); }
    case "ROUND_HALF_UP": return String(Math.floor((n("value") + n("place") / 2) / n("place")) * n("place"));
    case "COMPARE": return relation(n("a"), n("b"));
    case "PLANE_FACT": { const property = s("property"); return property === "diameterRadii" || property === "radiiInDiameter" ? "2" : "4"; }
    case "SOLID_FACT": return s("property") === "vertices" ? "8" : s("property") === "edges" ? "12" : "6";
    case "MIDPOINT": return String(payload.askHalf ? n("whole") / 2 : n("half") * 2);
    case "ANGLE_CLASS": return n("degrees") < 90 ? "góc nhọn" : n("degrees") < 180 ? "góc tù" : "góc bẹt";
    case "ADD_THEN_MULTIPLY": return String((n("start") + n("add")) * n("groups"));
    case "MULTISTEP_MODE": return String(n("mode") === 0 ? (n("start") + n("change")) * n("groups") : n("mode") === 1 ? n("start") * n("groups") - n("change") : (n("start") - n("change")) * n("groups") + n("bonus"));
    case "FREQUENCY": return String(ns("values").filter(value => value === n("target")).length);
    case "MODE_VALUE": { const values = ns("values"); const unique = [...new Set(values)]; const counts = unique.map(value => values.filter(entry => entry === value).length); const max = Math.max(...counts); if (counts.filter(count => count === max).length !== 1) throw new Error("ORACLE_MODE_NOT_UNIQUE"); return String(unique[counts.indexOf(max)]); }
    case "DATA_LOOKUP": return String(s("mode") === "COUNT" ? ns("values").length : ns("values")[n("position")]);
    case "SUBSTITUTE": return String(n("variableCount") === 1 ? 2 * n("a") + 3 : n("variableCount") === 2 ? n("a") + 2 * n("b") : n("a") + n("b") * n("c"));
    case "CONVENIENT": return String(n("mode") === 0 ? n("a") + n("b") + n("c") : n("a") * n("c") + n("b") * n("c"));
    case "ADDITION_PROPERTY": return String(n("mode") === 0 ? n("a") : n("mode") === 1 ? n("a") + n("b") + n("c") : n("b"));
    case "FRACTION_WRITE": return `${n("numerator")}/${n("denominator")}`;
    case "FRACTION_PART": return String(s("part") === "DENOMINATOR" ? n("denominator") : n("numerator"));
    case "FRACTION_EXTREMA": { const numerators = ns("numerators"); const denominators = ns("denominators"); let selected = 0; for (let i = 1; i < numerators.length; i += 1) { const compare = numerators[i]! * denominators[selected]! - numerators[selected]! * denominators[i]!; if (payload.maximum ? compare > 0 : compare < 0) selected = i; } return `${numerators[selected]}/${denominators[selected]}`; }
    case "PARITY": return n("value") % 2 === 0 ? "số chẵn" : "số lẻ";
    case "NEXT_PARITY": { let candidate = n("value") + 1; while (candidate % 2 !== n("targetParity")) candidate += 1; return String(candidate); }
    case "MEAN": { const values = ns("values"); return String(values.reduce((sum, value) => sum + value, 0) / values.length); }
    case "MEAN_MISSING": return String(n("mean") * n("totalCount") - ns("known").reduce((sum, value) => sum + value, 0));
    default: throw new Error(`WAVE_K_G2_G4_ORACLE_KIND_UNKNOWN:${kind}`);
  }
}

const producibleDecisions = waveKClassificationsG2G4.filter((decision) => decision.classification === "PRODUCIBLE_DETERMINISTIC");
export const waveKCaseSeedsG2G4: readonly WaveKCaseSeed[] = producibleDecisions.flatMap(buildFamily);

export function verifyWaveKCasesG2G4() {
  const errors: string[] = [];
  if (producibleDecisions.length !== 52) errors.push(`PRODUCIBLE_COUNT:${producibleDecisions.length}`);
  if (waveKCaseSeedsG2G4.length !== 312) errors.push(`CASE_COUNT:${waveKCaseSeedsG2G4.length}`);
  const normalizedPublicForms = waveKCaseSeedsG2G4.map((entry) => entry.prompt.normalize("NFC").toLocaleLowerCase("vi"));
  if (new Set(normalizedPublicForms).size !== normalizedPublicForms.length) errors.push("GLOBAL_PUBLIC_FORM_DUPLICATE");
  for (const decision of producibleDecisions) {
    const cases = waveKCaseSeedsG2G4.filter((entry) => entry.outcomeId === decision.outcomeId);
    if (cases.length !== 6) errors.push(`${decision.outcomeId}:POOL_SIZE:${cases.length}`);
    if (new Set(cases.map((entry) => entry.structureTag)).size < 2) errors.push(`${decision.outcomeId}:STRUCTURE_DIVERSITY`);
    if (new Set(cases.map((entry) => entry.prompt.normalize("NFC"))).size < 3) errors.push(`${decision.outcomeId}:PUBLIC_FORM_DIVERSITY`);
    if (new Set(cases.map((entry) => entry.ordinal)).size !== cases.length) errors.push(`${decision.outcomeId}:ORDINAL_DUPLICATE`);
  }
  for (const entry of waveKCaseSeedsG2G4) {
    if (entry.prompt !== entry.prompt.normalize("NFC") || entry.exactAnswer !== entry.exactAnswer.normalize("NFC")) errors.push(`${entry.outcomeId}:${entry.ordinal}:NFC`);
    if (entry.answerType === "SINGLE_CHOICE") {
      if (!entry.options || entry.options.length < 2 || new Set(entry.options).size !== entry.options.length || !entry.options.includes(entry.exactAnswer)) errors.push(`${entry.outcomeId}:${entry.ordinal}:OPTIONS`);
      if (entry.options?.some((option) => option !== option.normalize("NFC"))) errors.push(`${entry.outcomeId}:${entry.ordinal}:OPTION_NFC`);
    } else if (entry.options !== null) errors.push(`${entry.outcomeId}:${entry.ordinal}:INPUT_OPTIONS_NOT_NULL`);
    try {
      const independentlyDerived = oracleAnswer(entry.oracle.kind, entry.oracle.payload);
      if (independentlyDerived !== entry.exactAnswer) errors.push(`${entry.outcomeId}:${entry.ordinal}:ORACLE:${independentlyDerived}:${entry.exactAnswer}`);
    } catch (error) {
      errors.push(`${entry.outcomeId}:${entry.ordinal}:ORACLE_ERROR:${error instanceof Error ? error.message : "UNKNOWN"}`);
    }
  }
  return errors;
}

const verificationErrors = verifyWaveKCasesG2G4();
if (verificationErrors.length) throw new Error(`WAVE_K_G2_G4_CASES_INVALID:${verificationErrors.join(",")}`);
