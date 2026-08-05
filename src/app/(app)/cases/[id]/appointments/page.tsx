import { notFound } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessCase } from "@/lib/rbac";
import { CaseTabs } from "../case-tabs";
import { DeleteAppointmentButton } from "../../../calendar/delete-button";
import { CaseAppointmentForm } from "./case-appointment-form";

export default async function CaseAppointmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const caseRecord = await prisma.case.findUnique({ where: { id }, include: { client: true, helpType: true } });
  if (!caseRecord) notFound();
  if (!canAccessCase(user, caseRecord)) notFound();

  const appointments = await prisma.appointment.findMany({
    where: { caseId: id },
    include: { organizer: true },
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

      <CaseAppointmentForm caseId={id} defaultDate={format(new Date(), "yyyy-MM-dd")} />

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-primary-soft)] text-xs uppercase text-[var(--color-primary)]">
            <tr>
              <th className="px-4 py-2.5">Titel</th>
              <th className="px-4 py-2.5">Datum</th>
              <th className="px-4 py-2.5">Zeit</th>
              <th className="px-4 py-2.5">Ort</th>
              <th className="px-4 py-2.5">Organisiert von</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2.5 font-medium text-[var(--color-text)]">{a.title}</td>
                <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{format(a.startsAt, "dd.MM.yyyy", { locale: de })}</td>
                <td className="px-4 py-2.5 whitespace-nowrap text-[var(--color-text-muted)]">
                  {format(a.startsAt, "HH:mm")}–{format(a.endsAt, "HH:mm")}
                </td>
                <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{a.location ?? "–"}</td>
                <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{a.organizer.name}</td>
                <td className="px-4 py-2.5 text-right">
                  <DeleteAppointmentButton id={a.id} />
                </td>
              </tr>
            ))}
            {appointments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
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
