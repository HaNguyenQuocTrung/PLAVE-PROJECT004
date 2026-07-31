import { strict as assert } from "node:assert";
import { readFileSync, realpathSync } from "node:fs";
import test from "node:test";

test("macOS canonical /tmp restore workdir remains inside the disposable boundary", () => {
  const restorePrefix = `${realpathSync("/tmp")}/plave-6gc-restore.`;
  const canonicalWorkdir = `${realpathSync("/tmp")}/plave-6gc-restore.fixture`;

  assert.equal(canonicalWorkdir.startsWith(restorePrefix), true);
  assert.equal("/private/tmp/unrelated.fixture".startsWith(restorePrefix), false);
});

test("restore wraps local default-privilege reconciliation in one transaction", () => {
  const source = readFileSync(
    "scripts/restore-supabase-dev-local.sh",
    "utf8",
  );

  assert.match(source, /--single-transaction/u);
  assert.match(
    source,
    /alter default privileges for role supabase_admin in schema public revoke all on tables from anon, authenticated, service_role;/u,
  );
  assert.match(
    source,
    /alter default privileges for role supabase_admin in schema public grant all on tables to postgres, anon, authenticated, service_role;/u,
  );
  assert.ok(
    source.indexOf("revoke all on tables") <
      source.indexOf('--file "${backup_dir}/schema.sql"'),
  );
  assert.ok(
    source.indexOf("grant all on tables") >
      source.indexOf('--file "${backup_dir}/data.sql"'),
  );
  assert.ok(
    source.indexOf("create trigger on_auth_user_created") >
      source.indexOf('--file "${backup_dir}/data.sql"'),
  );
});
