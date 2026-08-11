"use client";

import { useActionState } from "react";
import { updateCaseStundensatz } from "../actions";

const inputCls =
  "w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";

export function StundensatzForm({ caseId, stundensatz, basisStundensatz }: { caseId: string; stundensatz: string; basisStundensatz: string }) {
  const [state, formAction, pending] = useActionState(updateCaseStundensatz, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="caseId" value={caseId} />
      <label className="flex w-40 flex-col gap-1.5 text-sm">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">€ je FLS-Std. (leer = {basisStundensatz} €)</span>
        <input name="stundensatz" defaultValue={stundensatz} placeholder={basisStundensatz} className={inputCls} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-control)] border border-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
      >
        {pending ? "Speichern…" : "Speichern"}
      </button>
      {state?.error && <p className="w-full text-sm text-[var(--color-coral)]">{state.error}</p>}
    </form>
  );
}
