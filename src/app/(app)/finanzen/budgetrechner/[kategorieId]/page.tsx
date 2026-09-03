import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { jahrBounds, ampelVerbrauch } from "@/lib/budgetrechner/calc";
import { AMPEL_STYLE, QUELLE_AUSGABE_LABEL, QUELLE_KATEGORIE_LABEL, eur, prozentText } from "@/lib/budgetrechner/labels";

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";

export default async function BudgetKategorieDetail({ params }: { params: Promise<{ kategorieId: string }> }) {
  await requireAdminOrVerwaltung();
  const { kategorieId } = await params;

  const kategorie = await prisma.budgetKategorie.findUnique({ where: { id: kategorieId } });
  if (!kategorie) notFound();

  const { from, to } = jahrBounds(kategorie.jahr);
  const ausgaben = await prisma.budgetAusgabe.findMany({
    where: { kategorieId, datum: { gte: from, lte: to } },
    orderBy: { datum: "desc" },
  });

  const relevant = ausgaben.filter((a) => a.reKoBudgetRelevant);
  const nichtRelevant = ausgaben.filter((a) => !a.reKoBudgetRelevant);
  const jahresbudget = kategorie.jahresbudget.toNumber();
  const verbraucht = relevant.reduce((s, a) => s + a.betrag.toNumber(), 0);
  const prozent = jahresbudget > 0 ? (verbraucht / jahresbudget) * 100 : 0;
  const style = AMPEL_STYLE[ampelVerbrauch(prozent)];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/finanzen/budgetrechner?jahr=${kategorie.jahr}`} className="text-sm font-medium text-[var(--color-primary)] hover:underline">
          ← Zurück zum Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-primary)]">{kategorie.name}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Budgetjahr {kategorie.jahr} · {QUELLE_KATEGORIE_LABEL[kategorie.quelle] ?? kategorie.quelle}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className={cardCls}>
          <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">Jahresbudget</p>
          <p className="text-xl font-bold text-[var(--color-text)]">{eur(jahresbudget)}</p>
        </div>
        <div className={cardCls}>
          <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">Verbraucht</p>
          <p className="text-xl font-bold text-[var(--color-text)]">{eur(verbraucht)}</p>
        </div>
        <div className={cardCls}>
          <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">Rest</p>
          <p className={`text-xl font-bold ${jahresbudget - verbraucht < 0 ? "text-[var(--color-coral)]" : "text-[var(--color-text)]"}`}>
            {eur(jahresbudget - verbraucht)}
          </p>
        </div>
        <div className={cardCls}>
          <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">Auslastung</p>
          <span className="inline-block rounded-full px-2.5 py-1 text-sm font-bold" style={{ background: style.bg, color: style.text }}>
            {prozentText(prozent)}
          </span>
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Ausgaben ({relevant.length})</h2>
        {relevant.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Noch keine budgetrelevanten Ausgaben zugeordnet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
                <tr>
                  <th className="py-2 pr-3">Datum</th>
                  <th className="py-2 pr-3">Beschreibung</th>
                  <th className="py-2 pr-3">Herkunft</th>
                  <th className="py-2 pr-3 text-right">Betrag</th>
                </tr>
              </thead>
              <tbody>
                {relevant.map((a) => (
                  <tr key={a.id} className="border-t border-[var(--color-border)]">
                    <td className="py-2 pr-3 whitespace-nowrap text-[var(--color-text-muted)]">{a.datum.toLocaleDateString("de-DE")}</td>
                    <td className="py-2 pr-3 text-[var(--color-text)]">{a.beschreibung}</td>
                    <td className="py-2 pr-3 text-xs text-[var(--color-text-muted)]">{QUELLE_AUSGABE_LABEL[a.quelle] ?? a.quelle}</td>
                    <td className="py-2 pr-3 text-right font-semibold text-[var(--color-text)]">{eur(a.betrag.toNumber())}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {nichtRelevant.length > 0 && (
        <div className={cardCls}>
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Nicht ReKo-budgetrelevant ({nichtRelevant.length})</h2>
          <p className="mb-3 text-xs text-[var(--color-text-muted)]">
            Dieser Position zugeordnet, zählt aber nicht gegen das Budget (z.B. privat getragen, nur steuerlich relevant).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <tbody>
                {nichtRelevant.map((a) => (
                  <tr key={a.id} className="border-t border-[var(--color-border)]">
                    <td className="py-2 pr-3 whitespace-nowrap text-[var(--color-text-muted)]">{a.datum.toLocaleDateString("de-DE")}</td>
                    <td className="py-2 pr-3 text-[var(--color-text)]">{a.beschreibung}</td>
                    <td className="py-2 pr-3 text-right text-[var(--color-text-muted)]">{eur(a.betrag.toNumber())}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-sm text-[var(--color-text-muted)]">
        Ausgaben bearbeiten oder Position wechseln:{" "}
        <Link href="/finanzen/budgetrechner/ausgaben" className="font-medium text-[var(--color-primary)] hover:underline">
          Ausgaben erfassen
        </Link>
      </p>
    </div>
  );
}
