import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path: string) => readFile(path, "utf8");

test("primary learning CTAs use the canonical lessons catalog", async () => {
  const sources = await Promise.all([
    read("app/page.tsx"),
    read("app/dashboard/page.tsx"),
    read("app/about/page.tsx"),
    read("components/PracticeHistory.tsx"),
    read("components/StudentCurriculumProgressView.tsx"),
    read("app/learning-history/page.tsx"),
  ]);
  for (const source of sources) {
    assert.doesNotMatch(source, /href=["']\/learn["']/u);
  }
  assert.match(sources[0], /authenticated \? "\/lessons" : "\/demo"/u);
});

test("mobile menu uses a CSS icon with accessible expanded state", async () => {
  const [navigation, css] = await Promise.all([
    read("components/HeaderNavigation.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(navigation, /aria-expanded=\{menuOpen\}/u);
  assert.match(navigation, /site-menu-toggle__icon/u);
  assert.doesNotMatch(navigation, /[☰✕]/u);
  assert.match(css, /\.site-menu-toggle__icon--open/u);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/u);
});

test("generated practice remains server-only and default-off", async () => {
  const source = await read("lib/curriculum/generated-practice-feature-flag.ts");
  assert.match(source, /"OFF" \| "SHADOW" \| "PILOT_LIVE"/u);
  assert.doesNotMatch(source, /NEXT_PUBLIC/u);
});
