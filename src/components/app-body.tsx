"use client";

import { usePathname } from "next/navigation";
import { Sidebar, shouldShowSidebar } from "./sidebar";
import { MitarbeiterSubnav } from "./mitarbeiter-subnav";
import { FinanzenSubnav } from "./finanzen-subnav";

export function AppBody({ role, children }: { role: "ADMIN" | "EMPLOYEE" | "VERWALTUNG"; children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = role === "ADMIN";

  const mitarbeiterMatch = isAdmin ? pathname.match(/^\/mitarbeiter\/([^/]+)/) : null;
  const inFinanzen = isAdmin && pathname.startsWith("/finanzen");
  const withSidebar = isAdmin && (mitarbeiterMatch != null || inFinanzen || shouldShowSidebar(pathname));

  if (!withSidebar) {
    return (
      <div className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 gap-8 px-5 py-8">
        <main className="flex min-w-0 flex-col gap-6">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-stretch">
      {mitarbeiterMatch ? (
        <MitarbeiterSubnav employeeId={mitarbeiterMatch[1]} />
      ) : inFinanzen ? (
        <FinanzenSubnav />
      ) : (
        <Sidebar role={role} />
      )}
      <div className="min-w-0 flex-1 px-5 py-8">
        <main className="mx-auto flex max-w-[1112px] min-w-0 flex-col gap-6">{children}</main>
      </div>
    </div>
  );
}
