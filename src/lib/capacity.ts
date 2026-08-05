import { addWeeks, differenceInCalendarWeeks, startOfWeek } from "date-fns";
import type { Case, Client, HelpType, HelpTypeActivityProfile, User } from "@prisma/client";

export type CaseWithProfile = Case & {
  client: Client;
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

export type WeeklyCaseEntry = {
  caseId: string;
  clientName: string;
  helpTypeId: string;
  helpTypeName: string;
  rate: number;
};

export type WeeklyCapacityBreakdown = {
  weekStart: Date;
  capacity: number;
  used: number;
  free: number;
  entries: WeeklyCaseEntry[];
  /** Summierte Rate je Hilfeart in dieser Woche, für die gestapelte Flächendarstellung. */
  byHelpType: { helpTypeId: string; helpTypeName: string; rate: number }[];
};

export type WeeklyCapacityPoint = { weekStart: Date; used: number; capacity: number; free: number };

/**
 * Simuliert die Wochenauslastung einer Fachkraft über einen Horizont (Wochen ab `from`), inkl. Aufschlüsselung
 * nach einzelnen Fällen und nach Hilfeart - Basis sowohl für die Zeitstrahl-Grafik als auch für die
 * aggregierte Kapazitätslinie (`toCapacityPoints`).
 */
export function simulateEmployeeWeeklyBreakdown(
  employee: User,
  cases: CaseWithProfile[],
  billableCapacityFactor: number,
  horizonWeeks: number,
  from: Date = new Date()
): WeeklyCapacityBreakdown[] {
  const capacity = getEmployeeCapacity(employee, billableCapacityFactor);
  const start = startOfWeek(from, { weekStartsOn: 1 });
  const points: WeeklyCapacityBreakdown[] = [];

  for (let i = 0; i < horizonWeeks; i++) {
    const weekStart = addWeeks(start, i);

    const entries: WeeklyCaseEntry[] = cases
      .map((c) => ({
        caseId: c.id,
        clientName: `${c.client.lastName}, ${c.client.firstName}`,
        helpTypeId: c.helpTypeId,
        helpTypeName: c.helpType.name,
        rate: getCaseWeeklyRateAtDate(c, weekStart),
      }))
      .filter((e) => e.rate > 0.001);

    const byHelpTypeMap = new Map<string, { helpTypeName: string; rate: number }>();
    for (const e of entries) {
      const existing = byHelpTypeMap.get(e.helpTypeId);
      if (existing) existing.rate += e.rate;
      else byHelpTypeMap.set(e.helpTypeId, { helpTypeName: e.helpTypeName, rate: e.rate });
    }
    const byHelpType = Array.from(byHelpTypeMap.entries()).map(([helpTypeId, v]) => ({ helpTypeId, ...v }));

    const used = entries.reduce((sum, e) => sum + e.rate, 0);
    points.push({ weekStart, capacity, used, free: capacity - used, entries, byHelpType });
  }

  return points;
}

/** Aggregierte Sicht (ohne Fall-/Hilfeart-Details) für die Lückensuche der Warteliste. */
export function toCapacityPoints(breakdown: WeeklyCapacityBreakdown[]): WeeklyCapacityPoint[] {
  return breakdown.map((p) => ({ weekStart: p.weekStart, used: p.used, capacity: p.capacity, free: p.free }));
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
