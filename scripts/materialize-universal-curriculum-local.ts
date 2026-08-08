import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import inventoryJson from "../docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json" with {
  type: "json",
};
import { buildUniversalCurriculumRelease } from "../lib/curriculum-runtime/release.ts";
import {
  assertProject004Workspace,
} from "./project004-identity.ts";

assertProject004Workspace();
const databaseUrl = process.env.PLAVE_LOCAL_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("PLAVE_LOCAL_DATABASE_URL is required.");
}

const parsedUrl = new URL(databaseUrl);
if (
  !["postgres:", "postgresql:"].includes(parsedUrl.protocol) ||
  !["127.0.0.1", "localhost", "::1"].includes(parsedUrl.hostname)
) {
  throw new Error("Only a disposable loopback PostgreSQL database is allowed.");
}

const activate =
  process.env.PLAVE_LOCAL_CURRICULUM_ACTIVATE === "true";
if (
  process.env.PLAVE_LOCAL_CURRICULUM_ACTIVATE !== undefined &&
  !["true", "false"].includes(
    process.env.PLAVE_LOCAL_CURRICULUM_ACTIVATE,
  )
) {
  throw new Error("PLAVE_LOCAL_CURRICULUM_ACTIVATE must be true or false.");
}

const release = buildUniversalCurriculumRelease();
const inventory = inventoryJson as Readonly<{
  outcomes: readonly Readonly<{
    id: string;
    conciseParaphrase: string;
  }>[];
}>;
const outcomeTitles = new Map(
  inventory.outcomes.map((outcome) => [
    outcome.id,
    outcome.conciseParaphrase,
  ]),
);

function text(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function json(value: unknown) {
  return `${text(JSON.stringify(value))}::jsonb`;
}

function textArray(values: readonly string[]) {
  return `array[${values.map(text).join(",")}]::text[]`;
}

function valuesBatches(
  rows: readonly string[],
  insertPrefix: string,
  batchSize = 100,
) {
  const statements: string[] = [];
  for (let index = 0; index < rows.length; index += batchSize) {
    statements.push(
      `${insertPrefix}\nvalues\n${rows
        .slice(index, index + batchSize)
        .join(",\n")};`,
    );
  }
  return statements.join("\n");
}

const releaseRow = release.release;
const status = activate ? "ACTIVE" : "DRAFT";
const activationState = activate ? "ACTIVE" : "INACTIVE";
const activatedAt = activate ? "now()" : "null";

const unitSql = valuesBatches(
  release.units.map(
    (unit) =>
      `(${[
        text(unit.releaseId),
        text(unit.unitId),
        unit.grade,
        text(unit.domain),
        text(unit.title),
        text(unit.description),
        json(unit.learningGoals),
        json(unit.theory),
        json(unit.workedExamples),
        textArray(unit.officialOutcomeIds),
        textArray(unit.skillIds),
        unit.displayOrder,
        unit.totalQuestions,
      ].join(",")})`,
  ),
  `insert into public.curriculum_release_units (
    release_id, unit_id, grade, domain, title, description,
    learning_goals, theory, worked_examples, official_outcome_ids,
    skill_ids, display_order, total_questions
  )`,
);

const questionSql = valuesBatches(
  release.questions.map(
    (question) =>
      `(${[
        text(question.releaseId),
        text(question.unitId),
        text(question.questionId),
        question.displayOrder,
        text(question.answerType),
        text(question.prompt),
        question.options === null ? "null" : json(question.options),
        json(question.visual),
        text(question.cognitiveLevel),
        textArray(question.officialOutcomeIds),
        textArray(question.officialOutcomeTitles),
        text(question.skillId),
        text(question.skillTitle),
        text(question.questionPayloadHash),
      ].join(",")})`,
  ),
  `insert into public.curriculum_release_questions (
    release_id, unit_id, question_id, display_order, answer_type,
    prompt, options, visual, cognitive_level, official_outcome_ids,
    official_outcome_titles, skill_id, skill_title, question_payload_hash
  )`,
);

const solutionSql = valuesBatches(
  release.solutions.map(
    (solution) =>
      `(${[
        text(solution.releaseId),
        text(solution.questionId),
        text(solution.normalizedCorrectAnswer),
        text(solution.correctAnswer),
        json(solution.solutionSteps),
        text(solution.feedback),
        text(solution.solutionPayloadHash),
      ].join(",")})`,
  ),
  `insert into private.curriculum_release_solutions (
    release_id, question_id, normalized_correct_answer, correct_answer,
    solution_steps, feedback, solution_payload_hash
  )`,
);

const legacyToPreviewUnits: Readonly<Record<string, readonly string[]>> = {
  "grade-1-numbers-to-10": ["grade-1-numbers-to-10"],
  "grade-1-addition-within-10": [
    "grade-1-number-operations-to-100-preview",
  ],
  "grade-1-subtraction-within-10": [
    "grade-1-number-operations-to-100-preview",
  ],
  "grade-1-numbers-to-20": ["grade-1-number-foundations-p0"],
  "grade-1-addition-within-20-no-carry": [
    "grade-1-number-operations-to-100-preview",
  ],
  "grade-1-subtraction-within-20-no-borrow": [
    "grade-1-number-operations-to-100-preview",
  ],
  "grade-1-numbers-to-100": ["grade-1-number-foundations-p0"],
  "grade-1-addition-within-100-no-carry": [
    "grade-1-number-operations-to-100-preview",
  ],
  "grade-1-subtraction-within-100-no-borrow": [
    "grade-1-number-operations-to-100-preview",
  ],
  "grade-1-basic-geometry-and-position": [
    "grade-1-shapes",
    "grade-1-shape-and-informal-measure-p0",
  ],
  "grade-1-length-measurement": ["grade-1-length-centimetres"],
  "grade-1-time-clock-calendar": ["grade-1-clock-week-calendar-p1"],
  "grade-1-cube-and-cuboid": [
    "grade-1-shapes",
    "grade-1-shape-and-informal-measure-p0",
  ],
};

const unitById = new Map(release.units.map((unit) => [unit.unitId, unit]));
const legacyMappingRows = Object.entries(legacyToPreviewUnits).flatMap(
  ([legacyUnitSlug, previewUnitIds]) => {
    const outcomeIds = [
      ...new Set(
        previewUnitIds.flatMap((unitId) => {
          const unit = unitById.get(unitId);
          if (!unit) throw new Error(`Missing mapped unit: ${unitId}`);
          return unit.officialOutcomeIds;
        }),
      ),
    ];
    return outcomeIds.map(
      (outcomeId) =>
        `(${[
          text(releaseRow.releaseId),
          text(legacyUnitSlug),
          text(outcomeId),
          text(
            outcomeTitles.get(outcomeId) ??
              "Mục tiêu học tập chính thức của bài",
          ),
          text("LEGACY_UNIT_ALIGNED_PRODUCT_MAPPING_V1"),
        ].join(",")})`,
    );
  },
);

const legacyMappingSql = valuesBatches(
  legacyMappingRows,
  `insert into public.curriculum_legacy_grade1_outcome_mappings (
    release_id, legacy_unit_slug, official_outcome_id,
    official_outcome_title, mapping_basis
  )`,
);

const sql = `
\\set ON_ERROR_STOP on
begin;
insert into public.curriculum_releases (
  release_id, content_version, curriculum_source_fingerprint,
  generator_version, deterministic_seed, mastery_policy_version,
  public_payload_sha256, private_solution_sha256, bundle_sha256,
  status, activation_state, activated_at
) values (
  ${text(releaseRow.releaseId)},
  ${text(releaseRow.contentVersion)},
  ${text(releaseRow.curriculumSourceFingerprint)},
  ${text(releaseRow.generatorVersion)},
  ${text(releaseRow.deterministicSeed)},
  ${text(releaseRow.masteryPolicyVersion)},
  ${text(release.hashes.publicPayloadSha256)},
  ${text(release.hashes.privateSolutionSha256)},
  ${text(release.hashes.bundleSha256)},
  ${text(status)},
  ${text(activationState)},
  ${activatedAt}
);
${unitSql}
${questionSql}
${solutionSql}
${legacyMappingSql}
do $validate$
declare
  v_units integer;
  v_questions integer;
  v_solutions integer;
begin
  select count(*) into v_units
  from public.curriculum_release_units
  where release_id = ${text(releaseRow.releaseId)};
  select count(*) into v_questions
  from public.curriculum_release_questions
  where release_id = ${text(releaseRow.releaseId)};
  select count(*) into v_solutions
  from private.curriculum_release_solutions
  where release_id = ${text(releaseRow.releaseId)};
  if v_units <> 171 or v_questions <> 2052 or v_solutions <> 2052 then
    raise exception 'CURRICULUM:MATERIALIZATION_COUNT_MISMATCH';
  end if;
  if exists (
    select 1
    from public.curriculum_release_questions as question
    left join private.curriculum_release_solutions as solution
      on solution.release_id = question.release_id
      and solution.question_id = question.question_id
    where question.release_id = ${text(releaseRow.releaseId)}
      and solution.question_id is null
  ) then
    raise exception 'CURRICULUM:MATERIALIZATION_SOLUTION_GAP';
  end if;
end;
$validate$;
commit;
`;

const temporaryDirectory = mkdtempSync(
  join(tmpdir(), "plave-universal-curriculum-"),
);
const sqlPath = join(temporaryDirectory, "materialize.sql");
try {
  writeFileSync(sqlPath, sql, { encoding: "utf8", mode: 0o600 });
  const postgresEnvironment = { ...process.env };
  delete postgresEnvironment.PLAVE_LOCAL_DATABASE_URL;
  postgresEnvironment.PGHOST = parsedUrl.hostname;
  postgresEnvironment.PGPORT = parsedUrl.port;
  postgresEnvironment.PGDATABASE = parsedUrl.pathname.slice(1);
  postgresEnvironment.PGUSER = decodeURIComponent(parsedUrl.username);
  postgresEnvironment.PGPASSWORD = decodeURIComponent(parsedUrl.password);
  const result = spawnSync(
    "psql",
    ["--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--file", sqlPath],
    {
      env: postgresEnvironment,
      stdio: ["ignore", "inherit", "inherit"],
    },
  );
  if (result.status !== 0) {
    throw new Error("Local curriculum materialization failed.");
  }
  console.log(
    `Local curriculum materialization: PASS (${release.units.length}/${release.questions.length}/${release.solutions.length}, ${activationState})`,
  );
  console.log(`Bundle SHA-256: ${release.hashes.bundleSha256}`);
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
