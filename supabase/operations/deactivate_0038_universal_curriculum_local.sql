\set ON_ERROR_STOP on

-- LOCAL/DISPOSABLE ONLY. This restores the checked DRAFT/INACTIVE state; it
-- is not a schema rollback.
-- Existing bound attempts remain reproducible and resumable; new attempts
-- cannot start because no ACTIVE release remains.

begin;

update public.curriculum_releases
set
  status = 'DRAFT',
  activation_state = 'INACTIVE',
  activated_at = null,
  retired_at = null
where status = 'ACTIVE'
  and activation_state = 'ACTIVE';

do $verify$
begin
  if exists (
    select 1
    from public.curriculum_releases
    where status <> 'DRAFT' or activation_state <> 'INACTIVE'
      or activated_at is not null or retired_at is not null
  ) then
    raise exception 'CURRICULUM:DEACTIVATION_FAILED';
  end if;
end;
$verify$;

commit;
