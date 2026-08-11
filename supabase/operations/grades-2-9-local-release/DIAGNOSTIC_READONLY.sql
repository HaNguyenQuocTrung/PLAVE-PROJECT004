\set ON_ERROR_STOP on

select jsonb_build_object(
  'classification','LOCAL_RELEASE_DIAGNOSTIC',
  'grades',count(distinct policy.grade),
  'units',count(distinct (unit.release_id,unit.unit_id)),
  'questions',count(distinct (question.release_id,question.question_id)),
  'skills',(select count(*) from public.curriculum_release_skills skill
    join public.curriculum_grade_release_policies binding on binding.release_id=skill.release_id),
  'modes',jsonb_object_agg(policy.grade,policy.release_mode order by policy.grade),
  'runtime_enabled',bool_and(policy.runtime_enabled),
  'catalog_enabled',bool_and(policy.catalog_enabled),
  'default_entitlements',(select count(*) from public.curriculum_release_pilot_entitlements)
)
from public.curriculum_grade_release_policies policy
left join public.curriculum_release_units unit on unit.release_id=policy.release_id
left join public.curriculum_release_questions question on question.release_id=unit.release_id and question.unit_id=unit.unit_id;
