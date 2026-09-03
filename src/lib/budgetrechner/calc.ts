// Budgetrechner: reine Berechnungs-/Orchestrierungslogik für Dashboard, Detailansicht und PDF-Export.
// Bewusst getrennt von src/lib/betriebscockpit.ts - der Budgetrechner arbeitet mit frei benannten
// Positionen (BudgetKategorie) statt dem 4er-KostenKategorie-Enum und ohne Hochrechnung.
import { prisma } from "@/lib/prisma";
import type { AmpelStatus } from "@/lib/umsatz";

/** Ampel-Schwellen laut Spec: grün < 70 %, gelb 70-100 %, rot > 100 % des Jahresbudgets. */
export function ampelVerbrauch(prozent: number): AmpelStatus {
  if (prozent > 100) return "rot";
  if (prozent >= 70) return "gelb";
  return "gruen";
}

/** Ganzes Kalenderjahr als UTC-Datumsgrenzen (BudgetAusgabe.datum ist @db.Date). */
export function jahrBounds(jahr: number): { from: Date; to: Date } {
  return { from: new Date(Date.UTC(jahr, 0, 1)), to: new Date(Date.UTC(jahr, 11, 31)) };
}

export type BudgetKategorieZeile = {
  id: string;
  name: string;
  quelle: string;
  jahresbudget: number;
  verbraucht: number; // Summe reKoBudgetRelevant=true dieser Kategorie im Jahr
  rest: number; // jahresbudget - verbraucht (kann negativ sein)
  prozent: number; // verbraucht / jahresbudget * 100 (0 bei Budget 0)
  ampel: AmpelStatus;
  anzahlAusgaben: number;
};

export type BudgetDashboard = {
  jahr: number;
  zeilen: BudgetKategorieZeile[]; // höchste Auslastung zuerst
  summeBudget: number;
  summeVerbraucht: number;
  summeRest: number;
};

/** Budget/Verbrauch/Rest je Position für ein Jahr. "verbraucht" zählt nur reKoBudgetRelevant=true. */
export async function computeBudgetDashboard(jahr: number): Promise<BudgetDashboard> {
  const { from, to } = jahrBounds(jahr);

  const [kategorien, ausgaben] = await Promise.all([
    prisma.budgetKategorie.findMany({ where: { jahr }, orderBy: { name: "asc" } }),
    prisma.budgetAusgabe.findMany({
      where: { datum: { gte: from, lte: to }, kategorieId: { not: null }, reKoBudgetRelevant: true },
      select: { kategorieId: true, betrag: true },
    }),
  ]);

  const verbrauchtByKategorie = new Map<string, number>();
  const anzahlByKategorie = new Map<string, number>();
  for (const a of ausgaben) {
    const key = a.kategorieId!;
    verbrauchtByKategorie.set(key, (verbrauchtByKategorie.get(key) ?? 0) + a.betrag.toNumber());
    anzahlByKategorie.set(key, (anzahlByKategorie.get(key) ?? 0) + 1);
  }

  const zeilen: BudgetKategorieZeile[] = kategorien
    .map((k) => {
      const jahresbudget = k.jahresbudget.toNumber();
      const verbraucht = verbrauchtByKategorie.get(k.id) ?? 0;
      const prozent = jahresbudget > 0 ? (verbraucht / jahresbudget) * 100 : 0;
      return {
        id: k.id,
        name: k.name,
        quelle: k.quelle,
        jahresbudget,
        verbraucht,
        rest: jahresbudget - verbraucht,
        prozent,
        ampel: ampelVerbrauch(prozent),
        anzahlAusgaben: anzahlByKategorie.get(k.id) ?? 0,
      };
    })
    .sort((a, b) => b.prozent - a.prozent);

  return {
    jahr,
    zeilen,
    summeBudget: zeilen.reduce((s, z) => s + z.jahresbudget, 0),
    summeVerbraucht: zeilen.reduce((s, z) => s + z.verbraucht, 0),
    summeRest: zeilen.reduce((s, z) => s + z.rest, 0),
  };
}

export type NichtEingeplanteAusgabe = {
  id: string;
  datum: Date;
  betrag: number;
  beschreibung: string;
  quelle: string;
};

export type NichtEingeplantResult = {
  von: Date;
  bis: Date;
  eintraege: NichtEingeplanteAusgabe[]; // neueste zuerst
  summe: number;
};

/** Ausgaben ohne Kategorie UND reKoBudgetRelevant=true - der direkte Beleg für ReKo-Nachverhandlungen. */
export async function computeNichtEingeplant(von: Date, bis: Date): Promise<NichtEingeplantResult> {
  const rows = await prisma.budgetAusgabe.findMany({
    where: { kategorieId: null, reKoBudgetRelevant: true, datum: { gte: von, lte: bis } },
    orderBy: { datum: "desc" },
  });
  const eintraege = rows.map((r) => ({
    id: r.id,
    datum: r.datum,
    betrag: r.betrag.toNumber(),
    beschreibung: r.beschreibung,
    quelle: r.quelle,
  }));
  return { von, bis, eintraege, summe: eintraege.reduce((s, e) => s + e.betrag, 0) };
}

/** Verfügbare Budget-Jahre (für den Jahres-Selector) - immer inkl. aktuellem Jahr. */
export async function getBudgetJahre(now: Date = new Date()): Promise<number[]> {
  const rows = await prisma.budgetKategorie.findMany({ select: { jahr: true }, distinct: ["jahr"] });
  const jahre = new Set(rows.map((r) => r.jahr));
  jahre.add(now.getFullYear());
  return [...jahre].sort((a, b) => b - a);
}
