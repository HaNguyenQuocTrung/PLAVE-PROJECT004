import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildXpCompletionResultView,
  type XpCompletionProjection,
} from "../lib/scoring/completion.ts";

const eligible = (
  attemptXpEarned: number,
  totalXpAfter: number,
): XpCompletionProjection => ({
  policyVersion: "PLAVE_SCORING_POLICY_V1",
  eligible: true,
  attemptXpEarned,
  totalXpAfter,
  reason:
    attemptXpEarned > 0
      ? "ELIGIBLE_CORRECT_ANSWERS_AWARDED"
      : "NO_CORRECT_ELIGIBLE_ANSWER",
});

test("persisted XP values always produce explicit non-blank text", () => {
  assert.deepEqual(buildXpCompletionResultView(eligible(45, 145)), {
    kind: "READY",
    projection: eligible(45, 145),
    attemptXpText: "45 XP",
    totalXpText: "145 XP",
    reasonText:
      "XP được cộng cho các câu đúng đủ điều kiện trong lượt học này.",
  });
  const zero = buildXpCompletionResultView(eligible(0, 150));
  assert.equal(zero.kind, "READY");
  if (zero.kind !== "READY") return;
  assert.equal(zero.attemptXpText, "0 XP");
  assert.equal(zero.totalXpText, "150 XP");
  assert.notEqual(zero.attemptXpText.trim(), "");
  assert.notEqual(zero.totalXpText.trim(), "");
});

test("missing or invalid XP projection fails closed with an explicit state", () => {
  for (const malformed of [
    null,
    undefined,
    {},
    { ...eligible(10, 100), attemptXpEarned: undefined },
    { ...eligible(10, 100), totalXpAfter: null },
  ]) {
    const view = buildXpCompletionResultView(malformed);
    assert.equal(view.kind, "UNAVAILABLE");
    if (view.kind === "UNAVAILABLE") {
      assert.match(view.message, /Chưa thể tải kết quả XP đã lưu/u);
    }
  }
});

test("every eligible runtime uses the shared fail-closed XP summary", () => {
  for (const path of [
    "app/practice/[attemptId]/PracticeRunner.tsx",
    "app/review/[attemptId]/page.tsx",
    "app/curriculum-practice/[attemptId]/UniversalCurriculumRunner.tsx",
    "app/adaptive-practice/[attemptId]/AdaptivePracticeRunner.tsx",
  ]) {
    assert.match(readFileSync(path, "utf8"), /XpCompletionSummary/u, path);
  }
  const summary = readFileSync(
    "components/XpCompletionSummary.tsx",
    "utf8",
  );
  assert.match(summary, /data-xp-value/u);
  assert.match(summary, /xp-projection-unavailable/u);
  assert.match(summary, /Kết quả XP chưa sẵn sàng/u);
});

test("XP cards own a readable foreground and cannot inherit white hero text", () => {
  const css = readFileSync("app/globals.css", "utf8");
  const cardRule = css.slice(
    css.indexOf(".scoring-result > div"),
    css.indexOf(".xp-award"),
  );
  assert.match(cardRule, /background: var\(--surface\)/u);
  assert.match(cardRule, /color: var\(--text\)/u);
  assert.match(cardRule, /\.scoring-result strong[\s\S]*color: var\(--text\)/u);
});

test("Review reload reconciles persisted attempt XP with canonical total", () => {
  const review = readFileSync("app/review/[attemptId]/page.tsx", "utf8");
  assert.match(review, /get_practice_review/u);
  assert.match(review, /get_my_score_xp_mastery/u);
  assert.match(review, /scoring\?\.attempts\.find/u);
  assert.match(review, /buildAttemptXpCompletionProjection/u);
  assert.match(review, /scoring\.totalXp/u);
  assert.doesNotMatch(review, /submit_practice_answer/u);
});
