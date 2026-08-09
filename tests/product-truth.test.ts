import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { getProfileMenuActions } from "../lib/auth/navigation.ts";
import {
  createMenuDisclosureContext,
  createMenuDisclosureState,
  isMenuDisclosureOpen,
} from "../lib/auth/menu-disclosure.ts";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("profile menu exposes only destinations supported by each role", () => {
  assert.deepEqual(getProfileMenuActions("STUDENT"), [
    { href: "/profile", label: "Xem hồ sơ" },
    { href: "/profile/edit", label: "Chỉnh sửa hồ sơ" },
    { href: "/settings", label: "Cài đặt" },
    { href: "/connections", label: "Kết nối phụ huynh" },
    { href: "/privacy", label: "Quyền riêng tư" },
  ]);
  assert.deepEqual(getProfileMenuActions("PARENT"), [
    { href: "/dashboard", label: "Tổng quan phụ huynh" },
    { href: "/connections", label: "Kết nối học sinh" },
    { href: "/privacy", label: "Quyền riêng tư" },
  ]);
  assert.deepEqual(getProfileMenuActions("TEACHER"), [
    { href: "/teacher/profile", label: "Xem hồ sơ" },
    { href: "/privacy", label: "Quyền riêng tư" },
  ]);

  const parentHrefs = getProfileMenuActions("PARENT").map(({ href }) => href);
  for (const studentOnly of ["/profile", "/profile/edit", "/settings"]) {
    assert.equal(parentHrefs.includes(studentOnly), false, studentOnly);
  }
});

test("role-only destination loaders remain fail-closed", () => {
  const header = read("components/HeaderNavigation.tsx");
  const studentAccess = read("lib/practice/server.ts");
  const teacherAccess = read("lib/teacher/server.ts");

  assert.match(header, /getProfileMenuActions\(role\)/u);
  assert.match(header, /profileMenuActions[.]map/u);
  assert.match(studentAccess, /profile[.]role !== "STUDENT"/u);
  assert.match(teacherAccess, /profile[.]role !== "TEACHER"/u);
  assert.doesNotMatch(header, /role !== "TEACHER"[\s\S]{0,300}href="\/profile"/u);
});

test("profile disclosure accessibility behavior is unchanged", () => {
  for (const role of ["STUDENT", "PARENT", "TEACHER"] as const) {
    const path = role === "TEACHER" ? "/teacher" : "/dashboard";
    const context = createMenuDisclosureContext(true, path);
    const closed = createMenuDisclosureState(context);
    const opened = createMenuDisclosureState(context, true);
    assert.equal(isMenuDisclosureOpen(closed, context), false, role);
    assert.equal(isMenuDisclosureOpen(opened, context), true, role);
    assert.equal(
      isMenuDisclosureOpen(
        opened,
        createMenuDisclosureContext(true, `${path}/next`),
      ),
      false,
      role,
    );
  }

  const header = read("components/HeaderNavigation.tsx");
  for (const contract of [
    /aria-expanded=\{profileMenuOpen\}/u,
    /aria-haspopup="menu"/u,
    /role="menu"/u,
    /role="menuitem"/u,
    /pointerdown/u,
    /event[.]key === "Escape"/u,
    /profileButtonRef[.]current[?][.]focus/u,
    /<LogoutForm[\s\S]*menuItem/u,
  ]) {
    assert.match(header, contract);
  }
});

test("demo copy distinguishes public non-persistence from saved learning", () => {
  const demo = read("app/demo/page.tsx");
  assert.match(demo, /Kết quả Học thử không được lưu/u);
  for (const savedEvidence of [
    "lượt học",
    "câu trả lời",
    "trạng thái tiếp tục",
    "kết quả hoàn thành",
    "Lịch sử",
    "Tiến bộ",
  ]) {
    assert.equal(demo.includes(savedEvidence), true, savedEvidence);
  }
  assert.doesNotMatch(demo, /Tài khoản chỉ lưu hồ sơ và mục[\s\S]*tiêu cơ bản/u);
  assert.doesNotMatch(demo, /Adaptive Grade 2|thích ứng.*đã (?:mở|xuất bản)/iu);
});

test("recovery messages provide supported actions without nonexistent support", () => {
  const onboarding = read("lib/onboarding/validation.ts");
  const teacher = read("lib/teacher/server.ts");
  const combined = `${onboarding}\n${teacher}`;
  const invitationMessages = [
    ...teacher.matchAll(/"([^"\n]*(?:mã mời|Mã mời)[^"\n]*)"/gu),
  ].map((match) => match[1]);

  assert.match(onboarding, /đăng xuất, đăng ký lại và chọn lớp từ 1 đến 9/u);
  assert.match(teacher, /đề nghị Owner cấp một mã mời mới/u);
  assert.match(teacher, /không hợp lệ, đã hết hạn hoặc không còn sử dụng được/u);
  assert.doesNotMatch(combined, /liên hệ (?:PLAVE|hỗ trợ)|contact PLAVE/iu);
  assert.ok(invitationMessages.length >= 2);
  for (const message of invitationMessages) {
    assert.doesNotMatch(message, /provider|SQL|Supabase|Postgres/iu);
  }
});

test("README states the verified production-local and local-demo contracts", () => {
  const readme = read("README.md");
  assert.match(readme, /npm ci/u);
  assert.match(readme, /npm run build:production-local/u);
  assert.match(readme, /npm run start/u);
  assert.match(readme, /http:\/\/localhost:3000/u);
  assert.match(readme, /URL printed by `npm run start` is authoritative/u);
  assert.match(readme, /http:\/\/127[.]0[.]0[.]1:3100/u);
  assert.match(readme, /No public demonstration video is currently available/u);
  assert.doesNotMatch(readme, /127[.]0[.]0[.]1:3001|add link/iu);
});
