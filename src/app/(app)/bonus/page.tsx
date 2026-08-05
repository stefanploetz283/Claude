import { redirect } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { computeQuarterBonus, buildUpcomingWeeks, getCurrentQuarter, EURO_PRO_PUNKT, ZIELQUOTE } from "@/lib/bonus";
import { QuoteRing } from "./quote-ring";
import { CapacityCalendar } from "./capacity-calendar";
import { GutscheinPicker } from "./gutschein-picker";
import { BONUS_PRIMARY, BONUS_LIGHT, BONUS_DARK_TEXT } from "@/lib/bonus-colors";
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
  if (user.role === "VERWALTUNG") redirect("/dashboard");

  const employee = await prisma.user.findUnique({ where: { id: user.id } });
  const now = new Date();

  if (!employee?.weeklyContractHours) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Bonus</h1>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
          <p className="text-sm text-[var(--color-text-muted)]">
            Für dich sind noch keine Vertragsstunden hinterlegt. Bitte den Admin bitten, das unter Mitarbeiter einzutragen.
          </p>
        </div>
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
      <div className="flex items-center gap-2.5">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={BONUS_PRIMARY} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">
          {getHeadline(result.currentWeekIndex, prognoseQuote)}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
          <QuoteRing quote={prognoseQuote ?? 0} weekLabel={weekLabel} quarterKey={quarterKey} />
        </div>

        <div
          className="flex flex-col justify-center gap-1.5 rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-soft)] lg:col-span-2"
          style={{ background: BONUS_LIGHT }}
        >
          <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: BONUS_DARK_TEXT }}>
            Prognose bei diesem Tempo
          </span>
          {result.prognose.available && prognoseQuote != null ? (
            <>
              <span className="text-4xl font-bold" style={{ color: BONUS_DARK_TEXT }}>
                {formatEuro(result.prognose.bonus ?? 0)}
              </span>
              <span className="text-sm" style={{ color: BONUS_DARK_TEXT }}>
                wenn&apos;s so weiterläuft, bis Quartalsende ({prognoseQuote.toFixed(1)}% Quote)
              </span>
            </>
          ) : (
            <span className="text-lg font-medium" style={{ color: BONUS_DARK_TEXT }}>
              Noch zu wenig Daten für eine Prognose – ab Woche 2 verfügbar.
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
          <div className="text-[28px] leading-none font-bold text-[var(--color-text)]">{punkteUeberZiel.toFixed(2)}</div>
          <div className="mt-1.5 text-sm font-semibold text-[var(--color-text)]">Punkte über Ziel</div>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
          <div className="text-[28px] leading-none font-bold text-[var(--color-text)]">{EURO_PRO_PUNKT.toFixed(0)} €</div>
          <div className="mt-1.5 text-sm font-semibold text-[var(--color-text)]">Pro Punkt</div>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <CapacityCalendar weeks={upcomingWeeks} />
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <GutscheinPicker
          year={now.getFullYear()}
          month={month}
          monthLabel={format(now, "MMMM yyyy", { locale: de })}
          selected={(gutschein?.anbieter as GutscheinAnbieterKey) ?? null}
        />
      </div>
    </div>
  );
}
