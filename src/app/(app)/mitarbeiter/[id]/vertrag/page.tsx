import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { computeStundenmodell, type SondertagWithMeta, type SondertagRow } from "@/lib/stundenmodell";
import { VertragEditor, type VertragEmployee } from "./vertrag-editor";
import type { WochenplanEntry } from "./actions";

export default async function VertragPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const settings = await getSettings();
  const aktuelleFondsBasis = settings.aktuelleFondsBasis.toNumber();

  const [employee, sondertagTypen, helpTypes] = await Promise.all([
    prisma.user.findUnique({ where: { id }, include: { allowedHelpTypes: true } }),
    prisma.sondertagTyp.findMany({ orderBy: { datum: "asc" } }),
    prisma.helpType.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
  ]);
  if (!employee) notFound();

  const plan = await prisma.mitarbeiterPlan.findFirst({
    where: { employeeId: id },
    orderBy: { gueltigAb: "desc" },
    include: { sondertage: true },
  });

  const sondertage: SondertagRow[] = sondertagTypen.map((s) => ({
    id: s.id,
    name: s.name,
    datum: s.datum.toISOString(),
    dauerStd: s.dauerStd.toNumber(),
    istEchterExtraTag: s.istEchterExtraTag,
  }));

  const wochenstunden = employee.weeklyContractHours?.toNumber() ?? 30;
  const tageProWoche = employee.weeklyWorkDays ?? 5;
  const effectiveFondsBasis = employee.fondsBasisAtHire?.toNumber() ?? aktuelleFondsBasis;
  const sondertageForCalc: SondertagWithMeta[] = (plan?.sondertage ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    datum: s.datum,
    dauerStd: s.dauerStd.toNumber(),
    istEchterExtraTag: s.istEchterExtraTag,
  }));
  const result = computeStundenmodell({
    wochenstunden,
    tageProWoche,
    aktuelleFondsBasis: effectiveFondsBasis,
    eintrittsdatum: employee.hireDate,
    betrachtungsjahr: employee.hireDate?.getUTCFullYear(),
    sondertage: sondertageForCalc,
  });

  const employeeData: VertragEmployee = {
    id: employee.id,
    name: employee.name,
    wochenstunden: employee.weeklyContractHours?.toNumber() ?? null,
    tageProWoche: employee.weeklyWorkDays,
    eintrittsdatum: employee.hireDate ? employee.hireDate.toISOString().slice(0, 10) : null,
    fondsBasisAtHire: employee.fondsBasisAtHire?.toNumber() ?? null,
    tvoedStufe: employee.tvoedStufe,
    allowedHelpTypeIds: employee.allowedHelpTypes.map((h) => h.id),
    currentPlanGueltigAb: plan ? plan.gueltigAb.toISOString() : null,
    wochenplan: (plan?.wochenplan as unknown as WochenplanEntry[] | undefined) ?? [],
    sondertagIds: plan?.sondertage.map((s) => s.id) ?? [],
    ampel: result.ampel,
  };

  return (
    <VertragEditor
      employee={employeeData}
      sondertage={sondertage}
      helpTypes={helpTypes.map((h) => ({ id: h.id, name: h.name }))}
      aktuelleFondsBasis={aktuelleFondsBasis}
    />
  );
}
