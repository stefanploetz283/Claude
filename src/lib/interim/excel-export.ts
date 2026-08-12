import path from "path";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

const TEMPLATE_PATH = path.join(process.cwd(), "src", "lib", "interim", "templates", "monatsabrechnung.xlsx");
const MAX_ROWS = 25;
const FIRST_ROW = 30;

export type InterimExportResult = { ok: true; buffer: Buffer; filename: string } | { ok: false; error: string };

/** Reine Uhrzeit für Excel-Spalte B/C, verankert auf Excels eigenen Nulltag (1899-12-30) - exakt wie in der
 * verifizierten Original-Vorlage, damit die Std.-Formel (MOD(C-B,1)*24) unverändert korrekt rechnet. */
function excelTimeOfDay(date: Date): Date {
  return new Date(Date.UTC(1899, 11, 30, date.getUTCHours(), date.getUTCMinutes()));
}

/** Setzt Formel + Ergebnis über den einzig funktionierenden Weg: `cell.result = x` ist in exceljs nur
 * ein Getter (lib/doc/cell.js Zeile 260) - die Zuweisung ist ein stiller No-Op, ohne Fehler, ohne Wirkung.
 * Nur `cell.value = { formula, result }` konstruiert intern tatsächlich einen neuen Formel-Wert mit
 * Ergebnis (per raw-XML gegengeprüft). Ersetzt bewusst auch geteilte Formeln (D31:D54) durch eigenständige
 * pro Zeile - harmlos (minimal größere Datei), aber ohne jedes Risiko, die Shared-Formula-Kette zu zerstören. */
function setFormulaWithResult(cell: ExcelJS.Cell, formula: string, result: number): void {
  cell.value = { formula, result } as unknown as ExcelJS.CellValue;
}

export async function buildInterimMonthlyExcel(caseId: string, year: number, month: number): Promise<InterimExportResult> {
  const interimCase = await prisma.interimCase.findUnique({ where: { id: caseId } });
  if (!interimCase) return { ok: false, error: "Fall nicht gefunden." };

  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1) - 1);

  const entries = await prisma.interimEntry.findMany({
    where: { caseId, date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
  });

  if (entries.length > MAX_ROWS) {
    return {
      ok: false,
      error: `Es sind ${entries.length} Einträge in diesem Monat erfasst, die Vorlage bietet aber nur Platz für ${MAX_ROWS} Zeilen. Bitte den Export für diesen Monat manuell aufteilen (z.B. Einträge zusammenfassen) - kein Eintrag wurde exportiert, damit nichts verloren geht.`,
    };
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);
  const ws = wb.worksheets[0];

  // Weist Excel/LibreOffice zusätzlich an, beim Öffnen neu zu rechnen (Sicherheitsnetz, falls die Datei
  // manuell weiterbearbeitet wird) - die eigentliche Korrektheit kommt aber aus den unten per
  // setFormulaWithResult direkt mitgelieferten Ergebnissen, unabhängig von jeglichem Recalc-Verhalten.
  wb.calcProperties.fullCalcOnLoad = true;

  ws.getCell("A1").value =
    interimCase.angebotsart === "PROS" ? "Monatsabrechnung PROS" : "Monatsabrechnung Erziehungsbeistandschaft";

  ws.getCell("E4").value = interimCase.familienname;
  ws.getCell("E6").value = interimCase.vorname;
  ws.getCell("E8").value = interimCase.strasseHausnummer;
  ws.getCell("E10").value = interimCase.plzOrt;
  ws.getCell("E14").value = interimCase.sachbearbeiterSpfd;
  ws.getCell("E16").value = from; // numFmt "mmmm yyyy" der Vorlage zeigt automatisch den Monatsnamen an
  ws.getCell("E18").value = interimCase.bewilligteWochenstunden.toNumber();
  const honorarProStunde = interimCase.honorarProStunde.toNumber();
  ws.getCell("E22").value = honorarProStunde;
  ws.getCell("E24").value = interimCase.leistungserbringer;

  let totalHours = 0;
  entries.forEach((entry, i) => {
    const row = FIRST_ROW + i;
    const hours = (entry.endTime.getTime() - entry.startTime.getTime()) / 3600000;
    totalHours += hours;
    ws.getCell(`A${row}`).value = entry.date;
    ws.getCell(`B${row}`).value = excelTimeOfDay(entry.startTime);
    ws.getCell(`C${row}`).value = excelTimeOfDay(entry.endTime);
    setFormulaWithResult(ws.getCell(`D${row}`), `MOD(C${row}-B${row},1)*24`, hours);
    ws.getCell(`E${row}`).value = entry.content;
  });
  // Zeilen ohne Eintrag in diesem Monat: Formel-Ergebnis auf 0 setzen (sonst bliebe ein alter Wert einer
  // Vorlagen-/früheren Ausführung stehen, obwohl B/C dort leer sind).
  for (let row = FIRST_ROW + entries.length; row < FIRST_ROW + MAX_ROWS; row++) {
    setFormulaWithResult(ws.getCell(`D${row}`), `MOD(C${row}-B${row},1)*24`, 0);
  }

  setFormulaWithResult(ws.getCell("E20"), "C61", totalHours);
  setFormulaWithResult(ws.getCell("C61"), "SUM(D30:D54)", totalHours);
  setFormulaWithResult(ws.getCell("C62"), "E22", honorarProStunde);
  setFormulaWithResult(ws.getCell("C63"), "C61*C62", totalHours * honorarProStunde);

  const buffer = await wb.xlsx.writeBuffer();
  const monthLabel = from.toLocaleDateString("de-DE", { month: "long", year: "numeric" }).replace(" ", "_");
  const filename = `Monatsabrechnung_${interimCase.familienname}_${interimCase.vorname}_${monthLabel}.xlsx`;

  return { ok: true, buffer: Buffer.from(buffer), filename };
}
