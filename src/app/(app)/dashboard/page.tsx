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

  const [employees, helpTypes] = await Promise.all([
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.helpType.findMany({ orderBy: { name: "asc" } }),
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
      { caseNumber: { contains: q, mode: "insensitive" } },
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">
            {showArchived ? "Archivierte Fälle" : user.role === "ADMIN" && !params.employeeId ? "Alle Fälle" : "Fälle"}
          </h1>
          <p className="mt-1 text-sm text-black/60">{cases.length} Fälle gefunden.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={showArchived ? "/dashboard" : "/dashboard?archived=1"} className="text-sm text-black/50 hover:underline">
            {showArchived ? "← Zu aktiven Fällen" : "Archivierte Fälle anzeigen"}
          </Link>
          <Link
            href="/cases/new"
            className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            + Neue Hilfe anlegen
          </Link>
        </div>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-black/10 bg-white p-4">
        <FilterField label="Suche">
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Klient, Aktenzeichen, Dokumentation…"
            className="w-56 rounded-md border border-black/15 px-3 py-1.5 text-sm"
          />
        </FilterField>
        {user.role === "ADMIN" && (
          <FilterField label="Mitarbeiter">
            <select name="employeeId" defaultValue={params.employeeId ?? ""} className="rounded-md border border-black/15 px-3 py-1.5 text-sm">
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
          <select name="status" defaultValue={params.status ?? ""} className="rounded-md border border-black/15 px-3 py-1.5 text-sm">
            <option value="">Alle</option>
            <option value="ACTIVE">Aktiv</option>
            <option value="PAUSED">Pausiert</option>
            <option value="COMPLETED">Abgeschlossen</option>
          </select>
        </FilterField>
        <FilterField label="Hilfeart">
          <select name="helpTypeId" defaultValue={params.helpTypeId ?? ""} className="rounded-md border border-black/15 px-3 py-1.5 text-sm">
            <option value="">Alle</option>
            {helpTypes.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </FilterField>
        <button type="submit" className="rounded-md border border-black/15 px-4 py-1.5 text-sm hover:bg-black/5">
          Filtern
        </button>
        <Link href="/dashboard" className="text-sm text-black/50 hover:underline">
          Zurücksetzen
        </Link>
      </form>

      <div className="overflow-x-auto rounded-lg border border-black/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/5 text-xs uppercase text-black/50">
            <tr>
              <th className="px-4 py-2">Klient</th>
              <th className="px-4 py-2">Hilfeart</th>
              <th className="px-4 py-2">Zuständig</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Kontingent</th>
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
                <tr key={c.id} className="border-t border-black/5 hover:bg-black/[0.02]">
                  <td className="px-4 py-2">
                    <Link href={`/cases/${c.id}`} className="font-medium text-[var(--color-primary)] hover:underline">
                      {c.client.lastName}, {c.client.firstName}
                    </Link>
                    <div className="text-xs text-black/40">{c.caseNumber}</div>
                  </td>
                  <td className="px-4 py-2">{c.helpType.name}</td>
                  <td className="px-4 py-2">
                    {c.assignedEmployee.name}
                    {c.substituteEmployee && <div className="text-xs text-black/40">Vertr.: {c.substituteEmployee.name}</div>}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-2">
                    <span className={warn ? "font-semibold text-[var(--color-danger)]" : ""}>
                      {remaining.toFixed(1)} / {contingent.toFixed(1)} Std.
                    </span>
                    {warn && <div className="text-xs text-[var(--color-danger)]">⚠ Kontingent bald aufgebraucht</div>}
                  </td>
                </tr>
              );
            })}
            {cases.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-black/40">
                  Keine Fälle gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-black/60">{label}</span>
      {children}
    </label>
  );
}

function StatusBadge({ status }: { status: CaseStatus }) {
  const colors: Record<CaseStatus, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    PAUSED: "bg-amber-100 text-amber-800",
    COMPLETED: "bg-black/10 text-black/60",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status]}`}>{STATUS_LABELS[status]}</span>;
}
