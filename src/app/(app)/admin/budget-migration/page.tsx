import { requireAdmin } from "@/lib/rbac";
import { eur } from "@/lib/budgetrechner/labels";
import { ladeMigrationVorschau, ladeZuKlaerenListe } from "./actions";
import { MigrationButton } from "./migration-panel";

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";

export default async function BudgetMigrationPage() {
  await requireAdmin();

  const [vorschau, zuKlaeren] = await Promise.all([ladeMigrationVorschau(), ladeZuKlaerenListe()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Datenmigration Betriebswirtschaftstool</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Schritt 1/3 der Konsolidierung: übernimmt bestehende Ist-Kosten-Einträge (Cockpit) und Budget-Ausgaben (Budgetrechner) in die
          neue, vereinheitlichte Struktur. Einmalig auszuführen - beliebig oft klickbar, bereits migrierte Zeilen werden automatisch
          übersprungen. Die bisherigen Seiten (Cockpit, Budgetrechner) funktionieren währenddessen unverändert weiter.
        </p>
      </div>

      <div className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Vorschau</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">Noch zu übernehmen: Ist-Kosten-Einträge</p>
            <p className="text-xl font-bold text-[var(--color-text)]">{vorschau.offeneIstKostenEintraege}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">Noch zu übernehmen: Budget-Ausgaben</p>
            <p className="text-xl font-bold text-[var(--color-text)]">{vorschau.offeneBudgetAusgaben}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">Neue Platzhalter-Positionen</p>
            <p className="text-xl font-bold text-[var(--color-text)]">{vorschau.neuePlatzhalterPositionen.length}</p>
          </div>
        </div>
        {vorschau.neuePlatzhalterPositionen.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-medium text-[var(--color-text-muted)]">
              Diese Sammelpositionen werden angelegt, weil alte Ist-Kosten-Einträge nur die grobe Kategorie kennen, keine granulare
              Position:
            </p>
            <ul className="flex flex-col gap-1 text-sm text-[var(--color-text)]">
              {vorschau.neuePlatzhalterPositionen.map((p) => (
                <li key={`${p.jahr}-${p.kategorie}`}>{p.label}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-5">
          <MigrationButton disabled={vorschau.bereitsMigriert} />
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Zu klären: Platzhalter-Positionen aus der Migration</h2>
        <p className="mb-3 text-xs text-[var(--color-text-muted)]">
          Diese Positionen fassen bisher nicht granular erfasste Alt-Beträge zusammen. Bitte nach und nach in echte, sinnvoll benannte
          Positionen aufteilen (unter „Budget-Positionen&quot; verwalten) oder ein Jahresbudget setzen, falls sie so bleiben sollen -
          bis dahin zeigt die Kategorie-Summe zwar den korrekten Gesamtbetrag, aber ohne granulare Aufschlüsselung.
        </p>
        {zuKlaeren.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Keine offenen Platzhalter-Positionen.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
                <tr>
                  <th className="py-2 pr-3">Position</th>
                  <th className="py-2 pr-3">Jahr</th>
                  <th className="py-2 pr-3">Buchungen</th>
                  <th className="py-2 pr-3 text-right">Summe</th>
                </tr>
              </thead>
              <tbody>
                {zuKlaeren.map((p) => (
                  <tr key={p.id} className="border-t border-[var(--color-border)]">
                    <td className="py-2 pr-3 text-[var(--color-text)]">{p.name}</td>
                    <td className="py-2 pr-3 text-[var(--color-text-muted)]">{p.jahr}</td>
                    <td className="py-2 pr-3 text-[var(--color-text-muted)]">{p.anzahlBuchungen}</td>
                    <td className="py-2 pr-3 text-right font-semibold text-[var(--color-text)]">{eur(p.summe)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
