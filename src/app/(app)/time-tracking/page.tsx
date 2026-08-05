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
      include: { client: true, helpType: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.timeEntry.findMany({
      where: { employeeId: viewedEmployeeId, date: { gte: from, lt: to } },
      include: { case: { include: { client: true } } },
      orderBy: { date: "desc" },
    }),
    isSelf ? getRunningTimeEntry(user.id) : Promise.resolve(null),
  ]);

  const caseOptions = viewedCases.map((c) => ({ id: c.id, label: `${c.client.lastName}, ${c.client.firstName} (${c.helpType.name})` }));

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

  const daysInPeriod = Math.round((to.getTime() - from.getTime()) / 86400000);
  const weeksInPeriod = daysInPeriod / 7;
  const avgPerWeek = weeksInPeriod > 0 ? totalHours / weeksInPeriod : 0;
  const avgPerEntry = rows.length > 0 ? totalHours / rows.length : 0;

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Zeiterfassung</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Deine interne Arbeitszeit (für dich/die Praxisleitung, nicht fürs Jugendamt).</p>
        </div>
        {user.role === "ADMIN" && (
          <form method="get" className="flex items-center gap-2 text-sm">
            <span className="text-[var(--color-text-muted)]">Mitarbeiter:</span>
            <select
              name="employeeId"
              defaultValue={viewedEmployeeId}
              className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm text-[var(--color-text)]"
            >
              <option value={user.id}>Ich ({user.name})</option>
              {employees
                .filter((e) => e.id !== user.id)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
            <button
              type="submit"
              className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 font-medium text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]"
            >
              Anzeigen
            </button>
          </form>
        )}
      </div>

      <p className="rounded-[var(--radius-control)] bg-[var(--color-warn-soft)] px-4 py-2.5 text-sm text-[var(--color-warn-text)]">
        Für den <strong>Leistungsnachweis ans Jugendamt</strong> trägst du Einträge stattdessen im jeweiligen Fall unter „Leistungsdokumentation&quot; ein.
      </p>

      {isSelf && <TimerWidget cases={caseOptions} running={runningInfo} />}
      {isSelf && <ManualEntryForm cases={caseOptions} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile value={`${totalHours.toFixed(1)}`} label="Std. diesen Monat" />
        <StatTile value={`${rows.length}`} label="Einträge diesen Monat" />
        <StatTile value={avgPerEntry.toFixed(2)} label="Ø Std. pro Eintrag" />
        <StatTile value={avgPerWeek.toFixed(1)} label="Ø Std. pro Woche" />
      </div>

      <div className="flex items-center justify-between">
        <MonthNav year={year} month={month} employeeId={user.role === "ADMIN" ? viewedEmployeeId : undefined} />
        <p className="text-sm text-[var(--color-text-muted)]">
          Gesamt: <span className="font-semibold text-[var(--color-text)]">{totalHours.toFixed(2)} Std.</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] lg:col-span-2">
          <EntriesList entries={rows} canDelete={isSelf || user.role === "ADMIN"} />
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Aufteilung</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {Array.from(byLabel.entries()).map(([label, hours]) => (
              <li key={label} className="flex justify-between border-b border-[var(--color-border)] py-1.5 last:border-0">
                <span className="text-[var(--color-text-muted)]">{label}</span>
                <span className="font-medium text-[var(--color-text)]">{hours.toFixed(2)} Std.</span>
              </li>
            ))}
            {byLabel.size === 0 && <li className="text-[var(--color-text-muted)]">Keine Daten.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
      <div className="text-[28px] leading-none font-bold text-[var(--color-text)]">{value}</div>
      <div className="mt-1.5 text-sm font-semibold text-[var(--color-text)]">{label}</div>
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
      <Link
        href={`/time-tracking?year=${prevYear}&month=${prevMonth}${empParam}`}
        className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 font-medium text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]"
      >
        ← Vormonat
      </Link>
      <span className="font-semibold text-[var(--color-text)]">
        {String(month).padStart(2, "0")}/{year}
      </span>
      <Link
        href={`/time-tracking?year=${nextYear}&month=${nextMonth}${empParam}`}
        className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 font-medium text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]"
      >
        Folgemonat →
      </Link>
    </div>
  );
}
