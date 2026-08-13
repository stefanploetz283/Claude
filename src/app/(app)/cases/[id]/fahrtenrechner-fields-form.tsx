"use client";

import { useActionState } from "react";
import { updateCaseFahrtenrechnerFields } from "../actions";

const inputCls =
  "w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";

export function FahrtenrechnerFieldsForm({
  caseId,
  besucheProWoche,
  geplanteFlsStdWoche,
}: {
  caseId: string;
  besucheProWoche: number;
  geplanteFlsStdWoche: number | null;
}) {
  const [state, formAction, pending] = useActionState(updateCaseFahrtenrechnerFields, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="caseId" value={caseId} />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Besuche/Woche</span>
        <input name="besucheProWoche" type="number" min="0" step="1" defaultValue={besucheProWoche} className={inputCls} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Geplante FLS-Std./Woche</span>
        <input
          name="geplanteFlsStdWoche"
          type="number"
          min="0"
          step="0.5"
          defaultValue={geplanteFlsStdWoche ?? ""}
          className={inputCls}
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
    </form>
  );
}
