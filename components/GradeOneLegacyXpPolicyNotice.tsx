export function GradeOneLegacyXpPolicyNotice({
  totalXp,
}: Readonly<{ totalXp: number }>) {
  return (
    <p
      className="legacy-score-label"
      data-xp-policy="LEGACY_GRADE1_RUNTIME_NOT_ELIGIBLE"
    >
      Các lượt luyện tập cố định Lớp 1 dùng chính sách cũ nên không nhận XP V1.
      Tổng {totalXp} XP chỉ bao gồm các lượt học thuộc chính sách XP V1.
    </p>
  );
}
