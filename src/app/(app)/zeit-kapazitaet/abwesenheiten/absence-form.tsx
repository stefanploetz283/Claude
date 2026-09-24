"use client";

import { useActionState } from "react";
import { createAbsence } from "./actions";
import { inputCls, labelCls, buttonPrimaryCls, cardCls } from "@/app/(app)/cases/case-ui";

export function AbsenceForm({ employees }: { employees: { id: string; name: string }[] | null }) {
  const [state, formAction, pending] = useActionState(createAbsence, undefined);

  return (
    <form action={formAction} className={`flex flex-wrap items-end gap-3 ${cardCls}`}>
      {employees && (
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Mitarbeiter</span>
          <select name="employeeId" className={inputCls}>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1">
        <span className={labelCls}>Art</span>
        <select name="type" className={inputCls}>
          <option value="URLAUB">Urlaub</option>
          <option value="KRANK">Krank</option>
          <option value="SONSTIGES">Sonstiges</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelCls}>Von</span>
        <input name="startDate" type="date" required className={inputCls} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelCls}>Bis</span>
        <input name="endDate" type="date" required className={inputCls} />
      </label>
      <label className="flex flex-1 flex-col gap-1">
        <span className={labelCls}>Notiz (optional)</span>
        <input name="note" className={`w-full ${inputCls}`} />
      </label>
      <button type="submit" disabled={pending} className={buttonPrimaryCls}>
        {pending ? "Speichern…" : "Eintragen"}
      </button>
      {state?.error && <p className="w-full text-sm text-[var(--pros-status-critical-text)]">{state.error}</p>}
    </form>
  );
}
