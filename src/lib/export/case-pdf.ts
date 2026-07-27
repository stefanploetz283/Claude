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
  authority: string; // ASD
  clientFirstName: string;
  clientLastName: string;
  clientAddress: string | null;
  helpTypeName: string;
  assignedEmployeeName: string;
};

export type PracticeForExport = {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoBuffer: Buffer | null;
};

const COLOR_PRIMARY = "#1F5A36";
const COLOR_BORDER = "#E5E8E3";
const COLOR_TEXT = "#24342C";
const COLOR_MUTED = "#6E776F";
const COLOR_TABLE_HEAD_BG = "#F6F5F0";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_H = 56;
const CONTENT_BOTTOM = PAGE_H - FOOTER_H;

const COL_DATE_X = MARGIN + 4;
const COL_DATE_W = 68;
const COL_TIME_X = COL_DATE_X + COL_DATE_W;
const COL_TIME_W = 80;
const COL_DURATION_X = COL_TIME_X + COL_TIME_W;
const COL_DURATION_W = 60;
const COL_DESC_X = COL_DURATION_X + COL_DURATION_W;
const COL_DESC_W = MARGIN + CONTENT_W - COL_DESC_X - 4;

function formatHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function buildCaseServicePdf(params: {
  caseInfo: CaseForExport;
  entries: ServiceEntryForExport[];
  periodLabel: string;
  monthLabel: string;
  processNote: string | null;
  practice: PracticeForExport;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
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
  params: {
    caseInfo: CaseForExport;
    entries: ServiceEntryForExport[];
    periodLabel: string;
    monthLabel: string;
    processNote: string | null;
    practice: PracticeForExport;
  }
) {
  const { caseInfo, entries, monthLabel, processNote, practice } = params;
  const clientName = `${caseInfo.clientLastName}, ${caseInfo.clientFirstName}`;

  function newPageBg() {
    doc.rect(0, 0, PAGE_W, PAGE_H).fill("#FFFFFF");
  }

  function drawFullHeader(): number {
    newPageBg();
    const headerH = 118;
    if (practice.logoBuffer) {
      try {
        doc.image(practice.logoBuffer, MARGIN, 20, { fit: [160, 80] });
      } catch {
        doc.font("Helvetica-Bold").fontSize(15).fillColor(COLOR_PRIMARY).text(practice.name, MARGIN, 45);
      }
    } else {
      doc.font("Helvetica-Bold").fontSize(15).fillColor(COLOR_PRIMARY).text(practice.name, MARGIN, 45);
    }
    doc.rect(0, headerH, PAGE_W, 1.5).fill(COLOR_PRIMARY);
    return headerH + 28;
  }

  function drawContinuationHeader(): number {
    newPageBg();
    const headerH = 70;
    doc.font("Helvetica-Bold").fontSize(12).fillColor(COLOR_PRIMARY).text(practice.name, MARGIN, 26);
    doc.font("Helvetica").fontSize(9).fillColor(COLOR_MUTED).text(`Fortsetzung – ${clientName}`, MARGIN, 44);
    doc.rect(0, headerH, PAGE_W, 1.5).fill(COLOR_PRIMARY);
    return headerH + 24;
  }

  function drawFooter() {
    const y = PAGE_H - FOOTER_H;
    doc.rect(0, y, PAGE_W, FOOTER_H).fill(COLOR_PRIMARY);

    const cols = [
      { text: practice.name, bold: true },
      { text: practice.address ? practice.address.replace(" · ", "\n") : "", bold: false },
      { text: practice.phone ?? "", bold: false },
      { text: practice.email ?? "", bold: false },
    ].filter((c) => c.text);

    const colW = CONTENT_W / cols.length;
    cols.forEach((col, i) => {
      const x = MARGIN + i * colW;
      if (i > 0) {
        doc.moveTo(x, y + 12).lineTo(x, y + FOOTER_H - 12).strokeColor("#4A7A5A").lineWidth(0.75).stroke();
      }
      doc
        .font(col.bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(8.5)
        .fillColor("#FFFFFF")
        .text(col.text, x + (i > 0 ? 12 : 0), y + 14, { width: colW - (i > 0 ? 24 : 12) });
    });
  }

  function finishPage() {
    drawFooter();
  }

  function goToNextPage(continuationLabel = true) {
    finishPage();
    doc.addPage();
    return continuationLabel ? drawContinuationHeader() : drawFullHeader();
  }

  // ---------- Page 1: header, title, klient card, ASD/Fachkraft/Monat ----------
  let y = drawFullHeader();

  doc.font("Helvetica-Bold").fontSize(28).fillColor(COLOR_PRIMARY);
  const titleColW = 260;
  doc.text("Leistungsnachweis", MARGIN, y, { width: titleColW });
  doc.text("PROS", MARGIN, y + 66, { width: titleColW });

  const cardX = MARGIN + titleColW + 20;
  const cardW = MARGIN + CONTENT_W - cardX;
  drawKlientCard(doc, cardX, y, cardW, clientName, caseInfo.clientAddress);

  y += 140;

  const rowH = 70;
  const gap = 16;
  const boxW = (CONTENT_W - gap * 2) / 3;
  drawInfoBox(doc, MARGIN, y, boxW, rowH, "ASD", caseInfo.authority);
  drawInfoBox(doc, MARGIN + boxW + gap, y, boxW, rowH, "Fachkraft", caseInfo.assignedEmployeeName);
  drawInfoBox(doc, MARGIN + (boxW + gap) * 2, y, boxW, rowH, "Monat", monthLabel);
  y += rowH + 24;

  // ---------- Table ----------
  let tableTop = y;
  drawTableHeaderRow(doc, tableTop);
  y = tableTop + 32;
  doc.font("Helvetica").fontSize(9.5).fillColor(COLOR_TEXT);

  let totalMinutes = 0;

  for (const entry of entries) {
    totalMinutes += entry.durationMinutes;
    const descHeight = doc.heightOfString(entry.description, { width: COL_DESC_W });
    const rowHeight = Math.max(descHeight, 14) + 14;

    if (y + rowHeight > CONTENT_BOTTOM - 10) {
      doc.rect(MARGIN, tableTop, CONTENT_W, y - tableTop).strokeColor(COLOR_BORDER).lineWidth(1).stroke();
      y = goToNextPage();
      tableTop = y;
      drawTableHeaderRow(doc, tableTop);
      y = tableTop + 32;
      doc.font("Helvetica").fontSize(9.5).fillColor(COLOR_TEXT);
    }

    doc.font("Helvetica").fillColor(COLOR_TEXT).fontSize(9.5);
    doc.text(format(entry.date, "dd.MM.yyyy"), COL_DATE_X, y, { width: COL_DATE_W });
    doc.text(`${format(entry.startTime, "HH:mm")} – ${format(entry.endTime, "HH:mm")}`, COL_TIME_X, y, { width: COL_TIME_W });
    doc.text(formatHM(entry.durationMinutes), COL_DURATION_X, y, { width: COL_DURATION_W });
    doc.text(entry.description, COL_DESC_X, y, { width: COL_DESC_W });
    doc
      .moveTo(MARGIN, y + rowHeight - 7)
      .lineTo(PAGE_W - MARGIN, y + rowHeight - 7)
      .strokeColor(COLOR_BORDER)
      .lineWidth(0.5)
      .stroke();

    y += rowHeight;
  }

  if (entries.length === 0) {
    doc.font("Helvetica-Oblique").fontSize(9.5).fillColor(COLOR_MUTED).text("Keine Einträge in diesem Zeitraum.", COL_DATE_X, y);
    y += 20;
  }

  doc.rect(MARGIN, tableTop, CONTENT_W, y - tableTop).strokeColor(COLOR_BORDER).lineWidth(1).stroke();
  y += 22;

  // ---------- Prozess + Gesamtstunden/Unterschrift must be on the LAST page ----------
  const TAIL_BLOCK_H = 260;
  if (y + TAIL_BLOCK_H > CONTENT_BOTTOM) {
    y = goToNextPage();
  }

  y = drawProcessBox(doc, y, processNote);
  y += 20;
  drawSummaryAndSignature(doc, y, totalMinutes);

  finishPage();
}

function drawKlientCard(doc: PDFKit.PDFDocument, x: number, y: number, w: number, clientName: string, address: string | null) {
  const h = 140;
  doc.roundedRect(x, y, w, h, 10).lineWidth(1).strokeColor(COLOR_BORDER).stroke();

  doc.font("Helvetica-Bold").fontSize(12.5).fillColor(COLOR_TEXT).text("Klient", x + 18, y + 16);

  const [lastName, firstName] = clientName.split(", ");
  const pad = 18;
  const labelW = 66;
  let rowY = y + 44;

  const rows: [string, string][] = [
    ["Vorname", firstName ?? ""],
    ["Nachname", lastName ?? ""],
  ];
  for (const [label, value] of rows) {
    doc.font("Helvetica").fontSize(9).fillColor(COLOR_MUTED).text(label, x + pad, rowY);
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COLOR_TEXT).text(value, x + pad + labelW, rowY, { width: w - pad * 2 - labelW });
    doc
      .moveTo(x + pad + labelW, rowY + 15)
      .lineTo(x + w - pad, rowY + 15)
      .strokeColor(COLOR_BORDER)
      .lineWidth(0.75)
      .stroke();
    rowY += 26;
  }

  doc.font("Helvetica").fontSize(9).fillColor(COLOR_MUTED).text("Adresse", x + pad, rowY);
  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor(COLOR_TEXT)
    .text(address ?? "", x + pad + labelW, rowY, { width: w - pad * 2 - labelW });
}

function drawInfoBox(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, label: string, value: string) {
  doc.roundedRect(x, y, w, h, 10).lineWidth(1).strokeColor(COLOR_BORDER).stroke();
  doc.font("Helvetica-Bold").fontSize(11).fillColor(COLOR_TEXT).text(label, x + 16, y + 14);
  doc
    .moveTo(x + 16, y + h - 18)
    .lineTo(x + w - 16, y + h - 18)
    .strokeColor(COLOR_BORDER)
    .lineWidth(0.75)
    .stroke();
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COLOR_TEXT).text(value, x + 16, y + h - 32, { width: w - 32 });
}

function drawTableHeaderRow(doc: PDFKit.PDFDocument, y: number) {
  doc.rect(MARGIN, y, CONTENT_W, 28).fill(COLOR_TABLE_HEAD_BG);
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLOR_MUTED);
  doc.text("DATUM", COL_DATE_X, y + 6, { width: COL_DATE_W });
  doc.text("ZEIT", COL_TIME_X, y + 6, { width: COL_TIME_W });
  doc.font("Helvetica").fontSize(6.5).fillColor(COLOR_MUTED).text("(von – bis)", COL_TIME_X, y + 17, { width: COL_TIME_W });
  doc.font("Helvetica-Bold").fontSize(8.5).text("DAUER", COL_DURATION_X, y + 6, { width: COL_DURATION_W });
  doc.font("Helvetica").fontSize(6.5).text("(hh:mm)", COL_DURATION_X, y + 17, { width: COL_DURATION_W });
  doc.font("Helvetica-Bold").fontSize(8.5).text("INHALT / TÄTIGKEIT", COL_DESC_X, y + 6, { width: COL_DESC_W });
}

function drawProcessBox(doc: PDFKit.PDFDocument, y: number, processNote: string | null): number {
  const h = 110;
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 10).lineWidth(1).strokeColor(COLOR_BORDER).stroke();
  doc.font("Helvetica-Bold").fontSize(11).fillColor(COLOR_TEXT).text("Prozess", MARGIN + 16, y + 14);
  if (processNote) {
    doc.font("Helvetica").fontSize(9.5).fillColor(COLOR_TEXT).text(processNote, MARGIN + 16, y + 34, { width: CONTENT_W - 32, height: h - 48 });
  }
  return y + h;
}

function drawSummaryAndSignature(doc: PDFKit.PDFDocument, y: number, totalMinutes: number) {
  const h = 88;
  const leftW = (CONTENT_W - 16) * 0.32;
  const rightX = MARGIN + leftW + 16;
  const rightW = CONTENT_W - leftW - 16;

  doc.roundedRect(MARGIN, y, leftW, h, 10).lineWidth(1).strokeColor(COLOR_BORDER).stroke();
  doc.font("Helvetica").fontSize(9).fillColor(COLOR_MUTED).text("Gesamtstunden", MARGIN + 16, y + 16);
  doc.font("Helvetica-Bold").fontSize(24).fillColor(COLOR_TEXT).text(formatHM(totalMinutes), MARGIN + 16, y + 36);

  doc.roundedRect(rightX, y, rightW, h, 10).lineWidth(1).strokeColor(COLOR_BORDER).stroke();
  doc.font("Helvetica").fontSize(9).fillColor(COLOR_MUTED).text("Unterschrift Fachkraft", rightX + 16, y + 14);
  doc
    .moveTo(rightX + 16, y + 32)
    .lineTo(rightX + rightW - 16, y + 32)
    .strokeColor(COLOR_TEXT)
    .lineWidth(0.75)
    .stroke();
  doc.font("Helvetica").fontSize(9).fillColor(COLOR_MUTED).text("Ort, Datum", rightX + 16, y + 44);
  doc
    .moveTo(rightX + 16, y + 62)
    .lineTo(rightX + rightW - 16, y + 62)
    .strokeColor(COLOR_TEXT)
    .lineWidth(0.75)
    .stroke();
}
