// Wochenansicht: komprimierter Zoom-out derselben Spalten-Logik - hier als Tages-Karten mit
// farblich nach Mitarbeiterin markierten Zeilen, da ein vollflächiges Tag×Mitarbeiterin-Raster über 7
// Tage die Übersicht eher erschweren als verbessern würde. Rein lesend (Buchen bleibt der Tagesansicht
// vorbehalten, dort mit vollem Slot-Raster).
export type WochenTermin = {
  key: string;
  tagIso: string;
  startMinute: number;
  endMinute: number;
  mitarbeiterinName: string;
  mitarbeiterinColor: string;
  titel: string;
  kategorieLabel: string;
  raumName: string | null;
  clientName: string | null;
};

function formatMinute(m: number): string {
  const h = Math.floor(m / 60)
    .toString()
    .padStart(2, "0");
  const min = (m % 60).toString().padStart(2, "0");
  return `${h}:${min}`;
}

export function Wochenuebersicht({ tage, termine }: { tage: { iso: string; label: string }[]; termine: WochenTermin[] }) {
  return (
    <div className="flex flex-col gap-3">
      {tage.map((tag) => {
        const tagTermine = termine.filter((t) => t.tagIso === tag.iso).sort((a, b) => a.startMinute - b.startMinute);
        return (
          <div key={tag.iso} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <h3 className="mb-2 text-sm font-semibold text-[var(--color-primary)]">{tag.label}</h3>
            {tagTermine.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Keine Termine.</p>}
            <ul className="flex flex-col gap-1.5">
              {tagTermine.map((t) => (
                <li key={t.key} className="flex items-center gap-2.5 rounded-[var(--radius-control)] bg-[var(--color-bg)] px-3.5 py-2 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t.mitarbeiterinColor }} />
                  <span className="font-semibold text-[var(--color-text)]">
                    {formatMinute(t.startMinute)}–{formatMinute(t.endMinute)}
                  </span>
                  <span className="text-[var(--color-text)]">{t.titel}</span>
                  <span className="text-[var(--color-text-muted)]">
                    · {t.mitarbeiterinName} · {t.kategorieLabel}
                    {t.raumName && ` · ${t.raumName}`}
                    {t.clientName && ` · ${t.clientName}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
