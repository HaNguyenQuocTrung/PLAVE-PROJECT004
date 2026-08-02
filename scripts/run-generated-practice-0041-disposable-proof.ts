import { createHmac, randomBytes } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import {
  generateOnDemandAttemptSnapshot,
} from "../lib/curriculum/on-demand-generation.ts";
import {
  buildUniversalCurriculumRelease,
} from "../lib/curriculum-runtime/release.ts";
import {
  reserveDisposablePorts,
} from "./project004-disposable-port-reservation.ts";
import {
  buildDisposableConfig,
} from "./project004-disposable-migration-workspace.ts";
import {
  copyGeneratedPersistenceMigrationInventory,
} from "./project004-generated-persistence-migration-inventory.ts";
import { assertProject004Workspace } from "./project004-identity.ts";
import { runManagedChild } from "./project004-managed-child-process.ts";
import {
  assertDisposableCleanupScope,
  classifyDisposableStartFailure,
  stopDisposableStack,
} from "./run-project004-clean-disposable-proof.ts";

const studentId = "61000000-0000-4000-8000-000000000008";
const startIdempotencyKey =
  "61000000-0000-4000-8000-000000000101";
const alternateStartIdempotencyKey =
  "61000000-0000-4000-8000-000000000102";
const submitIdempotencyKey =
  "61000000-0000-4000-8000-000000000201";
const staleSubmitIdempotencyKey =
  "61000000-0000-4000-8000-000000000202";
const signingKey = "61".repeat(32);

function sqlText(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlJson(value: unknown) {
  return `${sqlText(JSON.stringify(value))}::jsonb`;
}

function sqlTextArray(values: readonly string[]) {
  return `array[${values.map(sqlText).join(",")}]::text[]`;
}

function safeEnvironment(extra: NodeJS.ProcessEnv = {}) {
  return {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR,
    LANG: "C",
    LC_ALL: "C",
    ...extra,
  };
}

function buildFixtureSql() {
  const releaseBundle = buildUniversalCurriculumRelease();
  const release = releaseBundle.release;
  const representativeUnitIds = [
    "grade-1-number-foundations-p0",
    "grade-2-number-order-and-line-p0",
    "grade-3-number-sense-to-100000-p1",
    "grade-4-place-value-millions-p1",
    "grade-5-natural-number-fluency-p1",
    "grade-6-natural-representation-p1",
    "grade-7-rational-number-foundations-p1",
    "grade-8-secondary-geo-p1-6",
    "grade-9-secondary-naa-p1-1",
  ] as const;
  const unitId = "grade-8-secondary-geo-p1-6";
  const unit = releaseBundle.units.find(
    (candidate) => candidate.unitId === unitId,
  );
  if (!unit) throw new Error("PROOF_UNIT_UNAVAILABLE");
  const snapshot = generateOnDemandAttemptSnapshot({
    grade: 8,
    unitId,
    seed: "migration-0041-disposable-proof",
    selectionReason: "NO_EVIDENCE",
  });
  const signature = createHmac(
    "sha256",
    Buffer.from(signingKey, "hex"),
  )
    .update(
      `${studentId}:${startIdempotencyKey}:${snapshot.snapshotHash}`,
    )
    .digest("hex");
  const alternateSignature = createHmac(
    "sha256",
    Buffer.from(signingKey, "hex"),
  )
    .update(
      `${studentId}:${alternateStartIdempotencyKey}:${snapshot.snapshotHash}`,
    )
    .digest("hex");
  const uniqueContracts = [
    ...new Map(
      snapshot.questions.map((question) => [
        question.contract.outcomeId,
        question.contract,
      ]),
    ).values(),
  ];
  const releaseQuestionValues = uniqueContracts.map(
    (contract, index) =>
      `(${[
        sqlText(release.releaseId),
        sqlText(unit.unitId),
        sqlText(`migration-0041-release-q-${index + 1}`),
        String(index + 1),
        sqlText("NUMBER_INPUT"),
        sqlText("Câu hỏi fixture chỉ dùng trong disposable proof."),
        "null",
        sqlJson({
          type: "NUMBER_LINE",
          description: "Minh họa fixture disposable.",
          minimum: 0,
          maximum: 1,
          points: [0, 1],
        }),
        sqlText("UNDERSTAND"),
        sqlTextArray([contract.outcomeId]),
        sqlTextArray([contract.skillTitle]),
        sqlText(contract.skillId),
        sqlText(contract.skillTitle),
        sqlText("62".repeat(32)),
      ].join(",")})`,
  ).join(",\n");
  const manualQuestionValues = snapshot.questions.map(
    (question) =>
      `(${[
        "'61000000-0000-4000-8000-000000000500'::uuid",
        sqlText(release.releaseId),
        sqlText(unit.unitId),
        sqlText(question.questionId),
        String(question.position),
        sqlText(question.contract.contractVersion),
        "8",
        sqlText(question.contract.outcomeId),
        sqlText(question.contract.skillTitle),
        sqlText(question.contract.skillId),
        sqlText(question.contract.skillTitle),
        sqlText(question.contract.difficulty),
        sqlText(question.contract.evidenceForm),
        sqlText(question.contract.seed),
        sqlText(question.contract.generatorVersion),
        sqlText(question.contract.contentReleaseHash),
        sqlText(question.prompt),
        sqlText(question.answerType),
        question.options === null ? "null" : sqlJson(question.options),
        sqlJson(question.visual),
        sqlTextArray(question.misconceptionTags),
        sqlText(question.publicPayloadHash),
        "'SEMANTIC_GENERATED_V1'",
        sqlText(question.provenance.semanticVariantId),
        sqlText(question.provenance.semanticVariantVersion),
        sqlText(question.provenance.solverVersion),
        sqlText(question.provenance.solverReceiptHash),
        sqlText(question.provenance.difficultyPolicyVersion),
        sqlText(question.provenance.seedFingerprint),
        sqlText(question.provenance.astHash),
        sqlText(question.provenance.visualHash),
        "true",
      ].join(",")})`,
  ).join(",\n");
  const manualSolutionValues = snapshot.solutions.map(
    (solution) =>
      `(${[
        "'61000000-0000-4000-8000-000000000500'::uuid",
        sqlText(solution.questionId),
        sqlText(solution.normalizedCorrectAnswer),
        sqlText(solution.correctAnswer),
        sqlJson(solution.solutionSteps),
        sqlText(solution.feedback),
        sqlText(solution.privatePayloadHash),
      ].join(",")})`,
  ).join(",\n");
  const firstQuestion = snapshot.questions[0];
  const firstSolution = snapshot.solutions[0];
  if (!firstQuestion || !firstSolution) {
    throw new Error("PROOF_SNAPSHOT_EMPTY");
  }
  const allProvenanceHashes = snapshot.questions
    .map((question) => question.provenance.astHash)
    .join(",");
  const setupSql = String.raw`
begin;
insert into public.curriculum_releases (
  release_id, content_version, curriculum_source_fingerprint,
  generator_version, deterministic_seed, mastery_policy_version,
  public_payload_sha256, private_solution_sha256, bundle_sha256,
  status, activation_state, activated_at
) values (
  ${sqlText(release.releaseId)},
  ${sqlText(release.contentVersion)},
  ${sqlText(release.curriculumSourceFingerprint)},
  ${sqlText(release.generatorVersion)},
  ${sqlText(release.deterministicSeed)},
  ${sqlText(release.masteryPolicyVersion)},
  ${sqlText(releaseBundle.hashes.publicPayloadSha256)},
  ${sqlText(releaseBundle.hashes.privateSolutionSha256)},
  ${sqlText(releaseBundle.hashes.bundleSha256)},
  'ACTIVE', 'ACTIVE', now()
);
insert into public.curriculum_release_units (
  release_id, unit_id, grade, domain, title, description,
  learning_goals, theory, worked_examples, official_outcome_ids,
  skill_ids, display_order, total_questions
) values (
  ${sqlText(release.releaseId)}, ${sqlText(unit.unitId)}, 8,
  ${sqlText(unit.domain)}, ${sqlText(unit.title)},
  ${sqlText(unit.description)}, ${sqlJson(unit.learningGoals)},
  ${sqlJson(unit.theory)}, ${sqlJson(unit.workedExamples)},
  ${sqlTextArray(unit.officialOutcomeIds)},
  ${sqlTextArray(unit.skillIds)}, ${String(unit.displayOrder)}, 12
);
insert into public.curriculum_release_questions (
  release_id, unit_id, question_id, display_order, answer_type,
  prompt, options, visual, cognitive_level, official_outcome_ids,
  official_outcome_titles, skill_id, skill_title,
  question_payload_hash
) values
${releaseQuestionValues};
insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  ${sqlText(studentId)}::uuid, 'authenticated', 'authenticated',
  'migration-0041-student@plave.local.invalid',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"role":"STUDENT","grade":"8"}'::jsonb, now(), now()
);
update public.profiles
set full_name = 'Học sinh disposable 0041',
    onboarding_completed = true,
    registration_grade = 8
where user_id = ${sqlText(studentId)}::uuid;
insert into public.student_profiles (user_id, grade, student_code)
values (
  ${sqlText(studentId)}::uuid, 8, 'PLV-610000000008'
);
insert into private.curriculum_generation_runtime_secret (
  singleton, signing_key_hex
) values (true, ${sqlText(signingKey)});
commit;

do $manual$
declare
  v_phase text := 'ATTEMPT';
begin
  begin
    insert into public.curriculum_attempts (
      id, student_id, release_id, content_version,
      curriculum_source_fingerprint, generator_version,
      deterministic_seed, unit_id, start_idempotency_key,
      question_sequence, total_questions, generation_mode,
      generation_seed, generation_contract_version,
      content_release_hash, selection_reason, snapshot_hash
    ) values (
      '61000000-0000-4000-8000-000000000500'::uuid,
      ${sqlText(studentId)}::uuid, ${sqlText(release.releaseId)},
      ${sqlText(release.contentVersion)},
      ${sqlText(release.curriculumSourceFingerprint)},
      ${sqlText(release.generatorVersion)},
      ${sqlText(release.deterministicSeed)},
      ${sqlText(unit.unitId)}, extensions.gen_random_uuid(),
      ${sqlTextArray(snapshot.questions.map((question) => question.questionId))},
      12, 'ON_DEMAND', ${sqlText(snapshot.attemptSeed)},
      'on-demand-curriculum-v1',
      ${sqlText(releaseBundle.hashes.bundleSha256)},
      'NO_EVIDENCE', ${sqlText(snapshot.snapshotHash)}
    );
    v_phase := 'QUESTIONS';
    insert into public.curriculum_generated_questions (
      attempt_id, release_id, unit_id, question_id, position,
      contract_version, grade, official_outcome_id,
      official_outcome_title, skill_id, skill_title, difficulty,
      evidence_form, question_seed, generator_version,
      content_release_hash, prompt, answer_type, options, visual,
      misconception_tags, public_payload_hash, question_source,
      semantic_variant_id, semantic_variant_version, solver_version,
      solver_receipt_hash, difficulty_policy_version,
      seed_fingerprint, ast_hash, visual_hash,
      semantic_provenance_locked
    ) values
    ${manualQuestionValues};
    v_phase := 'SOLUTIONS';
    insert into private.curriculum_generated_solutions (
      attempt_id, question_id, normalized_correct_answer,
      correct_answer, solution_steps, feedback, private_payload_hash
    ) values
    ${manualSolutionValues};
    v_phase := 'PROGRESS';
    insert into public.student_curriculum_unit_progress (
      student_id, release_id, unit_id, status,
      mastery_policy_version
    ) values (
      ${sqlText(studentId)}::uuid, ${sqlText(release.releaseId)},
      ${sqlText(unit.unitId)}, 'IN_PROGRESS',
      ${sqlText(release.masteryPolicyVersion)}
    );
    v_phase := 'DEFERRED_CONSTRAINTS';
    set constraints
      curriculum_generated_question_provenance_complete immediate;
    raise exception using errcode = 'P9001',
      message = 'EXPECTED_MANUAL_ROLLBACK';
  exception
    when sqlstate 'P9001' then null;
    when others then
      raise exception using errcode = 'P0001',
        message = 'PROOF:MANUAL_' || v_phase || ':' ||
          sqlstate || ':' || sqlerrm;
  end;
end;
$manual$;

do $proof$
declare
  v_start jsonb;
  v_replay jsonb;
  v_active_replay jsonb;
  v_attempt_id uuid;
  v_before_hash text;
  v_after_hash text;
  v_missing text;
  v_failed integer := 0;
begin
  perform set_config(
    'request.jwt.claim.sub',
    ${sqlText(studentId)},
    true
  );
  begin
    v_start := public.start_or_resume_semantic_generated_curriculum(
      ${sqlJson(snapshot)},
      ${sqlText(signature)},
      ${sqlText(startIdempotencyKey)}::uuid
    );
  exception when others then
    raise exception using errcode = 'P0001',
      message = 'PROOF:FIRST_START:' || sqlerrm;
  end;
  begin
    v_replay := public.start_or_resume_semantic_generated_curriculum(
      ${sqlJson(snapshot)},
      ${sqlText(signature)},
      ${sqlText(startIdempotencyKey)}::uuid
    );
  exception when others then
    raise exception using errcode = 'P0001',
      message = 'PROOF:IDEMPOTENT_REPLAY:' || sqlerrm;
  end;
  begin
    v_active_replay :=
      public.start_or_resume_semantic_generated_curriculum(
      ${sqlJson(snapshot)},
      ${sqlText(alternateSignature)},
      ${sqlText(alternateStartIdempotencyKey)}::uuid
    );
  exception when others then
    raise exception using errcode = 'P0001',
      message = 'PROOF:ACTIVE_UNIT_REPLAY:' || sqlerrm;
  end;
  v_attempt_id := (v_start ->> 'attempt_id')::uuid;
  if
    v_attempt_id is null
    or v_replay ->> 'attempt_id' <> v_attempt_id::text
    or v_active_replay ->> 'attempt_id' <> v_attempt_id::text
    or v_start::text ~
      '(correct_answer|solution_steps|private_payload_hash|solver_receipt)'
  then
    raise exception 'PROOF:START_RESUME_OR_PUBLIC_BOUNDARY_FAILED';
  end if;
  if (
    select count(*)
    from public.curriculum_generated_questions as question
    where question.attempt_id = v_attempt_id
      and question.question_source = 'SEMANTIC_GENERATED_V1'
      and question.semantic_provenance_locked
      and question.semantic_variant_id is not null
      and question.semantic_variant_version is not null
      and question.solver_version is not null
      and question.solver_receipt_hash is not null
      and question.difficulty_policy_version is not null
      and question.seed_fingerprint is not null
      and question.ast_hash is not null
      and question.visual_hash is not null
  ) <> 12 then
    raise exception 'PROOF:PROVENANCE_NOT_COMPLETE';
  end if;
  select pg_catalog.encode(
    extensions.digest(
      pg_catalog.string_agg(
        question.question_id || ':' || question.semantic_variant_id ||
        ':' || question.semantic_variant_version || ':' ||
        question.solver_version || ':' ||
        question.solver_receipt_hash || ':' ||
        question.difficulty_policy_version || ':' ||
        question.seed_fingerprint || ':' || question.ast_hash ||
        ':' || question.visual_hash,
        ',' order by question.position
      ),
      'sha256'
    ),
    'hex'
  ) into v_before_hash
  from public.curriculum_generated_questions as question
  where question.attempt_id = v_attempt_id;

  begin
    update public.curriculum_generated_questions
    set seed_fingerprint = '00' || substr(seed_fingerprint, 3)
    where attempt_id = v_attempt_id
      and question_id = ${sqlText(firstQuestion.questionId)};
    raise exception 'PROOF:IMMUTABILITY_UPDATE_ACCEPTED';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'CURRICULUM:IMMUTABLE_SEMANTIC_PROVENANCE' then
      raise;
    end if;
  end;

  foreach v_missing in array array[
    'semantic_variant_id', 'semantic_variant_version',
    'solver_version', 'solver_receipt_hash',
    'difficulty_policy_version', 'seed_fingerprint',
    'ast_hash', 'visual_hash'
  ] loop
    begin
      insert into public.curriculum_attempts (
        student_id, release_id, content_version,
        curriculum_source_fingerprint, generator_version,
        deterministic_seed, unit_id, start_idempotency_key,
        question_sequence, total_questions, status, completed_at,
        generation_mode, generation_seed,
        generation_contract_version, content_release_hash,
        selection_reason, snapshot_hash
      ) values (
        ${sqlText(studentId)}::uuid, ${sqlText(release.releaseId)},
        ${sqlText(release.contentVersion)},
        ${sqlText(release.curriculumSourceFingerprint)},
        ${sqlText(release.generatorVersion)},
        ${sqlText(release.deterministicSeed)},
        ${sqlText(unit.unitId)}, extensions.gen_random_uuid(),
        array['missing-' || replace(v_missing, '_', '-')],
        1, 'ABANDONED', now(), 'ON_DEMAND',
        'missing-field-proof', 'on-demand-curriculum-v1',
        ${sqlText(releaseBundle.hashes.bundleSha256)},
        'NO_EVIDENCE', ${sqlText("63".repeat(32))}
      ) returning id into v_attempt_id;
      insert into public.curriculum_generated_questions (
        attempt_id, release_id, unit_id, question_id, position,
        contract_version, grade, official_outcome_id,
        official_outcome_title, skill_id, skill_title, difficulty,
        evidence_form, question_seed, generator_version,
        content_release_hash, prompt, answer_type, options, visual,
        misconception_tags, public_payload_hash, question_source,
        semantic_variant_id, semantic_variant_version, solver_version,
        solver_receipt_hash, difficulty_policy_version,
        seed_fingerprint, ast_hash, visual_hash,
        semantic_provenance_locked
      ) values (
        v_attempt_id, ${sqlText(release.releaseId)},
        ${sqlText(unit.unitId)},
        'missing-' || replace(v_missing, '_', '-'), 1,
        'on-demand-curriculum-v1', 8,
        ${sqlText(firstQuestion.contract.outcomeId)},
        ${sqlText(firstQuestion.contract.skillTitle)},
        ${sqlText(firstQuestion.contract.skillId)},
        ${sqlText(firstQuestion.contract.skillTitle)}, 'UNDERSTAND',
        'PERFORM', 'missing-field-proof',
        ${sqlText(release.generatorVersion)},
        ${sqlText(releaseBundle.hashes.bundleSha256)},
        'Missing field constraint proof.', 'NUMBER_INPUT', null,
        ${sqlJson(firstQuestion.visual)}, array['PROOF'],
        ${sqlText("64".repeat(32))}, 'SEMANTIC_GENERATED_V1',
        case when v_missing = 'semantic_variant_id'
          then null else 'THEOREM_APPLICATION' end,
        case when v_missing = 'semantic_variant_version'
          then null else 'plave-outcome-variant-v1' end,
        case when v_missing = 'solver_version'
          then null else 'GEOMETRY_SOLVER_V1' end,
        case when v_missing = 'solver_receipt_hash'
          then null else ${sqlText("65".repeat(32))} end,
        case when v_missing = 'difficulty_policy_version'
          then null else 'HEURISTIC_DIFFICULTY_V1' end,
        case when v_missing = 'seed_fingerprint'
          then null else ${sqlText("66".repeat(8))} end,
        case when v_missing = 'ast_hash'
          then null else ${sqlText("67".repeat(32))} end,
        case when v_missing = 'visual_hash'
          then null else ${sqlText("68".repeat(32))} end,
        true
      );
      set constraints
        curriculum_generated_question_provenance_complete immediate;
      raise exception 'PROOF:MISSING_FIELD_ACCEPTED:%', v_missing;
    exception when sqlstate 'P0001' then
      if sqlerrm <>
        'CURRICULUM:INCOMPLETE_SEMANTIC_PROVENANCE'
      then
        raise;
      end if;
      v_failed := v_failed + 1;
      set constraints
        curriculum_generated_question_provenance_complete deferred;
    end;
  end loop;
  if v_failed <> 8 then
    raise exception 'PROOF:MISSING_FIELD_COVERAGE_FAILED';
  end if;

  select pg_catalog.encode(
    extensions.digest(
      pg_catalog.string_agg(
        question.question_id || ':' || question.semantic_variant_id ||
        ':' || question.semantic_variant_version || ':' ||
        question.solver_version || ':' ||
        question.solver_receipt_hash || ':' ||
        question.difficulty_policy_version || ':' ||
        question.seed_fingerprint || ':' || question.ast_hash ||
        ':' || question.visual_hash,
        ',' order by question.position
      ),
      'sha256'
    ),
    'hex'
  ) into v_after_hash
  from public.curriculum_generated_questions as question
  where question.attempt_id =
    (v_start ->> 'attempt_id')::uuid;
  if v_before_hash <> v_after_hash then
    raise exception 'PROOF:PROVENANCE_CHANGED';
  end if;
end;
$proof$;

select 'PLAVE0041_START|' || concat_ws(
  '|',
  count(*),
  count(*) filter (where semantic_provenance_locked),
  count(*) filter (
    where question_source = 'SEMANTIC_GENERATED_V1'
  ),
  count(*) filter (
    where semantic_variant_id is null
      or semantic_variant_version is null
      or solver_version is null
      or solver_receipt_hash is null
      or difficulty_policy_version is null
      or seed_fingerprint is null
      or ast_hash is null
      or visual_hash is null
  ),
  (select count(*) from private.curriculum_generated_solutions),
  (select count(*) from supabase_migrations.schema_migrations),
  (select min(version) from supabase_migrations.schema_migrations),
  (select max(version) from supabase_migrations.schema_migrations)
)
from public.curriculum_generated_questions
where question_source = 'SEMANTIC_GENERATED_V1';
`;
  const resumeSql = String.raw`
do $proof$
declare
  v_attempt_id uuid;
  v_state jsonb;
  v_submit jsonb;
  v_duplicate jsonb;
begin
  perform set_config(
    'request.jwt.claim.sub',
    ${sqlText(studentId)},
    true
  );
  select attempt.id into v_attempt_id
  from public.curriculum_attempts as attempt
  where attempt.student_id = ${sqlText(studentId)}::uuid
    and attempt.start_idempotency_key =
      ${sqlText(startIdempotencyKey)}::uuid;
  v_state := public.get_generated_curriculum_attempt_state(
    v_attempt_id
  );
  if
    v_state ->> 'attempt_id' <> v_attempt_id::text
    or v_state::text ~
      '(correct_answer|solution_steps|private_payload_hash|solver_receipt)'
  then
    raise exception 'PROOF:CROSS_SESSION_RESUME_FAILED';
  end if;
  v_submit := public.submit_generated_curriculum_answer(
    v_attempt_id, ${sqlText(firstQuestion.questionId)},
    ${sqlText(firstSolution.correctAnswer)}, 0,
    ${sqlText(submitIdempotencyKey)}::uuid
  );
  v_duplicate := public.submit_generated_curriculum_answer(
    v_attempt_id, ${sqlText(firstQuestion.questionId)},
    ${sqlText(firstSolution.correctAnswer)}, 0,
    ${sqlText(submitIdempotencyKey)}::uuid
  );
  if
    v_submit -> 'feedback' ->> 'is_correct' <> 'true'
    or v_duplicate <> v_submit
  then
    raise exception 'PROOF:SUBMIT_IDEMPOTENCY_FAILED';
  end if;
  begin
    perform public.submit_generated_curriculum_answer(
      v_attempt_id,
      (
        select attempt.question_sequence[2]
        from public.curriculum_attempts as attempt
        where attempt.id = v_attempt_id
      ),
      'A', 0, ${sqlText(staleSubmitIdempotencyKey)}::uuid
    );
    raise exception 'PROOF:STALE_CAS_ACCEPTED';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'CURRICULUM:REVISION_CONFLICT' then raise; end if;
  end;
  if
    (select count(*) from public.curriculum_generated_answers
      where attempt_id = v_attempt_id) <> 1
    or
    (select evidence_count
      from public.student_curriculum_unit_progress
      where student_id = ${sqlText(studentId)}::uuid
        and unit_id = ${sqlText(unit.unitId)}) <> 1
  then
    raise exception 'PROOF:EVIDENCE_DUPLICATED';
  end if;
end;
$proof$;
select 'PLAVE0041_RESUME|' || concat_ws(
  '|',
  (select count(*) from public.curriculum_attempts
    where student_id = ${sqlText(studentId)}::uuid
      and start_idempotency_key =
        ${sqlText(startIdempotencyKey)}::uuid),
  (select count(*) from public.curriculum_generated_answers),
  case when pg_catalog.has_function_privilege(
    'authenticated',
    'public.start_or_resume_generated_curriculum(jsonb,text,uuid)',
    'EXECUTE'
  ) then 1 else 0 end,
  case when pg_catalog.has_function_privilege(
    'authenticated',
    'public.start_or_resume_semantic_generated_curriculum(jsonb,text,uuid)',
    'EXECUTE'
  ) then 1 else 0 end,
  (select count(*) from pg_catalog.pg_class as class
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relname in (
        'curriculum_generated_questions',
        'curriculum_generated_answers'
      )
      and class.relrowsecurity
      and class.relforcerowsecurity),
  case when pg_catalog.has_table_privilege(
    'authenticated',
    'private.curriculum_generated_solutions',
    'SELECT'
  ) then 1 else 0 end,
  ${sqlText(allProvenanceHashes)}
);
`;
  const matrixEntries = representativeUnitIds.flatMap(
    (matrixUnitId, index) => {
      const grade = index + 1;
      if (grade === 8) return [];
      const matrixUnit = releaseBundle.units.find(
        (candidate) => candidate.unitId === matrixUnitId,
      );
      if (!matrixUnit) {
        throw new Error(
          "PROOF_MATRIX_UNIT_UNAVAILABLE",
        );
      }
      const matrixSnapshot = generateOnDemandAttemptSnapshot({
        grade: grade as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
        unitId: matrixUnitId,
        seed: `migration-0041-grade-${grade}-proof`,
        selectionReason: "NO_EVIDENCE",
      });
      const matrixStudentId =
        `61000000-0000-4000-8000-${String(grade).padStart(12, "0")}`;
      const matrixIdempotencyKey =
        `61000000-0000-4000-8001-${String(grade).padStart(12, "0")}`;
      const matrixSignature = createHmac(
        "sha256",
        Buffer.from(signingKey, "hex"),
      )
        .update(
          `${matrixStudentId}:${matrixIdempotencyKey}:${matrixSnapshot.snapshotHash}`,
        )
        .digest("hex");
      const matrixContracts = [
        ...new Map(
          matrixSnapshot.questions.map((question) => [
            question.contract.outcomeId,
            question.contract,
          ]),
        ).values(),
      ];
      const questionRows = matrixContracts.map(
        (contract, questionIndex) =>
          `(${[
            sqlText(release.releaseId),
            sqlText(matrixUnit.unitId),
            sqlText(
              `migration-0041-g${grade}-q-${questionIndex + 1}`,
            ),
            String(questionIndex + 1),
            sqlText("NUMBER_INPUT"),
            sqlText("Câu hỏi fixture chỉ dùng trong disposable proof."),
            "null",
            sqlJson({
              type: "NUMBER_LINE",
              description: "Minh họa fixture disposable.",
              minimum: 0,
              maximum: 1,
              points: [0, 1],
            }),
            sqlText("UNDERSTAND"),
            sqlTextArray([contract.outcomeId]),
            sqlTextArray([contract.skillTitle]),
            sqlText(contract.skillId),
            sqlText(contract.skillTitle),
            sqlText("69".repeat(32)),
          ].join(",")})`,
      ).join(",\n");
      return [{
        grade,
        unit: matrixUnit,
        snapshot: matrixSnapshot,
        studentId: matrixStudentId,
        idempotencyKey: matrixIdempotencyKey,
        signature: matrixSignature,
        questionRows,
      }];
    },
  );
  const matrixUnitRows = matrixEntries.map(
    ({ unit: matrixUnit }) =>
      `(${[
        sqlText(release.releaseId),
        sqlText(matrixUnit.unitId),
        String(matrixUnit.grade),
        sqlText(matrixUnit.domain),
        sqlText(matrixUnit.title),
        sqlText(matrixUnit.description),
        sqlJson(matrixUnit.learningGoals),
        sqlJson(matrixUnit.theory),
        sqlJson(matrixUnit.workedExamples),
        sqlTextArray(matrixUnit.officialOutcomeIds),
        sqlTextArray(matrixUnit.skillIds),
        String(matrixUnit.displayOrder),
        "12",
      ].join(",")})`,
  ).join(",\n");
  const matrixUserRows = matrixEntries.map(
    ({ grade, studentId: matrixStudentId }) =>
      `(${[
        `${sqlText(matrixStudentId)}::uuid`,
        "'authenticated'",
        "'authenticated'",
        sqlText(`migration-0041-grade-${grade}@plave.local.invalid`),
        `'{"provider":"email","providers":["email"]}'::jsonb`,
        `${sqlText(JSON.stringify({
          role: "STUDENT",
          grade: String(grade),
        }))}::jsonb`,
        "now()",
        "now()",
      ].join(",")})`,
  ).join(",\n");
  const matrixProfileUpdates = matrixEntries.map(
    ({ grade, studentId: matrixStudentId }) => String.raw`
update public.profiles
set full_name = 'Học sinh disposable matrix',
    onboarding_completed = true,
    registration_grade = ${String(grade)}
where user_id = ${sqlText(matrixStudentId)}::uuid;
insert into public.student_profiles (user_id, grade, student_code)
values (
  ${sqlText(matrixStudentId)}::uuid,
  ${String(grade)},
  ${sqlText(`PLV-61${String(grade).padStart(10, "0")}`)}
);`,
  ).join("\n");
  const matrixStarts = matrixEntries.map(
    ({
      grade,
      snapshot: matrixSnapshot,
      studentId: matrixStudentId,
      idempotencyKey: matrixIdempotencyKey,
      signature: matrixSignature,
    }) => String.raw`
do $grade_${String(grade)}$
declare
  v_start jsonb;
  v_replay jsonb;
begin
  perform set_config(
    'request.jwt.claim.sub',
    ${sqlText(matrixStudentId)},
    true
  );
  v_start := public.start_or_resume_semantic_generated_curriculum(
    ${sqlJson(matrixSnapshot)},
    ${sqlText(matrixSignature)},
    ${sqlText(matrixIdempotencyKey)}::uuid
  );
  v_replay := public.start_or_resume_semantic_generated_curriculum(
    ${sqlJson(matrixSnapshot)},
    ${sqlText(matrixSignature)},
    ${sqlText(matrixIdempotencyKey)}::uuid
  );
  if
    v_start ->> 'attempt_id' <> v_replay ->> 'attempt_id'
    or (v_start ->> 'grade')::integer <> ${String(grade)}
    or v_start::text ~
      '(correct_answer|solution_steps|private_payload_hash|solver_receipt)'
  then
    raise exception 'PROOF:GRADE_MATRIX_FAILED';
  end if;
end;
$grade_${String(grade)}$;`,
  ).join("\n");
  const matrixSql = String.raw`
begin;
insert into public.curriculum_release_units (
  release_id, unit_id, grade, domain, title, description,
  learning_goals, theory, worked_examples, official_outcome_ids,
  skill_ids, display_order, total_questions
) values
${matrixUnitRows};
${matrixEntries.map((entry) => String.raw`
insert into public.curriculum_release_questions (
  release_id, unit_id, question_id, display_order, answer_type,
  prompt, options, visual, cognitive_level, official_outcome_ids,
  official_outcome_titles, skill_id, skill_title,
  question_payload_hash
) values
${entry.questionRows};`).join("\n")}
insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
${matrixUserRows};
${matrixProfileUpdates}
commit;
${matrixStarts}
select 'PLAVE0041_MATRIX|' || concat_ws(
  '|',
  count(distinct attempt.student_id),
  count(distinct question.grade),
  count(*),
  count(*) filter (
    where question.question_source = 'SEMANTIC_GENERATED_V1'
      and question.semantic_provenance_locked
  ),
  count(*) filter (
    where question.grade <> student.grade
  )
)
from public.curriculum_attempts as attempt
join public.curriculum_generated_questions as question
  on question.attempt_id = attempt.id
join public.student_profiles as student
  on student.user_id = attempt.student_id
where attempt.generation_mode = 'ON_DEMAND';
`;
  return { setupSql, resumeSql, matrixSql };
}

function psqlEnvironment(databasePort: number) {
  return safeEnvironment({
    PGHOST: "127.0.0.1",
    PGPORT: String(databasePort),
    PGUSER: "postgres",
    PGPASSWORD: "postgres",
    PGDATABASE: "postgres",
    PGSSLMODE: "disable",
    PGCONNECT_TIMEOUT: "5",
  });
}

async function runPsql(
  databasePort: number,
  sql: string,
) {
  return runManagedChild({
    executable: "/opt/homebrew/bin/psql",
    args: [
      "--no-psqlrc",
      "--quiet",
      "--tuples-only",
      "--no-align",
      "--set",
      "ON_ERROR_STOP=1",
      "--set",
      "VERBOSITY=verbose",
    ],
    cwd: assertProject004Workspace(),
    environment: psqlEnvironment(databasePort),
    input: sql,
    timeoutMs: 180_000,
    stage: "GENERATED_PERSISTENCE_SQL_PROOF",
  });
}

function classifyProofSqlFailure(output: string) {
  const sqlstate =
    /(?:SQLSTATE\s+|ERROR:\s+)([0-9A-Z]{5})(?::|\b)/iu.exec(
      output,
    )?.[1]?.toUpperCase() ?? "UNKNOWN";
  const proofCode =
    /(?:PROOF|CURRICULUM):([A-Z0-9_:]+)/u.exec(
      output,
    )?.[0]?.replaceAll(":", "_") ?? "NONE";
  const functionContext =
    /PL\/pgSQL function ([a-z0-9_.]+)(?:\([^)]*\))? line ([0-9]+) at ([A-Z ]+)/iu.exec(
      output,
    );
  const context = functionContext
    ? `${functionContext[1]
        ?.replace(/[^a-z0-9_.]/giu, "_")
        .toUpperCase()}_LINE_${functionContext[2]}_${functionContext[3]
        ?.trim()
        .replace(/[^A-Z ]/gu, "_")
        .replaceAll(" ", "_")}`
    : "CONTEXT_UNKNOWN";
  const constraint =
    /violates (?:check|foreign key|unique) constraint ["']([a-z0-9_]+)["']/iu.exec(
      output,
    )?.[1]?.toUpperCase() ?? "CONSTRAINT_UNKNOWN";
  const missingObject =
    /(?:function|relation|column) ([a-z0-9_.]+)/iu.exec(
      output,
    )?.[1]?.toUpperCase() ?? "OBJECT_UNKNOWN";
  let category = "SQL_EXECUTION_FAILED";
  if (/duplicate key|unique constraint/iu.test(output)) {
    category = "UNIQUE_CONSTRAINT";
  } else if (/check constraint/iu.test(output)) {
    category = "CHECK_CONSTRAINT";
  } else if (/foreign key constraint/iu.test(output)) {
    category = "FOREIGN_KEY_CONSTRAINT";
  } else if (/invalid regular expression/iu.test(output)) {
    category = "REGEX_CONTRACT";
  } else if (/does not exist/iu.test(output)) {
    category = "OBJECT_OR_COLUMN_MISSING";
  } else if (proofCode !== "NONE") {
    category = "PROOF_ASSERTION";
  }
  return `${category}_${constraint}_${missingObject}_SQLSTATE_${sqlstate}_${proofCode}_${context}`;
}

function sanitizedStartFailureHeadline(output: string) {
  const sanitized = output
    .replace(/\u001b\[[0-9;]*m/gu, "")
    .replace(/(?:postgres(?:ql)?|https?):\/\/\S+/giu, "[ENDPOINT]")
    .replace(
      /\beyJ[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+[.][A-Za-z0-9_-]+\b/gu,
      "[TOKEN]",
    )
    .replace(/\b[0-9a-f]{32,}\b/giu, "[HASH]")
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f-]{27,36}\b/giu,
      "[UUID]",
    )
    .replace(/\b127[.]0[.]0[.]1:[0-9]+\b/gu, "[LOOPBACK]");
  const line = sanitized
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .find((value) =>
      /(?:error|fatal|failed|invalid|migration)/iu.test(value)
    );
  return (line ?? "NO_ERROR_HEADLINE")
    .slice(0, 180)
    .replace(/[^A-Z0-9]+/giu, "_")
    .replace(/^_+|_+$/gu, "")
    .toUpperCase();
}

export async function runGeneratedPractice0041DisposableProof() {
  const root = assertProject004Workspace();
  const projectId =
    `plave-project004-clean-proof-${
      randomBytes(6).toString("hex").slice(0, 11)
    }`;
  const reservation = await reserveDisposablePorts();
  const ports = reservation.ports;
  let workdir = "";
  let released = false;
  let cleanup = false;
  let startResult:
    | Awaited<ReturnType<typeof runManagedChild>>
    | undefined;
  try {
    workdir = mkdtempSync(
      resolve(tmpdir(), "plave-project004-clean-proof-"),
    );
    assertDisposableCleanupScope(workdir, projectId);
    const supabaseDirectory = resolve(workdir, "supabase");
    const migrationsDirectory = resolve(
      supabaseDirectory,
      "migrations",
    );
    mkdirSync(supabaseDirectory, {
      recursive: true,
      mode: 0o700,
    });
    const sourceConfig = resolve(root, "supabase/config.toml");
    const configPath = resolve(
      supabaseDirectory,
      "config.toml",
    );
    copyFileSync(sourceConfig, configPath);
    writeFileSync(
      configPath,
      buildDisposableConfig(
        readFileSync(configPath, "utf8"),
        projectId,
        ports,
      ),
      { mode: 0o600 },
    );
    const inventory =
      copyGeneratedPersistenceMigrationInventory(
        migrationsDirectory,
        root,
      );
    await reservation.release();
    released = true;
    startResult = await runManagedChild({
      executable: "/opt/homebrew/bin/supabase",
      args: [
        "start",
        "--workdir",
        workdir,
        "--exclude",
        [
          "realtime",
          "imgproxy",
          "mailpit",
          "postgres-meta",
          "studio",
          "edge-runtime",
          "logflare",
          "vector",
          "supavisor",
        ].join(","),
        "--yes",
      ],
      cwd: root,
      environment: safeEnvironment(),
      timeoutMs: 900_000,
      terminationGraceMs: 10_000,
      killConfirmationMs: 10_000,
      stage: "SUPABASE_0001_0042",
    });
    if (!startResult.ok || !startResult.childExited) {
      throw new Error(
        startResult.timedOut
          ? "DISPOSABLE_0041_START_TIMEOUT"
          : `DISPOSABLE_0041_START_FAILED_${
              classifyDisposableStartFailure(
                `${startResult.stdout}\n${startResult.stderr}`,
              )
            }_${classifyProofSqlFailure(
              `${startResult.stdout}\n${startResult.stderr}`,
            )}_${sanitizedStartFailureHeadline(
              `${startResult.stdout}\n${startResult.stderr}`,
            )}`,
      );
    }
    const fixture = buildFixtureSql();
    const setup = await runPsql(
      ports.database,
      fixture.setupSql,
    );
    if (
      !setup.ok ||
      !/^PLAVE0041_START\|12\|12\|12\|0\|12\|42\|0001\|0042$/mu.test(
        setup.stdout,
      )
    ) {
      throw new Error(
        `DISPOSABLE_0041_START_PROOF_FAILED_${
          setup.ok
            ? "PAYLOAD_MISMATCH"
            : classifyProofSqlFailure(
                `${setup.stdout}\n${setup.stderr}`,
              )
        }`,
      );
    }
    const resume = await runPsql(
      ports.database,
      fixture.resumeSql,
    );
    if (
      !resume.ok ||
      !/^PLAVE0041_RESUME\|1\|1\|0\|1\|2\|0\|/mu.test(
        resume.stdout,
      )
    ) {
      throw new Error(
        `DISPOSABLE_0041_RESUME_PROOF_FAILED_${
          resume.ok
            ? "PAYLOAD_MISMATCH"
            : classifyProofSqlFailure(
                `${resume.stdout}\n${resume.stderr}`,
              )
        }`,
      );
    }
    const matrix = await runPsql(
      ports.database,
      fixture.matrixSql,
    );
    if (
      !matrix.ok ||
      !/^PLAVE0041_MATRIX\|9\|9\|108\|108\|0$/mu.test(
        matrix.stdout,
      )
    ) {
      throw new Error(
        `DISPOSABLE_0041_MATRIX_PROOF_FAILED_${
          matrix.ok
            ? "PAYLOAD_MISMATCH"
            : classifyProofSqlFailure(
                `${matrix.stdout}\n${matrix.stderr}`,
              )
        }`,
      );
    }
    return {
      inventory,
      migrationsApplied: 42,
      provenanceRows: 12,
      localLiveGrades: 9,
      localLiveItems: 108,
      startResumeIdempotency: "PASS",
      crossSessionResume: "PASS",
      submitCas: "PASS",
      duplicateSubmit: "PASS",
      immutableProvenance: "PASS",
      missingFieldRejections: 8,
      privateBoundary: "PASS",
      rlsBoundary: "PASS",
    } as const;
  } finally {
    if (!released) await reservation.release();
    if (workdir) {
      const stopped = await stopDisposableStack(
        workdir,
        projectId,
      );
      cleanup = stopped.ok;
      if (!cleanup) {
        throw new Error(
          "DISPOSABLE_0041_CLEANUP_FAILED",
        );
      }
    } else {
      cleanup = true;
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const proof =
      await runGeneratedPractice0041DisposableProof();
    process.stdout.write(
      [
        "PROJECT004_CANONICAL=PASS",
        "MIGRATION_EXECUTION_STARTED=YES",
        "MIGRATIONS_APPLIED=42/42",
        "MIGRATION_FIRST_LAST=0001/0042",
        "PROVENANCE_FIELDS=8/8",
        `GENERATED_PROVENANCE_ROWS=${String(proof.provenanceRows)}`,
        `PILOT_LIVE_GRADES=${String(proof.localLiveGrades)}/9`,
        `PILOT_LIVE_ITEMS=${String(proof.localLiveItems)}`,
        `START_RESUME_IDEMPOTENCY=${proof.startResumeIdempotency}`,
        `CROSS_SESSION_RESUME=${proof.crossSessionResume}`,
        `SUBMIT_CAS=${proof.submitCas}`,
        `DUPLICATE_SUBMIT=${proof.duplicateSubmit}`,
        `IMMUTABLE_PROVENANCE=${proof.immutableProvenance}`,
        `MISSING_FIELD_REJECTIONS=${String(proof.missingFieldRejections)}/8`,
        `RLS_PRIVATE_BOUNDARY=${proof.rlsBoundary}/${proof.privateBoundary}`,
        "DISPOSABLE_CLEANUP=PASS",
        "REMOTE_ACCESS_PERFORMED=NO",
        "REMOTE_MUTATION_PERFORMED=NO",
        "ROOT_FAILURE_CODE=NONE",
        "GENERATED_PRACTICE_0041_DISPOSABLE_PROOF=PASS",
      ].join("\n") + "\n",
    );
  } catch (error) {
    process.stdout.write(
      [
        "PROJECT004_CANONICAL=PASS",
        "GENERATED_PRACTICE_0041_DISPOSABLE_PROOF=FAIL",
        "REMOTE_ACCESS_PERFORMED=NO",
        "REMOTE_MUTATION_PERFORMED=NO",
        `ROOT_FAILURE_CODE=${
          error instanceof Error
            ? error.message.replace(/[^A-Z0-9_]/gu, "_")
            : "DISPOSABLE_0041_UNCLASSIFIED"
        }`,
      ].join("\n") + "\n",
    );
    process.exitCode = 1;
  }
}
