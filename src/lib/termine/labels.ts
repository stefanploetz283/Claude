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
