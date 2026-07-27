"use client";

import { useActionState } from "react";
import { updateCaseCapacityFields } from "../actions";
import { toDateInputValue } from "@/lib/date";

const inputCls =
  "w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";

export function CapacityPlanningForm({
  caseId,
  expectedEndDate,
  phaseOutWeeks,
}: {
  caseId: string;
  expectedEndDate: Date | null;
  phaseOutWeeks: number | null;
}) {
  const [state, formAction, pending] = useActionState(updateCaseCapacityFields, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="caseId" value={caseId} />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Voraussichtliches Enddatum</span>
        <input
          name="expectedEndDate"
          type="date"
          defaultValue={expectedEndDate ? toDateInputValue(expectedEndDate) : ""}
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Auslaufphase (Wochen)</span>
        <input name="phaseOutWeeks" type="number" min="0" step="1" defaultValue={phaseOutWeeks ?? ""} className={inputCls} />
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
