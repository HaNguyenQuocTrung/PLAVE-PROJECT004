"use client";

import { Button } from "@/components/Button";

export default function AppError({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <section className="content-page page-shell" role="alert">
      <p className="eyebrow">Trang chưa sẵn sàng</p>
      <h1>PLAVE chưa thể hiển thị nội dung này.</h1>
      <p>
        Dữ liệu học tập đã lưu không bị thay đổi. Em có thể thử tải lại trang
        hoặc quay về Tổng quan.
      </p>
      <div className="page-actions">
        <Button onClick={reset}>Thử tải lại</Button>
        <Button href="/dashboard" variant="secondary">
          Về Tổng quan
        </Button>
      </div>
    </section>
  );
}
