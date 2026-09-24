"use client";

import { useActionState } from "react";
import { saveProcessNote } from "./actions";

export function ProcessNoteForm({
  caseId,
  year,
  month,
  defaultText,
}: {
  caseId: string;
  year: number;
  month: number;
  defaultText: string;
}) {
  const [state, formAction, pending] = useActionState(saveProcessNote, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-2" key={`${year}-${month}`}>
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="month" value={month} />
      <textarea
        name="text"
        rows={4}
        defaultValue={defaultText}
        placeholder="Kurze Zusammenfassung des Prozesses in diesem Monat…"
        className="w-full rounded-[var(--pros-r-sm)] border border-[var(--pros-border-strong)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)]"
      />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-[var(--pros-r-sm)] border border-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition-[background-color,color,transform] duration-[170ms] ease-[var(--pros-ease)] hover:bg-[var(--color-primary)] hover:text-white active:scale-[0.97] disabled:opacity-50"
      >
        {pending ? "Speichern…" : "Speichern"}
      </button>
      {state?.error && <p className="text-sm text-[var(--pros-status-critical-text)]">{state.error}</p>}
    </form>
  );
}
