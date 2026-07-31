# PROJECT004 clean remote runtime connection

Status: `PACKAGE_READY_OWNER_SECRET_CONFIGURATION_REQUIRED`

This package connects only the local PROJECT004 application to the already
provisioned development target named `plave-project004-dev-clean`. Universal
activation is now governed by the separate guarded activation package. This
runtime connection does not itself activate a database release, enable the
Grade 2 pilot, run a migration, seed application data, issue an invitation, or
deploy the application.

## Runtime configuration audit

The application runtime has one public Supabase configuration boundary:

| Consumer | Variables | Credential class |
| --- | --- | --- |
| Browser client (`lib/supabase/client.ts`) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public |
| Server SSR/actions/RPC (`lib/supabase/server.ts`) | the same two variables | Public, authenticated by the user's cookie/JWT |
| Session proxy (`lib/supabase/proxy.ts`) | the same two variables | Public, authenticated by the user's cookie/JWT |
| Server service-role key | no application runtime consumer | Forbidden in this profile |
| Direct database connection/password | no application runtime consumer | Forbidden in this profile |

Provisioning utilities use database credentials in separate guarded processes.
Those credentials are not application runtime configuration and are not copied
into the remote-development profile. A key with a `NEXT_PUBLIC_` prefix is
delivered to browser code, so the service-role key is rejected under both
public and server-style names.

The profile enables the fixed universal curriculum lane and pins all of these
to their disabled state:

- on-demand generation;
- Grade 2 Numbers to 1000;
- adaptive practice runtime;
- controlled pilot;
- retention runtime;
- adaptive pilot allowlist (empty).

The environment flag alone does not turn a database release active. Before the
separate atomic activation, Grades 2–9 still fail closed because the remote
release remains `DRAFT/INACTIVE`.

## Isolated secret setup

The Owner obtains the Project URL and publishable key (or legacy anon key) from
the exact clean project's Supabase Dashboard. Do not paste them into chat or a
shell command. From the canonical PROJECT004 directory, run:

```sh
npm run --silent remote-dev:runtime-configure
```

The command reads the exact target name, project reference, API URL, and public
key directly from `/dev/tty` with echo disabled. It writes
`.env.remote-dev.local` with mode `0600`. That file is covered by the
repository's `.env*` ignore rule. It never reads or overwrites `.env.local`,
and it does not accept a service-role key, database URL, or database password.

The guard requires:

- exact target name `plave-project004-dev-clean`;
- a valid project-reference shape;
- an HTTPS Supabase URL whose hostname embeds that same reference;
- a publishable or legacy anon public-key shape;
- fixed universal curriculum flag `true`, or `false` only after guarded
  deactivation;
- every adaptive/on-demand/pilot flag disabled;
- no additional environment keys;
- a regular, current-user-owned `0600` file (no symlink).

Start the separate loopback runtime only after the Dashboard checks below:

```sh
npm run --silent remote-dev:runtime-start
```

It binds `127.0.0.1:3001`, uses `.next-remote-dev-project004`, scrubs inherited
local Supabase/database/admin credentials, prevents Next from loading any
dotenv override, and gives the child only the remote public URL/key plus
the fixed universal flag plus disabled adaptive/on-demand flags. The existing
`.env.local` is neither loaded nor modified by this runtime profile.

## Supabase Dashboard checklist

Record only PASS/FAIL—never record a URL, project reference, key, email,
password, token, invitation code, or user identifier.

- [ ] `TARGET_NAME_EXACT=PASS`: the open Dashboard project is exactly
      `plave-project004-dev-clean`.
- [ ] `SITE_URL=PASS`: Site URL is `http://localhost:3001`.
- [ ] `REDIRECT_LOCALHOST=PASS`: Redirect URLs allow
      `http://localhost:3001/auth/confirm`.
- [ ] `REDIRECT_LOOPBACK_ALIAS=PASS`: if the Owner will browse by IP, also
      allow `http://127.0.0.1:3001/auth/confirm`; otherwise always use
      `localhost`.
- [ ] `EMAIL_PASSWORD_PROVIDER=PASS`: email/password sign-in is enabled.
- [ ] `EMAIL_CONFIRMATION=PASS`: email confirmation remains enabled. The
      registration UI and login error contract explicitly handle the
      unconfirmed state.
- [ ] `PUBLIC_KEY_ONLY=PASS`: only the publishable/anon key is configured.
- [ ] `SERVICE_ROLE_ABSENT=PASS`: no service-role key is in any
      `NEXT_PUBLIC_` or runtime variable.
- [ ] `LOCAL_ORIGIN_CONTRACT=PASS`: browser navigation, callbacks, and cookies
      all use the same `localhost:3001` origin. Server actions enforce
      same-origin requests while treating loopback aliases as equivalent only
      in development.

## Exactly three cloud test accounts

Use three distinct Owner-controlled test mailboxes. Passwords stay only in the
Owner's password manager/browser and are never written to a repository,
terminal log, or acceptance report. Create accounts through `/register` so the
Auth trigger and profile creation are tested.

### Student

- [ ] `STUDENT_REGISTER=PASS`: choose Student and Grade 1, submit once.
- [ ] `STUDENT_EMAIL_CONFIRM=PASS`: confirm using the same localhost callback.
- [ ] `STUDENT_LOGIN=PASS`.
- [ ] `STUDENT_PROFILE_ROLE=PASS`: onboarding/profile identifies Student.
- [ ] `STUDENT_GRADE_1=PASS`: dashboard and learning navigation remain Grade 1.
- [ ] `STUDENT_GRADE_2_PILOT_HIDDEN=PASS`.

### Parent

- [ ] `PARENT_REGISTER=PASS`: choose Parent and submit once.
- [ ] `PARENT_EMAIL_CONFIRM=PASS`.
- [ ] `PARENT_LOGIN=PASS`.
- [ ] `PARENT_PROFILE_ROLE=PASS`: onboarding/profile identifies Parent.

### Teacher

Teacher registration is invitation-gated by migration 0012. The clean
provisioning transaction does not create invitation rows, and this runtime
connection approval does not authorize an admin/database invitation mutation.
Do not use a fabricated code and do not bypass the gate.

- [ ] `TEACHER_INVITATION_PRECONDITION=PASS`: a valid invitation exists only
      after a separate, explicit guarded invitation operation is approved.
- [ ] `TEACHER_REGISTER=PASS`: register through the UI with that code.
- [ ] `TEACHER_EMAIL_CONFIRM=PASS`.
- [ ] `TEACHER_LOGIN=PASS`.
- [ ] `TEACHER_PROFILE_ROLE=PASS`: invitation activation creates the correct
      Teacher profile and completes onboarding.

Until the invitation precondition exists, mark Teacher steps `NOT_RUN`; do not
misreport them as PASS. Account creation is the only remote mutation permitted
by this acceptance workflow.

## Runtime acceptance record

Run this account/browser record only after the separate universal activation
preflight and one-time activation have passed.

- [ ] `STUDENT_CLOUD_ACCOUNT=PASS`
- [ ] `PARENT_CLOUD_ACCOUNT=PASS`
- [ ] `TEACHER_CLOUD_ACCOUNT=PASS`
- [ ] `PROFILE_ROLE_ROWS=PASS`
- [ ] `GRADE_1_VISIBLE=PASS`
- [ ] `UNIVERSAL_RELEASE=ACTIVE/ACTIVE`
- [ ] `CURRICULUM_RUNTIME=true`
- [ ] `GRADE2_CONTROLLED_ADAPTIVE_PILOT=DISABLED`
- [ ] `GRADE2_PILOT_HIDDEN_AND_DENIED=PASS`
- [ ] `REMOTE_DEV_ACTIVATION=PASS`
- [ ] `PUBLICATION_PERFORMED=NO`
- [ ] `MIGRATION_OR_SEED_PERFORMED=NO`
- [ ] `DEPLOYMENT_PERFORMED=NO`

If any account or role step fails, record only its marker, route, safe error
code/correlation ID, and visible symptom. Do not record identity or secret
data. Keep remote runtime acceptance `NOT_READY` until all three roles pass.
