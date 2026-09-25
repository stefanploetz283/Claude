import { redirect } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { computeQuarterBonus, buildUpcomingWeeks, getCurrentQuarter, EURO_PRO_PUNKT, ZIELQUOTE } from "@/lib/bonus";
import { QuoteRing } from "./quote-ring";
import { CapacityCalendar } from "./capacity-calendar";
import { GutscheinPicker } from "./gutschein-picker";
import { ProsCard } from "@/components/pros/pros-card";
import { pageTitleCls } from "@/app/(app)/cases/case-ui";
import type { GutscheinAnbieterKey } from "@/lib/bonus-colors";

function formatEuro(amount: number): string {
  return amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function getHeadline(currentWeekIndex: number, prognoseQuote: number | null): string {
  if (prognoseQuote == null) return "Start ins neue Quartal";
  if (prognoseQuote >= ZIELQUOTE) return `Guter Rhythmus in Woche ${currentWeekIndex}`;
  if (prognoseQuote >= ZIELQUOTE - 10) return `Auf gutem Weg in Woche ${currentWeekIndex}`;
  return `Noch Luft nach oben in Woche ${currentWeekIndex}`;
}

export default async function BonusPage() {
  const user = await requireUser();
  if (user.role === "VERWALTUNG") redirect("/heute");

  const employee = await prisma.user.findUnique({ where: { id: user.id } });
  const now = new Date();

  if (!employee?.weeklyContractHours) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className={pageTitleCls}>Bonus</h1>
        </div>
        <ProsCard className="p-5">
          <p className="text-sm text-[var(--color-text-muted)]">
            Für dich sind noch keine Vertragsstunden hinterlegt. Bitte den Admin bitten, das unter Mitarbeiter einzutragen.
          </p>
        </ProsCard>
      </div>
    );
  }

  const { year, quarter } = getCurrentQuarter(now);
  const result = await computeQuarterBonus(employee, year, quarter, now);

  const periods = await prisma.betriebsferienPeriod.findMany();
  const upcomingWeeks = buildUpcomingWeeks(now, 8, periods);

  const month = now.getMonth() + 1;
  const gutschein = await prisma.gutscheinAuswahl.findUnique({
    where: { employeeId_year_month: { employeeId: employee.id, year: now.getFullYear(), month } },
  });

  const weekLabel = `Woche ${result.currentWeekIndex}/${result.weeks.length}`;
  const quarterKey = `${year}-Q${quarter}`;
  const prognoseQuote = result.prognose.quote;
  const punkteUeberZiel = prognoseQuote != null ? Math.max(0, prognoseQuote - ZIELQUOTE) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--pros-sage-soft)] text-[var(--color-primary)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        </span>
        <h1 className={pageTitleCls}>{getHeadline(result.currentWeekIndex, prognoseQuote)}</h1>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ProsCard className="flex flex-col items-center justify-center p-6">
          <QuoteRing quote={prognoseQuote ?? 0} weekLabel={weekLabel} quarterKey={quarterKey} />
        </ProsCard>

        {/* Primäre Kennzahl im Salbei-Verlauf - dieselbe Fläche wie die primäre ProsKpiCard. */}
        <div className="flex flex-col justify-center gap-1.5 rounded-[var(--pros-r-md)] border border-[var(--pros-sage-soft)] bg-gradient-to-br from-[var(--pros-sage-soft)] to-[#CFDCC8] p-6 shadow-[var(--pros-shadow)] lg:col-span-2">
          <span className="text-sm font-semibold text-[var(--color-primary)]">Prognose bei diesem Tempo</span>
          {result.prognose.available && prognoseQuote != null ? (
            <>
              <span className="text-4xl font-bold tabular-nums text-[var(--color-primary)]">{formatEuro(result.prognose.bonus ?? 0)}</span>
              <span className="text-sm text-[var(--color-text)]">
                wenn&apos;s so weiterläuft, bis Quartalsende ({prognoseQuote.toFixed(1)}% Quote)
              </span>
            </>
          ) : (
            <span className="text-lg font-medium text-[var(--color-primary)]">Noch zu wenig Daten für eine Prognose – ab Woche 2 verfügbar.</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <ProsCard className="p-5">
          <div className="text-[28px] leading-none font-bold tabular-nums text-[var(--color-text)]">{punkteUeberZiel.toFixed(2)}</div>
          <div className="mt-1.5 text-sm font-semibold text-[var(--color-text)]">Punkte über Ziel</div>
        </ProsCard>
        <ProsCard className="p-5">
          <div className="text-[28px] leading-none font-bold tabular-nums text-[var(--color-text)]">{EURO_PRO_PUNKT.toFixed(0)} €</div>
          <div className="mt-1.5 text-sm font-semibold text-[var(--color-text)]">Pro Punkt</div>
        </ProsCard>
      </div>

      <ProsCard className="p-[18px]">
        <CapacityCalendar weeks={upcomingWeeks} />
      </ProsCard>

      <ProsCard className="p-[18px]">
        <GutscheinPicker
          year={now.getFullYear()}
          month={month}
          monthLabel={format(now, "MMMM yyyy", { locale: de })}
          selected={(gutschein?.anbieter as GutscheinAnbieterKey) ?? null}
        />
      </ProsCard>
    </div>
  );
}
