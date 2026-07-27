import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { simulateEmployeeWeeklyCapacity, findCapacityWindow, type CaseWithProfile } from "@/lib/capacity";
import { CapacityChart } from "./capacity-chart";
import { WaitlistForm } from "./waitlist-form";
import { WaitlistCard, type Suggestion } from "./waitlist-card";

const HORIZON_WEEKS = 26;

const caseInclude = {
  helpType: { include: { activityProfiles: true } },
} as const;

export default async function KapazitaetPage() {
  const user = await requireUser();
  const settings = await getSettings();
  const isManagement = user.role === "ADMIN" || user.role === "VERWALTUNG";

  if (!isManagement) {
    const ownCases = await prisma.case.findMany({
      where: { assignedEmployeeId: user.id, archived: false, status: { not: "COMPLETED" } },
      include: caseInclude,
    });
    const me = await prisma.user.findUnique({ where: { id: user.id } });
    const points = me
      ? simulateEmployeeWeeklyCapacity(me, ownCases as CaseWithProfile[], settings.billableCapacityFactor.toNumber(), HORIZON_WEEKS)
      : [];

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Kapazität</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Deine eigene Auslastung über die nächsten {HORIZON_WEEKS} Wochen.</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
          {me?.weeklyContractHours ? (
            <CapacityChart points={points} title={me.name} />
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              Für dich sind noch keine Vertragsstunden hinterlegt. Bitte den Admin bitten, das unter Mitarbeiter einzutragen.
            </p>
          )}
        </div>
      </div>
    );
  }

  const [employees, helpTypes, waitlistEntries] = await Promise.all([
    prisma.user.findMany({
      where: { role: "EMPLOYEE", active: true },
      include: { allowedHelpTypes: true },
      orderBy: { name: "asc" },
    }),
    prisma.helpType.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
    prisma.waitlistEntry.findMany({
      where: { status: "WAITING" },
      include: { helpType: { include: { activityProfiles: true } } },
      orderBy: { requestedAt: "asc" },
    }),
  ]);

  const now = new Date();

  const employeeCases = await Promise.all(
    employees.map((e) =>
      prisma.case.findMany({
        where: { assignedEmployeeId: e.id, archived: false, status: { not: "COMPLETED" } },
        include: caseInclude,
      })
    )
  );

  const capacityByEmployee = employees.map((e, i) => ({
    employee: e,
    points: simulateEmployeeWeeklyCapacity(
      e,
      employeeCases[i] as CaseWithProfile[],
      settings.billableCapacityFactor.toNumber(),
      HORIZON_WEEKS
    ),
  }));

  const waitlistWithSuggestions = waitlistEntries.map((entry) => {
    const requiredWeeklyRate = entry.helpType.activityProfiles.reduce((sum, p) => sum + (p.hoursPerWeek?.toNumber() ?? 0), 0);
    const eligible = capacityByEmployee.filter((c) => c.employee.allowedHelpTypes.some((h) => h.id === entry.helpTypeId));

    let best: Suggestion = null;
    for (const c of eligible) {
      const window = findCapacityWindow(c.points, requiredWeeklyRate);
      if (window && (!best || window.fromWeek < best.fromWeek)) {
        best = { employeeId: c.employee.id, employeeName: c.employee.name, fromWeek: window.fromWeek, toWeek: window.toWeek };
      }
    }
    return { entry, suggestion: best };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Kapazität</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Wochenstunden-Auslastung je Fachkraft über die nächsten {HORIZON_WEEKS} Wochen, Warteliste und Einplanungs-Vorschläge.
        </p>
      </div>

      <div className="flex flex-col gap-5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Auslastung je Fachkraft</h2>
        {capacityByEmployee.map(({ employee, points }) => (
          <div key={employee.id}>
            {employee.weeklyContractHours ? (
              <CapacityChart points={points} title={employee.name} />
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                <strong>{employee.name}</strong>: keine Vertragsstunden hinterlegt (unter Mitarbeiter eintragen).
              </p>
            )}
          </div>
        ))}
        {employees.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Keine aktiven Fachkräfte.</p>}
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Neue Anfrage auf Warteliste setzen</h2>
        <WaitlistForm helpTypes={helpTypes} />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          Warteliste ({waitlistWithSuggestions.length}, längste Wartezeit zuerst)
        </h2>
        {waitlistWithSuggestions.map(({ entry, suggestion }) => (
          <WaitlistCard
            key={entry.id}
            entry={{
              id: entry.id,
              clientName: entry.clientName,
              authority: entry.authority,
              helpTypeName: entry.helpType.name,
              requestedAt: entry.requestedAt,
              urgencyNote: entry.urgencyNote,
              waitingDays: Math.floor((now.getTime() - entry.requestedAt.getTime()) / 86400000),
            }}
            suggestion={suggestion}
            employees={employees.map((e) => ({ id: e.id, name: e.name }))}
            defaultTotalHours={
              entry.helpType.defaultTotalHoursMin != null && entry.helpType.defaultTotalHoursMax != null
                ? (entry.helpType.defaultTotalHoursMin.toNumber() + entry.helpType.defaultTotalHoursMax.toNumber()) / 2
                : (entry.helpType.defaultTotalHoursMin?.toNumber() ?? null)
            }
            defaultDurationWeeks={entry.helpType.defaultDurationWeeks}
            defaultPhaseOutWeeks={settings.defaultPhaseOutWeeks}
          />
        ))}
        {waitlistWithSuggestions.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Warteliste ist leer.</p>}
      </div>
    </div>
  );
}
