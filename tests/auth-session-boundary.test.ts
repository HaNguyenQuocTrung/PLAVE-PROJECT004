import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AUTH_REQUEST_STATE_HEADER,
  createAuthFailureCircuit,
  getSupabaseAuthStorageKey,
  inspectSupabaseAuthCookie,
  readAuthRequestState,
} from "../lib/auth/session-boundary.ts";
import { createSupabaseFailSafeFetch } from "../lib/supabase/auth-fetch.ts";

const syntheticUrl = "http://127.0.0.1:59999";
const storageKey = "sb-127-auth-token";

function encodeSession(overrides: Record<string, unknown> = {}) {
  const value = JSON.stringify({
    access_token: "synthetic-access-token",
    refresh_token: "synthetic-refresh-token",
    expires_at: 1,
    ...overrides,
  });
  return `base64-${Buffer.from(value).toString("base64url")}`;
}

test("auth cookie inventory derives the SDK storage key and ignores unrelated storage", () => {
  assert.equal(getSupabaseAuthStorageKey(syntheticUrl), storageKey);
  assert.deepEqual(
    inspectSupabaseAuthCookie(
      [
        { name: "unrelated", value: "keep" },
        { name: `${storageKey}-code-verifier`, value: "keep" },
      ],
      syntheticUrl,
    ),
    { kind: "ABSENT", names: [] },
  );
});

test("valid raw, encoded and contiguous chunked sessions are recognized without exposing values", () => {
  const encoded = encodeSession();
  const raw = Buffer.from(encoded.slice("base64-".length), "base64url").toString();
  assert.equal(
    inspectSupabaseAuthCookie([{ name: storageKey, value: raw }], syntheticUrl).kind,
    "PRESENT",
  );
  assert.equal(
    inspectSupabaseAuthCookie([{ name: storageKey, value: encoded }], syntheticUrl).kind,
    "PRESENT",
  );
  const splitAt = Math.floor(encoded.length / 2);
  assert.equal(
    inspectSupabaseAuthCookie(
      [
        { name: `${storageKey}.1`, value: encoded.slice(splitAt) },
        { name: `${storageKey}.0`, value: encoded.slice(0, splitAt) },
      ],
      syntheticUrl,
    ).kind,
    "PRESENT",
  );
});

test("malformed, partial, mixed and duplicate auth cookies fail closed", () => {
  const cases = [
    [{ name: storageKey, value: "base64-not-json" }],
    [{ name: storageKey, value: JSON.stringify({ access_token: "only-one-field" }) }],
    [{ name: `${storageKey}.1`, value: encodeSession() }],
    [
      { name: storageKey, value: encodeSession() },
      { name: `${storageKey}.0`, value: encodeSession() },
    ],
    [
      { name: `${storageKey}.0`, value: "base64-a" },
      { name: `${storageKey}.0`, value: "b" },
    ],
  ];
  for (const cookies of cases) {
    assert.equal(inspectSupabaseAuthCookie(cookies, syntheticUrl).kind, "MALFORMED");
  }
});

test("request state accepts only proxy-owned finite values", () => {
  for (const value of ["ANONYMOUS", "RECOVERED", "UNAVAILABLE"] as const) {
    assert.equal(readAuthRequestState(new Headers([[AUTH_REQUEST_STATE_HEADER, value]])), value);
  }
  assert.equal(
    readAuthRequestState(new Headers([[AUTH_REQUEST_STATE_HEADER, "AUTHENTICATED"]])),
    null,
  );
});

test("auth network failures become one sanitized non-retryable response", async () => {
  let attempts = 0;
  const boundary = createSupabaseFailSafeFetch({
    authTimeoutMs: 50,
    fetchImpl: async () => {
      attempts += 1;
      throw new Error("synthetic-sensitive-marker");
    },
  });
  const response = await boundary.fetch(
    `${syntheticUrl}/auth/v1/token?grant_type=refresh_token`,
    { method: "POST", body: "synthetic-secret-body" },
  );
  const serialized = await response.text();
  assert.equal(attempts, 1);
  assert.equal(response.status, 400);
  assert.equal(boundary.didTransientAuthFailure(), true);
  assert.match(serialized, /plave_auth_temporarily_unavailable/u);
  assert.doesNotMatch(serialized, /synthetic-sensitive-marker|synthetic-secret-body/u);
});

test("auth timeout and transient HTTP responses are bounded while definitive errors pass through", async () => {
  let aborted = false;
  const timed = createSupabaseFailSafeFetch({
    authTimeoutMs: 10,
    fetchImpl: async (_input, init) =>
      await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => {
            aborted = true;
            reject(new Error("aborted"));
          },
          { once: true },
        );
      }),
  });
  const started = Date.now();
  const timeoutResponse = await timed.fetch(`${syntheticUrl}/auth/v1/user`);
  assert.equal(timeoutResponse.status, 400);
  assert.equal(aborted, true);
  assert.ok(Date.now() - started < 500);

  for (const status of [429, 503]) {
    const transient = createSupabaseFailSafeFetch({
      authTimeoutMs: 50,
      fetchImpl: async () => new Response("upstream", { status }),
    });
    assert.equal((await transient.fetch(`${syntheticUrl}/auth/v1/user`)).status, 400);
    assert.equal(transient.didTransientAuthFailure(), true);
  }

  const definitive = createSupabaseFailSafeFetch({
    authTimeoutMs: 50,
    fetchImpl: async () => new Response("invalid", { status: 401 }),
  });
  assert.equal((await definitive.fetch(`${syntheticUrl}/auth/v1/user`)).status, 401);
  assert.equal(definitive.didTransientAuthFailure(), false);
});

test("non-auth requests retain normal failures and never become auth recovery", async () => {
  const boundary = createSupabaseFailSafeFetch({
    authTimeoutMs: 50,
    requestTimeoutMs: 50,
    fetchImpl: async () => {
      throw new Error("database unavailable");
    },
  });
  await assert.rejects(boundary.fetch(`${syntheticUrl}/rest/v1/profiles`), /database unavailable/u);
  assert.equal(boundary.didTransientAuthFailure(), false);
});

test("auth outage circuit bounds repeated checks and emits one identity-free diagnostic", () => {
  let now = 1_000;
  const logs: string[] = [];
  const circuit = createAuthFailureCircuit(500, () => now);
  assert.equal(circuit.isOpen(), false);
  assert.equal(circuit.markUnavailable((message) => logs.push(message)), true);
  assert.equal(circuit.isOpen(), true);
  assert.equal(circuit.markUnavailable((message) => logs.push(message)), false);
  assert.equal(logs.length, 1);
  assert.doesNotMatch(logs[0] ?? "", /cookie|token|email|uuid|synthetic-secret/iu);
  now += 501;
  assert.equal(circuit.isOpen(), false);
  assert.equal(circuit.markUnavailable((message) => logs.push(message)), true);
  circuit.markAvailable();
  assert.equal(circuit.isOpen(), false);
});

test("proxy and public layout enforce fast anonymous, scoped recovery and protected fail-closed behavior", () => {
  const proxy = readFileSync(new URL("../lib/supabase/proxy.ts", import.meta.url), "utf8");
  const publicState = readFileSync(new URL("../lib/auth/public-state.ts", import.meta.url), "utf8");
  const navigation = readFileSync(new URL("../lib/auth/navigation.ts", import.meta.url), "utf8");
  const header = readFileSync(new URL("../components/PublicHeader.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(proxy, /authCookie\.kind === "ABSENT".*anonymousDecision\("ANONYMOUS"\)/su);
  assert.match(proxy, /authCookie\.kind === "MALFORMED".*anonymousDecision\("RECOVERED"\)/su);
  assert.match(proxy, /if \(authFetch\.didTransientAuthFailure\(\)\) return;/u);
  assert.match(proxy, /loginRedirect\("auth-unavailable"\)/u);
  assert.match(publicState, /requestState === "UNAVAILABLE"/u);
  assert.match(navigation, /!authenticated[\s\S]*protectedPaths/u);
  assert.match(header, /className="auth-session-notice" role="status"/u);
  assert.match(css, /\.auth-session-notice/u);
  assert.doesNotMatch(css, /\.auth-session-notice[\s\S]{0,300}(?:position:\s*fixed|pointer-events)/u);
});
