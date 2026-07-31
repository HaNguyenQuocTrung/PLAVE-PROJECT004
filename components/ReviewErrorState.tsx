import { Button } from "@/components/Button";

type ReviewErrorStateProps = {
  retryHref: string;
};

export function ReviewErrorState({ retryHref }: ReviewErrorStateProps) {
  return (
    <section className="content-page page-shell">
      <p className="eyebrow">Kết quả tạm thời chưa tải được</p>
      <h1>PLAVE chưa thể mở kết quả đã lưu.</h1>
      <p>
        Lượt luyện tập không bị thay đổi. Em có thể thử tải lại trang hoặc quay
        về Dashboard.
      </p>
      <div className="page-actions">
        <Button href={retryHref}>Thử tải lại</Button>
        <Button href="/dashboard" variant="secondary">
          Về Dashboard
        </Button>
      </div>
    </section>
  );
}
