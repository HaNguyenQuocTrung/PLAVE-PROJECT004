# PLAVE Project004

PLAVE is a local-first learning platform for mathematics in Grades 1–9. It combines curriculum-aligned lessons, practice, progress tracking, and role-specific learning workspaces in one Next.js application.

## Problem statement

Students need a coherent path from curriculum concepts to deliberate practice and useful feedback. Families and teachers also need a shared view of progress without exposing private runtime data or depending on a production deployment. PLAVE Project004 addresses this gap with a reproducible local learning product and explicit academic validation checkpoints.

## Main users

- **Student** — studies lessons, completes practice, reviews results, and follows learning history.
- **Parent** — views linked learner progress and learning signals.
- **Teacher** — manages classroom-oriented views, assignments, and read-only learner progress.

## Implemented features

- Grade 1 fixed-runtime mathematics learning path.
- Grades 2–9 database-backed adaptive and fixed-safe journeys, materialized by migration `0045` and accepted in a disposable local `PUBLIC` release; the repository default remains `HIDDEN`.
- Lessons, practice, results, and learning history.
- Score, XP, and mastery foundation.
- AI Tutor local MVP.
- Parent and Teacher workspaces.
- Generator V2 with **546 outcomes**, **198 capabilities**, and **32,760 validated samples**.

## Technology stack

- Next.js 16
- TypeScript
- React
- Supabase / PostgreSQL

## Architecture overview

The application uses a Next.js App Router frontend and server-side route handlers. Domain contracts and policy modules in `lib/` keep curriculum, progress, motivation, parent, teacher, and authentication rules explicit. Supabase/PostgreSQL provides the persistence boundary through versioned migrations in `supabase/migrations/`. Scripts and tests provide reproducible validation without requiring a deployed production database.

```text
Browser
  -> Next.js App Router and server actions
  -> Domain contracts and role/policy services (`lib/`)
  -> Supabase client boundary
  -> PostgreSQL migrations and persistence
```

## Local setup

### Prerequisites

- Node.js 22 or newer.
- npm.
- A local Supabase/PostgreSQL environment for persistence-backed flows.

### Install

```bash
npm ci
```

Provide the paired public Supabase settings through the repository's validated
runtime configuration or explicit process environment. The production-local
launcher fails closed when that configuration is missing, partial, or invalid.
Do not copy placeholder values into a runnable environment, commit local
environment files, or expose provider credentials. AI Tutor remains off unless
it is configured separately through its guarded local workflow.

Build and start the local production server:

```bash
npm run build:production-local
npm run start
```

The production-local default is <http://localhost:3000> unless a different port
is explicitly supplied. The URL printed by `npm run start` is authoritative.

For a fully isolated loopback acceptance environment, use the Owner local-demo
runbook. That workflow uses <http://127.0.0.1:3100> and is separate from the
normal production-local server above.

The guarded Grades 1–9 local release profile is documented in
[`docs/releases/GRADES_2_9_LOCAL_RELEASE.md`](docs/releases/GRADES_2_9_LOCAL_RELEASE.md).
It requires an explicitly classified loopback database and separate server-only
application flags. Grades 2–9 are integrated for the typed local `PUBLIC` mode,
so an authenticated Student can learn their authorized grade when both the
application mode and exact database release flags are enabled. The default mode
remains `HIDDEN`. Canonical migration `0045` has been applied and verified on
the canonical remote schema, but that operation did not activate Grades 2–9 or
deploy the new application release.

Real installed-Chrome acceptance passed for Grades 1–9 at the frozen local
checkpoint. Grade 1 remains on its public fixed runtime. Grades 2–9 use the
database-backed adaptive/fixed-safe runtime when an Owner explicitly selects
`PUBLIC` and the exact database release flags are active. This is local release
acceptance. Remote schema materialization is complete; PUBLIC activation,
deployment and online acceptance are still separately gated.

## Testing summary

The recorded Project004 checkpoint includes:

- TypeScript typecheck: passed.
- ESLint lint: passed.
- Production build: **76 static pages** generated across **115 application routes**.
- Practice validation: **550/550**.
- Generator V2 validation: **32,760/32,760**.
- Offline installed-dependency validation: passed at the recorded checkpoint; no online vulnerability query is claimed.

## Honest limitations

- Generator V2 remains **OFF by default**.
- AI Tutor is a **local MVP**, not a production AI service commitment.
- Grades 2–9 remain hidden by default. An Owner must explicitly install and activate the documented local release profile before eligible Students can access their own grade.
- Remote migration `0045` is recorded as applied and verified from preserved
  Owner-authorized operational evidence. Remote Grades 2–9 activation,
  deployment and online availability are not claimed.

## Repository

<https://github.com/HaNguyenQuocTrung/PLAVE-PROJECT004>

## Demonstration video

No public demonstration video is currently available. No video URL is claimed
by this repository.

## Academic project notice

PLAVE Project004 is an academic project submission. It is provided for review, reproducibility, and demonstration of the implemented local learning platform.

**Author:** Ha Nguyen Quoc Trung
