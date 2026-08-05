"use client";

import { useEffect, useState } from "react";
import { BONUS_PRIMARY, BONUS_DARK_TEXT } from "@/lib/bonus-colors";

const SIZE = 176;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const TARGET_PERCENT = 75;
const RING_DURATION_MS = 1100;

// Fest verteilte Konfetti-Punkte (kein Math.random() während des Renderns) - fünf Punkte, gleichmäßig
// um den Kreis verteilt, mit leicht unterschiedlicher Wurfweite für einen natürlicheren Eindruck.
const CONFETTI_DOTS = [
  { angle: 20, distance: 32, color: BONUS_PRIMARY },
  { angle: 95, distance: 40, color: "#D2AD69" },
  { angle: 160, distance: 30, color: "#9FA47E" },
  { angle: 230, distance: 42, color: BONUS_PRIMARY },
  { angle: 305, distance: 34, color: "#D2AD69" },
];

function useCountUp(target: number, durationMs: number) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const from = 0;
    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

function tickMarkPoint(percent: number, r: number) {
  const angle = (percent / 100) * 360 - 90;
  const rad = (angle * Math.PI) / 180;
  return { x: SIZE / 2 + r * Math.cos(rad), y: SIZE / 2 + r * Math.sin(rad) };
}

export function QuoteRing({ quote, weekLabel, quarterKey }: { quote: number; weekLabel: string; quarterKey: string }) {
  const clamped = Math.max(0, Math.min(100, quote));
  const [animatedOffset, setAnimatedOffset] = useState(CIRCUMFERENCE);
  const countUp = useCountUp(quote, RING_DURATION_MS);
  const [showBadge, setShowBadge] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const reachedTarget = quote >= TARGET_PERCENT;
  const badgeStorageKey = `bonus-badge-seen-${quarterKey}`;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimatedOffset(CIRCUMFERENCE * (1 - clamped / 100)));
    return () => cancelAnimationFrame(raf);
  }, [clamped]);

  useEffect(() => {
    if (!reachedTarget) return;
    const timer = setTimeout(() => {
      setShowBadge(true);
      const alreadySeen = typeof window !== "undefined" && window.localStorage.getItem(badgeStorageKey);
      if (!alreadySeen) {
        setShowConfetti(true);
        window.localStorage.setItem(badgeStorageKey, "1");
        setTimeout(() => setShowConfetti(false), 700);
      }
    }, RING_DURATION_MS + 150);
    return () => clearTimeout(timer);
  }, [reachedTarget, badgeStorageKey]);

  const tickInner = tickMarkPoint(TARGET_PERCENT, RADIUS - 8);
  const tickOuter = tickMarkPoint(TARGET_PERCENT, RADIUS + 8);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--color-border)" strokeWidth={STROKE} />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={BONUS_PRIMARY}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={animatedOffset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            style={{ transition: `stroke-dashoffset ${RING_DURATION_MS}ms cubic-bezier(.22,.9,.3,1)` }}
          />
          <line x1={tickInner.x} y1={tickInner.y} x2={tickOuter.x} y2={tickOuter.y} stroke="var(--color-coral)" strokeWidth={2.5} strokeLinecap="round" />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums" style={{ color: BONUS_DARK_TEXT }}>
            {countUp.toFixed(1)}%
          </span>
          <span className="text-[11px] font-medium text-[var(--color-text-muted)]">Quote bisher</span>
        </div>

        {showBadge && (
          <div
            className="absolute -top-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full text-white shadow-[var(--shadow-soft)]"
            style={{ background: BONUS_PRIMARY, animation: "bonus-badge-in 0.4s ease-out" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {showConfetti &&
              CONFETTI_DOTS.map((d, i) => {
                const rad = (d.angle * Math.PI) / 180;
                const dx = Math.cos(rad) * d.distance;
                const dy = Math.sin(rad) * d.distance;
                return (
                  <span
                    key={i}
                    className="absolute h-1.5 w-1.5 rounded-full"
                    style={{
                      background: d.color,
                      // @ts-expect-error CSS custom properties
                      "--dx": `${dx}px`,
                      "--dy": `${dy}px`,
                      animation: "bonus-confetti 0.65s ease-out forwards",
                    }}
                  />
                );
              })}
          </div>
        )}
      </div>
      <span className="text-xs font-medium text-[var(--color-text-muted)]">
        Ziel {TARGET_PERCENT}% · {weekLabel}
      </span>

      <style>{`
        @keyframes bonus-badge-in {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bonus-confetti {
          from { opacity: 1; transform: translate(0, 0) scale(1); }
          to { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0.4); }
        }
      `}</style>
    </div>
  );
}
