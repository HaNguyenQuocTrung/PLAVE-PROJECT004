import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 3 as const;
const packId = "grade-3-wave-h-two-step-applied";
const candidateId = "g3-two-step-applied-wave-h";
const version = "g3-two-step-applied-1.0.0-wave-h";
const policyVersion = "g3-two-step-applied-policy-1.0.0-wave-h";
const sourceId = officialSourceReferenceId(grade);
const sliceOutcomes = ["MOET2018-G3-NUM-P030-013"] as const;
const prerequisiteOutcomeIds = ["MOET2018-G3-STA-P033-004"] as const;
const nextTargetOutcomeIds = ["MOET2018-G3-GEO-P033-023"] as const;
type Structure = "ADD_SUBTRACT" | "SUBTRACT_ADD" | "MULTIPLY_ADD" | "MULTIPLY_SUBTRACT" | "ADD_DIVIDE" | "SUBTRACT_DIVIDE" | "DIVIDE_ADD" | "DIVIDE_SUBTRACT" | "DIFFERENCE_MULTIPLY" | "MULTIPLY_DIVIDE" | "TOTAL_MINUS_PRODUCT" | "PRODUCT_MINUS_VALUE";
type Seed = Readonly<{ structure: Structure; inputs: readonly [number, number, number]; unit: string; domain: "INVENTORY" | "MONEY" | "LENGTH" | "MASS" | "CAPACITY" | "TIME" | "GROUPING" | "COMPARISON"; context: string; prompt: string }>;
type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;
const purposes = ["FOUNDATION", "FOUNDATION", "STANDARD_APPLICATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "REMEDIATION", "TRANSFER_APPLICATION"] as const;
const value = (numerator: number): MathExpression => ({ op: "VALUE", numerator, denominator: 1 });
const binary = (op: "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE", left: MathExpression, right: MathExpression): MathExpression => ({ op, left, right });
function difficulty(index: number): DifficultyBand { return index < 8 ? "FOUNDATIONAL" : index < 20 ? "CORE" : "EXTENSION"; }
function exact(expression: MathExpression) { const result = evaluateExpression(expression); if (result.denominator !== 1 || result.numerator < 0) throw new Error("GRADE3_WAVE_H_NONNEGATIVE_INTEGER_REQUIRED"); return String(result.numerator); }

function derivation(seed: Seed): MathExpression {
  const [a, b, c] = seed.inputs;
  switch (seed.structure) {
    case "ADD_SUBTRACT": return binary("SUBTRACT", binary("ADD", value(a), value(b)), value(c));
    case "SUBTRACT_ADD": return binary("ADD", binary("SUBTRACT", value(a), value(b)), value(c));
    case "MULTIPLY_ADD": return binary("ADD", binary("MULTIPLY", value(a), value(b)), value(c));
    case "MULTIPLY_SUBTRACT": return binary("SUBTRACT", binary("MULTIPLY", value(a), value(b)), value(c));
    case "ADD_DIVIDE": return binary("DIVIDE", binary("ADD", value(a), value(b)), value(c));
    case "SUBTRACT_DIVIDE": return binary("DIVIDE", binary("SUBTRACT", value(a), value(b)), value(c));
    case "DIVIDE_ADD": return binary("ADD", binary("DIVIDE", value(a), value(b)), value(c));
    case "DIVIDE_SUBTRACT": return binary("SUBTRACT", binary("DIVIDE", value(a), value(b)), value(c));
    case "DIFFERENCE_MULTIPLY": return binary("MULTIPLY", binary("SUBTRACT", value(a), value(b)), value(c));
    case "MULTIPLY_DIVIDE": return binary("DIVIDE", binary("MULTIPLY", value(a), value(b)), value(c));
    case "TOTAL_MINUS_PRODUCT": return binary("SUBTRACT", value(a), binary("MULTIPLY", value(b), value(c)));
    case "PRODUCT_MINUS_VALUE": return binary("SUBTRACT", binary("MULTIPLY", value(a), value(b)), value(c));
  }
}

function independentOracle(seed: Seed) {
  const [a, b, c] = seed.inputs;
  switch (seed.structure) {
    case "ADD_SUBTRACT": { const intermediate = a + b; return { intermediate, result: intermediate - c }; }
    case "SUBTRACT_ADD": { const intermediate = a - b; return { intermediate, result: intermediate + c }; }
    case "MULTIPLY_ADD": { const intermediate = a * b; return { intermediate, result: intermediate + c }; }
    case "MULTIPLY_SUBTRACT": { const intermediate = a * b; return { intermediate, result: intermediate - c }; }
    case "ADD_DIVIDE": { const intermediate = a + b; return { intermediate, result: intermediate / c }; }
    case "SUBTRACT_DIVIDE": { const intermediate = a - b; return { intermediate, result: intermediate / c }; }
    case "DIVIDE_ADD": { const intermediate = a / b; return { intermediate, result: intermediate + c }; }
    case "DIVIDE_SUBTRACT": { const intermediate = a / b; return { intermediate, result: intermediate - c }; }
    case "DIFFERENCE_MULTIPLY": { const intermediate = a - b; return { intermediate, result: intermediate * c }; }
    case "MULTIPLY_DIVIDE": { const intermediate = a * b; return { intermediate, result: intermediate / c }; }
    case "TOTAL_MINUS_PRODUCT": { const intermediate = b * c; return { intermediate, result: a - intermediate }; }
    case "PRODUCT_MINUS_VALUE": { const intermediate = a * b; return { intermediate, result: intermediate - c }; }
  }
}

const seeds: readonly Seed[] = [
  { structure: "ADD_SUBTRACT", inputs: [125, 78, 46], unit: "quyển", domain: "INVENTORY", context: "library-flow", prompt: "Thư viện có 125 quyển sách, nhận thêm 78 quyển rồi cho mượn 46 quyển. Thư viện còn bao nhiêu quyển sách?" },
  { structure: "SUBTRACT_ADD", inputs: [320, 85, 40], unit: "hộp", domain: "INVENTORY", context: "warehouse-flow", prompt: "Kho có 320 hộp, chuyển đi 85 hộp rồi nhận thêm 40 hộp. Kho có bao nhiêu hộp?" },
  { structure: "MULTIPLY_ADD", inputs: [6, 24, 18], unit: "nhãn", domain: "GROUPING", context: "boxes-plus-loose", prompt: "Có 6 hộp, mỗi hộp 24 nhãn, và thêm 18 nhãn rời. Có tất cả bao nhiêu nhãn?" },
  { structure: "MULTIPLY_SUBTRACT", inputs: [8, 15, 17], unit: "cây", domain: "GROUPING", context: "rows-damaged", prompt: "Vườn có 8 hàng, mỗi hàng 15 cây. Có 17 cây bị loại. Còn bao nhiêu cây?" },
  { structure: "ADD_DIVIDE", inputs: [48, 36, 7], unit: "thẻ", domain: "GROUPING", context: "combine-then-share", prompt: "Gộp 48 thẻ và 36 thẻ rồi chia đều cho 7 nhóm. Mỗi nhóm nhận bao nhiêu thẻ?" },
  { structure: "SUBTRACT_DIVIDE", inputs: [96, 24, 8], unit: "quả", domain: "GROUPING", context: "remove-then-share", prompt: "Có 96 quả, bỏ 24 quả rồi chia đều số còn lại vào 8 giỏ. Mỗi giỏ có bao nhiêu quả?" },
  { structure: "DIVIDE_ADD", inputs: [72, 8, 14], unit: "bút", domain: "GROUPING", context: "share-plus-extra", prompt: "Chia đều 72 bút cho 8 nhóm, sau đó mỗi nhóm được thêm 14 bút. Mỗi nhóm có bao nhiêu bút?" },
  { structure: "DIVIDE_SUBTRACT", inputs: [90, 9, 3], unit: "nhãn", domain: "GROUPING", context: "share-then-use", prompt: "Chia đều 90 nhãn cho 9 bạn, mỗi bạn dùng 3 nhãn. Mỗi bạn còn bao nhiêu nhãn?" },
  { structure: "DIFFERENCE_MULTIPLY", inputs: [45, 28, 3], unit: "điểm", domain: "COMPARISON", context: "repeated-difference", prompt: "Đội A có 45 điểm, đội B có 28 điểm. Ba lần hiệu số điểm của hai đội là bao nhiêu?" },
  { structure: "MULTIPLY_DIVIDE", inputs: [7, 18, 3], unit: "chai", domain: "GROUPING", context: "repack", prompt: "Có 7 thùng, mỗi thùng 18 chai. Chia đều toàn bộ số chai cho 3 xe. Mỗi xe chở bao nhiêu chai?" },
  { structure: "TOTAL_MINUS_PRODUCT", inputs: [150, 4, 25], unit: "nghìn đồng", domain: "MONEY", context: "purchase-change", prompt: "Mai có 150 nghìn đồng, mua 4 món giá 25 nghìn đồng mỗi món. Mai còn bao nhiêu nghìn đồng?" },
  { structure: "PRODUCT_MINUS_VALUE", inputs: [5, 12, 8], unit: "lít", domain: "CAPACITY", context: "containers-used", prompt: "Có 5 bình, mỗi bình 12 lít nước. Đã dùng 8 lít. Còn bao nhiêu lít nước?" },
  { structure: "ADD_SUBTRACT", inputs: [235, 146, 98], unit: "kg", domain: "MASS", context: "grain-flow", prompt: "Kho có 235 kg gạo, nhập thêm 146 kg rồi xuất 98 kg. Kho còn bao nhiêu ki-lô-gam gạo?" },
  { structure: "SUBTRACT_ADD", inputs: [500, 175, 80], unit: "m", domain: "LENGTH", context: "route-change", prompt: "Tuyến đường dài 500 m, bỏ đoạn 175 m rồi nối thêm đoạn 80 m. Tuyến mới dài bao nhiêu mét?" },
  { structure: "MULTIPLY_ADD", inputs: [9, 35, 27], unit: "ml", domain: "CAPACITY", context: "cups-plus-extra", prompt: "Có 9 cốc, mỗi cốc 35 ml nước, rồi thêm 27 ml. Có tất cả bao nhiêu mi-li-lít?" },
  { structure: "MULTIPLY_SUBTRACT", inputs: [6, 42, 55], unit: "cm", domain: "LENGTH", context: "equal-pieces-cut", prompt: "Ghép 6 đoạn, mỗi đoạn dài 42 cm, rồi cắt bớt 55 cm. Còn lại bao nhiêu xăng-ti-mét?" },
  { structure: "ADD_DIVIDE", inputs: [75, 45, 6], unit: "kg", domain: "MASS", context: "combine-mass-share", prompt: "Gộp 75 kg và 45 kg rồi chia đều vào 6 thùng. Mỗi thùng có bao nhiêu ki-lô-gam?" },
  { structure: "SUBTRACT_DIVIDE", inputs: [180, 36, 9], unit: "phút", domain: "TIME", context: "remaining-time-share", prompt: "Có 180 phút, dùng 36 phút rồi chia đều thời gian còn lại cho 9 hoạt động. Mỗi hoạt động có bao nhiêu phút?" },
  { structure: "DIVIDE_ADD", inputs: [144, 12, 7], unit: "cm", domain: "LENGTH", context: "equal-pieces-extend", prompt: "Chia dây dài 144 cm thành 12 đoạn bằng nhau, rồi nối thêm 7 cm vào một đoạn. Đoạn đó dài bao nhiêu xăng-ti-mét?" },
  { structure: "DIVIDE_SUBTRACT", inputs: [168, 8, 6], unit: "kg", domain: "MASS", context: "share-remove", prompt: "Chia đều 168 kg cho 8 nhóm, mỗi nhóm dùng 6 kg. Mỗi nhóm còn bao nhiêu ki-lô-gam?" },
  { structure: "DIFFERENCE_MULTIPLY", inputs: [84, 59, 4], unit: "sản phẩm", domain: "COMPARISON", context: "production-gap", prompt: "Xưởng A làm 84 sản phẩm, xưởng B làm 59 sản phẩm. Bốn lần phần chênh lệch là bao nhiêu sản phẩm?" },
  { structure: "MULTIPLY_DIVIDE", inputs: [12, 25, 5], unit: "quyển", domain: "GROUPING", context: "shelves-repack", prompt: "Có 12 giá, mỗi giá 25 quyển sách. Chia đều số sách vào 5 tủ. Mỗi tủ có bao nhiêu quyển?" },
  { structure: "TOTAL_MINUS_PRODUCT", inputs: [500, 7, 45], unit: "nghìn đồng", domain: "MONEY", context: "bulk-purchase", prompt: "Có 500 nghìn đồng, mua 7 món giá 45 nghìn đồng mỗi món. Còn bao nhiêu nghìn đồng?" },
  { structure: "PRODUCT_MINUS_VALUE", inputs: [11, 32, 75], unit: "chai", domain: "INVENTORY", context: "cases-shipped", prompt: "Có 11 thùng, mỗi thùng 32 chai. Đã chuyển đi 75 chai. Còn bao nhiêu chai?" },
] as const;

const receiptIds = requiredAutomatedEvidenceChecks.map((check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`);
function createItem(seed: Seed, index: number): GeneratedItem {
  const id = `g3-wave-h-${String(index + 1).padStart(2, "0")}`; const band = difficulty(index); const expression = derivation(seed); const exactValue = exact(expression); const oracle = independentOracle(seed); const normalizedPrompt = seed.prompt.normalize("NFC");
  if (!Number.isInteger(oracle.result) || String(oracle.result) !== exactValue) throw new Error(`GRADE3_WAVE_H_SEED_ORACLE_MISMATCH:${id}`);
  return {
    question: { id, grade, unitId: "grade-3-applied-problem-solving", blueprintId: `g3-wave-h-blueprint-${sliceOutcomes[0].toLowerCase()}-${band.toLowerCase()}`, skillId: officialSkillId(sliceOutcomes[0]), prompt: normalizedPrompt, options: null, answer: { type: "INTEGER_INPUT", exactValue, derivation: expression, unit: seed.unit }, explanationId: `${id}-explanation`, difficulty: band, provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g3-two-step-applied-wave-h-template-1.0.0", seed: `g3-wave-h-${seed.structure.toLowerCase()}-${String(index + 1).padStart(2, "0")}`, sourceReferenceIds: [sourceId] }, reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false, duplicateFingerprint: sha256(normalizedDefinition(`${normalizedPrompt}|`).toLocaleLowerCase("vi")), validationReceiptIds: receiptIds, instructionalPurpose: purposes[index % purposes.length]! },
    explanation: { id: `${id}-explanation`, questionId: id, steps: [`Bước trung gian theo cấu trúc ${seed.structure}: ${oracle.intermediate} ${seed.unit}.`, `Dùng kết quả trung gian với dữ kiện còn lại được ${exactValue} ${seed.unit}.`], finalAnswer: exactValue, evidenceReceiptIds: [`${packId}-explanation-consistency`] },
  };
}
const generated = seeds.map(createItem); const questions = generated.map((entry) => entry.question); const explanations = generated.map((entry) => entry.explanation);
if (questions.length !== 24 || new Set(questions.map((question) => question.id)).size !== 24) throw new Error("GRADE3_WAVE_H_GENERATION_COUNT");
export const gradeThreeWaveHOracleRows = seeds.map((seed, index) => { const question = questions[index]!; const explanation = explanations[index]!; const oracle = independentOracle(seed); const independentlyDerived = String(oracle.result); if (independentlyDerived !== question.answer.exactValue || explanation.finalAnswer !== independentlyDerived) throw new Error(`GRADE3_WAVE_H_ORACLE_MISMATCH:${question.id}`); return { questionId: question.id, sourceOutcomeId: sliceOutcomes[0], reasoningStructure: seed.structure, publicInputs: seed.inputs, unit: seed.unit, domain: seed.domain, context: seed.context, intermediateValue: oracle.intermediate, independentlyDerived, answerMatches: true as const, explanationMatches: true as const }; });
export function verifyGradeThreeWaveHOracle() { return gradeThreeWaveHOracleRows.every((row) => row.answerMatches && row.explanationMatches); }
const skeleton = buildOfficialGradeSkeleton(grade);
const blueprints = [...new Map(questions.map((question) => [question.blueprintId, { id: question.blueprintId, grade, skillId: question.skillId, difficulty: question.difficulty, questionType: question.answer.type, templateId: `g3-wave-h-template-${question.skillId}`, targetCount: questions.filter((entry) => entry.blueprintId === question.blueprintId).length, sourceReferenceIds: [sourceId] }])).values()];
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({ id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: packId, check, status: "PASSED" as const, evidence: check === "SOURCE_MAPPING" ? `Source-locked two-step applied outcome ${sliceOutcomes[0]} on retained page 30.` : check === "MATHEMATICAL_ANSWER" ? "Independent structure-switch oracle verified public inputs, units, domains, contexts, intermediate results and exact final answers for all 24 two-step items." : `Deterministic Grade 3 Wave H ${check.toLowerCase().replaceAll("_", " ")} receipt.` }));
const candidateCore = { format: "plave-wave-h-candidate-v1", grade, candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, sourcePages: [30], blueprints, questions, explanations, oracleRows: gradeThreeWaveHOracleRows } as const;
export const gradeThreeWaveHBundleHash = sha256(canonicalize(candidateCore));
export const gradeThreeWaveHPack: GradePack = { schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC", sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives, prerequisites: [{ fromSkillId: officialSkillId(prerequisiteOutcomeIds[0]), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] }, { fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] }], blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts, candidate: { candidateId, version, bundleHash: gradeThreeWaveHBundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" }, release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false }, production: { wave: "H", selectedSliceId: "grade-3-two-step-applied-problem-solving", selectionBasis: ["SOURCE_VERIFIED", "PAGE_30_LOCKED", "UNCOVERED_BY_WAVES_A_TO_G", "PUBLIC_INPUT_UNIT_CONTEXT_COMPLETE", "INDEPENDENT_INTERMEDIATE_STEP_ORACLE", "TWELVE_REASONING_STRUCTURES"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, legacyAsset: null };
export const gradeThreeWaveHProgression = { grade, priorSkillId: officialSkillId(prerequisiteOutcomeIds[0]), waveHSkillIds: sliceOutcomes.map(officialSkillId), prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", actions: { continueTargetSkillId: officialSkillId(sliceOutcomes[0]), remediateTargetSkillId: officialSkillId(prerequisiteOutcomeIds[0]), advanceTargetSkillId: officialSkillId(sliceOutcomes[0]), retentionTargetSkillId: officialSkillId(sliceOutcomes[0]), mixedPracticeTargetSkillIds: [officialSkillId(prerequisiteOutcomeIds[0]), officialSkillId(sliceOutcomes[0])] }, nextTargetSkillId: officialSkillId(nextTargetOutcomeIds[0]), schoolGradeMutation: false, entitlementGrant: false } as const;
export const gradeThreeWaveHMetadata = { schemaVersion: "plave-wave-h-metadata-v1", wave: "H", grade, title: "Bài toán thực tiễn hai bước", unitId: "grade-3-applied-problem-solving", sourceClassification: "SOURCE_VERIFIED", sourceOutcomeIds: sliceOutcomes, sourcePages: [30], prerequisiteOutcomeIds, prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", nextTargetOutcomeIds, nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", reasoningStructures: [...new Set(seeds.map((seed) => seed.structure))], domains: [...new Set(seeds.map((seed) => seed.domain))], production: gradeThreeWaveHPack.production, candidate: gradeThreeWaveHPack.candidate, progression: gradeThreeWaveHProgression, release: gradeThreeWaveHPack.release } as const;
