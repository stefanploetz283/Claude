"use client";

import dynamic from "next/dynamic";
import type { EmployeeVM } from "./types";

const FahrtenrechnerMap = dynamic(() => import("./fahrtenrechner-map").then((mod) => mod.FahrtenrechnerMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-muted)]">
      Karte wird geladen…
    </div>
  ),
});

export function FahrtenrechnerClient({ employees, durchschnittKmh }: { employees: EmployeeVM[]; durchschnittKmh: number }) {
  return <FahrtenrechnerMap employees={employees} durchschnittKmh={durchschnittKmh} />;
}
