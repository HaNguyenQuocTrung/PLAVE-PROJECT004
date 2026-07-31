# Owner local runtime acceptance — 2026-07-31

Status: **NOT_READY_FOR_OWNER_BROWSER_DEMO**.

Engineering remediation and automated local acceptance pass. The status stays
down because the last real Owner browser run failed; only an Owner rerun can
confirm the repaired UI transition in that browser session.

## Exact failure and root cause

The Grade 8 start RPC and database path were healthy. The API converted the
raw Supabase RPC object from snake_case into the public camelCase HTTP
contract. The browser then incorrectly passed that already-mapped response
through the raw RPC snake_case parser. The HTTP response was successful, but
the client parser returned `null`, producing the generic “Chưa thể mở bài
luyện tập” state.

This is why direct per-grade database integration passed while the Owner
browser path failed: the database suite never crossed the HTTP response
mapping and client transition boundary.

A second runtime issue was isolated separately: the normal `.next` directory
contained compiled foreign-project paths and could fail the Next proxy with a 500.
Owner mode now uses `.next-owner-local-project004` and a separate
`tsconfig.owner-local.json`.

## Traced start-practice path

1. `UniversalCurriculumStartButton` creates one stable idempotency key and
   sends the selected public unit ID.
2. `POST /api/curriculum-runtime/start` validates the request and creates the
   authenticated Supabase server client.
3. Access loading validates the JWT user, Student profile and own grade.
4. `start_or_resume_curriculum_attempt(jsonb)` performs release, unit, grade,
   question and solution-boundary checks under RLS/security-definer rules.
5. The server maps raw RPC snake_case exactly once into the camelCase HTTP
   contract.
6. The browser parses the camelCase API state and transitions to
   `/curriculum-practice/[attemptId]`.

Preflight and live HTTP evidence ruled out missing runtime env, inactive
release ordering, wrong release bank, grade/unit slug drift, RPC argument
shape, local Auth/session mismatch, RLS/JWT claim denial and connection
timeout for the accepted runs.

## Safe diagnostics and retry behavior

Runtime logs and response headers expose only a non-identity `cr_...`
correlation ID, sanitized API path, HTTP status, allowlisted server error code,
total duration and named stage durations. They omit query values, request
bodies, tokens, keys, emails and entity UUIDs.

Start and answer requests have a six-second client timeout; Supabase server
fetches have an eight-second timeout. Timeout and retryable failures show a
friendly error code plus correlation ID. Retry is explicit and reuses the
stable idempotency key; there is no automatic duplicate POST.

## Local measurements

These are engineering measurements on the PROJECT004 local stack, not
production commitments.

| Journey | Observed |
|---|---:|
| Register, final Grade 8 run | 161.9 ms |
| Login, final Grade 8 run | 105.0 ms |
| Cold first dashboard compile/request | 1,217.8 ms |
| Warm Grade 8 dashboard | 215.7 ms |
| Cold first `/learn` | 617.9 ms |
| Warm Grade 8 `/learn` | 242.7 ms |
| Cold first lesson | 868.5 ms |
| Warm Grade 8 lesson | 216.6 ms |
| Grade 8 start/resume HTTP duration | 83.6 ms |
| Grade 8 start handler total | 48.7 ms |
| Grade 8 start Supabase RPC | 8.1 ms |
| Grade 8 submit answer | 74.1 ms |
| Grade 8 progress | 72.6 ms |
| Grade 8 history | 74.1 ms |
| Grade 8 persisted state reload | 85.2 ms |

All measured warm actions met the local targets: auth under 2 seconds, lesson
navigation under 1 second, and start/submit/progress/history under 1.5 seconds.
Cold compile was recorded independently and was not used to explain warm
latency.

The UI additionally records identity-free browser Performance measures for
API wait, route-push-to-runner-ready client transition and total
click-to-runner-ready transition. Direct browser automation was unavailable,
so the final transition duration remains an explicit Owner DevTools
measurement in the promotion checklist rather than an invented automated
number.

Confirmed performance changes include reusing authenticated access context,
loading independent dashboard data concurrently, avoiding the post-login
duplicate `getUser`, and bounding Supabase/client waits. No auth, RLS, grade
check or private-solution boundary was bypassed.

## Verification

- Live HTTP/cookie acceptance for Student Grades 1, 5, 8 and 9: PASS for
  register, login, dashboard, learn, lesson, start/resume, submit, progress,
  history and persistence.
- Live database per-grade suite: Grades 1–9 PASS; cleanup PASS;
  release restored to `DRAFT/INACTIVE`; zero synthetic users.
- Targeted runtime/Owner/security contracts: 14/14 PASS.
- Full sequential suite: 818/818 PASS at concurrency 1.
- Lint, typecheck and production build: PASS.
- Client solution/service-role source scan: zero matches.
- Credential handling suite: 12/12 PASS.

Direct browser automation was unavailable in this environment, so the live
HTTP/cookie test is deliberately not presented as Owner browser confirmation.

## Owner promotion gate

Start the guarded local demo and rerun the checklist in
`OWNER_LOCAL_DEMO_RUNBOOK.md`. Promote status only after Owner confirms:

1. register and login work;
2. warm navigation is acceptable;
3. Grade 8 practice opens;
4. answer submission works;
5. state persists after reload or re-login.
