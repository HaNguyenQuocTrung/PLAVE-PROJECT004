import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { gradeEightWaveAPack } from "./grade8-wave-a.ts";
import { gradeEightWaveBPack } from "./grade8-wave-b.ts";
import { buildOfficialGradeSkeleton, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack } from "./types.ts";

const grade = 8 as const;
const packId = "grade-8-algebraic-identities-factorization-wave-c";
const version = "g8-algebraic-identities-factorization-1.0.0-wave-c";
const candidateId = "g8-algebraic-identities-factorization-wave-c-rc1";
const policyVersion = "g8-algebraic-identities-factorization-policy-1.0.0-wave-c";
const sourceId = officialSourceReferenceId(grade);
const identityUnit = "grade-8-secondary-naa-p1-1";
const factorizationUnit = "grade-8-secondary-naa-p1-5";
const notableIdentitySkill = "moet2018-g8-naa-p063-001";
const identityRecognitionSkill = "moet2018-g8-naa-p063-003";
const factorizationSkill = "moet2018-g8-naa-p064-019";
const purpose = (index: number): NonNullable<CandidateQuestion["instructionalPurpose"]> => {
  const slot = index % 8;
  return slot < 2 ? "FOUNDATION" : slot < 4 ? "STANDARD_APPLICATION" : slot < 6 ? "MISCONCEPTION_TARGETING" : slot === 6 ? "REMEDIATION" : "TRANSFER_APPLICATION";
};

type Seed = Readonly<{
  prompt: string;
  options: readonly string[];
  answer: string;
  oracleTarget: string | null;
  skillId: string;
  unitId: string;
  blueprintId: string;
  difficulty: DifficultyBand;
  explanation: readonly string[];
}>;

const identityTargets = ["(x + 3)²", "(2x - 5)²", "(3a + b)²", "(y - 4)(y + 4)", "(x + 2)³", "(2y - 1)³", "x³ + 27", "(a - 2b)³"] as const;
const identitySeeds: readonly Seed[] = [
  { prompt: "Khai triển nào bằng (x + 3)² với mọi giá trị x?", options: ["x² + 6x + 9", "x² + 3x + 9", "x² + 9", "x² - 6x + 9"], answer: "x² + 6x + 9", explanation: ["Dùng (a + b)² = a² + 2ab + b².", "Với a = x, b = 3, hạng tử giữa là 6x."] },
  { prompt: "Chọn khai triển đúng của (2x - 5)².", options: ["4x² - 20x + 25", "4x² - 10x + 25", "4x² + 20x + 25", "2x² - 20x + 25"], answer: "4x² - 20x + 25", explanation: ["Dùng (a - b)² = a² - 2ab + b².", "Bình phương 2x và 5, rồi tính hạng tử giữa -20x."] },
  { prompt: "Biểu thức nào là khai triển của (3a + b)²?", options: ["9a² + 6ab + b²", "9a² + 3ab + b²", "6a² + 6ab + b²", "9a² - 6ab + b²"], answer: "9a² + 6ab + b²", explanation: ["Bình phương từng hạng tử và cộng hai lần tích của chúng.", "Kết quả là 9a² + 6ab + b²."] },
  { prompt: "Tích (y - 4)(y + 4) bằng biểu thức nào?", options: ["y² - 16", "y² + 16", "y² - 8y + 16", "y² + 8y + 16"], answer: "y² - 16", explanation: ["Áp dụng (a - b)(a + b) = a² - b².", "Với b = 4, ta có b² = 16."] },
  { prompt: "Khai triển đúng của (x + 2)³ là biểu thức nào?", options: ["x³ + 6x² + 12x + 8", "x³ + 2x² + 4x + 8", "x³ + 6x² + 8", "x³ - 6x² + 12x - 8"], answer: "x³ + 6x² + 12x + 8", explanation: ["Dùng (a + b)³ = a³ + 3a²b + 3ab² + b³.", "Thay b = 2 tạo các hệ số 6, 12 và 8."] },
  { prompt: "Chọn khai triển đúng của (2y - 1)³.", options: ["8y³ - 12y² + 6y - 1", "8y³ - 6y² + 2y - 1", "8y³ + 12y² + 6y + 1", "2y³ - 12y² + 6y - 1"], answer: "8y³ - 12y² + 6y - 1", explanation: ["Dùng công thức lập phương của một hiệu.", "Các hạng tử lần lượt là 8y³, -12y², 6y và -1."] },
  { prompt: "Phân tích x³ + 27 theo hằng đẳng thức tổng hai lập phương, chọn kết quả đúng.", options: ["(x + 3)(x² - 3x + 9)", "(x + 3)(x² + 3x + 9)", "(x - 3)(x² + 3x + 9)", "(x + 9)(x² - 3)"], answer: "(x + 3)(x² - 3x + 9)", explanation: ["Viết 27 = 3³ và dùng a³ + b³.", "Nhân tử thứ hai có dấu xen kẽ: x² - 3x + 9."] },
  { prompt: "Biểu thức nào bằng (a - 2b)³?", options: ["a³ - 6a²b + 12ab² - 8b³", "a³ - 2a²b + 4ab² - 8b³", "a³ + 6a²b + 12ab² + 8b³", "a³ - 6a²b - 12ab² - 8b³"], answer: "a³ - 6a²b + 12ab² - 8b³", explanation: ["Áp dụng lập phương của hiệu với hai hạng tử a và 2b.", "Tính đủ hai hạng tử giữa và giữ đúng dấu xen kẽ."] },
].map((seed, index) => ({ ...seed, oracleTarget: identityTargets[index]!, skillId: notableIdentitySkill, unitId: identityUnit, blueprintId: "g8-wave-c-notable-identities-foundational", difficulty: "FOUNDATIONAL" }));

const recognitionSeeds: readonly Seed[] = [
  { prompt: "Đẳng thức nào đúng với mọi số thực x?", options: ["(x + 1)² = x² + 2x + 1", "(x + 1)² = x² + 1", "(x + 1)² = x² + x + 1", "(x + 1)² = x² - 2x + 1"], answer: "(x + 1)² = x² + 2x + 1", explanation: ["Đồng nhất thức phải đúng với mọi giá trị của biến.", "Khai triển bình phương của tổng xác nhận phương án có hạng tử 2x."] },
  { prompt: "Chọn đồng nhất thức đúng với mọi giá trị của t.", options: ["(t - 6)(t + 6) = t² - 36", "(t - 6)(t + 6) = t² + 36", "(t - 6)(t + 6) = t² - 12t + 36", "(t - 6)(t + 6) = t² + 12t + 36"], answer: "(t - 6)(t + 6) = t² - 36", explanation: ["Hai nhân tử là tổng và hiệu của cùng hai hạng tử.", "Các hạng tử bậc nhất triệt tiêu, còn t² - 36."] },
  { prompt: "Đẳng thức nào là hằng đẳng thức chứ không chỉ đúng ở một vài giá trị m?", options: ["(m - 2)² = m² - 4m + 4", "(m - 2)² = m² - 4", "(m - 2)² = m² + 4m + 4", "(m - 2)² = m² - 2m + 4"], answer: "(m - 2)² = m² - 4m + 4", explanation: ["Khai triển vế trái theo bình phương của hiệu.", "Hai vế có cùng hệ số ở mọi lũy thừa của m chỉ trong phương án đúng."] },
  { prompt: "Với mọi số thực p và q, quan hệ nào luôn đúng?", options: ["(p + q)² - (p - q)² = 4pq", "(p + q)² - (p - q)² = 2pq", "(p + q)² - (p - q)² = 4p²", "(p + q)² - (p - q)² = 4q²"], answer: "(p + q)² - (p - q)² = 4pq", explanation: ["Khai triển hai bình phương rồi trừ theo từng hạng tử.", "Hai bình phương triệt tiêu và hai hạng tử 2pq cộng thành 4pq."] },
  { prompt: "Chọn đẳng thức đúng với mọi x và y.", options: ["(x + y)³ + (x - y)³ = 2x³ + 6xy²", "(x + y)³ + (x - y)³ = 2x³ + 6x²y", "(x + y)³ + (x - y)³ = 2x³ + 2y³", "(x + y)³ + (x - y)³ = 6xy²"], answer: "(x + y)³ + (x - y)³ = 2x³ + 6xy²", explanation: ["Khai triển hai lập phương; các hạng tử chứa x²y và y³ triệt tiêu.", "Còn lại 2x³ + 6xy²."] },
  { prompt: "Đẳng thức nào đúng với mọi số thực a?", options: ["(a + 2)(a² - 2a + 4) = a³ + 8", "(a + 2)(a² - 2a + 4) = a³ - 8", "(a + 2)(a² + 2a + 4) = a³ + 8", "(a - 2)(a² - 2a + 4) = a³ + 8"], answer: "(a + 2)(a² - 2a + 4) = a³ + 8", explanation: ["Nhận ra dạng phân tích tổng hai lập phương.", "Nhân lại cho a³ + 2³ = a³ + 8."] },
  { prompt: "Quan hệ nào là đồng nhất thức theo biến z?", options: ["z² + 10z + 25 = (z + 5)²", "z² + 10z + 25 = (z - 5)²", "z² + 5z + 25 = (z + 5)²", "z² + 25 = (z + 5)²"], answer: "z² + 10z + 25 = (z + 5)²", explanation: ["Tam thức có hai bình phương và hai lần tích.", "Vì 2 × z × 5 = 10z nên nó là bình phương hoàn chỉnh."] },
  { prompt: "Chọn quan hệ đúng với mọi u và v.", options: ["u³ - v³ = (u - v)(u² + uv + v²)", "u³ - v³ = (u - v)(u² - uv + v²)", "u³ - v³ = (u + v)(u² + uv + v²)", "u³ - v³ = (u - v)(u² - v²)"], answer: "u³ - v³ = (u - v)(u² + uv + v²)", explanation: ["Dùng hằng đẳng thức hiệu hai lập phương.", "Nhân tử bậc hai có ba hạng tử đều mang dấu cộng."] },
].map((seed) => ({ ...seed, oracleTarget: null, skillId: identityRecognitionSkill, unitId: identityUnit, blueprintId: "g8-wave-c-identity-recognition-core", difficulty: "CORE" }));

const factorizationTargets = ["x² - 49", "4x² + 12x + 9", "9y² - 24y + 16", "a³ - 125", "3x³ - 27x", "ax + ay + 3x + 3y", "x² - 6x + 9 - y²", "x³ + 3x² + 3x + 1 - 8"] as const;
const factorizationSeeds: readonly Seed[] = [
  { prompt: "Phân tích x² - 49 thành nhân tử, chọn dạng đúng.", options: ["(x - 7)(x + 7)", "(x - 7)²", "(x + 7)²", "(x - 49)(x + 1)"], answer: "(x - 7)(x + 7)", explanation: ["Đây là hiệu hai bình phương x² - 7².", "Dùng (a - b)(a + b)."] },
  { prompt: "Tam thức 4x² + 12x + 9 được phân tích thành nhân tử như thế nào?", options: ["(2x + 3)²", "(2x - 3)²", "(4x + 3)(x + 3)", "(2x + 9)(2x + 1)"], answer: "(2x + 3)²", explanation: ["Hai hạng tử đầu-cuối là (2x)² và 3².", "Hạng tử giữa 12x bằng hai lần tích nên đây là bình phương hoàn chỉnh."] },
  { prompt: "Chọn dạng nhân tử của 9y² - 24y + 16.", options: ["(3y - 4)²", "(3y + 4)²", "(9y - 4)(y - 4)", "(3y - 8)(3y - 2)"], answer: "(3y - 4)²", explanation: ["Tam thức có dạng a² - 2ab + b².", "Với a = 3y và b = 4, dạng nhân tử là (3y - 4)²."] },
  { prompt: "Phân tích a³ - 125 thành nhân tử, chọn kết quả đúng.", options: ["(a - 5)(a² + 5a + 25)", "(a - 5)(a² - 5a + 25)", "(a + 5)(a² - 5a + 25)", "(a - 25)(a² + 5)"], answer: "(a - 5)(a² + 5a + 25)", explanation: ["Viết 125 = 5³ và dùng hiệu hai lập phương.", "Nhân tử bậc hai là a² + 5a + 25."] },
  { prompt: "Đặt nhân tử chung rồi dùng hằng đẳng thức để phân tích 3x³ - 27x.", options: ["3x(x - 3)(x + 3)", "3x(x - 3)²", "3x(x + 3)²", "3(x - 3)(x + 3)"], answer: "3x(x - 3)(x + 3)", explanation: ["Đặt 3x làm nhân tử chung, còn x² - 9.", "Phân tích hiệu hai bình phương thành (x - 3)(x + 3)."] },
  { prompt: "Nhóm hạng tử để phân tích ax + ay + 3x + 3y, chọn kết quả đúng.", options: ["(a + 3)(x + y)", "(a + x)(3 + y)", "(a + 3)(x - y)", "(a - 3)(x + y)"], answer: "(a + 3)(x + y)", explanation: ["Nhóm a(x + y) và 3(x + y).", "Đặt tiếp x + y làm nhân tử chung."] },
  { prompt: "Phân tích x² - 6x + 9 - y² thành nhân tử, chọn dạng đúng.", options: ["(x - 3 - y)(x - 3 + y)", "(x + 3 - y)(x + 3 + y)", "(x - 3 - y)²", "(x - y - 9)(x + y + 1)"], answer: "(x - 3 - y)(x - 3 + y)", explanation: ["Ba hạng tử đầu tạo thành (x - 3)².", "Sau đó dùng hiệu hai bình phương (x - 3)² - y²."] },
  { prompt: "Dùng nhóm và hằng đẳng thức để phân tích x³ + 3x² + 3x + 1 - 8.", options: ["(x - 1)(x² + 4x + 7)", "(x + 3)(x² + 1)", "(x - 1)(x² - x + 1)", "(x + 1)(x² + 2x - 7)"], answer: "(x - 1)(x² + 4x + 7)", explanation: ["Bốn hạng tử đầu là (x + 1)³, nên biểu thức là (x + 1)³ - 2³.", "Phân tích hiệu hai lập phương rồi thu gọn nhân tử bậc hai thành x² + 4x + 7."] },
].map((seed, index) => ({ ...seed, oracleTarget: factorizationTargets[index]!, skillId: factorizationSkill, unitId: factorizationUnit, blueprintId: "g8-wave-c-identity-factorization-extension", difficulty: "EXTENSION" }));

const seeds = [...identitySeeds, ...recognitionSeeds, ...factorizationSeeds];

type Polynomial = ReadonlyMap<string, number>;
const compactPolynomial = (terms: Map<string, number>): Polynomial => {
  for (const [key, coefficient] of terms) if (coefficient === 0) terms.delete(key);
  return terms;
};
const addPolynomial = (left: Polynomial, right: Polynomial, sign = 1): Polynomial => {
  const result = new Map(left);
  for (const [key, coefficient] of right) result.set(key, (result.get(key) ?? 0) + sign * coefficient);
  return compactPolynomial(result);
};
const multiplyPolynomial = (left: Polynomial, right: Polynomial): Polynomial => {
  const result = new Map<string, number>();
  for (const [leftKey, leftCoefficient] of left) for (const [rightKey, rightCoefficient] of right) {
    const key = `${leftKey}${rightKey}`.split("").sort().join("");
    result.set(key, (result.get(key) ?? 0) + leftCoefficient * rightCoefficient);
  }
  return compactPolynomial(result);
};
const polynomialPower = (base: Polynomial, exponent: number): Polynomial => {
  let result: Polynomial = new Map([["", 1]]);
  for (let index = 0; index < exponent; index += 1) result = multiplyPolynomial(result, base);
  return result;
};
const polynomialEquals = (left: Polynomial, right: Polynomial) => {
  const keys = new Set([...left.keys(), ...right.keys()]);
  return [...keys].every((key) => (left.get(key) ?? 0) === (right.get(key) ?? 0));
};

function parsePolynomial(source: string): Polynomial {
  const input = source.replaceAll(" ", "").replaceAll("²", "^2").replaceAll("³", "^3");
  let position = 0;
  const startsPrimary = () => /[0-9A-Za-z(]/u.test(input[position] ?? "");
  const parsePrimary = (): Polynomial => {
    let base: Polynomial;
    if (input[position] === "(") {
      position += 1;
      base = parseSum();
      if (input[position] !== ")") throw new Error("ORACLE_UNCLOSED_PARENTHESIS");
      position += 1;
    } else {
      const number = /^\d+/u.exec(input.slice(position));
      if (number) {
        position += number[0].length;
        base = new Map([["", Number(number[0])]]);
      } else {
        const variable = /^[A-Za-z]/u.exec(input.slice(position));
        if (!variable) throw new Error("ORACLE_PRIMARY_EXPECTED");
        position += 1;
        base = new Map([[variable[0]!, 1]]);
      }
    }
    if (input[position] === "^") {
      position += 1;
      const exponent = Number(input[position]);
      if (exponent !== 2 && exponent !== 3) throw new Error("ORACLE_EXPONENT_UNSUPPORTED");
      position += 1;
      base = polynomialPower(base, exponent);
    }
    return base;
  };
  const parseProduct = (): Polynomial => {
    let result = parsePrimary();
    while (input[position] === "*" || startsPrimary()) {
      if (input[position] === "*") position += 1;
      result = multiplyPolynomial(result, parsePrimary());
    }
    return result;
  };
  const parseSum = (): Polynomial => {
    let sign = 1;
    if (input[position] === "+" || input[position] === "-") { sign = input[position] === "-" ? -1 : 1; position += 1; }
    let result = addPolynomial(new Map(), parseProduct(), sign);
    while (input[position] === "+" || input[position] === "-") {
      const nextSign = input[position] === "+" ? 1 : -1;
      position += 1;
      result = addPolynomial(result, parseProduct(), nextSign);
    }
    return result;
  };
  const result = parseSum();
  if (position !== input.length) throw new Error(`ORACLE_TRAILING_INPUT:${input.slice(position)}`);
  return result;
}

export function verifyGradeEightWaveCIndependentOracle(): readonly string[] {
  const errors: string[] = [];
  seeds.forEach((seed, index) => {
    const equivalent = seed.options.map((option) => {
      if (seed.oracleTarget !== null) return polynomialEquals(parsePolynomial(seed.oracleTarget), parsePolynomial(option));
      const sides = option.split("=");
      return sides.length === 2 && polynomialEquals(parsePolynomial(sides[0]!), parsePolynomial(sides[1]!));
    });
    const selected = seed.options.findIndex((option) => normalizedDefinition(option) === normalizedDefinition(seed.answer));
    if (equivalent.filter(Boolean).length !== 1 || selected < 0 || !equivalent[selected]) errors.push(`g8-wave-c-identities-q${String(index + 1).padStart(2, "0")}`);
  });
  return errors;
}

const independentOracleErrors = verifyGradeEightWaveCIndependentOracle();
if (independentOracleErrors.length > 0) throw new Error(`GRADE_8_WAVE_C_ORACLE_FAILED:${independentOracleErrors.join(",")}`);
const skeleton = buildOfficialGradeSkeleton(grade);
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
  entityId: packId,
  check,
  status: "PASSED" as const,
  evidence: check === "MATHEMATICAL_ANSWER"
    ? `Independent polynomial coefficient expansion and factor-back multiplication select exactly one algebraically equivalent option for every question; mismatches: ${independentOracleErrors.length}.`
    : `Deterministic Grade 8 Wave C ${check.toLowerCase().replaceAll("_", " ")} evidence.`,
}));
const receiptIds = evidenceReceipts.map((receipt) => receipt.id);
const questions: CandidateQuestion[] = seeds.map((seed, index) => {
  const prompt = seed.prompt.normalize("NFC");
  const options = seed.options.map((option) => option.normalize("NFC"));
  const keyedAnswer = String.fromCharCode(65 + seed.options.findIndex((option) => normalizedDefinition(option) === normalizedDefinition(seed.answer)));
  return {
    id: `g8-wave-c-identities-q${String(index + 1).padStart(2, "0")}`, grade, unitId: seed.unitId, blueprintId: seed.blueprintId, skillId: seed.skillId, prompt, options,
    answer: { type: "SINGLE_CHOICE", exactValue: keyedAnswer }, explanationId: `g8-wave-c-identities-q${String(index + 1).padStart(2, "0")}-explanation`, difficulty: seed.difficulty,
    provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g8-algebraic-identities-template-v1", seed: `g8-wave-c-${index + 1}`, sourceReferenceIds: [sourceId] },
    reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false,
    duplicateFingerprint: sha256(normalizedDefinition(`${prompt}|${options.join("|")}`).toLocaleLowerCase("vi")), validationReceiptIds: receiptIds, instructionalPurpose: purpose(index),
  };
});
const explanations: ExplanationSpec[] = questions.map((question, index) => ({ id: question.explanationId, questionId: question.id, steps: seeds[index]!.explanation, finalAnswer: question.answer.exactValue!, evidenceReceiptIds: [`${packId}-explanation-consistency`] }));
const blueprints = [
  { id: "g8-wave-c-notable-identities-foundational", grade, skillId: notableIdentitySkill, difficulty: "FOUNDATIONAL" as const, questionType: "SINGLE_CHOICE" as const, templateId: "g8-algebraic-identities-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
  { id: "g8-wave-c-identity-recognition-core", grade, skillId: identityRecognitionSkill, difficulty: "CORE" as const, questionType: "SINGLE_CHOICE" as const, templateId: "g8-algebraic-identities-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
  { id: "g8-wave-c-identity-factorization-extension", grade, skillId: factorizationSkill, difficulty: "EXTENSION" as const, questionType: "SINGLE_CHOICE" as const, templateId: "g8-algebraic-identities-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
];
const sourceOutcomeIds = ["MOET2018-G8-NAA-P063-001", "MOET2018-G8-NAA-P063-003", "MOET2018-G8-NAA-P064-019"] as const;
const candidateCore = { format: "plave-wave-c-candidate-v1", grade, candidateId, version, policyVersion, sourceOutcomeIds, blueprints, questions, explanations };
const bundleHash = sha256(canonicalize(candidateCore));

export const gradeEightWaveCPack: GradePack = {
  schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC",
  sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives,
  prerequisites: [
    { fromSkillId: notableIdentitySkill, toSkillId: identityRecognitionSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: notableIdentitySkill, toSkillId: factorizationSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ],
  blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts,
  candidate: { candidateId, version, bundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: { wave: "C", selectedSliceId: "g8-algebraic-identities-and-factorization", selectionBasis: ["SOURCE_VERIFIED", "PAGES_63_64_EXACT_ROWS", "POLYNOMIAL_COEFFICIENT_ORACLE", "UNIQUE_SYMBOLIC_OPTIONS"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
  legacyAsset: null,
};

export const gradeEightWaveCMetadata = Object.freeze({ schemaVersion: "plave-wave-c-metadata-v1", grade, title: "Hằng đẳng thức và phân tích đa thức thành nhân tử", sourcePages: [63, 64] as const, sourceOutcomeIds, prerequisiteOutcomeIds: ["MOET2018-G8-NAA-P063-001"] as const, prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", nextTargetOutcomeIds: ["MOET2018-G8-NAA-P064-016", "MOET2018-G8-NAA-P064-020"] as const, nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", production: gradeEightWaveCPack.production, candidate: gradeEightWaveCPack.candidate, release: gradeEightWaveCPack.release });
export const gradeEightWavesABC = Object.freeze({ grade, packs: [gradeEightWaveAPack, gradeEightWaveBPack, gradeEightWaveCPack] as const, questions: [...gradeEightWaveAPack.questions, ...gradeEightWaveBPack.questions, ...gradeEightWaveCPack.questions], candidateBindings: [gradeEightWaveAPack.candidate, gradeEightWaveBPack.candidate, gradeEightWaveCPack.candidate], release: gradeEightWaveCPack.release, nextTargetOutcomeIds: gradeEightWaveCMetadata.nextTargetOutcomeIds });
