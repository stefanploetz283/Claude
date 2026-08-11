"use client";

import { useMemo, useState } from "react";
import { addDays, format, isSameMonth } from "date-fns";
import { de } from "date-fns/locale";
import type { WeeklyCapacityBreakdown } from "@/lib/capacity";

const WIDTH = 920;
const HEIGHT = 170;
const PAD_LEFT = 38;
const PAD_BOTTOM = 20;
const PAD_TOP = 10;

// Vier Basisfarben aus dem bestehenden Design-System, je zweimal (kräftig/hell) für bis zu 8 gleichzeitig
// unterscheidbare Hilfearten in der gestapelten Fläche - bewusst keine neuen Farben, nur Nuancen der Tokens.
const STACK_PALETTE = [
  "var(--color-primary)",
  "var(--color-gold)",
  "var(--color-coral)",
  "var(--color-sage)",
  "color-mix(in srgb, var(--color-primary) 55%, white)",
  "color-mix(in srgb, var(--color-gold) 55%, white)",
  "color-mix(in srgb, var(--color-coral) 55%, white)",
  "color-mix(in srgb, var(--color-sage) 55%, white)",
];

export type HighlightRange = { employeeId: string; fromWeek: Date; toWeek: Date } | null;

export function CapacityChart({
  employeeId,
  points,
  title,
  helpTypeOrder,
  highlightRange,
}: {
  employeeId: string;
  points: WeeklyCapacityBreakdown[];
  title: string;
  helpTypeOrder: { id: string; name: string }[];
  highlightRange?: HighlightRange;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const activeIndex = pinnedIndex ?? hoveredIndex;

  const colorByHelpType = useMemo(() => {
    const map = new Map<string, string>();
    helpTypeOrder.forEach((h, i) => map.set(h.id, STACK_PALETTE[i % STACK_PALETTE.length]));
    return map;
  }, [helpTypeOrder]);

  if (points.length === 0) return null;

  const capacity = points[0].capacity;
  const maxValue = Math.max(...points.map((p) => Math.max(p.used, p.capacity)), 1) * 1.15;
  const chartW = WIDTH - PAD_LEFT;
  const chartH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const xStep = chartW / (points.length - 1 || 1);

  const x = (i: number) => PAD_LEFT + i * xStep;
  const y = (v: number) => PAD_TOP + chartH - (v / maxValue) * chartH;
  const capacityY = y(capacity);

  // Nur Hilfearten, die bei dieser Fachkraft im Horizont tatsächlich vorkommen - helpTypeOrder selbst bleibt
  // die global stabile Reihenfolge/Farbzuordnung, damit dieselbe Hilfeart über alle Zeilen hinweg gleich
  // aussieht, aber die Legende pro Zeile nicht mit irrelevanten Hilfearten überfrachtet wird.
  const relevantHelpTypes = helpTypeOrder.filter((ht) => points.some((p) => p.byHelpType.some((b) => b.helpTypeId === ht.id)));

  // Gestapelte Bänder je Hilfeart, in stabiler Reihenfolge (helpTypeOrder), damit dieselbe Hilfeart über
  // die Zeit hinweg immer an derselben vertikalen Position bleibt.
  const bands = relevantHelpTypes.map((ht) => {
    const rates = points.map((p) => p.byHelpType.find((b) => b.helpTypeId === ht.id)?.rate ?? 0);
    return { helpTypeId: ht.id, name: ht.name, rates };
  });
  const cumulativeBefore = bands.map((_, bandIndex) =>
    points.map((_, i) => bands.slice(0, bandIndex).reduce((sum, b) => sum + b.rates[i], 0))
  );
  const bandPaths = bands.map((b, bandIndex) => {
    const baseline = cumulativeBefore[bandIndex];
    const top = points.map((_, i) => baseline[i] + b.rates[i]);
    const forward = points.map((_, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(top[i])}`).join(" ");
    const backward = [...points]
      .map((_, i) => i)
      .reverse()
      .map((i) => `L ${x(i)} ${y(baseline[i])}`)
      .join(" ");
    return { ...b, path: `${forward} ${backward} Z`, color: colorByHelpType.get(b.helpTypeId) ?? STACK_PALETTE[0] };
  });

  const stackTopPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.used)}`).join(" ");
  const gapBottom = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(Math.min(p.used, p.capacity))}`).join(" ");
  const gapPath = `${gapBottom} L ${x(points.length - 1)} ${capacityY} L ${x(0)} ${capacityY} Z`;

  const overCapacityWeeks = points.filter((p) => p.used > p.capacity + 0.01);

  const highlight =
    highlightRange && highlightRange.employeeId === employeeId
      ? (() => {
          const fromIndex = points.findIndex((p) => p.weekStart.getTime() >= highlightRange.fromWeek.getTime());
          let toIndex = points.findIndex((p) => p.weekStart.getTime() >= highlightRange.toWeek.getTime());
          if (fromIndex === -1) return null;
          if (toIndex === -1) toIndex = points.length - 1;
          return { fromIndex, toIndex };
        })()
      : null;

  const active = activeIndex != null ? points[activeIndex] : null;
  const patternId = `gap-hatch-${employeeId}`;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
        <span className="text-xs text-[var(--color-text-muted)]">{capacity.toFixed(1)} Std./Woche Kapazität</span>
      </div>

      <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full min-w-[640px] cursor-crosshair"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <pattern id={patternId} width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-text-muted)" strokeWidth="1" opacity="0.35" />
          </pattern>
        </defs>

        {highlight && (
          <rect
            x={x(highlight.fromIndex)}
            y={PAD_TOP}
            width={x(highlight.toIndex) - x(highlight.fromIndex)}
            height={chartH}
            fill="var(--color-gold)"
            opacity="0.18"
          />
        )}

        {/* Wochenraster im Hintergrund */}
        {points.map((p, i) => (
          <line key={`w-${i}`} x1={x(i)} y1={PAD_TOP} x2={x(i)} y2={PAD_TOP + chartH} stroke="var(--color-border)" strokeWidth="1" opacity="0.35" />
        ))}
        {/* Monatslinien + Beschriftung */}
        {points.map((p, i) => {
          const isMonthStart = i === 0 || !isSameMonth(p.weekStart, points[i - 1].weekStart);
          if (!isMonthStart) return null;
          return (
            <g key={`m-${i}`}>
              <line x1={x(i)} y1={PAD_TOP} x2={x(i)} y2={PAD_TOP + chartH} stroke="var(--color-border)" strokeWidth="1.2" />
              <text x={x(i) + 3} y={HEIGHT - 4} fontSize="10" fontWeight={600} fill="var(--color-text-muted)">
                {format(p.weekStart, "MMM", { locale: de })}
              </text>
            </g>
          );
        })}

        <path d={gapPath} fill={`url(#${patternId})`} />
        {bandPaths.map((b) => (
          <path key={b.helpTypeId} d={b.path} fill={b.color} opacity={0.88} />
        ))}
        <path d={stackTopPath} fill="none" stroke="var(--color-primary)" strokeWidth="1.5" />
        <line x1={PAD_LEFT} y1={capacityY} x2={WIDTH} y2={capacityY} stroke="var(--color-coral)" strokeWidth="1" strokeDasharray="4 3" />
        <line x1={PAD_LEFT} y1={PAD_TOP + chartH} x2={WIDTH} y2={PAD_TOP + chartH} stroke="var(--color-border)" strokeWidth="1" />

        {activeIndex != null && (
          <line x1={x(activeIndex)} y1={PAD_TOP} x2={x(activeIndex)} y2={PAD_TOP + chartH} stroke="var(--color-text)" strokeWidth="1" opacity="0.5" />
        )}

        {/* Unsichtbare Spalten für Hover/Klick pro Woche */}
        {points.map((p, i) => (
          <rect
            key={`hit-${i}`}
            x={x(i) - xStep / 2}
            y={PAD_TOP}
            width={xStep}
            height={chartH}
            fill="transparent"
            onMouseEnter={() => setHoveredIndex(i)}
            onClick={() => setPinnedIndex((prev) => (prev === i ? null : i))}
          />
        ))}
      </svg>
      </div>

      {overCapacityWeeks.length > 0 && (
        <p className="mt-1 text-xs text-[var(--color-coral)]">
          ⚠ Überbucht in {overCapacityWeeks.length} Woche(n) im Horizont – Wochenprofile/Vertragsstunden prüfen.
        </p>
      )}

      {relevantHelpTypes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {relevantHelpTypes.map((h) => (
            <span key={h.id} className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: colorByHelpType.get(h.id) }} />
              {h.name}
            </span>
          ))}
        </div>
      )}

      {active && (
        <div className="mt-2 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-xs">
          <p className="mb-1.5 font-semibold text-[var(--color-text)]">
            KW {format(active.weekStart, "w")} · {format(active.weekStart, "dd.MM.")}–{format(addDays(active.weekStart, 6), "dd.MM.yyyy")} ·{" "}
            {active.used.toFixed(1)} / {active.capacity.toFixed(1)} Std.
          </p>
          {active.entries.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {active.entries.map((e) => (
                <li key={e.caseId} className="flex justify-between gap-3 text-[var(--color-text-muted)]">
                  <span>
                    {e.clientName} <span className="text-[var(--color-text)]">· {e.helpTypeName}</span>
                  </span>
                  <span className="shrink-0 font-medium text-[var(--color-text)]">{e.rate.toFixed(1)} Std./Woche</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[var(--color-text-muted)]">Keine aktiven Fälle in dieser Woche.</p>
          )}
        </div>
      )}
    </div>
  );
}
