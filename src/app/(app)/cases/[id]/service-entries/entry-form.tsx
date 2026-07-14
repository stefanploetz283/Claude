"use client";

import { useActionState } from "react";
import { createServiceEntry } from "./actions";

const inputCls = "w-full rounded-md border border-black/15 px-3 py-1.5 text-sm";

export function NewEntryForm({ caseId }: { caseId: string }) {
  const [state, formAction, pending] = useActionState(createServiceEntry, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border border-black/10 bg-white p-4">
      <input type="hidden" name="caseId" value={caseId} />
      <Field label="Datum">
        <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} />
      </Field>
      <Field label="Von">
        <input name="startTime" type="time" required className={inputCls} />
      </Field>
      <Field label="Bis">
        <input name="endTime" type="time" required className={inputCls} />
      </Field>
      <Field label="Inhaltsbeschreibung" grow>
        <input name="description" required placeholder="Was wurde gemacht?" className={inputCls} />
      </Field>
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

function Field({ label, children, grow }: { label: string; children: React.ReactNode; grow?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${grow ? "min-w-[16rem] flex-1" : ""}`}>
      <span className="text-xs font-medium text-black/60">{label}</span>
      {children}
    </label>
  );
}
