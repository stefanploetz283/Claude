import { addWeeks, differenceInCalendarWeeks, startOfWeek } from "date-fns";
import type { Case, HelpType, HelpTypeActivityProfile, User } from "@prisma/client";

export type CaseWithProfile = Case & {
  helpType: HelpType & { activityProfiles: HelpTypeActivityProfile[] };
};

/** Wochenrate eines Falls = Summe der Wochenprofil-Komponenten seiner Hilfeart (unbekannte Werte zählen als 0). */
export function getCaseWeeklyRate(c: CaseWithProfile): number {
  return c.helpType.activityProfiles.reduce((sum, p) => sum + (p.hoursPerWeek?.toNumber() ?? 0), 0);
}

/**
 * Vergleichswert Stundenkontingent/Laufzeit-Wochen - NICHT für die Kapazitätsrechnung, sondern um zu
 * erkennen, ob ein Fall sein Kontingent schneller/langsamer verbraucht als die Wochenprofil-Summe nahelegt.
 */
export function getCaseBudgetAverage(c: Case): number | null {
  if (!c.expectedEndDate) return null;
  const weeks = differenceInCalendarWeeks(c.expectedEndDate, c.startDate);
  if (weeks <= 0) return null;
  return c.hoursContingent.toNumber() / weeks;
}

/** Wochenrate eines Falls an einem bestimmten Datum, inkl. linear auslaufender Phase-Out-Rampe. */
export function getCaseWeeklyRateAtDate(c: CaseWithProfile, date: Date): number {
  const baseRate = getCaseWeeklyRate(c);
  if (date < c.startDate) return 0;
  if (!c.expectedEndDate) return baseRate;
  if (date >= c.expectedEndDate) return 0;
  if (!c.phaseOutWeeks || c.phaseOutWeeks <= 0) return baseRate;

  const phaseOutStart = addWeeks(c.expectedEndDate, -c.phaseOutWeeks);
  if (date < phaseOutStart) return baseRate;

  const totalMs = c.expectedEndDate.getTime() - phaseOutStart.getTime();
  const elapsedMs = date.getTime() - phaseOutStart.getTime();
  const fraction = 1 - elapsedMs / totalMs;
  return baseRate * Math.max(0, fraction);
}

export function getEmployeeCapacity(employee: User, billableCapacityFactor: number): number {
  const contract = employee.weeklyContractHours?.toNumber() ?? 0;
  return contract * billableCapacityFactor;
}

export type WeeklyCapacityPoint = { weekStart: Date; used: number; capacity: number; free: number };

/** Simuliert die Wochenauslastung einer Fachkraft über einen Horizont (Wochen ab `from`). */
export function simulateEmployeeWeeklyCapacity(
  employee: User,
  cases: CaseWithProfile[],
  billableCapacityFactor: number,
  horizonWeeks: number,
  from: Date = new Date()
): WeeklyCapacityPoint[] {
  const capacity = getEmployeeCapacity(employee, billableCapacityFactor);
  const start = startOfWeek(from, { weekStartsOn: 1 });
  const points: WeeklyCapacityPoint[] = [];
  for (let i = 0; i < horizonWeeks; i++) {
    const weekStart = addWeeks(start, i);
    const used = cases.reduce((sum, c) => sum + getCaseWeeklyRateAtDate(c, weekStart), 0);
    points.push({ weekStart, used, capacity, free: capacity - used });
  }
  return points;
}

/**
 * Findet das früheste Zeitfenster, ab dem ausreichend Kapazität für `requiredWeeklyRate` zur Verfügung
 * steht. Das Fenster-Ende wächst mit, solange die freie Kapazität noch weiter steigt (laufende
 * Auslaufphase), begrenzt auf `maxWindowWeeks` - Heuristik für eine menschliche Einplanungs-Entscheidung,
 * keine exakte Optimierung.
 */
export function findCapacityWindow(
  points: WeeklyCapacityPoint[],
  requiredWeeklyRate: number,
  maxWindowWeeks = 8
): { fromWeek: Date; toWeek: Date } | null {
  const fromIndex = points.findIndex((p) => p.free >= requiredWeeklyRate);
  if (fromIndex === -1) return null;

  const cap = Math.min(points.length - 1, fromIndex + maxWindowWeeks);
  let toIndex = fromIndex;
  while (toIndex < cap && points[toIndex + 1].free > points[toIndex].free) {
    toIndex++;
  }
  return { fromWeek: points[fromIndex].weekStart, toWeek: points[toIndex].weekStart };
}
