import Link from "next/link";
import { requireAdmin } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import {
  getCasesPerHelpType,
  getAverageCaseDurationDays,
  getMonthlyUtilization,
  getHoursPerEmployee,
  getCasesWithLowContingent,
} from "@/lib/statistics";

const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const settings = await getSettings();

  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const teamMonth = Number(params.teamMonth) || now.getMonth() + 1;
  const teamYear = Number(params.teamYear) || now.getFullYear();

  const [casesPerHelpType, avgDuration, monthlyUtilization, hoursPerEmployee, lowContingentCases] = await Promise.all([
    getCasesPerHelpType(year),
    getAverageCaseDurationDays(year),
    getMonthlyUtilization(year),
    getHoursPerEmployee(new Date(Date.UTC(teamYear, teamMonth - 1, 1)), new Date(Date.UTC(teamYear, teamMonth, 1))),
    getCasesWithLowContingent(settings.contingentWarningThreshold),
  ]);

  const maxUtilization = Math.max(1, ...monthlyUtilization.map((m) => m.hours));
  const maxEmployeeHours = Math.max(1, ...hoursPerEmployee.map((e) => e.hours));
  const totalCases = casesPerHelpType.reduce((sum, h) => sum + h.count, 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Statistik &amp; Jahresauswertung</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Team- und jahresübergreifende Auswertungen für die Praxisleitung.</p>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Jahresauswertung</h2>
          <form method="get" className="flex items-center gap-2 text-sm">
            <input type="hidden" name="teamMonth" value={teamMonth} />
            <input type="hidden" name="teamYear" value={teamYear} />
            <select name="year" defaultValue={year} className={selectCls}>
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button type="submit" className={btnCls}>
              Anzeigen
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className={cardCls}>
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Fälle pro Hilfeart ({year})</h3>
            <ul className="flex flex-col gap-3 text-sm">
              {casesPerHelpType.map((h) => (
                <li key={h.helpType}>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text)]">{h.helpType}</span>
                    <span className="font-medium text-[var(--color-text-muted)]">{h.count}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--color-primary-soft)]">
                    <div className="h-full rounded-full bg-[var(--color-green-medium)]" style={{ width: `${totalCases ? (h.count / totalCases) * 100 : 0}%` }} />
                  </div>
                </li>
              ))}
              {casesPerHelpType.length === 0 && <li className="text-[var(--color-text-muted)]">Keine Fälle in {year}.</li>}
            </ul>
          </div>

          <div className={cardCls}>
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Durchschnittliche Falldauer</h3>
            <p className="text-3xl font-bold text-[var(--color-text)]">
              {avgDuration.count > 0 ? Math.round(avgDuration.averageDays) : "–"}
              <span className="ml-1 text-base font-normal text-[var(--color-text-muted)]">Tage</span>
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">Basierend auf {avgDuration.count} in {year} abgeschlossenen Fällen.</p>
          </div>

          <div className={cardCls}>
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Auslastung übers Jahr (dokumentierte Std.)</h3>
            <div className="flex h-32 items-end gap-1">
              {monthlyUtilization.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-[var(--color-primary)]"
                    style={{ height: `${(m.hours / maxUtilization) * 100}%`, minHeight: m.hours > 0 ? "2px" : 0 }}
                    title={`${MONTH_NAMES[m.month - 1]}: ${m.hours.toFixed(1)} Std.`}
                  />
                  <span className="text-[9px] text-[var(--color-text-muted)]">{MONTH_NAMES[m.month - 1].slice(0, 3)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Team-Auswertung</h2>
          <form method="get" className="flex items-center gap-2 text-sm">
            <input type="hidden" name="year" value={year} />
            <select name="teamMonth" defaultValue={teamMonth} className={selectCls}>
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select name="teamYear" defaultValue={teamYear} className={selectCls}>
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button type="submit" className={btnCls}>
              Anzeigen
            </button>
          </form>
        </div>

        <div className={cardCls}>
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">
            Gesamtstunden aller Mitarbeiter – {MONTH_NAMES[teamMonth - 1]} {teamYear}
          </h3>
          <p className="mb-3 text-sm text-[var(--color-text-muted)]">
            Gesamt: <span className="font-semibold text-[var(--color-text)]">{hoursPerEmployee.reduce((s, e) => s + e.hours, 0).toFixed(1)} Std.</span>
          </p>
          <ul className="flex flex-col gap-3 text-sm">
            {hoursPerEmployee.map((e) => (
              <li key={e.name}>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text)]">{e.name}</span>
                  <span className="font-medium text-[var(--color-text-muted)]">{e.hours.toFixed(1)} Std.</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--color-primary-soft)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-green-medium)]"
                    style={{ width: `${Math.min(100, Math.max(0, (e.hours / maxEmployeeHours) * 100))}%` }}
                  />
                </div>
              </li>
            ))}
            {hoursPerEmployee.length === 0 && <li className="text-[var(--color-text-muted)]">Keine erfassten Stunden in diesem Monat.</li>}
          </ul>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Fälle mit knappem Kontingent (team-übergreifend)</h2>
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-primary-soft)] text-[11px] font-bold tracking-wide text-[var(--color-primary)] uppercase">
              <tr>
                <th className="px-5 py-3">Klient</th>
                <th className="px-5 py-3">Hilfeart</th>
                <th className="px-5 py-3">Zuständig</th>
                <th className="px-5 py-3">Verbleibend</th>
              </tr>
            </thead>
            <tbody>
              {lowContingentCases.map((r) => (
                <tr key={r.case.id} className="border-t border-[var(--color-border)]">
                  <td className="px-5 py-3">
                    <Link href={`/cases/${r.case.id}`} className="font-medium text-[var(--color-primary)] hover:underline">
                      {r.case.client.lastName}, {r.case.client.firstName}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-[var(--color-text)]">{r.case.helpType.name}</td>
                  <td className="px-5 py-3 text-[var(--color-text)]">{r.case.assignedEmployee.name}</td>
                  <td className="px-5 py-3 font-semibold text-[var(--color-coral)]">
                    {r.remainingHours.toFixed(1)} Std. ({r.remainingPercent.toFixed(0)} %)
                  </td>
                </tr>
              ))}
              {lowContingentCases.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                    Aktuell keine Fälle mit knappem Kontingent.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";
const selectCls = "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-sm text-[var(--color-text)]";
const btnCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-1.5 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]";
