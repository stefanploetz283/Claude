// Steuerrücklagenrechner + Privater Steuerabzugs-Assistent + Familien-Veranlagung-Kontext: reine
// Berechnungslogik, DB-Orchestrierung unten. Bewusst eine Näherung, kein exakter Einkommensteuer-Tarif -
// siehe Hinweistexte im UI.
import { prisma } from "@/lib/prisma";
import type { VorsorgeArt, PrivaterAbzugKategorie } from "@prisma/client";

export const SOLI_SATZ = 0.055;

// ---------- Vorsorgeaufwendungen (4b) ----------

export type VorsorgeEintrag = { art: VorsorgeArt; betragMonatlich: number; gueltigAb: Date };

/** Der jeweils aktuell gültige Eintrag je Art (jüngstes gueltigAb <= now) - eigene kleine Historie statt
 * eines einzigen globalen Werts (siehe Prompt). */
export function resolveAktiverVorsorgeaufwand(eintraege: VorsorgeEintrag[], art: VorsorgeArt, now: Date): number {
  const aktive = eintraege.filter((e) => e.art === art && e.gueltigAb.getTime() <= now.getTime()).sort((a, b) => b.gueltigAb.getTime() - a.gueltigAb.getTime());
  return aktive.length > 0 ? aktive[0].betragMonatlich * 12 : 0;
}

export function computeVorsorgeaufwendungenJahr(eintraege: VorsorgeEintrag[], now: Date): number {
  const arten: VorsorgeArt[] = ["RUERUP_RENTE", "KRANKENVERSICHERUNG", "SONSTIGE"];
  return arten.reduce((sum, art) => sum + resolveAktiverVorsorgeaufwand(eintraege, art, now), 0);
}

// ---------- Steuerrücklage (4b) ----------

export function computeGeschaetztesZuVersteuerndesEinkommen(hochrechnungGewinnJahr: number, vorsorgeaufwendungenJahr: number, summePrivaterAbzuegeJahr: number): number {
  return hochrechnungGewinnJahr - vorsorgeaufwendungenJahr - summePrivaterAbzuegeJahr;
}

export function computeGeschaetzteEinkommensteuer(zuVersteuerndesEinkommen: number, grenzsteuersatzProzent: number): number {
  return Math.max(0, zuVersteuerndesEinkommen) * (grenzsteuersatzProzent / 100);
}

export function computeGeschaetzterSoli(einkommensteuer: number): number {
  return einkommensteuer * SOLI_SATZ;
}

export function computeEmpfohleneSteuerruecklage(einkommensteuer: number, soli: number): number {
  return einkommensteuer + soli;
}

export function computeFreierGewinnNachRuecklage(hochrechnungGewinnJahr: number, empfohleneSteuerruecklage: number): number {
  return hochrechnungGewinnJahr - empfohleneSteuerruecklage;
}

// ---------- Privater Steuerabzugs-Assistent (4b-2) ----------

/** Kategorien ohne feste Formel (prozentsatz/deckel = null) - nur Erfassung, kein Automatik-Abzug. */
export const PRIVATER_ABZUG_OHNE_FORMEL: PrivaterAbzugKategorie[] = ["AUSSERGEWOEHNLICHE_BELASTUNG", "SONSTIGES"];

export const PRIVATER_ABZUG_LABEL: Record<PrivaterAbzugKategorie, string> = {
  HANDWERKERLEISTUNGEN: "Handwerkerleistungen (Arbeitslohn-Anteil)",
  HAUSHALTSNAHE_DIENSTLEISTUNGEN: "Haushaltsnahe Dienstleistungen",
  HAUSHALTSNAHE_BESCHAEFTIGUNG: "Haushaltsnahe Beschäftigung (Minijob im eigenen Haushalt)",
  KINDERBETREUUNG: "Kinderbetreuungskosten (Kind bis 14 J.)",
  SCHULGELD: "Schulgeld (nur Unterrichtsanteil, anerkannte Schule)",
  AUSSERGEWOEHNLICHE_BELASTUNG: "Außergewöhnliche Belastungen",
  SONSTIGES: "Sonstiges",
};

/** Berechneter_Abzug(Eintrag) = MIN(eingegebener_Betrag × Prozentsatz, Deckel) - null, wenn die Kategorie
 * keine feste Formel hat (Außergewöhnliche Belastungen/Sonstiges). */
export function computeBerechneterAbzug(eingegebenerBetrag: number, prozentsatz: number | null, deckelJahr: number | null): number | null {
  if (prozentsatz == null || deckelJahr == null) return null;
  return Math.min(eingegebenerBetrag * (prozentsatz / 100), deckelJahr);
}

export function computeSummePrivaterAbzuegeJahr(eintraege: { berechneterAbzug: number | null }[]): number {
  return eintraege.reduce((sum, e) => sum + (e.berechneterAbzug ?? 0), 0);
}

// ---------- DB-Orchestrierung ----------

export type SteuerruecklageResult = {
  jahr: number;
  hochrechnungGewinnJahr: number;
  vorsorgeaufwendungenJahr: number;
  summePrivaterAbzuegeJahr: number;
  zuVersteuerndesEinkommen: number;
  einkommensteuer: number;
  soli: number;
  empfohleneSteuerruecklage: number;
  freierGewinnNachRuecklage: number;
  persoenlicherGrenzsteuersatz: number;
};

export async function getSteuereinstellungen() {
  return prisma.praxisSteuereinstellungen.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

export async function computeSteuerruecklage(hochrechnungGewinnJahr: number, jahr: number, now: Date = new Date()): Promise<SteuerruecklageResult> {
  const [vorsorgeEintraege, privaterAbzugEintraege, steuereinstellungen] = await Promise.all([
    prisma.praxisVorsorgeaufwandEintrag.findMany(),
    prisma.praxisPrivaterAbzugEintrag.findMany({ where: { jahr } }),
    getSteuereinstellungen(),
  ]);

  const vorsorgeaufwendungenJahr = computeVorsorgeaufwendungenJahr(
    vorsorgeEintraege.map((e) => ({ art: e.art, betragMonatlich: e.betragMonatlich.toNumber(), gueltigAb: e.gueltigAb })),
    now
  );
  const summePrivaterAbzuegeJahr = computeSummePrivaterAbzuegeJahr(privaterAbzugEintraege.map((e) => ({ berechneterAbzug: e.berechneterAbzug?.toNumber() ?? null })));

  const zuVersteuerndesEinkommen = computeGeschaetztesZuVersteuerndesEinkommen(hochrechnungGewinnJahr, vorsorgeaufwendungenJahr, summePrivaterAbzuegeJahr);
  const grenzsteuersatz = steuereinstellungen.persoenlicherGrenzsteuersatz.toNumber();
  const einkommensteuer = computeGeschaetzteEinkommensteuer(zuVersteuerndesEinkommen, grenzsteuersatz);
  const soli = computeGeschaetzterSoli(einkommensteuer);
  const empfohleneSteuerruecklage = computeEmpfohleneSteuerruecklage(einkommensteuer, soli);
  const freierGewinnNachRuecklage = computeFreierGewinnNachRuecklage(hochrechnungGewinnJahr, empfohleneSteuerruecklage);

  return {
    jahr,
    hochrechnungGewinnJahr,
    vorsorgeaufwendungenJahr,
    summePrivaterAbzuegeJahr,
    zuVersteuerndesEinkommen,
    einkommensteuer,
    soli,
    empfohleneSteuerruecklage,
    freierGewinnNachRuecklage,
    persoenlicherGrenzsteuersatz: grenzsteuersatz,
  };
}
