begin;

-- One XP contract for every Student learning answer source. Existing practice
-- and adaptive attempts remain historical (policy NULL); new attempts opt in.

alter table public.practice_attempts
  add column xp_policy_version text default 'PLAVE_SCORING_POLICY_V1',
  add column xp_earned integer not null default 0,
  add constraint practice_attempt_xp_policy_check check (
    xp_policy_version is null
    or xp_policy_version = 'PLAVE_SCORING_POLICY_V1'
  ),
  add constraint practice_attempt_xp_earned_check check (xp_earned >= 0),
  add constraint practice_attempt_id_student_xp_unique unique (id, student_id);

alter table public.practice_attempts alter column xp_policy_version drop default;
update public.practice_attempts set xp_policy_version = null;
alter table public.practice_attempts alter column xp_policy_version
  set default 'PLAVE_SCORING_POLICY_V1';

alter table public.adaptive_practice_attempts
  add column xp_policy_version text default 'PLAVE_SCORING_POLICY_V1',
  add column xp_earned integer not null default 0,
  add constraint adaptive_attempt_xp_policy_check check (
    xp_policy_version is null
    or xp_policy_version = 'PLAVE_SCORING_POLICY_V1'
  ),
  add constraint adaptive_attempt_xp_earned_check check (xp_earned >= 0),
  add constraint adaptive_attempt_id_student_xp_unique unique (id, student_id);

alter table public.adaptive_practice_attempts alter column xp_policy_version drop default;
update public.adaptive_practice_attempts set xp_policy_version = null;
alter table public.adaptive_practice_attempts alter column xp_policy_version
  set default 'PLAVE_SCORING_POLICY_V1';

create table private.student_xp_attempts (
  runtime_source text not null check (
    runtime_source in ('PRACTICE_FIXED', 'CURRICULUM', 'ADAPTIVE_PILOT')
  ),
  attempt_id uuid not null,
  student_id uuid not null references public.student_profiles(user_id)
    on delete restrict,
  policy_version text not null check (
    policy_version = 'PLAVE_SCORING_POLICY_V1'
  ),
  registered_at timestamptz not null default now(),
  primary key (runtime_source, attempt_id),
  unique (runtime_source, attempt_id, student_id)
);

alter table private.student_xp_attempts enable row level security;
revoke all on table private.student_xp_attempts from public, anon, authenticated;

create or replace function private.validate_student_xp_attempt_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.policy_version <> 'PLAVE_SCORING_POLICY_V1' then
    raise exception using errcode = 'P0001',
      message = 'SCORING:ATTEMPT_POLICY_MISMATCH';
  end if;
  if new.runtime_source = 'PRACTICE_FIXED' and not exists (
    select 1 from public.practice_attempts attempt
    where attempt.id = new.attempt_id
      and attempt.student_id = new.student_id
      and attempt.xp_policy_version = new.policy_version
  ) then
    raise exception using errcode = 'P0001', message = 'SCORING:ATTEMPT_MISMATCH';
  elsif new.runtime_source = 'CURRICULUM' and not exists (
    select 1 from public.curriculum_attempts attempt
    where attempt.id = new.attempt_id
      and attempt.student_id = new.student_id
      and attempt.scoring_policy_version = new.policy_version
  ) then
    raise exception using errcode = 'P0001', message = 'SCORING:ATTEMPT_MISMATCH';
  elsif new.runtime_source = 'ADAPTIVE_PILOT' and not exists (
    select 1 from public.adaptive_practice_attempts attempt
    where attempt.id = new.attempt_id
      and attempt.student_id = new.student_id
      and attempt.xp_policy_version = new.policy_version
  ) then
    raise exception using errcode = 'P0001', message = 'SCORING:ATTEMPT_MISMATCH';
  end if;
  return new;
end;
$$;

create trigger student_xp_attempt_validate_v1
before insert or update on private.student_xp_attempts
for each row execute function private.validate_student_xp_attempt_v1();

insert into private.student_xp_attempts (
  runtime_source, attempt_id, student_id, policy_version, registered_at
)
select 'CURRICULUM', attempt.id, attempt.student_id,
  attempt.scoring_policy_version, attempt.started_at
from public.curriculum_attempts attempt
where attempt.scoring_policy_version = 'PLAVE_SCORING_POLICY_V1';

create or replace function private.register_student_xp_attempt_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text := case tg_table_name
    when 'practice_attempts' then 'PRACTICE_FIXED'
    when 'curriculum_attempts' then 'CURRICULUM'
    when 'adaptive_practice_attempts' then 'ADAPTIVE_PILOT'
    else null
  end;
  v_policy text := coalesce(
    to_jsonb(new) ->> 'scoring_policy_version',
    to_jsonb(new) ->> 'xp_policy_version'
  );
begin
  if v_source is null then
    raise exception using errcode = 'P0001', message = 'SCORING:SOURCE_MISMATCH';
  end if;
  if v_policy is null then return new; end if;
  insert into private.student_xp_attempts (
    runtime_source, attempt_id, student_id, policy_version, registered_at
  ) values (v_source, new.id, new.student_id, v_policy, new.started_at);
  return new;
end;
$$;

create trigger practice_attempt_register_xp_v1
after insert on public.practice_attempts for each row
execute function private.register_student_xp_attempt_v1();
create trigger curriculum_attempt_register_xp_v1
after insert on public.curriculum_attempts for each row
execute function private.register_student_xp_attempt_v1();
create trigger adaptive_attempt_register_xp_v1
after insert on public.adaptive_practice_attempts for each row
execute function private.register_student_xp_attempt_v1();

alter table private.student_xp_ledger
  add column runtime_source text not null default 'CURRICULUM';
alter table private.student_xp_ledger alter column runtime_source drop default;

alter table private.student_xp_ledger
  drop constraint student_xp_ledger_attempt_id_student_id_fkey,
  drop constraint student_xp_idempotency_key_check;

do $drop_old_unique$
declare v_name text;
begin
  select constraint_name into v_name
  from information_schema.table_constraints
  where constraint_schema = 'private'
    and table_name = 'student_xp_ledger'
    and constraint_type = 'UNIQUE'
    and constraint_name <> 'student_xp_ledger_idempotency_key_key'
    and constraint_name <> 'student_xp_ledger_event_id_key'
  order by constraint_name
  limit 1;
  if v_name is not null then
    execute format('alter table private.student_xp_ledger drop constraint %I', v_name);
  end if;
end;
$drop_old_unique$;

alter table private.student_xp_ledger
  add constraint student_xp_runtime_source_check check (
    runtime_source in ('PRACTICE_FIXED', 'CURRICULUM', 'ADAPTIVE_PILOT')
  ),
  add constraint student_xp_runtime_answer_unique unique (
    student_id, runtime_source, attempt_id, question_id, policy_version
  ),
  add constraint student_xp_attempt_registry_fkey foreign key (
    runtime_source, attempt_id, student_id
  ) references private.student_xp_attempts (
    runtime_source, attempt_id, student_id
  ) on delete restrict,
  add constraint student_xp_unified_idempotency_check check (
    idempotency_key = runtime_source || ':' || attempt_id::text || ':' ||
      question_id || ':PLAVE_SCORING_POLICY_V1'
    or (
      runtime_source = 'CURRICULUM'
      and idempotency_key = attempt_id::text || ':' || question_id ||
        ':PLAVE_SCORING_POLICY_V1'
    )
  );

create or replace function private.award_student_xp_v1(
  p_runtime_source text,
  p_student_id uuid,
  p_attempt_id uuid,
  p_question_id text,
  p_difficulty text,
  p_is_correct boolean,
  p_answered_at timestamptz
)
returns smallint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_xp smallint;
  v_inserted integer := 0;
begin
  if p_runtime_source not in ('PRACTICE_FIXED', 'CURRICULUM', 'ADAPTIVE_PILOT')
    or p_difficulty not in ('EASY', 'MEDIUM', 'HARD')
    or not exists (
      select 1 from private.student_xp_attempts attempt
      where attempt.runtime_source = p_runtime_source
        and attempt.attempt_id = p_attempt_id
        and attempt.student_id = p_student_id
        and attempt.policy_version = 'PLAVE_SCORING_POLICY_V1'
    )
  then
    raise exception using errcode = 'P0001', message = 'SCORING:ATTEMPT_MISMATCH';
  end if;

  if p_runtime_source = 'PRACTICE_FIXED' and not exists (
    select 1
    from public.practice_answers answer
    join public.practice_attempts attempt on attempt.id = answer.attempt_id
    join public.questions question on question.code = answer.question_id
      and question.unit_slug = attempt.unit_slug
    where answer.attempt_id = p_attempt_id
      and answer.question_id = p_question_id
      and attempt.student_id = p_student_id
      and answer.is_correct = p_is_correct
      and question.difficulty = p_difficulty
  ) then
    raise exception using errcode = 'P0001', message = 'SCORING:ANSWER_MISMATCH';
  elsif p_runtime_source = 'ADAPTIVE_PILOT' and not exists (
    select 1
    from public.adaptive_practice_answers answer
    join public.adaptive_practice_attempts attempt on attempt.id = answer.attempt_id
    join public.questions question on question.code = answer.question_id
      and question.unit_slug = attempt.unit_slug
    where answer.attempt_id = p_attempt_id
      and answer.question_id = p_question_id
      and attempt.student_id = p_student_id
      and answer.is_correct = p_is_correct
      and question.difficulty = p_difficulty
  ) then
    raise exception using errcode = 'P0001', message = 'SCORING:ANSWER_MISMATCH';
  elsif p_runtime_source = 'CURRICULUM' and not exists (
    select 1 from public.curriculum_attempts attempt
    where attempt.id = p_attempt_id and attempt.student_id = p_student_id
      and (
        (attempt.generation_mode = 'MATERIALIZED' and exists (
          select 1 from public.curriculum_answers answer
          join public.curriculum_release_questions question
            on question.release_id = answer.release_id
            and question.unit_id = answer.unit_id
            and question.question_id = answer.question_id
          where answer.attempt_id = p_attempt_id
            and answer.question_id = p_question_id
            and answer.is_correct = p_is_correct
            and private.scoring_difficulty(question.cognitive_level) = p_difficulty
        ))
        or (attempt.generation_mode = 'ON_DEMAND' and exists (
          select 1 from public.curriculum_generated_answers answer
          join public.curriculum_generated_questions question
            on question.attempt_id = answer.attempt_id
            and question.question_id = answer.question_id
          where answer.attempt_id = p_attempt_id
            and answer.question_id = p_question_id
            and answer.is_correct = p_is_correct
            and private.scoring_difficulty(question.difficulty) = p_difficulty
        ))
      )
  ) then
    raise exception using errcode = 'P0001', message = 'SCORING:ANSWER_MISMATCH';
  end if;

  if not p_is_correct then return 0; end if;
  v_xp := private.xp_award(p_difficulty);
  insert into private.student_xp_ledger (
    student_id, runtime_source, attempt_id, question_id, difficulty,
    xp_amount, policy_version, idempotency_key, awarded_at
  ) values (
    p_student_id, p_runtime_source, p_attempt_id, p_question_id, p_difficulty,
    v_xp, 'PLAVE_SCORING_POLICY_V1', p_runtime_source || ':' ||
      p_attempt_id::text || ':' || p_question_id || ':PLAVE_SCORING_POLICY_V1',
    p_answered_at
  ) on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return 0; end if;

  if p_runtime_source = 'PRACTICE_FIXED' then
    update public.practice_attempts set xp_earned = xp_earned + v_xp
    where id = p_attempt_id and student_id = p_student_id
      and xp_policy_version = 'PLAVE_SCORING_POLICY_V1';
  elsif p_runtime_source = 'CURRICULUM' then
    update public.curriculum_attempts set xp_earned = xp_earned + v_xp
    where id = p_attempt_id and student_id = p_student_id
      and scoring_policy_version = 'PLAVE_SCORING_POLICY_V1';
  else
    update public.adaptive_practice_attempts set xp_earned = xp_earned + v_xp
    where id = p_attempt_id and student_id = p_student_id
      and xp_policy_version = 'PLAVE_SCORING_POLICY_V1';
  end if;
  if not found then
    raise exception using errcode = 'P0001', message = 'SCORING:ATTEMPT_POLICY_MISMATCH';
  end if;
  return v_xp;
end;
$$;

create or replace function private.record_practice_xp_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_attempt public.practice_attempts%rowtype; v_difficulty text;
begin
  select * into v_attempt from public.practice_attempts where id = new.attempt_id;
  if v_attempt.xp_policy_version is null then return new; end if;
  select difficulty into v_difficulty from public.questions
  where code = new.question_id and unit_slug = v_attempt.unit_slug;
  if v_difficulty is null then
    raise exception using errcode = 'P0001', message = 'SCORING:QUESTION_SNAPSHOT_MISSING';
  end if;
  perform private.award_student_xp_v1('PRACTICE_FIXED', v_attempt.student_id,
    new.attempt_id, new.question_id, v_difficulty, new.is_correct, new.answered_at);
  return new;
end; $$;

create trigger practice_answer_scoring_v1 after insert on public.practice_answers
for each row execute function private.record_practice_xp_v1();

create or replace function private.record_adaptive_practice_xp_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_attempt public.adaptive_practice_attempts%rowtype; v_difficulty text;
begin
  select * into v_attempt from public.adaptive_practice_attempts where id = new.attempt_id;
  if v_attempt.xp_policy_version is null then return new; end if;
  select difficulty into v_difficulty from public.questions
  where code = new.question_id and unit_slug = v_attempt.unit_slug;
  if v_difficulty is null then
    raise exception using errcode = 'P0001', message = 'SCORING:QUESTION_SNAPSHOT_MISSING';
  end if;
  perform private.award_student_xp_v1('ADAPTIVE_PILOT', v_attempt.student_id,
    new.attempt_id, new.question_id, v_difficulty, new.is_correct, new.answered_at);
  return new;
end; $$;

create trigger adaptive_practice_answer_scoring_v1
after insert on public.adaptive_practice_answers for each row
execute function private.record_adaptive_practice_xp_v1();

create or replace function private.record_scoring_evidence_v1(
  p_student_id uuid, p_attempt_id uuid, p_question_id text,
  p_question_source text, p_difficulty text, p_outcome_ids text[],
  p_outcome_titles text[], p_is_correct boolean, p_answered_at timestamptz
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_index integer; v_inserted integer := 0;
begin
  if cardinality(p_outcome_ids) = 0
    or cardinality(p_outcome_ids) <> cardinality(p_outcome_titles)
    or p_difficulty not in ('EASY', 'MEDIUM', 'HARD') then
    raise exception using errcode = 'P0001', message = 'SCORING:INVALID_EVIDENCE_MAPPING';
  end if;
  perform private.award_student_xp_v1('CURRICULUM', p_student_id,
    p_attempt_id, p_question_id, p_difficulty, p_is_correct, p_answered_at);
  for v_index in 1..cardinality(p_outcome_ids) loop
    insert into private.student_mastery_evidence (
      student_id, attempt_id, question_id, question_source,
      official_outcome_id, official_outcome_title, difficulty,
      is_correct, policy_version, answered_at
    ) values (
      p_student_id, p_attempt_id, p_question_id, p_question_source,
      p_outcome_ids[v_index], p_outcome_titles[v_index], p_difficulty,
      p_is_correct, 'PLAVE_SCORING_POLICY_V1', p_answered_at
    ) on conflict do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted = 1 then
      perform private.refresh_outcome_mastery_v1(p_student_id, p_outcome_ids[v_index]);
    end if;
  end loop;
end; $$;

-- 0045's FIXED_SAFE trigger bypassed record_scoring_evidence_v1. Route every
-- curriculum support mode through the same award function while keeping
-- mastery evidence exclusive to adaptive learning outcomes.
create or replace function private.record_static_scoring_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_attempt public.curriculum_attempts%rowtype;
  v_question public.curriculum_release_questions%rowtype; v_difficulty text;
begin
  select * into v_attempt from public.curriculum_attempts where id = new.attempt_id;
  if v_attempt.scoring_policy_version is distinct from 'PLAVE_SCORING_POLICY_V1' then return new; end if;
  if v_attempt.generation_mode <> 'MATERIALIZED' then
    raise exception using errcode = 'P0001', message = 'SCORING:SOURCE_MISMATCH';
  end if;
  select * into v_question from public.curriculum_release_questions
  where release_id = new.release_id and unit_id = new.unit_id
    and question_id = new.question_id;
  v_difficulty := private.scoring_difficulty(v_question.cognitive_level);
  if v_question.question_id is null or v_difficulty is null then
    raise exception using errcode = 'P0001', message = 'SCORING:QUESTION_SNAPSHOT_MISSING';
  end if;
  if v_question.support_mode = 'ADAPTIVE' then
    perform private.record_scoring_evidence_v1(v_attempt.student_id,
      new.attempt_id, new.question_id, 'STATIC', v_difficulty,
      v_question.official_outcome_ids, v_question.official_outcome_titles,
      new.is_correct, new.answered_at);
  else
    perform private.award_student_xp_v1('CURRICULUM', v_attempt.student_id,
      new.attempt_id, new.question_id, v_difficulty, new.is_correct, new.answered_at);
  end if;
  return new;
end; $$;

create or replace function private.xp_submission_payload_v1(
  p_runtime_source text, p_attempt_id uuid, p_question_id text,
  p_replay boolean
)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'answer_xp_awarded', case when p_replay then 0 else coalesce((
      select ledger.xp_amount from private.student_xp_ledger ledger
      where ledger.student_id = auth.uid()
        and ledger.runtime_source = p_runtime_source
        and ledger.attempt_id = p_attempt_id
        and ledger.question_id = p_question_id
        and ledger.policy_version = 'PLAVE_SCORING_POLICY_V1'
    ), 0) end,
    'attempt_xp_earned', coalesce((
      select sum(ledger.xp_amount) from private.student_xp_ledger ledger
      where ledger.student_id = auth.uid()
        and ledger.runtime_source = p_runtime_source
        and ledger.attempt_id = p_attempt_id
    ), 0),
    'total_xp_after', coalesce((
      select sum(ledger.xp_amount) from private.student_xp_ledger ledger
      where ledger.student_id = auth.uid()
    ), 0),
    'policy_version', registry.policy_version,
    'eligible', registry.policy_version is not null,
    'zero_xp_reason', case
      when registry.policy_version is null then 'HISTORICAL_ATTEMPT_NOT_ELIGIBLE'
      when p_replay then 'ANSWER_ALREADY_PERSISTED'
      when exists (
        select 1 from private.student_xp_ledger ledger
        where ledger.student_id = auth.uid()
          and ledger.runtime_source = p_runtime_source
          and ledger.attempt_id = p_attempt_id
          and ledger.question_id = p_question_id
      ) then null
      else 'INCORRECT_ANSWER'
    end
  )
  from (select (
    select attempt.policy_version from private.student_xp_attempts attempt
    where attempt.runtime_source = p_runtime_source
      and attempt.attempt_id = p_attempt_id
      and attempt.student_id = auth.uid()
  ) as policy_version) registry
$$;

alter function public.submit_practice_answer(uuid, text, text)
  rename to submit_practice_answer_0045_impl;
alter function public.submit_practice_answer_0045_impl(uuid, text, text)
  set schema private;
create function public.submit_practice_answer(
  p_attempt_id uuid, p_question_id text, p_answer text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_replay boolean; v_result jsonb;
begin
  select exists (select 1 from public.practice_answers answer
    join public.practice_attempts attempt on attempt.id = answer.attempt_id
    where answer.attempt_id = p_attempt_id and answer.question_id = p_question_id
      and attempt.student_id = auth.uid()) into v_replay;
  v_result := private.submit_practice_answer_0045_impl(
    p_attempt_id, p_question_id, p_answer);
  return v_result || jsonb_build_object('xp',
    private.xp_submission_payload_v1('PRACTICE_FIXED', p_attempt_id, p_question_id, v_replay));
end; $$;

alter function public.submit_adaptive_practice_answer(uuid, text, text, integer, uuid)
  rename to submit_adaptive_practice_answer_0045_impl;
alter function public.submit_adaptive_practice_answer_0045_impl(uuid, text, text, integer, uuid)
  set schema private;
create function public.submit_adaptive_practice_answer(
  p_attempt_id uuid, p_question_id text, p_answer text,
  p_expected_revision integer, p_idempotency_key uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_replay boolean; v_result jsonb;
begin
  select exists (select 1 from public.adaptive_practice_answers answer
    join public.adaptive_practice_attempts attempt on attempt.id = answer.attempt_id
    where answer.attempt_id = p_attempt_id and answer.submission_id = p_idempotency_key
      and attempt.student_id = auth.uid()) into v_replay;
  v_result := private.submit_adaptive_practice_answer_0045_impl(
    p_attempt_id, p_question_id, p_answer, p_expected_revision, p_idempotency_key);
  return v_result || jsonb_build_object('xp',
    private.xp_submission_payload_v1('ADAPTIVE_PILOT', p_attempt_id, p_question_id, v_replay));
end; $$;

alter function public.get_adaptive_practice_state(uuid)
  rename to get_adaptive_practice_state_0045_impl;
alter function public.get_adaptive_practice_state_0045_impl(uuid)
  set schema private;
create function public.get_adaptive_practice_state(p_attempt_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select private.get_adaptive_practice_state_0045_impl(p_attempt_id) ||
    jsonb_build_object('xp', private.xp_submission_payload_v1(
      'ADAPTIVE_PILOT', p_attempt_id, '', true
    ))
$$;

alter function public.submit_curriculum_answer(uuid, text, text, integer, uuid)
  rename to submit_curriculum_answer_0045_impl;
alter function public.submit_curriculum_answer_0045_impl(uuid, text, text, integer, uuid)
  set schema private;
create function public.submit_curriculum_answer(
  p_attempt_id uuid, p_question_id text, p_answer text,
  p_expected_revision integer, p_idempotency_key uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_replay boolean; v_result jsonb;
begin
  select exists (select 1 from public.curriculum_answers answer
    join public.curriculum_attempts attempt on attempt.id = answer.attempt_id
    where answer.attempt_id = p_attempt_id and answer.submission_id = p_idempotency_key
      and attempt.student_id = auth.uid()) into v_replay;
  v_result := private.submit_curriculum_answer_0045_impl(
    p_attempt_id, p_question_id, p_answer, p_expected_revision, p_idempotency_key);
  return v_result || jsonb_build_object('xp',
    private.xp_submission_payload_v1('CURRICULUM', p_attempt_id, p_question_id, v_replay));
end; $$;

alter function public.submit_generated_curriculum_answer(uuid, text, text, integer, uuid)
  rename to submit_generated_curriculum_answer_0045_impl;
alter function public.submit_generated_curriculum_answer_0045_impl(uuid, text, text, integer, uuid)
  set schema private;
create function public.submit_generated_curriculum_answer(
  p_attempt_id uuid, p_question_id text, p_answer text,
  p_expected_revision integer, p_idempotency_key uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_replay boolean; v_result jsonb;
begin
  select exists (select 1 from public.curriculum_generated_answers answer
    join public.curriculum_attempts attempt on attempt.id = answer.attempt_id
    where answer.attempt_id = p_attempt_id and answer.submission_id = p_idempotency_key
      and attempt.student_id = auth.uid()) into v_replay;
  v_result := private.submit_generated_curriculum_answer_0045_impl(
    p_attempt_id, p_question_id, p_answer, p_expected_revision, p_idempotency_key);
  return v_result || jsonb_build_object('xp',
    private.xp_submission_payload_v1('CURRICULUM', p_attempt_id, p_question_id, v_replay));
end; $$;

create function public.get_my_xp_attempt_projection(
  p_runtime_source text, p_attempt_id uuid, p_question_id text default null
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'SCORING:UNAUTHENTICATED';
  end if;
  if not exists (select 1 from private.student_xp_attempts attempt
    where attempt.runtime_source = p_runtime_source
      and attempt.attempt_id = p_attempt_id and attempt.student_id = v_user_id)
  then
    raise exception using errcode = 'P0001', message = 'SCORING:FORBIDDEN';
  end if;
  return private.xp_submission_payload_v1(
    p_runtime_source, p_attempt_id, coalesce(p_question_id, ''), true);
end; $$;

create or replace function private.student_scoring_summary_v1(
  p_student_id uuid
)
returns jsonb language sql stable security definer set search_path = '' as $$
  with unified_attempts as (
    select 'CURRICULUM'::text as runtime_source, attempt.id,
      attempt.scoring_policy_version as policy_version,
      attempt.score_percent, attempt.score_earned_weight as earned_weight,
      attempt.score_possible_weight as possible_weight, attempt.xp_earned,
      attempt.status = 'COMPLETED' as lesson_completed,
      attempt.started_at
    from public.curriculum_attempts attempt
    where attempt.student_id = p_student_id
    union all
    select 'PRACTICE_FIXED', attempt.id, attempt.xp_policy_version,
      case when attempt.status = 'COMPLETED' then
        round(attempt.correct_count::numeric * 100 / attempt.total_questions)::smallint
      else null end, null::smallint, null::smallint, attempt.xp_earned,
      attempt.status = 'COMPLETED', attempt.started_at
    from public.practice_attempts attempt where attempt.student_id = p_student_id
    union all
    select 'ADAPTIVE_PILOT', attempt.id, attempt.xp_policy_version,
      case when attempt.status <> 'IN_PROGRESS' and attempt.answered_count > 0 then
        round(attempt.correct_count::numeric * 100 / attempt.answered_count)::smallint
      else null end, null::smallint, null::smallint, attempt.xp_earned,
      attempt.status <> 'IN_PROGRESS', attempt.started_at
    from public.adaptive_practice_attempts attempt where attempt.student_id = p_student_id
  ), recent_events as (
    select ledger.event_id, ledger.awarded_at, ledger.xp_amount,
      ledger.difficulty, case ledger.runtime_source
        when 'CURRICULUM' then (
          select unit.title from public.curriculum_attempts attempt
          join public.curriculum_release_units unit
            on unit.release_id = attempt.release_id and unit.unit_id = attempt.unit_id
          where attempt.id = ledger.attempt_id and attempt.student_id = ledger.student_id
        )
        else (
          select unit.title from public.learning_units unit where unit.slug = case
            when ledger.runtime_source = 'PRACTICE_FIXED' then
              (select attempt.unit_slug from public.practice_attempts attempt
               where attempt.id = ledger.attempt_id and attempt.student_id = ledger.student_id)
            else
              (select attempt.unit_slug from public.adaptive_practice_attempts attempt
               where attempt.id = ledger.attempt_id and attempt.student_id = ledger.student_id)
          end
        )
      end as unit_title
    from private.student_xp_ledger ledger
    where ledger.student_id = p_student_id
    order by ledger.awarded_at desc, ledger.event_id desc limit 10
  )
  select jsonb_build_object(
    'policy_version', 'PLAVE_SCORING_POLICY_V1',
    'total_xp', coalesce((select sum(xp_amount)
      from private.student_xp_ledger where student_id = p_student_id), 0),
    'recent_xp', coalesce((select jsonb_agg(jsonb_build_object(
      'amount', event.xp_amount, 'difficulty', event.difficulty,
      'unit_title', event.unit_title, 'awarded_at', event.awarded_at
    ) order by event.awarded_at desc, event.event_id desc)
      from recent_events event), '[]'::jsonb),
    'mastery_summary', jsonb_build_object(
      'started', (select count(*) from private.student_outcome_mastery
        where student_id = p_student_id),
      'mastered', (select count(*) from private.student_outcome_mastery
        where student_id = p_student_id and status = 'MASTERED'),
      'needs_review', (select count(*) from private.student_outcome_mastery
        where student_id = p_student_id and status = 'NEEDS_REVIEW')
    ),
    'outcomes', coalesce((select jsonb_agg(jsonb_build_object(
      'title', mastery.official_outcome_title,
      'evidence_count', mastery.evidence_count,
      'correct_count', mastery.correct_count,
      'mastery_percent', mastery.mastery_percent,
      'status', mastery.status,
      'last_evidence_at', mastery.last_evidence_at
    ) order by mastery.last_evidence_at desc)
      from private.student_outcome_mastery mastery
      where mastery.student_id = p_student_id
        and mastery.policy_version = 'PLAVE_SCORING_POLICY_V1'), '[]'::jsonb),
    'attempts', coalesce((select jsonb_agg(jsonb_build_object(
      'runtime_source', attempt.runtime_source,
      'attempt_id', attempt.id,
      'policy_version', attempt.policy_version,
      'legacy', attempt.policy_version is null,
      'score_percent', attempt.score_percent,
      'earned_weight', attempt.earned_weight,
      'possible_weight', attempt.possible_weight,
      'xp_earned', attempt.xp_earned,
      'lesson_completed', attempt.lesson_completed
    ) order by attempt.started_at desc) from unified_attempts attempt), '[]'::jsonb)
  )
$$;

revoke all on function private.validate_student_xp_attempt_v1() from public, anon, authenticated;
revoke all on function private.register_student_xp_attempt_v1() from public, anon, authenticated;
revoke all on function private.award_student_xp_v1(text,uuid,uuid,text,text,boolean,timestamptz) from public, anon, authenticated;
revoke all on function private.record_practice_xp_v1() from public, anon, authenticated;
revoke all on function private.record_adaptive_practice_xp_v1() from public, anon, authenticated;
revoke all on function private.xp_submission_payload_v1(text,uuid,text,boolean) from public, anon, authenticated;
revoke all on function private.submit_practice_answer_0045_impl(uuid,text,text) from public, anon, authenticated;
revoke all on function private.submit_adaptive_practice_answer_0045_impl(uuid,text,text,integer,uuid) from public, anon, authenticated;
revoke all on function private.get_adaptive_practice_state_0045_impl(uuid) from public, anon, authenticated;
revoke all on function private.submit_curriculum_answer_0045_impl(uuid,text,text,integer,uuid) from public, anon, authenticated;
revoke all on function private.submit_generated_curriculum_answer_0045_impl(uuid,text,text,integer,uuid) from public, anon, authenticated;
revoke all on function public.submit_practice_answer(uuid,text,text) from public, anon;
revoke all on function public.submit_adaptive_practice_answer(uuid,text,text,integer,uuid) from public, anon;
revoke all on function public.get_adaptive_practice_state(uuid) from public, anon;
revoke all on function public.submit_curriculum_answer(uuid,text,text,integer,uuid) from public, anon;
revoke all on function public.submit_generated_curriculum_answer(uuid,text,text,integer,uuid) from public, anon;
revoke all on function public.get_my_xp_attempt_projection(text,uuid,text) from public, anon;
grant execute on function public.submit_practice_answer(uuid,text,text) to authenticated;
grant execute on function public.submit_adaptive_practice_answer(uuid,text,text,integer,uuid) to authenticated;
grant execute on function public.get_adaptive_practice_state(uuid) to authenticated;
grant execute on function public.submit_curriculum_answer(uuid,text,text,integer,uuid) to authenticated;
grant execute on function public.submit_generated_curriculum_answer(uuid,text,text,integer,uuid) to authenticated;
grant execute on function public.get_my_xp_attempt_projection(text,uuid,text) to authenticated;

comment on table private.student_xp_attempts is
  'V1 polymorphic attempt registry. Source discriminator prevents nullable-FK ambiguity and cross-runtime idempotency collisions.';
comment on function private.award_student_xp_v1(text,uuid,uuid,text,text,boolean,timestamptz) is
  'Canonical exactly-once XP award: EASY=10, MEDIUM=15, HARD=20, incorrect=0. Verifies persisted answer/source/owner before append-only ledger insert.';

commit;
