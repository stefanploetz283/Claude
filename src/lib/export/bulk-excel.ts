import ExcelJS from "exceljs";
import { format } from "date-fns";
import type { CaseForExport, ServiceEntryForExport } from "./case-pdf";

export async function buildBulkExcel(params: {
  periodLabel: string;
  sections: { caseInfo: CaseForExport; entries: ServiceEntryForExport[] }[];
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Übersicht");
  summary.columns = [
    { header: "Klient", key: "clientName", width: 24 },
    { header: "Hilfeart", key: "helpTypeName", width: 24 },
    { header: "ASD", key: "authority", width: 28 },
    { header: "Fachkraft", key: "employeeName", width: 22 },
    { header: "Zeitraum", key: "period", width: 20 },
    { header: "Gesamtstunden", key: "totalHours", width: 16 },
    { header: "Einträge", key: "count", width: 10 },
  ];
  summary.getRow(1).font = { bold: true };

  for (const section of params.sections) {
    const totalMinutes = section.entries.reduce((sum, e) => sum + e.durationMinutes, 0);
    summary.addRow({
      clientName: `${section.caseInfo.clientLastName}, ${section.caseInfo.clientFirstName}`,
      helpTypeName: section.caseInfo.helpTypeName,
      authority: section.caseInfo.authority,
      employeeName: section.caseInfo.assignedEmployeeName,
      period: params.periodLabel,
      totalHours: Number((totalMinutes / 60).toFixed(2)),
      count: section.entries.length,
    });
  }

  const details = workbook.addWorksheet("Einzeleinträge");
  details.columns = [
    { header: "Klient", key: "clientName", width: 24 },
    { header: "Datum", key: "date", width: 14 },
    { header: "Von", key: "start", width: 10 },
    { header: "Bis", key: "end", width: 10 },
    { header: "Dauer (Std.)", key: "duration", width: 12 },
    { header: "Inhalt", key: "description", width: 50 },
    { header: "Mitarbeiter", key: "employee", width: 22 },
  ];
  details.getRow(1).font = { bold: true };

  for (const section of params.sections) {
    for (const entry of section.entries) {
      details.addRow({
        clientName: `${section.caseInfo.clientLastName}, ${section.caseInfo.clientFirstName}`,
        date: format(entry.date, "dd.MM.yyyy"),
        start: format(entry.startTime, "HH:mm"),
        end: format(entry.endTime, "HH:mm"),
        duration: Number((entry.durationMinutes / 60).toFixed(2)),
        description: entry.description,
        employee: entry.employeeName,
      });
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
