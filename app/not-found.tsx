import { Button } from "@/components/Button";

export default function NotFound() {
  return (
    <section className="content-page page-shell">
      <p className="eyebrow">Không tìm thấy trang</p>
      <h1>Đường dẫn này không còn sẵn sàng.</h1>
      <p>
        Nội dung có thể đã được chuyển hoặc tài khoản của em không có quyền
        mở. Hãy quay lại khu vực phù hợp để tiếp tục.
      </p>
      <div className="page-actions">
        <Button href="/dashboard">Về Tổng quan</Button>
        <Button href="/lessons" variant="secondary">
          Xem bài học
        </Button>
      </div>
    </section>
  );
}
