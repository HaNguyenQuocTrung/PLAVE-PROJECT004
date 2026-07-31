import assert from "node:assert/strict";
import test from "node:test";

import {
  assertDisposableOrphanTargets,
} from "../scripts/cleanup-generated-practice-disposable-orphans.ts";

test("orphan cleanup accepts only exact disposable PROJECT004 targets", () => {
  assert.doesNotThrow(() =>
    assertDisposableOrphanTargets({
      containers: [
        "supabase_db_plave-project004-clean-proof-123456789ab",
        "supabase_auth_plave-project004-clean-proof-123456789abc",
      ],
      networks: [
        "supabase_network_plave-project004-clean-proof-123456789ab",
      ],
    })
  );
  for (const unsafe of [
    "supabase_db_PLAVE-PROJECT004",
    "supabase_db_plave-project003-clean-proof-123456789ab",
    "supabase_studio_plave-project004-clean-proof-123456789ab",
    "bridge",
  ]) {
    assert.throws(() =>
      assertDisposableOrphanTargets({
        containers: [unsafe],
        networks: [],
      })
    );
  }
});

test("0041 proof uses a Supabase-safe 40-character project id", async () => {
  const source = await import("node:fs/promises").then(
    ({ readFile }) =>
      readFile(
        "scripts/run-generated-practice-0041-disposable-proof.ts",
        "utf8",
      ),
  );
  assert.match(source, /toString\("hex"\)[.]slice\(0, 11\)/u);
});
