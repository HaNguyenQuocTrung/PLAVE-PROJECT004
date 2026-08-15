import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import test from "node:test";

const textExtensions = new Set([
  ".cjs", ".css", ".cts", ".html", ".js", ".json", ".jsx", ".md", ".mjs",
  ".mts", ".sh", ".sql", ".ts", ".tsx", ".txt", ".yaml", ".yml",
]);

function trackedTextFiles() {
  return execFileSync("/usr/bin/git", ["ls-files", "-z"], {
    encoding: "utf8",
    env: { PATH: "/usr/bin:/bin", LC_ALL: "C", NODE_ENV: "test" },
    stdio: ["ignore", "pipe", "pipe"],
  }).split("\0").filter((path) => path && textExtensions.has(extname(path)));
}

test("submission text contains no workstation-specific Owner home path", () => {
  const exposed = trackedTextFiles().filter((path) =>
    /(?:\/Users\/[^/]+\/|[A-Za-z]:\\Users\\[^\\]+\\)/u.test(readFileSync(path, "utf8")),
  );
  assert.deepEqual(exposed, []);
});

test("README separates repository evidence from separately submitted academic artifacts", () => {
  const readme = readFileSync("README.md", "utf8");
  assert.match(readme, /Submission artifacts outside this repository/u);
  for (const artifact of ["final report", "presentation", "demonstration video", "ethics\/consent", "AI-use"]) {
    assert.match(readme, new RegExp(artifact, "iu"));
  }
  assert.match(readme, /41e8187fff26f47b8bb812e353817f7406eca77f/u);
  assert.match(readme, /31872525271/u);
});
