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
import {
  authThrottleMessage,
  classifyAuthThrottle,
} from "../lib/auth/error-classification.ts";
import { createAuthSubmissionGate } from "../lib/auth/client-flow.ts";

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

test("email throttling requires an email-producing operation and an exact email signal", () => {
  for (const operation of [
    "SIGN_UP",
    "PASSWORD_RESET_EMAIL",
    "RESEND_VERIFICATION_EMAIL",
  ] as const) {
    assert.equal(
      classifyAuthThrottle(operation, {
        code: "over_email_send_rate_limit",
        message: "Email rate limit exceeded",
        status: 429,
      })?.kind,
      "EMAIL_RATE_LIMITED",
    );
  }

  assert.equal(
    classifyAuthThrottle("SIGN_UP", {
      message: "Rate limit exceeded for sending emails",
    })?.kind,
    "EMAIL_RATE_LIMITED",
  );
});

test("generic, login, OTP and refresh throttling never become email-send limiting", () => {
  assert.equal(
    classifyAuthThrottle("OTHER", { status: 429 })?.kind,
    "THROTTLED",
  );
  assert.equal(
    classifyAuthThrottle("SIGN_UP", {
      code: "over_request_rate_limit",
      message: "rate limit",
      status: 429,
    })?.kind,
    "THROTTLED",
  );
  const genericRegistrationThrottle = classifySignUpResult(
    { user: null, session: null },
    {
      code: "over_request_rate_limit",
      message: "rate limit",
      status: 429,
    },
  );
  assert.equal(genericRegistrationThrottle.outcome, "THROTTLED");
  assert.doesNotMatch(genericRegistrationThrottle.message, /email/u);
  assert.equal(
    classifySignUpResult(
      { user: null, session: null },
      {
        code: "user_already_exists",
        message: "conflicting malformed response",
        status: 429,
      },
    ).outcome,
    "THROTTLED",
  );
  for (const operation of [
    "PASSWORD_LOGIN",
    "VERIFY_EMAIL_OTP",
    "REFRESH_SESSION",
  ] as const) {
    assert.equal(
      classifyAuthThrottle(operation, {
        code: "over_email_send_rate_limit",
        status: 429,
      })?.kind,
      "THROTTLED",
    );
  }
});

test("unknown and malformed auth errors fail safely without exposing internals", () => {
  assert.equal(classifyAuthThrottle("SIGN_UP", null), null);
  assert.equal(
    classifyAuthThrottle("SIGN_UP", {
      code: 429,
      message: { raw: "provider detail" },
      status: "429",
    }),
    null,
  );

  const neutral = classifyAuthThrottle("SIGN_UP", {
    status: 429,
    message: "proxy throttle",
  });
  assert.equal(neutral?.kind, "THROTTLED");
  assert.doesNotMatch(authThrottleMessage(neutral!), /email|proxy/u);
});

test("auth submission gate blocks repeated starts until the pending request finishes", () => {
  const gate = createAuthSubmissionGate();
  assert.equal(gate.tryStart(), true);
  assert.equal(gate.tryStart(), false);
  gate.reset();
  assert.equal(gate.tryStart(), true);
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

test("auth forms combine pending UI state with a synchronous submission gate", () => {
  for (const path of [
    "app/register/page.tsx",
    "app/login/page.tsx",
    "app/forgot-password/page.tsx",
  ]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /if \(isPending/u, path);
    assert.match(source, /submissionGateRef[.]current[.]tryStart\(\)/u, path);
    assert.match(source, /submissionGateRef[.]current[.]reset\(\)/u, path);
    assert.match(source, /disabled=\{isPending\}/u, path);
  }
});

test("login and password reset use operation-aware server classification without retries", () => {
  const login = readFileSync("app/login/actions.ts", "utf8");
  const reset = readFileSync("app/forgot-password/actions.ts", "utf8");

  assert.match(login, /classifyAuthThrottle\("PASSWORD_LOGIN"/u);
  assert.match(reset, /classifyAuthThrottle\("PASSWORD_RESET_EMAIL"/u);
  assert.doesNotMatch(`${login}\n${reset}`, /setTimeout|retry|console[.]/iu);
  assert.match(
    reset,
    /return \{ ok: true, message: genericMessage \};/u,
    "password reset must preserve its account-enumeration-safe public response",
  );
});
