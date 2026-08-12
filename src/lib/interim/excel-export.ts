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

  ws.getCell("A1").value =
    interimCase.angebotsart === "PROS" ? "Monatsabrechnung PROS" : "Monatsabrechnung Erziehungsbeistandschaft";

  ws.getCell("E4").value = interimCase.familienname;
  ws.getCell("E6").value = interimCase.vorname;
  ws.getCell("E8").value = interimCase.strasseHausnummer;
  ws.getCell("E10").value = interimCase.plzOrt;
  ws.getCell("E14").value = interimCase.sachbearbeiterSpfd;
  ws.getCell("E16").value = from; // numFmt "mmmm yyyy" der Vorlage zeigt automatisch den Monatsnamen an
  ws.getCell("E18").value = interimCase.bewilligteWochenstunden.toNumber();
  ws.getCell("E22").value = interimCase.honorarProStunde.toNumber();
  ws.getCell("E24").value = interimCase.leistungserbringer;

  entries.forEach((entry, i) => {
    const row = FIRST_ROW + i;
    ws.getCell(`A${row}`).value = entry.date;
    ws.getCell(`B${row}`).value = excelTimeOfDay(entry.startTime);
    ws.getCell(`C${row}`).value = excelTimeOfDay(entry.endTime);
    ws.getCell(`E${row}`).value = entry.content;
  });

  const buffer = await wb.xlsx.writeBuffer();
  const monthLabel = from.toLocaleDateString("de-DE", { month: "long", year: "numeric" }).replace(" ", "_");
  const filename = `Monatsabrechnung_${interimCase.familienname}_${interimCase.vorname}_${monthLabel}.xlsx`;

  return { ok: true, buffer: Buffer.from(buffer), filename };
}
