import { createHash } from "node:crypto";
import type { CanonicalResponse, GenerateQuestionInput, GeneratedProductQuestion, MatchingPair, MisconceptionCode, ProductInteractionContract, ProductVisual, PublicOption } from "./types.ts";
import { DIFFICULTY_POLICY_VERSION, GENERATOR_V2_VERSION, GenerationV2Error, SOLVER_VERSION, VARIANT_VERSION } from "./types.ts";
import { WAVE_F_CAPABILITY_METADATA } from "./wave-f-capability-metadata.ts";
import { WAVE_F_ENGINE_VERSION, type WaveFOutcomeContract } from "./wave-f-contracts.ts";

type JsonValue = string | number | boolean | null | readonly JsonValue[] | Readonly<{ [key: string]: JsonValue }>;
export type WaveFNormalizedProblemModel = Readonly<{
  schemaVersion: 1;
  engineVersion: typeof WAVE_F_ENGINE_VERSION;
  outcomeId: string;
  variantId: WaveFOutcomeContract["canonicalVariantId"];
  profile: WaveFOutcomeContract["profile"];
  grade: number;
  difficulty: GenerateQuestionInput["difficulty"];
  structureLevel: 1 | 2 | 3;
  structuralFingerprint: string;
  templateIndex: number;
  contextIndex: number;
  representationIndex: number;
  interactionType: ProductInteractionContract["type"];
  operation: string;
  values: readonly number[];
  labels: readonly string[];
  meta: Readonly<Record<string, JsonValue>>;
}>;
type SemanticSolution = Readonly<{ answer: CanonicalResponse; distractors: readonly string[]; steps: readonly string[]; nextStep: string }>;
type WaveFSolution = Readonly<{ correct: CanonicalResponse; accepted: readonly CanonicalResponse[]; steps: readonly string[]; nextStep: string; options?: readonly PublicOption[]; leftItems?: readonly PublicOption[]; rightItems?: readonly PublicOption[]; optionMisconceptions?: Readonly<Record<string, MisconceptionCode>> }>;

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const display = (answer: CanonicalResponse): string => {
  if (typeof answer === "number" || typeof answer === "string") return String(answer);
  if (Array.isArray(answer)) return answer.every((item) => typeof item === "string") ? answer.join(" → ") : answer.map((item) => `${item.leftId}=${item.rightId}`).join("; ");
  const fraction = answer as Readonly<{ numerator: number; denominator: number }>;
  return `${fraction.numerator}/${fraction.denominator}`;
};
const normalize = (answer: CanonicalResponse): string => typeof answer === "string" ? answer.trim().toLocaleLowerCase("vi").replace(/\s+/gu, "") : JSON.stringify(answer);
class Random {
  private cursor = 0;
  private readonly seed: string;
  constructor(seed: string) { this.seed = seed; }
  int(minimum: number, maximum: number) { if (maximum < minimum) throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED"); const bytes = createHash("sha256").update(`${this.seed}:${this.cursor++}`).digest(); return minimum + bytes.readUInt32BE(0) % (maximum - minimum + 1); }
  pick<T>(items: readonly T[]): T { return items[this.int(0, items.length - 1)]!; }
  shuffle<T>(items: readonly T[]): T[] { return [...items].map((item) => ({ item, key: this.int(0, 1_000_000) })).sort((a, b) => a.key - b.key).map(({ item }) => item); }
}

const STRUCTURE = { EASY: 1, MEDIUM: 2, HARD: 3 } as const;
const LEADS = [
  "Đọc kĩ dữ kiện", "Xác định đại lượng cần tìm", "Đối chiếu từng nhãn", "Hoàn thành phiếu học tập", "Kiểm tra quan hệ đã cho", "Giúp nhóm học tập", "Tính từ dữ kiện gốc", "Suy luận từng bước",
  "Dùng đúng định nghĩa", "So sánh trước khi chọn", "Kiểm tra bằng phép tính ngược", "Đọc đúng đơn vị", "Phân tích bảng thông tin", "Chọn bằng chứng trực tiếp", "Hoàn thiện nhiệm vụ", "Đánh giá từng phương án",
  "Tách bài toán thành các bước", "Xác minh điều kiện", "Nêu kết luận từ số liệu", "Chuẩn hoá kết quả", "Theo dõi vị trí chưa biết", "Kết nối dữ kiện và câu hỏi", "Kiểm tra miền xác định", "Dùng công thức đã nêu",
  "Hoàn thành thử thách", "Đọc bảng từ trái sang phải", "Giải thích bằng quan hệ toán học", "Chọn phép tính phù hợp", "Đối chiếu kết quả", "Kiểm tra sai lầm thường gặp", "Sắp xếp thông tin", "Hoàn thiện phần tự kiểm tra",
] as const;
const CONTEXTS = ["phiếu học tập", "hoạt động trên lớp", "bài tập của nhóm", "góc tự học", "buổi thực hành", "câu lạc bộ Toán", "dự án liên môn", "bảng theo dõi", "bài kiểm tra nhanh", "phần trình bày", "sổ thực hành", "ngày hội khoa học", "nhiệm vụ vận dụng", "bảng con", "bản nháp", "buổi ôn tập"] as const;
const FRAMES = ["trên thẻ nhiệm vụ", "trong bảng dữ kiện", "từ ghi chép của nhóm", "trên phiếu kiểm tra", "trong báo cáo ngắn", "từ mô hình đã cho", "trên bảng lớp", "trong sổ tay", "từ bộ thẻ học", "trong phần tự kiểm tra", "trên phiếu khảo sát", "từ bản trình bày", "trong hồ sơ dự án", "trên bảng con", "từ ví dụ minh hoạ", "trong bài luyện tập"] as const;
const OBJECT_SETS = [
  ["thùng sách", "thùng đồ chơi", "thùng giấy", "thùng nước"], ["quả bí", "túi cam", "giỏ táo", "sọt chanh"], ["kiện hàng A", "kiện hàng B", "kiện hàng C", "kiện hàng D"], ["mô hình A", "mô hình B", "mô hình C", "mô hình D"],
] as const;
const DATA_LABEL_SETS = [
  ["Tháng Một", "Tháng Hai", "Tháng Ba", "Tháng Tư"], ["Khu A", "Khu B", "Khu C", "Khu D"], ["Mẫu 1", "Mẫu 2", "Mẫu 3", "Mẫu 4"], ["Năm thứ nhất", "Năm thứ hai", "Năm thứ ba", "Năm thứ tư"],
] as const;

function makeModel(contract: WaveFOutcomeContract, input: GenerateQuestionInput, random: Random, data: Readonly<{ operation: string; values: readonly number[]; labels?: readonly string[]; meta?: Readonly<Record<string, JsonValue>>; fingerprint: string }>): WaveFNormalizedProblemModel {
  const interactionType = input.interactionType ?? contract.interactionPolicy[0]!;
  if (!contract.interactionPolicy.includes(interactionType)) throw new GenerationV2Error("INTERACTION_UNSUPPORTED");
  const structureLevel = STRUCTURE[input.difficulty];
  return { schemaVersion: 1, engineVersion: WAVE_F_ENGINE_VERSION, outcomeId: contract.outcomeId, variantId: contract.canonicalVariantId, profile: contract.profile, grade: contract.grade, difficulty: input.difficulty, structureLevel, structuralFingerprint: `${contract.canonicalVariantId}:${data.fingerprint}:structure-${structureLevel}`, templateIndex: random.int(0, LEADS.length - 1), contextIndex: random.int(0, CONTEXTS.length - 1), representationIndex: random.int(0, FRAMES.length - 1), interactionType, operation: data.operation, values: data.values, labels: data.labels ?? [], meta: data.meta ?? {} };
}

function buildModel(contract: WaveFOutcomeContract, input: GenerateQuestionInput, random: Random): WaveFNormalizedProblemModel {
  const level = STRUCTURE[input.difficulty];
  switch (contract.canonicalVariantId) {
    case "TENS_ONES_STRUCTURE": {
      const tens = random.int(1, 9); let ones = level === 1 ? 0 : random.int(1, 9); if (ones === tens) ones = ones === 9 ? 8 : ones + 1;
      const number = tens * 10 + ones;
      return makeModel(contract, input, random, { operation: ones === 0 ? "ROUND_TEN_STRUCTURE" : "TENS_ONES_STRUCTURE", values: [number], labels: ["số chục", "số đơn vị", "phân loại"], fingerprint: `${ones === 0 ? "round" : "composed"}-${tens}-${ones}-${random.int(0, 31)}` });
    }
    case "MASS_COMPARISON_REASONING": {
      const count = level === 1 ? 3 : 4; const base = random.int(2, 9); const step = random.int(2, 5); const values = Array.from({ length: count }, (_, index) => base + index * step + (index === count - 1 ? level : 0));
      const labels = random.pick(OBJECT_SETS).slice(0, count);
      return makeModel(contract, input, random, { operation: "ORDER_HEAVIEST_TO_LIGHTEST", values, labels, fingerprint: `mass-${count}-${step}-${random.int(0, 31)}`, meta: { unit: "kg" } });
    }
    case "UNIFORM_MOTION_REASONING": {
      const speed = random.int(3 + level, 12 + level * 5) * 5; const time = random.int(2, 4 + level); const distance = speed * time;
      const operation = level === 1 ? "FIND_DISTANCE" : level === 2 ? random.pick(["FIND_SPEED", "FIND_DISTANCE"]) : random.pick(["FIND_TIME", "FIND_SPEED", "FIND_DISTANCE"]);
      const values = operation === "FIND_DISTANCE" ? [speed, time] : operation === "FIND_SPEED" ? [distance, time] : [distance, speed];
      const labels = operation === "FIND_DISTANCE" ? ["vận tốc (km/h)", "thời gian (giờ)"] : operation === "FIND_SPEED" ? ["quãng đường (km)", "thời gian (giờ)"] : ["quãng đường (km)", "vận tốc (km/h)"];
      return makeModel(contract, input, random, { operation, values, labels, fingerprint: `motion-${operation}-${speed}-${time}-${random.int(0, 15)}` });
    }
    case "CROSS_CURRICULAR_STATISTICS_REASONING": {
      const labels = random.pick(DATA_LABEL_SETS); const base = random.int(8, 30 + level * 5); const sampled = [0, random.int(2, 7), random.int(8, 13), random.int(3, 9)]; const increments: number[] = [];
      for (const candidate of sampled) { let value = candidate; while (increments.includes(value)) value += 1; increments.push(value); }
      const values = increments.map((increment) => base + increment);
      const operation = level === 1 ? "SUPPORTED_MAXIMUM" : level === 2 ? random.pick(["SUPPORTED_MINIMUM", "SUPPORTED_DIFFERENCE"]) : random.pick(["SUPPORTED_RANGE", "SUPPORTED_MAXIMUM", "SUPPORTED_DIFFERENCE"]);
      const subject = contract.grade === 6 ? "nhiệt độ trung bình trong thí nghiệm Khoa học tự nhiên" : contract.grade === 7 ? "lượng mưa trong báo cáo Địa lí" : "số mẫu đạt chuẩn trong dự án Khoa học tự nhiên";
      return makeModel(contract, input, random, { operation, values, labels, fingerprint: `cross-data-${operation}-${random.int(0, 63)}`, meta: { subject, unit: contract.grade === 6 ? "°C" : contract.grade === 7 ? "mm" : "mẫu" } });
    }
    case "TAX_CALCULATION_REASONING": {
      const rate = random.pick([5, 10, 20]); const base = random.int(5, 40 + level * 10) * 100_000; const total = base * (100 + rate) / 100;
      const operation = level === 1 ? "FIND_TAX" : level === 2 ? "FIND_TOTAL_AFTER_TAX" : "FIND_PRE_TAX_PRICE";
      const values = operation === "FIND_PRE_TAX_PRICE" ? [total, rate] : [base, rate];
      const labels = operation === "FIND_PRE_TAX_PRICE" ? ["giá sau thuế (đồng)", "thuế suất (%)"] : ["giá trước thuế (đồng)", "thuế suất (%)"];
      return makeModel(contract, input, random, { operation, values, labels, fingerprint: `tax-${operation}-${rate}-${Math.floor(base / 100_000)}-${random.int(0, 15)}` });
    }
    case "RATIONAL_EXPRESSION_PROPERTY_REASONING": {
      const operation = level === 1 ? "MULTIPLY_BOTH_NONZERO" : level === 2 ? random.pick(["COMMON_SIGN_CHANGE", "MULTIPLY_BOTH_NONZERO"]) : random.pick(["CANCEL_COMMON_FACTOR_DOMAIN", "COMMON_SIGN_CHANGE", "MULTIPLY_BOTH_NONZERO"]);
      const a = random.int(2, 7), b = random.int(1, 6), k = random.int(2, 5);
      return makeModel(contract, input, random, { operation, values: [a, b, k], labels: ["tử thức", "mẫu thức", "nhân tử khác 0"], fingerprint: `rational-property-${operation}-${a}-${b}-${k}-${random.int(0, 31)}` });
    }
    case "RATIONAL_EXPRESSION_CONCEPT_REASONING": {
      const a = random.int(2, 5); const c = random.int(1, 5); const x0 = c + random.int(1, 4); const value = random.int(2, 8); const b = value * (x0 - c) - a * x0; const k = random.int(2, 4);
      return makeModel(contract, input, random, { operation: "MATCH_RATIONAL_CONCEPTS", values: [a, b, c, x0, k], labels: ["điều kiện xác định", `giá trị tại x = ${x0}`, "phân thức bằng nhau"], fingerprint: `rational-concepts-${a}-${b}-${c}-${x0}-${k}-${random.int(0, 31)}` });
    }
    case "SCIENTIFIC_ALGEBRA_REASONING": {
      const operation = level === 1 ? "ATOM_TOTAL" : level === 2 ? random.pick(["BIOLOGY_GROWTH", "ATOM_TOTAL"]) : random.pick(["FIND_SAMPLE_COUNT", "BIOLOGY_GROWTH", "ATOM_TOTAL"]);
      if (operation === "ATOM_TOTAL") { const count = random.int(3, 8 + level); const atoms = random.int(2, 5); return makeModel(contract, input, random, { operation, values: [count, atoms], labels: ["số phân tử", "số nguyên tử mỗi phân tử"], fingerprint: `science-atoms-${count}-${atoms}-${random.int(0, 31)}`, meta: { formula: "T = n × a", unit: "nguyên tử" } }); }
      if (operation === "BIOLOGY_GROWTH") { const population = random.int(5, 20) * 10; const factor = random.int(2, 4); return makeModel(contract, input, random, { operation, values: [population, factor], labels: ["số tế bào ban đầu", "hệ số tăng"], fingerprint: `science-growth-${population}-${factor}-${random.int(0, 31)}`, meta: { formula: "P_sau = k × P_đầu", unit: "tế bào" } }); }
      const sampleCount = random.int(3, 10); const amountEach = random.int(2, 7); return makeModel(contract, input, random, { operation, values: [sampleCount * amountEach, amountEach], labels: ["tổng lượng chất (mg)", "lượng chất mỗi mẫu (mg)"], fingerprint: `science-samples-${sampleCount}-${amountEach}-${random.int(0, 31)}`, meta: { formula: "M = n × m", unit: "mẫu" } });
    }
  }
}

function solveModel(model: WaveFNormalizedProblemModel): SemanticSolution {
  const v = model.values; let answer: CanonicalResponse; let distractors: string[];
  switch (model.operation) {
    case "ROUND_TEN_STRUCTURE": case "TENS_ONES_STRUCTURE": { const number = v[0]!, tens = Math.floor(number / 10), ones = number % 10; answer = [{ leftId: "số chục", rightId: String(tens) }, { leftId: "số đơn vị", rightId: String(ones) }, { leftId: "phân loại", rightId: ones === 0 ? "số tròn chục" : "không phải số tròn chục" }]; distractors = [String(number), String(tens * 10), ones === 0 ? "không phải số tròn chục" : "số tròn chục"]; break; }
    case "ORDER_HEAVIEST_TO_LIGHTEST": answer = model.labels.map((label, index) => ({ label, value: v[index]! })).sort((a, b) => b.value - a.value).map((item) => item.label); distractors = [...model.labels].reverse(); break;
    case "FIND_DISTANCE": answer = v[0]! * v[1]!; distractors = [String(v[0]! + v[1]!), String(Math.abs(v[0]! - v[1]!)), String(Math.round(v[0]! / v[1]!))]; break;
    case "FIND_SPEED": answer = v[0]! / v[1]!; distractors = [String(v[0]! * v[1]!), String(v[0]! - v[1]!), String(v[1])]; break;
    case "FIND_TIME": answer = v[0]! / v[1]!; distractors = [String(v[0]! * v[1]!), String(v[0]! - v[1]!), String(v[1])]; break;
    case "SUPPORTED_MAXIMUM": { const index = v.indexOf(Math.max(...v)); answer = `${model.labels[index]} có ${v[index]} ${String(model.meta.unit)}, lớn nhất trong bảng`; distractors = [`${model.labels[0]} luôn nhỏ nhất`, `mọi giá trị trong bảng bằng nhau`, `${model.labels[(index + 1) % model.labels.length]} có giá trị lớn nhất`]; break; }
    case "SUPPORTED_MINIMUM": { const index = v.indexOf(Math.min(...v)); answer = `${model.labels[index]} có ${v[index]} ${String(model.meta.unit)}, nhỏ nhất trong bảng`; distractors = [`${model.labels[1]} luôn lớn nhất`, `mọi giá trị trong bảng giảm đều`, `${model.labels[(index + 2) % model.labels.length]} có giá trị nhỏ nhất`]; break; }
    case "SUPPORTED_DIFFERENCE": { const min = Math.min(...v), max = Math.max(...v); answer = `chênh lệch lớn nhất là ${max - min} ${String(model.meta.unit)}`; distractors = [`chênh lệch lớn nhất là ${max + min} ${String(model.meta.unit)}`, `chênh lệch lớn nhất là ${max} ${String(model.meta.unit)}`, "không thể so sánh các số liệu"]; break; }
    case "SUPPORTED_RANGE": { const min = Math.min(...v), max = Math.max(...v); answer = `các số liệu nằm từ ${min} đến ${max} ${String(model.meta.unit)}`; distractors = [`mọi số liệu đều bằng ${max}`, `các số liệu nằm ngoài khoảng ${min} đến ${max}`, "bảng không cung cấp dữ liệu định lượng"]; break; }
    case "FIND_TAX": answer = v[0]! * v[1]! / 100; distractors = [String(v[0]! + v[1]!), String(v[0]), String(v[0]! * v[1]!)]; break;
    case "FIND_TOTAL_AFTER_TAX": answer = v[0]! * (100 + v[1]!) / 100; distractors = [String(v[0]! * v[1]! / 100), String(v[0]! - v[0]! * v[1]! / 100), String(v[0]! + v[1]!)]; break;
    case "FIND_PRE_TAX_PRICE": answer = v[0]! * 100 / (100 + v[1]!); distractors = [String(v[0]! * v[1]! / 100), String(v[0]! - v[1]!), String(v[0])]; break;
    case "MULTIPLY_BOTH_NONZERO": answer = `Nhân cả tử và mẫu với ${v[2]} (khác 0) thì được phân thức bằng phân thức đã cho.`; distractors = [`Chỉ nhân tử thức với ${v[2]} thì phân thức luôn không đổi.`, "Có thể nhân mẫu thức với 0 mà phân thức vẫn xác định.", "Nhân tử và mẫu với hai biểu thức tuỳ ý luôn cho phân thức bằng nhau."]; break;
    case "COMMON_SIGN_CHANGE": answer = `Với ví dụ ${v[0]}/${v[1]}, đổi dấu đồng thời cả tử thức và mẫu thức thì giá trị phân thức không đổi.`; distractors = [`Với ${v[0]}/${v[1]}, chỉ đổi dấu mẫu thức thì giá trị không đổi.`, "Đổi dấu tử thức luôn làm phân thức bằng 0.", "Mọi phân thức đều bằng phân thức đối của nó."]; break;
    case "CANCEL_COMMON_FACTOR_DOMAIN": answer = `Có thể rút gọn nhân tử chung ${v[2]} khác 0 và vẫn phải giữ điều kiện xác định của phân thức ban đầu.`; distractors = ["Rút gọn xong thì bỏ mọi điều kiện xác định ban đầu.", "Có thể khử hai hạng tử đang cộng với nhau.", "Mẫu thức bằng 0 vẫn cho một giá trị hợp lệ."]; break;
    case "MATCH_RATIONAL_CONCEPTS": { const [a, b, c, x0, k] = v; const numerator = `${a}x ${b! >= 0 ? "+" : "−"} ${Math.abs(b!)}`; const denominator = `x − ${c}`; const value = (a! * x0! + b!) / (x0! - c!); answer = [{ leftId: "điều kiện xác định", rightId: `x ≠ ${c}` }, { leftId: `giá trị tại x = ${x0}`, rightId: String(value) }, { leftId: "phân thức bằng nhau", rightId: `(${k}(${numerator}))/(${k}(${denominator}))` }]; distractors = [`x = ${c}`, String(a! * x0! + b!), `(${numerator})/(${k}(${denominator}))`]; break; }
    case "ATOM_TOTAL": answer = v[0]! * v[1]!; distractors = [String(v[0]! + v[1]!), String(v[0]), String(v[1])]; break;
    case "BIOLOGY_GROWTH": answer = v[0]! * v[1]!; distractors = [String(v[0]! + v[1]!), String(v[0]), String(v[1])]; break;
    case "FIND_SAMPLE_COUNT": answer = v[0]! / v[1]!; distractors = [String(v[0]! * v[1]!), String(v[0]! - v[1]!), String(v[1])]; break;
    default: throw new GenerationV2Error("SOLVER_FAILED");
  }
  const focus = model.profile === "ALGEBRA" ? "Kiểm tra điều kiện xác định và biến đổi đồng thời tử thức, mẫu thức." : model.profile === "DATA" ? "Đọc đúng nhãn và chỉ kết luận điều được số liệu trực tiếp hỗ trợ." : model.profile === "MEASUREMENT" ? "Xác định đúng đại lượng, phép tính và đơn vị." : model.profile === "FINANCE" ? "Xác định giá gốc, thuế suất và khoản tiền đang cần tìm." : model.profile === "ARITHMETIC" ? "Tách số theo chục và đơn vị trước khi phân loại." : "Chuyển quy tắc khoa học đã nêu thành quan hệ đại số chính xác.";
  const nextStep = model.profile === "DATA" ? "Đối chiếu kết luận với từng hàng trong bảng." : model.profile === "ALGEBRA" ? "Thay một giá trị hợp lệ trở lại để tự kiểm tra." : "Thay kết quả vào quan hệ ban đầu và kiểm tra đơn vị.";
  return { answer, distractors, steps: [focus, "Thực hiện phép tính hoặc đối chiếu từ dữ kiện công khai.", `Kết quả đúng là ${display(answer)}.`], nextStep };
}

function promptFor(model: WaveFNormalizedProblemModel): string {
  const lead = `Chủ đề: ${CONTEXTS[model.contextIndex]}. Hãy đọc kĩ dữ kiện ${FRAMES[model.representationIndex]}`; const v = model.values;
  switch (model.operation) {
    case "ROUND_TEN_STRUCTURE": case "TENS_ONES_STRUCTURE": return `${lead}. Số ${v[0]} có bao nhiêu chục, bao nhiêu đơn vị và có phải là số tròn chục không? Ghép từng mục với kết quả đúng.`;
    case "ORDER_HEAVIEST_TO_LIGHTEST": return `${lead}. Các vật có khối lượng lần lượt: ${model.labels.map((label, index) => `${label} ${v[index]} ${String(model.meta.unit)}`).join("; ")}. Sắp xếp từ nặng nhất đến nhẹ nhất.`;
    case "FIND_DISTANCE": return `${lead}. Một chuyển động đều có vận tốc ${v[0]} km/h trong ${v[1]} giờ. Tính quãng đường đi được, theo ki-lô-mét.`;
    case "FIND_SPEED": return `${lead}. Một chuyển động đều đi ${v[0]} km trong ${v[1]} giờ. Tính vận tốc, theo km/h.`;
    case "FIND_TIME": return `${lead}. Một chuyển động đều đi ${v[0]} km với vận tốc ${v[1]} km/h. Tính thời gian, theo giờ.`;
    case "SUPPORTED_MAXIMUM": case "SUPPORTED_MINIMUM": case "SUPPORTED_DIFFERENCE": case "SUPPORTED_RANGE": return `${lead}. Bảng mô tả ${String(model.meta.subject)}. Chọn đúng một kết luận được các số liệu trong bảng hỗ trợ.`;
    case "FIND_TAX": return `${lead}. Giá trước thuế là ${v[0]} đồng, thuế suất ${v[1]}%. Tính số tiền thuế.`;
    case "FIND_TOTAL_AFTER_TAX": return `${lead}. Giá trước thuế là ${v[0]} đồng, thuế suất ${v[1]}%. Tính giá sau thuế.`;
    case "FIND_PRE_TAX_PRICE": return `${lead}. Giá sau thuế là ${v[0]} đồng với thuế suất ${v[1]}%. Tính giá trước thuế.`;
    case "MULTIPLY_BOTH_NONZERO": case "COMMON_SIGN_CHANGE": case "CANCEL_COMMON_FACTOR_DOMAIN": return `${lead}. Với phân thức A/B và B ≠ 0, chọn phát biểu đúng về tính chất cơ bản của phân thức đại số.`;
    case "MATCH_RATIONAL_CONCEPTS": { const [a, b, c] = v; return `${lead}. Cho phân thức (${a}x ${b! >= 0 ? "+" : "−"} ${Math.abs(b!)})/(x − ${c}). Ghép mỗi khái niệm với kết quả chính xác.`; }
    case "ATOM_TOTAL": return `${lead}. Trong mô hình Hoá học, quy tắc T = n × a. Có ${v[0]} phân tử, mỗi phân tử có ${v[1]} nguyên tử đang xét. Tính T.`;
    case "BIOLOGY_GROWTH": return `${lead}. Trong mô hình Sinh học, P_sau = k × P_đầu. Ban đầu có ${v[0]} tế bào và hệ số tăng là ${v[1]}. Tính số tế bào sau đó.`;
    case "FIND_SAMPLE_COUNT": return `${lead}. Trong mô hình Hoá học, M = n × m. Tổng lượng chất là ${v[0]} mg, mỗi mẫu chứa ${v[1]} mg. Tính số mẫu n.`;
    default: throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
  }
}

function adaptSolution(model: WaveFNormalizedProblemModel, semantic: SemanticSolution, random: Random): WaveFSolution {
  const misconception: MisconceptionCode = model.profile === "ALGEBRA" ? "EQUATION_DOMAIN_ERROR" : model.profile === "MEASUREMENT" ? "UNIT_CONVERSION_ERROR" : model.profile === "ARITHMETIC" ? "PLACE_VALUE_CONFUSION" : "DATA_RELATION_IGNORED";
  if (model.interactionType === "SINGLE_CHOICE") { const correctLabel = display(semantic.answer); const labels = [...new Set([correctLabel, ...semantic.distractors])].slice(0, 4); const options = random.shuffle(labels.map((label) => ({ id: `o-${hash(`${model.outcomeId}:${label}`).slice(0, 10)}`, label }))); const correct = options.find((option) => option.label === correctLabel)!.id; return { correct, accepted: [correct], steps: semantic.steps, nextStep: semantic.nextStep, options, optionMisconceptions: Object.fromEntries(options.filter((option) => option.id !== correct).map((option) => [option.id, misconception])) }; }
  if (model.interactionType === "ORDERING") { const labels = semantic.answer as readonly string[]; const options = labels.map((label) => ({ id: `o-${hash(`${model.outcomeId}:${label}`).slice(0, 10)}`, label })); const correct = options.map((option) => option.id); return { correct, accepted: [correct], steps: semantic.steps, nextStep: semantic.nextStep, options }; }
  if (model.interactionType === "MATCHING") { const pairs = semantic.answer as readonly MatchingPair[]; const leftItems = pairs.map((pair) => ({ id: pair.leftId, label: pair.leftId })); const rightItems = [...new Map([...pairs.map((pair) => ({ id: pair.rightId, label: pair.rightId })), ...semantic.distractors.map((label) => ({ id: label, label }))].map((item) => [item.id, item])).values()]; return { correct: pairs, accepted: [pairs], steps: semantic.steps, nextStep: semantic.nextStep, leftItems, rightItems }; }
  if (typeof semantic.answer !== "number") throw new GenerationV2Error("SOLVER_FAILED");
  return { correct: semantic.answer, accepted: [semantic.answer, String(semantic.answer)], steps: semantic.steps, nextStep: semantic.nextStep };
}

function visualFor(model: WaveFNormalizedProblemModel): ProductVisual {
  const type = WAVE_F_CAPABILITY_METADATA[model.variantId].visualType;
  if (type === "MEASUREMENT_MODEL") return { type, description: "Các khối lượng dùng làm bằng chứng so sánh.", data: { labels: model.labels, values: model.values, unit: model.meta.unit, operation: model.operation } };
  if (model.variantId === "TENS_ONES_STRUCTURE") return { type: "DATA_TABLE", description: "Bảng số cần phân tích theo chục và đơn vị.", data: { rows: [{ name: "Số đang xét", value: model.values[0] }], operation: model.operation } };
  if (model.variantId === "CROSS_CURRICULAR_STATISTICS_REASONING") return { type: "DATA_TABLE", description: `Bảng ${String(model.meta.subject)} với nhãn và đơn vị đầy đủ.`, data: { rows: model.labels.map((label, index) => ({ name: label, value: `${model.values[index]} ${String(model.meta.unit)}` })), operation: model.operation } };
  if (model.variantId === "RATIONAL_EXPRESSION_PROPERTY_REASONING") return { type: "DATA_TABLE", description: "Điều kiện chung của phân thức đại số đang xét.", data: { rows: [{ name: "Phân thức", value: "A/B" }, { name: "Điều kiện", value: "B ≠ 0" }], operation: model.operation } };
  if (model.variantId === "RATIONAL_EXPRESSION_CONCEPT_REASONING") { const [a, b, c] = model.values; return { type: "DATA_TABLE", description: "Phân thức và giá trị x cần dùng trong bài.", data: { rows: [{ name: "Phân thức", value: `(${a}x ${b! >= 0 ? "+" : "−"} ${Math.abs(b!)})/(x − ${c})` }, { name: "Giá trị cần xét", value: `x = ${model.values[3]}` }], operation: model.operation } }; }
  return { type: "DATA_TABLE", description: "Bảng dữ kiện công khai của bài toán.", data: { rows: model.labels.map((label, index) => ({ name: label, value: model.values[index] })), formula: model.meta.formula ?? null, operation: model.operation } };
}

function interactionFor(model: WaveFNormalizedProblemModel, solution: WaveFSolution, random: Random): ProductInteractionContract {
  if (model.interactionType === "SINGLE_CHOICE") return { type: "SINGLE_CHOICE", options: solution.options, choiceCount: 1 };
  if (model.interactionType === "ORDERING") return { type: "ORDERING", options: random.shuffle(solution.options ?? []) };
  if (model.interactionType === "MATCHING") return { type: "MATCHING", leftItems: solution.leftItems, rightItems: random.shuffle(solution.rightItems ?? []) };
  return { type: "INTEGER_INPUT", inputLabel: model.operation.startsWith("FIND_") ? "Giá trị cần tìm" : "Kết quả", inputMode: "numeric", unitLabel: model.operation.includes("TAX") || model.operation === "FIND_TOTAL_AFTER_TAX" || model.operation === "FIND_PRE_TAX_PRICE" ? "đồng" : undefined };
}

function validateModel(contract: WaveFOutcomeContract, model: WaveFNormalizedProblemModel, solution: WaveFSolution, prompt: string, interaction: ProductInteractionContract, visual: ProductVisual) {
  if (model.outcomeId !== contract.outcomeId || model.grade !== contract.grade || model.variantId !== contract.canonicalVariantId || model.engineVersion !== WAVE_F_ENGINE_VERSION) throw new GenerationV2Error("VALIDATION_FAILED");
  if (prompt !== promptFor(model) || interaction.type !== model.interactionType || visual.type !== WAVE_F_CAPABILITY_METADATA[model.variantId].visualType || JSON.stringify(visual) !== JSON.stringify(visualFor(model))) throw new GenerationV2Error("VALIDATION_FAILED");
  if (model.values.some((value) => !Number.isFinite(value) || Math.abs(value) > Math.max(contract.parameterBounds.maximum, 10_000_000))) throw new GenerationV2Error("VALIDATION_FAILED");
  if (model.operation === "ORDER_HEAVIEST_TO_LIGHTEST" && new Set(model.values).size !== model.values.length) throw new GenerationV2Error("VALIDATION_FAILED");
  if (model.operation === "MATCH_RATIONAL_CONCEPTS" && model.values[3] === model.values[2]) throw new GenerationV2Error("VALIDATION_FAILED");
  const semantic = solveModel(model);
  if (model.interactionType === "SINGLE_CHOICE") { const expected = display(semantic.answer); const actual = interaction.options?.find((option) => option.id === solution.correct)?.label; if (actual !== expected) throw new GenerationV2Error("VALIDATION_FAILED"); }
  else { const replay = adaptSolution(model, semantic, new Random(`${contract.outcomeId}:${model.difficulty}:validation`)); if (normalize(replay.correct) !== normalize(solution.correct)) throw new GenerationV2Error("VALIDATION_FAILED"); }
  if (interaction.options) { const ids = interaction.options.map((option) => option.id), labels = interaction.options.map((option) => option.label); if (new Set(ids).size !== ids.length || new Set(labels).size !== labels.length) throw new GenerationV2Error("VALIDATION_FAILED"); }
  const serialized = JSON.stringify({ prompt, interaction, visual }); for (const forbidden of ["correctResponse", "acceptedResponses", "privateSolution", "solverReceipt", "rawSeed"]) if (serialized.includes(forbidden)) throw new GenerationV2Error("VALIDATION_FAILED");
  return { ok: true as const, checks: ["EXPLICIT_OUTCOME_CONTRACT", "INDEPENDENT_SOLVER_RECOMPUTATION", "UNIQUE_OR_EXPLICIT_ACCEPTED_ANSWER", "EXACT_ARITHMETIC_OR_SYMBOLIC_RELATION", "GRADE_AND_DOMAIN_BOUNDS", "PROMPT_MODEL_ALIGNMENT", "VISUAL_DATA_MODEL_ALIGNMENT", "DISTRACTOR_FALSEHOOD_AND_UNIQUENESS", "NO_PRIVATE_LEAK"] };
}

const responseInstruction = (type: ProductInteractionContract["type"]) => type === "ORDERING" ? "Sắp xếp các mục theo thứ tự được yêu cầu." : type === "MATCHING" ? "Ghép từng mục với kết quả đúng." : type === "SINGLE_CHOICE" ? "Chọn một phương án được dữ kiện hỗ trợ." : "Nhập giá trị chính xác.";
export function generateWaveFQuestion(contract: WaveFOutcomeContract, input: GenerateQuestionInput): GeneratedProductQuestion {
  if (contract.grade !== input.grade) throw new GenerationV2Error("GRADE_MISMATCH");
  const random = new Random(`${contract.outcomeId}:${input.difficulty}:${input.seed}`); const model = buildModel(contract, input, random); const semantic = solveModel(model); const solution = adaptSolution(model, semantic, random); const prompt = promptFor(model); const visual = visualFor(model); const interaction = interactionFor(model, solution, random); const validation = validateModel(contract, model, solution, prompt, interaction, visual); const modelHash = hash(JSON.stringify(model));
  const publicSnapshot = { schemaVersion: 2 as const, questionId: `v2-${contract.canonicalVariantId.toLowerCase().replaceAll("_", "-")}-${hash(`${input.outcomeId}:${input.seed}:${input.difficulty}`).slice(0, 16)}`, grade: contract.grade, outcomeId: contract.outcomeId, productFamilyId: contract.productFamilyId, variantId: contract.canonicalVariantId, variantVersion: VARIANT_VERSION, difficulty: input.difficulty, publicPrompt: prompt, publicData: { taskMode: contract.taskMode, operation: model.operation, values: model.values, labels: model.labels, meta: model.meta, structuralFingerprint: model.structuralFingerprint, difficultyStructure: model.structureLevel }, interaction, visual, accessibility: { prompt, visualAlternative: visual.description, responseInstruction: responseInstruction(interaction.type) } };
  const privateSolution = { correctResponse: solution.correct, acceptedResponses: solution.accepted, solutionSteps: solution.steps, optionMisconceptions: solution.optionMisconceptions ?? {}, nextStep: solution.nextStep }; const solverReceipt = { solverVersion: SOLVER_VERSION, normalizedInputHash: modelHash, resultHash: hash(JSON.stringify(solution.correct)), uniqueSolution: true };
  return { publicSnapshot, privateSolution, solverReceipt, validation, provenance: { questionSource: "GENERATED_V2", outcomeId: contract.outcomeId, productFamilyId: contract.productFamilyId, variantId: contract.canonicalVariantId, variantVersion: VARIANT_VERSION, generatorVersion: GENERATOR_V2_VERSION, solverVersion: SOLVER_VERSION, difficultyPolicyVersion: DIFFICULTY_POLICY_VERSION, seedFingerprint: hash(input.seed).slice(0, 16), normalizedModelHash: modelHash, publicSnapshotHash: hash(JSON.stringify(publicSnapshot)), visualHash: hash(JSON.stringify(visual)), solverReceiptHash: hash(JSON.stringify(solverReceipt)) } };
}

export const __waveFNegativeControl = {
  inspect(contract: WaveFOutcomeContract, input: GenerateQuestionInput) { const random = new Random(`${contract.outcomeId}:${input.difficulty}:${input.seed}`); const normalizedModel = buildModel(contract, input, random); const semantic = solveModel(normalizedModel); const solution = adaptSolution(normalizedModel, semantic, random); const prompt = promptFor(normalizedModel); const visual = visualFor(normalizedModel); const interaction = interactionFor(normalizedModel, solution, random); return { normalizedModel, semantic, solution, prompt, visual, interaction }; },
  validate: validateModel,
  recompute: solveModel,
};
