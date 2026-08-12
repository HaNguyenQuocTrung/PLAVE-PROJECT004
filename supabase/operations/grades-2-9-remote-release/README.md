# Canonical Grades 2–9 remote release operations

These post-0045 operations are for the canonical project
`vvseikavrfhjchyrcgqi` only. The SQL does not identify the remote target; the
operator must verify the Session Pooler target independently and must retain a
verified post-0045/pre-activation backup before running `ACTIVATE_PUBLIC.sql`.

`DIAGNOSTIC_READONLY.sql` is scalar/read-only. `ACTIVATE_PUBLIC.sql` locks and
checks the eight frozen candidate tuples, inventory, Grade 1 boundary, zero
default entitlements, unpublished legacy Grades 2–9 content and history counts
before atomically enabling only the release catalog/runtime contract.
`DEACTIVATE.sql` is the separately authorized rollback operation: it blocks new
starts and catalog discovery without deleting content, attempts, answers,
progress or history. Existing in-progress attempts retain the migration 0045
resume/read contract.

The application deployment is a separate gate and must set the server-only
values `PLAVE_GRADES_2_9_RELEASE_MODE=PUBLIC` and
`PLAVE_CURRICULUM_RUNTIME_ENABLED=true`. Never expose release mode through a
`NEXT_PUBLIC_*` variable. Do not use the historical pre-0045 universal
activation scripts for this release.
