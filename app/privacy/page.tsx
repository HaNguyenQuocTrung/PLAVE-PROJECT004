export const metadata = {
  title: "Quyền riêng tư",
};

export default function PrivacyPage() {
  return (
    <section className="content-page page-shell">
      <p className="eyebrow">Quyền riêng tư</p>
      <h1>Quyền riêng tư của học sinh luôn được ưu tiên.</h1>
      <p>
        Supabase Auth quản lý tài khoản và mật khẩu. PLAVE chỉ ghi nhớ email trên
        thiết bị khi người dùng chủ động chọn; mật khẩu không được lưu trong bảng
        dữ liệu ứng dụng hoặc localStorage.
      </p>
      <p>
        Hồ sơ Học sinh có thể lưu tên, lớp và ngày sinh tùy chọn. Ngày sinh được
        giữ riêng tư. Phụ huynh chưa thể xem dữ liệu của học sinh khi chưa có cơ
        chế kết nối và chấp thuận an toàn.
      </p>
    </section>
  );
}
