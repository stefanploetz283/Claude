"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/zeit-kapazitaet/kapazitaet", label: "Kapazität" },
  { href: "/zeit-kapazitaet/zeiterfassung", label: "Zeiterfassung" },
  { href: "/zeit-kapazitaet/abwesenheiten", label: "Urlaub/Abwesenheit" },
];

export function ZeitKapazitaetTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-[var(--color-border)]">
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-4 py-2.5 text-[13.5px] transition ${
              active
                ? "border-b-2 border-[var(--color-primary)] font-semibold text-[var(--color-primary)]"
                : "font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
