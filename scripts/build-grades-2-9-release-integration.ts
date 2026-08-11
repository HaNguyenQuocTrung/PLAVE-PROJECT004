import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { canonicalize, sha256 } from "../lib/content-factory/canonical.ts";
import {
  FROZEN_COMBINED_A_K_HASH,
  buildGradesTwoToNineDatabaseRelease,
} from "../lib/release-integration/inventory.ts";

const root = process.cwd();
const release = buildGradesTwoToNineDatabaseRelease();

function sqlText(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlJson(value: unknown) {
  return `${sqlText(JSON.stringify(value))}::jsonb`;
}

function sqlArray(values: readonly string[]) {
  return `array[${values.map(sqlText).join(",")}]::text[]`;
}

function batches(prefix: string, rows: readonly string[], size = 100) {
  const statements: string[] = [];
  for (let index = 0; index < rows.length; index += size) {
    statements.push(`${prefix}\nvalues\n${rows.slice(index, index + size).join(",\n")};`);
  }
  return statements.join("\n");
}

const releaseRows = release.grades.map(({ summary }) => `(${[
  sqlText(summary.releaseId),
  sqlText(summary.candidate.version),
  sqlText(FROZEN_COMBINED_A_K_HASH),
  sqlText("content-factory-a-k-v1"),
  sqlText(`grade-${summary.grade}-combined-a-k-v1`),
  sqlText(summary.candidate.policyVersion),
  sqlText(summary.publicPayloadHash),
  sqlText(summary.privateSolutionHash),
  sqlText(summary.releaseBundleHash),
  sqlText("DRAFT"),
  sqlText("INACTIVE"),
].join(",")})`);

const policyRows = release.grades.map(({ summary }) => `(${[
  summary.grade,
  sqlText(summary.releaseId),
  sqlText(summary.candidate.candidateId),
  sqlText(summary.candidate.version),
  sqlText(summary.candidate.bundleHash),
  sqlText(summary.candidate.policyVersion),
  sqlText(FROZEN_COMBINED_A_K_HASH),
  sqlText("HIDDEN"),
  "false",
  "false",
  "false",
].join(",")})`);

const unitRows = release.grades.flatMap(({ units }) => units.map((unit) => `(${[
  sqlText(unit.releaseId), sqlText(unit.unitId), unit.grade, sqlText(unit.domain),
  sqlText(unit.title), sqlText(unit.description), sqlJson(unit.learningGoals),
  sqlJson(unit.theory), sqlJson(unit.workedExamples), sqlArray(unit.officialOutcomeIds),
  sqlArray(unit.skillIds), unit.displayOrder, unit.totalQuestions,
].join(",")})`));

const questionRows = release.grades.flatMap(({ questions }) => questions.map((question) => `(${[
  sqlText(question.releaseId), sqlText(question.unitId), sqlText(question.questionId),
  question.displayOrder, sqlText(question.answerType), sqlText(question.prompt),
  question.options === null ? "null" : sqlJson(question.options), sqlJson(question.visual),
  sqlText(question.cognitiveLevel), sqlArray(question.officialOutcomeIds),
  sqlArray(question.officialOutcomeTitles), sqlText(question.skillId),
  sqlText(question.skillTitle), sqlText(question.questionPayloadHash),
  sqlText(question.structuralFingerprint), sqlText(question.supportMode),
].join(",")})`));

const solutionRows = release.grades.flatMap(({ solutions }) => solutions.map((solution) => `(${[
  sqlText(solution.releaseId), sqlText(solution.questionId),
  sqlText(solution.normalizedCorrectAnswer), sqlText(solution.correctAnswer),
  sqlJson(solution.solutionSteps), sqlText(solution.feedback),
  sqlText(solution.solutionPayloadHash),
].join(",")})`));

const skillRows = release.grades.flatMap(({ questions, summary }) => {
  const unique = new Map(questions.map((question) => [question.skillId, question]));
  return [...unique.values()].sort((a, b) => a.skillId.localeCompare(b.skillId)).map((question) => `(${[
    sqlText(summary.releaseId), summary.grade, sqlText(question.skillId),
    sqlText(question.skillTitle), sqlText(question.supportMode),
  ].join(",")})`);
});

const schemaSql = `
-- Owner-authorized local release integration. The migration installs frozen
-- Grades 2-9 content in HIDDEN mode. It never publishes or activates itself.
do $precondition$
begin
  if pg_catalog.to_regclass('public.curriculum_releases') is null
    or pg_catalog.to_regclass('public.curriculum_release_units') is null
    or pg_catalog.to_regclass('public.curriculum_release_questions') is null
    or pg_catalog.to_regclass('private.curriculum_release_solutions') is null
    or pg_catalog.to_regclass('public.curriculum_attempts') is null
  then
    raise exception 'GRADES_2_9_RELEASE:BASE_SCHEMA_MISSING';
  end if;
  if pg_catalog.to_regclass('public.curriculum_grade_release_policies') is not null then
    raise exception 'GRADES_2_9_RELEASE:ALREADY_INSTALLED';
  end if;
end;
$precondition$;

alter table public.curriculum_release_units
  drop constraint if exists curriculum_release_units_total_questions_check;
alter table public.curriculum_release_units
  add constraint curriculum_release_units_total_questions_check
  check (total_questions between 0 and 100);
alter table public.curriculum_release_units
  drop constraint if exists curriculum_release_unit_json_check;
alter table public.curriculum_release_units
  add constraint curriculum_release_unit_json_check check (
    jsonb_typeof(learning_goals) = 'array'
    and jsonb_array_length(learning_goals) > 0
    and jsonb_typeof(theory) = 'array'
    and jsonb_array_length(theory) > 0
    and jsonb_typeof(worked_examples) = 'array'
  );

alter table public.curriculum_release_questions
  drop constraint if exists curriculum_release_question_options_check;
alter table public.curriculum_release_questions
  add constraint curriculum_release_question_options_check check (
    (answer_type = 'MULTIPLE_CHOICE' and options is not null
      and jsonb_typeof(options) = 'array'
      and jsonb_array_length(options) between 2 and 4)
    or (answer_type <> 'MULTIPLE_CHOICE' and options is null)
  );
alter table public.curriculum_release_questions
  add column structural_fingerprint text,
  add column support_mode text not null default 'ADAPTIVE'
    check (support_mode in ('ADAPTIVE', 'FIXED_SAFE'));
alter table public.curriculum_release_questions
  add constraint curriculum_release_question_structure_check check (
    structural_fingerprint is null
    or structural_fingerprint ~ '^[0-9a-f]{64}$'
  );

alter table public.curriculum_attempts
  add column release_candidate_id text,
  add column release_bundle_sha256 text,
  add column release_policy_version text,
  add column release_mode text,
  add column runtime_path text,
  add constraint curriculum_attempt_release_integration_check check (
    (release_candidate_id is null and release_bundle_sha256 is null
      and release_policy_version is null and release_mode is null
      and runtime_path is null)
    or (release_candidate_id is not null
      and release_bundle_sha256 ~ '^[0-9a-f]{64}$'
      and release_policy_version is not null
      and release_mode in ('PILOT', 'PUBLIC')
      and runtime_path in ('ADAPTIVE', 'FIXED_SAFE'))
  );

create table public.curriculum_grade_release_policies (
  grade smallint primary key check (grade between 2 and 9),
  release_id text not null unique references public.curriculum_releases(release_id) on delete restrict,
  candidate_id text not null,
  candidate_version text not null,
  candidate_bundle_sha256 text not null check (candidate_bundle_sha256 ~ '^[0-9a-f]{64}$'),
  policy_version text not null,
  combined_a_k_sha256 text not null check (combined_a_k_sha256 ~ '^[0-9a-f]{64}$'),
  release_mode text not null default 'HIDDEN' check (release_mode in ('HIDDEN', 'PILOT', 'PUBLIC')),
  catalog_enabled boolean not null default false,
  runtime_enabled boolean not null default false,
  retention_enabled boolean not null default false,
  activated_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint curriculum_grade_release_state_check check (
    (release_mode = 'HIDDEN' and not catalog_enabled and not runtime_enabled and not retention_enabled and activated_at is null)
    or (release_mode in ('PILOT', 'PUBLIC') and catalog_enabled and runtime_enabled and activated_at is not null)
  )
);

drop index if exists public.curriculum_releases_one_active_idx;
create unique index curriculum_releases_one_active_per_grade_idx
  on public.curriculum_grade_release_policies (grade)
  where release_mode in ('PILOT', 'PUBLIC') and runtime_enabled;

create table public.curriculum_release_skills (
  release_id text not null references public.curriculum_releases(release_id) on delete restrict,
  grade smallint not null check (grade between 2 and 9),
  skill_id text not null,
  skill_title text not null,
  support_mode text not null check (support_mode in ('ADAPTIVE', 'FIXED_SAFE')),
  primary key (release_id, skill_id)
);

create table public.curriculum_release_pilot_entitlements (
  student_id uuid not null references public.student_profiles(user_id) on delete restrict,
  grade smallint not null check (grade between 2 and 9),
  release_id text not null,
  candidate_id text not null,
  candidate_version text not null,
  candidate_bundle_sha256 text not null check (candidate_bundle_sha256 ~ '^[0-9a-f]{64}$'),
  policy_version text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (student_id, grade),
  foreign key (grade) references public.curriculum_grade_release_policies(grade) on delete restrict
);

alter table public.curriculum_grade_release_policies enable row level security;
alter table public.curriculum_grade_release_policies force row level security;
alter table public.curriculum_release_skills enable row level security;
alter table public.curriculum_release_skills force row level security;
alter table public.curriculum_release_pilot_entitlements enable row level security;
alter table public.curriculum_release_pilot_entitlements force row level security;
revoke all on public.curriculum_grade_release_policies from public, anon, authenticated;
revoke all on public.curriculum_release_skills from public, anon, authenticated;
revoke all on public.curriculum_release_pilot_entitlements from public, anon, authenticated;

create or replace function private.curriculum_grade_release_access(
  p_user_id uuid,
  p_grade smallint,
  p_release_id text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    join public.student_profiles as student on student.user_id = profile.user_id
    join public.curriculum_grade_release_policies as policy on policy.grade = student.grade
    join public.curriculum_releases as release on release.release_id = policy.release_id
    where profile.user_id = p_user_id
      and profile.role = 'STUDENT' and profile.onboarding_completed
      and student.grade = p_grade and p_grade between 2 and 9
      and policy.release_id = p_release_id
      and policy.catalog_enabled and policy.runtime_enabled
      and policy.release_mode in ('PILOT', 'PUBLIC')
      and release.status = 'ACTIVE' and release.activation_state = 'ACTIVE'
      and release.content_version = policy.candidate_version
      and policy.combined_a_k_sha256 = '${FROZEN_COMBINED_A_K_HASH}'
      and (
        policy.release_mode = 'PUBLIC'
        or exists (
          select 1 from public.curriculum_release_pilot_entitlements as entitlement
          where entitlement.student_id = p_user_id and entitlement.grade = p_grade
            and entitlement.release_id = policy.release_id
            and entitlement.candidate_id = policy.candidate_id
            and entitlement.candidate_version = policy.candidate_version
            and entitlement.candidate_bundle_sha256 = policy.candidate_bundle_sha256
            and entitlement.policy_version = policy.policy_version
            and entitlement.enabled
        )
      )
  )
$$;
revoke all on function private.curriculum_grade_release_access(uuid,smallint,text) from public, anon, authenticated;

create or replace function public.get_my_grades_2_9_release_catalog()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid(); v_grade smallint; v_policy public.curriculum_grade_release_policies%rowtype;
  v_units jsonb;
begin
  select student.grade into v_grade from public.profiles profile
  join public.student_profiles student on student.user_id = profile.user_id
  where profile.user_id = v_user_id and profile.role = 'STUDENT' and profile.onboarding_completed;
  if v_user_id is null then raise exception using errcode='P0001', message='CURRICULUM:UNAUTHENTICATED'; end if;
  if v_grade is null or v_grade not between 2 and 9 then raise exception using errcode='P0001', message='CURRICULUM:FORBIDDEN'; end if;
  select * into v_policy from public.curriculum_grade_release_policies where grade = v_grade;
  if not found or not private.curriculum_grade_release_access(v_user_id,v_grade,v_policy.release_id) then
    raise exception using errcode='P0001', message='CURRICULUM:RELEASE_UNAVAILABLE';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'unit_id', unit.unit_id, 'grade', unit.grade, 'domain', unit.domain,
    'title', unit.title, 'description', unit.description,
    'learning_goals', unit.learning_goals, 'total_questions', unit.total_questions,
    'display_order', unit.display_order
  ) order by unit.display_order), '[]'::jsonb) into v_units
  from public.curriculum_release_units unit
  where unit.release_id = v_policy.release_id and unit.grade = v_grade and unit.total_questions > 0;
  return jsonb_build_object('grade',v_grade,'release_mode',v_policy.release_mode,
    'candidate_id',v_policy.candidate_id,'candidate_version',v_policy.candidate_version,
    'candidate_bundle_sha256',v_policy.candidate_bundle_sha256,'policy_version',v_policy.policy_version,
    'units',v_units);
end;
$$;

create or replace function public.get_my_grades_2_9_release_unit(p_unit_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_catalog jsonb; v_release_id text; v_unit public.curriculum_release_units%rowtype;
begin
  v_catalog := public.get_my_grades_2_9_release_catalog();
  select policy.release_id into v_release_id from public.curriculum_grade_release_policies policy
  where policy.grade = (v_catalog->>'grade')::smallint;
  select * into v_unit from public.curriculum_release_units unit
  where unit.release_id=v_release_id and unit.unit_id=lower(btrim(coalesce(p_unit_slug,'')))
    and unit.grade=(v_catalog->>'grade')::smallint and unit.total_questions>0;
  if not found then raise exception using errcode='P0001', message='CURRICULUM:UNIT_UNAVAILABLE'; end if;
  return jsonb_build_object('unit_id',v_unit.unit_id,'grade',v_unit.grade,'domain',v_unit.domain,
    'title',v_unit.title,'description',v_unit.description,'learning_goals',v_unit.learning_goals,
    'theory',v_unit.theory,'worked_examples',v_unit.worked_examples,'total_questions',v_unit.total_questions,
    'display_order',v_unit.display_order);
end;
$$;

create or replace function public.start_or_resume_released_curriculum_unit(p_unit_slug text,p_idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid:=auth.uid(); v_grade smallint; v_policy public.curriculum_grade_release_policies%rowtype;
  v_release public.curriculum_releases%rowtype; v_unit public.curriculum_release_units%rowtype;
  v_attempt_id uuid; v_idempotent_unit text; v_sequence text[]; v_runtime_path text;
begin
  if v_user_id is null then raise exception using errcode='P0001', message='CURRICULUM:UNAUTHENTICATED'; end if;
  if p_idempotency_key is null or lower(btrim(coalesce(p_unit_slug,''))) !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    then raise exception using errcode='P0001', message='CURRICULUM:INVALID_REQUEST'; end if;
  select student.grade into v_grade from public.profiles profile join public.student_profiles student on student.user_id=profile.user_id
  where profile.user_id=v_user_id and profile.role='STUDENT' and profile.onboarding_completed;
  if v_grade is null or v_grade not between 2 and 9 then raise exception using errcode='P0001', message='CURRICULUM:FORBIDDEN'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text||':'||lower(btrim(p_unit_slug)),0));
  select attempt.id,attempt.unit_id into v_attempt_id,v_idempotent_unit from public.curriculum_attempts attempt
  where attempt.student_id=v_user_id and attempt.start_idempotency_key=p_idempotency_key limit 1;
  if v_attempt_id is not null then
    if v_idempotent_unit<>lower(btrim(p_unit_slug)) then raise exception using errcode='P0001', message='CURRICULUM:IDEMPOTENCY_CONFLICT'; end if;
    return private.build_curriculum_attempt_state(v_attempt_id,null);
  end if;
  select attempt.id into v_attempt_id from public.curriculum_attempts attempt
  join public.curriculum_release_units unit on unit.release_id=attempt.release_id and unit.unit_id=attempt.unit_id
  where attempt.student_id=v_user_id and attempt.unit_id=lower(btrim(p_unit_slug)) and attempt.status='IN_PROGRESS' and unit.grade=v_grade
  order by attempt.started_at desc limit 1 for update of attempt;
  if v_attempt_id is not null then return private.build_curriculum_attempt_state(v_attempt_id,null); end if;
  select * into v_policy from public.curriculum_grade_release_policies where grade=v_grade;
  if not found or not private.curriculum_grade_release_access(v_user_id,v_grade,v_policy.release_id)
    then raise exception using errcode='P0001', message='CURRICULUM:RELEASE_UNAVAILABLE'; end if;
  select * into v_release from public.curriculum_releases where release_id=v_policy.release_id;
  select * into v_unit from public.curriculum_release_units where release_id=v_policy.release_id
    and unit_id=lower(btrim(p_unit_slug)) and grade=v_grade and total_questions>0;
  if not found then raise exception using errcode='P0001', message='CURRICULUM:UNIT_UNAVAILABLE'; end if;
  select case when bool_and(question.support_mode='FIXED_SAFE') then 'FIXED_SAFE' else 'ADAPTIVE' end into v_runtime_path
  from public.curriculum_release_questions question where question.release_id=v_release.release_id and question.unit_id=v_unit.unit_id;
  select array_agg(selected.question_id order by selected.priority,selected.skill_occurrence,selected.structure_occurrence,selected.tie_breaker)
  into v_sequence from (
    select ranked.question_id,ranked.priority,ranked.skill_occurrence,ranked.structure_occurrence,ranked.tie_breaker from (
      select question.question_id,
        case
          when progress.mastery_label='NEEDS_PRACTICE' and exposure.count=0 then 0
          when exposure.count=0 then 1
          when progress.mastery_label='NEEDS_PRACTICE' then 2
          else 3
        end as priority,
        row_number() over(partition by question.skill_id order by exposure.count,
          hashtextextended(question.question_id||v_release.deterministic_seed||v_user_id::text,0)) as skill_occurrence,
        row_number() over(partition by question.structural_fingerprint order by exposure.count,
          hashtextextended(question.question_id||v_release.deterministic_seed||v_user_id::text,0)) as structure_occurrence,
        hashtextextended(question.question_id||v_release.deterministic_seed||v_user_id::text,0) as tie_breaker
      from public.curriculum_release_questions question
      left join public.student_curriculum_skill_progress progress on progress.student_id=v_user_id
        and progress.release_id=question.release_id and progress.skill_id=question.skill_id
      left join lateral (
        select count(*)::integer as count from public.curriculum_answers prior_answer
        join public.curriculum_attempts prior_attempt on prior_attempt.id=prior_answer.attempt_id
        where prior_attempt.student_id=v_user_id and prior_attempt.release_id=question.release_id
          and prior_answer.question_id=question.question_id
      ) exposure on true
      where question.release_id=v_release.release_id and question.unit_id=v_unit.unit_id
    ) ranked order by ranked.priority,ranked.skill_occurrence,ranked.structure_occurrence,ranked.tie_breaker limit 12
  ) selected;
  if cardinality(v_sequence)<1 then raise exception using errcode='P0001', message='CURRICULUM:EMPTY_POOL'; end if;
  insert into public.curriculum_attempts(student_id,release_id,content_version,curriculum_source_fingerprint,
    generator_version,deterministic_seed,unit_id,start_idempotency_key,question_sequence,total_questions,
    release_candidate_id,release_bundle_sha256,release_policy_version,release_mode,runtime_path)
  values(v_user_id,v_release.release_id,v_release.content_version,v_release.curriculum_source_fingerprint,
    v_release.generator_version,v_release.deterministic_seed,v_unit.unit_id,p_idempotency_key,v_sequence,cardinality(v_sequence),
    v_policy.candidate_id,v_policy.candidate_bundle_sha256,v_policy.policy_version,v_policy.release_mode,v_runtime_path)
  returning id into v_attempt_id;
  insert into public.student_curriculum_unit_progress(student_id,release_id,unit_id,status,mastery_policy_version)
  values(v_user_id,v_release.release_id,v_unit.unit_id,'IN_PROGRESS',v_release.mastery_policy_version)
  on conflict(student_id,release_id,unit_id) do update set status='IN_PROGRESS',last_activity_at=now();
  return private.build_curriculum_attempt_state(v_attempt_id,null);
end;
$$;

create or replace function public.get_my_released_curriculum_progress()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_user_id uuid:=auth.uid(); v_grade smallint; v_policy public.curriculum_grade_release_policies%rowtype;
  v_units jsonb; v_outcomes jsonb; v_skills jsonb;
begin
  select student.grade into v_grade from public.profiles profile join public.student_profiles student on student.user_id=profile.user_id
  where profile.user_id=v_user_id and profile.role='STUDENT' and profile.onboarding_completed;
  if v_user_id is null then raise exception using errcode='P0001',message='CURRICULUM:UNAUTHENTICATED'; end if;
  if v_grade is null or v_grade not between 2 and 9 then raise exception using errcode='P0001',message='CURRICULUM:FORBIDDEN'; end if;
  select * into v_policy from public.curriculum_grade_release_policies where grade=v_grade;
  if not found then raise exception using errcode='P0001',message='CURRICULUM:RELEASE_UNAVAILABLE'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('unit_id',unit.unit_id,'title',unit.title,
    'status',coalesce(progress.status,'NOT_STARTED'),'evidence_count',coalesce(progress.evidence_count,0),
    'correct_count',coalesce(progress.correct_count,0),'best_score_percent',progress.best_score_percent,
    'mastery_label',case when not exists(select 1 from public.curriculum_release_questions adaptive
      where adaptive.release_id=unit.release_id and adaptive.unit_id=unit.unit_id and adaptive.support_mode='ADAPTIVE')
      then case when progress.status='COMPLETED' then 'DEVELOPING' when progress.status='IN_PROGRESS' then 'IN_PROGRESS' else 'NOT_STARTED' end
      else coalesce(progress.mastery_label,'NOT_STARTED') end,'last_activity_at',progress.last_activity_at,
    'source','UNIVERSAL_CURRICULUM') order by unit.display_order),'[]'::jsonb) into v_units
  from public.curriculum_release_units unit left join public.student_curriculum_unit_progress progress
    on progress.release_id=unit.release_id and progress.unit_id=unit.unit_id and progress.student_id=v_user_id
  where unit.release_id=v_policy.release_id and unit.grade=v_grade and unit.total_questions>0;
  select coalesce(jsonb_agg(jsonb_build_object('title',progress.official_outcome_title,'evidence_count',progress.evidence_count,
    'correct_count',progress.correct_count,'mastery_label',progress.mastery_label,'last_activity_at',progress.last_activity_at,
    'evidence_basis','AUTHORITATIVE_QUESTION_MAPPING') order by progress.last_activity_at desc),'[]'::jsonb) into v_outcomes
  from public.student_curriculum_outcome_progress progress where progress.student_id=v_user_id and progress.release_id=v_policy.release_id;
  select coalesce(jsonb_agg(jsonb_build_object('title',progress.skill_title,'evidence_count',progress.evidence_count,
    'correct_count',progress.correct_count,'mastery_label',progress.mastery_label,'last_activity_at',progress.last_activity_at,
    'evidence_basis','AUTHORITATIVE_QUESTION_MAPPING') order by progress.last_activity_at desc),'[]'::jsonb) into v_skills
  from public.student_curriculum_skill_progress progress join public.curriculum_release_skills skill
    on skill.release_id=progress.release_id and skill.skill_id=progress.skill_id
  where progress.student_id=v_user_id and progress.release_id=v_policy.release_id and skill.support_mode='ADAPTIVE';
  return jsonb_build_object('grade',v_grade,'compatibility_mode','UNIVERSAL_CURRICULUM',
    'mastery_policy_version',v_policy.policy_version,
    'mastery_explanation','Tiến độ được dựng từ lịch sử đã lưu; các chủ đề luyện tập cố định không được gọi là thành thạo thích ứng.',
    'units',v_units,'outcomes',v_outcomes,'skills',v_skills);
end;
$$;

revoke all on function public.get_my_grades_2_9_release_catalog() from public,anon;
revoke all on function public.get_my_grades_2_9_release_unit(text) from public,anon;
revoke all on function public.start_or_resume_released_curriculum_unit(text,uuid) from public,anon;
revoke all on function public.get_my_released_curriculum_progress() from public,anon;
grant execute on function public.get_my_grades_2_9_release_catalog() to authenticated;
grant execute on function public.get_my_grades_2_9_release_unit(text) to authenticated;
grant execute on function public.start_or_resume_released_curriculum_unit(text,uuid) to authenticated;
grant execute on function public.get_my_released_curriculum_progress() to authenticated;
`;

const fixedSafeRuntimeSql = `
create or replace function private.record_static_scoring_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.curriculum_attempts%rowtype;
  v_question public.curriculum_release_questions%rowtype;
  v_difficulty text; v_xp smallint; v_inserted integer:=0;
begin
  select attempt.* into v_attempt from public.curriculum_attempts attempt where attempt.id=new.attempt_id;
  if v_attempt.scoring_policy_version is distinct from 'PLAVE_SCORING_POLICY_V1' then return new; end if;
  if v_attempt.generation_mode<>'MATERIALIZED' then raise exception using errcode='P0001',message='SCORING:SOURCE_MISMATCH'; end if;
  select question.* into v_question from public.curriculum_release_questions question
  where question.release_id=new.release_id and question.unit_id=new.unit_id and question.question_id=new.question_id;
  v_difficulty:=private.scoring_difficulty(v_question.cognitive_level);
  if v_question.question_id is null or v_difficulty is null then
    raise exception using errcode='P0001',message='SCORING:QUESTION_SNAPSHOT_MISSING';
  end if;
  if v_question.support_mode='ADAPTIVE' then
    perform private.record_scoring_evidence_v1(v_attempt.student_id,new.attempt_id,new.question_id,'STATIC',
      v_difficulty,v_question.official_outcome_ids,v_question.official_outcome_titles,new.is_correct,new.answered_at);
  elsif new.is_correct then
    v_xp:=private.xp_award(v_difficulty);
    insert into private.student_xp_ledger(student_id,attempt_id,question_id,difficulty,xp_amount,
      policy_version,idempotency_key,awarded_at)
    values(v_attempt.student_id,new.attempt_id,new.question_id,v_difficulty,v_xp,
      'PLAVE_SCORING_POLICY_V1',new.attempt_id::text||':'||new.question_id||':PLAVE_SCORING_POLICY_V1',new.answered_at)
    on conflict do nothing;
    get diagnostics v_inserted=row_count;
    if v_inserted=1 then
      update public.curriculum_attempts attempt set xp_earned=attempt.xp_earned+v_xp
      where attempt.id=new.attempt_id and attempt.student_id=v_attempt.student_id
        and attempt.scoring_policy_version='PLAVE_SCORING_POLICY_V1';
      if not found then raise exception using errcode='P0001',message='SCORING:ATTEMPT_POLICY_MISMATCH'; end if;
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.rebuild_curriculum_adaptive_projections_0045(
  p_student_id uuid,
  p_release_id text,
  p_skill_id text,
  p_outcome_ids text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_outcome_id text; v_title text; v_count integer; v_correct integer;
  v_recent boolean[]; v_last timestamptz; v_policy text;
begin
  select release.mastery_policy_version into v_policy
  from public.curriculum_releases release where release.release_id=p_release_id;
  delete from public.student_curriculum_skill_progress progress
  using public.curriculum_release_skills skill
  where progress.student_id=p_student_id and progress.release_id=p_release_id
    and progress.skill_id=p_skill_id and skill.release_id=progress.release_id
    and skill.skill_id=progress.skill_id and skill.support_mode='FIXED_SAFE';

  foreach v_outcome_id in array p_outcome_ids loop
    select max(question.official_outcome_titles[array_position(question.official_outcome_ids,v_outcome_id)]),
      count(*)::integer,count(*) filter(where answer.is_correct)::integer,
      (array_agg(answer.is_correct order by answer.answered_at desc))[1:5],max(answer.answered_at)
    into v_title,v_count,v_correct,v_recent,v_last
    from public.curriculum_answers answer
    join public.curriculum_attempts attempt on attempt.id=answer.attempt_id
    join public.curriculum_release_questions question on question.release_id=answer.release_id
      and question.question_id=answer.question_id
    where attempt.student_id=p_student_id and answer.release_id=p_release_id
      and question.support_mode='ADAPTIVE' and v_outcome_id=any(question.official_outcome_ids);
    if coalesce(v_count,0)=0 then
      delete from public.student_curriculum_outcome_progress progress
      where progress.student_id=p_student_id and progress.release_id=p_release_id
        and progress.official_outcome_id=v_outcome_id;
    else
      insert into public.student_curriculum_outcome_progress(student_id,release_id,official_outcome_id,
        official_outcome_title,evidence_count,correct_count,recent_evidence,mastery_label,mastery_policy_version,last_activity_at)
      values(p_student_id,p_release_id,v_outcome_id,v_title,v_count,v_correct,v_recent,
        private.curriculum_mastery_label(v_count,v_correct,v_recent),v_policy,v_last)
      on conflict(student_id,release_id,official_outcome_id) do update set
        official_outcome_title=excluded.official_outcome_title,evidence_count=excluded.evidence_count,
        correct_count=excluded.correct_count,recent_evidence=excluded.recent_evidence,
        mastery_label=excluded.mastery_label,mastery_policy_version=excluded.mastery_policy_version,
        last_activity_at=excluded.last_activity_at;
    end if;
    if exists(select 1 from private.student_mastery_evidence evidence
      where evidence.student_id=p_student_id and evidence.official_outcome_id=v_outcome_id
        and evidence.policy_version='PLAVE_SCORING_POLICY_V1')
    then
      perform private.refresh_outcome_mastery_v1(p_student_id,v_outcome_id);
    else
      delete from private.student_outcome_mastery projection
      where projection.student_id=p_student_id and projection.official_outcome_id=v_outcome_id
        and projection.policy_version='PLAVE_SCORING_POLICY_V1';
    end if;
  end loop;
end;
$$;
revoke all on function private.rebuild_curriculum_adaptive_projections_0045(uuid,text,text,text[])
from public,anon,authenticated;

alter function public.submit_curriculum_answer(uuid,text,text,integer,uuid)
  rename to submit_curriculum_answer_0044_impl;
alter function public.submit_curriculum_answer_0044_impl(uuid,text,text,integer,uuid)
  set schema private;

create function public.submit_curriculum_answer(
  p_attempt_id uuid,p_question_id text,p_answer text,p_expected_revision integer,p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb; v_question public.curriculum_release_questions%rowtype;
  v_replay boolean; v_student_id uuid:=auth.uid();
begin
  select question.* into v_question
  from public.curriculum_attempts attempt
  join public.curriculum_release_questions question on question.release_id=attempt.release_id
    and question.question_id=p_question_id
  where attempt.id=p_attempt_id and attempt.student_id=v_student_id;
  select exists(select 1 from public.curriculum_answers answer
    where answer.attempt_id=p_attempt_id and answer.submission_id=p_idempotency_key)
  into v_replay;
  v_result:=private.submit_curriculum_answer_0044_impl(
    p_attempt_id,p_question_id,p_answer,p_expected_revision,p_idempotency_key);
  if v_question.support_mode='FIXED_SAFE' and not v_replay then
    perform private.rebuild_curriculum_adaptive_projections_0045(
      v_student_id,v_question.release_id,v_question.skill_id,v_question.official_outcome_ids);
    if v_result ? 'scoring' then
      v_result:=jsonb_set(v_result,'{scoring,mastery_changes}','[]'::jsonb,true);
    end if;
  end if;
  return v_result;
end;
$$;
revoke all on function private.submit_curriculum_answer_0044_impl(uuid,text,text,integer,uuid)
from public,anon,authenticated;
revoke all on function public.submit_curriculum_answer(uuid,text,text,integer,uuid) from public,anon;
grant execute on function public.submit_curriculum_answer(uuid,text,text,integer,uuid) to authenticated;
`;

const verificationSql = release.grades.map(({ summary }) => `
  if (select count(*) from public.curriculum_release_units where release_id=${sqlText(summary.releaseId)})<>${summary.units}
    or (select count(*) from public.curriculum_release_questions where release_id=${sqlText(summary.releaseId)})<>${summary.questions}
    or (select count(*) from private.curriculum_release_solutions where release_id=${sqlText(summary.releaseId)})<>${summary.questions}
    or (select count(*) from public.curriculum_release_skills where release_id=${sqlText(summary.releaseId)})<>${summary.skills}
  then raise exception 'GRADES_2_9_RELEASE:COUNT_MISMATCH:G${summary.grade}'; end if;
  if not exists(select 1 from public.curriculum_grade_release_policies where grade=${summary.grade}
    and release_id=${sqlText(summary.releaseId)} and candidate_id=${sqlText(summary.candidate.candidateId)}
    and candidate_version=${sqlText(summary.candidate.version)} and candidate_bundle_sha256=${sqlText(summary.candidate.bundleHash)}
    and policy_version=${sqlText(summary.candidate.policyVersion)} and release_mode='HIDDEN'
    and not catalog_enabled and not runtime_enabled and not retention_enabled)
  then raise exception 'GRADES_2_9_RELEASE:TUPLE_MISMATCH:G${summary.grade}'; end if;`).join("\n");

const migration = `begin;\n${schemaSql}\n${batches(`insert into public.curriculum_releases(release_id,content_version,curriculum_source_fingerprint,generator_version,deterministic_seed,mastery_policy_version,public_payload_sha256,private_solution_sha256,bundle_sha256,status,activation_state)`, releaseRows)}\n${batches(`insert into public.curriculum_grade_release_policies(grade,release_id,candidate_id,candidate_version,candidate_bundle_sha256,policy_version,combined_a_k_sha256,release_mode,catalog_enabled,runtime_enabled,retention_enabled)`, policyRows)}\n${batches(`insert into public.curriculum_release_units(release_id,unit_id,grade,domain,title,description,learning_goals,theory,worked_examples,official_outcome_ids,skill_ids,display_order,total_questions)`, unitRows)}\n${batches(`insert into public.curriculum_release_questions(release_id,unit_id,question_id,display_order,answer_type,prompt,options,visual,cognitive_level,official_outcome_ids,official_outcome_titles,skill_id,skill_title,question_payload_hash,structural_fingerprint,support_mode)`, questionRows)}\n${batches(`insert into private.curriculum_release_solutions(release_id,question_id,normalized_correct_answer,correct_answer,solution_steps,feedback,solution_payload_hash)`, solutionRows)}\n${batches(`insert into public.curriculum_release_skills(release_id,grade,skill_id,skill_title,support_mode)`, skillRows)}\n${fixedSafeRuntimeSql}\ndo $verify$ begin\n${verificationSql}\n  if (select count(*) from public.curriculum_release_pilot_entitlements)<>0 then raise exception 'GRADES_2_9_RELEASE:DEFAULT_ENTITLEMENT_FORBIDDEN'; end if;\nend; $verify$;\ncommit;\n`;

const migrationPath = join(root, "supabase/migrations/0045_grades_2_9_local_public_release.sql");
const inventoryPath = join(root, "content/releases/grades-2-9/release-inventory.json");
mkdirSync(dirname(inventoryPath), { recursive: true });
writeFileSync(migrationPath, migration, "utf8");
const inventoryCore = {
  schemaVersion: release.schemaVersion,
  frozenCombinedAKHash: release.frozenCombinedAKHash,
  policyVersion: release.policyVersion,
  defaultMode: release.defaultMode,
  totals: release.totals,
  grades: release.grades.map(({ summary, units, questions }) => ({
    ...summary,
    units: units.map((unit) => ({ unitId: unit.unitId, questionCount: unit.totalQuestions, runtimeAvailable: unit.runtimeAvailable })),
    skillSupport: [...new Map(questions.map((question) => [question.skillId, question.supportMode])).entries()].sort(([a], [b]) => a.localeCompare(b)),
  })),
  migrationSha256: sha256(migration),
} as const;
const inventory = { ...inventoryCore, inventoryHash: sha256(canonicalize(inventoryCore)) };
writeFileSync(inventoryPath, `${canonicalize(inventory)}\n`, "utf8");
console.log(`GRADES_2_9_RELEASE_BUILD_OK questions=${release.totals.questions} skills=${release.totals.skills} units=${release.totals.units} inventory=${inventory.inventoryHash} migration=${inventory.migrationSha256}`);
