import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  buildProject004PrefixSemanticCategorySql,
  parsePrefixSemanticFingerprint,
  prefixSemanticCategories,
  prefixSemanticFingerprintVersion,
} from "../scripts/project004-prefix-semantic-fingerprint.ts";
import {
  classifySemanticFingerprintQueryFailure,
  renderDisposableProofFailure,
  renderDisposableSemanticFingerprintDiagnostic,
} from "../scripts/run-project004-clean-disposable-proof.ts";

const root = resolve(import.meta.dirname, "..");

test("category diagnostics retain exactly one production semantic branch", () => {
  for (const category of prefixSemanticCategories) {
    const sql = buildProject004PrefixSemanticCategorySql(
      category,
      root,
      40,
    );
    const body = sql.slice(
      sql.indexOf(
        "semantic_rows(category, semantic_key, payload) as (\n",
      ),
      sql.indexOf("\n),\ncategory_fingerprints as ("),
    );
    assert.match(
      body,
      new RegExp(`select\\s+'${category}',`, "u"),
    );
    assert.equal(
      prefixSemanticCategories.filter(
        (candidate) =>
          candidate !== category &&
          new RegExp(
            `select\\s+'${candidate}',`,
            "u",
          ).test(body),
      ).length,
      0,
    );
    assert.match(sql, /begin read only;/u);
    assert.doesNotMatch(sql, /\b(?:insert|update|delete)\b/iu);
  }
});

test("FUNCTION semantic branch hashes the in-scope function_row body alias", () => {
  const sql = buildProject004PrefixSemanticCategorySql(
    "FUNCTION",
    root,
    40,
  );
  const body = sql.slice(
    sql.indexOf(
      "semantic_rows(category, semantic_key, payload) as (\n",
    ),
    sql.indexOf("\n),\ncategory_fingerprints as ("),
  );
  assert.match(
    body,
    /coalesce\(function_row[.]prosrc, ''\)/u,
  );
  assert.doesNotMatch(
    body,
    /coalesce\(procedure[.]prosrc, ''\)/u,
  );
});

test("query failure classifier reports sanitized SQLSTATE and category", () => {
  assert.deepEqual(
    classifySemanticFingerprintQueryFailure(
      "ERROR:  42703: column unavailable",
      "COLUMN",
    ),
    {
      stage: "QUERY",
      component: "COLUMN",
      sqlstate: "42703",
      category: "CATALOG_COLUMN_UNAVAILABLE",
    },
  );
  assert.deepEqual(
    classifySemanticFingerprintQueryFailure(
      "ERROR:  57014: canceling statement due to statement timeout",
      "FUNCTION",
    ),
    {
      stage: "QUERY",
      component: "FUNCTION",
      sqlstate: "57014",
      category: "QUERY_TIMEOUT",
    },
  );
  assert.deepEqual(
    classifySemanticFingerprintQueryFailure(
      "ERROR:  42P01: missing FROM-clause entry",
      "FUNCTION",
    ),
    {
      stage: "QUERY",
      component: "FUNCTION",
      sqlstate: "42P01",
      category: "CATALOG_RELATION_UNAVAILABLE",
    },
  );
});

test("proof reports query and parser failures as distinct post-migration stages", () => {
  const query = renderDisposableProofFailure({
    code: "DISPOSABLE_SEMANTIC_FINGERPRINT_QUERY_FAILED",
    cleanup: "PASS",
    semanticStage: "QUERY",
    semanticComponent: "FUNCTION",
    semanticSqlstate: "42883",
    semanticFailureCategory:
      "CATALOG_FUNCTION_UNAVAILABLE",
  });
  assert.match(query, /MIGRATION_EXECUTION_STARTED=YES/u);
  assert.match(query, /MIGRATION_LAST_PASS=0040/u);
  assert.match(
    query,
    /SEMANTIC_FINGERPRINT_STAGE=QUERY/u,
  );
  assert.match(
    query,
    /SEMANTIC_FINGERPRINT_COMPONENT=FUNCTION/u,
  );

  const parser = renderDisposableProofFailure({
    code: "DISPOSABLE_SEMANTIC_FINGERPRINT_PARSER_FAILED",
    cleanup: "PASS",
    semanticStage: "PARSER",
    semanticComponent: "AGGREGATION",
    semanticSqlstate: "NONE",
    semanticFailureCategory:
      "MACHINE_OUTPUT_CONTRACT_INVALID",
  });
  assert.match(
    parser,
    /SEMANTIC_FINGERPRINT_STAGE=PARSER/u,
  );
  assert.doesNotMatch(
    parser,
    /SEMANTIC_FINGERPRINT_STAGE=QUERY/u,
  );
});

test("machine semantic output parser accepts only the complete canonical category contract", () => {
  const output = prefixSemanticCategories
    .map(
      (category) =>
        `${prefixSemanticFingerprintVersion}|${category}|0|` +
        "e3b0c44298fc1c149afbf4c8996fb924" +
        "27ae41e4649b934ca495991b7852b855",
    )
    .join("\n");
  assert.equal(
    parsePrefixSemanticFingerprint(`${output}\n`).categories
      .length,
    prefixSemanticCategories.length,
  );
  assert.throws(
    () =>
      parsePrefixSemanticFingerprint(
        `header\n${output}\n(13 rows)\n`,
      ),
    /PREFIX_SEMANTIC_OUTPUT_INVALID/u,
  );
});

test("proof semantic query uses machine psql output and diagnostic output remains aggregate-only", () => {
  const source = readFileSync(
    resolve(
      root,
      "scripts/run-project004-clean-disposable-proof.ts",
    ),
    "utf8",
  );
  assert.ok(
    source.includes(
      "buildProject004PrefixSemanticFingerprintSql(root, 40)",
    ),
  );
  assert.match(
    source,
    /buildProject004PrefixSemanticFingerprintSql\(root, 40\),\s*"SEMANTIC_FINGERPRINT",\s*undefined,\s*undefined,\s*120_000,\s*true/u,
  );
  const rendered =
    renderDisposableSemanticFingerprintDiagnostic({
      migrationBoundary: "PASS",
      query: "FAIL",
      parser: "NOT_RUN",
      canonicalization: "PASS",
      semanticDrift: "NOT_EVALUATED",
      failedComponents: ["COLUMN"],
      sqlstate: "42703",
      failureCategory: "CATALOG_COLUMN_UNAVAILABLE",
      categories: [
        {
          category: "COLUMN",
          query: "FAIL",
          parser: "NOT_RUN",
          count: "NOT_RUN",
          sqlstate: "42703",
          failureCategory:
            "CATALOG_COLUMN_UNAVAILABLE",
        },
      ],
      cleanup: "PASS",
      rootFailureCode:
        "DISPOSABLE_SEMANTIC_FINGERPRINT_QUERY_FAILED",
    });
  assert.match(
    rendered,
    /FAILED_SEMANTIC_COMPONENT=COLUMN/u,
  );
  assert.doesNotMatch(
    rendered,
    /password|token|project.ref/iu,
  );
  assert.equal(rendered.includes("://"), false);
});
