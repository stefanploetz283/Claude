// Nominatim (OpenStreetMap-Geocoding, kostenlos) - Rate-Limit 1 Anfrage/Sekunde. Wird nur beim Anlegen/
// Ändern einer Adresse aufgerufen, Ergebnis dauerhaft auf Client/User gespeichert (siehe geocode-Aufrufer),
// nie bei jedem Kartenaufruf neu berechnet.

export type GeocodeResult = { lat: number; lng: number } | null;

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
// Nominatims Nutzungsbedingungen verlangen einen aussagekräftigen User-Agent mit Kontaktmöglichkeit.
const USER_AGENT = "Praxis-Fallverwaltung/1.0 (+stefanploetz283@gmail.com)";

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const trimmed = address.trim();
  if (!trimmed) return null;

  const url = `${NOMINATIM_URL}?format=json&limit=1&countrycodes=de&q=${encodeURIComponent(trimmed)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "de" },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!Array.isArray(data) || data.length === 0) return null;

    const lat = Number(data[0].lat);
    const lng = Number(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  } catch (err) {
    console.error("Nominatim-Geocoding fehlgeschlagen:", err);
    return null;
  }
}

/** Für Batch-Geocoding mehrerer Adressen hintereinander (z.B. nachträgliches Befüllen bestehender
 * Fälle) - hält Nominatims 1-Anfrage/Sekunde-Limit ein. Für den normalen Einzel-Speichervorgang
 * (ein Fall/Mitarbeiter wird angelegt) nicht nötig, dort reicht ein einzelner geocodeAddress-Aufruf. */
export async function geocodeAddressesSequentially(addresses: string[]): Promise<GeocodeResult[]> {
  const results: GeocodeResult[] = [];
  for (const address of addresses) {
    results.push(await geocodeAddress(address));
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }
  return results;
}
