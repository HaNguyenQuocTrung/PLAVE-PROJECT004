# PROJECT004 clean remote development provisioning

Status: `CLEAN_REMOTE_PROVISIONED_DRAFT_INACTIVE`

The only operational target is `plave-project004-dev-clean` with environment
classification `EMPTY_DEVELOPMENT`. Every other target fails closed,
including the retired partial target, the frozen predecessor project, and
production-like names.

The Owner reports that the one approved clean apply completed with migrations
`40/40`, release bank `171/2052/2052/546`, release `DRAFT/INACTIVE`, runtime
false, Grade 2 pilot disabled, and zero Auth users. The one-time apply approval
is consumed. No further schema/content apply, activation, publication, seed,
deployment, reset, pull, migration repair, or retry is authorized.

## Pinned local proof

The clean disposable proof receipt is
[`PROJECT004_CLEAN_REMOTE_DISPOSABLE_PROOF_RECEIPT.json`](./PROJECT004_CLEAN_REMOTE_DISPOSABLE_PROOF_RECEIPT.json).
Preflight and apply both load the same receipt and require:

- migrations `0001–0040`, exactly `40/40`;
- schema semantic fingerprint
  `d81cbaa38b586207eb843d9c73356901aff257505086b7a4029d02fdc5e0e34c`;
- disposable proof fingerprint
  `b84f19f47ff0e2fc6b2ca262d34e3d0eee2c8f595265b6d217541d66ce32dd50`;
- schema/RLS/private boundary PASS;
- atomic content transaction PASS at `171/2052/2052/546`;
- release `DRAFT/INACTIVE`;
- curriculum runtime false and Grade 2 pilot disabled;
- zero Auth, Storage, and synthetic users;
- cleanup PASS and no remote access or mutation during the proof.

The 40 migration checksums remain pinned by
[`PROJECT004_REMOTE_DEV_MIGRATION_PLAN.json`](./PROJECT004_REMOTE_DEV_MIGRATION_PLAN.json).
Receipt or checksum drift stops before remote access.

## Secret handling

The runner reads the project reference and database password directly from
the controlling terminal `/dev/tty`. Terminal echo is disabled and restored
in `finally`. Values remain in process memory and are never printed, placed
in argv, stored in repository files, copied into `.env.local`, or written to
logs or shell history.

CLI authentication remains in the Owner-controlled native Supabase CLI
credential store. The wrapper does not copy or print the access token.
Ephemeral project-ref and passwordless pooler metadata use mode-0600 FIFO
channels and are removed in `finally`; persistent link metadata is not
retained. The database password stays in child-process memory/environment and
is never embedded in the pooler URL.

## Completed connectivity diagnostic

The diagnostic verifies canonical local checks and the exact clean target,
then checks that the project is active. It attempts the TLS-required direct
database endpoint first. Only a direct DNS/IPv6-network failure permits one
TLS-required IPv4 session-pooler fallback. A successful endpoint runs only a
read-only transaction containing `SELECT 1`, then rolls it back.

It prints only endpoint mode, PASS/FAIL/NOT_RUN states, and a safe root
failure category. It suppresses the project reference, database hostname,
password, token, URL, and identity. It never creates persistent link
metadata and never calls empty-state inspection or dry-run.

Owner evidence for the clean target is:

```text
REMOTE_IDENTITY_GUARD=PASS
PROJECT_ACTIVE=PASS
ENDPOINT_MODE=POOLER_SESSION
DIRECT_CONNECTIVITY=FAIL
DIRECT_FAILURE_CODE=DNS_RESOLUTION_FAILED
POOLER_FALLBACK=PASS
TLS_REQUIRED=PASS
READ_ONLY_SELECT_1=PASS
EMPTY_STATE_INSPECTION=NOT_RUN
DRY_RUN=NOT_RUN
UNEXPECTED_OPERATION_COUNT=0
REMOTE_MUTATION_PERFORMED=NO
ROOT_FAILURE_CODE=NONE
PROJECT004_REMOTE_CONNECTIVITY_DIAGNOSTIC=PASS
```

## Fresh remote preflight

The preflight checks, in fail-closed order:

1. canonical PROJECT004 cwd/package identity;
2. exact 40 pinned migration checksums;
3. exact pinned clean disposable proof receipt;
4. exact target name and `EMPTY_DEVELOPMENT` classification;
5. local database and Owner runtime isolation;
6. native Supabase CLI authentication;
7. remote project identity;
8. canonical connectivity resolution (direct TLS first; only DNS/IPv6
   failure permits the IPv4 session-pooler fallback);
9. read-only fresh Supabase baseline classification through that exact
   resolved endpoint.

`EMPTY_DEVELOPMENT` permits only the exact Supabase-managed platform
baseline. It requires all of these application-state counts to be zero:

- PLAVE application objects;
- foreign application objects;
- Auth users;
- Storage objects;
- migration-history rows.

The Automatic RLS/Data API helper is platform baseline only when its exact
catalog provenance matches the pinned classifier. A same-named or similar
foreign object remains foreign and blocks the operation.

Only aggregate PASS/FAIL/count output is printed. Project reference, URL,
host, password, keys, token, role identity, and object definitions are
suppressed.

## Guarded dry-run

After preflight PASS, the wrapper runs exactly:

```text
supabase db push --dry-run
```

The Supabase CLI 2.110.0 parser combines stdout and stderr, removes ANSI/OSC
styling and carriage-progress frames, then requires exit zero, the canonical
dry-run opening/finished signatures, and exactly one `Would push these
migrations:` section. That section must contain exactly the 40 canonical
migration filenames in numeric order, with first/last `0001/0040`, backed by
the pinned migration-plan checksum contract. Missing, duplicate, reordered,
or foreign migrations fail. Empty/unrecognized output, seed, reset, pull,
repair, destructive database/schema operations, and unexpected
migration-history operations fail. Parser failures print only aggregate
subconditions, never raw CLI output.

The audited command gate permits one project-list identity check, read-only
PostgreSQL catalog transactions, and exactly one dry-run. It rejects every
schema push without `--dry-run` and every mutating SQL command.

The resolved endpoint object is immutable for the operation. Empty-state
inspection and the Supabase CLI dry-run use the same direct or session-pooler
mode with TLS required. Future apply reuses the same contract for its
precondition recheck, schema push, content transaction, and post-apply
diagnostic.

The strict dry-run remains a mandatory same-operation precondition. Its
expected evidence is:

```text
PROJECT004_CANONICAL=PASS
REMOTE_IDENTITY_GUARD=PASS
EMPTY_REMOTE_STATE=PASS
LOCAL_MIGRATION_CHECKSUMS=PASS
CLEAN_DISPOSABLE_PROOF=PASS
REMOTE_DATABASE_ENDPOINT_MODE=POOLER_SESSION
DRY_RUN_MIGRATION_COUNT=40
DRY_RUN_FIRST_LAST_MIGRATION=0001/0040
DESTRUCTIVE_OR_UNEXPECTED_OPERATION_COUNT=0
LOCAL_RUNTIME_UNCHANGED=PASS
REMOTE_MUTATION_PERFORMED=NO
ROOT_FAILURE_CODE=NONE
PROJECT004_REMOTE_DEV_DRY_RUN=PASS
```

## Consumed apply record — do not rerun

Historical approval marker:

```text
OWNER_APPROVES_PROJECT004_CLEAN_REMOTE_APPLY=YES
```

That approval was consumed by the successful provisioning reported above.
The apply entrypoint now fails closed before prompting or remote access.
Its completed contract was:

- one schema push for canonical `0001–0040`;
- one atomic repository-source content transaction;
- release `DRAFT/INACTIVE`;
- runtime and pilot disabled;
- no users, history, activation, publication, or deployment;
- no reset, pull, repair, seed, or automatic retry.

## Archived incident

The earlier partial remote incident is `DELETED_PARTIAL_REMOTE` and
non-operational. Its historical audit documents remain historical evidence
only. They are not valid target metadata, proof input, fallback state, link
metadata, or authorization for this clean replacement package.
