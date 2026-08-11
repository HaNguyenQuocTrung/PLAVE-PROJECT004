\set ON_ERROR_STOP on
begin read only;
select current_setting('transaction_read_only') as transaction_read_only;
select unit.grade, release.unit_slug, release.release_candidate_id,
  release.content_version, release.bundle_sha256, release.policy_version,
  release.publication_status, release.student_visibility,
  release.runtime_enabled, release.controlled_pilot_enabled,
  release.retention_runtime_enabled,
  (select count(*) from public.questions as question where question.unit_slug = release.unit_slug and question.published) as published_question_count,
  (select count(*) from public.adaptive_practice_pilot_members as member where member.unit_slug = release.unit_slug and member.enabled) as entitlement_count
from public.adaptive_practice_releases as release
join public.learning_units as unit on unit.slug = release.unit_slug
where unit.grade = :'grade'::smallint and release.unit_slug = :'unit_slug'
  and release.release_candidate_id = :'candidate_id'
  and release.content_version = :'candidate_version'
  and release.bundle_sha256 = :'bundle_hash'
  and release.policy_version = :'policy_version';
rollback;
