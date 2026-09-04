"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { parseEntgeltkalkulation, type BlockErgebnis } from "@/lib/budgetrechner/excel-import";

const BUDGET_PFAD = "/finanzen/budgetrechner";

export type ExcelPreviewState =
  | { error: string }
  | {
      jahr: number;
      blattName: string | null;
      verfuegbareBlaetter: string[];
      bloecke: BlockErgebnis[];
      warnungen: string[];
      vorhandeneImportPositionen: number; // bereits für dieses Jahr importierte Positionen (werden ersetzt)
    }
  | undefined;

/** Schritt 1: .xlsx einlesen, die EINZELPOSITIONEN je Kostenblock erkennen (nicht die Zwischensummen)
 * und mit Prüfsumme je Block zur Kontrolle zurückgeben – es wird noch nichts gespeichert. */
export async function previewExcelImport(_prev: ExcelPreviewState, formData: FormData): Promise<ExcelPreviewState> {
  await requireAdminOrVerwaltung();

  const file = formData.get("datei");
  if (!(file instanceof File) || file.size === 0) return { error: "Bitte eine .xlsx-Datei auswählen." };
  if (!/\.xlsx$/i.test(file.name)) return { error: "Bitte eine .xlsx-Datei hochladen (kein .xls / .csv)." };

  const jahr = Number(formData.get("jahr")) || new Date().getFullYear();
  const buffer = Buffer.from(await file.arrayBuffer());
  const [ergebnis, vorhandeneImportPositionen] = await Promise.all([
    parseEntgeltkalkulation(buffer),
    prisma.budgetKategorie.count({ where: { jahr, quelle: "excel_import" } }),
  ]);

  return {
    jahr,
    blattName: ergebnis.blattName,
    verfuegbareBlaetter: ergebnis.verfuegbareBlaetter,
    bloecke: ergebnis.bloecke,
    warnungen: ergebnis.warnungen,
    vorhandeneImportPositionen,
  };
}

export type ExcelImportState =
  | { error?: string; angelegt?: number; aktualisiert?: number; ersetzt?: number; jahr?: number }
  | undefined;

/** Schritt 2: Die im Vorschau-UI bestätigten/korrigierten Einzelpositionen als BudgetKategorie speichern.
 * Upsert auf name+jahr (unveränderte Positionen behalten ihre bisherigen Ausgaben-Zuordnungen). Mit
 * "ersetzen" werden zuvor importierte Positionen dieses Jahres, die nicht mehr in der Liste stehen
 * (z.B. die alten Sammelkategorien), gelöscht – ihre Ausgaben wandern über onDelete:SetNull in die
 * Liste "nicht eingeplante Kosten" und müssen dort manuell neu zugeordnet werden. */
export async function confirmExcelImport(_prev: ExcelImportState, formData: FormData): Promise<ExcelImportState> {
  const user = await requireAdminOrVerwaltung();

  const jahr = Number(formData.get("jahr"));
  if (!Number.isInteger(jahr) || jahr < 2000 || jahr > 2100) return { error: "Ungültiges Budgetjahr." };
  const ersetzen = formData.get("ersetzen") != null;

  const namen = formData.getAll("name").map(String);
  const betraege = formData.getAll("betrag").map(String);
  const uebernehmen = new Set(formData.getAll("uebernehmen").map(String)); // Werte = Zeilenindex als String

  let angelegt = 0;
  let aktualisiert = 0;
  const uebernommeneNamen: string[] = [];

  for (let i = 0; i < namen.length; i++) {
    if (!uebernehmen.has(String(i))) continue;
    const name = namen[i]?.trim();
    const betragRaw = (betraege[i] ?? "").trim().replace(/\s|€/g, "");
    const betrag = Number(betragRaw.includes(",") ? betragRaw.replace(/\./g, "").replace(",", ".") : betragRaw);
    if (!name || !Number.isFinite(betrag) || betrag < 0) continue;

    uebernommeneNamen.push(name);
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

  let ersetzt = 0;
  if (ersetzen) {
    const { count } = await prisma.budgetKategorie.deleteMany({
      where: { jahr, quelle: "excel_import", name: { notIn: uebernommeneNamen } },
    });
    ersetzt = count;
  }

  await logAccess({
    userId: user.id,
    action: "CREATE",
    entityType: "BudgetKategorie",
    details: `Excel-Import ${jahr}: ${angelegt} neu, ${aktualisiert} aktualisiert, ${ersetzt} ersetzt/entfernt`,
  });
  revalidatePath(BUDGET_PFAD);
  revalidatePath(`${BUDGET_PFAD}/kategorien`);
  return { angelegt, aktualisiert, ersetzt, jahr };
}
