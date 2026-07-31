import { Button } from "@/components/Button";
import { LessonCard } from "@/components/LessonCard";
import { getPublicAuthState } from "@/lib/auth/public-state";

const pillars = [
  {
    number: "01",
    title: "Lộ trình phù hợp với từng học sinh",
    description:
      "PLAVE hướng tới giúp mỗi em học theo tốc độ và mức độ hiểu của riêng mình.",
  },
  {
    number: "02",
    title: "Lời giải từng bước, dễ hiểu",
    description:
      "Mỗi câu hỏi đều đi cùng cách suy nghĩ rõ ràng để học sinh hiểu vì sao đáp án đúng.",
  },
  {
    number: "03",
    title: "Theo dõi năng lực và tiến bộ",
    description:
      "Kết quả từng lượt học được lưu riêng, giúp học sinh nhìn lại phần đã vững và phần cần ôn.",
  },
  {
    number: "04",
    title: "Hướng tới chương trình giáo dục Việt Nam",
    description:
      "Nội dung được phát triển theo từng khối lớp, với mục tiêu bám sát nhu cầu học tập tại Việt Nam.",
  },
] as const;

export default async function HomePage() {
  const { authenticated } = await getPublicAuthState();

  return (
    <>
      <section className="hero page-shell">
        <div className="hero__content">
          <p className="eyebrow">
            PLAVE · Personalized Learning App for Vietnam Education
          </p>
          <h1>
            Học Toán theo
            <span> nhịp riêng của em</span>
          </h1>
          <p className="hero__lead">
            PLAVE là ứng dụng học tập cá nhân hóa dành cho học sinh Việt Nam từ
            6–15 tuổi, giúp mỗi em xây dựng nền tảng Toán học theo tốc độ và khả
            năng của riêng mình.
          </p>
          <div className="hero__actions">
            {authenticated ? (
              <Button href="/dashboard">Tiếp tục học</Button>
            ) : (
              <>
                <Button href="/demo">Học thử miễn phí</Button>
                <Button href="/register" variant="secondary">
                  Tạo tài khoản
                </Button>
              </>
            )}
          </div>
          <p className="hero__note">
            Bắt đầu từ một bài học ngắn, luyện tập theo nhịp phù hợp và xem
            lời giải rõ ràng sau từng câu.
          </p>
        </div>
        <div
          className="hero__visual"
          role="img"
          aria-label="Minh hoạ hành trình học Toán theo từng bước"
        >
          <div className="number-cloud" aria-hidden="true">
            <span>1</span>
            <span>4</span>
            <span>7</span>
            <span>10</span>
          </div>
          <div className="hero__lesson">
            <p>Bài học Toán lớp 1</p>
            <strong>Các số trong phạm vi 10</strong>
            <span>Học bài · Luyện tập · Xem tiến bộ</span>
          </div>
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="pillars-title">
        <div className="page-shell">
          <div className="section-heading">
            <p className="eyebrow">Bốn trụ cột của PLAVE</p>
            <h2 id="pillars-title">Mỗi học sinh cần một cách học vừa sức</h2>
            <p>
              PLAVE chuyển mục tiêu giáo dục thành bài học, bài tập, tiến độ và
              phản hồi dễ hiểu trong từng buổi học.
            </p>
          </div>
          <div className="learning-grid">
            {pillars.map((pillar) => (
              <article key={pillar.number}>
                <span>{pillar.number}</span>
                <h3>{pillar.title}</h3>
                <p>{pillar.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="brand-story page-shell" aria-labelledby="vision-title">
        <div>
          <p className="eyebrow">Từ hiểu bài đến tiến bộ thật</p>
          <h2 id="vision-title">Không phải một cách dạy cho tất cả</h2>
        </div>
        <div className="brand-story__content">
          <p>
            PLAVE hướng tới xây dựng mô hình năng lực học sinh có thể giải thích
            được, để mỗi gợi ý học tập đều có lý do rõ ràng.
          </p>
          <p>
            Hỗ trợ học tập bằng AI đang được phát triển theo hướng giải thích và
            đồng hành, không chỉ đưa đáp án. Những tính năng này chưa được xem là
            đã hoàn thiện trong phiên bản hiện tại.
          </p>
        </div>
      </section>

      <section className="section page-shell">
        <LessonCard
          eyebrow="Bài học đang có"
          title="Đếm, đọc, viết và cấu tạo số trong phạm vi 10"
          description="Một bài học lớp 1 với phần lý thuyết ngắn, 24 câu luyện tập và lời giải từng bước."
        >
          <Button href={authenticated ? "/lessons" : "/demo"}>
            {authenticated ? "Mở bài học" : "Học thử miễn phí"}
          </Button>
        </LessonCard>
      </section>

      <section className="closing-cta page-shell">
        <div>
          <p className="eyebrow">Bắt đầu từ hôm nay</p>
          <h2>Một bước nhỏ, hiểu chắc hơn mỗi ngày.</h2>
        </div>
        <Button href={authenticated ? "/dashboard" : "/register"}>
          {authenticated ? "Tiếp tục học" : "Tạo tài khoản"}
        </Button>
      </section>
    </>
  );
}
