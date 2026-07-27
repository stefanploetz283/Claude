import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { getOrCreateInvoicePdf } from "@/lib/export/invoice";
import { format } from "date-fns";

// Rechnungsstellung ist Admin/Verwaltung vorbehalten - unabhängig davon, wem der Fall zugewiesen ist
// (eine Fachkraft darf auch für eigene Fälle keine Rechnung erstellen, siehe Rollen-/Berechtigungssystem).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "VERWALTUNG") {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  }

  const caseRecord = await prisma.case.findUnique({ where: { id }, include: { client: true } });
  if (!caseRecord) return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  if (!fromStr || !toStr) return NextResponse.json({ error: "Zeitraum fehlt" }, { status: 400 });

  const periodFrom = new Date(fromStr);
  const periodTo = new Date(new Date(toStr).getTime() + 24 * 60 * 60 * 1000 - 1);

  const result = await getOrCreateInvoicePdf({ caseId: id, periodFrom, periodTo, issuedById: user.id });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  await logAccess({ userId: user.id, action: "EXPORT", entityType: "Case", entityId: id, details: `Rechnung ${result.number}` });

  const filenameSafe = `${caseRecord.client.lastName}_${caseRecord.client.firstName}_${format(periodFrom, "yyyy-MM")}`.replace(
    /[^a-zA-Z0-9_-]/g,
    "_"
  );

  return new NextResponse(new Uint8Array(result.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Rechnung_${filenameSafe}.pdf"`,
    },
  });
}
