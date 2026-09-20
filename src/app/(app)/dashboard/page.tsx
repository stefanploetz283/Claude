import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getRemainingHoursBulk } from "@/lib/case-helpers";
import { getSettings } from "@/lib/settings";
import type { CaseStatus, Prisma } from "@prisma/client";
import { CaseCard } from "./case-card";

/**
 * "Fälle" - die vollständige, persönliche Fallliste (eigene zugewiesene/vertretene Fälle, alle Rollen
 * inkl. Admin). Die Begrüßung/Tagesübersicht liegt separat unter /heute, die rollenübergreifende
 * Gesamtübersicht mit Mitarbeiter-Filter unter /admin/alle-faelle.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const settings = await getSettings();

  const ownVisibility: Prisma.CaseWhereInput = { OR: [{ assignedEmployeeId: user.id }, { substituteEmployeeId: user.id }] };

  const helpTypes = await prisma.helpType.findMany({ orderBy: { name: "asc" } });

  const showArchived = params.archived === "1";
  const where: Prisma.CaseWhereInput = {
    archived: showArchived,
    ...ownVisibility,
  };

  if (params.status) where.status = params.status as CaseStatus;
  if (params.helpTypeId) where.helpTypeId = params.helpTypeId;

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

  const caseRows = cases.map((c) => {
    const usedHours = remainingMap.get(c.id) ?? 0;
    const contingent = c.hoursContingent.toNumber();
    const remaining = contingent - usedHours;
    const remainingPercent = contingent > 0 ? (remaining / contingent) * 100 : 0;
    return { case: c, remaining, contingent, remainingPercent, warn: remainingPercent <= threshold };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">{showArchived ? "Archivierte Fälle" : "Fälle"}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{cases.length} Fälle gefunden.</p>
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
        <Link
          href={showArchived ? "/dashboard" : "/dashboard?archived=1"}
          className="ml-auto inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]"
        >
          <ArchiveIcon />
          {showArchived ? "Zu aktiven Fällen" : "Archiv"}
        </Link>
        <Link
          href="/cases/new"
          className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)]"
        >
          + Neue Hilfe anlegen
        </Link>
      </form>

      {caseRows.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {caseRows.map(({ case: c, remaining, contingent, remainingPercent, warn }, index) => (
            <CaseCard
              key={c.id}
              caseId={c.id}
              clientName={`${c.client.lastName}, ${c.client.firstName}`}
              helpTypeName={c.helpType.name}
              substituteName={c.substituteEmployee?.name ?? null}
              status={c.status}
              remaining={remaining}
              contingent={contingent}
              remainingPercent={remainingPercent}
              warn={warn}
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-16 text-center shadow-[var(--shadow-soft)]">
          <EmptyStateIcon />
          <p className="font-medium text-[var(--color-text)]">{showArchived ? "Keine archivierten Fälle." : "Aktuell keine Fälle gefunden."}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Erstellen Sie eine neue Hilfe oder passen Sie Ihre Filterkriterien an.</p>
        </div>
      )}
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
