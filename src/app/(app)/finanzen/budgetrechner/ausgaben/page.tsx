import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { BudgetrechnerNav } from "../budgetrechner-nav";
import { AusgabeErfassung, type AusgabeRow, type KategorieOption } from "../ausgabe-erfassung";
import { FinomCsvImport } from "../finom-csv-import";

export default async function BudgetAusgabenPage() {
  await requireAdminOrVerwaltung();

  const [kategorien, ausgaben] = await Promise.all([
    prisma.budgetKategorie.findMany({ orderBy: [{ jahr: "desc" }, { name: "asc" }] }),
    prisma.budgetAusgabe.findMany({ orderBy: [{ datum: "desc" }, { createdAt: "desc" }], take: 100, include: { kategorie: true } }),
  ]);

  const kategorieOptions: KategorieOption[] = kategorien.map((k) => ({ id: k.id, name: k.name, jahr: k.jahr }));
  const ausgabeRows: AusgabeRow[] = ausgaben.map((a) => ({
    id: a.id,
    betrag: a.betrag.toNumber(),
    datum: a.datum.toISOString().slice(0, 10),
    beschreibung: a.beschreibung,
    quelle: a.quelle,
    reKoBudgetRelevant: a.reKoBudgetRelevant,
    kategorieId: a.kategorieId,
    kategorieName: a.kategorie?.name ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Ausgaben erfassen</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Manuell oder per monatlichem Finom-CSV-Import.</p>
      </div>

      <BudgetrechnerNav />

      <AusgabeErfassung kategorien={kategorieOptions} ausgaben={ausgabeRows} />
      <FinomCsvImport />
    </div>
  );
}
