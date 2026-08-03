"use client";

import { usePathname } from "next/navigation";
import { Sidebar, shouldShowSidebar } from "./sidebar";

export function AppBody({ role, children }: { role: "ADMIN" | "EMPLOYEE" | "VERWALTUNG"; children: React.ReactNode }) {
  const pathname = usePathname();
  const withSidebar = shouldShowSidebar(pathname);

  return (
    <div
      className={`mx-auto grid w-full max-w-[1400px] flex-1 gap-8 px-5 py-8 ${withSidebar ? "lg:grid-cols-[288px_1fr]" : "grid-cols-1"}`}
    >
      {withSidebar && <Sidebar role={role} />}
      <main className="flex min-w-0 flex-col gap-6">{children}</main>
    </div>
  );
}
