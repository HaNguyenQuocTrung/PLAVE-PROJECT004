export function SkyMathJourney() {
  return (
    <div className="sky-math-journey" role="img" aria-label="Lộ trình học Toán từ bài học đến tiến bộ">
      <svg viewBox="0 0 620 470" aria-hidden="true">
        <defs>
          <linearGradient id="plave-path" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#64C8F4" />
            <stop offset="1" stopColor="#1768E5" />
          </linearGradient>
        </defs>
        <path className="sky-math-journey__orbit" d="M70 330C150 140 350 80 555 165" />
        <path className="sky-math-journey__route" d="M96 337C190 206 341 142 535 169" />
        <circle cx="98" cy="336" r="14" />
        <circle cx="314" cy="189" r="14" />
        <circle cx="535" cy="169" r="14" />
        <g className="sky-math-journey__symbols">
          <text x="67" y="128">3</text>
          <text x="184" y="91">+</text>
          <text x="357" y="91">π</text>
          <text x="503" y="82">9</text>
          <text x="446" y="285">×</text>
        </g>
      </svg>
      <div className="journey-note journey-note--lesson"><span>01</span><strong>Học rõ</strong><small>Bài vừa sức</small></div>
      <div className="journey-note journey-note--practice"><span>02</span><strong>Luyện chắc</strong><small>Phản hồi từng bước</small></div>
      <div className="journey-note journey-note--progress"><span>03</span><strong>Tiến bộ</strong><small>Gợi ý tiếp theo</small></div>
    </div>
  );
}
