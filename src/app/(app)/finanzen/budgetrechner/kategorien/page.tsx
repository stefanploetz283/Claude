import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getBudgetJahre } from "@/lib/budgetrechner/calc";
import { BudgetrechnerNav } from "../budgetrechner-nav";
import { KategorieVerwaltung, type KategorieRow } from "../kategorie-verwaltung";
import { ExcelImport } from "../excel-import";
import { filterFieldCls, buttonSecondaryCls } from "@/app/(app)/cases/case-ui";

export default async function BudgetKategorienPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdminOrVerwaltung();
  const params = await searchParams;
  const now = new Date();

  const jahre = await getBudgetJahre(now);
  const jahr = Number(params.jahr) && jahre.includes(Number(params.jahr)) ? Number(params.jahr) : jahre[0];

  const kategorien = await prisma.budgetKategorie.findMany({
    where: { jahr },
    orderBy: { name: "asc" },
    include: { _count: { select: { ausgaben: true } } },
  });

  const rows: KategorieRow[] = kategorien.map((k) => ({
    id: k.id,
    name: k.name,
    jahr: k.jahr,
    jahresbudget: k.jahresbudget.toNumber(),
    quelle: k.quelle,
    stichwoerter: k.stichwoerter,
    anzahlAusgaben: k._count.ausgaben,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Budget-Positionen</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Manuell anlegen oder aus der Entgeltkalkulation importieren.</p>
        </div>
        <form method="get" className="flex items-center gap-2 text-sm">
          <label className="text-[var(--color-text-muted)]" htmlFor="jahr">
            Budgetjahr
          </label>
          <select id="jahr" name="jahr" defaultValue={jahr} className={filterFieldCls}>
            {jahre.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
          <button type="submit" className={buttonSecondaryCls}>
            Anzeigen
          </button>
        </form>
      </div>

      <BudgetrechnerNav />

      <KategorieVerwaltung jahr={jahr} kategorien={rows} />
      <ExcelImport jahr={jahr} />
    </div>
  );
}
