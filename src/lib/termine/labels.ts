import type { TerminKategorie, TerminArt } from "@prisma/client";

export const KATEGORIE_LABEL: Record<TerminKategorie, string> = {
  FALL_TERMIN: "Fall-Termin",
  INTERNER_TERMIN: "Interner Termin",
  EINZELMASSNAHME: "Einzelmaßnahme",
};

export const TERMINART_LABEL: Record<TerminArt, string> = {
  KIND_BERATUNG: "Kind-Beratung",
  ELTERN_BERATUNG: "Eltern-Beratung",
  SCHULHOSPITATION: "Schulhospitation",
  ELTERNKONTAKT: "Elternkontakt",
  SCHULKONTAKT: "Schulkontakt",
  SONSTIGES: "Sonstiges",
};

export const KATEGORIE_OPTIONS: { value: TerminKategorie; label: string }[] = (
  Object.entries(KATEGORIE_LABEL) as [TerminKategorie, string][]
).map(([value, label]) => ({ value, label }));

export const TERMINART_OPTIONS: { value: TerminArt; label: string }[] = (
  Object.entries(TERMINART_LABEL) as [TerminArt, string][]
).map(([value, label]) => ({ value, label }));

export const STANDORT_LABEL: Record<string, string> = {
  NITTENDORF: "Nittendorf",
  REGENSBURG: "Regensburg",
};

export const WOCHENTAG_LABEL: Record<number, string> = {
  1: "Montag",
  2: "Dienstag",
  3: "Mittwoch",
  4: "Donnerstag",
  5: "Freitag",
  6: "Samstag",
  7: "Sonntag",
};

// ---------- Anzeige eines Termins (Kalenderblock, Wochenliste, Fallakte) ----------
// Eine Quelle der Wahrheit für "Überschrift" + "Zusatzzeile", damit alle Ansichten identisch rendern.

export type TerminAnzeigeFelder = {
  terminname: string | null;
  terminArt: TerminArt | null;
  kategorie: TerminKategorie;
  titel: string;
  fallName: string | null; // Nachname des verknüpften Falls (nur FALL_TERMIN)
  einzelmassnahmeBezeichnung: string | null;
};

/** Überschrift: freier Terminname, sonst Terminart, sonst interne Kurzbezeichnung. */
export function terminHeading(t: Pick<TerminAnzeigeFelder, "terminname" | "terminArt" | "kategorie" | "titel">): string {
  if (t.terminname?.trim()) return t.terminname.trim();
  if (t.terminArt) return TERMINART_LABEL[t.terminArt];
  return t.titel.trim() || KATEGORIE_LABEL[t.kategorie];
}

/** Zusatzzeile: Terminart (nur wenn der Terminname die Überschrift belegt) · "Fall: Nachname" bzw.
 * Aktenzeichen bei Einzelmaßnahmen. Raum wird bewusst NICHT hier angehängt - das macht der Aufrufer. */
export function terminSubline(t: TerminAnzeigeFelder): string {
  const teile: string[] = [];
  if (t.terminname?.trim() && t.terminArt) teile.push(TERMINART_LABEL[t.terminArt]);
  if (t.fallName) teile.push(`Fall: ${t.fallName}`);
  else if (t.kategorie === "EINZELMASSNAHME" && t.einzelmassnahmeBezeichnung?.trim()) teile.push(t.einzelmassnahmeBezeichnung.trim());
  return teile.join(" · ");
}
