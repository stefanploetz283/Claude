"use client";

import { useTransition } from "react";
import { toggleGutscheinBeschafft } from "./actions";

export function BeschafftToggle({ id, employeeId, beschafft }: { id: string; employeeId: string; beschafft: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleGutscheinBeschafft(id, employeeId, !beschafft))}
      className={`rounded-[var(--radius-control)] px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
        beschafft
          ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
          : "border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
      }`}
    >
      {beschafft ? "Beschafft ✓" : "Noch offen"}
    </button>
  );
}
