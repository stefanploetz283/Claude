import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { simulateEmployeeWeeklyBreakdown, toCapacityPoints, findCapacityWindow, type CaseWithProfile } from "@/lib/capacity";
import { CapacityChart } from "./capacity-chart";
import { WaitlistForm } from "./waitlist-form";
import type { Suggestion } from "./waitlist-card";
import { KapazitaetBoard, type WaitlistItem } from "./board";

const HORIZON_WEEKS = 52;

const caseInclude = {
  client: true,
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
      ? simulateEmployeeWeeklyBreakdown(me, ownCases as CaseWithProfile[], settings.billableCapacityFactor.toNumber(), HORIZON_WEEKS)
      : [];
    const ownHelpTypes = Array.from(new Map(ownCases.map((c) => [c.helpTypeId, c.helpType.name])).entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "de"));

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Kapazität</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Deine eigene Auslastung über die nächsten 12 Monate.</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
          {me?.weeklyContractHours ? (
            <CapacityChart employeeId={me.id} points={points} title={me.name} helpTypeOrder={ownHelpTypes} />
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
  const helpTypeOrder = helpTypes.map((h) => ({ id: h.id, name: h.name }));

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
    points: simulateEmployeeWeeklyBreakdown(
      e,
      employeeCases[i] as CaseWithProfile[],
      settings.billableCapacityFactor.toNumber(),
      HORIZON_WEEKS
    ),
  }));

  const waitlistWithSuggestions: WaitlistItem[] = waitlistEntries.map((entry) => {
    const requiredWeeklyRate = entry.helpType.activityProfiles.reduce((sum, p) => sum + (p.hoursPerWeek?.toNumber() ?? 0), 0);
    const eligible = capacityByEmployee.filter((c) => c.employee.allowedHelpTypes.some((h) => h.id === entry.helpTypeId));

    let best: Suggestion = null;
    for (const c of eligible) {
      const window = findCapacityWindow(toCapacityPoints(c.points), requiredWeeklyRate);
      if (window && (!best || window.fromWeek < best.fromWeek)) {
        best = { employeeId: c.employee.id, employeeName: c.employee.name, fromWeek: window.fromWeek, toWeek: window.toWeek };
      }
    }

    return {
      entry: {
        id: entry.id,
        clientName: entry.clientName,
        authority: entry.authority,
        helpTypeName: entry.helpType.name,
        requestedAt: entry.requestedAt,
        urgencyNote: entry.urgencyNote,
        waitingDays: Math.floor((now.getTime() - entry.requestedAt.getTime()) / 86400000),
      },
      suggestion: best,
      defaultTotalHours:
        entry.helpType.defaultTotalHoursMin != null && entry.helpType.defaultTotalHoursMax != null
          ? (entry.helpType.defaultTotalHoursMin.toNumber() + entry.helpType.defaultTotalHoursMax.toNumber()) / 2
          : (entry.helpType.defaultTotalHoursMin?.toNumber() ?? null),
      defaultDurationWeeks: entry.helpType.defaultDurationWeeks,
      defaultPhaseOutWeeks: settings.defaultPhaseOutWeeks,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Kapazität</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Wochenstunden-Auslastung je Fachkraft über die nächsten 12 Monate, Warteliste und Einplanungs-Vorschläge.
        </p>
      </div>

      <KapazitaetBoard
        employees={capacityByEmployee.map(({ employee, points }) => ({
          id: employee.id,
          name: employee.name,
          hasContractHours: employee.weeklyContractHours != null,
          points,
        }))}
        helpTypeOrder={helpTypeOrder}
        waitlistItems={waitlistWithSuggestions}
        employeeOptions={employees.map((e) => ({ id: e.id, name: e.name }))}
      >
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Neue Anfrage auf Warteliste setzen</h2>
          <WaitlistForm helpTypes={helpTypes} />
        </div>
      </KapazitaetBoard>
    </div>
  );
}
