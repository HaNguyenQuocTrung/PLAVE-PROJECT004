export const VIETNAMESE_CHARACTER =
  /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/iu;

export function compactPresentationText(
  value: string | null | undefined,
) {
  return value?.trim().replace(/\s+/gu, " ") ?? "";
}

export function isVietnameseEvidenceText(
  value: string | null | undefined,
) {
  const candidate = compactPresentationText(value);
  return candidate.length >= 2 && VIETNAMESE_CHARACTER.test(candidate);
}

const MAX_STUDENT_TITLE_LENGTH = 110;
const MIN_BOUNDARY_LENGTH = 48;

function trimTerminalPunctuation(value: string) {
  return value.replace(/[.;:,]+$/u, "").trimEnd();
}

/**
 * Produces a compact display title by excerpting canonical Vietnamese
 * curriculum evidence. It never translates an identifier or invents a new
 * educational claim.
 */
export function titleFromCanonicalVietnameseEvidence(
  value: string | null | undefined,
) {
  const candidate = compactPresentationText(value);
  if (!isVietnameseEvidenceText(candidate)) return null;
  if (candidate.length <= MAX_STUDENT_TITLE_LENGTH) {
    return trimTerminalPunctuation(candidate);
  }

  const bounded = candidate.slice(0, MAX_STUDENT_TITLE_LENGTH + 1);
  const strongBoundaries = [...bounded.matchAll(/[.;:](?=\s|$)/gu)]
    .map((match) => match.index)
    .filter((index): index is number => index >= MIN_BOUNDARY_LENGTH);
  const commaBoundaries = [...bounded.matchAll(/,(?=\s|$)/gu)]
    .map((match) => match.index)
    .filter((index): index is number => index >= MIN_BOUNDARY_LENGTH);
  const boundary = strongBoundaries.at(-1) ?? commaBoundaries.at(-1);
  if (boundary !== undefined) {
    return trimTerminalPunctuation(candidate.slice(0, boundary));
  }

  const wordBoundary = candidate
    .slice(0, MAX_STUDENT_TITLE_LENGTH - 1)
    .lastIndexOf(" ");
  const end = wordBoundary >= MIN_BOUNDARY_LENGTH
    ? wordBoundary
    : MAX_STUDENT_TITLE_LENGTH - 1;
  return `${trimTerminalPunctuation(candidate.slice(0, end))}…`;
}
