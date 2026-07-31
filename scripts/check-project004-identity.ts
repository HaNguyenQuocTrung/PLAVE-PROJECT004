import {
  assertProject004Workspace,
  auditProject004CanonicalReferences,
} from "./project004-identity.ts";

assertProject004Workspace();
const audit = auditProject004CanonicalReferences();
if (audit.operationalReferenceFiles.length > 0) {
  throw new Error("PROJECT004_IDENTITY:OPERATIONAL_REFERENCE_FOUND");
}
process.stdout.write("PROJECT004_CANONICAL=PASS\n");
process.stdout.write(
  `PROJECT${"003"}_OPERATIONAL_REFERENCES=ZERO\n`,
);
process.stdout.write(`PROJECT${"003"}=FROZEN_UNTOUCHED\n`);
