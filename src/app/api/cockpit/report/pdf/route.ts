import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { buildSteuerberaterReportPdf } from "@/lib/export/steuerberater-report";
import type { PeriodType } from "@/lib/betriebscockpit";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  const { searchParams } = req.nextUrl;

  const now = new Date();
  const type = searchParams.get("type");
  const periodType: PeriodType = type === "quarter" || type === "year" ? type : "month";
  const year = Number(searchParams.get("year")) || now.getFullYear();
  const periodIndex = Number(searchParams.get("index")) || 1;

  const pdf = await buildSteuerberaterReportPdf(periodType, year, periodIndex, now);

  await logAccess({ userId: admin.id, action: "EXPORT", entityType: "SteuerberaterReport", details: `${periodType} ${year}/${periodIndex}` });

  const dateiname = `Steuerberater-Report_${now.toISOString().slice(0, 10)}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${dateiname}"`,
    },
  });
}
