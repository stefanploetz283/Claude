"use client";

import { useActionState, useTransition } from "react";
import { format } from "date-fns";
import type { SondertagRow } from "@/lib/stundenmodell";
import { createSondertagTyp, deleteSondertagTyp } from "./actions";

export function SondertagCatalog({ sondertage }: { sondertage: SondertagRow[] }) {
  const [state, formAction, pending] = useActionState(createSondertagTyp, undefined);
  const [deletePending, startDelete] = useTransition();

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
      <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Sondertage-Katalog</h2>
      <p className="mb-3 text-sm text-[var(--color-text-muted)]">Konzeptionstage/Teamtage, die Mitarbeitern zugeordnet werden können.</p>

      <form action={formAction} className="flex flex-wrap items-end gap-3 border-b border-[var(--color-border)] pb-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Name</span>
          <input
            name="name"
            required
            placeholder="z.B. Konzeptionstag"
            className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-sm text-[var(--color-text)]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Datum</span>
          <input
            name="datum"
            type="date"
            required
            className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-sm text-[var(--color-text)]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Dauer (Std.)</span>
          <input
            name="dauerStd"
            type="number"
            min="0"
            step="0.25"
            defaultValue={7.5}
            required
            className="w-24 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-sm text-[var(--color-text)]"
          />
        </label>
        <label className="flex items-center gap-1.5 pb-2.5 text-xs font-medium text-[var(--color-text-muted)]">
          <input type="checkbox" name="istEchterExtraTag" />
          Echter Extra-Tag
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
        {sondertage.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm">
            <span className="text-[var(--color-text)]">
              <strong>{s.name}</strong> · {format(new Date(s.datum), "dd.MM.yyyy")} · {s.dauerStd.toFixed(2)} Std. ·{" "}
              {s.istEchterExtraTag ? "echter Extra-Tag" : "verlängerter Normaltag"}
            </span>
            <button
              disabled={deletePending}
              onClick={() => {
                if (confirm(`"${s.name}" wirklich löschen?`)) startDelete(() => deleteSondertagTyp(s.id));
              }}
              className="shrink-0 text-xs font-medium text-[var(--color-coral)] hover:underline disabled:opacity-50"
            >
              Löschen
            </button>
          </li>
        ))}
        {sondertage.length === 0 && <li className="text-sm text-[var(--color-text-muted)]">Noch keine Sondertage angelegt.</li>}
      </ul>
    </div>
  );
}
