import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessCase } from "@/lib/rbac";
import { getRemainingHours, getMonthlyHours } from "@/lib/case-helpers";
import { CaseTabs } from "../case-tabs";
import { NewEntryForm } from "./entry-form";
import { EntryRow } from "./entry-row";

export default async function ServiceEntriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const caseRecord = await prisma.case.findUnique({ where: { id }, include: { client: true } });
  if (!caseRecord) notFound();
  if (!canAccessCase(user, caseRecord)) notFound();

  const entries = await prisma.serviceEntry.findMany({
    where: { caseId: id },
    include: { employee: true },
    orderBy: { date: "desc" },
  });

  const { contingent, usedHours, remainingHours, remainingPercent } = await getRemainingHours(id, caseRecord.hoursContingent);
  const monthly = await getMonthlyHours(id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">
          {caseRecord.client.lastName}, {caseRecord.client.firstName}
        </h1>
        <p className="mt-1 text-sm text-black/60">{caseRecord.caseNumber}</p>
      </div>

      <CaseTabs caseId={id} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <NewEntryForm caseId={id} />

          <div className="mt-4 overflow-x-auto rounded-lg border border-black/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/5 text-xs uppercase text-black/50">
                <tr>
                  <th className="px-4 py-2">Datum</th>
                  <th className="px-4 py-2">Zeit</th>
                  <th className="px-4 py-2">Inhalt</th>
                  <th className="px-4 py-2">Mitarbeiter</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <EntryRow
                    key={e.id}
                    caseId={id}
                    canEdit
                    entry={{
                      id: e.id,
                      date: e.date.toISOString().slice(0, 10),
                      startTime: format(e.startTime, "HH:mm"),
                      endTime: format(e.endTime, "HH:mm"),
                      durationMinutes: e.durationMinutes,
                      description: e.description,
                      employeeName: e.employee.name,
                    }}
                  />
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-black/40">
                      Noch keine Einträge.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-black/10 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Kapazitätsrechner</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <Row label="Bewilligt" value={`${contingent.toFixed(1)} Std.`} />
              <Row label="Dokumentiert" value={`${usedHours.toFixed(1)} Std.`} />
              <Row
                label="Verbleibend"
                value={
                  <span className={remainingPercent <= 10 ? "font-semibold text-[var(--color-danger)]" : ""}>
                    {remainingHours.toFixed(1)} Std.
                  </span>
                }
              />
            </dl>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/10">
              <div
                className={`h-full ${remainingPercent <= 10 ? "bg-[var(--color-danger)]" : "bg-[var(--color-primary)]"}`}
                style={{ width: `${Math.min(100, Math.max(0, (usedHours / contingent) * 100))}%` }}
              />
            </div>
          </div>

          <div className="rounded-lg border border-black/10 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Monatsübersicht</h2>
            <ul className="flex flex-col gap-1 text-sm">
              {monthly.map((m) => (
                <li key={m.month} className="flex justify-between border-b border-black/5 py-1 last:border-0">
                  <span className="text-black/60">{m.month}</span>
                  <span>{m.hours.toFixed(2)} Std.</span>
                </li>
              ))}
              {monthly.length === 0 && <li className="text-black/40">Keine Daten.</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-black/50">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
