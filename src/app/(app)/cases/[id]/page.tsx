import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessCase } from "@/lib/rbac";
import { getRemainingHours } from "@/lib/case-helpers";
import { logAccess } from "@/lib/access-log";
import { CaseTabs } from "./case-tabs";
import { StatusForm } from "./status-form";
import { ArchiveCaseButton } from "./archive-button";
import { differenceInCalendarDays, format } from "date-fns";
import { de } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = { ACTIVE: "Aktiv", PAUSED: "Pausiert", COMPLETED: "Abgeschlossen" };

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const caseRecord = await prisma.case.findUnique({
    where: { id },
    include: {
      client: true,
      helpType: true,
      assignedEmployee: true,
      substituteEmployee: true,
      statusHistory: { include: { changedBy: true }, orderBy: { changedAt: "desc" } },
    },
  });

  if (!caseRecord) notFound();
  if (!canAccessCase(user, caseRecord)) notFound();

  await logAccess({ userId: user.id, action: "VIEW", entityType: "Case", entityId: caseRecord.id });

  const { contingent, usedHours, remainingHours, remainingPercent } = await getRemainingHours(
    caseRecord.id,
    caseRecord.hoursContingent
  );

  const now = new Date();
  const deadlineWarnings: { label: string; date: Date }[] = [];
  if (caseRecord.helpPlanMeetingDate) {
    const days = differenceInCalendarDays(caseRecord.helpPlanMeetingDate, now);
    if (days <= caseRecord.reminderLeadDays) deadlineWarnings.push({ label: "Hilfeplangespräch", date: caseRecord.helpPlanMeetingDate });
  }
  if (caseRecord.extensionDeadline) {
    const days = differenceInCalendarDays(caseRecord.extensionDeadline, now);
    if (days <= caseRecord.reminderLeadDays) deadlineWarnings.push({ label: "Verlängerungsantrag fällig", date: caseRecord.extensionDeadline });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">
          {caseRecord.client.lastName}, {caseRecord.client.firstName}
        </h1>
        <p className="mt-1 text-sm text-black/60">
          {caseRecord.caseNumber} · {caseRecord.helpType.name} · {caseRecord.authority}
        </p>
      </div>

      <CaseTabs caseId={caseRecord.id} />

      {deadlineWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {deadlineWarnings.map((w) => (
            <div key={w.label}>
              ⚠ {w.label}: {format(w.date, "dd.MM.yyyy", { locale: de })}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-black/10 bg-white p-5 lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Klient</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <Row label="Geburtsdatum" value={caseRecord.client.birthDate ? format(caseRecord.client.birthDate, "dd.MM.yyyy") : "–"} />
            <Row label="Adresse" value={caseRecord.client.address ?? "–"} />
            <Row label="Kontakt" value={caseRecord.client.contactInfo ?? "–"} />
          </dl>
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-5 lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Zuständigkeit</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <Row label="Zuständiger Mitarbeiter" value={caseRecord.assignedEmployee.name} />
            <Row label="Vertretung" value={caseRecord.substituteEmployee?.name ?? "Keine"} />
            <Row label="Startdatum" value={format(caseRecord.startDate, "dd.MM.yyyy")} />
            <Row label="Status" value={STATUS_LABELS[caseRecord.status]} />
          </dl>
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-5 lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Kapazität</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <Row label="Bewilligtes Kontingent" value={`${contingent.toFixed(1)} Std.`} />
            <Row label="Dokumentiert" value={`${usedHours.toFixed(1)} Std.`} />
            <Row
              label="Verbleibend"
              value={
                <span className={remainingPercent <= 10 ? "font-semibold text-[var(--color-danger)]" : ""}>
                  {remainingHours.toFixed(1)} Std. ({remainingPercent.toFixed(0)} %)
                </span>
              }
            />
          </dl>
        </div>
      </div>

      <div className="rounded-lg border border-black/10 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Status ändern</h2>
        <StatusForm caseId={caseRecord.id} currentStatus={caseRecord.status} />
      </div>

      <div className="rounded-lg border border-black/10 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Statushistorie</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {caseRecord.statusHistory.map((h) => (
            <li key={h.id} className="border-b border-black/5 pb-2 last:border-0">
              <span className="font-medium">{STATUS_LABELS[h.newStatus]}</span>{" "}
              <span className="text-black/50">
                – {format(h.changedAt, "dd.MM.yyyy HH:mm", { locale: de })} von {h.changedBy.name}
              </span>
              {h.reason && <div className="text-black/60">Grund: {h.reason}</div>}
            </li>
          ))}
        </ul>
      </div>

      {user.role === "ADMIN" && (
        <div className="rounded-lg border border-black/10 bg-white p-5">
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Fall archivieren</h2>
          <p className="mb-3 text-sm text-black/60">
            Archivierte Fälle werden aus den aktiven Übersichten ausgeblendet, aber aus Aufbewahrungspflichten nicht gelöscht.
          </p>
          <ArchiveCaseButton caseId={caseRecord.id} />
        </div>
      )}
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
