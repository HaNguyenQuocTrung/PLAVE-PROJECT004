import { generateIntegerQuestion } from "./templates.ts";
import type { FactoryGrade, GradePack } from "./types.ts";

function fixturePack(grade: 3 | 6): GradePack {
  const sourceId = "synthetic-poc-only";
  const template = { id: `fixture-g${grade}-integer-addition`, version: "fixture-template-1", grade, skillId: `g${grade}-skill-synthetic-integer-addition`, minimum: grade === 3 ? 1 : -20, maximum: grade === 3 ? 100 : 20, operation: "ADD" as const };
  const generated = [0, 1, 2, 3, 4, 5].map((index) => generateIntegerQuestion(template, `fixture-g${grade}-${index}`, true));
  return {
    schemaVersion: "content-factory-grade-pack-v1", grade, packId: `fixture-grade-${grade}-non-publishable`, packVersion: "fixture-1", immutableReference: false, testOnly: true, locale: "vi-VN", unicodeNormalization: "NFC",
    sources: [{ id: sourceId, status: "POC_ONLY", note: "Synthetic software fixture; never curriculum or production content." }],
    domains: [{ id: `g${grade}-domain-synthetic`, grade, displayName: "Dữ liệu kiểm thử tổng hợp", sourceReferenceIds: [sourceId] }],
    units: [{ id: `fixture-grade-${grade}-unit`, grade, displayName: "Không phải nội dung học", domainId: `g${grade}-domain-synthetic`, displayOrder: 1, knowledgeNodeIds: [`g${grade}-node-synthetic`], skillIds: [template.skillId], objectiveIds: [`g${grade}-objective-synthetic`], publicationStatus: "DRAFT", sourceReferenceIds: [sourceId] }],
    knowledgeNodes: [{ id: `g${grade}-node-synthetic`, grade, displayName: "Nút kiểm thử", skillIds: [template.skillId], sourceReferenceIds: [sourceId] }],
    skills: [{ id: template.skillId, grade, displayName: "Kỹ năng kiểm thử", domainId: `g${grade}-domain-synthetic`, objectiveIds: [`g${grade}-objective-synthetic`], sourceReferenceIds: [sourceId] }],
    objectives: [{ id: `g${grade}-objective-synthetic`, grade, displayName: "Mục tiêu kiểm thử", description: "Chỉ kiểm tra hành vi phần mềm.", sourceReferenceIds: [sourceId] }], prerequisites: [],
    blueprints: [{ id: `${template.id}-blueprint`, grade, skillId: template.skillId, difficulty: "CORE", questionType: "INTEGER_INPUT", templateId: template.id, targetCount: generated.length, sourceReferenceIds: [sourceId] }],
    questions: generated.map((item) => item.question), explanations: generated.map((item) => item.explanation), evidenceReceipts: [{ id: `fixture-grade-${grade}-evidence`, entityId: `fixture-grade-${grade}-non-publishable`, check: "MATHEMATICAL_ANSWER", status: "PASSED", evidence: "POC_ONLY deterministic fixture; excluded from production bundles." }],
    candidate: null, adaptivePolicy: { version: `fixture-policy-g${grade}-1`, status: "DRAFT" }, release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false }, legacyAsset: null,
  };
}

export const syntheticPrimaryFixture = fixturePack(3);
export const syntheticSecondaryFixture = fixturePack(6);
export const syntheticFixturePacks: readonly GradePack[] = [syntheticPrimaryFixture, syntheticSecondaryFixture];

export function fixturesForGrades(grades: readonly FactoryGrade[]) { return syntheticFixturePacks.filter((pack) => grades.includes(pack.grade)); }
