"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type NavItem = { href: string; label: string };

const ROW1_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Fälle" },
  { href: "/voice-entry", label: "Diktat" },
  { href: "/kapazitaet", label: "Kapazität" },
  { href: "/calendar", label: "Kalender" },
  { href: "/time-tracking", label: "Zeiterfassung" },
  { href: "/absences", label: "Urlaub/Abwesenheit" },
];

const ROW2_EMPLOYEE_ITEMS: NavItem[] = [
  { href: "/knowledge-base", label: "Fachbox" },
  { href: "/messages", label: "Nachrichten" },
  { href: "/reports", label: "Sammel-Export" },
];

const ROW2_ADMIN_EXTRA: NavItem[] = [
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
  const isVerwaltung = role === "VERWALTUNG";
  const rowOne = isVerwaltung ? VERWALTUNG_ITEMS : ROW1_ITEMS;
  const rowTwo = isVerwaltung ? [] : role === "ADMIN" ? [...ROW2_EMPLOYEE_ITEMS, ...ROW2_ADMIN_EXTRA] : ROW2_EMPLOYEE_ITEMS;

  const tabCls = (active: boolean) =>
    `flex min-w-0 items-center border-b-2 px-2 py-[9px] text-[13.5px] leading-none transition ${
      active
        ? "border-[var(--color-gold)] font-semibold text-[var(--color-primary)]"
        : "border-transparent font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
    }`;
  // Row1/Row2 haben je 6 fest definierte Spalten (ROW1_ITEMS/ROW2_*) - Grid statt Flex,
  // damit gleichnamige Spalten zeilenübergreifend exakt untereinanderstehen, unabhängig
  // von der Textlänge. Verwaltung hat ein eigenes, kleineres Set ohne zweite Zeile.
  const rowGridCls = isVerwaltung ? "flex flex-wrap items-stretch" : "grid grid-cols-6 items-stretch";

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-surface)] shadow-[0_1px_0_var(--color-border)]">
      <div className="flex items-stretch">
      <div className="flex w-[288px] flex-none items-center justify-center py-5">
        <Link href="/dashboard" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl ?? "/logo-lockup.png"} alt={practiceName} className="h-auto w-[210px] object-contain" />
        </Link>
      </div>

      <div className="min-w-0 flex-1 px-6 py-5">
      <div className="mx-auto flex max-w-[1112px] min-w-0 flex-wrap items-center gap-[22px]">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <nav className={`${rowGridCls} border-b border-[var(--color-border)]`}>
            {rowOne.map((item) => (
              <Link key={item.href} href={item.href} className={tabCls(pathname.startsWith(item.href))}>
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </nav>
          {rowTwo.length > 0 && (
            <nav className={rowGridCls}>
              {rowTwo.map((item) => (
                <Link key={item.href} href={item.href} className={tabCls(pathname.startsWith(item.href))}>
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="w-7 shrink-0" />

        <div className="flex shrink-0 items-center gap-3.5 pl-2">
          <Link href="/messages" className="relative text-[var(--color-primary)]" aria-label="Nachrichten">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 h-[7px] w-[7px] rounded-full bg-[var(--color-gold)]" />
            )}
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--color-sage)] text-[13px] font-semibold text-white">
              {initials(userName)}
            </div>
            <div className="leading-[1.2] whitespace-nowrap">
              <div className="text-[12.5px] font-semibold text-[var(--color-primary)]">{userName}</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">{ROLE_LABELS[role]}</div>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg border border-[var(--color-border)] px-3.5 py-2 text-[13px] font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-primary-soft)]"
          >
            Abmelden
          </button>
        </div>
      </div>
      </div>
      </div>
      <div className="h-[1.5px] w-full bg-[var(--color-gold)]" />
    </header>
  );
}
