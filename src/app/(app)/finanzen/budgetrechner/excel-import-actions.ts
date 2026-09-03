"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { parseEntgeltkalkulation, type ErkanntePosition } from "@/lib/budgetrechner/excel-import";

const BUDGET_PFAD = "/finanzen/budgetrechner";

export type ExcelPreviewState =
  | { error: string }
  | {
      jahr: number;
      blattName: string | null;
      verfuegbareBlaetter: string[];
      positionen: ErkanntePosition[];
      warnungen: string[];
    }
  | undefined;

/** Schritt 1: .xlsx einlesen, Positionen des Blatts "Weitere Betriebskosten + AfA" erkennen und zur
 * Kontrolle zurückgeben – es wird noch nichts gespeichert. */
export async function previewExcelImport(_prev: ExcelPreviewState, formData: FormData): Promise<ExcelPreviewState> {
  await requireAdminOrVerwaltung();

  const file = formData.get("datei");
  if (!(file instanceof File) || file.size === 0) return { error: "Bitte eine .xlsx-Datei auswählen." };
  if (!/\.xlsx$/i.test(file.name)) return { error: "Bitte eine .xlsx-Datei hochladen (kein .xls / .csv)." };

  const jahr = Number(formData.get("jahr")) || new Date().getFullYear();
  const buffer = Buffer.from(await file.arrayBuffer());
  const ergebnis = await parseEntgeltkalkulation(buffer);

  return {
    jahr,
    blattName: ergebnis.blattName,
    verfuegbareBlaetter: ergebnis.verfuegbareBlaetter,
    positionen: ergebnis.positionen,
    warnungen: ergebnis.warnungen,
  };
}

export type ExcelImportState =
  | { error?: string; angelegt?: number; aktualisiert?: number; jahr?: number }
  | undefined;

/** Schritt 2: Die im Vorschau-UI bestätigten/korrigierten Positionen als BudgetKategorie speichern
 * (upsert auf name+jahr – Reimport aktualisiert bestehende Positionen statt zu duplizieren). */
export async function confirmExcelImport(_prev: ExcelImportState, formData: FormData): Promise<ExcelImportState> {
  const user = await requireAdminOrVerwaltung();

  const jahr = Number(formData.get("jahr"));
  if (!Number.isInteger(jahr) || jahr < 2000 || jahr > 2100) return { error: "Ungültiges Budgetjahr." };

  const namen = formData.getAll("name").map(String);
  const betraege = formData.getAll("betrag").map(String);
  const uebernehmen = new Set(formData.getAll("uebernehmen").map(String)); // Werte = Zeilenindex als String

  let angelegt = 0;
  let aktualisiert = 0;

  for (let i = 0; i < namen.length; i++) {
    if (!uebernehmen.has(String(i))) continue;
    const name = namen[i]?.trim();
    const betragRaw = (betraege[i] ?? "").trim().replace(/\s|€/g, "");
    const betrag = Number(betragRaw.includes(",") ? betragRaw.replace(/\./g, "").replace(",", ".") : betragRaw);
    if (!name || !Number.isFinite(betrag) || betrag < 0) continue;

    const vorhanden = await prisma.budgetKategorie.findUnique({ where: { name_jahr: { name, jahr } } });
    if (vorhanden) {
      await prisma.budgetKategorie.update({ where: { id: vorhanden.id }, data: { jahresbudget: betrag, quelle: "excel_import" } });
      aktualisiert++;
    } else {
      await prisma.budgetKategorie.create({ data: { name, jahr, jahresbudget: betrag, quelle: "excel_import" } });
      angelegt++;
    }
  }

  if (angelegt + aktualisiert === 0) return { error: "Keine Positionen ausgewählt." };

  await logAccess({
    userId: user.id,
    action: "CREATE",
    entityType: "BudgetKategorie",
    details: `Excel-Import ${jahr}: ${angelegt} neu, ${aktualisiert} aktualisiert`,
  });
  revalidatePath(BUDGET_PFAD);
  revalidatePath(`${BUDGET_PFAD}/kategorien`);
  return { angelegt, aktualisiert, jahr };
}
