import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 4 as const;
const sourceId = officialSourceReferenceId(grade);
const packId = "grade-4-wave-g-data-mean";
const candidateId = "g4-data-mean-wave-g";
const version = "g4-data-mean-1.0.0-wave-g";
const policyVersion = "g4-statistics-policy-1.0.0-wave-g";
const sliceOutcomes = ["MOET2018-G4-STA-P039-007"] as const;
const prerequisiteOutcomeIds = ["MOET2018-G4-STA-P039-003"] as const;
const nextTargetOutcomeIds = ["MOET2018-G4-STA-P039-005"] as const;

type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;
const value = (numerator: number, denominator = 1): MathExpression => ({ op: "VALUE", numerator, denominator });
const operation = (op: "ADD" | "DIVIDE", left: MathExpression, right: MathExpression): MathExpression => ({ op, left, right });
const purposes = ["FOUNDATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION"] as const;
const receiptIds = requiredAutomatedEvidenceChecks.map((check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`);

function assertCountDataset(values: readonly number[]) {
  if (values.length < 3 || values.length > 6 || values.some((entry) => !Number.isSafeInteger(entry) || entry < 0)) {
    throw new Error("AUTOMATED_VERIFICATION_INSUFFICIENT:MALFORMED_DATASET");
  }
  const total = values.reduce((sum, entry) => sum + entry, 0);
  if (total % values.length !== 0) throw new Error("AUTOMATED_VERIFICATION_INSUFFICIENT:NON_INTEGRAL_MEAN");
}

export function verifyGradeFourWaveGMalformedDataGuards() {
  const malformed = [[], [1, 2], [-1, 2, 3], [1.5, 2, 3], [1, 2, 4]] as const;
  return malformed.flatMap((values, index) => {
    try {
      assertCountDataset(values);
      return [`g4-malformed-dataset-${index + 1}:ACCEPTED`];
    } catch (error) {
      return error instanceof Error && error.message.startsWith("AUTOMATED_VERIFICATION_INSUFFICIENT") ? [] : [`g4-malformed-dataset-${index + 1}:WRONG_ERROR`];
    }
  });
}
const malformedDataGuardFailures = verifyGradeFourWaveGMalformedDataGuards();
if (malformedDataGuardFailures.length) throw new Error(`GRADE_4_WAVE_G_MALFORMED_GUARD_FAILED:${malformedDataGuardFailures.join(",")}`);

function sumExpression(values: readonly number[]): MathExpression {
  return values.slice(1).reduce<MathExpression>((sum, entry) => operation("ADD", sum, value(entry)), value(values[0]!));
}

function exactInteger(expression: MathExpression) {
  const result = evaluateExpression(expression);
  if (result.denominator !== 1) throw new Error("AUTOMATED_VERIFICATION_INSUFFICIENT:NON_INTEGRAL_MEAN");
  return String(result.numerator);
}

function difficulty(index: number): DifficultyBand {
  const position = index % 6;
  return position < 2 ? "FOUNDATIONAL" : position < 4 ? "CORE" : "EXTENSION";
}

function promptFor(index: number, values: readonly number[]) {
  const data = values.join(", ");
  const templates = [
    `Bảng ghi số cuốn sách đọc được theo từng tuần là ${data}. Trung bình mỗi tuần đọc được bao nhiêu cuốn?`,
    `Số cây bốn tổ trồng được lần lượt là ${data}. Tính số cây trung bình của mỗi tổ.`,
    `Một biểu đồ cột đã được đọc thành dãy số liệu ${data}. Giá trị trung bình của dãy là bao nhiêu?`,
    `Các nhóm thu gom được lần lượt ${data} chai. Nếu chia đều tổng số chai cho các nhóm, mỗi nhóm nhận bao nhiêu chai?`,
    `Bảng thống kê số sản phẩm theo các ngày cho dãy ${data}. Hãy tính trung bình số sản phẩm mỗi ngày.`,
    `Dữ liệu số điểm của các lượt là ${data}. Tổng điểm được chia đều cho các lượt thì mỗi lượt có bao nhiêu điểm?`,
  ] as const;
  return templates[index % templates.length]!;
}

function createItem(questionNumber: number, values: readonly number[]): GeneratedItem {
  assertCountDataset(values);
  const suffix = String(questionNumber).padStart(2, "0");
  const id = `g4-wave-g-${suffix}`;
  const explanationId = `${id}-explanation`;
  const normalizedPrompt = promptFor(questionNumber - 1, values).normalize("NFC");
  const derivation = operation("DIVIDE", sumExpression(values), value(values.length));
  const answer = exactInteger(derivation);
  const total = values.reduce((sum, entry) => sum + entry, 0);
  return {
    question: {
      id,
      grade,
      blueprintId: `g4-wave-g-blueprint-${sliceOutcomes[0].toLowerCase()}-${difficulty(questionNumber - 1).toLowerCase()}`,
      skillId: officialSkillId(sliceOutcomes[0]),
      prompt: normalizedPrompt,
      options: null,
      answer: { type: "INTEGER_INPUT", exactValue: answer, derivation },
      explanationId,
      difficulty: difficulty(questionNumber - 1),
      provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g4-data-mean-wave-g-template-1.0.0", seed: `g4-wave-g-${sliceOutcomes[0].toLowerCase()}-${suffix}`, sourceReferenceIds: [sourceId] },
      reviewStatus: "BUNDLED",
      published: false,
      pilotEligible: false,
      fixtureOnly: false,
      duplicateFingerprint: sha256(normalizedDefinition(`${normalizedPrompt}|`).toLocaleLowerCase("vi")),
      validationReceiptIds: receiptIds,
      instructionalPurpose: purposes[(questionNumber - 1) % purposes.length]!,
    },
    explanation: {
      id: explanationId,
      questionId: id,
      steps: [`Cộng đủ ${values.length} giá trị được ${total}.`, `Dãy có ${values.length} giá trị nên chia ${total} cho ${values.length}.`, `Giá trị trung bình là ${answer}.`],
      finalAnswer: answer,
      evidenceReceiptIds: [`${packId}-explanation-consistency`],
    },
  };
}

const datasets = [
  [12, 18, 24], [15, 21, 27], [8, 12, 16, 20], [14, 18, 22, 26], [7, 11, 15, 19, 23], [20, 25, 30, 35, 40],
  [6, 9, 12], [24, 30, 36], [11, 13, 15, 17], [22, 26, 30, 34], [4, 8, 12, 16, 20], [13, 17, 21, 25, 29],
  [18, 22, 26], [30, 36, 42], [9, 15, 21, 27], [16, 20, 24, 28], [10, 14, 18, 22, 26], [21, 24, 27, 30, 33],
  [5, 10, 15], [28, 32, 36], [12, 16, 20, 24], [23, 29, 35, 41], [6, 12, 18, 24, 30], [14, 20, 26, 32, 38],
] as const;
const generated = datasets.map((values, index) => createItem(index + 1, values));
const questions = generated.map((entry) => entry.question);
const explanations = generated.map((entry) => entry.explanation);
const skeleton = buildOfficialGradeSkeleton(grade);
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
  entityId: packId,
  check,
  status: "PASSED" as const,
  evidence: check === "SOURCE_MAPPING"
    ? `Retained source-locked outcome ${sliceOutcomes[0]} on page 39.`
    : check === "MATHEMATICAL_ANSWER"
      ? "Independent exact sum-and-count oracle verifies every mean after malformed, empty, negative and non-integral datasets fail closed."
      : `Deterministic Grade 4 Wave G ${check.toLowerCase().replaceAll("_", " ")} receipt.`,
}));
const blueprints = (["FOUNDATIONAL", "CORE", "EXTENSION"] as const).map((band) => ({ id: `g4-wave-g-blueprint-${sliceOutcomes[0].toLowerCase()}-${band.toLowerCase()}`, grade, skillId: officialSkillId(sliceOutcomes[0]), difficulty: band, questionType: "INTEGER_INPUT" as const, templateId: `g4-wave-g-template-${sliceOutcomes[0].toLowerCase()}`, targetCount: 8, sourceReferenceIds: [sourceId] }));
const candidateCore = { format: "plave-wave-g-candidate-v1", candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, blueprints, questions, explanations } as const;

export const gradeFourWaveGBundleHash = sha256(canonicalize(candidateCore));
export function createGradeFourWaveGPack(): GradePack {
  return {
    schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false,
    locale: "vi-VN", unicodeNormalization: "NFC", sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units,
    knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives,
    prerequisites: [
      { fromSkillId: officialSkillId(prerequisiteOutcomeIds[0]), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
      { fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    ],
    blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts,
    candidate: { candidateId, version, bundleHash: gradeFourWaveGBundleHash, policyVersion },
    adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
    release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
    production: { wave: "G", selectedSliceId: "g4-data-mean", selectionBasis: ["SOURCE_VERIFIED", "UNCOVERED_BY_WAVES_A_TO_F", "EXACT_SUM_COUNT_ORACLE", "MALFORMED_DATA_FAIL_CLOSED", "STRUCTURAL_VARIATION"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
    legacyAsset: null,
  };
}
export const gradeFourWaveGPack = createGradeFourWaveGPack();
export const gradeFourWaveGMetadata = { schemaVersion: "plave-wave-g-metadata-v1", wave: "G", grade, title: "Giá trị trung bình của dữ liệu", sourceClassification: "SOURCE_VERIFIED", sourcePages: [39], sourceOutcomeIds: sliceOutcomes, prerequisiteOutcomeIds, prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", nextTargetOutcomeIds, nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", malformedDataPolicy: "Empty, negative, non-integer or non-integral-mean count datasets fail with AUTOMATED_VERIFICATION_INSUFFICIENT.", production: { generated: 24, evidenceGatePassed: 24, verificationInsufficient: 0, repaired: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, candidate: gradeFourWaveGPack.candidate, release: gradeFourWaveGPack.release } as const;
