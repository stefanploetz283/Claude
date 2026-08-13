// Fahrten-/Fallrechner: reine Berechnungslogik (Distanz-/Fahrzeitschätzung, Score) - bewusst getrennt
// vom Stundenmodell-Rechner (siehe Prompt: gemeinsame Datenbasis, aber keine gemeinsame Oberfläche).

export type LatLng = { lat: number; lng: number };

/** Umwegfaktor für ländliche/gemischte Straßennetze - keine echte Routing-API (siehe Prompt). */
export const UMWEGFAKTOR = 1.3;
/** Ø km/h, Mischung Land-/Kreisstraßen. */
export const DURCHSCHNITT_KMH = 45;
/** Startwert für die Score-Gewichtung freier Kapazität - im Tool editierbar, nicht hart verdrahtet. */
export const KAPAZITAET_GEWICHT_DEFAULT = 10;
/** Vorbelegung für den Einsatzradius eines Mitarbeiters, falls noch nicht individuell gesetzt. */
export const EINSATZRADIUS_KM_DEFAULT = 25;

export const STANDORTE = {
  NITTENDORF: { name: "Nittendorf", lat: 49.0136, lng: 11.9312 },
  REGENSBURG: { name: "Regensburg", lat: 49.0195, lng: 12.0974 },
} as const satisfies Record<string, LatLng & { name: string }>;

export type StandortKey = keyof typeof STANDORTE;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Luftlinie zwischen zwei Koordinatenpaaren in km (Haversine). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function estimatedDriveKm(luftlinieKm: number): number {
  return luftlinieKm * UMWEGFAKTOR;
}

/** Geschätzte Fahrzeit in Minuten - keine exakte Routing-Berechnung, für die Zuteilungsentscheidung ausreichend. */
export function estimatedDriveMinutes(luftlinieKm: number): number {
  return (estimatedDriveKm(luftlinieKm) / DURCHSCHNITT_KMH) * 60;
}

export function estimatedDriveMinutesBetween(a: LatLng, b: LatLng): number {
  return estimatedDriveMinutes(haversineKm(a, b));
}

/** Referenzpunkt eines Mitarbeiters: Wohnort, falls hinterlegt, sonst der primäre Standort. */
export function employeeReferencePoint(employee: {
  wohnortLat: number | null;
  wohnortLng: number | null;
  primaerStandort: StandortKey;
}): LatLng {
  if (employee.wohnortLat != null && employee.wohnortLng != null) {
    return { lat: employee.wohnortLat, lng: employee.wohnortLng };
  }
  return STANDORTE[employee.primaerStandort];
}

/** Score(Mitarbeiter, neuer Fall) = -Fahrzeit_Zuwachs × 1.0 + Freie_FLS_Std_Woche × Gewicht. */
export function computeScore(
  fahrzeitZuwachsMin: number,
  freieFlsStdWoche: number,
  kapazitaetGewicht: number = KAPAZITAET_GEWICHT_DEFAULT
): number {
  return -fahrzeitZuwachsMin * 1.0 + freieFlsStdWoche * kapazitaetGewicht;
}

/** Resultierende freie Kapazität nach einer (probeweisen) Neuzuteilung - negativ = Überbuchung. */
export function resultingFreeCapacity(freieFlsStdWoche: number, geplanteFlsStdWoche: number): number {
  return freieFlsStdWoche - geplanteFlsStdWoche;
}

/** Nicht-abrechenbare Fahrtstunden/Woche - Kennzahl-Bereitstellung für Bonus-Cockpit/Stundenmodell-Rechner
 * (Verrechnung selbst ist nicht Teil dieses Features, siehe Prompt). */
export function nichtAbrechenbareFahrstundenWoche(fahrzeitWocheMin: number): number {
  return fahrzeitWocheMin / 60;
}
