import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { requireInterimAdmin } from "@/lib/rbac";

const ANGEBOTSART_LABELS: Record<string, string> = {
  ERZIEHUNGSBEISTANDSCHAFT: "Erziehungsbeistandschaft",
  PROS: "PROS",
};

type MonthBucket = { key: string; label: string; hours: number };
type CaseHours = { total: number; months: MonthBucket[] };

export default async function InterimPage() {
  await requireInterimAdmin();

  const cases = await prisma.interimCase.findMany({
    where: { archived: false },
    orderBy: [{ familienname: "asc" }, { vorname: "asc" }],
  });

  const entries = await prisma.interimEntry.findMany({
    where: { case: { archived: false } },
    select: { caseId: true, date: true, startTime: true, endTime: true },
  });

  const hoursByCase = new Map<string, { total: number; months: Map<string, MonthBucket> }>();
  let grandTotal = 0;
  for (const e of entries) {
    const hours = (e.endTime.getTime() - e.startTime.getTime()) / 3600000;
    grandTotal += hours;

    const bucket = hoursByCase.get(e.caseId) ?? { total: 0, months: new Map<string, MonthBucket>() };
    bucket.total += hours;
    const monthKey = format(e.date, "yyyy-MM");
    const month = bucket.months.get(monthKey) ?? { key: monthKey, label: format(e.date, "MMMM", { locale: de }), hours: 0 };
    month.hours += hours;
    bucket.months.set(monthKey, month);
    hoursByCase.set(e.caseId, bucket);
  }

  const caseHours = new Map<string, CaseHours>();
  for (const [caseId, bucket] of hoursByCase) {
    caseHours.set(caseId, {
      total: bucket.total,
      months: Array.from(bucket.months.values()).sort((a, b) => a.key.localeCompare(b.key)),
    });
  }

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

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <p className="text-xs font-medium text-[var(--color-text-muted)]">Dokumentierte Stunden gesamt (alle Fälle)</p>
        <p className="mt-1 text-3xl font-bold text-[var(--color-primary)]">{grandTotal.toFixed(2)} Std.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cases.map((c) => {
          const hours = caseHours.get(c.id);
          return (
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

              <div className="mt-3 border-t border-[var(--color-border)] pt-2.5">
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {(hours?.total ?? 0).toFixed(2)} Std. dokumentiert
                </p>
                {hours && hours.months.length > 0 && (
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    {hours.months.map((m) => `${m.label}: ${m.hours.toFixed(2)} Std.`).join(" · ")}
                  </p>
                )}
                {!hours && <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Noch keine Einträge.</p>}
              </div>

              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                Angelegt am {format(c.createdAt, "dd.MM.yyyy", { locale: de })}
              </p>
            </Link>
          );
        })}
        {cases.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">Noch keine Fälle im Interimsmodus angelegt.</p>
        )}
      </div>
    </div>
  );
}
