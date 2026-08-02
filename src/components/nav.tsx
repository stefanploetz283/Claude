"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type NavItem = { href: string; label: string; icon: React.ReactNode };

const ICONS = {
  faelle: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  kalender: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  ),
  zeit: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  ),
  urlaub: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V12" />
      <path d="M12 12c0-5 4-8 9-8-1 5-4 8-9 8Z" />
      <path d="M12 13c0-4-3-7-8-7 1 4 3 7 8 7Z" />
    </svg>
  ),
  fachbox: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V6a2 2 0 0 1 2-2h6l2 3h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
    </svg>
  ),
  nachrichten: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
    </svg>
  ),
  export: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  ),
  statistik: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="20" x2="5" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="19" y1="20" x2="19" y2="14" />
    </svg>
  ),
  mitarbeiter: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="18" cy="9" r="2.7" />
      <path d="M15 20c0-2.6 1.6-4.6 4-5.2" />
    </svg>
  ),
  mikrofon: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  ),
  rechnung: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
      <path d="M9 13h6M9 17h6M9 9h2" />
    </svg>
  ),
  kapazitaet: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l4-5 4 3 5-7 5 4" />
      <path d="M3 21h18" />
    </svg>
  ),
};

const EMPLOYEE_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Fälle", icon: ICONS.faelle },
  { href: "/voice-entry", label: "Sprachdokumentation", icon: ICONS.mikrofon },
  { href: "/kapazitaet", label: "Kapazität", icon: ICONS.kapazitaet },
  { href: "/calendar", label: "Kalender", icon: ICONS.kalender },
  { href: "/time-tracking", label: "Zeiterfassung", icon: ICONS.zeit },
  { href: "/absences", label: "Urlaub/Abwesenheit", icon: ICONS.urlaub },
  { href: "/knowledge-base", label: "Fachbox", icon: ICONS.fachbox },
  { href: "/messages", label: "Nachrichten", icon: ICONS.nachrichten },
  { href: "/reports", label: "Sammel-Export", icon: ICONS.export },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: "/rechnungen", label: "Rechnungen", icon: ICONS.rechnung },
  { href: "/statistics", label: "Statistik", icon: ICONS.statistik },
  { href: "/admin/employees", label: "Mitarbeiter", icon: ICONS.mitarbeiter },
];

// Verwaltung sieht bewusst keine fachliche Dokumentation - eigener, reduzierter Navigationsumfang.
const VERWALTUNG_ITEMS: NavItem[] = [
  { href: "/rechnungen", label: "Rechnungen", icon: ICONS.rechnung },
  { href: "/kapazitaet", label: "Kapazität", icon: ICONS.kapazitaet },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function Nav({
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
  const items = role === "ADMIN" ? [...EMPLOYEE_ITEMS, ...ADMIN_ITEMS] : role === "VERWALTUNG" ? VERWALTUNG_ITEMS : EMPLOYEE_ITEMS;

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-surface)] shadow-[0_1px_0_var(--color-border)]">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-7 px-5 py-2.5">
        <Link href="/dashboard" className="flex shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl ?? "/logo-lockup.png"} alt={practiceName} className="h-14 w-auto object-contain" />
        </Link>

        <nav className="flex flex-1 flex-wrap items-center gap-0.5">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-2xl px-3.5 py-2 text-[11.5px] font-medium whitespace-nowrap transition ${
                  active
                    ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-primary-soft)]/60 hover:text-[var(--color-primary)]"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-4">
          <Link href="/messages" className="relative text-[var(--color-text-muted)] transition hover:text-[var(--color-primary)]" aria-label="Nachrichten">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-coral)] text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--color-text)]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-[13px] text-white">
              {initials(userName)}
            </div>
            {userName}
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-[var(--radius-control)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]"
          >
            Abmelden
          </button>
        </div>
      </div>
      <div className="h-[1.5px] w-full bg-[var(--color-gold)]" />
    </header>
  );
}
