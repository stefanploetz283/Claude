import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { monthDateRange } from "@/lib/date";

export type PeriodType = "month" | "quarter" | "year";
export type AmpelStatus = "gruen" | "gelb" | "rot";

// ---------- Bayerische Feiertage ----------
// Gauss'sche Osterformel (anonymer gregorianischer Algorithmus) - keine externe Abhängigkeit nötig.
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

const FIXED_BAYERN_FEIERTAGE: [number, number][] = [
  [1, 1], // Neujahr
  [1, 6], // Heilige Drei Könige
  [5, 1], // Tag der Arbeit
  [8, 15], // Mariä Himmelfahrt - vereinfachend praxisweit angenommen (in Bayern nur mehrheitlich kath. Gemeinden)
  [10, 3], // Tag der Deutschen Einheit
  [11, 1], // Allerheiligen
  [12, 25], // 1. Weihnachtstag
  [12, 26], // 2. Weihnachtstag
];

/** Feiertage in Bayern (vereinfacht, ohne Fronleichnam-Sonderregeln nach Landkreis). */
export function isBayerischerFeiertag(date: Date): boolean {
  if (FIXED_BAYERN_FEIERTAGE.some(([m, d]) => date.getUTCMonth() + 1 === m && date.getUTCDate() === d)) return true;
  const easter = easterSunday(date.getUTCFullYear());
  const movable = [
    addDays(easter, -2), // Karfreitag
    addDays(easter, 1), // Ostermontag
    addDays(easter, 39), // Christi Himmelfahrt
    addDays(easter, 50), // Pfingstmontag
    addDays(easter, 60), // Fronleichnam
  ];
  return movable.some((d) => isSameUtcDay(d, date));
}

// ---------- Arbeitstage ----------
export type DateRange = { start: Date; end: Date };

function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function isWorkday(date: Date, betriebsferien: DateRange[]): boolean {
  const dow = date.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  if (isBayerischerFeiertag(date)) return false;
  if (betriebsferien.some((r) => date.getTime() >= r.start.getTime() && date.getTime() <= r.end.getTime())) return false;
  return true;
}

/** Zählt Arbeitstage (Mo-Fr, ohne bayerische Feiertage, ohne Betriebsferien) in [from, to], beide Grenzen inklusive. */
export function countWorkdays(from: Date, to: Date, betriebsferien: DateRange[]): number {
  let count = 0;
  let d = toUtcMidnight(from);
  const end = toUtcMidnight(to);
  while (d.getTime() <= end.getTime()) {
    if (isWorkday(d, betriebsferien)) count++;
    d = addDays(d, 1);
  }
  return count;
}

// ---------- Zeiträume ----------
export function getPeriodBounds(type: PeriodType, year: number, periodIndex: number): { from: Date; to: Date } {
  if (type === "month") return monthDateRange(year, periodIndex);
  if (type === "quarter") {
    const startMonth = (periodIndex - 1) * 3;
    return { from: new Date(Date.UTC(year, startMonth, 1)), to: new Date(Date.UTC(year, startMonth + 3, 1) - 1) };
  }
  return { from: new Date(Date.UTC(year, 0, 1)), to: new Date(Date.UTC(year + 1, 0, 1) - 1) };
}

// ---------- Kernberechnungen ----------

/** Summe (dokumentierte FLS-Std × zugehöriger Stundensatz) - reine Funktion, DB-unabhängig testbar. */
export function computeUmsatz(entries: { durationMinutes: number; stundensatz: number }[]): number {
  return entries.reduce((sum, e) => sum + (e.durationMinutes / 60) * e.stundensatz, 0);
}

/** Run-Rate-Hochrechnung: Umsatz_bisher / Arbeitstage_bisher × Arbeitstage_gesamt. */
export function computeHochrechnung(umsatzBisher: number, arbeitstageBisher: number, arbeitstageGesamt: number): number {
  if (arbeitstageBisher <= 0) return 0;
  return (umsatzBisher / arbeitstageBisher) * arbeitstageGesamt;
}

export function computeZielUmsatzJahr(gesamtkostenJahr: number, zielFaktor: number): number {
  return gesamtkostenJahr * zielFaktor;
}

export function computeZielUmsatzAnteilig(zielUmsatzJahr: number, arbeitstageGesamtZeitraum: number, arbeitstageJahrGesamt: number): number {
  if (arbeitstageJahrGesamt <= 0) return 0;
  return zielUmsatzJahr * (arbeitstageGesamtZeitraum / arbeitstageJahrGesamt);
}

export function computeAbweichungProzent(hochrechnung: number, zielUmsatzAnteilig: number): number {
  if (zielUmsatzAnteilig === 0) return 0;
  return ((hochrechnung - zielUmsatzAnteilig) / zielUmsatzAnteilig) * 100;
}

export function computeAmpel(abweichungProzent: number): AmpelStatus {
  if (abweichungProzent >= 0) return "gruen";
  if (abweichungProzent >= -10) return "gelb";
  return "rot";
}

export function computeFaktorAktuell(hochrechnungJahr: number, gesamtkostenJahr: number): number | null {
  if (gesamtkostenJahr <= 0) return null;
  return hochrechnungJahr / gesamtkostenJahr;
}

export type MitarbeiterBeitrag = {
  employeeId: string;
  employeeName: string;
  flsStunden: number;
  beitragEuro: number;
  anteilProzent: number;
};

export function computeBeitraege(
  byEmployee: Map<string, { name: string; flsStunden: number; beitragEuro: number }>,
  umsatzBisher: number
): MitarbeiterBeitrag[] {
  return Array.from(byEmployee.entries())
    .map(([employeeId, v]) => ({
      employeeId,
      employeeName: v.name,
      flsStunden: v.flsStunden,
      beitragEuro: v.beitragEuro,
      anteilProzent: umsatzBisher > 0 ? (v.beitragEuro / umsatzBisher) * 100 : 0,
    }))
    .sort((a, b) => b.beitragEuro - a.beitragEuro);
}

export type LiquiditaetsMonat = { monatLabel: string; erwarteterGeldeingang: number; erwarteteAusgaben: number };

/** Verschiebt den Monatsumsatz um Zahlungsverzug_Tage - reine Anzeige, kein Buchhaltungsersatz. */
export function shiftPaymentDate(invoiceDate: Date, zahlungsverzugTage: number): Date {
  return addDays(invoiceDate, zahlungsverzugTage);
}

// ---------- Orchestrierung (DB) ----------

export type UmsatzCockpitResult = {
  periodType: PeriodType;
  year: number;
  periodIndex: number;
  umsatzBisher: number;
  arbeitstageBisher: number;
  arbeitstageGesamt: number;
  hochrechnung: number;
  zielUmsatzAnteilig: number | null;
  abweichungProzent: number | null;
  ampel: AmpelStatus | null;
  faktorAktuell: number | null;
  faktorWarnung: boolean;
  beitraege: MitarbeiterBeitrag[];
  verlauf: { datum: string; kumuliert: number; ziel: number }[];
};

export async function computeUmsatzCockpit(
  periodType: PeriodType,
  year: number,
  periodIndex: number,
  now: Date = new Date()
): Promise<UmsatzCockpitResult> {
  const { from, to } = getPeriodBounds(periodType, year, periodIndex);
  const yearBounds = getPeriodBounds("year", year, 1);

  const [settings, betriebsferienRows, entries, entriesYear] = await Promise.all([
    prisma.settings.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } }),
    prisma.betriebsferienPeriod.findMany({ where: { startDate: { lte: to }, endDate: { gte: from } } }),
    prisma.serviceEntry.findMany({
      where: { date: { gte: from, lte: to } },
      select: {
        durationMinutes: true,
        employeeId: true,
        employee: { select: { name: true } },
        case: { select: { stundensatz: true } },
      },
    }),
    prisma.serviceEntry.findMany({
      where: { date: { gte: yearBounds.from, lte: yearBounds.to } },
      select: { durationMinutes: true, case: { select: { stundensatz: true } } },
    }),
  ]);

  const stundensatzBasis = settings.hourlyRate?.toNumber() ?? 110;
  const gesamtkostenJahr = settings.gesamtkostenJahr?.toNumber() ?? null;
  const zielFaktor = settings.zielFaktor.toNumber();
  const mindestFaktor = settings.mindestFaktorSteuerberater.toNumber();

  const betriebsferien: DateRange[] = betriebsferienRows.map((b) => ({ start: b.startDate, end: b.endDate }));

  const nowClamped = now.getTime() < from.getTime() ? from : now.getTime() > to.getTime() ? to : now;
  const arbeitstageBisher = countWorkdays(from, nowClamped, betriebsferien);
  const arbeitstageGesamt = countWorkdays(from, to, betriebsferien);
  const arbeitstageJahrGesamt = countWorkdays(yearBounds.from, yearBounds.to, betriebsferien);

  const byEmployee = new Map<string, { name: string; flsStunden: number; beitragEuro: number }>();
  let umsatzBisher = 0;
  for (const e of entries) {
    const satz = e.case.stundensatz?.toNumber() ?? stundensatzBasis;
    const stunden = e.durationMinutes / 60;
    const beitrag = stunden * satz;
    umsatzBisher += beitrag;
    const existing = byEmployee.get(e.employeeId) ?? { name: e.employee.name ?? "?", flsStunden: 0, beitragEuro: 0 };
    existing.flsStunden += stunden;
    existing.beitragEuro += beitrag;
    byEmployee.set(e.employeeId, existing);
  }

  const umsatzJahrBisher = entriesYear.reduce((sum, e) => sum + (e.durationMinutes / 60) * (e.case.stundensatz?.toNumber() ?? stundensatzBasis), 0);
  const arbeitstageJahrBisher = countWorkdays(yearBounds.from, nowClamped, betriebsferien);
  const hochrechnungJahr = computeHochrechnung(umsatzJahrBisher, arbeitstageJahrBisher, arbeitstageJahrGesamt);

  const hochrechnung = computeHochrechnung(umsatzBisher, arbeitstageBisher, arbeitstageGesamt);

  let zielUmsatzAnteilig: number | null = null;
  let abweichungProzent: number | null = null;
  let ampel: AmpelStatus | null = null;
  let faktorAktuell: number | null = null;
  if (gesamtkostenJahr != null && gesamtkostenJahr > 0) {
    const zielUmsatzJahr = computeZielUmsatzJahr(gesamtkostenJahr, zielFaktor);
    zielUmsatzAnteilig = computeZielUmsatzAnteilig(zielUmsatzJahr, arbeitstageGesamt, arbeitstageJahrGesamt);
    abweichungProzent = computeAbweichungProzent(hochrechnung, zielUmsatzAnteilig);
    ampel = computeAmpel(abweichungProzent);
    faktorAktuell = computeFaktorAktuell(hochrechnungJahr, gesamtkostenJahr);
  }
  const faktorWarnung = faktorAktuell != null && faktorAktuell < mindestFaktor;

  const beitraege = computeBeitraege(byEmployee, umsatzBisher);

  // Verlauf: kumulierter Umsatz pro Tag im Zeitraum bis heute, plus lineare Zielgerade (eigene Abfrage,
  // da hier zusätzlich das Datum jedes Eintrags gebraucht wird, das oben fürs Aggregat nicht selektiert wurde).
  const verlauf = await buildVerlauf(from, to, nowClamped, zielUmsatzAnteilig, arbeitstageGesamt, betriebsferien);

  return {
    periodType,
    year,
    periodIndex,
    umsatzBisher,
    arbeitstageBisher,
    arbeitstageGesamt,
    hochrechnung,
    zielUmsatzAnteilig,
    abweichungProzent,
    ampel,
    faktorAktuell,
    faktorWarnung,
    beitraege,
    verlauf,
  };
}

async function buildVerlauf(
  from: Date,
  to: Date,
  nowClamped: Date,
  zielUmsatzAnteilig: number | null,
  arbeitstageGesamt: number,
  betriebsferien: DateRange[]
): Promise<{ datum: string; kumuliert: number; ziel: number }[]> {
  const dailyEntries = await prisma.serviceEntry.findMany({
    where: { date: { gte: from, lte: to } },
    select: { date: true, durationMinutes: true, case: { select: { stundensatz: true } } },
  });
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  const stundensatzBasis = settings?.hourlyRate?.toNumber() ?? 110;

  const byDay = new Map<string, number>();
  for (const e of dailyEntries) {
    const key = toUtcMidnight(e.date).toISOString().slice(0, 10);
    const satz = e.case.stundensatz?.toNumber() ?? stundensatzBasis;
    byDay.set(key, (byDay.get(key) ?? 0) + (e.durationMinutes / 60) * satz);
  }

  const points: { datum: string; kumuliert: number; ziel: number }[] = [];
  let cumulative = 0;
  let workdaysSoFar = 0;
  let d = toUtcMidnight(from);
  const end = toUtcMidnight(nowClamped);
  while (d.getTime() <= end.getTime()) {
    const key = d.toISOString().slice(0, 10);
    cumulative += byDay.get(key) ?? 0;
    if (isWorkday(d, betriebsferien)) workdaysSoFar++;
    const ziel = zielUmsatzAnteilig != null && arbeitstageGesamt > 0 ? (zielUmsatzAnteilig / arbeitstageGesamt) * workdaysSoFar : 0;
    points.push({ datum: key, kumuliert: cumulative, ziel });
    d = addDays(d, 1);
  }
  return points;
}

/**
 * Reine Anzeige, kein Buchhaltungsersatz: für jeden der nächsten `monthsAhead` Monate (inkl. laufendem),
 * welcher Monatsumsatz - verschoben um den Zahlungsverzug - voraussichtlich als Geldeingang ankommt, neben
 * den laufenden Ausgaben (Personal-/Betriebskosten, als Jahreswert/12 angenähert). Der "Quellmonat" eines
 * Geldeingangs ist der Monat, dessen Rechnungsstellung (~Monatsende) plus Zahlungsverzug in den Anzeige-
 * monat fällt; ist der Quellmonat der laufende Monat, wird dessen Hochrechnung statt des bisherigen
 * Teil-Umsatzes verwendet, da der Monat zum Zeitpunkt des tatsächlichen Geldeingangs bereits abgeschlossen sein wird.
 */
export async function computeLiquiditaetsAusblick(monthsAhead: number, now: Date = new Date()): Promise<LiquiditaetsMonat[]> {
  const settings = await prisma.settings.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } });
  const zahlungsverzugTage = settings.zahlungsverzugTageJugendamt;
  const gesamtkostenJahr = settings.gesamtkostenJahr?.toNumber() ?? null;
  const erwarteteAusgaben = gesamtkostenJahr != null ? gesamtkostenJahr / 12 : 0;

  const monthLabelFmt = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" });

  const result: LiquiditaetsMonat[] = [];
  for (let i = 0; i < monthsAhead; i++) {
    const displayMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    // Quellmonat: Rechnungsstellung ca. am Ende des Vormonats zum Zahlungsverzug zurückgerechnet.
    const sourceProbe = addDays(displayMonthStart, -zahlungsverzugTage);
    const sourceYear = sourceProbe.getUTCFullYear();
    const sourceMonth = sourceProbe.getUTCMonth() + 1;

    const { from, to } = monthDateRange(sourceYear, sourceMonth);
    const isCurrentSourceMonth = sourceYear === now.getUTCFullYear() && sourceMonth === now.getUTCMonth() + 1;
    const entries = await prisma.serviceEntry.findMany({
      where: { date: { gte: from, lte: to } },
      select: { durationMinutes: true, case: { select: { stundensatz: true } } },
    });
    const stundensatzBasis = settings.hourlyRate?.toNumber() ?? 110;
    const sourceUmsatz = computeUmsatz(entries.map((e) => ({ durationMinutes: e.durationMinutes, stundensatz: e.case.stundensatz?.toNumber() ?? stundensatzBasis })));

    let erwarteterGeldeingang = sourceUmsatz;
    if (isCurrentSourceMonth) {
      const betriebsferienRows = await prisma.betriebsferienPeriod.findMany({ where: { startDate: { lte: to }, endDate: { gte: from } } });
      const betriebsferien = betriebsferienRows.map((b) => ({ start: b.startDate, end: b.endDate }));
      const nowClamped = now.getTime() > to.getTime() ? to : now;
      const arbeitstageBisher = countWorkdays(from, nowClamped, betriebsferien);
      const arbeitstageGesamt = countWorkdays(from, to, betriebsferien);
      erwarteterGeldeingang = computeHochrechnung(sourceUmsatz, arbeitstageBisher, arbeitstageGesamt);
    }

    result.push({
      monatLabel: monthLabelFmt.format(displayMonthStart),
      erwarteterGeldeingang,
      erwarteteAusgaben,
    });
  }
  return result;
}
