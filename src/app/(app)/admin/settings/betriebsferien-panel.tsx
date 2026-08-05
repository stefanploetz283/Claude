"use client";

import { useActionState, useTransition } from "react";
import { format } from "date-fns";
import { createBetriebsferienPeriod, deleteBetriebsferienPeriod } from "./actions";

export type BetriebsferienRow = { id: string; label: string; startDate: string; endDate: string };

export function BetriebsferienPanel({ periods }: { periods: BetriebsferienRow[] }) {
  const [state, formAction, pending] = useActionState(createBetriebsferienPeriod, undefined);

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
      <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Betriebsferien</h2>
      <p className="mb-3 text-sm text-[var(--color-text-muted)]">
        Wochen, die vollständig in einen dieser Zeiträume fallen, zählen weder in der Kapazitätsplanung noch im Bonus-Bereich als
        Anwesenheitswochen.
      </p>

      <form action={formAction} className="flex flex-wrap items-end gap-3 border-b border-[var(--color-border)] pb-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Bezeichnung</span>
          <input
            name="label"
            required
            placeholder="z.B. Sommerschließung 2026"
            className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-sm text-[var(--color-text)]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Von</span>
          <input
            name="startDate"
            type="date"
            required
            className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-sm text-[var(--color-text)]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Bis</span>
          <input
            name="endDate"
            type="date"
            required
            className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-sm text-[var(--color-text)]"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {pending ? "Wird angelegt…" : "Anlegen"}
        </button>
      </form>
      {state?.error && <p className="mt-2 text-sm text-[var(--color-coral)]">{state.error}</p>}

      <ul className="mt-4 flex flex-col gap-2">
        {periods.map((p) => (
          <BetriebsferienRowItem key={p.id} period={p} />
        ))}
        {periods.length === 0 && <li className="text-sm text-[var(--color-text-muted)]">Noch keine Betriebsferien hinterlegt.</li>}
      </ul>
    </div>
  );
}

function BetriebsferienRowItem({ period }: { period: BetriebsferienRow }) {
  const [pending, startTransition] = useTransition();
  return (
    <li className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm">
      <span className="text-[var(--color-text)]">
        <strong>{period.label}</strong> · {format(new Date(period.startDate), "dd.MM.yyyy")}–{format(new Date(period.endDate), "dd.MM.yyyy")}
      </span>
      <button
        disabled={pending}
        onClick={() => {
          if (confirm(`"${period.label}" wirklich löschen?`)) startTransition(() => deleteBetriebsferienPeriod(period.id));
        }}
        className="text-xs font-medium text-[var(--color-coral)] hover:underline disabled:opacity-50"
      >
        Löschen
      </button>
    </li>
  );
}
