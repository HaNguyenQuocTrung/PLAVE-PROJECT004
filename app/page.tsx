import { Button } from "@/components/Button";
import { PlaveIcon } from "@/components/PlaveIcon";
import { SkyMathJourney } from "@/components/SkyMathJourney";
import { getPublicAuthState } from "@/lib/auth/public-state";

const pillars = [
  {
    number: "01",
    title: "Bắt đầu đúng nơi",
    description:
      "Bài học được sắp theo khối lớp, tiến độ và phần kiến thức em đang cần.",
  },
  {
    number: "02",
    title: "Hiểu qua từng bước",
    description:
      "Mỗi câu hỏi đều đi cùng cách suy nghĩ rõ ràng để học sinh hiểu vì sao đáp án đúng.",
  },
  {
    number: "03",
    title: "Nhìn thấy tiến bộ",
    description:
      "Kết quả từng lượt học được lưu riêng, giúp học sinh nhìn lại phần đã vững và phần cần ôn.",
  },
  {
    number: "04",
    title: "Toán lớp 1–9",
    description:
      "Nội dung được tổ chức theo từng khối lớp và nhu cầu học tập tại Việt Nam.",
  },
] as const;

export default async function HomePage() {
  const { authenticated } = await getPublicAuthState();

  return (
    <div className="home-v2">
      <section className="hero hero-v2 page-shell">
        <div className="hero__content">
          <p className="eyebrow">Không gian học Toán lớp 1–9</p>
          <h1>
            Hiểu Toán theo
            <span> nhịp của riêng em.</span>
          </h1>
          <p className="hero__lead">
            PLAVE giúp học sinh học bài, luyện tập và nhìn lại tiến bộ trong
            một lộ trình rõ ràng—không so sánh, không tạo áp lực.
          </p>
          <div className="hero__actions">
            {authenticated ? (
              <Button href="/dashboard">Tiếp tục học</Button>
            ) : (
              <>
                <Button href="/register">Bắt đầu với PLAVE <PlaveIcon name="arrow" /></Button>
                <Button href="/demo" variant="secondary">Xem bài học thử</Button>
              </>
            )}
          </div>
          <p className="hero__note">
            Dành cho học sinh, phụ huynh và giáo viên · Bắt đầu miễn phí
          </p>
        </div>
        <SkyMathJourney />
      </section>

      <section className="home-v2__trust" aria-label="Phạm vi sản phẩm">
        <div className="page-shell">
          <strong>Toán lớp 1–9</strong><span>•</span>
          <span>Bài học theo khối lớp</span><span>•</span>
          <span>Gợi ý có giải thích</span><span>•</span>
          <span>Tiến độ riêng tư</span>
        </div>
      </section>

      <section className="section home-v2__method" aria-labelledby="pillars-title">
        <div className="page-shell">
          <div className="section-heading">
            <p className="eyebrow">Một hành trình có định hướng</p>
            <h2 id="pillars-title">Biết mình đang ở đâu. Biết bước tiếp theo.</h2>
            <p>
              PLAVE nối bài học, luyện tập và phản hồi thành một dòng học liền
              mạch để mỗi em có thể tiến lên với sự tự tin.
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

      <section className="brand-story brand-story--v2 page-shell" aria-labelledby="vision-title">
        <div>
          <p className="eyebrow">Học theo năng lực</p>
          <h2 id="vision-title">Không có một nhịp học chung cho tất cả.</h2>
        </div>
        <div className="brand-story__content">
          <p>
            Gợi ý học tập của PLAVE dựa trên hoạt động đã có và luôn kèm lý do
            ngắn, dễ hiểu.
          </p>
          <p>
            PLAVE không gắn nhãn học sinh. Khi bằng chứng còn ít, sản phẩm nói
            rõ và khuyến khích em học thêm trước khi đưa ra gợi ý mới.
          </p>
        </div>
      </section>

      <section className="home-v2__lesson-preview page-shell" aria-labelledby="lesson-preview-title">
        <div className="home-v2__lesson-index" aria-hidden="true">01<span>→</span>09</div>
        <div>
          <p className="eyebrow">Từ nền tảng đến tự tin</p>
          <h2 id="lesson-preview-title">Một không gian học lớn lên cùng học sinh.</h2>
          <p>Giao diện rõ ràng cho học sinh nhỏ tuổi, đủ chín chắn cho học sinh lớp 8–9, và dễ theo dõi với người lớn.</p>
          <Button href={authenticated ? "/lessons" : "/demo"} variant="secondary">
            {authenticated ? "Mở lộ trình của em" : "Khám phá bài học"}
          </Button>
        </div>
      </section>

      <section className="closing-cta closing-cta--v2 page-shell">
        <div>
          <p className="eyebrow">Bắt đầu từ hôm nay</p>
          <h2>Một bước nhỏ hôm nay. Một nền tảng vững ngày mai.</h2>
        </div>
        <Button href={authenticated ? "/dashboard" : "/register"}>
          {authenticated ? "Tiếp tục học" : "Tạo tài khoản"}
        </Button>
      </section>
    </div>
  );
}
