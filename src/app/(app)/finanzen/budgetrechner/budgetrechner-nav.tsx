"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/finanzen/budgetrechner", label: "Dashboard", exact: true },
  { href: "/finanzen/budgetrechner/kategorien", label: "Budget-Positionen" },
  { href: "/finanzen/budgetrechner/ausgaben", label: "Ausgaben erfassen" },
];

export function BudgetrechnerNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-[var(--color-border)]">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px border-b-2 px-3.5 py-2.5 text-sm font-medium transition ${
              active
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
