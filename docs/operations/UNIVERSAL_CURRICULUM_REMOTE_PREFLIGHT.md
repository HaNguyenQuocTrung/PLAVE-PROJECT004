# Universal Curriculum Remote Migration and Activation Preflight

**Current authorization:** none
**Current remote state:** `REMOTE_NOT_APPLIED`
**Current content state:** `CONTENT_NOT_ACTIVATED`

This document is a checklist, not authority to run remote SQL.

## Separate approvals required

1. Migration 0038 schema apply.
2. Post-apply read-only diagnostics.
3. Release materialization.
4. Post-materialization checksum/count diagnostics.
5. Release activation.
6. Application flag enablement.
7. Live synthetic Student smoke.

Each step requires a separate Owner decision and a recorded exact checksum.

## Required evidence before requesting approval

- Disposable local database integration PASS for Grades 1–9.
- Grade 1 18/340 fixture unchanged and Grade 1 550 regression PASS.
- Parent/Teacher regressions PASS.
- Full sequential suite, lint, typecheck and production build PASS.
- Private solution/direct mutation/anon/role/cross-user denial PASS in
  PostgreSQL.
- Migration 0035–0037 checksums unchanged.
- Migration 0038 exact checksum recorded.
- Release manifest exact bundle checksum recorded.
- Deactivation and forward recovery rehearsal PASS locally.
- No service-role application code and no client solution payload.

## Fail-closed states

- Application flag false/unset/malformed.
- Release `DRAFT/INACTIVE`.
- No release rows.
- Student grade does not match unit grade.
- Grade 1 attempts sent to universal RPC.
- Parent, Teacher or anonymous caller.
- Revision mismatch or duplicate submission mismatch.

## Post-apply checks

If a future approval exists, diagnostics must confirm:

- all new tables have RLS and FORCE RLS;
- browser roles have no direct authoritative mutation;
- browser roles cannot read the private solution table;
- five public RPCs are authenticated-only, `SECURITY DEFINER`, empty
  `search_path`;
- zero release/attempt/answer/progress rows immediately after schema apply;
- Grade 1 tables and exact history counts unchanged;
- adaptive/Grade 2 pilot flags remain false and hidden.

Do not combine schema application, materialization and activation into one
unreviewed operation.

Current local-draft migration 0038 SHA-256:
`9eee72dbdb6f3a8115fa6e92e73092b178b34d2dd6514ce3b307ba65f55bea8f`.
