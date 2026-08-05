"use client";

import { useActionState } from "react";
import { createAbsence } from "./actions";

const inputCls = "rounded-md border border-black/15 px-3 py-1.5 text-sm";

export function AbsenceForm({ employees }: { employees: { id: string; name: string }[] | null }) {
  const [state, formAction, pending] = useActionState(createAbsence, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border border-black/10 bg-white p-4">
      {employees && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-black/60">Mitarbeiter</span>
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
        <span className="text-xs font-medium text-black/60">Art</span>
        <select name="type" className={inputCls}>
          <option value="URLAUB">Urlaub</option>
          <option value="KRANK">Krank</option>
          <option value="SONSTIGES">Sonstiges</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-black/60">Von</span>
        <input name="startDate" type="date" required className={inputCls} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-black/60">Bis</span>
        <input name="endDate" type="date" required className={inputCls} />
      </label>
      <label className="flex flex-1 flex-col gap-1">
        <span className="text-xs font-medium text-black/60">Notiz (optional)</span>
        <input name="note" className={inputCls} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--color-primary)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Speichern…" : "Eintragen"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
