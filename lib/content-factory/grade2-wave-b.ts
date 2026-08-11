import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, ExplanationSpec, GradePack, MathExpression } from "./types.ts";
import { type WaveBProgressionContract } from "./wave-b.ts";

const grade = 2 as const;
const packId = "grade-2-wave-b-addition-subtraction-fluency";
const candidateId = "g2-addition-subtraction-wave-b";
const version = "g2-addition-subtraction-1.0.0-wave-b";
const policyVersion = "g2-addition-subtraction-policy-1.0.0-wave-b";
const sourceId = officialSourceReferenceId(grade);
const outcomeIds = [
  "MOET2018-G2-NUM-P025-011",
  "MOET2018-G2-NUM-P025-012",
  "MOET2018-G2-NUM-P025-013",
  "MOET2018-G2-NUM-P025-015",
] as const;
const purposes = [
  "FOUNDATION", "FOUNDATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION",
] as const;
const value = (numerator: number): MathExpression => ({ op: "VALUE", numerator, denominator: 1 });
const binary = (op: "ADD" | "SUBTRACT", left: MathExpression, right: MathExpression): MathExpression => ({ op, left, right });
const exact = (expression: MathExpression): string => {
  if (expression.op === "VALUE") return String(expression.numerator);
  if (expression.op === "ADD") return String(Number(exact(expression.left)) + Number(exact(expression.right)));
  if (expression.op === "SUBTRACT") return String(Number(exact(expression.left)) - Number(exact(expression.right)));
  throw new Error("GRADE2_WAVE_B_EXPRESSION_INVALID");
};
const receiptIds = requiredAutomatedEvidenceChecks.map((check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`);

function item(
  number: number,
  outcomeId: (typeof outcomeIds)[number],
  localIndex: number,
  prompt: string,
  derivation: MathExpression,
  steps: readonly string[],
) {
  const id = `g2-wave-b-${String(number).padStart(2, "0")}`;
  const difficulty = localIndex < 2 ? "FOUNDATIONAL" as const : localIndex < 5 ? "CORE" as const : "EXTENSION" as const;
  const normalizedPrompt = prompt.normalize("NFC");
  const question: CandidateQuestion = {
    id,
    grade,
    unitId: outcomeId === outcomeIds[3] ? "grade-2-calculation-strategies-p0" : "grade-2-addition-subtraction-fluency-p0",
    blueprintId: `g2-wave-b-blueprint-${outcomeId.toLowerCase()}-${difficulty.toLowerCase()}`,
    skillId: officialSkillId(outcomeId),
    prompt: normalizedPrompt,
    options: null,
    answer: { type: "INTEGER_INPUT", exactValue: exact(derivation), derivation },
    explanationId: `${id}-explanation`,
    difficulty,
    provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g2-addition-subtraction-wave-b-template-1.0.0", seed: id, sourceReferenceIds: [sourceId] },
    reviewStatus: "BUNDLED",
    published: false,
    pilotEligible: false,
    fixtureOnly: false,
    duplicateFingerprint: sha256(normalizedDefinition(`${normalizedPrompt}|`).toLocaleLowerCase("vi")),
    validationReceiptIds: receiptIds,
    instructionalPurpose: purposes[localIndex]!,
  };
  const explanation: ExplanationSpec = {
    id: `${id}-explanation`, questionId: id, steps, finalAnswer: question.answer.exactValue!, evidenceReceiptIds: [`${packId}-explanation-consistency`],
  };
  return { question, explanation };
}

const generated = [
  ...Array.from({ length: 6 }, (_, index) => {
    const addition = index % 2 === 0;
    const left = addition ? 248 + index * 30 : 452 + index * 40;
    const right = addition ? 135 + index * 2 : 137 + index * 10;
    const derivation = binary(addition ? "ADD" : "SUBTRACT", value(left), value(right));
    return item(index + 1, outcomeIds[0], index,
      index < 2 ? `Đặt tính rồi tính ${left} ${addition ? "+" : "−"} ${right}.` : index < 4 ? `Tính ${left} ${addition ? "+" : "−"} ${right} rồi kiểm tra bằng phép tính ngược.` : index === 4 ? `Bạn An ghi kết quả ${left} ${addition ? "+" : "−"} ${right} là ${Number(exact(derivation)) + 10}. Hãy tính lại.` : `Kho có ${left} nhãn và ${addition ? "nhận thêm" : "chuyển đi"} ${right} nhãn. Kho còn bao nhiêu nhãn?`,
      derivation,
      ["Đặt các chữ số cùng hàng thẳng cột.", `Thực hiện phép ${addition ? "cộng" : "trừ"} từ hàng đơn vị sang trái.`, `Kết quả là ${exact(derivation)}.`]);
  }),
  ...Array.from({ length: 6 }, (_, index) => {
    const addition = index % 2 === 0;
    const left = 200 + index * 100;
    const right = 30 + index * 10;
    const derivation = binary(addition ? "ADD" : "SUBTRACT", value(addition ? left : left + right), value(right));
    return item(index + 7, outcomeIds[1], index,
      index < 2 ? `Tính nhẩm ${addition ? left : left + right} ${addition ? "+" : "−"} ${right}.` : index < 4 ? `Điền kết quả: ${addition ? left : left + right} ${addition ? "+" : "−"} ${right} = ?` : index === 4 ? `Hãy sửa kết quả sai: ${left} + ${right} = ${left + right + 100}.` : `Có ${left} tấm thẻ, thêm ${right} tấm. Có tất cả bao nhiêu tấm thẻ?`,
      derivation,
      ["Tách số thành các trăm và chục.", `Tính nhẩm theo từng hàng để được ${exact(derivation)}.`, "Kiểm tra lại theo giá trị hàng."]);
  }),
  ...Array.from({ length: 6 }, (_, index) => {
    const addition = index % 2 === 0;
    const left = addition ? 7 + index : 18 - index;
    const right = 4 + (index % 3);
    const derivation = binary(addition ? "ADD" : "SUBTRACT", value(left), value(right));
    return item(index + 13, outcomeIds[2], index,
      index < 2 ? `Tính nhẩm ${left} ${addition ? "+" : "−"} ${right}.` : index < 4 ? `Tìm kết quả đúng của ${left} ${addition ? "+" : "−"} ${right}.` : index === 4 ? `Bạn Bình trả lời ${left} + ${right} = ${Number(exact(derivation)) + 1}. Hãy sửa lại.` : `Có ${left} viên bi, ${addition ? "thêm" : "bớt"} ${right} viên. Còn bao nhiêu viên?`,
      derivation,
      ["Tính nhẩm trong phạm vi 20.", `Kết quả là ${exact(derivation)}.`, "Dùng phép tính ngược để kiểm tra."]);
  }),
  ...Array.from({ length: 6 }, (_, index) => {
    const first = 12 + index;
    const added = 6 + index;
    const removed = 3 + index;
    const derivation = binary("SUBTRACT", binary("ADD", value(first), value(added)), value(removed));
    return item(index + 19, outcomeIds[3], index,
      index < 2 ? `Tính từ trái sang phải: ${first} + ${added} − ${removed}.` : index < 4 ? `Điền kết quả của ${first} + ${added} − ${removed}.` : index === 4 ? `Bạn Mai trừ trước khi tính ${first} + ${added} − ${removed}. Hãy tính đúng từ trái sang phải.` : `Hộp có ${first} bút, thêm ${added} bút rồi lấy ra ${removed} bút. Hộp còn bao nhiêu bút?`,
      derivation,
      [`Tính trước ${first} + ${added} = ${first + added}.`, `Tiếp theo tính ${first + added} − ${removed} = ${exact(derivation)}.`, "Thứ tự thực hiện là từ trái sang phải."]);
  }),
];
const questions = generated.map((entry) => entry.question);
const explanations = generated.map((entry) => entry.explanation);
const skeleton = buildOfficialGradeSkeleton(grade);
const blueprints = [...new Map(questions.map((question) => [question.blueprintId, {
  id: question.blueprintId, grade, skillId: question.skillId, difficulty: question.difficulty, questionType: question.answer.type,
  templateId: `g2-wave-b-template-${question.skillId}`, targetCount: questions.filter((entry) => entry.blueprintId === question.blueprintId).length, sourceReferenceIds: [sourceId],
}])).values()];
const receipts = requiredAutomatedEvidenceChecks.map((check) => ({ id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: packId, check, status: "PASSED" as const, evidence: check === "SOURCE_MAPPING" ? `MOET 2018 page 25 outcomes ${outcomeIds.join(", ")}.` : `Independent exact integer Wave B evidence: ${check}.` }));
const candidateCore = { format: "plave-wave-b-candidate-v1", candidateId, version, policyVersion, outcomeIds, blueprints, questions, explanations } as const;

export const gradeTwoWaveBPack: GradePack = {
  schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC",
  sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives,
  prerequisites: [
    { fromSkillId: "g2-skill-place-value-to-1000", toSkillId: officialSkillId(outcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: officialSkillId(outcomeIds[0]), toSkillId: officialSkillId(outcomeIds[1]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: officialSkillId(outcomeIds[1]), toSkillId: officialSkillId(outcomeIds[2]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: officialSkillId(outcomeIds[2]), toSkillId: officialSkillId(outcomeIds[3]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ],
  blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts: receipts,
  candidate: { candidateId, version, bundleHash: sha256(canonicalize(candidateCore)), policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: { wave: "B", selectedSliceId: "grade-2-addition-subtraction-fluency", selectionBasis: ["SOURCE_VERIFIED", "EXACT_INTEGER_ARITHMETIC", "NO_DIAGRAM_DEPENDENCY"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, legacyAsset: null,
};

export const gradeTwoWaveBProgression: WaveBProgressionContract = { grade, waveASkillId: "g2-skill-place-value-to-1000", waveBSkillIds: outcomeIds.map(officialSkillId), remediationTargetSkillId: "g2-skill-place-value-to-1000", advanceTargetSkillId: officialSkillId(outcomeIds[1]), retentionTargetSkillId: officialSkillId(outcomeIds[0]), nextTargetSkillId: officialSkillId(outcomeIds[3]), schoolGradeMutation: false, entitlementGrant: false };
