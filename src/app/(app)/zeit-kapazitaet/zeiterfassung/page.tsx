import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { getRunningTimeEntry, monthRange } from "@/lib/time-helpers";
import { TimerWidget } from "./timer-widget";
import { ManualEntryForm } from "./manual-entry-form";
import { EntriesList, type TimeEntryRow } from "./entries-list";
import { ZeitKapazitaetTabs } from "../tabs";
import { ProsKpiCard } from "@/components/pros/pros-kpi-card";
import { buttonSecondaryCls } from "@/app/(app)/cases/case-ui";

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
              className="rounded-[var(--pros-r-sm)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] px-3.5 py-2 text-sm text-[var(--color-text)]"
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
            <button type="submit" className={buttonSecondaryCls}>
              Anzeigen
            </button>
          </form>
        )}
      </div>

      <ZeitKapazitaetTabs />

      <p className="rounded-[var(--pros-r-sm)] bg-[var(--pros-status-attention-bg)] px-4 py-2.5 text-sm text-[var(--pros-status-attention-text)]">
        Für den <strong>Leistungsnachweis ans Jugendamt</strong> trägst du Einträge stattdessen im jeweiligen Fall unter „Leistungsdokumentation&quot; ein.
      </p>

      {isSelf && <TimerWidget cases={caseOptions} running={runningInfo} />}
      {isSelf && <ManualEntryForm cases={caseOptions} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ProsKpiCard icon={<IconClock />} value={totalHours.toFixed(1)} label="Std. diesen Monat" primary />
        <ProsKpiCard icon={<IconList />} value={rows.length} label="Einträge diesen Monat" />
        <ProsKpiCard icon={<IconAverage />} value={avgPerEntry.toFixed(2)} label="Ø Std. pro Eintrag" />
        <ProsKpiCard icon={<IconWeek />} value={avgPerWeek.toFixed(1)} label="Ø Std. pro Woche" />
      </div>

      <div className="flex items-center justify-between">
        <MonthNav year={year} month={month} employeeId={user.role === "ADMIN" ? viewedEmployeeId : undefined} />
        <p className="text-sm text-[var(--color-text-muted)]">
          Gesamt: <span className="font-semibold text-[var(--color-text)]">{totalHours.toFixed(2)} Std.</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="overflow-x-auto rounded-[var(--pros-r-md)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] shadow-[var(--pros-shadow)] lg:col-span-2">
          <EntriesList entries={rows} canDelete={isSelf || user.role === "ADMIN"} />
        </div>
        <div className="rounded-[var(--pros-r-md)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] p-5 shadow-[var(--pros-shadow)]">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Aufteilung</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {Array.from(byLabel.entries()).map(([label, hours]) => (
              <li key={label} className="flex justify-between border-b border-[var(--pros-border-default)] py-1.5 last:border-0">
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

function MonthNav({ year, month, employeeId }: { year: number; month: number; employeeId?: string }) {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const empParam = employeeId ? `&employeeId=${employeeId}` : "";

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href={`/zeit-kapazitaet/zeiterfassung?year=${prevYear}&month=${prevMonth}${empParam}`} className={buttonSecondaryCls}>
        ← Vormonat
      </Link>
      <span className="font-semibold text-[var(--color-text)]">
        {String(month).padStart(2, "0")}/{year}
      </span>
      <Link href={`/zeit-kapazitaet/zeiterfassung?year=${nextYear}&month=${nextMonth}${empParam}`} className={buttonSecondaryCls}>
        Folgemonat →
      </Link>
    </div>
  );
}

function IconClock() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </svg>
  );
}

function IconList() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="20" y2="12" />
      <line x1="8" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconAverage() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10" />
      <path d="M12 20V4" />
      <path d="M20 20v-7" />
    </svg>
  );
}

function IconWeek() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </svg>
  );
}
