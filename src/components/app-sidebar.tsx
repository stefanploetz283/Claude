"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type ChildItem = { href: string; label: string };
type NavEntry = { href: string; label: string; icon: React.ReactNode; children?: ChildItem[] };

const ROLE_LABELS = { ADMIN: "Administrator", EMPLOYEE: "Fachkraft", VERWALTUNG: "Verwaltung" } as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
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

/**
 * Einzige, durchgehende linke Navigationsspalte - ersetzt die frühere Kombination aus oberer
 * Tableiste (nav.tsx) und einer zweiten, kontextuellen Sidebar, die je nach Route ausgetauscht wurde
 * (Sidebar/MitarbeiterSubnav/FinanzenSubnav/CalendarSubnav). Admin-Unterpunkte klappen jetzt direkt
 * unter ihrem Hauptpunkt in derselben Spalte auf, statt eine zweite Spalte zu öffnen.
 */
export function AppSidebar({
  role,
  unreadCount,
  logoUrl,
  practiceName,
  userName,
}: {
  role: "ADMIN" | "EMPLOYEE" | "VERWALTUNG";
  unreadCount: number;
  logoUrl: string | null;
  practiceName: string;
  userName: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = role === "ADMIN";
  const isVerwaltung = role === "VERWALTUNG";

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
  const finanzenEntry: NavEntry = {
    href: "/finanzen",
    label: "Finanzen",
    icon: <IconFinanzen />,
    children: [
      { href: "/finanzen/rechnungen", label: "Rechnungen" },
      { href: "/finanzen/sammel-export", label: "Sammel-Export" },
      { href: "/finanzen/statistik", label: "Statistik" },
      { href: "/finanzen/cockpit", label: "Cockpit" },
      { href: "/finanzen/budgetrechner", label: "Budgetrechner" },
    ],
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
        {
          href: "/admin/team-uebersicht",
          label: "Verwaltung",
          icon: <IconVerwaltung />,
          // Freigaben (Falldokumentation) und Abschlussbericht (fallgebunden) bewusst nicht für
          // Verwaltung - sonst wäre "keine Fälle sehen" nur eine halbe Regel.
          children: [
            { href: "/admin/team-uebersicht", label: "Team-Gesamtansicht" },
            { href: "/admin/fahrtenrechner", label: "Fahrten-/Fallrechner" },
            { href: "/admin/help-types", label: "Angebotskatalog" },
            { href: "/admin/access-log", label: "Zugriffsprotokoll" },
            { href: "/admin/settings", label: "Einstellungen" },
          ],
        },
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
              {
                href: "/admin/team-uebersicht",
                label: "Verwaltung",
                icon: <IconVerwaltung />,
                children: [
                  { href: "/admin/team-uebersicht", label: "Team-Gesamtansicht" },
                  { href: "/admin/fahrtenrechner", label: "Fahrten-/Fallrechner" },
                  { href: "/admin/approvals", label: "Freigaben" },
                  { href: "/admin/help-types", label: "Angebotskatalog" },
                  { href: "/admin/abschlussbericht", label: "Abschlussbericht" },
                  { href: "/admin/access-log", label: "Zugriffsprotokoll" },
                  { href: "/admin/settings", label: "Einstellungen" },
                ],
              },
            ] satisfies NavEntry[])
          : []),
      ];

  const brand = (
    <Link href="/heute" className="flex shrink-0 items-center gap-3" onClick={() => setMobileOpen(false)}>
      {logoUrl ? (
        <div className="rounded-lg bg-[var(--color-bg)] px-3 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={practiceName} className="h-auto w-[130px] object-contain" />
        </div>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark-color.svg" alt="" className="h-10 w-10 shrink-0" />
          <div className="text-left leading-tight text-white">
            <div className="text-[16px] font-bold tracking-tight">PROS.</div>
            <div className="text-[9.5px] font-semibold tracking-[0.14em] text-[var(--color-gold)] uppercase">Jugendhilfe</div>
          </div>
        </>
      )}
    </Link>
  );

  const navList = (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
      {entries.map((entry) => {
        const active = isActive(pathname, entry.href) || entry.children?.some((c) => isActive(pathname, c.href));
        const showChildren = active && entry.children && entry.children.length > 0;
        return (
          <div key={entry.href}>
            <Link
              href={entry.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-[13.5px] font-medium transition ${
                active ? "bg-white/16 font-semibold text-white" : "text-[#EDE7DA] hover:bg-white/8"
              }`}
            >
              {entry.icon}
              <span className="min-w-0 flex-1 truncate">{entry.label}</span>
              {entry.children && <span className={`transition ${showChildren ? "rotate-90" : ""}`}><IconChevron /></span>}
            </Link>
            {showChildren && (
              <div className="mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-white/15 pl-3.5 ml-[19px]">
                {entry.children!.map((child) => {
                  const childActive = isActive(pathname, child.href);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setMobileOpen(false)}
                      className={`rounded-[8px] px-3 py-2 text-[13px] transition ${
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
    <div className="flex flex-col gap-3 border-t border-white/12 pt-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-sage)] text-[13px] font-semibold text-white">
          {initials(userName)}
        </div>
        <div className="min-w-0 leading-[1.2]">
          <div className="truncate text-[13px] font-bold text-white">{userName}</div>
          <div className="text-[11px] text-[#EDE7DA]/70">{ROLE_LABELS[role]}</div>
        </div>
      </div>
      {!isVerwaltung && (
        <Link
          href="/bonus"
          onClick={() => setMobileOpen(false)}
          className={`-mt-1 flex items-center gap-2 rounded-[9px] px-2.5 py-1.5 text-[12.5px] font-medium transition ${
            isActive(pathname, "/bonus") ? "bg-white/16 text-white" : "text-[#EDE7DA]/85 hover:bg-white/8"
          }`}
        >
          <IconBonus />
          Meine Bonusübersicht
        </Link>
      )}
      <div className="flex items-center gap-1.5">
        <Link
          href="/messages"
          onClick={() => setMobileOpen(false)}
          className="relative flex h-9 w-9 items-center justify-center rounded-[9px] text-[#EDE7DA] transition hover:bg-white/8"
          aria-label="Nachrichten"
        >
          <IconBell />
          {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 h-[7px] w-[7px] rounded-full bg-[var(--color-gold)]" />}
        </Link>
        {isAdmin && (
          <Link
            href="/interim"
            onClick={() => setMobileOpen(false)}
            className={`flex flex-1 items-center justify-center rounded-[9px] border px-2.5 py-2 text-[12px] font-medium transition ${
              pathname.startsWith("/interim")
                ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-white"
                : "border-[var(--color-gold)] text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-white"
            }`}
            title="Übergangslösung bis zur Praxiseröffnung am 1.11."
          >
            Interim
          </Link>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex flex-1 items-center justify-center rounded-[9px] border border-white/20 px-2.5 py-2 text-[12px] font-medium text-[#EDE7DA] transition hover:bg-white/8"
        >
          Abmelden
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: durchgehende, immer sichtbare Spalte */}
      <aside className="relative hidden w-[280px] flex-none flex-col gap-5 overflow-hidden bg-[var(--color-primary)] px-4 py-5 lg:flex">
        {brand}
        {navList}
        {accountBlock}
      </aside>

      {/* Mobil: schmale Kopfzeile + ausklappbares Vollbild-Menü */}
      <div className="flex items-center justify-between gap-3 bg-[var(--color-primary)] px-4 py-3 lg:hidden">
        {brand}
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/messages" className="relative flex h-10 w-10 items-center justify-center text-white" aria-label="Nachrichten">
            <IconBell />
            {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 h-[7px] w-[7px] rounded-full bg-[var(--color-gold)]" />}
          </Link>
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
        <div className="flex max-h-[calc(100dvh-60px)] flex-col gap-5 overflow-y-auto bg-[var(--color-primary)] px-4 pb-5 lg:hidden">
          {navList}
          {accountBlock}
        </div>
      )}
    </>
  );
}
