import { prisma } from "@/lib/prisma";
import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { toDateInputValue } from "@/lib/date";
import { HourlyRateForm } from "./hourly-rate-form";

export default async function RechnungenPage() {
  await requireAdminOrVerwaltung();

  const [settings, cases] = await Promise.all([
    prisma.settings.findUnique({ where: { id: "singleton" } }),
    prisma.case.findMany({
      where: { archived: false, status: { not: "COMPLETED" } },
      include: { client: true, helpType: true },
      orderBy: [{ client: { lastName: "asc" } }, { client: { firstName: "asc" } }],
    }),
  ]);

  const now = new Date();
  const firstOfMonth = toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
  const today = toDateInputValue(now);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Rechnungen</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Rechnungen für Kostenträger erstellen, basierend auf den dokumentierten Stunden je Fall und Zeitraum.
        </p>
      </div>

      <div className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Stundensatz</h2>
        <HourlyRateForm currentRate={settings?.hourlyRate?.toString() ?? ""} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cases.map((c) => (
          <div key={c.id} className={cardCls}>
            <h3 className="text-sm font-semibold text-[var(--color-text)]">
              {c.client.lastName}, {c.client.firstName}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{c.helpType.name}</p>
            <form action={`/api/cases/${c.id}/invoice/pdf`} method="get" target="_blank" className="mt-3 flex flex-col gap-2.5">
              <div className="flex gap-2">
                <label className="flex flex-1 flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">Von</span>
                  <input name="from" type="date" defaultValue={firstOfMonth} className={fieldCls} />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">Bis</span>
                  <input name="to" type="date" defaultValue={today} className={fieldCls} />
                </label>
              </div>
              <button
                type="submit"
                className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)]"
              >
                Rechnung als PDF erstellen
              </button>
            </form>
          </div>
        ))}
        {cases.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Keine aktiven Fälle vorhanden.</p>}
      </div>
    </div>
  );
}

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";
const fieldCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]";
