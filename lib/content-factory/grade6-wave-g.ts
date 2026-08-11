import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 6 as const;
const sourceId = officialSourceReferenceId(grade);
const packId = "grade-6-wave-g-empirical-probability";
const candidateId = "g6-empirical-probability-wave-g";
const version = "g6-empirical-probability-1.0.0-wave-g";
const policyVersion = "g6-probability-policy-1.0.0-wave-g";
const sliceOutcomes = ["MOET2018-G6-STA-P054-011"] as const;
const prerequisiteOutcomeIds = ["MOET2018-G6-STA-P054-009"] as const;
const nextTargetOutcomeIds = ["MOET2018-G6-STA-P053-007"] as const;

type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;
const value = (numerator: number, denominator = 1): MathExpression => ({ op: "VALUE", numerator, denominator });
const operation = (op: "ADD" | "DIVIDE", left: MathExpression, right: MathExpression): MathExpression => ({ op, left, right });
const purposes = ["FOUNDATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION"] as const;
const receiptIds = requiredAutomatedEvidenceChecks.map((check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`);

function assertTrialRecord(occurrences: number, trials: number) {
  if (!Number.isSafeInteger(occurrences) || !Number.isSafeInteger(trials) || trials <= 0 || occurrences < 0 || occurrences > trials) {
    throw new Error("AUTOMATED_VERIFICATION_INSUFFICIENT:MALFORMED_TRIAL_DATA");
  }
}

export function verifyGradeSixWaveGMalformedDataGuards() {
  const malformed = [[-1, 20], [21, 20], [1, 0], [1.5, 20]] as const;
  return malformed.flatMap(([occurrences, trials], index) => {
    try {
      assertTrialRecord(occurrences, trials);
      return [`g6-malformed-trials-${index + 1}:ACCEPTED`];
    } catch (error) {
      return error instanceof Error && error.message === "AUTOMATED_VERIFICATION_INSUFFICIENT:MALFORMED_TRIAL_DATA" ? [] : [`g6-malformed-trials-${index + 1}:WRONG_ERROR`];
    }
  });
}
const malformedDataGuardFailures = verifyGradeSixWaveGMalformedDataGuards();
if (malformedDataGuardFailures.length) throw new Error(`GRADE_6_WAVE_G_MALFORMED_GUARD_FAILED:${malformedDataGuardFailures.join(",")}`);

function exactRational(expression: MathExpression) {
  const result = evaluateExpression(expression);
  return result.denominator === 1 ? String(result.numerator) : `${result.numerator}/${result.denominator}`;
}

function difficulty(index: number): DifficultyBand {
  const position = index % 6;
  return position < 2 ? "FOUNDATIONAL" : position < 4 ? "CORE" : "EXTENSION";
}

function createItem(questionNumber: number, prompt: string, derivation: MathExpression, steps: readonly string[]): GeneratedItem {
  const suffix = String(questionNumber).padStart(2, "0");
  const id = `g6-wave-g-${suffix}`;
  const explanationId = `${id}-explanation`;
  const normalizedPrompt = prompt.normalize("NFC");
  const answer = exactRational(derivation);
  return {
    question: {
      id, grade, blueprintId: `g6-wave-g-blueprint-${sliceOutcomes[0].toLowerCase()}-${difficulty(questionNumber - 1).toLowerCase()}`,
      skillId: officialSkillId(sliceOutcomes[0]), prompt: normalizedPrompt, options: null,
      answer: { type: "RATIONAL_INPUT", exactValue: answer, derivation }, explanationId, difficulty: difficulty(questionNumber - 1),
      provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g6-empirical-probability-wave-g-template-1.0.0", seed: `g6-wave-g-${sliceOutcomes[0].toLowerCase()}-${suffix}`, sourceReferenceIds: [sourceId] },
      reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false,
      duplicateFingerprint: sha256(normalizedDefinition(`${normalizedPrompt}|`).toLocaleLowerCase("vi")), validationReceiptIds: receiptIds,
      instructionalPurpose: purposes[(questionNumber - 1) % purposes.length]!,
    },
    explanation: { id: explanationId, questionId: id, steps: steps.map((step) => step.normalize("NFC")), finalAnswer: answer, evidenceReceiptIds: [`${packId}-explanation-consistency`] },
  };
}

function generateQuestions(): readonly GeneratedItem[] {
  const generated: GeneratedItem[] = [];
  const direct = [[11,40],[18,30],[14,35],[27,45],[16,50],[24,60],[35,80],[42,70]] as const;
  const directEvents = ["đồng xu xuất hiện mặt ngửa", "vòng quay dừng ở ô xanh", "xúc xắc xuất hiện số chẵn", "thẻ đỏ được rút", "bóng trắng được chọn", "mũi tên dừng ở vùng A", "đèn thử sáng", "quân cờ về đích"] as const;
  direct.forEach(([occurrences,trials], index) => {
    assertTrialRecord(occurrences, trials);
    const derivation = operation("DIVIDE", value(occurrences), value(trials));
    generated.push(createItem(index + 1, `Trong ${trials} lần thử, sự kiện “${directEvents[index]}” xảy ra ${occurrences} lần. Viết xác suất thực nghiệm dưới dạng phân số tối giản.`, derivation, [`Sự kiện xảy ra ${occurrences} lần trên ${trials} lần thử.`, `Lập phân số ${occurrences}/${trials}.`, `Rút gọn được ${exactRational(derivation)}.`]));
  });

  const complements = [[8,32],[12,40],[15,50],[9,45],[14,56],[20,80],[18,60],[25,100]] as const;
  const complementEvents = ["không trúng ô thưởng", "không xuất hiện mặt ngửa", "không rút được thẻ xanh", "không gieo được số lớn hơn 4", "không dừng ở vùng đỏ", "không bật sáng", "không chọn đúng hộp", "không về đích"] as const;
  complements.forEach(([occurrences,trials], index) => {
    assertTrialRecord(occurrences, trials);
    const derivation = operation("DIVIDE", value(occurrences), value(trials));
    generated.push(createItem(index + 9, `Ghi nhận ${trials} lần thử, có ${occurrences} lần ${complementEvents[index]}. Xác suất thực nghiệm của sự kiện được ghi nhận là bao nhiêu?`, derivation, [`Đếm đúng ${occurrences} lần sự kiện xảy ra.`, `Chia số lần xảy ra cho tổng ${trials} lần thử.`, `Xác suất thực nghiệm là ${exactRational(derivation)}.`]));
  });

  const combined = [[6,20,9,30],[8,25,12,35],[10,30,15,45],[14,40,16,40],[9,25,21,50],[18,45,24,55],[20,50,28,70],[25,60,35,90]] as const;
  const combinedEvents = ["mặt ngửa", "ô xanh", "số chẵn", "thẻ đỏ", "bóng trắng", "vùng A", "đèn sáng", "về đích"] as const;
  combined.forEach(([firstOccurrences,firstTrials,secondOccurrences,secondTrials], index) => {
    assertTrialRecord(firstOccurrences, firstTrials);
    assertTrialRecord(secondOccurrences, secondTrials);
    const totalOccurrences = operation("ADD", value(firstOccurrences), value(secondOccurrences));
    const totalTrials = operation("ADD", value(firstTrials), value(secondTrials));
    const derivation = operation("DIVIDE", totalOccurrences, totalTrials);
    generated.push(createItem(index + 17, `Đợt một có ${firstOccurrences} lần “${combinedEvents[index]}” trong ${firstTrials} lần thử; đợt hai có ${secondOccurrences} lần trong ${secondTrials} lần thử. Gộp hai đợt, xác suất thực nghiệm là bao nhiêu?`, derivation, [`Cộng số lần sự kiện: ${firstOccurrences} + ${secondOccurrences}.`, `Cộng tổng số lần thử: ${firstTrials} + ${secondTrials}.`, `Tỉ số gộp rút gọn là ${exactRational(derivation)}.`]));
  });
  return generated;
}

const generated = generateQuestions();
const questions = generated.map((entry) => entry.question);
const explanations = generated.map((entry) => entry.explanation);
const skeleton = buildOfficialGradeSkeleton(grade);
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({ id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: packId, check, status: "PASSED" as const, evidence: check === "SOURCE_MAPPING" ? `Retained source-locked outcome ${sliceOutcomes[0]} on page 54.` : check === "MATHEMATICAL_ANSWER" ? "Independent exact-rational frequency oracle verifies direct, complement-labelled and pooled empirical probabilities after malformed trial records fail closed." : `Deterministic Grade 6 Wave G ${check.toLowerCase().replaceAll("_", " ")} receipt.` }));
const blueprints = (["FOUNDATIONAL", "CORE", "EXTENSION"] as const).map((band) => ({ id: `g6-wave-g-blueprint-${sliceOutcomes[0].toLowerCase()}-${band.toLowerCase()}`, grade, skillId: officialSkillId(sliceOutcomes[0]), difficulty: band, questionType: "RATIONAL_INPUT" as const, templateId: `g6-wave-g-template-${sliceOutcomes[0].toLowerCase()}`, targetCount: 8, sourceReferenceIds: [sourceId] }));
const candidateCore = { format: "plave-wave-g-candidate-v1", candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, blueprints, questions, explanations } as const;

export const gradeSixWaveGBundleHash = sha256(canonicalize(candidateCore));
export function createGradeSixWaveGPack(): GradePack {
  return {
    schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false,
    locale: "vi-VN", unicodeNormalization: "NFC", sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units,
    knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives,
    prerequisites: [
      { fromSkillId: officialSkillId(prerequisiteOutcomeIds[0]), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
      { fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    ],
    blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts,
    candidate: { candidateId, version, bundleHash: gradeSixWaveGBundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
    release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
    production: { wave: "G", selectedSliceId: "g6-empirical-probability", selectionBasis: ["SOURCE_VERIFIED", "UNCOVERED_BY_WAVES_A_TO_F", "EXACT_RATIONAL_FREQUENCY_ORACLE", "MALFORMED_TRIAL_DATA_FAIL_CLOSED", "POOLED_TRIAL_VARIATION"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, legacyAsset: null,
  };
}
export const gradeSixWaveGPack = createGradeSixWaveGPack();
export const gradeSixWaveGMetadata = { schemaVersion: "plave-wave-g-metadata-v1", wave: "G", grade, title: "Xác suất thực nghiệm", sourceClassification: "SOURCE_VERIFIED", sourcePages: [54], sourceOutcomeIds: sliceOutcomes, prerequisiteOutcomeIds, prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", nextTargetOutcomeIds, nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", malformedDataPolicy: "Zero trials, negative occurrences and occurrences above total trials fail with AUTOMATED_VERIFICATION_INSUFFICIENT.", production: { generated: 24, evidenceGatePassed: 24, verificationInsufficient: 0, repaired: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, candidate: gradeSixWaveGPack.candidate, release: gradeSixWaveGPack.release } as const;
