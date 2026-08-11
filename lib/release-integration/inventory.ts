import { canonicalize, sha256 } from "../content-factory/canonical.ts";
import { combinedWaveABCDEFGHIJKGradePacks } from "../content-factory/wave-k-packs.ts";
import { buildWaveMAdaptiveSupportInventory } from "../content-factory/wave-m.ts";
import type {
  CandidateQuestion,
  DifficultyBand,
  FactoryGrade,
  GradePack,
  UnitSpec,
} from "../content-factory/types.ts";

export const FROZEN_COMBINED_A_K_HASH =
  "de5cff15605c2fd4d09bf06740db9475a9918d20396e9d06f5ec27200b362b1e";
export const GRADES_2_9_RELEASE_SCHEMA_VERSION =
  "plave-grades-2-9-database-release-v1";
export const GRADES_2_9_RELEASE_POLICY_VERSION =
  "plave-grades-2-9-public-release-policy-v1";

export type DatabaseReleaseSkillSupport = "ADAPTIVE" | "FIXED_SAFE";

export type DatabaseReleaseUnit = Readonly<{
  releaseId: string;
  unitId: string;
  grade: FactoryGrade;
  domain: string;
  title: string;
  description: string;
  learningGoals: readonly string[];
  theory: readonly Readonly<{ title: string; explanation: readonly string[] }>[];
  workedExamples: readonly never[];
  officialOutcomeIds: readonly string[];
  skillIds: readonly string[];
  displayOrder: number;
  totalQuestions: number;
  runtimeAvailable: boolean;
}>;

export type DatabaseReleaseQuestion = Readonly<{
  releaseId: string;
  unitId: string;
  questionId: string;
  displayOrder: number;
  answerType: "MULTIPLE_CHOICE" | "NUMBER_INPUT" | "TEXT_INPUT";
  prompt: string;
  options: readonly Readonly<{ key: string; label: string }>[] | null;
  visual: Readonly<Record<string, never>>;
  cognitiveLevel: "UNDERSTAND" | "APPLY" | "REASON";
  officialOutcomeIds: readonly string[];
  officialOutcomeTitles: readonly string[];
  skillId: string;
  skillTitle: string;
  structuralFingerprint: string;
  supportMode: DatabaseReleaseSkillSupport;
  questionPayloadHash: string;
}>;

export type DatabaseReleaseSolution = Readonly<{
  releaseId: string;
  questionId: string;
  normalizedCorrectAnswer: string;
  correctAnswer: string;
  solutionSteps: readonly string[];
  feedback: string;
  solutionPayloadHash: string;
}>;

const expected = Object.freeze({
  2: { questions: 264, skills: 37, units: 17 },
  3: { questions: 306, skills: 41, units: 18 },
  4: { questions: 319, skills: 34, units: 16 },
  5: { questions: 312, skills: 34, units: 16 },
  6: { questions: 485, skills: 61, units: 26 },
  7: { questions: 246, skills: 25, units: 22 },
  8: { questions: 228, skills: 22, units: 23 },
  9: { questions: 300, skills: 33, units: 25 },
} as const);

function releaseId(grade: number) {
  return `plave-math-grade-${grade}-a-k-v1`;
}

function databaseDomain(unit: UnitSpec) {
  if (unit.domainId.includes("statistics")) return "STATISTICS_AND_PROBABILITY";
  if (unit.domainId.includes("experiential")) return "APPLIED_PROBLEM_SOLVING";
  if (unit.domainId.includes("number-algebra")) return "ALGEBRA_AND_PREALGEBRA";
  if (unit.domainId.includes("geometry-measurement")) {
    return unit.id.includes("measure") || unit.id.includes("area") || unit.id.includes("volume")
      ? "MEASUREMENT"
      : "GEOMETRY";
  }
  return "NUMBERS_AND_OPERATIONS";
}

function answerType(question: CandidateQuestion): DatabaseReleaseQuestion["answerType"] {
  if (question.answer.type === "SINGLE_CHOICE") return "MULTIPLE_CHOICE";
  if (question.answer.type === "INTEGER_INPUT" || question.answer.type === "DECIMAL_INPUT") {
    return "NUMBER_INPUT";
  }
  return "TEXT_INPUT";
}

function cognitiveLevel(difficulty: DifficultyBand) {
  return difficulty === "FOUNDATIONAL"
    ? "UNDERSTAND" as const
    : difficulty === "CORE"
      ? "APPLY" as const
      : "REASON" as const;
}

function normalizedAnswer(value: string) {
  return value.trim().replace(",", ".").replace(/\s+/g, "").toLocaleLowerCase("vi");
}

function databaseCorrectAnswer(
  question: CandidateQuestion,
  options: DatabaseReleaseQuestion["options"],
) {
  const exact = question.answer.exactValue;
  if (exact === undefined) {
    throw new Error(`RELEASE_EXACT_ANSWER_MISSING:${question.id}`);
  }
  if (question.answer.type !== "SINGLE_CHOICE") return exact;
  if (!options) throw new Error(`RELEASE_OPTIONS_MISSING:${question.id}`);
  const normalizedExact = normalizedAnswer(exact);
  const directKey = options.find((option) => option.key.toLocaleLowerCase("vi") === normalizedExact);
  if (directKey) return directKey.key;
  const labelMatches = options.filter((option) => normalizedAnswer(option.label) === normalizedExact);
  if (labelMatches.length !== 1) {
    throw new Error(`RELEASE_OPTION_ANSWER_BINDING_INVALID:${question.id}`);
  }
  return labelMatches[0]!.key;
}

function compactDatabaseTitle(value: string, maximum = 220) {
  const normalized = value.normalize("NFC").replace(/\s+/g, " ").trim();
  if (normalized.length <= maximum) return normalized;
  const prefix = normalized.slice(0, maximum + 1);
  const boundary = prefix.lastIndexOf(" ");
  return `${prefix.slice(0, boundary >= maximum / 2 ? boundary : maximum).trim()}…`;
}

function unitForQuestion(
  pack: GradePack,
  question: CandidateQuestion,
  counts: ReadonlyMap<string, number>,
) {
  if (question.unitId && pack.units.some((unit) => unit.id === question.unitId)) {
    return question.unitId;
  }
  const eligible = pack.units
    .filter((unit) => unit.skillIds.includes(question.skillId))
    .sort((left, right) =>
      (counts.get(left.id) ?? 0) - (counts.get(right.id) ?? 0)
      || left.displayOrder - right.displayOrder
      || left.id.localeCompare(right.id));
  if (eligible.length === 0) {
    throw new Error(`RELEASE_UNIT_BINDING_MISSING:G${pack.grade}:${question.id}`);
  }
  return eligible[0]!.id;
}

function buildGradeRelease(pack: GradePack, supportBySkill: ReadonlyMap<string, DatabaseReleaseSkillSupport>) {
  if (pack.grade < 2 || !pack.candidate) throw new Error("RELEASE_GRADE_BINDING_INVALID");
  const id = releaseId(pack.grade);
  const objectives = new Map(pack.objectives.map((objective) => [objective.id, objective]));
  const skills = new Map(pack.skills.map((skill) => [skill.id, skill]));
  const explanations = new Map(pack.explanations.map((explanation) => [explanation.id, explanation]));
  const counts = new Map(pack.units.map((unit) => [unit.id, 0]));
  const mapped = pack.questions.map((question) => {
    const unitId = unitForQuestion(pack, question, counts);
    counts.set(unitId, (counts.get(unitId) ?? 0) + 1);
    return { question, unitId };
  });
  const ordinal = new Map<string, number>();
  const questions: DatabaseReleaseQuestion[] = [];
  const solutions: DatabaseReleaseSolution[] = [];
  for (const { question, unitId } of mapped) {
    const skill = skills.get(question.skillId);
    if (!skill) throw new Error(`RELEASE_SKILL_BINDING_MISSING:G${pack.grade}:${question.id}`);
    const outcomeIds = skill.objectiveIds.length > 0 ? skill.objectiveIds : [skill.id];
    const outcomeTitles = outcomeIds.map((outcomeId) => objectives.get(outcomeId)?.description ?? skill.displayName);
    const position = (ordinal.get(unitId) ?? 0) + 1;
    ordinal.set(unitId, position);
    const options = question.options?.map((label, index) => ({
      key: String.fromCharCode(65 + index), label,
    })) ?? null;
    const publicCore = {
      releaseId: id,
      unitId,
      questionId: question.id,
      displayOrder: position,
      answerType: answerType(question),
      prompt: question.prompt,
      options,
      visual: {} as Readonly<Record<string, never>>,
      cognitiveLevel: cognitiveLevel(question.difficulty),
      officialOutcomeIds: outcomeIds,
      officialOutcomeTitles: outcomeTitles,
      skillId: question.skillId,
      skillTitle: compactDatabaseTitle(skill.displayName),
      structuralFingerprint: question.duplicateFingerprint ?? sha256(canonicalize({
        blueprintId: question.blueprintId,
        templateVersion: question.provenance.templateVersion,
        prompt: question.prompt,
      })),
      supportMode: supportBySkill.get(question.skillId) ?? "ADAPTIVE",
    } as const;
    questions.push({ ...publicCore, questionPayloadHash: sha256(canonicalize(publicCore)) });
    const explanation = explanations.get(question.explanationId);
    if (!explanation || question.answer.exactValue === undefined) {
      throw new Error(`RELEASE_SOLUTION_BINDING_MISSING:G${pack.grade}:${question.id}`);
    }
    const correctAnswer = databaseCorrectAnswer(question, options);
    const privateCore = {
      releaseId: id,
      questionId: question.id,
      normalizedCorrectAnswer: normalizedAnswer(correctAnswer),
      correctAnswer,
      solutionSteps: explanation.steps,
      feedback: explanation.steps.at(-1) ?? `Đáp án đúng là ${question.answer.exactValue}.`,
    } as const;
    solutions.push({ ...privateCore, solutionPayloadHash: sha256(canonicalize(privateCore)) });
  }
  const units: DatabaseReleaseUnit[] = pack.units.map((unit) => {
    const goals = unit.objectiveIds.map((id) => objectives.get(id)?.description).filter((value): value is string => Boolean(value));
    const totalQuestions = counts.get(unit.id) ?? 0;
    return {
      releaseId: id,
      unitId: unit.id,
      grade: pack.grade,
      domain: databaseDomain(unit),
      title: unit.displayName,
      description: goals[0] ?? `Chủ đề Toán lớp ${pack.grade} có bằng chứng nguồn được giữ lại.`,
      learningGoals: goals.length > 0 ? goals : [unit.displayName],
      theory: [{ title: unit.displayName, explanation: goals.length > 0 ? goals : [unit.displayName] }],
      workedExamples: [],
      officialOutcomeIds: unit.objectiveIds.length > 0 ? unit.objectiveIds : unit.skillIds,
      skillIds: unit.skillIds,
      displayOrder: unit.displayOrder,
      totalQuestions,
      runtimeAvailable: totalQuestions > 0,
    };
  });
  const publicPayloadHash = sha256(canonicalize({ candidate: pack.candidate, units, questions }));
  const privateSolutionHash = sha256(canonicalize(solutions));
  const releaseBundleHash = sha256(canonicalize({ publicPayloadHash, privateSolutionHash }));
  const summary = {
    grade: pack.grade,
    releaseId: id,
    candidate: pack.candidate,
    units: units.length,
    runtimeUnits: units.filter((unit) => unit.runtimeAvailable).length,
    skills: new Set(questions.map((question) => question.skillId)).size,
    adaptiveSkills: new Set(questions.filter((question) => question.supportMode === "ADAPTIVE").map((question) => question.skillId)).size,
    fixedSafeSkills: new Set(questions.filter((question) => question.supportMode === "FIXED_SAFE").map((question) => question.skillId)).size,
    questions: questions.length,
    publicPayloadHash,
    privateSolutionHash,
    releaseBundleHash,
  } as const;
  const target = expected[pack.grade as keyof typeof expected];
  if (!target || summary.questions !== target.questions || summary.skills !== target.skills || summary.units !== target.units) {
    throw new Error(`RELEASE_COUNT_MISMATCH:G${pack.grade}`);
  }
  return { summary, units, questions, solutions } as const;
}

export function buildGradesTwoToNineDatabaseRelease() {
  const packs = combinedWaveABCDEFGHIJKGradePacks.filter((pack) => pack.grade >= 2);
  const support = buildWaveMAdaptiveSupportInventory(combinedWaveABCDEFGHIJKGradePacks);
  const supportBySkill = new Map<string, DatabaseReleaseSkillSupport>();
  for (const grade of support.grades.filter((entry) => entry.grade >= 2)) {
    for (const skill of grade.skillRows) {
      if (skill.support === "UNAVAILABLE" || skill.support === "SHADOW_ONLY") {
        throw new Error(`RELEASE_UNSUPPORTED_SKILL:G${grade.grade}:${skill.skillId}`);
      }
      supportBySkill.set(`${grade.grade}:${skill.skillId}`, skill.support === "FIXED_SAFE_SUPPORTED" ? "FIXED_SAFE" : "ADAPTIVE");
    }
  }
  const grades = packs.map((pack) => buildGradeRelease(
    pack,
    new Map([...supportBySkill].filter(([key]) => key.startsWith(`${pack.grade}:`)).map(([key, value]) => [key.slice(key.indexOf(":") + 1), value])),
  ));
  const core = {
    schemaVersion: GRADES_2_9_RELEASE_SCHEMA_VERSION,
    frozenCombinedAKHash: FROZEN_COMBINED_A_K_HASH,
    policyVersion: GRADES_2_9_RELEASE_POLICY_VERSION,
    defaultMode: "HIDDEN" as const,
    grades: grades.map((grade) => grade.summary),
    totals: {
      grades: grades.length,
      units: grades.reduce((sum, grade) => sum + grade.units.length, 0),
      runtimeUnits: grades.reduce((sum, grade) => sum + grade.units.filter((unit) => unit.runtimeAvailable).length, 0),
      skills: grades.reduce((sum, grade) => sum + grade.summary.skills, 0),
      adaptiveSkills: grades.reduce((sum, grade) => sum + grade.summary.adaptiveSkills, 0),
      fixedSafeSkills: grades.reduce((sum, grade) => sum + grade.summary.fixedSafeSkills, 0),
      questions: grades.reduce((sum, grade) => sum + grade.questions.length, 0),
      solutions: grades.reduce((sum, grade) => sum + grade.solutions.length, 0),
    },
  } as const;
  if (core.totals.questions !== 2_460 || core.totals.skills !== 287 || core.totals.adaptiveSkills !== 274 || core.totals.fixedSafeSkills !== 13 || core.totals.units !== 163) {
    throw new Error("RELEASE_TOTALS_MISMATCH");
  }
  return { ...core, grades, inventoryHash: sha256(canonicalize(core)) } as const;
}
