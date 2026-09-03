// Budgetrechner: Finom-CSV-Import mit Keyword-Zuordnung auf frei benannte Budget-Positionen.
// Nutzt die CSV-Parsing-Primitiven des Cockpit-Imports wieder (src/lib/finom-import.ts) - hier weicht
// nur die Zuordnungslogik ab (Stichwort-Matching gegen BudgetKategorie statt IBAN/Finom-Kategorie-Regeln)
// und der Review passiert vollständig vor dem Schreiben (kein Staging wie FinomBuchungRohdaten).
import { prisma } from "@/lib/prisma";
import { parseCsv, mapCsvRow, buildDedupKey, type CsvSpaltenzuordnung } from "@/lib/finom-import";

/** Wörter eines Textes, kleingeschrieben, nur ab 4 Zeichen (kürzere sind für Matching zu unspezifisch). */
function stichworte(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-zà-ÿ0-9]+/i)
    .filter((w) => w.length >= 4);
}

export type MatchKategorie = { id: string; name: string; stichwoerter: string[] };

/** Kandidaten-Kategorien für einen Buchungstext: Kategorie matcht, wenn ihr Name oder eines ihrer
 * Stichwörter als ganzes Wort (ab 4 Zeichen) im Empfänger/Verwendungszweck vorkommt. */
export function matchKategorien(text: string, kategorien: MatchKategorie[]): string[] {
  const worte = new Set(stichworte(text));
  const treffer: string[] = [];
  for (const k of kategorien) {
    const schluessel = [...stichworte(k.name), ...k.stichwoerter.flatMap(stichworte)];
    if (schluessel.some((s) => worte.has(s))) treffer.push(k.id);
  }
  return treffer;
}

export type BudgetCsvZeile = {
  idx: number;
  datum: string; // ISO YYYY-MM-DD
  betrag: number; // Betrag der Ausgabe (immer positiv gespeichert)
  beschreibung: string; // Empfänger + Verwendungszweck, zusammengesetzt
  dedupKey: string;
  vorschlagKategorieId: string | null; // gesetzt nur bei genau einem Treffer
  eindeutig: boolean; // genau ein Kategorie-Treffer -> wird ohne Rückfrage übernommen
  istDuplikat: boolean; // dedupKey existiert bereits -> wird beim Import übersprungen
};

export type BudgetCsvAnalyse = {
  zeilen: BudgetCsvZeile[];
  gesamt: number;
  eindeutig: number;
  unsicher: number;
  duplikate: number;
  unlesbar: number;
};

/** Parst die CSV und ordnet jede Zeile vor - ohne etwas zu schreiben. */
export async function analyseBudgetCsv(csvText: string, mapping: CsvSpaltenzuordnung): Promise<BudgetCsvAnalyse> {
  const { headers, rows } = parseCsv(csvText);

  const [kategorien, vorhandeneKeys] = await Promise.all([
    prisma.budgetKategorie.findMany({ select: { id: true, name: true, stichwoerter: true } }),
    prisma.budgetAusgabe.findMany({ where: { dedupKey: { not: null } }, select: { dedupKey: true } }),
  ]);
  const bekannteKeys = new Set(vorhandeneKeys.map((r) => r.dedupKey!));

  const zeilen: BudgetCsvZeile[] = [];
  let unlesbar = 0;
  let idx = 0;
  for (const row of rows) {
    const zeile = mapCsvRow(headers, row, mapping);
    if (!zeile) {
      unlesbar++;
      continue;
    }
    const beschreibung = [zeile.empfaengerName, zeile.verwendungszweck].filter(Boolean).join(" – ") || "Ohne Verwendungszweck";
    const dedupKey = buildDedupKey(zeile);
    const treffer = matchKategorien(`${zeile.empfaengerName ?? ""} ${zeile.verwendungszweck ?? ""}`, kategorien);
    zeilen.push({
      idx: idx++,
      datum: zeile.datum.toISOString().slice(0, 10),
      betrag: Math.abs(zeile.betrag),
      beschreibung,
      dedupKey,
      vorschlagKategorieId: treffer.length === 1 ? treffer[0] : null,
      eindeutig: treffer.length === 1,
      istDuplikat: bekannteKeys.has(dedupKey),
    });
  }

  return {
    zeilen,
    gesamt: zeilen.length,
    eindeutig: zeilen.filter((z) => z.eindeutig && !z.istDuplikat).length,
    unsicher: zeilen.filter((z) => !z.eindeutig && !z.istDuplikat).length,
    duplikate: zeilen.filter((z) => z.istDuplikat).length,
    unlesbar,
  };
}

export type BudgetImportZeile = {
  datum: string;
  betrag: number;
  beschreibung: string;
  dedupKey: string;
  kategorieId: string | null; // null = "nicht eingeplante Kosten"
  reKoBudgetRelevant: boolean;
  uebernehmen: boolean; // im Review abgewählt -> gar nicht importieren (z.B. Kontoumbuchung)
};

export type BudgetImportZusammenfassung = { importiert: number; nichtEingeplant: number; uebersprungen: number; duplikate: number };

/** Schreibt die im Review bestätigten Zeilen als BudgetAusgabe (quelle "finom_import"). */
export async function importBudgetCsvZeilen(zeilen: BudgetImportZeile[]): Promise<BudgetImportZusammenfassung> {
  const importBatchId = `budget_import_${Date.now()}`;

  const vorhandene = await prisma.budgetAusgabe.findMany({
    where: { dedupKey: { in: zeilen.map((z) => z.dedupKey) } },
    select: { dedupKey: true },
  });
  const bekannteKeys = new Set(vorhandene.map((r) => r.dedupKey!));

  // Zusätzlich innerhalb des Batches deduplizieren - der @unique-Index auf dedupKey würde ein createMany
  // mit zwei gleichen Schlüsseln sonst komplett scheitern lassen.
  const gesehen = new Set<string>();
  const anzulegen = zeilen.filter((z) => {
    if (!z.uebernehmen || bekannteKeys.has(z.dedupKey) || gesehen.has(z.dedupKey)) return false;
    gesehen.add(z.dedupKey);
    return true;
  });

  if (anzulegen.length > 0) {
    await prisma.budgetAusgabe.createMany({
      data: anzulegen.map((z) => ({
        betrag: z.betrag,
        datum: new Date(`${z.datum}T00:00:00.000Z`),
        beschreibung: z.beschreibung,
        quelle: "finom_import",
        reKoBudgetRelevant: z.reKoBudgetRelevant,
        kategorieId: z.kategorieId,
        importBatchId,
        dedupKey: z.dedupKey,
      })),
    });
  }

  return {
    importiert: anzulegen.length,
    nichtEingeplant: anzulegen.filter((z) => z.kategorieId === null).length,
    uebersprungen: zeilen.filter((z) => !z.uebernehmen).length,
    duplikate: zeilen.filter((z) => z.uebernehmen && bekannteKeys.has(z.dedupKey)).length,
  };
}
