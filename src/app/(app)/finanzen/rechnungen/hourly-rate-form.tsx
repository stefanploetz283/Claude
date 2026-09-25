"use client";

import { useActionState } from "react";
import { updateHourlyRate } from "./actions";
import { inputCls, labelCls, buttonOutlineCls } from "@/app/(app)/cases/case-ui";

export function HourlyRateForm({ currentRate }: { currentRate: string }) {
  const [state, formAction, pending] = useActionState(updateHourlyRate, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>Stundensatz (€)</span>
        <input name="hourlyRate" type="number" min="0" step="0.01" defaultValue={currentRate} placeholder="z.B. 45.00" className={inputCls} />
      </label>
      <button type="submit" disabled={pending} className={buttonOutlineCls}>
        {pending ? "Speichern…" : "Speichern"}
      </button>
      {state?.error && <p className="w-full text-sm text-[var(--pros-status-critical-text)]">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-[var(--pros-status-active-text)]">{state.success}</p>}
    </form>
  );
}
