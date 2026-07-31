# Sprint 6V.4 — One-Student Generated Practice Pilot

Status: `READY_FOR_OWNER_CONTROLLED_RUN`

This package does not enable generated practice by default and was prepared without remote access. The normal remote-development runtime remains `OFF`; the Grade 2 adaptive pilot remains disabled.

## Safety contract

- Exact target: `plave-project004-dev-clean`.
- Exact bind: `127.0.0.1:3002`.
- Mode: `PILOT_LIVE`, available only through the dedicated launcher.
- Allowlist: one valid, deduplicated Student UUID in the gitignored mode-0600 file `.env.generated-pilot.local`.
- Any malformed UUID, more than one UUID, wrong role, wrong grade, wrong target, non-loopback bind, missing Owner-start session, migration/release drift, or incomplete provenance fails closed.
- `PLAVE_ADAPTIVE_PILOT_USER_IDS` is never reused. All Grade 2 adaptive flags stay false.
- The browser sends only an idempotency key. Seed and provenance are derived and verified on the server.
- The start transaction persists the public snapshot, private solution and semantic provenance together. Resume reads the stored snapshot.
- The launcher installs one ephemeral private signing secret through SQL stdin after preflight and removes that exact secret on shutdown. It does not place credentials or secrets in argv or logs.
- The local-only acceptance route and health route return 404 unless their full loopback/runtime guards pass. Neither appears in Student navigation.

## Owner runbook

1. In the Supabase Dashboard for the exact clean development project, open **Authentication → Users**. Locate the dedicated test Student already verified through the PLAVE UI and copy its UUID locally. Do not paste it into chat or a repository document.
2. From PROJECT004, run `npm run --silent remote-dev:generated-pilot-configure`. Paste the UUID into the masked `/dev/tty` prompt and press Enter. Success must print `GENERATED_PILOT_ALLOWLIST_COUNT=1` and `GENERATED_PILOT_ALLOWLIST_FILE_MODE=0600`, never the UUID.
3. Run `npm run --silent remote-dev:generated-pilot-start`. Enter the clean project reference and database password only in the masked `/dev/tty` prompts. Keep the terminal open. Continue only after `GENERATED_PILOT_HEALTH=PASS` and `GENERATED_PILOT_START=READY`.
4. Open `http://127.0.0.1:3002`, sign in as that exact Student, and perform the checklist below.
5. Press Ctrl+C once in the launcher terminal. Wait for `GENERATED_PILOT_MODE_AFTER=OFF`, `GENERATED_PILOT_SIGNING_SECRET_CLEANUP=PASS`, and `POST_STOP_REMOTE_DIAGNOSTIC=PASS` before closing Terminal.

## Owner browser checklist

| ID | Check | Result |
|---|---|---|
| E01 | Eligible Student sees “Luyện tập được tạo theo năng lực” on Dashboard. | PASS / FAIL |
| E02 | Eligible Student sees the CTA on `/lessons`; content is only the Student's `schoolGrade`. | PASS / FAIL |
| E03 | Start returns a complete public question and readable visual; no endless loading. | PASS / FAIL |
| E04 | Refresh and reconnect return the same attempt and question. | PASS / FAIL |
| E05 | Selecting an answer does not submit automatically. | PASS / FAIL |
| E06 | Correct submit shows feedback and allowed explanation only after submit. | PASS / FAIL |
| E07 | An incorrect submit shows supportive feedback without exposing internal codes. | PASS / FAIL |
| E08 | Next/resume/complete work; duplicate click does not duplicate evidence. | PASS / FAIL |
| E09 | Dashboard competency/recommendation changes after saved evidence. | PASS / FAIL |
| E10 | Mobile viewport is readable and has no horizontal overflow. | PASS / FAIL |
| D01 | A different Student cannot see the CTA and direct generated start fails closed. | PASS / FAIL |
| D02 | Parent, Teacher and anonymous sessions cannot see or start generated practice. | PASS / FAIL |
| D03 | Grade 2 adaptive CTA/API remains absent and disabled. | PASS / FAIL |
| S01 | Page/RSC/JSON/DOM/ARIA contain no correct answer before submit, raw seed, solver receipt or private hash. | PASS / FAIL |
| X01 | Ctrl+C returns the process to `OFF` and exact signing-secret cleanup passes. | PASS / FAIL |

On failure, record only the route, visible error code/correlation ID and symptom. Do not record UUID, email, credentials, prompt, answer, seed or solution in the repository.

## Local evidence

- Disposable schema proof: migrations 41/41, provenance 8/8, Grades 9/9, 108 pilot-live items, start/resume, cross-session resume, CAS, duplicate submit, immutability, RLS/private boundary and cleanup all PASS.
- Semantic runtime adapter: 546/546 canonical outcomes produced immutable 12-question snapshots in regression; remote-shadow contract remains 59/59 variants and 1,638/1,638 samples with fallback 0.
- Playwright Chromium-compatible smoke: 390×844 and 1280×800 PASS, horizontal overflow 0, console errors 0, private-solution leaks 0.
- Screenshots: `artifacts/generated-pilot-acceptance/mobile-390x844.png` and `artifacts/generated-pilot-acceptance/desktop-1280x800.png`.
- Practice suite 550/550 PASS; universal curriculum 21/21 PASS; production build, typecheck and lint PASS.

The Playwright artifacts are a local public-payload/visual smoke, not a substitute for the Owner's authenticated remote pilot journey.
