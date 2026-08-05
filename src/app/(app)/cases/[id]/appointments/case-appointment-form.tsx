"use client";

import { useActionState } from "react";
import { createAppointment, type ActionState } from "../../../calendar/actions";

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";

export function CaseAppointmentForm({ caseId, defaultDate }: { caseId: string; defaultDate: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createAppointment, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]"
    >
      <input type="hidden" name="caseId" value={caseId} />
      <label className="flex flex-1 min-w-[12rem] flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Titel</span>
        <input name="title" required className={inputCls} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Datum</span>
        <input name="date" type="date" required defaultValue={defaultDate} className={inputCls} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Von</span>
        <input name="startTime" type="time" required className={inputCls} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Bis</span>
        <input name="endTime" type="time" required className={inputCls} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Ort (optional)</span>
        <input name="location" className={inputCls} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Erinnerung (Min. vorher)</span>
        <input name="reminderMinutesBefore" type="number" min="0" defaultValue={60} className={`${inputCls} w-24`} />
      </label>
      <label className="flex flex-1 min-w-[12rem] flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Notiz (optional)</span>
        <input name="note" className={inputCls} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {pending ? "Speichern…" : "+ Termin anlegen"}
      </button>
      {state?.error && <p className="w-full text-sm text-[var(--color-coral)]">{state.error}</p>}
    </form>
  );
}
