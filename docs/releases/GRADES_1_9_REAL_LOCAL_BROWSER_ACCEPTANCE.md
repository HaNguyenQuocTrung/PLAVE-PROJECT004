# Grades 1–9 real local browser acceptance

This runbook proves the local PLAVE learning journey with an installed Chrome/Chromium browser, a production Next.js server, real HTTP APIs and a disposable PostgreSQL/Supabase-compatible stack. It does not publish, activate or contact any remote environment.

## macOS prerequisites

- Run from the repository root on `fix/fyp-product-truth`.
- Use Node and the already-installed `node_modules`; do not install or update packages.
- Have Google Chrome, Chromium or Microsoft Edge already installed. Override discovery only when necessary with `PLAVE_LOCAL_BROWSER_EXECUTABLE=/absolute/path/to/executable`.
- Have Docker Desktop running with these images already present locally: Supabase PostgreSQL `17.6.1.143`, GoTrue `v2.193.0`, PostgREST `v14.15` and Kong `2.8.1`.
- Do not load `.env.local`. The harness creates synthetic local configuration and identities at runtime.

## Browser prerequisite smoke test

```bash
npm_config_offline=true npm run --silent smoke:local-installed-browser
```

The smoke command uses a new profile below `/private/tmp`, `--use-mock-keychain`, `--password-store=basic`, a dynamic loopback HTTP port and external-host DNS denial. It must report launch, navigation, JavaScript, screenshot, console and network PASS. If macOS shows a Keychain prompt, terminate the process and do not retry until the executable/profile flags are reconciled.

## Real browser acceptance

```bash
npm_config_offline=true npm run --silent acceptance:real-local-browser
```

The command performs the following without a test-only authentication bypass:

1. Creates an isolated Docker network and PostgreSQL database.
2. Bootstraps local auth, quiesces GoTrue, and applies canonical migrations `0001–0045`.
3. Confirms Grades 2–9 are HIDDEN by default, then activates PUBLIC only inside the disposable database.
4. Builds the exact working tree in a sanitized disposable workspace with the installed Next.js/Webpack executable.
5. Starts the production app on an operating-system-selected loopback port other than 3000.
6. Creates synthetic Students for Grades 1–9, a wrong-grade Student, approved/unapproved Parents and authorized/unauthorized Teachers through the real local authentication/API paths.
7. Drives installed Chrome through login, catalog, lesson, start, wrong/correct submit, feedback, progress, history, refresh/resume and logout/login persistence.
8. Verifies all 13 fixed-safe skills, role/user/grade isolation, mobile layout, keyboard/focus/labels, deactivation/reactivation and database preservation.
9. Closes Chrome and the app, then removes every created container, network, temporary profile, synthetic configuration and build output.

Synthetic passwords and session tokens are generated in memory for one run and are never printed or written into tracked documentation. The automated run intentionally does not leave an interactive account or server behind. For a manual local product demonstration, use the documented local release profile in `docs/releases/GRADES_2_9_LOCAL_RELEASE.md` and provide synthetic credentials at runtime; never reuse these acceptance identities.

## Evidence and expected output

The terminal must include:

- `BROWSER_UI_GRADE_1=PASS` through `BROWSER_UI_GRADE_9=PASS`;
- exactly thirteen `BROWSER_FIXED_SAFE_SKILL=... PASS` lines;
- `BROWSER_CONSOLE_HYDRATION_NETWORK=PASS`;
- `PLAVE_BROWSER_GRADES_1_9_ACCEPTANCE=PASS`.

Sanitized visual evidence is stored in `docs/e2e/real-local-screenshots/`. The images contain no session token, credential or real identity. Solutions appear only in post-submit feedback screenshots.

## Safety and cleanup checks

After the command exits, verify only resources created by this run:

```bash
docker ps -a --format '{{.Names}}' | grep '^plave-browser-e2e-' || true
docker network ls --format '{{.Name}}' | grep '^plave-browser-e2e-' || true
find /private/tmp -maxdepth 1 -type d -name 'plave-local-chrome-*' -print
```

All three commands must produce no matching resource. Do not use `docker system prune`, repository clean/reset commands, package download commands, `npx`, port 3000, or any macOS Keychain command.

## Scope truth

- Grade 1 remains on the immutable fixed runtime.
- Grades 2–9 use the database-backed local PUBLIC release contract and never require pilot UUID entitlement in this profile.
- The 13 fixed-safe skills provide feedback and same-grade continuation without an adaptive-mastery claim.
- Remote release, publication, deployment, merge, tag and push are outside this runbook.
