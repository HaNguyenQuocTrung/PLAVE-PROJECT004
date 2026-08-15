import type { GradesTwoToNineReleaseMode } from "./release-mode.ts";

export type ReleasedCatalogUnit = Readonly<{
  unitId: string;
  grade: number;
  domain: string;
  title: string;
  description: string;
  learningGoals: readonly string[];
  totalQuestions: number;
  displayOrder: number;
}>;

export type ReleasedUnitDetail = ReleasedCatalogUnit & Readonly<{
  theory: readonly Readonly<{
    title: string;
    explanation: readonly string[];
  }>[];
  workedExamples: readonly Readonly<{
    title?: string;
    prompt?: string;
    steps?: readonly string[];
    answer?: string;
  }>[];
}>;

export type ReleasedCatalog = Readonly<{
  grade: number;
  releaseMode: Exclude<GradesTwoToNineReleaseMode, "HIDDEN">;
  candidateId: string;
  candidateVersion: string;
  candidateBundleSha256: string;
  policyVersion: string;
  units: readonly ReleasedCatalogUnit[];
}>;

type UnknownRecord = Record<string, unknown>;
const record = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const textArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every(text);

function parseCatalogUnit(value: unknown): ReleasedCatalogUnit | null {
  if (!record(value)
    || !text(value.unit_id)
    || !Number.isInteger(value.grade)
    || !text(value.domain)
    || !text(value.title)
    || !text(value.description)
    || !textArray(value.learning_goals)
    || !Number.isInteger(value.total_questions)
    || (value.total_questions as number) < 1
    || !Number.isInteger(value.display_order)) return null;
  return {
    unitId: value.unit_id,
    grade: value.grade as number,
    domain: value.domain,
    title: value.title,
    description: value.description,
    learningGoals: value.learning_goals,
    totalQuestions: value.total_questions as number,
    displayOrder: value.display_order as number,
  };
}

export function parseReleasedCatalog(value: unknown): ReleasedCatalog | null {
  if (!record(value)
    || !Number.isInteger(value.grade)
    || !['PILOT', 'PUBLIC'].includes(String(value.release_mode))
    || !text(value.candidate_id)
    || !text(value.candidate_version)
    || !text(value.candidate_bundle_sha256)
    || !/^[0-9a-f]{64}$/.test(value.candidate_bundle_sha256)
    || !text(value.policy_version)
    || !Array.isArray(value.units)) return null;
  const units = value.units.map(parseCatalogUnit);
  if (units.some((unit) => unit === null)) return null;
  return {
    grade: value.grade as number,
    releaseMode: value.release_mode as "PILOT" | "PUBLIC",
    candidateId: value.candidate_id,
    candidateVersion: value.candidate_version,
    candidateBundleSha256: value.candidate_bundle_sha256,
    policyVersion: value.policy_version,
    units: units as ReleasedCatalogUnit[],
  };
}

export function parseReleasedUnitDetail(value: unknown): ReleasedUnitDetail | null {
  const unit = parseCatalogUnit(value);
  if (!unit || !record(value) || !Array.isArray(value.theory) || !Array.isArray(value.worked_examples)) return null;
  const theory = value.theory.map((section) => {
    if (!record(section) || !text(section.title) || !textArray(section.explanation)) return null;
    return { title: section.title, explanation: section.explanation };
  });
  if (theory.length === 0 || theory.some((section) => section === null)) return null;
  return { ...unit, theory: theory as ReleasedUnitDetail["theory"], workedExamples: value.worked_examples as ReleasedUnitDetail["workedExamples"] };
}
