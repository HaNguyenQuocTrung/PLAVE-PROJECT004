import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("official GDPT extraction is page-complete and deterministic", async () => {
  const receipt = JSON.parse(await readFile("artifacts/official-gdpt-source/extraction-receipt.json", "utf8"));
  assert.equal(receipt.pageCount ?? receipt.pages.length, 123);
  assert.ok(receipt.pages[0].normalizedPageText.length > 0);
  assert.match(receipt.pages[0].normalizedPageText, /BỘ\s+GIÁO\s+DỤC\s+VÀ\s+ĐÀO\s+TẠO/i);
  assert.equal(receipt.pages.length, 123);
  assert.ok(receipt.pages.every((p: { normalizedPageText: string }) => p.normalizedPageText.length > 0));
  assert.deepEqual(receipt.passes[0], receipt.passes[1]);
  assert.equal(receipt.validation.deterministic, true);
});
