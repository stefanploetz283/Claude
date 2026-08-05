import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { logAccess } from "@/lib/access-log";
import { buildStundenmodellPdf } from "@/lib/export/stundenmodell-pdf";
import type { WochenplanEntry } from "@/app/(app)/admin/stundenmodell/actions";
import type { SondertagWithMeta } from "@/lib/stundenmodell";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const admin = await requireAdmin();
  const { employeeId } = await params;

  const employee = await prisma.user.findUnique({ where: { id: employeeId } });
  if (!employee || !employee.weeklyContractHours || !employee.weeklyWorkDays) {
    return NextResponse.json({ error: "Für diesen Mitarbeiter ist noch kein vollständiges Profil hinterlegt." }, { status: 400 });
  }

  const plan = await prisma.mitarbeiterPlan.findFirst({
    where: { employeeId },
    orderBy: { gueltigAb: "desc" },
    include: { sondertage: true },
  });
  if (!plan) {
    return NextResponse.json({ error: "Für diesen Mitarbeiter ist noch kein Plan gespeichert." }, { status: 400 });
  }

  const settings = await getSettings();
  const sondertage: SondertagWithMeta[] = plan.sondertage.map((s) => ({
    id: s.id,
    name: s.name,
    datum: s.datum,
    dauerStd: s.dauerStd.toNumber(),
    istEchterExtraTag: s.istEchterExtraTag,
  }));

  const pdf = await buildStundenmodellPdf({
    practiceName: settings.practiceName,
    mitarbeiterName: employee.name,
    wochenstunden: employee.weeklyContractHours.toNumber(),
    tageProWoche: employee.weeklyWorkDays,
    eintrittsdatum: employee.hireDate,
    aktuelleFondsBasis: employee.fondsBasisAtHire?.toNumber() ?? settings.aktuelleFondsBasis.toNumber(),
    gueltigAb: plan.gueltigAb,
    wochenplan: plan.wochenplan as unknown as WochenplanEntry[],
    sondertage,
  });

  await logAccess({ userId: admin.id, action: "EXPORT", entityType: "MitarbeiterPlan", entityId: plan.id });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Stundenmodell_${employee.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf"`,
    },
  });
}
