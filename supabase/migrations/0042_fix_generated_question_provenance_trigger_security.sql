begin;

-- The constraint trigger is deferred until transaction commit. PostgREST keeps
-- the authenticated transaction role active at that point, so a SECURITY
-- INVOKER trigger cannot re-read the generated-question row after direct table
-- privileges have been revoked. Keep validation deferred and fail-closed, but
-- execute the existing fully-qualified validation body as its trusted owner.

alter function private.enforce_generated_question_provenance()
  owner to postgres;

alter function private.enforce_generated_question_provenance()
  security definer;

alter function private.enforce_generated_question_provenance()
  set search_path = '';

revoke all on function private.enforce_generated_question_provenance()
  from public, anon, authenticated;

comment on function private.enforce_generated_question_provenance() is
  'Deferred internal provenance validator. SECURITY DEFINER is required because authenticated has no direct generated-question table privileges; owner postgres and empty search_path preserve the trusted trigger-only boundary.';

-- Migration 0041 made semantic provenance, the public hash and the visual
-- immutable after locking, but a privileged caller could still mutate prompt
-- or another public snapshot column without changing the stored hash. Preserve
-- the one internal PENDING -> SEMANTIC transition while making every base
-- question field immutable during that transition and every field immutable
-- after the row is locked.

create or replace function private.prevent_generated_provenance_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.semantic_provenance_locked then
    if new is distinct from old then
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
    or new.attempt_id is distinct from old.attempt_id
    or new.release_id is distinct from old.release_id
    or new.unit_id is distinct from old.unit_id
    or new.question_id is distinct from old.question_id
    or new.position is distinct from old.position
    or new.contract_version is distinct from old.contract_version
    or new.grade is distinct from old.grade
    or new.official_outcome_id is distinct from old.official_outcome_id
    or new.official_outcome_title is distinct from old.official_outcome_title
    or new.skill_id is distinct from old.skill_id
    or new.skill_title is distinct from old.skill_title
    or new.difficulty is distinct from old.difficulty
    or new.evidence_form is distinct from old.evidence_form
    or new.question_seed is distinct from old.question_seed
    or new.generator_version is distinct from old.generator_version
    or new.content_release_hash is distinct from old.content_release_hash
    or new.prompt is distinct from old.prompt
    or new.answer_type is distinct from old.answer_type
    or new.options is distinct from old.options
    or new.visual is distinct from old.visual
    or new.misconception_tags is distinct from old.misconception_tags
    or new.public_payload_hash is distinct from old.public_payload_hash
    or new.created_at is distinct from old.created_at
  then
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:INVALID_SEMANTIC_PROVENANCE';
  end if;
  return new;
end;
$$;

alter function private.prevent_generated_provenance_mutation()
  owner to postgres;

alter function private.prevent_generated_provenance_mutation()
  set search_path = '';

revoke all on function private.prevent_generated_provenance_mutation()
  from public, anon, authenticated;

comment on function private.prevent_generated_provenance_mutation() is
  'Internal immutable-snapshot guard. Allows only the signed pending-to-semantic provenance transition and rejects every post-lock row mutation.';

-- Serialize the semantic wrapper before its preexisting-attempt inspection.
-- Migration 0040 already uses this exact transaction advisory-lock key inside
-- the generated start function; taking it one layer earlier is reentrant for
-- the same transaction and prevents two concurrent semantic wrappers from both
-- classifying the same idempotency key as a new attempt.

alter function public.start_or_resume_semantic_generated_curriculum(
  jsonb, text, uuid
) rename to start_or_resume_semantic_generated_curriculum_0041_impl;

alter function public.start_or_resume_semantic_generated_curriculum_0041_impl(
  jsonb, text, uuid
) set schema private;

alter function private.start_or_resume_semantic_generated_curriculum_0041_impl(
  jsonb, text, uuid
) owner to postgres;

alter function private.start_or_resume_semantic_generated_curriculum_0041_impl(
  jsonb, text, uuid
) security definer;

alter function private.start_or_resume_semantic_generated_curriculum_0041_impl(
  jsonb, text, uuid
) set search_path = '';

revoke all on function
  private.start_or_resume_semantic_generated_curriculum_0041_impl(
    jsonb, text, uuid
  )
from public, anon, authenticated;

create function public.start_or_resume_semantic_generated_curriculum(
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
  v_unit_id text := pg_catalog.lower(
    pg_catalog.btrim(coalesce(p_snapshot ->> 'unitId', ''))
  );
begin
  if
    v_user_id is null
    or p_snapshot is null
    or p_idempotency_key is null
    or v_unit_id !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  then
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:INVALID_REQUEST';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_user_id::text || ':' || v_unit_id,
      0
    )
  );

  return private.start_or_resume_semantic_generated_curriculum_0041_impl(
    p_snapshot,
    p_signature,
    p_idempotency_key
  );
exception when others then
  if pg_catalog.left(sqlerrm, 11) = 'CURRICULUM:' then raise; end if;
  raise exception using errcode = 'P0001',
    message = 'CURRICULUM:INTEGRITY_FAILURE';
end;
$$;

alter function public.start_or_resume_semantic_generated_curriculum(
  jsonb, text, uuid
) owner to postgres;

revoke all on function public.start_or_resume_semantic_generated_curriculum(
  jsonb, text, uuid
) from public, anon;

grant execute on function
  public.start_or_resume_semantic_generated_curriculum(jsonb, text, uuid)
to authenticated;

comment on function public.start_or_resume_semantic_generated_curriculum(
  jsonb, text, uuid
) is
  'Authenticated signed semantic start RPC. Serializes by Student and unit before delegating to the immutable 0041 implementation; no direct table privileges are granted.';

commit;
