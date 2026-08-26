import type { StandortKey } from "@/lib/fahrtenrechner/calc";

export type BesuchsortVM = {
  id: string;
  bezeichnung: string;
  lat: number;
  lng: number;
  besucheProMonat: number;
  /** Geschätzte Fahrzeit (Minuten) für eine einzelne Fahrt Referenzpunkt → Besuchsort. */
  fahrzeitMinEinzel: number;
  /** Hin- und Rückweg × Besuche/Monat ÷ Wochen/Monat. */
  fahrzeitWocheMin: number;
};

export type CaseVM = {
  id: string;
  clientName: string;
  besuchsorte: BesuchsortVM[];
  /** Summe fahrzeitWocheMin über alle Besuchsorte dieses Falls. */
  fahrzeitWocheMinFall: number;
};

export type EmployeeVM = {
  id: string;
  name: string;
  color: string;
  referencePoint: { lat: number; lng: number };
  hasWohnort: boolean;
  primaerStandort: StandortKey;
  einsatzradiusKm: number;
  zielFlsStdWoche: number;
  zugeteilteFlsStdWoche: number;
  freieFlsStdWoche: number;
  fahrzeitWocheMin: number;
  nichtAbrechenbareFahrstundenWoche: number;
  cases: CaseVM[];
  /** Anzahl Besuchsorte zugeordneter Fälle ohne Geodaten - fließen nicht in die Fahrzeit ein. */
  besuchsortCountMissingGeo: number;
};
