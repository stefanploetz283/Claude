"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type NavItem = { href: string; label: string };

const EMPLOYEE_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Fälle" },
  { href: "/voice-entry", label: "Sprachdokumentation" },
  { href: "/kapazitaet", label: "Kapazität" },
  { href: "/calendar", label: "Kalender" },
  { href: "/time-tracking", label: "Zeiterfassung" },
  { href: "/absences", label: "Urlaub/Abwesenheit" },
  { href: "/knowledge-base", label: "Fachbox" },
  { href: "/messages", label: "Nachrichten" },
  { href: "/reports", label: "Sammel-Export" },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: "/rechnungen", label: "Rechnungen" },
  { href: "/statistics", label: "Statistik" },
  { href: "/admin/employees", label: "Mitarbeiter" },
];

// Verwaltung sieht bewusst keine fachliche Dokumentation - eigener, reduzierter Navigationsumfang.
const VERWALTUNG_ITEMS: NavItem[] = [
  { href: "/rechnungen", label: "Rechnungen" },
  { href: "/kapazitaet", label: "Kapazität" },
];

const ROLE_LABELS = { ADMIN: "Administrator", EMPLOYEE: "Fachkraft", VERWALTUNG: "Verwaltung" } as const;

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
  const rowOne = role === "VERWALTUNG" ? VERWALTUNG_ITEMS : EMPLOYEE_ITEMS;
  const rowTwo = role === "ADMIN" ? ADMIN_ITEMS : [];

  const tabCls = (active: boolean) =>
    `flex items-center whitespace-nowrap border-b-2 px-[9px] py-[11px] text-[11.5px] leading-none transition ${
      active
        ? "border-[var(--color-gold)] font-semibold text-[var(--color-primary)]"
        : "border-transparent font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
    }`;

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-surface)] shadow-[0_1px_0_var(--color-border)]">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-start justify-between gap-6 px-5 pt-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <Link href="/dashboard" className="mb-3 flex shrink-0 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl ?? "/logo-lockup.png"} alt={practiceName} className="h-13 w-auto object-contain" />
          </Link>

          <nav className="flex flex-wrap items-stretch gap-0 border-b border-[var(--color-border)]">
            {rowOne.map((item) => (
              <Link key={item.href} href={item.href} className={tabCls(pathname.startsWith(item.href))}>
                {item.label}
              </Link>
            ))}
          </nav>
          {rowTwo.length > 0 && (
            <nav className="flex flex-wrap items-stretch gap-0">
              {rowTwo.map((item) => (
                <Link key={item.href} href={item.href} className={tabCls(pathname.startsWith(item.href))}>
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-4 pb-3">
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

          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-sage)] text-[13px] font-semibold text-white">
              {initials(userName)}
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-semibold text-[var(--color-primary)]">{userName}</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">{ROLE_LABELS[role]}</div>
            </div>
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
