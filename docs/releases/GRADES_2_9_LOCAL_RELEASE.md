# Grades 2–9 local release integration

This integration materializes the frozen combined A–K Grades 2–9 inventory in
the local database. It does not publish or activate a remote environment.
Grade 1 continues to use its unchanged fixed runtime.

## Release modes

- `HIDDEN` is the default: no catalog entry and no new start.
- `PILOT` requires the existing exact server-side user, grade, candidate,
  version, hash and policy entitlement.
- `PUBLIC` removes only the UUID allowlist requirement. It still requires an
  authenticated Student, the Student's server-derived grade, the exact active
  candidate tuple, and both application and database flags.

The application setting is server-only:

```text
PLAVE_GRADES_2_9_RELEASE_MODE=PUBLIC
PLAVE_CURRICULUM_RUNTIME_ENABLED=true
```

Do not prefix either setting with `NEXT_PUBLIC_`.

## Owner-authorized local activation

Prepare a disposable loopback PostgreSQL database with migrations 0001–0044,
then explicitly provide its local connection only to the guarded command:

```bash
PLAVE_LOCAL_DATABASE_CLASSIFICATION=DISPOSABLE_LOCAL \
PLAVE_LOCAL_DATABASE_URL='postgresql://LOCAL_USER:LOCAL_PASSWORD@127.0.0.1/LOCAL_DATABASE' \
npm run local:grades-1-9
```

The command installs migration 0045 when needed and atomically activates the
eight local release tuples. It rejects non-loopback and unclassified targets,
does not install packages, and prints no connection credential or user identity.

Deactivate new starts without deleting content or history:

```bash
PLAVE_LOCAL_DATABASE_CLASSIFICATION=DISPOSABLE_LOCAL \
PLAVE_LOCAL_DATABASE_URL='postgresql://LOCAL_USER:LOCAL_PASSWORD@127.0.0.1/LOCAL_DATABASE' \
npm run local:grades-1-9:deactivate
```

Use `npm run local:grades-1-9:diagnostic` for the sanitized read-only counts.

## Product truth

The database contains 2,460 Grades 2–9 questions, 287 question-bearing skills
and 163 canonical units. Only 128 units have an eligible question pool and are
shown in the learning catalog; the other 35 source units remain stored but fail
closed instead of creating a dead end. Of the question-bearing skills, 274 use
the adaptive path and 13 use fixed-safe practice without an adaptive-mastery
claim. Public mode creates no default entitlement and does not change a
Student's `schoolGrade`.
