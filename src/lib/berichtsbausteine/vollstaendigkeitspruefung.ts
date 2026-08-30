import { BERICHTS_KAPITEL_ORDER, BERICHTS_KAPITEL_INFO } from "./manual";
import type { BerichtsKapitel } from "@prisma/client";

// Vollständigkeitsprüfung vor der Berichtsgenerierung (Prompt Teil 3/3 Punkt 10) - zwei kombinierte,
// rein hinweisende Prüfungen (keine Pflicht). Bewusst als reine, prisma-freie Funktionen gehalten, damit
// sie ohne Umweg über Server Actions auch clientseitig testbar/wiederverwendbar bleiben.

export type ManualLueckenErgebnis = { kapitel: BerichtsKapitel; anzahl: number; hinweis: string | null };

/** Prüfung a) gegen die Manual-Leitfragen: welche Kapitel haben noch gar keine Bausteine. */
export function pruefeManualAbdeckung(bausteine: { vorlaeufigeKategorie: BerichtsKapitel | null }[]): ManualLueckenErgebnis[] {
  return BERICHTS_KAPITEL_ORDER.map((k) => {
    const anzahl = bausteine.filter((b) => b.vorlaeufigeKategorie === k).length;
    const info = BERICHTS_KAPITEL_INFO[k];
    const hinweis =
      anzahl === 0
        ? `Für "${info.label}" sind noch keine Bausteine erfasst.${info.leitfrage ? ` Leitfrage: ${info.leitfrage}` : ""}`
        : null;
    return { kapitel: k, anzahl, hinweis };
  });
}

export type MonatsVergleich = { jahr: number; monat: number; anzahlTermine: number; anzahlBausteine: number };
export type LeistungsnachweisHinweis = MonatsVergleich & { hinweis: string };

const MONATSNAMEN = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

/** Prüfung b) gegen die Leistungsnachweis-Historie: Monate mit auffällig vielen dokumentierten Terminen,
 * aber ohne jeden Berichtsbaustein. schwellenwertTermine kommt aus Settings, ist nicht hart codiert. */
export function pruefeLeistungsnachweisVerhaeltnis(monate: MonatsVergleich[], schwellenwertTermine: number): LeistungsnachweisHinweis[] {
  return monate
    .filter((m) => m.anzahlTermine >= schwellenwertTermine && m.anzahlBausteine === 0)
    .map((m) => ({
      ...m,
      hinweis: `Im ${MONATSNAMEN[m.monat - 1]} ${m.jahr} gab es ${m.anzahlTermine} dokumentierte Termine, aber keine Berichtsbausteine - lohnt sich ein rückblickender Baustein dazu?`,
    }));
}

/** Punkt 12: wenn Bausteine von mehr als einer Fachkraft stammen, muss vor der Generierung manuell
 * bestätigt werden, aus wessen Ich-Perspektive der Bericht geschrieben wird - keine automatische Wahl. */
export function ermittleFachkraefte(bausteine: { erstellerId: string; erstellerName: string }[]): { mehrereFachkraefte: boolean; namen: string[] } {
  const map = new Map<string, string>();
  for (const b of bausteine) map.set(b.erstellerId, b.erstellerName);
  return { mehrereFachkraefte: map.size > 1, namen: [...map.values()] };
}
