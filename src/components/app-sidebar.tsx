"use client";

import { useActionState, useRef, useState, startTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { updateOwnAvatar, type AvatarActionState } from "../app/(app)/dashboard/actions";

// adminOnly spiegelt den serverseitigen Route-Guard (requireAdmin) - solche Unterpunkte werden der Rolle
// VERWALTUNG nicht angezeigt, weil ihre Zielroute sie serverseitig wieder auf /heute umleiten würde.
// Die Guards selbst (src/lib/rbac.ts + jeweilige page.tsx) bleiben die maßgebliche Quelle.
type ChildItem = { href: string; label: string; adminOnly?: boolean };
type NavEntry = { href: string; label: string; icon: React.ReactNode; children?: ChildItem[] };

const ROLE_LABELS = { ADMIN: "Administrator", EMPLOYEE: "Fachkraft", VERWALTUNG: "Verwaltung" } as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

// aria-current: "page" auf dem Link der aktuellen Seite, "true" auf einem Hauptpunkt, dessen Unterpunkt aktiv ist.
function currentAttr(pathname: string, href: string, children?: { href: string }[]): "page" | "true" | undefined {
  if (isActive(pathname, href)) return "page";
  return children?.some((c) => isActive(pathname, c.href)) ? "true" : undefined;
}

// ---------- Icons (ein Satz, konsistente Strichstärke) ----------
function IconHeute() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}
function IconAufgaben() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 12.5l2.5 2.5L16 9" />
    </svg>
  );
}
function IconFaelle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
function IconZeit() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}
function IconKalender() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  );
}
function IconFachbox() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V6a2 2 0 0 1 2-2h6l2 3h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
    </svg>
  );
}
function IconBonus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.9 6.1 6.6.9-4.8 4.6 1.2 6.5L12 17l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z" />
    </svg>
  );
}
function IconMitarbeiter() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="18" cy="9" r="2.7" />
      <path d="M15 20c0-2.6 1.6-4.6 4-5.2" />
    </svg>
  );
}
function IconFinanzen() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M15 8.5c-.6-.7-1.7-1.2-3-1.2-2 0-3.5 1.2-3.5 2.8S10 12.9 12 13.2c2 .3 3.5 1 3.5 2.8S13.9 18.7 12 18.7c-1.3 0-2.4-.5-3-1.2" />
      <line x1="12" y1="5.5" x2="12" y2="7.3" />
      <line x1="12" y1="18.7" x2="12" y2="20.5" />
    </svg>
  );
}
function IconVerwaltung() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15 1.65 1.65 0 0 0 3.09 14H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}
function IconChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function IconCamera() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="14" r="3.3" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

/**
 * Einzige, durchgehende linke Navigationsspalte - ersetzt die frühere Kombination aus oberer
 * Tableiste (nav.tsx) und einer zweiten, kontextuellen Sidebar, die je nach Route ausgetauscht wurde
 * (Sidebar/MitarbeiterSubnav/FinanzenSubnav/CalendarSubnav). Admin-Unterpunkte klappen jetzt direkt
 * unter ihrem Hauptpunkt in derselben Spalte auf, statt eine zweite Spalte zu öffnen.
 *
 * Visuelle Umsetzung nach design/PROS-DESIGN-SYSTEM.md (Abschnitt 10 App Shell): 230px volle Breite
 * ab xl (1280px), 86px Icon-Rail zwischen lg/xl (1024-1279px), mobile Topbar+Drawer darunter -
 * identisch zu den Breakpoints der Referenz. Die Rollenlogik (welcher Eintrag für wen sichtbar ist)
 * bleibt unverändert gegenüber der bisherigen Fassung.
 */
export function AppSidebar({
  role,
  unreadCount,
  logoUrl,
  practiceName,
  userName,
  avatarUrl,
}: {
  role: "ADMIN" | "EMPLOYEE" | "VERWALTUNG";
  unreadCount: number;
  logoUrl: string | null;
  practiceName: string;
  userName: string;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const isAdmin = role === "ADMIN";
  const isVerwaltung = role === "VERWALTUNG";
  // Bell nur einmal gleichzeitig sichtbar: auf /heute übernimmt die Topline der Seite die reale
  // Benachrichtigungsfunktion (gleicher Link, gleicher Unread-Punkt) statt einer zweiten Instanz hier.
  const isHeute = pathname === "/heute";

  const [avatarState, avatarFormAction] = useActionState<AvatarActionState, FormData>(updateOwnAvatar, undefined);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("avatar", file);
    startTransition(() => {
      avatarFormAction(fd);
    });
    setProfileMenuOpen(false);
  }

  const mitarbeiterMatch = pathname.match(/^\/mitarbeiter\/([^/]+)/);
  const employeeId = mitarbeiterMatch?.[1];

  // Verwaltung sieht in der Personalakte alles außer den "Fälle"-Unterpunkt (Falldokumentation).
  const mitarbeiterEntry: NavEntry = {
    href: "/mitarbeiter",
    label: "Mitarbeiter",
    icon: <IconMitarbeiter />,
    children: employeeId
      ? [
          { href: `/mitarbeiter/${employeeId}/stammdaten`, label: "Stammdaten" },
          { href: `/mitarbeiter/${employeeId}/vertrag`, label: "Vertrag & Stundenmodell" },
          ...(isVerwaltung ? [] : [{ href: `/mitarbeiter/${employeeId}/faelle`, label: "Fälle" }]),
          { href: `/mitarbeiter/${employeeId}/dokumente`, label: "Dokumente" },
          { href: `/mitarbeiter/${employeeId}/bonus`, label: "Bonus-Historie" },
        ]
      : undefined,
  };
  const forRole = (children: ChildItem[]) => (isVerwaltung ? children.filter((c) => !c.adminOnly) : children);
  const finanzenEntry: NavEntry = {
    href: "/finanzen", // leitet serverseitig auf /finanzen/rechnungen (Admin + Verwaltung) weiter
    label: "Finanzen",
    icon: <IconFinanzen />,
    children: forRole([
      { href: "/finanzen/rechnungen", label: "Rechnungen" },
      { href: "/finanzen/sammel-export", label: "Sammel-Export", adminOnly: true },
      { href: "/finanzen/statistik", label: "Statistik", adminOnly: true },
      { href: "/finanzen/cockpit", label: "Cockpit", adminOnly: true },
      { href: "/finanzen/budgetrechner", label: "Budgetrechner" },
    ]),
  };
  // Freigaben und Abschlussbericht (fallgebunden) sind bewusst nicht für Verwaltung - sonst wäre "keine
  // Fälle sehen" nur eine halbe Regel. Der Hauptpunkt verlinkt auf den ersten für die Rolle erlaubten
  // Unterpunkt (Admin: Team-Gesamtansicht, Verwaltung: Fahrten-/Fallrechner).
  const verwaltungChildren = forRole([
    { href: "/admin/team-uebersicht", label: "Team-Gesamtansicht", adminOnly: true },
    { href: "/admin/fahrtenrechner", label: "Fahrten-/Fallrechner" },
    { href: "/admin/approvals", label: "Freigaben", adminOnly: true },
    { href: "/admin/help-types", label: "Angebotskatalog", adminOnly: true },
    { href: "/admin/abschlussbericht", label: "Abschlussbericht", adminOnly: true },
    { href: "/admin/access-log", label: "Zugriffsprotokoll", adminOnly: true },
    { href: "/admin/settings", label: "Einstellungen", adminOnly: true },
  ]);
  const verwaltungEntry: NavEntry = {
    href: verwaltungChildren[0].href,
    label: "Verwaltung",
    icon: <IconVerwaltung />,
    children: verwaltungChildren,
  };
  const kalenderEntryVoll: NavEntry = {
    href: "/calendar",
    label: "Kalender",
    icon: <IconKalender />,
    children: [
      { href: "/calendar/wochenvorlagen", label: "Wochenvorlagen" },
      { href: "/calendar/raeume", label: "Räume" },
    ],
  };

  const entries: NavEntry[] = isVerwaltung
    ? [
        { href: "/heute", label: "Heute", icon: <IconHeute /> },
        { href: "/aufgaben", label: "Aufgaben", icon: <IconAufgaben /> },
        kalenderEntryVoll,
        { href: "/zeit-kapazitaet", label: "Zeit & Kapazität", icon: <IconZeit /> },
        { href: "/knowledge-base", label: "Fachbox", icon: <IconFachbox /> },
        mitarbeiterEntry,
        finanzenEntry,
        verwaltungEntry,
      ]
    : [
        { href: "/heute", label: "Heute", icon: <IconHeute /> },
        isAdmin
          ? {
              href: "/dashboard",
              label: "Fälle",
              icon: <IconFaelle />,
              children: [
                { href: "/dashboard", label: "Meine Fälle" },
                { href: "/admin/alle-faelle", label: "Alle Fälle" },
              ],
            }
          : { href: "/dashboard", label: "Fälle", icon: <IconFaelle /> },
        { href: "/aufgaben", label: "Aufgaben", icon: <IconAufgaben /> },
        isAdmin ? kalenderEntryVoll : { href: "/calendar", label: "Kalender", icon: <IconKalender /> },
        { href: "/zeit-kapazitaet", label: "Zeit & Kapazität", icon: <IconZeit /> },
        { href: "/knowledge-base", label: "Fachbox", icon: <IconFachbox /> },
        ...(isAdmin
          ? ([
              mitarbeiterEntry,
              finanzenEntry,
              verwaltungEntry,
            ] satisfies NavEntry[])
          : []),
      ];

  const brand = (
    <Link href="/heute" className="mb-[18px] flex shrink-0 items-center justify-center gap-3 xl:justify-start" onClick={() => setMobileOpen(false)}>
      {logoUrl ? (
        <div className="rounded-lg bg-[var(--color-bg)] px-2 py-1.5 xl:px-3 xl:py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={practiceName} className="h-auto w-11 object-contain xl:w-[130px]" />
        </div>
      ) : (
        <>
          {/* Icon-Rail (lg, 86px): nur die O-Marke, funktioniert bereits farblich auf Petrol.
              Volle Breite (xl) + Mobil-Topbar: offizielle Negativ-Variante des vollen Wortmarks -
              direkt auf der Petrol-Fläche, kein Warmweiß-Container, Seitenverhältnis erhalten. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark-color.svg" alt="" className="h-10 w-10 shrink-0 xl:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-lockup-negative.png" alt={practiceName} className="hidden h-auto w-[150px] object-contain xl:block" />
        </>
      )}
    </Link>
  );

  const searchField = (
    // Salbei-Deckkraft von /70 auf /45 reduziert: gemessen (echter Screenshot-Pixel-Sample, nicht nur
    // berechnet) ergab bei /70 auf dem Petrol-Gradient effektiv nur ~3.2:1 für den Placeholder und
    // ~3.8:1 für Text (WCAG AA braucht 4.5:1) - Salbei bleibt sichtbar, nur etwas dunkler/dichter.
    // Placeholder zusätzlich von /85 auf voll deckend, da das Feld dauerhaft disabled ist und der
    // Placeholder der einzige je sichtbare Text ist (kein Unterscheidungsbedarf zu echtem Text).
    <label className="mb-[18px] flex h-12 shrink-0 items-center gap-2.5 rounded-[14px] border border-white/12 bg-[var(--color-sage)]/45 px-3.5 text-white xl:justify-start justify-center xl:px-3.5 px-0">
      <span className="shrink-0 opacity-90">
        <IconSearch />
      </span>
      {/* Phase 1: rein visuelles Suchfeld nach Design-System (Abschnitt 4/10) - keine echte
          Such-/Filterfunktion in der App vorhanden, deshalb hier bewusst ohne Funktion und ohne
          ⌘K-Hinweis (der eine globale Suche suggerieren würde, die es nicht gibt). */}
      <input
        placeholder="Suchen..."
        disabled
        aria-hidden="true"
        tabIndex={-1}
        className="hidden min-w-0 flex-1 bg-transparent text-[13px] text-white placeholder:text-white outline-none xl:block"
      />
    </label>
  );

  const navList = (
    <nav aria-label="Hauptnavigation" className="flex flex-1 flex-col gap-1 overflow-y-auto">
      {entries.map((entry) => {
        const active = isActive(pathname, entry.href) || entry.children?.some((c) => isActive(pathname, c.href));
        const showChildrenFiltered = active && entry.children && entry.children.length > 0;
        return (
          <div key={entry.href}>
            <Link
              href={entry.href}
              aria-current={currentAttr(pathname, entry.href, entry.children)}
              onClick={() => setMobileOpen(false)}
              title={entry.label}
              className={`flex min-h-12 items-center gap-3.5 rounded-[13px] px-3.5 text-[14px] font-medium transition-[background-color,transform] duration-[170ms] ease-[var(--pros-ease)] xl:justify-start justify-center xl:px-3.5 ${
                active ? "bg-[var(--color-bg)] font-semibold text-[var(--color-primary)] shadow-[0_6px_16px_rgba(3,32,37,0.10)]" : "text-white/94 hover:translate-x-0.5 hover:bg-white/9"
              }`}
            >
              {entry.icon}
              <span className="hidden min-w-0 flex-1 truncate xl:inline">{entry.label}</span>
              {entry.children && (
                <span className={`hidden transition-transform xl:inline ${showChildrenFiltered ? "rotate-90" : ""}`}>
                  <IconChevron />
                </span>
              )}
            </Link>
            {showChildrenFiltered && (
              <div className="mt-0.5 mb-1 hidden flex-col gap-0.5 border-l border-white/15 pl-3.5 ml-[19px] xl:flex">
                {entry.children!.map((child) => {
                  const childActive = isActive(pathname, child.href);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      aria-current={childActive ? "page" : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={`rounded-[8px] px-3 py-2 text-[13px] transition-colors duration-[170ms] ease-[var(--pros-ease)] ${
                        childActive ? "bg-white/12 font-semibold text-white" : "text-[#EDE7DA]/85 hover:bg-white/8"
                      }`}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  const accountBlock = (
    <div className="relative flex flex-col gap-3 border-t border-white/12 pt-4">
      <div className="flex items-center justify-center gap-2.5 xl:justify-start">
        <div className="group relative shrink-0">
          <button
            type="button"
            onClick={() => setProfileMenuOpen((open) => !open)}
            aria-label="Profilmenü öffnen"
            aria-expanded={profileMenuOpen}
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-white/70 bg-[var(--color-sage)] text-[13px] font-semibold text-[var(--color-text)] transition-[border-color,transform] duration-200 ease-[var(--pros-ease)] group-hover:border-white active:scale-[0.96] active:duration-100"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(userName)
            )}
          </button>
          {profileMenuOpen && (
            <>
              <button
                type="button"
                aria-label="Menü schließen"
                onClick={() => setProfileMenuOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div className="absolute bottom-[calc(100%+8px)] left-0 z-20 w-[196px] rounded-[16px] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] p-2 text-[var(--color-text)] shadow-[var(--pros-shadow-popover)]">
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="flex min-h-[42px] w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-[13px] transition-colors hover:bg-[var(--pros-sage-pale)]"
                >
                  <IconCamera />
                  Profilbild ändern
                </button>
                {avatarState?.error && <p className="px-2.5 pt-1 pb-0.5 text-xs font-medium text-[var(--pros-status-critical-text)]">{avatarState.error}</p>}
              </div>
            </>
          )}
          <input ref={avatarFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div className="hidden min-w-0 leading-[1.2] xl:block">
          <div className="truncate text-[13px] font-bold text-white">{userName}</div>
          <div className="text-[11px] text-[#EDE7DA]/70">{ROLE_LABELS[role]}</div>
        </div>
      </div>
      {!isVerwaltung && (
        <Link
          href="/bonus"
          aria-current={isActive(pathname, "/bonus") ? "page" : undefined}
          onClick={() => setMobileOpen(false)}
          title="Meine Bonusübersicht"
          className={`-mt-1 hidden items-center gap-2 rounded-[9px] px-2.5 py-1.5 text-[12.5px] font-medium transition-colors xl:flex ${
            isActive(pathname, "/bonus") ? "bg-white/16 text-white" : "text-[#EDE7DA]/85 hover:bg-white/8"
          }`}
        >
          <IconBonus />
          Meine Bonusübersicht
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-center gap-1.5 xl:justify-start">
        {!isHeute && (
          <Link
            href="/messages"
            onClick={() => setMobileOpen(false)}
            className="relative flex h-9 w-9 items-center justify-center rounded-[9px] text-[#EDE7DA] transition-colors hover:bg-white/8"
            aria-label="Nachrichten"
          >
            <IconBell />
            {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 h-[7px] w-[7px] rounded-full bg-[var(--color-gold)]" />}
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/interim"
            onClick={() => setMobileOpen(false)}
            title="Interim - Übergangslösung bis zur Praxiseröffnung am 1.11."
            className={`hidden flex-1 items-center justify-center rounded-[9px] border px-2.5 py-2 text-[12px] font-medium transition-colors xl:flex ${
              pathname.startsWith("/interim")
                ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-[var(--color-primary)]"
                : "border-[var(--color-gold)] text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-[var(--color-primary)]"
            }`}
          >
            Interim
          </Link>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Abmelden"
          aria-label="Abmelden"
          className="hidden flex-1 items-center justify-center rounded-[9px] border border-white/20 px-2.5 py-2 text-[12px] font-medium text-[#EDE7DA] transition-colors hover:bg-white/8 xl:flex"
        >
          Abmelden
        </button>
      </div>
    </div>
  );

  // Petrol-Gradient wird aus dem (ggf. praxis-individuellen) --color-primary abgeleitet, damit die
  // bestehende Settings-basierte Marken-Farbe (Admin > Einstellungen) weiter funktioniert, statt einen
  // festen Petrol-Ton hart zu verdrahten.
  const sidebarBackground: React.CSSProperties = {
    background:
      "radial-gradient(125% 32% at 0% 76%, rgba(138,161,135,.22), transparent 52%), " +
      "linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 84%, white) 0%, var(--color-primary) 56%, color-mix(in srgb, var(--color-primary) 92%, black) 100%)",
  };

  return (
    <>
      {/* Desktop: durchgehende, immer sichtbare Spalte - 86px Icon-Rail (lg) bis 230px voll (xl) */}
      <aside
        style={sidebarBackground}
        className="relative hidden w-[86px] flex-none flex-col overflow-hidden px-[10px] pt-[27px] pb-[22px] lg:flex xl:w-[230px] xl:px-[15px]"
      >
        {brand}
        {searchField}
        {navList}
        {accountBlock}
      </aside>

      {/* Mobil: schmale Kopfzeile + ausklappbares Vollbild-Menü */}
      <div style={sidebarBackground} className="flex items-center justify-between gap-3 px-4 py-3 lg:hidden">
        <Link href="/heute" className="flex shrink-0 items-center gap-3" onClick={() => setMobileOpen(false)}>
          {logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={logoUrl} alt={practiceName} className="h-9 w-auto max-w-[130px] object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logo-lockup-negative.png" alt={practiceName} className="h-9 w-auto object-contain" />
          )}
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {!isHeute && (
            <Link href="/messages" className="relative flex h-10 w-10 items-center justify-center text-white" aria-label="Nachrichten">
              <IconBell />
              {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 h-[7px] w-[7px] rounded-full bg-[var(--color-gold)]" />}
            </Link>
          )}
          <button
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={mobileOpen}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
          >
            {mobileOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div
          style={sidebarBackground}
          className={`flex max-h-[calc(100dvh-60px)] flex-col gap-5 overflow-y-auto px-4 lg:hidden ${isVerwaltung ? "pb-5" : "pb-[150px]"}`}
        >
          <label className="flex h-12 shrink-0 items-center gap-2.5 rounded-[14px] border border-white/12 bg-[var(--color-sage)]/45 px-3.5 text-white">
            <IconSearch />
            <input placeholder="Suchen..." disabled aria-hidden="true" tabIndex={-1} className="min-w-0 flex-1 bg-transparent text-[13px] text-white placeholder:text-white outline-none" />
          </label>
          <nav aria-label="Hauptnavigation" className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {entries.map((entry) => {
              const active = isActive(pathname, entry.href) || entry.children?.some((c) => isActive(pathname, c.href));
              return (
                <div key={entry.href}>
                  <Link
                    href={entry.href}
                    aria-current={currentAttr(pathname, entry.href, entry.children)}
                    onClick={() => setMobileOpen(false)}
                    className={`flex min-h-12 items-center gap-3.5 rounded-[13px] px-3.5 text-[14px] font-medium transition-colors ${
                      active ? "bg-[var(--color-bg)] font-semibold text-[var(--color-primary)]" : "text-white/94 hover:bg-white/9"
                    }`}
                  >
                    {entry.icon}
                    <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                  </Link>
                  {active && entry.children && entry.children.length > 0 && (
                    <div className="mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-white/15 pl-3.5 ml-[19px]">
                      {entry.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          aria-current={isActive(pathname, child.href) ? "page" : undefined}
                          onClick={() => setMobileOpen(false)}
                          className={`rounded-[8px] px-3 py-2 text-[13px] transition-colors ${
                            isActive(pathname, child.href) ? "bg-white/12 font-semibold text-white" : "text-[#EDE7DA]/85 hover:bg-white/8"
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          <div className="flex flex-col gap-3 border-t border-white/12 pt-4">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => avatarFileInputRef.current?.click()}
                aria-label="Profilbild ändern"
                className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/70 bg-[var(--color-sage)] text-[13px] font-semibold text-[var(--color-text)]"
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(userName)
                )}
              </button>
              <div className="min-w-0 leading-[1.2]">
                <div className="truncate text-[13px] font-bold text-white">{userName}</div>
                <div className="text-[11px] text-[#EDE7DA]/70">{ROLE_LABELS[role]}</div>
              </div>
            </div>
            {!isVerwaltung && (
              <Link href="/bonus" aria-current={isActive(pathname, "/bonus") ? "page" : undefined} onClick={() => setMobileOpen(false)} className="-mt-1 flex items-center gap-2 rounded-[9px] px-2.5 py-1.5 text-[12.5px] font-medium text-[#EDE7DA]/85 hover:bg-white/8">
                <IconBonus />
                Meine Bonusübersicht
              </Link>
            )}
            <div className="flex items-center gap-1.5">
              {isAdmin && (
                <Link
                  href="/interim"
                  onClick={() => setMobileOpen(false)}
                  className="flex flex-1 items-center justify-center rounded-[9px] border border-[var(--color-gold)] px-2.5 py-2 text-[12px] font-medium text-[var(--color-gold)]"
                >
                  Interim
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex flex-1 items-center justify-center rounded-[9px] border border-white/20 px-2.5 py-2 text-[12px] font-medium text-[#EDE7DA]"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
