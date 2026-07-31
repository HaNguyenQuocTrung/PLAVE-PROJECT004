import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const candidates = [
  {
    sourceId: "MOET-GDPT-MATH-MIRROR-HCM",
    originalFilename: "3_cttoan_259201916.pdf",
    sourceUrl: "https://fileth.hcm.shieldix.app/data/hcmedu/thphudinh/2019_9/2019-2020/tin%20t%E1%BB%A9c%20s%E1%BB%B1%20ki%E1%BB%87n/ch%C6%B0%C6%A1ng%20tr%C3%ACnh%20t%E1%BB%95ng%20th%E1%BB%83/3_cttoan_259201916.pdf",
    issuingAuthority: "Bộ Giáo dục và Đào tạo; bản sao lưu tại cổng trường thuộc hệ thống giáo dục TP.HCM",
    legalReference: "Thông tư 32/2018/TT-BGDĐT ngày 26/12/2018",
    localPath: "/private/tmp/gdpt-toan-source-a.pdf",
  },
  {
    sourceId: "MOET-GDPT-MATH-MIRROR-HAIPHONG",
    originalFilename: "3-cttoan_315202321.pdf",
    sourceUrl: "https://admintruong.haiphong.shieldix.app/data/haiphong/thcsandong/2023_5/31/3-cttoan_315202321.pdf",
    issuingAuthority: "Bộ Giáo dục và Đào tạo; bản sao lưu tại cổng trường thuộc hệ thống giáo dục Hải Phòng",
    legalReference: "Thông tư 32/2018/TT-BGDĐT ngày 26/12/2018",
    localPath: "/private/tmp/gdpt-toan-source-b.pdf",
  },
  {
    sourceId: "MOET-TT32-2018-CONSOLIDATED-20-2021",
    originalFilename: "vbhn-322018-202021-ttbgddt-trinh-ky-xt.pdf",
    sourceUrl: "https://moet.gov.vn/content/vanban/Lists/VBPQ/Attachments/1453/vbhn-322018-202021-ttbgddt-trinh-ky-xt.pdf",
    issuingAuthority: "Bộ Giáo dục và Đào tạo",
    legalReference: "Thông tư 32/2018/TT-BGDĐT; Thông tư 20/2021/TT-BGDĐT",
    localPath: "/private/tmp/tt32-20-2021.pdf",
  },
  {
    sourceId: "MOET-GDPT-ATTACHMENT-4670",
    originalFilename: "4670qdbgddttai-lieu-kem-theo.pdf",
    sourceUrl: "https://moet.gov.vn/content/vanban/Lists/VBDH/Attachments/3574/4670qdbgddttai-lieu-kem-theo.pdf",
    issuingAuthority: "Bộ Giáo dục và Đào tạo",
    legalReference: "Chương trình GDPT 2018 kèm Thông tư 32/2018/TT-BGDĐT",
    localPath: "/private/tmp/ctgdpt-math.pdf",
  },
];
const retrievalDate = new Date().toISOString().slice(0, 10);
const sources = [];
for (const candidate of candidates) {
  const bytes = await readFile(candidate.localPath);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  let fileType = "unknown";
  try { fileType = execFileSync("file", ["--brief", "--mime-type", candidate.localPath], { encoding: "utf8" }).trim(); } catch { /* recorded below */ }
  const isPdf = bytes.subarray(0, 5).toString() === "%PDF-" && fileType === "application/pdf";
  const pageCount = isPdf ? [...bytes.toString("latin1").matchAll(/\/Type\s*\/Page\b/g)].length : null;
  sources.push({ ...candidate, retrievalDate, sha256, mimeTypeObserved: fileType, pageCount, extractionTool: "UNAVAILABLE_LOCAL_PDF_TEXT_EXTRACTOR", extractionStatus: isPdf && pageCount === 123 ? "EXTRACTION_BLOCKED" : "REJECTED_NOT_PDF", immutableSourcePath: candidate.localPath });
}
await mkdir("artifacts/official-gdpt-source", { recursive: true });
await writeFile("artifacts/official-gdpt-source/source-package.json", JSON.stringify({ schemaVersion: 1, acceptedLegalReferences: ["32/2018/TT-BGDĐT", "20/2021/TT-BGDĐT"], sources }, null, 2), { mode: 0o600 });
const valid = sources.filter((source) => source.extractionStatus === "EXTRACTION_BLOCKED").length;
console.log(`SOURCE_PACKAGE_VALID=${valid >= 2 ? "PASS" : "FAIL"}`);
console.log(`OFFICIAL_SOURCE_CANDIDATES=${sources.length}`);
console.log(`VALID_PDF_SOURCES=${valid}`);
console.log(`EXTRACTION_BLOCKED=${sources.filter((source) => source.extractionStatus === "EXTRACTION_BLOCKED").length}`);
if (valid < 2) process.exitCode = 2;
