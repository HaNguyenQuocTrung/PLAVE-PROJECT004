import inventoryJson from "../docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json" with {
  type: "json",
};
import { buildUniversalCurriculumRelease } from "../lib/curriculum-runtime/release.ts";
import {
  assertProject004ContentSqlContract,
  project004ContentProgressMarkers,
} from "./project004-content-sql-contract.ts";
import { buildProject004ContentPreconditionSql } from "./project004-content-precondition-contract.ts";

function sqlText(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlJson(value: unknown) {
  return `${sqlText(JSON.stringify(value))}::jsonb`;
}

function sqlTextArray(values: readonly string[]) {
  return `array[${values.map(sqlText).join(",")}]::text[]`;
}

function insertBatches(
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

export function buildProject004RemoteDevCurriculumSql() {
  const release = buildUniversalCurriculumRelease();
  const inventory = inventoryJson as Readonly<{
    outcomes: readonly Readonly<{
      id: string;
      conciseParaphrase: string;
    }>[];
  }>;
  const distinctOutcomes = new Set(
    release.questions.flatMap((question) =>
      question.officialOutcomeIds,
    ),
  );
  if (
    release.units.length !== 171 ||
    release.questions.length !== 2052 ||
    release.solutions.length !== 2052 ||
    inventory.outcomes.length !== 546 ||
    distinctOutcomes.size !== 546
  ) {
    throw new Error("REMOTE_CONTENT_SOURCE_COUNT_MISMATCH");
  }

  const outcomeTitles = new Map(
    inventory.outcomes.map((outcome) => [
      outcome.id,
      outcome.conciseParaphrase,
    ]),
  );
  const releaseRow = release.release;
  const unitSql = insertBatches(
    release.units.map(
      (unit) =>
        `(${[
          sqlText(unit.releaseId),
          sqlText(unit.unitId),
          unit.grade,
          sqlText(unit.domain),
          sqlText(unit.title),
          sqlText(unit.description),
          sqlJson(unit.learningGoals),
          sqlJson(unit.theory),
          sqlJson(unit.workedExamples),
          sqlTextArray(unit.officialOutcomeIds),
          sqlTextArray(unit.skillIds),
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
  const questionSql = insertBatches(
    release.questions.map(
      (question) =>
        `(${[
          sqlText(question.releaseId),
          sqlText(question.unitId),
          sqlText(question.questionId),
          question.displayOrder,
          sqlText(question.answerType),
          sqlText(question.prompt),
          question.options === null
            ? "null"
            : sqlJson(question.options),
          sqlJson(question.visual),
          sqlText(question.cognitiveLevel),
          sqlTextArray(question.officialOutcomeIds),
          sqlTextArray(question.officialOutcomeTitles),
          sqlText(question.skillId),
          sqlText(question.skillTitle),
          sqlText(question.questionPayloadHash),
        ].join(",")})`,
    ),
    `insert into public.curriculum_release_questions (
      release_id, unit_id, question_id, display_order, answer_type,
      prompt, options, visual, cognitive_level, official_outcome_ids,
      official_outcome_titles, skill_id, skill_title, question_payload_hash
    )`,
  );
  const solutionSql = insertBatches(
    release.solutions.map(
      (solution) =>
        `(${[
          sqlText(solution.releaseId),
          sqlText(solution.questionId),
          sqlText(solution.normalizedCorrectAnswer),
          sqlText(solution.correctAnswer),
          sqlJson(solution.solutionSteps),
          sqlText(solution.feedback),
          sqlText(solution.solutionPayloadHash),
        ].join(",")})`,
    ),
    `insert into private.curriculum_release_solutions (
      release_id, question_id, normalized_correct_answer, correct_answer,
      solution_steps, feedback, solution_payload_hash
    )`,
  );

  const unitById = new Map(
    release.units.map((unit) => [unit.unitId, unit]),
  );
  const legacyMappingRows = Object.entries(
    legacyToPreviewUnits,
  ).flatMap(([legacyUnitSlug, previewUnitIds]) => {
    const outcomeIds = [
      ...new Set(
        previewUnitIds.flatMap((unitId) => {
          const unit = unitById.get(unitId);
          if (!unit) {
            throw new Error("REMOTE_CONTENT_MAPPING_MISSING");
          }
          return unit.officialOutcomeIds;
        }),
      ),
    ];
    return outcomeIds.map(
      (outcomeId) =>
        `(${[
          sqlText(releaseRow.releaseId),
          sqlText(legacyUnitSlug),
          sqlText(outcomeId),
          sqlText(
            outcomeTitles.get(outcomeId) ??
              "Mục tiêu học tập chính thức của bài",
          ),
          sqlText("LEGACY_UNIT_ALIGNED_PRODUCT_MAPPING_V1"),
        ].join(",")})`,
    );
  });
  const legacyMappingSql = insertBatches(
    legacyMappingRows,
    `insert into public.curriculum_legacy_grade1_outcome_mappings (
      release_id, legacy_unit_slug, official_outcome_id,
      official_outcome_title, mapping_basis
    )`,
  );

  const sql = `
\\set ON_ERROR_STOP on
begin;
\\echo ${project004ContentProgressMarkers.sqlExecutionStarted}
set local statement_timeout = '120s';
${buildProject004ContentPreconditionSql()}
\\echo ${project004ContentProgressMarkers.preconditionPassed}
\\echo ${project004ContentProgressMarkers.releaseInsertStarted}
insert into public.curriculum_releases (
  release_id, content_version, curriculum_source_fingerprint,
  generator_version, deterministic_seed, mastery_policy_version,
  public_payload_sha256, private_solution_sha256, bundle_sha256,
  status, activation_state, activated_at
) values (
  ${sqlText(releaseRow.releaseId)},
  ${sqlText(releaseRow.contentVersion)},
  ${sqlText(releaseRow.curriculumSourceFingerprint)},
  ${sqlText(releaseRow.generatorVersion)},
  ${sqlText(releaseRow.deterministicSeed)},
  ${sqlText(releaseRow.masteryPolicyVersion)},
  ${sqlText(release.hashes.publicPayloadSha256)},
  ${sqlText(release.hashes.privateSolutionSha256)},
  ${sqlText(release.hashes.bundleSha256)},
  'DRAFT',
  'INACTIVE',
  null
);
\\echo ${project004ContentProgressMarkers.unitInsertStarted}
${unitSql}
\\echo ${project004ContentProgressMarkers.questionInsertStarted}
${questionSql}
\\echo ${project004ContentProgressMarkers.solutionInsertStarted}
${solutionSql}
\\echo ${project004ContentProgressMarkers.mappingInsertStarted}
${legacyMappingSql}
\\echo ${project004ContentProgressMarkers.validationStarted}
do $validation$
declare
  v_releases integer;
  v_units integer;
  v_questions integer;
  v_solutions integer;
  v_outcomes integer;
begin
  select count(*) into v_releases
  from public.curriculum_releases
  where release_id = ${sqlText(releaseRow.releaseId)}
    and content_version = ${sqlText(releaseRow.contentVersion)}
    and curriculum_source_fingerprint =
      ${sqlText(releaseRow.curriculumSourceFingerprint)}
    and generator_version = ${sqlText(releaseRow.generatorVersion)}
    and deterministic_seed = ${sqlText(releaseRow.deterministicSeed)}
    and mastery_policy_version =
      ${sqlText(releaseRow.masteryPolicyVersion)}
    and public_payload_sha256 =
      ${sqlText(release.hashes.publicPayloadSha256)}
    and private_solution_sha256 =
      ${sqlText(release.hashes.privateSolutionSha256)}
    and bundle_sha256 = ${sqlText(release.hashes.bundleSha256)}
    and status = 'DRAFT'
    and activation_state = 'INACTIVE';
  select count(*) into v_units
  from public.curriculum_release_units
  where release_id = ${sqlText(releaseRow.releaseId)};
  select count(*) into v_questions
  from public.curriculum_release_questions
  where release_id = ${sqlText(releaseRow.releaseId)};
  select count(*) into v_solutions
  from private.curriculum_release_solutions
  where release_id = ${sqlText(releaseRow.releaseId)};
  select count(distinct outcome_id) into v_outcomes
  from public.curriculum_release_questions as question
  cross join unnest(question.official_outcome_ids)
    as expanded(outcome_id)
  where question.release_id = ${sqlText(releaseRow.releaseId)};
  if
    v_releases <> 1
    or v_units <> 171
    or v_questions <> 2052
    or v_solutions <> 2052
    or v_outcomes <> 546
  then
    raise exception 'REMOTE_CONTENT:COUNT_MISMATCH';
  end if;
  if exists (
    select 1
    from public.curriculum_release_questions as question
    left join private.curriculum_release_solutions as solution
      on solution.release_id = question.release_id
      and solution.question_id = question.question_id
    where question.release_id = ${sqlText(releaseRow.releaseId)}
      and solution.question_id is null
  ) then
    raise exception 'REMOTE_CONTENT:SOLUTION_GAP';
  end if;
end;
$validation$;
\\echo ${project004ContentProgressMarkers.validationPassed}
\\echo ${project004ContentProgressMarkers.commitStarted}
commit;
\\echo ${project004ContentProgressMarkers.commitPassed}
`;

  assertProject004ContentSqlContract(sql);

  return {
    sql,
    counts: {
      releases: 1,
      units: release.units.length,
      publicQuestions: release.questions.length,
      privateSolutions: release.solutions.length,
      officialOutcomes: inventory.outcomes.length,
    },
    hashes: {
      publicPayloadSha256: release.hashes.publicPayloadSha256,
      privateSolutionSha256:
        release.hashes.privateSolutionSha256,
      bundleSha256: release.hashes.bundleSha256,
    },
  };
}
