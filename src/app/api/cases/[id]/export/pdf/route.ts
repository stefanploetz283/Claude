import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessCase } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { logAccess } from "@/lib/access-log";
import { buildCaseServicePdf } from "@/lib/export/case-pdf";
import { format } from "date-fns";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const caseRecord = await prisma.case.findUnique({ where: { id }, include: { client: true, helpType: true } });
  if (!caseRecord) return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
  if (!canAccessCase(user, caseRecord)) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const from = fromStr ? new Date(fromStr) : caseRecord.startDate;
  const to = toStr ? new Date(new Date(toStr).getTime() + 24 * 60 * 60 * 1000 - 1) : new Date();

  const entries = await prisma.serviceEntry.findMany({
    where: { caseId: id, date: { gte: from, lte: to } },
    include: { employee: true },
    orderBy: { date: "asc" },
  });

  const settings = await getSettings();

  const pdfBuffer = await buildCaseServicePdf({
    caseInfo: {
      caseNumber: caseRecord.caseNumber,
      authority: caseRecord.authority,
      clientName: `${caseRecord.client.lastName}, ${caseRecord.client.firstName}`,
      helpTypeName: caseRecord.helpType.name,
    },
    entries: entries.map((e) => ({
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      durationMinutes: e.durationMinutes,
      description: e.description,
      employeeName: e.employee.name,
    })),
    periodLabel: `${format(from, "dd.MM.yyyy")} – ${format(to, "dd.MM.yyyy")}`,
    practiceName: settings.practiceName,
  });

  await logAccess({ userId: user.id, action: "EXPORT", entityType: "Case", entityId: id, details: "PDF-Leistungsnachweis" });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Leistungsnachweis_${caseRecord.caseNumber}.pdf"`,
    },
  });
}
