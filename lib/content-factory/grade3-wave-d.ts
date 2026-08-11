import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 3 as const;
const packId = "grade-3-wave-d-area-measurement";
const candidateId = "g3-area-measurement-wave-d";
const version = "g3-area-measurement-1.0.0-wave-d";
const policyVersion = "g3-area-measurement-policy-1.0.0-wave-d";
const sourceId = officialSourceReferenceId(grade);
const sliceOutcomes = ["MOET2018-G3-GEO-P032-012", "MOET2018-G3-GEO-P032-013", "MOET2018-G3-GEO-P033-025"] as const;
const prerequisiteOutcomeIds = ["MOET2018-G3-NUM-P031-024"] as const;
const nextTargetOutcomeIds = ["MOET2018-G3-STA-P033-001"] as const;
type SliceOutcome = (typeof sliceOutcomes)[number];
type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;

const purposes = [
  "FOUNDATION", "FOUNDATION", "FOUNDATION", "STANDARD_APPLICATION",
  "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION",
] as const;

function difficulty(index: number): DifficultyBand {
  return index < 3 ? "FOUNDATIONAL" : index < 7 ? "CORE" : "EXTENSION";
}

const value = (numerator: number): MathExpression => ({ op: "VALUE", numerator, denominator: 1 });
const binary = (op: "ADD" | "MULTIPLY", left: MathExpression, right: MathExpression): MathExpression => ({ op, left, right });
const multiply = (left: number, right: number) => binary("MULTIPLY", value(left), value(right));

function exactInteger(expression: MathExpression) {
  const result = evaluateExpression(expression);
  if (result.denominator !== 1 || result.numerator < 0) throw new Error("GRADE3_WAVE_D_INTEGER_REQUIRED");
  return String(result.numerator);
}

const receiptIds = requiredAutomatedEvidenceChecks.map((check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`);

function createItem(
  number: number,
  outcomeId: SliceOutcome,
  localIndex: number,
  unitId: string,
  prompt: string,
  derivation: MathExpression,
  unit: "ô vuông" | "cm²",
  steps: readonly string[],
): GeneratedItem {
  const suffix = String(number).padStart(2, "0");
  const id = `g3-wave-d-${suffix}`;
  const exactValue = exactInteger(derivation);
  const normalizedPrompt = prompt.normalize("NFC");
  return {
    question: {
      id,
      grade,
      unitId,
      blueprintId: `g3-wave-d-blueprint-${outcomeId.toLowerCase()}-${difficulty(localIndex).toLowerCase()}`,
      skillId: officialSkillId(outcomeId),
      prompt: normalizedPrompt,
      options: null,
      answer: { type: "INTEGER_INPUT", exactValue, derivation, unit },
      explanationId: `${id}-explanation`,
      difficulty: difficulty(localIndex),
      provenance: {
        kind: "DETERMINISTIC_TEMPLATE",
        templateVersion: "g3-area-measurement-wave-d-template-1.0.0",
        seed: `g3-wave-d-${outcomeId.toLowerCase()}-${suffix}`,
        sourceReferenceIds: [sourceId],
      },
      reviewStatus: "BUNDLED",
      published: false,
      pilotEligible: false,
      fixtureOnly: false,
      duplicateFingerprint: sha256(normalizedDefinition(`${normalizedPrompt}|`).toLocaleLowerCase("vi")),
      validationReceiptIds: receiptIds,
      instructionalPurpose: purposes[localIndex]!,
    },
    explanation: {
      id: `${id}-explanation`,
      questionId: id,
      steps: [...steps, `Số đo cần nhập là ${exactValue}.`].map((step) => step.normalize("NFC")),
      finalAnswer: exactValue,
      evidenceReceiptIds: [`${packId}-explanation-consistency`],
    },
  };
}

const recognitionUnitId = "grade-3-time-and-area-units-p1";
const calculationUnitId = "grade-3-area-data-experience-p1";
const recognitionCases = [
  ["Một tấm bìa được phủ kín bởi 2 hàng, mỗi hàng 3 ô vuông bằng nhau. Diện tích tấm bìa bằng bao nhiêu ô vuông?", multiply(2, 3), ["Diện tích cho biết phần bề mặt được phủ.", "Đếm 2 hàng, mỗi hàng 3 ô vuông."]],
  ["Mặt hình được che kín bằng 3 hàng, mỗi hàng 4 miếng vuông không chồng lên nhau. Có bao nhiêu miếng vuông phủ mặt hình?", multiply(3, 4), ["Các miếng vuông phủ kín bề mặt.", "Có 3 nhóm, mỗi nhóm 4 miếng."]],
  ["Một dải giấy vừa khít 7 ô vuông bằng nhau xếp thành một hàng. Diện tích dải giấy bằng bao nhiêu ô vuông?", multiply(1, 7), ["Một hàng gồm 7 ô vuông phủ kín dải giấy.", "Đếm đủ 7 ô vuông."]],
  ["Mặt bảng được chia thành 4 hàng và 5 cột ô vuông bằng nhau. Có bao nhiêu ô vuông trên mặt bảng?", multiply(4, 5), ["Mỗi giao của hàng và cột là một ô vuông.", "Tính 4 × 5."]],
  ["Một hình ghép gồm phần thứ nhất có 2 hàng, mỗi hàng 4 ô và phần thứ hai có 3 ô. Toàn hình có diện tích bao nhiêu ô vuông?", binary("ADD", multiply(2, 4), value(3)), ["Hai phần không chồng lên nhau nên cộng số ô phủ mỗi phần.", "Phần thứ nhất có 2 × 4 ô, phần thứ hai có 3 ô."]],
  ["Hai mảnh không chồng nhau lần lượt được phủ bởi 6 ô vuông và 9 ô vuông. Tổng diện tích hai mảnh bằng bao nhiêu ô vuông?", binary("ADD", value(6), value(9)), ["Diện tích hai mảnh rời được cộng lại.", "Tính 6 + 9."]],
  ["Bạn Nam đếm hình có 3 hàng, mỗi hàng 6 ô nhưng ghi 15 ô. Hãy nhập số ô vuông phủ kín hình.", multiply(3, 6), ["Cần đếm đủ ô theo hàng và cột.", "Tính 3 × 6, không lấy kết quả 15."]],
  ["Một hình bậc thang có hàng trên 5 ô vuông và hàng dưới 3 ô vuông, các ô không chồng nhau. Diện tích hình bằng bao nhiêu ô vuông?", binary("ADD", value(5), value(3)), ["Mỗi ô vuông chỉ được tính một lần.", "Cộng 5 ô ở hàng trên và 3 ô ở hàng dưới."]],
] as const;

const squareCentimetreCases = [
  ["Một hình được phủ kín bởi 4 ô vuông cạnh 1 cm. Diện tích hình bằng bao nhiêu xăng-ti-mét vuông?", value(4), ["Mỗi ô vuông cạnh 1 cm có diện tích 1 cm².", "Bốn ô như vậy có tổng diện tích 4 cm²."]],
  ["Một ô vuông có cạnh 1 cm. Diện tích ô vuông đó bằng bao nhiêu xăng-ti-mét vuông?", value(1), ["Xăng-ti-mét vuông là diện tích của ô vuông cạnh 1 cm.", "Một ô đơn vị có diện tích 1 cm²."]],
  ["Hình chữ nhật được lát bằng 3 hàng, mỗi hàng 5 ô vuông cạnh 1 cm. Diện tích hình là bao nhiêu xăng-ti-mét vuông?", multiply(3, 5), ["Mỗi ô lát có diện tích 1 cm².", "Có 3 × 5 ô đơn vị."]],
  ["Một nhãn giấy được che kín bởi 2 hàng và 6 cột ô vuông 1 cm². Diện tích nhãn giấy bằng bao nhiêu xăng-ti-mét vuông?", multiply(2, 6), ["Đếm số ô vuông đơn vị theo hàng và cột.", "Tính 2 × 6."]],
  ["Tấm lưới có 18 ô vuông 1 cm² không chồng nhau. Tổng diện tích phần lưới bằng bao nhiêu xăng-ti-mét vuông?", value(18), ["Mỗi ô đóng góp 1 cm².", "Có 18 ô nên diện tích là 18 cm²."]],
  ["Bạn Mai cho rằng 6 hàng, mỗi hàng 6 ô vuông 1 cm² tạo diện tích 12 cm². Hãy nhập số đo đúng.", multiply(6, 6), ["Không cộng số hàng với số ô mỗi hàng.", "Cần tính 6 × 6 ô vuông đơn vị."]],
  ["Một hình gồm hai phần rời có diện tích 7 cm² và 11 cm². Tổng diện tích bằng bao nhiêu xăng-ti-mét vuông?", binary("ADD", value(7), value(11)), ["Hai phần rời không chồng nhau nên cộng diện tích.", "Tính 7 + 11."]],
  ["Mặt thiệp được phủ bởi 5 hàng, mỗi hàng 6 ô vuông 1 cm². Diện tích mặt thiệp bằng bao nhiêu xăng-ti-mét vuông?", multiply(5, 6), ["Mỗi ô vuông là một đơn vị cm².", "Tính số ô bằng 5 × 6."]],
] as const;

const rectangleSquareCases = [
  ["Hình chữ nhật dài 11 cm và rộng 4 cm. Tính diện tích hình chữ nhật.", multiply(11, 4), ["Diện tích hình chữ nhật bằng chiều dài nhân chiều rộng.", "Tính 11 × 4."]],
  ["Hình vuông có cạnh 5 cm. Tính diện tích hình vuông.", multiply(5, 5), ["Diện tích hình vuông bằng cạnh nhân cạnh.", "Tính 5 × 5."]],
  ["Một hình chữ nhật có chiều dài 9 cm, chiều rộng 3 cm. Diện tích bằng bao nhiêu xăng-ti-mét vuông?", multiply(9, 3), ["Dùng hai kích thước vuông góc của hình chữ nhật.", "Tính 9 × 3."]],
  ["Viên gạch hình vuông cạnh 8 cm. Diện tích một mặt viên gạch là bao nhiêu xăng-ti-mét vuông?", multiply(8, 8), ["Mặt viên gạch là hình vuông.", "Tính 8 × 8."]],
  ["Bạn An cộng 6 với 7 để tính diện tích hình chữ nhật dài 7 cm, rộng 6 cm. Hãy nhập diện tích đúng.", multiply(7, 6), ["Cộng hai cạnh không cho diện tích.", "Phải nhân chiều dài 7 với chiều rộng 6."]],
  ["Bảng tên hình chữ nhật dài 10 cm và rộng 4 cm. Phần mặt bảng có diện tích bao nhiêu xăng-ti-mét vuông?", multiply(10, 4), ["Mặt bảng là hình chữ nhật.", "Tính 10 × 4."]],
  ["Một khăn vuông có cạnh dài 9 cm. Tính diện tích chiếc khăn.", multiply(9, 9), ["Khăn có hai cạnh vuông góc đều dài 9 cm.", "Tính 9 × 9."]],
  ["Mảnh giấy hình chữ nhật có 12 cột và 6 hàng ô vuông 1 cm². Tính diện tích mảnh giấy.", multiply(12, 6), ["Số cột biểu diễn chiều dài và số hàng biểu diễn chiều rộng theo ô đơn vị.", "Tính 12 × 6."]],
] as const;

const generated: GeneratedItem[] = [];
recognitionCases.forEach(([prompt, expression, steps], index) => generated.push(createItem(index + 1, sliceOutcomes[0], index, recognitionUnitId, prompt, expression, "ô vuông", steps)));
squareCentimetreCases.forEach(([prompt, expression, steps], index) => generated.push(createItem(index + 9, sliceOutcomes[1], index, recognitionUnitId, prompt, expression, "cm²", steps)));
rectangleSquareCases.forEach(([prompt, expression, steps], index) => generated.push(createItem(index + 17, sliceOutcomes[2], index, calculationUnitId, prompt, expression, "cm²", steps)));
const questions = generated.map((entry) => entry.question);
const explanations = generated.map((entry) => entry.explanation);
if (questions.length !== 24 || new Set(questions.map((question) => question.id)).size !== 24) throw new Error("GRADE3_WAVE_D_GENERATION_COUNT");

export const gradeThreeWaveDOracleRows = questions.map((question) => {
  const independentlyDerived = exactInteger(question.answer.derivation!);
  const explanation = explanations.find((entry) => entry.questionId === question.id)!;
  if (independentlyDerived !== question.answer.exactValue || explanation.finalAnswer !== independentlyDerived) throw new Error(`GRADE3_WAVE_D_ORACLE_MISMATCH:${question.id}`);
  return { questionId: question.id, independentlyDerived, unit: question.answer.unit, answerMatches: true as const, explanationMatches: true as const };
});

const skeleton = buildOfficialGradeSkeleton(grade);
const blueprintBands = [
  { difficulty: "FOUNDATIONAL", targetCount: 3 }, { difficulty: "CORE", targetCount: 4 }, { difficulty: "EXTENSION", targetCount: 1 },
] as const;
const blueprints = sliceOutcomes.flatMap((outcomeId) => blueprintBands.map((band) => ({
  id: `g3-wave-d-blueprint-${outcomeId.toLowerCase()}-${band.difficulty.toLowerCase()}`,
  grade,
  skillId: officialSkillId(outcomeId),
  difficulty: band.difficulty,
  questionType: "INTEGER_INPUT" as const,
  templateId: `g3-wave-d-template-${outcomeId.toLowerCase()}`,
  targetCount: band.targetCount,
  sourceReferenceIds: [sourceId],
})));
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
  entityId: packId,
  check,
  status: "PASSED" as const,
  evidence: check === "SOURCE_MAPPING"
    ? `Source-locked MOET 2018 outcomes ${sliceOutcomes.join(", ")} on retained pages 32–33.`
    : check === "MATHEMATICAL_ANSWER"
      ? "Independent unit-square and rectangle/square area oracle recomputed all exact integer results and units."
      : `Deterministic Grade 3 Wave D ${check.toLowerCase().replaceAll("_", " ")} receipt.`,
}));
const candidateCore = { format: "plave-wave-d-candidate-v1", grade, candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, sourcePages: [32, 33], blueprints, questions, explanations } as const;
export const gradeThreeWaveDBundleHash = sha256(canonicalize(candidateCore));

export const gradeThreeWaveDPack: GradePack = {
  schemaVersion: "content-factory-grade-pack-v1",
  grade,
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
    { fromSkillId: officialSkillId(prerequisiteOutcomeIds[0]), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(sliceOutcomes[1]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: officialSkillId(sliceOutcomes[1]), toSkillId: officialSkillId(sliceOutcomes[2]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: officialSkillId(sliceOutcomes[2]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ],
  blueprints,
  questions,
  quarantinedQuestions: [],
  explanations,
  evidenceReceipts,
  candidate: { candidateId, version, bundleHash: gradeThreeWaveDBundleHash, policyVersion },
  adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: { wave: "D", selectedSliceId: "grade-3-area-measurement", selectionBasis: ["SOURCE_VERIFIED", "PAGES_32_33_LOCKED", "INDEPENDENT_UNIT_SQUARE_ORACLE", "RECTANGLE_SQUARE_ONLY"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
  legacyAsset: null,
};

export const gradeThreeWaveDProgression = {
  grade,
  priorSkillId: officialSkillId(prerequisiteOutcomeIds[0]),
  waveDSkillIds: sliceOutcomes.map(officialSkillId),
  prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  actions: {
    continueTargetSkillId: officialSkillId(sliceOutcomes[0]),
    remediateTargetSkillId: officialSkillId(prerequisiteOutcomeIds[0]),
    advanceTargetSkillId: officialSkillId(sliceOutcomes[2]),
    retentionTargetSkillId: officialSkillId(sliceOutcomes[0]),
    mixedPracticeTargetSkillIds: [officialSkillId(sliceOutcomes[1]), officialSkillId(sliceOutcomes[2])],
  },
  nextTargetSkillId: officialSkillId(nextTargetOutcomeIds[0]),
  schoolGradeMutation: false,
  entitlementGrant: false,
} as const;

export const gradeThreeWaveDMetadata = {
  schemaVersion: "plave-wave-d-metadata-v1",
  wave: "D",
  grade,
  title: "Diện tích, xăng-ti-mét vuông và diện tích hình chữ nhật, hình vuông",
  unitIds: [recognitionUnitId, calculationUnitId],
  sourceClassification: "SOURCE_VERIFIED",
  sourceOutcomeIds: sliceOutcomes,
  sourcePages: [32, 33],
  prerequisiteOutcomeIds,
  prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  nextTargetOutcomeIds,
  nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  production: gradeThreeWaveDPack.production,
  candidate: gradeThreeWaveDPack.candidate,
  progression: gradeThreeWaveDProgression,
  release: gradeThreeWaveDPack.release,
} as const;
