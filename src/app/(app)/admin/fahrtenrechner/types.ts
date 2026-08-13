import type { StandortKey } from "@/lib/fahrtenrechner/calc";

export type CaseVM = {
  id: string;
  clientName: string;
  lat: number;
  lng: number;
  besucheProWoche: number;
  geplanteFlsStdWoche: number | null;
  /** Geschätzte Fahrzeit (Minuten) für eine einzelne Fahrt Referenzpunkt → Fall-Adresse. */
  fahrzeitMinEinzel: number;
  /** fahrzeitMinEinzel × besucheProWoche. */
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
  /** Anzahl zugeordneter Fälle ohne Geodaten (Klient noch nicht geocodiert) - fließen nicht in die Fahrzeit ein. */
  caseCountMissingGeo: number;
};
