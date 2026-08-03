import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildRegistrationMetadata,
  classifySignUpResult,
  registrationServiceUnavailable,
  uncertainTransportResult,
  validationFailure,
} from "../lib/auth/registration-result.ts";

test("registration metadata is exact for Student Grade 2, Parent and Teacher", () => {
  assert.deepEqual(buildRegistrationMetadata("STUDENT", 2), {
    role: "STUDENT",
    grade: 2,
  });
  assert.deepEqual(buildRegistrationMetadata("PARENT", null), {
    role: "PARENT",
  });
  assert.deepEqual(buildRegistrationMetadata("TEACHER", null), {
    role: "TEACHER",
  });
});

test("registration distinguishes created session and confirmation states", () => {
  assert.equal(
    classifySignUpResult(
      { user: { identities: [{}] }, session: {} },
      null,
    ).outcome,
    "CREATED_SESSION",
  );
  assert.equal(
    classifySignUpResult(
      { user: { identities: [{}] }, session: null },
      null,
    ).outcome,
    "CREATED_REQUIRES_CONFIRMATION",
  );
});

test("registration distinguishes delivery uncertainty and rate limiting", () => {
  const uncertain = classifySignUpResult(
    { user: null, session: null },
    { code: "email_send_failed", message: "SMTP rejected delivery", status: 500 },
  );
  assert.equal(uncertain.ok, true);
  assert.equal(uncertain.outcome, "CREATED_EMAIL_DELIVERY_UNCERTAIN");
  assert.equal(
    classifySignUpResult(
      { user: null, session: null },
      { code: "over_email_send_rate_limit", message: "rate limit", status: 429 },
    ).outcome,
    "EMAIL_RATE_LIMITED",
  );
  assert.equal(
    uncertainTransportResult().outcome,
    "CREATED_EMAIL_DELIVERY_UNCERTAIN",
  );
});

test("registration distinguishes pre-request provider unavailability from uncertain delivery", () => {
  const unavailable = registrationServiceUnavailable();
  assert.equal(unavailable.ok, false);
  assert.equal(unavailable.outcome, "SERVICE_UNAVAILABLE");
  assert.match(unavailable.message, /Tài khoản chưa được tạo/u);
  assert.doesNotMatch(unavailable.message, /có thể đã được tạo/u);
});

test("registration distinguishes trigger failure, existing user and validation", () => {
  assert.equal(
    classifySignUpResult(
      { user: null, session: null },
      {
        code: "unexpected_failure",
        message: "Database error saving new user",
        status: 500,
      },
    ).outcome,
    "DATABASE_TRIGGER_FAILED",
  );
  assert.equal(
    classifySignUpResult(
      { user: null, session: null },
      { code: "user_already_exists", message: "already registered" },
    ).outcome,
    "USER_ALREADY_EXISTS",
  );
  assert.equal(
    classifySignUpResult(
      { user: { identities: [] }, session: null },
      null,
    ).outcome,
    "USER_ALREADY_EXISTS",
  );
  assert.equal(validationFailure("invalid").outcome, "VALIDATION_FAILED");
});

test("registration action is single-shot, has no resend and does not log secrets", () => {
  const source = readFileSync("app/register/actions.ts", "utf8");
  assert.equal((source.match(/auth[.]signUp\s*\(/g) ?? []).length, 1);
  assert.doesNotMatch(source, /resend|setTimeout|retry/i);
  assert.doesNotMatch(source, /console[.](?:log|error|warn)|service[_-]?role/i);
  assert.match(source, /buildRegistrationMetadata\(input[.]role, input[.]grade\)/);
  assert.match(
    source,
    /Promise[.]all\(\[\s*createClient\(\),\s*getRequestOrigin\(\),\s*\]\)/,
  );
  assert.match(source, /catch \{\s*return registrationServiceUnavailable\(\);\s*\}/);
  assert.match(
    source,
    /if \(result[.]outcome === "CREATED_SESSION" && data[.]session\) \{[\s\S]*try \{[\s\S]*auth[.]signOut\(\);[\s\S]*catch \{[\s\S]*return result;/,
  );
});
