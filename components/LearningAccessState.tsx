import { Button } from "@/components/Button";

type LearningAccessStateProps = {
  kind: "FORBIDDEN" | "GRADE" | "UNAVAILABLE" | "NOT_FOUND";
};

const content: Record<
  LearningAccessStateProps["kind"],
  { eyebrow: string; title: string; description: string }
> = {
  FORBIDDEN: {
    eyebrow: "Không có quyền truy cập",
    title: "Khu vực học thật chỉ dành cho tài khoản Học sinh.",
    description:
      "Tài khoản Phụ huynh không thể mở bài học, lượt luyện tập hoặc lời giải của học sinh khi chưa có kết nối an toàn.",
  },
  GRADE: {
    eyebrow: "Nội dung chưa phù hợp",
    title: "Bài học này không thuộc lớp hiện tại của em.",
    description:
      "PLAVE giữ nguyên lớp trong hồ sơ để bảo vệ lộ trình và kết quả học. Em hãy chọn bài trong chương trình của mình.",
  },
  UNAVAILABLE: {
    eyebrow: "Dữ liệu chưa sẵn sàng",
    title: "Chưa thể mở nội dung học lúc này.",
    description:
      "Không có dữ liệu riêng tư nào được hiển thị. Em hãy thử lại sau.",
  },
  NOT_FOUND: {
    eyebrow: "Không tìm thấy",
    title: "Lượt học này không tồn tại hoặc em không có quyền xem.",
    description:
      "PLAVE chỉ mở dữ liệu của chính tài khoản đang đăng nhập.",
  },
};

export function LearningAccessState({ kind }: LearningAccessStateProps) {
  const state = content[kind];

  return (
    <section className="content-page page-shell">
      <p className="eyebrow">{state.eyebrow}</p>
      <h1>{state.title}</h1>
      <p>{state.description}</p>
      <div className="page-actions">
        <Button href={kind === "GRADE" ? "/lessons" : "/dashboard"}>
          {kind === "GRADE" ? "Xem bài đúng lớp" : "Về Tổng quan"}
        </Button>
      </div>
    </section>
  );
}
