import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("client bundle does not import registry, engine, release bank or private solutions", () => {
  const clientSources = [
    "components/UniversalCurriculumStartButton.tsx",
    "app/curriculum-practice/[attemptId]/UniversalCurriculumRunner.tsx",
  ].map(source).join("\n");
  assert.equal(/curriculum\/engine|curriculum\/registry|curriculum-runtime\/release/.test(clientSources), false);
  assert.equal(/private\.curriculum_release_solutions/.test(clientSources), false);
  assert.equal(/isCorrect\s*:|expectedAnswer\s*:|mastery\s*:|score\s*:/.test(clientSources), false);
  assert.match(clientSources, /expectedRevision/);
  assert.match(clientSources, /idempotencyKey/);
});

test("authenticated UI includes own-grade catalog, resume, progress and history", () => {
  const catalog = source("components/UniversalCurriculumCatalog.tsx");
  const lesson = source("components/UniversalCurriculumLesson.tsx");
  const runner = source(
    "app/curriculum-practice/[attemptId]/UniversalCurriculumRunner.tsx",
  );
  const progress = source("components/StudentCurriculumProgressView.tsx");
  assert.match(catalog, /Toán lớp \{grade\}/);
  assert.match(catalog, /Tiếp tục học/);
  assert.match(lesson, /Lý thuyết/);
  assert.match(lesson, /Ví dụ có lời giải từng bước/);
  assert.match(runner, /Tự động lưu/);
  assert.match(runner, /Lời giải từng bước/);
  assert.match(progress, /Mục tiêu học tập/);
  assert.match(progress, /Kỹ năng/);
  assert.match(progress, /CURRENT_MASTERY_HELP/);
});

test("mobile and accessibility contracts remain explicit", () => {
  const css = source("app/globals.css");
  const startButton = source(
    "components/UniversalCurriculumStartButton.tsx",
  );
  const runner = source(
    "app/curriculum-practice/[attemptId]/UniversalCurriculumRunner.tsx",
  );
  assert.match(css, /max-width: 100%/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(runner, /aria-live="polite"/);
  assert.match(runner, /role="alert"/);
  assert.match(runner, /<fieldset/);
  assert.match(runner, /<legend/);
  assert.match(startButton, /new AbortController\(\)/);
  assert.match(startButton, /6_000/);
  assert.match(startButton, /CLIENT_TIMEOUT/);
  assert.match(startButton, /Thử lại/);
  assert.match(startButton, /idempotencyKey\.current \?\?=/);
  assert.match(startButton, /plave:start-practice-api/);
  assert.match(runner, /plave:start-practice-client-transition/);
  assert.match(runner, /plave:start-practice-total-transition/);
});
