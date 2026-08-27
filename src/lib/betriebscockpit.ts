// Betriebswirtschaftliches Cockpit: Quote/Kosten/Auslastungsrisiko - reine Berechnungslogik + Orchestrierung.
// Umsatz/Liquiditäts-Ausblick/Arbeitstagszählung bleiben bewusst in umsatz.ts (Wiederverwendung statt
// Duplikation), diese Datei ergänzt die drei anderen Blickwinkel aus dem Prompt.
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import type { KostenKategorie, PraxisKalkulation } from "@prisma/client";
import {
  isWorkday,
  countWorkdays,
  computeHochrechnung,
  getPeriodBounds,
  computeUmsatzCockpit,
  type UmsatzCockpitResult,
  type DateRange,
  type AmpelStatus,
  type PeriodType,
} from "@/lib/umsatz";
import { getActivePraxisKalkulation, praxisKalkulationTotals } from "@/lib/praxis-kalkulation";

export { getActivePraxisKalkulation, praxisKalkulationTotals };

export const KOSTEN_KATEGORIE_LIST: KostenKategorie[] = [
  "PERSONALKOSTEN",
  "RAUMKOSTEN",
  "VERWALTUNGSSACHKOSTEN",
  "SONSTIGE_KOSTEN_AFA",
];

export const KOSTEN_KATEGORIE_LABEL: Record<KostenKategorie, string> = {
  PERSONALKOSTEN: "Personalkosten",
  RAUMKOSTEN: "Raumkosten",
  VERWALTUNGSSACHKOSTEN: "Verwaltungssachkosten",
  SONSTIGE_KOSTEN_AFA: "Sonstige Kosten/AfA",
};

// ---------- Quote (Team_Ist_Quote, Break-Even, Szenario) ----------

/** Team_Ist_Quote = Summe(dokumentierte FLS-Std) / Summe(verfügbare Soll-Std) - Bruchzahl, kein Prozent. */
export function computeTeamIstQuote(dokumentierteStdSumme: number, verfuegbareSollStdSumme: number): number | null {
  if (verfuegbareSollStdSumme <= 0) return null;
  return dokumentierteStdSumme / verfuegbareSollStdSumme;
}

export function computeAbweichungQuotePunkte(teamIstQuote: number, zielQuote: number): number {
  return (teamIstQuote - zielQuote) * 100;
}

export function computeAbweichungKostenProzent(hochrechnungGesamtkostenJahr: number, geplanteGesamtkostenJahr: number): number {
  if (geplanteGesamtkostenJahr <= 0) return 0;
  return ((hochrechnungGesamtkostenJahr - geplanteGesamtkostenJahr) / geplanteGesamtkostenJahr) * 100;
}

export function computeAbweichungUmsatzProzent(hochrechnungUmsatzJahr: number, geplanteGesamtkostenJahr: number, zielFaktor: number): number {
  const zielUmsatz = geplanteGesamtkostenJahr * zielFaktor;
  if (zielUmsatz <= 0) return 0;
  return ((hochrechnungUmsatzJahr - zielUmsatz) / zielUmsatz) * 100;
}

/** Break_Even_Quote = Ziel_Quote × (Geplante_Gesamtkosten / (Ziel_FLS_Std_Jahr × Stundensatz_Basis)).
 * null, solange Ziel_FLS_Std_Jahr oder Stundensatz_Basis noch nicht gepflegt sind (Divisionsschutz). */
export function computeBreakEvenQuote(
  zielQuote: number,
  geplanteGesamtkostenJahr: number,
  zielFlsStdJahr: number,
  stundensatzBasis: number
): number | null {
  const nenner = zielFlsStdJahr * stundensatzBasis;
  if (nenner <= 0) return null;
  return zielQuote * (geplanteGesamtkostenJahr / nenner);
}

/** Abstand Ist-Quote zu Break-Even in Prozentpunkten - negativ = unterhalb Break-Even. */
export function computeAuslastungsreserve(teamIstQuote: number, breakEvenQuote: number): number {
  return (teamIstQuote - breakEvenQuote) * 100;
}

/** Gewinn/Verlust bei einer hypothetischen Quote (Szenario-Rechner, immer jahresbezogen). */
export function computeSzenario(
  angenommeneQuote: number,
  zielFlsStdJahr: number,
  zielQuote: number,
  stundensatzBasis: number,
  geplanteGesamtkostenJahr: number
): number | null {
  if (zielQuote <= 0) return null;
  const umsatz = angenommeneQuote * (zielFlsStdJahr / zielQuote) * stundensatzBasis;
  return umsatz - geplanteGesamtkostenJahr;
}

export function computeLiquiditaetsReichweiteMonate(liquideMittel: number, monatlicheFixkosten: number): number | null {
  if (monatlicheFixkosten <= 0) return null;
  return liquideMittel / monatlicheFixkosten;
}

/** Faktor_hochgerechnet = Hochrechnung_Umsatz_Jahr ÷ Hochrechnung_Gesamtkosten_Jahr - beide bereits
 * hochgerechnet (nicht Ist ÷ Plan, siehe Formel 5 im Prompt). */
export function computeFaktorHochgerechnet(hochrechnungUmsatzJahr: number, hochrechnungGesamtkostenJahr: number): number | null {
  if (hochrechnungGesamtkostenJahr <= 0) return null;
  return hochrechnungUmsatzJahr / hochrechnungGesamtkostenJahr;
}

// ---------- Ampeln (Warnregeln 1-5) ----------

export function ampelQuote(abweichungPunkte: number): AmpelStatus {
  if (abweichungPunkte < -10) return "rot";
  if (abweichungPunkte < -5) return "gelb";
  return "gruen";
}

export function ampelKosten(abweichungProzent: number): AmpelStatus {
  if (abweichungProzent > 10) return "rot";
  if (abweichungProzent > 5) return "gelb";
  return "gruen";
}

/** Faktor-Warnung wirkt unabhängig von anderen Ampeln (Warnregel 3) - null (nicht bewertbar) zählt nicht als Alarm. */
export function ampelFaktor(faktorHochgerechnet: number | null, mindestFaktor: number): AmpelStatus {
  if (faktorHochgerechnet == null) return "gruen";
  return faktorHochgerechnet < mindestFaktor ? "rot" : "gruen";
}

export function ampelAuslastungsreserve(reservePunkte: number | null): AmpelStatus {
  if (reservePunkte == null) return "gruen";
  if (reservePunkte < 0) return "rot";
  if (reservePunkte < 5) return "gelb";
  return "gruen";
}

export function ampelLiquiditaet(monate: number | null, rotUnter = 3, gelbUnter = 6): AmpelStatus {
  if (monate == null) return "gruen";
  if (monate < rotUnter) return "rot";
  if (monate < gelbUnter) return "gelb";
  return "gruen";
}

// ---------- Trendpfeile ----------

export type Trend = "hoch" | "stabil" | "runter";

/** Vergleich aktueller Wert vs. Durchschnitt der letzten 3 Monate - `schwelle` in derselben Einheit wie
 * die Werte (z.B. Prozentpunkte), unterhalb derer eine Änderung noch als "stabil" gilt. */
export function computeTrend(aktuell: number, referenzDurchschnitt: number, schwelle = 1): Trend {
  const diff = aktuell - referenzDurchschnitt;
  if (diff > schwelle) return "hoch";
  if (diff < -schwelle) return "runter";
  return "stabil";
}

// ---------- Verfügbare Arbeitstage (Team_Ist_Quote-Nenner) ----------

function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Wie countWorkdays, zieht zusätzlich Tage ab, die in eine der `abwesenheiten`-Ranges fallen (Urlaub/Krankheit). */
export function countAvailableWorkdays(from: Date, to: Date, betriebsferien: DateRange[], abwesenheiten: DateRange[]): number {
  let count = 0;
  let d = toUtcMidnight(from);
  const end = toUtcMidnight(to);
  while (d.getTime() <= end.getTime()) {
    const abwesend = abwesenheiten.some((r) => d.getTime() >= r.start.getTime() && d.getTime() <= r.end.getTime());
    if (isWorkday(d, betriebsferien) && !abwesend) count++;
    d = addDays(d, 1);
  }
  return count;
}

// ---------- Team-Quote (DB-Orchestrierung) ----------

export type MitarbeiterIstQuote = {
  employeeId: string;
  employeeName: string;
  dokumentierteStd: number;
  verfuegbareSollStd: number;
  istQuote: number | null;
};

export type TeamQuoteResult = {
  teamIstQuote: number | null;
  proMitarbeiter: MitarbeiterIstQuote[];
};

/** Team_Ist_Quote + Aufschlüsselung je Fachkraft für einen Zeitraum - Urlaub/Krankheit aus dem
 * bestehenden Zeit-&-Kapazität-Modul (Absence), kein Doppel-Tracking. Nur Rolle EMPLOYEE (Admin ohne
 * Vertragsstunden fließt nicht sinnvoll in eine Quote ein). */
export async function computeTeamQuote(from: Date, to: Date, now: Date = new Date()): Promise<TeamQuoteResult> {
  const nowClamped = now.getTime() < from.getTime() ? from : now.getTime() > to.getTime() ? to : now;

  const [employees, betriebsferienRows, absenceRows, serviceEntries] = await Promise.all([
    prisma.user.findMany({ where: { role: "EMPLOYEE", active: true } }),
    prisma.betriebsferienPeriod.findMany({ where: { startDate: { lte: to }, endDate: { gte: from } } }),
    prisma.absence.findMany({
      where: { type: { in: ["URLAUB", "KRANK"] }, startDate: { lte: to }, endDate: { gte: from } },
    }),
    prisma.serviceEntry.findMany({
      where: { date: { gte: from, lte: nowClamped } },
      select: { employeeId: true, durationMinutes: true },
    }),
  ]);

  const betriebsferien: DateRange[] = betriebsferienRows.map((b) => ({ start: b.startDate, end: b.endDate }));

  const absencesByEmployee = new Map<string, DateRange[]>();
  for (const a of absenceRows) {
    const list = absencesByEmployee.get(a.employeeId) ?? [];
    list.push({ start: a.startDate, end: a.endDate });
    absencesByEmployee.set(a.employeeId, list);
  }

  const docStdByEmployee = new Map<string, number>();
  for (const e of serviceEntries) {
    docStdByEmployee.set(e.employeeId, (docStdByEmployee.get(e.employeeId) ?? 0) + e.durationMinutes / 60);
  }

  const proMitarbeiter: MitarbeiterIstQuote[] = [];
  let sumDoc = 0;
  let sumSoll = 0;

  for (const e of employees) {
    const contractHours = e.weeklyContractHours?.toNumber() ?? 0;
    const workDays = e.weeklyWorkDays ?? 0;
    if (contractHours <= 0 || workDays <= 0) continue; // kein Vertrag hinterlegt, fließt nicht ein

    const stdProTag = contractHours / workDays;
    const verfuegbareTage = countAvailableWorkdays(from, nowClamped, betriebsferien, absencesByEmployee.get(e.id) ?? []);
    const verfuegbareSollStd = verfuegbareTage * stdProTag;
    const dokumentierteStd = docStdByEmployee.get(e.id) ?? 0;

    sumDoc += dokumentierteStd;
    sumSoll += verfuegbareSollStd;

    proMitarbeiter.push({
      employeeId: e.id,
      employeeName: e.name,
      dokumentierteStd,
      verfuegbareSollStd,
      istQuote: verfuegbareSollStd > 0 ? dokumentierteStd / verfuegbareSollStd : null,
    });
  }

  return { teamIstQuote: computeTeamIstQuote(sumDoc, sumSoll), proMitarbeiter };
}

// ---------- Kosten-Soll-Ist (Ist_Kosten_Eintrag, DB-Orchestrierung) ----------

export type KostenKategorieZeile = {
  kategorie: KostenKategorie;
  label: string;
  geplantJahr: number;
  istBisherJahr: number;
  hochrechnungJahr: number;
  abweichungEuro: number;
  abweichungProzent: number;
  /** Zuordnungsquelle-Kennzeichnung (Modul 3): Anzahl Ist_Kosten_Eintrag-Zeilen je Herkunft in dieser Kategorie. */
  anzahlManuell: number;
  anzahlFinomCsv: number;
};

export type KostenSollIstResult = {
  zeilen: KostenKategorieZeile[]; // größte |Abweichung_Prozent| zuerst
  hochrechnungGesamtkostenJahr: number;
  arbeitstageBisherJahr: number;
  arbeitstageGesamtJahr: number;
  letzterEintragAm: Date | null;
};

/** Hochrechnung_*_Jahr basiert laut Prompt immer auf dem Jahresverlauf (Ist_bisher_Jahr / Arbeitstage_bisher_Jahr
 * × Arbeitstage_gesamt_Jahr), unabhängig vom gewählten Anzeige-Zeitraum (Monat/Quartal/Jahr). */
export async function computeKostenSollIst(year: number, kalkulation: PraxisKalkulation, now: Date = new Date()): Promise<KostenSollIstResult> {
  const { from, to } = getPeriodBounds("year", year, 1);
  const nowClamped = now.getTime() < from.getTime() ? from : now.getTime() > to.getTime() ? to : now;

  const [betriebsferienRows, eintraege, letzter] = await Promise.all([
    prisma.betriebsferienPeriod.findMany({ where: { startDate: { lte: to }, endDate: { gte: from } } }),
    prisma.istKostenEintrag.findMany({ where: { datum: { gte: from, lte: nowClamped } } }),
    prisma.istKostenEintrag.findFirst({ orderBy: { datum: "desc" } }),
  ]);
  const betriebsferien: DateRange[] = betriebsferienRows.map((b) => ({ start: b.startDate, end: b.endDate }));

  const arbeitstageBisherJahr = countWorkdays(from, nowClamped, betriebsferien);
  const arbeitstageGesamtJahr = countWorkdays(from, to, betriebsferien);

  const istByKategorie = new Map<KostenKategorie, number>();
  const manuellByKategorie = new Map<KostenKategorie, number>();
  const finomCsvByKategorie = new Map<KostenKategorie, number>();
  for (const e of eintraege) {
    istByKategorie.set(e.kategorie, (istByKategorie.get(e.kategorie) ?? 0) + e.betrag.toNumber());
    const zielMap = e.quelle === "finom_csv" ? finomCsvByKategorie : manuellByKategorie;
    zielMap.set(e.kategorie, (zielMap.get(e.kategorie) ?? 0) + 1);
  }

  const planByKategorie: Record<KostenKategorie, number> = {
    PERSONALKOSTEN: kalkulation.geplantePersonalkostenJahr.toNumber(),
    RAUMKOSTEN: kalkulation.geplanteRaumkostenJahr.toNumber(),
    VERWALTUNGSSACHKOSTEN: kalkulation.geplanteVerwaltungssachkostenJahr.toNumber(),
    SONSTIGE_KOSTEN_AFA: kalkulation.geplanteSonstigeKostenAfaJahr.toNumber(),
  };

  const zeilen: KostenKategorieZeile[] = KOSTEN_KATEGORIE_LIST.map((kategorie) => {
    const istBisherJahr = istByKategorie.get(kategorie) ?? 0;
    const hochrechnungJahr = computeHochrechnung(istBisherJahr, arbeitstageBisherJahr, arbeitstageGesamtJahr);
    const geplantJahr = planByKategorie[kategorie];
    const abweichungEuro = hochrechnungJahr - geplantJahr;
    const abweichungProzent = geplantJahr > 0 ? (abweichungEuro / geplantJahr) * 100 : 0;
    return {
      kategorie,
      label: KOSTEN_KATEGORIE_LABEL[kategorie],
      geplantJahr,
      istBisherJahr,
      hochrechnungJahr,
      abweichungEuro,
      abweichungProzent,
      anzahlManuell: manuellByKategorie.get(kategorie) ?? 0,
      anzahlFinomCsv: finomCsvByKategorie.get(kategorie) ?? 0,
    };
  }).sort((a, b) => Math.abs(b.abweichungProzent) - Math.abs(a.abweichungProzent));

  return {
    zeilen,
    hochrechnungGesamtkostenJahr: zeilen.reduce((sum, z) => sum + z.hochrechnungJahr, 0),
    arbeitstageBisherJahr,
    arbeitstageGesamtJahr,
    letzterEintragAm: letzter?.datum ?? null,
  };
}

export type MonatsQuotePunkt = {
  jahr: number;
  monat: number; // 1-12
  teamIstQuote: number | null; // Bruchzahl
  istBetriebsferienMonat: boolean; // ganz oder größtenteils in einer Betriebsferien-Periode (Testfall 3)
};

/** Team-Ist-Quote je Monat der letzten `count` Monate (chronologisch, ältester zuerst) - für den
 * Quote-Verlauf (Modul 2). Ein Monat gilt als Betriebsferien-Monat, wenn er keinen einzigen regulären
 * Arbeitstag enthält, damit die Verlaufsgrafik ihn als abgegrenzte Zone statt als Quote-Einbruch zeigen kann. */
export async function computeTeamQuoteTrendMonatlich(count: number, now: Date = new Date()): Promise<MonatsQuotePunkt[]> {
  const months: { year: number; month: number }[] = [];
  let y = now.getFullYear();
  let m = now.getMonth() + 1;
  for (let i = 0; i < count; i++) {
    months.unshift({ year: y, month: m });
    m--;
    if (m === 0) {
      m = 12;
      y--;
    }
  }

  return Promise.all(
    months.map(async ({ year, month }) => {
      const { from, to } = getPeriodBounds("month", year, month);
      const betriebsferienRows = await prisma.betriebsferienPeriod.findMany({ where: { startDate: { lte: to }, endDate: { gte: from } } });
      const betriebsferien: DateRange[] = betriebsferienRows.map((b) => ({ start: b.startDate, end: b.endDate }));
      const arbeitstage = countWorkdays(from, to, betriebsferien);

      const clampedTo = to.getTime() > now.getTime() ? now : to;
      const { teamIstQuote } = arbeitstage > 0 && from.getTime() <= now.getTime() ? await computeTeamQuote(from, clampedTo, now) : { teamIstQuote: null };

      return { jahr: year, monat: month, teamIstQuote, istBetriebsferienMonat: arbeitstage === 0 };
    })
  );
}

// ---------- Liquidität (letzter manueller Eintrag) ----------

export async function getLetzteLiquiditaet(): Promise<{ betrag: number; datum: Date } | null> {
  const letzter = await prisma.liquiditaetsEintrag.findFirst({ orderBy: { datum: "desc" } });
  if (!letzter) return null;
  return { betrag: letzter.verfuegbareLiquideMittel.toNumber(), datum: letzter.datum };
}

// ---------- Finom-CSV-Import: Kennzahlen für Warnregel 6/7 ----------

/** Letzter CSV-Import (unabhängig vom Zuordnungsstatus der einzelnen Zeilen) - für Warnregel 6 (Erfassungslücke). */
export async function getLetzterFinomImport(): Promise<Date | null> {
  const letzte = await prisma.finomBuchungRohdaten.findFirst({ orderBy: { erstelltAm: "desc" } });
  return letzte?.erstelltAm ?? null;
}

/** Anzahl offener "Bitte zuordnen"-Buchungen - für Warnregel 7 (Stau-Hinweis ab > 15). */
export async function countZuKlaerenBuchungen(): Promise<number> {
  return prisma.finomBuchungRohdaten.count({ where: { status: "ZU_KLAEREN" } });
}

// ---------- Gesamt-Orchestrierung (von Seite + PDF-Export gemeinsam genutzt) ----------

export type CockpitKernzahlen = {
  periodType: PeriodType;
  year: number;
  periodIndex: number;
  kalkulation: PraxisKalkulation | null;
  geplanteGesamtkostenJahr: number | null;
  geplanteBetriebskostenJahr: number | null;
  umsatz: UmsatzCockpitResult;
  kostenSollIst: KostenSollIstResult | null;
  teamQuote: TeamQuoteResult;
  hochrechnungGewinnJahr: number | null;
  faktorHochgerechnet: number | null;
  abweichungQuotePunkte: number | null;
  abweichungKostenProzent: number | null;
  abweichungUmsatzProzent: number | null;
  breakEvenQuote: number | null;
  auslastungsreservePunkte: number | null;
  liquiditaetsReichweiteMonate: number | null;
  letzteLiquiditaet: { betrag: number; datum: Date } | null;
};

/** Bündelt Kalkulation, Umsatz, Kosten-Soll-Ist, Team-Quote und alle daraus abgeleiteten Kennzahlen für
 * einen Zeitpunkt/Zeitraum - gemeinsam genutzt von der Cockpit-Seite (auch für den Trend-Vergleichswert
 * "vor 3 Monaten") und dem Steuerberater-Report-PDF, damit die Ableitung nur an einer Stelle steht. */
export async function computeCockpitKernzahlen(
  periodType: PeriodType,
  year: number,
  periodIndex: number,
  now: Date = new Date()
): Promise<CockpitKernzahlen> {
  const { from, to } = getPeriodBounds(periodType, year, periodIndex);
  const kalkulation = await getActivePraxisKalkulation();
  const geplanteTotals = kalkulation ? praxisKalkulationTotals(kalkulation) : null;

  const [umsatz, teamQuote, kostenSollIst, letzteLiquiditaet] = await Promise.all([
    computeUmsatzCockpit(periodType, year, periodIndex, now),
    computeTeamQuote(from, to, now),
    kalkulation ? computeKostenSollIst(year, kalkulation, now) : Promise.resolve(null),
    getLetzteLiquiditaet(),
  ]);

  const hochrechnungGesamtkostenJahr = kostenSollIst?.hochrechnungGesamtkostenJahr ?? null;
  const hochrechnungGewinnJahr = hochrechnungGesamtkostenJahr != null ? umsatz.hochrechnungJahr - hochrechnungGesamtkostenJahr : null;
  const faktorHochgerechnet = hochrechnungGesamtkostenJahr != null ? computeFaktorHochgerechnet(umsatz.hochrechnungJahr, hochrechnungGesamtkostenJahr) : null;

  const teamIstQuote = teamQuote.teamIstQuote;
  const zielQuote = kalkulation?.zielQuote.toNumber() ?? null;
  const abweichungQuotePunkte = teamIstQuote != null && zielQuote != null ? computeAbweichungQuotePunkte(teamIstQuote, zielQuote) : null;
  const abweichungKostenProzent =
    kalkulation && geplanteTotals && hochrechnungGesamtkostenJahr != null
      ? computeAbweichungKostenProzent(hochrechnungGesamtkostenJahr, geplanteTotals.geplanteGesamtkostenJahr)
      : null;
  const abweichungUmsatzProzent =
    kalkulation && geplanteTotals ? computeAbweichungUmsatzProzent(umsatz.hochrechnungJahr, geplanteTotals.geplanteGesamtkostenJahr, kalkulation.zielFaktor.toNumber()) : null;

  const breakEvenQuote =
    kalkulation && geplanteTotals
      ? computeBreakEvenQuote(kalkulation.zielQuote.toNumber(), geplanteTotals.geplanteGesamtkostenJahr, kalkulation.zielFlsStdJahr.toNumber(), kalkulation.stundensatzBasis.toNumber())
      : null;
  const auslastungsreservePunkte = breakEvenQuote != null && teamIstQuote != null ? computeAuslastungsreserve(teamIstQuote, breakEvenQuote) : null;

  const monatlicheFixkosten = geplanteTotals ? geplanteTotals.geplanteGesamtkostenJahr / 12 : 0;
  const liquiditaetsReichweiteMonate = letzteLiquiditaet ? computeLiquiditaetsReichweiteMonate(letzteLiquiditaet.betrag, monatlicheFixkosten) : null;

  return {
    periodType,
    year,
    periodIndex,
    kalkulation,
    geplanteGesamtkostenJahr: geplanteTotals?.geplanteGesamtkostenJahr ?? null,
    geplanteBetriebskostenJahr: geplanteTotals?.geplanteBetriebskostenJahr ?? null,
    umsatz,
    kostenSollIst,
    teamQuote,
    hochrechnungGewinnJahr,
    faktorHochgerechnet,
    abweichungQuotePunkte,
    abweichungKostenProzent,
    abweichungUmsatzProzent,
    breakEvenQuote,
    auslastungsreservePunkte,
    liquiditaetsReichweiteMonate,
    letzteLiquiditaet,
  };
}

export type { PeriodType };
