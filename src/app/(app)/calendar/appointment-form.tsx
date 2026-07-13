"use client";

import { useActionState } from "react";
import { createAppointment } from "./actions";

const inputCls = "rounded-md border border-black/15 px-3 py-1.5 text-sm";

export function AppointmentForm({
  cases,
  defaultDate,
}: {
  cases: { id: string; label: string }[];
  defaultDate: string;
}) {
  const [state, formAction, pending] = useActionState(createAppointment, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border border-black/10 bg-white p-4">
      <label className="flex flex-1 min-w-[12rem] flex-col gap-1">
        <span className="text-xs font-medium text-black/60">Titel</span>
        <input name="title" required className={inputCls} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-black/60">Fall/Klient (optional)</span>
        <select name="caseId" className={inputCls}>
          <option value="">Kein Bezug</option>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-black/60">Datum</span>
        <input name="date" type="date" required defaultValue={defaultDate} className={inputCls} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-black/60">Von</span>
        <input name="startTime" type="time" required className={inputCls} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-black/60">Bis</span>
        <input name="endTime" type="time" required className={inputCls} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-black/60">Ort (optional)</span>
        <input name="location" className={inputCls} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-black/60">Erinnerung (Min. vorher)</span>
        <input name="reminderMinutesBefore" type="number" min="0" defaultValue={60} className={`${inputCls} w-24`} />
      </label>
      <label className="flex flex-1 min-w-[12rem] flex-col gap-1">
        <span className="text-xs font-medium text-black/60">Notiz (optional)</span>
        <input name="note" className={inputCls} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--color-primary)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Speichern…" : "Termin anlegen"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
