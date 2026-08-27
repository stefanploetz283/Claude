"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import {
  parseCsv,
  guessSpaltenzuordnung,
  getCsvSpaltenzuordnung,
  importFinomCsv,
  type CsvSpaltenzuordnung,
  type FinomImportZusammenfassung,
} from "@/lib/finom-import";
import type { KostenKategorie } from "@prisma/client";

const KOSTEN_KATEGORIE_WERTE = ["PERSONALKOSTEN", "RAUMKOSTEN", "VERWALTUNGSSACHKOSTEN", "SONSTIGE_KOSTEN_AFA"] as const;

export type PreviewState =
  | { error: string }
  | {
      csvText: string;
      headers: string[];
      previewRows: string[][];
      vorschlag: Partial<CsvSpaltenzuordnung>;
      gespeicherteZuordnung: CsvSpaltenzuordnung | null;
    }
  | undefined;

/** Schritt 1: Datei einlesen, Spalten erkennen, Vorschau + Spalten-Vorschlag zurückgeben - noch kein Import. */
export async function previewCsvImport(_prev: PreviewState, formData: FormData): Promise<PreviewState> {
  await requireAdmin();
  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) return { error: "Bitte eine CSV-Datei auswählen." };
  if (!file.name.toLowerCase().endsWith(".csv")) return { error: "Bitte eine .csv-Datei hochladen." };

  const csvText = await file.text();
  const { headers, rows } = parseCsv(csvText);
  if (headers.length === 0 || rows.length === 0) return { error: "Die Datei enthält keine lesbaren Zeilen." };

  const [vorschlag, gespeicherteZuordnung] = await Promise.all([Promise.resolve(guessSpaltenzuordnung(headers)), getCsvSpaltenzuordnung()]);

  return { csvText, headers, previewRows: rows.slice(0, 5), vorschlag, gespeicherteZuordnung };
}

export type ImportState = { error?: string; summary?: FinomImportZusammenfassung } | undefined;

/** Schritt 2: Admin bestätigt/korrigiert die Spaltenzuordnung - jetzt läuft der eigentliche Import. */
export async function confirmCsvImport(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const admin = await requireAdmin();
  const csvText = String(formData.get("csvText") ?? "");
  if (!csvText) return { error: "Keine CSV-Daten vorhanden. Bitte Datei erneut hochladen." };

  const datumSpalte = String(formData.get("datumSpalte") ?? "").trim();
  const betragSpalte = String(formData.get("betragSpalte") ?? "").trim();
  if (!datumSpalte || !betragSpalte) return { error: "Bitte mindestens Datum- und Betrag-Spalte zuordnen." };

  const mapping: CsvSpaltenzuordnung = {
    datumSpalte,
    betragSpalte,
    empfaengerNameSpalte: String(formData.get("empfaengerNameSpalte") ?? "").trim() || null,
    empfaengerIbanSpalte: String(formData.get("empfaengerIbanSpalte") ?? "").trim() || null,
    verwendungszweckSpalte: String(formData.get("verwendungszweckSpalte") ?? "").trim() || null,
    finomKategorieSpalte: String(formData.get("finomKategorieSpalte") ?? "").trim() || null,
    belegSpalte: String(formData.get("belegSpalte") ?? "").trim() || null,
  };

  const summary = await importFinomCsv(csvText, mapping);

  await logAccess({
    userId: admin.id,
    action: "CREATE",
    entityType: "FinomBuchungRohdaten",
    details: `CSV-Import: ${summary.neu} neu (${summary.automatischZugeordnet} automatisch, ${summary.zuKlaeren} zu klären, ${summary.ignoriert} ignoriert), ${summary.duplikate} Duplikate übersprungen`,
  });
  revalidatePath("/finanzen/cockpit");
  return { summary };
}

/** "Bitte zuordnen"-Liste: Buchung manuell einer Kategorie zuweisen, optional als künftige Empfänger-Regel merken. */
export async function assignBuchungManually(id: string, kategorie: string, merkeAlsRegel: boolean): Promise<{ error?: string } | undefined> {
  const admin = await requireAdmin();
  if (!KOSTEN_KATEGORIE_WERTE.includes(kategorie as (typeof KOSTEN_KATEGORIE_WERTE)[number])) {
    return { error: "Bitte eine gültige Kategorie wählen." };
  }
  const buchung = await prisma.finomBuchungRohdaten.findUnique({ where: { id } });
  if (!buchung) return { error: "Buchung nicht gefunden." };

  const eintrag = await prisma.istKostenEintrag.create({
    data: {
      datum: buchung.datum,
      kategorie: kategorie as KostenKategorie,
      unterkategorie: buchung.empfaengerName,
      betrag: Math.abs(buchung.betrag.toNumber()),
      quelle: "finom_csv",
    },
  });

  await prisma.finomBuchungRohdaten.update({
    where: { id },
    data: { zugeordneteKategorie: kategorie as KostenKategorie, zuordnungsquelle: "MANUELL", status: "ZUGEORDNET", istKostenEintragId: eintrag.id },
  });

  if (merkeAlsRegel && (buchung.empfaengerName || buchung.empfaengerIban)) {
    await prisma.finomEmpfaengerZuordnung.create({
      data: { empfaengerNameOderIban: buchung.empfaengerName ?? buchung.empfaengerIban!, kategorie: kategorie as KostenKategorie },
    });
  }

  await logAccess({ userId: admin.id, action: "UPDATE", entityType: "FinomBuchungRohdaten", entityId: id, details: `Manuell zugeordnet: ${kategorie}` });
  revalidatePath("/finanzen/cockpit");
  return undefined;
}

/** Buchung als "ignorieren" markieren (z.B. übersehene private Entnahme), ohne einen Kosten-Eintrag anzulegen. */
export async function ignoreBuchungManually(id: string): Promise<{ error?: string } | undefined> {
  const admin = await requireAdmin();
  await prisma.finomBuchungRohdaten.update({ where: { id }, data: { status: "IGNORIERT", zuordnungsquelle: "MANUELL" } });
  await logAccess({ userId: admin.id, action: "UPDATE", entityType: "FinomBuchungRohdaten", entityId: id, details: "Manuell ignoriert" });
  revalidatePath("/finanzen/cockpit");
  return undefined;
}

// ---------- Admin-Verwaltung der Zuordnungstabellen ----------

export async function addEmpfaengerZuordnung(empfaengerNameOderIban: string, kategorie: string) {
  const admin = await requireAdmin();
  const name = empfaengerNameOderIban.trim();
  if (!name) return;
  await prisma.finomEmpfaengerZuordnung.create({
    data: { empfaengerNameOderIban: name, kategorie: kategorie ? (kategorie as KostenKategorie) : null },
  });
  await logAccess({ userId: admin.id, action: "CREATE", entityType: "FinomEmpfaengerZuordnung", details: name });
  revalidatePath("/finanzen/cockpit");
}

export async function deleteEmpfaengerZuordnung(id: string) {
  const admin = await requireAdmin();
  await prisma.finomEmpfaengerZuordnung.delete({ where: { id } });
  await logAccess({ userId: admin.id, action: "DELETE", entityType: "FinomEmpfaengerZuordnung", entityId: id });
  revalidatePath("/finanzen/cockpit");
}

export async function addKategorieMapping(finomKategorieBezeichnung: string, praxisKategorie: string) {
  const admin = await requireAdmin();
  const bez = finomKategorieBezeichnung.trim();
  if (!bez || !KOSTEN_KATEGORIE_WERTE.includes(praxisKategorie as (typeof KOSTEN_KATEGORIE_WERTE)[number])) return;
  await prisma.finomKategorieMapping.create({ data: { finomKategorieBezeichnung: bez, praxisKategorie: praxisKategorie as KostenKategorie } });
  await logAccess({ userId: admin.id, action: "CREATE", entityType: "FinomKategorieMapping", details: bez });
  revalidatePath("/finanzen/cockpit");
}

export async function deleteKategorieMapping(id: string) {
  const admin = await requireAdmin();
  await prisma.finomKategorieMapping.delete({ where: { id } });
  await logAccess({ userId: admin.id, action: "DELETE", entityType: "FinomKategorieMapping", entityId: id });
  revalidatePath("/finanzen/cockpit");
}
