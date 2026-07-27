import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { WeeklyCapacityPoint } from "@/lib/capacity";

const WIDTH = 640;
const HEIGHT = 140;
const PAD_LEFT = 36;
const PAD_BOTTOM = 18;
const PAD_TOP = 10;

/** Reiner Server-rendered SVG-Chart: Wochenstunden-Verlauf (belegt) gegen die Kapazitätslinie. */
export function CapacityChart({ points, title }: { points: WeeklyCapacityPoint[]; title: string }) {
  if (points.length === 0) return null;

  const maxValue = Math.max(...points.map((p) => Math.max(p.used, p.capacity)), 1) * 1.1;
  const chartW = WIDTH - PAD_LEFT;
  const chartH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const xStep = chartW / (points.length - 1 || 1);

  const x = (i: number) => PAD_LEFT + i * xStep;
  const y = (v: number) => PAD_TOP + chartH - (v / maxValue) * chartH;

  const usedPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.used)}`).join(" ");
  const areaPath = `${usedPath} L ${x(points.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;
  const capacityY = y(points[0].capacity);

  const overCapacityWeeks = points.filter((p) => p.used > p.capacity + 0.01);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
        <span className="text-xs text-[var(--color-text-muted)]">
          {points[0].capacity.toFixed(1)} Std./Woche Kapazität
        </span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
        <line x1={PAD_LEFT} y1={capacityY} x2={WIDTH} y2={capacityY} stroke="var(--color-coral)" strokeWidth="1" strokeDasharray="4 3" />
        <path d={areaPath} fill="var(--color-primary-soft)" />
        <path d={usedPath} fill="none" stroke="var(--color-primary)" strokeWidth="2" />
        <line x1={PAD_LEFT} y1={PAD_TOP + chartH} x2={WIDTH} y2={PAD_TOP + chartH} stroke="var(--color-border)" strokeWidth="1" />
        {points.map(
          (p, i) =>
            i % 4 === 0 && (
              <text key={i} x={x(i)} y={HEIGHT - 2} fontSize="9" fill="var(--color-text-muted)" textAnchor="middle">
                {format(p.weekStart, "dd.MM.", { locale: de })}
              </text>
            )
        )}
        <text x={2} y={y(maxValue) + 8} fontSize="9" fill="var(--color-text-muted)">
          {maxValue.toFixed(0)}
        </text>
        <text x={2} y={y(0)} fontSize="9" fill="var(--color-text-muted)">
          0
        </text>
      </svg>
      {overCapacityWeeks.length > 0 && (
        <p className="mt-1 text-xs text-[var(--color-coral)]">
          ⚠ Überbucht in {overCapacityWeeks.length} Woche(n) im Horizont – Wochenprofile/Vertragsstunden prüfen.
        </p>
      )}
    </div>
  );
}
