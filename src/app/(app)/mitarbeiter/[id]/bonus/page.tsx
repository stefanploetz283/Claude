import { notFound } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { computeQuarterBonus, computeQuoteTrend, getCurrentQuarter, type Quarter } from "@/lib/bonus";
import { GUTSCHEIN_STYLES, type GutscheinAnbieterKey } from "@/lib/bonus-colors";
import { QuoteTrendSparkline } from "./quote-trend-sparkline";
import { PayoutButton } from "./payout-button";
import { BeschafftToggle } from "./beschafft-toggle";

const TREND_QUARTERS = 6;

function formatEuro(amount: number): string {
  return amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function prevQuarter(year: number, quarter: Quarter): { year: number; quarter: Quarter } {
  return quarter === 1 ? { year: year - 1, quarter: 4 } : { year, quarter: (quarter - 1) as Quarter };
}

export default async function BonusHistoriePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const employee = await prisma.user.findUnique({ where: { id } });
  if (!employee) notFound();

  const now = new Date();
  const current = getCurrentQuarter(now);
  const reviewQuarter = prevQuarter(current.year, current.quarter); // zuletzt abgeschlossenes Quartal

  const [trend, reviewResult, payout, gutscheinAuswahlen] = await Promise.all([
    computeQuoteTrend(employee, TREND_QUARTERS, now),
    computeQuarterBonus(employee, reviewQuarter.year, reviewQuarter.quarter, now),
    prisma.quarterlyBonusPayout.findUnique({
      where: { employeeId_year_quarter: { employeeId: id, year: reviewQuarter.year, quarter: reviewQuarter.quarter } },
    }),
    prisma.gutscheinAuswahl.findMany({ where: { employeeId: id }, orderBy: [{ year: "desc" }, { month: "desc" }] }),
  ]);

  const allPayouts = await prisma.quarterlyBonusPayout.findMany({ where: { employeeId: id }, orderBy: [{ year: "desc" }, { quarter: "desc" }] });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Bonus-Historie · {employee.name}</h1>
        <p className="mt-1 text-sm text-black/60">Quartals-Bonus und Sachbezug-Gutschein im Zeitverlauf.</p>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Quotenentwicklung</h2>
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">Letzte {TREND_QUARTERS} Quartale, gestrichelt die Zielquote (75%).</p>
        <QuoteTrendSparkline points={trend} />
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">
          Letztes abgeschlossenes Quartal · Q{reviewQuarter.quarter}/{reviewQuarter.year}
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-6 text-sm">
            <div>
              <div className="text-lg font-bold text-[var(--color-text)]">
                {reviewResult.quartalsquote != null ? `${reviewResult.quartalsquote.toFixed(2)}%` : "–"}
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">Quartalsquote</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[var(--color-text)]">{formatEuro(reviewResult.bonus)}</div>
              <div className="text-xs text-[var(--color-text-muted)]">Bonus</div>
            </div>
          </div>
          {payout ? (
            <span className="text-sm text-[var(--color-text-muted)]">Ausgezahlt am {format(payout.paidOutAt, "dd.MM.yyyy", { locale: de })}</span>
          ) : (
            <PayoutButton employeeId={id} year={reviewQuarter.year} quarter={reviewQuarter.quarter} />
          )}
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Ausgezahlte Quartale</h2>
        <ul className="flex flex-col gap-1.5 text-sm">
          {allPayouts.map((p) => (
            <li key={p.id} className="flex justify-between border-b border-[var(--color-border)] py-1.5 last:border-0">
              <span className="text-[var(--color-text)]">
                Q{p.quarter}/{p.year}
              </span>
              <span className="text-[var(--color-text-muted)]">{format(p.paidOutAt, "dd.MM.yyyy", { locale: de })}</span>
            </li>
          ))}
          {allPayouts.length === 0 && <li className="text-[var(--color-text-muted)]">Noch keine Auszahlung erfasst.</li>}
        </ul>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Sachbezug-Gutscheine</h2>
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">Unabhängig vom Bonus – ein Eintrag je Monat.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-primary-soft)] text-xs uppercase text-[var(--color-primary)]">
              <tr>
                <th className="px-4 py-2.5">Monat</th>
                <th className="px-4 py-2.5">Anbieter</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {gutscheinAuswahlen.map((g) => {
                const style = GUTSCHEIN_STYLES[g.anbieter as GutscheinAnbieterKey];
                return (
                  <tr key={g.id} className="border-t border-[var(--color-border)]">
                    <td className="px-4 py-2.5 text-[var(--color-text)]">
                      {format(new Date(Date.UTC(g.year, g.month - 1, 1)), "MMMM yyyy", { locale: de })}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block rounded-full px-3 py-1 text-xs font-semibold" style={{ background: style.bg, color: style.text }}>
                        {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <BeschafftToggle id={g.id} employeeId={id} beschafft={g.beschafft} />
                    </td>
                  </tr>
                );
              })}
              {gutscheinAuswahlen.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                    Noch keine Auswahl erfasst.
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
