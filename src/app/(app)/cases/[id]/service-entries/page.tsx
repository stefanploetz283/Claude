import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessCase } from "@/lib/rbac";
import { getRemainingHours, getMonthlyHours } from "@/lib/case-helpers";
import { toDateInputValue } from "@/lib/date";
import { CaseTabs } from "../case-tabs";
import { NewEntryForm } from "./entry-form";
import { EntryRow } from "./entry-row";
import { ProcessNoteForm } from "./process-note-form";
import { ApprovalForm } from "./approval-form";

const APPROVAL_STATUS_LABELS: Record<string, string> = {
  IN_BEARBEITUNG: "In Bearbeitung",
  WARTET_AUF_FREIGABE: "Wartet auf Freigabe",
  FREIGEGEBEN: "Freigegeben",
  KORREKTUR_ANGEFORDERT: "Korrektur angefordert",
};
const APPROVAL_STATUS_COLORS: Record<string, string> = {
  IN_BEARBEITUNG: "bg-[var(--color-border)] text-[var(--color-text-muted)]",
  WARTET_AUF_FREIGABE: "bg-[var(--color-warn-soft)] text-[var(--color-warn-text)]",
  FREIGEGEBEN: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
  KORREKTUR_ANGEFORDERT: "bg-[var(--color-coral)]/15 text-[var(--color-coral)]",
};

export default async function ServiceEntriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();

  const caseRecord = await prisma.case.findUnique({
    where: { id },
    include: { client: true, helpType: { include: { activityProfiles: { orderBy: { sortOrder: "asc" } } } } },
  });
  if (!caseRecord) notFound();
  if (!canAccessCase(user, caseRecord)) notFound();

  const entries = await prisma.serviceEntry.findMany({
    where: { caseId: id },
    include: { employee: true, activityProfile: true },
    orderBy: { date: "desc" },
  });

  const activityOptions = caseRecord.helpType.activityProfiles.map((p) => ({ id: p.id, label: p.activityLabel }));

  const { contingent, usedHours, remainingHours, remainingPercent } = await getRemainingHours(id, caseRecord.hoursContingent);
  const monthly = await getMonthlyHours(id);

  const now = new Date();
  const firstOfMonth = toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
  const today = toDateInputValue(now);

  const noteYear = Number(sp.pyear) || now.getFullYear();
  const noteMonth = Number(sp.pmonth) || now.getMonth() + 1;
  const processNote = await prisma.monthlyProcessNote.findUnique({
    where: { caseId_year_month: { caseId: id, year: noteYear, month: noteMonth } },
  });
  const approval = await prisma.monthlyApproval.findUnique({
    where: { caseId_year_month: { caseId: id, year: noteYear, month: noteMonth } },
    include: { reviewedBy: true },
  });
  const noteMonthLabel = format(new Date(Date.UTC(noteYear, noteMonth - 1, 1)), "MMMM yyyy", { locale: de });
  const prevNote = noteMonth === 1 ? { year: noteYear - 1, month: 12 } : { year: noteYear, month: noteMonth - 1 };
  const nextNote = noteMonth === 12 ? { year: noteYear + 1, month: 1 } : { year: noteYear, month: noteMonth + 1 };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">
          {caseRecord.client.lastName}, {caseRecord.client.firstName}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{caseRecord.helpType.name}</p>
      </div>

      <CaseTabs caseId={id} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <p className="mb-3 rounded-[var(--radius-control)] bg-[var(--color-primary-soft)] px-4 py-2.5 text-sm text-[var(--color-primary)]">
            Hier dokumentierst du die <strong>Leistungen für das Jugendamt</strong> (erscheint im Leistungsnachweis/PDF-Export). Das
            ist etwas anderes als die interne <em>Zeiterfassung</em> im Menü oben.
          </p>
          <NewEntryForm caseId={id} activityOptions={activityOptions} />

          <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-primary-soft)] text-[11px] font-bold tracking-wide text-[var(--color-primary)] uppercase">
                <tr>
                  <th className="px-5 py-3">Datum</th>
                  <th className="px-5 py-3">Zeit</th>
                  <th className="px-5 py-3">Inhalt</th>
                  <th className="px-5 py-3">Mitarbeiter</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <EntryRow
                    key={e.id}
                    caseId={id}
                    canEdit
                    activityOptions={activityOptions}
                    entry={{
                      id: e.id,
                      date: e.date.toISOString().slice(0, 10),
                      startTime: format(e.startTime, "HH:mm"),
                      endTime: format(e.endTime, "HH:mm"),
                      durationMinutes: e.durationMinutes,
                      description: e.description,
                      employeeName: e.employee.name,
                      activityLabel: e.activityProfile?.activityLabel ?? null,
                      activityProfileId: e.activityProfileId,
                    }}
                  />
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[var(--color-text-muted)]">
                      Noch keine Einträge.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className={cardCls}>
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Kapazitätsrechner</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <Row label="Bewilligt" value={`${contingent.toFixed(1)} Std.`} />
              <Row label="Dokumentiert" value={`${usedHours.toFixed(1)} Std.`} />
              <Row
                label="Verbleibend"
                value={
                  <span className={remainingPercent <= 10 ? "font-semibold text-[var(--color-coral)]" : "text-[var(--color-text)]"}>
                    {remainingHours.toFixed(1)} Std.
                  </span>
                }
              />
            </dl>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--color-primary-soft)]">
              <div
                className={`h-full rounded-full ${remainingPercent <= 10 ? "bg-[var(--color-coral)]" : "bg-[var(--color-green-medium)]"}`}
                style={{ width: `${Math.min(100, Math.max(0, (usedHours / contingent) * 100))}%` }}
              />
            </div>
          </div>

          <div className={cardCls}>
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Monatsübersicht</h2>
            <ul className="flex flex-col gap-1 text-sm">
              {monthly.map((m) => (
                <li key={m.month} className="flex justify-between border-b border-[var(--color-border)] py-1.5 last:border-0">
                  <span className="text-[var(--color-text-muted)]">{m.month}</span>
                  <span className="font-medium text-[var(--color-text)]">{m.hours.toFixed(2)} Std.</span>
                </li>
              ))}
              {monthly.length === 0 && <li className="text-[var(--color-text-muted)]">Keine Daten.</li>}
            </ul>
          </div>

          <div className={cardCls}>
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">PDF-Export für Jugendamt</h2>
            <form action={`/api/cases/${id}/export/pdf`} method="get" target="_blank" className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-xs font-medium text-[var(--color-text-muted)]">Von</span>
                <input name="from" type="date" defaultValue={firstOfMonth} className={fieldCls} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-xs font-medium text-[var(--color-text-muted)]">Bis</span>
                <input name="to" type="date" defaultValue={today} className={fieldCls} />
              </label>
              <button
                type="submit"
                className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)]"
              >
                Als PDF exportieren
              </button>
            </form>
          </div>

          <div className={cardCls}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Freigabe der Leistungsdokumentation</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${APPROVAL_STATUS_COLORS[approval?.status ?? "IN_BEARBEITUNG"]}`}
              >
                {APPROVAL_STATUS_LABELS[approval?.status ?? "IN_BEARBEITUNG"]}
              </span>
            </div>
            <div className="mb-3 flex items-center justify-between text-sm">
              <Link
                href={`?pyear=${prevNote.year}&pmonth=${prevNote.month}`}
                className="rounded-[var(--radius-control)] border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]"
              >
                ← Vormonat
              </Link>
              <span className="font-semibold text-[var(--color-text)]">{noteMonthLabel}</span>
              <Link
                href={`?pyear=${nextNote.year}&pmonth=${nextNote.month}`}
                className="rounded-[var(--radius-control)] border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]"
              >
                Folgemonat →
              </Link>
            </div>

            {approval?.status === "KORREKTUR_ANGEFORDERT" && approval.correctionNote && (
              <p className="mb-3 rounded-[var(--radius-control)] bg-[var(--color-coral)]/10 px-3.5 py-2.5 text-sm text-[var(--color-text)]">
                <strong>Korrektur von {approval.reviewedBy?.name ?? "Admin"}:</strong> {approval.correctionNote}
              </p>
            )}

            {approval?.status === "WARTET_AUF_FREIGABE" && (
              <p className="text-sm text-[var(--color-text-muted)]">
                Wartet auf Prüfung durch den Admin. Änderungen an den Einträgen sind bis zur Freigabe weiterhin möglich.
              </p>
            )}

            {approval?.status === "FREIGEGEBEN" && (
              <p className="text-sm text-[var(--color-text-muted)]">
                Freigegeben{approval.reviewedAt ? ` am ${format(approval.reviewedAt, "dd.MM.yyyy", { locale: de })}` : ""}
                {approval.reviewedBy ? ` von ${approval.reviewedBy.name}` : ""}. Bereit zur Rechnungsstellung.
              </p>
            )}

            {(!approval || approval.status === "IN_BEARBEITUNG" || approval.status === "KORREKTUR_ANGEFORDERT") && (
              <ApprovalForm caseId={id} year={noteYear} month={noteMonth} />
            )}
          </div>

          <div className={cardCls}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Prozess (für PDF-Export)</h2>
            </div>
            <div className="mb-3 flex items-center justify-between text-sm">
              <Link
                href={`?pyear=${prevNote.year}&pmonth=${prevNote.month}`}
                className="rounded-[var(--radius-control)] border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]"
              >
                ← Vormonat
              </Link>
              <span className="font-semibold text-[var(--color-text)]">{noteMonthLabel}</span>
              <Link
                href={`?pyear=${nextNote.year}&pmonth=${nextNote.month}`}
                className="rounded-[var(--radius-control)] border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]"
              >
                Folgemonat →
              </Link>
            </div>
            <ProcessNoteForm caseId={id} year={noteYear} month={noteMonth} defaultText={processNote?.text ?? ""} />
          </div>
        </div>
      </div>
    </div>
  );
}

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";
const fieldCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)]";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd className="text-right text-[var(--color-text)]">{value}</dd>
    </div>
  );
}
