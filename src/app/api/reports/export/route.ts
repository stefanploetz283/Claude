import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser, caseVisibilityWhere } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { buildBulkPdf } from "@/lib/export/bulk-pdf";
import { buildBulkExcel } from "@/lib/export/bulk-excel";
import { getPracticeForExport } from "@/lib/export/practice-info";
import { monthOrRangeLabel } from "@/lib/date";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const formData = await req.formData();

  const caseIds = formData.getAll("caseIds").map(String);
  const fromStr = String(formData.get("from") ?? "");
  const toStr = String(formData.get("to") ?? "");
  const exportFormat = String(formData.get("format") ?? "excel");

  if (caseIds.length === 0) {
    return NextResponse.json({ error: "Bitte mindestens einen Fall auswählen." }, { status: 400 });
  }

  const from = fromStr ? new Date(fromStr) : new Date(0);
  const to = toStr ? new Date(new Date(toStr).getTime() + 24 * 60 * 60 * 1000 - 1) : new Date();

  const cases = await prisma.case.findMany({
    where: { id: { in: caseIds }, ...caseVisibilityWhere(user) },
    include: { client: true, helpType: true, assignedEmployee: true },
  });

  const sections = await Promise.all(
    cases.map(async (c) => {
      const entries = await prisma.serviceEntry.findMany({
        where: { caseId: c.id, date: { gte: from, lte: to } },
        include: { employee: true },
        orderBy: { date: "asc" },
      });
      return {
        caseInfo: {
          authority: c.authority,
          clientFirstName: c.client.firstName,
          clientLastName: c.client.lastName,
          clientStreet: c.client.street ?? c.client.address,
          clientPostalCodeCity: c.client.postalCodeCity,
          helpTypeName: c.helpType.name,
          assignedEmployeeName: c.assignedEmployee.name,
        },
        entries: entries.map((e) => ({
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
          durationMinutes: e.durationMinutes,
          description: e.description,
          employeeName: e.employee.name,
        })),
      };
    })
  );

  const periodLabel = `${format(from, "dd.MM.yyyy")} – ${format(to, "dd.MM.yyyy")}`;
  const monthLabel = monthOrRangeLabel(from, to);

  await logAccess({ userId: user.id, action: "EXPORT", entityType: "Case", details: `Sammel-Export (${exportFormat}, ${cases.length} Fälle)` });

  if (exportFormat === "pdf") {
    const practice = await getPracticeForExport();
    const pdfBuffer = await buildBulkPdf({ practice, periodLabel, monthLabel, sections });
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Sammel-Export.pdf"`,
      },
    });
  }

  const excelBuffer = await buildBulkExcel({ periodLabel, sections });
  return new NextResponse(new Uint8Array(excelBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Sammel-Export.xlsx"`,
    },
  });
}
