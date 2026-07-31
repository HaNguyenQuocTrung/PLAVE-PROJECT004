import { AdaptiveOnDemandStartButton } from "@/components/AdaptiveOnDemandStartButton";

export function GeneratedPracticePilotCard({ compact = false }: Readonly<{
  compact?: boolean;
}>) {
  return (
    <section
      className={`student-summary generated-practice-pilot-card${compact ? " generated-practice-pilot-card--compact" : ""}`}
      aria-labelledby="generated-practice-pilot-title"
    >
      <div>
        <p className="eyebrow">Thử nghiệm riêng trên thiết bị này</p>
        <h2 id="generated-practice-pilot-title">
          Luyện tập được tạo theo năng lực
        </h2>
        <p>
          Câu hỏi được tạo và kiểm tra trên máy chủ theo đúng lớp và tiến độ
          hiện có của em. Lượt làm được tự động lưu để em tiếp tục an toàn.
        </p>
      </div>
      <AdaptiveOnDemandStartButton />
    </section>
  );
}
