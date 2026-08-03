# Sprint 11B — Level, Streak, Goals and Achievements

Status: `BLOCKED_LOCAL_ACCEPTANCE_REQUIRED`

Implemented in this sprint:

- Typed `PLAVE_MOTIVATION_POLICY_V1` projections and achievement definitions.
- Additive local migration 0044 with qualifying-day, goal-completion and
  achievement ledgers, RLS and a sanitized Student motivation RPC.
- Optional Student dashboard/progress motivation surface; the UI remains empty
  and safe when the local motivation RPC is unavailable.
- Boundary tests for level, streak, goals, achievements and migration shape.

Verification state is recorded in `artifacts/academic-mvp/sprint-11b-report.json`.
No remote migration, deployment, provider request, Git operation or production
activation is performed by Sprint 11B implementation.

Deferred: leaderboard, social ranking, virtual currency, streak freeze,
adaptive recommendation and full Parent/Teacher analytics.
