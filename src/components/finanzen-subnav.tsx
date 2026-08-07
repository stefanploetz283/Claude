"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarShell } from "./sidebar-shell";

const TABS = [
  { href: "/finanzen/rechnungen", label: "Rechnungen" },
  { href: "/finanzen/sammel-export", label: "Sammel-Export" },
  { href: "/finanzen/statistik", label: "Statistik" },
  { href: "/finanzen/umsatz", label: "Umsatz-Cockpit" },
];

export function FinanzenSubnav() {
  const pathname = usePathname();

  return (
    <SidebarShell>
      <div className="relative mb-4 text-[15px] font-semibold text-white">Finanzen</div>
      <div className="relative flex flex-col">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
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
