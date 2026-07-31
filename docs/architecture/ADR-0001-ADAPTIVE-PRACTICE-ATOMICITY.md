# ADR-0001 — Adaptive practice atomicity

- Status: **ACCEPTED_FOR_ISOLATED_DATABASE_TEST**
- Date: 2026-07-29
- Publication impact: none
- Database impact: draft `0036`, not applied

## Context

The current mutation path is:

`Browser → Next.js Route Handler → Supabase SSR client → PostgREST RPC → PostgreSQL`

Next.js uses the public Supabase URL/key and the signed-in user's JWT. There is
no direct PostgreSQL driver, private database connection, custom trusted role,
or service-role in the application. A user can therefore invoke any function
granted to `authenticated` directly through PostgREST. Hiding an RPC behind a
Next.js URL is not an authorization boundary.

The fixed Grade 1 runtime is safe because grading and write transitions happen
inside a `SECURITY DEFINER` PostgreSQL function. The adaptive planner is
currently canonical pure TypeScript.

## Options

### A. PostgreSQL atomic RPC — selected

One database transaction locks the attempt, checks ownership/revision/
idempotency/current question, grades against private solutions, inserts one
immutable evidence row, plans the next transition, increments revision once,
and returns an allowlisted response.

Advantages:

- safe even when called directly through PostgREST;
- one rollback boundary;
- row lock and unique constraints serialize concurrent submissions;
- no private application credential.

PostgREST may obtain a pooled connection for each request, but this design
does not carry transaction state across requests: the full transition is one
function invocation. Its exact pooling/rollback behavior remains part of the
isolated test gate.

Costs:

- the transition planner has a PostgreSQL implementation;
- TypeScript/SQL drift is a release risk;
- actual equivalence and transaction behavior require isolated PostgreSQL
  tests before application.

Reason for accepting duplication: there is no trusted server transaction
channel in the current architecture. TypeScript remains the canonical
specification. SQL is an enforcement implementation, not a second product
policy. Policy values are snapshotted from a typed release record. Static and
model tests are necessary but not sufficient; isolated equivalence tests are a
hard gate.

### B. Server interactive transaction — rejected for current architecture

The installed Supabase client calls PostgREST and does not expose an
interactive transaction callback spanning TypeScript planner execution.
There is no `pg` driver or private role. Introducing either would add a secret,
pooling and deployment architecture not approved in this sprint.

Transaction-pooling behavior cannot be relied on because the application does
not hold a PostgreSQL connection at all.

### C. Two-phase CAS state machine — rejected for current architecture

Phase one could atomically grade and record evidence. Phase two would need to
accept a TypeScript planner decision. With the same user JWT, a browser could
call the phase-two RPC directly and forge `nextQuestion`, mastery or terminal
state.

A signed server decision, private connection or recovery worker could make
this viable, but none has an approved secret-management/operations contract.
Without it, a crash between phases can also leave `PLANNING_REQUIRED` stuck.

## Decision

Use option A for draft `0036`. Public RPCs are `SECURITY DEFINER` because they
must read server-only solutions and write tables with no browser mutation
grants. They use `search_path = ''`, `auth.uid()`, explicit ownership and
release checks, row/advisory locks, revision CAS, immutable evidence and
sanitized error codes.

Private planner helpers are `SECURITY INVOKER`, ungranted to browser roles and
called only within the definer transaction.

This decision does not authorize applying either migration, enabling flags,
publishing content or activating a pilot.

## Consequences and gates

- TypeScript planner stays canonical.
- Any policy change must update TypeScript first, then SQL, equivalence
  fixtures and the policy version.
- `0036` cannot be approved for application until the isolated plan in
  [ADAPTIVE_DATABASE_ISOLATED_TEST_PLAN.md](./ADAPTIVE_DATABASE_ISOLATED_TEST_PLAN.md)
  passes.
- Static tests do not prove PostgreSQL syntax, lock behavior, RLS behavior,
  transaction rollback or planner equivalence.
- Retention persistence remains out of scope.
