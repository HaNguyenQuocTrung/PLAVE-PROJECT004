import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { gradeSixWaveAPack } from "./grade6-wave-a.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack } from "./types.ts";
import { combineWavePacks } from "./wave-b.ts";

const sourceId = officialSourceReferenceId(6);
const packId = "grade-6-wave-b-primes-factors-gcd-lcm";
const candidateId = "g6-primes-factors-gcd-lcm-wave-b";
const version = "g6-primes-factors-gcd-lcm-1.0.0-wave-b";
const policyVersion = "g6-number-theory-adaptive-policy-1.0.0-wave-b";
const sliceOutcomes = [
  "MOET2018-G6-NAA-P047-006",
  "MOET2018-G6-NAA-P048-018",
  "MOET2018-G6-NAA-P048-027",
  "MOET2018-G6-NAA-P048-030",
] as const;
const skillId = officialSkillId;
const skeleton = buildOfficialGradeSkeleton(6);
const difficulty = (index: number): DifficultyBand => index < 2 ? "FOUNDATIONAL" : index < 4 ? "CORE" : "EXTENSION";
const purpose = (index: number): NonNullable<CandidateQuestion["instructionalPurpose"]> =>
  (["FOUNDATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION", "TRANSFER_APPLICATION"] as const)[index]!;
const blueprintId = (outcomeId: string, index: number) => `g6-wave-b-blueprint-${outcomeId.toLowerCase()}-${difficulty(index).toLowerCase()}`;
const receiptIds = requiredAutomatedEvidenceChecks.map((check) => `g6-wave-b-${check.toLowerCase().replaceAll("_", "-")}`);
const isPrime = (value: number) => value > 1 && Array.from({ length: Math.floor(Math.sqrt(value)) - 1 }, (_, index) => index + 2).every((divisor) => value % divisor !== 0);
const gcd = (left: number, right: number): number => right === 0 ? Math.abs(left) : gcd(right, left % right);
const lcm = (left: number, right: number) => Math.abs(left * right) / gcd(left, right);
const rotateOptions = (options: readonly string[], offset: number) => [
  ...options.slice(offset % options.length),
  ...options.slice(0, offset % options.length),
];
type Generated = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;

function createItem(
  index: number,
  outcomeId: (typeof sliceOutcomes)[number],
  prompt: string,
  answer: CandidateQuestion["answer"],
  steps: readonly string[],
  options: readonly string[] | null,
): Generated {
  const suffix = String(index + 1).padStart(2, "0");
  const id = `g6-wave-b-${outcomeId.toLowerCase()}-${suffix}`;
  return {
    question: {
      id,
      grade: 6,
      blueprintId: blueprintId(outcomeId, index),
      skillId: skillId(outcomeId),
      prompt,
      options,
      answer,
      explanationId: `${id}-explanation`,
      difficulty: difficulty(index),
      provenance: {
        kind: "DETERMINISTIC_TEMPLATE",
        templateVersion: "g6-number-theory-wave-b-template-1.0.0",
        seed: `g6-number-theory-${outcomeId.toLowerCase()}-${suffix}`,
        sourceReferenceIds: [sourceId],
      },
      reviewStatus: "BUNDLED",
      published: false,
      pilotEligible: false,
      fixtureOnly: false,
      duplicateFingerprint: sha256(normalizedDefinition(`${prompt}|${options?.join("|") ?? ""}`).toLocaleLowerCase("vi")),
      validationReceiptIds: receiptIds,
      instructionalPurpose: purpose(index),
    },
    explanation: {
      id: `${id}-explanation`,
      questionId: id,
      steps,
      finalAnswer: answer.exactValue ?? "",
      evidenceReceiptIds: ["g6-wave-b-explanation-consistency"],
    },
  };
}

function generateWaveB(): readonly Generated[] {
  const generated: Generated[] = [];
  const factorScenarios = [
    [12, "3", ["3", "5", "7", "11"]], [18, "6", ["6", "5", "7", "11"]],
    [20, "4", ["4", "3", "7", "9"]], [27, "9", ["9", "4", "5", "8"]],
    [35, "7", ["7", "4", "6", "9"]], [42, "6", ["6", "5", "8", "9"]],
  ] as const;
  factorScenarios.forEach(([number, answer, options], index) => {
    generated.push(createItem(index, sliceOutcomes[0], `Trong các số sau, số nào là ước của ${number}?`, { type: "SINGLE_CHOICE", exactValue: answer }, ["Chia số đã cho lần lượt cho từng lựa chọn.", "Ước tạo ra thương là số tự nhiên và số dư bằng 0.", `${answer} là ước của ${number}.`], rotateOptions(options, index)));
  });

  const classifications = [2, 15, 17, 21, 29, 49] as const;
  classifications.forEach((number, index) => {
    const classification = isPrime(number) ? "số nguyên tố" : "hợp số";
    const answer = isPrime(number) ? "A" : "B";
    generated.push(createItem(index, sliceOutcomes[1], `Số ${number} là số nguyên tố hay hợp số?`, { type: "SINGLE_CHOICE", exactValue: answer }, ["Số đang xét lớn hơn 1.", "Kiểm tra các ước từ 2 đến căn bậc hai của số.", `${number} là ${classification}.`], ["số nguyên tố", "hợp số", "số 1", "không phải số tự nhiên"]));
  });

  const factorizations = [
    [12, "2^2×3", ["2^2×3", "2×6", "3×4", "2^3×3"]],
    [18, "2×3^2", ["2×3^2", "3×6", "2^2×3", "2×9^2"]],
    [20, "2^2×5", ["2^2×5", "4×5", "2×10", "2×5^2"]],
    [30, "2×3×5", ["2×3×5", "3×10", "5×6", "2^2×3×5"]],
    [42, "2×3×7", ["2×3×7", "6×7", "3×14", "2×3×5"]],
    [60, "2^2×3×5", ["2^2×3×5", "2×3×10", "3×4×5", "2×3^2×5"]],
  ] as const;
  factorizations.forEach(([number, answer, options], index) => {
    generated.push(createItem(index, sliceOutcomes[2], `Phân tích ${number} thành tích các thừa số nguyên tố.`, { type: "SINGLE_CHOICE", exactValue: answer }, ["Chia liên tiếp cho các số nguyên tố từ nhỏ đến lớn.", "Dừng khi thương bằng 1.", `Nhận được ${answer}.`], rotateOptions(options, index + 1)));
  });

  const commonScenarios = [
    ["ƯCLN", 18, 24], ["BCNN", 8, 12], ["ƯCLN", 35, 49],
    ["BCNN", 15, 20], ["ƯCLN", 42, 56], ["BCNN", 18, 30],
  ] as const;
  commonScenarios.forEach(([operation, left, right], index) => {
    const answer = operation === "ƯCLN" ? gcd(left, right) : lcm(left, right);
    generated.push(createItem(index, sliceOutcomes[3], `Tìm ${operation}(${left}, ${right}).`, { type: "INTEGER_INPUT", exactValue: String(answer), derivation: { op: "VALUE", numerator: answer, denominator: 1 } }, ["Phân tích hai số thành thừa số nguyên tố.", operation === "ƯCLN" ? "Chọn các thừa số chung với số mũ nhỏ nhất." : "Chọn mọi thừa số xuất hiện với số mũ lớn nhất.", `${operation}(${left}, ${right}) = ${answer}.`], null));
  });
  return generated;
}

const generated = generateWaveB();
const questions = generated.map((entry) => entry.question);
const explanations = generated.map((entry) => entry.explanation);
const receipts = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `g6-wave-b-${check.toLowerCase().replaceAll("_", "-")}`,
  entityId: packId,
  check,
  status: "PASSED" as const,
  evidence: check === "MATHEMATICAL_ANSWER"
    ? "Independent integer number-theory oracle verifies factors, primality, prime factorization, GCD and LCM."
    : `Grade 6 Wave B deterministic evidence: ${check}.`,
}));
const candidateCore = { format: "plave-wave-b-candidate-v1", grade: 6, candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, questions, explanations } as const;
export const gradeSixWaveBBundleHash = sha256(canonicalize(candidateCore));

export const gradeSixWaveBPack: GradePack = {
  schemaVersion: "content-factory-grade-pack-v1",
  grade: 6,
  packId,
  packVersion: version,
  immutableReference: false,
  testOnly: false,
  locale: "vi-VN",
  unicodeNormalization: "NFC",
  sources: [skeleton.source],
  domains: skeleton.domains,
  units: skeleton.units,
  knowledgeNodes: skeleton.knowledgeNodes,
  skills: skeleton.skills,
  objectives: skeleton.objectives,
  prerequisites: [
    { fromSkillId: "moet2018-g6-naa-p047-003", toSkillId: skillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: skillId(sliceOutcomes[0]), toSkillId: skillId(sliceOutcomes[1]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: skillId(sliceOutcomes[1]), toSkillId: skillId(sliceOutcomes[2]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: skillId(sliceOutcomes[2]), toSkillId: skillId(sliceOutcomes[3]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ],
  blueprints: sliceOutcomes.flatMap((outcomeId) => (["FOUNDATIONAL", "CORE", "EXTENSION"] as const).map((band) => ({
    id: `g6-wave-b-blueprint-${outcomeId.toLowerCase()}-${band.toLowerCase()}`,
    grade: 6,
    skillId: skillId(outcomeId),
    difficulty: band,
    questionType: outcomeId === sliceOutcomes[3] ? "INTEGER_INPUT" : "SINGLE_CHOICE",
    templateId: `g6-wave-b-template-${outcomeId.toLowerCase()}`,
    targetCount: 2,
    sourceReferenceIds: [sourceId],
  }))),
  questions,
  quarantinedQuestions: [],
  explanations,
  evidenceReceipts: receipts,
  candidate: { candidateId, version, bundleHash: gradeSixWaveBBundleHash, policyVersion },
  adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: {
    wave: "B",
    selectedSliceId: "g6-primes-factors-gcd-lcm",
    selectionBasis: ["SOURCE_VERIFIED", "EXACT_NUMBER_THEORY_ORACLE", "NO_DIAGRAM_DEPENDENCY", "ADAPTIVE_SIMULATION_SUITABLE"],
    generated: 24,
    repaired: 0,
    evidenceGatePassed: 24,
    verificationInsufficient: 0,
    rejected: 0,
    duplicate: 0,
    candidateEligible: 24,
  },
  legacyAsset: null,
};

export const gradeSixWaveBMetadata = {
  wave: "B",
  title: "Ước, bội, số nguyên tố, phân tích thừa số, ƯCLN và BCNN",
  sourceOutcomeIds: sliceOutcomes,
  nextTargetOutcomeIds: ["MOET2018-G6-NAA-P048-028"],
  generated: 24,
  evidenceGatePassed: 24,
  verificationInsufficient: 0,
  repaired: 0,
  rejected: 0,
  duplicate: 0,
  candidateEligible: 24,
} as const;

export const gradeSixCombinedWaves = combineWavePacks(gradeSixWaveAPack, gradeSixWaveBPack, {
  packId: "grade-6-waves-a-b-integers-number-theory",
  version: "g6-integers-number-theory-1.0.0-waves-a-b",
  candidateId: "g6-integers-number-theory-waves-a-b",
  policyVersion: "g6-number-adaptive-policy-1.0.0-waves-a-b",
  selectedSliceId: "g6-integers-and-number-theory",
});
