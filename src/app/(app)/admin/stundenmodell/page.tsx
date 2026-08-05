import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { computeStundenmodell, type SondertagWithMeta } from "@/lib/stundenmodell";
import { StundenmodellBoard, type EmployeeData } from "./board";
import { SondertagCatalog, type SondertagRow } from "./sondertag-catalog";
import { TeamOverview } from "./team-overview";
import type { WochenplanEntry } from "./actions";

export default async function StundenmodellPage() {
  await requireAdmin();
  const settings = await getSettings();
  const aktuelleFondsBasis = settings.aktuelleFondsBasis.toNumber();

  const [employees, sondertagTypen] = await Promise.all([
    prisma.user.findMany({ where: { role: "EMPLOYEE", active: true }, orderBy: { name: "asc" } }),
    prisma.sondertagTyp.findMany({ orderBy: { datum: "asc" } }),
  ]);

  const sondertage: SondertagRow[] = sondertagTypen.map((s) => ({
    id: s.id,
    name: s.name,
    datum: s.datum.toISOString(),
    dauerStd: s.dauerStd.toNumber(),
    istEchterExtraTag: s.istEchterExtraTag,
  }));

  const employeeData: EmployeeData[] = await Promise.all(
    employees.map(async (e) => {
      const plan = await prisma.mitarbeiterPlan.findFirst({
        where: { employeeId: e.id },
        orderBy: { gueltigAb: "desc" },
        include: { sondertage: true },
      });

      const wochenstunden = e.weeklyContractHours?.toNumber() ?? 30;
      const tageProWoche = e.weeklyWorkDays ?? 5;
      const effectiveFondsBasis = e.fondsBasisAtHire?.toNumber() ?? aktuelleFondsBasis;
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
        eintrittsdatum: e.hireDate,
        betrachtungsjahr: e.hireDate?.getUTCFullYear(),
        sondertage: sondertageForCalc,
      });

      return {
        id: e.id,
        name: e.name,
        wochenstunden: e.weeklyContractHours?.toNumber() ?? null,
        tageProWoche: e.weeklyWorkDays,
        eintrittsdatum: e.hireDate ? e.hireDate.toISOString().slice(0, 10) : null,
        fondsBasisAtHire: e.fondsBasisAtHire?.toNumber() ?? null,
        currentPlanGueltigAb: plan ? plan.gueltigAb.toISOString() : null,
        wochenplan: (plan?.wochenplan as unknown as WochenplanEntry[] | undefined) ?? [],
        sondertagIds: plan?.sondertage.map((s) => s.id) ?? [],
        ampel: result.ampel,
      };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Stundenmodell-Rechner</h1>
        <p className="mt-1 text-sm text-black/60">
          Arbeitszeitmodelle je Mitarbeiter durchspielen, als Dienstplan exportieren. Aktuelle Fonds-Basis:{" "}
          {aktuelleFondsBasis.toFixed(2)}% (unter Einstellungen änderbar).
        </p>
      </div>

      <StundenmodellBoard employees={employeeData} sondertage={sondertage} aktuelleFondsBasis={aktuelleFondsBasis} />

      <TeamOverview employees={employeeData.map((e) => ({ id: e.id, name: e.name, sondertagIds: e.sondertagIds }))} sondertage={sondertage} />

      <SondertagCatalog sondertage={sondertage} />
    </div>
  );
}
