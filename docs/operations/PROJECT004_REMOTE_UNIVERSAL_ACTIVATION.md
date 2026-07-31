# PROJECT004 clean remote universal activation

Status: `REMOTE_TRANSACTION_PARITY_FIXED_ONE_TIME_RETRY_APPROVED`

This package can activate fixed curriculum practice only on the exact
development target `plave-project004-dev-clean`. It rejects the retired target,
PROJECT003, and production-like names. Preparation performed no remote access
or remote mutation.

## Runtime cause and learning lanes

The remote database is provisioned but intentionally holds the universal
release in `DRAFT/INACTIVE`. The remote application profile also previously
pinned `PLAVE_CURRICULUM_RUNTIME_ENABLED=false`. Those two independent gates
caused Grades 2–9 to fall back to the empty legacy catalog and show that
content was being prepared.

The activation package now uses these explicit lanes:

- Grade 1 keeps the existing legacy fixed-practice tables and RPCs. This
  preserves existing history and the verified Grade 1 compatibility contract.
- Grades 2–9 use the release-bound universal catalog, lesson and fixed-practice
  RPCs.
- Every catalog lookup is filtered by the authenticated Student's stored
  school grade. No operation changes `schoolGrade`.
- On-demand generation, adaptive practice, Grade 2 Numbers to 1000, the
  controlled pilot, retention runtime, and the pilot allowlist remain disabled.
- Parent, Teacher and anonymous callers keep their existing access boundaries.
  Private solutions are unavailable before submit.

The dashboard and `/learn` now observe the universal runtime flag. The
on-demand CTA is rendered only when its separate server runtime contract is
enabled, so universal fixed practice does not expose the disabled Grade 2
pilot.

## Pinned activation contract

The read-only preflight and atomic transaction pin:

- migrations `0001`–`0040`, exactly 40 canonical versions;
- schema semantic fingerprint
  `d81cbaa38b586207eb843d9c73356901aff257505086b7a4029d02fdc5e0e34c`;
- clean disposable proof fingerprint
  `b84f19f47ff0e2fc6b2ca262d34e3d0eee2c8f595265b6d217541d66ce32dd50`;
- release `plave-math-grades-1-9-v1`;
- content version `2026.07.30-draft.1`;
- generator `vertical-preview-v1`;
- deterministic seed `plave-curriculum-preview-v1`;
- mastery policy `product-hypothesis-v1`;
- source fingerprint
  `f35d34ff84da2ca3f9ab72d5d67482ada414684b611deea98c4b329801b661ab`;
- public/private/bundle hashes from the checked release manifest;
- bank counts `171/2052/2052/546`;
- legacy counts `14/336/336/24`;
- exact starting state `DRAFT/INACTIVE`;
- zero curriculum attempt/answer/progress history before first activation;
- Grade 2 adaptive release present only in its exact disabled, hidden draft
  state;
- RLS and private-solution grant boundaries.

Any drift stops before mutation. The activation transaction takes a scoped
advisory lock, repeats the full contract check inside the transaction, changes
only the universal release to `ACTIVE/ACTIVE`, verifies the post-state, and
commits once. It does not insert users, attempts, answers, history, curriculum
content, or migration rows.

## Failed attempt and transaction parity repair

The first Owner-approved attempt was consumed and failed closed. Its subsequent
read-only preflight verified the exact universal release remained
`DRAFT/INACTIVE`, the bank remained `171/2052/2052/546`, activation remained
eligible, and the Grade 2 adaptive pilot remained disabled.

The static parity audit found that the disposable proof transported the
multi-statement activation script through `psql` standard input, while the
remote executor put the same script after `--command`. That remote form was
incompatible with the script's leading `\set` command and transaction body. It
also omitted verbose SQLSTATE output and parsed only stdout.

Both production paths now build one canonical stdin invocation with identical
`psql` flags and use one response parser over stdout and stderr. Failure output
includes sanitized SQLSTATE, stage, statement class, stable precondition ID,
and rollback verification. The prior output concatenation between
`ACTIVATION_ELIGIBLE` and `ACTIVATION_ATTEMPTS` is also fixed.

The Owner has now approved one retry. The source lock is open only for that
single attempt on the exact clean development target; a later invocation is
again fail-closed.

When separately re-authorized, the command requires the already isolated
`0600` remote-development runtime
profile and verifies that its target matches the securely prompted project
reference before any remote access. The project reference and database password
are read from `/dev/tty` with echo disabled, retained only in process memory,
and never put in argv or output.

That operation reruns the full read-only preflight, selects the canonical
TLS endpoint, performs at most one atomic activation transaction, runs the
post-activation verification, and enables universal fixed curriculum in the
isolated local runtime profile. A second invocation fails closed because the
required starting state is no longer `DRAFT/INACTIVE`.

The future command does not run migrations, create identities or learning history,
enable adaptive/on-demand flags, publish to production, or deploy. Next must be
started or restarted separately after a successful activation for the updated
server-side runtime flag to be observed.

No production publication or deployment is part of this sequence.

## Deactivation and resume policy

Deactivation is separately source-locked and requires its own explicit Owner
approval. It changes only the exact active universal release back to
`DRAFT/INACTIVE`, verifies attempt/answer/progress counts are unchanged, and
sets the isolated local runtime profile to false when that profile exists.

The database contract is deliberate:

- a bound `IN_PROGRESS` attempt may still resume and submit after
  deactivation;
- a new attempt cannot start while the release is inactive;
- no account, attempt, answer, progress row, release bank row, or history row
  is deleted.

The disposable proof exercises this ordering directly. A runtime restart is
required after changing the isolated environment file because Next reads
server flags at process start.
