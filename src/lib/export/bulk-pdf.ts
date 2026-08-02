import { readFileSync } from "fs";
import path from "path";
import { renderHtmlTemplateToPdf } from "./html-pdf";
import { renderCaseSectionHtml, type CaseForExport, type ServiceEntryForExport, type PracticeForExport } from "./case-pdf";

const TEMPLATE_PATH = path.join(process.cwd(), "src", "lib", "export", "templates", "leistungsnachweis.html");

export async function buildBulkPdf(params: {
  practice: PracticeForExport;
  periodLabel: string;
  monthLabel: string;
  sections: { caseInfo: CaseForExport; entries: ServiceEntryForExport[]; processNote: string | null }[];
}): Promise<Buffer> {
  const templateHtml = readFileSync(TEMPLATE_PATH, "utf-8");

  if (params.sections.length === 0) {
    return renderHtmlTemplateToPdf(templateHtml, {}, { sections: `<div class="case-section">Keine Fälle ausgewählt.</div>` });
  }

  const sectionsHtml = params.sections
    .map((section) =>
      renderCaseSectionHtml({
        caseInfo: section.caseInfo,
        entries: section.entries,
        monthLabel: params.monthLabel,
        processNote: section.processNote,
        practice: params.practice,
      })
    )
    .join("");

  return renderHtmlTemplateToPdf(templateHtml, {}, { sections: sectionsHtml });
}
