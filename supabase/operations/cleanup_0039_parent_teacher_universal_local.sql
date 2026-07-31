\set ON_ERROR_STOP on

-- EMERGENCY LOCAL CLEANUP ONLY.
-- Targets only deterministic synthetic IDs from the 0039 integration fixture.

begin;
set local session_replication_role = replica;

delete from public.student_assignment_outcome_progress
where student_id::text like '51000000-0000-4000-8000-%';
delete from public.student_assignment_skill_progress
where student_id::text like '51000000-0000-4000-8000-%';

delete from private.assignment_submission_mutations
where submission_id in (
  select id from public.assignment_submissions
  where student_id::text like '51000000-0000-4000-8000-%'
);
delete from public.assignment_answers
where submission_id in (
  select id from public.assignment_submissions
  where student_id::text like '51000000-0000-4000-8000-%'
);
delete from public.assignment_submissions
where student_id::text like '51000000-0000-4000-8000-%';

delete from public.teacher_assignment_items
where assignment_id in (
  select id from public.teacher_assignments
  where teacher_id::text like '53000000-0000-4000-8000-%'
);
delete from public.teacher_question_solutions
where question_id in (
  select id from public.teacher_questions
  where teacher_id::text like '53000000-0000-4000-8000-%'
);
delete from public.teacher_questions
where teacher_id::text like '53000000-0000-4000-8000-%';

delete from public.teacher_curriculum_assignment_draft_items
where draft_id in (
  select id from public.teacher_curriculum_assignment_drafts
  where teacher_id::text like '53000000-0000-4000-8000-%'
);
delete from public.teacher_curriculum_assignment_drafts
where teacher_id::text like '53000000-0000-4000-8000-%';
delete from public.teacher_assignments
where teacher_id::text like '53000000-0000-4000-8000-%';

delete from public.parent_student_connections
where parent_user_id::text like '52000000-0000-4000-8000-%';
delete from public.classroom_memberships
where classroom_id::text like '54000000-0000-4000-8000-%';
delete from public.classrooms
where id::text like '54000000-0000-4000-8000-%';

delete from public.teacher_profiles
where user_id::text like '53000000-0000-4000-8000-%';
delete from public.teacher_invitations
where id::text like '53100000-0000-4000-8000-%';

delete from auth.users
where
  id::text like '51000000-0000-4000-8000-%'
  or id::text like '52000000-0000-4000-8000-%'
  or id::text like '53000000-0000-4000-8000-%';

update public.curriculum_releases
set
  status = 'DRAFT',
  activation_state = 'INACTIVE',
  activated_at = null
where status = 'ACTIVE' or activation_state = 'ACTIVE';

set local session_replication_role = origin;
commit;

\echo '0039 synthetic local cleanup: PASS'
