import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NewEmployeeForm } from "./new-employee-form";
import { EmployeeRowActions } from "./employee-row-actions";
import { CapacityForm } from "./capacity-form";

export default async function EmployeesPage() {
  await requireAdmin();
  const [employees, caseCounts, helpTypes] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" }, include: { allowedHelpTypes: true } }),
    prisma.case.groupBy({
      by: ["assignedEmployeeId"],
      where: { archived: false, status: { not: "COMPLETED" } },
      _count: true,
    }),
    prisma.helpType.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
  ]);

  const casesByEmployee = new Map(caseCounts.map((c) => [c.assignedEmployeeId, c._count]));
  const adminCount = employees.filter((e) => e.role === "ADMIN").length;
  const fachkraftCount = employees.filter((e) => e.role === "EMPLOYEE").length;
  const totalActiveCases = caseCounts.reduce((sum, c) => sum + c._count, 0);
  const avgCasesPerEmployee = employees.length > 0 ? totalActiveCases / employees.length : 0;

  const ROLE_LABELS: Record<string, string> = { ADMIN: "Admin", EMPLOYEE: "Fachkraft", VERWALTUNG: "Verwaltung" };

  const palette = ["#1F5A36", "#ED9438", "#D65A3A", "#4F845F"];
  const softPalette = ["var(--color-primary-soft)", "#fdecd9", "#f9e3dc", "var(--color-primary-soft)"];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Mitarbeiter</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{employees.length} Mitarbeiter im Team. Konten werden deaktiviert statt gelöscht.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile value={`${employees.length}`} label="Gesamt Mitarbeiter" />
        <StatTile value={`${adminCount}`} label="Admins" />
        <StatTile value={`${fachkraftCount}`} label="Fachkräfte" />
        <StatTile value={avgCasesPerEmployee.toFixed(1)} label="Ø Fälle pro Mitarbeiter" />
      </div>

      <NewEmployeeForm />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {employees.map((e, i) => {
          const color = palette[i % palette.length];
          const soft = softPalette[i % softPalette.length];
          return (
            <div key={e.id} className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: color }}
                >
                  {initials(e.name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[14.5px] font-semibold text-[var(--color-text)]">{e.name}</div>
                  <div className="truncate text-xs text-[var(--color-text-muted)]">{e.email}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: soft, color }}>
                  {ROLE_LABELS[e.role] ?? e.role}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${e.active ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]" : "bg-[var(--color-border)] text-[var(--color-text-muted)]"}`}>
                  {e.active ? "Aktiv" : "Deaktiviert"}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {casesByEmployee.get(e.id) ?? 0} aktive Fälle · 2FA {e.totpEnabled ? "eingerichtet" : "ausstehend"}
                </span>
              </div>

              <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
                <EmployeeRowActions id={e.id} active={e.active} />
                <CapacityForm
                  userId={e.id}
                  weeklyContractHours={e.weeklyContractHours?.toString() ?? null}
                  allowedHelpTypeIds={e.allowedHelpTypes.map((h) => h.id)}
                  helpTypes={helpTypes}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
      <div className="text-[28px] leading-none font-bold text-[var(--color-text)]">{value}</div>
      <div className="mt-1.5 text-sm font-semibold text-[var(--color-text)]">{label}</div>
    </div>
  );
}
