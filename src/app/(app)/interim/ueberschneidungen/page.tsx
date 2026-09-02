import Link from "next/link";
import { scanAlleUeberschneidungen } from "../actions";

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";

export default async function UeberschneidungenPage() {
  const konflikte = await scanAlleUeberschneidungen();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/interim" className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-primary)]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Zurück zum Interims-Dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Zeitüberschneidungen</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Vollständiger Abgleich aller erfassten Einträge über alle Fälle hinweg, auch rückwirkend erfasste.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {konflikte.map((k, i) => (
          <div key={i} className={cardCls}>
            <p className="mb-1.5 text-xs font-semibold text-[var(--color-text-muted)]">{k.date}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-text)]">
              <span className="font-semibold">{k.fallA}</span>
              <span className="text-[var(--color-text-muted)]">{k.zeitraumA} Uhr</span>
              <span className="text-[var(--color-text-muted)]">↔</span>
              <span className="font-semibold">{k.fallB}</span>
              <span className="text-[var(--color-text-muted)]">{k.zeitraumB} Uhr</span>
            </div>
            <p className="mt-1.5 text-xs font-semibold text-[var(--color-coral)]">{k.ueberlappungMinuten} Minuten Überschneidung</p>
          </div>
        ))}
        {konflikte.length === 0 && (
          <p className={`${cardCls} text-sm text-[var(--color-text-muted)]`}>Keine Zeitüberschneidungen gefunden.</p>
        )}
      </div>
    </div>
  );
}
