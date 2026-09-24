import Link from "next/link";
import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NewEmployeeForm } from "./new-employee-form";
import { ProsKpiCard } from "@/components/pros/pros-kpi-card";
import { ProsStatusPill } from "@/components/pros/pros-status-pill";

const ROLE_LABELS: Record<string, string> = { ADMIN: "Admin", EMPLOYEE: "Fachkraft", VERWALTUNG: "Verwaltung" };
const PALETTE = ["var(--color-primary)", "var(--color-gold)", "var(--pros-status-critical-text)", "var(--color-sage)"];
const SOFT_PALETTE = ["var(--color-primary-soft)", "var(--pros-gold-soft)", "var(--pros-status-critical-bg)", "var(--pros-sage-soft)"];
// Weiß auf Gold (Index 1) unterschreitet WCAG AA (~2.1:1) - Avatar-Initialen dort in Petrol statt
// Weiß, alle anderen Palettefarben bleiben bei Weiß (ausreichend Kontrast).
const AVATAR_TEXT_PALETTE = ["white", "var(--color-primary)", "white", "white"];

export default async function MitarbeiterListPage() {
  await requireAdminOrVerwaltung();
  const [employees, caseCounts] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.case.groupBy({
      by: ["assignedEmployeeId"],
      where: { archived: false, status: { not: "COMPLETED" } },
      _count: true,
    }),
  ]);

  const casesByEmployee = new Map(caseCounts.map((c) => [c.assignedEmployeeId, c._count]));
  const adminCount = employees.filter((e) => e.role === "ADMIN").length;
  const fachkraftCount = employees.filter((e) => e.role === "EMPLOYEE").length;
  const totalActiveCases = caseCounts.reduce((sum, c) => sum + c._count, 0);
  const avgCasesPerEmployee = employees.length > 0 ? totalActiveCases / employees.length : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Mitarbeiter</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{employees.length} Mitarbeiter im Team. Konten werden deaktiviert statt gelöscht.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ProsKpiCard icon={<IconPeople />} value={employees.length} label="Gesamt Mitarbeiter" />
        <ProsKpiCard icon={<IconShield />} value={adminCount} label="Admins" />
        <ProsKpiCard icon={<IconBriefcase />} value={fachkraftCount} label="Fachkräfte" />
        <ProsKpiCard icon={<IconChart />} value={avgCasesPerEmployee.toFixed(1)} label="Ø Fälle pro Mitarbeiter" />
      </div>

      <NewEmployeeForm />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {employees.map((e, i) => {
          const color = PALETTE[i % PALETTE.length];
          const soft = SOFT_PALETTE[i % SOFT_PALETTE.length];
          const avatarText = AVATAR_TEXT_PALETTE[i % AVATAR_TEXT_PALETTE.length];
          return (
            <Link
              key={e.id}
              href={`/mitarbeiter/${e.id}/stammdaten`}
              className="flex flex-col gap-4 rounded-[var(--pros-r-md)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] p-5 shadow-[var(--pros-shadow)] transition-[transform,box-shadow] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:shadow-[var(--pros-shadow-hover)]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{ background: color, color: avatarText }}
                >
                  {initials(e.name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[14.5px] font-semibold text-[var(--color-text)]">{e.name}</div>
                  <div className="truncate text-xs text-[var(--color-text-muted)]">{e.email}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Petrol-Text statt der gesättigten Palettenfarbe selbst - Gold-Text auf Gold-Soft
                    (~1.7:1) und Salbei-Text auf Primary-Soft (~2.3:1) unterschritten WCAG AA. */}
                <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: soft, color: "var(--color-primary)" }}>
                  {ROLE_LABELS[e.role] ?? e.role}
                </span>
                <ProsStatusPill tone={e.active ? "active" : "archived"}>{e.active ? "Aktiv" : "Deaktiviert"}</ProsStatusPill>
                <span className="text-xs text-[var(--color-text-muted)]">{casesByEmployee.get(e.id) ?? 0} aktive Fälle</span>
              </div>
            </Link>
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

function IconPeople() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="18" cy="9" r="2.7" />
      <path d="M15 20c0-2.6 1.6-4.6 4-5.2" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10" />
      <path d="M12 20V4" />
      <path d="M20 20v-7" />
    </svg>
  );
}
