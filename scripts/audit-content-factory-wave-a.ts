import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import inventoryJson from "../docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json" with { type: "json" };
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { createOfficialSourceMap, officialCurriculumSource } from "../lib/content-factory/official-source-map.ts";
import { productionGradePacks } from "../lib/content-factory/packs.ts";
import type { FactoryGrade } from "../lib/content-factory/types.ts";
import { auditWaveACandidates } from "../lib/content-factory/wave-a-independent-audit.ts";

const root = process.cwd();
const sourcePath = resolve(root, officialCurriculumSource.repositoryPath);
const sourceBytes = readFileSync(sourcePath);
const sourceSha256 = createHash("sha256").update(sourceBytes).digest("hex");
if (sourceSha256 !== officialCurriculumSource.sha256) throw new Error("AUTHORITATIVE_SOURCE_HASH_MISMATCH");

const jxa = `ObjC.import("PDFKit"); ObjC.import("Foundation"); const document=$.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(${JSON.stringify(sourcePath)})); if (!document) throw new Error("PDF_OPEN_FAILED"); const pages=[]; for(let index=0;index<document.pageCount;index+=1) pages.push(ObjC.unwrap(document.pageAtIndex(index).string)||""); JSON.stringify(pages);`;
const extracted = spawnSync("osascript", ["-l", "JavaScript", "-e", jxa], {
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
  env: { PATH: process.env.PATH ?? "/usr/bin:/bin" },
});
if (extracted.status !== 0 || !extracted.stdout.trim()) throw new Error("LOCAL_PDF_TEXT_EXTRACTION_FAILED");
const pages = JSON.parse(extracted.stdout) as readonly string[];
if (pages.length !== officialCurriculumSource.pageCount) throw new Error("AUTHORITATIVE_SOURCE_PAGE_COUNT_MISMATCH");

const inventory = inventoryJson as Readonly<{
  outcomes: readonly Readonly<{
    id: string;
    grade: number;
    officialStrand: string;
    conciseParaphrase: string;
    sourceDocumentId: string;
    sourceSha256: string;
    pages: Readonly<{ start: number; end: number }>;
    mappedUnitIds: readonly string[];
  }>[];
}>;
const normalize = (value: string) => value.normalize("NFC").toLocaleLowerCase("vi").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const outcomesById = new Map(inventory.outcomes.map((outcome) => [outcome.id, outcome]));
const sourceErrors: string[] = [];
let sourceRows = 0;
let directPdfMatches = 0;
let directPdfExactMatches = 0;
let directPdfParaphraseMatches = 0;
let minimumParaphraseTokenRecall = 1;
const paraphraseStopWords = new Set("được các và của trong với theo một việc thực hiện nhận biết vận dụng làm quen có thể yêu cầu cần đạt".split(" "));
for (let grade = 2; grade <= 9; grade += 1) {
  for (const record of createOfficialSourceMap(grade as Exclude<FactoryGrade, 1>)) {
    sourceRows += 1;
    const outcome = outcomesById.get(record.officialOutcomeId);
    if (!outcome) { sourceErrors.push(`${record.officialOutcomeId}:MISSING_CANONICAL_OUTCOME`); continue; }
    if (outcome.grade !== record.grade || outcome.officialStrand !== record.mathematicalDomain || outcome.conciseParaphrase !== record.learningObjective) sourceErrors.push(`${record.officialOutcomeId}:OUTCOME_MAPPING_DRIFT`);
    if (!outcome.mappedUnitIds.includes(record.unitId)) sourceErrors.push(`${record.officialOutcomeId}:UNIT_MAPPING_DRIFT`);
    if (record.sourceClassification !== "SOURCE_VERIFIED" || record.sourceReference.documentId !== outcome.sourceDocumentId || record.sourceReference.documentSha256 !== outcome.sourceSha256) sourceErrors.push(`${record.officialOutcomeId}:SOURCE_CLAIM_DRIFT`);
    if (record.sourceReference.pages.start !== outcome.pages.start || record.sourceReference.pages.end !== outcome.pages.end) sourceErrors.push(`${record.officialOutcomeId}:PAGE_RANGE_DRIFT`);
    const declaredPages = pages.slice(outcome.pages.start - 1, outcome.pages.end).join(" ");
    const normalizedPages = normalize(declaredPages);
    const normalizedParaphrase = normalize(outcome.conciseParaphrase);
    if (normalizedPages.includes(normalizedParaphrase)) {
      directPdfMatches += 1;
      directPdfExactMatches += 1;
    } else {
      const sourceTokens = new Set(normalizedPages.split(" "));
      const evidenceTokens = [...new Set(normalizedParaphrase.split(" ").filter((token) => !paraphraseStopWords.has(token)))];
      const tokenRecall = evidenceTokens.filter((token) => sourceTokens.has(token)).length / evidenceTokens.length;
      minimumParaphraseTokenRecall = Math.min(minimumParaphraseTokenRecall, tokenRecall);
      if (evidenceTokens.length >= 4 && tokenRecall >= 0.75) {
        directPdfMatches += 1;
        directPdfParaphraseMatches += 1;
      } else sourceErrors.push(`${record.officialOutcomeId}:DIRECT_PDF_PARAPHRASE_EVIDENCE_INSUFFICIENT`);
    }
  }
}

const candidateRows = auditWaveACandidates(productionGradePacks);
const questionErrors = candidateRows.flatMap((row) => row.errors.map((error) => `G${row.grade}:${error}`));
const report = {
  schemaVersion: "plave-wave-a-independent-audit-v1",
  source: {
    documentId: officialCurriculumSource.documentId,
    sha256: sourceSha256,
    pageCount: pages.length,
    mappedRows: sourceRows,
    directPdfMatches,
    directPdfExactMatches,
    directPdfParaphraseMatches,
    minimumParaphraseTokenRecall,
    errors: sourceErrors,
  },
  candidates: candidateRows,
  totals: {
    questions: candidateRows.reduce((sum, row) => sum + row.questions, 0),
    independentlyVerified: candidateRows.reduce((sum, row) => sum + row.independentlyVerified, 0),
    errors: sourceErrors.length + questionErrors.length,
  },
  coverageTruth: "Each candidate is one bounded Wave A domain slice; no row claims complete grade or curriculum coverage.",
};
if (report.totals.questions !== 192 || report.totals.independentlyVerified !== 192 || report.totals.errors !== 0) {
  for (const error of [...sourceErrors, ...questionErrors]) console.error(error);
  throw new Error("WAVE_A_INDEPENDENT_AUDIT_FAILED");
}

const output = resolve(root, "content/grade-packs/generated");
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, "wave-a-independent-audit.json"), `${canonicalize(report)}\n`);
const markdown = [
  "# Wave A independent audit",
  "",
  `- Authoritative source rows checked on declared PDF pages: ${directPdfMatches}/${sourceRows}`,
  `- Candidate questions independently verified: ${report.totals.independentlyVerified}/${report.totals.questions}`,
  "- Coverage claim: bounded Wave A slices only; no grade is represented as curriculum-complete.",
  "",
  "| Grade | Verified | Structures | Skills | Unique answers | Candidate |",
  "|---:|---:|---:|---:|---:|---|",
  ...candidateRows.map((row) => `| ${row.grade} | ${row.independentlyVerified}/${row.questions} | ${row.promptStructures} | ${row.skillCount} | ${row.uniqueAnswers} | ${row.candidateId} |`),
  "",
  "Parameter diversity is reported separately from mathematical structure diversity. The audit does not treat 24 variations as broad curriculum coverage.",
  "",
].join("\n");
writeFileSync(resolve(output, "wave-a-independent-audit.md"), markdown);
console.log(`WAVE_A_INDEPENDENT_AUDIT source=${directPdfMatches}/${sourceRows} questions=${report.totals.independentlyVerified}/${report.totals.questions} errors=0`);
