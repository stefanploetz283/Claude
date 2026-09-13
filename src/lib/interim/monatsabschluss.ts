// Monatsabschluss (Interimsmodus): reine Berechnung ohne Prisma-Import (Konvention dieser Codebase).

export type JahrMonat = { jahr: number; monat: number };

export function monatSchluessel(jahr: number, monat: number): string {
  return `${jahr}-${monat}`;
}

/**
 * Der "aktuelle offene Monat" ist global (keine Fachkraft-Dimension im Interimsmodus): beginnend beim
 * Anker (z.B. frühester Monat mit Einträgen, sonst heutiger Monat) wird so lange einen Monat weiter
 * gegangen, bis ein Monat ohne abgeschlossenen Status gefunden wird. Out-of-order abgeschlossene Monate
 * (z.B. Oktober vor September) verschieben den offenen Monat NICHT fälschlich weiter - er bleibt beim
 * frühesten noch offenen Monat stehen.
 */
export function ermittleOffenenMonat(anker: JahrMonat, geschlosseneMonate: ReadonlySet<string>): JahrMonat {
  let { jahr, monat } = anker;
  while (geschlosseneMonate.has(monatSchluessel(jahr, monat))) {
    monat += 1;
    if (monat > 12) {
      monat = 1;
      jahr += 1;
    }
  }
  return { jahr, monat };
}

export function istMonatGeschlossen(jahr: number, monat: number, geschlosseneMonate: ReadonlySet<string>): boolean {
  return geschlosseneMonate.has(monatSchluessel(jahr, monat));
}

// Wochen/Monat-Umrechnung wie an anderer Stelle in der App etabliert (siehe
// BESUCHSORT_BESUCHE_PRO_MONAT_DEFAULT / 4.33 in src/app/(app)/cases/actions.ts) - Richtwert, keine
// harte Grenze.
const WOCHEN_PRO_MONAT = 4.33;

export function monatsRichtwertStunden(bewilligteWochenstunden: number): number {
  return bewilligteWochenstunden * WOCHEN_PRO_MONAT;
}
