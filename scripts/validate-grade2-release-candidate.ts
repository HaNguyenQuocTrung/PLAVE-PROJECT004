import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  canonicalJson,
  createGradeTwoReleaseArtifacts,
  createGradeTwoReleaseManifest,
  selectRecommendedGradeTwoReleaseCandidate,
  validateGradeTwoReleaseCandidate,
} from "../lib/content-engine/grade2-numbers-to-1000-release.ts";
import { parsePracticeVisualSpec } from "../lib/practice/visual.ts";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const manifestPath = new URL(
  "../content/releases/grade-2-numbers-to-1000/g2-numbers-to-1000-rc1/manifest.json",
  import.meta.url,
);
const migrationPath = new URL(
  "../supabase/migrations/0035_grade2_numbers_to_1000_release_candidate_draft.sql",
  import.meta.url,
);

function fail(message: string): never {
  throw new Error(message);
}

function read(relativePath: string) {
  return readFileSync(`${projectRoot}${relativePath}`, "utf8");
}

const selection = selectRecommendedGradeTwoReleaseCandidate();
const seed = selection.recommended.seed;
const artifacts = createGradeTwoReleaseArtifacts(seed);
const expectedManifest = createGradeTwoReleaseManifest(seed, artifacts);
const candidateValidation = validateGradeTwoReleaseCandidate(
  expectedManifest,
  artifacts,
);
if (!candidateValidation.valid) {
  fail(candidateValidation.errors.join("\n"));
}

const storedManifest: unknown = JSON.parse(
  readFileSync(manifestPath, "utf8"),
);
if (canonicalJson(storedManifest) !== canonicalJson(expectedManifest)) {
  fail("Frozen manifest không khớp generator/version/hash đã khóa.");
}

for (const question of artifacts.publicQuestions) {
  if (!parsePracticeVisualSpec(question.visual)) {
    fail(`${question.questionId}: runtime visual parser từ chối candidate.`);
  }
  const serialized = canonicalJson(question);
  if (
    /"(?:correctAnswer|solutionSteps|auditSource|expectedDisplayAnswer|distractorTagByOption|source)"/.test(
      serialized,
    )
  ) {
    fail(`${question.questionId}: client bundle chứa server-only field.`);
  }
}

const migrationNames = readdirSync(
  new URL("../supabase/migrations/", import.meta.url),
)
  .filter((name) => /^\d{4}_.+[.]sql$/.test(name))
  .sort();
if (
  !migrationNames.includes(
    "0035_grade2_numbers_to_1000_release_candidate_draft.sql",
  ) ||
  migrationNames.filter((name) => name.startsWith("0035_")).length !== 1
) {
  fail("Không tìm thấy đúng một frozen content migration draft 0035.");
}

const migration = readFileSync(migrationPath, "utf8");
const normalizedMigration = migration.trim().toLowerCase();
if (
  !normalizedMigration.startsWith("begin;") ||
  !normalizedMigration.endsWith("commit;") ||
  (migration.match(/\bbegin\s*;/gi) ?? []).length !== 1 ||
  (migration.match(/\bcommit\s*;/gi) ?? []).length !== 1
) {
  fail("Migration draft phải có đúng một BEGIN và một COMMIT.");
}
for (const required of [
  "g2-numbers-to-1000-rc1",
  "g2n1000-1.0.0-rc.1",
  expectedManifest.bundleHash,
  "private.is_valid_grade2_number_visual_spec",
  "NUMBER_RECOGNITION_TO_1000",
  "READ_WRITE_TO_1000",
  "PLACE_VALUE_TO_1000",
  "SEQUENCE_TO_1000",
  "published is false",
  "unit.published",
]) {
  if (!migration.includes(required)) {
    fail(`Migration draft thiếu invariant: ${required}`);
  }
}
if (
  /service[_-]?role/i.test(migration) ||
  /grant\s+select\s+on\s+(?:table\s+)?public[.]question_solutions/i.test(
    migration,
  ) ||
  /(?:insert\s+into|update|delete\s+from)\s+public[.](?:practice_attempts|practice_answers|diagnostic_attempts|diagnostic_answers)/i.test(
    migration,
  ) ||
  /update\s+public[.](?:learning_units|questions)/i.test(migration)
) {
  fail("Migration draft nới quyền hoặc mutation dữ liệu lịch sử.");
}

const releaseBankMatch = migration.match(
  /\$release_bank\$([\s\S]*?)\$release_bank\$::jsonb/,
);
if (!releaseBankMatch?.[1]) {
  fail("Không tìm thấy frozen release bank trong migration.");
}
const storedBank: unknown = JSON.parse(releaseBankMatch[1]);
const expectedBank = artifacts.publicQuestions.map((question, index) => {
  const solution = artifacts.serverSolutions[index];
  if (!solution || solution.questionId !== question.questionId) {
    fail(`${question.questionId}: solution mapping không ổn định.`);
  }
  return {
    code: question.questionId,
    question_type: question.answerType,
    prompt: question.prompt,
    options: question.options,
    visual_spec: question.visual,
    skill_code: question.skillFamilyId,
    difficulty: question.difficulty,
    display_order: question.displayOrder,
    correct_answer: solution.correctAnswer,
    solution_steps: solution.solutionSteps,
    explanation: solution.explanation,
    hint: solution.hint,
  };
});
if (canonicalJson(storedBank) !== canonicalJson(expectedBank)) {
  fail("Frozen release bank trong migration không khớp release artifacts.");
}

const objectivesMatch = migration.match(
  /\$objectives\$([\s\S]*?)\$objectives\$::jsonb/,
);
const lessonMatch = migration.match(/\$lesson\$([\s\S]*?)\$lesson\$::jsonb/);
if (!objectivesMatch?.[1] || !lessonMatch?.[1]) {
  fail("Migration thiếu frozen unit content.");
}
const migrationUnitContent = {
  title: artifacts.unitContent.title,
  description: artifacts.unitContent.description,
  learningObjectives: JSON.parse(objectivesMatch[1]) as unknown,
  lessonContent: JSON.parse(lessonMatch[1]) as unknown,
};
if (
  !migration.includes(`'${artifacts.unitContent.title}'`) ||
  !migration.includes(`'${artifacts.unitContent.description}'`) ||
  canonicalJson(migrationUnitContent) !==
    canonicalJson(artifacts.unitContent)
) {
  fail("Frozen lesson trong migration không khớp unit-content hash.");
}

const learningPage = read("app/learn/page.tsx");
const lessonPage = read("app/learn/[gradeSlug]/[lessonSlug]/page.tsx");
const personalizedServer = read("lib/personalized-path/server.ts");
const resultsPage = read("app/results/page.tsx");
for (const [name, source] of [
  ["learn", learningPage],
  ["lesson", lessonPage],
  ["personalized path", personalizedServer],
  ["results", resultsPage],
] as const) {
  const hasPublishedBoundary =
    /published["']?\s*,\s*true|[.]eq[(]["']published["']\s*,\s*true[)]/.test(
      source,
    ) ||
    (name === "results" &&
      /row[.]grade\s*===\s*access[.]grade\s*&&\s*row[.]published/.test(
        source,
      ));
  if (!hasPublishedBoundary) {
    fail(`${name}: thiếu published-only boundary.`);
  }
}

const rpcMigration = read("supabase/migrations/0034_multi_grade_runtime_foundation.sql");
if (!/unit[.]published/.test(rpcMigration) || !/auth[.]uid[(][)]/.test(rpcMigration)) {
  fail("Practice RPC hiện tại không fail-closed cho DRAFT unit.");
}

console.log(
  [
    "Grade 2 release-candidate preflight: PASS",
    `Label: ${selection.label}`,
    `Seed: ${seed}`,
    `Score: ${selection.recommended.score}/${selection.recommended.maximumScore}`,
    `Content version: ${expectedManifest.contentVersion}`,
    `Questions: ${artifacts.publicQuestions.length}`,
    `Bundle SHA-256: ${expectedManifest.bundleHash}`,
    "Student visibility: HIDDEN",
    "Publication: DRAFT",
    "Migration 0035: static validation only; NOT APPLIED",
  ].join("\n"),
);
