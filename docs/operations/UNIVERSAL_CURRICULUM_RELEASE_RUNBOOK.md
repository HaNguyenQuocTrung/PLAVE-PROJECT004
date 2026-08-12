# Universal Curriculum Local Release Runbook

> **HISTORICAL / SUPERSEDED:** This pre-0045 local release runbook is preserved
> for audit history. Use `docs/releases/GRADES_2_9_LOCAL_RELEASE.md` for the
> canonical current local release procedure and
> `docs/final/PLAVE_GRADES_1_9_LOCAL_ACCEPTANCE.md` for current status.

## Safety boundary

This runbook is for a **disposable loopback PostgreSQL/Supabase database only**.
Do not use a remote URL. Do not apply migration 0038 or activate content
remotely without separate Owner authorization.

Current repository state:

- migration 0038: local draft, not applied remotely;
- manifest: 171 units / 2,052 questions / 2,052 private solutions;
- application flag: default false;
- content activation: none;
- live Student verification: none.

## Release identity

- Release ID: `plave-math-grades-1-9-v1`
- Content version: `2026.07.30-draft.1`
- Source fingerprint:
  `f35d34ff84da2ca3f9ab72d5d67482ada414684b611deea98c4b329801b661ab`
- Generator: `vertical-preview-v1`
- Seed: `plave-curriculum-preview-v1`
- Mastery policy: `product-hypothesis-v1`
- Bundle SHA-256:
  `3d5b1a60e4cbb30ea89b6a2018b4c70c49808aa18d584f623bf4bb93931696f4`

## Validate before database work

```bash
npm run validate:universal-curriculum-release
npm run test:universal-curriculum
```

Expected: `171 / 2052 / 2052`, manifest match and all targeted tests PASS.

## Disposable database sequence

1. Create a new empty loopback database.
2. Apply migrations `0001` through `0038` exactly once, in filename order.
3. Load `tests/fixtures/0035-remote-history-baseline.sql`.
4. Materialize and locally activate the release:

```bash
PLAVE_LOCAL_DATABASE_URL='postgresql://...@127.0.0.1:54322/...' \
PLAVE_LOCAL_CURRICULUM_ACTIVATE=true \
npm run materialize:universal-curriculum-local
```

The script rejects non-loopback hosts, never prints the URL and removes its
temporary SQL file.

5. Run the transactional journey/authorization operation:

```bash
psql "$PLAVE_LOCAL_DATABASE_URL" \
  --no-psqlrc \
  --set ON_ERROR_STOP=1 \
  --file supabase/operations/verify_0038_universal_curriculum_local.sql
```

Expected final line:

```text
Universal curriculum disposable DB integration: PASS
```

The operation tests a complete unit for synthetic Students Grades 1–9, wrong
and correct feedback, solution timing, resume, idempotency, CAS conflict,
completion, progress, history, legacy 18/340 preservation, ownership, role
denial and direct privilege denial. It rolls back all journey fixtures.

6. Start the application with:

```bash
PLAVE_CURRICULUM_RUNTIME_ENABLED=true npm run dev
```

7. Use only synthetic local accounts. Verify `/dashboard`, `/learn`,
   `/learning-progress`, `/learning-history` and one persistent unit per grade.

## Deactivation

First set `PLAVE_CURRICULUM_RUNTIME_ENABLED=false` and restart the application.
Then, on the disposable local database only:

```bash
psql "$PLAVE_LOCAL_DATABASE_URL" \
  --no-psqlrc \
  --set ON_ERROR_STOP=1 \
  --file supabase/operations/deactivate_0038_universal_curriculum_local.sql
```

This restores the checked `DRAFT/INACTIVE` state and prevents new attempts.
Existing release-bound attempts remain reproducible. For a disposable local
test, destroy the entire database/container after evidence collection.

## Rollback plan

- Before any remote release: no rollback is needed because remote state is
  untouched.
- During local testing: disable the server flag, restore the local release to
  `DRAFT/INACTIVE` and destroy the disposable database.
- After a future approved remote schema apply but before content activation:
  leave the empty schema in place and keep the flag false.
- After a future content activation: use a reviewed forward deactivation that
  retains release rows required by in-progress attempts. Do not drop bound
  content or rewrite Grade 1 history.
