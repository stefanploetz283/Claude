import PDFDocument from "pdfkit";
import { renderCaseSection, type CaseForExport, type ServiceEntryForExport } from "./case-pdf";

export function buildBulkPdf(params: {
  practiceName: string;
  periodLabel: string;
  sections: { caseInfo: CaseForExport; entries: ServiceEntryForExport[] }[];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
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
        practiceName: params.practiceName,
      });
    });

    if (params.sections.length === 0) {
      doc.fontSize(12).text("Keine Fälle ausgewählt.");
    }

    doc.end();
  });
}
