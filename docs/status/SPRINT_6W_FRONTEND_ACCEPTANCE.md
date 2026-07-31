# Sprint 6W frontend acceptance

Status: BLOCKED_BROWSER_SURFACE_UNAVAILABLE

## Scope audited

- Public: `/`, `/about`, `/demo`, `/login`, `/register`, password recovery,
  privacy, terms and protected-route redirects.
- Student: `/dashboard`, `/lessons`, `/learn/[gradeSlug]/[lessonSlug]`,
  practice/diagnostic/curriculum runners, results, history, progress, goals,
  profile and settings.
- Parent: dashboard, connections and child summary.
- Teacher: onboarding, dashboard, classrooms, assignments, gradebook and
  question library.

## Fixes

- Canonical catalog CTAs now lead to `/lessons`; `/learn` remains a theory
  implementation route rather than the primary catalog destination.
- Removed functional Unicode menu glyphs and replaced them with an accessible
  CSS menu/close icon.
- Preserved `aria-expanded`, keyboard escape/focus restoration and reduced
  motion behavior.
- Added a production-specific TypeScript configuration so stale remote-dev
  generated types cannot break the normal production build.

## Verification

- Frontend journey contracts: PASS.
- Competency/recommendation integration: PASS.
- Practice visual readability: PASS.
- Practice regression suite: PASS (550/550).
- Universal semantic generator: PASS.
- Universal curriculum suite: PASS (21/21).
- Typecheck: PASS.
- Lint: PASS.
- Production build: PASS (67 pages generated).

## Browser blocker

The local application started successfully on loopback, but the connected
browser runtime exposed no available browser backend. Therefore no honest
rendered viewport, keyboard, console or screenshot evidence could be captured.
Static/source and production-build results do not substitute for this gate.

Required remaining evidence:

- Rendered checks at 320×568, 360×800, 390×844, 768×1024, 1024×768,
  1280×800 and 1440×900.
- Authenticated Student/Parent/Teacher journeys using existing local data.
- Practice feedback, completion, empty/error states and mobile menu screenshots.
- Browser console and hydration-warning inspection.
