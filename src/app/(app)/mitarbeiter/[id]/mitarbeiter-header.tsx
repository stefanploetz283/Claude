"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProsStatusPill } from "@/components/pros/pros-status-pill";

const ROLE_LABELS: Record<string, string> = { ADMIN: "Admin", EMPLOYEE: "Fachkraft", VERWALTUNG: "Verwaltung" };

// "Fälle" ist serverseitig auf requireAdmin() beschränkt (die anderen vier Tabs erlauben
// requireAdminOrVerwaltung()) - der Tab darf einer Verwaltungs-Ansicht daher nicht angezeigt werden,
// sonst führt er ins Leere (Redirect nach /heute). Steuerung ausschließlich über die bereits
// vorhandene Rolle des eingeloggten Betrachters (viewerRole), keine neue Berechtigungslogik.
const ALL_TABS = [
  { segment: "stammdaten", label: "Stammdaten" },
  { segment: "vertrag", label: "Vertrag" },
  { segment: "bonus", label: "Bonus" },
  { segment: "dokumente", label: "Dokumente" },
  { segment: "faelle", label: "Fälle", adminOnly: true },
];

// Gemeinsamer Kopf + Tab-Navigation für die Mitarbeiterdetail-Unterseiten (bisher hatte jede der 5
// Unterseiten ihre eigene, uneinheitliche <h1>-Zeile und keine sichtbare Navigation zwischen ihnen -
// selbes Muster wie CaseTabs/ZeitKapazitaetTabs, keine neue Route, keine neue Fachlogik.
export function MitarbeiterHeader({
  id,
  name,
  role,
  active,
  viewerRole,
}: {
  id: string;
  name: string;
  role: string;
  active: boolean;
  /** Rolle des eingeloggten Betrachters (nicht die des angezeigten Mitarbeiters) - steuert, welche
   * Tabs überhaupt sichtbar sind, siehe ALL_TABS. */
  viewerRole: string;
}) {
  const pathname = usePathname();
  const tabs = ALL_TABS.filter((t) => !t.adminOnly || viewerRole === "ADMIN");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/mitarbeiter" className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-primary)]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Zurück zu Mitarbeiter
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">{name}</h1>
          <ProsStatusPill tone="stable">{ROLE_LABELS[role] ?? role}</ProsStatusPill>
          <ProsStatusPill tone={active ? "active" : "archived"}>{active ? "Aktiv" : "Deaktiviert"}</ProsStatusPill>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-[var(--pros-border-default)]">
        {tabs.map((t) => {
          const href = `/mitarbeiter/${id}/${t.segment}`;
          const tabActive = pathname === href;
          return (
            <Link
              key={t.segment}
              href={href}
              aria-current={tabActive ? "page" : undefined}
              className={`shrink-0 rounded-t-[var(--pros-r-sm)] px-4 py-2.5 text-[13.5px] transition-colors duration-[170ms] ease-[var(--pros-ease)] ${
                tabActive
                  ? "border-b-2 border-[var(--color-primary)] font-semibold text-[var(--color-primary)]"
                  : "font-medium text-[var(--color-text-muted)] hover:bg-[var(--pros-sage-pale)]/40 hover:text-[var(--color-text)]"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
