import { Button } from "@/components/Button";
import { getPublicAuthState } from "@/lib/auth/public-state";

export const metadata = {
  title: "Giới thiệu",
};

const commitments = [
  "Bài học và bài tập được trình bày bằng tiếng Việt rõ ràng, phù hợp với độ tuổi.",
  "Lời giải giúp học sinh hiểu cách suy nghĩ, không chỉ nhìn thấy đáp án.",
  "Kết quả học tập được dùng để giúp học sinh nhìn lại tiến bộ của chính mình.",
  "Nội dung hướng tới chương trình giáo dục Việt Nam và cần được kiểm tra kỹ trước khi mở rộng.",
] as const;

export default async function AboutPage() {
  const authState = await getPublicAuthState();

  return (
    <div className="about-page page-shell">
      <header className="about-hero">
        <p className="eyebrow">
          PLAVE · Personalized Learning App for Vietnam Education
        </p>
        <h1>Để mỗi học sinh được học Toán theo cách phù hợp với mình</h1>
        <p>
          PLAVE là nền tảng học Toán cá nhân hóa dành cho học sinh Việt Nam từ
          6–15 tuổi. Chúng tôi hướng tới khắc phục giới hạn của cách học “một
          phương pháp cho tất cả”, để mỗi em có thời gian hiểu bài và tiến bộ
          theo nhịp riêng.
        </p>
      </header>

      <section className="about-grid" aria-labelledby="approach-title">
        <article>
          <p className="eyebrow">Cách tiếp cận</p>
          <h2 id="approach-title">Học, luyện tập, nhận phản hồi và nhìn lại</h2>
          <p>
            PLAVE chuyển mục tiêu học tập thành những bước cụ thể: bài học ngắn,
            câu hỏi vừa sức, lời giải từng bước và lịch sử kết quả dễ theo dõi.
          </p>
        </article>
        <article>
          <p className="eyebrow">Tầm nhìn</p>
          <h2>Cá nhân hóa có thể giải thích</h2>
          <p>
            PLAVE hướng tới xây dựng mô hình năng lực minh bạch và hỗ trợ bằng
            AI theo hướng giải thích. Các khả năng thích ứng nâng cao vẫn đang
            được phát triển và chưa được quảng bá như tính năng đã hoàn thiện.
          </p>
        </article>
      </section>

      <section className="about-commitments" aria-labelledby="commitments-title">
        <div className="section-heading section-heading--compact">
          <p className="eyebrow">Điều PLAVE coi trọng</p>
          <h2 id="commitments-title">Rõ ràng, an toàn và có ích cho việc học</h2>
        </div>
        <ul>
          {commitments.map((commitment) => (
            <li key={commitment}>{commitment}</li>
          ))}
        </ul>
      </section>

      <div className="page-actions">
        {authState.authenticated ? (
          <>
            <Button
              href={
                authState.role === "TEACHER"
                  ? authState.onboardingCompleted
                    ? "/teacher"
                    : "/teacher/onboarding"
                  : "/dashboard"
              }
            >
              {authState.role === "TEACHER"
                ? "Về khu vực giáo viên"
                : "Tiếp tục học"}
            </Button>
            {authState.role === "STUDENT" ? (
              <Button href="/lessons" variant="secondary">
                Xem lý thuyết
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <Button href="/demo">Học thử</Button>
            <Button href="/register" variant="secondary">
              Tạo tài khoản
            </Button>
            <Button href="/login" variant="secondary">
              Đăng nhập
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
