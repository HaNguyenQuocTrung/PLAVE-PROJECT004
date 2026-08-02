import { createHash } from "node:crypto";
import type { CanonicalResponse, FractionValue, GenerateQuestionInput, GeneratedProductQuestion, MatchingPair, MisconceptionCode, ProductInteractionContract, ProductVisual, PublicOption } from "./types.ts";
import { DIFFICULTY_POLICY_VERSION, GENERATOR_V2_VERSION, GenerationV2Error, SOLVER_VERSION, VARIANT_VERSION } from "./types.ts";
import { WAVE_E_CAPABILITY_METADATA } from "./wave-e-capability-metadata.ts";
import { WAVE_E_ENGINE_VERSION, type WaveEOutcomeContract } from "./wave-e-contracts.ts";

type JsonValue = string | number | boolean | null | readonly JsonValue[] | Readonly<{ [key: string]: JsonValue }>;
export type WaveENormalizedProblemModel = Readonly<{
  schemaVersion: 1; engineVersion: typeof WAVE_E_ENGINE_VERSION; outcomeId: string; variantId: WaveEOutcomeContract["canonicalVariantId"];
  profile: WaveEOutcomeContract["profile"]; grade: number; difficulty: GenerateQuestionInput["difficulty"]; structureLevel: 1 | 2 | 3;
  structuralFingerprint: string; templateIndex: number; contextIndex: number; representationIndex: number; interactionType: ProductInteractionContract["type"];
  operation: string; values: readonly number[]; labels: readonly string[]; scale: number; meta: Readonly<Record<string, JsonValue>>;
}>;
type SemanticSolution = Readonly<{ answer: CanonicalResponse; distractors: readonly string[]; steps: readonly string[]; nextStep: string }>;
type WaveESolution = Readonly<{ correct: CanonicalResponse; accepted: readonly CanonicalResponse[]; steps: readonly string[]; nextStep: string; options?: readonly PublicOption[]; leftItems?: readonly PublicOption[]; rightItems?: readonly PublicOption[]; optionMisconceptions?: Readonly<Record<string, MisconceptionCode>> }>;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const gcd = (a: number, b: number): number => b === 0 ? Math.abs(a) : gcd(b, a % b);
const fraction = (numerator: number, denominator: number): FractionValue => { if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator === 0) throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED"); const d = gcd(numerator, denominator); return { numerator: numerator / d, denominator: denominator / d }; };
const display = (answer: CanonicalResponse): string => {
  if (typeof answer === "number") return String(answer).replace(".", ",");
  if (typeof answer === "string") return answer;
  if (Array.isArray(answer)) return answer.every((item) => typeof item === "string") ? answer.join(" → ") : answer.map((item) => `${item.leftId}=${item.rightId}`).join("; ");
  const value = answer as FractionValue; return `${value.numerator}/${value.denominator}`;
};
const normalize = (answer: CanonicalResponse) => {
  if (typeof answer === "number") return String(Number(answer.toFixed(8)));
  if (typeof answer === "string") return answer.trim().toLocaleLowerCase("vi").replaceAll(",", ".").replace(/\s+/gu, "");
  if (Array.isArray(answer)) return JSON.stringify(answer);
  const value = answer as FractionValue; const reduced = fraction(value.numerator, value.denominator); return `${reduced.numerator}/${reduced.denominator}`;
};
class Random { private cursor = 0; private readonly seed: string; constructor(seed: string) { this.seed = seed; } int(minimum: number, maximum: number) { const bytes = createHash("sha256").update(`${this.seed}:${this.cursor++}`).digest(); return minimum + bytes.readUInt32BE(0) % (maximum - minimum + 1); } pick<T>(items: readonly T[]): T { return items[this.int(0, items.length - 1)]!; } shuffle<T>(items: readonly T[]): T[] { return [...items].map((item) => ({ item, key: this.int(0, 1_000_000) })).sort((a, b) => a.key - b.key).map(({ item }) => item); } }
const STRUCTURE = { EASY: 1, MEDIUM: 2, HARD: 3 } as const;
const LEADS = ["Đọc kĩ dữ kiện", "Đối chiếu các nhãn", "Phân tích bảng đã cho", "Kiểm tra từng khả năng", "Hoàn thành nhiệm vụ", "Chọn bằng chứng phù hợp", "Tính từ dữ liệu gốc", "Giải thích bằng số liệu", "Xác định đại lượng cần tìm", "Kiểm tra kết quả", "So sánh hai biểu diễn", "Suy luận từng bước", "Đọc đúng đơn vị", "Hoàn thiện bảng", "Đánh giá nhận xét", "Chọn mô hình đúng", "Theo dõi phép thử", "Tìm quy luật", "Lập kế hoạch thực hành", "Dùng định nghĩa", "Kiểm tra miền giá trị", "Chuẩn hóa kết quả", "Nêu kết luận", "Giúp nhóm học tập", "Hoàn thành phiếu khảo sát", "Đọc biểu đồ", "Xác minh quan hệ", "Chọn cách biểu diễn", "Kiểm tra tỉ lệ", "Tách bài toán thành bước", "Đối chiếu phép tính", "Hoàn thiện báo cáo"] as const;
const CONTEXTS = ["khảo sát lớp học", "câu lạc bộ Toán", "hoạt động thể thao", "vườn trường", "thư viện", "ngày hội khoa học", "bảng theo dõi thời tiết", "phiếu thực hành", "trò chơi xác suất", "dự án môi trường", "kế hoạch học tập", "chuyến tham quan", "bảng dữ liệu địa lí", "thí nghiệm khoa học", "góc thống kê", "buổi ôn tập"] as const;
const PROFILE_CONTEXTS = {
  ARITHMETIC: ["giờ luyện tính", "phiếu bài tập", "chuyến tham quan", "góc học tập", "trò chơi chia nhóm", "buổi ôn tập"],
  DATA: ["khảo sát lớp học", "bảng theo dõi", "dự án môi trường", "báo cáo của nhóm", "bảng dữ liệu địa lí", "góc thống kê"],
  PROBABILITY: ["trò chơi xác suất", "lượt thí nghiệm", "phiếu quan sát", "ngày hội khoa học", "mô phỏng ngẫu nhiên", "buổi thực hành"],
  ALGEBRA: ["phiếu hàm số", "bài luyện tập", "bảng giá trị", "buổi ôn tập", "bài toán trên lớp", "góc đại số"],
  GEOMETRY: ["giờ thực hành hình học", "phần mềm vẽ hình", "phiếu dựng hình", "bài học tam giác", "góc hình học", "buổi ôn tập"],
  MEASUREMENT: ["buổi thực hành đo", "khuôn viên trường", "mô hình đo lường", "phiếu ước lượng", "dự án của lớp", "giờ vận dụng"],
  FINANCE: ["kế hoạch đầu tư", "bảng chi phí", "tình huống bảo hiểm", "dự án tài chính", "phiếu so sánh", "buổi thực hành"],
  APPLIED: ["thí nghiệm khoa học", "bài tập liên môn", "phiếu cân bằng", "buổi thực hành", "dự án của nhóm", "giờ vận dụng"],
} as const;
const EVIDENCE_FRAMES = ["trên phiếu dữ liệu", "trong bảng kiểm", "từ ghi chép của nhóm", "trên thẻ nhiệm vụ", "trong báo cáo ngắn", "từ sơ đồ đã cho", "trên bảng lớp", "trong sổ thực hành", "từ bộ thẻ học", "trong phần tự kiểm tra", "trên phiếu khảo sát", "từ bản nháp", "trong hồ sơ dự án", "trên bảng con", "từ phần trình bày", "trong bài kiểm tra nhanh"] as const;
const LABEL_SETS = [["An", "Bình", "Chi", "Dũng"], ["Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm"], ["Nhóm A", "Nhóm B", "Nhóm C", "Nhóm D"], ["Đỏ", "Xanh", "Vàng", "Tím"], ["Mức 1", "Mức 2", "Mức 3", "Mức 4"]] as const;
const SINGLE_LABELS = ["hợp lí", "không hợp lí", "chưa đủ dữ kiện", "không liên quan"] as const;

function makeModel(contract: WaveEOutcomeContract, input: GenerateQuestionInput, random: Random, data: Readonly<{ operation: string; values?: readonly number[]; labels?: readonly string[]; scale?: number; meta?: Readonly<Record<string, JsonValue>>; fingerprint: string }>): WaveENormalizedProblemModel {
  const interactionType = input.interactionType ?? contract.interactionPolicy[0]!;
  if (!contract.interactionPolicy.includes(interactionType)) throw new GenerationV2Error("INTERACTION_UNSUPPORTED");
  const level = STRUCTURE[input.difficulty];
  return { schemaVersion: 1, engineVersion: WAVE_E_ENGINE_VERSION, outcomeId: contract.outcomeId, variantId: contract.canonicalVariantId, profile: contract.profile, grade: contract.grade, difficulty: input.difficulty, structureLevel: level, structuralFingerprint: `${contract.canonicalVariantId}:${data.fingerprint}:structure-${level}`, templateIndex: random.int(0, LEADS.length - 1), contextIndex: random.int(0, CONTEXTS.length - 1), representationIndex: random.int(0, 15), interactionType, operation: data.operation, values: data.values ?? [], labels: data.labels ?? [], scale: data.scale ?? 1, meta: data.meta ?? {} };
}

function dataset(random: Random, level: number) { const base = random.int(3, 10 + level * 4); const values = [base, base + random.int(2, 7), base + random.int(8, 13), base + random.int(1, 10)]; return { values, labels: random.pick(LABEL_SETS) }; }
function buildModel(contract: WaveEOutcomeContract, input: GenerateQuestionInput, random: Random): WaveENormalizedProblemModel {
  const level = STRUCTURE[input.difficulty]; const cap = contract.canonicalVariantId; const data = dataset(random, level);
  switch (cap) {
    case "DIVISION_FACT_APPLICATION": { const divisor = contract.grade === 2 ? random.pick([2, 5]) : random.int(2, 9); const quotient = random.int(2, 5 + level * 2); return makeModel(contract, input, random, { operation: "DIVIDE_FACT", values: [divisor * quotient, divisor, quotient], labels: ["tổng", "mỗi nhóm", "số nhóm"], fingerprint: `divide-${divisor}:unknown-${level}`, meta: { object: "thẻ" } }); }
    case "EVENT_CERTAINTY_LANGUAGE": return makeModel(contract, input, random, { operation: random.pick(["CERTAIN", "POSSIBLE", "IMPOSSIBLE"]), values: [random.int(1, 6)], fingerprint: `certainty-${level}-${random.int(0, 8)}`, meta: { trial: "rút một thẻ đánh số từ 1 đến 6" } });
    case "DATA_COLLECTION_CLASSIFICATION": { const records = ["quả táo", "quả cam", "bút chì", "quyển vở"]; return makeModel(contract, input, random, { operation: "CLASSIFY_RECORDS", values: data.values, labels: records, fingerprint: `classify-${level}-${random.int(0, 31)}`, meta: { groups: ["đồ ăn", "đồ dùng học tập"] } }); }
    case "PRACTICAL_MEASUREMENT_PLAN": return makeModel(contract, input, random, { operation: "MATCH_INSTRUMENT", values: [random.int(2, 20), random.int(1, 12)], labels: ["độ dài bàn", "khối lượng cặp", "dung tích chai"], fingerprint: `instrument-${level}-${random.int(0, 31)}`, meta: { instruments: ["thước mét", "cân", "ca chia vạch"] } });
    case "SIMPLE_TRIAL_OUTCOMES": case "SAMPLE_SPACE_RANDOM_TRIAL": return makeModel(contract, input, random, { operation: level === 1 ? "COIN_SPACE" : level === 2 ? "DIE_SPACE" : "TWO_COIN_SPACE", values: [level], labels: level === 1 ? ["sấp", "ngửa"] : level === 2 ? ["1", "2", "3", "4", "5", "6"] : ["SS", "SN", "NS", "NN"], fingerprint: `sample-space-${level}-${random.int(0, 31)}` });
    case "SOFTWARE_GEOMETRY_CONSTRUCTION": return makeModel(contract, input, random, { operation: "GEOMETRY_TOOL_SEQUENCE", values: [random.int(3, 8)], labels: ["chọn công cụ đoạn thẳng", "đặt các đỉnh", "nối các đỉnh", "kiểm tra tính chất"], fingerprint: `geometry-software-${level}-${random.int(0, 31)}`, meta: { shape: random.pick(["SQUARE", "RECTANGLE", "RHOMBUS", "EQUILATERAL_TRIANGLE"]) } });
    case "REPRESENTATION_SELECTION": return makeModel(contract, input, random, { operation: random.pick(["COMPARE_CATEGORIES", "SHOW_CHANGE", "SHOW_PART_WHOLE", "LIST_VALUES"]), values: data.values, labels: data.labels, fingerprint: `representation-${level}-${random.int(0, 31)}` });
    case "PROBABILITY_MODEL": return makeModel(contract, input, random, { operation: "EVEN_DIE_EVENT", values: [1, 2, 3, 4, 5, 6], labels: ["2", "4", "6"], fingerprint: `event-model-${level}-${random.int(0, 31)}` });
    case "DATA_REASONABLENESS": { const total = data.values.reduce((sum, value) => sum + value, 0); const claimed = level === 1 ? total : total + random.pick([-5, 6, 8]); return makeModel(contract, input, random, { operation: total === claimed ? "VALID_TOTAL" : "INVALID_TOTAL", values: [...data.values, claimed], labels: data.labels, fingerprint: `reason-${level}-${random.int(0, 31)}` }); }
    case "DATA_REPRESENTATION_EQUIVALENCE": return makeModel(contract, input, random, { operation: "MATCH_REPRESENTATIONS", values: data.values, labels: data.labels, fingerprint: `equivalence-${level}-${random.int(0, 31)}` });
    case "SOFTWARE_DATA_TOOL": return makeModel(contract, input, random, { operation: "DATA_TOOL_SEQUENCE", values: data.values, labels: ["nhập dữ liệu", "chọn vùng dữ liệu", "chọn biểu đồ hoặc hàm tần số", "kiểm tra nhãn và kết quả"], fingerprint: `software-data-${level}-${random.int(0, 31)}` });
    case "LINEAR_FUNCTION_TABLE": { const a = random.pick([-3, -2, 2, 3]); const b = random.int(-5, 5); const xs = [-2, 0, 2]; return makeModel(contract, input, random, { operation: "LINEAR_TABLE", values: [a, b, ...xs], labels: xs.map(String), fingerprint: `linear-${a}-${b}:level-${level}` }); }
    case "QUADRATIC_FUNCTION_TABLE_GRAPH": { const a = random.pick([-2, -1, 1, 2]); const xs = [-2, -1, 0, 1, 2]; return makeModel(contract, input, random, { operation: "QUADRATIC_TABLE", values: [a, ...xs], labels: xs.map(String), fingerprint: `quadratic-${a}:level-${level}`, meta: { graphKind: "PARABOLA" } }); }
    case "TRIANGLE_MIDLINE_REASONING": { const third = random.int(4, 12) * 2; const operation = contract.outcomeId.endsWith("026") ? "MIDLINE_DEFINITION" : "MIDLINE_LENGTH"; return makeModel(contract, input, random, { operation, values: [third, third / 2], labels: ["cạnh thứ ba", "đường trung bình"], fingerprint: `midline-${operation}-${level}-${third}`, meta: { shape: "TRIANGLE", theorem: "MIDLINE" } }); }
    case "GROUPED_FREQUENCY_TABLE": { const frequencies = [random.int(3, 8), random.int(4, 10), random.int(3, 9)]; return makeModel(contract, input, random, { operation: "GROUPED_FREQUENCY", values: frequencies, labels: ["[0;5)", "[5;10)", "[10;15]"], fingerprint: `grouped-${level}-${random.int(0, 31)}` }); }
    case "GROWTH_INVESTMENT": { const principal = random.int(10, 50) * 100_000; const rate = random.pick([5, 10]); const recover = contract.outcomeId.endsWith("001"); const values = recover ? [principal * (100 + rate) / 100, rate] : [principal, rate]; return makeModel(contract, input, random, { operation: recover ? "RECOVER_PRINCIPAL" : "ONE_PERIOD_GROWTH", values, labels: recover ? ["giá trị mục tiêu", "tỉ lệ tăng trưởng (%)"] : ["vốn đầu tư", "tỉ lệ tăng trưởng (%)"], fingerprint: `growth-${recover ? "recover" : "forward"}-${rate}:band-${Math.floor(principal / 1_000_000)}` }); }
    case "INSURANCE_REASONING": { const loss = random.int(10, 40) * 100_000; const deductible = random.int(1, 5) * 100_000; return makeModel(contract, input, random, { operation: "COVERED_AMOUNT", values: [loss, deductible], labels: ["thiệt hại", "mức tự chi trả"], fingerprint: `insurance-${level}-${Math.floor(loss / deductible)}` }); }
    case "GEOMETRY_MEDIA_PLAN": return makeModel(contract, input, random, { operation: "MEDIA_EVIDENCE_SEQUENCE", values: [level], labels: ["nêu đối tượng hình học", "đánh dấu dữ kiện", "thực hiện phép dựng hoặc đo", "kết luận tính chất"], fingerprint: `media-${level}-${random.int(0, 31)}`, meta: { shape: random.pick(["CIRCLE", "RIGHT_TRIANGLE", "REGULAR_POLYGON"]) } });
    case "SOLID_MEASUREMENT_APPLICATION": { const r = random.int(2, 6); const h = random.int(4, 12); const operation = random.pick(["CYLINDER_VOLUME", "CONE_VOLUME", "SPHERE_VOLUME"]); return makeModel(contract, input, random, { operation, values: operation === "SPHERE_VOLUME" ? [r] : [r, h], labels: operation === "SPHERE_VOLUME" ? ["bán kính (cm)"] : ["bán kính (cm)", "chiều cao (cm)"], fingerprint: `solid-${operation}-${level}-${r}-${h}`, meta: { shape: operation === "SPHERE_VOLUME" ? "SPHERE" : operation === "CONE_VOLUME" ? "CONE" : "CYLINDER", unit: "cm" } }); }
    case "CHEMICAL_EQUATION_SYSTEM": {
      const operation = random.pick(["BALANCE_WATER", "BALANCE_AMMONIA", "BALANCE_IRON_OXIDE"]);
      const specification = operation === "BALANCE_WATER"
        ? { values: [2, 2, 2], reaction: "xH₂ + O₂ → yH₂O", constraints: ["số H: 2x = 2y", "số O: 2 = y"] }
        : operation === "BALANCE_AMMONIA"
          ? { values: [2, 2, 1, 3], reaction: "N₂ + xH₂ → yNH₃", constraints: ["số N: 2 = y", "số H: 2x = 3y"] }
          : { values: [2, 3, 3], reaction: "xFe + 3O₂ → yFe₂O₃", constraints: ["số Fe: x = 2y", "số O: 6 = 3y"] };
      return makeModel(contract, input, random, { operation, values: specification.values, labels: ["hệ số x", "hệ số y"], fingerprint: `chemical-${operation}-${level}-${random.int(0, 31)}`, meta: { reaction: specification.reaction, constraints: specification.constraints } });
    }
    case "TRIGONOMETRIC_FIELD_MEASUREMENT": { const angle = random.pick([30, 45, 60]); const adjacent = random.int(5, 20); return makeModel(contract, input, random, { operation: "TANGENT_DISTANCE", values: [angle, adjacent], labels: ["góc nâng (độ)", "cạnh kề (m)"], fingerprint: `trig-${angle}-${Math.floor(adjacent / 4)}`, meta: { shape: "RIGHT_TRIANGLE", unit: "m" } }); }
    case "GENETICS_PROBABILITY": return makeModel(contract, input, random, { operation: random.pick(["AA_X_AA_RECESSIVE", "AA_X_AA_DOMINANT"]), values: [1, 4], labels: ["kiểu gen thuận lợi", "tổng ô Punnett"], fingerprint: `genetics-${level}-${random.int(0, 31)}` });
    case "VOLUME_ESTIMATION": { const a = random.int(2, 7), b = random.int(2, 6), c = random.int(2, 5); return makeModel(contract, input, random, { operation: "BOX_UNIT_CUBES", values: [a, b, c], labels: ["dài", "rộng", "cao"], fingerprint: `volume-${level}-${a}-${b}-${c}`, meta: { unit: "khối lập phương" } }); }
    case "THEORETICAL_PROBABILITY_RATIO": { const total = random.pick([4, 6, 8, 10, 12]); const favorable = random.int(1, total - 1); return makeModel(contract, input, random, { operation: "FAVORABLE_OVER_TOTAL", values: [favorable, total], labels: ["thuận lợi", "có thể"], fingerprint: `theory-${level}-${favorable}-${total}` }); }
    case "RELATIVE_EXPERIMENT_FREQUENCY": { const total = random.pick([10, 12, 20, 24, 30]); const favorable = random.int(2, total - 2); return makeModel(contract, input, random, { operation: "EXPERIMENTAL_RATIO", values: [favorable, total], labels: ["số lần xảy ra", "tổng số lần thử"], fingerprint: `relative-${level}-${favorable}-${total}` }); }
    case "FREQUENCY_INTERPRETATION": { const total = random.pick([20, 25, 30, 40]); const count = random.int(3, total - 3); const operation = contract.outcomeId.endsWith("012") ? "FREQUENCY_ROLE" : contract.outcomeId.endsWith("013") ? "RELATIVE_FREQUENCY_ROLE" : "RELATIVE_FREQUENCY"; return makeModel(contract, input, random, { operation, values: [count, total], labels: ["số lần xuất hiện", "tổng số quan sát"], fingerprint: `frequency-interpret-${operation}-${level}-${count}-${total}` }); }
    case "FREQUENCY_COUNT": { const target = random.int(1, 5); const observations = Array.from({ length: 8 + level * 2 }, (_, index) => index % 3 === 0 ? target : random.int(1, 6)); return makeModel(contract, input, random, { operation: "COUNT_TARGET", values: [target, ...observations], labels: observations.map((_, index) => `q${index + 1}`), fingerprint: `frequency-count-${level}-${target}-${random.int(0, 31)}` }); }
    case "EXPERIMENT_FREQUENCY": { const target = random.int(1, 6); const observations = Array.from({ length: 10 + level * 2 }, (_, index) => index % 4 === 0 ? target : random.int(1, 6)); return makeModel(contract, input, random, { operation: "COUNT_TARGET", values: [target, ...observations], labels: observations.map((_, index) => `l${index + 1}`), fingerprint: `experiment-count-${level}-${target}-${random.int(0, 31)}` }); }
    default: {
      const operationByCapability: Readonly<Record<string, string>> = {
        PICTOGRAPH_READ: "READ_CATEGORY", PICTOGRAPH_INFERENCE: "CATEGORY_DIFFERENCE", TABLE_DATA_READ: "READ_CATEGORY", TABLE_DATA_INFERENCE: "CATEGORY_DIFFERENCE", ARITHMETIC_MEAN: "MEAN", BAR_CHART_READ: "READ_CATEGORY", BAR_CHART_PROBLEM: "CATEGORY_DIFFERENCE", BAR_CHART_PATTERN: "MAX_CATEGORY", PIE_CHART_READ: "PIE_PERCENT", PIE_CHART_PROBLEM: "PIE_QUANTITY", MULTIFORM_DATA_READ: "READ_CATEGORY", MULTIFORM_DATA_PROBLEM: "CATEGORY_TOTAL", MULTIFORM_DATA_PATTERN: "CATEGORY_DIFFERENCE", CROSS_CURRICULAR_DATA_READ: "READ_CATEGORY", PIE_LINE_CHART_PROBLEM: "CATEGORY_DIFFERENCE", PIE_LINE_PATTERN: "MAX_CATEGORY", PRACTICAL_DATA_REPRESENTATION: "READ_CATEGORY",
      };
      const operation = operationByCapability[cap]; if (!operation) throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
      const meanBase = random.int(3, 15);
      const values = operation === "MEAN" ? [meanBase, meanBase + 3, meanBase + 6] : operation === "PIE_PERCENT" || operation === "PIE_QUANTITY" ? [25, 35, 20, 20, random.pick([40, 80, 120])] : data.values;
      return makeModel(contract, input, random, { operation, values, labels: data.labels, scale: cap.includes("PICTOGRAPH") ? random.pick([1, 2, 5]) : 1, fingerprint: `${operation}-${level}-${random.int(0, 31)}-${values.join("-")}` });
    }
  }
}

function solveModel(m: WaveENormalizedProblemModel): SemanticSolution {
  const v = m.values; let answer: CanonicalResponse; let distractors: string[] = [];
  switch (m.operation) {
    case "DIVIDE_FACT": answer = v[2]!; distractors = [String(v[0]), String(v[1]), String(v[2]! + 1)]; break;
    case "CERTAIN": answer = "chắc chắn"; distractors = ["có thể", "không thể", "chưa biết"]; break;
    case "POSSIBLE": answer = "có thể"; distractors = ["chắc chắn", "không thể", "chưa đủ dữ kiện"]; break;
    case "IMPOSSIBLE": answer = "không thể"; distractors = ["có thể", "chắc chắn", "thường xảy ra"]; break;
    case "CLASSIFY_RECORDS": answer = [{ leftId: "quả táo", rightId: "đồ ăn" }, { leftId: "quả cam", rightId: "đồ ăn" }, { leftId: "bút chì", rightId: "đồ dùng học tập" }, { leftId: "quyển vở", rightId: "đồ dùng học tập" }]; distractors = ["khác tiêu chí"]; break;
    case "MATCH_INSTRUMENT": answer = [{ leftId: "độ dài bàn", rightId: "thước mét" }, { leftId: "khối lượng cặp", rightId: "cân" }, { leftId: "dung tích chai", rightId: "ca chia vạch" }]; distractors = ["đồng hồ", "nhiệt kế"]; break;
    case "COIN_SPACE": case "DIE_SPACE": case "TWO_COIN_SPACE": answer = [...m.labels]; distractors = ["kết quả ngoài không gian mẫu", "lặp lại cùng kết quả"]; break;
    case "GEOMETRY_TOOL_SEQUENCE": case "DATA_TOOL_SEQUENCE": case "MEDIA_EVIDENCE_SEQUENCE": answer = [...m.labels]; distractors = []; break;
    case "COMPARE_CATEGORIES": answer = "biểu đồ cột"; distractors = ["biểu đồ đoạn thẳng", "biểu đồ hình quạt tròn", "dãy số không nhãn"]; break;
    case "SHOW_CHANGE": answer = "biểu đồ đoạn thẳng"; distractors = ["biểu đồ hình quạt tròn", "biểu đồ tranh", "danh sách rời rạc"]; break;
    case "SHOW_PART_WHOLE": answer = "biểu đồ hình quạt tròn"; distractors = ["biểu đồ đoạn thẳng", "biểu đồ cột kép", "bảng không tổng"]; break;
    case "LIST_VALUES": answer = "bảng số liệu"; distractors = ["biểu đồ không nhãn", "hình trang trí", "đoạn thẳng"]; break;
    case "EVEN_DIE_EVENT": answer = ["2", "4", "6"]; distractors = ["1", "3", "5"]; break;
    case "VALID_TOTAL": answer = "hợp lí"; distractors = SINGLE_LABELS.filter((item) => item !== "hợp lí"); break;
    case "INVALID_TOTAL": answer = "không hợp lí"; distractors = SINGLE_LABELS.filter((item) => item !== "không hợp lí"); break;
    case "MATCH_REPRESENTATIONS": answer = m.labels.map((label, index) => ({ leftId: label, rightId: String(v[index]) })); distractors = v.map((value) => String(value + 1)); break;
    case "LINEAR_TABLE": { const [a, b, ...xs] = v; answer = xs.map((x) => ({ leftId: String(x), rightId: String(a! * x + b!) })); distractors = xs.map((x) => String(a! * x - b!)); break; }
    case "QUADRATIC_TABLE": { const [a, ...xs] = v; answer = xs.map((x) => ({ leftId: String(x), rightId: String(a! * x * x) })); distractors = xs.map((x) => String(a! * x)); break; }
    case "MIDLINE_DEFINITION": answer = "đoạn thẳng nối trung điểm của hai cạnh tam giác"; distractors = ["đường nối một đỉnh với trung điểm cạnh đối diện", "đường vuông góc từ một đỉnh", "cạnh lớn nhất của tam giác"]; break;
    case "MIDLINE_LENGTH": answer = v[1]!; distractors = [String(v[0]), String(v[0]! * 2), String(v[1]! + 1)]; break;
    case "GROUPED_FREQUENCY": answer = m.labels.map((label, index) => `${label}:${v[index]}`).join("; "); distractors = [v.slice().reverse().join(";"), String(v.reduce((a, b) => a + b, 0))]; break;
    case "ONE_PERIOD_GROWTH": case "COMPARE_PLAN": answer = Math.round(v[0]! * (1 + v[1]! / 100)); distractors = [String(v[0]! + v[1]!), String(v[0]! * v[1]!), String(v[0])]; break;
    case "RECOVER_PRINCIPAL": answer = Math.round(v[0]! / (1 + v[1]! / 100)); distractors = [String(v[0]), String(v[0]! - v[1]!), String(Math.round(v[0]! * (1 + v[1]! / 100)))]; break;
    case "COVERED_AMOUNT": answer = v[0]! - v[1]!; distractors = [String(v[0]), String(v[1]), String(v[0]! + v[1]!)]; break;
    case "CYLINDER_VOLUME": answer = Number((Math.PI * v[0]! * v[0]! * v[1]!).toFixed(2)); distractors = [String(Number((2 * Math.PI * v[0]! * v[1]!).toFixed(2))), String(v[0]! * v[1])]; break;
    case "CONE_VOLUME": answer = Number((Math.PI * v[0]! * v[0]! * v[1]! / 3).toFixed(2)); distractors = [String(Number((Math.PI * v[0]! * v[0]! * v[1]!).toFixed(2))), String(v[0]! * v[1]!)]; break;
    case "SPHERE_VOLUME": answer = Number((4 * Math.PI * v[0]! ** 3 / 3).toFixed(2)); distractors = [String(Number((Math.PI * v[0]! * v[0]!).toFixed(2))), String(Number((4 * Math.PI * v[0]! * v[0]!).toFixed(2)))]; break;
    case "BALANCE_WATER": answer = [{ leftId: "hệ số x", rightId: "2" }, { leftId: "hệ số y", rightId: "2" }]; distractors = ["1", "3", "4"]; break;
    case "BALANCE_AMMONIA": answer = [{ leftId: "hệ số x", rightId: "3" }, { leftId: "hệ số y", rightId: "2" }]; distractors = ["1", "4", "6"]; break;
    case "BALANCE_IRON_OXIDE": answer = [{ leftId: "hệ số x", rightId: "4" }, { leftId: "hệ số y", rightId: "2" }]; distractors = ["1", "3", "6"]; break;
    case "TANGENT_DISTANCE": answer = Number((v[1]! * Math.tan(v[0]! * Math.PI / 180)).toFixed(2)); distractors = [String(Number((v[1]! / Math.tan(v[0]! * Math.PI / 180)).toFixed(2))), String(v[1])]; break;
    case "AA_X_AA_RECESSIVE": answer = fraction(1, 4); distractors = ["1/2", "3/4", "1"]; break;
    case "AA_X_AA_DOMINANT": answer = fraction(3, 4); distractors = ["1/4", "1/2", "1"]; break;
    case "BOX_UNIT_CUBES": answer = v[0]! * v[1]! * v[2]!; distractors = [String(v[0]! * v[1]), String(2 * (v[0]! + v[1]! + v[2]!)), String(v[0]! + v[1]! + v[2]!)]; break;
    case "FAVORABLE_OVER_TOTAL": case "EXPERIMENTAL_RATIO": case "RELATIVE_FREQUENCY": answer = fraction(v[0]!, v[1]!); distractors = [`${v[1]}/${v[0]}`, `${v[0]}/${v[1]! - v[0]!}`, String(v[0])]; break;
    case "ABSOLUTE_FREQUENCY": answer = v[0]!; distractors = [String(v[1]), String(v[1]! - v[0]!), String(v[0]! + 1)]; break;
    case "FREQUENCY_ROLE": answer = "cho biết một giá trị xuất hiện bao nhiêu lần"; distractors = ["cho biết tổng mọi giá trị", "cho biết giá trị lớn nhất", "cho biết thứ tự các giá trị"]; break;
    case "RELATIVE_FREQUENCY_ROLE": answer = "cho biết tỉ lệ số lần xuất hiện so với tổng số quan sát"; distractors = ["chỉ cho biết số lần xuất hiện", "cho biết tổng mọi giá trị", "cho biết khoảng biến thiên"]; break;
    case "COUNT_TARGET": answer = v.slice(1).filter((value) => value === v[0]).length; distractors = [String(v[0]), String(v.length - 1), String(v.slice(1).filter((value) => value !== v[0]).length)]; break;
    case "READ_CATEGORY": answer = v[0]! * m.scale; distractors = [String(v[0]), String(v[1]), String(v[0]! + m.scale)]; break;
    case "CATEGORY_DIFFERENCE": answer = Math.abs(v[2]! - v[0]!); distractors = [String(v[2]! + v[0]!), String(v[1]), String(Math.abs(v[1]! - v[0]!))]; break;
    case "CATEGORY_TOTAL": answer = v.reduce((sum, value) => sum + value, 0); distractors = [String(Math.max(...v)), String(v[0]! + v[1]!), String(v.length)]; break;
    case "MEAN": answer = v.reduce((sum, value) => sum + value, 0) / v.length; distractors = [String(v.reduce((sum, value) => sum + value, 0)), String(Math.max(...v)), String(v.length)]; break;
    case "MAX_CATEGORY": { const index = v.indexOf(Math.max(...v)); answer = m.labels[index]!; distractors = m.labels.filter((_, i) => i !== index); break; }
    case "PIE_PERCENT": answer = v[0]!; distractors = [String(v[1]), String(100 - v[0]!), String(v[0]! + 5)]; break;
    case "PIE_QUANTITY": answer = v[4]! * v[0]! / 100; distractors = [String(v[4]! * v[1]! / 100), String(v[0]), String(v[4])]; break;
    default: throw new GenerationV2Error("SOLVER_FAILED");
  }
  const focus = {
    ARITHMETIC: "Xác định phép tính và quan hệ giữa tổng, số nhóm và số phần tử mỗi nhóm.",
    DATA: "Đọc đúng nhãn, hàng, cột và quan hệ giữa các số liệu.",
    PROBABILITY: "Xác định rõ phép thử, không gian mẫu và các trường hợp thuận lợi.",
    ALGEBRA: "Thay đúng giá trị vào biểu thức rồi tính theo thứ tự.",
    GEOMETRY: "Đối chiếu định nghĩa và các quan hệ hình học được đánh dấu.",
    MEASUREMENT: "Chọn đúng đại lượng, công thức và đơn vị đo.",
    FINANCE: "Xác định số tiền gốc, tỉ lệ và khoản cần tính.",
    APPLIED: "Chuyển các điều kiện của tình huống thành quan hệ toán học chính xác.",
  }[m.profile];
  const verification = m.profile === "PROBABILITY" ? "Kiểm tra số trường hợp thuận lợi không vượt quá tổng số trường hợp." : m.profile === "DATA" ? "Đối chiếu kết quả với bảng hoặc biểu đồ ban đầu." : m.profile === "MEASUREMENT" ? "Kiểm tra công thức, đơn vị và mức làm tròn." : "Thay kết quả trở lại các điều kiện để kiểm tra.";
  return { answer, distractors, steps: [focus, "Thực hiện lần lượt các phép tính từ dữ kiện công khai.", `${verification} Kết quả là ${display(answer)}.`], nextStep: verification };
}

function promptFor(m: WaveENormalizedProblemModel): string {
  const contexts = PROFILE_CONTEXTS[m.profile]; const context = contexts[m.contextIndex % contexts.length]!, lead = `${LEADS[m.templateIndex]!} ${EVIDENCE_FRAMES[m.representationIndex]!} trong ${context}`, v = m.values, labels = m.labels;
  const table = labels.slice(0, Math.min(labels.length, v.length)).map((label, index) => `${label}: ${v[index]}`).join("; ");
  switch (m.operation) {
    case "DIVIDE_FACT": return `${lead}. Trong ${context}, có ${v[0]} thẻ chia đều thành các nhóm ${v[1]} thẻ. Có bao nhiêu nhóm?`;
    case "CERTAIN": return `${lead}. Khi ${String(m.meta.trial)}, biến cố “kết quả từ 1 đến 6” thuộc loại nào?`;
    case "POSSIBLE": return `${lead}. Khi ${String(m.meta.trial)}, biến cố “rút được thẻ số ${v[0]}” thuộc loại nào?`;
    case "IMPOSSIBLE": return `${lead}. Khi ${String(m.meta.trial)}, biến cố “rút được thẻ số 8” thuộc loại nào?`;
    case "CLASSIFY_RECORDS": return `${lead}. Ghép mỗi đối tượng với nhóm đúng theo tiêu chí đồ ăn hoặc đồ dùng học tập.`;
    case "MATCH_INSTRUMENT": return `${lead}. Ghép mỗi đại lượng với dụng cụ đo phù hợp.`;
    case "COIN_SPACE": case "DIE_SPACE": case "TWO_COIN_SPACE": return `${lead}. Chọn tất cả kết quả thuộc không gian mẫu của phép thử ${m.operation === "COIN_SPACE" ? "tung một đồng xu" : m.operation === "DIE_SPACE" ? "gieo một xúc xắc" : "tung hai đồng xu"}.`;
    case "GEOMETRY_TOOL_SEQUENCE": case "DATA_TOOL_SEQUENCE": case "MEDIA_EVIDENCE_SEQUENCE": return `${lead}. Sắp xếp các bước để hoàn thành ${m.operation === "GEOMETRY_TOOL_SEQUENCE" ? "hình vẽ bằng phần mềm" : m.operation === "DATA_TOOL_SEQUENCE" ? "bảng/biểu đồ hoặc mô phỏng" : "đoạn trình bày hình học có bằng chứng"}.`;
    case "COMPARE_CATEGORIES": case "SHOW_CHANGE": case "SHOW_PART_WHOLE": case "LIST_VALUES": return `${lead}. Trong ${context}, cần ${m.operation === "COMPARE_CATEGORIES" ? "so sánh các nhóm" : m.operation === "SHOW_CHANGE" ? "thể hiện thay đổi theo thời gian" : m.operation === "SHOW_PART_WHOLE" ? "thể hiện các phần của một tổng" : "ghi chính xác từng giá trị"}. Chọn cách biểu diễn phù hợp nhất.`;
    case "EVEN_DIE_EVENT": return `${lead}. Chọn tất cả kết quả thuận lợi cho biến cố “gieo xúc xắc được số chẵn”.`;
    case "VALID_TOTAL": case "INVALID_TOTAL": return `${lead}. Bốn nhóm có số liệu ${v.slice(0, 4).join(", ")}; báo cáo ghi tổng ${v[4]}. Nhận xét báo cáo có hợp lí không?`;
    case "MATCH_REPRESENTATIONS": return `${lead}. Ghép mỗi nhãn với giá trị tương ứng để hai biểu diễn cùng mô tả một tập dữ liệu.`;
    case "LINEAR_TABLE": return `${lead}. Với y = ${v[0]}x ${v[1]! >= 0 ? "+" : "−"} ${Math.abs(v[1]!)}, ghép mỗi giá trị x với giá trị y đúng.`;
    case "QUADRATIC_TABLE": return `${lead}. Với y = ${v[0]}x², ghép mỗi giá trị x với giá trị y đúng.`;
    case "MIDLINE_DEFINITION": return `${lead}. Chọn mô tả đúng về đường trung bình của tam giác.`;
    case "MIDLINE_LENGTH": return `${lead}. Cạnh thứ ba của tam giác dài ${v[0]} cm. Đường trung bình song song cạnh đó dài bao nhiêu xăng-ti-mét?`;
    case "GROUPED_FREQUENCY": return `${lead}. Các khoảng ${labels.join(", ")} có tần số lần lượt ${v.join(", ")}. Nhập bảng ghép nhóm theo mẫu “khoảng:tần số; ...”.`;
    case "ONE_PERIOD_GROWTH": case "COMPARE_PLAN": return `${lead}. Khoản vốn ${v[0]} đồng tăng ${v[1]}% trong một kì. Giá trị cuối kì là bao nhiêu đồng?`;
    case "RECOVER_PRINCIPAL": return `${lead}. Muốn giá trị cuối kì đạt ${v[0]} đồng sau khi tăng ${v[1]}%, cần đầu tư ban đầu bao nhiêu đồng?`;
    case "COVERED_AMOUNT": return `${lead}. Thiệt hại là ${v[0]} đồng và mức tự chi trả là ${v[1]} đồng. Theo hợp đồng đơn giản, số tiền được chi trả là bao nhiêu?`;
    case "CYLINDER_VOLUME": case "CONE_VOLUME": return `${lead}. Một ${m.operation === "CYLINDER_VOLUME" ? "hình trụ" : "hình nón"} có bán kính ${v[0]} cm, chiều cao ${v[1]} cm. Tính thể tích, làm tròn đến hai chữ số thập phân.`;
    case "SPHERE_VOLUME": return `${lead}. Một hình cầu có bán kính ${v[0]} cm. Tính thể tích, làm tròn đến hai chữ số thập phân.`;
    case "BALANCE_WATER": case "BALANCE_AMMONIA": case "BALANCE_IRON_OXIDE": return `${lead}. Cân bằng phương trình ${String(m.meta.reaction)} bằng cách ghép hệ số nguyên dương x, y sao cho số nguyên tử mỗi nguyên tố ở hai vế bằng nhau.`;
    case "TANGENT_DISTANCE": return `${lead}. Tam giác vuông mô hình hóa phép đo có góc ${v[0]}° và cạnh kề ${v[1]} m. Tính cạnh đối bằng tan, làm tròn hai chữ số thập phân.`;
    case "AA_X_AA_RECESSIVE": return `${lead}. Với phép lai Aa × Aa, xác suất đời con có kiểu gen aa là bao nhiêu?`;
    case "AA_X_AA_DOMINANT": return `${lead}. Với phép lai Aa × Aa và trội hoàn toàn, xác suất đời con biểu hiện tính trạng trội là bao nhiêu?`;
    case "BOX_UNIT_CUBES": return `${lead}. Một hộp có kích thước ${v[0]} × ${v[1]} × ${v[2]} đơn vị. Ước lượng hộp chứa bao nhiêu khối lập phương đơn vị?`;
    case "FAVORABLE_OVER_TOTAL": case "EXPERIMENTAL_RATIO": case "RELATIVE_FREQUENCY": return `${lead}. Có ${v[0]} trường hợp thuận lợi trong ${v[1]} trường hợp hoặc lượt thử. Viết xác suất/tần số tương đối dưới dạng phân số tối giản.`;
    case "ABSOLUTE_FREQUENCY": return `${lead}. Trong ${v[1]} quan sát, giá trị mục tiêu xuất hiện ${v[0]} lần. Tần số của giá trị là bao nhiêu?`;
    case "FREQUENCY_ROLE": return `${lead}. Trong bảng có ${v[1]} quan sát và một giá trị xuất hiện ${v[0]} lần. Ý nghĩa của tần số ${v[0]} là gì?`;
    case "RELATIVE_FREQUENCY_ROLE": return `${lead}. Một giá trị xuất hiện ${v[0]} lần trong ${v[1]} quan sát. Ý nghĩa của tần số tương đối là gì?`;
    case "COUNT_TARGET": return `${lead}. Dãy kết quả là ${v.slice(1).join(", ")}. Giá trị ${v[0]} xuất hiện bao nhiêu lần?`;
    case "READ_CATEGORY": return `${lead}. Dữ liệu ${table}. Hãy đọc giá trị của ${labels[0]}${m.scale > 1 ? ` khi mỗi biểu tượng ứng với ${m.scale} đối tượng` : ""}.`;
    case "CATEGORY_DIFFERENCE": return `${lead}. Dữ liệu ${table}. Chênh lệch giữa ${labels[2]} và ${labels[0]} là bao nhiêu?`;
    case "CATEGORY_TOTAL": return `${lead}. Dữ liệu ${table}. Tổng của tất cả nhóm là bao nhiêu?`;
    case "MEAN": return `${lead}. Các số liệu là ${v.join(", ")}. Tính số trung bình cộng.`;
    case "MAX_CATEGORY": return `${lead}. Dữ liệu ${table}. Nhóm nào có giá trị lớn nhất?`;
    case "PIE_PERCENT": return `${lead}. Biểu đồ hình quạt có các phần ${v.slice(0, 4).join("%, ")}%. Tỉ lệ của ${labels[0]} là bao nhiêu phần trăm?`;
    case "PIE_QUANTITY": return `${lead}. Một nhóm chiếm ${v[0]}% trong tổng ${v[4]} đối tượng. Nhóm đó có bao nhiêu đối tượng?`;
    default: throw new GenerationV2Error("MODEL_CONSTRAINT_FAILED");
  }
}

function semanticLabels(answer: CanonicalResponse): string[] { if (Array.isArray(answer)) return answer.every((item) => typeof item === "string") ? [...answer] : answer.map((item) => `${item.leftId}=${item.rightId}`); return [display(answer)]; }
function adaptSolution(m: WaveENormalizedProblemModel, semantic: SemanticSolution, random: Random): WaveESolution {
  const misconception: MisconceptionCode = m.profile === "PROBABILITY" ? "PROBABILITY_DENOMINATOR_ERROR" : m.profile === "MEASUREMENT" ? "UNIT_CONVERSION_ERROR" : m.profile === "ALGEBRA" ? "FUNCTION_SUBSTITUTION_ERROR" : "DATA_RELATION_IGNORED";
  if (m.interactionType === "SINGLE_CHOICE" || m.interactionType === "CONSTRUCTION_OR_VISUAL_SELECTION") { const correctLabel = display(semantic.answer); const labels = [...new Set([correctLabel, ...semantic.distractors])].slice(0, 4); while (labels.length < 4) labels.push(`phương án sai ${labels.length + 1}`); const options = random.shuffle(labels.map((label) => ({ id: `o-${hash(`${m.outcomeId}:${label}`).slice(0, 8)}`, label }))); const correct = options.find((option) => option.label === correctLabel)!.id; return { correct, accepted: [correct], steps: semantic.steps, nextStep: semantic.nextStep, options, optionMisconceptions: Object.fromEntries(options.filter((option) => option.id !== correct).map((option) => [option.id, misconception])) }; }
  if (m.interactionType === "MULTI_SELECT") { const correctLabels = semanticLabels(semantic.answer); const labels = [...new Set([...correctLabels, ...semantic.distractors])]; const options = random.shuffle(labels.map((label) => ({ id: `o-${hash(`${m.outcomeId}:${label}`).slice(0, 8)}`, label }))); const correct = correctLabels.map((label) => options.find((option) => option.label === label)!.id); return { correct, accepted: [correct], steps: semantic.steps, nextStep: semantic.nextStep, options, optionMisconceptions: Object.fromEntries(options.filter((option) => !correct.includes(option.id)).map((option) => [option.id, misconception])) }; }
  if (m.interactionType === "ORDERING") { const labels = semanticLabels(semantic.answer); const options = labels.map((label) => ({ id: `o-${hash(`${m.outcomeId}:${label}`).slice(0, 8)}`, label })); const correct = options.map((option) => option.id); return { correct, accepted: [correct], steps: semantic.steps, nextStep: semantic.nextStep, options }; }
  if (m.interactionType === "MATCHING") { const pairs: readonly MatchingPair[] = Array.isArray(semantic.answer) && semantic.answer.every((item) => typeof item !== "string") ? semantic.answer : [{ leftId: "kết quả", rightId: display(semantic.answer) }]; const leftItems = pairs.map((pair) => ({ id: pair.leftId, label: pair.leftId })); const rightItems = [...new Map([...pairs.map((pair) => ({ id: pair.rightId, label: pair.rightId })), ...semantic.distractors.slice(0, 4).map((label) => ({ id: label, label }))].map((item) => [item.id, item])).values()]; return { correct: pairs, accepted: [pairs], steps: semantic.steps, nextStep: semantic.nextStep, leftItems, rightItems }; }
  let correct = semantic.answer;
  if (m.interactionType === "FRACTION_INPUT" && (typeof correct === "number" || typeof correct === "string")) correct = fraction(Number(correct), 1);
  if ((m.interactionType === "INTEGER_INPUT" || m.interactionType === "DECIMAL_INPUT") && typeof correct !== "number") { const parsed = Number(display(correct).replace(",", ".")); if (Number.isFinite(parsed)) correct = parsed; }
  if (m.interactionType === "TABLE_OR_CHART_RESPONSE" && typeof correct !== "string") correct = display(correct);
  const accepted: CanonicalResponse[] = [correct]; if (typeof correct === "number") accepted.push(String(correct).replace(".", ","));
  return { correct, accepted, steps: semantic.steps, nextStep: semantic.nextStep };
}

function visualFor(m: WaveENormalizedProblemModel): ProductVisual {
  const type = WAVE_E_CAPABILITY_METADATA[m.variantId].visualType; const v = m.values;
  if (type === "BAR_CHART") return { type, description: "Biểu đồ số liệu của bài toán.", data: { labels: m.labels.slice(0, Math.min(4, m.labels.length)), values: v.slice(0, 4), scale: m.scale, operation: m.operation, representation: m.variantId.includes("PIE") ? "PIE" : "BAR_OR_LINE" } };
  if (type === "DATA_TABLE") {
    if (m.operation === "LINEAR_TABLE") { const xs = v.slice(2); return { type, description: "Bảng giá trị hàm số cần hoàn thành.", data: { rows: xs.map((x) => ({ name: `x = ${x}`, value: "y = ?" })), operation: m.operation } }; }
    if (m.operation === "QUADRATIC_TABLE") { const xs = v.slice(1); return { type, description: "Bảng giá trị hàm số bậc hai cần hoàn thành.", data: { rows: xs.map((x) => ({ name: `x = ${x}`, value: "y = ?" })), operation: m.operation } }; }
    if (m.operation.startsWith("BALANCE_")) return { type, description: `Các điều kiện cân bằng của ${String(m.meta.reaction)}.`, data: { rows: (m.meta.constraints as readonly string[]).map((constraint, index) => ({ name: `Điều kiện ${index + 1}`, value: constraint })), operation: m.operation } };
    return { type, description: "Bảng dữ liệu của bài toán.", data: { labels: m.labels, values: v, rows: m.labels.map((label, index) => ({ name: label, value: v[index] ?? "?" })), operation: m.operation } };
  }
  if (type === "EXPERIMENT_TABLE") {
    if (["COIN_SPACE", "DIE_SPACE", "TWO_COIN_SPACE"].includes(m.operation)) return { type, description: "Các kết quả có thể của phép thử.", data: { rows: m.labels.map((label) => ({ name: "Kết quả", value: label })), operation: m.operation } };
    if (["CERTAIN", "POSSIBLE", "IMPOSSIBLE"].includes(m.operation)) return { type, description: "Mô tả phép thử và các kết quả có thể.", data: { rows: [{ name: "Phép thử", value: String(m.meta.trial) }, { name: "Các thẻ có thể rút", value: "1, 2, 3, 4, 5, 6" }], operation: m.operation } };
    if (m.operation === "EVEN_DIE_EVENT") return { type, description: "Không gian mẫu của một lần gieo xúc xắc.", data: { rows: v.map((value) => ({ name: "Kết quả", value })), operation: m.operation } };
    return { type, description: "Bảng kết quả phép thử.", data: { rows: m.labels.length ? m.labels.map((label, index) => ({ name: label, value: v[index] ?? label })) : v.map((value, index) => ({ name: `Dữ kiện ${index + 1}`, value })), values: v, operation: m.operation } };
  }
  if (type === "OBJECT_GROUPS") return { type, description: "Các nhóm vật thể biểu diễn phép chia trong đề.", data: { groups: Array.from({ length: Math.min(v[2] ?? 2, 10) }, () => v[1] ?? 1), values: v, operation: m.operation } };
  if (type === "MEASUREMENT_MODEL") return { type, description: "Mô hình kích thước và đơn vị đo của bài toán.", data: { values: v, labels: m.labels, operation: m.operation, unit: m.meta.unit ?? "đơn vị", shape: m.meta.shape ?? "MEASURE" } };
  if (type === "SHAPE_DIAGRAM") return { type, description: m.operation.startsWith("MIDLINE_") ? "Tam giác có đường trung bình nối trung điểm hai cạnh." : "Sơ đồ hình học của bài toán.", data: { values: m.operation === "GEOMETRY_TOOL_SEQUENCE" || m.operation === "MEDIA_EVIDENCE_SEQUENCE" ? [] : v, labels: m.labels, operation: m.operation, shape: m.meta.shape ?? "TRIANGLE", theorem: m.meta.theorem ?? null, orientation: m.representationIndex % 8 } };
  if (type === "COORDINATE_GRAPH") return { type, description: "Hệ trục và dữ kiện hàm số của bài toán.", data: { values: v, labels: m.labels, operation: m.operation, graphKind: m.meta.graphKind ?? "FUNCTION", candidateGraphs: [{ id: "g1", kind: "CANONICAL", values: v }, { id: "g2", kind: "SIGN_ERROR", values: v.map((value) => -value) }] } };
  return { type: "NONE", description: "Không cần visual làm bằng chứng.", data: {} };
}
function interactionFor(m: WaveENormalizedProblemModel, solution: WaveESolution, random: Random): ProductInteractionContract { if (m.interactionType === "SINGLE_CHOICE" || m.interactionType === "CONSTRUCTION_OR_VISUAL_SELECTION") return { type: m.interactionType, options: solution.options, choiceCount: 1 }; if (m.interactionType === "MULTI_SELECT") return { type: "MULTI_SELECT", options: solution.options, choiceCount: Array.isArray(solution.correct) ? solution.correct.length : 1 }; if (m.interactionType === "ORDERING") return { type: "ORDERING", options: random.shuffle(solution.options ?? []), orderedItemIds: solution.correct as readonly string[] }; if (m.interactionType === "MATCHING") return { type: "MATCHING", leftItems: solution.leftItems, rightItems: random.shuffle(solution.rightItems ?? []) }; if (m.interactionType === "FRACTION_INPUT") return { type: "FRACTION_INPUT", inputLabel: "Phân số tối giản", inputMode: "text" }; if (m.interactionType === "DECIMAL_INPUT") return { type: "DECIMAL_INPUT", inputLabel: "Kết quả", inputMode: "decimal" }; if (m.interactionType === "TABLE_OR_CHART_RESPONSE") return { type: "TABLE_OR_CHART_RESPONSE", inputLabel: "Giá trị hoặc hàng dữ liệu", inputMode: "text" }; return { type: "INTEGER_INPUT", inputLabel: "Kết quả", inputMode: "numeric" }; }
function validateModel(contract: WaveEOutcomeContract, model: WaveENormalizedProblemModel, solution: WaveESolution, prompt: string, interaction: ProductInteractionContract, visual: ProductVisual) {
  if (model.outcomeId !== contract.outcomeId || model.grade !== contract.grade || model.variantId !== contract.canonicalVariantId || model.engineVersion !== WAVE_E_ENGINE_VERSION) throw new GenerationV2Error("VALIDATION_FAILED");
  if (prompt !== promptFor(model) || interaction.type !== model.interactionType || visual.type !== WAVE_E_CAPABILITY_METADATA[model.variantId].visualType) throw new GenerationV2Error("VALIDATION_FAILED");
  if (model.values.some((value) => !Number.isFinite(value) || Math.abs(value) > Math.max(contract.parameterBounds.maximum, 10_000_000))) throw new GenerationV2Error("VALIDATION_FAILED");
  const semantic = solveModel(model);
  if (["SINGLE_CHOICE", "CONSTRUCTION_OR_VISUAL_SELECTION", "MULTI_SELECT"].includes(model.interactionType)) { const expected = semanticLabels(semantic.answer).sort(); const actual = interaction.options?.filter((option) => Array.isArray(solution.correct) ? (solution.correct as readonly string[]).includes(option.id) : option.id === solution.correct).map((option) => option.label).sort() ?? []; if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new GenerationV2Error("VALIDATION_FAILED"); }
  else { const replay = adaptSolution(model, semantic, new Random(`${contract.outcomeId}:${model.difficulty}:validation`)); if (normalize(replay.correct) !== normalize(solution.correct)) throw new GenerationV2Error("VALIDATION_FAILED"); }
  if (interaction.options) { const ids = interaction.options.map((option) => option.id), labels = interaction.options.map((option) => option.label); if (new Set(ids).size !== ids.length || new Set(labels).size !== labels.length) throw new GenerationV2Error("VALIDATION_FAILED"); }
  const serialized = JSON.stringify({ prompt, interaction, visual }); for (const forbidden of ["correctResponse", "acceptedResponses", "privateSolution", "solverReceipt", "rawSeed"]) if (serialized.includes(forbidden)) throw new GenerationV2Error("VALIDATION_FAILED");
  return { ok: true as const, checks: ["EXPLICIT_OUTCOME_CONTRACT", "INDEPENDENT_SOLVER_RECOMPUTATION", "UNIQUE_OR_EXPLICIT_ACCEPTED_ANSWER", "GRADE_AND_DOMAIN_BOUNDS", "PROMPT_MODEL_ALIGNMENT", "VISUAL_DATA_MODEL_ALIGNMENT", "DISTRACTOR_FALSEHOOD_AND_UNIQUENESS", "NO_PRIVATE_LEAK"] };
}
const responseInstruction = (type: ProductInteractionContract["type"]) => type === "ORDERING" ? "Sắp xếp các bước theo thứ tự hợp lệ." : type === "MATCHING" ? "Ghép từng mục với giá trị đúng." : type === "FRACTION_INPUT" ? "Nhập tử số và mẫu số; phân số tương đương được chuẩn hóa." : type === "MULTI_SELECT" ? "Chọn tất cả phương án đúng." : type === "SINGLE_CHOICE" || type === "CONSTRUCTION_OR_VISUAL_SELECTION" ? "Chọn một phương án." : "Nhập giá trị chính xác.";

export function generateWaveEQuestion(contract: WaveEOutcomeContract, input: GenerateQuestionInput): GeneratedProductQuestion {
  if (contract.grade !== input.grade) throw new GenerationV2Error("GRADE_MISMATCH"); const random = new Random(`${contract.outcomeId}:${input.difficulty}:${input.seed}`); const model = buildModel(contract, input, random); const semantic = solveModel(model); const solution = adaptSolution(model, semantic, random); const prompt = promptFor(model); const visual = visualFor(model); const interaction = interactionFor(model, solution, random); const validation = validateModel(contract, model, solution, prompt, interaction, visual); const modelHash = hash(JSON.stringify(model));
  const publicSnapshot = { schemaVersion: 2 as const, questionId: `v2-${contract.canonicalVariantId.toLowerCase().replaceAll("_", "-")}-${hash(`${input.outcomeId}:${input.seed}:${input.difficulty}`).slice(0, 16)}`, grade: contract.grade, outcomeId: contract.outcomeId, productFamilyId: contract.productFamilyId, variantId: contract.canonicalVariantId, variantVersion: VARIANT_VERSION, difficulty: input.difficulty, publicPrompt: prompt, publicData: { taskMode: contract.taskMode, operation: model.operation, values: model.values, labels: model.labels, scale: model.scale, meta: model.meta, structuralFingerprint: model.structuralFingerprint, difficultyStructure: model.structureLevel }, interaction, visual, accessibility: { prompt, visualAlternative: visual.description, responseInstruction: responseInstruction(interaction.type) } };
  const privateSolution = { correctResponse: solution.correct, acceptedResponses: solution.accepted, solutionSteps: solution.steps, optionMisconceptions: solution.optionMisconceptions ?? {}, nextStep: solution.nextStep }; const solverReceipt = { solverVersion: SOLVER_VERSION, normalizedInputHash: modelHash, resultHash: hash(JSON.stringify(solution.correct)), uniqueSolution: true };
  return { publicSnapshot, privateSolution, solverReceipt, validation, provenance: { questionSource: "GENERATED_V2", outcomeId: contract.outcomeId, productFamilyId: contract.productFamilyId, variantId: contract.canonicalVariantId, variantVersion: VARIANT_VERSION, generatorVersion: GENERATOR_V2_VERSION, solverVersion: SOLVER_VERSION, difficultyPolicyVersion: DIFFICULTY_POLICY_VERSION, seedFingerprint: hash(input.seed).slice(0, 16), normalizedModelHash: modelHash, publicSnapshotHash: hash(JSON.stringify(publicSnapshot)), visualHash: hash(JSON.stringify(visual)), solverReceiptHash: hash(JSON.stringify(solverReceipt)) } };
}
export const __waveENegativeControl = { inspect(contract: WaveEOutcomeContract, input: GenerateQuestionInput) { const random = new Random(`${contract.outcomeId}:${input.difficulty}:${input.seed}`); const normalizedModel = buildModel(contract, input, random); const semantic = solveModel(normalizedModel); const solution = adaptSolution(normalizedModel, semantic, random); const prompt = promptFor(normalizedModel); const visual = visualFor(normalizedModel); const interaction = interactionFor(normalizedModel, solution, random); return { normalizedModel, semantic, solution, prompt, visual, interaction }; }, validate: validateModel, recompute: solveModel };
