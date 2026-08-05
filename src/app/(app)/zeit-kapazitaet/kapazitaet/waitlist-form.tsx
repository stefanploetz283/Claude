"use client";

import { useActionState } from "react";
import { createWaitlistEntry, type ActionState } from "./actions";

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";

export function WaitlistForm({ helpTypes }: { helpTypes: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createWaitlistEntry, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Name/Fall-Kennung</span>
        <input name="clientName" required className={`w-48 ${inputCls}`} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Jugendamt (optional)</span>
        <input name="authority" className={`w-48 ${inputCls}`} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Hilfeart</span>
        <select name="helpTypeId" required className={`w-56 ${inputCls}`}>
          <option value="">Bitte wählen…</option>
          {helpTypes.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Dringlichkeit (optional)</span>
        <input name="urgencyNote" className={`w-56 ${inputCls}`} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {pending ? "Speichern…" : "Auf Warteliste setzen"}
      </button>
      {state?.error && <p className="w-full text-sm text-[var(--color-coral)]">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-[var(--color-green-medium)]">{state.success}</p>}
    </form>
  );
}
