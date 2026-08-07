"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarShell } from "./sidebar-shell";

const TABS = [
  { key: "stammdaten", label: "Stammdaten" },
  { key: "vertrag", label: "Vertrag & Stundenmodell" },
  { key: "faelle", label: "Fälle" },
  { key: "dokumente", label: "Dokumente" },
  { key: "bonus", label: "Bonus-Historie" },
];

export function MitarbeiterSubnav({ employeeId }: { employeeId: string }) {
  const pathname = usePathname();

  return (
    <SidebarShell>
      <Link href="/mitarbeiter" className="relative mb-5 flex items-center gap-1.5 text-[13px] font-medium text-[#EDE7DA]/80 hover:text-white">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Alle Mitarbeiter
      </Link>
      <div className="relative mb-4 text-[15px] font-semibold text-white">Personalakte</div>
      <div className="relative flex flex-col">
        {TABS.map((t) => {
          const href = `/mitarbeiter/${employeeId}/${t.key}`;
          const active = pathname.startsWith(href);
          return (
            <Link
              key={t.key}
              href={href}
              className={`mb-[3px] flex items-center rounded-[9px] px-3 py-2.5 text-[13.5px] font-medium text-[#EDE7DA] transition ${
                active ? "bg-white/16 font-semibold text-white" : "hover:bg-white/8"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </SidebarShell>
  );
}
