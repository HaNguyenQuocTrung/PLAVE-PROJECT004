import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  parseOnDemandStartRequest,
} from "../lib/curriculum/on-demand-request.ts";

const startRoute = readFileSync(
  new URL(
    "../app/api/on-demand-curriculum/start/route.ts",
    import.meta.url,
  ),
  "utf8",
);
const answerRoute = readFileSync(
  new URL(
    "../app/api/on-demand-curriculum/answer/route.ts",
    import.meta.url,
  ),
  "utf8",
);
const stateRoute = readFileSync(
  new URL(
    "../app/api/on-demand-curriculum/state/route.ts",
    import.meta.url,
  ),
  "utf8",
);
const runtime = readFileSync(
  new URL("../lib/curriculum/on-demand-runtime.ts", import.meta.url),
  "utf8",
);
const featureFlag = readFileSync(
  new URL(
    "../lib/curriculum/on-demand-feature-flag.ts",
    import.meta.url,
  ),
  "utf8",
);
const startButton = readFileSync(
  new URL("../components/AdaptiveOnDemandStartButton.tsx", import.meta.url),
  "utf8",
);
const universalRunner = readFileSync(
  new URL(
    "../app/curriculum-practice/[attemptId]/UniversalCurriculumRunner.tsx",
    import.meta.url,
  ),
  "utf8",
);
const healthRoute = readFileSync(
  new URL(
    "../app/api/internal/owner-local-health/route.ts",
    import.meta.url,
  ),
  "utf8",
);
const learnPage = readFileSync(
  new URL("../app/learn/page.tsx", import.meta.url),
  "utf8",
);
const progressRoute = readFileSync(
  new URL(
    "../app/api/curriculum-runtime/progress/route.ts",
    import.meta.url,
  ),
  "utf8",
);
const historyRoute = readFileSync(
  new URL(
    "../app/api/curriculum-runtime/history/route.ts",
    import.meta.url,
  ),
  "utf8",
);

const requestId = "11111111-1111-4111-8111-111111111111";

test("on-demand start accepts only an idempotency key and never accepts a client seed", () => {
  assert.deepEqual(
    parseOnDemandStartRequest({
      idempotencyKey: requestId,
    }),
    {
      idempotencyKey: requestId,
    },
  );
  assert.equal(
    parseOnDemandStartRequest({
      seed: "grade-8-replay-alpha",
      idempotencyKey: requestId,
    }),
    null,
  );
  assert.equal(
    parseOnDemandStartRequest({
      idempotencyKey: requestId,
      grade: 9,
    }),
    null,
  );
});

test("HTTP routes require same-origin/auth and emit bounded diagnostics", () => {
  for (const route of [startRoute, answerRoute, stateRoute]) {
    assert.match(route, /isSameOriginRequest/);
    assert.match(route, /create(?:RuntimeTrace|CurriculumApiResponder)/);
  }
  assert.match(startRoute, /recordTiming: trace\.record/);
  assert.match(answerRoute, /getStudentLearningContext/);
  assert.match(stateRoute, /loadOnDemandAttemptState/);
});

test("signing key and private snapshot never cross the browser boundary", () => {
  assert.match(featureFlag, /PLAVE_ON_DEMAND_GENERATION_SIGNING_KEY/);
  assert.match(runtime, /createHmac/);
  assert.match(healthRoute, /on-demand-feature-flag/);
  assert.doesNotMatch(healthRoute, /on-demand-runtime/);
  for (const browserVisibleSource of [
    startRoute,
    answerRoute,
    stateRoute,
    startButton,
    healthRoute,
  ]) {
    assert.doesNotMatch(
      browserVisibleSource,
      /signingKey|SIGNING_KEY|normalizedCorrectAnswer|privatePayloadHash/,
    );
  }
  assert.doesNotMatch(
    startRoute,
    /solutionSteps|correctAnswer|solutions|snapshotHash/,
  );
  assert.match(
    runtime,
    /start_or_resume_semantic_generated_curriculum/,
  );
  assert.doesNotMatch(
    runtime,
    /\.rpc\(\s*"start_or_resume_generated_curriculum"/u,
  );
  assert.match(
    runtime,
    /configuration\.mode !== "PILOT_LIVE"[\s\S]*reason: "RUNTIME_DISABLED"/u,
  );
});

test("answer route delegates correctness to the authenticated database RPC", () => {
  assert.match(answerRoute, /submit_generated_curriculum_answer/);
  assert.match(answerRoute, /p_expected_revision/);
  assert.match(answerRoute, /p_idempotency_key/);
  assert.doesNotMatch(answerRoute, /isCorrect\s*=|correctAnswer\s*===/);
});

test("Grade 1 keeps its legacy catalog and adds evidence-based on-demand entry", () => {
  assert.match(learnPage, /access\.grade === 1/);
  assert.match(learnPage, /gradeOneAdaptiveProgress/);
  assert.match(learnPage, /AdaptiveOnDemandStartButton/);
  assert.match(learnPage, /learning_units/);
  assert.match(progressRoute, /loadStudentCurriculumProgress/);
  assert.match(historyRoute, /loadStudentCurriculumHistory/);
});

test("on-demand start records API and client-transition performance marks", () => {
  for (const measurement of [
    "plave:start-practice-click",
    "plave:start-practice-response",
    "plave:start-practice-route-push",
    "plave:start-practice-api",
    "plave:start-practice-client-transition",
    "plave:start-practice-total-transition",
  ]) {
    assert.match(
      `${startButton}\n${universalRunner}`,
      new RegExp(measurement),
    );
  }
});
