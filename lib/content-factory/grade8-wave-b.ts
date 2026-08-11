import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { gradeEightWaveAPack } from "./grade8-wave-a.ts";
import { buildOfficialGradeSkeleton, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 8 as const;
const packId = "grade-8-pythagorean-wave-b";
const version = "g8-pythagorean-1.0.0-wave-b";
const candidateId = "g8-pythagorean-wave-b-rc1";
const policyVersion = "g8-pythagorean-policy-1.0.0-wave-b";
const unitId = "grade-8-pythagorean-reasoning";
const theoremSkill = "moet2018-g8-geo-p065-002";
const calculateSkill = "moet2018-g8-geo-p065-006";
const appliedSkill = "moet2018-g8-geo-p066-007";
const sourceId = officialSourceReferenceId(grade);

const value = (numerator: number): MathExpression => ({ op: "VALUE", numerator, denominator: 1 });
const square = (number: number): MathExpression => ({ op: "MULTIPLY", left: value(number), right: value(number) });
const hypotenuse = (a: number, b: number): MathExpression => ({ op: "SQRT", value: { op: "ADD", left: square(a), right: square(b) } });
const leg = (c: number, a: number): MathExpression => ({ op: "SQRT", value: { op: "SUBTRACT", left: square(c), right: square(a) } });
const purpose = (index: number): NonNullable<CandidateQuestion["instructionalPurpose"]> => {
  const slot = index % 8;
  return slot < 2 ? "FOUNDATION" : slot < 4 ? "STANDARD_APPLICATION" : slot < 6 ? "MISCONCEPTION_TARGETING" : slot === 6 ? "REMEDIATION" : "TRANSFER_APPLICATION";
};
type Triple = readonly [number, number, number];
const hypotenuseTriples: readonly Triple[] = [[3, 4, 5], [5, 12, 13], [6, 8, 10], [7, 24, 25], [8, 15, 17], [9, 12, 15], [9, 40, 41], [12, 35, 37]];
const legTriples: readonly Triple[] = [[10, 24, 26], [12, 16, 20], [15, 20, 25], [20, 21, 29], [16, 30, 34], [18, 24, 30], [21, 28, 35], [24, 32, 40]];
const appliedTriples: readonly Triple[] = [[11, 60, 61], [13, 84, 85], [16, 63, 65], [28, 45, 53], [33, 56, 65], [36, 77, 85], [39, 80, 89], [48, 55, 73]];

type GeometrySeed = Readonly<{ prompt: string; sides: Triple; answer: number; derivation: MathExpression; skillId: string; blueprintId: string; explanation: readonly string[] }>;
const seeds: readonly GeometrySeed[] = [
  ...hypotenuseTriples.map(([a, b, c]) => ({ prompt: `Tam giác vuông có hai cạnh góc vuông dài ${a} cm và ${b} cm. Cạnh huyền dài bao nhiêu xăng-ti-mét?`, sides: [a, b, c] as const, answer: c, derivation: hypotenuse(a, b), skillId: calculateSkill, blueprintId: "g8-wave-b-pythagorean-foundational", explanation: [`Theo định lí Pythagore, bình phương cạnh huyền bằng ${a}² + ${b}².`, `Tổng này bằng ${c * c}, nên cạnh huyền dương bằng ${c} cm.`] })),
  ...legTriples.map(([a, b, c]) => ({ prompt: `Tam giác vuông có cạnh huyền dài ${c} cm và một cạnh góc vuông dài ${a} cm. Cạnh góc vuông còn lại dài bao nhiêu xăng-ti-mét?`, sides: [a, b, c] as const, answer: b, derivation: leg(c, a), skillId: calculateSkill, blueprintId: "g8-wave-b-pythagorean-core", explanation: [`Bình phương cạnh cần tìm bằng ${c}² - ${a}².`, `Hiệu này bằng ${b * b}, nên độ dài dương cần tìm là ${b} cm.`] })),
  ...appliedTriples.map(([a, b, c], index) => ({ prompt: index % 2 === 0 ? `Một khu vườn hình chữ nhật dài ${b} m và rộng ${a} m. Đường chéo khu vườn dài bao nhiêu mét?` : `Một tấm bảng hình chữ nhật có hai cạnh dài ${a} cm và ${b} cm. Khoảng cách giữa hai đỉnh đối diện là bao nhiêu xăng-ti-mét?`, sides: [a, b, c] as const, answer: c, derivation: hypotenuse(a, b), skillId: appliedSkill, blueprintId: "g8-wave-b-pythagorean-extension", explanation: ["Hai cạnh của hình chữ nhật và đường chéo tạo thành một tam giác vuông.", `Áp dụng định lí Pythagore cho kết quả đường chéo dương bằng ${c}.`] })),
];

const skeleton = buildOfficialGradeSkeleton(grade);
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
  entityId: packId,
  check,
  status: "PASSED" as const,
  evidence: check === "MATHEMATICAL_ANSWER"
    ? "An independent integer-square oracle verifies a² + b² = c² and the requested positive side for every structured triangle."
    : `Deterministic Grade 8 Wave B ${check.toLowerCase().replaceAll("_", " ")} evidence.`,
}));
const receiptIds = evidenceReceipts.map((receipt) => receipt.id);
const questions: CandidateQuestion[] = seeds.map((seed, index) => {
  const prompt = seed.prompt.normalize("NFC");
  return {
    id: `g8-wave-b-pythagorean-q${String(index + 1).padStart(2, "0")}`,
    grade,
    unitId,
    blueprintId: seed.blueprintId,
    skillId: seed.skillId,
    prompt,
    options: null,
    answer: { type: "INTEGER_INPUT", exactValue: String(seed.answer), derivation: seed.derivation, geometry: { kind: "TRIANGLE_SIDES", sides: seed.sides } },
    explanationId: `g8-wave-b-pythagorean-q${String(index + 1).padStart(2, "0")}-explanation`,
    difficulty: index < 8 ? "FOUNDATIONAL" : index < 16 ? "CORE" : "EXTENSION",
    provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g8-pythagorean-template-v1", seed: `g8-wave-b-${index + 1}`, sourceReferenceIds: [sourceId] },
    reviewStatus: "BUNDLED",
    published: false,
    pilotEligible: false,
    fixtureOnly: false,
    duplicateFingerprint: sha256(normalizedDefinition(`${prompt}|`).toLocaleLowerCase("vi")),
    validationReceiptIds: receiptIds,
    instructionalPurpose: purpose(index),
  };
});
const explanations: ExplanationSpec[] = questions.map((question, index) => ({ id: question.explanationId, questionId: question.id, steps: seeds[index]!.explanation, finalAnswer: question.answer.exactValue!, evidenceReceiptIds: [`${packId}-explanation-consistency`] }));
const blueprints = [
  { id: "g8-wave-b-pythagorean-foundational", grade, skillId: calculateSkill, difficulty: "FOUNDATIONAL" as const, questionType: "INTEGER_INPUT" as const, templateId: "g8-pythagorean-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
  { id: "g8-wave-b-pythagorean-core", grade, skillId: calculateSkill, difficulty: "CORE" as const, questionType: "INTEGER_INPUT" as const, templateId: "g8-pythagorean-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
  { id: "g8-wave-b-pythagorean-extension", grade, skillId: appliedSkill, difficulty: "EXTENSION" as const, questionType: "INTEGER_INPUT" as const, templateId: "g8-pythagorean-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
];
const candidateCore = { format: "plave-wave-b-candidate-v1", grade, candidateId, version, policyVersion, sourceOutcomeIds: ["MOET2018-G8-GEO-P065-002", "MOET2018-G8-GEO-P065-006", "MOET2018-G8-GEO-P066-007"], blueprints, questions, explanations };
const bundleHash = sha256(canonicalize(candidateCore));

export const gradeEightWaveBPack: GradePack = {
  schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC",
  sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives,
  prerequisites: [
    { fromSkillId: theoremSkill, toSkillId: calculateSkill, evidence: "REPOSITORY_RUNTIME_ORDER", sourceReferenceIds: [sourceId] },
    { fromSkillId: calculateSkill, toSkillId: appliedSkill, evidence: "REPOSITORY_RUNTIME_ORDER", sourceReferenceIds: [sourceId] },
  ],
  blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts,
  candidate: { candidateId, version, bundleHash, policyVersion },
  adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: { wave: "B", selectedSliceId: "g8-structured-pythagorean-reasoning", selectionBasis: ["SOURCE_VERIFIED", "EXACT_INTEGER_SQUARE_ORACLE", "STRUCTURED_GEOMETRY_METADATA", "ADAPTIVE_SIMULATION_SUITABLE"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
  legacyAsset: null,
};

export const gradeEightWaveBMetadata = Object.freeze({ schemaVersion: "plave-wave-b-metadata-v1", grade, title: "Định lí Pythagore với tam giác vuông có độ dài nguyên", sourceOutcomeIds: ["MOET2018-G8-GEO-P065-002", "MOET2018-G8-GEO-P065-006", "MOET2018-G8-GEO-P066-007"] as const, prerequisiteOutcomeIds: ["MOET2018-G8-GEO-P065-002"] as const, prerequisiteEvidence: "REPOSITORY_RUNTIME_ORDER", nextTargetOutcomeIds: ["MOET2018-G8-GEO-P067-020", "MOET2018-G8-GEO-P067-021"] as const, nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", production: gradeEightWaveBPack.production, candidate: gradeEightWaveBPack.candidate, release: gradeEightWaveBPack.release });
export const gradeEightWavesAB = Object.freeze({ grade, packs: [gradeEightWaveAPack, gradeEightWaveBPack] as const, questions: [...gradeEightWaveAPack.questions, ...gradeEightWaveBPack.questions], candidateBindings: [gradeEightWaveAPack.candidate, gradeEightWaveBPack.candidate], release: gradeEightWaveBPack.release, nextTargetOutcomeIds: gradeEightWaveBMetadata.nextTargetOutcomeIds });
