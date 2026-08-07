"use client";

import { useActionState } from "react";
import { updateHourlyRate } from "./actions";

export function HourlyRateForm({ currentRate }: { currentRate: string }) {
  const [state, formAction, pending] = useActionState(updateHourlyRate, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Stundensatz (€)</span>
        <input
          name="hourlyRate"
          type="number"
          min="0"
          step="0.01"
          defaultValue={currentRate}
          placeholder="z.B. 45.00"
          className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-control)] border border-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
      >
        {pending ? "Speichern…" : "Speichern"}
      </button>
      {state?.error && <p className="w-full text-sm text-[var(--color-coral)]">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-[var(--color-green-medium)]">{state.success}</p>}
    </form>
  );
}
