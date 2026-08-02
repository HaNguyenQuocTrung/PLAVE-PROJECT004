import { LoadingState, Skeleton } from "@/components/UiStates";

export default function AppLoading() {
  return (
    <section className="content-page page-shell" aria-label="Đang tải trang">
      <LoadingState />
      <Skeleton lines={4} />
    </section>
  );
}
