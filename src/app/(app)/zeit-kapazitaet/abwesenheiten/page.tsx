import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { AbsenceForm } from "./absence-form";
import { AbsenceList, type AbsenceRow } from "./absence-list";
import { ZeitKapazitaetTabs } from "../tabs";

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
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Urlaub &amp; Abwesenheit</h1>
        <p className="mt-1 text-sm text-black/60">
          {user.role === "ADMIN" ? "Übersicht aller Mitarbeiter." : "Eigene Abwesenheiten eintragen und verwalten."}
        </p>
      </div>

      <ZeitKapazitaetTabs />

      {user.role === "ADMIN" && currentlyAbsent.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="mb-1 font-medium">Aktuell abwesend:</p>
          {currentlyAbsent.map((a) => (
            <div key={a.id}>
              {a.employee.name} – {format(a.startDate, "dd.MM.")} bis {format(a.endDate, "dd.MM.yyyy")}
            </div>
          ))}
        </div>
      )}

      <AbsenceForm employees={employees ? employees.map((e) => ({ id: e.id, name: e.name })) : null} />

      <div className="overflow-x-auto rounded-lg border border-black/10 bg-white">
        <AbsenceList rows={rows} showEmployee={user.role === "ADMIN"} />
      </div>
    </div>
  );
}
