"use client";

import { useState, useTransition } from "react";
import { setEmployeeActive, resetEmployeePassword } from "./actions";

export function EmployeeRowActions({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3 text-sm">
      {tempPassword && (
        <span className="rounded bg-amber-100 px-2 py-1 font-mono text-amber-800">
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
        className="text-[var(--color-primary)] hover:underline disabled:opacity-50"
      >
        Passwort zurücksetzen
      </button>
      <button
        disabled={pending}
        onClick={() => startTransition(() => setEmployeeActive(id, !active))}
        className="text-[var(--color-primary)] hover:underline disabled:opacity-50"
      >
        {active ? "Deaktivieren" : "Reaktivieren"}
      </button>
    </div>
  );
}
