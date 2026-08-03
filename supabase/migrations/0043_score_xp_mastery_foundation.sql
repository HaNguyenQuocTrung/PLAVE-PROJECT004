begin;

-- Sprint 11A local-only additive foundation. Historical rows remain legacy;
-- only attempts inserted after this migration opt into the V1 policy.

alter table public.curriculum_attempts
  add column scoring_policy_version text,
  add column score_earned_weight smallint,
  add column score_possible_weight smallint,
  add column score_percent smallint,
  add column score_finalized_at timestamptz,
  add column xp_earned integer not null default 0,
  add constraint curriculum_attempt_scoring_policy_check check (
    scoring_policy_version is null
    or scoring_policy_version = 'PLAVE_SCORING_POLICY_V1'
  ),
  add constraint curriculum_attempt_score_range_check check (
    (score_earned_weight is null or score_earned_weight >= 0)
    and (score_possible_weight is null or score_possible_weight > 0)
    and (
      score_earned_weight is null
      or score_possible_weight is null
      or score_earned_weight <= score_possible_weight
    )
    and (score_percent is null or score_percent between 0 and 100)
    and xp_earned >= 0
  ),
  add constraint curriculum_attempt_score_finalization_check check (
    (
      scoring_policy_version is null
      and score_earned_weight is null
      and score_possible_weight is null
      and score_percent is null
      and score_finalized_at is null
      and xp_earned = 0
    )
    or (
      scoring_policy_version = 'PLAVE_SCORING_POLICY_V1'
      and (
        (
          status <> 'COMPLETED'
          and score_earned_weight is null
          and score_possible_weight is null
          and score_percent is null
          and score_finalized_at is null
        )
        or (
          status = 'COMPLETED'
          and score_earned_weight is not null
          and score_possible_weight is not null
          and score_percent is not null
          and score_finalized_at is not null
        )
      )
    )
  ),
  add constraint curriculum_attempt_id_student_unique unique (id, student_id);

create table private.student_xp_ledger (
  event_id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null
    references public.student_profiles(user_id) on delete restrict,
  attempt_id uuid not null,
  question_id text not null,
  difficulty text not null check (difficulty in ('EASY', 'MEDIUM', 'HARD')),
  xp_amount smallint not null,
  policy_version text not null check (
    policy_version = 'PLAVE_SCORING_POLICY_V1'
  ),
  idempotency_key text not null,
  awarded_at timestamptz not null default now(),
  unique (student_id, attempt_id, question_id, policy_version),
  unique (idempotency_key),
  foreign key (attempt_id, student_id)
    references public.curriculum_attempts(id, student_id) on delete restrict,
  constraint student_xp_amount_policy_check check (
    (difficulty = 'EASY' and xp_amount = 10)
    or (difficulty = 'MEDIUM' and xp_amount = 15)
    or (difficulty = 'HARD' and xp_amount = 20)
  ),
  constraint student_xp_idempotency_key_check check (
    idempotency_key =
      attempt_id::text || ':' || question_id || ':PLAVE_SCORING_POLICY_V1'
  )
);

create index student_xp_ledger_student_time_idx
  on private.student_xp_ledger (student_id, awarded_at desc, event_id);

create table private.student_mastery_evidence (
  evidence_id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null
    references public.student_profiles(user_id) on delete restrict,
  attempt_id uuid not null,
  question_id text not null,
  question_source text not null
    check (question_source in ('STATIC', 'GENERATED_V2')),
  official_outcome_id text not null,
  official_outcome_title text not null,
  difficulty text not null check (difficulty in ('EASY', 'MEDIUM', 'HARD')),
  is_correct boolean not null,
  policy_version text not null check (
    policy_version = 'PLAVE_SCORING_POLICY_V1'
  ),
  answered_at timestamptz not null,
  unique (
    student_id,
    attempt_id,
    question_id,
    official_outcome_id,
    policy_version
  ),
  foreign key (attempt_id, student_id)
    references public.curriculum_attempts(id, student_id) on delete restrict,
  constraint student_mastery_evidence_text_check check (
    official_outcome_id = btrim(official_outcome_id)
    and char_length(official_outcome_id) between 2 and 160
    and official_outcome_title = btrim(official_outcome_title)
    and char_length(official_outcome_title) between 2 and 1000
  )
);

create index student_mastery_evidence_window_idx
  on private.student_mastery_evidence (
    student_id,
    official_outcome_id,
    answered_at desc,
    evidence_id desc
  );

create table private.student_outcome_mastery (
  student_id uuid not null
    references public.student_profiles(user_id) on delete restrict,
  official_outcome_id text not null,
  official_outcome_title text not null,
  evidence_count smallint not null check (evidence_count between 1 and 10),
  correct_count smallint not null,
  mastery_percent smallint not null check (mastery_percent between 0 and 100),
  status text not null check (
    status in (
      'IN_PROGRESS',
      'DEVELOPING',
      'PROFICIENT',
      'MASTERED',
      'NEEDS_REVIEW'
    )
  ),
  medium_hard_correct_count smallint not null default 0,
  ever_mastered boolean not null default false,
  last_evidence_at timestamptz not null,
  policy_version text not null check (
    policy_version = 'PLAVE_SCORING_POLICY_V1'
  ),
  active_evidence_window jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (student_id, official_outcome_id, policy_version),
  constraint student_outcome_mastery_counts_check check (
    correct_count between 0 and evidence_count
    and medium_hard_correct_count between 0 and correct_count
    and jsonb_typeof(active_evidence_window) = 'array'
    and jsonb_array_length(active_evidence_window) = evidence_count
  )
);

create index student_outcome_mastery_status_idx
  on private.student_outcome_mastery (student_id, status, last_evidence_at desc);

alter table private.student_xp_ledger enable row level security;
alter table private.student_mastery_evidence enable row level security;
alter table private.student_outcome_mastery enable row level security;

revoke all on table private.student_xp_ledger from public, anon, authenticated;
revoke all on table private.student_mastery_evidence from public, anon, authenticated;
revoke all on table private.student_outcome_mastery from public, anon, authenticated;

create or replace function private.scoring_difficulty(p_value text)
returns text
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select case p_value
    when 'EASY' then 'EASY'
    when 'UNDERSTAND' then 'EASY'
    when 'MEDIUM' then 'MEDIUM'
    when 'APPLY' then 'MEDIUM'
    when 'HARD' then 'HARD'
    when 'REASON' then 'HARD'
    else null
  end
$$;

create or replace function private.score_weight(p_difficulty text)
returns smallint
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select case p_difficulty
    when 'EASY' then 1::smallint
    when 'MEDIUM' then 2::smallint
    when 'HARD' then 3::smallint
  end
$$;

create or replace function private.xp_award(p_difficulty text)
returns smallint
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select case p_difficulty
    when 'EASY' then 10::smallint
    when 'MEDIUM' then 15::smallint
    when 'HARD' then 20::smallint
  end
$$;

create or replace function private.mastery_weight(p_difficulty text)
returns smallint
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select case p_difficulty
    when 'EASY' then 100::smallint
    when 'MEDIUM' then 125::smallint
    when 'HARD' then 150::smallint
  end
$$;

create or replace function private.reject_immutable_scoring_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using errcode = 'P0001',
    message = 'SCORING:IMMUTABLE_EVENT';
end;
$$;

create trigger student_xp_ledger_immutable
before update or delete on private.student_xp_ledger
for each row execute function private.reject_immutable_scoring_event();

create trigger student_mastery_evidence_immutable
before update or delete on private.student_mastery_evidence
for each row execute function private.reject_immutable_scoring_event();

create or replace function private.activate_scoring_policy_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.scoring_policy_version is not null then
    raise exception using errcode = 'P0001',
      message = 'SCORING:CLIENT_POLICY_FORBIDDEN';
  end if;
  new.scoring_policy_version := 'PLAVE_SCORING_POLICY_V1';
  new.xp_earned := 0;
  return new;
end;
$$;

create trigger curriculum_attempt_activate_scoring_v1
before insert on public.curriculum_attempts
for each row execute function private.activate_scoring_policy_v1();

create or replace function private.finalize_attempt_score_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_question_count integer := 0;
  v_possible integer := 0;
  v_earned integer := 0;
begin
  if
    new.scoring_policy_version <> 'PLAVE_SCORING_POLICY_V1'
    or new.status <> 'COMPLETED'
    or old.status = 'COMPLETED'
  then
    return new;
  end if;

  if new.generation_mode = 'ON_DEMAND' then
    select
      count(*),
      coalesce(sum(private.score_weight(
        private.scoring_difficulty(question.difficulty)
      )), 0),
      coalesce(sum(
        case when answer.is_correct then private.score_weight(
          private.scoring_difficulty(question.difficulty)
        ) else 0 end
      ), 0)
    into v_question_count, v_possible, v_earned
    from public.curriculum_generated_questions as question
    left join public.curriculum_generated_answers as answer
      on answer.attempt_id = question.attempt_id
      and answer.question_id = question.question_id
    where question.attempt_id = new.id;
  else
    select
      count(*),
      coalesce(sum(private.score_weight(
        private.scoring_difficulty(question.cognitive_level)
      )), 0),
      coalesce(sum(
        case when answer.is_correct then private.score_weight(
          private.scoring_difficulty(question.cognitive_level)
        ) else 0 end
      ), 0)
    into v_question_count, v_possible, v_earned
    from public.curriculum_release_questions as question
    left join public.curriculum_answers as answer
      on answer.attempt_id = new.id
      and answer.question_id = question.question_id
    where question.release_id = new.release_id
      and question.unit_id = new.unit_id
      and question.question_id = any(new.question_sequence);
  end if;

  if v_question_count <> new.total_questions or v_possible <= 0 then
    raise exception using errcode = 'P0001',
      message = 'SCORING:ATTEMPT_SNAPSHOT_INCOMPLETE';
  end if;
  new.score_earned_weight := v_earned::smallint;
  new.score_possible_weight := v_possible::smallint;
  new.score_percent := pg_catalog.round(
    v_earned::numeric * 100 / v_possible
  )::smallint;
  new.score_finalized_at := coalesce(new.score_finalized_at, now());
  return new;
end;
$$;

create trigger curriculum_attempt_finalize_score_v1
before update on public.curriculum_attempts
for each row execute function private.finalize_attempt_score_v1();

create or replace function private.refresh_outcome_mastery_v1(
  p_student_id uuid,
  p_outcome_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_count integer;
  v_correct integer;
  v_denominator integer;
  v_numerator integer;
  v_percent integer;
  v_medium_hard_correct integer;
  v_latest_five_denominator integer;
  v_latest_five_numerator integer;
  v_latest_five_percent integer;
  v_ever_mastered boolean := false;
  v_status text;
  v_last timestamptz;
  v_window jsonb;
begin
  select coalesce(projection.ever_mastered, false)
  into v_ever_mastered
  from private.student_outcome_mastery as projection
  where projection.student_id = p_student_id
    and projection.official_outcome_id = p_outcome_id
    and projection.policy_version = 'PLAVE_SCORING_POLICY_V1';

  v_ever_mastered := coalesce(v_ever_mastered, false);

  with active as (
    select evidence.*
    from private.student_mastery_evidence as evidence
    where evidence.student_id = p_student_id
      and evidence.official_outcome_id = p_outcome_id
      and evidence.policy_version = 'PLAVE_SCORING_POLICY_V1'
    order by evidence.answered_at desc, evidence.evidence_id desc
    limit 10
  )
  select
    max(active.official_outcome_title),
    count(*),
    count(*) filter (where active.is_correct),
    sum(private.mastery_weight(active.difficulty)),
    sum(case when active.is_correct
      then private.mastery_weight(active.difficulty) else 0 end),
    count(*) filter (
      where active.is_correct and active.difficulty in ('MEDIUM', 'HARD')
    ),
    max(active.answered_at),
    jsonb_agg(
      jsonb_build_object(
        'evidenceId', active.evidence_id,
        'attemptId', active.attempt_id,
        'questionId', active.question_id,
        'difficulty', active.difficulty,
        'correct', active.is_correct,
        'answeredAt', active.answered_at
      ) order by active.answered_at desc, active.evidence_id desc
    )
  into
    v_title, v_count, v_correct, v_denominator, v_numerator,
    v_medium_hard_correct, v_last, v_window
  from active;

  if v_count = 0 or v_denominator <= 0 then
    raise exception using errcode = 'P0001',
      message = 'SCORING:MASTERY_EVIDENCE_MISSING';
  end if;
  v_percent := pg_catalog.round(
    v_numerator::numeric * 100 / v_denominator
  )::integer;

  with latest_five as (
    select evidence.*
    from private.student_mastery_evidence as evidence
    where evidence.student_id = p_student_id
      and evidence.official_outcome_id = p_outcome_id
      and evidence.policy_version = 'PLAVE_SCORING_POLICY_V1'
    order by evidence.answered_at desc, evidence.evidence_id desc
    limit 5
  )
  select
    coalesce(sum(private.mastery_weight(difficulty)), 0),
    coalesce(sum(case when is_correct
      then private.mastery_weight(difficulty) else 0 end), 0)
  into v_latest_five_denominator, v_latest_five_numerator
  from latest_five;
  v_latest_five_percent := case
    when v_latest_five_denominator = 0 then 0
    else pg_catalog.round(
      v_latest_five_numerator::numeric * 100 /
        v_latest_five_denominator
    )::integer
  end;

  v_status := case
    when v_ever_mastered and v_count >= 5 and v_latest_five_percent < 60
      then 'NEEDS_REVIEW'
    when v_count >= 8 and v_percent >= 80 and v_medium_hard_correct >= 2
      then 'MASTERED'
    when v_count between 1 and 4 then 'IN_PROGRESS'
    when v_percent < 60 then 'DEVELOPING'
    else 'PROFICIENT'
  end;

  insert into private.student_outcome_mastery (
    student_id, official_outcome_id, official_outcome_title,
    evidence_count, correct_count, mastery_percent, status,
    medium_hard_correct_count, ever_mastered, last_evidence_at,
    policy_version, active_evidence_window, updated_at
  ) values (
    p_student_id, p_outcome_id, v_title,
    v_count, v_correct, v_percent, v_status,
    v_medium_hard_correct,
    v_ever_mastered or v_status = 'MASTERED',
    v_last, 'PLAVE_SCORING_POLICY_V1', v_window, now()
  )
  on conflict (student_id, official_outcome_id, policy_version)
  do update set
    official_outcome_title = excluded.official_outcome_title,
    evidence_count = excluded.evidence_count,
    correct_count = excluded.correct_count,
    mastery_percent = excluded.mastery_percent,
    status = excluded.status,
    medium_hard_correct_count = excluded.medium_hard_correct_count,
    ever_mastered = excluded.ever_mastered,
    last_evidence_at = excluded.last_evidence_at,
    active_evidence_window = excluded.active_evidence_window,
    updated_at = now();
end;
$$;

create or replace function private.record_scoring_evidence_v1(
  p_student_id uuid,
  p_attempt_id uuid,
  p_question_id text,
  p_question_source text,
  p_difficulty text,
  p_outcome_ids text[],
  p_outcome_titles text[],
  p_is_correct boolean,
  p_answered_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_index integer;
  v_inserted integer := 0;
  v_xp smallint := private.xp_award(p_difficulty);
begin
  if
    cardinality(p_outcome_ids) = 0
    or cardinality(p_outcome_ids) <> cardinality(p_outcome_titles)
    or p_difficulty not in ('EASY', 'MEDIUM', 'HARD')
  then
    raise exception using errcode = 'P0001',
      message = 'SCORING:INVALID_EVIDENCE_MAPPING';
  end if;

  if p_is_correct then
    insert into private.student_xp_ledger (
      student_id, attempt_id, question_id, difficulty, xp_amount,
      policy_version, idempotency_key, awarded_at
    ) values (
      p_student_id, p_attempt_id, p_question_id, p_difficulty, v_xp,
      'PLAVE_SCORING_POLICY_V1',
      p_attempt_id::text || ':' || p_question_id ||
        ':PLAVE_SCORING_POLICY_V1',
      p_answered_at
    ) on conflict do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted = 1 then
      update public.curriculum_attempts as attempt
      set xp_earned = attempt.xp_earned + v_xp
      where attempt.id = p_attempt_id
        and attempt.student_id = p_student_id
        and attempt.scoring_policy_version = 'PLAVE_SCORING_POLICY_V1';
      if not found then
        raise exception using errcode = 'P0001',
          message = 'SCORING:ATTEMPT_POLICY_MISMATCH';
      end if;
    end if;
  end if;

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
      perform private.refresh_outcome_mastery_v1(
        p_student_id,
        p_outcome_ids[v_index]
      );
    end if;
  end loop;
end;
$$;

create or replace function private.record_static_scoring_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.curriculum_attempts%rowtype;
  v_question public.curriculum_release_questions%rowtype;
  v_difficulty text;
begin
  select attempt.* into v_attempt
  from public.curriculum_attempts as attempt
  where attempt.id = new.attempt_id;
  if v_attempt.scoring_policy_version is distinct from
    'PLAVE_SCORING_POLICY_V1'
  then
    return new;
  end if;
  if v_attempt.generation_mode <> 'MATERIALIZED' then
    raise exception using errcode = 'P0001',
      message = 'SCORING:SOURCE_MISMATCH';
  end if;
  select question.* into v_question
  from public.curriculum_release_questions as question
  where question.release_id = new.release_id
    and question.unit_id = new.unit_id
    and question.question_id = new.question_id;
  v_difficulty := private.scoring_difficulty(v_question.cognitive_level);
  if v_question.question_id is null or v_difficulty is null then
    raise exception using errcode = 'P0001',
      message = 'SCORING:QUESTION_SNAPSHOT_MISSING';
  end if;
  perform private.record_scoring_evidence_v1(
    v_attempt.student_id, new.attempt_id, new.question_id, 'STATIC',
    v_difficulty, v_question.official_outcome_ids,
    v_question.official_outcome_titles, new.is_correct, new.answered_at
  );
  return new;
end;
$$;

create trigger curriculum_answer_scoring_v1
after insert on public.curriculum_answers
for each row execute function private.record_static_scoring_v1();

create or replace function private.record_generated_scoring_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.curriculum_attempts%rowtype;
  v_question public.curriculum_generated_questions%rowtype;
  v_difficulty text;
begin
  select attempt.* into v_attempt
  from public.curriculum_attempts as attempt
  where attempt.id = new.attempt_id;
  if v_attempt.scoring_policy_version is distinct from
    'PLAVE_SCORING_POLICY_V1'
  then
    return new;
  end if;
  if v_attempt.generation_mode <> 'ON_DEMAND' then
    raise exception using errcode = 'P0001',
      message = 'SCORING:SOURCE_MISMATCH';
  end if;
  select question.* into v_question
  from public.curriculum_generated_questions as question
  where question.attempt_id = new.attempt_id
    and question.question_id = new.question_id;
  v_difficulty := private.scoring_difficulty(v_question.difficulty);
  if v_question.question_id is null or v_difficulty is null then
    raise exception using errcode = 'P0001',
      message = 'SCORING:QUESTION_SNAPSHOT_MISSING';
  end if;
  perform private.record_scoring_evidence_v1(
    v_attempt.student_id, new.attempt_id, new.question_id, 'GENERATED_V2',
    v_difficulty, array[v_question.official_outcome_id],
    array[v_question.official_outcome_title], new.is_correct, new.answered_at
  );
  return new;
end;
$$;

create trigger curriculum_generated_answer_scoring_v1
after insert on public.curriculum_generated_answers
for each row execute function private.record_generated_scoring_v1();

create or replace function private.scoring_attempt_payload_v1(
  p_attempt_id uuid,
  p_xp_delta integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'policy_version', attempt.scoring_policy_version,
    'legacy', attempt.scoring_policy_version is null,
    'finalized', attempt.score_finalized_at is not null,
    'earned_weight', attempt.score_earned_weight,
    'possible_weight', attempt.score_possible_weight,
    'score_percent', attempt.score_percent,
    'attempt_xp_earned', attempt.xp_earned,
    'xp_delta', greatest(p_xp_delta, 0),
    'lesson_completed', attempt.status = 'COMPLETED',
    'mastery_changes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'outcome_title', projection.official_outcome_title,
        'evidence_count', projection.evidence_count,
        'correct_count', projection.correct_count,
        'mastery_percent', projection.mastery_percent,
        'status', projection.status,
        'last_evidence_at', projection.last_evidence_at
      ) order by projection.official_outcome_title)
      from private.student_outcome_mastery as projection
      where projection.student_id = attempt.student_id
        and projection.policy_version = 'PLAVE_SCORING_POLICY_V1'
        and exists (
          select 1
          from private.student_mastery_evidence as evidence
          where evidence.student_id = attempt.student_id
            and evidence.attempt_id = attempt.id
            and evidence.official_outcome_id =
              projection.official_outcome_id
        )
    ), '[]'::jsonb)
  )
  from public.curriculum_attempts as attempt
  where attempt.id = p_attempt_id
$$;

create or replace function private.decorate_scoring_state_v1(
  p_state jsonb,
  p_attempt_id uuid,
  p_xp_delta integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select p_state || jsonb_build_object(
    'scoring', private.scoring_attempt_payload_v1(
      p_attempt_id,
      p_xp_delta
    )
  )
$$;

alter function public.submit_curriculum_answer(uuid, text, text, integer, uuid)
  rename to submit_curriculum_answer_0042_impl;
alter function public.submit_curriculum_answer_0042_impl(uuid, text, text, integer, uuid)
  set schema private;

create function public.submit_curriculum_answer(
  p_attempt_id uuid,
  p_question_id text,
  p_answer text,
  p_expected_revision integer,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_replay boolean;
  v_result jsonb;
  v_xp_delta integer := 0;
begin
  select exists (
    select 1
    from public.curriculum_answers as answer
    join public.curriculum_attempts as attempt on attempt.id = answer.attempt_id
    where answer.attempt_id = p_attempt_id
      and answer.submission_id = p_idempotency_key
      and attempt.student_id = auth.uid()
  ) into v_replay;
  v_result := private.submit_curriculum_answer_0042_impl(
    p_attempt_id, p_question_id, p_answer,
    p_expected_revision, p_idempotency_key
  );
  if not v_replay then
    select coalesce(ledger.xp_amount, 0) into v_xp_delta
    from private.student_xp_ledger as ledger
    where ledger.student_id = auth.uid()
      and ledger.attempt_id = p_attempt_id
      and ledger.question_id = p_question_id
      and ledger.policy_version = 'PLAVE_SCORING_POLICY_V1';
  end if;
  return private.decorate_scoring_state_v1(
    v_result,
    p_attempt_id,
    coalesce(v_xp_delta, 0)
  );
end;
$$;

alter function public.submit_generated_curriculum_answer(uuid, text, text, integer, uuid)
  rename to submit_generated_curriculum_answer_0042_impl;
alter function public.submit_generated_curriculum_answer_0042_impl(uuid, text, text, integer, uuid)
  set schema private;

create function public.submit_generated_curriculum_answer(
  p_attempt_id uuid,
  p_question_id text,
  p_answer text,
  p_expected_revision integer,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_replay boolean;
  v_result jsonb;
  v_xp_delta integer := 0;
begin
  select exists (
    select 1
    from public.curriculum_generated_answers as answer
    join public.curriculum_attempts as attempt on attempt.id = answer.attempt_id
    where answer.attempt_id = p_attempt_id
      and answer.submission_id = p_idempotency_key
      and attempt.student_id = auth.uid()
  ) into v_replay;
  v_result := private.submit_generated_curriculum_answer_0042_impl(
    p_attempt_id, p_question_id, p_answer,
    p_expected_revision, p_idempotency_key
  );
  if not v_replay then
    select coalesce(ledger.xp_amount, 0) into v_xp_delta
    from private.student_xp_ledger as ledger
    where ledger.student_id = auth.uid()
      and ledger.attempt_id = p_attempt_id
      and ledger.question_id = p_question_id
      and ledger.policy_version = 'PLAVE_SCORING_POLICY_V1';
  end if;
  return private.decorate_scoring_state_v1(
    v_result,
    p_attempt_id,
    coalesce(v_xp_delta, 0)
  );
end;
$$;

alter function public.get_curriculum_attempt_state(uuid)
  rename to get_curriculum_attempt_state_0042_impl;
alter function public.get_curriculum_attempt_state_0042_impl(uuid)
  set schema private;

create function public.get_curriculum_attempt_state(p_attempt_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.decorate_scoring_state_v1(
    private.get_curriculum_attempt_state_0042_impl(p_attempt_id),
    p_attempt_id,
    0
  )
$$;

alter function public.get_generated_curriculum_attempt_state(uuid)
  rename to get_generated_curriculum_attempt_state_0042_impl;
alter function public.get_generated_curriculum_attempt_state_0042_impl(uuid)
  set schema private;

create function public.get_generated_curriculum_attempt_state(p_attempt_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.decorate_scoring_state_v1(
    private.get_generated_curriculum_attempt_state_0042_impl(p_attempt_id),
    p_attempt_id,
    0
  )
$$;

create or replace function private.student_scoring_summary_v1(
  p_student_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'policy_version', 'PLAVE_SCORING_POLICY_V1',
    'total_xp', coalesce((
      select sum(ledger.xp_amount)
      from private.student_xp_ledger as ledger
      where ledger.student_id = p_student_id
    ), 0),
    'recent_xp', coalesce((
      select jsonb_agg(recent.item order by recent.awarded_at desc)
      from (
        select
          ledger.awarded_at,
          jsonb_build_object(
            'amount', ledger.xp_amount,
            'difficulty', ledger.difficulty,
            'unit_title', unit.title,
            'awarded_at', ledger.awarded_at
          ) as item
        from private.student_xp_ledger as ledger
        join public.curriculum_attempts as attempt
          on attempt.id = ledger.attempt_id
        join public.curriculum_release_units as unit
          on unit.release_id = attempt.release_id
          and unit.unit_id = attempt.unit_id
        where ledger.student_id = p_student_id
        order by ledger.awarded_at desc, ledger.event_id desc
        limit 10
      ) as recent
    ), '[]'::jsonb),
    'mastery_summary', jsonb_build_object(
      'started', (select count(*) from private.student_outcome_mastery
        where student_id = p_student_id),
      'mastered', (select count(*) from private.student_outcome_mastery
        where student_id = p_student_id and status = 'MASTERED'),
      'needs_review', (select count(*) from private.student_outcome_mastery
        where student_id = p_student_id and status = 'NEEDS_REVIEW')
    ),
    'outcomes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', mastery.official_outcome_title,
        'evidence_count', mastery.evidence_count,
        'correct_count', mastery.correct_count,
        'mastery_percent', mastery.mastery_percent,
        'status', mastery.status,
        'last_evidence_at', mastery.last_evidence_at
      ) order by mastery.last_evidence_at desc)
      from private.student_outcome_mastery as mastery
      where mastery.student_id = p_student_id
        and mastery.policy_version = 'PLAVE_SCORING_POLICY_V1'
    ), '[]'::jsonb),
    'attempts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'attempt_id', attempt.id,
        'policy_version', attempt.scoring_policy_version,
        'legacy', attempt.scoring_policy_version is null,
        'score_percent', case
          when attempt.scoring_policy_version is null
            and attempt.status = 'COMPLETED'
          then pg_catalog.round(
            attempt.correct_count::numeric * 100 / attempt.total_questions
          )::smallint
          else attempt.score_percent
        end,
        'earned_weight', attempt.score_earned_weight,
        'possible_weight', attempt.score_possible_weight,
        'xp_earned', attempt.xp_earned,
        'lesson_completed', attempt.status = 'COMPLETED'
      ) order by attempt.started_at desc)
      from public.curriculum_attempts as attempt
      where attempt.student_id = p_student_id
    ), '[]'::jsonb)
  )
$$;

create function public.get_my_score_xp_mastery()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'SCORING:UNAUTHENTICATED';
  end if;
  if not exists (
    select 1 from public.profiles as profile
    join public.student_profiles as student on student.user_id = profile.user_id
    where profile.user_id = v_user_id
      and profile.role = 'STUDENT'
      and profile.onboarding_completed
  ) then
    raise exception using errcode = 'P0001', message = 'SCORING:FORBIDDEN';
  end if;
  return private.student_scoring_summary_v1(v_user_id);
end;
$$;

create function public.get_parent_child_score_xp_mastery(p_connection_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid;
begin
  select connection.student_user_id into v_student_id
  from public.parent_student_connections as connection
  join public.profiles as profile on profile.user_id = connection.parent_user_id
  where connection.id = p_connection_id
    and connection.parent_user_id = auth.uid()
    and connection.status = 'APPROVED'
    and profile.role = 'PARENT'
    and profile.onboarding_completed;
  if v_student_id is null then
    raise exception using errcode = 'P0001', message = 'SCORING:FORBIDDEN';
  end if;
  return private.student_scoring_summary_v1(v_student_id);
end;
$$;

create function public.get_teacher_student_score_xp_mastery(p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.classrooms as classroom
    join public.classroom_memberships as membership
      on membership.classroom_id = classroom.id
    join public.profiles as profile on profile.user_id = classroom.teacher_id
    where classroom.teacher_id = auth.uid()
      and membership.student_id = p_student_id
      and membership.status = 'APPROVED'
      and profile.role = 'TEACHER'
      and profile.onboarding_completed
  ) then
    raise exception using errcode = 'P0001', message = 'SCORING:FORBIDDEN';
  end if;
  return private.student_scoring_summary_v1(p_student_id);
end;
$$;

revoke all on function public.submit_curriculum_answer(uuid, text, text, integer, uuid)
  from public, anon;
revoke all on function public.submit_generated_curriculum_answer(uuid, text, text, integer, uuid)
  from public, anon;
revoke all on function public.get_curriculum_attempt_state(uuid)
  from public, anon;
revoke all on function public.get_generated_curriculum_attempt_state(uuid)
  from public, anon;
revoke all on function public.get_my_score_xp_mastery()
  from public, anon;
revoke all on function public.get_parent_child_score_xp_mastery(uuid)
  from public, anon;
revoke all on function public.get_teacher_student_score_xp_mastery(uuid)
  from public, anon;

grant execute on function public.submit_curriculum_answer(uuid, text, text, integer, uuid)
  to authenticated;
grant execute on function public.submit_generated_curriculum_answer(uuid, text, text, integer, uuid)
  to authenticated;
grant execute on function public.get_curriculum_attempt_state(uuid)
  to authenticated;
grant execute on function public.get_generated_curriculum_attempt_state(uuid)
  to authenticated;
grant execute on function public.get_my_score_xp_mastery()
  to authenticated;
grant execute on function public.get_parent_child_score_xp_mastery(uuid)
  to authenticated;
grant execute on function public.get_teacher_student_score_xp_mastery(uuid)
  to authenticated;

revoke all on function private.submit_curriculum_answer_0042_impl(uuid, text, text, integer, uuid)
  from public, anon, authenticated;
revoke all on function private.submit_generated_curriculum_answer_0042_impl(uuid, text, text, integer, uuid)
  from public, anon, authenticated;
revoke all on function private.get_curriculum_attempt_state_0042_impl(uuid)
  from public, anon, authenticated;
revoke all on function private.get_generated_curriculum_attempt_state_0042_impl(uuid)
  from public, anon, authenticated;
revoke all on function private.scoring_difficulty(text) from public, anon, authenticated;
revoke all on function private.score_weight(text) from public, anon, authenticated;
revoke all on function private.xp_award(text) from public, anon, authenticated;
revoke all on function private.mastery_weight(text) from public, anon, authenticated;
revoke all on function private.reject_immutable_scoring_event() from public, anon, authenticated;
revoke all on function private.activate_scoring_policy_v1() from public, anon, authenticated;
revoke all on function private.finalize_attempt_score_v1() from public, anon, authenticated;
revoke all on function private.refresh_outcome_mastery_v1(uuid, text) from public, anon, authenticated;
revoke all on function private.record_scoring_evidence_v1(uuid, uuid, text, text, text, text[], text[], boolean, timestamptz) from public, anon, authenticated;
revoke all on function private.record_static_scoring_v1() from public, anon, authenticated;
revoke all on function private.record_generated_scoring_v1() from public, anon, authenticated;
revoke all on function private.scoring_attempt_payload_v1(uuid, integer) from public, anon, authenticated;
revoke all on function private.decorate_scoring_state_v1(jsonb, uuid, integer) from public, anon, authenticated;
revoke all on function private.student_scoring_summary_v1(uuid) from public, anon, authenticated;

comment on table private.student_xp_ledger is
  'Append-only exactly-once XP events under PLAVE_SCORING_POLICY_V1.';
comment on table private.student_mastery_evidence is
  'Immutable per-question outcome evidence; latest ten rows form the active mastery window.';
comment on table private.student_outcome_mastery is
  'Server-maintained V1 outcome mastery projection; never client writable.';
comment on function public.get_my_score_xp_mastery() is
  'Returns the authenticated Student sanitized Score, XP and Mastery summary.';

commit;
