import PDFDocument from "pdfkit";
import { renderCaseSection, type CaseForExport, type ServiceEntryForExport, type PracticeForExport } from "./case-pdf";

export function buildBulkPdf(params: {
  practice: PracticeForExport;
  periodLabel: string;
  monthLabel: string;
  sections: { caseInfo: CaseForExport; entries: ServiceEntryForExport[]; processNote: string | null }[];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    params.sections.forEach((section, index) => {
      if (index > 0) doc.addPage();
      renderCaseSection(doc, {
        caseInfo: section.caseInfo,
        entries: section.entries,
        periodLabel: params.periodLabel,
        monthLabel: params.monthLabel,
        processNote: section.processNote,
        practice: params.practice,
      });
    });

    if (params.sections.length === 0) {
      doc.fontSize(12).text("Keine Fälle ausgewählt.", 50, 50);
    }

    doc.end();
  });
}
