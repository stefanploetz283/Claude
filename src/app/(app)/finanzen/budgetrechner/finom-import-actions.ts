"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { parseCsv, guessSpaltenzuordnung, getCsvSpaltenzuordnung, type CsvSpaltenzuordnung } from "@/lib/finom-import";
import { analyseBudgetCsv, importBudgetCsvZeilen, type BudgetCsvAnalyse, type BudgetImportZeile } from "@/lib/budgetrechner/finom";

const BUDGET_PFAD = "/finanzen/budgetrechner";

// ---------- Schritt 1: Datei einlesen, Spaltenzuordnung vorschlagen ----------

export type CsvPreviewState =
  | { error: string }
  | {
      csvText: string;
      headers: string[];
      previewRows: string[][];
      vorschlag: Partial<CsvSpaltenzuordnung>;
      gespeicherteZuordnung: CsvSpaltenzuordnung | null;
    }
  | undefined;

export async function previewBudgetCsv(_prev: CsvPreviewState, formData: FormData): Promise<CsvPreviewState> {
  await requireAdminOrVerwaltung();
  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) return { error: "Bitte eine CSV-Datei auswählen." };
  if (!file.name.toLowerCase().endsWith(".csv")) return { error: "Bitte eine .csv-Datei hochladen." };

  const csvText = await file.text();
  const { headers, rows } = parseCsv(csvText);
  if (headers.length === 0 || rows.length === 0) return { error: "Die Datei enthält keine lesbaren Zeilen." };

  const gespeicherteZuordnung = await getCsvSpaltenzuordnung();
  return { csvText, headers, previewRows: rows.slice(0, 5), vorschlag: guessSpaltenzuordnung(headers), gespeicherteZuordnung };
}

// ---------- Schritt 2: Zuordnung analysieren (Keyword-Matching), Review vorbereiten ----------

function mappingAusFormData(formData: FormData): CsvSpaltenzuordnung {
  const feld = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v || null;
  };
  return {
    datumSpalte: String(formData.get("datumSpalte") ?? "").trim(),
    betragSpalte: String(formData.get("betragSpalte") ?? "").trim(),
    empfaengerNameSpalte: feld("empfaengerNameSpalte"),
    empfaengerIbanSpalte: feld("empfaengerIbanSpalte"),
    verwendungszweckSpalte: feld("verwendungszweckSpalte"),
    finomKategorieSpalte: null,
    belegSpalte: null,
  };
}

export type CsvAnalyseState =
  | { error: string }
  | {
      csvText: string;
      mapping: CsvSpaltenzuordnung;
      analyse: BudgetCsvAnalyse;
      kategorien: { id: string; name: string }[];
    }
  | undefined;

export async function analyseBudgetCsvAction(_prev: CsvAnalyseState, formData: FormData): Promise<CsvAnalyseState> {
  await requireAdminOrVerwaltung();
  const csvText = String(formData.get("csvText") ?? "");
  if (!csvText) return { error: "Keine CSV-Daten vorhanden. Bitte Datei erneut hochladen." };

  const mapping = mappingAusFormData(formData);
  if (!mapping.datumSpalte || !mapping.betragSpalte) return { error: "Bitte mindestens Datum- und Betrag-Spalte zuordnen." };

  const [analyse, kategorien] = await Promise.all([
    analyseBudgetCsv(csvText, mapping),
    prisma.budgetKategorie.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return { csvText, mapping, analyse, kategorien };
}

// ---------- Schritt 3: bestätigte Zeilen importieren ----------

export type CsvImportState =
  | { error?: string; importiert?: number; nichtEingeplant?: number; uebersprungen?: number; duplikate?: number }
  | undefined;

export async function confirmBudgetCsv(_prev: CsvImportState, formData: FormData): Promise<CsvImportState> {
  const user = await requireAdminOrVerwaltung();

  const daten = formData.getAll("zeile").map(String);
  const zeilen: BudgetImportZeile[] = [];
  daten.forEach((roh, i) => {
    try {
      const z = JSON.parse(roh) as { datum: string; betrag: number; beschreibung: string; dedupKey: string };
      const kategorieRaw = String(formData.get(`kategorie:${i}`) ?? "");
      zeilen.push({
        datum: z.datum,
        betrag: z.betrag,
        beschreibung: z.beschreibung,
        dedupKey: z.dedupKey,
        kategorieId: kategorieRaw && kategorieRaw !== "__none__" ? kategorieRaw : null,
        reKoBudgetRelevant: formData.get(`reko:${i}`) != null,
        uebernehmen: formData.get(`uebernehmen:${i}`) != null,
      });
    } catch {
      // eine kaputte Zeile blockiert den Import nicht
    }
  });

  if (zeilen.length === 0) return { error: "Keine Zeilen zum Importieren." };

  const summary = await importBudgetCsvZeilen(zeilen);

  await logAccess({
    userId: user.id,
    action: "CREATE",
    entityType: "BudgetAusgabe",
    details: `Finom-CSV-Import: ${summary.importiert} importiert (${summary.nichtEingeplant} nicht eingeplant), ${summary.uebersprungen} übersprungen, ${summary.duplikate} Duplikate`,
  });
  revalidatePath(BUDGET_PFAD);
  revalidatePath(`${BUDGET_PFAD}/ausgaben`);
  return summary;
}
