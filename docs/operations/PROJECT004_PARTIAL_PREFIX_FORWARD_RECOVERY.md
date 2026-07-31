# PROJECT004 partial-prefix forward recovery

Status: `UNVERIFIED_BLOCKED_NO_RECOVERY_MUTATION_AUTHORIZED`

The read-only remote incident evidence shows a contiguous canonical migration
version prefix from 0001 through 0038, 189 expected and observed canonical
objects, no missing canonical object, no user/storage/synthetic data, and
intact RLS/private boundaries. It also shows one extra object, no remote
checksum metadata, and no canonical catalog-semantic comparison.

`CURRENT_RUN_MUTATION_PERFORMED=NO` applies only to the incident audit
invocation. `PREEXISTING_REMOTE_APPLICATION_STATE=YES` records the 38
migration rows and PLAVE schema that existed before that invocation. The
historical writer remains unattributed.

## Semantic fingerprint contract

The source-pinned manifest is
[`PROJECT004_PREFIX_0038_SEMANTIC_FINGERPRINT.json`](./PROJECT004_PREFIX_0038_SEMANTIC_FINGERPRINT.json).
It pins the checksum-verified repository migrations 0001–0038, but its
canonical catalog status remains `UNVERIFIED`.

The catalog fingerprint contract normalizes and hashes these categories
without returning SQL definitions, object identifiers, role identities, or
credentials:

- schemas and table properties;
- column position, name, type, default, generated/identity state and
  nullability;
- primary, foreign, unique and check constraints;
- indexes;
- function signatures, return types, languages, volatility,
  definer/invoker state, strictness, parallel/leakproof state, search path and
  normalized body hash;
- triggers;
- RLS enabled/forced state, policy roles/commands/predicates;
- normalized schema/table/function grants;
- `pgcrypto` version/schema and direct extension dependencies.

The canonical catalog values may be captured only from a disposable,
Supabase-compatible loopback database created fresh and populated by the
checksum-pinned migrations 0001–0038. Remote observations may never populate
or update the canonical manifest. The guarded local integration source is
`scripts/run-project004-prefix-fresh-local-integration.ts`; it rejects the
Owner port, a non-loopback host, and a database name outside its disposable
prefix. It is intentionally not exposed through an npm command and was not
executed in this no-mutation preparation.

## Extra-object rule

The extra object is platform baseline only when a read-only catalog
inspection proves all of the following for exactly one object:

- routine on the public application surface;
- public standard name `rls_auto_enable()`;
- platform-superuser owner category;
- event-trigger return type, PL/pgSQL, security definer and catalog-only
  search path;
- exactly one active matching `ddl_command_end` event trigger;
- zero extension dependency;
- no conflict with migrations 0001–0040.

This is a provenance-specific classifier, not a schema/name wildcard. Any
missing or different evidence remains `FOREIGN_OR_UNVERIFIED`.

## Forward-only wrapper

The forward wrapper is prepared but not exposed as an npm mutation command.
It fails locally before prompting while the canonical manifest or fresh local
0039/0040 integration remains unverified.

Even after a future review updates those gates, it additionally requires an
explicit approval flag and a same-operation read-only revalidation. The
audited sequence is:

1. exact PROJECT004 identity and credential context;
2. incident prefix, semantic fingerprint, extra-object provenance, data and
   0039/0040 preconditions;
3. a dry-run that contains exactly 0039 then 0040 and no other migration or
   seed;
4. the same read-only preflight again;
5. exactly one schema push;
6. exactly one atomic canonical content transaction;
7. read-only post-apply diagnostics for 40 migrations, 171/2052/2052/546,
   DRAFT/INACTIVE, runtime false, pilot disabled and zero users/storage.

Reset, repair, pull, seed, retry, activation, publication, deployment and user
creation are rejected.

## Current decision

Forward recovery cannot be authorized yet because:

- the extra-object provenance was not included in the supplied incident
  evidence;
- a canonical 0001–0038 catalog-semantic fingerprint has not been produced
  from a disposable fresh local database;
- remote-to-canonical category hashes therefore have not been compared;
- migrations 0039 and 0040 have static contract evidence, but a fresh
  disposable-prefix apply of both has not been run in this preparation.

Because the remote has zero Auth users, Storage objects and synthetic data,
discarding and recreating this development remote is safer than relaxing any
of these gates. Deletion or recreation is an Owner decision and is not
authorized by this document.
