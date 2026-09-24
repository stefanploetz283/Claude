"use client";

import { useState, useTransition } from "react";
import { setEmployeeActive, resetEmployeePassword } from "../../actions";

export function AccountActions({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {tempPassword && (
        <span className="rounded-[var(--pros-r-sm)] bg-[var(--pros-status-attention-bg)] px-2 py-1 font-mono text-[var(--pros-status-attention-text)]">
          Neues Passwort: {tempPassword}
        </span>
      )}
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await resetEmployeePassword(id);
            setTempPassword(result.tempPassword);
          })
        }
        className="font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50"
      >
        Passwort zurücksetzen
      </button>
      <button
        disabled={pending}
        onClick={() => startTransition(() => setEmployeeActive(id, !active))}
        className={`font-medium hover:underline disabled:opacity-50 ${active ? "text-[var(--pros-status-critical-text)]" : "text-[var(--color-primary)]"}`}
      >
        {active ? "Deaktivieren" : "Reaktivieren"}
      </button>
    </div>
  );
}
