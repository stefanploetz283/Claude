"use client";

import { usePathname } from "next/navigation";
import { Sidebar, shouldShowSidebar } from "./sidebar";

export function AppBody({ role, children }: { role: "ADMIN" | "EMPLOYEE" | "VERWALTUNG"; children: React.ReactNode }) {
  const pathname = usePathname();
  const withSidebar = shouldShowSidebar(pathname);

  if (!withSidebar) {
    return (
      <div className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 gap-8 px-5 py-8">
        <main className="flex min-w-0 flex-col gap-6">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-stretch">
      <Sidebar role={role} />
      <div className="min-w-0 flex-1 px-5 py-8">
        <main className="mx-auto flex max-w-[1112px] min-w-0 flex-col gap-6">{children}</main>
      </div>
    </div>
  );
}
