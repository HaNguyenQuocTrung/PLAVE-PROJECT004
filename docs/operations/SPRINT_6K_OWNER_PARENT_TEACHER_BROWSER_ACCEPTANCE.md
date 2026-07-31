# Sprint 6K — Owner Parent/Teacher browser acceptance

Status: `PENDING_OWNER_MANUAL_CONFIRMATION`

Decision: `NOT_READY`

Automated local acceptance and the Owner Grade 8 Student browser journey
already passed on the current managed loopback runtime. Keep that process
running. Do not run STOP, START, preflight, or any separate diagnostic before
this checklist. If the current page no longer opens, mark `C01 FAIL` and stop
the journey.

This is a manual Owner gate. Static tests, database tests, API calls, and
synthetic HTTP evidence cannot change any item below to PASS.

## Evidence rules

- Record only `PASS` or `FAIL` beside each check ID.
- Never put an account address, password, Student/classroom/invitation code,
  opaque record identifier, token, or personal detail in this file or another
  repository file.
- If a check fails, keep the correlation ID outside the repository and send it
  directly with: check ID, route pattern, visible error code, and a short
  symptom. Do not include account or learner details.
- Use only `http://127.0.0.1:3000`. Do not operate another project or remote
  environment.

## Precondition

| ID | Owner action and expected result | Result |
| --- | --- | --- |
| C01 | In the already-open browser session, refresh `/dashboard`. The loopback app responds normally and the existing preflight/acceptance PASS remains the precondition; do not restart it. | `PASS / FAIL` |

## Parent journey

Use two local Student test accounts (A and B), one Parent under test, and a
second unlinked Parent only for the denial check. Keep all credentials and
codes outside the repository.

| ID | Owner action and expected result | Result |
| --- | --- | --- |
| P01 | Student A opens `/connections`; Parent opens `/connections`, previews the correct masked Student and Grade, then sends a link request. While pending, Parent sees no learning detail. | `PASS / FAIL` |
| P02 | Student A rejects the first request. Parent refreshes `/dashboard`; rejected access exposes no progress or history. Parent sends a new request and Student A approves it. | `PASS / FAIL` |
| P03 | Parent opens Student A from `/dashboard` into `/parent/children/[connectionId]`; the displayed Grade is correct and the overview includes unit, outcome, and skill progress. | `PASS / FAIL` |
| P04 | On the same child page, Parent sees attempt history and assignment history, with no answer key, private solution, or pre-submit solution data. | `PASS / FAIL` |
| P05 | Parent links Student B through the same request/approval flow. Switching A → B → A from `/dashboard` changes the child and Grade data without mixing either child’s progress or history. | `PASS / FAIL` |
| P06 | In a separate private browser session, the unlinked Parent cannot open the copied child-detail route from P03 and sees no child data. Do not record or paste the concrete route outside the browser. | `PASS / FAIL` |
| P07 | Student B revokes the link. Parent refreshes and can no longer open Student B data. Re-link and approve Student B again so the final state remains usable. | `PASS / FAIL` |
| P08 | Parent refreshes, logs out, logs back in, and can still switch between both approved children with the same histories intact. | `PASS / FAIL` |

## Teacher journey

Create one single-use invitation with:

```sh
npm run owner-local-demo:teacher-invite
```

The helper writes the value to a local temporary file with mode `0600` and
prints only its path and expiry. Open that file locally without printing or
copying its contents into the terminal or repository. Keep it available until
Teacher activation is complete because `/register` and `/teacher/onboarding`
both request the same invitation.

| ID | Owner action and expected result | Result |
| --- | --- | --- |
| T01 | At `/register`, create the local Teacher account with the invitation, then log in and complete `/teacher/onboarding`. The Teacher dashboard opens in Vietnamese. | `PASS / FAIL` |
| T02 | At `/teacher/classrooms`, create a classroom for Student A’s Grade. A retry or double click does not create a duplicate classroom. | `PASS / FAIL` |
| T03 | Student A opens `/classrooms`, previews the class, and requests to join. Teacher opens the classroom detail and approves; refresh preserves membership. | `PASS / FAIL` |
| T04 | A Student account from another Grade tries the same classroom code and is denied without joining the roster. | `PASS / FAIL` |
| T05 | At `/teacher/assignments/new`, load the curriculum, choose `Giáo viên chọn thủ công câu public`, save one draft, and publish it. A retry does not duplicate the draft or assignment. | `PASS / FAIL` |
| T06 | At `/teacher/assignments/new`, choose `Hệ thống chọn xác định từ phạm vi và seed`, select a unit/outcome/skill in the classroom Grade, save a second draft, and publish it. | `PASS / FAIL` |
| T07 | Do not claim a true on-demand Teacher assignment: the current Teacher UI has no separate on-demand generation control. Record this capability check as `N/A` unless such a control is visibly present; if present, exercise it and record `PASS / FAIL`. | `N/A / PASS / FAIL` |
| T08 | Student A opens `/assignments`, starts each published assignment, saves answers, refreshes once, resumes, and submits. Before submit, no correct answer or private solution is visible. | `PASS / FAIL` |
| T09 | After submit, Student sees the permitted review. Teacher opens the assignment roster, `/teacher/classes/[classroomId]/gradebook`, and `/teacher/assignments/[assignmentId]/analysis`; submission, answer evidence, outcome evidence, and skill evidence agree. | `PASS / FAIL` |
| T10 | A different Teacher in a private session cannot open the copied classroom, gradebook, assignment, or analysis route. Do not record concrete route identifiers. | `PASS / FAIL` |
| T11 | Teacher logs out and back in. Classroom, membership, both assignments, submission, gradebook, and curriculum evidence remain intact. | `PASS / FAIL` |

## UX acceptance

Check once across both journeys at desktop and a narrow mobile viewport.

| ID | Expected browser behavior | Result |
| --- | --- | --- |
| U01 | No operation remains in an endless loading state; timeout provides a safe next action. | `PASS / FAIL` |
| U02 | When the backend supplies an error/correlation code, the UI shows a friendly actionable error and enough non-identifying reference information to report it. | `PASS / FAIL` |
| U03 | Warm navigation between dashboard, connection/classroom, assignment, and report pages feels responsive. | `PASS / FAIL` |
| U04 | Forms, dialogs, tables, gradebook, and answer controls remain usable at a narrow mobile viewport without destructive overlap or horizontal-page breakage. | `PASS / FAIL` |
| U05 | Retrying a timed-out action does not create a duplicate connection, classroom, assignment, attempt, answer, or submission. | `PASS / FAIL` |
| U06 | Student, Parent, and Teacher roles and learning content are displayed in correct, understandable Vietnamese. | `PASS / FAIL` |

## Owner result

Only if C01, P01–P08, T01–T06, T08–T11, and U01–U06 are all PASS
(with T07 allowed to remain N/A), send exactly:

```text
OWNER_PARENT_BROWSER=PASS
OWNER_TEACHER_BROWSER=PASS
OWNER_LOCAL_BROWSER_ACCEPTANCE=PASS
```

Until that message is received, machine status remains:

```text
OWNER_PARENT_BROWSER=PENDING_OWNER_CONFIRMATION
OWNER_TEACHER_BROWSER=PENDING_OWNER_CONFIRMATION
OWNER_LOCAL_BROWSER_ACCEPTANCE=PENDING_OWNER_CONFIRMATION
PROJECT004_LOCAL_LEARNING_PRODUCT=NOT_READY
```

If any required item fails, stop the journey and report only its safe failure
record. A focused fix and one rerun of that affected path will be prepared; do
not run several standalone diagnostics.

After all three Owner PASS markers are received, the machine status and
acceptance report must first be updated with non-identifying evidence. Only
then should Owner run exactly once:

```sh
npm run owner-local-demo:stop
```

STOP deactivates the local release/runtime and preserves accounts,
connections, attempts, answers, assignments, submissions, histories, and
progress.
