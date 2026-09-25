import { format } from "date-fns";
import type { UpcomingWeek } from "@/lib/bonus";

export function CapacityCalendar({ weeks }: { weeks: UpcomingWeek[] }) {
  return (
    <div>
      <h2 className="text-[19px] leading-[1.2] font-bold tracking-[-0.015em] text-[var(--color-text)]">Kapazitätskalender</h2>
      <p className="mt-1 mb-3 text-xs text-[var(--color-text-muted)]">Betriebsferien zählen nicht in die Quote.</p>
      <ul className="flex gap-3 overflow-x-auto pb-1">
        {weeks.map((w) => (
          <li
            key={w.weekStart.toISOString()}
            className={`flex w-[104px] shrink-0 flex-col gap-1 rounded-[var(--pros-r-sm)] border px-3 py-2.5 ${
              w.isBetriebsferien
                ? "border-dashed border-[var(--pros-border-strong)] bg-transparent"
                : "border-[var(--pros-border-default)] bg-[var(--pros-sage-pale)]"
            }`}
          >
            <span className="text-[13px] font-semibold text-[var(--color-text)]">KW {format(w.weekStart, "w")}</span>
            <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
              {format(w.weekStart, "dd.MM.")}–{format(w.weekEnd, "dd.MM.")}
            </span>
            {w.isBetriebsferien && (
              <span className="mt-0.5 self-start rounded-full bg-[var(--pros-sage-pale)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-text-muted)]">Ferien</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
