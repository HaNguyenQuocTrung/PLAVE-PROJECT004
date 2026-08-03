begin;

-- Sprint 11B remains additive. Historical/legacy attempts are not backfilled:
-- only terminal PLAVE_SCORING_POLICY_V1 attempts observed after this migration
-- can create motivation events.

create table private.student_completed_attempt_events (
  attempt_id uuid primary key
    references public.curriculum_attempts(id) on delete restrict,
  student_id uuid not null
    references public.student_profiles(user_id) on delete restrict,
  qualifying_date date not null,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  occurred_at timestamptz not null,
  policy_version text not null default 'PLAVE_MOTIVATION_POLICY_V1',
  unique (attempt_id, student_id),
  check (timezone = 'Asia/Ho_Chi_Minh'),
  check (policy_version = 'PLAVE_MOTIVATION_POLICY_V1')
);

create index student_completed_attempt_events_period_idx
  on private.student_completed_attempt_events
    (student_id, qualifying_date desc, occurred_at desc, attempt_id);

create table private.student_qualifying_learning_days (
  student_id uuid not null
    references public.student_profiles(user_id) on delete restrict,
  qualifying_date date not null,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  attempt_id uuid not null
    references public.curriculum_attempts(id) on delete restrict,
  recorded_at timestamptz not null,
  policy_version text not null default 'PLAVE_MOTIVATION_POLICY_V1',
  primary key (student_id, qualifying_date),
  unique (student_id, attempt_id),
  check (timezone = 'Asia/Ho_Chi_Minh'),
  check (policy_version = 'PLAVE_MOTIVATION_POLICY_V1')
);

create table private.student_goal_completion_ledger (
  event_id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null
    references public.student_profiles(user_id) on delete restrict,
  goal_id text not null check (goal_id in ('DAILY', 'WEEKLY')),
  period_start date not null,
  completed_at timestamptz not null,
  source_attempt_id uuid not null
    references public.curriculum_attempts(id) on delete restrict,
  policy_version text not null default 'PLAVE_MOTIVATION_POLICY_V1',
  unique (student_id, goal_id, period_start, policy_version),
  check (policy_version = 'PLAVE_MOTIVATION_POLICY_V1')
);

create table private.student_achievement_awards (
  award_id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null
    references public.student_profiles(user_id) on delete restrict,
  achievement_id text not null check (achievement_id in (
    'FIRST_STEP', 'FIRST_CORRECT', 'XP_100', 'XP_500', 'STREAK_3', 'STREAK_7',
    'FIRST_MASTERY', 'MASTERY_5', 'PERFECT_ATTEMPT', 'GOAL_GETTER',
    'WEEKLY_CHAMPION', 'COMEBACK_LEARNER'
  )),
  awarded_at timestamptz not null,
  policy_version text not null default 'PLAVE_MOTIVATION_POLICY_V1',
  source_attempt_id uuid not null
    references public.curriculum_attempts(id) on delete restrict,
  unique (student_id, achievement_id, policy_version),
  check (policy_version = 'PLAVE_MOTIVATION_POLICY_V1')
);

create table private.student_achievement_unlock_deliveries (
  award_id uuid primary key
    references private.student_achievement_awards(award_id) on delete restrict,
  student_id uuid not null
    references public.student_profiles(user_id) on delete restrict,
  request_id uuid not null,
  delivered_at timestamptz not null,
  policy_version text not null default 'PLAVE_MOTIVATION_POLICY_V1',
  unique (student_id, request_id, award_id),
  check (policy_version = 'PLAVE_MOTIVATION_POLICY_V1')
);

create table private.student_motivation_mastery_transitions (
  transition_id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null
    references public.student_profiles(user_id) on delete restrict,
  official_outcome_id text not null,
  status text not null check (status in (
    'IN_PROGRESS', 'DEVELOPING', 'PROFICIENT', 'MASTERED', 'NEEDS_REVIEW'
  )),
  transitioned_at timestamptz not null,
  policy_version text not null default 'PLAVE_MOTIVATION_POLICY_V1',
  check (policy_version = 'PLAVE_MOTIVATION_POLICY_V1')
);

-- Empty in production. Only the database owner can populate this table in a
-- disposable test stack; no public RPC or application bundle can set time.
create table private.motivation_test_clock_overrides (
  override_id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null
    references public.student_profiles(user_id) on delete cascade,
  attempt_id uuid references public.curriculum_attempts(id) on delete cascade,
  test_now timestamptz not null,
  environment text not null check (environment = 'TEST'),
  unique nulls not distinct (student_id, attempt_id)
);

create index student_learning_days_history_idx
  on private.student_qualifying_learning_days
    (student_id, qualifying_date desc);
create index student_goal_completion_history_idx
  on private.student_goal_completion_ledger
    (student_id, completed_at desc, event_id);
create index student_achievement_awards_history_idx
  on private.student_achievement_awards
    (student_id, awarded_at desc, award_id);
create index student_achievement_unlock_delivery_history_idx
  on private.student_achievement_unlock_deliveries
    (student_id, delivered_at desc, award_id);
create index student_motivation_mastery_transition_history_idx
  on private.student_motivation_mastery_transitions
    (student_id, official_outcome_id, transitioned_at, transition_id);

alter table private.student_completed_attempt_events enable row level security;
alter table private.student_qualifying_learning_days enable row level security;
alter table private.student_goal_completion_ledger enable row level security;
alter table private.student_achievement_awards enable row level security;
alter table private.student_achievement_unlock_deliveries enable row level security;
alter table private.student_motivation_mastery_transitions enable row level security;
alter table private.motivation_test_clock_overrides enable row level security;

revoke all on private.student_completed_attempt_events
  from public, anon, authenticated, service_role;
revoke all on private.student_qualifying_learning_days
  from public, anon, authenticated, service_role;
revoke all on private.student_goal_completion_ledger
  from public, anon, authenticated, service_role;
revoke all on private.student_achievement_awards
  from public, anon, authenticated, service_role;
revoke all on private.student_achievement_unlock_deliveries
  from public, anon, authenticated, service_role;
revoke all on private.student_motivation_mastery_transitions
  from public, anon, authenticated, service_role;
revoke all on private.motivation_test_clock_overrides
  from public, anon, authenticated, service_role;

create or replace function private.motivation_now_v1(
  p_student_id uuid,
  p_attempt_id uuid default null
)
returns timestamptz
language sql
volatile
security definer
set search_path = ''
as $$
  select coalesce((
    select override.test_now
    from private.motivation_test_clock_overrides as override
    where override.student_id = p_student_id
      and (override.attempt_id = p_attempt_id or override.attempt_id is null)
    order by (override.attempt_id is not null) desc
    limit 1
  ), clock_timestamp())
$$;

create or replace function private.motivation_level_v1(p_total_xp integer)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_level integer := 1;
  v_current integer;
  v_next integer;
begin
  if p_total_xp is null or p_total_xp < 0 then
    raise exception using errcode = 'P0001', message = 'MOTIVATION:INVALID_XP';
  end if;
  while v_level < 50 and p_total_xp >= 25 * v_level * (v_level + 3) loop
    v_level := v_level + 1;
  end loop;
  v_current := 25 * (v_level - 1) * (v_level + 2);
  v_next := case
    when v_level = 50 then v_current
    else 25 * v_level * (v_level + 3)
  end;
  return jsonb_build_object(
    'level', v_level,
    'total_xp', p_total_xp,
    'current_threshold', v_current,
    'next_threshold', v_next,
    'xp_remaining', greatest(0, v_next - p_total_xp),
    'max_level', v_level = 50
  );
end;
$$;

create or replace function private.motivation_streak_v1(
  p_student_id uuid,
  p_today date
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with ordered as (
    select
      day.qualifying_date,
      row_number() over (order by day.qualifying_date) as sequence
    from private.student_qualifying_learning_days as day
    where day.student_id = p_student_id
      and day.qualifying_date <= p_today
  ), islands as (
    select
      qualifying_date,
      qualifying_date - sequence::integer as island
    from ordered
  ), streaks as (
    select min(qualifying_date) as first_date,
      max(qualifying_date) as last_date,
      count(*)::integer as days
    from islands
    group by island
  )
  select jsonb_build_object(
    'current_streak_days', coalesce((
      select streak.days from streaks as streak
      where streak.last_date in (p_today, p_today - 1)
      order by streak.last_date desc limit 1
    ), 0),
    'longest_streak_days', coalesce((select max(streak.days) from streaks as streak), 0),
    'last_qualifying_date', (
      select max(day.qualifying_date)
      from private.student_qualifying_learning_days as day
      where day.student_id = p_student_id and day.qualifying_date <= p_today
    ),
    'qualified_today', exists (
      select 1 from private.student_qualifying_learning_days as day
      where day.student_id = p_student_id and day.qualifying_date = p_today
    ),
    'timezone', 'Asia/Ho_Chi_Minh'
  )
$$;

create or replace function private.reject_motivation_ledger_mutation_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using errcode = 'P0001',
    message = 'MOTIVATION:IMMUTABLE_EVENT';
end;
$$;

create trigger student_completed_attempt_events_immutable
before update or delete on private.student_completed_attempt_events
for each row execute function private.reject_motivation_ledger_mutation_v1();
create trigger student_qualifying_learning_days_immutable
before update or delete on private.student_qualifying_learning_days
for each row execute function private.reject_motivation_ledger_mutation_v1();
create trigger student_goal_completion_ledger_immutable
before update or delete on private.student_goal_completion_ledger
for each row execute function private.reject_motivation_ledger_mutation_v1();
create trigger student_achievement_awards_immutable
before update or delete on private.student_achievement_awards
for each row execute function private.reject_motivation_ledger_mutation_v1();
create trigger student_achievement_unlock_deliveries_immutable
before update or delete on private.student_achievement_unlock_deliveries
for each row execute function private.reject_motivation_ledger_mutation_v1();
create trigger student_motivation_mastery_transitions_immutable
before update or delete on private.student_motivation_mastery_transitions
for each row execute function private.reject_motivation_ledger_mutation_v1();

create or replace function private.stamp_motivation_answer_time_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_student_id uuid;
begin
  select attempt.student_id into v_student_id
  from public.curriculum_attempts as attempt
  where attempt.id = new.attempt_id;
  if v_student_id is null then
    raise exception using errcode = 'P0001', message = 'MOTIVATION:ATTEMPT_NOT_FOUND';
  end if;
  new.answered_at := private.motivation_now_v1(v_student_id, new.attempt_id);
  return new;
end;
$$;

create trigger curriculum_answer_motivation_clock_v1
before insert on public.curriculum_answers
for each row execute function private.stamp_motivation_answer_time_v1();
create trigger curriculum_generated_answer_motivation_clock_v1
before insert on public.curriculum_generated_answers
for each row execute function private.stamp_motivation_answer_time_v1();

create or replace function private.record_motivation_mastery_transition_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;
  insert into private.student_motivation_mastery_transitions (
    student_id, official_outcome_id, status, transitioned_at
  ) values (
    new.student_id,
    new.official_outcome_id,
    new.status,
    private.motivation_now_v1(new.student_id, null)
  );
  return new;
end;
$$;

create trigger student_outcome_mastery_motivation_transition_v1
after insert or update of status on private.student_outcome_mastery
for each row execute function private.record_motivation_mastery_transition_v1();

create or replace function private.refresh_motivation_for_attempt_v1(
  p_attempt_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.curriculum_attempts%rowtype;
  v_now timestamptz;
  v_today date;
  v_week date;
  v_answer_count integer;
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
  select attempt.* into v_attempt
  from public.curriculum_attempts as attempt
  where attempt.id = p_attempt_id
    and attempt.status = 'COMPLETED'
    and attempt.scoring_policy_version = 'PLAVE_SCORING_POLICY_V1'
    and attempt.score_finalized_at is not null
  for update;
  if not found then return; end if;

  if v_attempt.generation_mode = 'ON_DEMAND' then
    select count(*)::integer into v_answer_count
    from public.curriculum_generated_answers as answer
    where answer.attempt_id = v_attempt.id;
  else
    select count(*)::integer into v_answer_count
    from public.curriculum_answers as answer
    where answer.attempt_id = v_attempt.id;
  end if;
  if v_answer_count = 0 or v_answer_count <> v_attempt.total_questions then
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('PLAVE_MOTIVATION_POLICY_V1:' || v_attempt.student_id::text, 0)
  );
  v_now := private.motivation_now_v1(v_attempt.student_id, v_attempt.id);
  v_today := (v_now at time zone 'Asia/Ho_Chi_Minh')::date;
  v_week := date_trunc('week', v_today::timestamp)::date;

  insert into private.student_completed_attempt_events (
    attempt_id, student_id, qualifying_date, occurred_at
  ) values (v_attempt.id, v_attempt.student_id, v_today, v_now)
  on conflict do nothing;

  insert into private.student_qualifying_learning_days (
    student_id, qualifying_date, attempt_id, recorded_at
  ) values (v_attempt.student_id, v_today, v_attempt.id, v_now)
  on conflict do nothing;

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
  where ledger.student_id = v_attempt.student_id;

  select count(*) filter (where event.qualifying_date = v_today)::integer,
    count(*) filter (
      where event.qualifying_date >= v_week and event.qualifying_date < v_week + 7
    )::integer,
    count(*)::integer
  into v_daily_attempts, v_weekly_attempts, v_completed_attempts
  from private.student_completed_attempt_events as event
  where event.student_id = v_attempt.student_id;

  select count(*)::integer into v_mastered
  from private.student_outcome_mastery as mastery
  where mastery.student_id = v_attempt.student_id
    and mastery.policy_version = 'PLAVE_SCORING_POLICY_V1'
    and mastery.status = 'MASTERED';
  v_longest := coalesce((private.motivation_streak_v1(
    v_attempt.student_id, v_today
  )->>'longest_streak_days')::integer, 0);

  v_daily_completed := v_daily_xp >= 20 and v_daily_attempts >= 1;
  v_weekly_completed := v_weekly_xp >= 100 and v_weekly_attempts >= 3;

  if v_daily_completed then
    insert into private.student_goal_completion_ledger (
      student_id, goal_id, period_start, completed_at, source_attempt_id
    ) values (
      v_attempt.student_id, 'DAILY', v_today, v_now, v_attempt.id
    ) on conflict do nothing;
  end if;
  if v_weekly_completed then
    insert into private.student_goal_completion_ledger (
      student_id, goal_id, period_start, completed_at, source_attempt_id
    ) values (
      v_attempt.student_id, 'WEEKLY', v_week, v_now, v_attempt.id
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
    where needs_review.student_id = v_attempt.student_id
      and needs_review.status = 'NEEDS_REVIEW'
      and recovered.status in ('PROFICIENT', 'MASTERED')
  ) into v_comeback;

  insert into private.student_achievement_awards (
    student_id, achievement_id, awarded_at, source_attempt_id
  )
  select v_attempt.student_id, candidate.achievement_id, v_now, v_attempt.id
  from (values
    ('FIRST_STEP', v_completed_attempts >= 1),
    ('FIRST_CORRECT', v_correct_answers >= 1),
    ('XP_100', v_total_xp >= 100),
    ('XP_500', v_total_xp >= 500),
    ('STREAK_3', v_longest >= 3),
    ('STREAK_7', v_longest >= 7),
    ('FIRST_MASTERY', v_mastered >= 1),
    ('MASTERY_5', v_mastered >= 5),
    ('PERFECT_ATTEMPT', v_attempt.score_percent = 100 and v_answer_count > 0),
    ('GOAL_GETTER', v_daily_completed),
    ('WEEKLY_CHAMPION', v_weekly_completed),
    ('COMEBACK_LEARNER', v_comeback)
  ) as candidate(achievement_id, eligible)
  where candidate.eligible
  on conflict do nothing;
end;
$$;

create or replace function private.curriculum_attempt_motivation_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_motivation_for_attempt_v1(new.id);
  return new;
end;
$$;

create trigger curriculum_attempt_motivation_v1
after update of status on public.curriculum_attempts
for each row
when (new.status = 'COMPLETED' and old.status is distinct from new.status)
execute function private.curriculum_attempt_motivation_trigger_v1();

create or replace function private.student_motivation_summary_v1(
  p_student_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := private.motivation_now_v1(p_student_id, null);
  v_today date;
  v_week date;
  v_total_xp integer;
  v_daily_xp integer;
  v_weekly_xp integer;
  v_daily_attempts integer;
  v_weekly_attempts integer;
begin
  v_today := (v_now at time zone 'Asia/Ho_Chi_Minh')::date;
  v_week := date_trunc('week', v_today::timestamp)::date;
  select coalesce(sum(ledger.xp_amount), 0)::integer,
    coalesce(sum(ledger.xp_amount) filter (
      where (ledger.awarded_at at time zone 'Asia/Ho_Chi_Minh')::date = v_today
    ), 0)::integer,
    coalesce(sum(ledger.xp_amount) filter (
      where (ledger.awarded_at at time zone 'Asia/Ho_Chi_Minh')::date >= v_week
        and (ledger.awarded_at at time zone 'Asia/Ho_Chi_Minh')::date < v_week + 7
    ), 0)::integer
  into v_total_xp, v_daily_xp, v_weekly_xp
  from private.student_xp_ledger as ledger
  where ledger.student_id = p_student_id;
  select count(*) filter (where event.qualifying_date = v_today)::integer,
    count(*) filter (
      where event.qualifying_date >= v_week and event.qualifying_date < v_week + 7
    )::integer
  into v_daily_attempts, v_weekly_attempts
  from private.student_completed_attempt_events as event
  where event.student_id = p_student_id;

  return jsonb_build_object(
    'policy_version', 'PLAVE_MOTIVATION_POLICY_V1',
    'timezone', 'Asia/Ho_Chi_Minh',
    'level', private.motivation_level_v1(v_total_xp),
    'streak', private.motivation_streak_v1(p_student_id, v_today),
    'goals', jsonb_build_object(
      'daily', jsonb_build_object(
        'xp_current', v_daily_xp, 'xp_target', 20,
        'xp_percentage', least(100, pg_catalog.round(v_daily_xp::numeric * 100 / 20)),
        'attempt_current', v_daily_attempts, 'attempt_target', 1,
        'attempt_percentage', least(100, v_daily_attempts * 100),
        'completed', v_daily_xp >= 20 and v_daily_attempts >= 1
      ),
      'weekly', jsonb_build_object(
        'xp_current', v_weekly_xp, 'xp_target', 100,
        'xp_percentage', least(100, pg_catalog.round(v_weekly_xp::numeric)),
        'attempt_current', v_weekly_attempts, 'attempt_target', 3,
        'attempt_percentage', least(100, pg_catalog.round(v_weekly_attempts::numeric * 100 / 3)),
        'completed', v_weekly_xp >= 100 and v_weekly_attempts >= 3
      ),
      'daily_completed', v_daily_xp >= 20 and v_daily_attempts >= 1,
      'weekly_completed', v_weekly_xp >= 100 and v_weekly_attempts >= 3
    ),
    'achievements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', award.achievement_id,
        'title', case award.achievement_id
          when 'FIRST_STEP' then 'Bước đầu tiên'
          when 'FIRST_CORRECT' then 'Câu đúng đầu tiên'
          when 'XP_100' then '100 XP'
          when 'XP_500' then '500 XP'
          when 'STREAK_3' then 'Ba ngày bền bỉ'
          when 'STREAK_7' then 'Một tuần bền bỉ'
          when 'FIRST_MASTERY' then 'Mục tiêu đầu tiên'
          when 'MASTERY_5' then 'Năm mục tiêu'
          when 'PERFECT_ATTEMPT' then 'Trọn vẹn'
          when 'GOAL_GETTER' then 'Chạm mục tiêu'
          when 'WEEKLY_CHAMPION' then 'Tuần học đều'
          when 'COMEBACK_LEARNER' then 'Trở lại mạnh mẽ'
        end,
        'description', case award.achievement_id
          when 'FIRST_STEP' then 'Hoàn thành bài luyện đầu tiên.'
          when 'FIRST_CORRECT' then 'Có câu trả lời đúng đầu tiên.'
          when 'XP_100' then 'Tích lũy 100 XP.'
          when 'XP_500' then 'Tích lũy 500 XP.'
          when 'STREAK_3' then 'Học liên tục ba ngày.'
          when 'STREAK_7' then 'Học liên tục bảy ngày.'
          when 'FIRST_MASTERY' then 'Làm chủ một mục tiêu học tập.'
          when 'MASTERY_5' then 'Làm chủ năm mục tiêu học tập.'
          when 'PERFECT_ATTEMPT' then 'Hoàn thành một bài luyện với 100 điểm.'
          when 'GOAL_GETTER' then 'Hoàn thành mục tiêu ngày đầu tiên.'
          when 'WEEKLY_CHAMPION' then 'Hoàn thành mục tiêu tuần đầu tiên.'
          when 'COMEBACK_LEARNER' then 'Tiến bộ sau khi cần ôn lại.'
        end,
        'icon', case
          when award.achievement_id in ('FIRST_CORRECT') then 'check'
          when award.achievement_id in ('XP_100') then 'star'
          when award.achievement_id in ('XP_500') then 'trophy'
          when award.achievement_id in ('STREAK_3', 'STREAK_7') then 'calendar'
          when award.achievement_id in ('FIRST_MASTERY', 'MASTERY_5') then 'target'
          when award.achievement_id = 'PERFECT_ATTEMPT' then 'medal'
          when award.achievement_id in ('GOAL_GETTER', 'WEEKLY_CHAMPION') then 'flag'
          when award.achievement_id = 'COMEBACK_LEARNER' then 'refresh'
          else 'spark'
        end,
        'awarded_at', award.awarded_at
      ) order by award.awarded_at desc, award.award_id desc)
      from private.student_achievement_awards as award
      where award.student_id = p_student_id
        and award.policy_version = 'PLAVE_MOTIVATION_POLICY_V1'
    ), '[]'::jsonb)
  );
end;
$$;

create function public.get_my_motivation_v1()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_student_id uuid := auth.uid();
begin
  if v_student_id is null then
    raise exception using errcode = 'P0001', message = 'MOTIVATION:UNAUTHENTICATED';
  end if;
  if not exists (
    select 1 from public.profiles as profile
    join public.student_profiles as student on student.user_id = profile.user_id
    where profile.user_id = v_student_id
      and profile.role = 'STUDENT' and profile.onboarding_completed
  ) then
    raise exception using errcode = 'P0001', message = 'MOTIVATION:FORBIDDEN';
  end if;
  return private.student_motivation_summary_v1(v_student_id);
end;
$$;

create function public.get_parent_child_motivation_v1(p_connection_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_student_id uuid;
begin
  select connection.student_user_id into v_student_id
  from public.parent_student_connections as connection
  join public.profiles as profile on profile.user_id = connection.parent_user_id
  where connection.id = p_connection_id
    and connection.parent_user_id = auth.uid()
    and connection.status = 'APPROVED'
    and profile.role = 'PARENT' and profile.onboarding_completed;
  if v_student_id is null then
    raise exception using errcode = 'P0001', message = 'MOTIVATION:FORBIDDEN';
  end if;
  return private.student_motivation_summary_v1(v_student_id);
end;
$$;

create function public.get_teacher_student_motivation_v1(p_student_id uuid)
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
      and profile.role = 'TEACHER' and profile.onboarding_completed
  ) then
    raise exception using errcode = 'P0001', message = 'MOTIVATION:FORBIDDEN';
  end if;
  return private.student_motivation_summary_v1(p_student_id);
end;
$$;

create function public.get_teacher_membership_learning_motivation_v1(
  p_membership_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid;
  v_display_name text;
  v_grade smallint;
begin
  select membership.student_id, student_profile.full_name, student.grade
  into v_student_id, v_display_name, v_grade
  from public.classroom_memberships as membership
  join public.classrooms as classroom on classroom.id = membership.classroom_id
  join public.profiles as teacher_profile on teacher_profile.user_id = classroom.teacher_id
  join public.profiles as student_profile on student_profile.user_id = membership.student_id
  join public.student_profiles as student on student.user_id = membership.student_id
  where membership.id = p_membership_id
    and membership.status = 'APPROVED'
    and classroom.teacher_id = auth.uid()
    and teacher_profile.role = 'TEACHER'
    and teacher_profile.onboarding_completed;
  if v_student_id is null then
    raise exception using errcode = 'P0001', message = 'MOTIVATION:FORBIDDEN';
  end if;
  return jsonb_build_object(
    'student', jsonb_build_object(
      'display_name', v_display_name,
      'grade', v_grade
    ),
    'scoring', private.student_scoring_summary_v1(v_student_id),
    'motivation', private.student_motivation_summary_v1(v_student_id)
  );
end;
$$;

alter function public.submit_curriculum_answer(uuid, text, text, integer, uuid)
  rename to submit_curriculum_answer_0043_impl;
alter function public.submit_curriculum_answer_0043_impl(uuid, text, text, integer, uuid)
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
  v_result jsonb;
  v_summary jsonb;
  v_unlocks jsonb;
begin
  -- Serialize the public wrapper before the legacy implementation performs its
  -- idempotency lookup. Without this lock two identical terminal requests can
  -- both miss the replay row before one waits on the attempt row, causing the
  -- waiter to surface ATTEMPT_NOT_ACTIVE instead of the committed replay.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('motivation-submit:' || p_attempt_id::text, 0)
  );
  v_result := private.submit_curriculum_answer_0043_impl(
    p_attempt_id, p_question_id, p_answer,
    p_expected_revision, p_idempotency_key
  );
  v_summary := private.student_motivation_summary_v1(auth.uid());
  with claimed as (
    insert into private.student_achievement_unlock_deliveries (
      award_id, student_id, request_id, delivered_at
    )
    select award.award_id, award.student_id, p_idempotency_key,
      private.motivation_now_v1(award.student_id, p_attempt_id)
    from private.student_achievement_awards as award
    where award.student_id = auth.uid()
      and award.source_attempt_id = p_attempt_id
      and award.policy_version = 'PLAVE_MOTIVATION_POLICY_V1'
    on conflict do nothing
    returning award_id
  )
  select coalesce(jsonb_agg(item.value), '[]'::jsonb)
  into v_unlocks
  from jsonb_array_elements(v_summary->'achievements') as item(value)
  join private.student_achievement_awards as award
    on award.student_id = auth.uid()
    and award.achievement_id = item.value->>'id'
  join claimed on claimed.award_id = award.award_id;
  return v_result || jsonb_build_object(
    'motivation', v_summary,
    'achievement_unlocks', v_unlocks
  );
end;
$$;

alter function public.submit_generated_curriculum_answer(uuid, text, text, integer, uuid)
  rename to submit_generated_curriculum_answer_0043_impl;
alter function public.submit_generated_curriculum_answer_0043_impl(uuid, text, text, integer, uuid)
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
  v_result jsonb;
  v_summary jsonb;
  v_unlocks jsonb;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('motivation-submit:' || p_attempt_id::text, 0)
  );
  v_result := private.submit_generated_curriculum_answer_0043_impl(
    p_attempt_id, p_question_id, p_answer,
    p_expected_revision, p_idempotency_key
  );
  v_summary := private.student_motivation_summary_v1(auth.uid());
  with claimed as (
    insert into private.student_achievement_unlock_deliveries (
      award_id, student_id, request_id, delivered_at
    )
    select award.award_id, award.student_id, p_idempotency_key,
      private.motivation_now_v1(award.student_id, p_attempt_id)
    from private.student_achievement_awards as award
    where award.student_id = auth.uid()
      and award.source_attempt_id = p_attempt_id
      and award.policy_version = 'PLAVE_MOTIVATION_POLICY_V1'
    on conflict do nothing
    returning award_id
  )
  select coalesce(jsonb_agg(item.value), '[]'::jsonb)
  into v_unlocks
  from jsonb_array_elements(v_summary->'achievements') as item(value)
  join private.student_achievement_awards as award
    on award.student_id = auth.uid()
    and award.achievement_id = item.value->>'id'
  join claimed on claimed.award_id = award.award_id;
  return v_result || jsonb_build_object(
    'motivation', v_summary,
    'achievement_unlocks', v_unlocks
  );
end;
$$;

revoke all on function public.get_my_motivation_v1() from public, anon;
revoke all on function public.get_parent_child_motivation_v1(uuid) from public, anon;
revoke all on function public.get_teacher_student_motivation_v1(uuid) from public, anon;
revoke all on function public.get_teacher_membership_learning_motivation_v1(uuid)
  from public, anon;
grant execute on function public.get_my_motivation_v1() to authenticated;
grant execute on function public.get_parent_child_motivation_v1(uuid) to authenticated;
grant execute on function public.get_teacher_student_motivation_v1(uuid) to authenticated;
grant execute on function public.get_teacher_membership_learning_motivation_v1(uuid)
  to authenticated;
revoke all on function public.submit_curriculum_answer(uuid, text, text, integer, uuid)
  from public, anon;
revoke all on function public.submit_generated_curriculum_answer(uuid, text, text, integer, uuid)
  from public, anon;
grant execute on function public.submit_curriculum_answer(uuid, text, text, integer, uuid)
  to authenticated;
grant execute on function public.submit_generated_curriculum_answer(uuid, text, text, integer, uuid)
  to authenticated;

revoke all on function private.motivation_now_v1(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.motivation_level_v1(integer)
  from public, anon, authenticated, service_role;
revoke all on function private.motivation_streak_v1(uuid, date)
  from public, anon, authenticated, service_role;
revoke all on function private.reject_motivation_ledger_mutation_v1()
  from public, anon, authenticated, service_role;
revoke all on function private.stamp_motivation_answer_time_v1()
  from public, anon, authenticated, service_role;
revoke all on function private.record_motivation_mastery_transition_v1()
  from public, anon, authenticated, service_role;
revoke all on function private.refresh_motivation_for_attempt_v1(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.curriculum_attempt_motivation_trigger_v1()
  from public, anon, authenticated, service_role;
revoke all on function private.student_motivation_summary_v1(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.submit_curriculum_answer_0043_impl(uuid, text, text, integer, uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.submit_generated_curriculum_answer_0043_impl(uuid, text, text, integer, uuid)
  from public, anon, authenticated, service_role;

comment on table private.student_completed_attempt_events is
  'Append-only exactly-once terminal attempt events under PLAVE_MOTIVATION_POLICY_V1.';
comment on table private.student_qualifying_learning_days is
  'Append-only one-row-per-local-learning-day ledger under PLAVE_MOTIVATION_POLICY_V1.';
comment on table private.student_goal_completion_ledger is
  'Append-only exactly-once daily/weekly goal completion events.';
comment on table private.student_achievement_awards is
  'Append-only exactly-once server-authoritative achievement awards; awards grant no XP.';
comment on table private.student_achievement_unlock_deliveries is
  'Append-only exactly-once unlock notification claims; reloads and replays cannot celebrate again.';
comment on table private.student_motivation_mastery_transitions is
  'Append-only real mastery-status history used for fail-closed comeback evaluation.';
comment on table private.motivation_test_clock_overrides is
  'Disposable-test-only server clock injection; empty by default and inaccessible to application roles.';
comment on function public.get_my_motivation_v1() is
  'Returns the authenticated Student sanitized Motivation summary.';
comment on function public.get_parent_child_motivation_v1(uuid) is
  'Returns a sanitized read-only Motivation summary for an approved Parent connection.';
comment on function public.get_teacher_student_motivation_v1(uuid) is
  'Returns a sanitized read-only Motivation summary for an approved classroom membership.';
comment on function public.get_teacher_membership_learning_motivation_v1(uuid) is
  'Returns sanitized Score/XP/Mastery and Motivation summaries for an approved Teacher roster membership.';

commit;
