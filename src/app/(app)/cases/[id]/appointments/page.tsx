import { notFound } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessCase } from "@/lib/rbac";
import { TERMINART_LABEL, terminHeading } from "@/lib/termine/labels";
import { CaseTabs } from "../case-tabs";
import { AusfallButton } from "../../../calendar/ausfall-button";
import { CaseAppointmentForm } from "./case-appointment-form";

export default async function CaseAppointmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const caseRecord = await prisma.case.findUnique({ where: { id }, include: { client: true, helpType: true } });
  if (!caseRecord) notFound();
  if (!canAccessCase(user, caseRecord)) notFound();

  const termine = await prisma.termin.findMany({
    where: { caseId: id },
    include: { employee: true, raum: true, bookedBy: true },
    orderBy: { startsAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">
          {caseRecord.client.lastName}, {caseRecord.client.firstName}
        </h1>
        <p className="mt-1 text-sm text-black/60">{caseRecord.helpType.name}</p>
      </div>

      <CaseTabs caseId={id} />

      <CaseAppointmentForm caseId={id} employeeId={caseRecord.assignedEmployeeId} defaultDate={format(new Date(), "yyyy-MM-dd")} />

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-primary-soft)] text-xs uppercase text-[var(--color-primary)]">
            <tr>
              <th className="px-4 py-2.5">Termin</th>
              <th className="px-4 py-2.5">Datum</th>
              <th className="px-4 py-2.5">Zeit</th>
              <th className="px-4 py-2.5">Raum</th>
              <th className="px-4 py-2.5">Mitarbeiterin</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {termine.map((t) => (
              <tr key={t.id} className={`border-t border-[var(--color-border)] ${t.status === "AUSGEFALLEN" ? "opacity-50" : ""}`}>
                <td className="px-4 py-2.5 text-[var(--color-text)]">
                  <div className="font-medium">{terminHeading(t)}</div>
                  {t.terminname && t.terminArt && <div className="text-xs text-[var(--color-text-muted)]">{TERMINART_LABEL[t.terminArt]}</div>}
                </td>
                <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{format(t.startsAt, "dd.MM.yyyy", { locale: de })}</td>
                <td className="px-4 py-2.5 whitespace-nowrap text-[var(--color-text-muted)]">
                  {format(t.startsAt, "HH:mm")}–{format(t.endsAt, "HH:mm")}
                </td>
                <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{t.raum?.name ?? "–"}</td>
                <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{t.employee.name}</td>
                <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{t.status === "AUSGEFALLEN" ? "Ausgefallen" : "Geplant"}</td>
                <td className="px-4 py-2.5 text-right">{t.status === "GEPLANT" && <AusfallButton terminId={t.id} />}</td>
              </tr>
            ))}
            {termine.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  Noch keine Termine für diesen Fall.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
