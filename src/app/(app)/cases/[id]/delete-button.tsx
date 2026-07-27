"use client";

import { useState, useTransition } from "react";
import { deleteCase } from "../actions";

export function DeleteCaseButton({ caseId }: { caseId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <button
        disabled={pending}
        onClick={() => {
          if (confirm("Möchten Sie diese Hilfe wirklich löschen? Dies kann nicht rückgängig gemacht werden.")) {
            setError(null);
            startTransition(async () => {
              const result = await deleteCase(caseId);
              if (result?.error) setError(result.error);
            });
          }
        }}
        className="rounded-[var(--radius-control)] bg-[var(--color-coral)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:brightness-95 disabled:opacity-50"
      >
        {pending ? "Wird gelöscht…" : "Hilfe endgültig löschen"}
      </button>
      {error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}
    </div>
  );
}
