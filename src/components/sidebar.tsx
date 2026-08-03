"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SIDEBAR_ROUTES = ["/dashboard", "/cases", "/admin/help-types", "/admin/access-log", "/admin/settings"];

export function shouldShowSidebar(pathname: string) {
  return SIDEBAR_ROUTES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/") || pathname.startsWith(prefix + "?"));
}

const ICON_FAELLE = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const ADMIN_LINKS = [
  {
    href: "/admin/help-types",
    label: "Angebotskatalog",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5V5a2 2 0 0 1 2-2h13" />
        <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H19V4" />
      </svg>
    ),
  },
  {
    href: "/admin/access-log",
    label: "Zugriffsprotokoll",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c-6-2-9-6-9-12V5l9-3 9 3v5c0 6-3 10-9 12Z" />
      </svg>
    ),
  },
  {
    href: "/admin/settings",
    label: "Einstellungen",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15 1.65 1.65 0 0 0 3.09 14H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
    ),
  },
];

export function Sidebar({ role }: { role: "ADMIN" | "EMPLOYEE" | "VERWALTUNG" }) {
  const pathname = usePathname();
  const submenu = role === "ADMIN" ? [{ href: "/dashboard", label: "Fälle", icon: ICON_FAELLE }, ...ADMIN_LINKS] : [{ href: "/dashboard", label: "Fälle", icon: ICON_FAELLE }];

  return (
    <aside className="relative hidden min-h-[600px] overflow-hidden rounded-[32px] bg-[var(--color-primary)] px-[22px] py-[28px] lg:block">
      <svg viewBox="0 0 288 560" preserveAspectRatio="xMidYMin slice" className="pointer-events-none absolute top-0 left-0 h-full w-full" aria-hidden="true">
        <g style={{ isolation: "isolate" }}>
          <circle cx="70" cy="150" r="150" fill="var(--color-sage)" style={{ mixBlendMode: "multiply" }} />
          <circle cx="200" cy="300" r="140" fill="var(--color-gold)" style={{ mixBlendMode: "multiply" }} />
        </g>
        <g fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.6">
          <circle cx="70" cy="150" r="150" />
          <circle cx="200" cy="300" r="140" />
        </g>
      </svg>

      <div className="relative flex flex-col gap-3.5 rounded-[14px] bg-white p-5 shadow-[0_10px_24px_rgba(0,0,0,.15)]">
        <h2 className="text-[15px] font-semibold text-[var(--color-text)]">Schnellzugriff</h2>

        <Link
          href="/cases/new"
          className="flex items-center gap-2.5 rounded-[9px] bg-[var(--color-primary)] px-3.5 py-3 text-[13px] font-medium text-white transition hover:opacity-90"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Neue Hilfe anlegen
        </Link>
        <Link
          href="/calendar"
          className="flex items-center gap-2.5 rounded-[9px] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3 text-[13px] font-medium text-[var(--color-primary)] transition hover:-translate-y-px hover:shadow-[var(--shadow-soft)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <line x1="8" y1="3" x2="8" y2="7" />
            <line x1="16" y1="3" x2="16" y2="7" />
          </svg>
          Kalender öffnen
        </Link>
        <Link
          href="/knowledge-base"
          className="flex items-center gap-2.5 rounded-[9px] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3 text-[13px] font-medium text-[var(--color-primary)] transition hover:-translate-y-px hover:shadow-[var(--shadow-soft)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19V6a2 2 0 0 1 2-2h6l2 3h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
          </svg>
          Fachbox öffnen
        </Link>
      </div>

      <div className="relative mt-[22px]">
        <div className="mb-2 px-1 text-[11px] font-semibold tracking-[.12em] text-[var(--color-sage)] uppercase">Menü</div>
        <div className="flex flex-col">
          {submenu.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-[3px] flex items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-[13.5px] font-medium text-[#EDE7DA] transition ${
                  active ? "bg-white/16 font-semibold text-white" : "hover:bg-white/8"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
