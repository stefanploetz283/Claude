import { format } from "date-fns";
import type { UpcomingWeek } from "@/lib/bonus";
import { BONUS_PRIMARY } from "./bonus-colors";

export function CapacityCalendar({ weeks }: { weeks: UpcomingWeek[] }) {
  return (
    <div>
      <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Kapazitätskalender</h2>
      <p className="mb-3 text-xs text-[var(--color-text-muted)]">Betriebsferien zählen nicht in die Quote.</p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {weeks.map((w) => (
          <div
            key={w.weekStart.toISOString()}
            className={`flex w-[104px] shrink-0 flex-col gap-1 rounded-[var(--radius-control)] border border-[var(--color-border)] px-3 py-2.5 ${
              w.isBetriebsferien ? "bg-[var(--color-border)]/40 opacity-70" : "bg-[var(--color-surface)]"
            }`}
            style={w.isBetriebsferien ? undefined : { borderTop: `3px solid ${BONUS_PRIMARY}` }}
          >
            <span className="text-[11px] font-semibold text-[var(--color-text)]">KW {format(w.weekStart, "w")}</span>
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {format(w.weekStart, "dd.MM.")}–{format(w.weekEnd, "dd.MM.")}
            </span>
            {w.isBetriebsferien && (
              <span className="mt-0.5 self-start rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-muted)]">
                Ferien
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
