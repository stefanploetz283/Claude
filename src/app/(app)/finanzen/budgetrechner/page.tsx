import Link from "next/link";
import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { computeBudgetDashboard, computeNichtEingeplant, getBudgetJahre } from "@/lib/budgetrechner/calc";
import { AMPEL_STYLE, QUELLE_AUSGABE_LABEL, eur, prozentText } from "@/lib/budgetrechner/labels";
import { BudgetrechnerNav } from "./budgetrechner-nav";

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";
const selectCls = "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-sm text-[var(--color-text)]";

export default async function BudgetrechnerDashboard({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdminOrVerwaltung();
  const params = await searchParams;
  const now = new Date();

  const jahre = await getBudgetJahre(now);
  const jahr = Number(params.jahr) && jahre.includes(Number(params.jahr)) ? Number(params.jahr) : jahre[0];

  const jahresStart = new Date(Date.UTC(jahr, 0, 1));
  const bisHeute = jahr === now.getFullYear() ? now : new Date(Date.UTC(jahr, 11, 31));

  const [dashboard, nichtEingeplant] = await Promise.all([
    computeBudgetDashboard(jahr),
    computeNichtEingeplant(jahresStart, bisHeute),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Budgetrechner</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Weitere Betriebskosten + AfA aus der Entgeltkalkulation – Verbrauch, Rest und nicht eingeplante Kosten.
          </p>
        </div>
        <form method="get" className="flex items-center gap-2 text-sm">
          <label className="text-[var(--color-text-muted)]" htmlFor="jahr">
            Budgetjahr
          </label>
          <select id="jahr" name="jahr" defaultValue={jahr} className={selectCls}>
            {jahre.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 font-medium text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]">
            Anzeigen
          </button>
        </form>
      </div>

      <BudgetrechnerNav />

      {dashboard.zeilen.length === 0 ? (
        <div className="rounded-[var(--radius-control)] border border-[var(--color-gold)] bg-[var(--color-gold-soft)] px-4 py-3 text-sm text-[#8A5A12]">
          Für {jahr} sind noch keine Budget-Positionen hinterlegt.{" "}
          <Link href="/finanzen/budgetrechner/kategorien" className="font-semibold underline">
            Positionen anlegen oder Entgeltkalkulation importieren
          </Link>
          .
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className={cardCls}>
              <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">Summe Jahresbudget</p>
              <p className="text-2xl font-bold text-[var(--color-text)]">{eur(dashboard.summeBudget)}</p>
            </div>
            <div className={cardCls}>
              <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">Verbraucht</p>
              <p className="text-2xl font-bold text-[var(--color-text)]">{eur(dashboard.summeVerbraucht)}</p>
            </div>
            <div className={cardCls}>
              <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">Rest</p>
              <p className={`text-2xl font-bold ${dashboard.summeRest < 0 ? "text-[var(--color-coral)]" : "text-[var(--color-text)]"}`}>
                {eur(dashboard.summeRest)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dashboard.zeilen.map((z) => {
              const style = AMPEL_STYLE[z.ampel];
              return (
                <Link
                  key={z.id}
                  href={`/finanzen/budgetrechner/${z.id}`}
                  className={`${cardCls} block transition hover:border-[var(--color-primary)]`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--color-text)]">{z.name}</p>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: style.bg, color: style.text }}>
                      {prozentText(z.prozent)}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg)]">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(z.prozent, 100)}%`, background: style.text }} />
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-1 text-xs">
                    <div>
                      <dt className="text-[var(--color-text-muted)]">Budget</dt>
                      <dd className="font-semibold text-[var(--color-text)]">{eur(z.jahresbudget)}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--color-text-muted)]">Verbraucht</dt>
                      <dd className="font-semibold text-[var(--color-text)]">{eur(z.verbraucht)}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--color-text-muted)]">Rest</dt>
                      <dd className={`font-semibold ${z.rest < 0 ? "text-[var(--color-coral)]" : "text-[var(--color-text)]"}`}>{eur(z.rest)}</dd>
                    </div>
                  </dl>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Nicht eingeplante Kosten */}
      <div className={cardCls}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Nicht eingeplante Kosten ({jahr})</h2>
          <p className="text-lg font-bold text-[var(--color-coral)]">{eur(nichtEingeplant.summe)}</p>
        </div>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Budgetrelevante Ausgaben ohne passende Position – der direkte Beleg für die nächste ReKo-Nachverhandlung.
        </p>
        {nichtEingeplant.eintraege.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">Keine nicht eingeplanten Kosten erfasst.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
                <tr>
                  <th className="py-2 pr-3">Datum</th>
                  <th className="py-2 pr-3">Beschreibung</th>
                  <th className="py-2 pr-3">Herkunft</th>
                  <th className="py-2 pr-3 text-right">Betrag</th>
                </tr>
              </thead>
              <tbody>
                {nichtEingeplant.eintraege.map((e) => (
                  <tr key={e.id} className="border-t border-[var(--color-border)]">
                    <td className="py-2 pr-3 whitespace-nowrap text-[var(--color-text-muted)]">{e.datum.toLocaleDateString("de-DE")}</td>
                    <td className="py-2 pr-3 text-[var(--color-text)]">{e.beschreibung}</td>
                    <td className="py-2 pr-3 text-xs text-[var(--color-text-muted)]">{QUELLE_AUSGABE_LABEL[e.quelle] ?? e.quelle}</td>
                    <td className="py-2 pr-3 text-right font-semibold text-[var(--color-text)]">{eur(e.betrag)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PDF-Export */}
      <div className={cardCls}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Bericht für ReKo-Gespräch</h2>
            <p className="text-sm text-[var(--color-text-muted)]">Budget-Ist-Vergleich + Liste nicht eingeplanter Kosten als PDF (Jahr bis heute).</p>
          </div>
          <a
            href={`/api/budgetrechner/report/pdf?jahr=${jahr}`}
            className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
          >
            PDF exportieren
          </a>
        </div>
      </div>
    </div>
  );
}
