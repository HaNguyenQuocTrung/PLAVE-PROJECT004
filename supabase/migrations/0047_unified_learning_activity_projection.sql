begin;

-- Motivation v1 originally projected only curriculum_attempts. Extend its
-- append-only activity identity to every XP-registered learning runtime.
-- Existing curriculum rows retain their identity; historical attempts are not
-- backfilled and XP remains sourced exclusively from student_xp_ledger.

alter table private.student_completed_attempt_events
  add column runtime_source text not null default 'CURRICULUM';
alter table private.student_completed_attempt_events
  alter column runtime_source drop default,
  drop constraint student_completed_attempt_events_pkey,
  drop constraint student_completed_attempt_events_attempt_id_fkey,
  drop constraint student_completed_attempt_events_attempt_id_student_id_key,
  add constraint student_completed_attempt_events_source_check check (
    runtime_source in ('PRACTICE_FIXED', 'CURRICULUM', 'ADAPTIVE_PILOT')
  ),
  add constraint student_completed_attempt_events_pkey primary key (
    runtime_source, attempt_id
  ),
  add constraint student_completed_attempt_events_student_unique unique (
    runtime_source, attempt_id, student_id
  ),
  add constraint student_completed_attempt_events_registry_fkey foreign key (
    runtime_source, attempt_id, student_id
  ) references private.student_xp_attempts (
    runtime_source, attempt_id, student_id
  ) on delete restrict;

alter table private.student_qualifying_learning_days
  add column runtime_source text not null default 'CURRICULUM';
alter table private.student_qualifying_learning_days
  alter column runtime_source drop default,
  drop constraint student_qualifying_learning_days_attempt_id_fkey,
  drop constraint student_qualifying_learning_days_student_id_attempt_id_key,
  add constraint student_qualifying_learning_days_source_check check (
    runtime_source in ('PRACTICE_FIXED', 'CURRICULUM', 'ADAPTIVE_PILOT')
  ),
  add constraint student_qualifying_learning_days_attempt_unique unique (
    student_id, runtime_source, attempt_id
  ),
  add constraint student_qualifying_learning_days_registry_fkey foreign key (
    runtime_source, attempt_id, student_id
  ) references private.student_xp_attempts (
    runtime_source, attempt_id, student_id
  ) on delete restrict;

alter table private.student_goal_completion_ledger
  add column source_runtime_source text not null default 'CURRICULUM';
alter table private.student_goal_completion_ledger
  alter column source_runtime_source drop default,
  drop constraint student_goal_completion_ledger_source_attempt_id_fkey,
  add constraint student_goal_completion_ledger_source_check check (
    source_runtime_source in ('PRACTICE_FIXED', 'CURRICULUM', 'ADAPTIVE_PILOT')
  ),
  add constraint student_goal_completion_ledger_registry_fkey foreign key (
    source_runtime_source, source_attempt_id, student_id
  ) references private.student_xp_attempts (
    runtime_source, attempt_id, student_id
  ) on delete restrict;

alter table private.student_achievement_awards
  add column source_runtime_source text not null default 'CURRICULUM';
alter table private.student_achievement_awards
  alter column source_runtime_source drop default,
  drop constraint student_achievement_awards_source_attempt_id_fkey,
  add constraint student_achievement_awards_source_check check (
    source_runtime_source in ('PRACTICE_FIXED', 'CURRICULUM', 'ADAPTIVE_PILOT')
  ),
  add constraint student_achievement_awards_registry_fkey foreign key (
    source_runtime_source, source_attempt_id, student_id
  ) references private.student_xp_attempts (
    runtime_source, attempt_id, student_id
  ) on delete restrict;

create or replace function private.refresh_motivation_for_attempt_v2(
  p_runtime_source text,
  p_attempt_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid;
  v_completed_at timestamptz;
  v_answer_count integer;
  v_total_questions integer;
  v_score_percent numeric;
  v_today date;
  v_week date;
  v_total_xp integer;
  v_daily_xp integer;
  v_weekly_xp integer;
  v_daily_attempts integer;
  v_weekly_attempts integer;
  v_completed_attempts integer;
  v_correct_answers integer;
  v_mastered integer;
  v_longest integer;
  v_daily_completed boolean;
  v_weekly_completed boolean;
  v_comeback boolean;
begin
  if p_runtime_source not in (
    'PRACTICE_FIXED', 'CURRICULUM', 'ADAPTIVE_PILOT'
  ) then
    raise exception using errcode = 'P0001',
      message = 'MOTIVATION:SOURCE_MISMATCH';
  end if;

  if p_runtime_source = 'PRACTICE_FIXED' then
    select attempt.student_id, attempt.completed_at, attempt.total_questions,
      case when attempt.total_questions > 0
        then attempt.correct_count::numeric * 100 / attempt.total_questions
        else 0 end
    into v_student_id, v_completed_at, v_total_questions, v_score_percent
    from public.practice_attempts as attempt
    where attempt.id = p_attempt_id
      and attempt.status = 'COMPLETED'
      and attempt.xp_policy_version = 'PLAVE_SCORING_POLICY_V1'
      and attempt.completed_at is not null
    for update;
    if not found then return; end if;
    select count(*)::integer into v_answer_count
    from public.practice_answers as answer
    where answer.attempt_id = p_attempt_id;
  elsif p_runtime_source = 'CURRICULUM' then
    select attempt.student_id, attempt.completed_at, attempt.total_questions,
      attempt.score_percent
    into v_student_id, v_completed_at, v_total_questions, v_score_percent
    from public.curriculum_attempts as attempt
    where attempt.id = p_attempt_id
      and attempt.status = 'COMPLETED'
      and attempt.scoring_policy_version = 'PLAVE_SCORING_POLICY_V1'
      and attempt.score_finalized_at is not null
      and attempt.completed_at is not null
    for update;
    if not found then return; end if;
    select case
      when attempt.generation_mode = 'ON_DEMAND' then (
        select count(*)::integer
        from public.curriculum_generated_answers as answer
        where answer.attempt_id = attempt.id
      )
      else (
        select count(*)::integer
        from public.curriculum_answers as answer
        where answer.attempt_id = attempt.id
      )
    end into v_answer_count
    from public.curriculum_attempts as attempt
    where attempt.id = p_attempt_id;
  else
    select attempt.student_id, attempt.completed_at, attempt.answered_count,
      case when attempt.answered_count > 0
        then attempt.correct_count::numeric * 100 / attempt.answered_count
        else 0 end
    into v_student_id, v_completed_at, v_total_questions, v_score_percent
    from public.adaptive_practice_attempts as attempt
    where attempt.id = p_attempt_id
      and attempt.status in (
        'MASTERED_EARLY', 'REMEDIATION_REQUIRED', 'MAX_REACHED'
      )
      and attempt.xp_policy_version = 'PLAVE_SCORING_POLICY_V1'
      and attempt.completed_at is not null
    for update;
    if not found then return; end if;
    select count(*)::integer into v_answer_count
    from public.adaptive_practice_answers as answer
    where answer.attempt_id = p_attempt_id;
  end if;

  if v_answer_count = 0 or v_answer_count <> v_total_questions then return; end if;
  if not exists (
    select 1 from private.student_xp_attempts as registry
    where registry.runtime_source = p_runtime_source
      and registry.attempt_id = p_attempt_id
      and registry.student_id = v_student_id
      and registry.policy_version = 'PLAVE_SCORING_POLICY_V1'
  ) then
    raise exception using errcode = 'P0001',
      message = 'MOTIVATION:ATTEMPT_MISMATCH';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'PLAVE_MOTIVATION_POLICY_V1:' || v_student_id::text, 0
    )
  );
  v_today := (v_completed_at at time zone 'Asia/Ho_Chi_Minh')::date;
  v_week := date_trunc('week', v_today::timestamp)::date;

  insert into private.student_completed_attempt_events (
    runtime_source, attempt_id, student_id, qualifying_date, occurred_at
  ) values (
    p_runtime_source, p_attempt_id, v_student_id, v_today, v_completed_at
  ) on conflict do nothing;

  insert into private.student_qualifying_learning_days (
    student_id, qualifying_date, runtime_source, attempt_id, recorded_at
  ) values (
    v_student_id, v_today, p_runtime_source, p_attempt_id, v_completed_at
  ) on conflict do nothing;

  select coalesce(sum(ledger.xp_amount), 0)::integer,
    coalesce(sum(ledger.xp_amount) filter (
      where (ledger.awarded_at at time zone 'Asia/Ho_Chi_Minh')::date = v_today
    ), 0)::integer,
    coalesce(sum(ledger.xp_amount) filter (
      where (ledger.awarded_at at time zone 'Asia/Ho_Chi_Minh')::date >= v_week
        and (ledger.awarded_at at time zone 'Asia/Ho_Chi_Minh')::date < v_week + 7
    ), 0)::integer,
    count(*)::integer
  into v_total_xp, v_daily_xp, v_weekly_xp, v_correct_answers
  from private.student_xp_ledger as ledger
  where ledger.student_id = v_student_id;

  select count(*) filter (where event.qualifying_date = v_today)::integer,
    count(*) filter (
      where event.qualifying_date >= v_week and event.qualifying_date < v_week + 7
    )::integer,
    count(*)::integer
  into v_daily_attempts, v_weekly_attempts, v_completed_attempts
  from private.student_completed_attempt_events as event
  where event.student_id = v_student_id;

  select count(*)::integer into v_mastered
  from private.student_outcome_mastery as mastery
  where mastery.student_id = v_student_id
    and mastery.policy_version = 'PLAVE_SCORING_POLICY_V1'
    and mastery.status = 'MASTERED';
  v_longest := coalesce((private.motivation_streak_v1(
    v_student_id, v_today
  )->>'longest_streak_days')::integer, 0);

  v_daily_completed := v_daily_xp >= 20 and v_daily_attempts >= 1;
  v_weekly_completed := v_weekly_xp >= 100 and v_weekly_attempts >= 3;

  if v_daily_completed then
    insert into private.student_goal_completion_ledger (
      student_id, goal_id, period_start, completed_at,
      source_runtime_source, source_attempt_id
    ) values (
      v_student_id, 'DAILY', v_today, v_completed_at,
      p_runtime_source, p_attempt_id
    ) on conflict do nothing;
  end if;
  if v_weekly_completed then
    insert into private.student_goal_completion_ledger (
      student_id, goal_id, period_start, completed_at,
      source_runtime_source, source_attempt_id
    ) values (
      v_student_id, 'WEEKLY', v_week, v_completed_at,
      p_runtime_source, p_attempt_id
    ) on conflict do nothing;
  end if;

  select exists (
    select 1
    from private.student_motivation_mastery_transitions as needs_review
    join private.student_motivation_mastery_transitions as recovered
      on recovered.student_id = needs_review.student_id
      and recovered.official_outcome_id = needs_review.official_outcome_id
      and (
        recovered.transitioned_at > needs_review.transitioned_at
        or (
          recovered.transitioned_at = needs_review.transitioned_at
          and recovered.transition_id <> needs_review.transition_id
        )
      )
    where needs_review.student_id = v_student_id
      and needs_review.status = 'NEEDS_REVIEW'
      and recovered.status in ('PROFICIENT', 'MASTERED')
  ) into v_comeback;

  insert into private.student_achievement_awards (
    student_id, achievement_id, awarded_at,
    source_runtime_source, source_attempt_id
  )
  select v_student_id, candidate.achievement_id, v_completed_at,
    p_runtime_source, p_attempt_id
  from (values
    ('FIRST_STEP', v_completed_attempts >= 1),
    ('FIRST_CORRECT', v_correct_answers >= 1),
    ('XP_100', v_total_xp >= 100),
    ('XP_500', v_total_xp >= 500),
    ('STREAK_3', v_longest >= 3),
    ('STREAK_7', v_longest >= 7),
    ('FIRST_MASTERY', v_mastered >= 1),
    ('MASTERY_5', v_mastered >= 5),
    ('PERFECT_ATTEMPT', v_score_percent = 100 and v_answer_count > 0),
    ('GOAL_GETTER', v_daily_completed),
    ('WEEKLY_CHAMPION', v_weekly_completed),
    ('COMEBACK_LEARNER', v_comeback)
  ) as candidate(achievement_id, eligible)
  where candidate.eligible
  on conflict do nothing;
end;
$$;

create or replace function private.refresh_motivation_for_attempt_v1(
  p_attempt_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_motivation_for_attempt_v2('CURRICULUM', p_attempt_id);
end;
$$;

create or replace function private.curriculum_attempt_motivation_trigger_v1()
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
begin
  if v_source is null then
    raise exception using errcode = 'P0001',
      message = 'MOTIVATION:SOURCE_MISMATCH';
  end if;
  perform private.refresh_motivation_for_attempt_v2(v_source, new.id);
  return new;
end;
$$;

drop trigger curriculum_attempt_motivation_v1 on public.curriculum_attempts;
create trigger curriculum_attempt_motivation_v1
after update of status on public.curriculum_attempts
for each row
when (new.status = 'COMPLETED' and old.status is distinct from new.status)
execute function private.curriculum_attempt_motivation_trigger_v1();

create trigger practice_attempt_motivation_v1
after update of status on public.practice_attempts
for each row
when (new.status = 'COMPLETED' and old.status is distinct from new.status)
execute function private.curriculum_attempt_motivation_trigger_v1();

create trigger adaptive_attempt_motivation_v1
after update of status on public.adaptive_practice_attempts
for each row
when (
  new.status in ('MASTERED_EARLY', 'REMEDIATION_REQUIRED', 'MAX_REACHED')
  and old.status is distinct from new.status
)
execute function private.curriculum_attempt_motivation_trigger_v1();

revoke all on function private.refresh_motivation_for_attempt_v2(text, uuid)
  from public, anon, authenticated, service_role;

comment on function private.refresh_motivation_for_attempt_v2(text, uuid) is
  'Projects one completed registered learning attempt across practice, curriculum, and adaptive runtimes. Uses completed_at in Asia/Ho_Chi_Minh; no historical backfill.';
comment on column private.student_completed_attempt_events.runtime_source is
  'Disambiguates the canonical exactly-once activity identity across runtimes.';

commit;
