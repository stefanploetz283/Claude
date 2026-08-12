import { NextRequest, NextResponse } from "next/server";
import { requireInterimAdmin } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { buildInterimMonthlyExcel } from "@/lib/interim/excel-export";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireInterimAdmin();

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Ungültiger Zeitraum." }, { status: 400 });
  }

  const result = await buildInterimMonthlyExcel(id, year, month);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAccess({ userId: user.id, action: "EXPORT", entityType: "InterimCase", entityId: id, details: `Monatsabrechnung ${month}/${year}` });

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      // Export-URL bleibt bei gleichem Fall/Monat identisch, obwohl sich die zugrunde liegenden Daten
      // (neue Diktate) ändern können - ohne dieses Header könnte Browser eine alte Antwort erneut ausliefern.
      "Cache-Control": "no-store",
    },
  });
}
