import { redirect } from "next/navigation";

import { Button } from "@/components/Button";
import { CopyStudentCode } from "@/components/CopyStudentCode";
import { LearningAccessState } from "@/components/LearningAccessState";
import { getStudentProfileView } from "@/lib/profile/server";

export const metadata = {
  title: "Hồ sơ học sinh",
};

type ProfilePageProps = {
  searchParams: Promise<{ updated?: string }>;
};

function formatBirthDate(value: string | null) {
  if (!value) return "Chưa cung cấp";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export default async function ProfilePage({
  searchParams,
}: ProfilePageProps) {
  const [result, query] = await Promise.all([
    getStudentProfileView(),
    searchParams,
  ]);

  if (!result.ok) {
    if (result.reason === "UNAUTHENTICATED") redirect("/login");
    if (result.reason === "ONBOARDING_REQUIRED") redirect("/onboarding");
    return (
      <LearningAccessState
        kind={result.reason === "ACCESS_DENIED" ? "FORBIDDEN" : "UNAVAILABLE"}
      />
    );
  }

  return (
    <div className="profile-page page-shell">
      <header className="catalog-hero profile-hero">
        <p className="eyebrow">Hồ sơ học tập</p>
        <h1>{result.profile.fullName}</h1>
        <p>
          Thông tin riêng của em được dùng để duy trì đúng tài khoản và nội
          dung học phù hợp.
        </p>
      </header>

      {query.updated === "1" ? (
        <p className="profile-update-notice" role="status">
          Hồ sơ đã được cập nhật.
        </p>
      ) : null}

      <section className="profile-card" aria-labelledby="profile-info-title">
        <div className="profile-card__heading">
          <div>
            <p className="eyebrow">Thông tin hiện tại</p>
            <h2 id="profile-info-title">Hồ sơ của em</h2>
          </div>
          <Button href="/profile/edit">Chỉnh sửa hồ sơ</Button>
        </div>
        <dl>
          <div>
            <dt>Họ và tên</dt>
            <dd>{result.profile.fullName}</dd>
          </div>
          <div>
            <dt>Vai trò</dt>
            <dd>Học sinh</dd>
          </div>
          <div>
            <dt>Lớp hiện tại</dt>
            <dd>Lớp {result.profile.grade}</dd>
          </div>
          <div>
            <dt>Ngày sinh</dt>
            <dd>{formatBirthDate(result.profile.birthDate)}</dd>
          </div>
        </dl>
      </section>

      <section
        className="profile-code-card"
        aria-labelledby="profile-code-title"
      >
        <div>
          <p className="eyebrow">Mã học sinh</p>
          <h2 id="profile-code-title">{result.profile.studentCode}</h2>
          <p>
            Chỉ chia sẻ mã này với phụ huynh hoặc người giám hộ mà em tin
            tưởng.
          </p>
        </div>
        <CopyStudentCode code={result.profile.studentCode} />
      </section>

      <div className="profile-page__actions">
        <Button href="/settings" variant="secondary">
          Cài đặt tài khoản
        </Button>
        <Button href="/dashboard" variant="quiet">
          Về Tổng quan
        </Button>
      </div>
    </div>
  );
}
