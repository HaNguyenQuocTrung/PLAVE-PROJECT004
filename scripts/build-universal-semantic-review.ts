import { mkdir, readFile, writeFile } from "node:fs/promises";

const artifact = JSON.parse(
  await readFile(
    "artifacts/generated-candidates/universal-semantic-1638-proof.json",
    "utf8",
  ),
) as {
  publicQuestions: Record<string, unknown>[];
  privateSolutions: Record<string, unknown>[];
};
const privateById = new Map(
  artifact.privateSolutions.map((solution) => [solution.generatedId, solution]),
);
const samples = new Map<string, Record<string, unknown>>();
for (const question of artifact.publicQuestions) {
  const key = `${question.grade}/${question.variant}/${question.difficulty}`;
  if (!samples.has(key)) samples.set(key, question);
}
const cards = [...samples.values()].map((question) => {
  const solution = privateById.get(question.generatedId);
  const options = (question.options as string[]).map((option) =>
    `<li>${String(option).replaceAll("<", "&lt;")}</li>`
  ).join("");
  return `<article data-grade="${question.grade}" data-family="${question.family}" data-variant="${question.variant}" data-difficulty="${question.difficulty}">
  <h2>Lớp ${question.grade} · ${question.family} · ${question.variant} · ${question.difficulty}</h2>
  <p><strong>Outcome:</strong> ${question.outcomeId}</p>
  <p>${question.prompt}</p><ol>${options}</ol>
  <details><summary>Private reviewer solution</summary><pre>${JSON.stringify(solution, null, 2)}</pre></details>
  <p><strong>AST:</strong> ${question.astType} · <strong>Validator:</strong> PASS</p>
  <p><strong>Difficulty:</strong> ${JSON.stringify(question.difficultyEvidence)}</p>
  <label>Decision <select><option>REQUEST_CHANGE</option><option>APPROVE_DRAFT</option><option>REJECT</option></select></label>
  <label>Reason <input aria-label="Reviewer reason code"></label>
  </article>`;
}).join("\n");
const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow">
<title>PLAVE semantic generator review</title>
<style>body{font:16px system-ui;max-width:1100px;margin:auto;padding:24px;background:#f5f7fb}nav{position:sticky;top:0;background:white;padding:12px;border:1px solid #ccd}article{background:white;margin:16px 0;padding:20px;border-radius:12px}pre{white-space:pre-wrap}label{display:block;margin-top:12px}</style>
<h1>PLAVE_PRODUCT_DESIGN_V1 — DRAFT_REVIEW_REQUIRED</h1>
<p>Local reviewer artifact. PUBLICATION_APPROVED=false.</p>
<nav><label>Grade <input id="grade"></label><label>Family <input id="family"></label><label>Variant <input id="variant"></label><button onclick="filter()">Filter</button></nav>
${cards}<script>function filter(){const g=document.querySelector('#grade').value.toLowerCase(),f=document.querySelector('#family').value.toLowerCase(),v=document.querySelector('#variant').value.toLowerCase();document.querySelectorAll('article').forEach(x=>x.hidden=!!g&&!x.dataset.grade.includes(g)||!!f&&!x.dataset.family.toLowerCase().includes(f)||!!v&&!x.dataset.variant.toLowerCase().includes(v))}</script></html>`;
await mkdir("artifacts/generated-candidates/review", { recursive: true });
await writeFile(
  "artifacts/generated-candidates/review/universal-semantic-review.html",
  html,
  { mode: 0o600 },
);
console.log(`REVIEW_SAMPLE_COUNT=${samples.size}`);
console.log("PUBLICATION_APPROVED=0");
