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
      className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
    >
      {pending ? "…" : "Als ausgezahlt markieren"}
    </button>
  );
}
