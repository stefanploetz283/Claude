"use client";

import { useTransition } from "react";
import { markBonusPaidOut } from "./actions";
import type { Quarter } from "@/lib/bonus";

export function PayoutButton({ employeeId, year, quarter }: { employeeId: string; year: number; quarter: Quarter }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("Diesen Quartals-Bonus als ausgezahlt markieren?")) startTransition(() => markBonusPaidOut(employeeId, year, quarter));
      }}
      className="rounded-[var(--pros-r-sm)] bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-[var(--pros-shadow)] transition-[transform,background-color] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] active:translate-y-0 active:scale-[0.97] disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100"
    >
      {pending ? "…" : "Als ausgezahlt markieren"}
    </button>
  );
}
