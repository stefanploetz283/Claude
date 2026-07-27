import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { NewCaseForm } from "./new-case-form";

export default async function NewCasePage() {
  const user = await requireUser();

  const [clients, employees, helpTypes, settings] = await Promise.all([
    prisma.client.findMany({ where: { archived: false }, orderBy: { lastName: "asc" } }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.helpType.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
    getSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Neue Hilfe anlegen</h1>
        <p className="mt-1 text-sm text-black/60">Klienten- und Falldaten erfassen.</p>
      </div>

      <NewCaseForm
        clients={clients.map((c) => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          birthDate: c.birthDate ? c.birthDate.toISOString().slice(0, 10) : null,
        }))}
        employees={employees.map((e) => ({ id: e.id, name: e.name }))}
        helpTypes={helpTypes.map((h) => ({
          id: h.id,
          name: h.name,
          defaultDurationWeeks: h.defaultDurationWeeks,
          defaultTotalHoursMin: h.defaultTotalHoursMin?.toNumber() ?? null,
          defaultTotalHoursMax: h.defaultTotalHoursMax?.toNumber() ?? null,
        }))}
        defaultEmployeeId={user.id}
        defaultPhaseOutWeeks={settings.defaultPhaseOutWeeks}
      />
    </div>
  );
}
