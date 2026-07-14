import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { getRunningTimeEntry, monthRange } from "@/lib/time-helpers";
import { TimerWidget } from "./timer-widget";
import { ManualEntryForm } from "./manual-entry-form";
import { EntriesList, type TimeEntryRow } from "./entries-list";

const ACTIVITY_LABELS: Record<string, string> = {
  VERWALTUNG: "Verwaltung",
  FAHRZEITEN: "Fahrzeiten",
  SONSTIGES: "Sonstiges",
};

export default async function TimeTrackingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const viewedEmployeeId = user.role === "ADMIN" && params.employeeId ? params.employeeId : user.id;
  const isSelf = viewedEmployeeId === user.id;

  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month = Number(params.month) || now.getMonth() + 1;
  const { from, to } = monthRange(year, month);

  const [employees, viewedCases, entries, running] = await Promise.all([
    user.role === "ADMIN" ? prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    prisma.case.findMany({
      where: { archived: false, OR: [{ assignedEmployeeId: viewedEmployeeId }, { substituteEmployeeId: viewedEmployeeId }] },
      include: { client: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.timeEntry.findMany({
      where: { employeeId: viewedEmployeeId, date: { gte: from, lt: to } },
      include: { case: { include: { client: true } } },
      orderBy: { date: "desc" },
    }),
    isSelf ? getRunningTimeEntry(user.id) : Promise.resolve(null),
  ]);

  const caseOptions = viewedCases.map((c) => ({ id: c.id, label: `${c.client.lastName}, ${c.client.firstName} (${c.caseNumber})` }));

  const rows: TimeEntryRow[] = entries
    .filter((e) => e.endTime !== null || e.source === "MANUAL")
    .map((e) => ({
      id: e.id,
      date: format(e.date, "dd.MM.yyyy"),
      timeLabel: e.startTime && e.endTime ? `${format(e.startTime, "HH:mm")}–${format(e.endTime, "HH:mm")}` : "–",
      durationHours: e.durationMinutes / 60,
      label: e.case ? `${e.case.client.lastName}, ${e.case.client.firstName}` : ACTIVITY_LABELS[e.generalActivity ?? ""] ?? "Sonstiges",
      note: e.note,
    }));

  const totalHours = rows.reduce((sum, r) => sum + r.durationHours, 0);
  const byLabel = new Map<string, number>();
  for (const r of rows) byLabel.set(r.label, (byLabel.get(r.label) ?? 0) + r.durationHours);

  const runningInfo = running
    ? {
        startTime: running.startTime!.toISOString(),
        caseLabel: null as string | null,
        generalActivity: running.generalActivity,
      }
    : null;
  if (running?.caseId) {
    const c = viewedCases.find((v) => v.id === running.caseId);
    if (c && runningInfo) runningInfo.caseLabel = `${c.client.lastName}, ${c.client.firstName}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Zeiterfassung</h1>
          <p className="mt-1 text-sm text-black/60">Interne Arbeitszeit, getrennt von der Leistungsdokumentation fürs Jugendamt.</p>
        </div>
        {user.role === "ADMIN" && (
          <form method="get" className="flex items-center gap-2 text-sm">
            <span className="text-black/60">Mitarbeiter:</span>
            <select name="employeeId" defaultValue={viewedEmployeeId} className="rounded-md border border-black/15 px-3 py-1.5 text-sm">
              <option value={user.id}>Ich ({user.name})</option>
              {employees
                .filter((e) => e.id !== user.id)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
            <button type="submit" className="rounded-md border border-black/15 px-3 py-1.5 hover:bg-black/5">
              Anzeigen
            </button>
          </form>
        )}
      </div>

      {isSelf && <TimerWidget cases={caseOptions} running={runningInfo} />}
      {isSelf && <ManualEntryForm cases={caseOptions} />}

      <div className="flex items-center justify-between">
        <MonthNav year={year} month={month} employeeId={user.role === "ADMIN" ? viewedEmployeeId : undefined} />
        <p className="text-sm text-black/60">
          Gesamt: <span className="font-semibold text-[var(--color-text)]">{totalHours.toFixed(2)} Std.</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="overflow-x-auto rounded-lg border border-black/10 bg-white lg:col-span-2">
          <EntriesList entries={rows} canDelete={isSelf || user.role === "ADMIN"} />
        </div>
        <div className="rounded-lg border border-black/10 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Aufteilung</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {Array.from(byLabel.entries()).map(([label, hours]) => (
              <li key={label} className="flex justify-between border-b border-black/5 py-1 last:border-0">
                <span className="text-black/60">{label}</span>
                <span>{hours.toFixed(2)} Std.</span>
              </li>
            ))}
            {byLabel.size === 0 && <li className="text-black/40">Keine Daten.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MonthNav({ year, month, employeeId }: { year: number; month: number; employeeId?: string }) {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const empParam = employeeId ? `&employeeId=${employeeId}` : "";

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href={`/time-tracking?year=${prevYear}&month=${prevMonth}${empParam}`} className="rounded-md border border-black/15 px-2 py-1 hover:bg-black/5">
        ← Vormonat
      </Link>
      <span className="font-medium">
        {String(month).padStart(2, "0")}/{year}
      </span>
      <Link href={`/time-tracking?year=${nextYear}&month=${nextMonth}${empParam}`} className="rounded-md border border-black/15 px-2 py-1 hover:bg-black/5">
        Folgemonat →
      </Link>
    </div>
  );
}
