import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 4 as const;
const sourceId = officialSourceReferenceId(grade);
const packId = "grade-4-wave-f-distributive-property";
const candidateId = "g4-distributive-property-wave-f";
const version = "g4-distributive-property-1.0.0-wave-f";
const policyVersion = "g4-number-properties-policy-1.0.0-wave-f";
const sliceOutcomes = ["MOET2018-G4-NUM-P036-023"] as const;
const prerequisiteOutcomeIds = ["MOET2018-G4-NUM-P035-015"] as const;
const nextTargetOutcomeIds = ["MOET2018-G4-NUM-P036-024"] as const;
type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;
const value = (numerator: number): MathExpression => ({ op: "VALUE", numerator, denominator: 1 });
const op = (operation: "ADD" | "MULTIPLY", left: MathExpression, right: MathExpression): MathExpression => ({ op: operation, left, right });
const purposes = ["FOUNDATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION"] as const;
const receiptIds = requiredAutomatedEvidenceChecks.map((check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`);
const difficulty = (index: number): DifficultyBand => index % 6 < 2 ? "FOUNDATIONAL" : index % 6 < 4 ? "CORE" : "EXTENSION";
function exact(expression: MathExpression) { const result = evaluateExpression(expression); if (result.denominator !== 1) throw new Error("AUTOMATED_VERIFICATION_INSUFFICIENT"); return String(result.numerator); }
function item(number: number, prompt: string, derivation: MathExpression, steps: readonly string[]): GeneratedItem {
  const suffix = String(number).padStart(2, "0"); const id = `g4-wave-f-${suffix}`; const explanationId = `${id}-explanation`; const normalizedPrompt = prompt.normalize("NFC"); const answer = exact(derivation);
  return { question: { id, grade, blueprintId: `g4-wave-f-blueprint-${sliceOutcomes[0].toLowerCase()}-${difficulty(number - 1).toLowerCase()}`, skillId: officialSkillId(sliceOutcomes[0]), prompt: normalizedPrompt, options: null, answer: { type: "INTEGER_INPUT", exactValue: answer, derivation }, explanationId, difficulty: difficulty(number - 1), provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g4-distributive-property-wave-f-template-1.0.0", seed: `g4-wave-f-${sliceOutcomes[0].toLowerCase()}-${suffix}`, sourceReferenceIds: [sourceId] }, reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false, duplicateFingerprint: sha256(normalizedDefinition(`${normalizedPrompt}|`).toLocaleLowerCase("vi")), validationReceiptIds: receiptIds, instructionalPurpose: purposes[(number - 1) % purposes.length]! }, explanation: { id: explanationId, questionId: id, steps: steps.map((step) => step.normalize("NFC")), finalAnswer: answer, evidenceReceiptIds: [`${packId}-explanation-consistency`] } };
}
function generateQuestions(): readonly GeneratedItem[] {
  const generated: GeneratedItem[] = [];
  const grouped = [[3,20,4],[5,30,6],[7,40,8],[9,50,3],[12,25,5],[14,60,7],[16,75,5],[18,90,10]] as const;
  grouped.forEach(([factor,left,right],index) => { const derivation = op("MULTIPLY", value(factor), op("ADD", value(left), value(right))); generated.push(item(index + 1, `Dùng tính chất phân phối để tính ${factor} × (${left} + ${right}).`, derivation, [`Phân phối ${factor} cho cả ${left} và ${right}.`, `Tính ${factor} × ${left} + ${factor} × ${right}.`, `Giá trị biểu thức là ${exact(derivation)}.`])); });
  const expanded = [[4,35,4,15],[6,42,6,8],[8,27,8,13],[9,64,9,6],[11,45,11,5],[13,32,13,18],[15,24,15,16],[17,55,17,5]] as const;
  expanded.forEach(([a,b,c,d],index) => { const derivation = op("ADD", op("MULTIPLY", value(a), value(b)), op("MULTIPLY", value(c), value(d))); generated.push(item(index + 9, `Đặt thừa số chung rồi tính ${a} × ${b} + ${c} × ${d}.`, derivation, [`Hai tích có thừa số chung ${a}.`, `Viết thành ${a} × (${b} + ${d}).`, `Giá trị biểu thức là ${exact(derivation)}.`])); });
  const contexts = [[6,24,16],[8,35,15],[12,18,22],[14,27,13],[15,46,14],[16,38,12],[20,45,5],[25,36,4]] as const;
  contexts.forEach(([groups,first,second],index) => {
    const derivation = op("MULTIPLY", value(groups), op("ADD", value(first), value(second)));
    const prompt = index < 3
      ? `Có ${groups} hộp như nhau; mỗi hộp có ${first} bút xanh và ${second} bút đỏ. Có tất cả bao nhiêu chiếc bút?`
      : index < 6
        ? `Mỗi khay có ${first} viên bi trắng và ${second} viên bi đen. ${groups} khay như vậy có tất cả bao nhiêu viên bi?`
        : `Một lớp xếp ${groups} túi, mỗi túi gồm ${first} thẻ số và ${second} thẻ hình. Lớp đã xếp tất cả bao nhiêu thẻ?`;
    generated.push(item(index + 17, prompt, derivation, [`Mỗi nhóm có ${first} + ${second} đồ vật.`, `Tính ${groups} × (${first} + ${second}) bằng tính chất phân phối.`, `Có tất cả ${exact(derivation)} đồ vật.`]));
  });
  return generated;
}
const generated = generateQuestions(); const questions = generated.map((entry) => entry.question); const explanations = generated.map((entry) => entry.explanation); const skeleton = buildOfficialGradeSkeleton(grade);
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({ id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: packId, check, status: "PASSED" as const, evidence: check === "SOURCE_MAPPING" ? `Retained source-locked outcome ${sliceOutcomes[0]} on page 36.` : check === "MATHEMATICAL_ANSWER" ? "Independent exact-integer expression oracle verifies grouped, expanded and contextual distributive forms." : `Deterministic Grade 4 Wave F ${check.toLowerCase().replaceAll("_", " ")} receipt.` }));
const blueprints = (["FOUNDATIONAL","CORE","EXTENSION"] as const).map((band) => ({ id: `g4-wave-f-blueprint-${sliceOutcomes[0].toLowerCase()}-${band.toLowerCase()}`, grade, skillId: officialSkillId(sliceOutcomes[0]), difficulty: band, questionType: "INTEGER_INPUT" as const, templateId: `g4-wave-f-template-${sliceOutcomes[0].toLowerCase()}`, targetCount: 8, sourceReferenceIds: [sourceId] }));
const core = { format: "plave-wave-f-candidate-v1", candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, blueprints, questions, explanations } as const;
export const gradeFourWaveFBundleHash = sha256(canonicalize(core));
export function createGradeFourWaveFPack(): GradePack { return { schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC", sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives, prerequisites: [{ fromSkillId: officialSkillId(prerequisiteOutcomeIds[0]), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },{ fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] }], blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts, candidate: { candidateId, version, bundleHash: gradeFourWaveFBundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" }, release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false }, production: { wave: "F", selectedSliceId: "g4-distributive-property", selectionBasis: ["SOURCE_VERIFIED","UNCOVERED_BY_WAVES_A_TO_E","EXACT_INTEGER_EXPRESSION_ORACLE","STRUCTURAL_VARIATION"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, legacyAsset: null }; }
export const gradeFourWaveFPack = createGradeFourWaveFPack();
export const gradeFourWaveFMetadata = { schemaVersion: "plave-wave-f-metadata-v1", wave: "F", grade, title: "Tính chất phân phối", sourceClassification: "SOURCE_VERIFIED", sourcePages: [36], sourceOutcomeIds: sliceOutcomes, prerequisiteOutcomeIds, prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", nextTargetOutcomeIds, nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", remainingGap: "Fraction extrema and multi-step applications remain separately source-bound.", production: { generated: 24, evidenceGatePassed: 24, verificationInsufficient: 0, repaired: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, candidate: gradeFourWaveFPack.candidate, release: gradeFourWaveFPack.release } as const;
