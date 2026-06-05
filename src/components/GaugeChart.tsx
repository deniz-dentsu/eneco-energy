interface GaugeChartProps {
  value: number; // 0–100
}

const BAR_COUNT = 23;
const CX = 364/2;
const CY = 364/2;
const INNER_R = 72;
const OUTER_R = 364/2 * 0.87;
const BG_R = 364/2;
// Active bar is inset from both ends
const ACTIVE_MARGIN = 3;
const ACTIVE_INNER_R = INNER_R + ACTIVE_MARGIN;
const ACTIVE_OUTER_R = OUTER_R - ACTIVE_MARGIN;

export function GaugeChart({ value }: GaugeChartProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const filledCount = Math.round((clamped / 100) * BAR_COUNT);

  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const angle = 180 - 9 + (i / (BAR_COUNT - 1)) * (180 + 9 * 2);
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x1: CX + INNER_R * cos,
      y1: CY + INNER_R * sin,
      x2: CX + OUTER_R * cos,
      y2: CY + OUTER_R * sin,
      ax1: CX + ACTIVE_INNER_R * cos,
      ay1: CY + ACTIVE_INNER_R * sin,
      ax2: CX + ACTIVE_OUTER_R * cos,
      ay2: CY + ACTIVE_OUTER_R * sin,
      active: i < filledCount,
    };
  });

  return (
    <svg
      viewBox="0 0 364 364"
      width="100%"
      height="100%"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Dark circle background */}
      <circle cx={CX} cy={CY} r={BG_R} fill="rgba(0,0,0,0.25)" />

      {/* Base bars (always dim, full length) */}
      {bars.map((bar, i) => (
        <line
          key={i}
          x1={bar.x1} y1={bar.y1}
          x2={bar.x2} y2={bar.y2}
          stroke="rgba(255,255,255,0.20)"
          strokeWidth={10}
          strokeLinecap="round"
        />
      ))}

      {/* Active bars (white, inset inside base bars) */}
      {bars.filter(bar => bar.active).map((bar, i) => (
        <line
          key={i}
          x1={bar.ax1} y1={bar.ay1}
          x2={bar.ax2} y2={bar.ay2}
          stroke="rgba(255,255,255,0.50)"
          strokeWidth={7}
          strokeLinecap="round"
        />
      ))}

      {/* Center value */}
      <text
        x={CX}
        y={CY+10}
        textAnchor="middle"
        dominantBaseline="auto"
        fill="white"
        fontSize={36}
        fontWeight={700}
        fontFamily="Etelka, sans-serif"
      >
        {Math.round(clamped)}
      </text>
    </svg>
  );
}
