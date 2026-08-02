export const metadata = {
  title: "Quyền riêng tư",
};

export default function PrivacyPage() {
  return (
    <section className="content-page legal-page--v2 page-shell">
      <p className="eyebrow">Quyền riêng tư</p>
      <h1>PLAVE bảo vệ dữ liệu học tập theo vai trò và sự đồng ý.</h1>
      <h2>Dữ liệu tài khoản</h2>
      <p>
        Dịch vụ xác thực quản lý email và mật khẩu. PLAVE không lưu mật khẩu
        trong bảng dữ liệu ứng dụng hoặc bộ nhớ trình duyệt. Email chỉ được ghi
        nhớ trên thiết bị khi người dùng chủ động chọn.
      </p>
      <h2>Dữ liệu học tập</h2>
      <p>
        Hồ sơ học sinh gồm tên, lớp, ngày sinh tùy chọn, bài làm và tiến độ.
        Lớp hiện tại quyết định chương trình được mở; PLAVE không tự đổi lớp.
      </p>
      <h2>Quyền xem của phụ huynh và giáo viên</h2>
      <p>
        Phụ huynh chỉ xem phần tổng hợp sau khi học sinh đồng ý kết nối. Giáo
        viên chỉ xem dữ liệu cần thiết trong lớp và bài tập mà mình quản lý.
        Đáp án riêng tư không được mở ngoài luồng xem lại hợp lệ của học sinh.
      </p>
      <h2>Quyền kiểm soát</h2>
      <p>
        Học sinh có thể quản lý kết nối phụ huynh; giáo viên duyệt từng yêu cầu
        vào lớp. Mỗi tài khoản chỉ được mở khu vực đúng vai trò của mình.
      </p>
    </section>
  );
}
