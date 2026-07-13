"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type NavItem = { href: string; label: string };

const EMPLOYEE_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Fälle" },
  { href: "/calendar", label: "Kalender" },
  { href: "/time-tracking", label: "Zeiterfassung" },
  { href: "/absences", label: "Urlaub/Abwesenheit" },
  { href: "/knowledge-base", label: "Fachbox" },
  { href: "/messages", label: "Nachrichten" },
  { href: "/reports", label: "Sammel-Export" },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: "/statistics", label: "Statistik" },
  { href: "/admin/employees", label: "Mitarbeiter" },
  { href: "/admin/help-types", label: "Angebotskatalog" },
  { href: "/admin/access-log", label: "Zugriffsprotokoll" },
];

export function Nav({
  role,
  unreadCount,
  logoUrl,
  practiceName,
}: {
  role: "ADMIN" | "EMPLOYEE";
  unreadCount: number;
  logoUrl: string | null;
  practiceName: string;
}) {
  const pathname = usePathname();
  const items = role === "ADMIN" ? [...EMPLOYEE_ITEMS, ...ADMIN_ITEMS] : EMPLOYEE_ITEMS;

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl ?? "/logo.svg"} alt={practiceName} className="h-9 w-9 rounded" />
          <span className="hidden text-sm font-semibold text-[var(--color-text)] sm:inline">{practiceName}</span>
        </Link>

        <nav className="flex flex-1 flex-wrap gap-1 overflow-x-auto text-sm">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-md px-3 py-2 whitespace-nowrap transition ${
                  active
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-text)] hover:bg-black/5"
                }`}
              >
                {item.label}
                {item.href === "/messages" && unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-danger)] text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="shrink-0 rounded-md border border-black/15 px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-black/5"
        >
          Abmelden
        </button>
      </div>
    </header>
  );
}
