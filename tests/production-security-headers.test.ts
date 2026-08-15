import assert from "node:assert/strict";
import test from "node:test";

import nextConfig from "../next.config.ts";

test("production routes receive the canonical defense-in-depth headers", async () => {
  assert.equal(typeof nextConfig.headers, "function");
  const rows = await nextConfig.headers!();
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.source, "/:path*");
  const headers = new Map(rows[0]?.headers.map(({ key, value }) => [key, value]));
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headers.get("X-Frame-Options"), "DENY");
  assert.equal(headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.match(headers.get("Content-Security-Policy") ?? "", /frame-ancestors 'none'/u);
  assert.match(headers.get("Content-Security-Policy") ?? "", /object-src 'none'/u);
  assert.equal(headers.get("Permissions-Policy"), "camera=(), microphone=(), geolocation=(), payment=()");
});
