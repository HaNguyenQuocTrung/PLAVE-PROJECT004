import { strict as assert } from "node:assert";
import test from "node:test";

import {
  SAFE_DUMP_REASONS,
  classifySupabaseDumpFailure,
} from "../scripts/lib/supabase-dump-errors.mjs";

const cases = [
  ["password authentication failed", "ROLES", "AUTH_FAILED"],
  [
    "password reset is still propagating",
    "ROLES",
    "PASSWORD_PROPAGATION_PENDING",
  ],
  ["lookup host: no such host", "SCHEMA", "DNS_FAILED"],
  ["connection timed out", "DATA", "CONNECTION_TIMEOUT"],
  ["TLS error during handshake", "ROLES", "SSL_FAILED"],
  [
    "Cannot connect to the Docker daemon",
    "ROLES",
    "DOCKER_UNAVAILABLE",
  ],
  ["permission denied for relation", "ROLES", "PERMISSION_DENIED"],
  [
    "this command requires a newer version",
    "PREFLIGHT",
    "CLI_VERSION_UNSUPPORTED",
  ],
  ["unknown flag: --role-only", "ROLES", "ROLE_DUMP_UNSUPPORTED"],
  ["sensitive raw detail with no known marker", "ROLES", "UNKNOWN"],
];

test("safe dump failure classifier returns only allowlisted reasons", () => {
  for (const [diagnostic, stage, expected] of cases) {
    const actual = classifySupabaseDumpFailure(diagnostic, stage);
    assert.equal(actual, expected);
    assert.equal(SAFE_DUMP_REASONS.includes(actual), true);
    assert.equal(actual.includes(diagnostic), false);
  }
});

test("role-only unsupported marker is not applied to another stage", () => {
  assert.equal(
    classifySupabaseDumpFailure("unknown flag: --role-only", "SCHEMA"),
    "UNKNOWN",
  );
});
