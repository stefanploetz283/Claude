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
  ];

  return (
    <div className="flex gap-1 border-b border-[var(--color-border)]">
      {tabs.map((t) => {
        const active = pathname === t.href;
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
