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
    <div className="flex gap-1 border-b border-black/10">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-3 py-2 text-sm ${
              active ? "border-b-2 border-[var(--color-primary)] font-medium text-[var(--color-primary)]" : "text-black/60 hover:text-black"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
