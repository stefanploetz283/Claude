"use client";

import { useState } from "react";
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const isVerwaltung = role === "VERWALTUNG";
  const rowOne = isVerwaltung ? VERWALTUNG_ITEMS : role === "ADMIN" ? [...ROW1_ITEMS, ...ADMIN_EXTRA_ITEMS] : ROW1_ITEMS;

  // Schriftgröße gestaffelt: auf schmaleren Tablet-/PWA-Breiten (md-lg) etwas kleiner, damit das
  // horizontale Scrollen der Reiter angenehm bleibt; ab lg die volle, präsentere Desktop-Größe.
  const tabCls = (active: boolean) =>
    `flex shrink-0 items-center border-b-2 px-3.5 py-4 text-[15px] leading-none whitespace-nowrap transition lg:text-[16px] ${
      active
        ? "border-[var(--color-gold)] font-bold text-[var(--color-primary)]"
        : "border-transparent font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-primary)] hover:text-white"
    }`;

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-surface)] shadow-[0_1px_0_var(--color-border)]">
      {/* Desktop/Tablet ab md: Zeile 1 Branding & Account, Zeile 2 eigene volle Reiterleiste (keine
          abgeschnittenen Labels mehr, da die Navigation nicht mehr neben Logo/Account-Icons gequetscht wird). */}
      <div className="hidden items-stretch md:flex">
        {/* Petrolfarbene Spalte über die volle Header-Höhe (beide Zeilen), exakt so breit wie SidebarShell
            (288px), damit ein durchgehender petrolfarbener Bereich von ganz oben bis in den Sidebar-Bereich
            entsteht statt wie zuvor erst darunter zu beginnen. */}
        <div className="flex w-[288px] flex-none flex-col items-center justify-center bg-[var(--color-primary)] px-[22px] py-4">
          <Link href="/dashboard" className="shrink-0">
            {logoUrl ? (
              // Individuell hochgeladenes Logo: unverändert als eigenständiges Bild anzeigen.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={practiceName} className="h-auto w-[190px] object-contain" />
            ) : (
              // Standard-Logo: Kreis-Mark mit weißer Outline (alle drei Kreise, Füllfarben unverändert)
              // plus Schriftzug in Weiß, exakt derselben Schriftart (Outfit) wie im Rest der App - beides
              // ausschließlich für Lesbarkeit auf dem petrolfarbenen Hintergrund angepasst.
              <div className="flex flex-col items-center gap-2 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-mark-petrol.svg" alt="" className="h-14 w-14" />
                <div className="leading-tight text-white">
                  <div className="text-[13px] font-normal">Praxis für</div>
                  <div className="text-[15px] font-bold tracking-tight uppercase">Systemische Entwicklung</div>
                  <div className="mx-auto my-1.5 h-px w-16 bg-[var(--color-gold)]" />
                  <div className="text-[8.5px] font-semibold tracking-[0.14em] uppercase">Beratung · Pädagogik · Therapie</div>
                </div>
              </div>
            )}
          </Link>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-end gap-5 px-6 py-4">
            <Link href="/messages" className="relative text-[var(--color-primary)]" aria-label="Nachrichten">
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 h-[7px] w-[7px] rounded-full bg-[var(--color-gold)]" />
              )}
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[var(--color-sage)] text-[15px] font-semibold text-white">
                {initials(userName)}
              </div>
              <div className="leading-[1.2] whitespace-nowrap">
                <div className="text-[14px] font-bold text-[var(--color-primary)]">{userName}</div>
                <div className="text-[12px] text-[var(--color-text-muted)]">{ROLE_LABELS[role]}</div>
              </div>
            </div>

            {role === "ADMIN" && (
              <Link
                href="/interim"
                className={`rounded-lg border px-4 py-2.5 text-[14px] font-medium transition ${
                  pathname.startsWith("/interim")
                    ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-white"
                    : "border-[var(--color-gold)] text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-white"
                }`}
                title="Übergangslösung bis zur Praxiseröffnung am 1.11."
              >
                Interimsmodus
              </Link>
            )}

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-[14px] font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-primary-soft)]"
            >
              Abmelden
            </button>
          </div>

          {/* Zeile 2: volle, unabgekürzte Reiter, direkt neben der petrolfarbenen Spalte; horizontales
              Scrollen als Fallback für schmalere Tablet-Breiten statt erneutem Abschneiden. */}
          <nav className="min-w-0 flex-1 overflow-x-auto border-t border-[var(--color-border)]">
            <div className="flex items-stretch">
              {rowOne.map((item) => (
                <Link key={item.href} href={item.href} className={tabCls(pathname.startsWith(item.href))}>
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </div>

      {/* Mobil: kompakte Kopfzeile mit Logo + Menü-Button, darunter ausklappbares Menü mit denselben Punkten. */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:hidden">
        <Link href="/dashboard" className="min-w-0 shrink" onClick={() => setMobileOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl ?? "/logo-lockup.png"} alt={practiceName} className="h-9 w-auto object-contain" />
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/messages" className="relative flex h-11 w-11 items-center justify-center text-[var(--color-primary)]" aria-label="Nachrichten">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            {unreadCount > 0 && <span className="absolute top-2 right-2 h-[7px] w-[7px] rounded-full bg-[var(--color-gold)]" />}
          </Link>
          <button
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={mobileOpen}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--color-primary)]"
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
        <div className="border-t border-[var(--color-border)] px-4 py-3 md:hidden">
          <nav className="flex flex-col">
            {rowOne.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-3 py-3 text-[15px] font-medium ${
                  pathname.startsWith(item.href) ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]" : "text-[var(--color-text)]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--color-sage)] text-[13px] font-semibold text-white">
                {initials(userName)}
              </div>
              <div className="leading-[1.2]">
                <div className="text-[13px] font-semibold text-[var(--color-primary)]">{userName}</div>
                <div className="text-[11px] text-[var(--color-text-muted)]">{ROLE_LABELS[role]}</div>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
            {role === "ADMIN" && (
              <Link
                href="/interim"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-[var(--color-gold)] px-3.5 py-2.5 text-center text-[13px] font-medium text-[var(--color-gold)]"
              >
                Interimsmodus
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-lg border border-[var(--color-border)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--color-primary)]"
            >
              Abmelden
            </button>
          </div>
        </div>
      )}

      <div className="h-[1.5px] w-full bg-[var(--color-gold)]" />
    </header>
  );
}
