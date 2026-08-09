import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  createMenuDisclosureContext,
  createMenuDisclosureState,
  isMenuDisclosureOpen,
} from "../lib/auth/menu-disclosure.ts";

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
