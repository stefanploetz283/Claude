"use client";

import { useTransition } from "react";
import { toggleGutscheinBeschafft } from "./actions";

export function BeschafftToggle({ id, employeeId, beschafft }: { id: string; employeeId: string; beschafft: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleGutscheinBeschafft(id, employeeId, !beschafft))}
      className={`rounded-[var(--pros-r-sm)] px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150 disabled:opacity-50 ${
        beschafft
          ? "bg-[var(--pros-status-active-bg)] text-[var(--pros-status-active-text)]"
          : "border border-[var(--pros-border-strong)] text-[var(--color-text-muted)] hover:bg-[var(--pros-sage-pale)]"
      }`}
    >
      {beschafft ? "Beschafft" : "Noch offen"}
    </button>
  );
}
