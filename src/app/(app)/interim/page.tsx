import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { requireInterimAdmin } from "@/lib/rbac";

const ANGEBOTSART_LABELS: Record<string, string> = {
  ERZIEHUNGSBEISTANDSCHAFT: "Erziehungsbeistandschaft",
  PROS: "PROS",
};

export default async function InterimPage() {
  await requireInterimAdmin();

  const cases = await prisma.interimCase.findMany({
    where: { archived: false },
    orderBy: [{ familienname: "asc" }, { vorname: "asc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Interimsmodus</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Übergangslösung bis zur Praxiseröffnung am 1.11. — technisch getrennt vom künftigen Fallsystem.
          </p>
        </div>
        <Link
          href="/interim/new"
          className="rounded-[var(--radius-control)] bg-[var(--color-gold)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90"
        >
          + Neuen Fall anlegen
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cases.map((c) => (
          <Link
            key={c.id}
            href={`/interim/${c.id}`}
            className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="mb-2 inline-block rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
              {ANGEBOTSART_LABELS[c.angebotsart]}
            </span>
            <h3 className="text-sm font-semibold text-[var(--color-text)]">
              {c.familienname}, {c.vorname}
            </h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{c.plzOrt}</p>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              Angelegt am {format(c.createdAt, "dd.MM.yyyy", { locale: de })}
            </p>
          </Link>
        ))}
        {cases.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">Noch keine Fälle im Interimsmodus angelegt.</p>
        )}
      </div>
    </div>
  );
}
