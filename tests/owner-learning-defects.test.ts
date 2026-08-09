import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  createMenuDisclosureContext,
  createMenuDisclosureState,
  isMenuDisclosureOpen,
} from "../lib/auth/menu-disclosure.ts";
import { classifyLearningPersistenceSchema } from "../scripts/learning-persistence-schema-compatibility.ts";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("profile disclosure starts closed and stale state cannot survive route or auth changes", () => {
  for (const role of ["STUDENT", "PARENT", "TEACHER"] as const) {
    const pathname = role === "TEACHER" ? "/teacher" : "/dashboard";
    const signedIn = createMenuDisclosureContext(true, pathname);
    const initial = createMenuDisclosureState(signedIn);
    assert.equal(isMenuDisclosureOpen(initial, signedIn), false, role);

    const opened = createMenuDisclosureState(signedIn, true);
    assert.equal(isMenuDisclosureOpen(opened, signedIn), true, role);
    assert.equal(
      isMenuDisclosureOpen(createMenuDisclosureState(signedIn), signedIn),
      false,
      `${role} outside click or Escape`,
    );

    const navigated = createMenuDisclosureContext(true, "/lessons");
    assert.equal(isMenuDisclosureOpen(opened, navigated), false, role);
    const signedOut = createMenuDisclosureContext(false, pathname);
    assert.equal(isMenuDisclosureOpen(opened, signedOut), false, role);
    const signedInAgain = createMenuDisclosureContext(true, pathname);
    assert.equal(isMenuDisclosureOpen(opened, signedInAgain), false, role);
  }

  const header = read("components/HeaderNavigation.tsx");
  assert.match(header, /aria-expanded=\{profileMenuOpen\}/u);
  assert.match(header, /aria-haspopup="menu"/u);
  assert.match(header, /pointerdown/u);
  assert.match(header, /event[.]key === "Escape"/u);
  assert.match(header, /createMenuDisclosureContext\(authenticated, pathname\)/u);
  assert.match(header, /onClick=\{closeAllMenus\}/u);
  assert.match(header, /<LogoutForm[\s\S]*menuItem/u);
});

test("ordinary curriculum resume actions use the canonical idempotent start contract", () => {
  const recommendation = read("components/CompetencyLearningPathPanel.tsx");
  const catalog = read("components/UniversalLessonsCatalog.tsx");
  const dashboard = read("app/dashboard/page.tsx");
  const startButton = read("components/UniversalCurriculumStartButton.tsx");
  const startRoute = read("app/api/curriculum-runtime/start/route.ts");

  assert.match(recommendation, /CONTINUE_IN_PROGRESS/u);
  assert.match(recommendation, /label="Tiếp tục học"/u);
  assert.match(catalog, /item[?][.]status === "IN_PROGRESS"[\s\S]*UniversalCurriculumStartButton/u);
  assert.match(dashboard, /currentUnit[\s\S]*label="Tiếp tục bài này"/u);
  assert.match(startButton, /idempotencyKey/u);
  assert.match(startButton, /api\/curriculum-runtime\/start/u);
  assert.match(startRoute, /start_or_resume_curriculum_unit/u);
  assert.doesNotMatch(startRoute, /insert\s+into/iu);
});

test("successful learning writes invalidate every canonical read projection", () => {
  const revalidation = read("lib/curriculum-runtime/revalidation.ts");
  for (const path of [
    "/dashboard",
    "/lessons",
    "/learning-progress",
    "/learning-history",
    "/results",
    "/parent/children/[connectionId]",
  ]) {
    assert.equal(revalidation.includes(path), true, path);
  }
  for (const route of [
    "app/api/curriculum-runtime/start/route.ts",
    "app/api/curriculum-runtime/answer/route.ts",
    "app/api/practice/start/route.ts",
    "app/api/practice/answer/route.ts",
  ]) {
    const source = read(route);
    assert.match(source, /revalidateStudentLearningProjections\(\)/u);
    assert.match(source, /if \(!result\)|if \(!state|generated[.]ok/u);
  }
});

test("Results and History preserve base evidence when optional enrichment is absent", () => {
  const server = read("lib/curriculum-runtime/server.ts");
  const parentServer = read("lib/parent-dashboard/server.ts");
  const results = read("app/results/page.tsx");
  const history = read("app/learning-history/page.tsx");
  const view = read("components/StudentCurriculumHistoryView.tsx");

  assert.match(server, /scoring[?][.]attempts \?\? \[\]/u);
  assert.doesNotMatch(server, /history[\s\S]{0,120}!scoring/u);
  assert.match(parentServer, /scoringResult[.]error\s*\?\s*null/u);
  assert.match(parentServer, /motivationResult[.]error\s*\?\s*null/u);
  assert.doesNotMatch(
    parentServer,
    /universalProgressResult[.]error[\s\S]{0,160}scoringResult[.]error/u,
  );
  assert.match(results, /loadStudentCurriculumHistory/u);
  assert.match(history, /loadStudentCurriculumHistory/u);
  assert.match(results, /StudentCurriculumHistoryView/u);
  assert.match(history, /StudentCurriculumHistoryView/u);
  assert.doesNotMatch(results, /practice_attempts|learning_units/u);
  assert.match(view, /Lịch sử cơ bản vẫn được giữ nguyên/u);
  assert.doesNotMatch(view, /đang được chuẩn bị/u);

  const compatibility = classifyLearningPersistenceSchema({
    baseAttemptWrite: true,
    baseHistoryRead: true,
    baseParentProgressRead: true,
    scoringRead: false,
    parentScoringRead: false,
    motivationRead: false,
    parentMotivationRead: false,
  });
  assert.equal(compatibility.studentHistory, "AVAILABLE_BASE_ONLY");
  assert.equal(compatibility.parentProgress, "AVAILABLE_BASE_ONLY");
  assert.equal(compatibility.safeCode, "SCHEMA_ENRICHMENT_UNAVAILABLE");
});

test("Lessons and Progress count completion from the same canonical progress units", () => {
  const lessons = read("components/UniversalLessonsCatalog.tsx");
  const progress = read("components/StudentCurriculumProgressView.tsx");
  assert.match(
    lessons,
    /progress[.]units[.]filter\([\s\S]*status === "COMPLETED"/u,
  );
  assert.match(
    progress,
    /progress[.]units[.]filter\([\s\S]*status === "COMPLETED"/u,
  );
  assert.match(lessons, /\{completedCount\}[\s\S]*\{units[.]length\}/u);
  assert.match(progress, /\{completed\}\/\{progress[.]units[.]length\}/u);
});
