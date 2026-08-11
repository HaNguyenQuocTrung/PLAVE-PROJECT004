import { canonicalize, sha256 } from "./canonical.ts";
import { gradeOneLegacyAsset } from "./grade1-reference.ts";

export type TextLoader = (path: string) => string;

export function gradeOneSourceDigest(load: TextLoader) {
  const files = gradeOneLegacyAsset.files.map((path) => ({ path, sha256: sha256(load(path)) }));
  return { files, aggregate: sha256(canonicalize(files)), expected: gradeOneLegacyAsset.expected } as const;
}

export function assertGradeOneUnchanged(before: ReturnType<typeof gradeOneSourceDigest>, after: ReturnType<typeof gradeOneSourceDigest>) {
  if (canonicalize(before) !== canonicalize(after)) throw new Error("GRADE1_IMMUTABILITY_VIOLATION");
  return true;
}
