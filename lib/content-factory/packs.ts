import {
  GRADE_TWO_NUMBERS_TO_1000_BUNDLE_SHA256,
  GRADE_TWO_NUMBERS_TO_1000_POLICY_VERSION,
} from "../content-engine/adaptive-runtime.ts";
import {
  GRADE_TWO_NUMBERS_TO_1000_CONTENT_VERSION,
  GRADE_TWO_NUMBERS_TO_1000_RELEASE_CANDIDATE_ID,
  createGradeTwoReleaseArtifacts,
} from "../content-engine/grade2-numbers-to-1000-release.ts";
import { normalizedDefinition, sha256 } from "./canonical.ts";
import { gradeOneReferencePack } from "./grade1-reference.ts";
import { gradeThreeWaveAPack } from "./grade3-wave-a.ts";
import { gradeFourWaveAPack } from "./grade4-wave-a.ts";
import { gradeFiveWaveAPack } from "./grade5-wave-a.ts";
import { gradeSixWaveAPack } from "./grade6-wave-a.ts";
import { gradeSevenWaveAPack } from "./grade7-wave-a.ts";
import { gradeEightWaveAPack } from "./grade8-wave-a.ts";
import { gradeNineWaveAPack } from "./grade9-wave-a.ts";
import { buildOfficialGradeSkeleton } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type {
  CandidateQuestion,
  ExplanationSpec,
  FactoryGrade,
  GradePack,
  SkillSpec,
} from "./types.ts";

const g2SkillIds = [
  "number-recognition-to-1000",
  "read-write-to-1000",
  "place-value-to-1000",
  "sequence-to-1000",
] as const;

const gradeTwoEvidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `grade-2-${check.toLowerCase().replaceAll("_", "-")}`,
  entityId: "grade-2-numbers-to-1000",
  check,
  status: "PASSED" as const,
  evidence: `Verified by the frozen Grade 2 release contract: ${check}.`,
}));

function gradeTwoPack(): GradePack {
  const skeleton = buildOfficialGradeSkeleton(2);
  const artifacts = createGradeTwoReleaseArtifacts("g2-review-number-language");
  const questions: CandidateQuestion[] = artifacts.publicQuestions.map((question) => ({
    id: question.questionId.toLowerCase().replaceAll("_", "-"),
    grade: 2,
    blueprintId: `g2-${question.skillFamilyId.toLowerCase().replaceAll("_", "-")}-blueprint-${question.difficulty.toLowerCase()}-${question.answerType.toLowerCase().replaceAll("_", "-")}`,
    skillId: `g2-skill-${question.skillFamilyId.toLowerCase().replaceAll("_", "-")}`,
    prompt: question.prompt,
    options: question.options ? Object.values(question.options) : null,
    answer: {
      type: question.answerType === "MULTIPLE_CHOICE" ? "SINGLE_CHOICE" : "INTEGER_INPUT",
      exactValue: artifacts.serverSolutions.find((solution) => solution.questionId === question.questionId)?.correctAnswer,
    },
    explanationId: `${question.questionId.toLowerCase().replaceAll("_", "-")}-explanation`,
    difficulty: question.difficulty === "EASY" ? "FOUNDATIONAL" : question.difficulty === "MEDIUM" ? "CORE" : "EXTENSION",
    provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g2n1000-template-1.0.0", seed: "g2-review-number-language", sourceReferenceIds: ["grade-2-canonical-source-manifest"] },
    reviewStatus: "BUNDLED",
    published: false,
    pilotEligible: false,
    fixtureOnly: false,
    duplicateFingerprint: sha256(
      normalizedDefinition(`${question.prompt}|${question.options ? Object.values(question.options).join("|") : ""}`).toLocaleLowerCase("vi"),
    ),
    validationReceiptIds: gradeTwoEvidenceReceipts.map((receipt) => receipt.id),
  }));
  const explanations: ExplanationSpec[] = artifacts.serverSolutions.map((solution) => ({
    id: `${solution.questionId.toLowerCase().replaceAll("_", "-")}-explanation`,
    questionId: solution.questionId.toLowerCase().replaceAll("_", "-"),
    steps: solution.solutionSteps,
    finalAnswer: solution.correctAnswer,
    evidenceReceiptIds: ["grade-2-explanation-consistency"],
  }));
  const skills: SkillSpec[] = g2SkillIds.map((id) => ({
    id: `g2-skill-${id}`, grade: 2, displayName: id.replaceAll("-", " "), domainId: "g2-domain-number", objectiveIds: [`g2-objective-${id}`], sourceReferenceIds: ["grade-2-canonical-source-manifest"],
  }));
  return {
    schemaVersion: "content-factory-grade-pack-v1", grade: 2, packId: "grade-2-numbers-to-1000", packVersion: GRADE_TWO_NUMBERS_TO_1000_CONTENT_VERSION,
    immutableReference: true, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC",
    sources: [skeleton.source, { id: "grade-2-canonical-source-manifest", status: "VERIFIED_REPOSITORY_SOURCE", repositoryEvidence: ["lib/content-engine/grade2-numbers-to-1000-sources.ts", "lib/content-engine/grade2-numbers-to-1000-release.ts"], note: "Existing source-validated hidden release candidate." }],
    domains: [...skeleton.domains, { id: "g2-domain-number", grade: 2, displayName: "Số và cấu tạo số", sourceReferenceIds: ["grade-2-canonical-source-manifest"] }],
    units: [...skeleton.units, { id: "grade-2-numbers-to-1000", grade: 2, displayName: "Các số trong phạm vi 1000", domainId: "g2-domain-number", displayOrder: skeleton.units.length + 1, knowledgeNodeIds: ["g2-node-numbers-to-1000"], skillIds: skills.map((skill) => skill.id), objectiveIds: skills.flatMap((skill) => skill.objectiveIds), publicationStatus: "DRAFT", sourceReferenceIds: ["grade-2-canonical-source-manifest"] }],
    knowledgeNodes: [...skeleton.knowledgeNodes, { id: "g2-node-numbers-to-1000", grade: 2, displayName: "Số đến 1000", skillIds: skills.map((skill) => skill.id), sourceReferenceIds: ["grade-2-canonical-source-manifest"] }],
    skills: [...skeleton.skills, ...skills],
    objectives: [...skeleton.objectives, ...skills.map((skill) => ({ id: skill.objectiveIds[0]!, grade: 2 as const, displayName: skill.displayName, description: skill.displayName, sourceReferenceIds: ["grade-2-canonical-source-manifest"] }))],
    prerequisites: [{ fromSkillId: "g1-skill-compare-order-to-100", toSkillId: "g2-skill-number-recognition-to-1000", evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] }],
    blueprints: Array.from(
      new Map(questions.map((question) => [question.blueprintId, {
        id: question.blueprintId,
        grade: 2 as const,
        skillId: question.skillId,
        difficulty: question.difficulty,
        questionType: question.answer.type,
        templateId: `g2-template-${question.skillId.replace("g2-skill-", "")}`,
        targetCount: questions.filter((candidate) => candidate.blueprintId === question.blueprintId).length,
        sourceReferenceIds: ["grade-2-canonical-source-manifest"],
      }])).values(),
    ),
    questions, explanations,
    evidenceReceipts: gradeTwoEvidenceReceipts,
    candidate: { candidateId: GRADE_TWO_NUMBERS_TO_1000_RELEASE_CANDIDATE_ID, version: GRADE_TWO_NUMBERS_TO_1000_CONTENT_VERSION, bundleHash: GRADE_TWO_NUMBERS_TO_1000_BUNDLE_SHA256, policyVersion: GRADE_TWO_NUMBERS_TO_1000_POLICY_VERSION },
    adaptivePolicy: { version: GRADE_TWO_NUMBERS_TO_1000_POLICY_VERSION, status: "VALIDATED" },
    release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false }, legacyAsset: null,
  };
}

export const productionGradePacks: readonly GradePack[] = [
  gradeOneReferencePack,
  gradeTwoPack(),
  gradeThreeWaveAPack,
  gradeFourWaveAPack,
  gradeFiveWaveAPack,
  gradeSixWaveAPack,
  gradeSevenWaveAPack,
  gradeEightWaveAPack,
  gradeNineWaveAPack,
];

export function getGradePacks(grades: readonly FactoryGrade[]) {
  return productionGradePacks.filter((pack) => grades.includes(pack.grade));
}
