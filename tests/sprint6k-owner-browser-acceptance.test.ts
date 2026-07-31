import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const checklistPath =
  "docs/operations/SPRINT_6K_OWNER_PARENT_TEACHER_BROWSER_ACCEPTANCE.md";
const statusPath =
  "docs/operations/PARENT_TEACHER_UNIVERSAL_RUNTIME_STATUS.json";

const checklist = readFileSync(checklistPath, "utf8");
const status = JSON.parse(readFileSync(statusPath, "utf8")) as {
  decision: string;
  ownerBrowserAcceptance: {
    evidenceRequirement: string;
    parent: string;
    teacher: string;
    overall: string;
    httpStaticOrSyntheticEvidenceMayPromote: boolean;
    repositoryStoresIdentityOrCorrelationId: boolean;
    stopAuthorizedAfterPass: boolean;
  };
};
const invitationHelper = readFileSync(
  "scripts/create-owner-local-teacher-invitation.ts",
  "utf8",
);
const stopRunner = readFileSync(
  "scripts/stop-owner-local-demo.ts",
  "utf8",
);

test("Sprint 6K checklist covers the required manual routes and gates", () => {
  for (const id of [
    "C01",
    "P01",
    "P02",
    "P03",
    "P04",
    "P05",
    "P06",
    "P07",
    "P08",
    "T01",
    "T02",
    "T03",
    "T04",
    "T05",
    "T06",
    "T07",
    "T08",
    "T09",
    "T10",
    "T11",
    "U01",
    "U02",
    "U03",
    "U04",
    "U05",
    "U06",
  ]) {
    assert.match(checklist, new RegExp(`\\| ${id} \\|`));
  }

  for (const route of [
    "/connections",
    "/parent/children/[connectionId]",
    "/teacher/onboarding",
    "/teacher/classrooms",
    "/classrooms",
    "/teacher/assignments/new",
    "/assignments",
    "/teacher/classes/[classroomId]/gradebook",
    "/teacher/assignments/[assignmentId]/analysis",
  ]) {
    assert.ok(checklist.includes(route), `missing route ${route}`);
  }

  assert.match(checklist, /manual Owner gate/i);
  assert.match(checklist, /cannot change any item below to PASS/i);
  assert.match(checklist, /true on-demand Teacher assignment/i);
  assert.match(checklist, /current Teacher UI has no separate on-demand/i);
});

test("machine status cannot promote before Owner manual confirmation", () => {
  assert.equal(status.decision, "NOT_READY_FOR_OWNER_BROWSER_DEMO");
  assert.equal(
    status.ownerBrowserAcceptance.evidenceRequirement,
    "OWNER_MANUAL_BROWSER_ONLY",
  );
  assert.equal(
    status.ownerBrowserAcceptance.parent,
    "PENDING_OWNER_CONFIRMATION",
  );
  assert.equal(
    status.ownerBrowserAcceptance.teacher,
    "PENDING_OWNER_CONFIRMATION",
  );
  assert.equal(
    status.ownerBrowserAcceptance.overall,
    "PENDING_OWNER_CONFIRMATION",
  );
  assert.equal(
    status.ownerBrowserAcceptance.httpStaticOrSyntheticEvidenceMayPromote,
    false,
  );
  assert.equal(
    status.ownerBrowserAcceptance.repositoryStoresIdentityOrCorrelationId,
    false,
  );
  assert.equal(status.ownerBrowserAcceptance.stopAuthorizedAfterPass, false);
  assert.match(
    checklist,
    /OWNER_PARENT_BROWSER=PENDING_OWNER_CONFIRMATION/,
  );
  assert.match(
    checklist,
    /OWNER_TEACHER_BROWSER=PENDING_OWNER_CONFIRMATION/,
  );
  assert.match(
    checklist,
    /OWNER_LOCAL_BROWSER_ACCEPTANCE=PENDING_OWNER_CONFIRMATION/,
  );
  assert.match(checklist, /PROJECT004_LOCAL_LEARNING_PRODUCT=NOT_READY/);
});

test("checklist carries no concrete identity or secret fixture", () => {
  assert.doesNotMatch(
    checklist,
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  );
  assert.doesNotMatch(
    checklist,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  );
  assert.doesNotMatch(checklist, /\bPLV-TCH-[0-9A-F]{32}\b/);
  assert.match(checklist, /keep the correlation ID outside the repository/i);
});

test("invitation helper writes only a private temp file and never prints the code", () => {
  assert.match(invitationHelper, /tmpdir\(\)/);
  assert.match(invitationHelper, /mode: 0o600/);
  assert.match(
    invitationHelper,
    /OWNER_LOCAL_TEACHER_INVITATION=CREATED/,
  );
  assert.match(invitationHelper, /INVITATION_FILE=/);

  const stdoutCalls =
    invitationHelper.match(/process\.stdout\.write\([^;]+;/g) ?? [];
  assert.ok(stdoutCalls.length >= 3);
  for (const call of stdoutCalls) {
    assert.doesNotMatch(call, /\$\{invitationCode\}/);
  }
});

test("STOP contract preserves Owner learning and collaboration history", () => {
  assert.match(stopRunner, /deactivate_0038_universal_curriculum_local\.sql/);
  assert.match(stopRunner, /OWNER_HISTORY=PRESERVED/);
  assert.doesNotMatch(
    stopRunner,
    /\b(?:delete|truncate)\b[\s\S]*\b(?:profiles|connections|attempts|answers|assignments|submissions|history|progress)\b/i,
  );
  assert.match(
    checklist,
    /Only[\s\S]*then should Owner run exactly once:[\s\S]*npm run owner-local-demo:stop/,
  );
});
