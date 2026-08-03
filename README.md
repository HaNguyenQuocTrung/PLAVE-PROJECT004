# PLAVE Project004

PLAVE is a local-first learning platform for mathematics in Grades 1–9. It combines curriculum-aligned lessons, practice, progress tracking, and role-specific learning workspaces in one Next.js application.

## Problem statement

Students need a coherent path from curriculum concepts to deliberate practice and useful feedback. Families and teachers also need a shared view of progress without exposing private runtime data or depending on a production deployment. PLAVE Project004 addresses this gap with a reproducible local learning product and explicit academic validation checkpoints.

## Main users

- **Student** — studies lessons, completes practice, reviews results, and follows learning history.
- **Parent** — views linked learner progress and learning signals.
- **Teacher** — manages classroom-oriented views, assignments, and read-only learner progress.

## Implemented features

- Grades 1–9 mathematics curriculum.
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
npm install
```

Create a local environment file from the example and provide placeholders or local values for the services you intend to run. Never commit real secrets.

```bash
cp .env.example .env.local
```

The commonly required variable names are:

```text
NEXT_PUBLIC_SUPABASE_URL=<your-local-supabase-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-local-supabase-publishable-key>
GOOGLE_API_KEY=<your-local-google-api-key>
GOOGLE_AI_MODEL=<your-local-google-model-name>
PLAVE_AI_PROVIDER=<local-provider-name>
PLAVE_AI_TUTOR_ENABLED=<true-or-false>
```

Build and start the local production server:

```bash
npm run build:production-local
npm run start
```

The expected local URL is <http://127.0.0.1:3001>.

## Testing summary

The recorded Project004 checkpoint includes:

- TypeScript typecheck: passed.
- ESLint lint: passed.
- Production build: **77/77 routes** generated successfully.
- Practice validation: **550/550**.
- Generator V2 validation: **32,760/32,760**.
- `npm audit`: **0 vulnerabilities** at the recorded checkpoint.

## Honest limitations

- Generator V2 remains **OFF by default**.
- AI Tutor is a **local MVP**, not a production AI service commitment.
- Sprint 11B acceptance is incomplete.
- Remote deployment and remote migration execution are not claimed by this repository README.

## Repository

<https://github.com/HaNguyenQuocTrung/PLAVE-PROJECT004>

## Demonstration video

[Project demonstration video — add link]

## Academic project notice

PLAVE Project004 is an academic project submission. It is provided for review, reproducibility, and demonstration of the implemented local learning platform.

**Author:** Ha Nguyen Quoc Trung
