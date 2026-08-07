"use client";

import { useActionState } from "react";
import { saveFuehrungszeugnisDatum } from "./actions";

export function FzeugnisForm({ employeeId, gueltigBis }: { employeeId: string; gueltigBis: string }) {
  const [state, formAction, pending] = useActionState(saveFuehrungszeugnisDatum, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="employeeId" value={employeeId} />
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Erw. Führungszeugnis gültig bis</span>
        <input
          name="fuehrungszeugnisGueltigBis"
          type="date"
          defaultValue={gueltigBis}
          className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-sm text-[var(--color-text)]"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-control)] border border-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
      >
        {pending ? "Speichern…" : "Speichern"}
      </button>
      {state?.error && <p className="w-full text-sm text-[var(--color-coral)]">{state.error}</p>}
    </form>
  );
}
