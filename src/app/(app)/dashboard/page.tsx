import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { caseVisibilityWhere } from "@/lib/rbac";
import { getRemainingHoursBulk } from "@/lib/case-helpers";
import { getSettings } from "@/lib/settings";
import type { CaseStatus, Prisma } from "@prisma/client";

const STATUS_LABELS: Record<CaseStatus, string> = {
  ACTIVE: "Aktiv",
  PAUSED: "Pausiert",
  COMPLETED: "Abgeschlossen",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const settings = await getSettings();

  const visibility = caseVisibilityWhere(user);
  const [employees, helpTypes, totalOpen, activeCount, completedCount, archivedCount] = await Promise.all([
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.helpType.findMany({ orderBy: { name: "asc" } }),
    prisma.case.count({ where: { archived: false, status: { not: "COMPLETED" }, ...visibility } }),
    prisma.case.count({ where: { archived: false, status: "ACTIVE", ...visibility } }),
    prisma.case.count({ where: { archived: false, status: "COMPLETED", ...visibility } }),
    prisma.case.count({ where: { archived: true, ...visibility } }),
  ]);

  const showArchived = params.archived === "1";
  const where: Prisma.CaseWhereInput = {
    archived: showArchived,
    ...caseVisibilityWhere(user),
  };

  if (params.status) where.status = params.status as CaseStatus;
  if (params.helpTypeId) where.helpTypeId = params.helpTypeId;
  if (user.role === "ADMIN" && params.employeeId) {
    where.assignedEmployeeId = params.employeeId;
  }

  if (params.q) {
    const q = params.q;
    where.OR = [
      { authority: { contains: q, mode: "insensitive" } },
      { client: { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }] } },
      { helpType: { name: { contains: q, mode: "insensitive" } } },
      { serviceEntries: { some: { description: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const cases = await prisma.case.findMany({
    where,
    include: { client: true, helpType: true, assignedEmployee: true, substituteEmployee: true },
    orderBy: { updatedAt: "desc" },
  });

  const remainingMap = await getRemainingHoursBulk(cases.map((c) => c.id));
  const threshold = settings.contingentWarningThreshold;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">
            {showArchived ? "Archivierte Fälle" : user.role === "ADMIN" && !params.employeeId ? "Alle Fälle" : "Fälle"}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{cases.length} Fälle gefunden.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={showArchived ? "/dashboard" : "/dashboard?archived=1"}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]"
          >
            <ArchiveIcon />
            {showArchived ? "Zu aktiven Fällen" : "Archivierte Fälle anzeigen"}
          </Link>
          <Link
            href="/cases/new"
            className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)]"
          >
            + Neue Hilfe anlegen
          </Link>
        </div>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]"
      >
        <FilterField label="Suche">
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Klient, Dokumentation…"
            className={`${fieldCls} w-56`}
          />
        </FilterField>
        {user.role === "ADMIN" && (
          <FilterField label="Mitarbeiter">
            <select name="employeeId" defaultValue={params.employeeId ?? ""} className={fieldCls}>
              <option value="">Alle Mitarbeiter</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </FilterField>
        )}
        <FilterField label="Status">
          <select name="status" defaultValue={params.status ?? ""} className={fieldCls}>
            <option value="">Alle</option>
            <option value="ACTIVE">Aktiv</option>
            <option value="PAUSED">Pausiert</option>
            <option value="COMPLETED">Abgeschlossen</option>
          </select>
        </FilterField>
        <FilterField label="Hilfeart">
          <select name="helpTypeId" defaultValue={params.helpTypeId ?? ""} className={fieldCls}>
            <option value="">Alle</option>
            {helpTypes.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </FilterField>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--color-primary-soft)] bg-[var(--color-primary-soft)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary)] transition hover:brightness-95"
        >
          <FilterIcon />
          Filtern
        </button>
        <Link href="/dashboard" className="px-1 py-2.5 text-sm font-medium text-[var(--color-coral)] hover:underline">
          Zurücksetzen
        </Link>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<StatFaelleIcon />} color="#204D4B" bg="#204D4B1f" value={totalOpen} label="Gesamtfälle" sub="Alle aktiven Fälle" />
        <StatCard icon={<StatActiveIcon />} color="#9FA47E" bg="#9FA47E1f" value={activeCount} label="In Bearbeitung" sub="Aktuell laufende Hilfen" />
        <StatCard icon={<StatDoneIcon />} color="#D2AD69" bg="#D2AD691f" value={completedCount} label="Abgeschlossen" sub="Beendete Hilfen" />
        <StatCard icon={<StatArchiveIcon />} color="#5C635E" bg="#5C635E1f" value={archivedCount} label="Archiviert" sub="Archivierte Fälle" />
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-sage)] text-xs font-semibold uppercase tracking-wide text-white">
            <tr>
              <th className="px-5 py-3">Klient</th>
              <th className="px-5 py-3">Hilfeart</th>
              <th className="px-5 py-3">Zuständig</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Kontingent</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => {
              const usedHours = remainingMap.get(c.id) ?? 0;
              const contingent = c.hoursContingent.toNumber();
              const remaining = contingent - usedHours;
              const remainingPercent = contingent > 0 ? (remaining / contingent) * 100 : 0;
              const warn = remainingPercent <= threshold;

              return (
                <tr key={c.id} className="border-t border-[var(--color-border)] transition hover:bg-[var(--color-primary-soft)]/40">
                  <td className="px-5 py-3.5">
                    <Link href={`/cases/${c.id}`} className="font-medium text-[var(--color-primary)] hover:underline">
                      {c.client.lastName}, {c.client.firstName}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-[var(--color-text)]">{c.helpType.name}</td>
                  <td className="px-5 py-3.5 text-[var(--color-text)]">
                    {c.assignedEmployee.name}
                    {c.substituteEmployee && <div className="text-xs text-[var(--color-text-muted)]">Vertr.: {c.substituteEmployee.name}</div>}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={warn ? "font-semibold text-[var(--color-coral)]" : "text-[var(--color-text)]"}>
                      {remaining.toFixed(1)} / {contingent.toFixed(1)} Std.
                    </span>
                    {warn && <div className="text-xs text-[var(--color-coral)]">⚠ Kontingent bald aufgebraucht</div>}
                  </td>
                </tr>
              );
            })}
            {cases.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <EmptyStateIcon />
                    <p className="font-medium text-[var(--color-text)]">Keine Fälle gefunden.</p>
                    <p className="text-sm text-[var(--color-text-muted)]">Erstellen Sie eine neue Hilfe oder passen Sie Ihre Filterkriterien an.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const fieldCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[var(--color-text-muted)]">{label}</span>
      {children}
    </label>
  );
}

function StatusBadge({ status }: { status: CaseStatus }) {
  const colors: Record<CaseStatus, string> = {
    ACTIVE: "bg-[#9FA47E29] text-[#3f5a2f]",
    PAUSED: "bg-[#D2AD6929] text-[#7d611f]",
    COMPLETED: "bg-[#204D4B1f] text-[#204D4B]",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${colors[status]}`}>{STATUS_LABELS[status]}</span>;
}

function ArchiveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
      <path d="M10 13h4" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="4 4 20 4 14 12.5 14 19 10 21 10 12.5 4 4" />
    </svg>
  );
}

function StatCard({
  icon,
  color,
  bg,
  value,
  label,
  sub,
}: {
  icon: React.ReactNode;
  color: string;
  bg: string;
  value: number;
  label: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full" style={{ background: bg, color }}>
        {icon}
      </div>
      <div>
        <div className="text-[28px] leading-none font-bold text-[var(--color-text)]">{value}</div>
        <div className="mt-1.5 text-sm font-semibold text-[var(--color-text)]">{label}</div>
        <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">{sub}</div>
      </div>
    </div>
  );
}

function StatFaelleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function StatActiveIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="18" cy="9" r="2.7" />
      <path d="M15 20c0-2.6 1.6-4.6 4-5.2" />
    </svg>
  );
}

function StatDoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function StatArchiveIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="5" rx="1" />
      <rect x="5" y="9" width="14" height="11" rx="1" />
      <line x1="10" y1="13" x2="14" y2="13" />
    </svg>
  );
}

function EmptyStateIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect x="6" y="16" width="34" height="26" rx="4" fill="var(--color-primary-soft)" />
      <path d="M6 20l4-6h12l3 4h11a2 2 0 0 1 2 2" stroke="var(--color-green-medium)" strokeWidth="2" strokeLinejoin="round" fill="none" />
      <circle cx="38" cy="36" r="9" fill="var(--color-bg)" stroke="var(--color-green-medium)" strokeWidth="2" />
      <path d="M44.5 42.5L50 48" stroke="var(--color-green-medium)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
