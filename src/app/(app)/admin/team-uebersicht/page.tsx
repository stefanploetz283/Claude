import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import type { SondertagRow } from "@/lib/stundenmodell";
import { TeamOverview } from "./team-overview";
import { SondertagCatalog } from "./sondertag-catalog";

export default async function TeamUebersichtPage() {
  await requireAdmin();

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

  const employeeRows = await Promise.all(
    employees.map(async (e) => {
      const plan = await prisma.mitarbeiterPlan.findFirst({
        where: { employeeId: e.id },
        orderBy: { gueltigAb: "desc" },
        include: { sondertage: { select: { id: true } } },
      });
      return { id: e.id, name: e.name, sondertagIds: plan?.sondertage.map((s) => s.id) ?? [] };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Team-Gesamtansicht</h1>
        <p className="mt-1 text-sm text-black/60">Sondertage aller Fachkräfte im Überblick, um Kollisionen zu erkennen.</p>
      </div>

      <TeamOverview employees={employeeRows} sondertage={sondertage} />
      <SondertagCatalog sondertage={sondertage} />
    </div>
  );
}
