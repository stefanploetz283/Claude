"use client";

import { useActionState } from "react";
import { updateCaseCapacityFields } from "../actions";
import { toDateInputValue } from "@/lib/date";
import { inputCls, labelCls, buttonOutlineCls } from "../case-ui";

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
        <span className={labelCls}>Voraussichtliches Enddatum</span>
        <input
          name="expectedEndDate"
          type="date"
          defaultValue={expectedEndDate ? toDateInputValue(expectedEndDate) : ""}
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className={labelCls}>Auslaufphase (Wochen)</span>
        <input name="phaseOutWeeks" type="number" min="0" step="1" defaultValue={phaseOutWeeks ?? ""} className={inputCls} />
      </label>
      <button type="submit" disabled={pending} className={buttonOutlineCls}>
        {pending ? "Speichern…" : "Speichern"}
      </button>
      {state?.error && <p className="w-full text-sm text-[var(--pros-status-critical-text)]">{state.error}</p>}
    </form>
  );
}
