# Candidate-scoped controlled pilot operations

These local operation templates reuse `adaptive_practice_releases`; no schema migration is required. They are never migrations and must not be run by an application process.

Supply `grade`, `unit_slug`, `candidate_id`, `candidate_version`, `bundle_hash`, and `policy_version` as psql variables. Activation and deactivation keep the unit and every question unpublished. Deactivation additionally requires `resume_policy=PAUSE_RESUME_PRESERVE_HISTORY`; new starts and resume are paused until a later authorized reactivation, while attempts, answers, scoring, XP, mastery, streaks, goals, and achievements remain intact.

The diagnostic is `BEGIN READ ONLY`/`ROLLBACK`. Operations reveal only candidate-scoped aggregates and never identities. Owner authorization and an independently verified target are required before any non-local use.
