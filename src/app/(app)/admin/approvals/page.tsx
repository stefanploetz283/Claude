import { format } from "date-fns";
import { de } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { monthDateRange, toDateInputValue } from "@/lib/date";
import { ApprovalReviewCard } from "./review-card";

export default async function ApprovalsPage() {
  await requireAdmin();

  const pending = await prisma.monthlyApproval.findMany({
    where: { status: "WARTET_AUF_FREIGABE" },
    include: {
      case: { include: { client: true, helpType: true, assignedEmployee: true } },
      submittedBy: true,
      lastEditedBy: true,
    },
    orderBy: { submittedAt: "asc" },
  });

  const cards = await Promise.all(
    pending.map(async (a) => {
      const { from, to } = monthDateRange(a.year, a.month);
      const entries = await prisma.serviceEntry.findMany({
        where: { caseId: a.caseId, date: { gte: from, lte: to } },
        orderBy: { date: "asc" },
      });
      const totalHours = entries.reduce((sum, e) => sum + e.durationMinutes / 60, 0);

      return {
        approvalId: a.id,
        caseId: a.caseId,
        year: a.year,
        month: a.month,
        monthLabel: format(new Date(Date.UTC(a.year, a.month - 1, 1)), "MMMM yyyy", { locale: de }),
        clientName: `${a.case.client.lastName}, ${a.case.client.firstName}`,
        helpTypeName: a.case.helpType.name,
        employeeName: a.case.assignedEmployee.name,
        submittedAt: a.submittedAt ? format(a.submittedAt, "dd.MM.yyyy HH:mm", { locale: de }) : "–",
        totalHours,
        lastEditedByName: a.lastEditedBy?.name ?? null,
        lastEditedAtLabel: a.lastEditedAt ? format(a.lastEditedAt, "dd.MM.yyyy HH:mm", { locale: de }) : null,
        entries: entries.map((e) => ({
          id: e.id,
          dateISO: toDateInputValue(e.date),
          dateLabel: format(e.date, "dd.MM.yyyy"),
          startTime: format(e.startTime, "HH:mm"),
          endTime: format(e.endTime, "HH:mm"),
          durationHours: e.durationMinutes / 60,
          description: e.description,
        })),
      };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Freigaben</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Leistungsdokumentationen, die von Fachkräften zur Freigabe eingereicht wurden.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {cards.map((c) => (
          <ApprovalReviewCard key={c.approvalId} {...c} />
        ))}
        {cards.length === 0 && (
          <p className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-text-muted)]">
            Aktuell liegen keine Leistungsdokumentationen zur Freigabe vor.
          </p>
        )}
      </div>
    </div>
  );
}
