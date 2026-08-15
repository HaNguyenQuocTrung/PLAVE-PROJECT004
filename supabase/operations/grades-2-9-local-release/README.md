# Grades 2–9 local release operations

These operations are local/disposable only. Migration 0045 installs the frozen
A–K database content in `HIDDEN` mode. `ACTIVATE_PUBLIC.sql` atomically validates
and activates the eight exact candidate tuples without creating an entitlement
or user/history row. `DEACTIVATE.sql` blocks new starts and catalog visibility
while retaining content, attempts, answers, progress, and history.

Use the guarded repository commands rather than invoking these files against an
unclassified target:

```bash
PLAVE_LOCAL_DATABASE_CLASSIFICATION=DISPOSABLE_LOCAL \
PLAVE_LOCAL_DATABASE_URL='postgresql://…@127.0.0.1/…' \
npm run local:grades-1-9

PLAVE_LOCAL_DATABASE_CLASSIFICATION=DISPOSABLE_LOCAL \
PLAVE_LOCAL_DATABASE_URL='postgresql://…@127.0.0.1/…' \
npm run local:grades-1-9:deactivate
```

The application process must separately use the server-only profile
`PLAVE_GRADES_2_9_RELEASE_MODE=PUBLIC` and
`PLAVE_CURRICULUM_RUNTIME_ENABLED=true`. Defaults remain hidden and disabled.
