// Budgetrechner: liest das Blatt "Weitere Betriebskosten + AfA" der ReKo-Entgeltkalkulation (.xlsx) aus.
//
// GENERISCHE ERSTFASSUNG: Das reale Blatt-Layout ist noch nicht bekannt (Beispieldatei folgt, siehe
// local/entgeltkalkulation-beispiel.xlsx). Dieser Parser gibt daher bewusst ALLE Kandidatenzeilen mit
// erkanntem Namen + Betrag zurück; die endgültige Bestätigung/Korrektur passiert im Vorschau-UI
// (previewExcelImport). Sobald die Beispieldatei vorliegt: Blatt-/Spalten-/Zeilen-Erkennung hier fest
// darauf kalibrieren.
import ExcelJS from "exceljs";
import { parseGermanNumber } from "@/lib/finom-import";

/** Text-Wert einer ExcelJS-Zelle (Formeln über .result, RichText/Hyperlink berücksichtigt). */
function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) return value.richText.map((r) => r.text).join("").trim();
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    if ("formula" in value) return "";
  }
  return "";
}

/** Numerischer Wert einer Zelle - akzeptiert echte Zahlen, Formel-Ergebnisse und "1.234,56 €"-Strings. */
function cellNumber(value: ExcelJS.CellValue): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value && typeof value === "object" && "result" in value) return cellNumber(value.result as ExcelJS.CellValue);
  const text = cellText(value);
  if (!text) return null;
  return parseGermanNumber(text);
}

export type ErkanntePosition = {
  zeile: number; // 1-basierte Zeilennummer im Blatt (Orientierung im Vorschau-UI)
  name: string;
  jahresbetrag: number;
  rohzellen: string[]; // alle Zellwerte der Zeile als Text - Kontext für die manuelle Kontrolle
};

export type ExcelParseErgebnis = {
  blattName: string | null; // Name des tatsächlich verwendeten Blatts
  verfuegbareBlaetter: string[];
  positionen: ErkanntePosition[];
  warnungen: string[];
};

const BLATT_MUSTER = /weitere\s*betriebskosten/i;

/** Parst den .xlsx-Puffer. Wirft nicht - Probleme landen in `warnungen`, `positionen` kann leer sein. */
export async function parseEntgeltkalkulation(buffer: Buffer): Promise<ExcelParseErgebnis> {
  const warnungen: string[] = [];
  const workbook = new ExcelJS.Workbook();

  try {
    // ExcelJS akzeptiert Buffer zur Laufzeit; die Typen (@types/node-Buffer-Generic) verlangen einen Cast.
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    return { blattName: null, verfuegbareBlaetter: [], positionen: [], warnungen: ["Die Datei konnte nicht als Excel-Arbeitsmappe gelesen werden."] };
  }

  const verfuegbareBlaetter = workbook.worksheets.map((w) => w.name);
  const blatt =
    workbook.worksheets.find((w) => BLATT_MUSTER.test(w.name)) ??
    workbook.worksheets.find((w) => /betriebskosten|afa/i.test(w.name)) ??
    null;

  if (!blatt) {
    warnungen.push(
      `Kein Blatt "Weitere Betriebskosten + AfA" gefunden. Verfügbare Blätter: ${verfuegbareBlaetter.join(", ") || "keine"}.`
    );
    return { blattName: null, verfuegbareBlaetter, positionen: [], warnungen };
  }
  if (!BLATT_MUSTER.test(blatt.name)) {
    warnungen.push(`Blatt "${blatt.name}" wird als Betriebskosten-Blatt interpretiert (kein exakter Namenstreffer).`);
  }

  const positionen: ErkanntePosition[] = [];
  blatt.eachRow({ includeEmpty: false }, (row, zeile) => {
    const werte: ExcelJS.CellValue[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => werte.push(cell.value));

    const texte = werte.map(cellText);
    const zahlen = werte.map(cellNumber);

    // Name: erste nicht-leere Textzelle, die selbst keine reine Zahl ist.
    const nameIdx = texte.findIndex((t, i) => t.length > 0 && zahlen[i] == null);
    // Betrag: letzte positive Zahl der Zeile (rechte Spalte ist meist die Jahressumme).
    let betragIdx = -1;
    for (let i = zahlen.length - 1; i >= 0; i--) {
      if (zahlen[i] != null && (zahlen[i] as number) > 0) {
        betragIdx = i;
        break;
      }
    }

    if (nameIdx === -1 || betragIdx === -1) return;
    const name = texte[nameIdx];
    // Kopf-/Summenzeilen grob ausschließen - die Bestätigung erfolgt ohnehin im UI.
    if (/^(summe|gesamt|zwischensumme|position|bezeichnung)\b/i.test(name)) return;

    positionen.push({ zeile, name, jahresbetrag: zahlen[betragIdx] as number, rohzellen: texte });
  });

  if (positionen.length === 0) {
    warnungen.push(`Im Blatt "${blatt.name}" wurden keine Positionszeilen (Name + Betrag) erkannt. Bitte Datei/Blatt prüfen.`);
  }

  return { blattName: blatt.name, verfuegbareBlaetter, positionen, warnungen };
}
