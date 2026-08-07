"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type NavItem = { href: string; label: string };

// Obere Reiterleiste: tägliches Arbeitswerkzeug, für Fachkraft und Admin bewusst identisch (der Admin
// bearbeitet laut Bestand auch eigene Fälle). Verwaltungs-/Planungswerkzeuge stehen stattdessen nur für
// die Admin-Rolle in der linken Seitenleiste (siehe sidebar.tsx).
const ROW1_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Fälle" },
  { href: "/voice-entry", label: "Diktat" },
  { href: "/zeit-kapazitaet", label: "Zeit & Kapazität" },
  { href: "/calendar", label: "Kalender" },
  { href: "/knowledge-base", label: "Fachbox" },
  { href: "/bonus", label: "Bonus" },
  { href: "/messages", label: "Nachrichten" },
];

// Zusätzlich zu den 7 gemeinsamen Reitern, nur für Admin: zwei umfangreiche Hauptbereiche mit eigenen
// Unterreitern (kontextuelle linke Navigation, siehe mitarbeiter-subnav.tsx/finanzen-subnav.tsx).
const ADMIN_EXTRA_ITEMS: NavItem[] = [
  { href: "/mitarbeiter", label: "Mitarbeiter" },
  { href: "/finanzen", label: "Finanzen" },
];

// Verwaltung sieht bewusst keine fachliche Dokumentation - eigener, reduzierter Navigationsumfang.
const VERWALTUNG_ITEMS: NavItem[] = [
  { href: "/finanzen/rechnungen", label: "Rechnungen" },
  { href: "/zeit-kapazitaet/kapazitaet", label: "Kapazität" },
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
  const rowOne = isVerwaltung ? VERWALTUNG_ITEMS : role === "ADMIN" ? [...ROW1_ITEMS, ...ADMIN_EXTRA_ITEMS] : ROW1_ITEMS;

  const tabCls = (active: boolean) =>
    `flex min-w-0 items-center border-b-2 px-2 py-[9px] text-[13.5px] leading-none transition ${
      active
        ? "border-[var(--color-gold)] font-semibold text-[var(--color-primary)]"
        : "border-transparent font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
    }`;
  const rowGridCls = isVerwaltung ? "flex flex-wrap items-stretch" : role === "ADMIN" ? "grid grid-cols-9 items-stretch" : "grid grid-cols-7 items-stretch";

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
