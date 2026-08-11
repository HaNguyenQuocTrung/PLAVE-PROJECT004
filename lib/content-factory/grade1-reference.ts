import type { GradePack, LegacyAssetReference } from "./types.ts";
import { getSkillLabel, getUnitSkillCodes } from "../practice/catalog.ts";

export const gradeOneLegacyFiles = [
  "supabase/migrations/0004_grade1_numbers_to_10.sql",
  "supabase/migrations/0018_grade1_addition_within_10.sql",
  "supabase/migrations/0019_grade1_subtraction_within_10.sql",
  "supabase/migrations/0020_grade1_numbers_to_20.sql",
  "supabase/migrations/0021_grade1_addition_within_20_no_carry.sql",
  "supabase/migrations/0023_grade1_subtraction_within_20_no_borrow.sql",
  "supabase/migrations/0024_grade1_numbers_to_100.sql",
  "supabase/migrations/0025_grade1_addition_within_100_no_carry.sql",
  "supabase/migrations/0026_grade1_subtraction_within_100_no_borrow.sql",
  "supabase/migrations/0027_grade1_basic_geometry_and_position.sql",
  "supabase/migrations/0028_grade1_length_measurement.sql",
  "supabase/migrations/0029_grade1_time_clock_calendar.sql",
  "supabase/migrations/0030_grade1_cube_and_cuboid.sql",
  "supabase/migrations/0031_grade1_diagnostic.sql",
] as const;

export const gradeOneLegacyAsset: LegacyAssetReference = {
  kind: "IMMUTABLE_GRADE1_SQL_RELEASE",
  files: gradeOneLegacyFiles,
  expected: { units: 13, questions: 312, solutions: 312, diagnosticRows: 24 },
  canonicalValidator: "scripts/validate-grade1-release.mjs",
};

const gradeOneUnitSlugs = [
  "grade-1-numbers-to-10", "grade-1-addition-within-10", "grade-1-subtraction-within-10",
  "grade-1-numbers-to-20", "grade-1-addition-within-20-no-carry", "grade-1-subtraction-within-20-no-borrow",
  "grade-1-numbers-to-100", "grade-1-addition-within-100-no-carry", "grade-1-subtraction-within-100-no-borrow",
  "grade-1-basic-geometry-and-position", "grade-1-length-measurement", "grade-1-time-clock-calendar", "grade-1-cube-and-cuboid",
] as const;
const gradeOneSkillCodes = [...new Set(gradeOneUnitSlugs.flatMap((slug) => getUnitSkillCodes(slug)))];

// This pack maps the existing SQL-authored release by reference. It intentionally
// does not deserialize and rewrite legacy questions into a new production format.
export const gradeOneReferencePack: GradePack = {
  schemaVersion: "content-factory-grade-pack-v1",
  grade: 1,
  packId: "grade-1-legacy-reference",
  packVersion: "legacy-sql-through-0031",
  immutableReference: true,
  testOnly: false,
  locale: "vi-VN",
  unicodeNormalization: "NFC",
  sources: [{
    id: "grade-1-repository-sql-release",
    status: "VERIFIED_REPOSITORY_SOURCE",
    repositoryEvidence: [...gradeOneLegacyFiles, "scripts/validate-grade1-release.mjs"],
    note: "Published legacy Grade 1 release; mapped without mutation.",
  }],
  domains: [{ id: "g1-domain-legacy-mixed", grade: 1, displayName: "Miền nội dung kế thừa", sourceReferenceIds: ["grade-1-repository-sql-release"] }],
  units: [], knowledgeNodes: [],
  skills: gradeOneSkillCodes.map((code) => ({ id: `g1-skill-${code.toLowerCase().replaceAll("_", "-")}`, grade: 1, displayName: getSkillLabel(code), domainId: "g1-domain-legacy-mixed", objectiveIds: [], sourceReferenceIds: ["grade-1-repository-sql-release"] })),
  objectives: [],
  prerequisites: [], blueprints: [], questions: [], explanations: [],
  evidenceReceipts: [{ id: "grade-1-legacy-release-proof", entityId: "grade-1-legacy-reference", check: "REGRESSION_TESTS", status: "PASSED", evidence: "Canonical validator proves 13/312/312; migration 0031 proves 24 diagnostic rows." }],
  candidate: null,
  adaptivePolicy: { version: "legacy-fixed-practice", status: "NOT_DEFINED" },
  release: { publication: "PUBLISHED", visibility: "VISIBLE", pilotEnabled: false, runtimeEnabled: true, retentionEnabled: false },
  legacyAsset: gradeOneLegacyAsset,
};
