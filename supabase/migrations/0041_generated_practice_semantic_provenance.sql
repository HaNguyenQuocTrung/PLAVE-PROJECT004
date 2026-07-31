begin;

-- Local-only semantic provenance extension. Existing 0040 generated rows stay
-- readable as LEGACY_GENERATED_V1 and are never backfilled with invented data.

alter table public.curriculum_generated_questions
  add column question_source text not null default 'LEGACY_GENERATED_V1',
  add column semantic_variant_id text,
  add column semantic_variant_version text,
  add column solver_version text,
  add column solver_receipt_hash text,
  add column difficulty_policy_version text,
  add column seed_fingerprint text,
  add column ast_hash text,
  add column visual_hash text,
  add column semantic_provenance_locked boolean not null default false;

alter table public.curriculum_generated_questions
  alter column question_source set default 'PENDING_SEMANTIC_V1',
  add constraint curriculum_generated_question_source_check check (
    question_source in (
      'LEGACY_GENERATED_V1',
      'PENDING_SEMANTIC_V1',
      'SEMANTIC_GENERATED_V1'
    )
  ),
  add constraint curriculum_generated_question_provenance_text_check check (
    (
      semantic_variant_id is null
      or (
        semantic_variant_id = upper(btrim(semantic_variant_id))
        and semantic_variant_id ~ '^[A-Z][A-Z0-9_]{2,79}$'
      )
    )
    and (
      semantic_variant_version is null
      or (
        semantic_variant_version = lower(btrim(semantic_variant_version))
        and semantic_variant_version ~ '^[a-z0-9]+(-[a-z0-9]+){1,7}$'
        and char_length(semantic_variant_version) between 4 and 80
      )
    )
    and (
      solver_version is null
      or (
        solver_version = upper(btrim(solver_version))
        and solver_version ~ '^[A-Z][A-Z0-9_]{2,79}$'
      )
    )
    and (
      difficulty_policy_version is null
      or (
        difficulty_policy_version =
          upper(btrim(difficulty_policy_version))
        and difficulty_policy_version ~ '^[A-Z][A-Z0-9_]{2,79}$'
      )
    )
  ),
  add constraint curriculum_generated_question_provenance_hash_check check (
    (solver_receipt_hash is null or solver_receipt_hash ~ '^[0-9a-f]{64}$')
    and (seed_fingerprint is null or seed_fingerprint ~ '^[0-9a-f]{16}$')
    and (ast_hash is null or ast_hash ~ '^[0-9a-f]{64}$')
    and (visual_hash is null or visual_hash ~ '^[0-9a-f]{64}$')
  );

create or replace function private.enforce_generated_question_provenance()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current public.curriculum_generated_questions%rowtype;
begin
  select question.* into v_current
  from public.curriculum_generated_questions as question
  where question.attempt_id = new.attempt_id
    and question.question_id = new.question_id;
  if not found then return null; end if;
  if
    v_current.question_source = 'LEGACY_GENERATED_V1'
    and (
      v_current.semantic_provenance_locked
      or v_current.semantic_variant_id is not null
      or v_current.semantic_variant_version is not null
      or v_current.solver_version is not null
      or v_current.solver_receipt_hash is not null
      or v_current.difficulty_policy_version is not null
      or v_current.seed_fingerprint is not null
      or v_current.ast_hash is not null
      or v_current.visual_hash is not null
    )
  then
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:INVALID_SEMANTIC_PROVENANCE';
  end if;
  if
    v_current.question_source = 'PENDING_SEMANTIC_V1'
  then
    if
      pg_catalog.current_setting(
        'plave.semantic_provenance_write',
        true
      ) = 'enabled'
    then
      return null;
    end if;
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:INCOMPLETE_SEMANTIC_PROVENANCE';
  end if;
  if
    v_current.question_source = 'SEMANTIC_GENERATED_V1'
    and (
      not v_current.semantic_provenance_locked
      or v_current.semantic_variant_id is null
      or v_current.semantic_variant_version is null
      or v_current.solver_version is null
      or v_current.solver_receipt_hash is null
      or v_current.difficulty_policy_version is null
      or v_current.seed_fingerprint is null
      or v_current.ast_hash is null
      or v_current.visual_hash is null
    )
  then
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:INCOMPLETE_SEMANTIC_PROVENANCE';
  end if;
  return null;
end;
$$;

create or replace function private.guard_pending_semantic_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if
    new.question_source = 'PENDING_SEMANTIC_V1'
    and coalesce(
      pg_catalog.current_setting(
        'plave.semantic_provenance_write',
        true
      ),
      ''
    ) <> 'enabled'
  then
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:UNVERIFIED_SEMANTIC_INSERT';
  end if;
  return new;
end;
$$;

create trigger curriculum_generated_question_pending_insert_guard
before insert on public.curriculum_generated_questions
for each row execute function
  private.guard_pending_semantic_insert();

create constraint trigger curriculum_generated_question_provenance_complete
after insert or update on public.curriculum_generated_questions
deferrable initially deferred
for each row execute function
  private.enforce_generated_question_provenance();

create or replace function private.prevent_generated_provenance_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.semantic_provenance_locked then
    if
      new.question_source is distinct from old.question_source
      or new.semantic_provenance_locked is distinct from
        old.semantic_provenance_locked
      or new.semantic_variant_id is distinct from old.semantic_variant_id
      or new.semantic_variant_version is distinct from
        old.semantic_variant_version
      or new.solver_version is distinct from old.solver_version
      or new.solver_receipt_hash is distinct from old.solver_receipt_hash
      or new.difficulty_policy_version is distinct from
        old.difficulty_policy_version
      or new.seed_fingerprint is distinct from old.seed_fingerprint
      or new.ast_hash is distinct from old.ast_hash
      or new.public_payload_hash is distinct from old.public_payload_hash
      or new.visual_hash is distinct from old.visual_hash
      or new.visual is distinct from old.visual
    then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:IMMUTABLE_SEMANTIC_PROVENANCE';
    end if;
    return new;
  end if;
  if old.question_source = 'LEGACY_GENERATED_V1' then
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:LEGACY_PROVENANCE_IMMUTABLE';
  end if;
  if
    old.question_source <> 'PENDING_SEMANTIC_V1'
    or new.question_source <> 'SEMANTIC_GENERATED_V1'
    or not new.semantic_provenance_locked
    or new.semantic_variant_id is null
    or new.semantic_variant_version is null
    or new.solver_version is null
    or new.solver_receipt_hash is null
    or new.difficulty_policy_version is null
    or new.seed_fingerprint is null
    or new.ast_hash is null
    or new.visual_hash is null
  then
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:INVALID_SEMANTIC_PROVENANCE';
  end if;
  return new;
end;
$$;

create trigger curriculum_generated_question_provenance_immutable
before update on public.curriculum_generated_questions
for each row execute function
  private.prevent_generated_provenance_mutation();

create or replace function public.start_or_resume_semantic_generated_curriculum(
  p_snapshot jsonb,
  p_signature text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_attempt_id uuid;
  v_preexisting_attempt_id uuid;
  v_result jsonb;
  v_questions jsonb := p_snapshot -> 'questions';
  v_runtime_snapshot jsonb;
  v_question jsonb;
  v_provenance jsonb;
  v_updated integer := 0;
  v_expected integer := 0;
  v_unit_id text := lower(btrim(coalesce(p_snapshot ->> 'unitId', '')));
  v_preexisting_source text;
begin
  if
    v_user_id is null
    or p_snapshot is null
    or p_idempotency_key is null
    or jsonb_typeof(v_questions) <> 'array'
  then
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:INVALID_REQUEST';
  end if;

  for v_question in
    select item.value
    from jsonb_array_elements(v_questions) as item(value)
  loop
    v_expected := v_expected + 1;
    v_provenance := v_question -> 'provenance';
    if
      jsonb_typeof(v_provenance) <> 'object'
      or coalesce(v_provenance ->> 'semanticVariantId', '') !~
        '^[A-Z][A-Z0-9_]{2,79}$'
      or coalesce(v_provenance ->> 'semanticVariantVersion', '') !~
        '^[a-z0-9]+(-[a-z0-9]+){1,7}$'
      or coalesce(v_provenance ->> 'solverVersion', '') !~
        '^[A-Z][A-Z0-9_]{2,79}$'
      or coalesce(v_provenance ->> 'solverReceiptHash', '') !~
        '^[0-9a-f]{64}$'
      or coalesce(v_provenance ->> 'difficultyPolicyVersion', '') !~
        '^[A-Z][A-Z0-9_]{2,79}$'
      or coalesce(v_provenance ->> 'seedFingerprint', '') !~
        '^[0-9a-f]{16}$'
      or coalesce(v_provenance ->> 'astHash', '') !~
        '^[0-9a-f]{64}$'
      or coalesce(v_provenance ->> 'visualHash', '') !~
        '^[0-9a-f]{64}$'
    then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:INVALID_SEMANTIC_PROVENANCE';
    end if;
  end loop;

  select attempt.id into v_preexisting_attempt_id
  from public.curriculum_attempts as attempt
  where attempt.student_id = v_user_id
    and attempt.start_idempotency_key = p_idempotency_key
  limit 1;

  if v_preexisting_attempt_id is null then
    select attempt.id into v_preexisting_attempt_id
    from public.curriculum_attempts as attempt
    where attempt.student_id = v_user_id
      and attempt.unit_id = v_unit_id
      and attempt.status = 'IN_PROGRESS'
    order by attempt.started_at desc, attempt.id desc
    limit 1;
  end if;

  perform pg_catalog.set_config(
    'plave.semantic_provenance_write',
    'enabled',
    true
  );
  v_runtime_snapshot := pg_catalog.jsonb_set(
    p_snapshot,
    '{questions}',
    (
      select pg_catalog.jsonb_agg(
        case
          when item.value -> 'options' = 'null'::jsonb
          then item.value - 'options'
          else item.value
        end
        order by item.ordinality
      )
      from jsonb_array_elements(v_questions)
        with ordinality as item(value, ordinality)
    )
  );
  v_result := public.start_or_resume_generated_curriculum(
    v_runtime_snapshot,
    p_signature,
    p_idempotency_key
  );
  v_attempt_id := (v_result ->> 'attempt_id')::uuid;

  if v_preexisting_attempt_id is not null then
    if v_attempt_id <> v_preexisting_attempt_id then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:IDEMPOTENCY_CONFLICT';
    end if;
    select min(question.question_source) into v_preexisting_source
    from public.curriculum_generated_questions as question
    where question.attempt_id = v_attempt_id;
    if v_preexisting_source = 'LEGACY_GENERATED_V1' then
      perform pg_catalog.set_config(
        'plave.semantic_provenance_write',
        'disabled',
        true
      );
      return v_result;
    end if;
    if exists (
      select 1
      from jsonb_array_elements(v_questions) as item(value)
      left join public.curriculum_generated_questions as question
        on question.attempt_id = v_attempt_id
        and question.question_id = item.value ->> 'questionId'
      where
        question.question_id is null
        or not question.semantic_provenance_locked
        or question.semantic_variant_id <>
          item.value -> 'provenance' ->> 'semanticVariantId'
        or question.semantic_variant_version <>
          item.value -> 'provenance' ->> 'semanticVariantVersion'
        or question.solver_version <>
          item.value -> 'provenance' ->> 'solverVersion'
        or question.solver_receipt_hash <>
          item.value -> 'provenance' ->> 'solverReceiptHash'
        or question.difficulty_policy_version <>
          item.value -> 'provenance' ->> 'difficultyPolicyVersion'
        or question.seed_fingerprint <>
          item.value -> 'provenance' ->> 'seedFingerprint'
        or question.ast_hash <>
          item.value -> 'provenance' ->> 'astHash'
        or question.visual_hash <>
          item.value -> 'provenance' ->> 'visualHash'
    ) then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:IDEMPOTENCY_CONFLICT';
    end if;
    perform pg_catalog.set_config(
      'plave.semantic_provenance_write',
      'disabled',
      true
    );
    return v_result;
  end if;

  update public.curriculum_generated_questions as question
  set
    semantic_variant_id =
      item.value -> 'provenance' ->> 'semanticVariantId',
    semantic_variant_version =
      item.value -> 'provenance' ->> 'semanticVariantVersion',
    solver_version =
      item.value -> 'provenance' ->> 'solverVersion',
    solver_receipt_hash =
      item.value -> 'provenance' ->> 'solverReceiptHash',
    difficulty_policy_version =
      item.value -> 'provenance' ->> 'difficultyPolicyVersion',
    seed_fingerprint =
      item.value -> 'provenance' ->> 'seedFingerprint',
    ast_hash = item.value -> 'provenance' ->> 'astHash',
    visual_hash = item.value -> 'provenance' ->> 'visualHash',
    question_source = 'SEMANTIC_GENERATED_V1',
    semantic_provenance_locked = true
  from jsonb_array_elements(v_questions) as item(value)
  where question.attempt_id = v_attempt_id
    and question.question_id = item.value ->> 'questionId'
    and question.question_source = 'PENDING_SEMANTIC_V1'
    and not question.semantic_provenance_locked;
  get diagnostics v_updated = row_count;
  if v_updated <> v_expected then
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:SEMANTIC_PROVENANCE_PERSIST_FAILED';
  end if;

  perform pg_catalog.set_config(
    'plave.semantic_provenance_write',
    'disabled',
    true
  );
  return private.build_generated_curriculum_attempt_state(
    v_attempt_id,
    null
  );
exception when others then
  if left(sqlerrm, 11) = 'CURRICULUM:' then raise; end if;
  raise exception using errcode = 'P0001',
    message = 'CURRICULUM:INTEGRITY_FAILURE';
end;
$$;

revoke execute on function public.start_or_resume_generated_curriculum(
  jsonb, text, uuid
) from authenticated;
revoke all on function public.start_or_resume_semantic_generated_curriculum(
  jsonb, text, uuid
) from public, anon;
grant execute on function
  public.start_or_resume_semantic_generated_curriculum(jsonb, text, uuid)
to authenticated;

revoke all on function private.enforce_generated_question_provenance()
  from public, anon, authenticated;
revoke all on function private.guard_pending_semantic_insert()
  from public, anon, authenticated;
revoke all on function private.prevent_generated_provenance_mutation()
  from public, anon, authenticated;

commit;
