// Fahrten-/Fallrechner: reine Berechnungslogik (Distanz-/Fahrzeitschätzung, Kapazität) - bewusst getrennt
// vom Stundenmodell-Rechner (siehe Prompt: gemeinsame Datenbasis, aber keine gemeinsame Oberfläche).

export type LatLng = { lat: number; lng: number };

/** Umwegfaktor für ländliche/gemischte Straßennetze - keine echte Routing-API (siehe Prompt). */
export const UMWEGFAKTOR = 1.3;
/** Vorbelegung für Settings.fahrtenrechnerDurchschnittskmh - dort admin-editierbar, nicht hart verdrahtet. */
export const DURCHSCHNITT_KMH_DEFAULT = 80;
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

/** Geschätzte Fahrzeit (einfache Strecke) in Minuten - keine exakte Routing-Berechnung, für die Zuteilungsentscheidung ausreichend. */
export function estimatedDriveMinutes(luftlinieKm: number, durchschnittKmh: number = DURCHSCHNITT_KMH_DEFAULT): number {
  return (estimatedDriveKm(luftlinieKm) / durchschnittKmh) * 60;
}

export function estimatedDriveMinutesBetween(a: LatLng, b: LatLng, durchschnittKmh: number = DURCHSCHNITT_KMH_DEFAULT): number {
  return estimatedDriveMinutes(haversineKm(a, b), durchschnittKmh);
}

/** Fahrzeit/Woche für einen Fall = Hin- und Rückweg × Besuche/Woche. */
export function weeklyDriveMinutes(einfacheFahrzeitMin: number, besucheProWoche: number): number {
  return einfacheFahrzeitMin * 2 * besucheProWoche;
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

/** Resultierende freie Kapazität nach einer (probeweisen) Neuzuteilung - negativ = Überbuchung. */
export function resultingFreeCapacity(freieFlsStdWoche: number, geplanteFlsStdWoche: number): number {
  return freieFlsStdWoche - geplanteFlsStdWoche;
}

/** Nicht-abrechenbare Fahrtstunden/Woche - Kennzahl-Bereitstellung für Bonus-Cockpit/Stundenmodell-Rechner
 * (Verrechnung selbst ist nicht Teil dieses Features, siehe Prompt). */
export function nichtAbrechenbareFahrstundenWoche(fahrzeitWocheMin: number): number {
  return fahrzeitWocheMin / 60;
}
