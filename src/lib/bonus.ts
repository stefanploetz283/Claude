import { addDays, startOfWeek } from "date-fns";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

export const ZIELQUOTE = 75;
export const EURO_PRO_PUNKT = 150;
export const SACHBEZUG_BETRAG = 50;

export type Quarter = 1 | 2 | 3 | 4;

export function getCurrentQuarter(now: Date = new Date()): { year: number; quarter: Quarter } {
  return { year: now.getFullYear(), quarter: (Math.floor(now.getMonth() / 3) + 1) as Quarter };
}

function getQuarterBounds(year: number, quarter: Quarter): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, (quarter - 1) * 3, 1));
  const end = new Date(Date.UTC(year, quarter * 3, 1)); // exklusiv
  return { start, end };
}

/** Montage aller Wochen, deren Wochenstart in den Zeitraum [start, end) fällt - jede Kalenderwoche gehört
 * so eindeutig zu genau einem Quartal (dem, das ihren Montag enthält). */
function getQuarterWeekStarts(year: number, quarter: Quarter): Date[] {
  const { start, end } = getQuarterBounds(year, quarter);
  let w = startOfWeek(start, { weekStartsOn: 1 });
  if (w.getTime() < start.getTime()) w = addDays(w, 7);
  const weeks: Date[] = [];
  while (w.getTime() < end.getTime()) {
    weeks.push(w);
    w = addDays(w, 7);
  }
  return weeks;
}

function overlapsAnyRange(weekdays: Date[], ranges: { start: Date; end: Date }[]): boolean {
  return weekdays.every((day) => ranges.some((r) => day.getTime() >= r.start.getTime() && day.getTime() <= r.end.getTime()));
}

function workdaysOf(weekStart: Date): Date[] {
  return [0, 1, 2, 3, 4].map((i) => addDays(weekStart, i)); // Mo-Fr
}

export type QuartalWeek = {
  weekStart: Date;
  weekEnd: Date;
  excluded: boolean;
  excludedReason: "betriebsferien" | "krankheit" | null;
  contractHours: number;
  billableHours: number;
  completed: boolean;
};

export type QuarterBonusResult = {
  weeks: QuartalWeek[];
  currentWeekIndex: number; // 1-basiert, für "Woche X/Y"-Anzeige
  quartalsquote: number | null; // null, wenn keine Anwesenheitswochen im Nenner
  punkteUeberZiel: number;
  bonus: number;
  prognose: {
    available: boolean;
    quote: number | null;
    bonus: number | null;
    completedWeeksCount: number;
  };
};

export function weightedQuote(weeks: QuartalWeek[]): number | null {
  const relevant = weeks.filter((w) => !w.excluded);
  const totalContract = relevant.reduce((sum, w) => sum + w.contractHours, 0);
  if (totalContract <= 0) return null;
  const totalBillable = relevant.reduce((sum, w) => sum + w.billableHours, 0);
  return (totalBillable / totalContract) * 100;
}

export function bonusFromQuote(quote: number | null): number {
  if (quote == null) return 0;
  const punkte = Math.max(0, quote - ZIELQUOTE);
  return Math.round(punkte * EURO_PRO_PUNKT * 100) / 100;
}

/** Berechnet Quartalsquote, Bonus und Prognose für einen Mitarbeiter in einem Quartal. */
export async function computeQuarterBonus(
  employee: User,
  year: number,
  quarter: Quarter,
  now: Date = new Date()
): Promise<QuarterBonusResult> {
  const weekStarts = getQuarterWeekStarts(year, quarter);
  const contractHours = employee.weeklyContractHours?.toNumber() ?? 0;

  const quarterStart = weekStarts[0] ?? new Date(Date.UTC(year, (quarter - 1) * 3, 1));
  const quarterEnd = addDays(weekStarts[weekStarts.length - 1] ?? quarterStart, 7);

  const [betriebsferien, krankheiten, serviceEntries] = await Promise.all([
    prisma.betriebsferienPeriod.findMany({
      where: { startDate: { lt: quarterEnd }, endDate: { gte: quarterStart } },
    }),
    prisma.absence.findMany({
      where: { employeeId: employee.id, type: "KRANK", startDate: { lt: quarterEnd }, endDate: { gte: quarterStart } },
    }),
    prisma.serviceEntry.findMany({
      where: { employeeId: employee.id, date: { gte: quarterStart, lt: quarterEnd } },
      select: { date: true, durationMinutes: true },
    }),
  ]);

  const ferienRanges = betriebsferien.map((b) => ({ start: b.startDate, end: b.endDate }));
  const krankRanges = krankheiten.map((k) => ({ start: k.startDate, end: k.endDate }));

  const billableByWeek = new Map<number, number>();
  for (const e of serviceEntries) {
    const weekStart = startOfWeek(e.date, { weekStartsOn: 1 }).getTime();
    billableByWeek.set(weekStart, (billableByWeek.get(weekStart) ?? 0) + e.durationMinutes / 60);
  }

  let currentWeekIndex = 0;
  const weeks: QuartalWeek[] = weekStarts.map((weekStart, i) => {
    const weekEnd = addDays(weekStart, 6);
    const weekdays = workdaysOf(weekStart);
    const isBetriebsferien = overlapsAnyRange(weekdays, ferienRanges);
    const isKrankheit = !isBetriebsferien && overlapsAnyRange(weekdays, krankRanges);
    const completed = addDays(weekStart, 7).getTime() <= now.getTime();
    if (weekStart.getTime() <= now.getTime() && addDays(weekStart, 7).getTime() > now.getTime()) currentWeekIndex = i + 1;

    return {
      weekStart,
      weekEnd,
      excluded: isBetriebsferien || isKrankheit,
      excludedReason: isBetriebsferien ? "betriebsferien" : isKrankheit ? "krankheit" : null,
      contractHours: isBetriebsferien ? 0 : contractHours,
      billableHours: billableByWeek.get(weekStart.getTime()) ?? 0,
      completed,
    };
  });
  if (currentWeekIndex === 0) currentWeekIndex = now.getTime() < quarterStart.getTime() ? 1 : weeks.length;

  const quartalsquote = weightedQuote(weeks);
  const bonus = bonusFromQuote(quartalsquote);

  const completedWeeks = weeks.filter((w) => w.completed);
  const completedWeeksCount = completedWeeks.length;
  const prognoseAvailable = completedWeeksCount >= 1;
  const prognoseQuote = prognoseAvailable ? weightedQuote(completedWeeks) : null;

  return {
    weeks,
    currentWeekIndex,
    quartalsquote,
    punkteUeberZiel: quartalsquote != null ? Math.max(0, quartalsquote - ZIELQUOTE) : 0,
    bonus,
    prognose: {
      available: prognoseAvailable,
      quote: prognoseQuote,
      bonus: prognoseAvailable ? bonusFromQuote(prognoseQuote) : null,
      completedWeeksCount,
    },
  };
}

export type UpcomingWeek = { weekStart: Date; weekEnd: Date; isBetriebsferien: boolean };

/** Für den Kapazitätskalender: die nächsten `count` Wochen ab jetzt, mit Betriebsferien-Kennzeichnung. */
export function buildUpcomingWeeks(now: Date, count: number, periods: { startDate: Date; endDate: Date }[]): UpcomingWeek[] {
  const ranges = periods.map((p) => ({ start: p.startDate, end: p.endDate }));
  const firstWeek = startOfWeek(now, { weekStartsOn: 1 });
  const weeks: UpcomingWeek[] = [];
  for (let i = 0; i < count; i++) {
    const weekStart = addDays(firstWeek, i * 7);
    weeks.push({ weekStart, weekEnd: addDays(weekStart, 6), isBetriebsferien: overlapsAnyRange(workdaysOf(weekStart), ranges) });
  }
  return weeks;
}
