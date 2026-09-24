import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { AbsenceForm } from "./absence-form";
import { AbsenceList, type AbsenceRow } from "./absence-list";
import { ZeitKapazitaetTabs } from "../tabs";
import { noticeWarnCls } from "@/app/(app)/cases/case-ui";
import { IconWarnTriangle } from "@/app/(app)/cases/case-icons";

export default async function AbsencesPage() {
  const user = await requireUser();

  const employees = user.role === "ADMIN" ? await prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }) : null;

  const absences = await prisma.absence.findMany({
    where: user.role === "ADMIN" ? {} : { employeeId: user.id },
    include: { employee: true },
    orderBy: { startDate: "desc" },
  });

  const rows: AbsenceRow[] = absences.map((a) => ({
    id: a.id,
    employeeName: a.employee.name,
    type: a.type,
    startDate: format(a.startDate, "dd.MM.yyyy"),
    endDate: format(a.endDate, "dd.MM.yyyy"),
    note: a.note,
    canDelete: a.employeeId === user.id || user.role === "ADMIN",
  }));

  const today = new Date();
  const currentlyAbsent = absences.filter((a) => a.startDate <= today && a.endDate >= today);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Urlaub &amp; Abwesenheit</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {user.role === "ADMIN" ? "Übersicht aller Mitarbeiter." : "Eigene Abwesenheiten eintragen und verwalten."}
        </p>
      </div>

      <ZeitKapazitaetTabs />

      {user.role === "ADMIN" && currentlyAbsent.length > 0 && (
        <div className={`${noticeWarnCls} text-[var(--pros-status-attention-text)]`}>
          <p className="mb-1.5 flex items-center gap-2 font-semibold">
            <IconWarnTriangle />
            Aktuell abwesend:
          </p>
          {currentlyAbsent.map((a) => (
            <div key={a.id}>
              {a.employee.name} – {format(a.startDate, "dd.MM.")} bis {format(a.endDate, "dd.MM.yyyy")}
            </div>
          ))}
        </div>
      )}

      <AbsenceForm employees={employees ? employees.map((e) => ({ id: e.id, name: e.name })) : null} />

      <div className="overflow-x-auto rounded-[var(--pros-r-md)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] shadow-[var(--pros-shadow)]">
        <AbsenceList rows={rows} showEmployee={user.role === "ADMIN"} />
      </div>
    </div>
  );
}
