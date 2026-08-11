create table public.learning_units (
  slug text primary key,
  grade smallint not null,
  published boolean not null
);
create table public.questions (
  code text primary key,
  unit_slug text not null references public.learning_units(slug),
  published boolean not null
);
create table public.adaptive_practice_releases (
  unit_slug text primary key references public.learning_units(slug),
  release_candidate_id text not null,
  content_version text not null,
  bundle_sha256 text not null,
  policy_version text not null,
  runtime_enabled boolean not null,
  controlled_pilot_enabled boolean not null,
  retention_runtime_enabled boolean not null,
  publication_status text not null,
  student_visibility text not null,
  updated_at timestamptz not null default now()
);
create table public.adaptive_practice_pilot_members (
  student_id uuid not null,
  unit_slug text not null,
  release_candidate_id text not null,
  content_version text not null,
  bundle_sha256 text not null,
  policy_version text not null,
  enabled boolean not null
);
insert into public.learning_units values ('fixture-grade-4-candidate', 4, false);
insert into public.questions values ('fixture-question', 'fixture-grade-4-candidate', false);
insert into public.adaptive_practice_releases values (
  'fixture-grade-4-candidate', 'fixture-grade-4-candidate-rc1', 'fixture-1.0.0',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'fixture-policy-1.0.0', false, false, false, 'DRAFT', 'HIDDEN', now()
);
insert into public.adaptive_practice_pilot_members values (
  '11111111-1111-4111-8111-111111111111', 'fixture-grade-4-candidate',
  'fixture-grade-4-candidate-rc1', 'fixture-1.0.0',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'fixture-policy-1.0.0', true
);
