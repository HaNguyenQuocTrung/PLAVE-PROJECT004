# PLAVE Owner local demo — Grades 1–9

> **HISTORICAL / SUPERSEDED:** The failed browser checkpoint below remains
> accurate for its date. Current passing real-browser evidence and runbook are
> `docs/final/PLAVE_GRADES_1_9_LOCAL_ACCEPTANCE.md` and
> `docs/releases/GRADES_1_9_REAL_LOCAL_BROWSER_ACCEPTANCE.md`.

Status: **NOT_READY_FOR_OWNER_BROWSER_DEMO**.

Owner browser acceptance failed on 2026-07-31 while starting Grade 8
`linear-functions` practice. The live-local database evidence remains valid,
but it does not authorize a browser demo. Keep this status until the Owner
reruns and confirms registration/login, acceptable warm navigation,
start/resume, answer submission and persistence.

This mode is only for the PROJECT004 Supabase stack on loopback. It is not a
production release, publication or remote activation procedure.

## Safety contract

The demo commands:

- obtain the local API URL, local public key and database URL from
  `supabase status -o env` without printing those values;
- reject any API or PostgreSQL host other than `127.0.0.1`, `localhost` or
  `::1`;
- never call `supabase link`, `db push`, deployment or remote SQL;
- activate only `plave-math-grades-1-9-v1`;
- require the bank to remain exactly 171 units, 2,052 public questions,
  2,052 private solutions and 546 official outcomes;
- keep the frozen Grade 2 adaptive release `DRAFT/HIDDEN` with every adaptive
  and controlled-pilot flag false;
- do not create synthetic fixture users;
- keep Owner-created acceptance accounts, attempts, answers, assignments,
  history and progress only while the isolated demo is running.

`.env.local` is not required and must not be committed. It is already excluded
by the repository environment-file rule. The scripts capture local values
directly from the Supabase CLI and do not write them to the repository.

The Owner's separate port-3000 production-local runtime is outside this
workflow. Its remote-development database currently lacks migrations 0043 and
0044. A runtime built before the compatibility repair can return `UNAVAILABLE`;
after rebuilding, base History and approved Parent progress remain available,
while scoring, XP and motivation enrichment stay unavailable until those
migrations receive separate review and authorization. This local workflow does
not alter or deploy that remote schema.

## Start

Prerequisites:

1. Work from `/Users/hatrung/Desktop/PLAVE-PROJECT004`.
2. Keep Docker running. Do not start a separate PROJECT004 Supabase stack.
3. Ensure port 3100 and the configured local Supabase ports are free.

Run the static, mutation-free setup preflight first:

```bash
npm run owner-local-demo:preflight
```

Run:

```bash
npm run owner-local-demo:start
```

START creates the isolated PROJECT004 Supabase stack, applies migrations
0001–0044, performs one guarded local activation, validates the database
state, starts Next.js on port 3100 and records a mode-0600 managed-state file.
From Terminal 2,
run the one standalone acceptance command while START remains active:

```bash
npm run owner-local-demo:preflight
```

Standalone preflight does not read its own runtime environment as evidence for
the Next child. It observes the child through the loopback-only internal
health contract and checks:

- local Supabase Auth and PostgreSQL health;
- the sequential migration files 0001–0044 and required database schema
  fingerprint;
- release counts 171 / 2,052 / 2,052 / 546;
- database release `ACTIVE/ACTIVE`;
- runtime true as observed inside the Next process;
- all Grade 2 adaptive/pilot application and database flags disabled;
- port 3100 belongs to the managed START process;
- managed PID and PROJECT004 cache identity are current;
- database release and observed runtime agree.

Every check prints only `PREFLIGHT_CHECK <NAME>=PASS|FAIL`. It never prints a
URL, key, token, UUID, PID value or identity. A stale process, foreign port
owner, wrong project cache, active-release/runtime-false pair or
inactive-release/runtime-true pair fails explicitly before the final marker.

Expected diagnostic markers include:

```text
OWNER_LOCAL_DEMO_PREFLIGHT=PASS
NOT_READY_FOR_OWNER_BROWSER_DEMO
OWNER_LOCAL_DEMO_RUNTIME_DIAGNOSTIC_MODE
APP_URL=http://127.0.0.1:3100
RELEASE=ACTIVE
RUNTIME_FLAG=true
```

Open:

- application: `http://127.0.0.1:3100`;
- registration: `http://127.0.0.1:3100/register`;
- local confirmation mailbox, with the default Supabase ports:
  `http://127.0.0.1:54324`.

If the local Supabase configuration uses a different mailbox port, use the
mailbox URL reported locally by the Supabase CLI. Do not paste keys or database
URLs into chat, documentation or terminal logs.

## Safe runtime diagnostics

The Owner process uses the dedicated
`.next-owner-local-project004` cache and `tsconfig.owner-local.json`. This
prevents a normal `.next` artifact from another checkout from entering the
Owner runtime.

For curriculum start, state, answer, progress and history requests, the server
prints one structured diagnostic record containing only:

- `correlation_id` in the non-identity `cr_...` format;
- sanitized `api_path` without query values;
- `http_status`, `server_error_code` and total `duration_ms`;
- stage durations such as `auth_user`, `profile`, `student_profile`, `rpc`
  and `response_mapping`.

It never intentionally logs a token, key, email, user/attempt/question UUID or
request body. The UI shows the friendly error code and correlation ID, keeps a
stable idempotency key and offers a manual retry. Client and Supabase calls
have finite timeouts, so loading cannot remain indefinite.

To run the synthetic Grades 1, 5, 8 and 9 HTTP/cookie acceptance locally:

```bash
npm run test:owner-local-runtime
```

This test cleans up its local synthetic accounts. It is useful engineering
evidence, but it does not replace the Owner browser checklist.

Local technical targets (not production commitments):

- warm register/login action: clear response within about 2 seconds;
- warm lesson navigation: about 1 second;
- start/resume: about 1.5 seconds;
- submit, progress and history: about 1.5 seconds;
- every timeout: bounded and mapped to a retryable error.

Record cold compile separately from warm navigation, server processing,
Supabase/RPC and client transition. A cold compile is not an explanation for
slow warm requests.

After clicking start, the browser Performance API contains three identity-free
measures: `plave:start-practice-api`,
`plave:start-practice-client-transition` and
`plave:start-practice-total-transition`. Inspect their latest `duration`
values in local DevTools; the measure names and values contain no route entity
ID or identity.

## Browser checklist

Passing this checklist is required before changing the status back to an Owner
browser demo-ready state. Database-only per-grade tests are not a substitute.

Use Owner-created local accounts, not the integration fixture.

### Student — repeat with any desired Grade 1–9

1. Register as Student and select the intended grade.
2. Open the local mailbox and confirm the account if confirmation is enabled.
3. Sign in and complete onboarding without changing the selected grade.
4. Open `/learn`; confirm that the catalog matches the Student grade.
5. Open a unit, read theory and worked examples, then start practice.
6. Submit one incorrect and one correct answer. Confirm feedback differs and
   the solution appears only after submit.
7. Note the current unit, progress and history.
8. Close the browser or sign out, sign in again and revisit:
   - `/learn`;
   - `/learning-progress`;
   - `/learning-history`.
9. Confirm the attempt resumes and unit/outcome/skill evidence remains stored.

### Parent

1. Register and confirm a Parent account.
2. From the Student dashboard, copy the private Student connection code.
3. Parent opens `/connections`, sends the request using that code.
4. Student signs in and approves the pending request.
5. Parent reopens the selected child and verifies units, attempts, outcome and
   skill progress.
6. If testing multiple children, switch between them and confirm data never
   mixes.

### Teacher

Create exactly one local one-time invitation with a bounded 24-hour lifetime:

```bash
npm run owner-local-demo:teacher-invite -- --expires-hours 24
```

The command proves both Supabase endpoints are loopback-only, prints the new
code once in the Owner's Terminal, reports the invitation record/count, and
does not persist plaintext. Follow
`docs/operations/OWNER_LOCAL_TEACHER_INVITATION.md` for status, revocation,
cleanup, and the complete activation contract. Then:

1. Register and confirm a Teacher account.
2. Complete Teacher activation using the invitation.
3. Create a classroom with the same grade as the intended Student.
4. Student joins using the classroom code; Teacher approves membership.
5. Teacher browses the universal curriculum by grade/domain/unit/outcome/skill.
6. Create either:
   - deterministic filtered selection; or
   - manual public-question selection.
7. Publish the assignment.
8. Student starts, resumes, answers and submits it.
9. Teacher opens the gradebook and verifies completion, score and
   outcome/skill evidence.
10. Close and, if desired, reopen the assignment using the existing lifecycle
    controls.

The Teacher never receives private solutions while building the assignment.
Database RPCs remain authoritative for correctness and score.

## Stop safely

From another terminal in the same project:

```bash
npm run owner-local-demo:stop
```

The command:

- signals the managed local Next.js demo process;
- sets the runtime contract to false for the stop preflight;
- restores the universal release to `DRAFT/INACTIVE`;
- confirms the Grade 2 adaptive pilot remains disabled;
- deletes the disposable Owner-local accounts and learning/collaboration data
  together with the isolated database after Owner acceptance is complete;
- stops only the PROJECT004 Supabase resources created by START and never
  touches hosted data.

Expected final state:

```text
OWNER_LOCAL_DEMO_STOPPED
OWNER_LOCAL_ACCEPTANCE_DATA=REMOVED
UNIVERSAL_RELEASE=DRAFT/INACTIVE
CURRICULUM_RUNTIME=false
GRADE2_CONTROLLED_ADAPTIVE_PILOT=DISABLED
REMOTE_TARGET=NONE_LOOPBACK_ONLY
```

If the terminal running START is active, `Ctrl+C` performs the same guarded
deactivation in its `finally` path.
