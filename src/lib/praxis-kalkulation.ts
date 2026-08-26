// Referenzwerte der eingereichten Entgeltkalkulation - eigene, kleine Datei statt in umsatz.ts oder
// betriebscockpit.ts, damit beide sie ohne Zirkelimport verwenden können.
import { prisma } from "@/lib/prisma";
import type { PraxisKalkulation } from "@prisma/client";

/** Jüngste (aktive) Kalkulationsversion - null, solange noch keine hinterlegt wurde. */
export async function getActivePraxisKalkulation(): Promise<PraxisKalkulation | null> {
  return prisma.praxisKalkulation.findFirst({ orderBy: { gueltigAb: "desc" } });
}

/** GEPLANTE_BETRIEBSKOSTEN_JAHR = Summe Raum-/Verwaltungssachkosten/Sonstige Kosten,
 * GEPLANTE_GESAMTKOSTEN_JAHR = Personal- + Betriebskosten (siehe Prompt, Berechnungslogik 1). */
export function praxisKalkulationTotals(k: {
  geplantePersonalkostenJahr: { toNumber(): number };
  geplanteRaumkostenJahr: { toNumber(): number };
  geplanteVerwaltungssachkostenJahr: { toNumber(): number };
  geplanteSonstigeKostenAfaJahr: { toNumber(): number };
}): { geplanteBetriebskostenJahr: number; geplanteGesamtkostenJahr: number } {
  const personal = k.geplantePersonalkostenJahr.toNumber();
  const geplanteBetriebskostenJahr =
    k.geplanteRaumkostenJahr.toNumber() + k.geplanteVerwaltungssachkostenJahr.toNumber() + k.geplanteSonstigeKostenAfaJahr.toNumber();
  return { geplanteBetriebskostenJahr, geplanteGesamtkostenJahr: personal + geplanteBetriebskostenJahr };
}
