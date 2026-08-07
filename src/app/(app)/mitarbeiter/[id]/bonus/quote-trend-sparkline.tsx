import { BONUS_PRIMARY } from "@/lib/bonus-colors";
import type { QuoteTrendPoint } from "@/lib/bonus";

const WIDTH = 110;
const HEIGHT = 32;
const PAD = 3;

export function QuoteTrendSparkline({ points }: { points: QuoteTrendPoint[] }) {
  if (points.length === 0) return null;
  const values = points.map((p) => p.quote ?? 0);
  const maxValue = Math.max(...values, 75) * 1.1;
  const chartW = WIDTH - PAD * 2;
  const chartH = HEIGHT - PAD * 2;
  const xStep = chartW / (points.length - 1 || 1);

  const x = (i: number) => PAD + i * xStep;
  const y = (v: number) => PAD + chartH - (v / maxValue) * chartH;
  const targetY = y(75);

  const path = values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <div className="flex items-center gap-2">
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <line x1={0} y1={targetY} x2={WIDTH} y2={targetY} stroke="var(--color-border)" strokeWidth="1" strokeDasharray="2 2" />
        <path d={path} fill="none" stroke={BONUS_PRIMARY} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        {values.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={i === values.length - 1 ? 2.5 : 1.5} fill={BONUS_PRIMARY} opacity={points[i].isCurrent ? 0.55 : 1} />
        ))}
      </svg>
      <span className="text-xs font-semibold whitespace-nowrap text-[var(--color-text)]">
        {last.quote != null ? `${last.quote.toFixed(1)}%` : "–"}
        {last.isCurrent && <span className="ml-1 font-normal text-[var(--color-text-muted)]">(läuft)</span>}
      </span>
    </div>
  );
}
