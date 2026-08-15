import assert from "node:assert/strict";

const origin = process.argv[2] ?? "http://127.0.0.1:3100";
const parsedOrigin = new URL(origin);
assert.equal(parsedOrigin.protocol, "http:");
assert.equal(parsedOrigin.hostname, "127.0.0.1");
assert.equal(parsedOrigin.port, "3100");

async function request(path: string) {
  return fetch(new URL(path, parsedOrigin), {
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(8_000),
  });
}

const live = await request("/api/health/live");
assert.equal(live.status, 200);
assert.equal(await live.text(), "ok\n");
assert.equal(live.headers.get("cache-control"), "no-store");

const root = await request("/");
assert.equal(root.status, 200);

const login = await request("/login");
assert.equal(login.status, 200);

const dashboard = await request("/dashboard");
assert.ok([302, 303, 307, 308].includes(dashboard.status));
const location = dashboard.headers.get("location");
assert.ok(location);
const redirect = new URL(location, parsedOrigin);
assert.equal(redirect.pathname, "/login");
assert.equal(redirect.searchParams.get("next"), "/dashboard");

process.stdout.write(
  "DOCKER_RUNTIME_HTTP=PASS root=200 login=200 dashboard=FAIL_CLOSED_REDIRECT live=200\n",
);
