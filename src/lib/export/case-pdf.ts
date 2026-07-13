import PDFDocument from "pdfkit";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export type ServiceEntryForExport = {
  date: Date;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  description: string;
  employeeName: string;
};

export type CaseForExport = {
  caseNumber: string;
  authority: string;
  clientName: string;
  helpTypeName: string;
};

export function buildCaseServicePdf(params: {
  caseInfo: CaseForExport;
  entries: ServiceEntryForExport[];
  periodLabel: string;
  practiceName: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    renderCaseSection(doc, params);

    doc.end();
  });
}

export function renderCaseSection(
  doc: PDFKit.PDFDocument,
  params: { caseInfo: CaseForExport; entries: ServiceEntryForExport[]; periodLabel: string; practiceName: string }
) {
  const { caseInfo, entries, periodLabel, practiceName } = params;

  doc.fontSize(16).text(practiceName, { align: "left" });
  doc.moveDown(0.3);
  doc.fontSize(13).text("Leistungsnachweis", { align: "left" });
  doc.moveDown(0.8);

  doc.fontSize(10);
  const infoLines = [
    ["Klient", caseInfo.clientName],
    ["Hilfeart", caseInfo.helpTypeName],
    ["Aktenzeichen", caseInfo.caseNumber],
    ["Zuständiges Jugendamt/Auftraggeber", caseInfo.authority],
    ["Zeitraum", periodLabel],
  ];
  for (const [label, value] of infoLines) {
    doc.font("Helvetica-Bold").text(`${label}: `, { continued: true }).font("Helvetica").text(value);
  }
  doc.moveDown(1);

  const tableTop = doc.y;
  const colX = { date: 50, time: 120, duration: 210, description: 280 };

  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("Datum", colX.date, tableTop);
  doc.text("Zeit", colX.time, tableTop);
  doc.text("Dauer", colX.duration, tableTop);
  doc.text("Inhalt", colX.description, tableTop);
  doc.moveTo(50, tableTop + 14).lineTo(545, tableTop + 14).stroke();

  let y = tableTop + 20;
  doc.font("Helvetica").fontSize(9);
  let totalMinutes = 0;

  for (const entry of entries) {
    if (y > 760) {
      doc.addPage();
      y = 50;
    }
    totalMinutes += entry.durationMinutes;
    doc.text(format(entry.date, "dd.MM.yyyy"), colX.date, y, { width: 65 });
    doc.text(`${format(entry.startTime, "HH:mm")}–${format(entry.endTime, "HH:mm")}`, colX.time, y, { width: 85 });
    doc.text(`${(entry.durationMinutes / 60).toFixed(2)} Std.`, colX.duration, y, { width: 65 });
    const descHeight = doc.heightOfString(entry.description, { width: 265 });
    doc.text(entry.description, colX.description, y, { width: 265 });
    y += Math.max(descHeight, 12) + 6;
  }

  doc.moveTo(50, y + 4).lineTo(545, y + 4).stroke();
  y += 12;
  doc.font("Helvetica-Bold").text(`Gesamtstunden: ${(totalMinutes / 60).toFixed(2)} Std. (${entries.length} Einträge)`, 50, y);

  doc.moveDown(2);
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#666")
    .text(`Erstellt am ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: de })}`, 50, doc.y);
  doc.fillColor("#000");
}
