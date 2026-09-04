// Budgetrechner: liest das Blatt "Weitere Betriebskosten + AfA" der ReKo-Entgeltkalkulation (.xlsx) aus.
//
// Das Blatt hat drei Blöcke (Raumkosten, Verwaltungssachkosten, Sonstige Kosten und AfA). Jeder Block
// beginnt mit einer Kopf-/Zwischensummenzeile (Name in Spalte B, Zwischensumme in Spalte C) und darunter
// die EINZELPOSITIONEN. Importiert werden die Einzelpositionen als je eigene Budget-Kategorie - die
// Zwischensummen dienen nur der Prüfsumme (Summe der Einzelposten muss der Zwischensumme entsprechen)
// und werden NICHT als Kategorie angelegt. Nur Positionen mit Betrag != 0.
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
  zeile: number; // 1-basierte Zeilennummer im Blatt
  block: string; // "Raumkosten" | "Verwaltungssachkosten" | "Sonstige Kosten und AfA"
  name: string;
  jahresbetrag: number;
};

export type BlockErgebnis = {
  blockName: string;
  headerZeile: number;
  zwischensumme: number | null; // Wert der Kopfzeile (Spalte C)
  positionen: ErkanntePosition[]; // Einzelposten mit Betrag != 0
  summeEinzelposten: number;
  abweichung: number | null; // summeEinzelposten - zwischensumme
};

export type ExcelParseErgebnis = {
  blattName: string | null;
  verfuegbareBlaetter: string[];
  bloecke: BlockErgebnis[];
  positionen: ErkanntePosition[]; // alle Einzelposten flach (für das Bestätigungs-Formular)
  warnungen: string[];
};

const BLATT_MUSTER = /weitere\s*betriebskosten/i;

// Reihenfolge = Reihenfolge im Blatt. Muster sind am Zeilenanfang verankert, damit Einzelposten wie
// "AfA Dienstfahrzeuge" oder "Kosten für zentrale Dienste" nicht fälschlich als Blockkopf gelten.
const BLOCK_MUSTER: { key: string; muster: RegExp }[] = [
  { key: "Raumkosten", muster: /^\s*raumkosten\b/i },
  { key: "Verwaltungssachkosten", muster: /^\s*verwaltungssachkosten\b/i },
  { key: "Sonstige Kosten und AfA", muster: /^\s*sonstige\s+kosten(\s*(und|\/|&|\+)\s*afa)?/i },
];

// Beendet den jeweils letzten Block (kein weiterer Blockkopf danach).
const STOPP_MUSTER = /(^\s*summe\b)|gesamt|weitere\s+betriebskosten\s*(gesamt|summe)?/i;

function istBlockKopf(text: string): string | null {
  for (const b of BLOCK_MUSTER) if (b.muster.test(text)) return b.key;
  return null;
}

export async function parseEntgeltkalkulation(buffer: Buffer): Promise<ExcelParseErgebnis> {
  const warnungen: string[] = [];
  const workbook = new ExcelJS.Workbook();

  try {
    // ExcelJS akzeptiert Buffer zur Laufzeit; die Typen (@types/node-Buffer-Generic) verlangen einen Cast.
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    return { blattName: null, verfuegbareBlaetter: [], bloecke: [], positionen: [], warnungen: ["Die Datei konnte nicht als Excel-Arbeitsmappe gelesen werden."] };
  }

  const verfuegbareBlaetter = workbook.worksheets.map((w) => w.name);
  const blatt =
    workbook.worksheets.find((w) => BLATT_MUSTER.test(w.name)) ??
    workbook.worksheets.find((w) => /betriebskosten|afa/i.test(w.name)) ??
    null;

  if (!blatt) {
    warnungen.push(`Kein Blatt "Weitere Betriebskosten + AfA" gefunden. Verfügbare Blätter: ${verfuegbareBlaetter.join(", ") || "keine"}.`);
    return { blattName: null, verfuegbareBlaetter, bloecke: [], positionen: [], warnungen };
  }
  if (!BLATT_MUSTER.test(blatt.name)) {
    warnungen.push(`Blatt "${blatt.name}" wird als Betriebskosten-Blatt interpretiert (kein exakter Namenstreffer).`);
  }

  // Alle Zeilen (inkl. leerer) als {nr, texte[], zahlen[]} einlesen - 1-basierte Spaltenindizes.
  const maxCol = Math.max(6, blatt.columnCount);
  type Zeile = { nr: number; texte: string[]; zahlen: (number | null)[] };
  const zeilen: Zeile[] = [];
  blatt.eachRow({ includeEmpty: true }, (row, nr) => {
    const texte: string[] = [];
    const zahlen: (number | null)[] = [];
    for (let c = 1; c <= maxCol; c++) {
      const v = row.getCell(c).value;
      texte[c] = cellText(v);
      zahlen[c] = cellNumber(v);
    }
    zeilen.push({ nr, texte, zahlen });
  });

  /** Spalte des Namens (Blockmuster-Treffer) und die erste Zahl-Spalte rechts davon. Fallback B/C. */
  function spalten(z: Zeile): { nameCol: number; betragCol: number } {
    let nameCol = z.texte.findIndex((t, i) => i >= 1 && t && istBlockKopf(t));
    if (nameCol < 1) nameCol = 2;
    let betragCol = -1;
    for (let c = nameCol + 1; c <= maxCol; c++) {
      if (z.zahlen[c] != null) {
        betragCol = c;
        break;
      }
    }
    if (betragCol < 1) betragCol = 3;
    return { nameCol, betragCol };
  }

  const bloecke: BlockErgebnis[] = [];
  for (let i = 0; i < zeilen.length; i++) {
    const kopf = zeilen[i];
    const blockName = kopf.texte.slice(1).map((t) => istBlockKopf(t)).find(Boolean);
    if (!blockName) continue;

    const { nameCol, betragCol } = spalten(kopf);
    const zwischensumme = kopf.zahlen[betragCol] ?? null;

    // Einzelposten bis zum nächsten Blockkopf / zur Gesamtsumme / Blattende einlesen. Leerzeilen und
    // Zwischenüberschriften (Name ohne Betrag) werden übersprungen, nicht als Blockende gewertet.
    const positionen: ErkanntePosition[] = [];
    let j = i + 1;
    for (; j < zeilen.length; j++) {
      const z = zeilen[j];
      const name = (z.texte[nameCol] ?? "").trim();
      const betrag = z.zahlen[betragCol];
      if (name && istBlockKopf(name)) break;
      if (name && STOPP_MUSTER.test(name)) break;
      if (!name || betrag == null) continue;
      if (Math.abs(betrag) < 0.005) continue; // Leerposition (Betrag 0)
      positionen.push({ zeile: z.nr, block: blockName, name, jahresbetrag: betrag });
    }
    i = j - 1; // Außenschleife auf die Grenzzeile setzen (i++ landet dann darauf)

    const summeEinzelposten = positionen.reduce((s, p) => s + p.jahresbetrag, 0);
    bloecke.push({
      blockName,
      headerZeile: kopf.nr,
      zwischensumme,
      positionen,
      summeEinzelposten,
      abweichung: zwischensumme != null ? summeEinzelposten - zwischensumme : null,
    });
  }

  if (bloecke.length === 0) {
    warnungen.push(`Im Blatt "${blatt.name}" wurden keine Kostenblöcke (Raumkosten / Verwaltungssachkosten / Sonstige Kosten und AfA) erkannt. Bitte Datei/Blatt prüfen.`);
  }
  for (const b of bloecke) {
    if (b.positionen.length === 0) warnungen.push(`Block "${b.blockName}": keine Einzelpositionen erkannt.`);
    if (b.abweichung != null && Math.abs(b.abweichung) > 0.02) {
      warnungen.push(
        `Block "${b.blockName}": Summe der Einzelposten (${b.summeEinzelposten.toFixed(2)} €) weicht von der Zwischensumme im Excel (${b.zwischensumme?.toFixed(2)} €) ab.`
      );
    }
  }

  return { blattName: blatt.name, verfuegbareBlaetter, bloecke, positionen: bloecke.flatMap((b) => b.positionen), warnungen };
}
