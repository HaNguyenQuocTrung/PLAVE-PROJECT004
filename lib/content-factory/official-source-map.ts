import inventoryJson from "../../docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json" with { type: "json" };
import { assertStableId, canonicalize } from "./canonical.ts";
import type {
  DomainSpec,
  FactoryGrade,
  KnowledgeNodeSpec,
  LearningObjectiveSpec,
  SkillSpec,
  SourceReference,
  UnitSpec,
} from "./types.ts";

type ProductionGrade = Exclude<FactoryGrade, 1>;

type OfficialOutcome = Readonly<{
  id: string;
  grade: number;
  officialStrand: string;
  subdomain: string;
  conciseParaphrase: string;
  sourceDocumentId: string;
  sourceSha256: string;
  pages: Readonly<{ start: number; end: number }>;
  statuses: readonly string[];
  mappedUnitIds: readonly string[];
}>;

const inventory = inventoryJson as Readonly<{
  source: Readonly<{ documentId: string; sha256: string; pageCount: number }>;
  outcomes: readonly OfficialOutcome[];
}>;

export const officialCurriculumSource = Object.freeze({
  documentId: inventory.source.documentId,
  sha256: inventory.source.sha256,
  pageCount: inventory.source.pageCount,
  repositoryPath: "docs/curriculum/sources/MOET_GDPT_2018_MATHEMATICS.pdf",
  inventoryPath: "docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json",
});

export type SourceMapClassification =
  | "SOURCE_VERIFIED"
  | "PARTIAL_REPOSITORY_EVIDENCE"
  | "PRODUCT_HYPOTHESIS"
  | "POC_ONLY"
  | "SOURCE_REQUIRED";

export type SourceMapRecord = Readonly<{
  grade: ProductionGrade;
  mathematicalDomain: string;
  unitId: string;
  officialOutcomeId: string;
  learningObjective: string;
  skillId: string;
  sourceClassification: SourceMapClassification;
  sourceReference: Readonly<{
    documentId: string;
    documentSha256: string;
    pages: Readonly<{ start: number; end: number }>;
    inventoryPath: string;
  }>;
  evidenceStatus: "SOURCE_LOCKED_VALIDATOR_PASSED";
  confidence: "HIGH";
  prerequisiteEvidence: "NOT_SPECIFIED_BY_SOURCE_INVENTORY";
  supportedQuestionTypes: readonly (
    | "SINGLE_CHOICE"
    | "INTEGER_INPUT"
    | "RATIONAL_INPUT"
    | "DECIMAL_INPUT"
  )[];
  automatedVerificationCapability: "EXACT" | "STRUCTURED" | "INSUFFICIENT";
  knownGaps: readonly string[];
}>;

const strandToken = (strand: string) => {
  if (strand === "SỐ VÀ PHÉP TÍNH") return "number-operations";
  if (strand === "SỐ VÀ ĐẠI SỐ") return "number-algebra";
  if (strand.startsWith("HÌNH HỌC")) return "geometry-measurement";
  if (strand.startsWith("MỘT SỐ YẾU TỐ")) return "statistics-probability";
  if (strand.startsWith("HOẠT ĐỘNG")) return "experiential-practice";
  throw new Error(`UNSUPPORTED_OFFICIAL_STRAND:${strand}`);
};

export const officialSkillId = (outcomeId: string) => outcomeId.toLowerCase();
export const officialSourceReferenceId = (grade: ProductionGrade) =>
  `grade-${grade}-moet-2018-source-locked`;

function supportedQuestionTypes(strand: string): SourceMapRecord["supportedQuestionTypes"] {
  if (strand.startsWith("HOẠT ĐỘNG")) return ["SINGLE_CHOICE"];
  if (strand.startsWith("HÌNH HỌC")) return ["SINGLE_CHOICE", "INTEGER_INPUT", "DECIMAL_INPUT"];
  if (strand.startsWith("MỘT SỐ YẾU TỐ")) return ["SINGLE_CHOICE", "INTEGER_INPUT", "RATIONAL_INPUT", "DECIMAL_INPUT"];
  return ["SINGLE_CHOICE", "INTEGER_INPUT", "RATIONAL_INPUT", "DECIMAL_INPUT"];
}

function verificationCapability(strand: string): SourceMapRecord["automatedVerificationCapability"] {
  return strand.startsWith("HOẠT ĐỘNG") ? "INSUFFICIENT" : strand.startsWith("HÌNH HỌC") ? "STRUCTURED" : "EXACT";
}

function verifiedOutcomesForGrade(grade: ProductionGrade) {
  return inventory.outcomes.filter(
    (outcome) =>
      outcome.grade === grade &&
      outcome.sourceDocumentId === inventory.source.documentId &&
      outcome.sourceSha256 === inventory.source.sha256 &&
      outcome.statuses.includes("OFFICIAL_SOURCE_LOCKED") &&
      outcome.statuses.includes("VALIDATOR_PASSED") &&
      outcome.mappedUnitIds.length > 0,
  );
}

export function createOfficialSourceMap(grade: ProductionGrade): readonly SourceMapRecord[] {
  return verifiedOutcomesForGrade(grade)
    .flatMap((outcome) =>
      outcome.mappedUnitIds.map((unitId) => ({
        grade,
        mathematicalDomain: outcome.officialStrand,
        unitId,
        officialOutcomeId: outcome.id,
        learningObjective: outcome.conciseParaphrase,
        skillId: officialSkillId(outcome.id),
        sourceClassification: "SOURCE_VERIFIED" as const,
        sourceReference: {
          documentId: outcome.sourceDocumentId,
          documentSha256: outcome.sourceSha256,
          pages: outcome.pages,
          inventoryPath: officialCurriculumSource.inventoryPath,
        },
        evidenceStatus: "SOURCE_LOCKED_VALIDATOR_PASSED" as const,
        confidence: "HIGH" as const,
        prerequisiteEvidence: "NOT_SPECIFIED_BY_SOURCE_INVENTORY" as const,
        supportedQuestionTypes: supportedQuestionTypes(outcome.officialStrand),
        automatedVerificationCapability: verificationCapability(outcome.officialStrand),
        knownGaps:
          verificationCapability(outcome.officialStrand) === "INSUFFICIENT"
            ? ["Deterministic verification is not yet sufficient for open-ended experiential evidence."]
            : [],
      })),
    )
    .sort((left, right) =>
      `${left.unitId}:${left.officialOutcomeId}`.localeCompare(
        `${right.unitId}:${right.officialOutcomeId}`,
      ),
    );
}

export type OfficialGradeSkeleton = Readonly<{
  source: SourceReference;
  domains: readonly DomainSpec[];
  units: readonly UnitSpec[];
  knowledgeNodes: readonly KnowledgeNodeSpec[];
  skills: readonly SkillSpec[];
  objectives: readonly LearningObjectiveSpec[];
}>;

export function buildOfficialGradeSkeleton(grade: ProductionGrade): OfficialGradeSkeleton {
  const outcomes = verifiedOutcomesForGrade(grade);
  if (outcomes.length === 0) throw new Error(`OFFICIAL_SOURCE_MAP_EMPTY:GRADE_${grade}`);
  const sourceId = officialSourceReferenceId(grade);
  const domains = [...new Map(outcomes.map((outcome) => {
    const id = `g${grade}-domain-${strandToken(outcome.officialStrand)}`;
    return [id, { id, grade, displayName: outcome.officialStrand, sourceReferenceIds: [sourceId] }] as const;
  })).values()].sort((a, b) => a.id.localeCompare(b.id));
  const skills = outcomes.map((outcome) => ({
    id: officialSkillId(outcome.id),
    grade,
    displayName: outcome.conciseParaphrase,
    domainId: `g${grade}-domain-${strandToken(outcome.officialStrand)}`,
    objectiveIds: [`${officialSkillId(outcome.id)}-objective`],
    sourceReferenceIds: [sourceId],
  })).sort((a, b) => a.id.localeCompare(b.id));
  const objectives = outcomes.map((outcome) => ({
    id: `${officialSkillId(outcome.id)}-objective`,
    grade,
    displayName: outcome.subdomain,
    description: outcome.conciseParaphrase,
    sourceReferenceIds: [sourceId],
  })).sort((a, b) => a.id.localeCompare(b.id));
  const outcomesByUnit = new Map<string, OfficialOutcome[]>();
  for (const outcome of outcomes) for (const unitId of outcome.mappedUnitIds) {
    outcomesByUnit.set(unitId, [...(outcomesByUnit.get(unitId) ?? []), outcome]);
  }
  const orderedUnits = [...outcomesByUnit.entries()].sort(([left], [right]) => left.localeCompare(right));
  const units = orderedUnits.map(([unitId, unitOutcomes], index) => ({
    id: unitId,
    grade,
    displayName: unitId.replaceAll("-", " "),
    domainId: `g${grade}-domain-${strandToken(unitOutcomes[0]!.officialStrand)}`,
    displayOrder: index + 1,
    knowledgeNodeIds: [`${unitId}-source-node`],
    skillIds: unitOutcomes.map((outcome) => officialSkillId(outcome.id)).sort(),
    objectiveIds: unitOutcomes.map((outcome) => `${officialSkillId(outcome.id)}-objective`).sort(),
    publicationStatus: "DRAFT" as const,
    sourceReferenceIds: [sourceId],
  }));
  const knowledgeNodes = orderedUnits.map(([unitId, unitOutcomes]) => ({
    id: `${unitId}-source-node`,
    grade,
    displayName: `Bản đồ nguồn ${unitId}`,
    skillIds: unitOutcomes.map((outcome) => officialSkillId(outcome.id)).sort(),
    sourceReferenceIds: [sourceId],
  }));
  for (const entity of [...domains, ...units, ...knowledgeNodes, ...skills, ...objectives]) assertStableId(entity.id);
  return {
    source: {
      id: sourceId,
      status: "VERIFIED_REPOSITORY_SOURCE",
      repositoryEvidence: [
        officialCurriculumSource.repositoryPath,
        officialCurriculumSource.inventoryPath,
        "docs/curriculum/sources/SOURCE_PROVENANCE.json",
      ],
      note: `Source-locked MOET 2018 outcomes and canonical repository mappings for Grade ${grade}.`,
    },
    domains,
    units,
    knowledgeNodes,
    skills,
    objectives,
  };
}

export function validateOfficialSourceMap(
  grade: ProductionGrade,
  records: readonly SourceMapRecord[],
) {
  const expected = createOfficialSourceMap(grade);
  const errors: string[] = [];
  if (records.length !== expected.length) errors.push("SOURCE_MAP_ROW_COUNT_MISMATCH");
  const expectedByKey = new Map(expected.map((record) => [`${record.unitId}:${record.officialOutcomeId}`, record]));
  for (const record of records) {
    const key = `${record.unitId}:${record.officialOutcomeId}`;
    const canonical = expectedByKey.get(key);
    if (!canonical) errors.push(`UNEXPECTED_SOURCE_MAP_RECORD:${key}`);
    else if (JSON.stringify(canonicalize(record)) !== JSON.stringify(canonicalize(canonical))) errors.push(`SOURCE_MAP_RECORD_DRIFT:${key}`);
  }
  return errors;
}
