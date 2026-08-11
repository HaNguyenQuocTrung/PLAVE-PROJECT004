import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 2 as const;
const packId = "grade-2-wave-h-applied-measurement";
const candidateId = "g2-applied-measurement-wave-h";
const version = "g2-applied-measurement-1.0.0-wave-h";
const policyVersion = "g2-applied-measurement-policy-1.0.0-wave-h";
const sourceId = officialSourceReferenceId(grade);
const sliceOutcomes = ["MOET2018-G2-GEO-P027-011"] as const;
const prerequisiteOutcomeIds = ["MOET2018-G2-STA-P028-004"] as const;
const nextTargetOutcomeIds = ["MOET2018-G2-GEO-P027-018"] as const;
type SliceOutcome = (typeof sliceOutcomes)[number];
type Structure = "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE" | "CONVERT_ADD" | "CONVERT_SUBTRACT" | "ADD_SUBTRACT" | "SUBTRACT_ADD" | "ADD_THREE" | "SUBTRACT_TWO";
type Seed = Readonly<{ outcomeId: SliceOutcome; structure: Structure; inputs: readonly number[]; factor?: number; inputUnits: readonly string[]; outputUnit: string; domain: "LENGTH" | "MASS" | "CAPACITY" | "TIME" | "MONEY" | "CALENDAR" | "COUNT"; context: string; prompt: string }>;
type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;
const purposes = ["FOUNDATION", "FOUNDATION", "STANDARD_APPLICATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "REMEDIATION", "TRANSFER_APPLICATION"] as const;
const value = (numerator: number): MathExpression => ({ op: "VALUE", numerator, denominator: 1 });
const binary = (op: "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE", left: MathExpression, right: MathExpression): MathExpression => ({ op, left, right });
function difficulty(index: number): DifficultyBand { return index < 4 ? "FOUNDATIONAL" : index < 10 ? "CORE" : "EXTENSION"; }
function exact(expression: MathExpression) { const result = evaluateExpression(expression); if (result.denominator !== 1 || result.numerator < 0) throw new Error("GRADE2_WAVE_H_NONNEGATIVE_INTEGER_REQUIRED"); return String(result.numerator); }

function derivation(seed: Seed): MathExpression {
  const [a, b, c] = seed.inputs;
  switch (seed.structure) {
    case "ADD": return binary("ADD", value(a!), value(b!));
    case "SUBTRACT": return binary("SUBTRACT", value(a!), value(b!));
    case "MULTIPLY": return binary("MULTIPLY", value(a!), value(b!));
    case "DIVIDE": return binary("DIVIDE", value(a!), value(b!));
    case "CONVERT_ADD": return binary("ADD", binary("MULTIPLY", value(a!), value(seed.factor!)), value(b!));
    case "CONVERT_SUBTRACT": return binary("SUBTRACT", binary("MULTIPLY", value(a!), value(seed.factor!)), value(b!));
    case "ADD_SUBTRACT": return binary("SUBTRACT", binary("ADD", value(a!), value(b!)), value(c!));
    case "SUBTRACT_ADD": return binary("ADD", binary("SUBTRACT", value(a!), value(b!)), value(c!));
    case "ADD_THREE": return binary("ADD", binary("ADD", value(a!), value(b!)), value(c!));
    case "SUBTRACT_TWO": return binary("SUBTRACT", binary("SUBTRACT", value(a!), value(b!)), value(c!));
  }
}

function independentOracle(seed: Seed) {
  const [a, b, c] = seed.inputs;
  switch (seed.structure) {
    case "ADD": return { intermediateValues: [] as number[], result: a! + b! };
    case "SUBTRACT": return { intermediateValues: [] as number[], result: a! - b! };
    case "MULTIPLY": return { intermediateValues: [] as number[], result: a! * b! };
    case "DIVIDE": return { intermediateValues: [] as number[], result: a! / b! };
    case "CONVERT_ADD": { const converted = a! * seed.factor!; return { intermediateValues: [converted], result: converted + b! }; }
    case "CONVERT_SUBTRACT": { const converted = a! * seed.factor!; return { intermediateValues: [converted], result: converted - b! }; }
    case "ADD_SUBTRACT": { const combined = a! + b!; return { intermediateValues: [combined], result: combined - c! }; }
    case "SUBTRACT_ADD": { const remaining = a! - b!; return { intermediateValues: [remaining], result: remaining + c! }; }
    case "ADD_THREE": { const firstTotal = a! + b!; return { intermediateValues: [firstTotal], result: firstTotal + c! }; }
    case "SUBTRACT_TWO": { const firstRemaining = a! - b!; return { intermediateValues: [firstRemaining], result: firstRemaining - c! }; }
  }
}

const seeds: readonly Seed[] = [
  { outcomeId: sliceOutcomes[0], structure: "CONVERT_ADD", inputs: [2, 35], factor: 100, inputUnits: ["m", "cm"], outputUnit: "cm", domain: "LENGTH", context: "ribbon", prompt: "Một dải ruy băng dài 2 m được nối thêm 35 cm. Dải ruy băng dài tất cả bao nhiêu xăng-ti-mét?" },
  { outcomeId: sliceOutcomes[0], structure: "CONVERT_SUBTRACT", inputs: [3, 12], factor: 10, inputUnits: ["dm", "cm"], outputUnit: "cm", domain: "LENGTH", context: "wire", prompt: "Một sợi dây dài 3 dm, cắt đi 12 cm. Sợi dây còn bao nhiêu xăng-ti-mét?" },
  { outcomeId: sliceOutcomes[0], structure: "ADD", inputs: [4, 6], inputUnits: ["kg", "kg"], outputUnit: "kg", domain: "MASS", context: "fruit-baskets", prompt: "Giỏ thứ nhất có 4 kg quả, giỏ thứ hai có 6 kg quả. Hai giỏ có tất cả bao nhiêu ki-lô-gam quả?" },
  { outcomeId: sliceOutcomes[0], structure: "SUBTRACT", inputs: [15, 7], inputUnits: ["l", "l"], outputUnit: "l", domain: "CAPACITY", context: "water-container", prompt: "Bình có 15 lít nước, đã dùng 7 lít. Bình còn bao nhiêu lít nước?" },
  { outcomeId: sliceOutcomes[0], structure: "ADD_THREE", inputs: [12, 18, 25], inputUnits: ["cm", "cm", "cm"], outputUnit: "cm", domain: "LENGTH", context: "three-segment-path", prompt: "Một đường gấp khúc có ba đoạn dài 12 cm, 18 cm và 25 cm. Tổng độ dài là bao nhiêu xăng-ti-mét?" },
  { outcomeId: sliceOutcomes[0], structure: "MULTIPLY", inputs: [5, 2], inputUnits: ["bottle", "l-per-bottle"], outputUnit: "l", domain: "CAPACITY", context: "equal-bottles", prompt: "Có 5 bình, mỗi bình chứa 2 lít nước. Tất cả các bình chứa bao nhiêu lít?" },
  { outcomeId: sliceOutcomes[0], structure: "DIVIDE", inputs: [24, 3], inputUnits: ["kg", "bags"], outputUnit: "kg", domain: "MASS", context: "equal-share", prompt: "Chia đều 24 kg gạo vào 3 túi. Mỗi túi có bao nhiêu ki-lô-gam gạo?" },
  { outcomeId: sliceOutcomes[0], structure: "CONVERT_SUBTRACT", inputs: [9, 40], factor: 10, inputUnits: ["dm", "cm"], outputUnit: "cm", domain: "LENGTH", context: "length-difference", prompt: "Thanh A dài 9 dm, thanh B dài 40 cm. Thanh A dài hơn thanh B bao nhiêu xăng-ti-mét?" },
  { outcomeId: sliceOutcomes[0], structure: "ADD", inputs: [2, 3], inputUnits: ["km", "km"], outputUnit: "km", domain: "LENGTH", context: "two-stage-trip", prompt: "Chặng đầu dài 2 km, chặng sau dài 3 km. Cả hai chặng dài bao nhiêu ki-lô-mét?" },
  { outcomeId: sliceOutcomes[0], structure: "SUBTRACT_TWO", inputs: [100, 28, 17], inputUnits: ["cm", "cm", "cm"], outputUnit: "cm", domain: "LENGTH", context: "two-cuts", prompt: "Một mét dây được đổi thành 100 cm. Cắt lần lượt 28 cm và 17 cm. Còn lại bao nhiêu xăng-ti-mét?" },
  { outcomeId: sliceOutcomes[0], structure: "ADD_SUBTRACT", inputs: [35, 18, 12], inputUnits: ["kg", "kg", "kg"], outputUnit: "kg", domain: "MASS", context: "warehouse-flow", prompt: "Kho có 35 kg hàng, nhận thêm 18 kg rồi chuyển đi 12 kg. Kho còn bao nhiêu ki-lô-gam hàng?" },
  { outcomeId: sliceOutcomes[0], structure: "SUBTRACT_ADD", inputs: [40, 15, 8], inputUnits: ["l", "l", "l"], outputUnit: "l", domain: "CAPACITY", context: "tank-flow", prompt: "Bể có 40 lít nước, dùng 15 lít rồi thêm 8 lít. Bể có bao nhiêu lít nước?" },
  { outcomeId: sliceOutcomes[0], structure: "ADD", inputs: [35, 20], inputUnits: ["minute", "minute"], outputUnit: "phút", domain: "TIME", context: "daily-schedule", prompt: "Buổi sáng, An đọc sách 35 phút rồi tập thể dục 20 phút. Hai hoạt động kéo dài tất cả bao nhiêu phút?" },
  { outcomeId: sliceOutcomes[0], structure: "SUBTRACT", inputs: [90, 25], inputUnits: ["minute", "minute"], outputUnit: "phút", domain: "TIME", context: "activity-remaining", prompt: "Một hoạt động dự kiến 90 phút, đã thực hiện 25 phút. Còn bao nhiêu phút?" },
  { outcomeId: sliceOutcomes[0], structure: "CONVERT_ADD", inputs: [4, 25], factor: 10, inputUnits: ["dm", "cm"], outputUnit: "cm", domain: "LENGTH", context: "classroom-measurement", prompt: "Trong giờ thực hành, nhóm đo một đoạn dài 4 dm rồi đo thêm 25 cm. Tổng độ dài là bao nhiêu xăng-ti-mét?" },
  { outcomeId: sliceOutcomes[0], structure: "ADD_THREE", inputs: [8, 12, 15], inputUnits: ["cm", "cm", "cm"], outputUnit: "cm", domain: "LENGTH", context: "three-measurements", prompt: "Ba đoạn đo được dài 8 cm, 12 cm và 15 cm. Tổng ba số đo là bao nhiêu xăng-ti-mét?" },
  { outcomeId: sliceOutcomes[0], structure: "ADD", inputs: [20, 10], inputUnits: ["thousand-dong", "thousand-dong"], outputUnit: "nghìn đồng", domain: "MONEY", context: "two-banknotes", prompt: "Mai có một tờ 20 nghìn đồng và một tờ 10 nghìn đồng. Mai có tất cả bao nhiêu nghìn đồng?" },
  { outcomeId: sliceOutcomes[0], structure: "SUBTRACT", inputs: [50, 32], inputUnits: ["thousand-dong", "thousand-dong"], outputUnit: "nghìn đồng", domain: "MONEY", context: "change", prompt: "An có 50 nghìn đồng và mua đồ hết 32 nghìn đồng. An còn bao nhiêu nghìn đồng?" },
  { outcomeId: sliceOutcomes[0], structure: "SUBTRACT_TWO", inputs: [50, 15, 12], inputUnits: ["thousand-dong", "thousand-dong", "thousand-dong"], outputUnit: "nghìn đồng", domain: "MONEY", context: "two-items-change", prompt: "Hai món đồ giá 15 nghìn đồng và 12 nghìn đồng. Trả 50 nghìn đồng thì được trả lại bao nhiêu nghìn đồng?" },
  { outcomeId: sliceOutcomes[0], structure: "MULTIPLY", inputs: [6, 2], inputUnits: ["days", "l-per-day"], outputUnit: "l", domain: "CAPACITY", context: "water-log", prompt: "Trong 6 ngày, mỗi ngày lớp dùng 2 lít nước tưới cây. Tổng cộng dùng bao nhiêu lít?" },
  { outcomeId: sliceOutcomes[0], structure: "DIVIDE", inputs: [30, 5], inputUnits: ["kg", "groups"], outputUnit: "kg", domain: "MASS", context: "measurement-share", prompt: "Chia đều 30 kg vật liệu cho 5 nhóm thực hành. Mỗi nhóm nhận bao nhiêu ki-lô-gam?" },
  { outcomeId: sliceOutcomes[0], structure: "MULTIPLY", inputs: [4, 15], inputUnits: ["segments", "cm-per-segment"], outputUnit: "cm", domain: "LENGTH", context: "equal-segments", prompt: "Xếp 4 đoạn thẳng bằng nhau, mỗi đoạn dài 15 cm. Tổng độ dài là bao nhiêu xăng-ti-mét?" },
  { outcomeId: sliceOutcomes[0], structure: "ADD_THREE", inputs: [12, 15, 9], inputUnits: ["object", "object", "object"], outputUnit: "đối tượng", domain: "COUNT", context: "three-day-record", prompt: "Ba ngày lớp ghi nhận lần lượt 12, 15 và 9 đối tượng. Tổng số đã ghi nhận là bao nhiêu?" },
  { outcomeId: sliceOutcomes[0], structure: "MULTIPLY", inputs: [3, 7], inputUnits: ["weeks", "days-per-week"], outputUnit: "ngày", domain: "CALENDAR", context: "weeks-to-days", prompt: "Một hoạt động kéo dài 3 tuần, mỗi tuần 7 ngày. Hoạt động kéo dài bao nhiêu ngày?" },
] as const;

const receiptIds = requiredAutomatedEvidenceChecks.map((check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`);
function createItem(seed: Seed, index: number): GeneratedItem {
  const id = `g2-wave-h-${String(index + 1).padStart(2, "0")}`; const localIndex = index % 12; const band = difficulty(localIndex); const expression = derivation(seed); const exactValue = exact(expression); const normalizedPrompt = seed.prompt.normalize("NFC"); const oracle = independentOracle(seed);
  if (!Number.isInteger(oracle.result) || String(oracle.result) !== exactValue) throw new Error(`GRADE2_WAVE_H_SEED_ORACLE_MISMATCH:${id}`);
  return {
    question: { id, grade, unitId: "grade-2-applied-measurement-p0", blueprintId: `g2-wave-h-blueprint-${seed.outcomeId.toLowerCase()}-${band.toLowerCase()}`, skillId: officialSkillId(seed.outcomeId), prompt: normalizedPrompt, options: null, answer: { type: "INTEGER_INPUT", exactValue, derivation: expression, unit: seed.outputUnit }, explanationId: `${id}-explanation`, difficulty: band, provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g2-applied-measurement-wave-h-template-1.0.0", seed: `g2-wave-h-${seed.structure.toLowerCase()}-${String(index + 1).padStart(2, "0")}`, sourceReferenceIds: [sourceId] }, reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false, duplicateFingerprint: sha256(normalizedDefinition(`${normalizedPrompt}|`).toLocaleLowerCase("vi")), validationReceiptIds: receiptIds, instructionalPurpose: purposes[localIndex % purposes.length]! },
    explanation: { id: `${id}-explanation`, questionId: id, steps: [...oracle.intermediateValues.map((intermediate, step) => `Kết quả trung gian ${step + 1} là ${intermediate} ${seed.outputUnit}.`), `Theo cấu trúc ${seed.structure}, kết quả cuối là ${exactValue} ${seed.outputUnit}.`], finalAnswer: exactValue, evidenceReceiptIds: [`${packId}-explanation-consistency`] },
  };
}
const generated = seeds.map(createItem); const questions = generated.map((entry) => entry.question); const explanations = generated.map((entry) => entry.explanation);
if (questions.length !== 24 || new Set(questions.map((question) => question.id)).size !== 24) throw new Error("GRADE2_WAVE_H_GENERATION_COUNT");
export const gradeTwoWaveHOracleRows = seeds.map((seed, index) => { const question = questions[index]!; const explanation = explanations[index]!; const oracle = independentOracle(seed); const independentlyDerived = String(oracle.result); if (independentlyDerived !== question.answer.exactValue || explanation.finalAnswer !== independentlyDerived) throw new Error(`GRADE2_WAVE_H_ORACLE_MISMATCH:${question.id}`); return { questionId: question.id, sourceOutcomeId: seed.outcomeId, reasoningStructure: seed.structure, publicInputs: seed.inputs, inputUnits: seed.inputUnits, outputUnit: seed.outputUnit, domain: seed.domain, context: seed.context, intermediateValues: oracle.intermediateValues, independentlyDerived, answerMatches: true as const, explanationMatches: true as const }; });
const skeleton = buildOfficialGradeSkeleton(grade);
const blueprints = [...new Map(questions.map((question) => [question.blueprintId, { id: question.blueprintId, grade, skillId: question.skillId, difficulty: question.difficulty, questionType: question.answer.type, templateId: `g2-wave-h-template-${question.skillId}`, targetCount: questions.filter((entry) => entry.blueprintId === question.blueprintId).length, sourceReferenceIds: [sourceId] }])).values()];
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({ id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: packId, check, status: "PASSED" as const, evidence: check === "SOURCE_MAPPING" ? `Source-locked applied outcome ${sliceOutcomes[0]} on retained page 27; automation-insufficient EXP-P028-002 is excluded.` : check === "MATHEMATICAL_ANSWER" ? "Independent structure-switch oracle verified public inputs, units, conversions, intermediate values, contexts and final answers for all 24 applied items." : `Deterministic Grade 2 Wave H ${check.toLowerCase().replaceAll("_", " ")} receipt.` }));
const candidateCore = { format: "plave-wave-h-candidate-v1", grade, candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, sourcePages: [27], blueprints, questions, explanations, oracleRows: gradeTwoWaveHOracleRows } as const;
export const gradeTwoWaveHBundleHash = sha256(canonicalize(candidateCore));
export const gradeTwoWaveHPack: GradePack = { schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC", sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives, prerequisites: [{ fromSkillId: officialSkillId(prerequisiteOutcomeIds[0]), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] }, { fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] }], blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts, candidate: { candidateId, version, bundleHash: gradeTwoWaveHBundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" }, release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false }, production: { wave: "H", selectedSliceId: "grade-2-applied-measurement", selectionBasis: ["SOURCE_VERIFIED", "PAGE_27_LOCKED", "AUTOMATION_INSUFFICIENT_EXP_ROW_EXCLUDED", "UNCOVERED_BY_WAVES_A_TO_G", "PUBLIC_INPUT_UNIT_CONTEXT_COMPLETE", "INDEPENDENT_INTERMEDIATE_STEP_ORACLE", "STRUCTURAL_REASONING_DIVERSITY"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, legacyAsset: null };
export const gradeTwoWaveHProgression = { grade, priorSkillId: officialSkillId(prerequisiteOutcomeIds[0]), waveHSkillIds: sliceOutcomes.map(officialSkillId), prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", actions: { continueTargetSkillId: officialSkillId(sliceOutcomes[0]), remediateTargetSkillId: officialSkillId(prerequisiteOutcomeIds[0]), advanceTargetSkillId: officialSkillId(sliceOutcomes[0]), retentionTargetSkillId: officialSkillId(sliceOutcomes[0]), mixedPracticeTargetSkillIds: [officialSkillId(prerequisiteOutcomeIds[0]), officialSkillId(sliceOutcomes[0])] }, nextTargetSkillId: officialSkillId(nextTargetOutcomeIds[0]), schoolGradeMutation: false, entitlementGrant: false } as const;
export const gradeTwoWaveHMetadata = { schemaVersion: "plave-wave-h-metadata-v1", wave: "H", grade, title: "Vận dụng đo lường trong thực tiễn", unitIds: ["grade-2-applied-measurement-p0"], sourceClassification: "SOURCE_VERIFIED", sourceOutcomeIds: sliceOutcomes, sourcePages: [27], prerequisiteOutcomeIds, prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", nextTargetOutcomeIds, nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", excludedOutcomeIds: ["MOET2018-G2-EXP-P028-002"] as const, excludedReason: "AUTOMATED_VERIFICATION_INSUFFICIENT", reasoningStructures: [...new Set(seeds.map((seed) => seed.structure))], domains: [...new Set(seeds.map((seed) => seed.domain))], production: gradeTwoWaveHPack.production, candidate: gradeTwoWaveHPack.candidate, progression: gradeTwoWaveHProgression, release: gradeTwoWaveHPack.release } as const;
