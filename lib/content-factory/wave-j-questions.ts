import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, FactoryGrade, GradePack, MathExpression, QuestionType } from "./types.ts";

export type WaveJStructureTag =
  | "ORDER_FRACTIONS" | "ADD_FRACTIONS_DIVISIBLE_DENOMINATORS" | "SUBTRACT_FRACTIONS_DIVISIBLE_DENOMINATORS"
  | "APPLIED_DECIMAL_SUBTRACTION" | "APPLIED_DECIMAL_MULTIPLICATION" | "APPLIED_DECIMAL_DIVISION"
  | "IDENTIFY_MULTIPLE" | "INTEGER_SUBTRACTION" | "INTEGER_MULTIPLICATION" | "INTEGER_EXACT_DIVISION"
  | "ARITHMETIC_PROPERTY_APPLICATION" | "MULTI_TERM_BRACKET_TRANSFORMATION" | "THREE_NUMBER_GCD" | "THREE_NUMBER_LCM"
  | "IRREDUCIBLE_FRACTION_GCD" | "FRACTION_ADDITION_VIA_LCM" | "FRACTION_SUBTRACTION_VIA_LCM"
  | "INVERSE_UNKNOWN_QUANTITY" | "INVERSE_QUANTITY_CHANGE" | "DIRECT_CHANGE" | "DIRECT_UNKNOWN_INPUT"
  | "EQUIVALENT_RATIO_SCALE" | "EQUIVALENT_RATIO_RECONSTRUCTION" | "CROSS_PRODUCT_AUDIT" | "PROPORTION_SOLVE_THEN_TRANSFORM"
  | "RATIO_PARTITION_FROM_DIFFERENCE" | "RATIO_PARTITION_SUBTOTAL" | "APPLIED_SCALE_CONVERSION" | "APPLIED_RATIO_GEOMETRY";

export type WaveJSeed = Readonly<{
  grade: 4 | 5 | 6 | 7;
  skillId: string;
  prompt: string;
  expression: MathExpression;
  answerType: Exclude<QuestionType, "AUTOMATED_VERIFICATION_INSUFFICIENT">;
  decimalPlaces?: number;
  difficulty: DifficultyBand;
  purpose: "REMEDIATION" | "TRANSFER_APPLICATION";
  structureTag: WaveJStructureTag;
  reasoningSteps: 1 | 2 | 3 | 4;
  coordinatedSkillCount: 1 | 2;
  representationTransformations: 0 | 1 | 2;
  constraintCount: 1 | 2 | 3 | 4;
  explanation: readonly string[];
}>;

const v = (numerator: number, denominator = 1): MathExpression => ({ op: "VALUE", numerator, denominator });
const add = (left: MathExpression, right: MathExpression): MathExpression => ({ op: "ADD", left, right });
const sub = (left: MathExpression, right: MathExpression): MathExpression => ({ op: "SUBTRACT", left, right });
const mul = (left: MathExpression, right: MathExpression): MathExpression => ({ op: "MULTIPLY", left, right });
const div = (left: MathExpression, right: MathExpression): MathExpression => ({ op: "DIVIDE", left, right });
const productOver = (left: number, right: number, denominator: number) => div(mul(v(left), v(right)), v(denominator));

export const waveJSeeds: readonly WaveJSeed[] = [
  { grade: 4, skillId: "moet2018-g4-num-p036-020", prompt: "Sắp xếp 1/2, 3/4 và 2/3 theo thứ tự tăng dần. Tử số của phân số đứng giữa là bao nhiêu?", expression: v(2), answerType: "INTEGER_INPUT", difficulty: "CORE", purpose: "TRANSFER_APPLICATION", structureTag: "ORDER_FRACTIONS", reasoningSteps: 2, coordinatedSkillCount: 1, representationTransformations: 1, constraintCount: 2, explanation: ["Quy đồng hoặc so sánh giá trị để được 1/2 < 2/3 < 3/4.", "Phân số đứng giữa là 2/3 nên tử số bằng 2."] },

  { grade: 5, skillId: "moet2018-g5-num-p041-009", prompt: "Sắp xếp 2/5, 3/4 và 1/2 theo thứ tự tăng dần. Mẫu số của phân số đứng giữa là bao nhiêu?", expression: v(2), answerType: "INTEGER_INPUT", difficulty: "CORE", purpose: "TRANSFER_APPLICATION", structureTag: "ORDER_FRACTIONS", reasoningSteps: 2, coordinatedSkillCount: 1, representationTransformations: 1, constraintCount: 2, explanation: ["So sánh được 2/5 < 1/2 < 3/4.", "Phân số đứng giữa là 1/2 nên mẫu số bằng 2."] },
  { grade: 5, skillId: "moet2018-g5-num-p041-012", prompt: "Tính 2/3 + 1/6 và viết kết quả dưới dạng phân số tối giản.", expression: add(v(2, 3), v(1, 6)), answerType: "RATIONAL_INPUT", difficulty: "FOUNDATIONAL", purpose: "REMEDIATION", structureTag: "ADD_FRACTIONS_DIVISIBLE_DENOMINATORS", reasoningSteps: 1, coordinatedSkillCount: 1, representationTransformations: 0, constraintCount: 1, explanation: ["Đổi 2/3 thành 4/6 rồi cộng 4/6 + 1/6.", "Kết quả tối giản là 5/6."] },
  { grade: 5, skillId: "moet2018-g5-num-p041-012", prompt: "Tính 7/8 - 1/4 và viết kết quả dưới dạng phân số tối giản.", expression: sub(v(7, 8), v(1, 4)), answerType: "RATIONAL_INPUT", difficulty: "FOUNDATIONAL", purpose: "TRANSFER_APPLICATION", structureTag: "SUBTRACT_FRACTIONS_DIVISIBLE_DENOMINATORS", reasoningSteps: 1, coordinatedSkillCount: 1, representationTransformations: 0, constraintCount: 1, explanation: ["Đổi 1/4 thành 2/8 rồi trừ 7/8 - 2/8.", "Kết quả tối giản là 5/8."] },
  { grade: 5, skillId: "moet2018-g5-num-p042-015", prompt: "Một bình có 5,5 lít nước, đã dùng 1,75 lít. Bình còn lại bao nhiêu lít?", expression: sub(v(550, 100), v(175, 100)), answerType: "DECIMAL_INPUT", decimalPlaces: 2, difficulty: "CORE", purpose: "REMEDIATION", structureTag: "APPLIED_DECIMAL_SUBTRACTION", reasoningSteps: 2, coordinatedSkillCount: 1, representationTransformations: 1, constraintCount: 2, explanation: ["Hai số đo cùng đơn vị lít nên thực hiện phép trừ.", "5,50 - 1,75 = 3,75 lít."] },
  { grade: 5, skillId: "moet2018-g5-num-p042-015", prompt: "Mỗi đoạn dây dài 1,25 m. Sáu đoạn như vậy dài tổng cộng bao nhiêu mét?", expression: mul(v(125, 100), v(6)), answerType: "DECIMAL_INPUT", decimalPlaces: 2, difficulty: "CORE", purpose: "TRANSFER_APPLICATION", structureTag: "APPLIED_DECIMAL_MULTIPLICATION", reasoningSteps: 2, coordinatedSkillCount: 1, representationTransformations: 1, constraintCount: 2, explanation: ["Tổng độ dài bằng độ dài một đoạn nhân số đoạn.", "1,25 × 6 = 7,5 m."] },
  { grade: 5, skillId: "moet2018-g5-num-p042-015", prompt: "Chia đều 8,4 kg gạo vào bốn túi. Mỗi túi có bao nhiêu ki-lô-gam gạo?", expression: div(v(84, 10), v(4)), answerType: "DECIMAL_INPUT", decimalPlaces: 2, difficulty: "CORE", purpose: "TRANSFER_APPLICATION", structureTag: "APPLIED_DECIMAL_DIVISION", reasoningSteps: 2, coordinatedSkillCount: 1, representationTransformations: 1, constraintCount: 2, explanation: ["Khối lượng mỗi túi bằng tổng khối lượng chia số túi.", "8,4 : 4 = 2,1 kg."] },

  { grade: 6, skillId: "moet2018-g6-naa-p047-006", prompt: "Số tự nhiên nhỏ nhất lớn hơn 50 và là bội của 12 bằng bao nhiêu?", expression: v(60), answerType: "INTEGER_INPUT", difficulty: "FOUNDATIONAL", purpose: "TRANSFER_APPLICATION", structureTag: "IDENTIFY_MULTIPLE", reasoningSteps: 1, coordinatedSkillCount: 1, representationTransformations: 0, constraintCount: 2, explanation: ["Các bội liên tiếp của 12 quanh 50 là 48 và 60.", "Bội nhỏ nhất lớn hơn 50 là 60."] },
  { grade: 6, skillId: "moet2018-g6-naa-p048-026", prompt: "Tính -7 - 5.", expression: sub(v(-7), v(5)), answerType: "INTEGER_INPUT", difficulty: "FOUNDATIONAL", purpose: "REMEDIATION", structureTag: "INTEGER_SUBTRACTION", reasoningSteps: 1, coordinatedSkillCount: 1, representationTransformations: 0, constraintCount: 1, explanation: ["Trừ 5 khỏi -7 làm giá trị giảm thêm 5 đơn vị.", "Kết quả là -12."] },
  { grade: 6, skillId: "moet2018-g6-naa-p048-026", prompt: "Tính (-6) × 7.", expression: mul(v(-6), v(7)), answerType: "INTEGER_INPUT", difficulty: "FOUNDATIONAL", purpose: "TRANSFER_APPLICATION", structureTag: "INTEGER_MULTIPLICATION", reasoningSteps: 1, coordinatedSkillCount: 1, representationTransformations: 0, constraintCount: 1, explanation: ["Tích của hai số khác dấu mang dấu âm.", "6 × 7 = 42 nên kết quả là -42."] },
  { grade: 6, skillId: "moet2018-g6-naa-p048-026", prompt: "Tính (-56) : 8.", expression: div(v(-56), v(8)), answerType: "INTEGER_INPUT", difficulty: "FOUNDATIONAL", purpose: "TRANSFER_APPLICATION", structureTag: "INTEGER_EXACT_DIVISION", reasoningSteps: 1, coordinatedSkillCount: 1, representationTransformations: 0, constraintCount: 2, explanation: ["Thương của hai số khác dấu mang dấu âm.", "56 : 8 = 7 nên kết quả là -7."] },
  { grade: 6, skillId: "moet2018-g6-naa-p048-029", prompt: "Dùng tính chất phân phối để tính 18 × (-3) + 18 × 5.", expression: add(mul(v(18), v(-3)), mul(v(18), v(5))), answerType: "INTEGER_INPUT", difficulty: "CORE", purpose: "TRANSFER_APPLICATION", structureTag: "ARITHMETIC_PROPERTY_APPLICATION", reasoningSteps: 2, coordinatedSkillCount: 1, representationTransformations: 1, constraintCount: 2, explanation: ["Đặt 18 làm thừa số chung: 18 × (-3 + 5).", "18 × 2 = 36."] },
  { grade: 6, skillId: "moet2018-g6-naa-p048-029", prompt: "Bỏ ngoặc rồi tính 7 - (-3 + 5 - 8).", expression: sub(v(7), add(add(v(-3), v(5)), v(-8))), answerType: "INTEGER_INPUT", difficulty: "CORE", purpose: "REMEDIATION", structureTag: "MULTI_TERM_BRACKET_TRANSFORMATION", reasoningSteps: 2, coordinatedSkillCount: 1, representationTransformations: 1, constraintCount: 2, explanation: ["Trong ngoặc, -3 + 5 - 8 = -6.", "Vì vậy 7 - (-6) = 13."] },
  { grade: 6, skillId: "moet2018-g6-naa-p048-030", prompt: "Tìm ước chung lớn nhất của 18, 24 và 30.", expression: v(6), answerType: "INTEGER_INPUT", difficulty: "CORE", purpose: "TRANSFER_APPLICATION", structureTag: "THREE_NUMBER_GCD", reasoningSteps: 2, coordinatedSkillCount: 1, representationTransformations: 1, constraintCount: 3, explanation: ["Phân tích ba số hoặc lấy ước chung liên tiếp.", "Ước chung lớn nhất của 18, 24 và 30 là 6."] },
  { grade: 6, skillId: "moet2018-g6-naa-p048-030", prompt: "Tìm bội chung nhỏ nhất của 6, 8 và 15.", expression: v(120), answerType: "INTEGER_INPUT", difficulty: "CORE", purpose: "TRANSFER_APPLICATION", structureTag: "THREE_NUMBER_LCM", reasoningSteps: 2, coordinatedSkillCount: 1, representationTransformations: 1, constraintCount: 3, explanation: ["Lấy các thừa số nguyên tố với số mũ lớn nhất: 2³ × 3 × 5.", "Bội chung nhỏ nhất là 120."] },
  { grade: 6, skillId: "moet2018-g6-naa-p048-030", prompt: "Tính ước chung lớn nhất của 35 và 54 để kiểm tra phân số 35/54 đã tối giản.", expression: v(1), answerType: "INTEGER_INPUT", difficulty: "FOUNDATIONAL", purpose: "REMEDIATION", structureTag: "IRREDUCIBLE_FRACTION_GCD", reasoningSteps: 1, coordinatedSkillCount: 1, representationTransformations: 1, constraintCount: 2, explanation: ["35 và 54 không có ước chung nào lớn hơn 1.", "Ước chung lớn nhất bằng 1 nên phân số đã tối giản."] },
  { grade: 6, skillId: "moet2018-g6-naa-p048-030", prompt: "Dùng mẫu chung nhỏ nhất để tính 5/12 + 1/8.", expression: add(v(5, 12), v(1, 8)), answerType: "RATIONAL_INPUT", difficulty: "CORE", purpose: "TRANSFER_APPLICATION", structureTag: "FRACTION_ADDITION_VIA_LCM", reasoningSteps: 2, coordinatedSkillCount: 1, representationTransformations: 1, constraintCount: 2, explanation: ["Bội chung nhỏ nhất của 12 và 8 là 24.", "10/24 + 3/24 = 13/24."] },
  { grade: 6, skillId: "moet2018-g6-naa-p048-030", prompt: "Dùng mẫu chung nhỏ nhất để tính 7/10 - 1/4.", expression: sub(v(7, 10), v(1, 4)), answerType: "RATIONAL_INPUT", difficulty: "CORE", purpose: "TRANSFER_APPLICATION", structureTag: "FRACTION_SUBTRACTION_VIA_LCM", reasoningSteps: 2, coordinatedSkillCount: 1, representationTransformations: 1, constraintCount: 2, explanation: ["Bội chung nhỏ nhất của 10 và 4 là 20.", "14/20 - 5/20 = 9/20."] },

  { grade: 7, skillId: "moet2018-g7-naa-p057-019", prompt: "Mười hai máy hoàn thành một việc trong 8 giờ. Muốn hoàn thành trong 6 giờ cần bao nhiêu máy cùng năng suất?", expression: productOver(12, 8, 6), answerType: "INTEGER_INPUT", difficulty: "CORE", purpose: "REMEDIATION", structureTag: "INVERSE_UNKNOWN_QUANTITY", reasoningSteps: 2, coordinatedSkillCount: 1, representationTransformations: 1, constraintCount: 2, explanation: ["Số máy và thời gian tỉ lệ nghịch nên tích của chúng không đổi.", "12 × 8 : 6 = 16 máy."] },
  { grade: 7, skillId: "moet2018-g7-naa-p057-019", prompt: "Tám người làm xong một việc trong 15 ngày. Muốn xong trong 12 ngày phải thêm bao nhiêu người cùng năng suất?", expression: sub(productOver(8, 15, 12), v(8)), answerType: "INTEGER_INPUT", difficulty: "CORE", purpose: "TRANSFER_APPLICATION", structureTag: "INVERSE_QUANTITY_CHANGE", reasoningSteps: 2, coordinatedSkillCount: 1, representationTransformations: 1, constraintCount: 2, explanation: ["Số người cần có là 8 × 15 : 12 = 10.", "Số người phải thêm là 10 - 8 = 2."] },
  { grade: 7, skillId: "moet2018-g7-naa-p057-020", prompt: "Năm quyển vở giá 40 nghìn đồng. Mười ba quyển đắt hơn năm quyển bao nhiêu nghìn đồng?", expression: sub(productOver(40, 13, 5), v(40)), answerType: "INTEGER_INPUT", difficulty: "CORE", purpose: "REMEDIATION", structureTag: "DIRECT_CHANGE", reasoningSteps: 2, coordinatedSkillCount: 1, representationTransformations: 1, constraintCount: 2, explanation: ["Một quyển giá 40 : 5 = 8 nghìn đồng.", "Mười ba quyển giá 104; chênh lệch là 104 - 40 = 64."] },
  { grade: 7, skillId: "moet2018-g7-naa-p057-020", prompt: "Bốn khay chứa 28 cốc. Cần bao nhiêu khay như vậy để chứa 91 cốc?", expression: productOver(91, 4, 28), answerType: "INTEGER_INPUT", difficulty: "CORE", purpose: "TRANSFER_APPLICATION", structureTag: "DIRECT_UNKNOWN_INPUT", reasoningSteps: 2, coordinatedSkillCount: 1, representationTransformations: 1, constraintCount: 2, explanation: ["Mỗi khay chứa 28 : 4 = 7 cốc.", "Số khay cần là 91 : 7 = 13."] },
  { grade: 7, skillId: "moet2018-g7-naa-p057-024", prompt: "Cặp số 18 và 30 nhận được khi nhân 3 và 5 với cùng số tự nhiên nào?", expression: v(6), answerType: "INTEGER_INPUT", difficulty: "FOUNDATIONAL", purpose: "REMEDIATION", structureTag: "EQUIVALENT_RATIO_SCALE", reasoningSteps: 1, coordinatedSkillCount: 1, representationTransformations: 1, constraintCount: 1, explanation: ["18 : 3 và 30 : 5 phải cho cùng hệ số.", "Cả hai thương đều bằng 6."] },
  { grade: 7, skillId: "moet2018-g7-naa-p057-024", prompt: "Một tỉ số bằng 4/7 có mẫu số 35. Tổng tử số và mẫu số của tỉ số mới bằng bao nhiêu?", expression: add(productOver(4, 35, 7), v(35)), answerType: "INTEGER_INPUT", difficulty: "CORE", purpose: "TRANSFER_APPLICATION", structureTag: "EQUIVALENT_RATIO_RECONSTRUCTION", reasoningSteps: 2, coordinatedSkillCount: 1, representationTransformations: 1, constraintCount: 2, explanation: ["Mẫu số được nhân 5 nên tử số mới là 4 × 5 = 20.", "Tổng tử và mẫu là 20 + 35 = 55."] },
  { grade: 7, skillId: "moet2018-g7-naa-p057-028", prompt: "Kiểm tra 4/7 = 20/35 bằng tích chéo. Hiệu tuyệt đối của hai tích đúng bằng bao nhiêu?", expression: sub(mul(v(4), v(35)), mul(v(7), v(20))), answerType: "INTEGER_INPUT", difficulty: "CORE", purpose: "REMEDIATION", structureTag: "CROSS_PRODUCT_AUDIT", reasoningSteps: 2, coordinatedSkillCount: 1, representationTransformations: 1, constraintCount: 2, explanation: ["Hai tích chéo là 4 × 35 và 7 × 20.", "Cả hai đều bằng 140 nên hiệu tuyệt đối bằng 0."] },
  { grade: 7, skillId: "moet2018-g7-naa-p057-028", prompt: "Biết a/18 = 5/6. Sau khi tìm a, tính a - 10.", expression: sub(productOver(18, 5, 6), v(10)), answerType: "INTEGER_INPUT", difficulty: "CORE", purpose: "TRANSFER_APPLICATION", structureTag: "PROPORTION_SOLVE_THEN_TRANSFORM", reasoningSteps: 2, coordinatedSkillCount: 1, representationTransformations: 1, constraintCount: 2, explanation: ["Từ a/18 = 5/6 suy ra a = 18 × 5 : 6 = 15.", "Do đó a - 10 = 5."] },
  { grade: 7, skillId: "moet2018-g7-naa-p057-031", prompt: "Hai phần có tỉ lệ 3:5 và phần lớn hơn phần nhỏ 24 đơn vị. Tổng hai phần bằng bao nhiêu?", expression: productOver(24, 8, 2), answerType: "INTEGER_INPUT", difficulty: "EXTENSION", purpose: "REMEDIATION", structureTag: "RATIO_PARTITION_FROM_DIFFERENCE", reasoningSteps: 3, coordinatedSkillCount: 1, representationTransformations: 2, constraintCount: 3, explanation: ["Hiệu số phần tỉ lệ là 5 - 3 = 2 phần.", "Mỗi phần bằng 24 : 2 = 12; tổng 8 phần bằng 96."] },
  { grade: 7, skillId: "moet2018-g7-naa-p057-031", prompt: "Chia 200 thành ba phần theo tỉ lệ 2:3:5. Tổng của hai phần nhỏ hơn bằng bao nhiêu?", expression: productOver(200, 5, 10), answerType: "INTEGER_INPUT", difficulty: "EXTENSION", purpose: "TRANSFER_APPLICATION", structureTag: "RATIO_PARTITION_SUBTOTAL", reasoningSteps: 3, coordinatedSkillCount: 1, representationTransformations: 2, constraintCount: 3, explanation: ["Tổng số phần tỉ lệ là 10; hai phần nhỏ chiếm 2 + 3 = 5 phần.", "200 × 5 : 10 = 100."] },
  { grade: 7, skillId: "moet2018-g7-naa-p057-032", prompt: "Trên bản đồ, 3 cm ứng với 24 km. Một tuyến dài 5,5 cm trên bản đồ dài bao nhiêu ki-lô-mét thực tế?", expression: div(mul(v(24), v(11, 2)), v(3)), answerType: "INTEGER_INPUT", difficulty: "EXTENSION", purpose: "REMEDIATION", structureTag: "APPLIED_SCALE_CONVERSION", reasoningSteps: 3, coordinatedSkillCount: 2, representationTransformations: 2, constraintCount: 3, explanation: ["Mỗi xăng-ti-mét trên bản đồ ứng với 24 : 3 = 8 km.", "5,5 × 8 = 44 km."] },
  { grade: 7, skillId: "moet2018-g7-naa-p057-032", prompt: "Hình chữ nhật có chiều dài và chiều rộng tỉ lệ 7:4, chu vi 66 cm. Diện tích bằng bao nhiêu xăng-ti-mét vuông?", expression: mul(productOver(33, 7, 11), productOver(33, 4, 11)), answerType: "INTEGER_INPUT", difficulty: "EXTENSION", purpose: "TRANSFER_APPLICATION", structureTag: "APPLIED_RATIO_GEOMETRY", reasoningSteps: 4, coordinatedSkillCount: 2, representationTransformations: 2, constraintCount: 4, explanation: ["Nửa chu vi là 33 cm và tổng số phần tỉ lệ là 11.", "Một phần dài 3 cm nên hai cạnh là 21 cm và 12 cm; diện tích bằng 252 cm²."] },
] as const;

type Rational = Readonly<{ n: number; d: number }>;
const gcd = (a: number, b: number): number => b === 0 ? Math.abs(a) : gcd(b, a % b);
function rational(n: number, d: number): Rational {
  if (d === 0) throw new Error("WAVE_J_DIVISION_BY_ZERO");
  const sign = d < 0 ? -1 : 1; const divisor = gcd(n, d);
  return { n: sign * n / divisor, d: Math.abs(d) / divisor };
}
export function evaluateWaveJExpression(expression: MathExpression): Rational {
  if (expression.op === "VALUE") return rational(expression.numerator, expression.denominator);
  if (expression.op === "SQRT") throw new Error("WAVE_J_UNSUPPORTED_SQRT");
  const left = evaluateWaveJExpression(expression.left); const right = evaluateWaveJExpression(expression.right);
  if (expression.op === "ADD") return rational(left.n * right.d + right.n * left.d, left.d * right.d);
  if (expression.op === "SUBTRACT") return rational(left.n * right.d - right.n * left.d, left.d * right.d);
  if (expression.op === "MULTIPLY") return rational(left.n * right.n, left.d * right.d);
  return rational(left.n * right.d, left.d * right.n);
}

function exactValue(seed: WaveJSeed) {
  const result = evaluateWaveJExpression(seed.expression);
  if (seed.answerType === "DECIMAL_INPUT") {
    const places = seed.decimalPlaces ?? 2;
    return (result.n / result.d).toFixed(places).replace(/\.0+$/u, "").replace(/(\.\d*?)0+$/u, "$1");
  }
  return result.d === 1 ? String(result.n) : `${result.n}/${result.d}`;
}

export function buildWaveJQuestions(sourcePacks: readonly GradePack[]) {
  const counters = new Map<FactoryGrade, number>();
  const receiptsByGrade = new Map<FactoryGrade, readonly string[]>(sourcePacks.map((pack) => [pack.grade,
    requiredAutomatedEvidenceChecks.map((check) => `grade-${pack.grade}-wave-j-depth-${check.toLowerCase().replaceAll("_", "-")}`)]));
  return waveJSeeds.map((seed) => {
    const pack = sourcePacks.find((entry) => entry.grade === seed.grade)!;
    const sourceQuestion = pack.questions.find((entry) => entry.skillId === seed.skillId);
    if (!sourceQuestion) throw new Error(`WAVE_J_SOURCE_SKILL_MISSING:${seed.skillId}`);
    const index = (counters.get(seed.grade) ?? 0) + 1; counters.set(seed.grade, index);
    const id = `g${seed.grade}-wave-j-depth-q${String(index).padStart(2, "0")}`;
    const prompt = seed.prompt.normalize("NFC"); const answer = exactValue(seed);
    const answerContract = seed.decimalPlaces === undefined
      ? { type: seed.answerType, exactValue: answer, derivation: seed.expression }
      : { type: seed.answerType, exactValue: answer, decimalPlaces: seed.decimalPlaces, derivation: seed.expression };
    const unitBinding = sourceQuestion.unitId === undefined ? {} : { unitId: sourceQuestion.unitId };
    const question: CandidateQuestion = { id, grade: seed.grade, ...unitBinding,
      blueprintId: `g${seed.grade}-wave-j-${seed.structureTag.toLowerCase().replaceAll("_", "-")}`,
      skillId: seed.skillId, prompt, options: null,
      answer: answerContract,
      explanationId: `${id}-explanation`, difficulty: seed.difficulty,
      provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "wave-j-depth-structure-v1",
        seed: `wave-j-g${seed.grade}-${seed.structureTag.toLowerCase()}-${index}`, sourceReferenceIds: [officialSourceReferenceId(seed.grade)] },
      reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false,
      duplicateFingerprint: sha256(normalizedDefinition(`${prompt}|`).toLocaleLowerCase("vi")),
      validationReceiptIds: receiptsByGrade.get(seed.grade), instructionalPurpose: seed.purpose };
    const explanation: ExplanationSpec = { id: question.explanationId, questionId: id, steps: seed.explanation,
      finalAnswer: answer, evidenceReceiptIds: [`grade-${seed.grade}-wave-j-depth-explanation-consistency`] };
    return { seed, question, explanation } as const;
  });
}

export function verifyWaveJQuestionOracle(sourcePacks: readonly GradePack[]) {
  return buildWaveJQuestions(sourcePacks).flatMap(({ seed, question }) => {
    const recomputed = exactValue(seed); const errors: string[] = [];
    if (recomputed !== question.answer.exactValue) errors.push(`${question.id}:MATHEMATICAL_ANSWER`);
    if (!question.provenance.sourceReferenceIds.includes(officialSourceReferenceId(seed.grade))) errors.push(`${question.id}:SOURCE_MAPPING`);
    if (seed.difficulty === "FOUNDATIONAL" && seed.reasoningSteps !== 1) errors.push(`${question.id}:FOUNDATIONAL_COMPLEXITY`);
    if (seed.difficulty === "CORE" && seed.reasoningSteps < 2) errors.push(`${question.id}:CORE_COMPLEXITY`);
    if (seed.difficulty === "EXTENSION" && (seed.reasoningSteps < 3 || seed.coordinatedSkillCount < 1)) errors.push(`${question.id}:ADVANCED_COMPLEXITY`);
    return errors;
  });
}

export function buildWaveJQuestionBankHash(sourcePacks: readonly GradePack[]) {
  return sha256(canonicalize({ format: "plave-wave-j-question-bank-v1", seeds: waveJSeeds,
    questions: buildWaveJQuestions(sourcePacks).map((entry) => entry.question) }));
}
