import {
  curriculumOutcomes,
  curriculumSources,
  curriculumUnits,
  domainCoverage,
} from "./registry.ts";
import { generatePreviewUnit } from "./engine.ts";
import {
  curriculumGrades,
  type CurriculumUnit,
  type CurriculumValidationResult,
  type PreviewUnitDraft,
} from "./types.ts";

function duplicates(values: readonly string[]) {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

export function validateCurriculumRegistry(
  units: readonly CurriculumUnit[] = curriculumUnits,
): CurriculumValidationResult {
  const errors: string[] = [];
  const unitBySlug = new Map(units.map((unit) => [unit.slug, unit]));
  const outcomeById = new Map(
    curriculumOutcomes.map((outcome) => [outcome.id, outcome]),
  );
  const sourceIds = new Set(curriculumSources.map((source) => source.id));

  for (const grade of curriculumGrades) {
    if (!units.some((unit) => unit.grade === grade)) {
      errors.push(`Grade ${grade} has no representative unit.`);
    }
    if (!domainCoverage.some((entry) => entry.grade === grade)) {
      errors.push(`Grade ${grade} has no domain coverage entries.`);
    }
  }
  for (const slug of duplicates(units.map((unit) => unit.slug))) {
    errors.push(`Duplicate unit slug: ${slug}.`);
  }
  for (const outcomeId of duplicates(curriculumOutcomes.map((item) => item.id))) {
    errors.push(`Duplicate outcome ID: ${outcomeId}.`);
  }
  for (const skill of duplicates(units.flatMap((unit) => unit.skillFamilies))) {
    errors.push(`Skill family is not uniquely owned: ${skill}.`);
  }

  for (const outcome of curriculumOutcomes) {
    const owners = units.filter((unit) => unit.outcomeIds.includes(outcome.id));
    if (owners.length === 0) {
      errors.push(`Orphan outcome: ${outcome.id}.`);
    }
    if (owners.some((unit) => unit.grade !== outcome.grade)) {
      errors.push(`Grade boundary violation for outcome ${outcome.id}.`);
    }
  }

  for (const unit of units) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(unit.slug)) {
      errors.push(`Unsafe unit slug: ${unit.slug}.`);
    }
    if (unit.outcomeIds.length === 0 || unit.skillFamilies.length < 3) {
      errors.push(`${unit.slug} must map outcomes and at least three skills.`);
    }
    if (
      unit.sourceReferenceIds.length === 0 ||
      unit.sourceReferenceIds.some((id) => !sourceIds.has(id))
    ) {
      errors.push(`${unit.slug} has missing source status.`);
    }
    for (const outcomeId of unit.outcomeIds) {
      const outcome = outcomeById.get(outcomeId);
      if (!outcome) errors.push(`${unit.slug} references unknown outcome ${outcomeId}.`);
      else if (outcome.grade !== unit.grade) {
        errors.push(`${unit.slug} crosses the outcome grade boundary.`);
      }
    }
    for (const prerequisiteSlug of unit.prerequisiteSlugs) {
      const prerequisite = unitBySlug.get(prerequisiteSlug);
      if (!prerequisite) {
        errors.push(`${unit.slug} has unknown prerequisite ${prerequisiteSlug}.`);
      } else if (prerequisite.grade >= unit.grade) {
        errors.push(`${unit.slug} has a non-earlier-grade prerequisite.`);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(slug: string) {
    if (visiting.has(slug)) {
      errors.push(`Prerequisite cycle includes ${slug}.`);
      return;
    }
    if (visited.has(slug)) return;
    visiting.add(slug);
    for (const prerequisite of unitBySlug.get(slug)?.prerequisiteSlugs ?? []) {
      if (unitBySlug.has(prerequisite)) visit(prerequisite);
    }
    visiting.delete(slug);
    visited.add(slug);
  }
  for (const unit of units) visit(unit.slug);

  return { valid: errors.length === 0, errors };
}

export function validatePreviewUnit(
  draft: PreviewUnitDraft,
): CurriculumValidationResult {
  const errors: string[] = [];
  const { unit, questions, solutions, audits } = draft;
  if (draft.generationStatus !== "DRAFT_GENERATED") {
    errors.push("Generated unit must remain DRAFT_GENERATED.");
  }
  if (unit.theory.length < 4 || unit.theory.length > 6) {
    errors.push(`${unit.slug} must have 4–6 theory sections.`);
  }
  if (unit.examples.length < 2) {
    errors.push(`${unit.slug} must have at least two worked examples.`);
  }
  if (questions.length < 12) {
    errors.push(`${unit.slug} must have at least 12 questions.`);
  }
  if (new Set(questions.map((question) => question.skillFamily)).size < 3) {
    errors.push(`${unit.slug} must exercise at least three skill families.`);
  }
  if (!questions.some((question) => question.answerType === "MULTIPLE_CHOICE")) {
    errors.push(`${unit.slug} needs multiple-choice practice.`);
  }
  if (!questions.some((question) => question.answerType !== "MULTIPLE_CHOICE")) {
    errors.push(`${unit.slug} needs typed-input practice.`);
  }
  if (new Set(questions.map((question) => question.code)).size !== questions.length) {
    errors.push(`${unit.slug} has duplicate question codes.`);
  }

  const solutionCodes = new Set(solutions.map((solution) => solution.questionCode));
  const auditCodes = new Set(audits.map((audit) => audit.questionCode));
  for (const question of questions) {
    if (question.visual.description.trim().length < 24) {
      errors.push(`${question.code} needs an accessibility description.`);
    }
    if (!solutionCodes.has(question.code) || !auditCodes.has(question.code)) {
      errors.push(`${question.code} lacks separated solution or audit data.`);
    }
    if (question.options) {
      const labels = question.options.map((option) => option.label);
      if (question.options.length !== 4 || new Set(labels).size !== labels.length) {
        errors.push(`${question.code} has duplicate or incomplete options.`);
      }
    }
    if (
      Object.prototype.hasOwnProperty.call(question, "correctAnswer") ||
      Object.prototype.hasOwnProperty.call(question, "solutionSteps")
    ) {
      errors.push(`${question.code} leaks solution data in the public question.`);
    }
  }
  for (const solution of solutions) {
    if (!solution.correctAnswer || solution.steps.length < 2) {
      errors.push(`${solution.questionCode} has an incomplete solution.`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateAllPreviewUnits(): CurriculumValidationResult {
  const errors = curriculumUnits.flatMap(
    (unit) => validatePreviewUnit(generatePreviewUnit(unit.slug)).errors,
  );
  return { valid: errors.length === 0, errors };
}
