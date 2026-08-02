import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const lessons = read("app/lessons/page.tsx");
const universalCatalog = read("components/UniversalLessonsCatalog.tsx");
const globalStyles = read("app/globals.css");
const finalCascade = read("app/visual-system-v2.css");
const playwrightAcceptance = read("scripts/run-sprint7a-local-playwright.ts");

test("lesson cards expose explicit status, content, metadata and action regions", () => {
  for (const source of [lessons, universalCatalog]) {
    assert.match(source, /unit-card__status-region/u);
    assert.match(source, /unit-card__content-region/u);
    assert.match(source, /unit-card__metadata-region/u);
    assert.match(source, /unit-card__actions/u);
  }
  assert.doesNotMatch(
    lessons,
    /unit-card__actions[\s\S]{0,260}unit-card__locked-note/u,
  );
});

test("V2 lesson content owns the flexible track and mobile stacks semantic regions", () => {
  assert.match(
    finalCascade,
    /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+max-content/u,
  );
  assert.match(finalCascade, /"status actions"/u);
  assert.match(finalCascade, /"content actions"/u);
  assert.match(finalCascade, /"metadata actions"/u);
  assert.match(finalCascade, /"status"[\s\S]*"content"[\s\S]*"metadata"[\s\S]*"actions"/u);
  assert.match(finalCascade, /\.unit-card__content-region\s*\{[\s\S]*min-width:\s*0/u);
});

test("normal Vietnamese text is not governed by character-level wrapping", () => {
  assert.match(
    globalStyles,
    /h1,\s*h2,\s*h3,\s*p\s*\{[\s\S]*overflow-wrap:\s*normal;[\s\S]*word-break:\s*normal;/u,
  );
  assert.doesNotMatch(globalStyles, /word-break:\s*break-all/u);
  const anywhereSelectors = [
    ...globalStyles.matchAll(/([^{}]+)\{[^{}]*overflow-wrap:\s*anywhere;/gu),
  ].map((match) => match[1]);
  assert.equal(anywhereSelectors.length, 2);
  assert.ok(anywhereSelectors.every((selector) => /code/u.test(selector)));
});

test("local Playwright audits every rendered lesson card at all seven viewports", () => {
  assert.match(playwrightAcceptance, /async function auditLessonCards/u);
  assert.match(playwrightAcceptance, /CHARACTER_LEVEL_TITLE_WRAP/u);
  assert.match(playwrightAcceptance, /CONTENT_COLUMN_SHARE/u);
  assert.match(playwrightAcceptance, /ACTION_COLUMN_SHARE/u);
  assert.match(playwrightAcceptance, /CARD_EXCESSIVE_HEIGHT/u);
  for (const width of [320, 360, 390, 768, 1024, 1280, 1440]) {
    assert.match(playwrightAcceptance, new RegExp(`width:\\s*${width}`, "u"));
    assert.match(
      playwrightAcceptance,
      new RegExp(`lessons-\\$\\{viewport\\.width\\}\\.png`, "u"),
    );
  }
  assert.match(playwrightAcceptance, /const maxLines = mobile \? 4 : 3/u);
});
