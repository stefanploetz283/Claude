"use client";

import { useActionState, useRef } from "react";
import { createAufgabe, type ActionState } from "./actions";

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";

export function AufgabeForm({ caseOptions }: { caseOptions: { id: string; label: string }[] | null }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createAufgabe, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-end gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]"
    >
      <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Neue Aufgabe</span>
        <input name="titel" required placeholder="z.B. Jugendamt zurückrufen" className={inputCls} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Fällig am</span>
        <input name="faelligAm" type="date" className={inputCls} />
      </label>
      {caseOptions && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Fall (optional)</span>
          <select name="caseId" defaultValue="" className={inputCls}>
            <option value="">Kein Fallbezug</option>
            {caseOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
      >
        {pending ? "Wird angelegt…" : "+ Aufgabe anlegen"}
      </button>
      {state?.error && <p className="w-full text-sm font-medium text-[var(--color-coral)]">{state.error}</p>}
    </form>
  );
}
