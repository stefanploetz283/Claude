"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function CaseTabs({ caseId }: { caseId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/cases/${caseId}`, label: "Übersicht" },
    { href: `/cases/${caseId}/service-entries`, label: "Leistungsdokumentation" },
    { href: `/cases/${caseId}/appointments`, label: "Termine" },
    { href: `/cases/${caseId}/documents`, label: "Dokumente" },
    { href: `/cases/${caseId}/berichtsbausteine`, label: "Abschlussbericht" },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-[var(--pros-border-default)]">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`shrink-0 rounded-t-[var(--pros-r-sm)] px-4 py-2.5 text-[13.5px] transition-colors duration-[170ms] ease-[var(--pros-ease)] ${
              active
                ? "border-b-2 border-[var(--color-primary)] font-semibold text-[var(--color-primary)]"
                : "font-medium text-[var(--color-text-muted)] hover:bg-[var(--pros-sage-pale)]/40 hover:text-[var(--color-text)]"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
