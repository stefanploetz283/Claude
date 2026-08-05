import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { computeQuarterBonus, getCurrentQuarter, type Quarter } from "@/lib/bonus";
import { PayoutButton } from "./payout-button";
import { BeschafftToggle } from "./beschafft-toggle";

function formatEuro(amount: number): string {
  return amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function prevQuarter(year: number, quarter: Quarter): { year: number; quarter: Quarter } {
  return quarter === 1 ? { year: year - 1, quarter: 4 } : { year, quarter: (quarter - 1) as Quarter };
}
function nextQuarter(year: number, quarter: Quarter): { year: number; quarter: Quarter } {
  return quarter === 4 ? { year: year + 1, quarter: 1 } : { year, quarter: (quarter + 1) as Quarter };
}

const GUTSCHEIN_LABELS: Record<string, string> = { EDEKA: "Edeka", DM: "dm", MEDIAMARKT: "MediaMarkt" };

export default async function AdminBonusPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const now = new Date();

  const current = getCurrentQuarter(now);
  const defaultView = prevQuarter(current.year, current.quarter);
  const year = Number(sp.year) || defaultView.year;
  const quarter = (Number(sp.quarter) || defaultView.quarter) as Quarter;
  const prev = prevQuarter(year, quarter);
  const next = nextQuarter(year, quarter);
  const isCurrentQuarter = year === current.year && quarter === current.quarter;

  const employees = await prisma.user.findMany({ where: { role: "EMPLOYEE", active: true }, orderBy: { name: "asc" } });

  const rows = await Promise.all(
    employees
      .filter((e) => e.weeklyContractHours != null)
      .map(async (e) => {
        const result = await computeQuarterBonus(e, year, quarter, now);
        const payout = await prisma.quarterlyBonusPayout.findUnique({
          where: { employeeId_year_quarter: { employeeId: e.id, year, quarter } },
        });
        return { employee: e, result, payout };
      })
  );

  const gutscheinMonth = now.getMonth() + 1;
  const gutscheinAuswahlen = await prisma.gutscheinAuswahl.findMany({
    where: { year: now.getFullYear(), month: gutscheinMonth },
    include: { employee: true },
    orderBy: { employee: { name: "asc" } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Bonus-Cockpit · Verwaltung</h1>
        <p className="mt-1 text-sm text-black/60">Quartals-Bonus prüfen und auszahlen, Sachbezug-Gutscheine der Mitarbeiter einsehen.</p>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center justify-between text-sm">
          <Link
            href={`?year=${prev.year}&quarter=${prev.quarter}`}
            className="rounded-[var(--radius-control)] border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]"
          >
            ← Vorquartal
          </Link>
          <span className="font-semibold text-[var(--color-text)]">
            Q{quarter}/{year} {isCurrentQuarter && <span className="font-normal text-[var(--color-text-muted)]">(läuft noch – Prognose)</span>}
          </span>
          <Link
            href={`?year=${next.year}&quarter=${next.quarter}`}
            className="rounded-[var(--radius-control)] border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]"
          >
            Folgequartal →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-primary-soft)] text-xs uppercase text-[var(--color-primary)]">
              <tr>
                <th className="px-4 py-2.5">Mitarbeiter</th>
                <th className="px-4 py-2.5">Quartalsquote</th>
                <th className="px-4 py-2.5">Bonus</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ employee, result, payout }) => (
                <tr key={employee.id} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-2.5 font-medium text-[var(--color-text)]">{employee.name}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)]">
                    {result.quartalsquote != null ? `${result.quartalsquote.toFixed(2)}%` : "–"}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-[var(--color-text)]">{formatEuro(result.bonus)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {isCurrentQuarter ? (
                      <span className="text-xs text-[var(--color-text-muted)]">Quartal läuft noch</span>
                    ) : payout ? (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        Ausgezahlt am {format(payout.paidOutAt, "dd.MM.yyyy", { locale: de })}
                      </span>
                    ) : (
                      <PayoutButton employeeId={employee.id} year={year} quarter={quarter} />
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                    Keine Fachkräfte mit hinterlegten Vertragsstunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">
          Sachbezug-Gutscheine · {format(now, "MMMM yyyy", { locale: de })}
        </h2>
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">Unabhängig vom Bonus – gilt für jeden Mitarbeiter.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-primary-soft)] text-xs uppercase text-[var(--color-primary)]">
              <tr>
                <th className="px-4 py-2.5">Mitarbeiter</th>
                <th className="px-4 py-2.5">Anbieter</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {gutscheinAuswahlen.map((g) => (
                <tr key={g.id} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-2.5 font-medium text-[var(--color-text)]">{g.employee.name}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{GUTSCHEIN_LABELS[g.anbieter] ?? g.anbieter}</td>
                  <td className="px-4 py-2.5 text-right">
                    <BeschafftToggle id={g.id} beschafft={g.beschafft} />
                  </td>
                </tr>
              ))}
              {gutscheinAuswahlen.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                    Noch keine Auswahl für diesen Monat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
