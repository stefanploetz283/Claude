import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { buildBudgetrechnerReportPdf } from "@/lib/export/budgetrechner-report";

/** GET /api/budgetrechner/report/pdf?jahr=&von=&bis=
 *  Budget-Ist-Vergleich (jahresbezogen) + Liste nicht eingeplanter Kosten (Zeitraum von/bis).
 *  Default-Zeitraum: 1.1. des Jahres bis heute ("Jahr bis heute"). */
export async function GET(req: NextRequest) {
  const user = await requireAdminOrVerwaltung();
  const { searchParams } = req.nextUrl;

  const now = new Date();
  const jahr = Number(searchParams.get("jahr")) || now.getFullYear();

  const vonParam = searchParams.get("von");
  const bisParam = searchParams.get("bis");
  const von = vonParam ? new Date(`${vonParam}T00:00:00.000Z`) : new Date(Date.UTC(jahr, 0, 1));
  const bis = bisParam ? new Date(`${bisParam}T23:59:59.999Z`) : now;

  if (Number.isNaN(von.getTime()) || Number.isNaN(bis.getTime())) {
    return NextResponse.json({ error: "Ungültiger Zeitraum." }, { status: 400 });
  }

  const pdf = await buildBudgetrechnerReportPdf(jahr, von, bis, now);

  await logAccess({ userId: user.id, action: "EXPORT", entityType: "BudgetrechnerReport", details: `Jahr ${jahr}` });

  const dateiname = `Budgetrechner_${jahr}_${now.toISOString().slice(0, 10)}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${dateiname}"`,
    },
  });
}
