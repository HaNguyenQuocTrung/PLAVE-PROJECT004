import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GET } from "../app/api/health/live/route.ts";

test("application liveness is public, side-effect free and detail-minimal", async () => {
  const response = await GET();
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "ok\n");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");

  const source = readFileSync("app/api/health/live/route.ts", "utf8");
  assert.doesNotMatch(source, /process[.]env|supabase|database|provider|fetch\(|hostname|commit/iu);
  assert.doesNotMatch(source, /POST|PUT|PATCH|DELETE/u);
});
