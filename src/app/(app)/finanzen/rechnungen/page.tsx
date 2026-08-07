import { format } from "date-fns";
import { de } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { monthDateRange, monthDateInputRange } from "@/lib/date";
import { HourlyRateForm } from "./hourly-rate-form";

export default async function RechnungenPage() {
  await requireAdminOrVerwaltung();

  const [settings, approvals] = await Promise.all([
    prisma.settings.findUnique({ where: { id: "singleton" } }),
    prisma.monthlyApproval.findMany({
      where: { status: "FREIGEGEBEN" },
      include: { case: { include: { client: true, helpType: true, assignedEmployee: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
  ]);

  const cards = await Promise.all(
    approvals.map(async (a) => {
      const { from, to } = monthDateRange(a.year, a.month);
      const [totalMinutes, invoice] = await Promise.all([
        prisma.serviceEntry.aggregate({
          where: { caseId: a.caseId, date: { gte: from, lte: to } },
          _sum: { durationMinutes: true },
        }),
        prisma.invoice.findUnique({
          where: { caseId_periodFrom_periodTo: { caseId: a.caseId, periodFrom: from, periodTo: to } },
        }),
      ]);

      const { fromStr, toStr } = monthDateInputRange(a.year, a.month);

      return {
        approvalId: a.id,
        caseId: a.caseId,
        fromStr,
        toStr,
        monthLabel: format(new Date(Date.UTC(a.year, a.month - 1, 1)), "MMMM yyyy", { locale: de }),
        clientName: `${a.case.client.lastName}, ${a.case.client.firstName}`,
        helpTypeName: a.case.helpType.name,
        employeeName: a.case.assignedEmployee.name,
        totalHours: (totalMinutes._sum.durationMinutes ?? 0) / 60,
        invoiceNumber: invoice?.number ?? null,
        invoiceIssuedAt: invoice ? format(invoice.issuedAt, "dd.MM.yyyy", { locale: de }) : null,
      };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Rechnungen</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Nur freigegebene Zeiträume sind hier zur Rechnungsstellung sichtbar.
        </p>
      </div>

      <div className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Stundensatz</h2>
        <HourlyRateForm currentRate={settings?.hourlyRate?.toString() ?? ""} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <div key={c.approvalId} className={cardCls}>
            <h3 className="text-sm font-semibold text-[var(--color-text)]">{c.clientName}</h3>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              {c.helpTypeName} · {c.employeeName}
            </p>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">{c.monthLabel}</span>
              <span className="font-semibold text-[var(--color-text)]">{c.totalHours.toFixed(2)} Std.</span>
            </div>
            <div className="mt-1 mb-3">
              <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
                bereit zur Rechnungsstellung
              </span>
            </div>

            {c.invoiceNumber ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Rechnung {c.invoiceNumber} bereits erstellt am {c.invoiceIssuedAt}.
                </p>
                <a
                  href={`/api/cases/${c.caseId}/invoice/pdf?from=${c.fromStr}&to=${c.toStr}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-[var(--radius-control)] border border-[var(--color-primary)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white"
                >
                  PDF erneut öffnen
                </a>
              </div>
            ) : (
              <a
                href={`/api/cases/${c.caseId}/invoice/pdf?from=${c.fromStr}&to=${c.toStr}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)]"
              >
                Rechnung als PDF erstellen
              </a>
            )}
          </div>
        ))}
        {cards.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">
            Aktuell keine freigegebenen Zeiträume. Freigaben erfolgen unter „Freigaben&quot; nach Prüfung der Leistungsdokumentation.
          </p>
        )}
      </div>
    </div>
  );
}

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";
