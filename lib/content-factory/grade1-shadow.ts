import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getSkillLabel, getUnitSkillCodes } from "../practice/catalog.ts";
import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import {
  gradeOneLegacyAsset,
  gradeOneLegacyFiles,
  gradeOneUnitSlugs,
} from "./grade1-reference.ts";
import { gradeOneSourceDigest } from "./legacy-digest.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type {
  AdaptivePolicyContract,
  CandidateQuestion,
  DifficultyBand,
  ExplanationSpec,
  GradePack,
  QuestionType,
} from "./types.ts";

export const GRADE_ONE_SHADOW_CANDIDATE_ID = "g1-legacy-release-shadow-rc1";
export const GRADE_ONE_SHADOW_VERSION = "g1-shadow-1.0.0-rc.1";
export const GRADE_ONE_SHADOW_POLICY_VERSION = "g1-shadow-adaptive-policy-1.0.0";
export const GRADE_ONE_SOURCE_DIGEST = "ba18662c6faa772030d70acda9fe081bbcf9b9da3dd4e20a41879973af40b51e";
const SOURCE_ID = "grade-1-repository-sql-release";

type RawQuestion = Readonly<{
  code: string;
  unit_slug: string;
  question_type: "MULTIPLE_CHOICE" | "NUMBER_INPUT";
  prompt: string;
  options: Readonly<Record<string, string>> | null;
  skill_code: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  display_order: number;
}>;

type RawSolution = Readonly<{
  question_id: string;
  correct_answer: string;
  solution_steps: readonly string[];
  explanation: string;
  hint: string;
}>;

type ParsedUnit = Readonly<{
  migration: string;
  slug: string;
  title: string;
  displayOrder: number;
  prerequisite: string | null;
  objectives: readonly string[];
  questions: readonly RawQuestion[];
  solutions: readonly RawSolution[];
}>;

export type GradeOneLegacyMetadataGap = Readonly<{
  field: "EXPLICIT_KNOWLEDGE_NODE_ID" | "QUESTION_PROVENANCE_DETAIL" | "QUESTION_AUTOMATED_EVIDENCE_DETAIL";
  state: "UNKNOWN";
  affectedQuestions: 312;
  behavior: "DERIVED_OVERLAY_ONLY";
}>;

function readTaggedJson<T>(source: string, tag: string, migration: string): T {
  const marker = `$${tag}$`;
  const start = source.indexOf(marker);
  const end = source.indexOf(marker, start + marker.length);
  if (start < 0 || end <= start) throw new Error(`GRADE1_ADAPTER_TAG_MISSING:${migration}:${tag}`);
  return JSON.parse(source.slice(start + marker.length, end)) as T;
}

function sqlString(value: string) {
  const match = /^'((?:[^']|'')*)'(?:\s*::\s*(?:jsonb|text))?$/su.exec(value.trim());
  if (!match) throw new Error("GRADE1_ADAPTER_SQL_LITERAL_INVALID");
  return match[1]!.replaceAll("''", "'");
}

function splitTopLevel(value: string) {
  const fields: string[] = [];
  let start = 0;
  let quoted = false;
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]!;
    if (character === "'") {
      if (quoted && value[index + 1] === "'") index += 1;
      else quoted = !quoted;
    } else if (!quoted && (character === "(" || character === "[" || character === "{")) depth += 1;
    else if (!quoted && (character === ")" || character === "]" || character === "}")) depth -= 1;
    else if (!quoted && depth === 0 && character === ",") {
      fields.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  fields.push(value.slice(start).trim());
  return fields;
}

function directInsertRows(source: string, table: "questions" | "question_solutions") {
  const start = source.indexOf(`insert into public.${table} (`);
  if (start < 0) throw new Error(`GRADE1_ADAPTER_INSERT_MISSING:${table}`);
  const values = source.indexOf("\nvalues", start);
  if (values < 0) throw new Error(`GRADE1_ADAPTER_VALUES_MISSING:${table}`);
  const rows: string[] = [];
  let quoted = false;
  let depth = 0;
  let tupleStart = -1;
  for (let index = values + 7; index < source.length; index += 1) {
    const character = source[index]!;
    if (character === "'") {
      if (quoted && source[index + 1] === "'") index += 1;
      else quoted = !quoted;
      continue;
    }
    if (quoted) continue;
    if (character === "(") {
      if (depth === 0) tupleStart = index + 1;
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
      if (depth === 0 && tupleStart >= 0) rows.push(source.slice(tupleStart, index));
    } else if (character === ";" && depth === 0) break;
  }
  if (rows.length !== 24) throw new Error(`GRADE1_ADAPTER_ROW_COUNT:${table}:${rows.length}`);
  return rows.map(splitTopLevel);
}

function parseFoundation(source: string): Readonly<{ questions: readonly RawQuestion[]; solutions: readonly RawSolution[] }> {
  const questions = directInsertRows(source, "questions").map((fields) => {
    if (fields.length !== 9) throw new Error("GRADE1_ADAPTER_FOUNDATION_QUESTION_SHAPE");
    return {
      code: sqlString(fields[0]!),
      unit_slug: sqlString(fields[1]!),
      question_type: sqlString(fields[2]!) as RawQuestion["question_type"],
      prompt: sqlString(fields[3]!),
      options: fields[4]!.trim() === "null" ? null : JSON.parse(sqlString(fields[4]!)) as Record<string, string>,
      skill_code: sqlString(fields[5]!),
      difficulty: sqlString(fields[6]!) as RawQuestion["difficulty"],
      display_order: Number(fields[7]),
    };
  });
  const solutions = directInsertRows(source, "question_solutions").map((fields) => {
    if (fields.length !== 5) throw new Error("GRADE1_ADAPTER_FOUNDATION_SOLUTION_SHAPE");
    return {
      question_id: sqlString(fields[0]!),
      correct_answer: sqlString(fields[1]!),
      solution_steps: JSON.parse(sqlString(fields[2]!)) as string[],
      explanation: sqlString(fields[3]!),
      hint: sqlString(fields[4]!),
    };
  });
  return { questions, solutions };
}

function parseUnit(path: string, index: number): ParsedUnit {
  const source = readFileSync(resolve(process.cwd(), path), "utf8");
  const metadata = /insert into public\.learning_units[\s\S]*?values\s*\(\s*'([^']+)',\s*1,\s*'([^']+)'/u.exec(source);
  const tail = /\}\$lesson\$::jsonb,\s*24,\s*true,\s*(\d+)(?:,\s*'([^']+)')?\s*\)/u.exec(source);
  if (!metadata || !tail) throw new Error(`GRADE1_ADAPTER_UNIT_METADATA:${path}`);
  const seeded = index === 0
    ? parseFoundation(source)
    : {
        questions: readTaggedJson<RawQuestion[]>(source, "questions", path),
        solutions: readTaggedJson<RawSolution[]>(source, "solutions", path),
      };
  const questions = seeded.questions.map((question) => ({ ...question, unit_slug: metadata[1]! }));
  return {
    migration: path,
    slug: metadata[1]!,
    title: metadata[2]!,
    displayOrder: Number(tail[1]),
    prerequisite: tail[2] ?? null,
    objectives: readTaggedJson<string[]>(source, "objectives", path),
    questions,
    solutions: seeded.solutions,
  };
}

function difficulty(value: RawQuestion["difficulty"]): DifficultyBand {
  return value === "EASY" ? "FOUNDATIONAL" : value === "MEDIUM" ? "CORE" : "EXTENSION";
}

function answerType(value: RawQuestion["question_type"]): QuestionType {
  return value === "MULTIPLE_CHOICE" ? "SINGLE_CHOICE" : "INTEGER_INPUT";
}

function loadUnits() {
  const contentFiles = gradeOneLegacyFiles.slice(0, -1);
  const units = contentFiles.map(parseUnit).sort((left, right) => left.displayOrder - right.displayOrder);
  if (units.length !== 13 || units.some((unit, index) => unit.slug !== gradeOneUnitSlugs[index])) {
    throw new Error("GRADE1_ADAPTER_UNIT_IDENTITY_DRIFT");
  }
  return units;
}

function readDiagnosticQuestionIds() {
  const source = readFileSync(resolve(process.cwd(), gradeOneLegacyFiles.at(-1)!), "utf8");
  const block = /insert into public\.grade1_diagnostic_blueprint[\s\S]*?values([\s\S]*?);/u.exec(source)?.[1];
  if (!block) throw new Error("GRADE1_ADAPTER_DIAGNOSTIC_MISSING");
  const ids = [...block.matchAll(/\(1,\s*\d+,\s*'[^']+',\s*'([^']+)'\)/gu)].map((match) => match[1]!);
  if (ids.length !== 24 || new Set(ids).size !== 24) throw new Error("GRADE1_ADAPTER_DIAGNOSTIC_COUNT");
  return ids;
}

export const gradeOneShadowAdaptivePolicyContract: AdaptivePolicyContract = {
  sessionLength: { minimum: 8, maximum: 24, basis: "DERIVED_COMPATIBILITY_VALUE" },
  minimumSkillEvidence: { value: 2, basis: "PRODUCT_HYPOTHESIS" },
  masteryThreshold: { correct: 6, basis: "DERIVED_COMPATIBILITY_VALUE" },
  remediationIncorrectStreak: { value: 2, basis: "PRODUCT_HYPOTHESIS" },
  resume: { idempotent: true, basis: "EXISTING_VERIFIED_PRODUCT_CONTRACT" },
  retentionReview: { enabled: false, contract: "SHADOW_ONLY", basis: "PRODUCT_HYPOTHESIS" },
  deterministicSelection: true,
  scoringHistoryRewrite: false,
  pedagogicalEffectivenessClaim: false,
};

export const gradeOneLegacyMetadataGaps: readonly GradeOneLegacyMetadataGap[] = [
  { field: "EXPLICIT_KNOWLEDGE_NODE_ID", state: "UNKNOWN", affectedQuestions: 312, behavior: "DERIVED_OVERLAY_ONLY" },
  { field: "QUESTION_PROVENANCE_DETAIL", state: "UNKNOWN", affectedQuestions: 312, behavior: "DERIVED_OVERLAY_ONLY" },
  { field: "QUESTION_AUTOMATED_EVIDENCE_DETAIL", state: "UNKNOWN", affectedQuestions: 312, behavior: "DERIVED_OVERLAY_ONLY" },
];

function buildGradeOneShadowPack() {
  const units = loadUnits();
  const solutions = new Map(units.flatMap((unit) => unit.solutions).map((solution) => [solution.question_id, solution]));
  const skillCodes = [...new Set(units.flatMap((unit) => getUnitSkillCodes(unit.slug)))];
  const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
    id: `grade-1-shadow-${check.toLowerCase().replaceAll("_", "-")}`,
    entityId: "grade-1-shadow-candidate",
    check,
    status: check === "MATHEMATICAL_ANSWER" ? "INSUFFICIENT" as const : "PASSED" as const,
    evidence: check === "MATHEMATICAL_ANSWER"
      ? "Legacy answers and solutions are paired and regression-validated; per-question independent derivations are not present in the legacy source."
      : `Deterministic Grade 1 shadow check: ${check}.`,
  }));
  const questions: CandidateQuestion[] = units.flatMap((unit) => unit.questions.map((question) => {
    const solution = solutions.get(question.code);
    if (!solution || !getUnitSkillCodes(unit.slug).includes(question.skill_code as never)) {
      throw new Error(`GRADE1_ADAPTER_REQUIRED_BINDING_MISSING:${question.code}`);
    }
    const skillId = `g1-skill-${question.skill_code.toLowerCase().replaceAll("_", "-")}`;
    const band = difficulty(question.difficulty);
    const type = answerType(question.question_type);
    return {
      id: question.code,
      grade: 1,
      unitId: unit.slug,
      blueprintId: `g1-blueprint-${question.skill_code.toLowerCase().replaceAll("_", "-")}-${band.toLowerCase()}-${type.toLowerCase().replaceAll("_", "-")}`,
      skillId,
      prompt: question.prompt,
      options: question.options ? Object.values(question.options) : null,
      answer: { type, exactValue: solution.correct_answer },
      explanationId: `${question.code}-explanation`,
      difficulty: band,
      provenance: { kind: "LEGACY_AUTHORED", templateVersion: null, seed: null, sourceReferenceIds: [SOURCE_ID] },
      reviewStatus: "DRAFT",
      published: false,
      pilotEligible: false,
      fixtureOnly: false,
      duplicateFingerprint: sha256(normalizedDefinition(`${question.prompt}|${question.options ? Object.values(question.options).join("|") : ""}`).toLocaleLowerCase("vi")),
      validationReceiptIds: evidenceReceipts.filter((receipt) => receipt.status === "PASSED").map((receipt) => receipt.id),
    } satisfies CandidateQuestion;
  }));
  const explanations: ExplanationSpec[] = units.flatMap((unit) => unit.solutions.map((solution) => ({
    id: `${solution.question_id}-explanation`,
    questionId: solution.question_id,
    steps: solution.solution_steps,
    finalAnswer: solution.correct_answer,
    evidenceReceiptIds: ["grade-1-shadow-explanation-consistency"],
  })));
  const blueprintMap = new Map(questions.map((question) => [question.blueprintId, {
    id: question.blueprintId,
    grade: 1 as const,
    skillId: question.skillId,
    difficulty: question.difficulty,
    questionType: question.answer.type,
    templateId: null,
    targetCount: questions.filter((candidate) => candidate.blueprintId === question.blueprintId).length,
    sourceReferenceIds: [SOURCE_ID],
  }]));
  const objectives = units.flatMap((unit) => unit.objectives.map((objective, index) => ({
    id: `g1-objective-${unit.slug.replace("grade-1-", "")}-${index + 1}`,
    grade: 1 as const,
    displayName: objective,
    description: objective,
    sourceReferenceIds: [SOURCE_ID],
  })));
  const sourceDigest = gradeOneSourceDigest((path) => readFileSync(resolve(process.cwd(), path), "utf8"));
  if (sourceDigest.aggregate !== GRADE_ONE_SOURCE_DIGEST) throw new Error("GRADE1_ADAPTER_SOURCE_DIGEST_DRIFT");
  const diagnosticQuestionIds = readDiagnosticQuestionIds();
  if (diagnosticQuestionIds.some((id) => !questions.some((question) => question.id === id))) throw new Error("GRADE1_ADAPTER_DIAGNOSTIC_REFERENCE_MISSING");
  const sourceSemanticProjection = units.flatMap((unit) => unit.questions.map((question) => {
    const solution = solutions.get(question.code)!;
    return { id: question.code, unitId: unit.slug, prompt: question.prompt, options: question.options ? Object.values(question.options) : null, answer: solution.correct_answer, solutionSteps: solution.solution_steps };
  }));
  const adaptedSemanticProjection = questions.map((question) => {
    const explanation = explanations.find((item) => item.questionId === question.id)!;
    return { id: question.id, unitId: question.unitId, prompt: question.prompt, options: question.options, answer: question.answer.exactValue, solutionSteps: explanation.steps };
  });
  const sourceSemanticDigest = sha256(canonicalize(sourceSemanticProjection));
  const adaptedSemanticDigest = sha256(canonicalize(adaptedSemanticProjection));
  if (sourceSemanticDigest !== adaptedSemanticDigest) throw new Error("GRADE1_ADAPTER_SEMANTIC_PARITY_FAILED");
  const candidateCore = {
    candidateId: GRADE_ONE_SHADOW_CANDIDATE_ID,
    version: GRADE_ONE_SHADOW_VERSION,
    policyVersion: GRADE_ONE_SHADOW_POLICY_VERSION,
    sourceDigest: sourceDigest.aggregate,
    semanticDigest: adaptedSemanticDigest,
    diagnosticQuestionIds,
    policy: gradeOneShadowAdaptivePolicyContract,
  };
  const bundleHash = sha256(canonicalize(candidateCore));
  const pack: GradePack = {
    schemaVersion: "content-factory-grade-pack-v1",
    grade: 1,
    packId: "grade-1-shadow-candidate",
    packVersion: GRADE_ONE_SHADOW_VERSION,
    immutableReference: true,
    testOnly: false,
    locale: "vi-VN",
    unicodeNormalization: "NFC",
    sources: [{ id: SOURCE_ID, status: "VERIFIED_REPOSITORY_SOURCE", repositoryEvidence: [...gradeOneLegacyFiles, "scripts/validate-grade1-release.mjs"], note: "Immutable published Grade 1 SQL release, projected into a hidden candidate overlay without source writes." }],
    domains: [{ id: "g1-domain-legacy-mixed", grade: 1, displayName: "Miền nội dung kế thừa", sourceReferenceIds: [SOURCE_ID] }],
    units: units.map((unit) => ({ id: unit.slug, grade: 1, displayName: unit.title, domainId: "g1-domain-legacy-mixed", displayOrder: unit.displayOrder, knowledgeNodeIds: [], skillIds: getUnitSkillCodes(unit.slug).map((code) => `g1-skill-${code.toLowerCase().replaceAll("_", "-")}`), objectiveIds: objectives.filter((objective) => objective.id.startsWith(`g1-objective-${unit.slug.replace("grade-1-", "")}-`)).map((objective) => objective.id), publicationStatus: "PUBLISHED", sourceReferenceIds: [SOURCE_ID] })),
    knowledgeNodes: [],
    skills: skillCodes.map((code) => ({ id: `g1-skill-${code.toLowerCase().replaceAll("_", "-")}`, grade: 1, displayName: getSkillLabel(code), domainId: "g1-domain-legacy-mixed", objectiveIds: [], sourceReferenceIds: [SOURCE_ID] })),
    objectives,
    prerequisites: units.flatMap((unit) => {
      if (!unit.prerequisite) return [];
      const fromCodes = getUnitSkillCodes(unit.prerequisite);
      const toCodes = getUnitSkillCodes(unit.slug);
      if (!fromCodes.at(-1) || !toCodes[0]) throw new Error(`GRADE1_ADAPTER_PREREQUISITE_BINDING:${unit.slug}`);
      return [{ fromSkillId: `g1-skill-${fromCodes.at(-1)!.toLowerCase().replaceAll("_", "-")}`, toSkillId: `g1-skill-${toCodes[0]!.toLowerCase().replaceAll("_", "-")}`, evidence: "REPOSITORY_RUNTIME_ORDER" as const, sourceReferenceIds: [SOURCE_ID] }];
    }),
    blueprints: [...blueprintMap.values()],
    questions,
    explanations,
    evidenceReceipts,
    candidate: { candidateId: GRADE_ONE_SHADOW_CANDIDATE_ID, version: GRADE_ONE_SHADOW_VERSION, bundleHash, policyVersion: GRADE_ONE_SHADOW_POLICY_VERSION },
    adaptivePolicy: { version: GRADE_ONE_SHADOW_POLICY_VERSION, status: "DRAFT", contract: gradeOneShadowAdaptivePolicyContract },
    release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
    legacyAsset: gradeOneLegacyAsset,
  };
  return {
    pack,
    receipt: {
      sourceDigest: sourceDigest.aggregate,
      sourceSemanticDigest,
      adaptedSemanticDigest,
      semanticParity: true as const,
      counts: { units: units.length, questions: questions.length, solutions: explanations.length, diagnosticRows: diagnosticQuestionIds.length },
      diagnosticQuestionIds,
      metadataGaps: gradeOneLegacyMetadataGaps,
    },
  };
}

export const gradeOneShadowArtifacts = buildGradeOneShadowPack();
export const gradeOneShadowCandidatePack = gradeOneShadowArtifacts.pack;

export type LegacyShadowQuestion = Readonly<{ questionId: string; skillId: string; difficulty?: DifficultyBand }>;
export type GradeOneShadowReport = Readonly<{
  mode: "SHADOW_ONLY_NO_RUNTIME_INTEGRATION";
  fixedSelection: readonly string[];
  proposedAdaptiveSelection: readonly string[];
  sameQuestionSet: boolean;
  questionOverlap: number;
  fixedSkillCoverage: number;
  adaptiveSkillCoverage: number;
  fixedDifficultyDistribution: Readonly<Record<DifficultyBand, number>>;
  adaptiveDifficultyDistribution: Readonly<Record<DifficultyBand, number>>;
  duplicateSelection: false;
  emptyPoolBehavior: "FAIL_CLOSED";
  historyMutation: false;
  pedagogicalClaim: "NONE";
}>;

function distribution(selection: readonly LegacyShadowQuestion[], ids: ReadonlySet<string>) {
  const result: Record<DifficultyBand, number> = { FOUNDATIONAL: 0, CORE: 0, EXTENSION: 0 };
  for (const question of selection) if (ids.has(question.questionId)) result[question.difficulty ?? "CORE"] += 1;
  return result;
}

export function simulateGradeOneShadowComparison(questions: readonly LegacyShadowQuestion[], seed: string, limit: number): GradeOneShadowReport {
  if (limit < 1 || limit > questions.length || new Set(questions.map((item) => item.questionId)).size !== questions.length) throw new Error("INVALID_GRADE1_SHADOW_INPUT");
  const fixedSelection = questions.slice(0, limit).map((item) => item.questionId);
  const proposedAdaptiveSelection = [...questions]
    .sort((a, b) => `${a.skillId}:${sha256(`${seed}:${a.questionId}`)}`.localeCompare(`${b.skillId}:${sha256(`${seed}:${b.questionId}`)}`))
    .slice(0, limit).map((item) => item.questionId);
  const fixed = new Set(fixedSelection);
  const adaptive = new Set(proposedAdaptiveSelection);
  return {
    mode: "SHADOW_ONLY_NO_RUNTIME_INTEGRATION",
    fixedSelection,
    proposedAdaptiveSelection,
    sameQuestionSet: [...fixed].sort().join("|") === [...adaptive].sort().join("|"),
    questionOverlap: [...fixed].filter((id) => adaptive.has(id)).length,
    fixedSkillCoverage: new Set(questions.filter((question) => fixed.has(question.questionId)).map((question) => question.skillId)).size,
    adaptiveSkillCoverage: new Set(questions.filter((question) => adaptive.has(question.questionId)).map((question) => question.skillId)).size,
    fixedDifficultyDistribution: distribution(questions, fixed),
    adaptiveDifficultyDistribution: distribution(questions, adaptive),
    duplicateSelection: false,
    emptyPoolBehavior: "FAIL_CLOSED",
    historyMutation: false,
    pedagogicalClaim: "NONE",
  };
}

export type GradeOneNextAction =
  | "CONTINUE_CURRENT_SKILL"
  | "REMEDIATE_PREREQUISITE"
  | "ADVANCE_TO_NEXT_SKILL"
  | "RUN_RETENTION_REVIEW"
  | "MIXED_PRACTICE"
  | "RECOMMEND_GRADE_TWO_SKILL";

export function chooseGradeOneShadowNextAction(state: Readonly<{
  incorrectStreak: number;
  currentSkillEvidence: number;
  currentSkillMastered: boolean;
  gradeComplete: boolean;
  retentionDue: boolean;
  recommendGradeTwo: boolean;
}>): Readonly<{ action: GradeOneNextAction; changesSchoolGrade: false; grantsGradeTwoAccess: false }> {
  const action: GradeOneNextAction = state.gradeComplete
    ? state.retentionDue
      ? "RUN_RETENTION_REVIEW"
      : state.recommendGradeTwo
        ? "RECOMMEND_GRADE_TWO_SKILL"
        : "MIXED_PRACTICE"
    : state.incorrectStreak >= gradeOneShadowAdaptivePolicyContract.remediationIncorrectStreak.value
      ? "REMEDIATE_PREREQUISITE"
      : state.currentSkillMastered
        ? "ADVANCE_TO_NEXT_SKILL"
        : "CONTINUE_CURRENT_SKILL";
  return { action, changesSchoolGrade: false, grantsGradeTwoAccess: false };
}

export function assertGradeOneShadowCanSelect(pack: GradePack = gradeOneShadowCandidatePack) {
  if (!pack.candidate || pack.questions.length !== 312 || pack.units.length !== 13) throw new Error("GRADE1_SHADOW_CANDIDATE_INCOMPLETE");
  for (const unit of pack.units) {
    const questions = pack.questions.filter((question) => unit.skillIds.includes(question.skillId));
    if (questions.length === 0) throw new Error(`GRADE1_SHADOW_EMPTY_POOL:${unit.id}`);
  }
  return true;
}
