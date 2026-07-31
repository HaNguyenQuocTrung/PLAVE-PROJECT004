import type {
  CurriculumOutcome,
  CurriculumUnit,
  PreviewUnitDraft,
} from "./types.ts";
import { p0TargetOutcomeIds } from "./p0-outcome-expansion.ts";

export type OfficialOutcomeState =
  | "OFFICIAL_SOURCE_LOCKED"
  | "TEACHABLE_IMPLEMENTED"
  | "VALIDATOR_PASSED"
  | "PARTIALLY_COVERED"
  | "NOT_IMPLEMENTED"
  | "NOT_APPLICABLE";

export type OfficialOutcomeComponents = Readonly<{
  theory: boolean;
  workedExample: boolean;
  skillFamily: boolean;
  questions: boolean;
  feedback: boolean;
  solution: boolean;
  semanticValidation: boolean;
}>;

export type OfficialOutcomeInventoryRecord = Readonly<{
  id: string;
  grade: number;
  officialStrand: string;
  subdomain: string;
  conciseParaphrase: string;
  sourceDocumentId: string;
  sourceSha256: string;
  pages: Readonly<{ start: number; end: number }>;
  prerequisiteOutcomeIds: readonly string[];
  prerequisiteBasis: string | null;
  statuses: readonly OfficialOutcomeState[];
  mappedUnitIds: readonly string[];
  questionCount: number;
  components: OfficialOutcomeComponents;
  priority: "P0" | "P1" | "P2" | null;
  priorityReason: string | null;
  implementationEvidence?: Readonly<{
    theorySectionIds: readonly string[];
    workedExampleIds: readonly string[];
    skillFamilies: readonly string[];
    primaryQuestionCodes: readonly string[];
    questionEvidenceForms: readonly string[];
    semanticTestIds: readonly string[];
  }>;
}>;

export type OfficialOutcomeGradeSummary = Readonly<{
  grade: number;
  totalOfficialOutcomes: number;
  implementedOutcomes: number;
  partiallyCoveredOutcomes: number;
  missingOutcomes: number;
  validatedOutcomes: number;
  officialOutcomeCoveragePercent: number;
}>;

export type OfficialOutcomeInventory = Readonly<{
  schemaVersion: 1;
  generatedAt: string;
  source: Readonly<{
    documentId: string;
    sha256: string;
    pageCount: number;
    gradeSectionPages: Readonly<Record<string, Readonly<{ start: number; end: number }>>>;
  }>;
  inventoryMethod: string;
  totalOfficialOutcomes: number;
  mappedUnits: number;
  mappedQuestions: number;
  mappedSolutions: number;
  fullOfficialOutcomeCoverage: boolean;
  overallOfficialOutcomeCoveragePercent: number;
  byGrade: readonly OfficialOutcomeGradeSummary[];
  outcomes: readonly OfficialOutcomeInventoryRecord[];
  p0Expansion?: Readonly<{
    baselineCount: number;
    targetOutcomeIds: readonly string[];
    closedOutcomeIds: readonly string[];
    remainingOutcomeIds: readonly string[];
  }>;
}>;

export type OfficialOutcomeInventoryValidationResult = Readonly<{
  valid: boolean;
  errors: readonly string[];
}>;

const allComponents = (
  components: OfficialOutcomeComponents,
) => Object.values(components).every(Boolean);

export function validateOfficialOutcomeInventory(
  inventory: OfficialOutcomeInventory,
  units: readonly CurriculumUnit[],
  curriculumOutcomes: readonly CurriculumOutcome[],
  primarySource: Readonly<{
    id: string;
    sha256: string;
    pageCount: number | null;
  }>,
  drafts: readonly PreviewUnitDraft[] = [],
): OfficialOutcomeInventoryValidationResult {
  const errors: string[] = [];
  const ids = inventory.outcomes.map((outcome) => outcome.id);
  const idSet = new Set(ids);
  const unitBySlug = new Map(units.map((unit) => [unit.slug, unit]));
  const curriculumOutcomeIds = new Set(
    curriculumOutcomes.map((outcome) => outcome.id),
  );
  const draftByUnit = new Map(drafts.map((draft) => [draft.unit.slug, draft]));

  if (idSet.size !== ids.length) {
    errors.push("Official outcome inventory contains duplicate IDs.");
  }
  if (
    inventory.source.documentId !== primarySource.id ||
    inventory.source.sha256 !== primarySource.sha256 ||
    inventory.source.pageCount !== primarySource.pageCount
  ) {
    errors.push("Official outcome inventory source fingerprint is inconsistent.");
  }
  if (inventory.totalOfficialOutcomes !== inventory.outcomes.length) {
    errors.push("Official outcome total is inconsistent.");
  }

  for (const unit of units) {
    for (const outcomeId of unit.outcomeIds) {
      if (!curriculumOutcomeIds.has(outcomeId)) {
        errors.push(
          `Unit references a non-existent curriculum outcome: ${unit.slug}/${outcomeId}.`,
        );
      }
    }
  }

  for (const outcome of inventory.outcomes) {
    if (
      outcome.grade < 1 ||
      outcome.grade > 9 ||
      !outcome.officialStrand.trim() ||
      !outcome.subdomain.trim() ||
      !outcome.conciseParaphrase.trim()
    ) {
      errors.push(`Official outcome fields are incomplete: ${outcome.id}.`);
    }
    if (
      outcome.sourceDocumentId !== primarySource.id ||
      outcome.sourceSha256 !== primarySource.sha256 ||
      outcome.pages.start <= 0 ||
      outcome.pages.end < outcome.pages.start ||
      outcome.pages.end > (primarySource.pageCount ?? 0)
    ) {
      errors.push(`Official outcome source lock is invalid: ${outcome.id}.`);
    }
    if (!outcome.statuses.includes("OFFICIAL_SOURCE_LOCKED")) {
      errors.push(`Official outcome is not source locked: ${outcome.id}.`);
    }
    const expectedStrandToken = outcome.officialStrand.startsWith(
      "HOẠT ĐỘNG",
    )
      ? "EXP"
      : outcome.officialStrand.startsWith("HÌNH HỌC")
        ? "GEO"
        : outcome.officialStrand.startsWith("MỘT SỐ YẾU TỐ")
          ? "STA"
          : outcome.officialStrand === "SỐ VÀ ĐẠI SỐ"
            ? "NAA"
            : outcome.officialStrand === "SỐ VÀ PHÉP TÍNH"
              ? "NUM"
              : null;
    if (
      !expectedStrandToken ||
      !outcome.id.includes(`-${expectedStrandToken}-`)
    ) {
      errors.push(`Official outcome strand/ID is inconsistent: ${outcome.id}.`);
    }
    for (const prerequisiteId of outcome.prerequisiteOutcomeIds) {
      if (!idSet.has(prerequisiteId)) {
        errors.push(
          `Official outcome has unknown prerequisite: ${outcome.id}/${prerequisiteId}.`,
        );
      }
    }
    for (const unitId of outcome.mappedUnitIds) {
      const unit = unitBySlug.get(unitId);
      if (!unit) {
        errors.push(`Official outcome maps an unknown unit: ${outcome.id}/${unitId}.`);
      } else if (unit.grade !== outcome.grade) {
        errors.push(`Official outcome crosses a grade boundary: ${outcome.id}/${unitId}.`);
      }
    }

    const teachable = outcome.statuses.includes("TEACHABLE_IMPLEMENTED");
    const partial = outcome.statuses.includes("PARTIALLY_COVERED");
    const missing = outcome.statuses.includes("NOT_IMPLEMENTED");
    const validated = outcome.statuses.includes("VALIDATOR_PASSED");
    if (
      Number(teachable) + Number(partial) + Number(missing) !== 1 ||
      outcome.statuses.includes("NOT_APPLICABLE")
    ) {
      errors.push(`Official outcome coverage state is inconsistent: ${outcome.id}.`);
    }
    if (
      teachable &&
      (!allComponents(outcome.components) ||
        outcome.questionCount <= 0 ||
        outcome.mappedUnitIds.length === 0 ||
        !validated)
    ) {
      errors.push(`Teachable outcome is missing required components: ${outcome.id}.`);
    }
    if (partial && allComponents(outcome.components)) {
      errors.push(`Partially covered outcome is incorrectly complete: ${outcome.id}.`);
    }
    if (
      missing &&
      (outcome.mappedUnitIds.length > 0 ||
        outcome.questionCount !== 0 ||
        Object.values(outcome.components).some(Boolean))
    ) {
      errors.push(`Missing outcome carries implementation evidence: ${outcome.id}.`);
    }

    if (outcome.implementationEvidence) {
      const unit = outcome.mappedUnitIds
        .map((unitId) => unitBySlug.get(unitId))
        .find((candidate) =>
          candidate?.officialOutcomeIds.includes(outcome.id),
        );
      const draft = unit ? draftByUnit.get(unit.slug) : undefined;
      const audits =
        draft?.audits.filter(
          (audit) => audit.primaryOfficialOutcomeId === outcome.id,
        ) ?? [];
      const codes = audits.map((audit) => audit.questionCode);
      const questions =
        draft?.questions.filter((question) => codes.includes(question.code)) ?? [];
      const theoryIds =
        unit?.theory
          .filter((section) => section.officialOutcomeIds?.includes(outcome.id))
          .map((section) => section.id) ?? [];
      const exampleIds =
        unit?.examples
          .filter((example) => example.officialOutcomeIds?.includes(outcome.id))
          .map((example) => example.id) ?? [];
      const skillFamilies = [...new Set(questions.map((question) => question.skillFamily))];
      const evidenceForms = [
        ...new Set(
          audits.flatMap((audit) =>
            audit.evidenceForm ? [audit.evidenceForm] : [],
          ),
        ),
      ];
      const evidence = outcome.implementationEvidence;
      if (
        !unit ||
        !draft ||
        audits.length < 3 ||
        new Set(questions.map((question) => question.answerType)).size < 2 ||
        JSON.stringify([...evidence.theorySectionIds].sort()) !==
          JSON.stringify(theoryIds.sort()) ||
        JSON.stringify([...evidence.workedExampleIds].sort()) !==
          JSON.stringify(exampleIds.sort()) ||
        JSON.stringify([...evidence.primaryQuestionCodes].sort()) !==
          JSON.stringify(codes.sort()) ||
        JSON.stringify([...evidence.skillFamilies].sort()) !==
          JSON.stringify(skillFamilies.sort()) ||
        JSON.stringify([...evidence.questionEvidenceForms].sort()) !==
          JSON.stringify(evidenceForms.sort())
      ) {
        errors.push(`Implementation evidence does not match runtime semantics: ${outcome.id}.`);
      }
    }
  }

  const expectedP0Targets = [...p0TargetOutcomeIds].sort();
  const declaredP0Targets = [...(inventory.p0Expansion?.targetOutcomeIds ?? [])].sort();
  if (
    inventory.p0Expansion?.baselineCount !== expectedP0Targets.length ||
    JSON.stringify(declaredP0Targets) !== JSON.stringify(expectedP0Targets)
  ) {
    errors.push("P0 baseline target list is inconsistent with the source-locked implementation.");
  } else {
    const closed: string[] = [];
    const remaining: string[] = [];
    for (const outcomeId of expectedP0Targets) {
      const outcome = inventory.outcomes.find((candidate) => candidate.id === outcomeId);
      if (!outcome) {
        errors.push(`P0 target is absent from official inventory: ${outcomeId}.`);
        continue;
      }
      const unit = outcome.mappedUnitIds
        .map((unitId) => unitBySlug.get(unitId))
        .find((candidate) => candidate?.officialOutcomeIds.includes(outcomeId));
      const draft = unit ? draftByUnit.get(unit.slug) : undefined;
      const primaryAudits =
        draft?.audits.filter(
          (audit) => audit.primaryOfficialOutcomeId === outcomeId,
        ) ?? [];
      const questionCodes = primaryAudits.map((audit) => audit.questionCode);
      const questions =
        draft?.questions.filter((question) => questionCodes.includes(question.code)) ?? [];
      const solutions =
        draft?.solutions.filter((solution) => questionCodes.includes(solution.questionCode)) ?? [];
      const theoryIds =
        unit?.theory
          .filter((section) => section.officialOutcomeIds?.includes(outcomeId))
          .map((section) => section.id) ?? [];
      const exampleIds =
        unit?.examples
          .filter((example) => example.officialOutcomeIds?.includes(outcomeId))
          .map((example) => example.id) ?? [];
      const evidence = outcome.implementationEvidence;
      const complete =
        outcome.statuses.includes("TEACHABLE_IMPLEMENTED") &&
        outcome.statuses.includes("VALIDATOR_PASSED") &&
        outcome.priority === null &&
        Boolean(unit) &&
        theoryIds.length > 0 &&
        exampleIds.length > 0 &&
        primaryAudits.length >= 3 &&
        new Set(questions.map((question) => question.answerType)).size >= 2 &&
        new Set(primaryAudits.map((audit) => audit.evidenceForm)).size >= 2 &&
        solutions.length === primaryAudits.length &&
        solutions.every(
          (solution) =>
            solution.steps.length >= 2 && solution.feedback.trim().length >= 24,
        ) &&
        evidence !== undefined &&
        JSON.stringify([...evidence.theorySectionIds].sort()) ===
          JSON.stringify([...theoryIds].sort()) &&
        JSON.stringify([...evidence.workedExampleIds].sort()) ===
          JSON.stringify([...exampleIds].sort()) &&
        JSON.stringify([...evidence.primaryQuestionCodes].sort()) ===
          JSON.stringify([...questionCodes].sort()) &&
        evidence.skillFamilies.length > 0 &&
        evidence.semanticTestIds.includes("tests/curriculum-p0-outcomes.test.ts");
      if (complete) closed.push(outcomeId);
      else {
        remaining.push(outcomeId);
        errors.push(`P0 outcome lacks complete semantic evidence: ${outcomeId}.`);
      }
    }
    if (
      JSON.stringify([...(inventory.p0Expansion?.closedOutcomeIds ?? [])].sort()) !==
        JSON.stringify(closed.sort()) ||
      JSON.stringify([...(inventory.p0Expansion?.remainingOutcomeIds ?? [])].sort()) !==
        JSON.stringify(remaining.sort())
    ) {
      errors.push("P0 closed/remaining totals are inconsistent with semantic evidence.");
    }
  }

  const mappedUnitIds = new Set(
    inventory.outcomes.flatMap((outcome) => outcome.mappedUnitIds),
  );
  const mappedQuestions = inventory.outcomes.reduce(
    (sum, outcome) => sum + outcome.questionCount,
    0,
  );
  if (
    mappedUnitIds.size !== units.length ||
    units.some((unit) => !mappedUnitIds.has(unit.slug)) ||
    inventory.mappedUnits !== units.length
  ) {
    errors.push("Not every current curriculum unit is mapped to the inventory.");
  }
  if (
    mappedQuestions !== units.length * 12 ||
    inventory.mappedQuestions !== mappedQuestions ||
    inventory.mappedSolutions !== mappedQuestions
  ) {
    errors.push("Question/solution mapping totals are inconsistent.");
  }

  const expectedByGrade = Array.from({ length: 9 }, (_, index) => index + 1).map(
    (grade) => {
      const gradeOutcomes = inventory.outcomes.filter(
        (outcome) => outcome.grade === grade,
      );
      const implemented = gradeOutcomes.filter((outcome) =>
        outcome.statuses.includes("TEACHABLE_IMPLEMENTED"),
      ).length;
      const partial = gradeOutcomes.filter((outcome) =>
        outcome.statuses.includes("PARTIALLY_COVERED"),
      ).length;
      const missing = gradeOutcomes.filter((outcome) =>
        outcome.statuses.includes("NOT_IMPLEMENTED"),
      ).length;
      const validated = gradeOutcomes.filter((outcome) =>
        outcome.statuses.includes("VALIDATOR_PASSED"),
      ).length;
      return {
        grade,
        totalOfficialOutcomes: gradeOutcomes.length,
        implementedOutcomes: implemented,
        partiallyCoveredOutcomes: partial,
        missingOutcomes: missing,
        validatedOutcomes: validated,
        officialOutcomeCoveragePercent:
          gradeOutcomes.length === 0
            ? 0
            : Number(((implemented / gradeOutcomes.length) * 100).toFixed(2)),
      };
    },
  );
  if (JSON.stringify(inventory.byGrade) !== JSON.stringify(expectedByGrade)) {
    errors.push("Official outcome grade summaries are inconsistent.");
  }
  const totalImplemented = expectedByGrade.reduce(
    (sum, grade) => sum + grade.implementedOutcomes,
    0,
  );
  const expectedOverall = Number(
    ((totalImplemented / inventory.totalOfficialOutcomes) * 100).toFixed(2),
  );
  if (
    inventory.overallOfficialOutcomeCoveragePercent !== expectedOverall ||
    inventory.fullOfficialOutcomeCoverage !==
      (totalImplemented === inventory.totalOfficialOutcomes)
  ) {
    errors.push("Overall official outcome coverage is inconsistent.");
  }

  return { valid: errors.length === 0, errors };
}
