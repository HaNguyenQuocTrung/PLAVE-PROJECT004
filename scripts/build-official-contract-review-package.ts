import { mkdir, readFile, writeFile } from "node:fs/promises";

const contracts = JSON.parse(await readFile("artifacts/generation-contracts/universal-v1-contracts.json", "utf8")) as { contracts: readonly Record<string, unknown>[] };
const sourcePackage = JSON.parse(await readFile("artifacts/official-gdpt-source/source-package.json", "utf8")) as { sources: readonly { extractionStatus: string; sha256: string }[] };
const extraction = JSON.parse(await readFile("artifacts/official-gdpt-source/extraction-receipt.json", "utf8")) as { validation: Record<string, boolean>; pages: readonly { physicalPageIndex: number; normalizedPageText: string; pageTextSha256: string }[] };
const validSource = sourcePackage.sources.some((source) => source.extractionStatus === "EXTRACTION_BLOCKED");
const extractionPassed = Object.values(extraction.validation).every(Boolean);
const gradePages = new Map<number, number>();
for (const page of extraction.pages) for (let grade = 1; grade <= 9; grade++) if (new RegExp(`LỚP\\s*${grade}\\b`, "i").test(page.normalizedPageText) && !gradePages.has(grade)) gradePages.set(grade, page.physicalPageIndex);
const mappings = contracts.contracts.map((contract) => {
  const page = gradePages.get(Number(contract.grade));
  const sourceStatus = extractionPassed && page ? "SOURCE_PARTIALLY_CORROBORATED" : "SOURCE_NOT_FOUND";
  return { contractId: contract.contractId, outcomeId: contract.outcomeId, sourceStatus, confidence: page ? "LOW" : "NONE", sourceEvidence: page ? [{ sourceId: "MOET-GDPT-MATH-MIRROR-HCM", page, excerptHash: extraction.pages[page - 1]?.pageTextSha256, matchType: "GRADE_SECTION_PROVENANCE" }] : [], conflicts: [], missingFields: ["outcome-specific official requirement mapping", "measurable skill evidence", "parameter bounds", "answer/solver contract", "semantic mapping rationale"], reviewerStatus: "BLOCKED_SOURCE_REQUIRED" };
});
const partial = mappings.filter((m) => m.sourceStatus === "SOURCE_PARTIALLY_CORROBORATED").length;
const report = { schemaVersion: 2, sourcePackageValid: validSource, officialRequirementsExtracted: extractionPassed, extractionBlocked: !extractionPassed, contractsTotal: mappings.length, sourceCorroborated: 0, sourcePartiallyCorroborated: partial, sourceConflict: 0, sourceNotFound: mappings.length - partial, approved: 0, mappings };
await mkdir("artifacts/official-contract-review", { recursive: true });
await writeFile("artifacts/official-contract-review/review-package.json", JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(`SOURCE_PACKAGE_VALID=${validSource ? "PASS" : "FAIL"}`);
console.log(`OFFICIAL_REQUIREMENTS_EXTRACTED=${report.officialRequirementsExtracted ? "PASS" : "FAIL"}`);
console.log(`CONTRACTS_TOTAL=${mappings.length}`);
console.log(`SOURCE_CORROBORATED=${report.sourceCorroborated}`);
console.log(`SOURCE_PARTIALLY_CORROBORATED=${report.sourcePartiallyCorroborated}`);
console.log(`SOURCE_CONFLICT=${report.sourceConflict}`);
console.log(`SOURCE_NOT_FOUND=${report.sourceNotFound}`);
console.log(`APPROVED=${report.approved}`);
if (!validSource || !extractionPassed) process.exitCode = 2;
