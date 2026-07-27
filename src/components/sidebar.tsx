"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SIDEBAR_ROUTES = ["/dashboard", "/cases", "/admin/help-types", "/admin/access-log", "/admin/settings"];

export function shouldShowSidebar(pathname: string) {
  return SIDEBAR_ROUTES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/") || pathname.startsWith(prefix + "?"));
}

const ADMIN_LINKS = [
  {
    href: "/admin/help-types",
    label: "Angebotskatalog",
    color: "var(--color-orange)",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5V5a2 2 0 0 1 2-2h13" />
        <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H19V4" />
      </svg>
    ),
  },
  {
    href: "/admin/access-log",
    label: "Zugriffsprotokoll",
    color: "var(--color-coral)",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c-6-2-9-6-9-12V5l9-3 9 3v5c0 6-3 10-9 12Z" />
      </svg>
    ),
  },
  {
    href: "/admin/settings",
    label: "Einstellungen",
    color: "var(--color-coral)",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15 1.65 1.65 0 0 0 3.09 14H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
    ),
  },
];

export function Sidebar({ role }: { role: "ADMIN" | "EMPLOYEE" | "VERWALTUNG" }) {
  const pathname = usePathname();

  return (
    <aside className="relative hidden min-h-[600px] lg:block">
      <div className="pointer-events-none absolute -inset-x-8 -top-6 h-[480px] overflow-hidden rounded-[32px]">
        <svg viewBox="0 0 320 480" preserveAspectRatio="xMidYMin slice" className="absolute top-0 left-0 h-full w-full">
          <circle cx="60" cy="60" r="130" fill="var(--color-green-medium)" opacity="0.5" />
          <circle cx="220" cy="120" r="150" fill="var(--color-yellow)" opacity="0.55" />
          <circle cx="140" cy="300" r="170" fill="var(--color-coral)" opacity="0.45" />
          <circle cx="30" cy="330" r="120" fill="var(--color-orange)" opacity="0.4" />
        </svg>
      </div>

      <div className="relative flex flex-col gap-1.5">
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 rounded-[var(--radius-control)] px-4 py-3 text-[13.5px] font-semibold transition ${
            pathname === "/dashboard" || pathname.startsWith("/cases")
              ? "bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)]"
              : "bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-primary-soft)]"
          }`}
        >
          {ICON_FAELLE}
          Fälle
        </Link>

        {role === "ADMIN" &&
          ADMIN_LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-[var(--radius-control)] px-4 py-3 text-[13.5px] font-medium transition ${
                  active ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]" : "text-[var(--color-text)] hover:bg-[var(--color-primary-soft)]/60"
                }`}
                style={{ color: active ? undefined : undefined }}
              >
                <span style={{ color: link.color }}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
      </div>

      <div className="relative mt-6 flex flex-col gap-3.5 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-[15px] font-semibold text-[var(--color-text)]">Schnellzugriff</h2>

        <QuickLink href="/cases/new" color="var(--color-primary)" softColor="var(--color-primary-soft)" label="Neue Hilfe anlegen">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </QuickLink>

        <QuickLink href="/calendar" color="var(--color-orange)" softColor="#fdecd9" label="Kalender öffnen">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <line x1="8" y1="3" x2="8" y2="7" />
            <line x1="16" y1="3" x2="16" y2="7" />
          </svg>
        </QuickLink>

        <QuickLink href="/knowledge-base" color="var(--color-coral)" softColor="#f9e3dc" label="Fachbox öffnen">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19V6a2 2 0 0 1 2-2h6l2 3h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
          </svg>
        </QuickLink>
      </div>

      <div className="relative mt-5 flex items-center gap-2 pl-1.5 text-[11.5px] font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22c-6-2-9-6-9-12V5l9-3 9 3v5c0 6-3 10-9 12Z" />
        </svg>
        Systemisch · Pädagogisch · Beratend
      </div>
    </aside>
  );
}

const ICON_FAELLE = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

function QuickLink({
  href,
  color,
  softColor,
  label,
  children,
}: {
  href: string;
  color: string;
  softColor: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3 text-[13.5px] font-medium text-[var(--color-text)] transition hover:-translate-y-px hover:shadow-[var(--shadow-soft)]"
    >
      <span
        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg"
        style={{ background: softColor, color }}
      >
        {children}
      </span>
      {label}
    </Link>
  );
}
