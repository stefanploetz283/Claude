import { requireUser, caseVisibilityWhere } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getOwnAufgaben } from "@/lib/aufgaben";
import { AufgabenListe, type AufgabeRow } from "./aufgaben-list";
import { AufgabeForm } from "./aufgabe-form";

export default async function AufgabenPage() {
  const user = await requireUser();
  const isVerwaltung = user.role === "VERWALTUNG";

  const [aufgaben, cases] = await Promise.all([
    getOwnAufgaben(user, { includeErledigt: true }),
    isVerwaltung
      ? Promise.resolve([])
      : prisma.case.findMany({
          where: { archived: false, ...caseVisibilityWhere(user) },
          include: { client: true },
          orderBy: { updatedAt: "desc" },
          take: 200,
        }),
  ]);

  const caseOptions = isVerwaltung ? null : cases.map((c) => ({ id: c.id, label: `${c.client.lastName}, ${c.client.firstName}` }));

  const rows: AufgabeRow[] = aufgaben.map((a) => ({
    id: a.id,
    titel: a.titel,
    faelligAm: a.faelligAm ? a.faelligAm.toISOString().slice(0, 10) : null,
    erledigt: a.erledigt,
    clientName: a.case ? `${a.case.client.lastName}, ${a.case.client.firstName}` : null,
  }));

  const offen = rows.filter((r) => !r.erledigt);
  const erledigt = rows.filter((r) => r.erledigt);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Aufgaben</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{offen.length} offen{offen.length === 1 ? "" : "e"} Aufgaben.</p>
      </div>

      <AufgabeForm caseOptions={caseOptions} />

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <AufgabenListe aufgaben={offen} />
      </div>

      {erledigt.length > 0 && (
        <details className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
          <summary className="cursor-pointer text-sm font-medium text-[var(--color-text-muted)]">
            {erledigt.length} erledigte Aufgabe{erledigt.length === 1 ? "" : "n"} anzeigen
          </summary>
          <div className="mt-3">
            <AufgabenListe aufgaben={erledigt} />
          </div>
        </details>
      )}
    </div>
  );
}
