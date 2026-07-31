import { LogoutForm } from "@/components/LogoutForm";

export function AccessDenied() {
  return (
    <section className="content-page page-shell">
      <p className="eyebrow">Không có quyền truy cập</p>
      <h1>Hồ sơ này không thể mở khu vực được bảo vệ.</h1>
      <p>
        PLAVE chỉ cho phép hồ sơ Học sinh hoặc Phụ huynh trong luồng đăng ký
        công khai. Không có dữ liệu riêng tư nào được hiển thị.
      </p>
      <LogoutForm buttonVariant="primary" />
    </section>
  );
}
